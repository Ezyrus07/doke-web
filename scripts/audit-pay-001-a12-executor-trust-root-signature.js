'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const contract = require('../backend/modules/payments/payment-reconciliation-executor-trust');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A12 audit failed: ' + message);
};

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-executor-trust.js',
  config: 'config/pay-001-a12-executor-trust-root-signature.json',
  fixture: 'tests/fixtures/pay-a12-executor-trust-root-cases.json',
  docs: 'docs/PAY-001-A12-EXECUTOR-TRUST-ROOT-SIGNATURE.md',
  evidence: 'docs/validation/PAY-001-A12-EXECUTOR-TRUST-ROOT-SIGNATURE.json',
  audit: 'scripts/audit-pay-001-a12-executor-trust-root-signature.js',
  test: 'scripts/test-pay-001-a12-executor-trust-root-signature.js',
  workflow: '.github/workflows/pay-001-a12-executor-trust-root-signature.yml'
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
const a10 = readJson('config/pay-001-a10-external-executor-evidence-ingestion.json');
const a11 = readJson('config/pay-001-a11-executor-protocol-conformance.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(config.status === 'repository_only_trust_root_and_offline_detached_signature_contract_ready_real_roots_and_remote_execution_blocked', 'status mismatch');
assert(config.dependencies.a10ContractVersion === a10.contractVersion, 'A10 dependency mismatch');
assert(config.dependencies.a11ContractVersion === a11.contractVersion, 'A11 dependency mismatch');
assert(config.trustPolicy.trustBundleVersion === contract.TRUST_BUNDLE_VERSION, 'trust bundle version mismatch');
assert(config.trustPolicy.detachedEnvelopeVersion === contract.DETACHED_ENVELOPE_VERSION, 'detached envelope version mismatch');
assert(config.trustPolicy.verifiedReceiptVersion === contract.VERIFIED_RECEIPT_VERSION, 'verified receipt version mismatch');
assert(config.trustPolicy.signingDomain === contract.SIGNING_DOMAIN, 'signing domain mismatch');
assert(JSON.stringify(config.trustPolicy.allowedSignatureSchemes) === JSON.stringify(['ed25519', 'rsa_pss_sha256']), 'signature schemes drifted');
assert(JSON.stringify(config.trustPolicy.allowedRootStatuses) === JSON.stringify(['active', 'retiring', 'revoked']), 'root statuses drifted');
[
  'offlineVerificationOnly', 'exactA10ReceiptBinding', 'exactA11ProtocolBinding',
  'rotationRequiresStrictlyIncreasingVersion', 'retiringKeysRequireBoundedGrace',
  'revokedKeysRejected', 'publicKeyFingerprintRequired',
  'executorAndOperationAllowlistsRequired', 'signatureReplayDenied'
].forEach((key) => assert(config.trustPolicy[key] === true, key + ' must be true'));
[
  'realTrustRootsConfigured', 'privateKeysStored', 'repositoryManagedPrivateKeys',
  'rawSignatureStored', 'productionAllowed', 'remoteExecutionAllowedByRepositoryContract',
  'repositoryExecutionPerformed'
].forEach((key) => assert(config.trustPolicy[key] === false, key + ' must remain false'));
assert(config.trustPolicy.activeTrustRootCount === 0, 'real trust-root count must remain zero');
assert(fixture.totalCases === 28 && fixture.positiveCases.length === 4 && fixture.negativeCases.length === 24, 'fixture inventory mismatch');
assert(config.conformance.totalCases === 28 && config.conformance.positiveCases === 4 && config.conformance.negativeCases === 24, 'config case counts mismatch');
assert(config.conformance.ephemeralKeysGeneratedInMemory === true, 'ephemeral key generation required');
assert(config.conformance.syntheticPrivateKeysPersisted === false, 'private test keys must not be persisted');
Object.entries(config.effects).forEach(([key, value]) => assert(value === 0 || value === false, 'effect must remain zero/false: ' + key));
assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers changed');

[
  "const CONTRACT_VERSION = 'pay-a12-executor-trust-root-signature-v1'",
  "const TRUST_BUNDLE_VERSION = 'pay-reconciliation-executor-trust-bundle-v1'",
  "const DETACHED_ENVELOPE_VERSION = 'pay-reconciliation-detached-signature-v1'",
  "const VERIFIED_RECEIPT_VERSION = 'pay-reconciliation-verified-receipt-v1'",
  "const SIGNING_DOMAIN = 'doke-pay-executor-receipt-v1'",
  'DOKE_PAY_A12_PRIVATE_KEY_MATERIAL_DENIED',
  'DOKE_PAY_A12_KEY_REVOKED',
  'DOKE_PAY_A12_SIGNATURE_INVALID',
  'DOKE_PAY_A12_SIGNATURE_REPLAYED',
  'verifyDetachedReceiptSignature',
  'verifyAndAcceptExecutorReceipt',
  'networkRequests: 0',
  'databaseConnections: 0'
].forEach((fragment) => assert(source.includes(fragment), 'module missing: ' + fragment));

[
  'PAY-A12', 'PAY-A10', 'PAY-A11', 'trust-root', 'detached-signature',
  'Ed25519', 'RSA-PSS-SHA256', 'rotation', 'revocation', 'private keys',
  '28 cases', 'PAY-B01', 'PAY-B03', 'PAY-B04', 'PAY-A13'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.contractVersion === contract.CONTRACT_VERSION, 'evidence contract mismatch');
assert(evidence.totalCases === 28 && evidence.passedCases === 28, 'evidence case count mismatch');
Object.entries(evidence.execution).forEach(([key, value]) => assert(value === 0 || value === false, 'evidence effect must remain zero/false: ' + key));
[
  'ed25519VerifiedOffline', 'rsaPssSha256VerifiedOffline',
  'a10ReceiptValidationChainedAfterSignature', 'a11ProtocolBindingPreserved',
  'privateJwkRejected', 'publicKeyFingerprintRequired',
  'operationAndExecutorAllowlistsEnforced', 'rotationVersionAndPredecessorValidated',
  'retiringGraceBounded', 'revokedKeysRejected',
  'signaturePayloadAndDigestBindingValidated', 'invalidSignaturesRejected',
  'signatureReplayRejected', 'productionRootsRejected',
  'repositoryRemoteAuthorityAbsent'
].forEach((key) => assert(evidence.validated[key] === true, 'validation evidence missing: ' + key));

assert(packageJson.scripts['audit:pay-001-a12-executor-trust-root-signature'] === 'node scripts/audit-pay-001-a12-executor-trust-root-signature.js', 'package audit missing');
assert(packageJson.scripts['test:pay-001-a12-executor-trust-root-signature'] === 'node scripts/test-pay-001-a12-executor-trust-root-signature.js', 'package test missing');

assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.97'), 'matrix version must be at least 1.3.97');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local' && pay.serverAuthority === 'contract_only', 'PAY authority drifted');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers drifted');
Object.values(paths).forEach((file) => assert(pay.requiredPaths.includes(file), 'matrix requiredPaths missing: ' + file));
assert(pay.scanRoots.includes(paths.module), 'matrix scanRoots missing A12 module');
assert(pay.scanRoots.includes(paths.fixture), 'matrix scanRoots missing A12 fixture');
assert(pay.tests.includes('audit:pay-001-a12-executor-trust-root-signature'), 'matrix A12 audit missing');
assert(pay.tests.includes('test:pay-001-a12-executor-trust-root-signature'), 'matrix A12 test missing');
assert(pay.evidence.some((item) => item.includes('PAY-A12')), 'matrix A12 evidence missing');
assert(pay.nextActions[0].includes('PAY-A15'), 'PAY-A15 must be the first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
[
  'contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD',
  'psql ', 'curl ', 'supabase db push', 'supabase migration up', 'git push',
  '--execute', 'http://', 'https://'
].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));
[
  "require('node:http')", "require('node:https')", "require('node:net')",
  "require('node:tls')", "require('node:child_process')", 'fetch(',
  'axios', 'SUPABASE_', 'process.env'
].forEach((fragment) => assert(!source.includes(fragment), 'module contains prohibited runtime capability: ' + fragment));

console.log('PAY-A12 executor trust-root and detached-signature audit passed.');
