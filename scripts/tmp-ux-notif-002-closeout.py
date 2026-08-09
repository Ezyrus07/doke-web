from pathlib import Path

ROOT = Path('.')


def replace_once(path, old, new, label):
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    path.write_text(text.replace(old, new, 1))


def replace_between(path, start_marker, end_marker, replacement, label):
    text = path.read_text()
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f'{label}: start marker missing')
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'{label}: end marker missing')
    path.write_text(text[:start] + replacement + text[end:])


payment = ROOT / 'assets/js/services/payment-service.js'
replace_once(
    payment,
    "            conversation: chargeResult.conversation,\n            charge: chargeResult.charge\n",
    "            conversation: chargeResult.conversation,\n            charge: chargeResult.charge,\n            sourceAuthority: 'CANONICAL_LOCAL'\n",
    'payment-held local source authority'
)

wallet_service = ROOT / 'assets/js/services/wallet-service.js'
wallet_service_block = r'''  function localFinancialNotificationEnvelope(eventType, transaction, recipientId) {
    transaction = transaction || {};
    var normalizedType = normalizeText(eventType).toLowerCase();
    var normalizedRecipient = normalizeText(recipientId || transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID);
    var entityId = normalizeText(transaction.id || transaction.paymentId || transaction.orderId || transaction.messageId || '');
    var eventId = [normalizedType, entityId, normalizedRecipient].filter(Boolean).join(':');
    return {
      eventId: eventId,
      eventType: normalizedType,
      eventCategory: 'PAYMENTS',
      sourceDomain: 'PAYMENTS',
      sourceAuthority: 'CANONICAL_LOCAL',
      dedupeKey: eventId,
      eventKey: eventId
    };
  }

  function createWalletNotification(transaction, payload) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    payload = payload || {};
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create(Object.assign({
      type: 'wallet_receivable_available',
      category: 'wallet',
      userId: userId,
      actorId: transaction.clientId || '',
      actorName: payload.clientName || 'Cliente Doke',
      orderId: transaction.orderId || '',
      conversationId: transaction.conversationId || '',
      messageId: transaction.messageId || '',
      serviceId: transaction.serviceId || '',
      title: 'Saldo disponível',
      body: 'O valor líquido de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' do pedido "' + (transaction.title || 'Pedido') + '" foi liberado na sua carteira.',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
      read: false
    }, localFinancialNotificationEnvelope('wallet_receivable_available', transaction, userId))).catch(function (error) {
      console.warn('[DokeWallet:createNotification]', error);
      return null;
    });
  }

  function createWithdrawNotification(transaction) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create(Object.assign({
      type: 'wallet_withdraw_requested',
      category: 'wallet',
      userId: userId,
      actorId: userId,
      actorName: 'Carteira Doke',
      title: 'Saque solicitado',
      body: 'Seu saque de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' foi solicitado para a conta cadastrada.',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
      read: false
    }, localFinancialNotificationEnvelope('wallet_withdraw_requested', transaction, userId))).catch(function (error) {
      console.warn('[DokeWallet:createWithdrawNotification]', error);
      return null;
    });
  }


  function createWithdrawCompletedNotification(transaction) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create(Object.assign({
      type: 'wallet_withdraw_completed',
      category: 'wallet',
      userId: userId,
      actorId: userId,
      actorName: 'Carteira Doke',
      title: 'Saque concluído',
      body: 'Seu saque de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' foi enviado para a conta cadastrada.',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
      read: false
    }, localFinancialNotificationEnvelope('wallet_withdraw_completed', transaction, userId))).catch(function (error) {
      console.warn('[DokeWallet:createWithdrawCompletedNotification]', error);
      return null;
    });
  }


  function createWithdrawDeclinedNotification(transaction) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create(Object.assign({
      type: 'wallet_withdraw_declined',
      category: 'wallet',
      userId: userId,
      actorId: userId,
      actorName: 'Suporte Doke',
      title: 'Saque recusado',
      body: 'Seu saque de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' foi recusado no mock de suporte. ' + (transaction.adminReason || 'Revise os dados bancários e solicite novamente.'),
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
      read: false
    }, localFinancialNotificationEnvelope('wallet_withdraw_declined', transaction, userId))).catch(function (error) {
      console.warn('[DokeWallet:createWithdrawDeclinedNotification]', error);
      return null;
    });
  }

'''
replace_between(
    wallet_service,
    '  function createWalletNotification(transaction, payload) {',
    '  function buildReceivablePayload(payload, status) {',
    wallet_service_block,
    'wallet financial notification functions'
)
replace_once(
    wallet_service,
    "    return notifications[method](order, payment, dispute, { actor: actor, resolution: resolution });\n",
    "    return notifications[method](order, payment, dispute, { actor: actor, resolution: resolution, sourceAuthority: 'CANONICAL_LOCAL' });\n",
    'wallet local dispute authority'
)

