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
[paths.executor, paths.test, paths.readiness].forEach((file) => {
  assert(fs.existsSync(file), `Missing C01D execution asset: ${file}`);
});
assert(!fs.existsSync(paths.workflow), 'C01D one-shot workflow must remain removed after authorization consumption.');

const executor = fs.readFileSync(paths.executor, 'utf8');
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
  'professionalAccountDigest',
  'Exactly one of --dry-run, --check-env or --execute is required.',
  'environment_ready_for_authorized_read_only_execution'
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

assert.strictEqual(readiness.authorization.requiredExactPhrase, 'I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING');
assert.strictEqual(readiness.authorization.genericNextAllowed, false);
assert.strictEqual(readiness.runtimeGate.postLoginReadOnlyGuardRequired, true);
assert.deepStrictEqual(readiness.runtimeGate.allowedPostLoginMethods, ['GET', 'HEAD', 'OPTIONS']);
assert.strictEqual(readiness.evidencePolicy.screenshotsAllowed, false);
assert.strictEqual(readiness.evidencePolicy.reportContainsRawUserIdentifiers, false);
assert.strictEqual(readiness.evidencePolicy.reportContainsRawOrderIdentifiers, false);

console.log('SCHED-C01D execution package lock audit passed; one-shot workflow is absent.');
