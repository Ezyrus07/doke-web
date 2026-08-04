'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const contract = require('../backend/modules/payments/payment-reconciliation-governance-evidence');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A14 audit failed: ' + message);
};

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-governance-evidence.js',
  config: 'config/pay-001-a14-governance-evidence-chain.json',
  fixture: 'tests/fixtures/pay-a14-governance-evidence-chain-cases.json',
  docs: 'docs/PAY-001-A14-GOVERNANCE-EVIDENCE-CHAIN.md',
  evidence: 'docs/validation/PAY-001-A14-GOVERNANCE-EVIDENCE-CHAIN.json',
  audit: 'scripts/audit-pay-001-a14-governance-evidence-chain.js',
  test: 'scripts/test-pay-001-a14-governance-evidence-chain.js',
  workflow: '.github/workflows/pay-001-a14-governance-evidence-chain.yml'
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
const a13 = readJson('config/pay-001-a13-executor-lifecycle-governance.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(config.status === 'repository_only_signed_governance_evidence_external_identity_ingestion_and_immutable_decision_chain_ready_remote_identity_and_authority_blocked', 'status mismatch');
assert(config.dependencies.a13ContractVersion === contract.A13_CONTRACT_VERSION, 'A13 contract dependency mismatch');
assert(config.dependencies.a13ContractVersion === a13.contractVersion, 'A13 config dependency mismatch');
assert(config.dependencies.a13DecisionVersion === contract.A13_DECISION_VERSION, 'A13 decision dependency mismatch');
assert(JSON.stringify(config.dependencies.a12SignatureSchemes) === JSON.stringify(['ed25519', 'rsa_pss_sha256']), 'signature schemes drifted');

assert(config.evidencePolicy.identityTrustBundleVersion === contract.IDENTITY_TRUST_BUNDLE_VERSION, 'identity trust-bundle version mismatch');
assert(config.evidencePolicy.identityAttestationVersion === contract.IDENTITY_ATTESTATION_VERSION, 'identity-attestation version mismatch');
assert(config.evidencePolicy.evidenceBundleVersion === contract.EVIDENCE_BUNDLE_VERSION, 'evidence-bundle version mismatch');
assert(config.evidencePolicy.signatureEnvelopeVersion === contract.SIGNATURE_ENVELOPE_VERSION, 'signature-envelope version mismatch');
assert(config.evidencePolicy.decisionReceiptVersion === contract.DECISION_RECEIPT_VERSION, 'decision-receipt version mismatch');
assert(config.evidencePolicy.decisionChainVersion === contract.DECISION_CHAIN_VERSION, 'decision-chain version mismatch');
assert(config.evidencePolicy.signingDomain === contract.SIGNING_DOMAIN, 'signing domain mismatch');
assert(JSON.stringify(config.evidencePolicy.allowedPurposes) === JSON.stringify(contract.ALLOWED_PURPOSES), 'allowed purposes drifted');
assert(JSON.stringify(config.evidencePolicy.allowedAssuranceLevels) === JSON.stringify(contract.ALLOWED_ASSURANCE_LEVELS), 'assurance levels drifted');
assert(config.evidencePolicy.minimumIndependentIdentityIssuers === 2, 'identity issuer diversity drifted');
assert(config.evidencePolicy.identityAttestationMaximumHours === 24, 'identity validity window drifted');
assert(config.evidencePolicy.decisionReceiptAcceptanceMaximumHours === 24, 'receipt acceptance window drifted');

[
  'securityApprovalRequiresAal3', 'directIdentifiersDenied',
  'privateKeyMaterialDenied', 'repositoryPrivateKeyCustodyDenied',
  'exactA13DecisionBindingRequired', 'exactApprovalFingerprintBindingRequired',
  'signatureReplayDenied', 'identityReplayDenied', 'decisionReceiptReplayDenied',
  'decisionChainForkDenied', 'decisionChainSequenceMustBeContiguous',
  'decisionChainMayNotCrossExecutors'
].forEach((key) => assert(config.evidencePolicy[key] === true, key + ' must be true'));
[
  'realIdentityIssuerConfigured', 'realGovernanceSignerConfigured',
  'realIdentityDataIngested', 'productionAllowed',
  'remoteExecutionAllowedByRepositoryContract', 'repositoryExecutionPerformed'
].forEach((key) => assert(config.evidencePolicy[key] === false, key + ' must remain false'));

assert(fixture.totalCases === 52, 'fixture total mismatch');
assert(fixture.positiveCases.length === 6 && fixture.negativeCases.length === 46, 'fixture inventory mismatch');
assert(config.conformance.totalCases === 52 && config.conformance.positiveCases === 6 && config.conformance.negativeCases === 46, 'config case counts mismatch');
assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers changed');
Object.entries(config.effects).forEach(([key, value]) => assert(value === 0 || value === false, 'effect must remain zero/false: ' + key));

[
  "const CONTRACT_VERSION = 'pay-a14-governance-evidence-chain-v1'",
  "const IDENTITY_ATTESTATION_VERSION = 'pay-external-identity-attestation-v1'",
  "const EVIDENCE_BUNDLE_VERSION = 'pay-governance-evidence-bundle-v1'",
  "const DECISION_RECEIPT_VERSION = 'pay-lifecycle-decision-receipt-v1'",
  'DOKE_PAY_A14_SECURITY_AAL3_REQUIRED',
  'DOKE_PAY_A14_IDENTITY_ISSUER_DIVERSITY_REQUIRED',
  'DOKE_PAY_A14_SIGNATURE_REPLAYED',
  'DOKE_PAY_A14_CHAIN_FORK_DENIED',
  'DOKE_PAY_A14_DECISION_RECEIPT_INTEGRITY_FAILED',
  'verifyExternalIdentityAttestation',
  'buildGovernanceEvidenceBundle',
  'verifyGovernanceEvidenceBundleSignature',
  'createLifecycleDecisionReceipt',
  'validateLifecycleDecisionChain',
  'networkRequests: 0',
  'databaseConnections: 0'
].forEach((fragment) => assert(source.includes(fragment), 'module missing: ' + fragment));

[
  'PAY-A14', 'PAY-A13', 'identity', 'attestation', 'AAL3',
  'two identity issuers', 'Ed25519', 'RSA-PSS-SHA256',
  'signed governance evidence', 'immutable', 'fork', 'replay',
  '52/52', 'PAY-B01', 'PAY-B03', 'PAY-B04', 'PAY-A15'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.contractVersion === contract.CONTRACT_VERSION, 'evidence contract mismatch');
assert(evidence.totalCases === 52 && evidence.passedCases === 52, 'evidence case count mismatch');
Object.entries(evidence.execution).forEach(([key, value]) => assert(value === 0 || value === false, 'evidence effect must remain zero/false: ' + key));
[
  'ed25519IdentityAttestationsVerifiedOffline',
  'rsaPssIdentityAttestationsVerifiedOffline',
  'governanceEvidenceBundlesSignedAndVerifiedOffline',
  'exactA13DecisionAndApprovalBindingEnforced',
  'securityAal3Enforced',
  'independentIssuerDiversityEnforced',
  'directIdentifiersRejected',
  'privateKeyMaterialRejected',
  'revokedAndExpiredRootsRejected',
  'signatureAndIdentityReplayRejected',
  'immutableGenesisReceiptCreated',
  'contiguousFourStageDecisionChainValidated',
  'forkAndCrossExecutorChainsRejected',
  'decisionReceiptReplayAndIntegrityDriftRejected',
  'productionEvidenceRejected',
  'repositoryRemoteAuthorityAbsent'
].forEach((key) => assert(evidence.validated[key] === true, 'validation evidence missing: ' + key));

assert(packageJson.scripts['audit:pay-001-a14-governance-evidence-chain'] === 'node scripts/audit-pay-001-a14-governance-evidence-chain.js', 'package audit missing');
assert(packageJson.scripts['test:pay-001-a14-governance-evidence-chain'] === 'node scripts/test-pay-001-a14-governance-evidence-chain.js', 'package test missing');

assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.99'), 'matrix version must be at least 1.3.99');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local' && pay.serverAuthority === 'contract_only', 'PAY authority drifted');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers drifted');
Object.values(paths).forEach((file) => assert(pay.requiredPaths.includes(file), 'matrix requiredPaths missing: ' + file));
assert(pay.scanRoots.includes(paths.module), 'matrix scanRoots missing A14 module');
assert(pay.scanRoots.includes(paths.fixture), 'matrix scanRoots missing A14 fixture');
assert(pay.tests.includes('audit:pay-001-a14-governance-evidence-chain'), 'matrix A14 audit missing');
assert(pay.tests.includes('test:pay-001-a14-governance-evidence-chain'), 'matrix A14 test missing');
assert(pay.evidence.some((item) => item.includes('PAY-A14')), 'matrix A14 evidence missing');
assert(pay.nextActions[0].includes('PAY-A17'), 'PAY-A17 must be the first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
[
  'contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD',
  'psql ', 'curl ', 'supabase db push', 'supabase migration up', 'git push',
  '--execute', 'http://', 'https://'
].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));
[
  "require('node:http')", "require('node:https')", "require('node:net')",
  "require('node:tls')", "require('node:child_process')", 'fetch(',
  'axios', 'SUPABASE_', 'process.env', 'createPrivateKey',
  'privateKeyPem', 'secretKey'
].forEach((fragment) => assert(!source.includes(fragment), 'module contains prohibited runtime capability: ' + fragment));

console.log('PAY-A14 signed governance evidence and immutable decision-chain audit passed.');