wallet_repo = ROOT / 'assets/js/repositories/wallet-repository.js'
replace_once(
    wallet_repo,
    "  function getNotificationsRepository() {\n    return Doke.repositories && Doke.repositories.notifications;\n  }\n\n",
    "  function getNotificationsRepository() {\n    return Doke.repositories && Doke.repositories.notifications;\n  }\n\n  function canonicalLocalDisputeEnvelope(eventType, dispute, recipientId, revision) {\n    dispute = dispute || {};\n    var normalizedType = normalizeText(eventType).toLowerCase();\n    var eventId = [\n      normalizedType,\n      normalizeText(dispute.id || dispute.orderId || ''),\n      normalizeText(revision || ''),\n      normalizeText(recipientId || '')\n    ].filter(Boolean).join(':');\n    return {\n      eventId: eventId,\n      eventType: normalizedType,\n      eventCategory: 'DISPUTES',\n      sourceDomain: 'DISPUTES',\n      sourceAuthority: 'CANONICAL_LOCAL',\n      dedupeKey: eventId,\n      eventKey: eventId\n    };\n  }\n\n",
    'wallet repository canonical dispute helper'
)

response_function = r'''  function createDisputeResponseNotification(transaction, dispute) {
    var notifications = getNotificationsRepository();
    if (!notifications || typeof notifications.create !== 'function' || !transaction || !dispute) return Promise.resolve(null);
    var clientId = normalizeText(dispute.clientId || transaction.clientId || '');
    if (!clientId) return Promise.resolve(null);
    var revision = normalizeText(dispute.responseAt || dispute.updatedAt || '');
    return notifications.create(Object.assign({
      type: 'order_dispute_response',
      category: 'orders',
      userId: clientId,
      actorId: normalizeProfessionalId(dispute.professionalId || transaction.professionalId || transaction.userId || ''),
      actorName: 'Doke Financeiro',
      orderId: dispute.orderId || transaction.orderId || '',
      conversationId: dispute.conversationId || transaction.conversationId || '',
      messageId: dispute.messageId || transaction.messageId || '',
      serviceId: transaction.serviceId || '',
      title: 'Resposta enviada pelo profissional',
      body: 'O profissional respondeu à contestação. Acompanhe a conversa até a análise ser concluída.',
      targetUrl: dispute.conversationId || transaction.conversationId
        ? 'mensagens.html?conversation=' + encodeURIComponent(dispute.conversationId || transaction.conversationId || '')
        : 'pedidos.html?order=' + encodeURIComponent(dispute.orderId || transaction.orderId || ''),
      actionLabel: 'Abrir conversa',
      read: false
    }, canonicalLocalDisputeEnvelope('dispute_responded', dispute, clientId, revision))).catch(function (error) {
      console.warn('[DokeWallet:disputeResponseNotification]', error);
      return null;
    });
  }

'''
replace_between(
    wallet_repo,
    '  function createDisputeResponseNotification(transaction, dispute) {',
    '  function createDisputeNotification(transaction, dispute, phase) {',
    response_function,
    'wallet repository dispute response producer'
)

