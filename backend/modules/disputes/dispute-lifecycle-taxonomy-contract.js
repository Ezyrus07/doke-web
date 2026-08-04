'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'dsp-a02-canonical-lifecycle-effect-taxonomy-v1';

const CASE_STATES = Object.freeze([
  'pre_payment_cancellation_requested',
  'pre_payment_cancelled',
  'dispute_open',
  'counterparty_response_due',
  'evidence_collection',
  'operator_review',
  'decision_pending_approval',
  'decision_issued',
  'appeal_open',
  'appeal_review',
  'case_closed',
  'unmapped'
]);

const FINANCIAL_EFFECT_STATES = Object.freeze([
  'none',
  'release_blocked',
  'refund_proposed',
  'refund_authorized',
  'refund_submitted',
  'refund_confirmed',
  'release_proposed',
  'release_authorized',
  'release_submitted',
  'release_confirmed',
  'chargeback_pending',
  'chargeback_won',
  'chargeback_lost',
  'reconciliation_required',
  'effect_reversed',
  'unmapped'
]);

const PROVIDER_DISPUTE_STATES = Object.freeze([
  'not_applicable',
  'unknown',
  'notification_received',
  'evidence_due',
  'provider_review',
  'won',
  'lost',
  'reversed',
  'unmapped'
]);

const TERMINAL_CASE_STATES = Object.freeze([
  'pre_payment_cancelled',
  'case_closed'
]);

const TERMINAL_FINANCIAL_EFFECT_STATES = Object.freeze([
  'refund_confirmed',
  'release_confirmed',
  'chargeback_won',
  'chargeback_lost',
  'effect_reversed'
]);

const RAW_SENSITIVE_KEYS = Object.freeze([
  'card_number',
  'cardnumber',
  'pan',
  'cvv',
  'cvc',
  'security_code',
  'securitycode',
  'provider_secret',
  'providersecret',
  'api_key',
  'apikey',
  'authorization',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'bank_account_snapshot',
  'bankaccountsnapshot',
  'account_number',
  'accountnumber',
  'pix_key',
  'pixkey'
]);

const CASE_TRANSITIONS = Object.freeze({
  pre_payment_cancellation_requested: Object.freeze(['pre_payment_cancelled']),
  pre_payment_cancelled: Object.freeze([]),
  dispute_open: Object.freeze(['counterparty_response_due', 'evidence_collection']),
  counterparty_response_due: Object.freeze(['evidence_collection', 'operator_review']),
  evidence_collection: Object.freeze(['operator_review']),
  operator_review: Object.freeze(['decision_pending_approval']),
  decision_pending_approval: Object.freeze(['decision_issued']),
  decision_issued: Object.freeze(['appeal_open', 'case_closed']),
  appeal_open: Object.freeze(['appeal_review']),
  appeal_review: Object.freeze(['decision_pending_approval', 'case_closed']),
  case_closed: Object.freeze([]),
  unmapped: Object.freeze([])
});

const EFFECT_TRANSITIONS = Object.freeze({
  none: Object.freeze(['release_blocked']),
  release_blocked: Object.freeze(['refund_proposed', 'release_proposed', 'chargeback_pending']),
  refund_proposed: Object.freeze(['refund_authorized']),
  refund_authorized: Object.freeze(['refund_submitted']),
  refund_submitted: Object.freeze(['refund_confirmed', 'reconciliation_required']),
  refund_confirmed: Object.freeze(['effect_reversed']),
  release_proposed: Object.freeze(['release_authorized']),
  release_authorized: Object.freeze(['release_submitted']),
  release_submitted: Object.freeze(['release_confirmed', 'reconciliation_required']),
  release_confirmed: Object.freeze(['effect_reversed']),
  chargeback_pending: Object.freeze(['chargeback_won', 'chargeback_lost', 'reconciliation_required']),
  chargeback_won: Object.freeze(['effect_reversed']),
  chargeback_lost: Object.freeze(['effect_reversed']),
  reconciliation_required: Object.freeze([
    'refund_confirmed',
    'release_confirmed',
    'chargeback_won',
    'chargeback_lost',
    'effect_reversed'
  ]),
  effect_reversed: Object.freeze([]),
  unmapped: Object.freeze([])
});

const PROVIDER_TRANSITIONS = Object.freeze({
  not_applicable: Object.freeze([]),
  unknown: Object.freeze(['notification_received']),
  notification_received: Object.freeze(['evidence_due', 'provider_review']),
  evidence_due: Object.freeze(['provider_review']),
  provider_review: Object.freeze(['won', 'lost', 'reversed']),
  won: Object.freeze(['reversed']),
  lost: Object.freeze(['reversed']),
  reversed: Object.freeze([]),
  unmapped: Object.freeze([])
});

