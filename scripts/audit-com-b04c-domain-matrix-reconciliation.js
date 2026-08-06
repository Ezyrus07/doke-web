'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.deepStrictEqual(actual, expected, message); };

const pkg = JSON.parse(read('package.json'));
const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
const doc = read('docs/DOMAIN-COMPLETION-MATRIX.md');
const report = JSON.parse(read('reports/generated/domain-completion-matrix-report.json'));
const config = JSON.parse(read('config/com-b04c-moderation-persistence-staging-verification.json'));
const evidence = JSON.parse(read('docs/validation/COM-B04C-MODERATION-PERSISTENCE-STAGING-VERIFICATION.json'));
const domain = matrix.domains.find((item) => item.id === 'COM-001');
const flow = matrix.criticalFlows.find((item) => item.id === 'FLOW-12');

check(domain, 'COM-001 domain exists');
check(flow, 'FLOW-12 exists');
check(['1.3.109', '1.3.110', '1.3.111', '1.3.112'].includes(matrix.version), 'matrix version continuity');
equal(domain.maturity, 3, 'maturity preserved');
equal(domain.userFacingAuthority, 'hybrid', 'UI authority preserved');
equal(domain.serverAuthority, 'partial', 'server authority partial');
equal(domain.stagingEvidence, 'staging_canary', 'staging evidence preserved');
equal(domain.productionGate, 'blocked', 'production blocked');

for (const required of [
  'config/com-b04c-moderation-persistence-staging-verification.json',
  'supabase/migrations/20260805214700_com_b04c_moderation_fk_indexes.sql',
  'scripts/audit-com-b04c-moderation-persistence-staging-verification.js',
  'scripts/audit-com-b04c-domain-matrix-reconciliation.js',
  'docs/COM-B04C-MODERATION-PERSISTENCE-STAGING-VERIFICATION.md',
  'docs/validation/COM-B04C-MODERATION-PERSISTENCE-STAGING-VERIFICATION.json',
  '.github/workflows/com-b04c-moderation-persistence-staging-verification.yml'
]) check(domain.requiredPaths.includes(required), `required path: ${required}`);

const script = 'audit:com-b04c-moderation-persistence-staging-verification';
check(domain.tests.includes(script), 'matrix B04C audit command');
equal(pkg.scripts[script], 'node scripts/audit-com-b04c-moderation-persistence-staging-verification.js', 'package B04C command');

for (const marker of [
  'COM-B04C applied and structurally verified immutable moderation persistence in staging',
  'rollback-only canary proved atomic revision creation, idempotent replay, revision-conflict rejection and immutable-ledger enforcement',
  'No synthetic moderation rows persisted; runtime composition, real moderation actions and production remain blocked.'
]) {
  check(domain.evidence.some((item) => item.includes(marker)), `matrix evidence: ${marker}`);
  check(doc.includes(marker), `doc evidence: ${marker}`);
}