notification_function = r'''  function createDisputeNotification(transaction, dispute, phase) {
    var notifications = getNotificationsRepository();
    if (!notifications || typeof notifications.create !== 'function' || !transaction || !dispute) return Promise.resolve(null);
    var status = normalizeDisputeStatus(dispute.status || '');
    var userId = normalizeProfessionalId(dispute.professionalId || transaction.professionalId || transaction.userId || '');
    var title = 'Pedido em contestação';
    var body = 'Um pedido entrou em contestação. O repasse ficará pausado até a análise.';
    var actionLabel = 'Ver pedido';
    var targetUrl = 'pedidos.html?order=' + encodeURIComponent(dispute.orderId || transaction.orderId || '');

    if (phase === 'resolved') {
      title = 'Contestação encerrada';
      if (status === 'resolvida_cliente' || status === 'reembolsado' || dispute.resolution === 'cliente') {
        body = 'Contestação encerrada. Cliente reembolsado.';
      } else {
        body = 'Contestação encerrada. Repasse liberado ao profissional.';
        targetUrl = 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1';
        actionLabel = 'Ver comprovante';
      }
    } else if (status === 'em_analise') {
      title = 'Pedido em análise';
      body = 'Um pedido está em análise financeira. Mantenha a conversa centralizada até a resolução.';
    }

    var professionalEventType = phase === 'resolved' ? 'dispute_resolved' : 'dispute_opened';
    var professionalRevision = phase === 'resolved' ? dispute.resolvedAt || dispute.updatedAt || '' : dispute.createdAt || '';
    var notificationsToCreate = [Object.assign({
      type: phase === 'resolved' ? 'order_dispute_resolved' : 'order_dispute_opened',
      category: 'orders',
      userId: userId || DEMO_PROFESSIONAL_ID,
      actorId: dispute.clientId || transaction.clientId || '',
      actorName: 'Doke Financeiro',
      orderId: dispute.orderId || transaction.orderId || '',
      conversationId: dispute.conversationId || transaction.conversationId || '',
      messageId: dispute.messageId || transaction.messageId || '',
      serviceId: transaction.serviceId || '',
      title: title,
      body: body,
      targetUrl: targetUrl,
      actionLabel: actionLabel,
      read: false
    }, canonicalLocalDisputeEnvelope(professionalEventType, dispute, userId || DEMO_PROFESSIONAL_ID, professionalRevision))];

    var clientId = normalizeText(dispute.clientId || transaction.clientId || '');
    if (clientId) {
      var clientTitle = phase === 'resolved' ? 'Contestação encerrada' : 'Relato enviado';
      var clientBody = phase === 'resolved'
        ? (status === 'resolvida_cliente' || status === 'reembolsado' || dispute.resolution === 'cliente'
          ? 'Contestação encerrada. Cliente reembolsado.'
          : 'Contestação encerrada. Repasse liberado ao profissional.')
        : 'Seu relato foi enviado. O pedido entrou em análise e a conversa ficará centralizada até a resolução.';
      var clientEventType = phase === 'resolved' ? 'dispute_resolved' : 'dispute_reported';
      var clientRevision = phase === 'resolved' ? dispute.resolvedAt || dispute.updatedAt || '' : dispute.createdAt || '';
      notificationsToCreate.push(Object.assign({
        type: phase === 'resolved' ? 'order_dispute_resolved' : 'order_dispute_reported',
        category: 'orders',
        userId: clientId,
        actorId: userId || DEMO_PROFESSIONAL_ID,
        actorName: 'Doke Financeiro',
        orderId: dispute.orderId || transaction.orderId || '',
        conversationId: dispute.conversationId || transaction.conversationId || '',
        messageId: dispute.messageId || transaction.messageId || '',
        serviceId: transaction.serviceId || '',
        title: clientTitle,
        body: clientBody,
        targetUrl: dispute.conversationId || transaction.conversationId
          ? 'mensagens.html?conversation=' + encodeURIComponent(dispute.conversationId || transaction.conversationId || '')
          : 'pedidos.html?order=' + encodeURIComponent(dispute.orderId || transaction.orderId || ''),
        actionLabel: 'Abrir conversa',
        read: false
      }, canonicalLocalDisputeEnvelope(clientEventType, dispute, clientId, clientRevision)));
    }

    return Promise.all(notificationsToCreate.map(function (notification) {
      return notifications.create(notification);
    })).catch(function (error) {
      console.warn('[DokeWallet:disputeNotification]', error);
      return null;
    });
  }

'''
replace_between(
    wallet_repo,
    '  function createDisputeNotification(transaction, dispute, phase) {',
    '  function openDispute(payload) {',
    notification_function,
    'wallet repository dispute lifecycle producer'
)

