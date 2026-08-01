#!/usr/bin/env node
'use strict';

const assert = require('assert');
const config = require('../config/sched-001-b02b-authenticated-composition-canary-execution.json');
const contract = require('../backend/modules/scheduling/scheduling-contract');
const {
  EXPECTED_PROJECT_REF,
  CANARY_PREFIX,
  createTransactionalCanaryPool,
  safeError
} = require('./execute-sched-001-b02b-authenticated-composition-canary');

assert.strictEqual(EXPECTED_PROJECT_REF, config.target.projectRef);
assert.strictEqual(CANARY_PREFIX, 'sched-b02b-canary:');
assert.strictEqual(config.authorization.status, 'authorized_pending_execution');
assert.strictEqual(config.authorization.oneShotTrigger, 'file_added_on_authorized_branch');
assert.strictEqual(config.runtimeGate.failClosed, true);
assert.strictEqual(config.transaction.outerBoundary, 'single_postgresql_transaction');
assert.strictEqual(config.transaction.commandBoundary, 'savepoint_per_composition_root_command');
assert.strictEqual(config.syntheticPersonas.source, 'transaction_scoped_auth_and_public_projections');
assert.strictEqual(config.syntheticPersonas.emailDomain, 'example.invalid');
assert.strictEqual(config.syntheticPersonas.persistentRowsAllowed, 0);
assert.deepStrictEqual(config.syntheticPersonas.roles, {
  client: 'client', professional: 'professional', support: 'support', admin: 'admin'
});
assert(config.prohibitedActions.includes('production_access'));
assert(config.prohibitedActions.includes('migration_application'));
assert(config.prohibitedActions.includes('persistent_canary_data'));

assert.deepStrictEqual(contract.COMMANDS.create_schedule_hold.actors, ['client_order_participant', 'support', 'admin']);
assert.deepStrictEqual(contract.COMMANDS.upsert_availability_rule.actors, ['professional_owner', 'support', 'admin']);
assert.deepStrictEqual(contract.COMMANDS.expire_schedule_holds.actors, ['schedule_worker', 'service_role']);

(async () => {
  const calls = [];
  const fakeClient = {
    async query(...args) {
      const text = typeof args[0] === 'string' ? args[0] : args[0].text;
      calls.push(text);
      return { rows: [], rowCount: 0 };
    }
  };
  const pool = createTransactionalCanaryPool(fakeClient);
  const commandClient = await pool.connect();
  await commandClient.query('begin isolation level serializable');
  await commandClient.query('select 1');
  await commandClient.query('commit');
  commandClient.release();
  assert.deepStrictEqual(calls, [
    'savepoint sched_b02b_command_1',
    'select 1',
    'release savepoint sched_b02b_command_1'
  ]);

  const rollbackClient = await pool.connect();
  await rollbackClient.query('begin isolation level serializable');
  await rollbackClient.query('rollback');
  rollbackClient.release();
  assert.deepStrictEqual(calls.slice(-3), [
    'savepoint sched_b02b_command_2',
    'rollback to savepoint sched_b02b_command_2',
    'release savepoint sched_b02b_command_2'
  ]);

  assert.deepStrictEqual(safeError({ code: contract.ERROR_CODES.actorForbidden }), {
    code: contract.ERROR_CODES.actorForbidden,
    message: contract.ERROR_CODES.actorForbidden
  });
  assert.deepStrictEqual(safeError({ code: '23514', message: 'DOKE_ORDER_SERVICE_NOT_ELIGIBLE' }), {
    code: 'DOKE_ORDER_SERVICE_NOT_ELIGIBLE',
    message: 'DOKE_ORDER_SERVICE_NOT_ELIGIBLE'
  });
  assert.strictEqual(safeError({ code: 'ECONNREFUSED' }).code, 'DOKE_SCHED_B02B_UNEXPECTED_FAILURE');
  console.log('SCHED-B02B authenticated composition canary tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
