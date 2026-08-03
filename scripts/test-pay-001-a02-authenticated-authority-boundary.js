'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const paymentSource = fs.readFileSync(path.join(root, 'assets/js/services/payment-service.js'), 'utf8');
const financeSource = fs.readFileSync(path.join(root, 'assets/js/repositories/finance-repository.js'), 'utf8');
const UUID_CLIENT = '11111111-1111-4111-8111-111111111111';
const UUID_PRO = '22222222-2222-4222-8222-222222222222';

function browserBase(window) {
  return {
    window,
    document: { addEventListener() {}, dispatchEvent() {}, documentElement: { setAttribute() {} } },
    CustomEvent: function CustomEvent() {},
    console,
    Promise,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Math,
    JSON,
    Error,
    RegExp,
    setTimeout,
    clearTimeout
  };
}

function loadPayment(actor, options) {
  const settings = Object.assign({ apiActive: false, apiReady: false, sandboxActive: false }, options || {});
  const counters = { api: 0, sandbox: 0 };
  const Doke = {
    services: {},
    repositories: {
      payments: { getProviderStatus() { return { provider: 'mock', fallbackActive: true, localFinancialSimulation: true }; } },
      messages: {},
      wallet: {}
    },
    financeRepository: {
      isSandboxEnabled() { return settings.sandboxActive; },
      confirmSandboxPayment() { counters.sandbox += 1; return Promise.resolve({ sandbox: true }); },
      requestSandboxCompletion() { counters.sandbox += 1; return Promise.resolve({ sandbox: true }); },
      releaseSandboxPayment() { counters.sandbox += 1; return Promise.resolve({ sandbox: true }); }
    },
    repositoryBoundary: {
      getDataProviderStatus() { return { activeProvider: settings.apiActive ? 'api' : 'mock', apiReady: settings.apiReady }; },
      action(domain, action) { counters.api += 1; return Promise.resolve({ domain, action, authority: 'api' }); }
    },
    session: { getCurrentUser() { return actor; } }
  };
  const window = { Doke };
  window.window = window;
  vm.runInNewContext(paymentSource, browserBase(window), { filename: 'payment-service.js' });
  return { service: window.Doke.services.payments, counters };
}

function loadFinance(actor) {
  const counters = { walletMutations: 0, paymentMutations: 0 };
  let wallet = { transactions: [], bankAccounts: [], disputes: [], auditEvents: [] };
  let payments = [];
  const localWallet = {
    readWallet() { return wallet; },
    writeWallet(next) { wallet = next; return next; },
    normalizeTransaction(value) { return Object.assign({}, value || {}); },
    normalizeBankAccount(value) { return value ? Object.assign({}, value) : null; },
    saveBankAccount() { counters.walletMutations += 1; return Promise.resolve({ account: { id: 'fixture_account' }, wallet }); },
    registerReceivable() { counters.walletMutations += 1; return { transaction: { id: 'fixture_receivable' } }; },
    releaseHeldReceivable() { counters.walletMutations += 1; return { transaction: { id: 'fixture_release' } }; },
    requestWithdraw() { counters.walletMutations += 1; return { transaction: { id: 'fixture_withdraw' } }; },
    resolveWithdraw() { counters.walletMutations += 1; return { transaction: { id: 'fixture_resolve_withdraw' } }; },
    completeWithdraw() { counters.walletMutations += 1; return { transaction: { id: 'fixture_complete_withdraw' } }; },
    openDispute() { counters.walletMutations += 1; return { dispute: { id: 'fixture_dispute' } }; },
    respondDispute() { counters.walletMutations += 1; return { dispute: { id: 'fixture_dispute' } }; },
    resolveDispute() { counters.walletMutations += 1; return { dispute: { id: 'fixture_dispute' } }; }
  };
  const localPayments = {
    normalize(value) { return Object.assign({}, value || {}); },
    readLocal() { return payments.slice(); },
    writeLocal(next) { payments = next.slice(); return payments; },
    save(value) { counters.paymentMutations += 1; payments.push(value); return Promise.resolve({ payment: value, created: true, updated: false }); },
    list() { return payments.slice(); },
    getById(id) { return payments.find((item) => item.id === id) || null; },
    getByEventKey(key) { return payments.find((item) => item.eventKey === key) || null; },
    getByOrderId(id) { return payments.find((item) => item.orderId === id) || null; }
  };
  const Doke = {
    repositories: { wallet: localWallet, payments: localPayments },
    session: { getCurrentUser() { return actor; } }
  };
  const window = {
    Doke,
    DOKE_SUPABASE_CONFIG: { enabled: false, walletEnabled: true, paymentsEnabled: true },
    localStorage: { getItem() { return null; } }
  };
  window.window = window;
  vm.runInNewContext(financeSource, browserBase(window), { filename: 'finance-repository.js' });
  return { wallet: window.Doke.repositories.wallet, payments: window.Doke.repositories.payments, counters };
}

