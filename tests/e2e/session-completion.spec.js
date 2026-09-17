import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const password = 'fictional-completion-password';
const profile = name => ({ name, email: `${crypto.randomUUID()}@example.test`, password, age: 30, adult: true, gender: 'Nonbinary', desired: ['Nonbinary'], bio: '', city: '', interests: '' });
test.use({
  extraHTTPHeaders: async ({}, use, info) => {
    const index = info.title.split('').reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 60000, 0);
    await use({ 'X-Forwarded-For': `198.18.${Math.floor(index / 250)}.${index % 250 + (info.project.name === 'mobile' ? 1 : 2)}` });
  },
});
async function member(request) {
  return (await request.get('/api/me')).json();
}
async function hold(page, path, options = {}) {
  let release, captured, completed;
  const ready = new Promise(resolve => { captured = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const done = new Promise(resolve => { completed = resolve; });
  await page.route(`**/api/${path}`, async route => {
    const response = await route.fetch(options);
    captured(response);
    await gate;
    await route.fulfill({ response });
    completed();
  }, { times: 1 });
  return { ready, release, done };
}
async function synchronize(page, name) {
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.account-nav a')).toContainText(name);
}
async function draft(page) {
  await page.locator('.account-nav a').click();
  await page.getByLabel('About you').fill('Newer private profile draft');
  await page.getByRole('link', { name: 'Questions', exact: true }).click();
  await page.getByRole('radio', { name: 'Liberal.', exact: true }).check();
  await page.getByLabel(/Why this answer/).fill('Newer private questionnaire draft');
}
async function verifyAndPersist(page, replacement, info) {
  await expect(page).toHaveURL(/#questions$/);
  await expect(page.locator('.account-nav a')).toContainText(replacement.name);
  expect((await member(page.request)).email).toBe(replacement.email);
  await expect(page.getByLabel(/Why this answer/)).toHaveValue('Newer private questionnaire draft');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save answer', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Answer saved' })).toBeVisible();
  expect((await member(page.request)).answers[167].explanation).toBe('Newer private questionnaire draft');
  await page.locator('.account-nav a').click();
  await expect(page.getByLabel('About you')).toHaveValue('Newer private profile draft');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible();
  expect((await member(page.request)).bio).toBe('Newer private profile draft');
  expect(await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]))).not.toContain('Newer private');
  if (process.env.EVIDENCE_DIR) {
    mkdirSync(process.env.EVIDENCE_DIR, { recursive: true });
    await page.screenshot({ path: `${process.env.EVIDENCE_DIR}/session-${info.title.replaceAll(' ', '-')}-${info.project.name}.png`, fullPage: true });
  }
}
for (const action of ['logout', 'delete']) {
  for (const outcome of ['accepted', 'rejected']) {
    for (const replacementKind of ['different', 'same']) {
      test(`${action} ${outcome} completion preserves ${replacementKind} account replacement`, async ({ page, context, playwright }, info) => {
        const original = profile('Original Member');
        expect((await page.request.post('/api/register', { data: original })).status()).toBe(201);
        const oldMember = await member(page.request);
        const cookies = await context.cookies();
        const oldSession = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8799', extraHTTPHeaders: { Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') } });
        let replacement;
        try {
          await page.goto('/#profile');
          const path = action === 'delete' ? 'account' : 'logout';
          const options = outcome === 'accepted' ? {} : action === 'delete' ? { postData: { confirm: 'NO' } } : { headers: { 'Content-Type': 'application/json', 'X-Expected-Member': 'obsolete' } };
          const pending = await hold(page, path, options);
          if (action === 'delete') {
            await page.getByLabel('Type DELETE to confirm').fill('DELETE');
            await page.getByRole('button', { name: 'Delete my account' }).click();
          } else await page.getByRole('button', { name: 'Log out', exact: true }).click();
          const response = await pending.ready;
          expect(response.status()).toBe(outcome === 'accepted' ? 200 : action === 'delete' ? 400 : 409);
          expect(response.headers()['set-cookie']).toBeUndefined();
          replacement = replacementKind === 'same' ? original : profile('Replacement Member');
          const recreate = replacementKind !== 'same' || (action === 'delete' && outcome === 'accepted');
          expect((await page.request.post(recreate ? '/api/register' : '/api/login', { data: replacement })).status()).toBe(recreate ? 201 : 200);
          const replacementMember = await member(page.request);
          expect(replacementMember.mutationContext).not.toBe(oldMember.mutationContext);
          await synchronize(page, replacement.name);
          await draft(page);
          pending.release();
          await pending.done;
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
          await verifyAndPersist(page, replacement, info);
          expect((await member(page.request)).mutationContext).toBe(replacementMember.mutationContext);
          if (outcome === 'accepted' || replacementKind === 'same') {
            expect(await member(oldSession)).toBeNull();
            expect((await oldSession.put('/api/profile', { headers: { 'X-Expected-Member': oldMember.mutationContext }, data: original })).status()).toBe(401);
          }
          if (action === 'delete') {
            await page.getByLabel('Type DELETE to confirm').fill('DELETE');
            await page.getByRole('button', { name: 'Delete my account' }).click();
          } else await page.getByRole('button', { name: 'Log out', exact: true }).click();
          await expect(page).toHaveURL(/#home$/);
          await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
          expect(await member(page.request)).toBeNull();
        } finally {
          await oldSession.dispose();
          for (const account of [original, replacement].filter(Boolean)) {
            const login = await page.request.post('/api/login', { data: account });
            if (login.status() === 200) {
              const current = await member(page.request);
              await page.request.delete('/api/account', { headers: { 'X-Expected-Member': current.mutationContext }, data: { confirm: 'DELETE' } });
            }
          }
        }
      });
    }
  }
}

