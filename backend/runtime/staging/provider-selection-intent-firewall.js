#!/usr/bin/env node
'use strict';

const {
  PROVIDER_SELECTION_PHRASES,
  evaluateProviderSelection
} = require('./provider-adapter-contract');

const FIREWALL_VERSION = 'ord-a09b0-provider-selection-intent-firewall-v1';
const RAILWAY_PROVIDER = 'railway';
const REQUIRED_PHRASE = PROVIDER_SELECTION_PHRASES[RAILWAY_PROVIDER];
const GENERIC_CONTINUATIONS = Object.freeze([
  'proximo',
  'próximo',
  'pode prosseguir',
  'prosseguir',
  'continue',
  'continuar',
  'next'
]);

function deepFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze));
  if (!value || typeof value !== 'object') return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, deepFreeze(nested)])
  ));
}

function asText(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeForClassification(value) {
  return asText(value).trim().toLowerCase();
}

function evaluateSelectionIntent(input) {
  const source = input && typeof input === 'object' ? input : {};
  const command = asText(source.command);
  const environment = normalizeForClassification(source.environment) || 'unset';
  const provider = normalizeForClassification(source.provider) || RAILWAY_PROVIDER;
  const normalizedCommand = normalizeForClassification(command);
  const blockers = [];

  if (environment === 'prod' || environment === 'production') {
    blockers.push('production_environment_forbidden');
  } else if (environment !== 'staging') {
    blockers.push('staging_environment_required');
  }

  if (provider !== RAILWAY_PROVIDER) {
    blockers.push('railway_provider_required_for_this_gate');
  }

  if (!command) {
    blockers.push('exact_selection_phrase_required');
  } else if (GENERIC_CONTINUATIONS.includes(normalizedCommand)) {
    blockers.push('generic_continuation_is_non_authorizing');
  } else if (command !== REQUIRED_PHRASE) {
    blockers.push('exact_selection_phrase_mismatch');
  }

  const adapterPreparationAuthorized = blockers.length === 0;
  const neutralContract = adapterPreparationAuthorized
    ? evaluateProviderSelection({
        DOKE_ENVIRONMENT: 'staging',
        DOKE_STAGING_PROVIDER: RAILWAY_PROVIDER,
        DOKE_STAGING_PROVIDER_SELECTION_ACK: REQUIRED_PHRASE
      })
    : null;

  return deepFreeze({
    firewallVersion: FIREWALL_VERSION,
    status: adapterPreparationAuthorized
      ? 'exact_selection_intent_validated_adapter_preparation_only'
      : 'selection_intent_rejected_fail_closed',
    provider,
    environment,
    commandMatchedExactly: command === REQUIRED_PHRASE,
    genericContinuationDetected: GENERIC_CONTINUATIONS.includes(normalizedCommand),
    adapterPreparationAuthorized,
    providerSelectedForThisEvaluation: adapterPreparationAuthorized,
    canonicalSelectionPersisted: false,
    providerSpecificAdapterBound: false,
    providerAccountAuthorized: false,
    billingAuthorized: false,
    secretsAuthorized: false,
    infrastructureAuthorized: false,
    deploymentAuthorized: false,
    rollbackAuthorized: false,
    visualCanaryAuthorized: false,
    productionAllowed: false,
    networkRequests: 0,
    mutations: 0,
    blockers: adapterPreparationAuthorized
      ? [
          'provider_specific_adapter_required',
          'separate_account_and_billing_decision_required',
          'separate_deployment_authorization_required'
        ]
      : blockers,
    neutralContract
  });
}

function assertAdapterPreparationAuthorized(input) {
  const decision = evaluateSelectionIntent(input);
  if (!decision.adapterPreparationAuthorized) {
    const error = new Error('Railway adapter preparation requires the exact staging selection phrase.');
    error.code = 'DOKE_PROVIDER_SELECTION_INTENT_REJECTED';
    error.status = 428;
    error.decision = decision;
    throw error;
  }
  return decision;
}

module.exports = Object.freeze({
  FIREWALL_VERSION,
  RAILWAY_PROVIDER,
  REQUIRED_PHRASE,
  GENERIC_CONTINUATIONS,
  evaluateSelectionIntent,
  assertAdapterPreparationAuthorized
});
