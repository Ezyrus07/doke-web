'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const contract = require('../backend/modules/payments/payment-reconciliation-executor-governance');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A13 audit failed: ' + message);
};

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-executor-governance.js',
  config: 'config/pay-001-a13-executor-lifecycle-governance.json',
  fixture: 'tests/fixtures/pay-a13-executor-lifecycle-governance-cases.json',
  docs: 'docs/PAY-001-A13-EXECUTOR-LIFECYCLE-GOVERNANCE.md',
  evidence: 'docs/validation/PAY-001-A13-EXECUTOR-LIFECYCLE-GOVERNANCE.json',
  audit: 'scripts/audit-pay-001-a13-executor-lifecycle-governance.js',
  test: 'scripts/test-pay-001-a13-executor-lifecycle-governance.js',
  workflow: '.github/workflows/pay-001-a13-executor-lifecycle-governance.yml'
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
const a12 = readJson('config/pay-001-a12-executor-trust-root-signature.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(config.status === 'repository_only_executor_lifecycle_governance_and_incident_revocation_handoff_ready_real_onboarding_and_remote_authority_blocked', 'status mismatch');
assert(config.dependencies.a12ContractVersion === contract.A12_CONTRACT_VERSION, 'A12 dependency mismatch');
assert(config.dependencies.a12ContractVersion === a12.contractVersion, 'A12 config dependency mismatch');
assert(config.dependencies.a12TrustBundleVersion === 'pay-reconciliation-executor-trust-bundle-v1', 'A12 trust-bundle dependency mismatch');
assert(config.governancePolicy.lifecycleRequestVersion === contract.LIFECYCLE_REQUEST_VERSION, 'request version mismatch');
assert(config.governancePolicy.custodyAttestationVersion === contract.CUSTODY_ATTESTATION_VERSION, 'custody version mismatch');
assert(config.governancePolicy.approvalRecordVersion === contract.APPROVAL_RECORD_VERSION, 'approval version mismatch');
assert(config.governancePolicy.decisionVersion === contract.DECISION_VERSION, 'decision version mismatch');
assert(config.governancePolicy.incidentHandoffVersion === contract.INCIDENT_HANDOFF_VERSION, 'incident handoff version mismatch');
assert(JSON.stringify(config.governancePolicy.allowedActions) === JSON.stringify(contract.ALLOWED_ACTIONS), 'lifecycle actions drifted');
assert(JSON.stringify(config.governancePolicy.approverRoles) === JSON.stringify(contract.APPROVER_ROLES), 'approver roles drifted');
assert(config.governancePolicy.standardMinimumApprovals === 3, 'standard quorum drifted');
assert(config.governancePolicy.emergencyMinimumApprovals === 2, 'emergency quorum drifted');
[
  'separationOfDutiesRequired', 'duplicateApproversDenied', 'duplicateRolesDenied',
  'exactRequestFingerprintBindingRequired', 'approvalEvidenceHashesRequired',
  'requestReplayDenied', 'privateKeyExportDenied', 'dualControlRequired',
  'repositoryPrivateKeyCustodyDenied', 'privateKeyMaterialDenied',
  'offboardingRevokesAllRoots', 'offboardingPreservesAuditEvidence',
  'historicalEvidenceDeletionDenied', 'emergencySecurityApprovalRequired',
  'emergencySecondOperationalRoleRequired', 'incidentResponseDeadlineWithinOneHour',
  'incidentFollowUpWithinTwentyFourHours'
].forEach((key) => assert(config.governancePolicy[key] === true, key + ' must be true'));
[
  'realExecutorOnboarded', 'realTrustRootApproved', 'realCustodyProviderConfigured',
  'productionAllowed', 'remoteExecutionAllowedByRepositoryContract',
  'repositoryExecutionPerformed'
].forEach((key) => assert(config.governancePolicy[key] === false, key + ' must remain false'));

assert(fixture.totalCases === 38 && fixture.positiveCases.length === 5 && fixture.negativeCases.length === 33, 'fixture inventory mismatch');
assert(config.conformance.totalCases === 38 && config.conformance.positiveCases === 5 && config.conformance.negativeCases === 33, 'config case counts mismatch');
assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers changed');
Object.entries(config.effects).forEach(([key, value]) => assert(value === 0 || value === false, 'effect must remain zero/false: ' + key));

[
  "const CONTRACT_VERSION = 'pay-a13-executor-lifecycle-governance-v1'",
  "const LIFECYCLE_REQUEST_VERSION = 'pay-executor-lifecycle-request-v1'",
  "const CUSTODY_ATTESTATION_VERSION = 'pay-executor-key-custody-attestation-v1'",
  "const APPROVAL_RECORD_VERSION = 'pay-executor-governance-approval-v1'",
  "const INCIDENT_HANDOFF_VERSION = 'pay-executor-incident-revocation-handoff-v1'",
  'DOKE_PAY_A13_APPROVAL_QUORUM_NOT_MET',
  'DOKE_PAY_A13_DUPLICATE_APPROVER_DENIED',
  'DOKE_PAY_A13_PRIVATE_KEY_MATERIAL_DENIED',
  'DOKE_PAY_A13_HISTORICAL_EVIDENCE_DELETION_DENIED',
  'DOKE_PAY_A13_INCIDENT_RESPONSE_WINDOW_INVALID',
  'evaluateExecutorLifecycleRequest',
  'buildIncidentRevocationHandoff',
  'networkRequests: 0',
  'databaseConnections: 0'
].forEach((fragment) => assert(source.includes(fragment), 'module missing: ' + fragment));

[
  'PAY-A13', 'PAY-A12', 'onboarding', 'offboarding', 'quorum',
  'separation of duties', 'managed_hsm', 'managed_kms', 'dual control',
  'private-key material', 'one hour', '24 hours', '38 cases',
  'PAY-B01', 'PAY-B03', 'PAY-B04', 'PAY-A14'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.contractVersion === contract.CONTRACT_VERSION, 'evidence contract mismatch');
assert(evidence.totalCases === 38 && evidence.passedCases === 38, 'evidence case count mismatch');
Object.entries(evidence.execution).forEach(([key, value]) => assert(value === 0 || value === false, 'evidence effect must remain zero/false: ' + key));
[
  'fourLifecycleActionsCovered', 'standardThreeRoleQuorumEnforced',
  'emergencyTwoRoleQuorumEnforced', 'mandatoryRoleSeparationEnforced',
  'duplicateApproversAndRolesRejected', 'approvalRequestAndEvidenceBindingValidated',
  'requestExpiryAndReplayRejected', 'nonExportableDualControlCustodyRequired',
  'repositoryPrivateKeyCustodyRejected', 'privateKeyMaterialRejected',
  'onboardingAndRotationRootPoliciesEnforced', 'offboardingRevokesRootsAndPreservesEvidence',
  'historicalEvidenceDeletionRejected', 'incidentOneHourResponseAndTwentyFourHourReviewEnforced',
  'productionLifecycleRequestsRejected', 'repositoryRemoteAuthorityAbsent'
].forEach((key) => assert(evidence.validated[key] === true, 'validation evidence missing: ' + key));

assert(packageJson.scripts['audit:pay-001-a13-executor-lifecycle-governance'] === 'node scripts/audit-pay-001-a13-executor-lifecycle-governance.js', 'package audit missing');
assert(packageJson.scripts['test:pay-001-a13-executor-lifecycle-governance'] === 'node scripts/test-pay-001-a13-executor-lifecycle-governance.js', 'package test missing');

assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.98'), 'matrix version must be at least 1.3.98');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local' && pay.serverAuthority === 'contract_only', 'PAY authority drifted');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers drifted');
Object.values(paths).forEach((file) => assert(pay.requiredPaths.includes(file), 'matrix requiredPaths missing: ' + file));
assert(pay.scanRoots.includes(paths.module), 'matrix scanRoots missing A13 module');
assert(pay.scanRoots.includes(paths.fixture), 'matrix scanRoots missing A13 fixture');
assert(pay.tests.includes('audit:pay-001-a13-executor-lifecycle-governance'), 'matrix A13 audit missing');
assert(pay.tests.includes('test:pay-001-a13-executor-lifecycle-governance'), 'matrix A13 test missing');
assert(pay.evidence.some((item) => item.includes('PAY-A13')), 'matrix A13 evidence missing');
assert(pay.nextActions[0].includes('PAY-B03'), 'PAY-A18 must be the first next action');

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

console.log('PAY-A13 executor lifecycle governance audit passed.');