test_path = ROOT / 'scripts/test-ux-notif-002-financial-producer-handoff.js'
test_path.write_text(r'''const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const eventPath = path.join(rootDir, 'assets/js/core/notification-event.js');
const walletServicePath = path.join(rootDir, 'assets/js/services/wallet-service.js');
const walletRepositoryPath = path.join(rootDir, 'assets/js/repositories/wallet-repository.js');
const paymentServicePath = path.join(rootDir, 'assets/js/services/payment-service.js');
const previous = {
  window: global.window,
  Doke: global.Doke,
  localStorage: global.localStorage,
  document: global.document,
  CustomEvent: global.CustomEvent
};

function clearModule(file) {
  delete require.cache[require.resolve(file)];
}

function memoryStorage(seed) {
  const data = new Map(Object.entries(seed || {}));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function installDom() {
  global.window = global;
  global.document = { dispatchEvent() {} };
  global.CustomEvent = function CustomEvent(type, options) {
    this.type = type;
    this.detail = options && options.detail;
  };
}

function loadEventContract() {
  clearModule(eventPath);
  require(eventPath);
  assert.ok(global.Doke.notificationEvent);
}

function assertCanonical(payload, eventType, category) {
  assert.ok(payload.eventId, `${eventType} requires eventId`);
  assert.equal(payload.eventType, eventType);
  assert.equal(payload.eventCategory, category);
  assert.equal(payload.sourceDomain, category);
  assert.equal(payload.sourceAuthority, 'CANONICAL_LOCAL');
  assert.equal(payload.dedupeKey, payload.eventId);
  assert.equal(payload.eventKey, payload.eventId);
  const normalized = global.Doke.notificationEvent.normalize(payload);
  assert.equal(normalized.accepted, true);
  assert.equal(normalized.category, category);
  assert.equal(normalized.identitySource, 'eventId');
  assert.equal(normalized.sourceAuthority, 'CANONICAL_LOCAL');
}

async function testWalletServiceProducers() {
  installDom();
  const captured = [];
  let currentUser = { id: 'user_profissional_demo', role: 'professional', name: 'Profissional' };
  const walletRepository = {
    getProviderStatus() { return { provider: 'mock', fallbackActive: true, localFinancialSimulation: true }; },
    registerReceivable(receivable) {
      return Promise.resolve({
        transaction: Object.assign({}, receivable, { id: 'wallet-receivable-1' }),
        created: true,
        updated: false
      });
    },
    releaseHeldReceivable() {
      return Promise.resolve({
        transaction: {
          id: 'wallet-release-1',
          professionalId: 'user_profissional_demo',
          userId: 'user_profissional_demo',
          clientId: 'client-1',
          orderId: 'order-release-1',
          messageId: 'charge-release-1',
          title: 'Serviço',
          netAmount: 95,
          amount: 95
        },
        updated: true
      });
    },
    requestWithdraw(payload) {
      return Promise.resolve({
        transaction: { id: 'withdraw-request-1', professionalId: payload.ownerId, userId: payload.ownerId, netAmount: 50, amount: 50 },
        created: true
      });
    },
    resolveWithdraw(payload) {
      const declined = String(payload.action || payload.status || '').toLowerCase() === 'declined';
      return Promise.resolve({
        transaction: {
          id: declined ? 'withdraw-declined-1' : 'withdraw-completed-1',
          professionalId: 'user_profissional_demo',
          userId: 'user_profissional_demo',
          netAmount: 50,
          amount: 50,
          adminReason: declined ? 'Conta inválida.' : ''
        },
        updated: true,
        action: declined ? 'declined' : 'completed'
      });
    }
  };

  global.localStorage = memoryStorage();
  global.Doke = {
    session: { getCurrentUser() { return currentUser; } },
    repositories: { wallet: walletRepository },
    services: { notifications: { create(payload) { captured.push(payload); return Promise.resolve(payload); } } },
    repositoryBoundary: {
      getDataProviderStatus() { return { activeProvider: 'mock', apiReady: false, networkEnabled: false, apiBaseUrlConfigured: false }; }
    },
    permissions: {
      assertAdminAction() { return true; },
      canAccessAdmin() { return true; }
    }
  };
  loadEventContract();
  clearModule(walletServicePath);
  require(walletServicePath);

  await global.Doke.services.wallet.registerReceivableFromOrder({
    order: { id: 'order-available-1', professionalId: 'user_profissional_demo', clientId: 'client-1', serviceTitle: 'Limpeza' },
    messageId: 'charge-available-1',
    amount: 100
  });

  currentUser = { id: 'client-1', role: 'client', name: 'Cliente' };
  await global.Doke.services.wallet.releaseHeldReceivableFromCompletion({
    transactionId: 'wallet-release-1',
    paymentId: 'payment-release-1',
    order: { id: 'order-release-1', clientId: 'client-1', clientName: 'Cliente' }
  });

  currentUser = { id: 'user_profissional_demo', role: 'professional', name: 'Profissional' };
  await global.Doke.services.wallet.requestWithdraw({ amount: 50, ownerId: 'user_profissional_demo' });

  currentUser = { id: 'admin-1', role: 'admin', name: 'Suporte' };
  await global.Doke.services.wallet.resolveWithdraw({ transactionId: 'withdraw-completed-1', ownerId: 'user_profissional_demo', action: 'approved' });
  await global.Doke.services.wallet.resolveWithdraw({ transactionId: 'withdraw-declined-1', ownerId: 'user_profissional_demo', action: 'declined' });

  assert.equal(captured.length, 5);
  assertCanonical(captured[0], 'wallet_receivable_available', 'PAYMENTS');
  assertCanonical(captured[1], 'wallet_receivable_available', 'PAYMENTS');
  assertCanonical(captured[2], 'wallet_withdraw_requested', 'PAYMENTS');
  assertCanonical(captured[3], 'wallet_withdraw_completed', 'PAYMENTS');
  assertCanonical(captured[4], 'wallet_withdraw_declined', 'PAYMENTS');
}

async function testWalletRepositoryDisputeProducers() {
  installDom();
  const captured = [];
  const initialWallet = {
    transactions: [{
      id: 'wallet-held-1',
      type: 'receivable',
      status: 'held',
      userId: 'user_profissional_demo',
      professionalId: 'user_profissional_demo',
      clientId: 'client-1',
      orderId: 'order-dispute-1',
      paymentId: 'payment-dispute-1',
      messageId: 'charge-dispute-1',
      conversationId: 'conversation-dispute-1',
      grossAmount: 100,
      netAmount: 95,
      amount: 95,
      feeAmount: 5,
      title: 'Serviço contestado'
    }],
    bankAccounts: [],
    disputes: [],
    auditEvents: [],
    updatedAt: '2026-08-08T00:00:00.000Z'
  };
  global.localStorage = memoryStorage({ 'doke.wallet.local.v1': JSON.stringify(initialWallet) });
  global.Doke = {
    session: { getCurrentUser() { return { id: 'user_profissional_demo', role: 'professional', name: 'Profissional' }; } },
    repositories: {
      notifications: { create(payload) { captured.push(payload); return Promise.resolve(payload); } },
      orders: { readLocal() { return []; }, writeLocal() {} }
    }
  };
  loadEventContract();
  clearModule(walletRepositoryPath);
  require(walletRepositoryPath);
  const wallet = global.Doke.repositories.wallet;

  const opened = await wallet.openDispute({
    transactionId: 'wallet-held-1',
    orderId: 'order-dispute-1',
    paymentId: 'payment-dispute-1',
    clientId: 'client-1',
    reason: 'Serviço incompleto.'
  });
  assert.ok(opened.dispute && opened.dispute.id);
  await wallet.respondDispute({ disputeId: opened.dispute.id, responseText: 'Resposta do profissional.' });
  await wallet.resolveDispute({ disputeId: opened.dispute.id, resolution: 'client', actorId: 'admin-1', actorRole: 'admin' });

  assert.equal(captured.length, 5);
  assertCanonical(captured[0], 'dispute_opened', 'DISPUTES');
  assertCanonical(captured[1], 'dispute_reported', 'DISPUTES');
  assertCanonical(captured[2], 'dispute_responded', 'DISPUTES');
  assertCanonical(captured[3], 'dispute_resolved', 'DISPUTES');
  assertCanonical(captured[4], 'dispute_resolved', 'DISPUTES');
}

(async () => {
  try {
    const paymentSource = fs.readFileSync(paymentServicePath, 'utf8');
    const walletSource = fs.readFileSync(walletServicePath, 'utf8');
    const repositorySource = fs.readFileSync(walletRepositoryPath, 'utf8');
    assert.match(paymentSource, /createPaymentHeld\(payment,[\s\S]*?sourceAuthority: 'CANONICAL_LOCAL'/);
    assert.match(walletSource, /notifyDisputeLifecycle[\s\S]*?sourceAuthority: 'CANONICAL_LOCAL'/);
    const responseProducer = repositorySource.slice(
      repositorySource.indexOf('function createDisputeResponseNotification'),
      repositorySource.indexOf('function createDisputeNotification')
    );
    assert.doesNotMatch(responseProducer, /Date\.now\(\)\.toString\(36\)/);

    await testWalletServiceProducers();
    await testWalletRepositoryDisputeProducers();

    console.log('[ux-notif-002-financial-producer-handoff] ok');
    console.log('- local payment, wallet and dispute producers publish accepted canonical event envelopes with explicit business provenance');
  } finally {
    [eventPath, walletServicePath, walletRepositoryPath].forEach((file) => {
      try { clearModule(file); } catch (_error) {}
    });
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete global[key];
      else global[key] = value;
    }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
''')

