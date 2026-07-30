#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  REQUIRED_METHODS,
  validateAdapterShape,
  assertDryRunEvidence,
  evaluateAdapterConformance
} = require('../backend/runtime/staging/provider-adapter-conformance');

function createAdapter(overrides = {}) {
  return {
    metadata: {
      provider: 'fixture-provider',
      contractVersion: 'fixture-v1',
      environment: 'staging',
      productionAllowed: false,
      networkEnabledByDefault: false,
      commandsExecutable: false,
      secretNames: ['DOKE_PROVIDER_TOKEN'],
      secretDescriptors: [{ name: 'DOKE_PROVIDER_TOKEN', required: true }],
      ...(overrides.metadata || {})
    },
    describe() { return { provider: 'fixture-provider' }; },
    checkEnv() { return { ready: false }; },
    planStatus() { return {}; },
    planDeploy() { return {}; },
    planRollback() { return {}; },
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'metadata'))
  };
}

function createDryRun(operation, overrides = {}) {
  return {
    mode: 'dry-run',
    operation,
    networkRequests: 0,
    mutations: 0,
    providerApiCalls: 0,
    commandsExecuted: 0,
    deploymentPerformed: false,
    rollbackPerformed: false,
    productionChanged: false,
    ...overrides
  };
}

const conformantAdapter = createAdapter();
const shape = validateAdapterShape(conformantAdapter);
assert.strictEqual(shape.conformant, true);
assert.deepStrictEqual(shape.blockers, []);
assert.deepStrictEqual([...shape.requiredMethods], [...REQUIRED_METHODS]);
assert.strictEqual(shape.providerSelected, false);
assert.strictEqual(shape.providerSpecificAdapterBound, false);

const statusEvidence = assertDryRunEvidence('status', createDryRun('status'));
assert.strictEqual(statusEvidence.conformant, true);

const complete = evaluateAdapterConformance(conformantAdapter, 'rollback', createDryRun('rollback'));
assert.strictEqual(complete.conformant, true);
assert.strictEqual(complete.providerSelected, false);
assert.strictEqual(complete.billingAuthorized, false);
assert.strictEqual(complete.deploymentAuthorized, false);
assert.strictEqual(complete.productionAllowed, false);

const missingMethodAdapter = createAdapter({ planRollback: undefined });
const missingMethod = validateAdapterShape(missingMethodAdapter);
assert.strictEqual(missingMethod.conformant, false);
assert(missingMethod.blockers.includes('missing_method:planRollback'));

const productionAdapter = createAdapter({ metadata: { productionAllowed: true } });
assert(validateAdapterShape(productionAdapter).blockers.includes('production_must_be_forbidden'));

const networkDefaultAdapter = createAdapter({ metadata: { networkEnabledByDefault: true } });
assert(validateAdapterShape(networkDefaultAdapter).blockers.includes('network_must_be_disabled_by_default'));

const executableAdapter = createAdapter({ metadata: { commandsExecutable: true } });
assert(validateAdapterShape(executableAdapter).blockers.includes('commands_must_be_non_executable_before_authorization'));

const embeddedSecretAdapter = createAdapter({ metadata: { secretNames: ['DOKE_PROVIDER_TOKEN=forbidden'] } });
assert(validateAdapterShape(embeddedSecretAdapter).blockers.includes('secret_values_must_not_be_embedded'));

const secretValueAdapter = createAdapter({
  metadata: { secretDescriptors: [{ name: 'DOKE_PROVIDER_TOKEN', value: 'forbidden' }] }
});
assert(validateAdapterShape(secretValueAdapter).blockers.includes('secret_descriptor_values_forbidden'));

const networkEvidence = assertDryRunEvidence('deploy', createDryRun('deploy', { networkRequests: 1 }));
assert(networkEvidence.blockers.includes('network_requests_forbidden'));

const mutationEvidence = assertDryRunEvidence('deploy', createDryRun('deploy', { mutations: 1 }));
assert(mutationEvidence.blockers.includes('mutations_forbidden'));

const commandEvidence = assertDryRunEvidence('deploy', createDryRun('deploy', { commandsExecuted: 1 }));
assert(commandEvidence.blockers.includes('command_execution_forbidden'));

const deploymentEvidence = assertDryRunEvidence('deploy', createDryRun('deploy', { deploymentPerformed: true }));
assert(deploymentEvidence.blockers.includes('deployment_forbidden'));

const productionEvidence = assertDryRunEvidence('status', createDryRun('status', { productionChanged: true }));
assert(productionEvidence.blockers.includes('production_change_forbidden'));

const unsupported = assertDryRunEvidence('destroy', createDryRun('destroy'));
assert(unsupported.blockers.includes('unsupported_operation'));

console.log('ORD-A09B0 provider adapter conformance tests passed.');
