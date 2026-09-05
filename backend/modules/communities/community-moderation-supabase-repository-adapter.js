'use strict';

const CONTRACT_ID = 'com-b04b-immutable-moderation-persistence-readiness-v1';
const RPC = Object.freeze({
  loadCanonicalCase: 'com_moderation_load_case_v1',
  commitCaseCommand: 'com_moderation_commit_case_command_v1'
});
const LOGICAL_REPOSITORY_METHODS = Object.freeze([
  'loadCanonicalCase',
  'claimIdempotencyKey',
  'appendModerationEvent',
  'insertDecisionRecord',
  'compareAndSwapCaseProjection',
  'appendSanctionEvent',
  'appendAppealEvent',
  'appendMediaReviewEvent'
]);
const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'authorization', 'cookie', 'card', 'pan', 'cvv',
  'bankaccount', 'bank_account', 'pixkey', 'pix_key', 'identitydocument',
  'identity_document', 'rawmessage', 'raw_message', 'rawpayload', 'raw_payload',
  'rawbody', 'raw_body', 'binary', 'bytes', 'filebody', 'file_body', 'privatekey',
  'private_key', 'accesstoken', 'access_token', 'refreshtoken', 'refresh_token',
  'sessiontoken', 'session_token', 'webhooksecret', 'webhook_secret', 'apikey',
  'api_key', 'email', 'phone', 'cpf', 'cnpj'
]);

function assertExecutor(executor) {
  if (!executor || executor.authority !== 'server_service_role' || typeof executor.rpc !== 'function') {
    throw new Error('SERVER_SERVICE_ROLE_RPC_EXECUTOR_REQUIRED');
  }
  return executor;
}

function assertUuid(value, code) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(code);
  }
}

function assertSha(value, code, nullable = false) {
  if (nullable && (value === null || value === undefined)) return;
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error(code);
}

function assertRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('EXPECTED_REVISION_REQUIRED');
}

function assertText(value, code, min = 1, max = 160) {
  if (typeof value !== 'string' || value.length < min || value.length > max) throw new Error(code);
}

function assertObject(value, code, nullable = false) {
  if (nullable && (value === null || value === undefined)) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
}

function containsSensitive(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsSensitive(item, seen));
  return Object.entries(value).some(([key, item]) =>
    SENSITIVE_KEYS.has(String(key).toLowerCase()) || containsSensitive(item, seen)
  );
}

function assertSafeJson(value, code) {
  assertObject(value, code, true);
  if (value && containsSensitive(value)) throw new Error('RAW_SENSITIVE_DATA_PROHIBITED');
}

function unwrap(result) {
  if (!result || typeof result !== 'object') throw new Error('INVALID_RPC_RESULT');
  if (result.error) throw new Error(`RPC_FAILED:${result.error.code || 'unknown'}`);
  return result.data;
}

function assertTransactionPlan(input) {
  const plan = input && input.transactionPlan;
  assertObject(plan, 'SERIALIZABLE_TRANSACTION_PLAN_REQUIRED');
  if (String(plan.isolation || '').toLowerCase() !== 'serializable') {
    throw new Error('SERIALIZABLE_TRANSACTION_REQUIRED');
  }
  if (plan.atomic !== true || plan.rollbackOnFailure !== true || plan.commitAuthority !== false) {
    throw new Error('ATOMIC_ROLLBACK_ONLY_PLAN_REQUIRED');
  }
  if (plan.expectedCaseRevision !== input.expectedRevision) throw new Error('PLAN_REVISION_MISMATCH');
  if (plan.idempotencyKey !== input.idempotencyKey || plan.intentFingerprint !== input.intentFingerprint) {
    throw new Error('PLAN_IDENTITY_MISMATCH');
  }
  if (!Array.isArray(plan.requiredRepositoryMethods) ||
      !LOGICAL_REPOSITORY_METHODS.every((method) => plan.requiredRepositoryMethods.includes(method))) {
    throw new Error('CANONICAL_REPOSITORY_METHOD_SET_REQUIRED');
  }
  if (!plan.eventDraft || plan.eventDraft.eventHash !== input.eventHash ||
      plan.eventDraft.intentFingerprint !== input.intentFingerprint) {
    throw new Error('PLAN_EVENT_MISMATCH');
  }
}

