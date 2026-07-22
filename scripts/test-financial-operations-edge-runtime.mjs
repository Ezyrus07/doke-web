import assert from 'node:assert/strict';
import {
  normalizeAction,
  normalizeFinancialError,
  normalizeText,
  statusForFinancialError,
} from '../supabase/functions/financial-operations/operations.mjs';

assert.equal(normalizeAction('resolve-withdrawal'), 'resolve_withdrawal');
assert.equal(normalizeAction('resolve_dispute'), 'resolve_dispute');
assert.equal(normalizeAction('unknown'), '');
assert.equal(normalizeText('  texto   longo  ', 20), 'texto longo');
assert.equal(normalizeFinancialError({ message: 'DOKE_DISPUTE_NOT_FOUND' }), 'DOKE_DISPUTE_NOT_FOUND');
assert.equal(normalizeFinancialError({ message: 'random failure' }), 'DOKE_FINANCIAL_OPERATION_FAILED');
assert.equal(statusForFinancialError('DOKE_FINANCIAL_AUTH_REQUIRED'), 401);
assert.equal(statusForFinancialError('DOKE_FINANCIAL_OPERATOR_REQUIRED'), 403);
assert.equal(statusForFinancialError('DOKE_DISPUTE_NOT_FOUND'), 404);
assert.equal(statusForFinancialError('DOKE_DISPUTE_RESOLUTION_INVALID'), 400);
assert.equal(statusForFinancialError('DOKE_FINANCIAL_OPERATION_FAILED'), 500);
console.log('Financial operations Edge runtime helpers passed.');