const blocker = domain.blockers.find((item) => item.id === 'COM-B04');
check(blocker, 'COM-B04 blocker retained');
check(flow.blockers.includes('COM-B04'), 'FLOW-12 blocker retained');
if (matrix.version === '1.3.109') {
  equal(matrix.updatedAt, '2026-08-05T22:02:00-03:00', 'B04C matrix timestamp');
  equal(blocker.category, 'moderation_runtime_composition', 'B04C blocker category');
  equal(blocker.description, 'Immutable moderation persistence is applied and structurally verified in staging, but runtime composition, authenticated invocation and real moderation execution are not active.', 'B04C blocker description');
  const nextAction = 'Prepare repository-only moderation runtime composition under COM-B04D; any live staging invocation or real moderation action requires separate explicit authorization.';
  check(domain.nextActions.includes(nextAction), 'B04D next action');
  check(doc.includes(nextAction), 'doc B04D next action');
} else if (matrix.version === '1.3.110') {
  equal(matrix.updatedAt, '2026-08-05T22:17:00-03:00', 'B04D matrix timestamp');
  equal(blocker.category, 'moderation_authenticated_staging_canary', 'B04D blocker category');
  equal(blocker.description, 'Moderation runtime composition is repository-certified and persistence is structurally verified in staging, but authenticated live invocation, route activation and real moderation execution are not active.', 'B04D blocker description');
  const nextAction = 'Execute an authenticated rollback-only moderation composition canary in staging under COM-B04E only after separate explicit authorization.';
  check(domain.nextActions.includes(nextAction), 'B04E next action');
  check(doc.includes(nextAction), 'doc B04E next action');
} else if (matrix.version === '1.3.111') {
  equal(matrix.updatedAt, '2026-08-06T09:36:00-03:00', 'B04G matrix timestamp');
  equal(blocker.category, 'moderation_live_composition_activation', 'B04G blocker category');
  check(blocker.description.includes('repository route/module wiring is certified'), 'B04G blocker description');
  const nextAction = 'Prepare COM-B04H repository-only live composition activation readiness; staging deployment, traffic and real moderation require separate explicit authorization.';
  check(domain.nextActions.includes(nextAction), 'B04H next action');
  check(doc.includes(nextAction), 'doc B04H next action');
} else {
  equal(matrix.updatedAt, '2026-08-06T10:24:00-03:00', 'B04H matrix timestamp');
  equal(blocker.category, 'moderation_staging_live_activation_authorization', 'B04H blocker category');
  equal(blocker.description, 'COM-B04H repository-certified the live composition activation proof package, but the route handler remains HTTP 503, the composition remains disabled and staging activation, traffic and real moderation require separate COM-B04I authorization.', 'B04H blocker description');
  const nextAction = 'Authorize and execute COM-B04I staging live composition activation and rollback-only route canary only after the exact separate authorization phrase.';
  check(domain.nextActions.includes(nextAction), 'B04I next action');
  check(doc.includes(nextAction), 'doc B04I next action');
  check(domain.evidence.some((item) => item.includes('COM-B04H repository-certified')), 'B04H evidence');
}

equal(report.name, 'domain-completion-matrix', 'report name');
equal(report.version, matrix.version, 'report version');
equal(report.generatedAt, matrix.updatedAt, 'report timestamp');
equal(report.status, 'passed', 'report status');
const reportDomain = report.domains.find((item) => item.id === 'COM-001');
check(reportDomain && reportDomain.filesMatched >= 17, 'report scans COM paths');

equal(config.status, 'staging_migrations_applied_structurally_verified_runtime_blocked', 'config status');
equal(config.structure.tableCount, 8, 'tables');
equal(config.structure.foreignKeysIndexed, true, 'FK indexes');
equal(config.structure.persistentRowCount, 0, 'persistent rows');
equal(config.rollbackCanary.idempotentReplay, true, 'replay');
equal(config.rollbackCanary.persistentResidue, false, 'canary residue');
equal(config.runtime.adapterIntegrated, false, 'B04C historical runtime disconnected');
equal(config.effects.stagingSchemaChanged, true, 'staging schema changed');
equal(config.effects.productionChanged, false, 'production unchanged');
equal(config.effects.pullRequestMerged, false, 'PR unmerged');
for (const value of Object.values(config.remainingAuthority)) equal(value, false, 'remaining authority false');

equal(evidence.status, 'staging_structural_verification_passed', 'evidence status');
equal(evidence.result, 'passed_staging_only_runtime_blocked', 'evidence result');
equal(evidence.verification.tables, '8/8', 'evidence tables');
equal(evidence.verification.foreignKeysIndexed, true, 'evidence indexes');
equal(evidence.rollbackCanary.transactionRolledBack, true, 'evidence rollback');
equal(evidence.rollbackCanary.persistentResidue, false, 'evidence residue');

console.log(`COM-B04C matrix reconciliation audit passed: ${checks}/${checks}`);
