#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  CONTRACT_VERSION,
  ALLOWED_PROVIDERS,
  evaluateProviderSelection,
  buildProviderNeutralPlan,
  assertProviderOperationUnavailable
} = require('../backend/runtime/staging/provider-adapter-contract');

assert.strictEqual(CONTRACT_VERSION, 'ord-a09b0-provider-adapter-v1');
assert.deepStrictEqual(ALLOWED_PROVIDERS, ['railway', 'fly.io', 'render', 'vercel']);

const unselected = evaluateProviderSelection({});
assert.strictEqual(unselected.providerSelected, false);
assert.strictEqual(unselected.genericNextMeansSelection, false);
assert(unselected.blockers.includes('explicit_provider_selection_required'));

const genericNext = evaluateProviderSelection({
  DOKE_ENVIRONMENT: 'staging',
  DOKE_STAGING_PROVIDER: 'railway',
  DOKE_STAGING_PROVIDER_SELECTION_ACK: 'proximo'
});
assert.strictEqual(genericNext.providerSelected, false);
assert(genericNext.blockers.includes('selection_acknowledgement_mismatch'));

const partial = evaluateProviderSelection({
  DOKE_ENVIRONMENT: 'staging',
  DOKE_STAGING_PROVIDER: 'railway'
});
assert.strictEqual(partial.providerSelected, false);
assert(partial.blockers.includes('selection_acknowledgement_required'));

const selectedInMemoryOnly = evaluateProviderSelection({
  DOKE_ENVIRONMENT: 'staging',
  DOKE_STAGING_PROVIDER: 'railway',
  DOKE_STAGING_PROVIDER_SELECTION_ACK: 'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING'
});
assert.strictEqual(selectedInMemoryOnly.providerSelected, true);
assert.strictEqual(selectedInMemoryOnly.providerSpecificAdapterBound, false);
assert.strictEqual(selectedInMemoryOnly.deploymentAuthorized, false);
assert(selectedInMemoryOnly.blockers.includes('provider_specific_adapter_required'));
assert(selectedInMemoryOnly.blockers.includes('separate_deployment_authorization_required'));

const production = evaluateProviderSelection({
  DOKE_ENVIRONMENT: 'production',
  DOKE_STAGING_PROVIDER: 'railway',
  DOKE_STAGING_PROVIDER_SELECTION_ACK: 'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING'
});
assert.strictEqual(production.providerSelected, false);
assert(production.blockers.includes('production_environment_forbidden'));

const dryRun = buildProviderNeutralPlan({});
assert.strictEqual(dryRun.mode, 'dry-run');
assert.strictEqual(dryRun.commandsMaterialized, false);
assert.strictEqual(dryRun.networkRequests, 0);
assert.strictEqual(dryRun.mutations, 0);
assert.strictEqual(dryRun.providerAccountCreated, false);
assert.strictEqual(dryRun.billingAuthorized, false);
assert.strictEqual(dryRun.secretsConfigured, false);
assert.strictEqual(dryRun.deploymentPerformed, false);
assert.strictEqual(dryRun.rollbackPerformed, false);
assert.strictEqual(dryRun.productionChanged, false);
assert(Object.isFrozen(dryRun));
assert(Object.isFrozen(dryRun.selection));

['status', 'deploy', 'rollback'].forEach((operation) => {
  assert.throws(
    () => assertProviderOperationUnavailable(operation),
    (error) => error && error.code === 'DOKE_PROVIDER_ADAPTER_NOT_BOUND' && error.status === 428
  );
});

console.log('ORD-A09B0 provider adapter contract test passed.');
