'use strict';

const { createSchedulingService } = require('./scheduling-service');
const { createSchedulingPostgresRepository } = require('./scheduling-postgres-repository');

const ACTIVATION_FLAG = 'DOKE_SCHEDULING_RUNTIME_ENABLED';
const ENVIRONMENT_FLAG = 'DOKE_RUNTIME_ENVIRONMENT';
const PROJECT_REF_FLAG = 'SUPABASE_PROJECT_REF';
const STAGING_ENVIRONMENT = 'staging';
const STAGING_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const DISABLED_ERROR_CODE = 'DOKE_SCHEDULE_RUNTIME_DISABLED';
const POOL_ERROR_CODE = 'DOKE_SCHEDULE_COMPOSITION_POOL_REQUIRED';

function createSchedulingCompositionRoot(options) {
  const config = options || {};
  const env = config.env || process.env;
  const activation = evaluateSchedulingRuntimeActivation(env);

  if (!activation.enabled) {
    return createDisabledRoot(activation);
  }

  const pool = config.pool;
  if (!pool || typeof pool.connect !== 'function') {
    throw compositionError(
      POOL_ERROR_CODE,
      'An activated scheduling composition root requires an injected PostgreSQL pool.'
    );
  }

  const repositoryFactory = typeof config.repositoryFactory === 'function'
    ? config.repositoryFactory
    : createSchedulingPostgresRepository;
  const serviceFactory = typeof config.serviceFactory === 'function'
    ? config.serviceFactory
    : createSchedulingService;

  const repository = repositoryFactory({
    pool,
    isolationLevel: config.isolationLevel || 'serializable',
    lockTimeoutMs: config.lockTimeoutMs,
    statementTimeoutMs: config.statementTimeoutMs
  });
  const service = serviceFactory({
    repository,
    now: config.now,
    idFactory: config.idFactory,
    hashPayload: config.hashPayload,
    holdTtlSeconds: config.holdTtlSeconds,
    idempotencyRetentionDays: config.idempotencyRetentionDays
  });

  if (!service || typeof service.execute !== 'function') {
    throw compositionError(
      'DOKE_SCHEDULE_COMPOSITION_SERVICE_INVALID',
      'The scheduling service factory returned an invalid service.'
    );
  }

  const execute = (commandName, context) => service.execute(commandName, context);

  return Object.freeze({
    enabled: true,
    status: 'active',
    environment: activation.environment,
    projectRef: activation.projectRef,
    activation: Object.freeze({ ...activation }),
    repository,
    service,
    execute,
    upsertAvailabilityRule: (context) => execute('upsert_availability_rule', context),
    createScheduleHold: (context) => execute('create_schedule_hold', context),
    confirmScheduleReservation: (context) => execute('confirm_schedule_reservation', context),
    rescheduleReservation: (context) => execute('reschedule_reservation', context),
    cancelScheduleReservation: (context) => execute('cancel_schedule_reservation', context),
    expireScheduleHolds: (context) => execute('expire_schedule_holds', context)
  });
}

function evaluateSchedulingRuntimeActivation(env) {
  const source = env || {};
  const rawFlag = String(source[ACTIVATION_FLAG] || '').trim();
  const environment = normalize(source[ENVIRONMENT_FLAG]);
  const projectRef = String(source[PROJECT_REF_FLAG] || '').trim();
  const nodeEnvironment = normalize(source.NODE_ENV);
  const reasons = [];

  if (nodeEnvironment === 'production' || environment === 'production') {
    reasons.push('production_environment_blocked');
  }
  if (rawFlag !== 'true') {
    reasons.push('activation_flag_disabled');
  }
  if (environment !== STAGING_ENVIRONMENT) {
    reasons.push('staging_environment_required');
  }
  if (projectRef !== STAGING_PROJECT_REF) {
    reasons.push('staging_project_ref_mismatch');
  }

  return Object.freeze({
    enabled: reasons.length === 0,
    environment: environment || null,
    projectRef: projectRef || null,
    activationFlag: rawFlag === 'true',
    reasons: Object.freeze(reasons)
  });
}

function createDisabledRoot(activation) {
  const execute = async () => {
    throw compositionError(
      DISABLED_ERROR_CODE,
      'Scheduling runtime is disabled by the fail-closed activation gate.',
      { reasons: activation.reasons }
    );
  };

  return Object.freeze({
    enabled: false,
    status: 'disabled',
    environment: activation.environment,
    projectRef: activation.projectRef,
    activation: Object.freeze({ ...activation }),
    repository: null,
    service: null,
    execute,
    upsertAvailabilityRule: execute,
    createScheduleHold: execute,
    confirmScheduleReservation: execute,
    rescheduleReservation: execute,
    cancelScheduleReservation: execute,
    expireScheduleHolds: execute
  });
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function compositionError(code, message, details) {
  const error = new Error(message || code);
  error.code = code;
  error.status = 503;
  if (details && typeof details === 'object') {
    error.details = Object.freeze({ ...details });
  }
  return error;
}

module.exports = Object.freeze({
  ACTIVATION_FLAG,
  ENVIRONMENT_FLAG,
  PROJECT_REF_FLAG,
  STAGING_ENVIRONMENT,
  STAGING_PROJECT_REF,
  DISABLED_ERROR_CODE,
  POOL_ERROR_CODE,
  createSchedulingCompositionRoot,
  evaluateSchedulingRuntimeActivation
});
