import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { scrypt, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { questions, topics } from '../shared/questions.js';
import { compare, eligible, weights } from '../shared/matching.js';
import { demo, genders } from './demo.js';
const derive = promisify(scrypt);
const hash = value => createHash('sha256').update(value).digest('hex');
const clean = (value, max, min = 0) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
const fail = (status, message) => Object.assign(new Error(message), { status });
export function createApp({ database = process.env.DATABASE_PATH || '.data/kindred.sqlite', secureCookies = process.env.COOKIE_SECURE === 'true' } = {}) {
  if (database !== ':memory:') mkdirSync(dirname(resolve(database)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(database);
  if (database !== ':memory:') chmodSync(database, 0o600);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, age INTEGER NOT NULL, gender TEXT NOT NULL, desired TEXT NOT NULL, city TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', interests TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS answers (user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, question_id INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY(user_id, question_id));
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);`);
  let activeHashes = 0;
  const passwordKey = async (password, salt) => {
    if (activeHashes >= 2) throw fail(429, 'Sign-in is busy. Please try again shortly.');
    activeHashes++;
    try { return await derive(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }); }
    finally { activeHashes--; }
  };
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
    if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!req.is('application/json')) return next(fail(415, 'Send JSON for this request.'));
      if (req.get('Sec-Fetch-Site') === 'cross-site') return next(fail(403, 'Request origin is not allowed.'));
      const origin = req.get('Origin');
      if (origin) {
        try { if (new URL(origin).host !== req.get('host') || !['http:', 'https:'].includes(new URL(origin).protocol)) throw Error(); }
        catch { return next(fail(403, 'Request origin is not allowed.')); }
      }
    }
    next();
  });
  app.use(express.json({ limit: '24kb' }));
  app.use((req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) return next(fail(400, 'Send a JSON object.'));
    next();
  });
  const getAnswers = id => Object.fromEntries(db.prepare('SELECT question_id, value FROM answers WHERE user_id = ?').all(id).map(r => [r.question_id, JSON.parse(r.value)]));
  const profile = row => ({ id: row.id, name: row.name, age: row.age, gender: row.gender, desired: JSON.parse(row.desired), city: row.city, bio: row.bio, interests: row.interests, fictional: false });
  const tokenFrom = req => {
    const token = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('kindred='))?.slice(8);
    return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
  };
  app.use('/api', (req, res, next) => {
    const token = tokenFrom(req);
    if (token) req.member = db.prepare('SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires > ?').get(hash(token), Date.now());
    next();
  });
  const required = (req, res, next) => req.member ? next() : next(fail(401, 'Please sign in to continue.'));
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' };
  const session = (res, id) => {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hash(token), id, Date.now() + 7 * 86400000);
    res.cookie('kindred', token, { ...cookieOptions, maxAge: 7 * 86400000 });
  };
  const attempts = new Map();
  const limit = (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, until: now + 15 * 60000 };
    attempts.set(key, entry); entry.count++;
    if (entry.count > 25) { res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000))); return next(fail(429, 'Too many attempts. Please try again in 15 minutes.')); }
    next();
  };
  const validateProfile = body => {
    if (!clean(body.name, 60, 1) || !Number.isInteger(body.age) || body.age < 18 || body.age > 110 || !genders.includes(body.gender) || !Array.isArray(body.desired) || !body.desired.length || body.desired.some(v => !genders.includes(v)) || new Set(body.desired).size !== body.desired.length || !clean(body.city, 80) || !clean(body.bio, 1200) || !clean(body.interests, 160)) throw fail(400, 'Please provide a name, age 18–110, gender, partner preferences, and valid profile fields.');
  };
  app.get('/api/questions', (req, res) => res.json({ questions, topics }));
  app.get('/api/me', (req, res) => res.json(req.member ? { ...profile(req.member), email: req.member.email, answers: getAnswers(req.member.id) } : null));
  app.post('/api/register', limit, async (req, res) => {
    const b = req.body;
    validateProfile(b);
    if (b.adult !== true) throw fail(400, 'You must confirm that you are at least 18.');
    if (!clean(b.email, 254, 3) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()) || typeof b.password !== 'string' || b.password.length < 12 || b.password.length > 128) throw fail(400, 'Use a valid email and a password of 12–128 characters.');
    const salt = randomBytes(16).toString('hex');
    const key = await passwordKey(b.password, salt);
    let id;
    try { id = Number(db.prepare('INSERT INTO users (email, password, name, age, gender, desired, city, bio, interests) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(b.email.trim().toLowerCase(), `${salt}:${key.toString('hex')}`, b.name.trim(), b.age, b.gender, JSON.stringify(b.desired), b.city.trim(), b.bio.trim(), b.interests.trim()).lastInsertRowid); }
    catch (error) { if (error.errcode === 2067) throw fail(409, 'An account with that email already exists.'); throw error; }
    session(res, id);
    res.status(201).json({ ok: true });
  });
  app.post('/api/login', limit, async (req, res) => {
    const { email, password } = req.body;
    if (!clean(email, 254, 3) || typeof password !== 'string' || password.length > 128) throw fail(400, 'Enter your email and password.');
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    const [salt, stored] = row ? row.password.split(':') : ['00000000000000000000000000000000', '00'.repeat(64)];
    const key = await passwordKey(password, salt);
    if (!timingSafeEqual(key, Buffer.from(stored, 'hex')) || !row) throw fail(401, 'Email or password is incorrect.');
    const old = tokenFrom(req);
    if (old) db.prepare('DELETE FROM sessions WHERE token = ?').run(hash(old));
    session(res, row.id); res.json({ ok: true });
  });
  app.post('/api/logout', (req, res) => {
    const token = tokenFrom(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(hash(token));
    res.clearCookie('kindred', cookieOptions).json({ ok: true });
  });
  app.put('/api/profile', required, (req, res) => {
    validateProfile(req.body);
    const b = req.body;
    db.prepare('UPDATE users SET name = ?, age = ?, gender = ?, desired = ?, city = ?, bio = ?, interests = ? WHERE id = ?').run(b.name.trim(), b.age, b.gender, JSON.stringify(b.desired), b.city.trim(), b.bio.trim(), b.interests.trim(), req.member.id);
    res.json({ ok: true });
  });
  app.put('/api/answers/:id', required, (req, res) => {
    const q = questions.find(q => String(q.id) === req.params.id), a = req.body;
    if (!q || !Number.isInteger(a.answer) || a.answer < 0 || a.answer >= q.options.length || !Array.isArray(a.acceptable) || a.acceptable.some(v => !Number.isInteger(v) || v < 0 || v >= q.options.length) || new Set(a.acceptable).size !== a.acceptable.length || !weights.includes(a.importance) || typeof a.private !== 'boolean' || typeof a.noPreference !== 'boolean') throw fail(400, 'Choose your answer, acceptable partner answers, and importance.');
    const value = { answer: a.answer, acceptable: a.noPreference ? q.options.map((_, i) => i) : a.acceptable, importance: a.noPreference || a.acceptable.length === 0 || a.acceptable.length === q.options.length ? 0 : a.importance, private: a.private, noPreference: a.noPreference };
    db.prepare('INSERT INTO answers VALUES (?, ?, ?) ON CONFLICT(user_id, question_id) DO UPDATE SET value = excluded.value').run(req.member.id, q.id, JSON.stringify(value));
    res.json({ ok: true });
  });
  app.delete('/api/answers/:id', required, (req, res) => { db.prepare('DELETE FROM answers WHERE user_id = ? AND question_id = ?').run(req.member.id, req.params.id); res.json({ ok: true }); });
  const summaries = (viewer, people) => people.filter(p => eligible(viewer, p)).map(person => {
    const { answers, ...publicProfile } = person;
    const match = compare(viewer.answers, answers, questions);
    return { ...publicProfile, match: { score: match.score, overlap: match.overlap, meaningful: match.meaningful, confidence: match.confidence, strongConflicts: match.conflicts.filter(c => c.strong).length, topics: match.topics } };
  }).sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1) || b.match.overlap - a.match.overlap);
  app.get('/api/demo', (req, res) => res.json({ viewer: demo[0], people: summaries(demo[0], demo) }));
  app.get('/api/demo/people/:id', (req, res) => {
    const person = demo.find(p => p.id === req.params.id && p.id !== demo[0].id);
    if (!person) throw fail(404, 'Person not found.');
    const { answers, ...publicProfile } = person;
    res.json({ person: publicProfile, match: compare(demo[0].answers, answers, questions) });
  });
  app.get('/api/people', required, (req, res) => {
    const viewer = { ...profile(req.member), answers: getAnswers(req.member.id) };
    const people = db.prepare('SELECT * FROM users WHERE id != ?').all(req.member.id).map(row => ({ ...profile(row), answers: getAnswers(row.id) }));
    res.json(summaries(viewer, people));
  });
  app.get('/api/people/:id', required, (req, res) => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    const viewer = profile(req.member);
    if (!row || !eligible(viewer, profile(row))) throw fail(404, 'Person not found or preferences do not align.');
    res.json({ person: profile(row), match: compare(getAnswers(req.member.id), getAnswers(row.id), questions) });
  });
  app.get('/api/export', required, (req, res) => res.attachment('okaycupid-your-data.json').json({ profile: { ...profile(req.member), email: req.member.email }, answers: getAnswers(req.member.id), questions, exportedAt: new Date().toISOString() }));
  app.delete('/api/account', required, (req, res) => {
    if (req.body.confirm !== 'DELETE') throw fail(400, 'Type DELETE to confirm.');
    db.prepare('DELETE FROM users WHERE id = ?').run(req.member.id);
    res.clearCookie('kindred', cookieOptions).json({ ok: true });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'This endpoint does not exist.' }));
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (req, res) => res.sendFile(resolve('dist/index.html')));
  app.use((error, req, res, next) => {
    const status = error.status || 500;
    res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : error.message });
  });
  return { app, db };
}
