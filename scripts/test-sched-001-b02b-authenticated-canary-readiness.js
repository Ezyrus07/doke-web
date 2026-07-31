#!/usr/bin/env node
'use strict';

const assert = require('assert');
const config = require('../config/sched-001-b02b-authenticated-composition-canary-readiness.json');

assert.strictEqual(config.contractVersion, 'sched-b02b-authenticated-composition-canary-readiness-v1');
assert.strictEqual(config.scope, 'repository_only_authenticated_staging_canary_readiness');
assert.strictEqual(config.environment, 'doke-web-staging');
assert.strictEqual(config.projectRef, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(config.authorization.genericNextAllowed, false);
assert.strictEqual(
  config.authorization.requiredExactPhrase,
  'I_EXPLICITLY_AUTHORIZE_SCHED_B02B_AUTHENTICATED_COMPOSITION_CANARIES_ON_DOKE_STAGING'
);
assert.strictEqual(config.runtimeGate.failClosed, true);
assert.strictEqual(config.capabilities.executeModeAvailable, false);
assert.strictEqual(config.capabilities.databaseMutationAvailable, false);
assert.strictEqual(config.capabilities.runtimeActivated, false);
assert.strictEqual(config.capabilities.authenticatedCanaryExecuted, false);
assert.deepStrictEqual(config.blockers.remainingOpen, ['SCHED-B02', 'SCHED-B04']);

const personas = Object.fromEntries(config.personas.map((persona) => [persona.name, persona]));
assert(personas.client.allowedCommands.includes('create_schedule_hold'));
assert(personas.client.forbiddenCommands.includes('confirm_schedule_reservation'));
assert(personas.professional.allowedCommands.includes('upsert_availability_rule'));
assert(personas.professional.forbiddenCommands.includes('confirm_schedule_reservation'));
assert(personas.support.allowedCommands.includes('reschedule_reservation'));
assert(personas.support.forbiddenCommands.includes('expire_schedule_holds'));
assert(personas.admin.allowedCommands.includes('cancel_schedule_reservation'));
assert(personas.admin.forbiddenCommands.includes('expire_schedule_holds'));

[
  'runtime_disabled_without_exact_gate',
  'client_hold_allowed_for_owned_order',
  'client_confirmation_forbidden',
  'professional_availability_upsert_allowed',
  'professional_booking_confirmation_forbidden',
  'idempotent_replay_returns_same_result',
  'different_payload_same_key_rejected',
  'overlap_rejected',
  'order_projection_matches_reservation',
  'transaction_rolled_back',
  'zero_canary_residue'
].forEach((assertion) => assert(config.canaryAssertions.includes(assertion), `Missing assertion ${assertion}`));

console.log('SCHED-B02B authenticated composition canary readiness tests passed.');
