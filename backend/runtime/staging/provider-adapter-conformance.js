#!/usr/bin/env node
'use strict';

const CONFORMANCE_VERSION = 'ord-a09b0-provider-adapter-conformance-v1';
const REQUIRED_METHODS = Object.freeze([
  'describe',
  'checkEnv',
  'planStatus',
  'planDeploy',
  'planRollback'
]);
const ALLOWED_OPERATIONS = Object.freeze(['status', 'deploy', 'rollback']);

function deepFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze));
  if (!value || typeof value !== 'object') return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, deepFreeze(nested)])
  ));
}

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasSecretValue(secret) {
  if (!secret || typeof secret !== 'object') return true;
  const forbiddenKeys = ['value', 'secret', 'token', 'credential', 'password'];
  return forbiddenKeys.some((key) => Object.prototype.hasOwnProperty.call(secret, key));
}

function validateAdapterShape(adapter) {
  const blockers = [];
  const source = adapter && typeof adapter === 'object' ? adapter : {};
  const metadata = source.metadata && typeof source.metadata === 'object' ? source.metadata : {};

  if (!asText(metadata.provider)) blockers.push('provider_name_required');
  if (!asText(metadata.contractVersion)) blockers.push('adapter_contract_version_required');
  if (metadata.environment !== 'staging') blockers.push('staging_environment_required');
  if (metadata.productionAllowed !== false) blockers.push('production_must_be_forbidden');
  if (metadata.networkEnabledByDefault !== false) blockers.push('network_must_be_disabled_by_default');
  if (metadata.commandsExecutable !== false) blockers.push('commands_must_be_non_executable_before_authorization');

  const secretNames = Array.isArray(metadata.secretNames) ? metadata.secretNames : [];
  if (!Array.isArray(metadata.secretNames)) blockers.push('secret_names_array_required');
  if (secretNames.some((item) => typeof item !== 'string' || !item.trim())) {
    blockers.push('secret_names_must_be_non_empty_strings');
  }
  if (secretNames.some((item) => item.includes('='))) blockers.push('secret_values_must_not_be_embedded');

  const secretDescriptors = Array.isArray(metadata.secretDescriptors) ? metadata.secretDescriptors : [];
  if (secretDescriptors.some(hasSecretValue)) blockers.push('secret_descriptor_values_forbidden');

  REQUIRED_METHODS.forEach((method) => {
    if (typeof source[method] !== 'function') blockers.push(`missing_method:${method}`);
  });

  return deepFreeze({
    conformanceVersion: CONFORMANCE_VERSION,
    status: blockers.length === 0 ? 'adapter_shape_conformant' : 'adapter_shape_rejected',
    conformant: blockers.length === 0,
    blockers,
    requiredMethods: REQUIRED_METHODS,
    providerSelected: false,
    providerSpecificAdapterBound: false,
    deploymentAuthorized: false,
    productionAllowed: false,
    networkRequests: 0,
    mutations: 0
  });
}

function assertDryRunEvidence(operation, result) {
  const blockers = [];
  const normalizedOperation = asText(operation).toLowerCase();
  const evidence = result && typeof result === 'object' ? result : {};

  if (!ALLOWED_OPERATIONS.includes(normalizedOperation)) blockers.push('unsupported_operation');
  if (evidence.mode !== 'dry-run') blockers.push('dry_run_mode_required');
  if (evidence.operation !== normalizedOperation) blockers.push('operation_identity_mismatch');
  if (evidence.networkRequests !== 0) blockers.push('network_requests_forbidden');
  if (evidence.mutations !== 0) blockers.push('mutations_forbidden');
  if (evidence.providerApiCalls !== 0) blockers.push('provider_api_calls_forbidden');
  if (evidence.commandsExecuted !== 0) blockers.push('command_execution_forbidden');
  if (evidence.deploymentPerformed !== false) blockers.push('deployment_forbidden');
  if (evidence.rollbackPerformed !== false) blockers.push('rollback_execution_forbidden');
  if (evidence.productionChanged !== false) blockers.push('production_change_forbidden');

  return deepFreeze({
    conformanceVersion: CONFORMANCE_VERSION,
    status: blockers.length === 0 ? 'dry_run_evidence_conformant' : 'dry_run_evidence_rejected',
    conformant: blockers.length === 0,
    operation: normalizedOperation || null,
    blockers,
    providerSelected: false,
    providerSpecificAdapterBound: false,
    deploymentAuthorized: false,
    productionAllowed: false
  });
}

function evaluateAdapterConformance(adapter, operation, result) {
  const shape = validateAdapterShape(adapter);
  const dryRun = assertDryRunEvidence(operation, result);
  const blockers = [...shape.blockers, ...dryRun.blockers];

  return deepFreeze({
    conformanceVersion: CONFORMANCE_VERSION,
    status: blockers.length === 0 ? 'provider_adapter_conformance_passed' : 'provider_adapter_conformance_failed',
    conformant: blockers.length === 0,
    shape,
    dryRun,
    blockers,
    providerSelected: false,
    providerSpecificAdapterBound: false,
    accountAuthorized: false,
    billingAuthorized: false,
    secretsAuthorized: false,
    infrastructureAuthorized: false,
    deploymentAuthorized: false,
    rollbackAuthorized: false,
    productionAllowed: false,
    networkRequests: 0,
    mutations: 0
  });
}

module.exports = Object.freeze({
  CONFORMANCE_VERSION,
  REQUIRED_METHODS,
  ALLOWED_OPERATIONS,
  validateAdapterShape,
  assertDryRunEvidence,
  evaluateAdapterConformance
});
