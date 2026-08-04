'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const contract = require('../backend/modules/payments/payment-reconciliation-executor-adapter');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A10 audit failed: ' + message);
};

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-executor-adapter.js',
  config: 'config/pay-001-a10-external-executor-evidence-ingestion.json',
  docs: 'docs/PAY-001-A10-EXTERNAL-EXECUTOR-EVIDENCE-INGESTION.md',
  evidence: 'docs/validation/PAY-001-A10-EXTERNAL-EXECUTOR-EVIDENCE-INGESTION.json',
  audit: 'scripts/audit-pay-001-a10-external-executor-evidence-ingestion.js',
  test: 'scripts/test-pay-001-a10-external-executor-evidence-ingestion.js',
  workflow: '.github/workflows/pay-001-a10-external-executor-evidence-ingestion.yml'
};
Object.values(paths).forEach((file) => assert(fs.existsSync(path.join(root, file)), 'missing asset: ' + file));

const moduleSource = read(paths.module);
const config = readJson(paths.config);
const docs = read(paths.docs);
const evidence = readJson(paths.evidence);
const workflow = read(paths.workflow);
const packageJson = readJson('package.json');
const matrix = readJson('config/domain-completion-matrix.json');
const a09 = readJson('config/pay-001-a09-deployment-inspection-handoff.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(config.status === 'repository_only_inert_executor_adapters_and_sanitized_evidence_ingestion_ready_remote_execution_blocked', 'status mismatch');
assert(config.dependencies.a09ContractVersion === a09.contractVersion, 'A09 dependency mismatch');
assert(config.dependencies.a09PlanVersion === contract.A09_PLAN_VERSION, 'A09 plan dependency mismatch');
assert(config.dependencies.a08ManifestHash === a09.a08Dependency.manifestHash, 'A08 manifest dependency mismatch');
assert(config.dependencies.phaseCount === 5, 'five phases required');

assert(config.adapterBoundary.adapterVersion === contract.ADAPTER_VERSION, 'adapter version mismatch');
assert(config.adapterBoundary.dispatchVersion === contract.DISPATCH_VERSION, 'dispatch version mismatch');
[
  'transportConfigured', 'credentialsConfigured', 'endpointConfigured', 'executeMethodPresent',
  'remoteExecutionAllowedByRepositoryContract', 'repositoryExecutionPerformed', 'productionAllowed',
  'directMoneyMutationAllowed', 'providerOperationAllowed'
].forEach((key) => assert(config.adapterBoundary[key] === false, key + ' must remain false'));
assert(config.adapterBoundary.externalExecutorAuthorizationStillRequired === true, 'external authorization remains required');
assert(config.adapterBoundary.nextPhaseAutomaticallyAuthorized === false, 'automatic phase chaining must be denied');

assert(JSON.stringify(Object.keys(config.profiles)) === JSON.stringify(Object.keys(contract.ADAPTER_PROFILES)), 'profile inventory mismatch');
Object.entries(contract.ADAPTER_PROFILES).forEach(([operation, profile]) => {
  const configured = config.profiles[operation];
  assert(configured.executorType === profile.executorType, operation + ' executor type mismatch');
  assert(configured.capability === profile.capability, operation + ' capability mismatch');
  assert(JSON.stringify(configured.allowedStatuses) === JSON.stringify(profile.allowedStatuses), operation + ' statuses mismatch');
});

assert(config.receiptBoundary.receiptVersion === contract.RECEIPT_VERSION, 'receipt version mismatch');
assert(config.receiptBoundary.freshnessSeconds === 900, 'receipt freshness mismatch');
assert(JSON.stringify(config.receiptBoundary.signatureSchemes) === JSON.stringify(contract.ALLOWED_SIGNATURE_SCHEMES), 'signature schemes mismatch');
[
  'exactHeadBindingRequired', 'manifestBindingRequired', 'resourcePlanBindingRequired',
  'planFingerprintBindingRequired', 'dispatchFingerprintBindingRequired', 'executorIdHashed',
  'executionIdHashed'
].forEach((key) => assert(config.receiptBoundary[key] === true, key + ' must be true'));
['rawSignatureStored', 'rawLogsStored', 'replayAllowed', 'crossPhaseStatusAllowed']
  .forEach((key) => assert(config.receiptBoundary[key] === false, key + ' must remain false'));

assert(config.evidenceBoundary.evidenceVersion === contract.EVIDENCE_VERSION, 'evidence version mismatch');
assert(config.evidenceBoundary.aggregateCountsOnly === true, 'aggregate counts required');
assert(config.evidenceBoundary.immutableAuditRecord === true, 'immutable audit evidence required');
[
  'rawEvidenceStored', 'rawLogsStored', 'userIdentifiersAllowed', 'financialIdentifiersAllowed',
  'providerPayloadAllowed', 'secretsAllowed', 'rawSqlAllowed', 'stdoutAllowed', 'stderrAllowed',
  'automaticFollowUpAllowed', 'remoteActionTriggeredByIngestion', 'replayAllowed'
].forEach((key) => assert(config.evidenceBoundary[key] === false, key + ' must remain false'));

assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers changed');
Object.entries(config.effects).forEach(([key, value]) => assert(value === 0 || value === false, 'effect must remain zero/false: ' + key));

[
  "const CONTRACT_VERSION = 'pay-a10-external-executor-evidence-ingestion-v1'",
  "const ADAPTER_VERSION = 'pay-reconciliation-executor-adapter-v1'",
  "const RECEIPT_VERSION = 'pay-reconciliation-execution-receipt-v1'",
  "const EVIDENCE_VERSION = 'pay-reconciliation-execution-evidence-v1'",
  'DOKE_PAY_A10_TRANSPORT_MUST_BE_DISABLED',
  'DOKE_PAY_A10_RECEIPT_REPLAYED',
  'DOKE_PAY_A10_EVIDENCE_REPLAYED',
  'DOKE_PAY_A10_SENSITIVE_FIELD_DENIED',
  'nextPhaseAutomaticallyAuthorized: false',
  'remoteActionTriggeredByIngestion: false',
  'executeMethodPresent: false'
].forEach((fragment) => assert(moduleSource.includes(fragment), 'module missing: ' + fragment));

[
  'PAY-A10', 'PAY-A09', 'Próximo', 'inert', 'dispatch fingerprint', '900 seconds',
  'ed25519', 'rsa_pss_sha256', 'replay', 'raw SQL', 'stdout', 'stderr',
  'nextPhaseAutomaticallyAuthorized: false', 'PAY-B01', 'PAY-B03', 'PAY-B04', 'PAY-A11'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.a09ContractVersion === config.dependencies.a09ContractVersion, 'evidence A09 mismatch');
assert(evidence.a08ManifestHash === config.dependencies.a08ManifestHash, 'evidence manifest mismatch');
[
  'fivePhaseSpecificInertAdapters', 'transportCredentialsAndEndpointsRemainUnconfigured',
  'executeMethodAbsent', 'dispatchBoundToA09PlanAndExecutor', 'phaseSpecificReceiptStatusesEnforced',
  'receiptSignatureDigestRequired', 'receiptFreshnessEnforced', 'receiptReplayRejected',
  'evidenceReceiptAndPlanBindingEnforced', 'aggregateEvidenceOnly',
  'sensitiveFieldsAndRawLogsRejected', 'statusConsistencyEnforced', 'evidenceReplayRejected',
  'nextPhaseAutomaticAuthorizationRejected', 'repositoryRemoteAuthorityAbsent'
].forEach((key) => assert(evidence.validated[key] === true, 'validation evidence missing: ' + key));
Object.entries(evidence.execution).forEach(([key, value]) => assert(value === 0 || value === false, 'execution effect must remain zero/false: ' + key));

assert(packageJson.scripts['audit:pay-001-a10-external-executor-evidence-ingestion'] === 'node scripts/audit-pay-001-a10-external-executor-evidence-ingestion.js', 'package audit missing');
assert(packageJson.scripts['test:pay-001-a10-external-executor-evidence-ingestion'] === 'node scripts/test-pay-001-a10-external-executor-evidence-ingestion.js', 'package test missing');

assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.95'), 'matrix version must be at least 1.3.95');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local' && pay.serverAuthority === 'contract_only', 'PAY authority drifted');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers drifted');
Object.values(paths).forEach((file) => assert(pay.requiredPaths.includes(file), 'matrix requiredPaths missing: ' + file));
assert(pay.scanRoots.includes(paths.module), 'matrix scanRoots missing A10 module');
assert(pay.tests.includes('audit:pay-001-a10-external-executor-evidence-ingestion'), 'matrix A10 audit missing');
assert(pay.tests.includes('test:pay-001-a10-external-executor-evidence-ingestion'), 'matrix A10 test missing');
assert(pay.evidence.some((item) => item.includes('PAY-A10')), 'matrix A10 evidence missing');
assert(pay.nextActions[0].includes('PAY-A14'), 'PAY-A14 must be the first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
[
  'contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD',
  'psql ', 'curl ', 'supabase db push', 'supabase migration up', 'git push', '--execute'
].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));

console.log('PAY-A10 external executor adapter and evidence ingestion audit passed.');