doc = ROOT / 'docs/ux/UX-NOTIF-002.md'
replace_once(
    doc,
    '- Fase 2B: producer envelopes nativos implementados; certificação depende dos gates do mesmo SHA;\n',
    '- Fase 2B: producer envelopes nativos certificados;\n- Closeout 2C: handoff de proveniência financeira local em implementação/certificação;\n',
    'ux-notif status closeout'
)
with doc.open('a') as handle:
    handle.write(r'''

## Closeout 2C — financial producer authority handoff

O closeout encontrou callers financeiros reais que ainda não concluíam o handoff de proveniência apesar de a Fase 2B rejeitar corretamente eventos críticos derivados.

Correções deste fechamento:

- `payment-service.js` declara `CANONICAL_LOCAL` somente no fluxo de pagamento local que passou pelas validações canônicas de pedido/cobrança/recebível;
- caminhos API e Supabase sandbox continuam retornando antes desse fluxo e não recebem autoridade local artificial;
- `wallet-service.js` emite `eventId/eventType/eventCategory=PAYMENTS/sourceDomain/sourceAuthority/dedupeKey` para recebível e saques locais;
- o ciclo local de disputa do `wallet-service.js` passa `sourceAuthority=CANONICAL_LOCAL` ao notification service;
- `wallet-repository.js`, quando usado diretamente sem `deferSideEffects`, publica envelopes `DISPUTES` nativos e remove identidade de resposta baseada em `Date.now()`;
- `type/category` legados permanecem apenas para compatibilidade de UI;
- notification provider não é usado para inferir autoridade de negócio.

Gate de fechamento:

1. teste comportamental executa recebível, saque e ciclo local de disputa;
2. cada payload é validado por `Doke.notificationEvent.normalize()` como aceito, `eventId`-first e com fonte canônica local;
3. payment caller e dispute service handoff possuem contrato estático explícito;
4. Matrix, governança, regressões herdadas, LCOV, Sonar e whitespace devem passar no mesmo SHA permanente.

Fronteiras permanecem: sem backend, migration, RPC, staging, produção, merge ou ready-for-review.
''')

