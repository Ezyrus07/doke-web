'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  ADAPTER_CONTRACT_VERSION,
  REQUIRED_CAPABILITIES,
  runPaymentProviderAdapterConformance
} = require('../backend/modules/payments/payment-provider-adapter-conformance');
const {
  NORMALIZED_EVENT_TYPES
} = require('../backend/modules/payments/provider-webhook-contract');
const {
  evaluatePaymentStagingReadiness,
  buildAuthorizedStagingPlan,
  assertStagingExecutionAuthorization
} = require('../backend/modules/payments/payment-staging-readiness');

const NOW_SECONDS = 1785762480;
const NOW_ISO = new Date(NOW_SECONDS * 1000).toISOString();
const HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const HASH = crypto.createHash('sha256').update('pay-a05').digest('hex');

function fixtureAdapter() {
  const intents = new Map();
  return {
    async getManifest() {
      return {
        adapterContractVersion: ADAPTER_CONTRACT_VERSION,
        providerKey: 'fixture-adapter',
        capabilities: REQUIRED_CAPABILITIES.slice(),
        currencies: ['BRL'],
        eventTypes: NORMALIZED_EVENT_TYPES.slice(),
        captureStrategies: ['authorize_then_hold'],
        browserAccessible: false,
        rawCardDataAccepted: false,
        directMoneyMutationAllowed: false,
        settlementAuthority: 'verified_provider_events_only',
        secretResolution: 'server_runtime_only'
      };
    },
    async createPaymentIntent(intent, context) {
      assert.equal(context.networkAllowed, false);
      assert.equal(context.remoteMutationAllowed, false);
      const existing = intents.get(intent.idempotencyKey);
      if (existing && existing.requestHash !== intent.requestHash) {
        const error = new Error('Payment intent idempotency drift.');
        error.code = 'DOKE_PAYMENT_ADAPTER_IDEMPOTENCY_CONFLICT';
        throw error;
      }
      if (existing) return existing.acknowledgement;
      const acknowledgement = {
        provider: 'fixture-adapter',
        providerIntentId: 'provider_intent_pay_a05_fixture',
        state: 'authorized',
        providerCreatedAt: NOW_ISO
      };
      intents.set(intent.idempotencyKey, {
        requestHash: intent.requestHash,
        acknowledgement
      });
      return acknowledgement;
    },
    async normalizeWebhookEvent(input) {
      if (!input.verification || input.verification.verified !== true) {
        const error = new Error('Verified signature is required.');
        error.code = 'DOKE_PAYMENT_ADAPTER_VERIFICATION_REQUIRED';
        throw error;
      }
      return {
        provider: 'fixture-adapter',
        eventId: input.payload.event_id,
        type: input.payload.event_type,
        occurredAt: input.payload.occurred_at,
        data: {
          intentKey: input.payload.intent_key,
          providerIntentId: input.payload.object_id,
          orderId: input.payload.order_id,
          paymentId: input.payload.payment_id
        }
      };
    },
    async fetchPaymentSnapshot(query, context) {
      assert.equal(context.productionAllowed, false);
      return {
        authority: 'provider',
        provider: query.provider,
        intentKey: query.intentKey,
        providerIntentId: query.providerIntentId,
        orderId: query.orderId,
        paymentId: 'payment_pay_a05_fixture',
        state: 'held',
        currency: 'BRL',
        grossAmountCents: 15000,
        feeAmountCents: 1500,
        netAmountCents: 13500,
        releasedAmountCents: 0,
        refundedAmountCents: 0,
        settlementReference: null,
        eventLedgerStatus: 'not_applicable',
        observedAt: NOW_ISO,
        providerUpdatedAt: NOW_ISO,
        metadata: { source: 'pay-a05-fixture-adapter' }
      };
    },
    async classifyError(error) {
      const code = String(error && error.code || '');
      if (code === 'ETIMEDOUT') return { category: 'transient', retryable: true, safeToRetry: true };
      if (code === 'RATE_LIMITED') return { category: 'rate_limited', retryable: true, safeToRetry: true };
      if (code === 'AUTHENTICATION_FAILED') return { category: 'authentication', retryable: false, safeToRetry: false };
      if (code === 'IDEMPOTENCY_CONFLICT') return { category: 'conflict', retryable: false, safeToRetry: false };
      return { category: 'permanent', retryable: false, safeToRetry: false };
    }
  };
}

