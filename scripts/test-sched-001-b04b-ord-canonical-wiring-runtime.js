#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  SCHEDULE_AUTHORITY,
  readScheduleProjection,
  readSchedulePreference,
  applySchedulePreference,
  assertStartScheduleAuthority,
  assertGenericCancellationAllowed
} = require('../backend/modules/orders/order-scheduling-authority');
const {
  normalizeOrder,
  createOrder,
  declineOrder,
  startOrder,
  updateOrderStatus
} = require('../backend/modules/orders/orders-service');
const { assertTransition } = require('../backend/modules/orders/order-state-machine');
const { createTransactionPort } = require('../backend/modules/scheduling/scheduling-postgres-repository');

function createOrderRuntime(options) {
  const config = options || {};
  const calls = [];
  const order = config.order || {
    id: 'order-1',
    external_id: 'ord-1',
    client_id: 'client-1',
    professional_id: 'pro-1',
    service_id: 'service-1',
    status: 'accepted',
    schedule_reservation_id: null,
    scheduled_at: null,
    metadata: {}
  };
  const service = config.service || {
    id: 'service-1',
    external_id: 'svc-1',
    professional_id: 'pro-1',
    status: 'published',
    moderation_status: 'published',
    approved_version_id: 'version-1'
  };

  const supabase = {
    calls,
    from(table) {
      const state = { table, filters: [] };
      return {
        select(columns) { state.columns = columns; calls.push({ type: 'select', table, columns }); return this; },
        eq(column, value) { state.filters.push([column, value]); return this; },
        order() { return this; },
        limit() { return this; },
        async maybeSingle() {
          if (table === 'services') return { data: service, error: null };
          if (table === 'orders') return { data: order, error: null };
          return { data: null, error: null };
        },
        then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); }
      };
    },
    async rpc(name, args) {
      calls.push({ type: 'rpc', name, args });
      if (name === 'create_order_command') {
        return {
          data: {
            ...order,
            id: 'order-created',
            external_id: 'ord-created',
            status: 'requested',
            metadata: args.p_metadata,
            schedule_reservation_id: null,
            scheduled_at: null
          },
          error: null
        };
      }
      if (name === 'transition_order_status') {
        return {
          data: {
            ...order,
            status: args.p_next_status
          },
          error: null
        };
      }
      throw new Error(`Unexpected RPC ${name}`);
    }
  };
  return supabase;
}

