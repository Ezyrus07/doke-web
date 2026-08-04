'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const contract = require('../backend/modules/payments/payment-reconciliation-transparency-recovery');
const a16Contract = require('../backend/modules/payments/payment-reconciliation-identity-status-resilience');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A17 audit failed: ' + message);
};

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-transparency-recovery.js',
  config: 'config/pay-001-a17-transparency-recovery-incident-handoff.json',
  fixture: 'tests/fixtures/pay-a17-transparency-recovery-incident-handoff-cases.json',
  docs: 'docs/PAY-001-A17-TRANSPARENCY-RECOVERY-INCIDENT-HANDOFF.md',
  evidence: 'docs/validation/PAY-001-A17-TRANSPARENCY-RECOVERY-INCIDENT-HANDOFF.json',
  audit: 'scripts/audit-pay-001-a17-transparency-recovery-incident-handoff.js',
  test: 'scripts/test-pay-001-a17-transparency-recovery-incident-handoff.js',
  workflow: '.github/workflows/pay-001-a17-transparency-recovery-incident-handoff.yml'
};
Object.values(paths).forEach((file) => {
  assert(fs.existsSync(path.join(root, file)), 'missing asset: ' + file);
});

const source = read(paths.module);
const config = readJson(paths.config);
const fixture = readJson(paths.fixture);
const docs = read(paths.docs);
const evidence = readJson(paths.evidence);
const workflow = read(paths.workflow);
const packageJson = readJson('package.json');
const matrix = readJson('config/domain-completion-matrix.json');
const a16 = readJson('config/pay-001-a16-issuer-status-distribution-resilience.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(
  config.status === 'repository_only_transparency_checkpoints_forward_only_recovery_cache_poisoning_incident_evidence_and_operational_adoption_handoff_ready_remote_authority_blocked',
  'status mismatch'
);
assert(config.dependencies.a16ContractVersion === contract.A16_CONTRACT_VERSION, 'A16 dependency mismatch');
assert(config.dependencies.a16ContractVersion === a16.contractVersion, 'A16 config dependency mismatch');
assert(config.dependencies.a16ContractVersion === a16Contract.CONTRACT_VERSION, 'A16 runtime dependency mismatch');

const policy = config.transparencyRecoveryPolicy;
assert(policy.checkpointVersion === contract.CHECKPOINT_VERSION, 'checkpoint version mismatch');
assert(policy.checkpointChainVersion === contract.CHECKPOINT_CHAIN_VERSION, 'checkpoint-chain version mismatch');
assert(policy.recoveryPlanVersion === contract.RECOVERY_PLAN_VERSION, 'recovery-plan version mismatch');
assert(policy.recoveryResultVersion === contract.RECOVERY_RESULT_VERSION, 'recovery-result version mismatch');
assert(policy.incidentEvidenceVersion === contract.INCIDENT_EVIDENCE_VERSION, 'incident-evidence version mismatch');
assert(policy.incidentChainVersion === contract.INCIDENT_CHAIN_VERSION, 'incident-chain version mismatch');
assert(policy.adoptionHandoffVersion === contract.ADOPTION_HANDOFF_VERSION, 'adoption-handoff version mismatch');
assert(policy.adoptionDecisionVersion === contract.ADOPTION_DECISION_VERSION, 'adoption-decision version mismatch');
assert(policy.minimumWitnesses === contract.MINIMUM_WITNESSES, 'minimum witnesses drifted');
assert(policy.minimumApprovals === contract.MINIMUM_APPROVALS, 'minimum approvals drifted');
assert(policy.maximumCheckpointIntervalSeconds === contract.MAX_CHECKPOINT_INTERVAL_SECONDS, 'checkpoint interval drifted');
assert(policy.maximumRecoveryWindowSeconds === contract.MAX_RECOVERY_WINDOW_SECONDS, 'recovery window drifted');
assert(policy.maximumIncidentEvidenceDelaySeconds === contract.MAX_INCIDENT_EVIDENCE_DELAY_SECONDS, 'incident delay drifted');
assert(JSON.stringify(policy.publicationModes) === JSON.stringify(contract.PUBLICATION_MODES), 'publication modes drifted');
assert(JSON.stringify(policy.recoveryModes) === JSON.stringify(contract.RECOVERY_MODES), 'recovery modes drifted');
assert(JSON.stringify(policy.detectionClasses) === JSON.stringify(contract.DETECTION_CLASSES), 'detection classes drifted');
assert(JSON.stringify(policy.containmentStates) === JSON.stringify(contract.CONTAINMENT_STATES), 'containment states drifted');
assert(JSON.stringify(policy.adoptionStates) === JSON.stringify(contract.ADOPTION_STATES), 'adoption states drifted');

