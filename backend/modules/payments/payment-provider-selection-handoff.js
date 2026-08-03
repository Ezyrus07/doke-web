'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'pay-provider-selection-handoff-v1';
const SELECTION_SCOPE = 'provider_specific_adapter_preparation_only';
const STAGING_SCOPE = 'provider_sandbox_conformance_only';
const SELECTION_PHRASE = 'I_EXPLICITLY_SELECT_PSP_CANDIDATE_FOR_DOKE_STAGING_ADAPTER_PREPARATION';
const STAGING_PHRASE = 'I_EXPLICITLY_AUTHORIZE_PAY_A06_PROVIDER_SANDBOX_CONFORMANCE_ON_DOKE_STAGING';
const MAX_AUTHORIZATION_AGE_SECONDS = 900;

const REQUIRED_EVALUATION_DIMENSIONS = Object.freeze([
  'regulatory_and_marketplace_fit',
  'funds_flow_and_hold_model',
  'capture_refund_dispute_chargeback',
  'payout_split_and_recipient_onboarding',
  'signed_webhooks_idempotency_and_event_query',
  'settlement_and_reconciliation_exports',
  'pricing_reserves_minimums_and_exit_costs',
  'security_privacy_lgpd_and_pci_scope',
  'sandbox_sla_support_and_incident_response',
  'contract_termination_data_portability_and_insolvency'
]);

const REQUIRED_APPROVAL_ROLES = Object.freeze([
  'legal',
  'accounting_tax',
  'finance_treasury',
  'security_privacy',
  'product_operations'
]);

const REQUIRED_POLICY_DECISIONS = Object.freeze([
  'commercial_model',
  'tax_and_fiscal_responsibility',
  'funds_flow_and_escrow_classification',
  'refund_and_cancellation_rules',
  'dispute_and_chargeback_rules',
  'payout_and_split_rules',
  'kyc_aml_and_recipient_onboarding',
  'privacy_security_and_retention',
  'reconciliation_and_accounting_controls',
  'contract_exit_and_contingency'
]);

const PROHIBITED_SELECTION_EFFECTS = Object.freeze([
  'provider_account_creation',
  'contract_signature',
  'billing_or_paid_plan',
  'secret_injection',
  'webhook_registration',
  'provider_api_or_cli_calls',
  'migration_application',
  'deployment',
  'sandbox_payment_creation',
  'refund',
  'payout',
  'dispute',
  'production_change'
]);

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function assertObject(value, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(code, `${label} must be an object`);
  }
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCandidateId(value) {
  const candidateId = normalizeString(value).toLowerCase();
  if (!/^psp-candidate-[a-z0-9][a-z0-9-]{2,63}$/.test(candidateId)) {
    fail('DOKE_PAYMENT_PROVIDER_DECISION_PACKET_INVALID', 'candidateId must be an opaque psp-candidate-* identifier');
  }
  return candidateId;
}

function normalizeGitHead(value) {
  const head = normalizeString(value).toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(head)) {
    fail('DOKE_PAYMENT_PROVIDER_DECISION_PACKET_INVALID', 'exactGitHead must be a 40-character commit SHA');
  }
  return head;
}

function parseTimestamp(value, label) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    fail('DOKE_PAYMENT_PROVIDER_DECISION_PACKET_INVALID', `${label} must be an ISO timestamp`);
  }
  return timestamp;
}

function stableNormalize(value) {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = stableNormalize(value[key]);
        return result;
      }, {});
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableNormalize(value));
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function buildDecisionPacket(input) {
  assertObject(input, 'DOKE_PAYMENT_PROVIDER_DECISION_PACKET_INVALID', 'decision packet');
  const candidateId = normalizeCandidateId(input.candidateId);
  const exactGitHead = normalizeGitHead(input.exactGitHead);
  const packetVersion = normalizeString(input.packetVersion);
  if (!/^pay-psp-decision-v\d+$/.test(packetVersion)) {
    fail('DOKE_PAYMENT_PROVIDER_DECISION_PACKET_INVALID', 'packetVersion must be immutable and versioned');
  }

  const normalized = {
    contractVersion: CONTRACT_VERSION,
    packetVersion,
    candidateId,
    exactGitHead,
    createdAt: new Date(parseTimestamp(input.createdAt, 'createdAt')).toISOString(),
    expiresAt: new Date(parseTimestamp(input.expiresAt, 'expiresAt')).toISOString(),
    evaluation: input.evaluation || {},
    policyDecisions: input.policyDecisions || {},
    approvals: input.approvals || {},
    unresolvedBlockers: Array.isArray(input.unresolvedBlockers) ? [...input.unresolvedBlockers] : [],
    advisoryScore: Number.isFinite(input.advisoryScore) ? input.advisoryScore : null,
    automaticSelectionAllowed: false,
    selected: false,
    selectionAuthority: 'none',
    networkAccess: false,
    remoteMutationAuthority: 'none',
    productionAllowed: false
  };

  normalized.packetFingerprint = sha256(stableStringify(normalized));
  return normalized;
}

