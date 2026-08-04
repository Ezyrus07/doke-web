#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const root = process.cwd();
const failures = [];

function read(file) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) { failures.push('Missing file: ' + file); return ''; }
  return fs.readFileSync(target, 'utf8');
}
function assert(condition, message) { if (!condition) failures.push(message); }

const contract = JSON.parse(read('config/msg-001-a08-staging-activation-readiness.json') || '{}');
const validation = JSON.parse(read('docs/validation/MSG-001-A08-STAGING-ACTIVATION-READINESS.json') || '{}');
const matrix = JSON.parse(read('config/domain-completion-matrix.json') || '{}');
const packageJson = JSON.parse(read('package.json') || '{}');
const docs = read('docs/MSG-001-A08-STAGING-ACTIVATION-READINESS.md');
const workflow = read('.github/workflows/msg-001-a08-staging-activation-readiness.yml');

assert(contract.status === 'repository_only_staging_activation_readiness_ready_not_executed', 'A08 must remain repository-only and unexecuted.');
assert(contract.authority && contract.authority.genericContinuationAuthorizesRemoteEffects === false, 'Generic continuation must not authorize remote effects.');
assert(contract.authority && contract.authority.freshExplicitAuthorizationPerPhase === true, 'Each phase requires fresh authorization.');
assert(contract.authority && contract.authority.productionTargetAllowed === false, 'Production must be denied.');
assert(JSON.stringify((contract.activationOrder || []).map((item) => item.phase)) === JSON.stringify(['MSG-A07B','MSG-A05B','MSG-A04B','MSG-A06B']), 'Activation order drifted.');
assert(contract.phaseRules && contract.phaseRules.stopOnFirstFailure === true, 'Sequence must stop on first failure.');
assert(contract.phaseRules && contract.phaseRules.flagsActivatedDuringCanary === false, 'Feature flags must remain disabled during canaries.');
assert(contract.preflight && contract.preflight.migrationRepairAllowedAsRoutineRollback === false, 'migration repair cannot be routine rollback.');
assert(contract.effects && Object.values(contract.effects).every((value) => value === 0 || value === false), 'A08 remote effects must remain zero.');
assert(validation.status === 'passed_repository_only', 'A08 validation status invalid.');
assert(docs.includes('MSG-A07B') && docs.includes('MSG-A05B') && docs.includes('MSG-A04B') && docs.includes('MSG-A06B'), 'A08 docs must describe every phase.');
assert(docs.includes('generic continuation') || docs.includes('Generic continuation'), 'A08 docs must deny generic continuation authority.');
assert(workflow.includes('permissions:\n  contents: read'), 'A08 permanent workflow must be read-only.');
['supabase db push','supabase functions deploy','psql ','curl ','apply_migration','execute_sql'].forEach((token) => {
  assert(!workflow.includes(token), 'A08 workflow must not execute remote command: ' + token);
});
assert(packageJson.scripts && packageJson.scripts['audit:msg-001-a08-staging-activation-readiness'] === 'node scripts/audit-msg-001-a08-staging-activation-readiness.js', 'Missing A08 audit script registration.');
assert(packageJson.scripts && packageJson.scripts['test:msg-001-a08-staging-activation-readiness'] === 'node scripts/test-msg-001-a08-staging-activation-readiness.js', 'Missing A08 test script registration.');
assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.85'), 'Matrix version must be at least 1.3.85.');
const msg = (matrix.domains || []).find((domain) => domain.id === 'MSG-001');
assert(Boolean(msg), 'MSG-001 matrix entry missing.');
if (msg) {
  assert((msg.requiredPaths || []).includes('config/msg-001-a08-staging-activation-readiness.json'), 'MSG matrix missing A08 contract.');
  assert((msg.requiredPaths || []).includes('.github/workflows/msg-001-a08-staging-activation-readiness.yml'), 'MSG matrix missing A08 workflow.');
  assert((msg.tests || []).includes('audit:msg-001-a08-staging-activation-readiness'), 'MSG matrix missing A08 audit.');
  assert((msg.tests || []).includes('test:msg-001-a08-staging-activation-readiness'), 'MSG matrix missing A08 runtime test.');
}

if (failures.length) {
  console.error('MSG-A08 staging activation readiness audit failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('MSG-A08 staging activation readiness audit passed.');
