'use strict';

const { contractError } = require('./payment-provider-contract');

const CONTRACT_VERSION = 'pay-provider-adapter-v1';
const REQUIRED_METHODS = Object.freeze([
  'getManifest',
  'checkHealth',
  'createPaymentIntent',
  'getPaymentIntent',
  'normalizeIntentAcknowledgement',
  'normalizeWebhookEvent',
  'fetchPaymentSnapshot',
  'classifyError'
]);
const CAPABILITY_NAMES = Object.freeze([
  'authorize',
  'hold',
  'capture_release',
  'refund_total',
  'refund_partial',
  'cancellation',
  'dispute',
  'chargeback',
  'payout',
  'split',
  'signed_webhooks',
  'idempotency',
  'event_query',
  'settlement_query',
  'reconciliation'
]);
const REQUIRED_CAPABILITIES = Object.freeze([
  'authorize',
  'hold',
  'signed_webhooks',
  'idempotency',
  'reconciliation'
]);
const ERROR_CATEGORIES = Object.freeze([
  'transient',
  'rate_limited',
  'authentication',
  'conflict',
  'provider_unavailable',
  'incomplete_response',
  'permanent'
]);

function assertProviderAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw contractError('DOKE_PAYMENT_ADAPTER_UNAVAILABLE', 'Payment provider adapter is unavailable.', 503);
  }
  REQUIRED_METHODS.forEach((method) => {
    if (typeof adapter[method] !== 'function') {
      throw contractError('DOKE_PAYMENT_ADAPTER_METHOD_MISSING', `Payment adapter method is missing: ${method}.`, 500);
    }
  });
  return true;
}

function normalizeProviderAdapterManifest(input, requiredCurrency) {
  const source = plainObject(input, 'Adapter manifest is required.');
  if (text(source.adapterContractVersion, 'adapterContractVersion', 80) !== CONTRACT_VERSION) {
    throw contractError('DOKE_PAYMENT_ADAPTER_VERSION_UNSUPPORTED', 'Adapter contract version is unsupported.', 422);
  }
  const adapterVersion = text(source.adapterVersion, 'adapterVersion', 120);
  if (!/^[a-z0-9][a-z0-9._-]{2,118}[a-z0-9]$/i.test(adapterVersion)) {
    throw contractError('DOKE_PAYMENT_ADAPTER_IMMUTABLE_VERSION_INVALID', 'Adapter version must be immutable and explicit.', 422);
  }
  const providerKey = text(source.providerKey, 'providerKey', 80).toLowerCase();
  const financialCapabilities = normalizeCapabilities(source.financialCapabilities);
  REQUIRED_CAPABILITIES.forEach((capability) => {
    if (financialCapabilities[capability] !== true) {
      throw contractError('DOKE_PAYMENT_ADAPTER_CAPABILITY_MISSING', `Required adapter capability is missing: ${capability}.`, 422);
    }
  });
  const currencies = uniqueStrings(source.currencies, 'currencies', 3).map((item) => item.toUpperCase());
  const currency = String(requiredCurrency || 'BRL').trim().toUpperCase();
  if (!currencies.includes(currency)) {
    throw contractError('DOKE_PAYMENT_ADAPTER_CURRENCY_UNSUPPORTED', `Adapter does not support ${currency}.`, 422);
  }
  if (source.browserAccessible !== false
      || source.rawCardDataAccepted !== false
      || source.directMoneyMutationAllowed !== false
      || source.localUuidMutationFallbackAllowed !== false
      || source.secretResolution !== 'server_runtime_only'
      || source.settlementAuthority !== 'verified_provider_events_only') {
    throw contractError('DOKE_PAYMENT_ADAPTER_AUTHORITY_INVALID', 'Adapter manifest grants forbidden financial authority.', 422);
  }
  return Object.freeze({
    adapterContractVersion: CONTRACT_VERSION,
    adapterVersion,
    providerKey,
    financialCapabilities,
    currencies: Object.freeze(currencies),
    browserAccessible: false,
    rawCardDataAccepted: false,
    directMoneyMutationAllowed: false,
    localUuidMutationFallbackAllowed: false,
    secretResolution: 'server_runtime_only',
    settlementAuthority: 'verified_provider_events_only'
  });
}

