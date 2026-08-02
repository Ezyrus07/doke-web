#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const paths = {
  executor: 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js',
  test: 'scripts/test-sched-001-c01d-authenticated-browser-read-only-canary.js',
  workflow: '.github/workflows/sched-001-c01d-authenticated-browser-read-only-canary.yml',
  readiness: 'config/sched-001-c01d-authenticated-browser-canary-readiness.json'
};
Object.values(paths).forEach((file) => assert(fs.existsSync(file), `Missing C01D execution asset: ${file}`));

const executor = fs.readFileSync(paths.executor, 'utf8');
const workflow = fs.readFileSync(paths.workflow, 'utf8');
const readiness = JSON.parse(fs.readFileSync(paths.readiness, 'utf8'));

[
  'I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING',
  "const ALLOWED_AFTER_LOGIN = new Set(['GET', 'HEAD', 'OPTIONS'])",
  'serviceWorkers: \'block\'',
  'ordersReadProvider: \'supabase-read\'',
  'postLoginMutationRequests',
  'screenshotsCaptured: 0',
  'rawIdentifiersRecorded: false',
  'authorizationPhraseDigest',
  'caseManifestDigest',
  'clientAccountDigest',
  'professionalAccountDigest'
].forEach((fragment) => assert(executor.includes(fragment), `Executor missing: ${fragment}`));

[
  '@doke.local',
  'DOKE_ORD_A06_SERVICE_ROLE_KEY',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_ACCESS_TOKEN',
  'page.screenshot',
  'video: \'on\'',
  'trace: \'on\''
].forEach((fragment) => assert(!executor.includes(fragment), `Executor contains forbidden fragment: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('DOKE_STAGING_CLIENT_EMAIL: ${{ secrets.DOKE_STAGING_CLIENT_EMAIL }}'));
assert(workflow.includes('DOKE_STAGING_PROFESSIONAL_PASSWORD: ${{ secrets.DOKE_STAGING_PROFESSIONAL_PASSWORD }}'));
assert(workflow.includes('Fail-closed environment preflight'));
assert(workflow.indexOf('Fail-closed environment preflight') < workflow.indexOf('Install isolated Chromium'));
assert(workflow.includes('DOKE_E2E_DISABLE_REMOTE_SERVICES=0'));
assert(workflow.includes('--execute --write-report'));
assert(workflow.includes('retention-days: 14'));
[
  'contents: write',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_ACCESS_TOKEN',
  'service_role',
  'git push',
  'psql '
].forEach((fragment) => assert(!workflow.includes(fragment), `Workflow contains forbidden fragment: ${fragment}`));

assert.strictEqual(readiness.authorization.requiredExactPhrase, 'I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING');
assert.strictEqual(readiness.runtimeGate.postLoginReadOnlyGuardRequired, true);
assert.deepStrictEqual(readiness.runtimeGate.allowedPostLoginMethods, ['GET', 'HEAD', 'OPTIONS']);
assert.strictEqual(readiness.evidencePolicy.screenshotsAllowed, false);

console.log('SCHED-C01D authenticated browser read-only execution audit passed.');
