import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const password = 'fictional-race-test-password';
test.use({
  extraHTTPHeaders: async ({}, use, info) => {
    const client = (info.project.name === 'mobile' ? 30 : 20) + (info.title.startsWith('late') ? 1 : 2);
    await use({ 'X-Forwarded-For': `192.0.2.${client}` });
  },
});
const accounts = [];
test.afterEach(async ({ request }) => {
  for (const email of accounts.splice(0)) {
    expect((await request.post('/api/login', { data: { email, password } })).status()).toBe(200);
    const member = await (await request.get('/api/me')).json();
    expect((await request.delete('/api/account', { headers: { 'X-Expected-Member': member.mutationContext }, data: { confirm: 'DELETE' } })).status()).toBe(200);
  }
});
async function register(request, name) {
  const profile = { name, email: `${name}-${crypto.randomUUID()}@example.test`, password, age: 30, adult: true, gender: 'Nonbinary', desired: ['Nonbinary'], city: '', bio: '', interests: '' };
  expect((await request.post('/api/register', { data: profile })).status()).toBe(201);
  accounts.push(profile.email);
  return { ...await (await request.get('/api/me')).json(), email: profile.email };
}
async function holdResponse(page, path, method, failure = false) {
  let release;
  let captured;
  const ready = new Promise(resolve => { captured = resolve; });
  const released = new Promise(resolve => { release = resolve; });
  await page.route(`**/api/${path}`, async route => {
    if (route.request().method() !== method) return route.continue();
    const response = failure ? null : await route.fetch();
    captured();
    await released;
    if (failure) await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fictional failure' }) });
    else await route.fulfill({ response });
  }, { times: 1 });
  return { ready, release };
}
async function settle(page, pending) {
  const response = page.waitForResponse(value => value.url().endsWith('/api/me'));
  pending.release();
  await response;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function revisit(page) {
  await page.getByLabel('Search questions').fill('dinosaurs');
  await page.getByLabel('Search questions').fill('');
}
async function screenshot(page, name, info) {
  if (!process.env.EVIDENCE_DIR) return;
  mkdirSync(process.env.EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: `${process.env.EVIDENCE_DIR}/${name}-${info.project.name}.png`, fullPage: true });
}

test('late questionnaire completions preserve newer drafts and never navigate an obsolete view', async ({ page }, info) => {
  await register(page.request, 'RaceOwner');
  await page.goto('/#questions');
  const explanation = page.getByLabel(/Why this answer/);
  await page.getByRole('radio', { name: 'Liberal.', exact: true }).check();
  await explanation.fill('  Submitted version  ');
  let pending = await holdResponse(page, 'answers/167', 'PUT');
  await page.getByRole('button', { name: 'Save & next' }).click();
  await pending.ready;
  await revisit(page);
  await explanation.fill('Newer after question remount');
  await settle(page, pending);
  await expect(explanation).toHaveValue('Newer after question remount');
  await revisit(page);
  await expect(explanation).toHaveValue('Newer after question remount');
  await screenshot(page, 'newer-draft-retained', info);

  pending = await holdResponse(page, 'answers/167', 'PUT');
  await page.getByRole('button', { name: 'Save & next' }).click();
  await pending.ready;
  await page.getByRole('link', { name: 'How it works', exact: true }).click();
  await page.getByRole('link', { name: 'Questions', exact: true }).click();
  await explanation.fill('Newer after guidance');
  await settle(page, pending);
  await expect(explanation).toHaveValue('Newer after guidance');
  await revisit(page);
  await expect(explanation).toHaveValue('Newer after guidance');

  pending = await holdResponse(page, 'answers/167', 'DELETE');
  await page.getByRole('button', { name: 'Remove saved answer' }).click();
  await pending.ready;
  await revisit(page);
  await explanation.fill('Newer after removal started');
  await settle(page, pending);
  await revisit(page);
  await expect(explanation).toHaveValue('Newer after removal started');

  pending = await holdResponse(page, 'skipped/167', 'PUT');
  await page.getByRole('button', { name: 'Skip / next' }).click();
  await pending.ready;
  await revisit(page);
  await explanation.fill('Newer after skip started');
  await settle(page, pending);
  await expect(explanation).toHaveValue('Newer after skip started');

  pending = await holdResponse(page, 'answers/167', 'PUT', true);
  await page.getByRole('button', { name: 'Save & next' }).click();
  await pending.ready;
  await revisit(page);
  await explanation.fill('Newer after failed save');
  const failed = page.waitForResponse(response => response.url().endsWith('/api/answers/167'));
  pending.release();
  await failed;
  await revisit(page);
  await expect(explanation).toHaveValue('Newer after failed save');
  await expect(page.getByText('Fictional failure')).toHaveCount(0);

  pending = await holdResponse(page, 'answers/167', 'PUT');
  await page.getByRole('button', { name: 'Save & next' }).click();
  await pending.ready;
  await page.getByRole('link', { name: 'okaycupid home', exact: true }).click();
  await page.getByRole('button', { name: 'Explore the demo' }).click();
  await page.getByRole('link', { name: 'Questions', exact: true }).click();
  await settle(page, pending);
  await expect(explanation).not.toHaveValue('Newer after failed save');
  await page.getByRole('button', { name: /Return to real members/ }).click();
  await page.getByRole('link', { name: 'Questions', exact: true }).click();
  await expect(explanation).toHaveValue('Newer after failed save');

  pending = await holdResponse(page, 'answers/167', 'PUT');
  await page.getByRole('button', { name: 'Save & next' }).click();
  await pending.ready;
  const owner = await (await page.request.get('/api/me')).json();
  await page.request.post('/api/logout', { headers: { 'X-Expected-Member': owner.mutationContext }, data: {} });
  await register(page.request, 'RaceOther');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.account-nav a')).toContainText('RaceOther');
  await explanation.fill('Other member draft');
  const obsoleteSave = page.waitForResponse(response => response.url().endsWith('/api/answers/167'));
  pending.release();
  await obsoleteSave;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.getByRole('link', { name: 'How it works', exact: true }).click();
  await page.getByRole('link', { name: 'Questions', exact: true }).click();
  await expect(explanation).toHaveValue('Other member draft');
  await expect(page.locator('.account-nav a')).toContainText('RaceOther');
  expect(await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]))).not.toContain('member draft');
});