function createModerationSupabaseRepository(executor) {
  const client = assertExecutor(executor);
  return Object.freeze({
    contractId: CONTRACT_ID,
    logicalRepositoryMethods: LOGICAL_REPOSITORY_METHODS,
    transactionBoundary: 'single_security_definer_rpc',

    async loadCanonicalCase(input) {
      assertUuid(input && input.caseId, 'CASE_UUID_REQUIRED');
      return unwrap(await client.rpc(RPC.loadCanonicalCase, { p_case_id: input.caseId }));
    },

    async commitCaseCommand(input) {
      assertUuid(input && input.caseId, 'CASE_UUID_REQUIRED');
      assertUuid(input && input.communityId, 'COMMUNITY_UUID_REQUIRED');
      assertUuid(input && input.actorId, 'ACTOR_UUID_REQUIRED');
      assertUuid(input && input.clientRequestId, 'CLIENT_REQUEST_UUID_REQUIRED');
      assertUuid(input && input.reporterId, 'REPORTER_UUID_REQUIRED');
      assertUuid(input && input.targetId, 'TARGET_UUID_REQUIRED');
      assertSha(input && input.idempotencyKey, 'IDEMPOTENCY_SHA256_REQUIRED');
      assertSha(input && input.intentFingerprint, 'INTENT_SHA256_REQUIRED');
      assertSha(input && input.eventHash, 'EVENT_SHA256_REQUIRED');
      assertSha(input && input.previousEventHash, 'PREVIOUS_EVENT_SHA256_REQUIRED', true);
      assertSha(input && input.policyFingerprint, 'POLICY_SHA256_REQUIRED');
      assertRevision(input && input.expectedRevision);
      assertText(input && input.eventId, 'EVENT_ID_REQUIRED', 8, 96);
      assertText(input && input.eventAction, 'EVENT_ACTION_REQUIRED', 3, 96);
      assertText(input && input.caseKind, 'CASE_KIND_REQUIRED', 3, 48);
      assertText(input && input.caseState, 'CASE_STATE_REQUIRED', 3, 64);
      assertText(input && input.targetType, 'TARGET_TYPE_REQUIRED', 3, 64);
      if (!Number.isFinite(Date.parse(String(input && input.occurredAt || '')))) {
        throw new Error('OCCURRED_AT_REQUIRED');
      }
      assertSafeJson(input.projection, 'CASE_PROJECTION_REQUIRED');
      assertSafeJson(input.eventDetails || {}, 'EVENT_DETAILS_INVALID');
      for (const [key, value] of Object.entries({
        evidenceRecord: input.evidenceRecord,
        decisionRecord: input.decisionRecord,
        sanctionEvent: input.sanctionEvent,
        appealEvent: input.appealEvent,
        mediaReviewEvent: input.mediaReviewEvent
      })) assertSafeJson(value, `${key.toUpperCase()}_INVALID`);
      assertTransactionPlan(input);

      return unwrap(await client.rpc(RPC.commitCaseCommand, {
        p_case_id: input.caseId,
        p_community_id: input.communityId,
        p_actor_id: input.actorId,
        p_client_request_id: input.clientRequestId,
        p_idempotency_key: input.idempotencyKey,
        p_intent_fingerprint: input.intentFingerprint,
        p_expected_revision: input.expectedRevision,
        p_event_id: input.eventId,
        p_event_action: input.eventAction,
        p_event_hash: input.eventHash,
        p_previous_event_hash: input.previousEventHash || null,
        p_policy_fingerprint: input.policyFingerprint,
        p_occurred_at: new Date(input.occurredAt).toISOString(),
        p_case_kind: input.caseKind,
        p_case_state: input.caseState,
        p_reporter_id: input.reporterId,
        p_target_type: input.targetType,
        p_target_id: input.targetId,
        p_projection: input.projection,
        p_event_details: input.eventDetails || {},
        p_evidence_record: input.evidenceRecord || null,
        p_decision_record: input.decisionRecord || null,
        p_sanction_event: input.sanctionEvent || null,
        p_appeal_event: input.appealEvent || null,
        p_media_review_event: input.mediaReviewEvent || null
      }));
    }
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  RPC,
  LOGICAL_REPOSITORY_METHODS,
  createModerationSupabaseRepository
});