function evaluateDecisionPacket(packet, options = {}) {
  assertObject(packet, 'DOKE_PAYMENT_PROVIDER_DECISION_PACKET_INVALID', 'decision packet');
  const nowMs = options.now ? parseTimestamp(options.now, 'now') : Date.now();
  const reasons = [];

  if (packet.contractVersion !== CONTRACT_VERSION) reasons.push('contract_version_mismatch');
  if (packet.selected !== false || packet.selectionAuthority !== 'none') reasons.push('selection_authority_must_remain_absent');
  if (packet.automaticSelectionAllowed !== false) reasons.push('automatic_selection_must_be_forbidden');
  if (packet.networkAccess !== false || packet.remoteMutationAuthority !== 'none') reasons.push('repository_only_boundary_violated');
  if (packet.productionAllowed !== false) reasons.push('production_must_be_denied');
  if (parseTimestamp(packet.expiresAt, 'expiresAt') <= nowMs) reasons.push('decision_packet_expired');

  for (const dimension of REQUIRED_EVALUATION_DIMENSIONS) {
    const item = packet.evaluation && packet.evaluation[dimension];
    if (!item || !['supported', 'conditional'].includes(item.status)) {
      reasons.push(`evaluation_missing_or_unsupported:${dimension}`);
      continue;
    }
    if (!normalizeString(item.evidenceRef)) reasons.push(`evaluation_evidence_missing:${dimension}`);
    if (item.status === 'conditional' && !normalizeString(item.mitigation)) {
      reasons.push(`conditional_mitigation_missing:${dimension}`);
    }
  }

  for (const policy of REQUIRED_POLICY_DECISIONS) {
    const item = packet.policyDecisions && packet.policyDecisions[policy];
    if (!item || item.status !== 'approved') {
      reasons.push(`policy_not_approved:${policy}`);
      continue;
    }
    if (!normalizeString(item.decisionRef)) reasons.push(`policy_decision_reference_missing:${policy}`);
  }

  const distinctApprovers = new Set();
  for (const role of REQUIRED_APPROVAL_ROLES) {
    const approval = packet.approvals && packet.approvals[role];
    if (!approval || approval.status !== 'approved') {
      reasons.push(`approval_missing:${role}`);
      continue;
    }
    const approverId = normalizeString(approval.approverId);
    if (!approverId) reasons.push(`approver_identity_missing:${role}`);
    else distinctApprovers.add(approverId);
    if (!normalizeString(approval.rationale)) reasons.push(`approval_rationale_missing:${role}`);
    if (parseTimestamp(approval.expiresAt, `${role}.expiresAt`) <= nowMs) reasons.push(`approval_expired:${role}`);
  }
  if (distinctApprovers.size < 3) reasons.push('insufficient_separation_of_duties');
  if ((packet.unresolvedBlockers || []).length > 0) reasons.push('unresolved_blockers_present');
  if (!Number.isFinite(packet.advisoryScore)) reasons.push('advisory_score_missing');
  if (Number.isFinite(packet.advisoryScore) && (packet.advisoryScore < 0 || packet.advisoryScore > 100)) reasons.push('advisory_score_out_of_range');

  const expectedFingerprint = sha256(stableStringify({ ...packet, packetFingerprint: undefined }));
  if (packet.packetFingerprint !== expectedFingerprint) reasons.push('packet_fingerprint_drift');

  return {
    contractVersion: CONTRACT_VERSION,
    candidateId: packet.candidateId,
    packetFingerprint: packet.packetFingerprint,
    readyForExplicitSelection: reasons.length === 0,
    selected: false,
    automaticSelectionAllowed: false,
    blockingReasons: reasons,
    advisoryScore: packet.advisoryScore,
    scoreMaySelectProvider: false,
    remoteActionsAllowedByThisContract: false
  };
}

