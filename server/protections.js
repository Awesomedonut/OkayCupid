import express from "express";
import { trustedProxyAddresses } from "./configuration.js";
import { fail } from "./validation.js";
export function installProtections(app, publicOrigin, trustedProxies) {
  app.set("trust proxy", trustedProxyAddresses(trustedProxies));
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    });
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (!req.is("application/json"))
        return next(fail(415, "Send JSON for this request."));
      if (req.get("Sec-Fetch-Site") === "cross-site")
        return next(fail(403, "Request origin is not allowed."));
      const origin = req.get("Origin");
      if (origin) {
        try {
          if (
            (publicOrigin
              ? origin !== publicOrigin
              : new URL(origin).host !== req.get("host")) ||
            !["http:", "https:"].includes(new URL(origin).protocol)
          )
            throw Error();
        } catch {
          return next(fail(403, "Request origin is not allowed."));
        }
      }
    }
    next();
  });
  app.use(express.json({ limit: "24kb" }));
  app.use((req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return next(fail(400, "Send a JSON object."));
    next();
  });
}
export function authenticationLimiter() {
  const attempts = new Map();
  const limit = (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of attempts)
      if (entry.until < now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, until: now + 15 * 60000 };
    attempts.set(key, entry);
    entry.count++;
    if (entry.count > 25) {
      res.set("Retry-After", String(Math.ceil((entry.until - now) / 1000)));
      return next(
        fail(429, "Too many attempts. Please try again in 15 minutes."),
      );
    }
    next();
  };
  return limit;
}
