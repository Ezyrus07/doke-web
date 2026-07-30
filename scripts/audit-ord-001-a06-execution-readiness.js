'use strict';

const assert = require('assert');
const fs = require('fs');

const read = (file) => fs.readFileSync(file, 'utf8');
const required = [
  'docs/ORD-001-A06-EXECUTION-READINESS.md',
  'docs/validation/ORD-001-A06-EXECUTION-READINESS.json',
  'scripts/audit-ord-001-a06-execution-readiness.js',
  '.github/workflows/ord-001-a06-execution-readiness.yml',
  'scripts/execute-ord-001-a06-visual-settlement-playwright.js',
  'docs/validation/ORD-001-A06-PLAYWRIGHT-EXECUTOR.json'
];

required.forEach((file) => assert(fs.existsSync(file), `Missing ORD-A06 readiness asset: ${file}`));

const evidenceSource = read('docs/validation/ORD-001-A06-EXECUTION-READINESS.json');
const evidence = JSON.parse(evidenceSource);
const documentation = read('docs/ORD-001-A06-EXECUTION-READINESS.md');
const workflow = read('.github/workflows/ord-001-a06-execution-readiness.yml');

assert.strictEqual(evidence.domain, 'ORD-001');
assert.strictEqual(evidence.sublot, 'ORD-A06');
assert.strictEqual(evidence.status, 'candidate_capacity_found_authorization_blocked');
assert.strictEqual(evidence.readOnlyInspection.performed, true);
assert.strictEqual(evidence.readOnlyInspection.accountsCreated, 0);
assert.strictEqual(evidence.readOnlyInspection.accountsModified, 0);
assert.strictEqual(evidence.readOnlyInspection.passwordsChanged, 0);
assert.strictEqual(evidence.readOnlyInspection.ordersCreated, 0);
assert.strictEqual(evidence.readOnlyInspection.productionChanged, false);

assert.strictEqual(evidence.capacity.authUsers, 3);
assert.strictEqual(evidence.capacity.professionalProfiles, 1);
assert.strictEqual(evidence.capacity.publishedServices, 1);
assert.strictEqual(evidence.capacity.compatibleDistinctPairs, 1);
assert.strictEqual(evidence.capacity.eligibleOwnedServiceCandidates, 1);
assert.strictEqual(evidence.clientCandidate.explicitlyAuthorizedForCanary, false);
assert.strictEqual(evidence.professionalCandidate.explicitlyAuthorizedForCanary, false);
assert.strictEqual(evidence.serviceCandidate.explicitlyAuthorizedForCanary, false);
assert.strictEqual(evidence.decision.technicalCapacityAvailable, true);
assert.strictEqual(evidence.decision.operationalAuthorizationAvailable, false);
assert.strictEqual(evidence.decision.realExecutionAllowed, false);

[
  'emailsRecorded',
  'userIdsRecorded',
  'serviceIdsRecorded',
  'usernamesRecorded',
  'displayNamesRecorded',
  'credentialsRecorded',
  'tokensRecorded',
  'serviceRoleRecorded'
].forEach((key) => assert.strictEqual(evidence.privacy[key], false, `Privacy flag must remain false: ${key}`));

const forbidden = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /service_[0-9]{10,}_[a-z0-9]{4,}/i,
  /(?:password|senha)\s*[:=]\s*['\"][^'\"]+['\"]/i,
  /(?:service[_-]?role|access[_-]?token)\s*[:=]\s*['\"][^'\"]+['\"]/i
];
forbidden.forEach((pattern) => {
  assert(!pattern.test(evidenceSource), `Readiness evidence contains forbidden identifier or secret matching ${pattern}`);
  assert(!pattern.test(documentation), `Readiness documentation contains forbidden identifier or secret matching ${pattern}`);
});

[
  'technical capacity',
  'does **not** authorize execution',
  'Existing accounts and services are user data',
  'No e-mail, user ID, username, display name, service ID, credential or token is recorded',
  'CI is limited to static evidence validation'
].forEach((fragment) => assert(documentation.includes(fragment), `Readiness documentation missing: ${fragment}`));

assert(workflow.includes('node scripts/audit-ord-001-a06-execution-readiness.js'));
assert(workflow.includes('node scripts/audit-ord-001-a06-playwright-executor.js'));
assert(workflow.includes('node scripts/execute-ord-001-a06-visual-settlement-playwright.js --dry-run'));
assert(!workflow.includes('--execute'));
assert(!workflow.includes('DOKE_ORD_A06_CLIENT_EMAIL'));
assert(!workflow.includes('DOKE_ORD_A06_SERVICE_ROLE_KEY'));
assert(!workflow.includes('supabase'));

console.log('ORD-A06 staging execution readiness audit passed.');
