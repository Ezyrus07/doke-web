import assert from 'node:assert/strict';
import {
  STAGING_PROJECT_REF,
  normalizeAction,
  normalizePayload,
  normalizeSandboxError,
  projectRefFromUrl,
  statusForSandboxError,
} from '../supabase/functions/staging-finance-sandbox/operations.mjs';

assert.equal(STAGING_PROJECT_REF, 'zwkczgewzbsorbrjuzpb');
assert.equal(projectRefFromUrl('https://zwkczgewzbsorbrjuzpb.supabase.co'), STAGING_PROJECT_REF);
assert.equal(projectRefFromUrl('https://production-ref.supabase.co'), 'production-ref');
assert.equal(projectRefFromUrl('not-a-url'), '');
assert.equal(normalizeAction('hold-payment'), 'hold_payment');
assert.equal(normalizeAction('request_completion'), 'request_completion');
assert.equal(normalizeAction('release_payment'), 'release_payment');
assert.equal(normalizeAction('refund_payment'), '');
assert.deepEqual(normalizePayload({ orderId: 'x' }), { orderId: 'x' });
assert.deepEqual(normalizePayload([]), {});
assert.equal(normalizeSandboxError({ message: 'DOKE_FINANCE_SANDBOX_CLIENT_REQUIRED' }), 'DOKE_FINANCE_SANDBOX_CLIENT_REQUIRED');
assert.equal(normalizeSandboxError(new Error('unknown')), 'DOKE_FINANCE_SANDBOX_OPERATION_FAILED');
assert.equal(statusForSandboxError('DOKE_FINANCE_SANDBOX_AUTH_REQUIRED'), 401);
assert.equal(statusForSandboxError('DOKE_FINANCE_SANDBOX_DISABLED'), 403);
assert.equal(statusForSandboxError('DOKE_FINANCE_SANDBOX_ORDER_NOT_FOUND'), 404);
assert.equal(statusForSandboxError('DOKE_FINANCE_SANDBOX_AMOUNT_INVALID'), 400);
assert.equal(statusForSandboxError('DOKE_FINANCE_SANDBOX_OPERATION_FAILED'), 500);

console.log('Staging finance sandbox Edge runtime contract passed.');
