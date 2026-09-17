import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../server/app.js';
const account = (name, gender = 'Nonbinary', desired = ['Woman', 'Man', 'Nonbinary']) => ({ name, email: `${name.toLowerCase()}@example.test`, password: 'long-test-password-only', age: 30, adult: true, gender, desired, city: 'Test city', bio: 'Fictional test account', interests: 'Testing' });
async function instance(database = ':memory:') {
  const { app, db } = createApp({ database });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = 'GET', body, cookie = '', headers = {}) => {
    const res = await fetch(`${base}/api${path}`, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie, ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: res.status, headers: res.headers, cookie: res.headers.get('set-cookie')?.split(';')[0], data: await res.json() };
  };
  return { request, db, close: async () => { await new Promise(resolve => server.close(resolve)); db.close(); } };
}
const a = (answer = 0, extra = {}) => ({ answer, acceptable: [0], importance: 250, private: false, noPreference: false, ...extra });
test('accounts, ownership, eligibility, privacy, export, logout and deletion work together', async () => {
  const s = await instance();
  try {
    const r = s.request;
    assert.equal((await r('/people')).status, 401);
    assert.equal((await r('/answers/1', 'PUT', a())).status, 401);
    assert.equal((await r('/profile', 'PUT', account('Intruder'))).status, 401);
    assert.equal((await r('/account', 'DELETE', { confirm: 'DELETE' })).status, 401);
    assert.equal((await r('/register', 'POST', { ...account('Underage'), age: 17 })).status, 400);
    assert.equal((await r('/register', 'POST', { ...account('NoAttestation'), adult: false })).status, 400);
    const ar = await r('/register', 'POST', account('Alice', 'Woman'));
    assert.equal(ar.status, 201);
    assert.match(ar.headers.get('set-cookie'), /HttpOnly/);
    assert.match(ar.headers.get('set-cookie'), /SameSite=Lax/);
    assert.match(ar.cookie, /^kindred=[a-f0-9]{64}$/);
    const ac = ar.cookie;
    const br = await r('/register', 'POST', account('Bob', 'Man'));
    const bc = br.cookie;
    const alice = (await r('/me', 'GET', undefined, ac)).data;
    const bob = (await r('/me', 'GET', undefined, bc)).data;
    assert.equal((await r('/profile', 'PUT', { ...account('Alice', 'Woman'), id: bob.id, name: 'Alice Edited' }, ac)).status, 200);
    assert.equal((await r('/me', 'GET', undefined, bc)).data.name, 'Bob');
    assert.equal((await r('/me', 'GET', undefined, ac)).data.name, 'Alice Edited');
    const cr = await r('/register', 'POST', account('Casey', 'Nonbinary', ['Nonbinary']));
    const casey = (await r('/me', 'GET', undefined, cr.cookie)).data;
    assert.equal((await r('/register', 'POST', account('Alice'))).status, 409);
    assert.equal((await r('/login', 'POST', { email: account('Alice').email, password: 'incorrect-password' })).status, 401);
    assert.equal((await r('/answers/1', 'PUT', a(), ac, { Origin: 'https://hostile.example' })).status, 403);
    assert.equal((await r('/answers/1', 'PUT', a(), ac, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
    assert.equal((await r('/answers/1', 'PUT', a(), ac, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await r('/answers/999', 'PUT', a(), ac)).status, 400);
    assert.equal((await r('/answers/1', 'PUT', a(9), ac)).status, 400);
    assert.equal((await r('/answers/1', 'PUT', a(0, { acceptable: [0, 0] }), ac)).status, 400);
    assert.equal((await r('/answers/1', 'PUT', a(0, { importance: 42 }), ac)).status, 400);
    assert.equal((await r('/answers/1', 'PUT', a(0, { user_id: bob.id, private: true }), ac)).status, 200);
    assert.deepEqual((await r('/me', 'GET', undefined, bc)).data.answers, {});
    await r('/answers/1', 'PUT', a(1), bc);
    await r('/answers/2', 'PUT', a(), ac);
    await r('/answers/2', 'PUT', a(), bc);
    const comparison = await r(`/people/${bob.id}`, 'GET', undefined, ac);
    assert.equal(comparison.status, 200);
    assert.equal(comparison.data.match.score, 21);
    assert.equal(comparison.data.match.privateOverlap, 1);
    assert.deepEqual(comparison.data.match.shared.map(x => x.id), [2]);
    assert.deepEqual(comparison.data.match.conflicts, []);
    assert.equal(comparison.data.person.email, undefined);
    assert.equal(comparison.data.person.answers, undefined);
    const reverse = (await r(`/people/${alice.id}`, 'GET', undefined, bc)).data;
    assert.deepEqual(reverse.match.shared.map(x => x.id), [2]);
    assert.equal((await r(`/people/${casey.id}`, 'GET', undefined, ac)).status, 404);
    const directory = (await r('/people', 'GET', undefined, ac)).data;
    assert.deepEqual(directory.map(p => p.id), [bob.id]);
    assert.equal(directory[0].email, undefined);
    assert.ok(!JSON.stringify(directory).includes('password'));
    assert.ok(!directory.some(p => p.fictional));
    const exported = (await r('/export', 'GET', undefined, ac)).data;
    assert.equal(exported.answers[1].private, true);
    assert.equal(exported.profile.email, alice.email);
    assert.equal(exported.profile.password, undefined);
    const storage = s.db.prepare('SELECT password FROM users WHERE id = ?').get(alice.id).password;
    assert.notEqual(storage, account('Alice').password);
    assert.match(storage, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
    assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE token = ?').get(ac.slice(8)).n, 0);
    await r('/answers/2', 'DELETE', {}, ac);
    assert.equal((await r('/me', 'GET', undefined, ac)).data.answers[2], undefined);
    assert.ok((await r('/me', 'GET', undefined, bc)).data.answers[2]);
    await r('/answers/3', 'PUT', a(0, { noPreference: true, acceptable: [] }), ac);
    const pref = (await r('/me', 'GET', undefined, ac)).data.answers[3];
    assert.equal(pref.importance, 0);
    assert.deepEqual(pref.acceptable, [0, 1, 2, 3]);
    await r('/logout', 'POST', {}, ac);
    assert.equal((await r('/export', 'GET', undefined, ac)).status, 401);
    const login = await r('/login', 'POST', { email: alice.email, password: account('Alice').password });
    assert.equal(login.status, 200);
    assert.notEqual(login.cookie, ac);
    assert.equal((await r('/account', 'DELETE', { confirm: 'wrong' }, login.cookie)).status, 400);
    assert.equal((await r('/account', 'DELETE', { confirm: 'DELETE' }, login.cookie)).status, 200);
    assert.equal((await r('/me', 'GET', undefined, login.cookie)).data, null);
    assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM answers WHERE user_id = ?').get(alice.id).n, 0);
    assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(alice.id).n, 0);
  } finally { await s.close(); }
});
test('answers and opaque sessions survive closing and reopening the SQLite server', async () => {
  mkdirSync(resolve('.data'), { recursive: true });
  const dir = mkdtempSync(resolve('.data/persistence-test-'));
  const database = `${dir}/test.sqlite`;
  let s = await instance(database);
  try {
    const registration = await s.request('/register', 'POST', account('Persistent'));
    const cookie = registration.cookie;
    await s.request('/answers/7', 'PUT', a(2, { acceptable: [1, 2], importance: 50, private: true }), cookie);
    await s.close();
    s = await instance(database);
    const me = (await s.request('/me', 'GET', undefined, cookie)).data;
    assert.equal(me.name, 'Persistent');
    assert.equal(me.answers[7].answer, 2);
    assert.equal(me.answers[7].private, true);
    s.db.prepare('UPDATE sessions SET expires = 0').run();
    assert.equal((await s.request('/me', 'GET', undefined, cookie)).data, null);
  } finally { await s.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('auth attempts are bounded and demo contains no real account data', async () => {
  const s = await instance();
  try {
    for (let i = 0; i < 25; i++) await s.request('/login', 'POST', {});
    const limited = await s.request('/login', 'POST', {});
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('Retry-After')) > 0);
    const demo = (await s.request('/demo')).data;
    assert.equal(demo.people.length, 8);
    assert.ok(demo.people.every(p => p.fictional && !p.answers && !p.email));
    assert.equal((await s.request('/demo/people/1')).status, 404);
  } finally { await s.close(); }
});

test('API saves all and none as irrelevant while retaining own answers for reverse matching', async () => {
  const s = await instance();
  try {
    const alice = await s.request('/register', 'POST', account('AllNone'));
    const bob = await s.request('/register', 'POST', account('Reverse'));
    const peer = (await s.request('/me', 'GET', undefined, bob.cookie)).data;
    await s.request('/answers/1', 'PUT', a(0), bob.cookie);
    await s.request('/answers/2', 'PUT', a(0), bob.cookie);
    await s.request('/answers/2', 'PUT', a(0), alice.cookie);
    for (const acceptable of [[], [0, 1, 2, 3]]) {
      assert.equal((await s.request('/answers/1', 'PUT', a(1, { acceptable }), alice.cookie)).status, 200);
      const saved = (await s.request('/me', 'GET', undefined, alice.cookie)).data.answers[1];
      assert.equal(saved.answer, 1);
      assert.equal(saved.importance, 0);
      assert.deepEqual(saved.acceptable, acceptable);
      const match = (await s.request(`/people/${peer.id}`, 'GET', undefined, alice.cookie)).data.match;
      assert.equal(match.directionalA, 1);
      assert.equal(match.directionalB, 0.5);
      assert.equal(match.score, 21);
    }
  } finally { await s.close(); }
});
