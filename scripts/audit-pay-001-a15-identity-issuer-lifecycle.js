'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const contract = require('../backend/modules/payments/payment-reconciliation-identity-issuer-lifecycle');
const a14Contract = require('../backend/modules/payments/payment-reconciliation-governance-evidence');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error('PAY-A15 audit failed: ' + message); };

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-identity-issuer-lifecycle.js',
  config: 'config/pay-001-a15-identity-issuer-lifecycle.json',
  fixture: 'tests/fixtures/pay-a15-identity-issuer-lifecycle-cases.json',
  docs: 'docs/PAY-001-A15-IDENTITY-ISSUER-LIFECYCLE.md',
  evidence: 'docs/validation/PAY-001-A15-IDENTITY-ISSUER-LIFECYCLE.json',
  audit: 'scripts/audit-pay-001-a15-identity-issuer-lifecycle.js',
  test: 'scripts/test-pay-001-a15-identity-issuer-lifecycle.js',
  workflow: '.github/workflows/pay-001-a15-identity-issuer-lifecycle.yml'
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
const a14 = readJson('config/pay-001-a14-governance-evidence-chain.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(config.status === 'repository_only_identity_issuer_lifecycle_signed_status_snapshots_stale_credential_invalidation_and_retention_handoff_ready_remote_identity_authority_blocked', 'status mismatch');
assert(config.dependencies.a14ContractVersion === contract.A14_CONTRACT_VERSION, 'A14 dependency mismatch');
assert(config.dependencies.a14ContractVersion === a14.contractVersion, 'A14 config dependency mismatch');
assert(config.dependencies.a14ContractVersion === a14Contract.CONTRACT_VERSION, 'A14 runtime dependency mismatch');
assert(config.issuerPolicy.issuerRecordVersion === contract.ISSUER_RECORD_VERSION, 'issuer record version mismatch');
assert(config.issuerPolicy.lifecycleEventVersion === contract.LIFECYCLE_EVENT_VERSION, 'lifecycle event version mismatch');
assert(config.issuerPolicy.statusSnapshotVersion === contract.STATUS_SNAPSHOT_VERSION, 'status snapshot version mismatch');
assert(config.issuerPolicy.statusSignatureVersion === contract.STATUS_SIGNATURE_VERSION, 'status signature version mismatch');
assert(config.issuerPolicy.verifiedStatusVersion === contract.VERIFIED_STATUS_VERSION, 'verified status version mismatch');
assert(config.issuerPolicy.credentialAcceptanceVersion === contract.CREDENTIAL_ACCEPTANCE_VERSION, 'acceptance version mismatch');
assert(config.issuerPolicy.credentialInvalidationVersion === contract.CREDENTIAL_INVALIDATION_VERSION, 'invalidation version mismatch');
assert(config.issuerPolicy.retentionHandoffVersion === contract.RETENTION_HANDOFF_VERSION, 'retention version mismatch');
assert(config.issuerPolicy.statusChainVersion === contract.STATUS_CHAIN_VERSION, 'status chain version mismatch');
assert(config.issuerPolicy.statusSigningDomain === contract.STATUS_SIGNING_DOMAIN, 'status signing domain mismatch');
assert(JSON.stringify(config.issuerPolicy.issuerStatuses) === JSON.stringify(contract.ISSUER_STATUSES), 'issuer statuses drifted');
assert(config.issuerPolicy.statusSnapshotMaximumAgeSeconds === contract.MAX_STATUS_SNAPSHOT_AGE_SECONDS, 'snapshot maximum age drifted');
assert(config.issuerPolicy.minimumAuditRetentionDays === contract.MINIMUM_RETENTION_DAYS, 'retention days drifted');
[
  'terminalRevokedAndRetiredStates', 'contiguousLifecycleSequenceRequired',
  'lifecycleForkAndReplayDenied', 'statusSnapshotsSignedOffline',
  'statusSnapshotReplayDenied', 'onlyActiveIssuerCredentialsAccepted',
  'suspendedRevokedRetiredCredentialsInvalidated', 'staleStatusCredentialsInvalidated',
  'hashesOnlyRetention', 'legalHoldSupported', 'repositoryDeletionAuthorityDenied',
  'directIdentifiersDenied', 'privateKeyMaterialDenied', 'repositoryCredentialCustodyDenied'
].forEach((key) => assert(config.issuerPolicy[key] === true, key + ' must be true'));
[
  'realIdentityIssuerConfigured', 'realStatusEndpointConfigured',
  'realRevocationEndpointConfigured', 'realArchiveConfigured',
  'productionAllowed', 'remoteExecutionAllowedByRepositoryContract',
  'repositoryExecutionPerformed'
].forEach((key) => assert(config.issuerPolicy[key] === false, key + ' must remain false'));

assert(fixture.totalCases === 64 && fixture.positiveCases.length === 8 && fixture.negativeCases.length === 56, 'fixture inventory mismatch');
assert(config.conformance.totalCases === 64 && config.conformance.positiveCases === 8 && config.conformance.negativeCases === 56, 'config conformance counts mismatch');
assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers changed');
Object.entries(config.effects).forEach(([key, value]) => assert(value === 0 || value === false, 'effect must remain zero/false: ' + key));

[
  "const CONTRACT_VERSION = 'pay-a15-identity-issuer-lifecycle-v1'",
  "const STATUS_SIGNING_DOMAIN = 'doke-pay-identity-issuer-status-v1'",
  'DOKE_PAY_A15_LIFECYCLE_CHAIN_FORK_DENIED',
  'DOKE_PAY_A15_STATUS_SNAPSHOT_STALE',
  'DOKE_PAY_A15_STATUS_TRUST_ROOT_REVOKED',
  'DOKE_PAY_A15_ISSUER_NOT_ACTIVE',
  'DOKE_PAY_A15_INVALIDATION_NOT_REQUIRED',
  'DOKE_PAY_A15_RETENTION_WINDOW_TOO_SHORT',
  'createIssuerLifecycleEvent', 'validateIssuerLifecycleChain',
  'verifyIssuerStatusSnapshot', 'acceptIdentityCredential',
  'buildCredentialInvalidationReceipt', 'buildAuditRetentionHandoff',
  'networkRequests: 0', 'databaseConnections: 0'
].forEach((fragment) => assert(source.includes(fragment), 'module missing: ' + fragment));

[
  'PAY-A15', 'PAY-A14', 'pending', 'suspended', 'revoked', 'retired',
  '900 seconds', 'Ed25519', 'RSA-PSS-SHA256', 'status_snapshot_stale',
  '2555 days', 'legal hold', 'hashes', '64/64',
  'PAY-B01', 'PAY-B03', 'PAY-B04', 'PAY-A16'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.contractVersion === contract.CONTRACT_VERSION, 'evidence contract mismatch');
assert(evidence.totalCases === 64 && evidence.passedCases === 64 && evidence.positiveCases === 8 && evidence.negativeCases === 56, 'evidence counts mismatch');
Object.entries(evidence.execution).forEach(([key, value]) => assert(value === 0 || value === false, 'evidence effect must remain zero/false: ' + key));
[
  'issuerRecordBoundToA14TrustBundle', 'pendingActiveSuspendedRevokedRetiredLifecycleEnforced',
  'terminalStatesCannotReactivate', 'contiguousSequenceAndStatusContinuityEnforced',
  'lifecycleForkAndReplayRejected', 'ed25519StatusSnapshotsVerifiedOffline',
  'rsaPssStatusSnapshotsVerifiedOffline', 'statusSnapshotsLimitedToFifteenMinutes',
  'revokedRootsAndInvalidSignaturesRejected', 'statusSnapshotAndSignatureReplayRejected',
  'onlyActiveIssuerCredentialsAccepted', 'suspendedCredentialsInvalidated',
  'staleStatusCredentialsInvalidated', 'credentialRoleAndAssuranceAllowlistsEnforced',
  'hashesOnlyMinimumRetentionEnforced', 'legalHoldPreservesImmutableEvidence',
  'directIdentifiersAndPrivateKeysRejected', 'repositoryDeletionAndRemoteAuthorityAbsent',
  'productionIssuerLifecycleRejected'
].forEach((key) => assert(evidence.validated[key] === true, 'validation evidence missing: ' + key));

assert(packageJson.scripts['audit:pay-001-a15-identity-issuer-lifecycle'] === 'node scripts/audit-pay-001-a15-identity-issuer-lifecycle.js', 'package audit missing');
assert(packageJson.scripts['test:pay-001-a15-identity-issuer-lifecycle'] === 'node scripts/test-pay-001-a15-identity-issuer-lifecycle.js', 'package test missing');
assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.100'), 'matrix version must be at least 1.4.0');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local' && pay.serverAuthority === 'contract_only', 'PAY authority drifted');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers drifted');
Object.values(paths).forEach((file) => assert(pay.requiredPaths.includes(file), 'matrix requiredPaths missing: ' + file));
assert(pay.scanRoots.includes(paths.module), 'matrix scanRoots missing A15 module');
assert(pay.scanRoots.includes(paths.fixture), 'matrix scanRoots missing A15 fixture');
assert(pay.tests.includes('audit:pay-001-a15-identity-issuer-lifecycle'), 'matrix A15 audit missing');
assert(pay.tests.includes('test:pay-001-a15-identity-issuer-lifecycle'), 'matrix A15 test missing');
assert(pay.evidence.some((item) => item.includes('PAY-A15')), 'matrix A15 evidence missing');
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

console.log('PAY-A15 identity issuer lifecycle audit passed.');
