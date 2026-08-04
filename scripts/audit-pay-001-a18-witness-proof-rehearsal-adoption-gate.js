'use strict';

const fs = require('node:fs');
const path = require('node:path');
const contract = require('../backend/modules/payments/payment-reconciliation-witness-proof-rehearsal');
const a17 = require('../backend/modules/payments/payment-reconciliation-transparency-recovery');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A18 audit failed: ' + message);
};

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-witness-proof-rehearsal.js',
  config: 'config/pay-001-a18-witness-proof-rehearsal-adoption-gate.json',
  fixture: 'tests/fixtures/pay-a18-witness-proof-rehearsal-adoption-gate-cases.json',
  docs: 'docs/PAY-001-A18-WITNESS-PROOF-REHEARSAL-ADOPTION-GATE.md',
  evidence: 'docs/validation/PAY-001-A18-WITNESS-PROOF-REHEARSAL-ADOPTION-GATE.json',
  audit: 'scripts/audit-pay-001-a18-witness-proof-rehearsal-adoption-gate.js',
  test: 'scripts/test-pay-001-a18-witness-proof-rehearsal-adoption-gate.js',
  workflow: '.github/workflows/pay-001-a18-witness-proof-rehearsal-adoption-gate.yml'
};
Object.values(paths).forEach((file) => assert(fs.existsSync(path.join(root, file)), 'missing asset: ' + file));

const source = read(paths.module);
const config = readJson(paths.config);
const fixture = readJson(paths.fixture);
const docs = read(paths.docs);
const evidence = readJson(paths.evidence);
const workflow = read(paths.workflow);

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(config.dependencies.a17ContractVersion === contract.A17_CONTRACT_VERSION, 'A17 dependency mismatch');
assert(config.dependencies.a17ContractVersion === a17.CONTRACT_VERSION, 'A17 runtime dependency mismatch');

const policy = config.witnessProofRehearsalPolicy;
[
  ['witnessProfileVersion', contract.WITNESS_PROFILE_VERSION],
  ['witnessQuorumVersion', contract.WITNESS_QUORUM_VERSION],
  ['inclusionProofVersion', contract.INCLUSION_PROOF_VERSION],
  ['consistencyProofVersion', contract.CONSISTENCY_PROOF_VERSION],
  ['rehearsalPlanVersion', contract.REHEARSAL_PLAN_VERSION],
  ['rehearsalAttestationVersion', contract.REHEARSAL_ATTESTATION_VERSION],
  ['preProviderGateVersion', contract.PRE_PROVIDER_GATE_VERSION],
  ['preProviderDecisionVersion', contract.PRE_PROVIDER_DECISION_VERSION]
].forEach(([key, expected]) => assert(policy[key] === expected, key + ' mismatch'));
assert(policy.minimumWitnesses === contract.MINIMUM_WITNESSES, 'minimum witnesses drifted');
assert(policy.minimumApprovals === contract.MINIMUM_APPROVALS, 'minimum approvals drifted');
assert(policy.maximumWitnessProfileLifetimeSeconds === contract.MAX_WITNESS_PROFILE_LIFETIME_SECONDS, 'witness lifetime drifted');
assert(policy.maximumProofAgeSeconds === contract.MAX_PROOF_AGE_SECONDS, 'proof age drifted');
assert(policy.maximumRehearsalDurationSeconds === contract.MAX_REHEARSAL_DURATION_SECONDS, 'rehearsal duration drifted');
assert(JSON.stringify(policy.protocolSuites) === JSON.stringify(contract.PROTOCOL_SUITES), 'protocol suites drifted');
assert(JSON.stringify(policy.proofModes) === JSON.stringify(contract.PROOF_MODES), 'proof modes drifted');
assert(JSON.stringify(policy.gateStates) === JSON.stringify(contract.GATE_STATES), 'gate states drifted');

[
  'distinctWitnessOperatorsRequired', 'distinctWitnessOperatorFamiliesRequired',
  'distinctWitnessPublicKeysRequired', 'witnessProtocolInteroperabilityRequired',
  'checkpointInclusionProofRequired', 'checkpointConsistencyProofRequired',
  'proofTranscriptIntegrityRequired', 'treeSizeRollbackDenied', 'issuerCrossoverDenied',
  'syntheticRecoveryRehearsalOnly', 'rehearsalScenarioParityRequired',
  'rehearsalInvalidationSetParityRequired', 'ownerReviewerRoleSeparationRequired',
  'providerEvaluationRemainsBlocked', 'operationalAdoptionRemainsBlocked', 'blockersPreserved'
].forEach((key) => assert(policy[key] === true, key + ' must be true'));
[
  'realWitnessConfigured', 'realTransparencyLogConfigured', 'realRecoveryRehearsalExecuted',
  'realProviderContactAuthorized', 'realOperationalAdoptionAuthorized', 'productionAllowed',
  'remoteExecutionAllowedByRepositoryContract', 'repositoryExecutionPerformed'
].forEach((key) => assert(policy[key] === false, key + ' must remain false'));