function buildSelectionChallenge(packet, options = {}) {
  const readiness = evaluateDecisionPacket(packet, options);
  if (!readiness.readyForExplicitSelection) {
    fail('DOKE_PAYMENT_PROVIDER_SELECTION_BLOCKED', 'provider selection is blocked by an incomplete decision packet', readiness);
  }
  return {
    contractVersion: CONTRACT_VERSION,
    phrase: SELECTION_PHRASE,
    scope: SELECTION_SCOPE,
    candidateId: packet.candidateId,
    packetFingerprint: packet.packetFingerprint,
    exactGitHead: packet.exactGitHead,
    oneShotRequired: true,
    maxAgeSeconds: MAX_AUTHORIZATION_AGE_SECONDS,
    productionAllowed: false,
    prohibitedEffects: [...PROHIBITED_SELECTION_EFFECTS],
    remoteActionsAllowedByThisContract: false
  };
}

function validateFreshOneShotAuthorization(challenge, authorization, options, code) {
  assertObject(authorization, code, 'authorization');
  const nowMs = options && options.now ? parseTimestamp(options.now, 'now') : Date.now();
  const issuedAtMs = parseTimestamp(authorization.issuedAt, 'issuedAt');
  const expiresAtMs = parseTimestamp(authorization.expiresAt, 'expiresAt');
  const ledger = options && options.consumedNonces;
  const nonce = normalizeString(authorization.nonce);

  if (!nonce) fail(code, 'authorization nonce is required');
  if (!(ledger instanceof Set)) fail(code, 'a one-shot nonce ledger is required');
  if (ledger.has(nonce)) fail('DOKE_PAYMENT_PROVIDER_AUTHORIZATION_REPLAYED', 'authorization nonce has already been consumed');
  if (authorization.oneShot !== true) fail(code, 'authorization must be one-shot');
  if (authorization.productionAllowed !== false) fail(code, 'production must be explicitly denied');
  if (issuedAtMs > nowMs || expiresAtMs <= nowMs) fail(code, 'authorization is not fresh');
  if ((nowMs - issuedAtMs) / 1000 > challenge.maxAgeSeconds) fail(code, 'authorization exceeded the maximum age');
  if (expiresAtMs - issuedAtMs > challenge.maxAgeSeconds * 1000) fail(code, 'authorization validity window is too wide');
  return { ledger, nonce };
}

function validateSelectionAuthorization(challenge, authorization, options = {}) {
  assertObject(challenge, 'DOKE_PAYMENT_PROVIDER_SELECTION_AUTHORIZATION_INVALID', 'selection challenge');
  const { ledger, nonce } = validateFreshOneShotAuthorization(
    challenge,
    authorization,
    options,
    'DOKE_PAYMENT_PROVIDER_SELECTION_AUTHORIZATION_INVALID'
  );

  const exactMatches =
    authorization.phrase === challenge.phrase &&
    authorization.scope === challenge.scope &&
    authorization.candidateId === challenge.candidateId &&
    authorization.packetFingerprint === challenge.packetFingerprint &&
    normalizeString(authorization.exactGitHead).toLowerCase() === challenge.exactGitHead;
  if (!exactMatches) {
    fail('DOKE_PAYMENT_PROVIDER_SELECTION_AUTHORIZATION_INVALID', 'selection authorization is not resource-bound to the exact challenge');
  }

  ledger.add(nonce);
  return {
    authorized: true,
    selectedCandidateId: challenge.candidateId,
    packetFingerprint: challenge.packetFingerprint,
    exactGitHead: challenge.exactGitHead,
    scope: challenge.scope,
    allowedEffects: [
      'create_provider_specific_adapter_source_without_secrets',
      'define_environment_variable_names_without_values',
      'run_local_adapter_tests_without_network'
    ],
    prohibitedEffects: [...challenge.prohibitedEffects],
    remoteActionsAllowedByThisContract: false,
    requiresSeparateOperationalAuthorizations: true,
    productionAllowed: false
  };
}