async function expectAuthority(promise) {
  await assert.rejects(Promise.resolve(promise), (error) => error && error.code === 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED');
}

async function main() {
  const uuidClient = loadPayment({ id: UUID_CLIENT, role: 'client' });
  const uuidStatus = uuidClient.service.getPaymentsProviderStatus();
  assert.equal(uuidStatus.activeProvider, 'unavailable');
  assert.equal(uuidStatus.localMutationAllowed, false);
  assert.equal(uuidStatus.remoteMutationRequired, true);
  assert.equal(uuidStatus.fallbackProvider, 'unavailable');
  await expectAuthority(uuidClient.service.confirmChargePayment('order-1', {}));
  await expectAuthority(uuidClient.service.confirmCompletion('order-1', {}));

  const uuidProfessional = loadPayment({ id: UUID_PRO, role: 'professional' });
  await expectAuthority(uuidProfessional.service.requestCompletion('order-1', {}));

  const apiFirst = loadPayment({ id: UUID_CLIENT, role: 'client' }, { apiActive: true, apiReady: true, sandboxActive: true });
  const apiResult = await apiFirst.service.confirmChargePayment('order-1', {});
  assert.equal(apiResult.authority, 'api');
  assert.equal(apiFirst.counters.api, 1);
  assert.equal(apiFirst.counters.sandbox, 0);

  const fixture = loadPayment({ id: 'fixture_client', role: 'client' });
  const fixtureStatus = fixture.service.getPaymentsProviderStatus();
  assert.equal(fixtureStatus.activeProvider, 'mock');
  assert.equal(fixtureStatus.localMutationAllowed, true);
  await assert.rejects(fixture.service.confirmChargePayment('order-1', {}), (error) => error && error.code !== 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED');

  const uuidFinance = loadFinance({ id: UUID_PRO, role: 'professional' });
  await expectAuthority(uuidFinance.wallet.saveBankAccount({ holderName: 'UUID user' }));
  await expectAuthority(uuidFinance.wallet.registerReceivable({ amount: 10 }));
  await expectAuthority(uuidFinance.wallet.releaseHeldReceivable({ amount: 10 }));
  await expectAuthority(uuidFinance.wallet.requestWithdraw({ amount: 10 }));
  await expectAuthority(uuidFinance.wallet.openDispute({ orderId: 'fixture' }));
  await expectAuthority(uuidFinance.payments.save({ id: 'payment-uuid', status: 'processing' }));
  assert.equal(uuidFinance.counters.walletMutations, 0);
  assert.equal(uuidFinance.counters.paymentMutations, 0);
  assert.equal(uuidFinance.wallet.getProviderStatus().localMutationAllowed, false);
  assert.equal(uuidFinance.payments.getProviderStatus().provider, 'unavailable');

  const fixtureFinance = loadFinance({ id: 'fixture_professional', role: 'professional' });
  await fixtureFinance.wallet.saveBankAccount({ holderName: 'Fixture' });
  await fixtureFinance.wallet.registerReceivable({ amount: 10 });
  await fixtureFinance.wallet.requestWithdraw({ amount: 10 });
  await fixtureFinance.payments.save({ id: 'payment-fixture', status: 'processing' });
  assert.ok(fixtureFinance.counters.walletMutations >= 3);
  assert.equal(fixtureFinance.wallet.getProviderStatus().localMutationAllowed, true);

  console.log('PAY-A02 authenticated authority runtime test passed.');
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
