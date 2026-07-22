import {
  ALLOWED_ACTIONS,
  normalizeAction,
  normalizeOperationError,
  normalizePayload,
  statusForOperationError,
} from '../supabase/functions/self-service-operations/operations.mjs';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(ALLOWED_ACTIONS.size === 14, 'Expected fourteen self-service operations.');
assert(normalizeAction(' UPDATE_ACCOUNT_PROFILE ') === 'update_account_profile', 'Action normalization failed.');
assert(normalizeAction('forged_operation') === '', 'Unknown action must be rejected.');
assert(normalizePayload({ p_city: 'Salvador' }).p_city === 'Salvador', 'Object payload normalization failed.');
assert(Object.keys(normalizePayload(['forged'])).length === 0, 'Array payload must be rejected to an empty object.');
assert(normalizeOperationError({ message: 'DOKE_PROFILE_USERNAME_INVALID' }) === 'DOKE_PROFILE_USERNAME_INVALID', 'Doke error extraction failed.');
assert(normalizeOperationError({ message: 'SERVICE_EXTERNAL_ID_INVALID' }) === 'SERVICE_EXTERNAL_ID_INVALID', 'Domain error extraction failed.');
assert(statusForOperationError('DOKE_SELF_SERVICE_AUTH_REQUIRED') === 401, 'Auth status mapping failed.');
assert(statusForOperationError('DOKE_PROFILE_USERNAME_TAKEN') === 409, 'Conflict status mapping failed.');
assert(statusForOperationError('DOKE_WITHDRAWAL_AMOUNT_INVALID') === 422, 'Validation status mapping failed.');

console.log('Self-service operations Edge runtime contract passed.');
