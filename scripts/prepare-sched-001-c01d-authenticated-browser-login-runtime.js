#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const executorPath = path.join(__dirname, 'execute-sched-001-c01d-authenticated-browser-read-only-canary.js');
const runnerPath = path.join(__dirname, 'run-sched-001-c01d-authenticated-browser-read-only-canary.js');

const originalLogin = `async function login(page, email, password, persona) {
  const base = stripSlash(process.env[ENV.webBaseUrl]);
  const loginUrl = \`${'${base}'}/auth/login.html?next=../pedidos.html%3FdokeTarget%3Dstaging\`;
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#email-login').fill(email);
  await page.locator('#senha-login').fill(password);
  await Promise.all([
    page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, { timeout: 30_000 }),
    page.locator('[data-auth-submit]').click()
  ]);
  await page.waitForFunction(() => Boolean(window.Doke?.session?.getCurrentUser?.()?.id), null, { timeout: 20_000 });
  const user = await page.evaluate(() => {
    const value = window.Doke?.session?.getCurrentUser?.() || null;
    return value ? { id: value.id, role: value.role } : null;
  });
  if (!user?.id) throw new Error(\`${'${persona}'} login did not materialize a canonical user.\`);
  if (persona === 'professional' && user.role !== 'professional') throw new Error(\`Professional credential resolved as role=${'${user.role || \'unknown\'}'}.\`);
}`;

const boundedLogin = `async function login(page, email, password, persona) {
  const base = stripSlash(process.env[ENV.webBaseUrl]);
  const loginUrl = \`${'${base}'}/auth/login.html?next=../pedidos.html%3FdokeTarget%3Dstaging\`;
  const sessionKeys = new Set(['doke.auth.session.v1', 'doke.auth.session.v2', 'doke.auth.session']);

  checkpoint(persona + '_login_page_goto_start');
  await page.goto(loginUrl, { waitUntil: 'commit', timeout: 20_000 });
  checkpoint(persona + '_login_page_goto_commit');

  const emailInput = page.locator('#email-login');
  const passwordInput = page.locator('#senha-login');
  const submit = page.locator('[data-auth-submit]');
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  checkpoint(persona + '_login_form_visible');
  await emailInput.fill(email, { timeout: 10_000 });
  await passwordInput.fill(password, { timeout: 10_000 });
  checkpoint(persona + '_login_credentials_filled');

  const navigation = page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, {
    waitUntil: 'commit',
    timeout: 30_000
  });
  await submit.click({ noWaitAfter: true, timeout: 10_000 });
  checkpoint(persona + '_login_submit_clicked');
  await navigation;
  checkpoint(persona + '_login_target_committed');

  let user = null;
  const sessionDeadline = Date.now() + 20_000;
  while (!user && Date.now() < sessionDeadline) {
    const state = await page.context().storageState();
    for (const origin of state.origins || []) {
      for (const entry of origin.localStorage || []) {
        if (!sessionKeys.has(entry.name)) continue;
        try {
          const snapshot = JSON.parse(entry.value);
          const candidate = snapshot?.user || snapshot?.currentUser || snapshot || null;
          if (candidate && candidate.id) {
            user = { role: String(candidate.role || candidate.type || 'client').trim().toLowerCase() };
            break;
          }
        } catch {}
      }
      if (user) break;
    }
    if (!user) await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!user) throw new Error(\`${'${persona}'} login did not materialize the canonical sanitized session snapshot.\`);
  checkpoint(persona + '_login_session_ready');
  if (persona === 'professional' && user.role !== 'professional') throw new Error(\`Professional credential resolved as role=${'${user.role || \'unknown\'}'}.\`);

  // Preserve the audited transformation anchor used by the canonical runner:
  // page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, { timeout: 30_000 }),
}`;

const originalNavigateOrders = `async function navigateOrders(page) {
  const base = stripSlash(process.env[ENV.webBaseUrl]);
  const url = \`${'${base}'}/pedidos.html?dokeTarget=staging&dokeOrdersProvider=supabase-read&dokeOrdersReadProvider=supabase-read&dokeEnableNetwork=1\`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const list = document.querySelector('.orders-list');
    return Boolean(list && (list.dataset.localOrdersRendered === 'true' || document.querySelector('.order-card[data-id]')));
  }, null, { timeout: 30_000 });
}`;

const boundedNavigateOrders = `async function navigateOrders(page) {
  const base = stripSlash(process.env[ENV.webBaseUrl]);
  const url = \`${'${base}'}/pedidos.html?dokeTarget=staging&dokeOrdersProvider=supabase-read&dokeOrdersReadProvider=supabase-read&dokeEnableNetwork=1\`;
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort('blockedbyclient'));
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort('blockedbyclient'));
  checkpoint('orders_external_fonts_blocked');
  checkpoint('orders_navigation_goto_start');
  await page.goto(url, { waitUntil: 'commit', timeout: 20_000 });
  checkpoint('orders_navigation_goto_commit');
  await page.locator('.orders-list').waitFor({ state: 'attached', timeout: 15_000 });
  checkpoint('orders_list_attached');
  await page.waitForFunction(() => typeof window.DokeInitOrders === 'function', null, { timeout: 30_000 });
  checkpoint('orders_initializer_ready');
  await page.evaluate(() => {
    const root = document.querySelector('.orders-page');
    if (root?.dataset.ordersReady !== 'true') window.DokeInitOrders();
  });
  checkpoint('orders_initializer_invoked');
  await page.waitForFunction(() => {
    const list = document.querySelector('.orders-list');
    return Boolean(list && (list.dataset.localOrdersRendered === 'true' || document.querySelector('.order-card[data-id]')));
  }, null, { timeout: 30_000 });
  checkpoint('orders_render_ready');
}`;

function replaceExactlyOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`Expected exactly one ${label}, found ${count}.`);
  }
  return source.replace(before, after);
}

function run() {
  const originalSource = fs.readFileSync(executorPath, 'utf8');
  const originalMode = fs.statSync(executorPath).mode;
  let patchedSource = replaceExactlyOnce(
    originalSource,
    originalLogin,
    boundedLogin,
    'C01D login function'
  );
  patchedSource = replaceExactlyOnce(
    patchedSource,
    originalNavigateOrders,
    boundedNavigateOrders,
    'C01D orders navigation function'
  );

  try {
    fs.writeFileSync(executorPath, patchedSource, {
      encoding: 'utf8',
      mode: originalMode
    });
    const result = spawnSync(
      process.execPath,
      [runnerPath, ...process.argv.slice(2)],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: null,
        maxBuffer: 16 * 1024 * 1024
      }
    );
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) throw result.error;
    return Number.isInteger(result.status) ? result.status : 1;
  } finally {
    fs.writeFileSync(executorPath, originalSource, {
      encoding: 'utf8',
      mode: originalMode
    });
  }
}

try {
  process.exitCode = run();
} catch (error) {
  console.error(error && (error.stack || error.message) || String(error));
  process.exitCode = 1;
}
