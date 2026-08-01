#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  createSchedulingPostgresRepository,
  createTransactionPort,
  ruleContainsRange,
  toCamelRow
} = require('../backend/modules/scheduling/scheduling-postgres-repository');
const { REQUIRED_TRANSACTION_METHODS, mapRepositoryError } = require('../backend/modules/scheduling/scheduling-repository-port');

function response(rows) {
  return { rows: rows || [] };
}

function createScriptedClient(script) {
  const calls = [];
  const queues = new Map(Object.entries(script || {}).map(([key, values]) => [key, [...values]]));
  let released = false;
  return {
    calls,
    get released() { return released; },
    release() { released = true; },
    async query(text, values) {
      calls.push({ text, values: values || [] });
      const normalized = String(text).trim().toLowerCase();
      if (normalized.startsWith('begin ') || normalized === 'commit' || normalized === 'rollback') return response();
      if (normalized.includes('set_config(')) return response([{ set_config: '' }]);
      const tag = (String(text).match(/\/\* sched-a05:([^*]+) \*\//) || [])[1];
      const queue = queues.get(tag);
      if (!queue || !queue.length) throw new Error(`Unexpected SQL tag: ${tag || normalized}`);
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return response(next);
    }
  };
}

function createPool(client) {
  return { async connect() { return client; } };
}

(async () => {
  assert.deepStrictEqual(toCamelRow({ professional_id: 'pro-1', hold_expires_at: null }), {
    professionalId: 'pro-1', holdExpiresAt: null
  });

  const mondayRule = {
    status: 'active',
    timezone: 'America/Bahia',
    rule: { weekdays: [1, 2, 3, 4, 5], windows: [{ start: '09:00', end: '18:00' }] }
  };
  assert.strictEqual(ruleContainsRange(mondayRule, {
    timezone: 'America/Bahia',
    localStart: '2026-08-03T09:00:00',
    localEnd: '2026-08-03T10:00:00'
  }), true);
  assert.strictEqual(ruleContainsRange(mondayRule, {
    timezone: 'America/Bahia',
    localStart: '2026-08-03T18:00:00',
    localEnd: '2026-08-03T19:00:00'
  }), false);
  assert.strictEqual(ruleContainsRange({ ...mondayRule, rule: { custom: true } }, {
    timezone: 'America/Bahia', localStart: '2026-08-03T09:00:00', localEnd: '2026-08-03T10:00:00'
  }), false, 'Unknown rule shapes must fail closed.');

  const insertedIdempotency = {
    command_name: 'create_schedule_hold', principal_key: 'user:client-1',
    idempotency_key: 'hold-1', request_hash: 'a'.repeat(64), state: 'in_progress'
  };
  const completedIdempotency = {
    ...insertedIdempotency, state: 'completed', result_payload: { ok: true }
  };
  const client = createScriptedClient({
    'claim-idempotency-insert': [[insertedIdempotency], []],
    'claim-idempotency-read': [[completedIdempotency]],
    'complete-idempotency': [[completedIdempotency]],
    'list-active-availability-rules': [[{
      id: 'rule-1', professional_id: 'pro-1', timezone: 'America/Bahia', status: 'active',
      version: 1, rule: mondayRule.rule
    }]],
    'list-active-reservations': [[{
      id: 'res-1', professional_id: 'pro-1', order_id: 'order-1',
      starts_at: '2026-08-03T12:00:00.000Z', ends_at: '2026-08-03T13:00:00.000Z', status: 'held'
    }]],
    'list-expired-holds': [[{
      id: 'res-expired', professional_id: 'pro-1', order_id: 'order-2',
      starts_at: '2026-08-03T10:00:00.000Z', ends_at: '2026-08-03T11:00:00.000Z',
      status: 'held', hold_expires_at: '2026-08-03T09:59:00.000Z', version: 1
    }]],
    'insert-event': [[{ event_key: 'schedule:reservation:res-1:v1' }]],
    'project-order-schedule': [[{
      id: 'order-1', client_id: 'client-1', professional_id: 'pro-1', status: 'accepted',
      scheduled_at: '2026-08-03T12:00:00.000Z', schedule_reservation_id: 'res-1'
    }]],
    'clear-order-schedule': [[{
      id: 'order-1', client_id: 'client-1', professional_id: 'pro-1', status: 'accepted',
      scheduled_at: null, schedule_reservation_id: null
    }]]
  });
  const repository = createSchedulingPostgresRepository({ pool: createPool(client) });

  const result = await repository.transaction(async (tx) => {
    REQUIRED_TRANSACTION_METHODS.forEach((method) => assert.strictEqual(typeof tx[method], 'function', method));
    const claimed = await tx.claimIdempotency({
      commandName: 'create_schedule_hold', principalKey: 'user:client-1', idempotencyKey: 'hold-1',
      requestHash: 'a'.repeat(64), claimedAt: '2026-08-03T10:00:00.000Z', expiresAt: '2026-09-02T10:00:00.000Z'
    });
    assert.strictEqual(claimed.state, 'claimed');
    const replay = await tx.claimIdempotency({
      commandName: 'create_schedule_hold', principalKey: 'user:client-1', idempotencyKey: 'hold-1',
      requestHash: 'a'.repeat(64), claimedAt: '2026-08-03T10:00:01.000Z', expiresAt: '2026-09-02T10:00:01.000Z'
    });
    assert.strictEqual(replay.state, 'completed');
    await tx.completeIdempotency({
      commandName: 'create_schedule_hold', principalKey: 'user:client-1', idempotencyKey: 'hold-1',
      requestHash: 'a'.repeat(64), aggregateType: 'reservation', aggregateId: 'res-1',
      availabilityRuleId: null, reservationId: 'res-1', resultPayload: { ok: true },
      completedAt: '2026-08-03T10:00:02.000Z'
    });
    assert.strictEqual(await tx.isRangeAvailable({
      professionalId: 'pro-1', timezone: 'America/Bahia',
      localStart: '2026-08-03T09:00:00', localEnd: '2026-08-03T10:00:00'
    }), true);
    const active = await tx.listActiveReservations('pro-1', {
      startsAt: '2026-08-03T12:00:00.000Z', endsAt: '2026-08-03T13:00:00.000Z', excludeReservationId: 'res-2'
    });
    assert.strictEqual(active[0].professionalId, 'pro-1');
    const expired = await tx.listExpiredHolds('2026-08-03T10:00:00.000Z', 20);
    assert.strictEqual(expired[0].holdExpiresAt, '2026-08-03T09:59:00.000Z');
    await tx.insertEvent({
      eventKey: 'schedule:reservation:res-1:v1', aggregateType: 'reservation', aggregateId: 'res-1',
      availabilityRuleId: null, reservationId: 'res-1', orderId: 'order-1', professionalId: 'pro-1',
      sequenceNo: 1, eventType: 'schedule.hold_created', actorId: 'client-1',
      actorRole: 'client_order_participant', command: 'create_schedule_hold', payload: { status: 'held' },
      correlationId: 'corr-1', causationId: 'cause-1', occurredAt: '2026-08-03T10:00:00.000Z'
    });
    const projected = await tx.projectOrderSchedule('order-1', 'res-1', '2026-08-03T12:00:00.000Z');
    assert.strictEqual(projected.scheduleReservationId, 'res-1');
    const cleared = await tx.clearOrderSchedule('order-1', 'res-1');
    assert.strictEqual(cleared.scheduleReservationId, null);
    return 'committed';
  });
  assert.strictEqual(result, 'committed');
  assert.strictEqual(client.released, true);
  assert(client.calls[0].text.toLowerCase().includes('begin isolation level serializable read write'));
  assert.strictEqual(client.calls.at(-1).text.toLowerCase(), 'commit');
  const expiredSql = client.calls.find((call) => call.text.includes('sched-a05:list-expired-holds')).text.toLowerCase();
  assert(expiredSql.includes('for update skip locked'));
  const overlapSql = client.calls.find((call) => call.text.includes('sched-a05:list-active-reservations')).text;
  assert(overlapSql.includes("tstzrange($2::timestamptz, $3::timestamptz, '[)')"));
  const eventCall = client.calls.find((call) => call.text.includes('sched-a05:insert-event'));
  assert.deepStrictEqual(JSON.parse(eventCall.values[12])._eventMeta, { correlationId: 'corr-1', causationId: 'cause-1' });

  const versionClient = createScriptedClient({ 'update-reservation': [[]] });
  const tx = createTransactionPort(versionClient);
  await assert.rejects(
    () => tx.updateReservation('res-1', 3, { status: 'confirmed', holdExpiresAt: null, version: 4, updatedAt: '2026-08-03T10:00:00.000Z' }),
    (error) => error.code === '40001'
  );

  const projectionSqlError = new Error('DOKE_SCHEDULE_ORDER_PROJECTION_FAILED');
projectionSqlError.code = '40001';
const mappedProjectionError = mapRepositoryError(projectionSqlError);
assert.strictEqual(mappedProjectionError.code, 'DOKE_SCHEDULE_ORDER_PROJECTION_FAILED');
assert.strictEqual(mappedProjectionError.sqlState, '40001');

  const rollbackClient = createScriptedClient({});
  const rollbackRepository = createSchedulingPostgresRepository({ pool: createPool(rollbackClient) });
  await assert.rejects(() => rollbackRepository.transaction(async () => {
    throw new Error('synthetic transaction failure');
  }), /synthetic transaction failure/);
  assert.strictEqual(rollbackClient.calls.at(-1).text.toLowerCase(), 'rollback');
  assert.strictEqual(rollbackClient.released, true);

  assert.throws(
    () => createSchedulingPostgresRepository({ pool: createPool(client), isolationLevel: 'read uncommitted' }),
    (error) => error.code === 'DOKE_SCHEDULE_POSTGRES_ISOLATION_INVALID'
  );

  console.log('SCHED-A05 PostgreSQL persistence adapter runtime tests passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