workflow = ROOT / '.github/workflows/ux-notif-002-event-schema.yml'
workflow_text = workflow.read_text()
workflow_text = workflow_text.replace(
    "      - 'assets/js/services/notification-service.js'\n      - 'scripts/test-ux-notif-002-producer-envelopes.js'\n",
    "      - 'assets/js/services/notification-service.js'\n      - 'assets/js/services/payment-service.js'\n      - 'assets/js/services/wallet-service.js'\n      - 'assets/js/repositories/wallet-repository.js'\n      - 'scripts/test-ux-notif-002-producer-envelopes.js'\n      - 'scripts/test-ux-notif-002-financial-producer-handoff.js'\n",
    2
)
clean_anchor = "          test ! -e scripts/tmp-ux-notif-002-phase2b.py\n"
if workflow_text.count(clean_anchor) != 1:
    raise SystemExit('workflow clean anchor mismatch')
workflow_text = workflow_text.replace(
    clean_anchor,
    clean_anchor + "          test ! -e .github/workflows/ux-notif-002-closeout-runner.yml\n          test ! -e scripts/tmp-ux-notif-002-closeout.py\n",
    1
)
syntax_anchor = "          node --check assets/js/services/notification-service.js\n          node --check scripts/test-ux-notif-002-notification-event.js\n"
if workflow_text.count(syntax_anchor) != 1:
    raise SystemExit('workflow syntax anchor mismatch')
