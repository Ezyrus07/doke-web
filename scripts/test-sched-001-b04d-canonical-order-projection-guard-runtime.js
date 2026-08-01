#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { createTransactionPort } = require('../backend/modules/scheduling/scheduling-postgres-repository');

function createClient(script) {
  const calls = [];
  const queues = new Map(Object.entries(script || {}).map(([key, rows]) => [key, [...rows]]));
  return {
    calls,
    async query(text, values) {
      calls.push({ text: String(text), values: values || [] });
      const tag = (String(text).match(/\/\* sched-a05:([^*]+) \*\//) || [])[1];
      const queue = queues.get(tag);
      if (!queue || queue.length === 0) throw new Error(`Unexpected SQL tag: ${tag || text}`);
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return { rows: next, rowCount: next.length };
    }
  };
}

(async () => {
  const client = createClient({
    'project-order-schedule': [[{
      id: 'order-1',
      client_id: 'client-1',
      professional_id: 'professional-1',
      status: 'scheduled',
      schedule_reservation_id: 'reservation-1',
      scheduled_at: '2035-08-13T13:00:00.000Z'
    }]],
    'clear-order-schedule': [[{
      id: 'order-1',
      client_id: 'client-1',
      professional_id: 'professional-1',
      status: 'accepted',
      schedule_reservation_id: null,
      scheduled_at: null
    }]]
  });
  const tx = createTransactionPort(client);

  const projected = await tx.projectOrderSchedule(
    'order-1',
    'reservation-1',
    '2035-08-13T13:00:00.000Z'
  );
  assert.strictEqual(projected.status, 'scheduled');
  assert.strictEqual(projected.scheduleReservationId, 'reservation-1');
  assert.strictEqual(projected.scheduledAt, '2035-08-13T13:00:00.000Z');

  const cleared = await tx.clearOrderSchedule('order-1', 'reservation-1');
  assert.strictEqual(cleared.status, 'accepted');
  assert.strictEqual(cleared.scheduleReservationId, null);
  assert.strictEqual(cleared.scheduledAt, null);

  const projectCall = client.calls.find((call) => call.text.includes('sched-a05:project-order-schedule'));
  const clearCall = client.calls.find((call) => call.text.includes('sched-a05:clear-order-schedule'));
  assert(projectCall.text.includes('private.apply_order_schedule_projection'));
  assert(clearCall.text.includes('private.clear_order_schedule_projection'));
  assert(!projectCall.text.includes('update public.orders'));
  assert(!clearCall.text.includes('update public.orders'));
  assert.deepStrictEqual(projectCall.values, [
    'order-1',
    'reservation-1',
    '2035-08-13T13:00:00.000Z'
  ]);
  assert.deepStrictEqual(clearCall.values, ['order-1', 'reservation-1']);

  const projectFailure = createTransactionPort(createClient({
    'project-order-schedule': [[]]
  }));
  await assert.rejects(
    () => projectFailure.projectOrderSchedule(
      'order-1',
      'reservation-2',
      '2035-08-13T14:00:00.000Z'
    ),
    (error) => error.code === 'DOKE_SCHEDULE_ORDER_PROJECTION_FAILED'
  );

  const clearFailure = createTransactionPort(createClient({
    'clear-order-schedule': [[]]
  }));
  await assert.rejects(
    () => clearFailure.clearOrderSchedule('order-1', 'reservation-2'),
    (error) => error.code === 'DOKE_SCHEDULE_ORDER_CLEAR_FAILED'
  );

  console.log('SCHED-B04D canonical order projection guard runtime tests passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
