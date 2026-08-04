'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const contract = require('../backend/modules/payments/payment-reconciliation-staging-handoff');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error('PAY-A09 audit failed: ' + message); };

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-staging-handoff.js',
  config: 'config/pay-001-a09-deployment-inspection-handoff.json',
  docs: 'docs/PAY-001-A09-DEPLOYMENT-INSPECTION-HANDOFF.md',
  evidence: 'docs/validation/PAY-001-A09-DEPLOYMENT-INSPECTION-HANDOFF.json',
  audit: 'scripts/audit-pay-001-a09-deployment-inspection-handoff.js',
  test: 'scripts/test-pay-001-a09-deployment-inspection-handoff.js',
  workflow: '.github/workflows/pay-001-a09-deployment-inspection-handoff.yml'
};
Object.values(paths).forEach((file) => assert(fs.existsSync(path.join(root, file)), 'missing asset: ' + file));

const moduleSource = read(paths.module);
const config = readJson(paths.config);
const docs = read(paths.docs);
const evidence = readJson(paths.evidence);
const workflow = read(paths.workflow);
const packageJson = readJson('package.json');
const matrix = readJson('config/domain-completion-matrix.json');
const a08 = readJson('config/pay-001-a08-immutable-migrations-read-only-canary.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(config.status === 'repository_only_separated_handoffs_ready_remote_execution_blocked', 'status mismatch');
assert(config.a08Dependency.contractVersion === a08.contractVersion, 'A08 contract dependency mismatch');
assert(config.a08Dependency.manifestHash === a08.migrationManifest.manifestHash, 'A08 manifest dependency mismatch');
assert(config.a08Dependency.migrationCount === 4, 'four A08 migrations required');
assert(config.a08Dependency.providerNeutral === true && config.a08Dependency.migrationSourcesImmutable === true, 'A08 immutability/provider boundary missing');

const phaseNames = Object.keys(contract.OPERATIONS);
assert(JSON.stringify(Object.keys(config.phases)) === JSON.stringify(phaseNames), 'phase inventory mismatch');
const phrases = new Set();
const scopes = new Set();
phaseNames.forEach((name) => {
  const phase = config.phases[name];
  const operation = contract.OPERATIONS[name];
  assert(phase.phrase === operation.phrase, name + ' phrase mismatch');
  assert(phase.scope === operation.scope, name + ' scope mismatch');
  assert(phase.currentReady === false, name + ' must remain not ready');
  assert(!phrases.has(phase.phrase), 'authorization phrases must be unique');
  assert(!scopes.has(phase.scope), 'authorization scopes must be unique');
  phrases.add(phase.phrase);
  scopes.add(phase.scope);
});

assert(config.authorizationBoundary.freshnessSeconds === 900, 'freshness boundary mismatch');
assert(config.authorizationBoundary.oneShot === true, 'one-shot boundary missing');
assert(config.authorizationBoundary.distinctApproversRequired === true, 'separation of duties missing');
assert(config.authorizationBoundary.crossOperationNonceReuseAllowed === false, 'cross-operation nonce reuse must be denied');
assert(config.authorizationBoundary.genericContinuationAuthorizesAnything === false, 'generic continuation must be rejected');
assert(config.authorizationBoundary.priorAuthorizationReusable === false, 'prior authorization reuse must be rejected');
assert(config.authorizationBoundary.productionExplicitlyDenied === true, 'production must be denied');
assert(config.authorizationBoundary.externalAuthorizedExecutorRequired === true, 'external executor requirement missing');
assert(config.authorizationBoundary.remoteActionsAllowedByRepositoryContract === false, 'repository remote authority must remain absent');
assert(config.authorizationBoundary.repositoryExecutionPerformed === false, 'repository must not claim execution');

assert(config.phases.read_only_preflight.mutationAllowed === false, 'preflight mutation must remain denied');
assert(config.phases.read_only_preflight.financialRowReadsAllowed === false, 'financial row reads must remain denied');
assert(config.phases.migration_application.compatiblePreflightEvidenceRequired === true, 'migration requires compatible preflight');
assert(config.phases.migration_application.manualSqlAllowed === false, 'manual SQL must remain denied');
assert(config.phases.migration_application.manualMigrationHistoryMutationAllowed === false, 'manual history mutation must remain denied');
assert(config.phases.post_migration_verification.mutationAllowed === false, 'post verification must remain read-only');
assert(config.phases.post_migration_verification.automaticDriftRepairAllowed === false, 'auto-repair must remain denied');
assert(config.phases.rollback.mode === 'forward_only_reviewed_migration', 'rollback mode mismatch');
assert(config.phases.rollback.destructiveDownMigrationAllowed === false, 'destructive down migration must be denied');
assert(config.phases.rollback.manualMigrationHistoryDeletionAllowed === false, 'history deletion must be denied');
assert(config.phases.rollback.dataDeletionAllowed === false && config.phases.rollback.automaticRollbackAllowed === false, 'rollback deletion/automation must be denied');
assert(JSON.stringify(config.phases.cleanup.allowedTargets) === JSON.stringify(contract.ALLOWED_CLEANUP_TARGETS), 'cleanup allowlist mismatch');
assert(config.phases.cleanup.databaseRowsDeletionAllowed === false, 'database cleanup must be denied');
assert(config.phases.cleanup.migrationHistoryDeletionAllowed === false, 'migration history cleanup must be denied');
assert(config.phases.cleanup.secretDeletionAllowed === false && config.phases.cleanup.automaticCleanupAllowed === false, 'secret/automatic cleanup must be denied');

assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blocker set changed');
Object.entries(config.effects).forEach(([key, value]) => assert(value === 0 || value === false, 'effect must remain zero/false: ' + key));

[
  "const CONTRACT_VERSION = 'pay-a09-deployment-inspection-handoff-v1'",
  "const PLAN_VERSION = 'pay-reconciliation-staging-handoff-plan-v1'",
  'DOKE_PAY_A09_AUTHORIZATION_REPLAYED',
  'DOKE_PAY_A09_PREFLIGHT_NOT_COMPATIBLE',
  'DOKE_PAY_A09_DESTRUCTIVE_ROLLBACK_DENIED',
  'DOKE_PAY_A09_CLEANUP_TARGET_DENIED',
  'remoteExecutionAllowedByThisContract: false',
  'repositoryExecutionPerformed: false',
  'directMoneyMutationAllowed: false'
].forEach((fragment) => assert(moduleSource.includes(fragment), 'module missing: ' + fragment));

[
  'PAY-A09', 'Próximo', '900 segundos', 'nonce', 'preflight read-only', 'ordered_once_fail_closed',
  'pós-migration', 'forward-only', 'histórico de migrations', 'cleanup', 'PAY-B01', 'PAY-B03', 'PAY-B04', 'PAY-A10',
  ...phaseNames.map((name) => contract.OPERATIONS[name].phrase)
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.a08ManifestHash === config.a08Dependency.manifestHash, 'evidence manifest mismatch');
assert(evidence.validated.fiveIndependentAuthorizationPhases === true, 'phase separation evidence missing');
assert(evidence.validated.crossOperationNonceReuseRejected === true, 'nonce isolation evidence missing');
assert(evidence.validated.compatiblePreflightRequiredBeforeMigration === true, 'preflight evidence missing');
assert(evidence.validated.forwardOnlyRollbackEnforced === true, 'rollback evidence missing');
assert(evidence.validated.cleanupTargetsAllowlisted === true, 'cleanup evidence missing');
assert(evidence.validated.repositoryRemoteAuthorityAbsent === true, 'repository authority evidence missing');
Object.entries(evidence.execution).forEach(([key, value]) => assert(value === 0 || value === false, 'execution effect must remain zero/false: ' + key));

assert(packageJson.scripts['audit:pay-001-a09-deployment-inspection-handoff'] === 'node scripts/audit-pay-001-a09-deployment-inspection-handoff.js', 'package audit command missing');
assert(packageJson.scripts['test:pay-001-a09-deployment-inspection-handoff'] === 'node scripts/test-pay-001-a09-deployment-inspection-handoff.js', 'package test command missing');

assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.94'), 'matrix version must be at least 1.3.94');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local' && pay.serverAuthority === 'contract_only', 'PAY authority must remain local/contract-only');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'blockers drifted');
Object.values(paths).forEach((file) => assert(pay.requiredPaths.includes(file), 'matrix requiredPaths missing: ' + file));
assert(pay.scanRoots.includes(paths.module), 'matrix scanRoots missing A09 module');
assert(pay.tests.includes('audit:pay-001-a09-deployment-inspection-handoff'), 'matrix A09 audit missing');
assert(pay.tests.includes('test:pay-001-a09-deployment-inspection-handoff'), 'matrix A09 test missing');
assert(pay.evidence.some((item) => item.includes('PAY-A09')), 'matrix A09 evidence missing');
assert(pay.nextActions[0].includes('PAY-A15'), 'PAY-A15 must be the first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
['contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'psql ', 'curl ', 'supabase db push', 'supabase migration up', 'git push', '--execute']
  .forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));

console.log('PAY-A09 deployment and inspection handoff audit passed.');
