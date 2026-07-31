'use strict';

const crypto = require('crypto');
const contract = require('./scheduling-contract');
const { RUNTIME_ERROR_CODES, runtimeError, contractError } = require('./scheduling-errors');
const {
  assertSchedulingRepository,
  assertTransactionPort,
  mapRepositoryError
} = require('./scheduling-repository-port');
const {
  DEFAULT_IDEMPOTENCY_RETENTION_DAYS,
  normalizeContext,
  normalizeCommandPayload,
  resolvePrincipalKey,
  sha256Payload,
  cloneJson,
  freezeResult,
  readNow,
  addDays,
  readHoldTtl,
  readPositiveInteger
} = require('./scheduling-normalization');
const { createCommandHandlers } = require('./scheduling-command-handlers');

function createSchedulingService(options) {
  const config = options || {};
  const repository = assertSchedulingRepository(config.repository);
  const now = typeof config.now === 'function' ? config.now : () => new Date();
  const idFactory = typeof config.idFactory === 'function' ? config.idFactory : () => crypto.randomUUID();
  const hashPayload = typeof config.hashPayload === 'function' ? config.hashPayload : sha256Payload;
  const holdTtlSeconds = readHoldTtl(config.holdTtlSeconds);
  const idempotencyRetentionDays = readPositiveInteger(
    config.idempotencyRetentionDays,
    DEFAULT_IDEMPOTENCY_RETENTION_DAYS,
    365
  );
  const handlers = createCommandHandlers({ idFactory, holdTtlSeconds });

  async function execute(commandName, context) {
    const command = contract.COMMANDS[commandName];
    const handler = handlers[commandName];
    if (!command || typeof handler !== 'function') {
      throw contractError(contract.ERROR_CODES.invalidTransition, `Unknown scheduling command: ${commandName}`);
    }
    const safeContext = normalizeContext(context);
    contract.assertActorAuthorized(commandName, safeContext.actor.role);

    return repository.transaction(async (tx) => {
      assertTransactionPort(tx);
      return executeIdempotent(tx, commandName, safeContext, handler);
    }).catch((error) => {
      throw mapRepositoryError(error);
    });
  }

  async function executeIdempotent(tx, commandName, context, handler) {
    const normalizedPayload = normalizeCommandPayload(commandName, context.payload);
    const requestHash = hashPayload({ commandName, payload: normalizedPayload });
    const principalKey = resolvePrincipalKey(context.actor);
    const claimedAt = readNow(now);
    const claim = await tx.claimIdempotency({
      commandName,
      principalKey,
      idempotencyKey: context.idempotencyKey,
      requestHash,
      claimedAt: claimedAt.toISOString(),
      expiresAt: addDays(claimedAt, idempotencyRetentionDays).toISOString()
    });

    const claimState = String(claim && (claim.state || claim.status) || '').toLowerCase();
    if (claimState === 'completed' || claimState === 'replay') {
      contract.assertIdempotencyReplay(
        { payloadFingerprint: claim.requestHash || claim.request_hash },
        { payloadFingerprint: requestHash }
      );
      return freezeResult(claim.resultPayload || claim.result_payload);
    }
    if (claimState === 'in_progress') {
      contract.assertIdempotencyReplay(
        { payloadFingerprint: claim.requestHash || claim.request_hash },
        { payloadFingerprint: requestHash }
      );
      throw runtimeError(
        RUNTIME_ERROR_CODES.idempotencyInProgress,
        'The same scheduling command is already in progress.',
        { commandName, idempotencyKey: context.idempotencyKey },
        409
      );
    }
    if (claimState !== 'claimed' && claimState !== 'new') {
      throw runtimeError(
        RUNTIME_ERROR_CODES.repositoryUnavailable,
        'The scheduling repository returned an invalid idempotency claim state.',
        { state: claimState || null },
        503
      );
    }

    const result = await handler(tx, context, {
      commandName,
      normalizedPayload,
      requestHash,
      principalKey,
      occurredAt: claimedAt.toISOString()
    });
    await tx.completeIdempotency({
      commandName,
      principalKey,
      idempotencyKey: context.idempotencyKey,
      requestHash,
      aggregateType: result.aggregateType || null,
      aggregateId: result.aggregateId || null,
      availabilityRuleId: result.aggregateType === 'availability_rule' ? result.aggregateId : null,
      reservationId: result.aggregateType === 'reservation' ? result.aggregateId : null,
      resultPayload: cloneJson(result),
      completedAt: readNow(now).toISOString()
    });
    return freezeResult(result);
  }

  return Object.freeze({
    execute,
    upsertAvailabilityRule: (context) => execute('upsert_availability_rule', context),
    createScheduleHold: (context) => execute('create_schedule_hold', context),
    confirmScheduleReservation: (context) => execute('confirm_schedule_reservation', context),
    rescheduleReservation: (context) => execute('reschedule_reservation', context),
    cancelScheduleReservation: (context) => execute('cancel_schedule_reservation', context),
    expireScheduleHolds: (context) => execute('expire_schedule_holds', context)
  });
}

module.exports = Object.freeze({
  createSchedulingService
});