[
  'appendOnlyCheckpointChainRequired',
  'checkpointForkAndReplayDenied',
  'distributionEpochRollbackDenied',
  'lifecycleRollbackDenied',
  'treeSizeRollbackDenied',
  'clockRollbackDenied',
  'forwardOnlyRecoveryRequired',
  'compromisedCheckpointReuseDenied',
  'compromisedManifestReuseDenied',
  'cacheInvalidationSetMustMatchPlan',
  'automaticRecoveryExecutionDenied',
  'incidentEvidenceHashesOnlyRequired',
  'rawPayloadAndDirectIdentifiersDenied',
  'containmentStateRollbackDenied',
  'recoveryValidatedStateRequiresOfflineResult',
  'ownerReviewerRoleSeparationRequired',
  'operationalAdoptionRemainsBlocked',
  'blockersPreserved',
  'endpointsCredentialsAndPrivateKeysDenied'
].forEach((key) => assert(policy[key] === true, key + ' must be true'));

[
  'realTransparencyLogConfigured',
  'realWitnessConfigured',
  'realRecoveryExecuted',
  'realIncidentContainmentApplied',
  'realOperationalAdoptionAuthorized',
  'productionAllowed',
  'remoteExecutionAllowedByRepositoryContract',
  'repositoryExecutionPerformed'
].forEach((key) => assert(policy[key] === false, key + ' must remain false'));

assert(fixture.contractVersion === contract.CONTRACT_VERSION, 'fixture contract mismatch');
assert(fixture.totalCases === 94, 'fixture total mismatch');
assert(fixture.positiveCases.length === 12, 'fixture positive inventory mismatch');
assert(fixture.negativeCases.length === 82, 'fixture negative inventory mismatch');
assert(
  new Set([...fixture.positiveCases, ...fixture.negativeCases].map((item) => item.id)).size === 94,
  'fixture ids must be unique'
);
assert(
  fixture.negativeCases.every((item) => typeof item.expectedCode === 'string' && item.expectedCode.startsWith('DOKE_PAY_A17_')),
  'negative cases must declare PAY-A17 error codes'
);
assert(config.conformance.totalCases === 94, 'config total count mismatch');
assert(config.conformance.positiveCases === 12, 'config positive count mismatch');
assert(config.conformance.negativeCases === 82, 'config negative count mismatch');
assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers changed');
Object.entries(config.effects).forEach(([key, value]) => {
  assert(value === 0 || value === false, 'effect must remain zero/false: ' + key);
});

[
  "const CONTRACT_VERSION = 'pay-a17-transparency-recovery-incident-handoff-v1'",
  "const CHECKPOINT_VERSION = 'pay-identity-distribution-transparency-checkpoint-v1'",
  "const RECOVERY_PLAN_VERSION = 'pay-identity-distribution-recovery-plan-v1'",
  "const INCIDENT_EVIDENCE_VERSION = 'pay-identity-cache-poisoning-incident-evidence-v1'",
  "const ADOPTION_HANDOFF_VERSION = 'pay-identity-distribution-operational-adoption-handoff-v1'",
  'DOKE_PAY_A17_CHECKPOINT_FORK_DENIED',
  'DOKE_PAY_A17_CHECKPOINT_REPLAY_DENIED',
  'DOKE_PAY_A17_CHECKPOINT_EPOCH_ROLLBACK_DENIED',
  'DOKE_PAY_A17_FORWARD_ONLY_EPOCH_REQUIRED',
  'DOKE_PAY_A17_AUTOMATIC_RECOVERY_EXECUTION_DENIED',
  'DOKE_PAY_A17_INCIDENT_SENSITIVE_MATERIAL_DENIED',
  'DOKE_PAY_A17_CONTAINMENT_STATE_ROLLBACK_DENIED',
  'DOKE_PAY_A17_ROLE_SEPARATION_REQUIRED',
  'DOKE_PAY_A17_OPERATIONAL_ADOPTION_DENIED',
  'createTransparencyCheckpoint',
  'validateTransparencyCheckpointChain',
  'createRecoveryPlan',
  'validateRecoveryResult',
  'createCachePoisoningIncidentEvidence',
  'validateIncidentEvidenceChain',
  'createOperationalAdoptionHandoff',
  'evaluateOperationalAdoption',
  'networkRequests: 0',
  'databaseConnections: 0'
].forEach((fragment) => assert(source.includes(fragment), 'module missing: ' + fragment));

[
  'PAY-A17',
  'PAY-A16',
  'append-only transparency checkpoints',
  'forward_only_rebuild',
  'cache-poisoning incident evidence',
  'hashes-only',
  'under_investigation',
  'contained_offline',
  'recovery_validated',
  'blocked_repository_only',
  '94/94',
  'PAY-B01',
  'PAY-B03',
  'PAY-B04',
  'PAY-A18'
].forEach((fragment) => {
  assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment);
});

assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.contractVersion === contract.CONTRACT_VERSION, 'evidence contract mismatch');
assert(evidence.totalCases === 94, 'evidence total count mismatch');
assert(evidence.passedCases === 94, 'evidence passed count mismatch');
assert(evidence.positiveCases === 12, 'evidence positive count mismatch');
assert(evidence.negativeCases === 82, 'evidence negative count mismatch');
Object.entries(evidence.execution).forEach(([key, value]) => {
  assert(value === 0 || value === false, 'evidence effect must remain zero/false: ' + key);
});
[
  'a16DistributionManifestCacheProofAndQuorumBound',
  'appendOnlyTransparencyCheckpointChainEnforced',
  'checkpointForkReplayAndIntegrityFailureRejected',
  'distributionEpochLifecycleTreeSizeAndClockRollbackRejected',
  'offlineWitnessQuorumAndBoundedCheckpointIntervalEnforced',
  'forwardOnlyRecoveryPlanRequired',
  'compromisedCheckpointAndManifestReuseRejected',
  'recoveryWindowApprovalQuorumAndInvalidationSetBounded',
  'automaticRemoteRecoveryExecutionRejected',
  'recoveryResultMustMatchPlanAndRebuiltCheckpoint',
  'cachePoisoningIncidentEvidenceHashesOnlyEnforced',
  'manifestMismatchSplitBrainReplayAndClockRollbackEvidenceCovered',
  'directIdentifiersRawPayloadsEndpointsCredentialsAndPrivateKeysRejected',
  'incidentEvidenceChainForkReplayAndContainmentRollbackRejected',
  'recoveryValidatedContainmentRequiresOfflineRecoveryResult',
  'operationalAdoptionHandoffBindsCheckpointRecoveryAndIncidentHeads',
  'ownerReviewerRoleSeparationAndApprovalQuorumEnforced',
  'payBlockersPreservedAndOperationalAdoptionBlocked',
  'productionAndRemoteExecutionAuthorityAbsent'
].forEach((key) => assert(evidence.validated[key] === true, 'validation evidence missing: ' + key));

assert(
  packageJson.scripts['audit:pay-001-a17-transparency-recovery-incident-handoff'] ===
    'node scripts/audit-pay-001-a17-transparency-recovery-incident-handoff.js',
  'package audit missing'
);
assert(
  packageJson.scripts['test:pay-001-a17-transparency-recovery-incident-handoff'] ===
    'node scripts/test-pay-001-a17-transparency-recovery-incident-handoff.js',
  'package test missing'
);
assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.102'), 'matrix version must be at least 1.3.102');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local', 'PAY user-facing authority drifted');
assert(pay.serverAuthority === 'contract_only', 'PAY server authority drifted');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked', 'PAY security gate must remain blocked');
assert(pay.productionGate === 'blocked', 'PAY production gate must remain blocked');
assert(
  JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']),
  'PAY blockers drifted'
);
Object.values(paths).forEach((file) => {
  assert(pay.requiredPaths.includes(file), 'matrix requiredPaths missing: ' + file);
});
assert(pay.scanRoots.includes(paths.module), 'matrix scanRoots missing A17 module');
assert(pay.scanRoots.includes(paths.fixture), 'matrix scanRoots missing A17 fixture');
assert(
  pay.tests.includes('audit:pay-001-a17-transparency-recovery-incident-handoff'),
  'matrix A17 audit missing'
);
assert(
  pay.tests.includes('test:pay-001-a17-transparency-recovery-incident-handoff'),
  'matrix A17 test missing'
);
assert(pay.evidence.some((item) => item.includes('PAY-A17')), 'matrix A17 evidence missing');
assert(pay.nextActions[0].includes('PAY-A18'), 'PAY-A18 must be first next action');

const predecessorGuards = [
  'scripts/audit-pay-001-a06-provider-selection-legal-handoff.js',
  'scripts/audit-pay-001-a07-reconciliation-operations-readiness.js',
  'scripts/audit-pay-001-a08-immutable-migrations-read-only-canary.js',
  'scripts/audit-pay-001-a09-deployment-inspection-handoff.js',
  'scripts/audit-pay-001-a10-external-executor-evidence-ingestion.js',
  'scripts/audit-pay-001-a11-executor-protocol-conformance.js',
  'scripts/audit-pay-001-a12-executor-trust-root-signature.js',
  'scripts/audit-pay-001-a13-executor-lifecycle-governance.js',
  'scripts/audit-pay-001-a14-governance-evidence-chain.js',
  'scripts/audit-pay-001-a15-identity-issuer-lifecycle.js',
  'scripts/audit-pay-001-a16-issuer-status-distribution-resilience.js'
];
predecessorGuards.forEach((file) => {
  const guardSource = read(file);
  assert(guardSource.includes('PAY-A18'), 'successor guard not advanced in ' + file);
});

assert(workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
[
  'contents: write',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'psql ',
  'curl ',
  'supabase db push',
  'supabase migration up',
  'git push',
  '--execute',
  'http://',
  'https://'
].forEach((fragment) => {
  assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment);
});
[
  "require('node:http')",
  "require('node:https')",
  "require('node:net')",
  "require('node:tls')",
  "require('node:child_process')",
  'fetch(',
  'axios',
  'SUPABASE_',
  'process.env',
  'privateKeyPem',
  'secretKey'
].forEach((fragment) => {
  assert(!source.includes(fragment), 'module contains prohibited runtime capability: ' + fragment);
});

console.log('PAY-A17 transparency, recovery, incident evidence and adoption handoff audit passed.');