test('late profile success and conflict cannot refresh or erase replacement drafts', async ({ page }, info) => {
  const original = profile('Profile Original');
  const replacement = profile('Profile Replacement');
  try {
    for (const rejected of [false, true]) {
      const originalLogin = await page.request.post('/api/login', { data: original });
      if (originalLogin.status() !== 200) expect((await page.request.post('/api/register', { data: original })).status()).toBe(201);
      await page.goto('/#profile');
      await page.getByLabel('About you').fill('Old submitted profile');
      const pending = await hold(page, 'profile', rejected ? { headers: { 'Content-Type': 'application/json', 'X-Expected-Member': 'obsolete' } } : {});
      await page.getByRole('button', { name: 'Save profile', exact: true }).click();
      expect((await pending.ready).status()).toBe(rejected ? 409 : 200);
      const replacementLogin = await page.request.post('/api/login', { data: replacement });
      if (replacementLogin.status() !== 200) expect((await page.request.post('/api/register', { data: replacement })).status()).toBe(201);
      await synchronize(page, replacement.name);
      await draft(page);
      pending.release();
      await pending.done;
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
      await verifyAndPersist(page, replacement, info);
    }
  } finally {
    for (const account of [original, replacement]) {
      if ((await page.request.post('/api/login', { data: account })).status() === 200) {
        const current = await member(page.request);
        await page.request.delete('/api/account', { headers: { 'X-Expected-Member': current.mutationContext }, data: { confirm: 'DELETE' } });
      }
    }
  }
});

test('session refresh ignores late success and failure after newer identity or read', async ({ page }, info) => {
  const original = profile('Refresh Original');
  const replacement = profile('Refresh Replacement');
  try {
    expect((await page.request.post('/api/register', { data: original })).status()).toBe(201);
    expect((await page.request.post('/api/register', { data: replacement })).status()).toBe(201);
    for (const rejected of [false, true]) {
      expect((await page.request.post('/api/login', { data: original })).status()).toBe(200);
      await page.goto('/#questions');
      await expect(page.getByRole('heading', { name: 'Your point of view.' })).toBeVisible();
      const options = rejected ? { url: 'http://127.0.0.1:8799/api/people/nonexistent' } : {};
      const pending = await hold(page, 'me', options);
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      expect((await pending.ready).status()).toBe(rejected ? 404 : 200);
      expect((await page.request.post('/api/login', { data: replacement })).status()).toBe(200);
      await synchronize(page, replacement.name);
      await draft(page);
      pending.release();
      await pending.done;
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
      await verifyAndPersist(page, replacement, info);
    }
    await page.getByRole('link', { name: 'Questions', exact: true }).click();
    const pending = await hold(page, 'me', { url: 'http://127.0.0.1:8799/api/people/nonexistent' });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    expect((await pending.ready).status()).toBe(404);
    const refreshed = page.waitForResponse(response => response.url().endsWith('/api/me'));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await refreshed;
    await draft(page);
    pending.release();
    await pending.done;
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
    await verifyAndPersist(page, replacement, info);
  } finally {
    for (const account of [original, replacement]) {
      if ((await page.request.post('/api/login', { data: account })).status() === 200) {
        const current = await member(page.request);
        await page.request.delete('/api/account', { headers: { 'X-Expected-Member': current.mutationContext }, data: { confirm: 'DELETE' } });
      }
    }
  }
});

test('current logout and deletion failures preserve drafts and allow retry', async ({ page }, info) => {
  const original = profile('Retry Member');
  expect((await page.request.post('/api/register', { data: original })).status()).toBe(201);
  try {
    await page.goto('/#questions');
    await draft(page);
    const logout = await hold(page, 'logout', { headers: { 'Content-Type': 'application/json', 'X-Expected-Member': 'obsolete' } });
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    expect((await logout.ready).status()).toBe(409);
    logout.release();
    await logout.done;
    await expect(page.getByRole('alert')).toContainText('account changed');
    await expect(page.getByLabel(/Why this answer/)).toHaveValue('Newer private questionnaire draft');
    expect((await member(page.request)).email).toBe(original.email);
    await page.locator('.account-nav a').click();
    await expect(page.getByLabel('About you')).toHaveValue('Newer private profile draft');
    const deletion = await hold(page, 'account', { postData: { confirm: 'NO' } });
    await page.getByLabel('Type DELETE to confirm').fill('DELETE');
    await page.getByRole('button', { name: 'Delete my account' }).click();
    expect((await deletion.ready).status()).toBe(400);
    deletion.release();
    await deletion.done;
    await expect(page.getByRole('alert').filter({ hasText: 'Type DELETE' })).toBeVisible();
    await expect(page.getByLabel('About you')).toHaveValue('Newer private profile draft');
    await page.getByRole('button', { name: 'Delete my account' }).click();
    await expect(page).toHaveURL(/#home$/);
    expect(await member(page.request)).toBeNull();
  } finally {
    if ((await page.request.post('/api/login', { data: original })).status() === 200) {
      const current = await member(page.request);
      await page.request.delete('/api/account', { headers: { 'X-Expected-Member': current.mutationContext }, data: { confirm: 'DELETE' } });
    }
  }
});
