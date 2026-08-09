from pathlib import Path

service_path = Path('assets/js/services/notification-service.js')
event_path = Path('assets/js/core/notification-event.js')
service = service_path.read_text()
event = event_path.read_text()


def replace_service_once(old, new, label):
    global service
    count = service.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    service = service.replace(old, new, 1)


def replace_event_once(old, new, label):
    global event
    count = event.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    event = event.replace(old, new, 1)


# Producer-native canonical category must take precedence over legacy UI category.
replace_event_once(
    'var category = normalizeCategory(raw.category, eventType);',
    'var category = normalizeCategory(raw.eventCategory || raw.canonicalCategory || raw.category, eventType);',
    'event category precedence'
)

marker = "var DEMO_PROFESSIONAL_ID = 'user_profissional_demo';"
if service.count(marker) != 1:
    raise SystemExit('producer helper marker mismatch')
helper = """function canonicalizeProducerPayload(payload) {
    payload = payload || {};
    var eventId = normalizeText(payload.eventId || '');
    var eventType = normalizeText(payload.eventType || '').toLowerCase();
    var eventCategory = normalizeText(payload.eventCategory || '').toUpperCase();
    if (!eventId || !eventType || !eventCategory) return payload;

    return Object.assign({}, payload, {
      eventId: eventId,
      eventType: eventType,
      eventVersion: Math.max(1, Number(payload.eventVersion || 1) || 1),
      sourceDomain: normalizeText(payload.sourceDomain || eventCategory).toUpperCase(),
      sourceAuthority: normalizeText(payload.sourceAuthority || 'DERIVED_INFORMATIONAL').toUpperCase(),
      eventCategory: eventCategory,
      dedupeKey: eventId,
      eventKey: eventId
    });
  }

  """
service = service.replace(marker, helper + marker, 1)

replace_service_once(
    "payload = payload || {};\n    var boundary = getBoundary();",
    "payload = canonicalizeProducerPayload(payload || {});\n    var boundary = getBoundary();",
    'canonicalize create boundary'
)

# Dynamic semantics: proposal state is canonical PROPOSALS, but order status copies of
# payment state remain ORDERS. Definitive payment claims come from payment producers.
target_marker = "var targetUrl = 'pedidos.html?order=' + encodeURIComponent(order.id || '');"
replace_service_once(
    target_marker,
    target_marker + "\n    var canonicalEventType = 'order_status_changed';\n    var canonicalEventCategory = 'ORDERS';",
    'order status canonical defaults'
)
replace_service_once(
    "if (normalizedStatus === 'accepted' || normalizedStatus === 'conversation') {",
    "if (normalizedStatus === 'accepted' || normalizedStatus === 'conversation') {\n      canonicalEventType = 'order_accepted';",
    'accepted semantic'
)
replace_service_once(
    "if (normalizedStatus === 'quoted') {",
    "if (normalizedStatus === 'quoted') {\n      canonicalEventType = 'proposal_sent';\n      canonicalEventCategory = 'PROPOSALS';",
    'quoted semantic'
)
payment_confirmed_line = "var paymentConfirmed = ['paid', 'confirmed', 'held', 'released'].indexOf(paymentStatus) !== -1 || options.paymentConfirmed === true;"
replace_service_once(
    payment_confirmed_line,
    payment_confirmed_line + "\n      canonicalEventType = paymentConfirmed ? 'order_in_progress' : 'proposal_approved';\n      canonicalEventCategory = paymentConfirmed ? 'ORDERS' : 'PROPOSALS';",
    'payment-derived order status semantic'
)
payment_released_line = "var paymentReleased = normalizeText(options.paymentStatus || order.paymentStatus || '').toLowerCase() === 'released';"
replace_service_once(
    payment_released_line,
    payment_released_line + "\n      canonicalEventType = 'order_completed';\n      canonicalEventCategory = 'ORDERS';",
    'completed order semantic'
)
professional_cancel_line = "var professionalCancelled = cancellationType === 'professional_cancelled_before_payment';"
replace_service_once(
    professional_cancel_line,
    professional_cancel_line + "\n      canonicalEventType = proposalRejected ? 'proposal_rejected' : 'order_cancelled';\n      canonicalEventCategory = proposalRejected ? 'PROPOSALS' : 'ORDERS';",
    'cancel semantic'
)

