#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const preparerPath = path.join(__dirname, 'prepare-sched-001-c01d-authenticated-browser-login-runtime.js');

function replaceExactlyOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`Expected exactly one ${label}, found ${count}.`);
  }
  return source.replace(before, after);
}

function patchSource(source) {
  let patched = source;

  patched = replaceExactlyOnce(
    patched,
    `  const supabaseUmdCandidates = [
    path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'),
    path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.min.js')
  ];`,
    `  const supabaseUmdCandidates = [
    path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.min.js'),
    path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js')
  ];`,
    'Supabase UMD candidate order'
  );

  patched = replaceExactlyOnce(
    patched,
    `  const localSupabaseSource = fs.readFileSync(localSupabaseUmd, 'utf8');

`,
    `  const bootstrapDiagnostics = {
    domContentLoaded: false,
    pageErrors: 0,
    failedScripts: 0
  };
  page.on('domcontentloaded', () => {
    bootstrapDiagnostics.domContentLoaded = true;
    checkpoint('orders_domcontentloaded');
  });
  page.on('pageerror', () => {
    bootstrapDiagnostics.pageErrors += 1;
  });
  page.on('requestfailed', (request) => {
    if (request.resourceType() === 'script') bootstrapDiagnostics.failedScripts += 1;
  });

`,
    'Supabase source preload'
  );

  patched = replaceExactlyOnce(
    patched,
    `      contentType: 'application/javascript; charset=utf-8',
      body: localSupabaseSource`,
    `      contentType: 'application/javascript; charset=utf-8',
      path: localSupabaseUmd`,
    'Supabase CDN fulfillment body'
  );

  patched = replaceExactlyOnce(
    patched,
    `  checkpoint('orders_list_attached');

  try {`,
    `  checkpoint('orders_list_attached');

  try {
    await Promise.race([
      page.waitForLoadState('domcontentloaded', { timeout: 20_000 }),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error('orders_domcontentloaded_node_watchdog')),
        22_000
      ))
    ]);
  } catch {
    throw new Error(
      'Orders document bootstrap unavailable: domContentLoaded=' + bootstrapDiagnostics.domContentLoaded
      + ', pageErrors=' + bootstrapDiagnostics.pageErrors
      + ', failedScripts=' + bootstrapDiagnostics.failedScripts
    );
  }
  checkpoint('orders_document_bootstrap_complete');

  try {`,
    'orders list bootstrap checkpoint'
  );

  patched = replaceExactlyOnce(
    patched,
    `    await page.waitForFunction(() => Boolean(
      typeof window.supabase?.createClient === 'function'
      && window.Doke?.services?.accountAccess?.guardPage
      && typeof window.DokeHydrateLocalOrders === 'function'
    ), null, { timeout: 20_000 });`,
    `    await Promise.race([
      page.waitForFunction(() => Boolean(
        typeof window.supabase?.createClient === 'function'
        && window.Doke?.services?.accountAccess?.guardPage
        && typeof window.DokeHydrateLocalOrders === 'function'
      ), null, { polling: 100, timeout: 20_000 }),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error('orders_prerequisites_node_watchdog')),
        22_000
      ))
    ]);`,
    'orders prerequisite wait'
  );

  return patched;
}

function run() {
  const originalSource = fs.readFileSync(preparerPath, 'utf8');
  const originalMode = fs.statSync(preparerPath).mode;
  const patchedSource = patchSource(originalSource);

  try {
    fs.writeFileSync(preparerPath, patchedSource, {
      encoding: 'utf8',
      mode: originalMode
    });

    const syntax = spawnSync(process.execPath, ['--check', preparerPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024
    });
    if (syntax.stdout) process.stdout.write(syntax.stdout);
    if (syntax.stderr) process.stderr.write(syntax.stderr);
    if (syntax.error) throw syntax.error;
    if (syntax.status !== 0) return syntax.status || 1;

    const result = spawnSync(
      process.execPath,
      [preparerPath, ...process.argv.slice(2)],
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
    fs.writeFileSync(preparerPath, originalSource, {
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
