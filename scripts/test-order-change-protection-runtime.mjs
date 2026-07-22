import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  normalizeAction,
  normalizeOperationsError,
  statusForError,
} from '../supabase/functions/order-event-operations/operations.mjs';

const require = createRequire(import.meta.url);
const contract = require('../backend/modules/orders/order-change-protection-contract.js');

assert.equal(contract.classifyChangeDecision('healthy', 'low'), 'allow');
assert.equal(contract.classifyChangeDecision('healthy', 'critical'), 'approval_required');
assert.equal(contract.classifyChangeDecision('warning', 'high'), 'approval_required');
assert.equal(contract.classifyChangeDecision('restricted', 'high'), 'approval_required');
assert.equal(contract.classifyChangeDecision('restricted', 'critical'), 'hard_block');
assert.equal(contract.classifyChangeDecision('frozen', 'low'), 'approval_required');
assert.equal(contract.classifyChangeDecision('frozen', 'medium'), 'hard_block');
assert.equal(contract.canOverride('approval_required'), true);
assert.equal(contract.canOverride('hard_block'), false);
assert.equal(contract.isStateAtMost('warning', 'restricted'), true);
assert.equal(contract.isStateAtMost('frozen', 'restricted'), false);

['change_register', 'change_approve', 'change_start', 'change_complete'].forEach((action) => {
  assert.equal(normalizeAction(action), action);
});
assert.equal(
  normalizeOperationsError({ message: 'DOKE_ORDER_CHANGE_OVERRIDE_ADMIN_REQUIRED' }),
  'DOKE_ORDER_CHANGE_OVERRIDE_ADMIN_REQUIRED',
);
assert.equal(
  normalizeOperationsError({ details: 'DOKE_ORDER_CHANGE_APPROVAL_REQUIRED' }),
  'DOKE_ORDER_CHANGE_APPROVAL_REQUIRED',
);
assert.equal(statusForError('DOKE_ORDER_CHANGE_NOT_FOUND'), 404);
assert.equal(statusForError('DOKE_ORDER_CHANGE_APPROVAL_REQUIRED'), 409);
assert.equal(statusForError('DOKE_ORDER_CHANGE_BLOCKED'), 409);
assert.equal(statusForError('DOKE_ORDER_CHANGE_OVERRIDE_ADMIN_REQUIRED'), 403);
assert.equal(statusForError('DOKE_ORDER_CHANGE_CONFIRMATION_INVALID'), 400);

console.log('[test:order-change-protection-runtime] ok');
console.log('- risk/state decision matrix and override scope');
console.log('- Edge Function action and stable error mapping contract');
