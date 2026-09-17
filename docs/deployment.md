# Deploying on your own VM

No public deployment is performed by this repository. These are templates for a later operator-controlled VM. Use one app process, Node **22.16.0 or newer** (the minimum for the built-in SQLite backup API), npm, a persistent local disk, and an HTTPS reverse proxy. Run installation and builds as a non-root deployment user. Pin a reviewed revision and run `npm ci`, `npm run build`, `npm test` before switching releases. The current VM verification used Node 22.23.2.

## Persistent runtime

The templates assume the reviewed source and built `dist/` in `/opt/okaycupid`, Node at `/usr/bin/node`, and a dedicated unprivileged `okaycupid` system account. Adjust these paths to your VM. Create `/var/lib/okaycupid`, `/var/backups/okaycupid`, and `/etc/okaycupid` before starting services. The first two directories must be owned by `okaycupid`, mode 0700. Configuration files must be readable only by the operator and service account (for example root:okaycupid, mode 0640, directory mode 0750). Never place writable data inside a release directory that will be replaced.

Copy `deploy/runtime.env.example` to `/etc/okaycupid/runtime.env` and `deploy/backup.env.example` to `/etc/okaycupid/backup.env`; set actual deployment values there. These example files contain no credentials. Keep actual files outside Git. `DATABASE_PATH` must be absolute and identical in both files. Preserve an existing database path when upgrading; the default `.data/kindred.sqlite` and `kindred` session cookie remain compatible with earlier releases. Added tables migrate on startup without changing existing question IDs or options.

Install the three unit templates from `deploy/` into `/etc/systemd/system/`, then as the VM administrator run:

```sh
systemctl daemon-reload
systemctl enable --now okaycupid.service
systemctl enable --now okaycupid-backup.timer
systemctl start okaycupid-backup.service
systemctl status okaycupid.service okaycupid-backup.timer
journalctl -u okaycupid-backup.service
```

The backup service uses separate configuration without Google credentials. Services use restricted file permissions and an unprivileged account. The templates have not been activated on a future VM; verify paths, ownership, successful snapshots, timer execution, and restore on that VM. The online backup reads SQLite WAL safely and can coexist with the app. A failed snapshot exits nonzero; configure existing host monitoring to alert on failed backup jobs and missing recent copies.

Keep the app bound to loopback. Your HTTPS reverse proxy should forward to `127.0.0.1:8788`, preserve `Host` and `Origin`, terminate TLS, and impose suitable request limits. The app does not trust forwarded client IPs: requests through the proxy share its auth rate-limit bucket (25 attempts per 15 minutes). Set `PUBLIC_ORIGIN` to the exact HTTPS origin without a trailing slash. It controls callback URLs and mutation-origin checks. HTTPS origins automatically enable Secure cookies; HTTP origins are accepted only for loopback development. Configure proxy access logs to omit query strings, especially on `/api/auth/google/callback`, so authorization codes are not recorded. The app itself does not log requests, tokens, or answers. Review community moderation and abuse-handling needs before exposing a self-hosted dating service.

## Google OpenID Connect

Create a Google OAuth client of type **Web application** in your own Google Cloud project, configure its consent screen/audience, and enter its client ID and secret only into the server's runtime environment file. Register the exact authorized redirect URI:

```text
https://dating.example.org/api/auth/google/callback
```

Use your real canonical domain in both this URI and `PUBLIC_ORIGIN`. For loopback development use the exact local origin and callback, with a separately configured development OAuth client. No browser Google SDK or client secret is shipped to the frontend. With missing settings the UI explains that Google is unavailable and leaves password sign-in available. Bad deployment configuration or provider failures produce a generic retry message without leaking tokens.

The server uses maintained `openid-client` authorization-code flow with S256 PKCE, nonce, state, signature verification against Google's JWKS, issuer/audience/expiry validation, and a required verified email. Transactions expire after ten minutes, are single use, and are bound to a random HttpOnly SameSite=Lax browser cookie. The library allows a small clock-skew tolerance for token timestamps; keep the VM clock synchronized. Only `openid email` is requested. Access, refresh, and ID tokens are not stored. Temporary server-side state stores only the PKCE verifier, nonce, binding, and ten-minute pending identity data; expired rows are purged on auth activity.

An existing identity uses the stable `google`/`sub` key, even if its Google email changes. A new verified identity with an already-used email is refused automatic linking. Sign into the existing password account and select **Link Google to this account** in Profile. That link must finish in the same authenticated browser session. An identity cannot belong to two members. Password login remains available after linking. A new Google-only account must complete the same age, adult-attestation, profile, and mutual partner-preference validation before insertion into the directory. Google-only accounts have no usable password; they sign in through Google. There is no password recovery or Google unlink feature.

Tests use an isolated local provider with signed synthetic tokens, real code exchange, PKCE, and JWKS validation. They do not prove live Google login. A real Google login remains an operator verification after client/domain configuration.

## Back up and restore

From the release root, with the runtime database path in the environment:

```sh
DATABASE_PATH=/var/lib/okaycupid/okaycupid.sqlite npm run backup -- /var/backups/okaycupid/manual-2026-09-17.sqlite
DATABASE_PATH=/var/lib/okaycupid/okaycupid.sqlite BACKUP_DIRECTORY=/var/backups/okaycupid BACKUP_RETENTION_DAYS=14 npm run backup:scheduled
npm run restore -- /var/backups/okaycupid/manual-2026-09-17.sqlite /var/lib/okaycupid/restored-2026-09-17.sqlite
```

Snapshots use Node's SQLite online backup API, check database integrity and foreign keys, and check the expected app schema. A completed snapshot is written with mode 0600 in a mode 0700 temporary directory, synchronized to disk, and atomically published with an exclusive hard link on the same filesystem. Existing destinations are never overwritten. The parent filesystem must support hard links and fsync. Do not copy a live `.sqlite` file without its WAL; use these commands instead. Use a dedicated, trusted backup directory whose existing permissions are restricted by the operator.

Restore validates the snapshot, creates a **new** destination, and refuses existing destinations or WAL/SHM/journal companions. It preserves accounts, password hashes, identities, answers, explanations, and skips, while clearing sessions and pending sign-ins so restored users must log in again. Stop the app, run restore to a new path, update both environment files to that path, then restart. Keep the old database until verification is complete; the restore command does not delete it. Confirm login, own answers, linked identity, and directory behavior before retiring the old data.

Scheduled retention runs only after a successful snapshot. It deletes only regular files in the dedicated backup directory matching the generated `okaycupid-YYYY-MM-DDTHH-MM-SS.sssZ.sqlite` naming pattern and older than the configured number of days (1–3650). It does not recurse, follow symlinks, or delete other filenames. Manual snapshots have no automatic expiry. Protect the directory from other writers and avoid running multiple scheduled jobs simultaneously; systemd serializes the supplied oneshot service.

**Same-disk snapshots do not survive VM or disk loss.** Copy completed snapshots to an existing off-VM destination using authenticated transport and encryption under keys held separately from the VM. The destination, transport credentials, encryption keys, and schedule are operator configuration; no storage is purchased or provisioned here. Verify transferred copies and regularly restore one on an isolated host. Protect password hashes, private answers, and identity data in backups just as carefully as the live database. Coordinate off-VM retention with local retention and account-deletion policy. Deletion from the app does not erase previous snapshots or disk blocks.
