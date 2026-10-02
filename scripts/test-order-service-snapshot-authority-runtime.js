#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const ordersService = require('../backend/modules/orders/orders-service');

const clientId = 'b0400000-0000-4000-8000-000000000001';
const professionalId = 'b0400000-0000-4000-8000-000000000002';
const forgedProfessionalId = 'b0400000-0000-4000-8000-000000000003';
const forgedServiceId = 'b0400000-0000-4000-8000-000000000099';
const serviceId = 'b0400000-0000-4000-8000-000000000010';
const versionId = 'b0400000-0000-4000-8000-000000000011';
const externalServiceId = 'service-external-cat-b04';

function makeSupabase(serviceOverride) {
  const calls = [];
  const service = Object.assign({
    id: serviceId,
    external_id: externalServiceId,
    professional_id: professionalId,
    status: 'published',
    moderation_status: 'published',
    approved_version_id: versionId
  }, serviceOverride || {});

  function servicesBuilder() {
    const state = { filter: null, value: null, select: '' };
    return {
      select(value) {
        state.select = value;
        calls.push({ type: 'service-select', value });
        return this;
      },
      eq(filter, value) {
        state.filter = filter;
        state.value = value;
        calls.push({ type: 'service-filter', filter, value });
        return this;
      },
      maybeSingle() {
        const matched = state.filter === 'id'
          ? state.value === service.id
          : state.filter === 'external_id'
            ? state.value === service.external_id
            : false;
        return Promise.resolve({ data: matched ? service : null, error: null });
      }
    };
  }

  const supabase = {
    calls,
    from(table) {
      calls.push({ type: 'from', table });
      if (table === 'services') return servicesBuilder();
      throw new Error('Unexpected direct table access during CAT-B04 create: ' + table);
    },
    rpc(name, payload) {
      calls.push({ type: 'rpc', name, payload });
      if (name !== 'create_order_command') {
        throw new Error('Unexpected RPC: ' + name);
      }
      const canonicalSnapshot = {
        id: externalServiceId,
        title: 'Snapshot aprovado',
        priceValue: 125,
        serviceId,
        serviceVersionId: versionId,
        professionalId,
        snapshotAuthority: 'approved_service_version'
      };
      return Promise.resolve({
        data: {
          id: 'b0400000-0000-4000-8000-000000000020',
          client_id: clientId,
          professional_id: professionalId,
          service_id: serviceId,
          service_version_id: versionId,
          service_snapshot: canonicalSnapshot,
          title: payload.p_title,
          description: payload.p_description,
          status: 'requested',
          metadata: Object.assign({}, payload.p_metadata, {
            serviceSnapshot: canonicalSnapshot,
            serviceVersionId: versionId,
            serviceSnapshotAuthority: 'approved_service_version'
          }),
          created_at: '2026-07-28T02:00:00.000Z',
          updated_at: '2026-07-28T02:00:00.000Z'
        },
        error: null
      });
    }
  };
  return supabase;
}

async function runCanonicalCreate() {
  const supabase = makeSupabase();
  const result = await ordersService.createOrder({
    supabase,
    body: {
      serviceId: externalServiceId,
      professionalId: forgedProfessionalId,
      professional_id: forgedProfessionalId,
      providerId: forgedProfessionalId,
      provider_id: forgedProfessionalId,
      title: 'Pedido de snapshot',
      details: 'Detalhes específicos do pedido.',
      metadata: {
        serviceId: forgedServiceId,
        service_id: forgedServiceId,
        professionalId: forgedProfessionalId,
        professional_id: forgedProfessionalId,
        providerId: forgedProfessionalId,
        provider_id: forgedProfessionalId,
        serviceSnapshot: { title: 'FORGED' },
        service_snapshot: { title: 'FORGED_SNAKE' },
        serviceVersionId: 'forged-version',
        service_version_id: 'forged-version-snake',
        serviceSnapshotAuthority: 'browser',
        service_snapshot_authority: 'browser-snake',
        quoteAnswers: [{ questionId: 'q1', answer: 'Resposta' }]
      }
    }
  }, { id: clientId, role: 'client' });

  const serviceFilter = supabase.calls.find((call) => call.type === 'service-filter');
  assert.deepEqual(serviceFilter, {
    type: 'service-filter',
    filter: 'external_id',
    value: externalServiceId
  });

  const rpc = supabase.calls.find((call) => call.type === 'rpc');
  assert.ok(rpc, 'canonical create_order_command RPC was not called');
  assert.equal(rpc.name, 'create_order_command');
  assert.equal(rpc.payload.p_service_ref, externalServiceId);
  assert.equal(Object.prototype.hasOwnProperty.call(rpc.payload, 'p_professional_id'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(rpc.payload, 'p_service_id'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(rpc.payload, 'p_service_snapshot'), false);

  [
    'serviceId',
    'service_id',
    'professionalId',
    'professional_id',
    'providerId',
    'provider_id',
    'serviceSnapshot',
    'service_snapshot',
    'serviceVersionId',
    'service_version_id',
    'serviceSnapshotAuthority',
    'service_snapshot_authority'
  ].forEach((key) => {
    assert.equal(
      Object.prototype.hasOwnProperty.call(rpc.payload.p_metadata, key),
      false,
      'authority-shaped metadata must be stripped before RPC: ' + key
    );
  });
  assert.equal(Array.isArray(rpc.payload.p_metadata.quoteAnswers), true);
  assert.equal(supabase.calls.some((call) => call.type === 'from' && call.table === 'orders'), false);

  assert.equal(result.status, 'created');
  assert.equal(result.order.professionalId, professionalId);
  assert.equal(result.order.serviceId, serviceId);
  assert.equal(result.order.serviceVersionId, versionId);
  assert.equal(result.order.serviceSnapshot.title, 'Snapshot aprovado');
  assert.equal(result.order.serviceSnapshot.snapshotAuthority, 'approved_service_version');
}

async function runEligibilityFailures() {
  const ineligible = makeSupabase({ status: 'paused' });
  await assert.rejects(
    ordersService.createOrder({
      supabase: ineligible,
      body: { serviceId: externalServiceId, title: 'Pedido bloqueado' }
    }, { id: clientId, role: 'client' }),
    (error) => error && error.code === 'DOKE_ORDER_SERVICE_NOT_ELIGIBLE'
  );
  assert.equal(ineligible.calls.some((call) => call.type === 'rpc'), false);

  const ownService = makeSupabase();
  await assert.rejects(
    ordersService.createOrder({
      supabase: ownService,
      body: { serviceId: externalServiceId, title: 'Pedido próprio' }
    }, { id: professionalId, role: 'professional' }),
    (error) => error && error.code === 'DOKE_ORDER_OWN_SERVICE_FORBIDDEN'
  );
  assert.equal(ownService.calls.some((call) => call.type === 'rpc'), false);
}

Promise.resolve()
  .then(runCanonicalCreate)
  .then(runEligibilityFailures)
  .then(() => {
    console.log('Order approved-version snapshot RPC authority runtime: PASS');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
