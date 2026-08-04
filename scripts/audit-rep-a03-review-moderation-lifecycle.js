'use strict';

const fs = require('fs');
const path = require('path');
const a = require('../backend/modules/reputation/review-moderation-lifecycle');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'rep-a03-review-moderation-lifecycle.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'rep-a03-review-moderation-cases.json'), 'utf8'));
const checks = [];

const check = (name, condition) => checks.push({ name, passed: Boolean(condition) });
const equals = (name, actual, expected) => check(name, actual === expected);
const includes = (name, list, value) => check(name, Array.isArray(list) && list.includes(value));
const fileContains = (file, snippets) => {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  snippets.forEach((snippet) => check(`${file} contains ${snippet}`, content.includes(snippet)));
};

equals('contract id', contract.contractId, a.CONTRACT_ID);
equals('domain', contract.domain, 'REP-001');
equals('scope', contract.scope, 'repository_only');
equals('runtime disabled', contract.runtimeIntegrated, false);
equals('migration not prepared', contract.migrationPrepared, false);
equals('migration not applied', contract.migrationApplied, false);
equals('staging not validated', contract.stagingValidated, false);

Object.values(a.REVIEW_STATES).forEach((state) => includes(`review state ${state}`, contract.reviewStates, state));
Object.values(a.CASE_STATES).forEach((state) => includes(`case state ${state}`, contract.caseStates, state));
Object.values(a.ACTIONS).forEach((action) => includes(`action ${action}`, contract.actions, action));
Object.values(a.DECISIONS).forEach((decision) => includes(`decision ${decision}`, contract.decisions, decision));

[
  'only canonical server snapshots can authorize moderation transitions',
  'reports open a case but do not automatically hide, remove or alter reputation',
  'triage does not alter public visibility',
  'appeals do not automatically restore public visibility',
  'appeal decisions require an independent senior moderator',
  'event envelopes are append-only and hash chained',
  'public visibility is derived from review state and never selected by the browser',
  'localStorage, cache and local mock state never establish moderation authority'
].forEach((invariant) => includes(`invariant ${invariant}`, contract.mandatoryInvariants, invariant));

Object.entries(contract.authority).forEach(([key, value]) => {
  const positive = ['contractAuthority','moderationLifecycleContractAuthority','appealLifecycleContractAuthority','eventEnvelopeContractAuthority'];
  equals(`authority ${key}`, value, positive.includes(key));
});
Object.entries(contract.prohibitedEffects).forEach(([key, value]) => equals(`prohibited effect ${key}`, value, false));
['REP-B02','REP-B03','REP-B04','DSP-B01','DSP-B03','DSP-B04','PAY-B01','PAY-B03','PAY-B04']
  .forEach((blocker) => includes(`blocker ${blocker}`, contract.preservedBlockers, blocker));

[
  'backend/modules/reputation/review-moderation-lifecycle.js',
  'config/rep-a03-review-moderation-lifecycle.json',
  'tests/fixtures/rep-a03-review-moderation-cases.json',
  'docs/REP-A03-REVIEW-MODERATION-LIFECYCLE.md',
  'scripts/audit-rep-a03-review-moderation-lifecycle.js',
  'scripts/test-rep-a03-review-moderation-lifecycle.js',
  '.github/workflows/rep-a03-review-moderation-lifecycle.yml'
].forEach((file) => check(`file ${file}`, fs.existsSync(path.join(root, file))));

fileContains('backend/modules/reputation/review-moderation-lifecycle.js', [
  'canonical_server', 'pending_moderation', 'appeal_pending',
  'moderator_conflict_of_interest', 'appeal_independence_required',
  'prior_decision_mismatch', 'idempotency_payload_conflict',
  'resolution_required', 'previousEventHash', 'eventHash',
  'reputationMutationAuthority: false', 'runtimeAuthority: false'
]);
fileContains('docs/REP-A03-REVIEW-MODERATION-LIFECYCLE.md', [
  'Separate state machines', 'Reporting boundary', 'Appeal and restoration boundary',
  'Idempotency and lost-response safety', 'Immutable event history', 'Explicit non-effects'
]);
fileContains('.github/workflows/rep-a03-review-moderation-lifecycle.yml', [
  'permissions:', 'contents: read', 'Audit moderation lifecycle',
  'REP-A02 regression', 'REP-A01 regression', 'DSP-A05 predecessor regression', 'git diff --check'
]);

const base = a.evaluateModeration(fixtures.baseCommand, fixtures.baseSnapshot);
equals('base accepted', base.decision, 'accept');
equals('base reason', base.reason, 'transition_allowed');
equals('base review published', base.reviewState, 'published');
equals('base case none', base.caseState, 'none');
equals('base visible', base.publicVisibility, true);
equals('base runtime false', base.runtimeAuthority, false);
equals('base reputation false', base.reputationMutationAuthority, false);

const command = a.buildModerationCommand(fixtures.baseCommand);
check('command frozen', Object.isFrozen(command));
check('idempotency prefix', command.idempotencyKey.startsWith('review_moderation_command_v1_'));
check('event prefix', command.deterministicEventId.startsWith('review_moderation_event_'));
equals('intent fingerprint length', command.intentFingerprint.length, 64);
equals('evidence sort', command.evidenceRefs.join(','), 'evidence://policy-check/1,evidence://policy-check/2');

a.FORBIDDEN_KEYS.forEach((key) => {
  check(`forbidden key ${key}`, a.containsForbiddenRawData({ nested: { [key]: 'x' } }));
});

const envelope = a.buildEventEnvelope(base, fixtures.baseSnapshot, '2026-08-04T20:00:00-03:00');
check('event frozen', Object.isFrozen(envelope));
equals('event hash length', envelope.eventHash.length, 64);
equals('event previous hash', envelope.previousEventHash, 'genesis-review-6666');
equals('event public visibility', envelope.publicVisibility, true);
check('event excludes raw summary', !Object.prototype.hasOwnProperty.call(envelope, 'reasonSummary'));

const a02Module = fs.readFileSync(path.join(root, 'backend/modules/reputation/review-command-authority.js'), 'utf8');
check('REP-A02 pending moderation predecessor preserved', a02Module.includes("initialModerationState: 'pending_moderation'"));
check('REP-A02 public hidden predecessor preserved', a02Module.includes('publicVisibility: false'));
check('REP-A02 runtime blocked predecessor preserved', a02Module.includes('runtimeAuthority: false'));

const currentRepository = fs.readFileSync(path.join(root, 'assets/js/repositories/reviews-repository.js'), 'utf8');
const currentService = fs.readFileSync(path.join(root, 'assets/js/services/review-service.js'), 'utf8');
const currentPolicy = fs.readFileSync(path.join(root, 'supabase/migrations/113_availability_reviews_authority.sql'), 'utf8');
check('baseline localStorage remains inventoried', currentRepository.includes('doke.reviews.local.v1'));
check('baseline browser reputation remains inventoried', currentRepository.includes('getProfessionalReputation'));
check('baseline local provider remains inventoried', currentService.includes("provider: 'local-mock'"));
check('baseline direct insert remains inventoried', currentPolicy.includes('for insert'));
check('baseline published insert remains inventoried', currentPolicy.includes("status = 'published'"));

const total = checks.length;
const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
console.log(JSON.stringify({
  contractId: contract.contractId,
  sourceHead: contract.sourceHead,
  total,
  passed: total - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks,
  effects: contract.prohibitedEffects
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
