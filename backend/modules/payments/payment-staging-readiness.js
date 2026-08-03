'use strict';

const { contractError, hashCanonicalPayload } = require('./payment-provider-contract');

const READINESS_CONTRACT_VERSION = 'pay-staging-readiness-v1';
const ACTIVATION_PLAN_VERSION = 'pay-staging-activation-plan-v1';
const REQUIRED_CHECKS = Object.freeze([
  'repositoryContractsPassed',
  'adapterConformancePassed',
  'exactHeadPinned',
  'providerSelectionApproved',
  'legalAccountingApproved',
  'providerSandboxAccountReady',
  'serverCredentialsConfigured',
  'webhookSecretConfigured',
  'webhookEndpointRegistered',
  'stagingProjectVerified',
  'productionExplicitlyDenied',
  'featureFlagsDisabled',
  'reconciliationStoreReady',
  'operatorQueueReady',
  'rollbackPlanReady',
  'evidencePlanReady',
  'explicitOneShotStagingAuthorization'
]);
const EXECUTION_ORDER = Object.freeze([
  'verify_exact_head_and_staging_identity',
  'verify_provider_selection_and_legal_accounting_approval',
  'verify_server_credentials_and_signed_webhook_registration',
  'run_adapter_conformance_against_provider_sandbox',
  'run_idempotent_intent_and_duplicate_delivery_canaries',
  'run_out_of_order_and_terminal_state_canaries',
  'run_reconciliation_and_operator_queue_canaries',
  'review_sanitized_evidence_before_any_feature_flag_change'
]);

function evaluatePaymentStagingReadiness(input) {
  const source = plainObject(input, 'Payment staging readiness input is required.');
  const checks = Object.freeze({
    repositoryContractsPassed: source.repositoryContractsPassed === true,
    adapterConformancePassed: source.adapterConformancePassed === true,
    exactHeadPinned: isSha(source.exactHead),
    providerSelectionApproved: source.providerSelectionApproved === true,
    legalAccountingApproved: source.legalAccountingApproved === true,
    providerSandboxAccountReady: source.providerSandboxAccountReady === true,
    serverCredentialsConfigured: source.serverCredentialsConfigured === true,
    webhookSecretConfigured: source.webhookSecretConfigured === true,
    webhookEndpointRegistered: source.webhookEndpointRegistered === true,
    stagingProjectVerified: source.stagingProjectVerified === true,
    productionExplicitlyDenied: source.productionExplicitlyDenied === true,
    featureFlagsDisabled: source.featureFlagsDisabled === true,
    reconciliationStoreReady: source.reconciliationStoreReady === true,
    operatorQueueReady: source.operatorQueueReady === true,
    rollbackPlanReady: source.rollbackPlanReady === true,
    evidencePlanReady: source.evidencePlanReady === true,
    explicitOneShotStagingAuthorization: source.explicitOneShotStagingAuthorization === true
  });
  const blockers = REQUIRED_CHECKS.filter((check) => checks[check] !== true);
  const ready = blockers.length === 0;
  const evidence = Object.freeze({
    exactHead: isSha(source.exactHead) ? String(source.exactHead).toLowerCase() : null,
    adapterEvidenceHash: normalizeHash(source.adapterEvidenceHash),
    providerDecisionReference: optionalText(source.providerDecisionReference, 200),
    legalAccountingReference: optionalText(source.legalAccountingReference, 200),
    authorizationReference: optionalText(source.authorizationReference, 200)
  });
  return Object.freeze({
    contractVersion: READINESS_CONTRACT_VERSION,
    readyForAuthorizedStagingExecution: ready,
    activationPerformed: false,
    productionAllowed: false,
    remoteActionsAllowedByThisContract: false,
    failClosed: true,
    exactHead: evidence.exactHead,
    checks,
    blockers: Object.freeze(blockers),
    requiredExecutionOrder: EXECUTION_ORDER,
    evidence,
    evidenceHash: hashCanonicalPayload({ checks, blockers, evidence }),
    oneShotAuthorizationConsumed: false
  });
}

function buildAuthorizedStagingPlan(readinessInput) {
  const readiness = readinessInput && readinessInput.contractVersion === READINESS_CONTRACT_VERSION
    ? readinessInput
    : evaluatePaymentStagingReadiness(readinessInput);
  if (!readiness.readyForAuthorizedStagingExecution) {
    throw contractError(
      'DOKE_PAYMENT_STAGING_READINESS_BLOCKED',
      'Payment staging execution remains blocked by unmet readiness checks.',
      409
    );
  }
  return Object.freeze({
    contractVersion: ACTIVATION_PLAN_VERSION,
    exactHead: readiness.exactHead,
    readinessEvidenceHash: readiness.evidenceHash,
    executableByRepositoryContract: false,
    requiresExternalAuthorizedExecutor: true,
    requiresFreshOneShotAuthorization: true,
    productionAllowed: false,
    featureFlagsChangeAllowedBeforeEvidenceReview: false,
    remoteMutationAuthority: 'none_in_repository_contract',
    phases: readiness.requiredExecutionOrder
  });
}

function assertStagingExecutionAuthorization(plan, authorization) {
  const source = plainObject(authorization, 'Staging execution authorization is required.');
  if (!plan || plan.contractVersion !== ACTIVATION_PLAN_VERSION) {
    throw contractError('DOKE_PAYMENT_STAGING_PLAN_INVALID', 'A valid staging activation plan is required.', 422);
  }
  if (source.exactHead !== plan.exactHead
      || source.readinessEvidenceHash !== plan.readinessEvidenceHash
      || source.oneShot !== true
      || source.productionAllowed !== false) {
    throw contractError(
      'DOKE_PAYMENT_STAGING_AUTHORIZATION_INVALID',
      'Staging authorization must be one-shot, head-pinned and production-denied.',
      403
    );
  }
  return Object.freeze({
    authorized: true,
    oneShot: true,
    exactHead: plan.exactHead,
    readinessEvidenceHash: plan.readinessEvidenceHash,
    productionAllowed: false,
    consumed: false
  });
}

function normalizeHash(value) {
  const text = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(text) ? text : null;
}

function optionalText(value, maxLength) {
  const text = String(value == null ? '' : value).trim();
  return text ? text.slice(0, maxLength) : null;
}

function plainObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('DOKE_PAYMENT_STAGING_READINESS_INPUT_INVALID', message, 422);
  }
  return value;
}

function isSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || '').trim());
}

module.exports = Object.freeze({
  READINESS_CONTRACT_VERSION,
  ACTIVATION_PLAN_VERSION,
  REQUIRED_CHECKS,
  EXECUTION_ORDER,
  evaluatePaymentStagingReadiness,
  buildAuthorizedStagingPlan,
  assertStagingExecutionAuthorization
});
