const assert = require('node:assert/strict');
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
