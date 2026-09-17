# Kindred

A self-hostable, question-based way to explore compatibility. Answer what matters, choose the answers you accept in a partner, and look at both shared ground and differences. No swiping, external images, paid services, or sensitive-answer analytics.

Kindred includes 160 original questions across eight topics, persistent adult accounts, a separate fictional demo, mutual gender preferences, searchable member lists, transparent matching, private answers, profile editing, export, and account deletion. Its cream, plum, and persimmon interface works on desktop and narrow screens.

## Run locally

Requires Node.js **22.13 or newer** with `node:sqlite` and npm. Node 22 may print an experimental SQLite warning. The app uses JavaScript modules, React, Vite, Express, and Node’s SQLite and crypto APIs; there is no external database service.

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:8788**. The default bind address is loopback. The demo is available immediately from “Explore the demo”; it never inserts fictional members into your database. Create an account to answer for yourself. Real discovery includes only other real members whose preferences are mutual. An empty real directory on a new installation is expected.

| Setting | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | HTTP bind address |
| `PORT` | `8788` | HTTP port |
| `DATABASE_PATH` | `.data/kindred.sqlite` | Persistent database path |
| `COOKIE_SECURE` | `false` | Set `true` when serving through HTTPS |

Run from the repository root so static assets resolve correctly. `npm start` serves the built frontend and API in one process. Keep the same database path across restarts. The database directory is created with owner-only permissions and the database file is set to mode 0600. Existing parent directory permissions remain the operator’s responsibility.

For frontend development, run `npm start` in one terminal and `npm run dev` in another. Vite proxies `/api` to loopback port 8788. A build is required for the frontend served directly by Express.

## Use it

1. Explore the fictional community as Alex, or register an adult account with a password of at least 12 characters.
2. In Questions, select your answer, all acceptable partner answers, and importance. “No preference” sets zero weight. Save, edit, skip, remove, or mark an answer private.
3. Navigate topics or filter answered/unanswered questions. Saving is explicit; skipping does not erase a saved answer. Reloading retains saved answers.
4. Discover eligible people. Search by name, biography, or interests; filter city, age band, compatibility, and shared topics. Sort by compatibility, overlap, or name.
5. Open a comparison to see both directional satisfaction fractions, overlap, shared answers, and important differences. Private answer details are excluded.
6. Open your name in the header to edit your profile, export your own data as JSON, or permanently delete your account from the active database.

See [the matching specification and historical sources](docs/matching.md). Scores summarize preferences, not chemistry or safety. Historical uncertainty and deliberate deviations are documented there.

## Tests

```sh
npm test
npx playwright install chromium
npm run build
npm run test:e2e
```

The unit/API suite tests asymmetric weights, zero/unknown scores, no preference, privacy in both directions, eligibility, self-only writes, invalid inputs, password storage, opaque sessions, request origin protections, authentication rate limits, logout, export, deletion, and reopening SQLite with saved answers and sessions.

Playwright runs four journeys using one worker: demo and real-account flows at desktop and 390-pixel mobile widths. It launches an isolated server on loopback **8799** using a temporary database beneath ignored `.data/`; stop any unrelated service occupying that port before running. It never uses or resets the app’s normal database. Tests cover registration, saving/editing, private comparisons, visible conflicts, filters, profile editing, login/logout, export, deletion, and horizontal overflow. Set `PLAYWRIGHT_BROWSERS_PATH` if the browser cache is in a custom location. Set `EVIDENCE_DIR` to an existing directory outside the repository to save fictional-demo screenshots and browser test output there. Without it, screenshots are not saved and test output uses ignored `test-results/`.

GitHub Actions installs the lockfile dependencies, builds, runs API/unit tests, and runs the Chromium journeys. Browser binaries and system dependencies must be available on the host; CI installs them explicitly.

## Data and operational limits

Passwords use Node/OpenSSL scrypt with a random 128-bit salt, N=32768, r=8, p=3, and a 64-byte output. Comparison uses constant-time equality. At most two password derivations run concurrently. Passwords are neither logged nor stored directly. Sessions use 256-bit random opaque tokens; only SHA-256 token digests are stored. Cookies are HttpOnly and SameSite=Lax, with seven-day absolute expiry. Logout invalidates the current session; deletion invalidates all sessions by cascading foreign keys.

Mutations require JSON and reject foreign Origin headers and cross-site Fetch Metadata. Cross-origin access is not enabled. Authentication is limited to 25 attempts per IP per 15 minutes in memory; these counters reset on restart. The server does not trust forwarded IP headers. An HTTPS reverse proxy must preserve Host and Origin, and `COOKIE_SECURE=true` should be set. Proxy traffic shares its IP rate-limit bucket unless the architecture is deliberately revised. The default is intended for loopback inspection; this repository does not deploy a public network service.

Account age is self-attested. There is no email verification, password recovery, messaging, blocking/reporting, identity verification, or moderation team. A lost password cannot be reset through the app. This is not a claim of production moderation readiness. The directory currently loads candidates and their answers into memory for scoring, suitable for small self-hosted communities rather than large-scale public service. Use one app process per database.

Private answers affect aggregate scores and can yield indirect clues; they are not end-to-end encrypted. Operators control the database. Export files include sensitive own answers and should be kept private. Do not put databases, exports, logs, credentials, browser artifacts, or private screenshots in Git. The app sends no answer telemetry and loads no third-party runtime assets.

For backups, stop the app before copying the SQLite database, or use a SQLite-aware online backup tool that handles WAL files. Account deletion removes active rows and sessions; it does not promise secure erasure of disk blocks or operator backup copies. Set a backup retention policy appropriate to your users. No automatic backup or retention system is supplied.

## License

[MIT](LICENSE). Kindred is independent of OkCupid and TED. External historical sources remain their authors’ works.