replacements = [
    (
        "eventKey: ['order_created', order.id || '', recipientId].filter(Boolean).join(':')",
        "eventId: ['order_created', order.id || '', recipientId].filter(Boolean).join(':'),\n      eventType: 'order_created',\n      eventCategory: 'ORDERS',\n      eventKey: ['order_created', order.id || '', recipientId].filter(Boolean).join(':')",
        'order created event'
    ),
    (
        "eventKey: eventKeyParts.filter(Boolean).join(':')",
        "eventId: [canonicalEventType, order.id || '', normalizedStatus || '', paymentMessageId, recipientId].filter(Boolean).join(':'),\n      eventType: canonicalEventType,\n      eventCategory: canonicalEventCategory,\n      eventKey: eventKeyParts.filter(Boolean).join(':')",
        'order status event'
    ),
    (
        "eventKey: ['order_reviewed', order.id || review.orderId || '', review.id || '', recipientId].filter(Boolean).join(':')",
        "eventId: ['order_reviewed', order.id || review.orderId || '', review.id || options.messageId || review.messageId || '', recipientId].filter(Boolean).join(':'),\n      eventType: 'order_reviewed',\n      eventCategory: 'ORDERS',\n      eventKey: ['order_reviewed', order.id || review.orderId || '', review.id || '', recipientId].filter(Boolean).join(':')",
        'order reviewed event'
    ),
    (
        "eventKey: ['message_received', message.id || '', recipientId].filter(Boolean).join(':')",
        "eventId: ['message_received', message.id || message.createdAt || '', conversation.id || message.conversationId || '', recipientId].filter(Boolean).join(':'),\n      eventType: 'message_received',\n      eventCategory: 'MESSAGES',\n      eventKey: ['message_received', message.id || '', recipientId].filter(Boolean).join(':')",
        'message event'
    ),
    (
        "eventKey: ['payment_held', payment.id || '', recipientId].filter(Boolean).join(':')",
        "eventId: ['payment_held', payment.id || payment.orderId || order.id || '', recipientId].filter(Boolean).join(':'),\n      eventType: 'payment_held',\n      eventCategory: 'PAYMENTS',\n      sourceAuthority: normalizeText(options.sourceAuthority || payment.sourceAuthority || payment.source_authority || 'DERIVED_INFORMATIONAL').toUpperCase(),\n      eventKey: ['payment_held', payment.id || '', recipientId].filter(Boolean).join(':')",
        'payment event'
    ),
    (
        "eventKey: ['completion_requested', order.id || payment.orderId || '', recipientId].filter(Boolean).join(':')",
        "eventId: ['order_completion_requested', order.id || payment.orderId || conversation.orderId || '', payment.id || '', recipientId].filter(Boolean).join(':'),\n      eventType: 'order_completion_requested',\n      eventCategory: 'ORDERS',\n      eventKey: ['completion_requested', order.id || payment.orderId || '', recipientId].filter(Boolean).join(':')",
        'completion event'
    ),
    (
        "eventKey: ['order_dispute_opened', dispute.id || orderId, professionalId].filter(Boolean).join(':')",
        "eventId: ['dispute_opened', dispute.id || orderId, professionalId].filter(Boolean).join(':'),\n        eventType: 'dispute_opened',\n        eventCategory: 'DISPUTES',\n        sourceAuthority: normalizeText(options.sourceAuthority || dispute.sourceAuthority || payment.sourceAuthority || 'DERIVED_INFORMATIONAL').toUpperCase(),\n        eventKey: ['order_dispute_opened', dispute.id || orderId, professionalId].filter(Boolean).join(':')",
        'dispute opened event'
    ),
    (
        "eventKey: ['order_dispute_reported', dispute.id || orderId, clientId].filter(Boolean).join(':')",
        "eventId: ['dispute_reported', dispute.id || orderId, clientId].filter(Boolean).join(':'),\n        eventType: 'dispute_reported',\n        eventCategory: 'DISPUTES',\n        sourceAuthority: normalizeText(options.sourceAuthority || dispute.sourceAuthority || payment.sourceAuthority || 'DERIVED_INFORMATIONAL').toUpperCase(),\n        eventKey: ['order_dispute_reported', dispute.id || orderId, clientId].filter(Boolean).join(':')",
        'dispute reported event'
    ),
    (
        "eventKey: ['order_dispute_response', dispute.id || orderId, clientId].filter(Boolean).join(':')",
        "eventId: ['dispute_responded', dispute.id || orderId, clientId].filter(Boolean).join(':'),\n      eventType: 'dispute_responded',\n      eventCategory: 'DISPUTES',\n      sourceAuthority: normalizeText(options.sourceAuthority || dispute.sourceAuthority || payment.sourceAuthority || 'DERIVED_INFORMATIONAL').toUpperCase(),\n      eventKey: ['order_dispute_response', dispute.id || orderId, clientId].filter(Boolean).join(':')",
        'dispute responded event'
    ),
    (
        "eventKey: ['order_dispute_resolved', dispute.id || orderId, resolution || 'resolved', recipientId].filter(Boolean).join(':')",
        "eventId: ['dispute_resolved', dispute.id || orderId, resolution || 'resolved', recipientId].filter(Boolean).join(':'),\n        eventType: 'dispute_resolved',\n        eventCategory: 'DISPUTES',\n        sourceAuthority: normalizeText(options.sourceAuthority || dispute.sourceAuthority || payment.sourceAuthority || 'DERIVED_INFORMATIONAL').toUpperCase(),\n        eventKey: ['order_dispute_resolved', dispute.id || orderId, resolution || 'resolved', recipientId].filter(Boolean).join(':')",
        'dispute resolved event'
    )
]
for old, new, label in replacements:
    replace_service_once(old, new, label)

