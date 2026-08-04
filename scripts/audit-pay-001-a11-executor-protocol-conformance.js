'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const contract = require('../backend/modules/payments/payment-reconciliation-executor-protocol');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A11 audit failed: ' + message);
};

const manifestPaths = [
  'config/pay-a11-executor-protocol-manifests/read-only-preflight.json',
  'config/pay-a11-executor-protocol-manifests/migration-application.json',
  'config/pay-a11-executor-protocol-manifests/post-migration-verification.json',
  'config/pay-a11-executor-protocol-manifests/rollback.json',
  'config/pay-a11-executor-protocol-manifests/cleanup.json'
];

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-executor-protocol.js',
  config: 'config/pay-001-a11-executor-protocol-conformance.json',
  corpus: 'tests/fixtures/pay-a11-executor-protocol-conformance-corpus.json',
  docs: 'docs/PAY-001-A11-EXECUTOR-PROTOCOL-CONFORMANCE.md',
  evidence: 'docs/validation/PAY-001-A11-EXECUTOR-PROTOCOL-CONFORMANCE.json',
  writer: 'scripts/write-pay-001-a11-executor-protocol-manifests.js',
  audit: 'scripts/audit-pay-001-a11-executor-protocol-conformance.js',
  test: 'scripts/test-pay-001-a11-executor-protocol-conformance.js',
  workflow: '.github/workflows/pay-001-a11-executor-protocol-conformance.yml'
};
[...Object.values(paths), ...manifestPaths].forEach((file) => {
  assert(fs.existsSync(path.join(root, file)), 'missing asset: ' + file);
});