test('comparison and discovery invalidate viewer state and discard delayed previous-account reads', async ({ page, playwright }, info) => {
  const peer = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:8799', extraHTTPHeaders: { 'X-Forwarded-For': '192.0.2.50' } });
  try {
    const target = await register(peer, 'RaceTarget');
    const owner = await register(page.request, 'ReadOwner');
    for (const id of [167, 178]) {
      for (const [request, member] of [[peer, target], [page.request, owner]]) {
        expect((await request.put(`/api/answers/${id}`, { headers: { 'X-Expected-Member': member.mutationContext }, data: { answer: 0, acceptable: [0], importance: 10, private: false, noPreference: false, explanation: member === owner ? 'Previous viewer explanation' : '' } })).status()).toBe(200);
      }
    }
    await page.goto(`/#person/${target.id}`);
    await expect(page.locator('.match-number strong')).toHaveText('50%');
    await expect(page.getByText('Previous viewer explanation').first()).toBeVisible();
    const other = await register(page.request, 'ReadOther');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.locator('.account-nav a')).toContainText('ReadOther');
    await expect(page.locator('.match-number strong')).toHaveText('—');
    await expect(page.getByText('Previous viewer explanation')).toHaveCount(0);
    await screenshot(page, 'comparison-current-viewer', info);

    for (const view of ['comparison', 'discovery']) {
      await page.request.post('/api/login', { data: { email: owner.email, password } });
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(page.locator('.account-nav a')).toContainText('ReadOwner');
      await page.getByRole('link', { name: 'How it works', exact: true }).click();
      await expect(page.locator('.comparison')).toHaveCount(0);
      const pending = await holdResponse(page, view === 'comparison' ? `people/${target.id}` : 'people', 'GET');
      await page.evaluate(hash => { location.hash = hash; }, view === 'comparison' ? `person/${target.id}` : 'people');
      await pending.ready;
      await page.request.post('/api/login', { data: { email: other.email, password } });
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(page.locator('.account-nav a')).toContainText('ReadOther');
      const score = view === 'comparison' ? page.locator('.match-number strong') : page.locator('.person-card').filter({ hasText: 'RaceTarget' }).locator('.score strong');
      await expect(score).toHaveText('—');
      const received = page.waitForResponse(response => response.url().endsWith(view === 'comparison' ? `/api/people/${target.id}` : '/api/people'));
      pending.release();
      await received;
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(score).toHaveText('—');
      if (view === 'discovery') {
        await expect(page.getByRole('heading', { name: 'People, meet possibilities.' })).toHaveCount(1);
        await expect(page.locator('.question-link')).toHaveText('0 answers shaping your matches ↗');
      }
      await expect(page.getByText('Previous viewer explanation')).toHaveCount(0);
      await screenshot(page, `${view}-delayed-read-discarded`, info);
    }
  } finally {
    await peer.dispose();
  }
});
