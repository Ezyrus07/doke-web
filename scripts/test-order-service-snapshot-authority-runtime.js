#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const ordersService = require('../backend/modules/orders/orders-service');

const clientId = 'b0400000-0000-4000-8000-000000000001';
const professionalId = 'b0400000-0000-4000-8000-000000000002';
const forgedProfessionalId = 'b0400000-0000-4000-8000-000000000003';
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
      select(value) { state.select = value; calls.push({ type: 'service-select', value }); return this; },
      eq(filter, value) { state.filter = filter; state.value = value; calls.push({ type: 'service-filter', filter, value }); return this; },
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

  function ordersBuilder() {
    let inserted = null;
    return {
      insert(payload) { inserted = payload; calls.push({ type: 'order-insert', payload }); return this; },
      select(value) { calls.push({ type: 'order-select', value }); return this; },
      maybeSingle() {
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
          data: Object.assign({
            id: 'b0400000-0000-4000-8000-000000000020',
            service_version_id: versionId,
            service_snapshot: canonicalSnapshot,
            created_at: '2026-07-28T02:00:00.000Z',
            updated_at: '2026-07-28T02:00:00.000Z'
          }, inserted, {
            professional_id: professionalId,
            service_id: serviceId,
            metadata: Object.assign({}, inserted.metadata, {
              serviceSnapshot: canonicalSnapshot,
              serviceVersionId: versionId,
              serviceSnapshotAuthority: 'approved_service_version'
            })
          }),
          error: null
        });
      }
    };
  }

  return {
    calls,
    from(table) {
      if (table === 'services') return servicesBuilder();
      if (table === 'orders') return ordersBuilder();
      throw new Error('Unexpected table: ' + table);
    }
  };
}

async function runCanonicalCreate() {
  const supabase = makeSupabase();
  const result = await ordersService.createOrder({
    supabase,
    body: {
      serviceId: externalServiceId,
      professionalId: forgedProfessionalId,
      providerId: forgedProfessionalId,
      title: 'Pedido de snapshot',
      details: 'Detalhes específicos do pedido.',
      serviceSnapshot: { title: 'FORGED' },
      serviceVersionId: 'forged-version',
      serviceSnapshotAuthority: 'browser',
      quoteAnswers: [{ questionId: 'q1', answer: 'Resposta' }]
    }
  }, { id: clientId, role: 'client' });

  const serviceFilter = supabase.calls.find((call) => call.type === 'service-filter');
  assert.deepEqual(serviceFilter, {
    type: 'service-filter',
    filter: 'external_id',
    value: externalServiceId
  });

  const insert = supabase.calls.find((call) => call.type === 'order-insert');
  assert.ok(insert, 'canonical order insert was not called');
  assert.equal(insert.payload.client_id, clientId);
  assert.equal(insert.payload.professional_id, professionalId);
  assert.equal(insert.payload.service_id, serviceId);
  assert.equal(Object.prototype.hasOwnProperty.call(insert.payload.metadata, 'serviceSnapshot'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(insert.payload.metadata, 'serviceVersionId'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(insert.payload.metadata, 'serviceSnapshotAuthority'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(insert.payload.metadata, 'professionalId'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(insert.payload.metadata, 'providerId'), false);
  assert.equal(Array.isArray(insert.payload.metadata.quoteAnswers), true);

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
  assert.equal(ineligible.calls.some((call) => call.type === 'order-insert'), false);

  const ownService = makeSupabase();
  await assert.rejects(
    ordersService.createOrder({
      supabase: ownService,
      body: { serviceId: externalServiceId, title: 'Pedido próprio' }
    }, { id: professionalId, role: 'client' }),
    (error) => error && error.code === 'DOKE_ORDER_OWN_SERVICE_FORBIDDEN'
  );
  assert.equal(ownService.calls.some((call) => call.type === 'order-insert'), false);
}

Promise.resolve()
  .then(runCanonicalCreate)
  .then(runEligibilityFailures)
  .then(() => {
    console.log('Order approved-version snapshot backend runtime: PASS');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
