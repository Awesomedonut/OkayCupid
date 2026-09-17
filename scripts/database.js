import { DatabaseSync, backup } from "node:sqlite";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
function check(db) {
  if (
    db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok" ||
    db.prepare("PRAGMA foreign_key_check").all().length
  )
    throw Error("SQLite integrity check failed.");
  for (const table of [
    "users",
    "answers",
    "sessions",
    "identities",
    "skipped",
  ]) {
    if (
      !db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        )
        .get(table)
    )
      throw Error("Not a current okaycupid database.");
  }
}
export async function snapshot(source, destination, restore = false) {
  source = resolve(source);
  destination = resolve(destination);
  if (!existsSync(source)) throw Error("Source database does not exist.");
  if (
    [
      destination,
      `${destination}-wal`,
      `${destination}-shm`,
      `${destination}-journal`,
    ].some(existsSync)
  )
    throw Error(
      "Destination already exists or may be live. Restore only to a new path.",
    );
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  const temp = mkdtempSync(join(dirname(destination), ".okaycupid-snapshot-"));
  chmodSync(temp, 0o700);
  const file = join(temp, "snapshot.sqlite");
  let db;
  try {
    db = new DatabaseSync(source, { readOnly: true });
    check(db);
    await backup(db, file);
    db.close();
    db = null;
    chmodSync(file, 0o600);
    db = new DatabaseSync(file);
    check(db);
    if (restore)
      db.exec(
        "DELETE FROM sessions; DELETE FROM oidc_transactions; DELETE FROM oidc_pending;",
      );
    db.exec("PRAGMA journal_mode = DELETE");
    db.close();
    db = null;
    const fd = openSync(file, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    linkSync(file, destination);
    const directory = openSync(dirname(destination), "r");
    try {
      fsyncSync(directory);
    } finally {
      closeSync(directory);
    }
    return destination;
  } finally {
    if (db) db.close();
    rmSync(temp, { recursive: true, force: true });
  }
}
export async function scheduledBackup(source, directory, retention = 14) {
  if (!Number.isInteger(retention) || retention < 1 || retention > 3650)
    throw Error("Retention must be 1–3650 days.");
  const name = `okaycupid-${new Date().toISOString().replaceAll(":", "-")}.sqlite`;
  const completed = await snapshot(source, join(directory, name));
  const cutoff = Date.now() - retention * 86400000;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      /^okaycupid-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z\.sqlite$/.test(
        entry.name,
      )
    ) {
      const file = join(directory, entry.name);
      if (statSync(file).mtimeMs < cutoff && resolve(file) !== completed)
        rmSync(file);
    }
  }
  return completed;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [action, first, second] = process.argv.slice(2);
  try {
    if (action === "backup" && first)
      await snapshot(
        process.env.DATABASE_PATH || ".data/kindred.sqlite",
        first,
      );
    else if (action === "restore" && first && second)
      await snapshot(first, second, true);
    else if (action === "scheduled" && process.env.BACKUP_DIRECTORY)
      await scheduledBackup(
        process.env.DATABASE_PATH || ".data/kindred.sqlite",
        process.env.BACKUP_DIRECTORY,
        Number(process.env.BACKUP_RETENTION_DAYS || 14),
      );
    else
      throw Error(
        "Use backup DESTINATION, restore SNAPSHOT NEW_DATABASE, or scheduled with BACKUP_DIRECTORY.",
      );
    process.stdout.write("SQLite operation completed and integrity checked.\n");
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