assert(fixture.contractVersion === contract.CONTRACT_VERSION, 'fixture contract mismatch');
assert(fixture.totalCases === 54, 'fixture total mismatch');
assert(fixture.positiveCases.length === 12, 'fixture positive inventory mismatch');
assert(fixture.negativeCases.length === 42, 'fixture negative inventory mismatch');
assert(new Set([...fixture.positiveCases, ...fixture.negativeCases].map((item) => item.id)).size === 54, 'fixture ids must be unique');
assert(fixture.negativeCases.every((item) => item.expectedCode.startsWith('DOKE_PAY_A18_')), 'negative codes must be PAY-A18');
assert(config.conformance.totalCases === 54 && config.conformance.positiveCases === 12 && config.conformance.negativeCases === 42, 'config conformance drifted');
assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers drifted');
Object.values(config.effects).forEach((value) => assert(value === 0 || value === false, 'config effect must remain zero/false'));

[
  "const CONTRACT_VERSION = 'pay-a18-witness-proof-rehearsal-adoption-gate-v1'",
  "const WITNESS_PROFILE_VERSION = 'pay-identity-transparency-witness-profile-v1'",
  "const INCLUSION_PROOF_VERSION = 'pay-identity-checkpoint-inclusion-proof-v1'",
  "const CONSISTENCY_PROOF_VERSION = 'pay-identity-checkpoint-consistency-proof-v1'",
  "const REHEARSAL_ATTESTATION_VERSION = 'pay-identity-recovery-rehearsal-attestation-v1'",
  "const PRE_PROVIDER_GATE_VERSION = 'pay-identity-pre-provider-adoption-gate-v1'",
  'DOKE_PAY_A18_WITNESS_OPERATOR_DUPLICATE',
  'DOKE_PAY_A18_WITNESS_OPERATOR_FAMILY_DUPLICATE',
  'DOKE_PAY_A18_WITNESS_KEY_DUPLICATE',
  'DOKE_PAY_A18_INCLUSION_VERIFICATION_FAILED',
  'DOKE_PAY_A18_CONSISTENCY_TRANSCRIPT_MISMATCH',
  'DOKE_PAY_A18_REHEARSAL_SYNTHETIC_ONLY_REQUIRED',
  'DOKE_PAY_A18_ROLE_SEPARATION_REQUIRED',
  'DOKE_PAY_A18_PROVIDER_ADOPTION_DENIED',
  'createWitnessProfile', 'validateWitnessInteroperability',
  'validateCheckpointInclusionProof', 'validateCheckpointConsistencyProof',
  'createRecoveryRehearsalPlan', 'validateRecoveryRehearsalAttestation',
  'createPreProviderAdoptionGate', 'evaluatePreProviderAdoption'
].forEach((fragment) => assert(source.includes(fragment), 'module missing: ' + fragment));

[
  'PAY-A18', 'PAY-A17', 'doke_merkle_sha256_v1', 'inclusion proof', 'consistency proof',
  'syntheticOnly', 'blocked_repository_only', '54/54', 'PAY-B01', 'PAY-B03', 'PAY-B04'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only_core_contract', 'evidence status mismatch');
assert(evidence.contractVersion === contract.CONTRACT_VERSION, 'evidence contract mismatch');
assert(evidence.totalCases === 54 && evidence.passedCases === 54, 'evidence count mismatch');
assert(evidence.positiveCases === 12 && evidence.negativeCases === 42, 'evidence inventory mismatch');
Object.values(evidence.execution).forEach((value) => assert(value === 0 || value === false, 'evidence effect must remain zero/false'));
Object.values(evidence.validated).forEach((value) => assert(value === true, 'all evidence validations must be true'));

assert(workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
[
  'contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD',
  'psql ', 'curl ', 'supabase db push', 'supabase migration up', 'git push',
  '--execute', 'http://', 'https://'
].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));
[
  "require('node:http')", "require('node:https')", "require('node:net')", "require('node:tls')",
  "require('node:child_process')", 'fetch(', 'axios', 'SUPABASE_', 'process.env',
  'privateKeyPem', 'secretKey'
].forEach((fragment) => assert(!source.includes(fragment), 'module contains prohibited runtime capability: ' + fragment));

console.log('PAY-A18 witness interoperability, proof conformance, rehearsal and pre-provider gate audit passed.');