const LEGACY_CASE_MAP = Object.freeze({
  cancel_requested: 'pre_payment_cancellation_requested',
  cancellation_requested: 'pre_payment_cancellation_requested',
  client_cancelled_before_payment: 'pre_payment_cancelled',
  professional_cancelled_before_payment: 'pre_payment_cancelled',
  cancelled_before_payment: 'pre_payment_cancelled',
  cancelado_antes_pagamento: 'pre_payment_cancelled',
  contestacao_aberta: 'dispute_open',
  contestacao: 'dispute_open',
  open: 'dispute_open',
  disputed: 'dispute_open',
  aguardando_resposta: 'counterparty_response_due',
  counterparty_response_due: 'counterparty_response_due',
  evidencias: 'evidence_collection',
  evidence_collection: 'evidence_collection',
  em_analise: 'operator_review',
  analise: 'operator_review',
  under_review: 'operator_review',
  decision_pending: 'decision_pending_approval',
  decisao_pendente: 'decision_pending_approval',
  reembolsado: 'decision_issued',
  refunded: 'decision_issued',
  resolvida_profissional: 'decision_issued',
  released: 'decision_issued',
  decisao_emitida: 'decision_issued',
  appeal_open: 'appeal_open',
  recurso_aberto: 'appeal_open',
  appeal_review: 'appeal_review',
  recurso_em_analise: 'appeal_review',
  resolved: 'case_closed',
  closed: 'case_closed',
  encerrado: 'case_closed'
});

const LEGACY_EFFECT_MAP = Object.freeze({
  none: 'none',
  no_financial_effect: 'none',
  held: 'release_blocked',
  blocked_by_dispute: 'release_blocked',
  refund_proposed: 'refund_proposed',
  refund_pending: 'refund_proposed',
  refund_authorized: 'refund_authorized',
  refund_submitted: 'refund_submitted',
  refunded: 'reconciliation_required',
  reembolsado: 'reconciliation_required',
  release_proposed: 'release_proposed',
  release_pending: 'release_proposed',
  release_authorized: 'release_authorized',
  release_submitted: 'release_submitted',
  released: 'reconciliation_required',
  liberado: 'reconciliation_required',
  chargeback: 'chargeback_pending',
  chargeback_pending: 'chargeback_pending',
  chargeback_won: 'reconciliation_required',
  chargeback_lost: 'reconciliation_required',
  provider_mismatch: 'reconciliation_required',
  reversed: 'effect_reversed',
  estornado: 'effect_reversed'
});

const LEGACY_PROVIDER_MAP = Object.freeze({
  not_applicable: 'not_applicable',
  none: 'not_applicable',
  unknown: 'unknown',
  received: 'notification_received',
  notification_received: 'notification_received',
  evidence_due: 'evidence_due',
  provider_review: 'provider_review',
  under_review: 'provider_review',
  won: 'won',
  lost: 'lost',
  reversed: 'reversed'
});