(async () => {
  assert.deepStrictEqual(readScheduleProjection({}), {
    scheduleReservationId: '',
    scheduledAt: '',
    authority: SCHEDULE_AUTHORITY.none,
    canonical: false
  });
  assert.strictEqual(readScheduleProjection({ scheduled_at: '2026-08-03T12:00:00.000Z' }).authority, SCHEDULE_AUTHORITY.incomplete);
  assert.strictEqual(readScheduleProjection({
    schedule_reservation_id: 'reservation-1',
    scheduled_at: '2026-08-03T12:00:00.000Z'
  }).authority, SCHEDULE_AUTHORITY.canonical);

  const normalized = normalizeOrder({
    id: 'order-1',
    status: 'scheduled',
    schedule_reservation_id: 'reservation-1',
    scheduled_at: '2026-08-03T12:00:00.000Z'
  });
  assert.strictEqual(normalized.scheduleReservationId, 'reservation-1');
  assert.strictEqual(normalized.scheduledAt, '2026-08-03T12:00:00.000Z');
  assert.strictEqual(normalized.scheduleAuthority, SCHEDULE_AUTHORITY.canonical);
  assert.strictEqual(normalized.hasCanonicalSchedule, true);

  const preference = readSchedulePreference({ scheduledAt: '2026-08-03T09:00:00-03:00' });
  assert.deepStrictEqual(preference, {
    requestedAt: '2026-08-03T12:00:00.000Z',
    authority: 'client_intent'
  });
  assert.deepStrictEqual(applySchedulePreference({ scheduled_at: 'forged', keep: true }, preference), {
    keep: true,
    schedulePreference: preference
  });
  assert.throws(
    () => readSchedulePreference({ scheduledAt: 'not-a-date' }),
    (error) => error.code === 'DOKE_ORDER_SCHEDULE_PREFERENCE_INVALID'
  );

  const createRuntime = createOrderRuntime();
  const created = await createOrder({
    supabase: createRuntime,
    body: {
      serviceId: 'service-1',
      title: 'Instalação elétrica',
      scheduledAt: '2026-08-03T09:00:00-03:00',
      metadata: { source: 'test', schedule_reservation_id: 'forged' }
    }
  }, { id: 'client-1', role: 'client' });
  assert.strictEqual(created.order.scheduleReservationId, '');
  const createRpc = createRuntime.calls.find((call) => call.type === 'rpc' && call.name === 'create_order_command');
  assert.strictEqual(createRpc.args.p_scheduled_at, null);
  assert.deepStrictEqual(createRpc.args.p_metadata.schedulePreference, preference);
  assert.strictEqual(createRpc.args.p_metadata.schedule_reservation_id, undefined);

  await assertStartScheduleAuthority({}, { id: 'order-1' });
  await assert.rejects(
    () => assertStartScheduleAuthority({}, {
      id: 'order-1', scheduleReservationId: 'reservation-1', scheduledAt: '2026-08-03T12:00:00.000Z'
    }),
    (error) => error.code === 'DOKE_ORDER_SCHEDULE_AUTHORITY_UNAVAILABLE'
  );
  const startAuthority = await assertStartScheduleAuthority({
    schedulingAuthority: {
      async getReservation() {
        return {
          id: 'reservation-1',
          orderId: 'order-1',
          status: 'confirmed',
          startsAt: '2026-08-03T12:00:00.000Z'
        };
      }
    }
  }, {
    id: 'order-1', scheduleReservationId: 'reservation-1', scheduledAt: '2026-08-03T12:00:00.000Z'
  });
  assert.strictEqual(startAuthority.required, true);
  assert.strictEqual(startAuthority.reservation.status, 'confirmed');
  await assert.rejects(
    () => assertStartScheduleAuthority({
      schedulingAuthority: { async getReservation() { return { id: 'reservation-1', orderId: 'order-1', status: 'held', startsAt: '2026-08-03T12:00:00.000Z' }; } }
    }, { id: 'order-1', scheduleReservationId: 'reservation-1', scheduledAt: '2026-08-03T12:00:00.000Z' }),
    (error) => error.code === 'DOKE_ORDER_SCHEDULE_RESERVATION_NOT_CONFIRMED'
  );

  assert.throws(
    () => assertGenericCancellationAllowed({ id: 'order-1', scheduleReservationId: 'reservation-1' }),
    (error) => error.code === 'DOKE_ORDER_SCHEDULE_CANCELLATION_COMPOSITION_REQUIRED'
  );
  assert.strictEqual(assertGenericCancellationAllowed({ id: 'order-1' }), true);

  assert.throws(
    () => assertTransition({ currentStatus: 'accepted', nextStatus: 'scheduled', actorRole: 'professional', action: 'updateStatus' }),
    (error) => error.code === 'DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED'
  );
  assert.throws(
    () => assertTransition({ currentStatus: 'quoted', nextStatus: 'scheduled', actorRole: 'support', action: 'updateStatus' }),
    (error) => error.code === 'DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED'
  );

  const scheduledOrder = {
    id: 'order-1', external_id: 'ord-1', client_id: 'client-1', professional_id: 'pro-1',
    service_id: 'service-1', status: 'scheduled', schedule_reservation_id: 'reservation-1',
    scheduled_at: '2026-08-03T12:00:00.000Z', metadata: {}
  };
  const startRuntime = createOrderRuntime({ order: scheduledOrder });
  await startOrder({
    supabase: startRuntime,
    schedulingAuthority: {
      async getReservation() {
        return { id: 'reservation-1', orderId: 'order-1', status: 'confirmed', startsAt: '2026-08-03T12:00:00.000Z' };
      }
    }
  }, { id: 'pro-1', role: 'professional' }, 'order-1');
  assert(startRuntime.calls.some((call) => call.type === 'rpc' && call.name === 'transition_order_status'));

  const blockedStartRuntime = createOrderRuntime({ order: scheduledOrder });
  await assert.rejects(
    () => startOrder({ supabase: blockedStartRuntime }, { id: 'pro-1', role: 'professional' }, 'order-1'),
    (error) => error.code === 'DOKE_ORDER_SCHEDULE_AUTHORITY_UNAVAILABLE'
  );
  assert(!blockedStartRuntime.calls.some((call) => call.type === 'rpc'));

  const cancellationRuntime = createOrderRuntime({ order: scheduledOrder });
  await assert.rejects(
    () => declineOrder({ supabase: cancellationRuntime }, { id: 'pro-1', role: 'professional' }, 'order-1'),
    (error) => error.code === 'DOKE_ORDER_SCHEDULE_CANCELLATION_COMPOSITION_REQUIRED'
  );
  await assert.rejects(
    () => updateOrderStatus({ serviceSupabase: cancellationRuntime, body: { status: 'cancelled' } }, { id: 'support-1', role: 'support' }, 'order-1'),
    (error) => error.code === 'DOKE_ORDER_SCHEDULE_CANCELLATION_COMPOSITION_REQUIRED'
  );

  const sqlCalls = [];
  const tx = createTransactionPort({
    async query(text, values) {
      sqlCalls.push({ text, values });
      if (text.includes('sched-a05:project-order-schedule')) {
        return { rows: [{ id: 'order-1', status: 'scheduled', schedule_reservation_id: 'reservation-1', scheduled_at: '2026-08-03T12:00:00.000Z' }] };
      }
      if (text.includes('sched-a05:clear-order-schedule')) {
        return { rows: [{ id: 'order-1', status: 'accepted', schedule_reservation_id: null, scheduled_at: null }] };
      }
      throw new Error('Unexpected SQL');
    }
  });
  const projected = await tx.projectOrderSchedule('order-1', 'reservation-1', '2026-08-03T12:00:00.000Z');
  assert.strictEqual(projected.status, 'scheduled');
  const cleared = await tx.clearOrderSchedule('order-1', 'reservation-1');
  assert.strictEqual(cleared.status, 'accepted');

  const projectSql = sqlCalls[0].text.toLowerCase();
  const clearSql = sqlCalls[1].text.toLowerCase();
  const delegatesProjectionToB04D = projectSql.includes('private.apply_order_schedule_projection');
  const delegatesClearToB04D = clearSql.includes('private.clear_order_schedule_projection');
  assert.strictEqual(delegatesProjectionToB04D, delegatesClearToB04D,
    'Projection and clearing must use the same persistence strategy.');

  if (delegatesProjectionToB04D) {
    assert(projectSql.includes('/* sched-a05:project-order-schedule */'));
    assert(projectSql.includes('private.apply_order_schedule_projection'));
    assert(!projectSql.includes('update public.orders'));
    assert(clearSql.includes('/* sched-a05:clear-order-schedule */'));
    assert(clearSql.includes('private.clear_order_schedule_projection'));
    assert(!clearSql.includes('update public.orders'));
  } else {
    assert(projectSql.includes("status = 'scheduled'"));
    assert(projectSql.includes("status in ('accepted', 'scheduled')"));
    assert(projectSql.includes('schedule_reservation_id is null or schedule_reservation_id = $2'));
    assert(clearSql.includes("when status = 'scheduled' then 'accepted'"));
    assert(clearSql.includes('schedule_reservation_id = $2'));
  }

  console.log('SCHED-B04B ORD canonical wiring runtime tests passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
