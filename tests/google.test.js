import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { mockGoogle } from './mock-google.js';
const profile = { name: 'Mock adult', age: 29, adult: true, gender: 'Nonbinary', desired: ['Nonbinary'], city: 'Testville', bio: 'Fictional', interests: 'Books' };
async function fixture() {
  const provider = await mockGoogle();
  const result = createApp({ database: ':memory:', publicOrigin: 'http://127.0.0.1', googleConfiguration: provider.configuration });
  const server = await new Promise(resolve => { const s = result.app.listen(0, '127.0.0.1', () => resolve(s)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, options = {}) => fetch(`${origin}${path}`, { redirect: 'manual', ...options });
  const begin = async (session = '', link = false) => {
    const member = link ? await (await request('/api/me', { headers: { cookie: session } })).json() : null;
    const start = await request(`/api/auth/google/start${link ? `?link=1&member=${member.mutationContext}` : ''}`, { headers: { cookie: session } });
    const browser = start.headers.getSetCookie()[0].split(';')[0];
    const authorize = await fetch(start.headers.get('location'), { redirect: 'manual' });
    const callback = new URL(authorize.headers.get('location'));
    return { path: callback.pathname + callback.search, browser, state: callback.searchParams.get('state'), session };
  };
  const finish = tx => request(tx.path, { headers: { cookie: [tx.browser, tx.session].filter(Boolean).join('; ') } });
  const post = (path, body, cookie = '') => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(body) });
  return { ...result, provider, request, begin, finish, post, close: async () => { await new Promise(resolve => server.close(resolve)); result.db.close(); await provider.close(); } };
}
test('mock Google validates state binding, single use, expiry and signed token claims', async () => {
  const f = await fixture();
  try {
    let tx = await f.begin();
    assert.match((await f.finish({ ...tx, browser: 'okaycupid_oidc=wrong' })).headers.get('location'), /expired/);
    assert.match((await f.finish(tx)).headers.get('location'), /expired/);
    tx = await f.begin(); f.db.prepare('UPDATE oidc_transactions SET expires = 0').run();
    assert.match((await f.finish(tx)).headers.get('location'), /expired/);
    for (const invalid of ['badNonce', 'badAudience', 'badIssuer', 'badSignature', 'expired']) {
      f.provider.setBehavior({ [invalid]: true }); tx = await f.begin();
      assert.match((await f.finish(tx)).headers.get('location'), /failed/, invalid);
    }
    f.provider.setBehavior({ verified: false });
    assert.match((await f.finish(await f.begin())).headers.get('location'), /failed/);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM users').get().n, 0);
  } finally { await f.close(); }
});
test('mock Google onboarding, stable identity, collision protection and authenticated linking', async () => {
  const f = await fixture();
  try {
    const tx = await f.begin();
    const callback = await f.finish(tx);
    assert.equal(callback.headers.get('location'), '/#google-onboarding');
    assert.match((await f.finish(tx)).headers.get('location'), /expired/);
    const pending = callback.headers.getSetCookie()[0].split(';')[0];
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM users').get().n, 0);
    assert.equal((await f.post('/api/auth/google/complete', { ...profile, age: 17 }, pending)).status, 400);
    assert.equal((await f.post('/api/auth/google/complete', { ...profile, adult: false }, pending)).status, 400);
    const complete = await f.post('/api/auth/google/complete', profile, pending);
    assert.equal(complete.status, 201);
    const session = complete.headers.getSetCookie()[0].split(';')[0];
    assert.equal((await f.post('/api/auth/google/complete', profile, pending)).status, 401);
    const exported = await (await f.request('/api/export', { headers: { cookie: session } })).json();
    assert.deepEqual(exported.identities, [{ provider: 'google', subject: 'mock-subject' }]);
    assert.ok(!JSON.stringify(exported).includes('mock-only-access'));
    assert.equal((await f.post('/api/login', { email: 'google-adult@example.test', password: 'anything' })).status, 401);
    f.provider.setBehavior({ email: 'changed@example.test' });
    assert.equal((await f.finish(await f.begin())).headers.get('location'), '/#questions');
    f.provider.setBehavior({ sub: 'another-subject', email: 'google-adult@example.test' });
    assert.match((await f.finish(await f.begin())).headers.get('location'), /collision/);
    const registration = await f.post('/api/register', { ...profile, email: 'password@example.test', password: 'long-password-for-tests' });
    const passwordSession = registration.headers.getSetCookie()[0].split(';')[0];
    const staleStart = await f.request('/api/auth/google/start?link=1&member=wrong', { headers: { cookie: passwordSession } });
    assert.match(staleStart.headers.get('location'), /signin/);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM oidc_transactions').get().n, 0);
    f.provider.setBehavior({ sub: 'password-subject', email: 'password@example.test' });
    assert.match((await f.finish(await f.begin())).headers.get('location'), /collision/);
    assert.match((await f.finish({ ...await f.begin(passwordSession, true), session: '' })).headers.get('location'), /expired/);
    assert.equal((await f.finish(await f.begin(passwordSession, true))).headers.get('location'), '/#profile');
    assert.equal((await f.post('/api/login', { email: 'password@example.test', password: 'long-password-for-tests' })).status, 200);
    f.provider.setBehavior({ sub: 'mock-subject' });
    assert.match((await f.finish(await f.begin(passwordSession, true))).headers.get('location'), /collision/);
    const deleted = await f.request('/api/account', { method: 'DELETE', headers: { cookie: session, 'X-Expected-Member': (await (await f.request('/api/me', { headers: { cookie: session } })).json()).mutationContext, 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
    assert.equal(deleted.status, 200);
    assert.equal(f.db.prepare("SELECT COUNT(*) n FROM identities WHERE subject = 'mock-subject'").get().n, 0);
  } finally { await f.close(); }
});

test('Google configuration uses canonical origins and secure cookies with a useful disabled mode', async () => {
  assert.throws(() => createApp({ database: ':memory:', publicOrigin: 'http://public.example' }), /canonical HTTPS/);
  assert.throws(() => createApp({ database: ':memory:', publicOrigin: 'https://public.example/' }), /canonical HTTPS/);
  const { app, db } = createApp({ database: ':memory:', publicOrigin: 'https://dating.example.test' });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await (await fetch(`${base}/api/auth/google`)).json()).enabled, false);
    const disabled = await fetch(`${base}/api/auth/google/start`, { redirect: 'manual' });
    assert.equal(disabled.headers.get('location'), '/#login?google=unconfigured');
    const register = body => fetch(`${base}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: body.origin }, body: JSON.stringify({ ...profile, email: 'secure@example.test', password: 'long-password-for-tests' }) });
    assert.equal((await register({ origin: 'http://dating.example.test' })).status, 403);
    const success = await register({ origin: 'https://dating.example.test' });
    assert.equal(success.status, 201);
    assert.match(success.headers.get('set-cookie'), /Secure/);
    assert.match(success.headers.get('set-cookie'), /HttpOnly/);
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
});

for (const duringExchange of [false, true]) {
  test(`pending Google linking rejects deleted and reused accounts (during exchange: ${duringExchange})`, async () => {
    const f = await fixture();
    try {
      const register = async email => {
        const response = await f.post('/api/register', { ...profile, email, password: 'fictional-password-for-linking' });
        const session = response.headers.getSetCookie()[0].split(';')[0];
        const member = await (await f.request('/api/me', { headers: { cookie: session } })).json();
        return { session, member };
      };
      const original = await register('original@example.test');
      let replacement;
      const replace = async () => {
        const removed = await f.request('/api/account', {
          method: 'DELETE', headers: { cookie: original.session, 'X-Expected-Member': original.member.mutationContext, 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: 'DELETE' }),
        });
        assert.equal(removed.status, 200);
        assert.equal(f.db.prepare('SELECT COUNT(*) n FROM oidc_transactions WHERE user_id = ?').get(original.member.id).n, 0);
        replacement = await register('replacement@example.test');
        assert.equal(replacement.member.id, original.member.id);
        assert.notEqual(replacement.member.mutationContext, original.member.mutationContext);
      };
      f.provider.setBehavior(duringExchange ? { beforeToken: replace } : {});
      const tx = await f.begin(original.session, true);
      if (!duringExchange) await replace();
      const result = await f.finish({ ...tx, session: duringExchange ? original.session : replacement.session });
      assert.match(result.headers.get('location'), /expired/);
      assert.equal(f.db.prepare('SELECT COUNT(*) n FROM identities').get().n, 0);
      f.provider.setBehavior({});
      assert.equal((await f.finish(await f.begin())).headers.get('location'), '/#google-onboarding');
    } finally { await f.close(); }
  });
}

test('pending Google link is bound to the initiating session even for the same member', async () => {
  const f = await fixture();
  try {
    const credentials = { email: 'rotation@example.test', password: 'fictional-password-for-linking' };
    const registered = await f.post('/api/register', { ...profile, ...credentials });
    const original = registered.headers.getSetCookie()[0].split(';')[0];
    const legacy = await f.begin(original, true);
    f.db.prepare('UPDATE oidc_transactions SET member_context = NULL WHERE state = ?').run(legacy.state);
    assert.match((await f.finish(legacy)).headers.get('location'), /expired/);
    const tx = await f.begin(original, true);
    const login = await f.post('/api/login', credentials, original);
    const replacement = login.headers.getSetCookie()[0].split(';')[0];
    assert.match((await f.finish({ ...tx, session: replacement })).headers.get('location'), /expired/);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM identities').get().n, 0);
  } finally { await f.close(); }
});