function normalizeToken(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function canonicalize(value, allowed, legacyMap) {
  const token = normalizeToken(value);
  if (!token) return 'unmapped';
  if (allowed.includes(token)) return token;
  return legacyMap[token] || 'unmapped';
}

function canonicalizeCaseState(value) {
  return canonicalize(value, CASE_STATES, LEGACY_CASE_MAP);
}

function canonicalizeFinancialEffectState(value) {
  return canonicalize(value, FINANCIAL_EFFECT_STATES, LEGACY_EFFECT_MAP);
}

function canonicalizeProviderDisputeState(value) {
  return canonicalize(value, PROVIDER_DISPUTE_STATES, LEGACY_PROVIDER_MAP);
}

function stableSerialize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function findSensitivePaths(value, path, found) {
  const currentPath = path || '$';
  const result = found || [];
  if (value === null || value === undefined) return result;
  if (Array.isArray(value)) {
    value.forEach((item, index) => findSensitivePaths(item, `${currentPath}[${index}]`, result));
    return result;
  }
  if (typeof value !== 'object') return result;
  Object.keys(value).forEach((key) => {
    const normalized = normalizeToken(key).replace(/_/g, '');
    if (RAW_SENSITIVE_KEYS.some((candidate) => candidate.replace(/_/g, '') === normalized)) {
      result.push(`${currentPath}.${key}`);
    }
    findSensitivePaths(value[key], `${currentPath}.${key}`, result);
  });
  return result;
}

function assertNoRawSensitiveData(value) {
  const sensitivePaths = findSensitivePaths(value);
  if (sensitivePaths.length) {
    const error = new Error(`Raw sensitive data is prohibited: ${sensitivePaths.join(', ')}`);
    error.code = 'DSP_RAW_SENSITIVE_DATA';
    error.paths = sensitivePaths;
    throw error;
  }
  return true;
}

function createLifecycleSnapshot(input) {
  const source = input || {};
  assertNoRawSensitiveData(source);
  const caseState = canonicalizeCaseState(source.caseState || source.disputeStatus || source.status);
  const financialEffectState = canonicalizeFinancialEffectState(
    source.financialEffectState || source.releaseStatus || source.paymentStatus || source.effectState
  );
  const providerDisputeState = canonicalizeProviderDisputeState(
    source.providerDisputeState || source.providerStatus || 'not_applicable'
  );

  const snapshotCore = {
    contractId: CONTRACT_ID,
    caseId: String(source.caseId || source.disputeId || ''),
    orderId: String(source.orderId || ''),
    transactionId: String(source.transactionId || ''),
    caseState,
    financialEffectState,
    providerDisputeState,
    revision: Number.isInteger(source.revision) && source.revision >= 0 ? source.revision : 0,
    policyRevision: String(source.policyRevision || ''),
    evidenceFingerprint: String(source.evidenceFingerprint || ''),
    decisionFingerprint: String(source.decisionFingerprint || ''),
    observedAt: String(source.observedAt || '')
  };

  return Object.freeze({
    ...snapshotCore,
    fingerprint: sha256(stableSerialize(snapshotCore)),
    authority: Object.freeze({
      contractAuthority: true,
      runtimeMutationAuthority: false,
      refundAuthority: false,
      releaseAuthority: false,
      chargebackAuthority: false,
      providerEvidenceAuthority: false,
      stagingAuthority: false,
      realMoneyAuthority: false,
      productionAuthority: false
    })
  });
}

function hasAll(context, keys) {
  const source = context || {};
  return keys.every((key) => source[key] === true);
}

function transitionRequirements(axis, from, to) {
  if (axis === 'case') {
    if (to === 'pre_payment_cancelled') {
      return ['paymentNotStarted', 'noFinancialEffect', 'actorAuthorized', 'auditRecorded'];
    }
    if (to === 'dispute_open' || to === 'counterparty_response_due') {
      return ['authenticatedParticipant', 'linkedOrderValidated', 'linkedTransactionValidated', 'idempotencyVerified'];
    }
    if (to === 'operator_review') {
      return ['evidenceWindowResolved', 'operatorQueueAssigned', 'auditRecorded'];
    }
    if (to === 'decision_pending_approval') {
      return ['evidenceComplete', 'policyRevisionBound', 'operatorAuthorized', 'auditRecorded'];
    }
    if (to === 'decision_issued') {
      return [
        'approvedPolicy',
        'operatorAuthorized',
        'separationOfDuties',
        'auditRecorded',
        'evidenceComplete',
        'immutableDecisionVersion',
        'idempotencyVerified'
      ];
    }
    if (to === 'appeal_open') {
      return ['approvedPolicy', 'appealWithinDeadline', 'immutablePriorDecision', 'actorAuthorized', 'auditRecorded'];
    }
    if (to === 'case_closed') {
      return ['approvedPolicy', 'immutableDecisionVersion', 'auditRecorded', 'financialEffectResolved'];
    }
  }

  if (axis === 'effect') {
    if (to === 'release_blocked') {
      return ['linkedTransactionValidated', 'idempotencyVerified', 'auditRecorded'];
    }
    if (to === 'refund_proposed' || to === 'release_proposed') {
      return ['approvedPolicy', 'evidenceComplete', 'operatorAuthorized', 'auditRecorded'];
    }
    if (to === 'refund_authorized' || to === 'release_authorized') {
      return [
        'approvedPolicy',
        'operatorAuthorized',
        'separationOfDuties',
        'immutableDecisionVersion',
        'idempotencyVerified',
        'auditRecorded'
      ];
    }
    if (to === 'refund_submitted' || to === 'release_submitted') {
      return ['providerSelected', 'providerCommandAuthenticated', 'idempotencyVerified', 'amountCurrencyMatched'];
    }
    if (to === 'refund_confirmed' || to === 'release_confirmed') {
      return [
        'providerEvidenceAuthenticated',
        'reconciliationMatched',
        'amountCurrencyMatched',
        'idempotencyVerified',
        'auditRecorded'
      ];
    }
    if (to === 'chargeback_pending') {
      return ['providerEvidenceAuthenticated', 'linkedTransactionValidated', 'auditRecorded'];
    }
    if (to === 'chargeback_won' || to === 'chargeback_lost') {
      return [
        'providerEvidenceAuthenticated',
        'providerEventFinal',
        'reconciliationMatched',
        'amountCurrencyMatched',
        'auditRecorded'
      ];
    }
    if (to === 'effect_reversed') {
      return ['providerEvidenceAuthenticated', 'reconciliationMatched', 'immutablePriorDecision', 'auditRecorded'];
    }
  }

  if (axis === 'provider') {
    if (to === 'notification_received') {
      return ['providerEvidenceAuthenticated', 'providerEventUnique', 'auditRecorded'];
    }
    if (to === 'evidence_due' || to === 'provider_review') {
      return ['providerEvidenceAuthenticated', 'providerDeadlineBound', 'auditRecorded'];
    }
    if (to === 'won' || to === 'lost' || to === 'reversed') {
      return ['providerEvidenceAuthenticated', 'providerEventFinal', 'reconciliationMatched', 'auditRecorded'];
    }
  }

  return [];
}

function getTransitions(axis) {
  if (axis === 'case') return CASE_TRANSITIONS;
  if (axis === 'effect') return EFFECT_TRANSITIONS;
  if (axis === 'provider') return PROVIDER_TRANSITIONS;
  throw Object.assign(new Error(`Unknown lifecycle axis: ${axis}`), { code: 'DSP_UNKNOWN_AXIS' });
}

function normalizeStateForAxis(axis, value) {
  if (axis === 'case') return canonicalizeCaseState(value);
  if (axis === 'effect') return canonicalizeFinancialEffectState(value);
  if (axis === 'provider') return canonicalizeProviderDisputeState(value);
  throw Object.assign(new Error(`Unknown lifecycle axis: ${axis}`), { code: 'DSP_UNKNOWN_AXIS' });
}

function validateTransition(input) {
  const source = input || {};
  assertNoRawSensitiveData(source);
  const axis = normalizeToken(source.axis);
  const transitions = getTransitions(axis);
  const from = normalizeStateForAxis(axis, source.from);
  const to = normalizeStateForAxis(axis, source.to);
  const required = transitionRequirements(axis, from, to);
  const missing = required.filter((key) => !(source.context && source.context[key] === true));
  const structurallyAllowed = from !== 'unmapped'
    && to !== 'unmapped'
    && Array.isArray(transitions[from])
    && transitions[from].includes(to);

  const allowed = structurallyAllowed && missing.length === 0;
  return Object.freeze({
    contractId: CONTRACT_ID,
    axis,
    from,
    to,
    structurallyAllowed,
    allowed,
    required: Object.freeze(required.slice()),
    missing: Object.freeze(missing),
    runtimeAuthorityGranted: false,
    reason: !structurallyAllowed
      ? 'transition_not_allowed'
      : missing.length
        ? 'required_evidence_missing'
        : 'contract_transition_valid_runtime_authority_still_absent'
  });
}

function canCloseCase(snapshot, context) {
  const current = snapshot || {};
  const source = context || {};
  const caseState = canonicalizeCaseState(current.caseState);
  const effectState = canonicalizeFinancialEffectState(current.financialEffectState);

  if (caseState === 'pre_payment_cancelled') {
    return source.paymentNotStarted === true && effectState === 'none';
  }

  return caseState === 'decision_issued'
    && TERMINAL_FINANCIAL_EFFECT_STATES.includes(effectState)
    && hasAll(source, [
      'approvedPolicy',
      'immutableDecisionVersion',
      'auditRecorded',
      'reconciliationMatched'
    ]);
}

function classifyLegacyTerminalClaim(input) {
  const snapshot = createLifecycleSnapshot(input);
  const terminalClaim = ['refunded', 'released', 'reembolsado', 'liberado', 'chargeback_won', 'chargeback_lost']
    .includes(normalizeToken(
      input && (input.financialEffectState || input.releaseStatus || input.paymentStatus || input.effectState)
    ));

  return Object.freeze({
    terminalClaim,
    snapshot,
    requiresReconciliation: terminalClaim && snapshot.financialEffectState === 'reconciliation_required',
    productionAuthorityGranted: false
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  CASE_STATES,
  FINANCIAL_EFFECT_STATES,
  PROVIDER_DISPUTE_STATES,
  TERMINAL_CASE_STATES,
  TERMINAL_FINANCIAL_EFFECT_STATES,
  CASE_TRANSITIONS,
  EFFECT_TRANSITIONS,
  PROVIDER_TRANSITIONS,
  normalizeToken,
  canonicalizeCaseState,
  canonicalizeFinancialEffectState,
  canonicalizeProviderDisputeState,
  stableSerialize,
  sha256,
  findSensitivePaths,
  assertNoRawSensitiveData,
  createLifecycleSnapshot,
  transitionRequirements,
  validateTransition,
  canCloseCase,
  classifyLegacyTerminalClaim
});
