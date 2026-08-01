#!/usr/bin/env node
'use strict';

const assert = require('assert');
const config = require('../config/sched-001-b04c-authenticated-ord-sched-composition-canary-execution.json');
const readiness = require('../config/sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.json');
const {
  EXPECTED_PROJECT_REF,
  CANARY_PREFIX,
  createTransactionalCanaryPool,
  safeError,
  main
} = require('./execute-sched-001-b04c-authenticated-ord-sched-composition-canary');

assert.strictEqual(EXPECTED_PROJECT_REF, config.target.projectRef);
assert.strictEqual(CANARY_PREFIX, 'sched-b04c-canary:');
assert.strictEqual(config.authorization.exactPhrase, readiness.authorization.requiredExactPhrase);
assert.strictEqual(config.authorization.status, 'awaiting_exact_authorization');
assert.strictEqual(config.authorization.repositoryAdditionTriggersExecution, false);
assert.strictEqual(config.transaction.finalStatement, 'ROLLBACK');
assert.strictEqual(config.transaction.commitAllowed, false);
assert.strictEqual(config.executionState.authenticatedCanaryExecuted, false);

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
    'savepoint sched_b04c_command_1',
    'select 1',
    'release savepoint sched_b04c_command_1'
  ]);

  const rollbackClient = await pool.connect();
  await rollbackClient.query('begin isolation level serializable');
  await rollbackClient.query('rollback');
  rollbackClient.release();
  assert.deepStrictEqual(calls.slice(-3), [
    'savepoint sched_b04c_command_2',
    'rollback to savepoint sched_b04c_command_2',
    'release savepoint sched_b04c_command_2'
  ]);

  assert.deepStrictEqual(safeError({ code: 'DOKE_TEST_FAILURE' }), {
    code: 'DOKE_TEST_FAILURE',
    message: 'DOKE_TEST_FAILURE'
  });
  assert.strictEqual(safeError({ code: '23503' }).diagnosticClass, 'foreign_key_violation');
  assert.strictEqual(safeError({ code: '42P18' }).diagnosticClass, 'indeterminate_datatype');

  await assert.rejects(
    () => main([], {}),
    (error) => error.code === 'DOKE_SCHED_B04C_MODE_REQUIRED'
  );
  await assert.rejects(
    () => main(['--preflight'], {
      DOKE_SCHEDULING_RUNTIME_ENABLED: 'true',
      DOKE_RUNTIME_ENVIRONMENT: 'staging',
      SUPABASE_PROJECT_REF: EXPECTED_PROJECT_REF
    }),
    (error) => error.code === 'DOKE_SCHED_B04C_AUTHORIZATION_MISSING'
  );
  await assert.rejects(
    () => main(['--preflight'], {
      SCHED_B04C_AUTHORIZATION: config.authorization.exactPhrase,
      DOKE_SCHEDULING_RUNTIME_ENABLED: 'false',
      DOKE_RUNTIME_ENVIRONMENT: 'staging',
      SUPABASE_PROJECT_REF: EXPECTED_PROJECT_REF
    }),
    (error) => error.code === 'DOKE_SCHED_B04C_RUNTIME_FLAG_MISMATCH'
  );

  console.log('SCHED-B04C authenticated ORD/SCHED canary execution tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
