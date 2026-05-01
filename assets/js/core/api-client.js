/**
 * Doke API client contract.
 * Stage 21 only defines the access boundary. Real network/Supabase logic comes later.
 */
export const ApiErrorCode = Object.freeze({
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  UNKNOWN: 'UNKNOWN'
});

export class ApiError extends Error {
  constructor(message, { code = ApiErrorCode.UNKNOWN, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export function createApiClient({ adapter } = {}) {
  if (!adapter) {
    throw new ApiError('API adapter is required before enabling live data.', {
      code: ApiErrorCode.VALIDATION_ERROR
    });
  }

  return {
    auth: adapter.auth,
    search: adapter.search,
    services: adapter.services,
    orders: adapter.orders,
    messages: adapter.messages,
    wallet: adapter.wallet,
    communities: adapter.communities,
    notifications: adapter.notifications
  };
}
