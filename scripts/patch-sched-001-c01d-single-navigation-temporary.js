#!/usr/bin/env node
'use strict';

const fs = require('fs');
const file = 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js';
let source = fs.readFileSync(file, 'utf8');

function once(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 occurrence, found ${count}`);
  source = source.replace(before, after);
}

once(
  "  checkpoint(persona + '_login_start');\n  await login(page, email, password, persona);",
  "  checkpoint(persona + '_orders_bootstrap_routes_start');\n  await installOrdersBootstrapRoutes(page);\n  checkpoint(persona + '_orders_bootstrap_routes_ready');\n  checkpoint(persona + '_login_start');\n  await login(page, email, password, persona);",
  'pre-login routes'
);

once(
  "  const loginUrl = `${base}/auth/login.html?next=../pedidos.html%3FdokeTarget%3Dstaging`;",
  "  const ordersPath = '../pedidos.html?dokeTarget=staging&dokeOrdersProvider=supabase-read&dokeOrdersReadProvider=supabase-read&dokeEnableNetwork=1';\n  const loginUrl = `${base}/auth/login.html?next=${encodeURIComponent(ordersPath)}`;",
  'login target'
);

once(
  "  const navigation = page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, {\n    waitUntil: 'commit',\n    timeout: 30_000\n  });",
  "  const navigation = page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, {\n    waitUntil: 'domcontentloaded',\n    timeout: 30_000\n  });",
  'login wait state'
);

once(
  "  checkpoint(persona + '_login_target_committed');",
  "  checkpoint(persona + '_login_target_domcontentloaded');",
  'login checkpoint'
);

const routeInstaller = `async function installOrdersBootstrapRoutes(page) {
  const candidates = [
    path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.min.js'),
    path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js')
  ];
  const bundle = candidates.find((candidate) => fs.existsSync(candidate));
  if (!bundle) throw new Error('Pinned local Supabase UMD browser bundle was not found after npm ci.');

  await page.route('https://fonts.googleapis.com/**', (route) => route.abort('blockedbyclient'));
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort('blockedbyclient'));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2**', async (route) => {
    checkpoint('orders_supabase_cdn_fulfilled_locally');
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      path: bundle
    });
  });
  checkpoint('orders_external_fonts_blocked');
}

`;
once(
  'async function installReadOnlyGuard(page, mutations) {',
  routeInstaller + 'async function installReadOnlyGuard(page, mutations) {',
  'route installer insertion'
);

once(
  '    if (ALLOWED_AFTER_LOGIN.has(method)) return route.continue();',
  '    if (ALLOWED_AFTER_LOGIN.has(method)) return route.fallback();',
  'read route fallback'
);

once(
  `  const supabaseUmdCandidates = [
    path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.min.js'),
    path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js')
  ];
  const localSupabaseUmd = supabaseUmdCandidates.find((candidate) => fs.existsSync(candidate));
  if (!localSupabaseUmd) throw new Error('Pinned local Supabase UMD browser bundle was not found after npm ci.');

`,
  '',
  'late bundle lookup removal'
);

once(
  `  const bootstrapDiagnostics = {
    domContentLoaded: false,
    pageErrors: 0,
    failedScripts: 0
  };`,
  `  const bootstrapDiagnostics = {
    domContentLoaded: await page.evaluate(() => document.readyState !== 'loading'),
    pageErrors: 0,
    failedScripts: 0
  };
  if (bootstrapDiagnostics.domContentLoaded) checkpoint('orders_domcontentloaded_before_navigation_check');`,
  'initial document state'
);

once(
  `  page.on('domcontentloaded', () => {
    bootstrapDiagnostics.domContentLoaded = true;
    checkpoint('orders_domcontentloaded');
  });
  page.on('pageerror', () => {
    bootstrapDiagnostics.pageErrors += 1;
  });
  page.on('requestfailed', (request) => {
    if (request.resourceType() === 'script') bootstrapDiagnostics.failedScripts += 1;
  });`,
  `  page.on('domcontentloaded', () => {
    if (!isCanonicalOrdersUrl(page.url(), url)) return;
    bootstrapDiagnostics.domContentLoaded = true;
    checkpoint('orders_domcontentloaded');
  });
  page.on('pageerror', () => {
    if (isCanonicalOrdersUrl(page.url(), url)) bootstrapDiagnostics.pageErrors += 1;
  });
  page.on('requestfailed', (request) => {
    if (isCanonicalOrdersUrl(page.url(), url) && request.resourceType() === 'script') {
      bootstrapDiagnostics.failedScripts += 1;
    }
  });`,
  'target-scoped diagnostics'
);

once(
  `  await page.route('https://fonts.googleapis.com/**', (route) => route.abort('blockedbyclient'));
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort('blockedbyclient'));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2**', async (route) => {
    checkpoint('orders_supabase_cdn_fulfilled_locally');
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      path: localSupabaseUmd
    });
  });
  checkpoint('orders_external_fonts_blocked');
  checkpoint('orders_navigation_goto_start');
  await page.goto(url, { waitUntil: 'commit', timeout: 20_000 });
  checkpoint('orders_navigation_goto_commit');`,
  `  checkpoint('orders_navigation_target_check');
  if (isCanonicalOrdersUrl(page.url(), url)) {
    checkpoint('orders_navigation_reused_login_target');
  } else {
    checkpoint('orders_navigation_goto_start');
    await page.goto(url, { waitUntil: 'commit', timeout: 20_000 });
    checkpoint('orders_navigation_goto_commit');
  }`,
  'duplicate navigation removal'
);

const urlMatcher = `function isCanonicalOrdersUrl(currentValue, targetValue) {
  try {
    const current = new URL(currentValue);
    const target = new URL(targetValue);
    const required = ['dokeTarget', 'dokeOrdersProvider', 'dokeOrdersReadProvider', 'dokeEnableNetwork'];
    return current.origin === target.origin
      && current.pathname === target.pathname
      && required.every((name) => current.searchParams.get(name) === target.searchParams.get(name));
  } catch {
    return false;
  }
}

`;
once(
  'async function navigateOrders(page) {',
  urlMatcher + 'async function navigateOrders(page) {',
  'canonical URL matcher insertion'
);

fs.writeFileSync(file, source);
console.log('C01D single-navigation executor patch applied.');