function assertProviderCapability(manifest, capability) {
  const name = String(capability || '').trim();
  if (!CAPABILITY_NAMES.includes(name)) {
    throw contractError('DOKE_PAYMENT_ADAPTER_CAPABILITY_UNKNOWN', `Unknown adapter capability: ${name || 'empty'}.`, 422);
  }
  if (!manifest || !manifest.financialCapabilities || manifest.financialCapabilities[name] !== true) {
    throw contractError('DOKE_PAYMENT_ADAPTER_CAPABILITY_UNSUPPORTED', `Adapter capability is not supported: ${name}.`, 501);
  }
  return true;
}

function normalizeProviderHealth(input, expectedProviderKey) {
  const source = plainObject(input, 'Adapter health result is required.');
  const providerKey = text(source.providerKey, 'health.providerKey', 80).toLowerCase();
  if (expectedProviderKey && providerKey !== String(expectedProviderKey).trim().toLowerCase()) {
    throw contractError('DOKE_PAYMENT_ADAPTER_HEALTH_PROVIDER_MISMATCH', 'Adapter health provider does not match its manifest.', 409);
  }
  if (String(source.status || '').trim().toLowerCase() !== 'ready') {
    throw contractError('DOKE_PAYMENT_ADAPTER_HEALTH_NOT_READY', 'Adapter health/readiness did not pass.', 503);
  }
  if (source.effectFree !== true
      || source.networkAccessed !== false
      || source.remoteMutationPerformed !== false
      || source.moneyEffectPerformed !== false
      || source.productionAccessed !== false) {
    throw contractError('DOKE_PAYMENT_ADAPTER_HEALTH_EFFECT_INVALID', 'Adapter health must be effect-free and production-denied.', 422);
  }
  return Object.freeze({
    providerKey,
    status: 'ready',
    effectFree: true,
    networkAccessed: false,
    remoteMutationPerformed: false,
    moneyEffectPerformed: false,
    productionAccessed: false
  });
}

function normalizeErrorClassification(input, expectedCategory) {
  const source = plainObject(input, 'Adapter error classification is required.');
  const category = String(source.category || '').trim().toLowerCase();
  if (!ERROR_CATEGORIES.includes(category) || category !== expectedCategory) {
    throw contractError('DOKE_PAYMENT_ADAPTER_ERROR_CLASSIFICATION_INVALID', `Adapter error category must be ${expectedCategory}.`, 422);
  }
  const retryable = source.retryable === true;
  const safeToRetry = source.safeToRetry === true;
  const shouldRetry = ['transient', 'rate_limited', 'provider_unavailable'].includes(category);
  if (retryable !== shouldRetry || safeToRetry !== shouldRetry) {
    throw contractError('DOKE_PAYMENT_ADAPTER_RETRY_POLICY_INVALID', `Unsafe retry policy for ${category}.`, 422);
  }
  return Object.freeze({ category, retryable, safeToRetry });
}

function normalizeCapabilities(value) {
  const source = plainObject(value, 'Adapter financialCapabilities must be an explicit object.');
  const result = {};
  CAPABILITY_NAMES.forEach((name) => {
    if (typeof source[name] !== 'boolean') {
      throw contractError('DOKE_PAYMENT_ADAPTER_CAPABILITY_UNDECLARED', `Adapter capability must be declared: ${name}.`, 422);
    }
    result[name] = source[name];
  });
  Object.keys(source).forEach((name) => {
    if (!CAPABILITY_NAMES.includes(name)) {
      throw contractError('DOKE_PAYMENT_ADAPTER_CAPABILITY_UNKNOWN', `Unknown adapter capability: ${name}.`, 422);
    }
  });
  return Object.freeze(result);
}

function uniqueStrings(value, field, maxLength) {
  if (!Array.isArray(value) || value.length === 0) {
    throw contractError('DOKE_PAYMENT_ADAPTER_MANIFEST_INVALID', `${field} must be a non-empty array.`, 422);
  }
  return [...new Set(value.map((item) => text(item, field, maxLength)))];
}

function text(value, field, maxLength) {
  const result = String(value == null ? '' : value).trim();
  if (!result || result.length > maxLength || /[\u0000-\u001f\u007f]/.test(result)) {
    throw contractError('DOKE_PAYMENT_ADAPTER_MANIFEST_INVALID', `Adapter field ${field} is invalid.`, 422);
  }
  return result;
}

function plainObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('DOKE_PAYMENT_ADAPTER_INPUT_INVALID', message, 422);
  }
  return value;
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  REQUIRED_METHODS,
  CAPABILITY_NAMES,
  REQUIRED_CAPABILITIES,
  ERROR_CATEGORIES,
  assertProviderAdapter,
  normalizeProviderAdapterManifest,
  assertProviderCapability,
  normalizeProviderHealth,
  normalizeErrorClassification
});
