'use strict';

const fs = require('fs');
const path = require('path');
const authority = require('../backend/modules/reputation/review-command-authority');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'rep-a02-review-command-authority.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'rep-a02-review-command-cases.json'), 'utf8'));
const checks = [];

function check(name, condition) { checks.push({ name, passed: Boolean(condition) }); }
function equals(name, actual, expected) { check(name, actual === expected); }
function includes(name, list, value) { check(name, Array.isArray(list) && list.includes(value)); }
function fileContains(file, snippets) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  snippets.forEach((snippet) => check(`${file} contains ${snippet}`, content.includes(snippet)));
}

equals('contract id', contract.contractId, authority.CONTRACT_ID);
equals('domain', contract.domain, 'REP-001');
equals('scope', contract.scope, 'repository_only');
equals('runtime disabled', contract.runtimeIntegrated, false);
equals('migration not prepared', contract.migrationPrepared, false);
equals('migration not applied', contract.migrationApplied, false);
equals('staging not validated', contract.stagingValidated, false);
equals('review scope', contract.reviewScope, authority.REVIEW_SCOPE);
equals('initial state', contract.initialReviewState, 'pending_moderation');
equals('public visibility false', contract.publicVisibilityOnCommand, false);

['accept','replay','reject','conflict','unavailable'].forEach((decision) => includes(`decision ${decision}`, contract.commandDecisions, decision));
[
  'authenticated review commands require a stable UUID clientRequestId',
  'payload drift under the same idempotency key is a conflict',
  'one actor may create at most one review for the configured scope and completed order',
  'lost-response retry returns the same review identity and outcome',
  'only canonical server snapshots can establish eligibility',
  'order completion, payment release and dispute gate are validated together',
  'new reviews begin pending moderation and are not publicly visible',
  'localStorage, cache and local mock state never establish review authority'
].forEach((invariant) => includes(`invariant ${invariant}`, contract.mandatoryInvariants, invariant));

Object.entries(contract.authority).forEach(([key, value]) => {
  if (['contractAuthority','eligibilityContractAuthority','idempotencyContractAuthority'].includes(key)) {
    equals(`authority ${key}`, value, true);
  } else {
    equals(`authority ${key}`, value, false);
  }
});
Object.entries(contract.prohibitedEffects).forEach(([key, value]) => equals(`prohibited effect ${key}`, value, false));
['REP-B02','REP-B03','REP-B04','DSP-B01','DSP-B03','DSP-B04','PAY-B01','PAY-B03','PAY-B04']
  .forEach((blocker) => includes(`blocker ${blocker}`, contract.preservedBlockers, blocker));

[
  'backend/modules/reputation/review-command-authority.js',
  'config/rep-a02-review-command-authority.json',
  'tests/fixtures/rep-a02-review-command-cases.json',
  'docs/REP-A02-REVIEW-COMMAND-AUTHORITY.md',
  'scripts/audit-rep-a02-review-command-authority.js',
  'scripts/test-rep-a02-review-command-authority.js',
  '.github/workflows/rep-a02-review-command-authority.yml'
].forEach((file) => check(`file ${file}`, fs.existsSync(path.join(root, file))));

fileContains('backend/modules/reputation/review-command-authority.js', [
  'canonical_server', 'pending_moderation', 'publicVisibility: false',
  'idempotency_payload_conflict', 'uniqueness_conflict', 'revision_mismatch',
  'clientRequestId', 'uniquenessKey', 'idempotencyKey', 'intentFingerprint',
  'review_command_v1_', 'review_subject_v1_', 'resolution_required',
  'runtimeAuthority: false', 'unsupported_review_scope'
]);
fileContains('docs/REP-A02-REVIEW-COMMAND-AUTHORITY.md', [
  'Client request ID', 'Idempotency key', 'Uniqueness key',
  'Lost-response and concurrency rules', 'client_to_professional',
  'publicVisibility: false', 'Explicit non-effects'
]);
fileContains('.github/workflows/rep-a02-review-command-authority.yml', [
  'permissions:', 'contents: read', 'Audit review command authority',
  'REP-A01 regression', 'DSP-A05 predecessor regression', 'git diff --check'
]);

const currentRepository = fs.readFileSync(path.join(root, 'assets/js/repositories/reviews-repository.js'), 'utf8');
const currentService = fs.readFileSync(path.join(root, 'assets/js/services/review-service.js'), 'utf8');
const currentPolicy = fs.readFileSync(path.join(root, 'supabase/migrations/113_availability_reviews_authority.sql'), 'utf8');
check('baseline localStorage remains inventoried', currentRepository.includes('doke.reviews.local.v1'));
check('baseline browser reputation remains inventoried', currentRepository.includes('getProfessionalReputation'));
check('baseline local provider remains inventoried', currentService.includes("provider: 'local-mock'"));
check('baseline direct insert remains inventoried', currentPolicy.includes('for insert'));
check('baseline published insert remains inventoried', currentPolicy.includes("status = 'published'"));

const command = authority.buildReviewCommand(fixtures.baseCommand);
check('command frozen', Object.isFrozen(command));
equals('command contract id', command.contractId, authority.CONTRACT_ID);
equals('command scope', command.scope, authority.REVIEW_SCOPE);
check('idempotency prefix', command.idempotencyKey.startsWith('review_command_v1_'));
check('uniqueness prefix', command.uniquenessKey.startsWith('review_subject_v1_'));
check('review id prefix', command.deterministicReviewId.startsWith('review_'));
equals('intent fingerprint length', command.intentFingerprint.length, 64);
equals('tag normalization', command.tags.join(','), 'pontual,qualidade');
equals('criteria sorting', command.criteria.map((item) => item.key).join(','), 'communication,quality');

const accepted = authority.evaluateEligibility(fixtures.baseCommand, fixtures.baseSnapshot);
equals('base accepted', accepted.decision, 'accept');
equals('base reason', accepted.reason, 'eligible');
equals('base moderation', accepted.initialModerationState, 'pending_moderation');
equals('base public hidden', accepted.publicVisibility, false);
equals('base runtime authority', accepted.runtimeAuthority, false);

authority.FORBIDDEN_KEYS.forEach((key) => {
  check(`forbidden key ${key}`, authority.containsForbiddenRawData({ nested: { [key]: 'x' } }));
});

const total = checks.length;
const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
const result = {
  contractId: contract.contractId,
  sourceHead: contract.sourceHead,
  total,
  passed: total - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks,
  effects: contract.prohibitedEffects
};
console.log(JSON.stringify(result, null, 2));
if (failedChecks.length) process.exitCode = 1;
