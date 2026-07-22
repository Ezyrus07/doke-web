import assert from 'node:assert/strict';
import {
  normalizeAction,
  normalizeLimit,
  normalizeNote,
  normalizeOperationsError,
  statusForError,
} from '../supabase/functions/order-event-operations/operations.mjs';

assert.equal(normalizeAction('REQUEUE'), 'requeue');
assert.equal(normalizeAction('run_now'), 'run_now');
assert.equal(normalizeAction('incident_update'), 'incident_update');
assert.equal(normalizeAction('runbook_preview'), 'runbook_preview');
assert.equal(normalizeAction('runbook_execute'), 'runbook_execute');
assert.equal(normalizeAction('post_incident_update'), 'post_incident_update');
assert.equal(normalizeAction('prevention_action_update'), 'prevention_action_update');
assert.equal(normalizeAction('postmortem_update'), 'postmortem_update');
assert.equal(normalizeAction('change_register'), 'change_register');
assert.equal(normalizeAction('change_approve'), 'change_approve');
assert.equal(normalizeAction('change_start'), 'change_start');
assert.equal(normalizeAction('change_complete'), 'change_complete');
assert.equal(normalizeAction('unknown'), 'dashboard');
assert.equal(normalizeAction(), 'dashboard');

assert.equal(normalizeLimit(undefined, 50, 10, 100), 50);
assert.equal(normalizeLimit(2, 50, 10, 100), 10);
assert.equal(normalizeLimit(500, 50, 10, 100), 100);
assert.equal(normalizeLimit(22.6, 50, 10, 100), 23);

assert.equal(normalizeNote('  falha   externa normalizada  '), 'falha externa normalizada');
assert.equal(normalizeNote('x'.repeat(600)).length, 500);

assert.equal(
  normalizeOperationsError({ message: 'database: DOKE_ORDER_EVENT_NOT_FOUND' }),
  'DOKE_ORDER_EVENT_NOT_FOUND',
);
assert.equal(
  normalizeOperationsError({ code: 'P0001', details: 'DOKE_ORDER_EVENT_REQUEUE_NOT_ALLOWED' }),
  'DOKE_ORDER_EVENT_REQUEUE_NOT_ALLOWED',
);
assert.equal(
  normalizeOperationsError({ message: 'DOKE_ORDER_CHANGE_DECISION_IMMUTABLE' }),
  'DOKE_ORDER_CHANGE_DECISION_IMMUTABLE',
);
assert.equal(
  normalizeOperationsError({ details: 'DOKE_ORDER_CHANGE_OVERRIDE_REASON_REQUIRED' }),
  'DOKE_ORDER_CHANGE_OVERRIDE_REASON_REQUIRED',
);
assert.equal(normalizeOperationsError(new Error('unrelated')), 'DOKE_ORDER_OPS_FAILED');

assert.equal(statusForError('DOKE_ORDER_OPS_AUTH_REQUIRED'), 401);
assert.equal(statusForError('DOKE_ORDER_OPS_ROLE_REQUIRED'), 403);
assert.equal(statusForError('DOKE_ORDER_EVENT_NOT_FOUND'), 404);
assert.equal(statusForError('DOKE_ORDER_EVENT_REQUEUE_NOT_ALLOWED'), 409);
assert.equal(statusForError('DOKE_ORDER_EVENT_REQUEUE_NOTE_REQUIRED'), 400);
assert.equal(statusForError('DOKE_ORDER_INCIDENT_NOT_FOUND'), 404);
assert.equal(statusForError('DOKE_ORDER_INCIDENT_CLOSED'), 409);
assert.equal(statusForError('DOKE_ORDER_INCIDENT_ASSIGN_ADMIN_REQUIRED'), 403);
assert.equal(statusForError('DOKE_ORDER_INCIDENT_NOTE_REQUIRED'), 400);
assert.equal(statusForError('DOKE_ORDER_RUNBOOK_ALERT_NOT_FOUND'), 404);
assert.equal(statusForError('DOKE_ORDER_RUNBOOK_PREVIEW_STALE'), 409);
assert.equal(statusForError('DOKE_ORDER_RUNBOOK_ADMIN_REQUIRED'), 403);
assert.equal(statusForError('DOKE_ORDER_RUNBOOK_CONFIRMATION_INVALID'), 400);
assert.equal(statusForError('DOKE_ORDER_RUNBOOK_EXECUTION_FAILED'), 500);
assert.equal(statusForError('DOKE_ORDER_POST_INCIDENT_NOT_FOUND'), 404);
assert.equal(statusForError('DOKE_ORDER_POST_INCIDENT_COMPLETED'), 409);
assert.equal(statusForError('DOKE_ORDER_POST_INCIDENT_ADMIN_REQUIRED'), 403);
assert.equal(statusForError('DOKE_ORDER_POST_INCIDENT_COMPLETION_INCOMPLETE'), 400);
assert.equal(statusForError('DOKE_ORDER_PREVENTION_DUE_REQUIRED'), 400);
assert.equal(statusForError('DOKE_ORDER_POSTMORTEM_NOT_FOUND'), 404);
assert.equal(statusForError('DOKE_ORDER_POSTMORTEM_COMPLETE_ADMIN_REQUIRED'), 403);
assert.equal(statusForError('DOKE_ORDER_POSTMORTEM_FIELDS_REQUIRED'), 400);
assert.equal(statusForError('DOKE_ORDER_CHANGE_NOT_FOUND'), 404);
assert.equal(statusForError('DOKE_ORDER_CHANGE_APPROVAL_REQUIRED'), 409);
assert.equal(statusForError('DOKE_ORDER_CHANGE_BLOCKED'), 409);
assert.equal(statusForError('DOKE_ORDER_CHANGE_OVERRIDE_ADMIN_REQUIRED'), 403);
assert.equal(statusForError('DOKE_ORDER_CHANGE_CONFIRMATION_INVALID'), 400);
assert.equal(statusForError('DOKE_ORDER_CHANGE_FINALIZED'), 409);
assert.equal(statusForError('DOKE_ORDER_OPS_FAILED'), 500);

console.log('[test:order-event-operations-runtime] ok');
console.log('- stable action, limit and note normalization');
console.log('- stable database error mapping and HTTP status contract');