function buildStagingAuthorizationChallenge(selection, input) {
  assertObject(selection, 'DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'selection result');
  assertObject(input, 'DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'staging challenge input');
  if (selection.authorized !== true || selection.scope !== SELECTION_SCOPE) {
    fail('DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'explicit provider selection is required first');
  }

  const adapterVersion = normalizeString(input.adapterVersion);
  const stagingProjectId = normalizeString(input.stagingProjectId);
  const readinessEvidenceHash = normalizeString(input.readinessEvidenceHash).toLowerCase();
  if (!/^pay-adapter-[a-z0-9.-]+$/.test(adapterVersion)) fail('DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'immutable adapterVersion is required');
  if (!/^staging-[a-z0-9-]{3,64}$/.test(stagingProjectId)) fail('DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'stagingProjectId must identify staging only');
  if (!/^[a-f0-9]{64}$/.test(readinessEvidenceHash)) fail('DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'readinessEvidenceHash must be SHA-256');
  if (input.productionExplicitlyDenied !== true) fail('DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'production must be explicitly denied');
  if (input.sandboxMode !== true && input.maximumBudgetMinor !== 0) fail('DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'sandbox mode or zero maximum budget is required');

  return {
    contractVersion: CONTRACT_VERSION,
    phrase: STAGING_PHRASE,
    scope: STAGING_SCOPE,
    candidateId: selection.selectedCandidateId,
    packetFingerprint: selection.packetFingerprint,
    exactGitHead: selection.exactGitHead,
    adapterVersion,
    stagingProjectId,
    readinessEvidenceHash,
    oneShotRequired: true,
    maxAgeSeconds: MAX_AUTHORIZATION_AGE_SECONDS,
    sandboxMode: input.sandboxMode === true,
    maximumBudgetMinor: Number.isFinite(input.maximumBudgetMinor) ? input.maximumBudgetMinor : null,
    productionAllowed: false,
    remoteActionsAllowedByThisContract: false,
    requiresExternalAuthorizedExecutor: true
  };
}

function validateStagingAuthorization(challenge, authorization, options = {}) {
  assertObject(challenge, 'DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'staging challenge');
  const { ledger, nonce } = validateFreshOneShotAuthorization(
    challenge,
    authorization,
    options,
    'DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID'
  );

  const fields = [
    'phrase',
    'scope',
    'candidateId',
    'packetFingerprint',
    'exactGitHead',
    'adapterVersion',
    'stagingProjectId',
    'readinessEvidenceHash'
  ];
  if (fields.some((field) => authorization[field] !== challenge[field])) {
    fail('DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'staging authorization is not bound to the exact immutable resources');
  }
  if (authorization.sandboxMode !== challenge.sandboxMode || authorization.maximumBudgetMinor !== challenge.maximumBudgetMinor) {
    fail('DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID', 'sandbox and budget constraints drifted');
  }

  ledger.add(nonce);
  return {
    authorizationValidated: true,
    scope: challenge.scope,
    candidateId: challenge.candidateId,
    exactGitHead: challenge.exactGitHead,
    adapterVersion: challenge.adapterVersion,
    stagingProjectId: challenge.stagingProjectId,
    readinessEvidenceHash: challenge.readinessEvidenceHash,
    oneShot: true,
    productionAllowed: false,
    remoteActionsAllowedByThisContract: false,
    requiresExternalAuthorizedExecutor: true,
    repositoryExecutionPerformed: false
  };
}

module.exports = {
  CONTRACT_VERSION,
  SELECTION_SCOPE,
  STAGING_SCOPE,
  SELECTION_PHRASE,
  STAGING_PHRASE,
  MAX_AUTHORIZATION_AGE_SECONDS,
  REQUIRED_EVALUATION_DIMENSIONS,
  REQUIRED_APPROVAL_ROLES,
  REQUIRED_POLICY_DECISIONS,
  PROHIBITED_SELECTION_EFFECTS,
  stableStringify,
  sha256,
  buildDecisionPacket,
  evaluateDecisionPacket,
  buildSelectionChallenge,
  validateSelectionAuthorization,
  buildStagingAuthorizationChallenge,
  validateStagingAuthorization
};