async function expectReject(factory, code) {
  let caught = null;
  try {
    await factory();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `Expected ${code}.`);
  assert.equal(caught.code, code);
}

async function main() {
  const result = await runPaymentProviderAdapterConformance(fixtureAdapter(), {
    expectedProviderKey: 'fixture-adapter',
    requiredCurrency: 'BRL',
    nowSeconds: NOW_SECONDS,
    fixtureSecret: 'pay-a05-fixture-secret-32-bytes-minimum'
  });
  assert.equal(result.passed, true);
  assert.equal(result.providerKey, 'fixture-adapter');
  assert.equal(result.evidence.externalNetworkCalls, 0);
  assert.equal(result.evidence.remoteMutations, 0);
  assert.equal(result.evidence.moneyEffects, 0);
  assert.match(result.evidenceHash, /^[0-9a-f]{64}$/);
  assert.ok(result.checks.includes('intent_payload_drift'));
  assert.ok(result.checks.includes('provider_snapshot_reconciliation'));

  const blocked = evaluatePaymentStagingReadiness({
    repositoryContractsPassed: true,
    adapterConformancePassed: true,
    exactHead: HEAD,
    productionExplicitlyDenied: true,
    featureFlagsDisabled: true,
    adapterEvidenceHash: result.evidenceHash
  });
  assert.equal(blocked.readyForAuthorizedStagingExecution, false);
  assert.equal(blocked.activationPerformed, false);
  assert.equal(blocked.productionAllowed, false);
  assert.ok(blocked.blockers.includes('providerSelectionApproved'));
  assert.ok(blocked.blockers.includes('explicitOneShotStagingAuthorization'));
  await expectReject(
    () => Promise.resolve().then(() => buildAuthorizedStagingPlan(blocked)),
    'DOKE_PAYMENT_STAGING_READINESS_BLOCKED'
  );

  const ready = evaluatePaymentStagingReadiness({
    repositoryContractsPassed: true,
    adapterConformancePassed: true,
    exactHead: HEAD,
    providerSelectionApproved: true,
    legalAccountingApproved: true,
    providerSandboxAccountReady: true,
    serverCredentialsConfigured: true,
    webhookSecretConfigured: true,
    webhookEndpointRegistered: true,
    stagingProjectVerified: true,
    productionExplicitlyDenied: true,
    featureFlagsDisabled: true,
    reconciliationStoreReady: true,
    operatorQueueReady: true,
    rollbackPlanReady: true,
    evidencePlanReady: true,
    explicitOneShotStagingAuthorization: true,
    adapterEvidenceHash: result.evidenceHash,
    providerDecisionReference: 'fixture-provider-decision',
    legalAccountingReference: 'fixture-legal-accounting',
    authorizationReference: 'fixture-one-shot-authorization'
  });
  assert.equal(ready.readyForAuthorizedStagingExecution, true);
  assert.deepEqual(ready.blockers, []);

  const plan = buildAuthorizedStagingPlan(ready);
  assert.equal(plan.executableByRepositoryContract, false);
  assert.equal(plan.requiresFreshOneShotAuthorization, true);
  assert.equal(plan.productionAllowed, false);
  assert.equal(plan.remoteMutationAuthority, 'none_in_repository_contract');

  await expectReject(
    () => Promise.resolve().then(() => assertStagingExecutionAuthorization(plan, {
      exactHead: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      readinessEvidenceHash: plan.readinessEvidenceHash,
      oneShot: true,
      productionAllowed: false
    })),
    'DOKE_PAYMENT_STAGING_AUTHORIZATION_INVALID'
  );

  const authorization = assertStagingExecutionAuthorization(plan, {
    exactHead: plan.exactHead,
    readinessEvidenceHash: plan.readinessEvidenceHash,
    oneShot: true,
    productionAllowed: false
  });
  assert.equal(authorization.authorized, true);
  assert.equal(authorization.consumed, false);
  assert.equal(authorization.productionAllowed, false);

  console.log('PAY-A05 adapter conformance and staging readiness runtime test passed.');
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