service_path.write_text(service)
event_path.write_text(event)

test_path = Path('scripts/test-ux-notif-002-producer-envelopes.js')
if test_path.exists():
    raise SystemExit('producer envelope test already exists unexpectedly')
test_path.write_text(r'''const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const eventPath = path.join(rootDir, 'assets/js/core/notification-event.js');
const servicePath = path.join(rootDir, 'assets/js/services/notification-service.js');
const previous = { window: global.window, Doke: global.Doke, localStorage: global.localStorage };
let provider = 'mock';
const localPayloads = [];
const remotePayloads = [];

global.window = global;
global.localStorage = { getItem() { return null; } };
global.Doke = {
  session: { getCurrentUser() { return { id: 'client-1', role: 'client', name: 'Cliente' }; } },
  repositories: { notifications: { create(payload) { localPayloads.push(payload); return Promise.resolve(payload); } } },
  repositoryBoundary: {
    list() { return Promise.resolve([]); },
    getActiveProviderName() { return provider; },
    getDataProviderStatus() { return { apiReady: provider === 'api', networkEnabled: provider === 'api', apiBaseUrlConfigured: provider === 'api' }; },
    create(domain, payload) { assert.equal(domain, 'notifications'); remotePayloads.push(payload); return Promise.resolve(payload); }
  }
};

delete require.cache[require.resolve(eventPath)];
delete require.cache[require.resolve(servicePath)];

function normalize(payload) {
  return global.Doke.notificationEvent.normalize(payload);
}

function assertEnvelope(payload, expected) {
  const expectedAuthority = expected.sourceAuthority || 'DERIVED_INFORMATIONAL';
  assert.ok(payload.eventId, `${expected.eventType} must publish eventId`);
  assert.equal(payload.eventType, expected.eventType);
  assert.equal(payload.eventCategory, expected.category);
  assert.equal(payload.sourceDomain, expected.category);
  assert.equal(payload.sourceAuthority, expectedAuthority);
  assert.equal(payload.dedupeKey, payload.eventId);
  assert.equal(payload.eventKey, payload.eventId);
  const normalized = normalize(payload);
  assert.equal(normalized.identitySource, 'eventId');
  assert.equal(normalized.category, expected.category);
  assert.equal(normalized.sourceDomain, expected.category);
  assert.equal(normalized.sourceAuthority, expectedAuthority);
  assert.equal(normalized.accepted, expected.accepted !== false);
  if (expected.reason) assert.equal(normalized.rejectionReason, expected.reason);
  return normalized;
}

(async () => {
  try {
    require(eventPath);
    require(servicePath);
    const notifications = global.Doke.services.notifications;
    assert.ok(notifications);

    let payload = await notifications.createOrderCreated({ id: 'order-1', clientId: 'client-1', professionalId: 'pro-1', serviceTitle: 'Limpeza' }, { recipientId: 'pro-1' });
    assert.equal(payload.type, 'order_created');
    assert.equal(payload.category, 'orders');
    assertEnvelope(payload, { eventType: 'order_created', category: 'ORDERS' });

    payload = await notifications.createOrderStatusChanged({ id: 'order-2', clientId: 'client-1', professionalId: 'pro-2', serviceTitle: 'Pintura' }, 'quoted', { recipientId: 'client-1', amount: 'R$ 300' });
    assert.equal(payload.type, 'order_status_changed');
    assert.equal(payload.category, 'orders');
    assertEnvelope(payload, { eventType: 'proposal_sent', category: 'PROPOSALS' });

    payload = await notifications.createOrderStatusChanged({ id: 'order-3', clientId: 'client-1', professionalId: 'pro-3', serviceTitle: 'Reparo' }, 'in_progress', { recipientId: 'pro-3', paymentStatus: 'held', paymentMessageId: 'charge-3' });
    assert.equal(assertEnvelope(payload, { eventType: 'order_in_progress', category: 'ORDERS' }).criticalOperational, false);

    payload = await notifications.createCompletionRequested({ id: 'order-4', clientId: 'client-1', professionalId: 'pro-4' }, { id: 'pay-4', orderId: 'order-4', clientId: 'client-1' }, {});
    assertEnvelope(payload, { eventType: 'order_completion_requested', category: 'ORDERS' });

    payload = await notifications.createPaymentHeld({ id: 'pay-derived', orderId: 'order-5', professionalId: 'pro-5', amount: 500 }, { order: { id: 'order-5', professionalId: 'pro-5' } });
    assert.equal(assertEnvelope(payload, { eventType: 'payment_held', category: 'PAYMENTS', accepted: false, reason: 'non-canonical-critical-source' }).criticalOperational, true);

    payload = await notifications.createPaymentHeld({ id: 'pay-local', orderId: 'order-5', professionalId: 'pro-5', amount: 500 }, { order: { id: 'order-5', professionalId: 'pro-5' }, sourceAuthority: 'CANONICAL_LOCAL' });
    assert.equal(assertEnvelope(payload, { eventType: 'payment_held', category: 'PAYMENTS', sourceAuthority: 'CANONICAL_LOCAL' }).criticalOperational, true);

    const derivedDispute = await notifications.createDisputeOpened({ id: 'order-6', clientId: 'client-1', professionalId: 'pro-6' }, { id: 'pay-6', orderId: 'order-6' }, { id: 'dispute-derived', orderId: 'order-6' }, {});
    assert.equal(derivedDispute.length, 2);
    assert.equal(assertEnvelope(derivedDispute[0], { eventType: 'dispute_opened', category: 'DISPUTES', accepted: false, reason: 'non-canonical-critical-source' }).criticalOperational, true);

    const opened = await notifications.createDisputeOpened({ id: 'order-6', clientId: 'client-1', professionalId: 'pro-6' }, { id: 'pay-6', orderId: 'order-6' }, { id: 'dispute-6', orderId: 'order-6' }, { sourceAuthority: 'CANONICAL_LOCAL' });
    assert.equal(opened.length, 2);
    assert.equal(opened[0].category, 'orders');
    assertEnvelope(opened[0], { eventType: 'dispute_opened', category: 'DISPUTES', sourceAuthority: 'CANONICAL_LOCAL' });
    assertEnvelope(opened[1], { eventType: 'dispute_reported', category: 'DISPUTES', sourceAuthority: 'CANONICAL_LOCAL' });

    const responded = await notifications.createDisputeResponded({ id: 'order-6', clientId: 'client-1', professionalId: 'pro-6' }, { orderId: 'order-6' }, { id: 'dispute-6', orderId: 'order-6' }, { actor: { id: 'pro-6', name: 'Profissional' }, sourceAuthority: 'CANONICAL_LOCAL' });
    assertEnvelope(responded[0], { eventType: 'dispute_responded', category: 'DISPUTES', sourceAuthority: 'CANONICAL_LOCAL' });

    const resolved = await notifications.createDisputeResolved({ id: 'order-6', clientId: 'client-1', professionalId: 'pro-6' }, { orderId: 'order-6' }, { id: 'dispute-6', orderId: 'order-6', resolution: 'client' }, { sourceAuthority: 'CANONICAL_LOCAL' });
    assert.equal(resolved.length, 2);
    resolved.forEach((item) => assertEnvelope(item, { eventType: 'dispute_resolved', category: 'DISPUTES', sourceAuthority: 'CANONICAL_LOCAL' }));

    payload = await notifications.createMessageReceived({ id: 'conversation-7', orderId: 'order-7', participants: ['client-1', 'pro-7'] }, { id: 'message-7', senderId: 'pro-7', text: 'Olá' }, { recipientId: 'client-1', actor: { id: 'pro-7', name: 'Profissional' } });
    assertEnvelope(payload, { eventType: 'message_received', category: 'MESSAGES' });

    provider = 'api';
    payload = await notifications.createPaymentHeld({ id: 'pay-api-derived', orderId: 'order-api', professionalId: 'pro-api', amount: 10 }, { order: { id: 'order-api', professionalId: 'pro-api' } });
    assertEnvelope(payload, { eventType: 'payment_held', category: 'PAYMENTS', accepted: false, reason: 'non-canonical-critical-source' });
    payload = await notifications.createPaymentHeld({ id: 'pay-remote', orderId: 'order-remote', professionalId: 'pro-remote', amount: 10 }, { order: { id: 'order-remote', professionalId: 'pro-remote' }, sourceAuthority: 'CANONICAL_REMOTE' });
    assertEnvelope(payload, { eventType: 'payment_held', category: 'PAYMENTS', sourceAuthority: 'CANONICAL_REMOTE' });
    assert.equal(remotePayloads.length, 2);
    assert.ok(localPayloads.length >= 13);

    console.log('[ux-notif-002-producer-envelopes] ok');
    console.log('- eventCategory precedence, native identity, semantic classification and critical source provenance validated');
  } finally {
    delete require.cache[require.resolve(eventPath)];
    delete require.cache[require.resolve(servicePath)];
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete global[key];
      else global[key] = value;
    }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
''')