const moduleSource = read(paths.module);
const config = readJson(paths.config);
const corpus = readJson(paths.corpus);
const docs = read(paths.docs);
const evidence = readJson(paths.evidence);
const workflow = read(paths.workflow);
const packageJson = readJson('package.json');
const matrix = readJson('config/domain-completion-matrix.json');
const a10 = readJson('config/pay-001-a10-external-executor-evidence-ingestion.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(config.status === 'repository_only_provider_neutral_protocol_manifests_and_deterministic_conformance_ready_remote_execution_blocked', 'status mismatch');
assert(config.dependencies.a10ContractVersion === contract.A10_CONTRACT_VERSION, 'A10 dependency mismatch');
assert(config.dependencies.a10ContractVersion === a10.contractVersion, 'A10 config dependency mismatch');
assert(config.dependencies.phaseCount === 5, 'five phases required');
assert(config.protocol.manifestVersion === contract.MANIFEST_VERSION, 'manifest version mismatch');
assert(config.protocol.dryRunVersion === contract.DRY_RUN_VERSION, 'dry-run version mismatch');
assert(config.protocol.corpusVersion === contract.CORPUS_VERSION, 'corpus version mismatch');
assert(config.protocol.resultVersion === contract.RESULT_VERSION, 'result version mismatch');
assert(config.protocol.manifestCount === 5, 'five manifests required');
assert(config.protocol.corpusCaseCount === 35, 'corpus case count mismatch');
assert(config.protocol.positiveCaseCount === 5, 'positive case count mismatch');
assert(config.protocol.negativeCaseCount === 30, 'negative case count mismatch');

[
  'providerNeutral', 'dryRunOnly', 'deterministic', 'exactA10DispatchBinding',
  'receiptAndEvidenceValidationDelegatedToA10', 'allFivePhasesCovered',
  'stopOnFirstFailureValidated', 'forwardOnlyRollbackValidated',
  'cleanupAllowlistValidated'
].forEach((key) => assert(config.protocol[key] === true, key + ' must be true'));
[
  'transportConfigured', 'credentialsConfigured', 'endpointConfigured',
  'networkAllowed', 'databaseConnectionAllowed', 'subprocessAllowed',
  'environmentReadAllowed', 'rawSqlAllowed', 'productionAllowed',
  'directMoneyMutationAllowed', 'providerOperationAllowed',
  'automaticNextPhaseAllowed', 'remoteExecutionAllowedByRepositoryContract',
  'repositoryExecutionPerformed'
].forEach((key) => assert(config.protocol[key] === false, key + ' must remain false'));

const operations = Object.keys(contract.COMMAND_KINDS);
assert(JSON.stringify(operations) === JSON.stringify(Object.keys(config.manifests)), 'manifest inventory mismatch');
operations.forEach((operation, index) => {
  const manifest = readJson(manifestPaths[index]);
  const expected = contract.buildProtocolManifest(operation);
  assert(JSON.stringify(manifest) === JSON.stringify(expected), 'manifest drift: ' + operation);
  assert(contract.validateProtocolManifest(manifest).manifestFingerprint === manifest.manifestFingerprint, 'manifest validation failed: ' + operation);
  assert(config.manifests[operation].path === manifestPaths[index], 'manifest path mismatch: ' + operation);
  assert(config.manifests[operation].fingerprint === manifest.manifestFingerprint, 'manifest fingerprint mismatch: ' + operation);
});

const summary = contract.runConformanceCorpus(corpus);
assert(summary.allPassed === true, 'conformance corpus failed');
assert(summary.totalCases === 35 && summary.acceptedCases === 5 && summary.rejectedCases === 30, 'corpus summary mismatch');
assert(config.corpus.fingerprint === summary.corpusFingerprint, 'corpus fingerprint mismatch');
assert(config.corpus.fixedClock === corpus.fixtureClock, 'fixed clock mismatch');
assert(config.corpus.exactHeadFixture === corpus.exactGitHead, 'fixture head mismatch');
assert(config.corpus.networkRequests === 0, 'corpus network effects must be zero');
assert(config.corpus.databaseConnections === 0, 'corpus database effects must be zero');
assert(config.corpus.subprocesses === 0, 'corpus subprocess effects must be zero');
assert(config.corpus.environmentReads === 0, 'corpus environment effects must be zero');

assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers changed');
Object.entries(config.effects).forEach(([key, value]) => assert(value === 0 || value === false, 'effect must remain zero/false: ' + key));

[
  "const CONTRACT_VERSION = 'pay-a11-executor-protocol-conformance-v1'",
  "const MANIFEST_VERSION = 'pay-reconciliation-executor-protocol-manifest-v1'",
  "const DRY_RUN_VERSION = 'pay-reconciliation-executor-dry-run-v1'",
  "const CORPUS_VERSION = 'pay-reconciliation-executor-conformance-corpus-v1'",
  'DOKE_PAY_A11_CAPABILITY_DENIED',
  'DOKE_PAY_A11_PHASE_POLICY_DRIFT',
  'DOKE_PAY_A11_DRY_RUN_CAPABILITY_DENIED',
  'runConformanceCorpus',
  'networkRequests: 0',
  'providerOperations: 0'
].forEach((fragment) => assert(moduleSource.includes(fragment), 'module missing: ' + fragment));

[
  'PAY-A11', 'PAY-A10', 'provider-neutral', 'dry-run', '35', 'cinco fases',
  'stop-on-first-failure', 'forward-only', 'temporary authorization envelope', 'PAY-B01',
  'PAY-B03', 'PAY-B04', 'PAY-A12'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.contractVersion === contract.CONTRACT_VERSION, 'evidence contract mismatch');
assert(evidence.corpusFingerprint === summary.corpusFingerprint, 'evidence corpus fingerprint mismatch');
assert(evidence.totalCases === 35 && evidence.passedCases === 35, 'evidence case count mismatch');
Object.entries(evidence.execution).forEach(([key, value]) => assert(value === 0 || value === false, 'execution effect must remain zero/false: ' + key));
[
  'fiveProviderNeutralManifestsDeterministic',
  'allFivePositiveFixturesAccepted',
  'thirtyNegativeFixturesRejected',
  'transportCredentialsEndpointsRejected',
  'networkDatabaseSubprocessEnvironmentRejected',
  'rawSqlProductionMoneyProviderAndAutomaticNextPhaseRejected',
  'phaseSpecificPoliciesEnforced',
  'a10ReceiptValidationReused',
  'a10EvidenceValidationReused',
  'corpusReplayCasesRejected',
  'repositoryRemoteAuthorityAbsent'
].forEach((key) => assert(evidence.validated[key] === true, 'validation evidence missing: ' + key));

assert(packageJson.scripts['write:pay-001-a11-executor-protocol-manifests'] === 'node scripts/write-pay-001-a11-executor-protocol-manifests.js', 'package writer missing');
assert(packageJson.scripts['audit:pay-001-a11-executor-protocol-conformance'] === 'node scripts/audit-pay-001-a11-executor-protocol-conformance.js', 'package audit missing');
assert(packageJson.scripts['test:pay-001-a11-executor-protocol-conformance'] === 'node scripts/test-pay-001-a11-executor-protocol-conformance.js', 'package test missing');

assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.96'), 'matrix version must be at least 1.3.96');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local' && pay.serverAuthority === 'contract_only', 'PAY authority drifted');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers drifted');
[...Object.values(paths), ...manifestPaths].forEach((file) => assert(pay.requiredPaths.includes(file), 'matrix requiredPaths missing: ' + file));
assert(pay.scanRoots.includes(paths.module), 'matrix scanRoots missing A11 module');
assert(pay.scanRoots.includes(paths.corpus), 'matrix scanRoots missing A11 corpus');
assert(pay.tests.includes('audit:pay-001-a11-executor-protocol-conformance'), 'matrix A11 audit missing');
assert(pay.tests.includes('test:pay-001-a11-executor-protocol-conformance'), 'matrix A11 test missing');
assert(pay.evidence.some((item) => item.includes('PAY-A11')), 'matrix A11 evidence missing');
assert(pay.nextActions[0].includes('PAY-A13'), 'PAY-A13 must be the first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
[
  'contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD',
  'psql ', 'curl ', 'supabase db push', 'supabase migration up', 'git push',
  '--execute', 'child_process', 'http://', 'https://'
].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));

[
  "require('node:http')", "require('node:https')", "require('node:net')",
  "require('node:tls')", "require('node:child_process')", 'fetch(', 'axios',
  'SUPABASE_', 'process.env'
].forEach((fragment) => assert(!moduleSource.includes(fragment), 'module contains prohibited runtime capability: ' + fragment));

console.log('PAY-A11 executor protocol manifests and conformance corpus audit passed.');
