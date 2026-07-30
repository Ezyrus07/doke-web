#!/usr/bin/env node
'use strict';

const CONTRACT_VERSION = 'ord-a09b0-provider-adapter-v1';
const ALLOWED_PROVIDERS = Object.freeze(['railway', 'fly.io', 'render', 'vercel']);
const PROVIDER_SELECTION_PHRASES = Object.freeze({
  railway: 'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING',
  'fly.io': 'I_EXPLICITLY_SELECT_FLY_IO_FOR_DOKE_STAGING',
  render: 'I_EXPLICITLY_SELECT_RENDER_FOR_DOKE_STAGING',
  vercel: 'I_EXPLICITLY_SELECT_VERCEL_FOR_DOKE_STAGING'
});
const ABSTRACT_OPERATIONS = Object.freeze(['status', 'deploy', 'rollback']);

function normalize(value) {
  return String(value || '').trim();
}

function normalizeProvider(value) {
  return normalize(value).toLowerCase();
}

function freezeResult(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeResult));
  if (!value || typeof value !== 'object') return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, freezeResult(nestedValue)])
  ));
}

function readSelectionInput(env) {
  const source = env && typeof env === 'object' ? env : {};
  return freezeResult({
    environment: normalize(source.DOKE_ENVIRONMENT).toLowerCase(),
    provider: normalizeProvider(source.DOKE_STAGING_PROVIDER),
    acknowledgement: normalize(source.DOKE_STAGING_PROVIDER_SELECTION_ACK)
  });
}

function evaluateProviderSelection(env) {
  const input = readSelectionInput(env);
  const blockers = [];

  if (input.environment === 'prod' || input.environment === 'production') {
    blockers.push('production_environment_forbidden');
  } else if (input.environment && input.environment !== 'staging') {
    blockers.push('staging_environment_required');
  }

  if (!input.provider && !input.acknowledgement) {
    blockers.push('explicit_provider_selection_required');
  } else {
    if (!input.provider) blockers.push('provider_required');
    if (input.provider && !ALLOWED_PROVIDERS.includes(input.provider)) blockers.push('unsupported_provider');
    if (!input.acknowledgement) blockers.push('selection_acknowledgement_required');

    const expectedPhrase = PROVIDER_SELECTION_PHRASES[input.provider] || '';
    if (input.acknowledgement && expectedPhrase && input.acknowledgement !== expectedPhrase) {
      blockers.push('selection_acknowledgement_mismatch');
    }
  }

  const selectionValidated = blockers.length === 0;
  const status = selectionValidated
    ? 'selection_validated_provider_adapter_unbound'
    : 'provider_selection_required';

  return freezeResult({
    contractVersion: CONTRACT_VERSION,
    status,
    environment: input.environment || 'unset',
    provider: input.provider || null,
    providerSelected: selectionValidated,
    expectedSelectionPhrase: input.provider ? PROVIDER_SELECTION_PHRASES[input.provider] || null : null,
    genericNextMeansSelection: false,
    blockers: selectionValidated
      ? ['provider_specific_adapter_required', 'separate_deployment_authorization_required']
      : blockers,
    providerSpecificAdapterBound: false,
    deploymentAuthorized: false,
    productionAllowed: false
  });
}

function buildProviderNeutralPlan(env) {
  const selection = evaluateProviderSelection(env);
  return freezeResult({
    contractVersion: CONTRACT_VERSION,
    mode: 'dry-run',
    status: selection.providerSelected
      ? 'selection_validated_but_provider_adapter_required'
      : 'selection_unbound_no_provider_operations_available',
    selection,
    abstractOperations: ABSTRACT_OPERATIONS,
    commandsMaterialized: false,
    networkRequests: 0,
    mutations: 0,
    providerAccountCreated: false,
    billingAuthorized: false,
    secretsConfigured: false,
    deploymentPerformed: false,
    rollbackPerformed: false,
    productionChanged: false
  });
}

function assertProviderOperationUnavailable(operation) {
  const normalizedOperation = normalize(operation).toLowerCase();
  if (!ABSTRACT_OPERATIONS.includes(normalizedOperation)) {
    const error = new Error(`Unsupported provider operation: ${normalizedOperation || 'empty'}.`);
    error.code = 'DOKE_PROVIDER_OPERATION_UNSUPPORTED';
    error.status = 400;
    throw error;
  }

  const error = new Error(
    `Provider operation ${normalizedOperation} is unavailable until an explicitly selected provider-specific adapter and separate deployment authorization exist.`
  );
  error.code = 'DOKE_PROVIDER_ADAPTER_NOT_BOUND';
  error.status = 428;
  throw error;
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  ALLOWED_PROVIDERS,
  PROVIDER_SELECTION_PHRASES,
  ABSTRACT_OPERATIONS,
  readSelectionInput,
  evaluateProviderSelection,
  buildProviderNeutralPlan,
  assertProviderOperationUnavailable
});
