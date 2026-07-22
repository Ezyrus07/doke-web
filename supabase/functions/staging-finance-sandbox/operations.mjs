export const STAGING_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';

export const normalizeAction = (value) => {
  const action = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  return ['hold_payment', 'request_completion', 'release_payment'].includes(action) ? action : '';
};

export const normalizePayload = (value) => value && typeof value === 'object' && !Array.isArray(value)
  ? value
  : {};

export const projectRefFromUrl = (value) => {
  try {
    const host = new URL(String(value || '')).hostname;
    return host.endsWith('.supabase.co') ? host.split('.')[0] : '';
  } catch (_error) {
    return '';
  }
};

export const normalizeSandboxError = (error) => {
  const source = [error?.code, error?.message, error?.details, error?.hint]
    .map((value) => String(value || ''))
    .join(' ')
    .toUpperCase();
  const known = [
    'DOKE_FINANCE_SANDBOX_DISABLED',
    'DOKE_FINANCE_SANDBOX_AUTH_REQUIRED',
    'DOKE_FINANCE_SANDBOX_PAYLOAD_INVALID',
    'DOKE_FINANCE_SANDBOX_ACTION_INVALID',
    'DOKE_FINANCE_SANDBOX_ACTOR_INACTIVE',
    'DOKE_FINANCE_SANDBOX_ORDER_REQUIRED',
    'DOKE_FINANCE_SANDBOX_ORDER_NOT_FOUND',
    'DOKE_FINANCE_SANDBOX_CONVERSATION_NOT_FOUND',
    'DOKE_FINANCE_SANDBOX_CHARGE_NOT_FOUND',
    'DOKE_FINANCE_SANDBOX_CHARGE_INVALID',
    'DOKE_FINANCE_SANDBOX_CLIENT_REQUIRED',
    'DOKE_FINANCE_SANDBOX_PROFESSIONAL_REQUIRED',
    'DOKE_FINANCE_SANDBOX_ORDER_NOT_IN_PROGRESS',
    'DOKE_FINANCE_SANDBOX_PROPOSAL_REQUIRED',
    'DOKE_FINANCE_SANDBOX_CHARGE_MISMATCH',
    'DOKE_FINANCE_SANDBOX_AMOUNT_INVALID',
    'DOKE_FINANCE_SANDBOX_AMOUNT_MISMATCH',
    'DOKE_FINANCE_SANDBOX_HELD_PAYMENT_REQUIRED',
    'DOKE_FINANCE_SANDBOX_ALREADY_COMPLETED',
    'DOKE_FINANCE_SANDBOX_COMPLETION_NOT_REQUESTED',
    'DOKE_FINANCE_SANDBOX_ESCROW_NOT_FOUND',
  ].find((code) => source.includes(code));
  return known || 'DOKE_FINANCE_SANDBOX_OPERATION_FAILED';
};

export const statusForSandboxError = (code) => {
  if (code === 'DOKE_FINANCE_SANDBOX_AUTH_REQUIRED') return 401;
  if (['DOKE_FINANCE_SANDBOX_DISABLED', 'DOKE_FINANCE_SANDBOX_ACTOR_INACTIVE', 'DOKE_FINANCE_SANDBOX_CLIENT_REQUIRED', 'DOKE_FINANCE_SANDBOX_PROFESSIONAL_REQUIRED'].includes(code)) return 403;
  if (['DOKE_FINANCE_SANDBOX_ORDER_NOT_FOUND', 'DOKE_FINANCE_SANDBOX_CONVERSATION_NOT_FOUND', 'DOKE_FINANCE_SANDBOX_CHARGE_NOT_FOUND', 'DOKE_FINANCE_SANDBOX_HELD_PAYMENT_REQUIRED', 'DOKE_FINANCE_SANDBOX_ESCROW_NOT_FOUND'].includes(code)) return 404;
  if (code !== 'DOKE_FINANCE_SANDBOX_OPERATION_FAILED') return 400;
  return 500;
};
