#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  FIREWALL_VERSION,
  REQUIRED_PHRASE,
  evaluateSelectionIntent,
  assertAdapterPreparationAuthorized
} = require('../backend/runtime/staging/provider-selection-intent-firewall');

const rejectedInputs = [
  '',
  'proximo',
  'próximo',
  'pode prosseguir',
  'continue',
  REQUIRED_PHRASE.toLowerCase(),
  `${REQUIRED_PHRASE}.`,
  'Eu seleciono Railway para staging'
];

rejectedInputs.forEach((command) => {
  const result = evaluateSelectionIntent({ command, environment: 'staging', provider: 'railway' });
  assert.strictEqual(result.firewallVersion, FIREWALL_VERSION);
  assert.strictEqual(result.adapterPreparationAuthorized, false, `Must reject: ${command || '<empty>'}`);
  assert.strictEqual(result.canonicalSelectionPersisted, false);
  assert.strictEqual(result.providerSpecificAdapterBound, false);
  assert.strictEqual(result.billingAuthorized, false);
  assert.strictEqual(result.deploymentAuthorized, false);
  assert.strictEqual(result.productionAllowed, false);
  assert.strictEqual(result.networkRequests, 0);
  assert.strictEqual(result.mutations, 0);
  assert(Object.isFrozen(result));
});

const exact = evaluateSelectionIntent({
  command: REQUIRED_PHRASE,
  environment: 'staging',
  provider: 'railway'
});
assert.strictEqual(exact.adapterPreparationAuthorized, true);
assert.strictEqual(exact.providerSelectedForThisEvaluation, true);
assert.strictEqual(exact.canonicalSelectionPersisted, false);
assert.strictEqual(exact.providerSpecificAdapterBound, false);
assert.strictEqual(exact.providerAccountAuthorized, false);
assert.strictEqual(exact.billingAuthorized, false);
assert.strictEqual(exact.secretsAuthorized, false);
assert.strictEqual(exact.infrastructureAuthorized, false);
assert.strictEqual(exact.deploymentAuthorized, false);
assert.strictEqual(exact.rollbackAuthorized, false);
assert.strictEqual(exact.visualCanaryAuthorized, false);
assert.strictEqual(exact.productionAllowed, false);
assert.strictEqual(exact.neutralContract.providerSelected, true);
assert.strictEqual(exact.neutralContract.providerSpecificAdapterBound, false);
assert.strictEqual(exact.neutralContract.deploymentAuthorized, false);
assert(exact.blockers.includes('provider_specific_adapter_required'));
assert(exact.blockers.includes('separate_deployment_authorization_required'));

const production = evaluateSelectionIntent({
  command: REQUIRED_PHRASE,
  environment: 'production',
  provider: 'railway'
});
assert.strictEqual(production.adapterPreparationAuthorized, false);
assert(production.blockers.includes('production_environment_forbidden'));

const wrongProvider = evaluateSelectionIntent({
  command: REQUIRED_PHRASE,
  environment: 'staging',
  provider: 'render'
});
assert.strictEqual(wrongProvider.adapterPreparationAuthorized, false);
assert(wrongProvider.blockers.includes('railway_provider_required_for_this_gate'));

assert.doesNotThrow(() => assertAdapterPreparationAuthorized({
  command: REQUIRED_PHRASE,
  environment: 'staging',
  provider: 'railway'
}));

assert.throws(
  () => assertAdapterPreparationAuthorized({ command: 'proximo', environment: 'staging', provider: 'railway' }),
  (error) => error && error.code === 'DOKE_PROVIDER_SELECTION_INTENT_REJECTED' && error.status === 428
);

console.log('ORD-A09B0 provider selection intent firewall tests passed.');
