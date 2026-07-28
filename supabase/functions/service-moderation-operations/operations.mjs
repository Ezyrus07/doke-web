export const normalizeAction = (value) => {
  const action = String(value || '').trim().toLowerCase();
  return ['list', 'detail', 'audit', 'approve', 'request_changes', 'reject', 'cleanup_media'].includes(action)
    ? action
    : 'list';
};

export const normalizeText = (value, max = 500) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

export const normalizeLimit = (value, fallback = 20, min = 1, max = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
};

export const normalizeModerationError = (error) => {
  const source = [error?.code, error?.message, error?.details, error?.hint]
    .map((value) => String(value || ''))
    .join(' ')
    .toUpperCase();
  const known = [
    'DOKE_SERVICE_MODERATION_AUTH_REQUIRED',
    'DOKE_SERVICE_MODERATION_OPERATOR_REQUIRED',
    'DOKE_SERVICE_MEDIA_CLEANUP_RESULTS_INVALID',
    'DOKE_SERVICE_MEDIA_CLEANUP_RESULT_INVALID',
    'DOKE_SERVICE_MEDIA_STORAGE_DELETE_FAILED',
    'AUTH_REQUIRED',
    'ADMIN_REQUIRED',
    'SERVICE_VERSION_NOT_FOUND',
    'SERVICE_VERSION_NOT_PENDING',
    'SERVICE_NOT_FOUND',
    'REVIEW_REASON_INVALID',
  ].find((code) => source.includes(code));
  return known || 'DOKE_SERVICE_MODERATION_OPERATION_FAILED';
};

export const statusForModerationError = (code) => {
  if (['DOKE_SERVICE_MODERATION_AUTH_REQUIRED', 'AUTH_REQUIRED'].includes(code)) return 401;
  if (['DOKE_SERVICE_MODERATION_OPERATOR_REQUIRED', 'ADMIN_REQUIRED'].includes(code)) return 403;
  if (['SERVICE_VERSION_NOT_FOUND', 'SERVICE_NOT_FOUND'].includes(code)) return 404;
  if (code === 'SERVICE_VERSION_NOT_PENDING') return 409;
  if (['REVIEW_REASON_INVALID', 'DOKE_SERVICE_MEDIA_CLEANUP_RESULTS_INVALID', 'DOKE_SERVICE_MEDIA_CLEANUP_RESULT_INVALID'].includes(code)) return 400;
  if (code === 'DOKE_SERVICE_MEDIA_STORAGE_DELETE_FAILED') return 502;
  return 500;
};
