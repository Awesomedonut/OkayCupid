# okaycupid

A self-hostable, question-based way to explore compatibility. Answer what matters, choose the answers you accept in a partner, and look at both shared ground and differences. No swiping, external images, paid services, or sensitive-answer analytics.

okaycupid includes 79 real historical prompts with documented answer choices across eight topics, persistent adult accounts, a separate fictional demo, mutual gender preferences, searchable member lists, transparent matching, private answers, profile editing, export, and account deletion. Its cobalt, coral, and pale butter interface uses bold sans headings, outlined cards, and keyboard-visible controls on desktop and narrow screens.

## Run locally

Requires Node.js **22.16 or newer** with `node:sqlite` and npm. Node 22 may print an experimental SQLite warning. The app uses JavaScript modules, React, Vite, Express, and Node’s SQLite and crypto APIs; there is no external database service.

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
| `PUBLIC_ORIGIN` | unset | Canonical HTTPS origin for Google callbacks and origin checks |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | unset | Optional server-only Google OAuth client configuration |
| `TRUSTED_PROXIES` | unset (no trust) | Explicit proxy IP addresses/CIDRs; see deployment guide |
| `COOKIE_SECURE` | `false` | Set `true` when serving through HTTPS |

Run from the repository root so static assets resolve correctly. `npm start` serves the built frontend and API in one process. Keep the same database path across restarts. The database directory is created with owner-only permissions and the database file is set to mode 0600. Existing parent directory permissions remain the operator’s responsibility.

For frontend development, run `npm start` in one terminal and `npm run dev` in another. Vite proxies `/api` to loopback port 8788. A build is required for the frontend served directly by Express.

## Use it

1. Explore the fictional community as Alex, or register an adult account with a password of at least 12 characters.
2. Questions opens the historical collection. Choose a collection or topic, search, then select your answer, all acceptable partner answers, and importance. “No preference,” all acceptable options, or none sets zero directional weight while preserving your own answer. Save, edit, skip, remove, or mark an answer private.
3. Navigate topics or search across all questions or filter answered/unanswered/skipped questions. Saving is explicit; skipping does not erase a saved answer. Reloading retains saved answers, optional explanations, and skip/revisit markers. Save & next advances after saving; saving a skipped question clears its revisit marker.
4. Discover eligible people. Search by name, biography, or interests; filter city, age band, compatibility, and shared topics. Sort by compatibility, overlap, or name.
5. Open a comparison to see both directional satisfaction fractions, overlap, shared answers, and important differences. Private answer details are excluded.
6. Open your name in the header to edit your profile, export your own data as JSON, or permanently delete your account from the active database.

The questionnaire is pulled exclusively from real historical OkCupid questions and documented answer choices. No AI-written questionnaire prompts or invented choices are used. This recovered subset contains **79 questions**, not the complete early bank:

