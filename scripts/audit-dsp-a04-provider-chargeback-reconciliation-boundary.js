'use strict';

const fs = require('node:fs');
const path = require('node:path');
const contract = require('../backend/modules/disputes/provider-chargeback-reconciliation-boundary');
const config = require('../config/dsp-a04-provider-chargeback-reconciliation-boundary.json');
const fixtures = require('../tests/fixtures/dsp-a04-provider-chargeback-reconciliation-cases.json');

const checks = [];
function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
}

const requiredFiles = [
  'backend/modules/disputes/provider-chargeback-reconciliation-boundary.js',
  'config/dsp-a04-provider-chargeback-reconciliation-boundary.json',
  'tests/fixtures/dsp-a04-provider-chargeback-reconciliation-cases.json',
  'docs/DSP-A04-PROVIDER-CHARGEBACK-RECONCILIATION-BOUNDARY.md',
  'scripts/audit-dsp-a04-provider-chargeback-reconciliation-boundary.js',
  'scripts/test-dsp-a04-provider-chargeback-reconciliation-boundary.js',
  '.github/workflows/dsp-a04-provider-chargeback-reconciliation-boundary.yml'
];

requiredFiles.forEach((file) => {
  check(`file exists: ${file}`, fs.existsSync(path.join(process.cwd(), file)));
});

check('contract id module/config', contract.CONTRACT_ID === config.contractId);
check('scope repository only', config.scope === 'repository_only');
check('runtime not integrated', config.runtimeIntegrated === false);
check('migration not prepared', config.migrationPrepared === false);
check('migration not applied', config.migrationApplied === false);
check('staging not validated', config.stagingValidated === false);
check('provider not selected', config.providerSelected === false);
check('credentials not configured', config.providerCredentialsConfigured === false);
check('policy not approved', config.approvedPolicyPresent === false);
check('operator workflow incomplete', config.operatorCaseWorkflowComplete === false);
check('synthetic fixtures', fixtures.syntheticOnly === true);
check('fixture set versioned', fixtures.fixtureSet === 'dsp-a04-provider-chargeback-reconciliation-cases-v1');

[
  'dsp-a01-authority-baseline-v1',
  'dsp-a02-canonical-lifecycle-effect-taxonomy-v1',
  'dsp-a03-evidence-deadline-appeal-contract-v1',
  'pay-001-a03-psp-neutral-intent-webhook-v1',
  'wal-a05-provider-transfer-reconciliation-v1'
].forEach((dependency) => check(`dependency ${dependency}`, config.dependsOn.includes(dependency)));

contract.PROVIDER_STATES.forEach((state) => check(`provider state config ${state}`, config.providerStates.includes(state)));
config.providerStates.forEach((state) => check(`provider state module ${state}`, contract.PROVIDER_STATES.includes(state)));
contract.OBSERVATION_SOURCES.forEach((source) => check(`observation source config ${source}`, config.observationSources.includes(source)));
config.observationSources.forEach((source) => check(`observation source module ${source}`, contract.OBSERVATION_SOURCES.includes(source)));
contract.RECONCILIATION_STATES.forEach((state) => check(`reconciliation state config ${state}`, config.reconciliationStates.includes(state)));
config.reconciliationStates.forEach((state) => check(`reconciliation state module ${state}`, contract.RECONCILIATION_STATES.includes(state)));

[
  'provider events require a verified signature or authenticated channel',
  'duplicate events with the same fingerprint are replays',
  'event id or sequence reuse with different content is a conflict',
  'provider event order and state transitions are validated',
  'a final provider result is not a reconciled internal result',
  'reconciliation matches transaction, case, amount, currency, dispute reference, evidence bundle and ledger records',
  'one webhook never establishes financial authority',
  'raw payloads, credentials, card data, banking data and evidence bodies are prohibited',
  'chargeback observations cannot execute refund, release, transfer or production mutation'
].forEach((rule) => check(`semantic rule ${rule}`, config.semanticRules.includes(rule)));

[
  'DSP-B01', 'DSP-B03', 'DSP-B04',
  'PAY-B01', 'PAY-B03', 'PAY-B04',
  'WAL-B02', 'WAL-B03', 'WAL-B04'
].forEach((blocker) => check(`blocker ${blocker}`, config.preservedBlockers.includes(blocker)));

Object.entries({
  contractAuthority: true,
  providerObservationReferenceAuthority: true,
  providerResultAuthority: false,
  decisionAuthority: false,
  runtimeMutationAuthority: false,
  refundAuthority: false,
  releaseAuthority: false,
  chargebackAuthority: false,
  providerSubmissionAuthority: false,
  realMoneyAuthority: false,
  productionAuthority: false
}).forEach(([field, expected]) => check(`authority ${field}`, config.authority[field] === expected));

Object.entries({
  networkRequests: false,
  databaseConnections: false,
  stagingReads: false,
  stagingMutations: false,
  migrations: false,
  deployments: false,
  providerContact: false,
  credentialsConfigured: false,
  realWebhookReceived: false,
  realChargebackOpened: false,
  realEvidenceSubmitted: false,
  refundExecuted: false,
  releaseExecuted: false,
  realMoneyMovement: false,
  productionChanges: false
}).forEach(([field, expected]) => check(`prohibited effect ${field}`, config.prohibitedEffects[field] === expected));

