export const ALLOWED_ACTIONS = Object.freeze(new Set([
  'get_account_identity_state',
  'get_account_onboarding_state',
  'complete_account_onboarding',
  'complete_account_onboarding_reconciled',
  'update_account_profile',
  'update_account_profile_reconciled',
  'update_professional_profile_reconciled',
  'update_account_settings',
  'create_transaction_notification',
  'update_own_notification_state',
  'save_professional_profile_setup',
  'save_professional_verification_draft',
  'reopen_own_professional_identity_verification',
  'list_service_moderation_history',
  'prepare_transaction_attachment_uploads',
  'confirm_transaction_attachment_uploads',
  'remove_transaction_attachment',
  'prepare_service_media_uploads',
  'submit_service_for_review',
  'transition_owned_service_lifecycle',
  'save_wallet_bank_account',
  'request_wallet_withdrawal',
  'open_wallet_dispute',
  'respond_wallet_dispute',
]));

export function normalizeAction(value) {
  const action = String(value || '').trim().toLowerCase();
  return ALLOWED_ACTIONS.has(action) ? action : '';
}

export function normalizePayload(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function normalizeOperationError(error) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || error || '').trim();
  const match = message.match(/\b(DOKE_[A-Z0-9_]+|AUTH_REQUIRED|SERVICE_[A-Z0-9_]+|VERIFICATION_[A-Z0-9_]+|PROFESSIONAL_[A-Z0-9_]+)\b/);
  return match?.[1] || code || 'DOKE_SELF_SERVICE_OPERATION_FAILED';
}

export function statusForOperationError(code) {
  if (/AUTH_REQUIRED|ACTOR_NOT_FOUND/.test(code)) return 401;
  if (/FORBIDDEN|REQUIRED|ACCOUNT_NOT_ACTIVE|OPERATOR_REQUIRED|OWNERSHIP|SUBJECT_MISMATCH/.test(code)) return 403;
  if (/NOT_FOUND/.test(code)) return 404;
  if (/CONFLICT|TAKEN|IDEMPOTENCY|NOT_PREPARED|EXPIRED/.test(code)) return 409;
  if (/INVALID|TOO_LONG|TOO_LARGE|PAYLOAD|AMOUNT|BALANCE|REASON|SECTION|FIELD/.test(code)) return 422;
  return 400;
}
