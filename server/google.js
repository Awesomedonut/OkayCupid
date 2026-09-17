import * as oidc from "openid-client";
import { randomBytes, createHash } from "node:crypto";
const digest = (value) => createHash("sha256").update(value).digest("hex");
const random = () => randomBytes(32).toString("hex");
const cookie = (req) =>
  req.headers.cookie
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("okaycupid_oidc="))
    ?.slice(15) || "";
export function googleAuth({
  app,
  db,
  session,
  required,
  limit,
  validateProfile,
  cookieOptions,
  publicOrigin,
  configuration,
}) {
  db.exec(`CREATE TABLE IF NOT EXISTS identities (provider TEXT NOT NULL, subject TEXT NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(provider, subject), UNIQUE(provider, user_id));
    CREATE TABLE IF NOT EXISTS oidc_transactions (state TEXT PRIMARY KEY, browser TEXT NOT NULL, verifier TEXT NOT NULL, nonce TEXT NOT NULL, user_id INTEGER, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oidc_pending (browser TEXT PRIMARY KEY, subject TEXT NOT NULL, email TEXT NOT NULL, expires INTEGER NOT NULL);`);
  const enabled =
    !!configuration ||
    !!(
      publicOrigin &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
    );
  const callback = publicOrigin
    ? `${publicOrigin}/api/auth/google/callback`
    : null;
  let configPromise;
  const config = () => {
    if (configuration) return Promise.resolve(configuration);
    configPromise ??= oidc
      .discovery(
        new URL("https://accounts.google.com"),
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        undefined,
        { execute: [oidc.enableNonRepudiationChecks] },
      )
      .catch((error) => {
        configPromise = null;
        throw error;
      });
    return configPromise;
  };
  const clear = (res) => res.clearCookie("okaycupid_oidc", cookieOptions);
  const problem = (res, code) => {
    clear(res);
    res.redirect(`/#login?google=${code}`);
  };
  const cleanup = () => {
    db.prepare("DELETE FROM oidc_transactions WHERE expires <= ?").run(
      Date.now(),
    );
    db.prepare("DELETE FROM oidc_pending WHERE expires <= ?").run(Date.now());
  };
  app.get("/api/auth/google", (req, res) =>
    res.json({
      enabled,
      linked: !!(
        req.member &&
        db
          .prepare(
            "SELECT 1 FROM identities WHERE provider = 'google' AND user_id = ?",
          )
          .get(req.member.id)
      ),
    }),
  );
  app.get("/api/auth/google/start", limit, async (req, res) => {
    if (!enabled) return problem(res, "unconfigured");
    if (req.query.link === "1" && !req.member) return problem(res, "signin");
    if (req.query.link === "1" && req.query.member !== req.memberContext)
      return problem(res, "signin");
    cleanup();
    const state = random(),
      browser = random(),
      nonce = random(),
      verifier = oidc.randomPKCECodeVerifier();
    try {
      const c = await config();
      const url = oidc.buildAuthorizationUrl(c, {
        redirect_uri: callback,
        scope: "openid email",
        state,
        nonce,
        code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
        code_challenge_method: "S256",
        prompt: "select_account",
      });
      db.prepare("INSERT INTO oidc_transactions VALUES (?, ?, ?, ?, ?, ?)").run(
        state,
        digest(browser),
        verifier,
        nonce,
        req.query.link === "1" ? req.member.id : null,
        Date.now() + 10 * 60000,
      );
      res
        .cookie("okaycupid_oidc", browser, {
          ...cookieOptions,
          maxAge: 10 * 60000,
        })
        .redirect(url.href);
    } catch {
      problem(res, "failed");
    }
  });
  app.get("/api/auth/google/callback", limit, async (req, res) => {
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const tx = db
      .prepare("DELETE FROM oidc_transactions WHERE state = ? RETURNING *")
      .get(state);
    if (
      !enabled ||
      !tx ||
      tx.expires <= Date.now() ||
      tx.browser !== digest(cookie(req)) ||
      (tx.user_id && tx.user_id !== req.member?.id)
    )
      return problem(res, "expired");
    try {
      const tokens = await oidc.authorizationCodeGrant(
        await config(),
        new URL(req.originalUrl, publicOrigin),
        {
          pkceCodeVerifier: tx.verifier,
          expectedState: state,
          expectedNonce: tx.nonce,
          idTokenExpected: true,
        },
      );
      const claims = tokens.claims();
      if (
        !claims ||
        typeof claims.sub !== "string" ||
        !claims.sub ||
        claims.sub.length > 255 ||
        claims.email_verified !== true ||
        typeof claims.email !== "string" ||
        claims.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)
      )
        return problem(res, "failed");
      const email = claims.email.trim().toLowerCase();
      const identity = db
        .prepare(
          "SELECT user_id FROM identities WHERE provider = 'google' AND subject = ?",
        )
        .get(claims.sub);
      if (tx.user_id) {
        if (identity && identity.user_id !== tx.user_id)
          return problem(res, "collision");
        if (!identity)
          db.prepare("INSERT INTO identities VALUES ('google', ?, ?)").run(
            claims.sub,
            tx.user_id,
          );
        clear(res);
        return res.redirect("/#profile");
      }
      if (identity) {
        session(res, identity.user_id, req);
        clear(res);
        return res.redirect("/#questions");
      }
      if (db.prepare("SELECT id FROM users WHERE email = ?").get(email))
        return problem(res, "collision");
      const browser = random();
      db.prepare("INSERT INTO oidc_pending VALUES (?, ?, ?, ?)").run(
        digest(browser),
        claims.sub,
        email,
        Date.now() + 10 * 60000,
      );
      res
        .cookie("okaycupid_oidc", browser, {
          ...cookieOptions,
          maxAge: 10 * 60000,
        })
        .redirect("/#google-onboarding");
    } catch {
      problem(res, "failed");
    }
  });
  app.get("/api/auth/google/pending", (req, res) => {
    cleanup();
    const pending = db
      .prepare("SELECT email FROM oidc_pending WHERE browser = ?")
      .get(digest(cookie(req)));
    res.json(pending || null);
  });
  app.post("/api/auth/google/complete", limit, (req, res, next) => {
    cleanup();
    const pending = db
      .prepare("SELECT * FROM oidc_pending WHERE browser = ?")
      .get(digest(cookie(req)));
    if (!pending)
      return res
        .status(401)
        .json({ error: "Google sign-in expired. Please start again." });
    validateProfile(req.body);
    if (req.body.adult !== true)
      return res.status(400).json({ error: "Confirm you are at least 18." });
    const b = req.body;
    let id;
    db.exec("BEGIN IMMEDIATE");
    try {
      id = Number(
        db
          .prepare(
            "INSERT INTO users (email, password, name, age, gender, desired, city, bio, interests) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            pending.email,
            "",
            b.name.trim(),
            b.age,
            b.gender,
            JSON.stringify(b.desired),
            b.city.trim(),
            b.bio.trim(),
            b.interests.trim(),
          ).lastInsertRowid,
      );
      db.prepare("INSERT INTO identities VALUES ('google', ?, ?)").run(
        pending.subject,
        id,
      );
      db.prepare("DELETE FROM oidc_pending WHERE browser = ?").run(
        pending.browser,
      );
      db.exec("COMMIT");
    } catch {
      db.exec("ROLLBACK");
      return res
        .status(409)
        .json({
          error:
            "This identity or email already has an account. Sign in to that account first, then link Google from your profile.",
        });
    }
    session(res, id, req);
    clear(res);
    res.status(201).json({ ok: true });
  });
}