[
  'normalizeProviderState',
  'assertNoSensitiveData',
  'createProviderChargebackObservation',
  'validateProviderChargebackObservation',
  'buildProviderObservationChain',
  'validateProviderObservationChain',
  'createChargebackReconciliation',
  'validateChargebackReconciliation',
  'readiness'
].forEach((exportName) => check(`module export ${exportName}`, typeof contract[exportName] === 'function'));

const moduleText = fs.readFileSync(path.join(process.cwd(), requiredFiles[0]), 'utf8');
[
  'DSP_A04_WEBHOOK_SIGNATURE_REQUIRED',
  'DSP_A04_AUTHENTICATED_CHANNEL_REQUIRED',
  'DSP_A04_EVENT_ID_CONFLICT',
  'DSP_A04_SEQUENCE_CONFLICT',
  'DSP_A04_PROVIDER_TRANSITION_INVALID',
  'DSP_A04_EVENT_TIME_ORDER_INVALID',
  'DSP_A04_SINGLE_SIGNAL_TRUST_FORBIDDEN',
  'providerResultTrustedAlone: false',
  'singleWebhookSufficient: false',
  'runtimeMutationAuthority: false',
  'providerSubmissionAuthority: false',
  'providerDecisionAuthority: false',
  'refundAuthority: false',
  'releaseAuthority: false',
  'chargebackAuthority: false',
  'realMoneyAuthority: false',
  'stagingAuthority: false',
  'productionAuthority: false'
].forEach((needle) => check(`module contains ${needle}`, moduleText.includes(needle)));

const docsPath = path.join(process.cwd(), requiredFiles[3]);
if (fs.existsSync(docsPath)) {
  const docs = fs.readFileSync(docsPath, 'utf8');
  [
    'repository-only',
    'assinatura',
    'canal autenticado',
    'deduplicação',
    'ordem temporal',
    'reconciliação',
    'um único webhook',
    'DSP-B01',
    'DSP-B03',
    'DSP-B04',
    'runtimeIntegrated: false',
    'chargebackAuthority: false',
    'productionAuthority: false',
    'DSP-A05'
  ].forEach((needle) => check(`docs contain ${needle}`, docs.toLowerCase().includes(needle.toLowerCase())));
}

const workflowPath = path.join(process.cwd(), requiredFiles[6]);
if (fs.existsSync(workflowPath)) {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  [
    'permissions:',
    'contents: read',
    'node --check backend/modules/disputes/provider-chargeback-reconciliation-boundary.js',
    'node scripts/audit-dsp-a04-provider-chargeback-reconciliation-boundary.js',
    'node scripts/test-dsp-a04-provider-chargeback-reconciliation-boundary.js',
    'node scripts/audit-dsp-a03-evidence-deadline-appeal-contract.js',
    'node scripts/test-dsp-a03-evidence-deadline-appeal-contract.js',
    'git diff --check'
  ].forEach((needle) => check(`workflow contains ${needle}`, workflow.includes(needle)));
  check('workflow no write permission', !/contents:\s*write/.test(workflow));
  check('workflow no secrets', !/\$\{\{\s*secrets\./.test(workflow));
  check('workflow no staging', !/supabase|staging|curl|wget/.test(workflow));
}

fixtures.observations.forEach((fixture, index) => {
  check(`fixture ${index + 1} named`, typeof fixture.name === 'string' && fixture.name.length > 0);
  check(`fixture ${index + 1} amount positive`, Number.isSafeInteger(fixture.input.amountCents) && fixture.input.amountCents > 0);
  check(`fixture ${index + 1} currency BRL`, fixture.input.currency === 'BRL');
  check(`fixture ${index + 1} opaque event`, /^pevt_/.test(fixture.input.providerEventId));
  check(`fixture ${index + 1} opaque dispute`, /^pdsp_/.test(fixture.input.providerDisputeRef));
  check(`fixture ${index + 1} fingerprint evidence`, /^[a-f0-9]{64}$/.test(fixture.input.evidenceFingerprint));
  check(`fixture ${index + 1} fingerprint transaction`, /^[a-f0-9]{64}$/.test(fixture.input.transactionFingerprint));
  check(`fixture ${index + 1} fingerprint case`, /^[a-f0-9]{64}$/.test(fixture.input.caseFingerprint));
});

Object.entries(fixtures.reconciliation).forEach(([field, value]) => {
  if (field.endsWith('Fingerprint')) check(`reconciliation fixture fingerprint ${field}`, /^[a-f0-9]{64}$/.test(value));
  else check(`reconciliation fixture boolean ${field}`, value === true);
});

const failedChecks = checks.filter((entry) => !entry.passed);
const result = {
  contractId: contract.CONTRACT_ID,
  sourceHead: config.sourceHead,
  total: checks.length,
  passed: checks.length - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks: failedChecks.map((entry) => entry.name),
  effects: config.prohibitedEffects
};

console.log(JSON.stringify(result, null, 2));
if (failedChecks.length) process.exitCode = 1;