workflow_text = workflow_text.replace(
    syntax_anchor,
    "          node --check assets/js/services/notification-service.js\n          node --check assets/js/services/payment-service.js\n          node --check assets/js/services/wallet-service.js\n          node --check assets/js/repositories/wallet-repository.js\n          node --check scripts/test-ux-notif-002-notification-event.js\n",
    1
)
producer_anchor = "      - name: Validate native producer envelopes and source provenance\n        run: node scripts/test-ux-notif-002-producer-envelopes.js\n\n"
if workflow_text.count(producer_anchor) != 1:
    raise SystemExit('workflow producer gate anchor mismatch')
workflow_text = workflow_text.replace(
    producer_anchor,
    producer_anchor + "      - name: Validate financial producer authority handoff\n        run: node scripts/test-ux-notif-002-financial-producer-handoff.js\n\n",
    1
)
lcov_include = "            --test-coverage-include='assets/js/services/notification-service.js' \\\n"
if workflow_text.count(lcov_include) != 1:
    raise SystemExit('workflow lcov include anchor mismatch')
workflow_text = workflow_text.replace(
    lcov_include,
    lcov_include + "            --test-coverage-include='assets/js/services/wallet-service.js' \\\n            --test-coverage-include='assets/js/repositories/wallet-repository.js' \\\n",
    1
)
lcov_tests = "            scripts/test-ux-notif-002-repository-adapter.js \\\n            scripts/test-ux-notif-002-producer-envelopes.js\n"
if workflow_text.count(lcov_tests) != 1:
    raise SystemExit('workflow lcov test anchor mismatch')
workflow_text = workflow_text.replace(
    lcov_tests,
    "            scripts/test-ux-notif-002-repository-adapter.js \\\n            scripts/test-ux-notif-002-producer-envelopes.js \\\n            scripts/test-ux-notif-002-financial-producer-handoff.js\n",
    1
)
lcov_evidence = "          grep -Fq 'SF:assets/js/services/notification-service.js' \"${REPORT}\"\n"
if workflow_text.count(lcov_evidence) != 1:
    raise SystemExit('workflow lcov evidence anchor mismatch')
workflow_text = workflow_text.replace(
    lcov_evidence,
    lcov_evidence + "          grep -Fq 'SF:assets/js/services/wallet-service.js' \"${REPORT}\"\n          grep -Fq 'SF:assets/js/repositories/wallet-repository.js' \"${REPORT}\"\n",
    1
)
workflow.write_text(workflow_text)
