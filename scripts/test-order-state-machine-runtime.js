'use strict';

const assert = require('assert');
const orders = require('../backend/modules/orders/orders-service');

function createSupabase(initialOrder, options) {
  const state = {
    order: Object.assign({}, initialOrder),
    rpcCalls: [],
    updateCount: 0
  };
  const config = options || {};

  function from(table) {
    if (table !== 'orders') throw new Error(`Unexpected table ${table}`);
    return ordersQuery();
  }

  function ordersQuery() {
    const filters = [];
    const query = {
      select() { return query; },
      eq(column, value) { filters.push([column, value]); return query; },
      async maybeSingle() {
        const matches = filters.every(([column, value]) => state.order[column] === value);
        return { data: matches ? Object.assign({}, state.order) : null, error: null };
      }
    };
    return query;
  }

  async function rpc(name, payload) {
    if (name !== 'transition_order_status') throw new Error(`Unexpected RPC ${name}`);
    state.rpcCalls.push({ name, payload: Object.assign({}, payload) });
    if (typeof config.beforeRpc === 'function') config.beforeRpc(state, payload);
    if (state.order.id !== payload.p_order_id || state.order.status !== payload.p_expected_status) {
      return { data: null, error: { code: '40001', message: 'DOKE_ORDER_CONFLICT' } };
    }
    state.updateCount += 1;
    state.order = Object.assign({}, state.order, {
      status: payload.p_next_status,
      updated_at: '2026-07-21T01:00:00.000Z'
    });
    return { data: Object.assign({}, state.order), error: null };
  }

  return { client: { from, rpc }, state };
}

function baseOrder(status) {
  return {
    id: 'order-1',
    client_id: 'client-1',
    professional_id: 'professional-1',
    service_id: 'service-1',
    title: 'Pedido teste',
    description: '',
    status,
    city: 'Salvador',
    state: 'BA',
    scheduled_at: null,
    created_at: '2026-07-21T00:00:00.000Z',
    updated_at: '2026-07-21T00:00:00.000Z'
  };
}

const professional = { id: 'professional-1', role: 'professional' };
const internal = { id: 'support-1', role: 'support' };

async function main() {
  {
    const runtime = createSupabase(baseOrder('requested'));
    const result = await orders.acceptOrder({ supabase: runtime.client, body: {} }, professional, 'order-1');
    assert.strictEqual(result.status, 'accepted');
    assert.strictEqual(runtime.state.order.status, 'accepted');
    assert.strictEqual(runtime.state.rpcCalls.length, 1);
    assert.strictEqual(runtime.state.rpcCalls[0].payload.p_action, 'accept');
  }

  {
    const runtime = createSupabase(baseOrder('requested'));
    await assert.rejects(
      () => orders.completeOrder({ supabase: runtime.client, body: {} }, professional, 'order-1'),
      (error) => error && error.code === 'DOKE_ORDER_TRANSITION_INVALID' && error.status === 409
    );
    assert.strictEqual(runtime.state.updateCount, 0);
  }

  {
    const runtime = createSupabase(baseOrder('accepted'));
    await orders.startOrder({ supabase: runtime.client, body: {} }, professional, 'order-1');
    assert.strictEqual(runtime.state.order.status, 'in_progress');
    await orders.completeOrder({ supabase: runtime.client, body: {} }, professional, 'order-1');
    assert.strictEqual(runtime.state.order.status, 'completed');
  }

  {
    const runtime = createSupabase(baseOrder('requested'), {
      beforeRpc(state) { state.order.status = 'cancelled'; }
    });
    await assert.rejects(
      () => orders.acceptOrder({ supabase: runtime.client, body: {} }, professional, 'order-1'),
      (error) => error && error.code === 'DOKE_ORDER_CONFLICT' && error.status === 409
    );
  }

  {
    const runtime = createSupabase(baseOrder('requested'));
    await assert.rejects(
      () => orders.updateOrderStatus({ serviceSupabase: runtime.client, body: { status: 'completed' } }, internal, 'order-1'),
      (error) => error && error.code === 'DOKE_ORDER_TRANSITION_INVALID'
    );
  }

  console.log('[test:order-state-machine-runtime] ok');
  console.log('- positive lifecycle executed through transactional RPC');
  console.log('- invalid skip rejected before write');
  console.log('- stale status rejected with conflict');
  console.log('- internal operator remains graph-bound');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
