'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const contract = require('../backend/modules/payments/payment-reconciliation-identity-status-resilience');
const a15Contract = require('../backend/modules/payments/payment-reconciliation-identity-issuer-lifecycle');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error('PAY-A16 audit failed: ' + message); };

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-identity-status-resilience.js',
  config: 'config/pay-001-a16-issuer-status-distribution-resilience.json',
  fixture: 'tests/fixtures/pay-a16-issuer-status-distribution-resilience-cases.json',
  docs: 'docs/PAY-001-A16-ISSUER-STATUS-DISTRIBUTION-RESILIENCE.md',
  evidence: 'docs/validation/PAY-001-A16-ISSUER-STATUS-DISTRIBUTION-RESILIENCE.json',
  audit: 'scripts/audit-pay-001-a16-issuer-status-distribution-resilience.js',
  test: 'scripts/test-pay-001-a16-issuer-status-distribution-resilience.js',
  workflow: '.github/workflows/pay-001-a16-issuer-status-distribution-resilience.yml'
};
Object.values(paths).forEach((file) => assert(fs.existsSync(path.join(root, file)), 'missing asset: ' + file));

const source = read(paths.module);
const config = readJson(paths.config);
const fixture = readJson(paths.fixture);
const docs = read(paths.docs);
const evidence = readJson(paths.evidence);
const workflow = read(paths.workflow);
const packageJson = readJson('package.json');
const matrix = readJson('config/domain-completion-matrix.json');
const a15 = readJson('config/pay-001-a15-identity-issuer-lifecycle.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(config.status === 'repository_only_status_distribution_cache_consistency_outage_degraded_mode_and_multi_issuer_quorum_ready_remote_distribution_authority_blocked', 'status mismatch');
assert(config.dependencies.a15ContractVersion === contract.A15_CONTRACT_VERSION, 'A15 dependency mismatch');
assert(config.dependencies.a15ContractVersion === a15.contractVersion, 'A15 config dependency mismatch');
assert(config.dependencies.a15ContractVersion === a15Contract.CONTRACT_VERSION, 'A15 runtime dependency mismatch');
assert(config.distributionPolicy.distributionManifestVersion === contract.DISTRIBUTION_MANIFEST_VERSION, 'manifest version mismatch');
assert(config.distributionPolicy.cacheEntryVersion === contract.CACHE_ENTRY_VERSION, 'cache-entry version mismatch');
assert(config.distributionPolicy.cacheProofVersion === contract.CACHE_PROOF_VERSION, 'cache-proof version mismatch');
assert(config.distributionPolicy.outagePolicyVersion === contract.OUTAGE_POLICY_VERSION, 'outage-policy version mismatch');
assert(config.distributionPolicy.healthSnapshotVersion === contract.HEALTH_SNAPSHOT_VERSION, 'health-snapshot version mismatch');
assert(config.distributionPolicy.quorumDecisionVersion === contract.QUORUM_DECISION_VERSION, 'quorum-decision version mismatch');
assert(config.distributionPolicy.distributionReceiptVersion === contract.DISTRIBUTION_RECEIPT_VERSION, 'receipt version mismatch');
assert(config.distributionPolicy.distributionChainVersion === contract.DISTRIBUTION_CHAIN_VERSION, 'receipt-chain version mismatch');
assert(JSON.stringify(config.distributionPolicy.distributionChannels) === JSON.stringify(contract.DISTRIBUTION_CHANNELS), 'distribution channels drifted');
assert(JSON.stringify(config.distributionPolicy.outageStates) === JSON.stringify(contract.OUTAGE_STATES), 'outage states drifted');
assert(JSON.stringify(config.distributionPolicy.quorumDecisions) === JSON.stringify(contract.QUORUM_DECISIONS), 'quorum decisions drifted');
assert(config.distributionPolicy.maximumDistributionWindowSeconds === contract.MAX_DISTRIBUTION_WINDOW_SECONDS, 'distribution window drifted');
assert(config.distributionPolicy.maximumCacheTtlSeconds === contract.MAX_CACHE_TTL_SECONDS, 'cache TTL drifted');
assert(config.distributionPolicy.maximumStaleWhileRevalidateSeconds === contract.MAX_STALE_WHILE_REVALIDATE_SECONDS, 'stale window drifted');
assert(config.distributionPolicy.maximumDegradedModeSeconds === contract.MAX_DEGRADED_MODE_SECONDS, 'degraded limit drifted');
assert(config.distributionPolicy.minimumReplicas === contract.MINIMUM_REPLICAS, 'replica minimum drifted');
assert(config.distributionPolicy.minimumIssuerQuorum === contract.MINIMUM_ISSUER_QUORUM, 'issuer quorum drifted');
[
  'contiguousDistributionEpochRequired', 'lifecycleRollbackDenied',
  'cacheSplitBrainDenied', 'cacheReplicaReplayDenied', 'clockRollbackDenied',
  'newCredentialAcceptanceDeniedInDegradedMode', 'failOpenDenied',
  'automaticRemoteRefreshDenied', 'unsafeIssuerStatusOverridesQuorum',
  'independentIssuerFamiliesRequired', 'quorumIsHealthGateOnly',
  'receiptChainForkAndReplayDenied', 'endpointsAndCredentialsDenied',
  'privateKeyMaterialDenied'
].forEach((key) => assert(config.distributionPolicy[key] === true, key + ' must be true'));
[
  'realDistributionChannelConfigured', 'realCacheConfigured',
  'realStatusEndpointConfigured', 'productionAllowed',
  'remoteExecutionAllowedByRepositoryContract', 'repositoryExecutionPerformed'
].forEach((key) => assert(config.distributionPolicy[key] === false, key + ' must remain false'));

assert(fixture.contractVersion === contract.CONTRACT_VERSION, 'fixture contract mismatch');
assert(fixture.totalCases === 72 && fixture.positiveCases.length === 10 && fixture.negativeCases.length === 62, 'fixture inventory mismatch');
assert(new Set([...fixture.positiveCases, ...fixture.negativeCases].map((item) => item.id)).size === 72, 'fixture ids must be unique');
assert(config.conformance.totalCases === 72 && config.conformance.positiveCases === 10 && config.conformance.negativeCases === 62, 'config conformance counts mismatch');
assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers changed');
Object.entries(config.effects).forEach(([key, value]) => assert(value === 0 || value === false, 'effect must remain zero/false: ' + key));

[
  "const CONTRACT_VERSION = 'pay-a16-issuer-status-distribution-resilience-v1'",
  "const DISTRIBUTION_MANIFEST_VERSION = 'pay-identity-status-distribution-manifest-v1'",
  "const OUTAGE_POLICY_VERSION = 'pay-identity-status-outage-policy-v1'",
  'DOKE_PAY_A16_LIFECYCLE_ROLLBACK_DENIED',
  'DOKE_PAY_A16_DUPLICATE_REPLICA_DENIED',
  'DOKE_PAY_A16_CACHE_CLOCK_ROLLBACK_DETECTED',
  'DOKE_PAY_A16_FAIL_OPEN_DENIED',
  'DOKE_PAY_A16_DEGRADED_CREDENTIAL_ACCEPTANCE_DENIED',
  'DOKE_PAY_A16_DUPLICATE_ISSUER_FAMILY_DENIED',
  'DOKE_PAY_A16_DISTRIBUTION_RECEIPT_FORK_DENIED',
  'createDistributionManifest', 'proveCacheConsistency',
  'evaluateOutagePolicy', 'aggregateMultiIssuerQuorum',
  'createDistributionReceipt', 'validateDistributionReceiptChain',
  'networkRequests: 0', 'databaseConnections: 0'
].forEach((fragment) => assert(source.includes(fragment), 'module missing: ' + fragment));

[
  'PAY-A16', 'PAY-A15', 'distribution manifest', 'cache consistency',
  'split-brain', 'degraded_read_only', 'fail_closed', '120 seconds',
  'multi-issuer', 'two distinct issuer-family', 'health gate only',
  '72/72', 'PAY-B01', 'PAY-B03', 'PAY-B04', 'PAY-A18'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.contractVersion === contract.CONTRACT_VERSION, 'evidence contract mismatch');
assert(evidence.totalCases === 72 && evidence.passedCases === 72 && evidence.positiveCases === 10 && evidence.negativeCases === 62, 'evidence counts mismatch');
Object.entries(evidence.execution).forEach(([key, value]) => assert(value === 0 || value === false, 'evidence effect must remain zero/false: ' + key));
[
  'distributionManifestBoundToVerifiedA15Status',
  'distributionEpochAndLifecycleRollbackProtectionEnforced',
  'manifestWindowsAndCacheTtlsBounded',
  'providerNeutralChannelsWithoutEndpointsEnforced',
  'immutableCacheEntriesBoundToManifestAndSnapshot',
  'multiReplicaConsistencyProofsValidated',
  'splitBrainDuplicateReplicaAndClockRollbackRejected',
  'healthyFreshReplicaQuorumAllowsHealthGate',
  'degradedModeIsReadOnlyAndTimeBounded',
  'failOpenAndAutomaticRemoteRefreshRejected',
  'staleExpiredAndUnavailableDistributionFailClosed',
  'suspendedRevokedRetiredIssuerStatusOverridesCache',
  'independentMultiIssuerFamiliesRequired',
  'healthyAndDegradedQuorumDecisionsSanitized',
  'quorumDoesNotAutomaticallyAcceptCredentials',
  'distributionReceiptChainForkAndReplayRejected',
  'endpointsCredentialsDirectIdentifiersAndPrivateKeysRejected',
  'productionAndRemoteExecutionAuthorityAbsent'
].forEach((key) => assert(evidence.validated[key] === true, 'validation evidence missing: ' + key));

assert(packageJson.scripts['audit:pay-001-a16-issuer-status-distribution-resilience'] === 'node scripts/audit-pay-001-a16-issuer-status-distribution-resilience.js', 'package audit missing');
assert(packageJson.scripts['test:pay-001-a16-issuer-status-distribution-resilience'] === 'node scripts/test-pay-001-a16-issuer-status-distribution-resilience.js', 'package test missing');
assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.101'), 'matrix version must be at least 1.3.101');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local' && pay.serverAuthority === 'contract_only', 'PAY authority drifted');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers drifted');
Object.values(paths).forEach((file) => assert(pay.requiredPaths.includes(file), 'matrix requiredPaths missing: ' + file));
assert(pay.scanRoots.includes(paths.module), 'matrix scanRoots missing A16 module');
assert(pay.scanRoots.includes(paths.fixture), 'matrix scanRoots missing A16 fixture');
assert(pay.tests.includes('audit:pay-001-a16-issuer-status-distribution-resilience'), 'matrix A16 audit missing');
assert(pay.tests.includes('test:pay-001-a16-issuer-status-distribution-resilience'), 'matrix A16 test missing');
assert(pay.evidence.some((item) => item.includes('PAY-A16')), 'matrix A16 evidence missing');
assert(pay.nextActions[0].includes('PAY-B03'), 'PAY-B03 must be first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
[
  'contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD',
  'psql ', 'curl ', 'supabase db push', 'supabase migration up', 'git push',
  '--execute', 'http://', 'https://'
].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));
[
  "require('node:http')", "require('node:https')", "require('node:net')",
  "require('node:tls')", "require('node:child_process')", 'fetch(',
  'axios', 'SUPABASE_', 'process.env', 'privateKeyPem', 'secretKey'
].forEach((fragment) => assert(!source.includes(fragment), 'module contains prohibited runtime capability: ' + fragment));

console.log('PAY-A16 issuer status distribution resilience audit passed.');