doc_path = Path('docs/ux/UX-NOTIF-002.md')
doc = doc_path.read_text()
old = '- Fase 2A: repository adapter + dependência explícita nas rotas consumidoras implementada; certificação depende dos gates do mesmo SHA;\n- Fase 2B: producers nativos ainda não iniciados;'
new = '- Fase 2A: repository adapter + dependência explícita nas rotas consumidoras certificada;\n- Fase 2B: producer envelopes nativos implementados; certificação depende dos gates do mesmo SHA;'
if doc.count(old) != 1:
    raise SystemExit('docs phase status anchor mismatch')
doc = doc.replace(old, new, 1)
appendix = '''\n\n## Fase 2B — producer envelopes nativos\n\n`notification-service.js` passa a emitir identidade e classificação canônicas no producer boundary, antes do repository, preservando `type/category` legados apenas como compatibilidade transitória de UI. `notification-event.js` passa a priorizar `eventCategory/canonicalCategory` como input canônico antes do `category` legado.\n\n- producers emitem `eventId`, `eventType` e `eventCategory`;\n- o producer boundary completa `eventVersion`, `sourceDomain`, `dedupeKey` e o alias transitório `eventKey`;\n- ausência de proveniência explícita usa `DERIVED_INFORMATIONAL`, nunca infere autoridade pelo provider de persistência da notificação;\n- pagamentos e disputas só são aceitos pelo contrato quando recebem `sourceAuthority=CANONICAL_LOCAL|CANONICAL_REMOTE` de sua origem de negócio;\n- notification API ativa não eleva automaticamente um claim crítico;\n- `completion_requested` ganha `eventType=order_completion_requested`;\n- contestações usam `eventType=dispute_*` / `eventCategory=DISPUTES`, embora o `type/category` legado continue intacto;\n- estados de pedido que apenas refletem pagamento permanecem ORDERS; somente o producer financeiro definitivo usa PAYMENTS;\n- `Doke.notificationsRepository` continua autoridade de persistência/mutation e `Doke.notificationCenter` continua autoridade de apresentação/unread/badge.\n\nA API genérica `services.notifications.create(payload)` continua aceitando envelopes legados; apenas producers migrados recebem metadata canônica nativa nesta fase. Nenhuma mudança de backend, Supabase, migration, staging, produção, toast, digest ou browser notification faz parte deste sublote.\n'''
if '## Fase 2B — producer envelopes nativos' in doc:
    raise SystemExit('docs phase 2B section already exists unexpectedly')
doc_path.write_text(doc.rstrip() + appendix)
