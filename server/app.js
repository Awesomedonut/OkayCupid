import express from "express";
import { resolve } from "node:path";
import { googleAuth } from "./google.js";
import { openDatabase } from "./database.js";
import { cookieSecurity } from "./configuration.js";
import { passwordHasher } from "./passwords.js";
import { installSessions } from "./sessions.js";
import { installProtections, authenticationLimiter } from "./protections.js";
import { validateProfile } from "./validation.js";
import { authenticationRoutes } from "./routes/authentication.js";
import { questionnaireRoutes } from "./routes/questionnaire.js";
import { discoveryRoutes } from "./routes/discovery.js";
import { accountRoutes } from "./routes/account.js";
export function createApp({
  database = process.env.DATABASE_PATH || ".data/kindred.sqlite",
  secureCookies = process.env.COOKIE_SECURE === "true",
  publicOrigin = process.env.PUBLIC_ORIGIN,
  googleConfiguration,
  trustedProxies = process.env.TRUSTED_PROXIES || "",
} = {}) {
  secureCookies = cookieSecurity(publicOrigin, secureCookies);
  const app = express();
  installProtections(app, publicOrigin, trustedProxies);
  const store = openDatabase(database);
  const { db } = store;
  const sessions = installSessions(app, db, secureCookies);
  const { session, required, cookieOptions } = sessions;
  const limit = authenticationLimiter();
  const passwordKey = passwordHasher();
  googleAuth({
    app,
    db,
    session,
    required,
    limit,
    validateProfile,
    cookieOptions,
    publicOrigin,
    configuration: googleConfiguration,
  });
  authenticationRoutes({ app, ...store, ...sessions, limit, passwordKey });
  questionnaireRoutes({ app, ...store, ...sessions });
  discoveryRoutes({ app, ...store, ...sessions });
  accountRoutes({ app, ...store, ...sessions });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "This endpoint does not exist." }),
  );
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
  app.use((error, req, res, next) => {
    const status = error.status || 500;
    res.status(status).json({
      error:
        status >= 500
          ? "Something went wrong. Please try again."
          : error.message,
    });
  });
  return { app, db };
}
