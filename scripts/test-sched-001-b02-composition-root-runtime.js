#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  STAGING_PROJECT_REF,
  DISABLED_ERROR_CODE,
  POOL_ERROR_CODE,
  createSchedulingCompositionRoot,
  evaluateSchedulingRuntimeActivation
} = require('../backend/modules/scheduling/scheduling-composition-root');

async function main() {
  const disabled = createSchedulingCompositionRoot({ env: {} });
  assert.strictEqual(disabled.enabled, false);
  assert.strictEqual(disabled.status, 'disabled');
  assert.strictEqual(disabled.repository, null);
  assert.strictEqual(disabled.service, null);
  assert(Object.isFrozen(disabled));
  await assert.rejects(
    () => disabled.execute('create_schedule_hold', {}),
    (error) => error && error.code === DISABLED_ERROR_CODE
  );

  const uppercaseFlag = evaluateSchedulingRuntimeActivation({
    DOKE_SCHEDULING_RUNTIME_ENABLED: 'TRUE',
    DOKE_RUNTIME_ENVIRONMENT: 'staging',
    SUPABASE_PROJECT_REF: STAGING_PROJECT_REF
  });
  assert.strictEqual(uppercaseFlag.enabled, false);
  assert(uppercaseFlag.reasons.includes('activation_flag_disabled'));

  const production = evaluateSchedulingRuntimeActivation({
    DOKE_SCHEDULING_RUNTIME_ENABLED: 'true',
    DOKE_RUNTIME_ENVIRONMENT: 'production',
    SUPABASE_PROJECT_REF: STAGING_PROJECT_REF,
    NODE_ENV: 'production'
  });
  assert.strictEqual(production.enabled, false);
  assert(production.reasons.includes('production_environment_blocked'));
  assert(production.reasons.includes('staging_environment_required'));

  const wrongProject = evaluateSchedulingRuntimeActivation({
    DOKE_SCHEDULING_RUNTIME_ENABLED: 'true',
    DOKE_RUNTIME_ENVIRONMENT: 'staging',
    SUPABASE_PROJECT_REF: 'production-project-ref'
  });
  assert.strictEqual(wrongProject.enabled, false);
  assert(wrongProject.reasons.includes('staging_project_ref_mismatch'));

  const enabledEnv = {
    DOKE_SCHEDULING_RUNTIME_ENABLED: 'true',
    DOKE_RUNTIME_ENVIRONMENT: 'staging',
    SUPABASE_PROJECT_REF: STAGING_PROJECT_REF,
    NODE_ENV: 'test'
  };
  const pool = { connect: async () => { throw new Error('not called by composition'); } };
  let repositoryOptions;
  let serviceOptions;
  const repository = Object.freeze({ transaction: async () => null });
  const service = Object.freeze({
    execute: async (commandName, context) => ({ commandName, context, source: 'trusted-composition-root' })
  });

  const root = createSchedulingCompositionRoot({
    env: enabledEnv,
    pool,
    lockTimeoutMs: 2500,
    statementTimeoutMs: 9000,
    repositoryFactory(options) {
      repositoryOptions = options;
      return repository;
    },
    serviceFactory(options) {
      serviceOptions = options;
      return service;
    }
  });

  assert.strictEqual(root.enabled, true);
  assert.strictEqual(root.status, 'active');
  assert.strictEqual(root.environment, 'staging');
  assert.strictEqual(root.projectRef, STAGING_PROJECT_REF);
  assert.strictEqual(root.repository, repository);
  assert.strictEqual(root.service, service);
  assert.strictEqual(repositoryOptions.pool, pool);
  assert.strictEqual(repositoryOptions.isolationLevel, 'serializable');
  assert.strictEqual(repositoryOptions.lockTimeoutMs, 2500);
  assert.strictEqual(repositoryOptions.statementTimeoutMs, 9000);
  assert.strictEqual(serviceOptions.repository, repository);
  assert(Object.isFrozen(root));

  const result = await root.createScheduleHold({ idempotencyKey: 'sched-b02-test' });
  assert.deepStrictEqual(result, {
    commandName: 'create_schedule_hold',
    context: { idempotencyKey: 'sched-b02-test' },
    source: 'trusted-composition-root'
  });

  assert.throws(
    () => createSchedulingCompositionRoot({ env: enabledEnv }),
    (error) => error && error.code === POOL_ERROR_CODE
  );

  assert.throws(
    () => createSchedulingCompositionRoot({
      env: enabledEnv,
      pool,
      repositoryFactory: () => repository,
      serviceFactory: () => ({})
    }),
    (error) => error && error.code === 'DOKE_SCHEDULE_COMPOSITION_SERVICE_INVALID'
  );

  console.log('SCHED-B02 fail-closed scheduling composition root runtime tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
