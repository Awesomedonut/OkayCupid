import { randomBytes, timingSafeEqual } from "node:crypto";
import { hash } from "../sessions.js";
import { clean, fail, validateProfile } from "../validation.js";
export function authenticationRoutes({
  app,
  db,
  limit,
  passwordKey,
  session,
  tokenFrom,
  required,
}) {
  app.post("/api/register", limit, async (req, res) => {
    const body = req.body;
    validateProfile(body);
    if (body.adult !== true)
      throw fail(400, "You must confirm that you are at least 18.");
    if (
      !clean(body.email, 254, 3) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
      typeof body.password !== "string" ||
      body.password.length < 12 ||
      body.password.length > 128
    )
      throw fail(400, "Use a valid email and a password of 12–128 characters.");
    const salt = randomBytes(16).toString("hex");
    const key = await passwordKey(body.password, salt);
    let id;
    try {
      id = Number(
        db
          .prepare(
            "INSERT INTO users (email, password, name, age, gender, desired, city, bio, interests) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            body.email.trim().toLowerCase(),
            `${salt}:${key.toString("hex")}`,
            body.name.trim(),
            body.age,
            body.gender,
            JSON.stringify(body.desired),
            body.city.trim(),
            body.bio.trim(),
            body.interests.trim(),
          ).lastInsertRowid,
      );
    } catch (error) {
      if (error.errcode === 2067)
        throw fail(409, "An account with that email already exists.");
      throw error;
    }
    session(res, id);
    res.status(201).json({ ok: true });
  });
  app.post("/api/login", limit, async (req, res) => {
    const { email, password } = req.body;
    if (
      !clean(email, 254, 3) ||
      typeof password !== "string" ||
      password.length > 128
    )
      throw fail(400, "Enter your email and password.");
    const row = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email.trim().toLowerCase());
    const [salt, stored] = row?.password
      ? row.password.split(":")
      : ["00000000000000000000000000000000", "00".repeat(64)];
    const key = await passwordKey(password, salt);
    if (!timingSafeEqual(key, Buffer.from(stored, "hex")) || !row?.password)
      throw fail(401, "Email or password is incorrect.");
    const old = tokenFrom(req);
    if (old) db.prepare("DELETE FROM sessions WHERE token = ?").run(hash(old));
    session(res, row.id);
    res.json({ ok: true });
  });
  app.post("/api/logout", required, (req, res) => {
    const token = tokenFrom(req);
    if (token)
      db.prepare("DELETE FROM sessions WHERE token = ?").run(hash(token));
    res.json({ ok: true });
  });
}