- [Official OkTrends article, February 8, 2011, archived February 9](https://web.archive.org/web/20110209230710/http://blog.okcupid.com/index.php/the-best-questions-for-first-dates/): 166 chart prompt entries, without choice sets.
- [Infochimps listing, archived October 31, 2011](https://web.archive.org/web/20111031212852/http://www.infochimps.com/datasets/personality-insights-okcupid-questions-and-answers-by-gender-age): 28 complete question/choice sets.
- [Original question screenshot, February 2011 archive](https://web.archive.org/web/20110209230710im_/http://cdn.okccdn.com/blog/first_date_questions/PrivateQuestion2.png): the child-partner question's exact Yes/No display and privacy control.
- [Question-only CSV, fixed January 21, 2022 revision](https://github.com/mathigatti/okCupidScraper/blob/47967ab9745e13300b46a7ead2e5c0d1b02fe216/questions.csv): 3,318 parsed records, with 54 prompts corroborating the early chart. We use its choices for 51 early prompts; two more use the earlier listing's choices. One additional matching prompt is outside this selected subset. Later choices are not claimed to be verified 2011 wording.

Every active question exposes its prompt and choice provenance. IDs and option meanings remain stable. Retired IDs 1–161 and 163 are excluded from the catalog, answering, progress, discovery and matching. Their stored owner records remain in JSON exports with retirement metadata; upgrades do not delete accounts, sessions, answers or skips.

See [the matching specification and historical sources](docs/matching.md). Published scores subtract the historical 1/N adjustment from raw geometric compatibility, clamped at zero. Scores summarize preferences, not chemistry or safety. Historical uncertainty and deliberate deviations are documented there.

## Tests

```sh
npm test
npx playwright install chromium
npm run build
npm run test:e2e
```

The unit/API suite tests asymmetric weights, the historical 1/N adjustment at 1/2/50/100 overlaps, zero/unknown scores, all/none acceptable options, no preference, privacy in both directions, eligibility, self-only writes, invalid inputs, password storage, opaque sessions, request origin protections, authentication rate limits, logout, export, deletion, and reopening SQLite with saved answers and sessions.

Playwright runs desktop and mobile journeys using one worker: demo, password-account, mock-Google, and draft/session flows at desktop and 390-pixel mobile widths. It launches an isolated server on loopback **8799** using a temporary database beneath ignored `.test-data/` (or `TEST_DATA_ROOT`); confirm ports 8799 and 8800 are free before running. If occupied, wait or use a separate test environment; never stop unrelated services. A separate local mock OIDC provider runs on loopback port 8800. It never uses or resets the app’s normal database. Tests cover registration, saving/editing, private comparisons, visible conflicts, filters, profile editing, login/logout, export, deletion, and horizontal overflow. Set `PLAYWRIGHT_BROWSERS_PATH` if the browser cache is in a custom location. Set `EVIDENCE_DIR` to an existing directory outside the repository to save fictional-demo screenshots and browser test output there. Without it, screenshots are not saved and test output uses ignored `test-results/`.

GitHub Actions installs the lockfile dependencies, builds, runs API/unit tests, and runs the Chromium journeys. Browser binaries and system dependencies must be available on the host; CI installs them explicitly.

## Data and operational limits

Passwords use Node/OpenSSL scrypt with a random 128-bit salt, N=32768, r=8, p=3, and a 64-byte output. Comparison uses constant-time equality. At most two password derivations run concurrently. Passwords are neither logged nor stored directly. Sessions use 256-bit random opaque tokens; only SHA-256 token digests are stored. Cookies are HttpOnly and SameSite=Lax, with seven-day absolute expiry. Logout invalidates the current session; deletion invalidates all sessions by cascading foreign keys.

Mutations require JSON and reject foreign Origin headers and cross-site Fetch Metadata. Cross-origin access is not enabled. Authentication is limited to 25 attempts per IP per 15 minutes in memory; these counters reset on restart. By default the server does not trust forwarded IP headers. For the supported loopback reverse proxy, bind the app to `127.0.0.1`, set `TRUSTED_PROXIES=127.0.0.1/32,::1/128` and `COOKIE_SECURE=true`, and configure the proxy to overwrite X-Forwarded-For with the connecting client address, preserving Host and Origin. Only explicitly configured proxy addresses/subnets are trusted; never use blanket trust. See [deployment configuration](docs/deployment.md) for the supported header and binding setup. The default is intended for loopback inspection; this repository does not deploy a public network service.

Account age is self-attested. Password accounts do not verify email; Google accounts require Google-verified email. There is no password recovery, messaging, blocking/reporting, identity verification, or moderation team. A lost password cannot be reset through the app. This is not a claim of production moderation readiness. The directory currently loads candidates and their answers into memory for scoring, suitable for small self-hosted communities rather than large-scale public service. Use one app process per database.

Private answers affect aggregate scores and can yield indirect clues; they are not end-to-end encrypted. Operators control the database. Export files include sensitive own answers and should be kept private. Do not put databases, exports, logs, credentials, browser artifacts, or private screenshots in Git. The app sends no answer telemetry and loads no third-party runtime assets.

Use `npm run backup -- SNAPSHOT_PATH` for a consistent online SQLite snapshot and `npm run restore -- SNAPSHOT_PATH NEW_DATABASE_PATH` for an integrity-checked restore to a new path. Scheduled snapshot/retention templates are included. Same-disk snapshots cannot survive VM loss: encrypted off-VM copies and restore drills require operator configuration. See [deployment, Google setup, backup and restore](docs/deployment.md). No public deployment or external storage is provisioned. Live Google login awaits operator client/domain configuration; automated Google verification uses a local mock provider.

## License

[MIT](LICENSE). okaycupid is independent of OkCupid and TED. External historical sources remain their authors’ works. See [source attribution and third-party notices](THIRD_PARTY_NOTICES.md).
