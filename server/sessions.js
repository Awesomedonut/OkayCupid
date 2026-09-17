import { randomBytes, createHash } from "node:crypto";
import { fail } from "./validation.js";
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export function installSessions(app, db, secureCookies) {
  const tokenFrom = (req) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("kindred="))
      ?.slice(8);
    return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
  };
  app.use("/api", (req, res, next) => {
    const token = tokenFrom(req);
    if (token)
      req.member = db
        .prepare(
          "SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires > ?",
        )
        .get(hash(token), Date.now());
    if (req.member) req.memberContext = `${req.member.id}:${hash(token)}`;
    next();
  });
  const required = (req, res, next) => {
    if (!req.member) return next(fail(401, "Please sign in to continue."));
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("X-Expected-Member") !== req.memberContext
    )
      return next(
        fail(
          409,
          "Your signed-in account changed. Please reload before continuing.",
        ),
      );
    next();
  };
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
  };
  const session = (res, id, req) => {
    const old = req && tokenFrom(req);
    if (old) db.prepare("DELETE FROM sessions WHERE token = ?").run(hash(old));
    const token = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM sessions WHERE expires <= ?").run(Date.now());
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(
      hash(token),
      id,
      Date.now() + 7 * 86400000,
    );
    res.cookie("kindred", token, { ...cookieOptions, maxAge: 7 * 86400000 });
  };
  return { required, cookieOptions, session, tokenFrom };
}
