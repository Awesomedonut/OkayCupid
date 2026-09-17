import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { activeQuestionIds } from "../shared/questions.js";
export function openDatabase(database) {
  if (database !== ":memory:")
    mkdirSync(dirname(resolve(database)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(database);
  if (database !== ":memory:") chmodSync(database, 0o600);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, age INTEGER NOT NULL, gender TEXT NOT NULL, desired TEXT NOT NULL, city TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', interests TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS answers (user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, question_id INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY(user_id, question_id));
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);`);
  db.exec(
    "CREATE TABLE IF NOT EXISTS skipped (user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, question_id INTEGER NOT NULL, PRIMARY KEY(user_id, question_id))",
  );
  const getSkipped = (id, includeRetired = false) =>
    db
      .prepare("SELECT question_id FROM skipped WHERE user_id = ?")
      .all(id)
      .map((r) => r.question_id)
      .filter((id) => includeRetired || activeQuestionIds.has(id));
  const getIdentities = (id) =>
    db
      .prepare("SELECT provider, subject FROM identities WHERE user_id = ?")
      .all(id);
  const getAnswers = (id, includeRetired = false) =>
    Object.fromEntries(
      db
        .prepare("SELECT question_id, value FROM answers WHERE user_id = ?")
        .all(id)
        .filter((r) => includeRetired || activeQuestionIds.has(r.question_id))
        .map((r) => [r.question_id, JSON.parse(r.value)]),
    );
  const profile = (row) => ({
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender,
    desired: JSON.parse(row.desired),
    city: row.city,
    bio: row.bio,
    interests: row.interests,
    fictional: false,
  });
  const removeSkipped = (memberId, questionId) =>
    db
      .prepare("DELETE FROM skipped WHERE user_id = ? AND question_id = ?")
      .run(memberId, questionId);
  const markSkipped = (memberId, questionId) =>
    db
      .prepare("INSERT OR IGNORE INTO skipped VALUES (?, ?)")
      .run(memberId, questionId);
  const removeAnswer = (memberId, questionId) =>
    db
      .prepare("DELETE FROM answers WHERE user_id = ? AND question_id = ?")
      .run(memberId, questionId);
  function saveAnswer(memberId, questionId, answer) {
    db.prepare(
      "INSERT INTO answers VALUES (?, ?, ?) ON CONFLICT(user_id, question_id) DO UPDATE SET value = excluded.value",
    ).run(memberId, questionId, JSON.stringify(answer));
    removeSkipped(memberId, questionId);
  }
  return {
    db,
    getSkipped,
    getIdentities,
    getAnswers,
    profile,
    saveAnswer,
    removeAnswer,
    markSkipped,
    removeSkipped,
  };
}
