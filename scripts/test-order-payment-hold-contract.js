#!/usr/bin/env node
/* Canonical payment hold contract.
   Covers charge-only payment, role/state/amount guards, escrow hold persistence,
   wallet and notification idempotency, reload recovery, and concurrent callers. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const storage = Object.create(null);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertRejects(task, message) {
  let rejected = false;
  try { await task; } catch (error) { rejected = true; }
  assert(rejected, message);
}

function createRuntime(user) {
  const listeners = Object.create(null);
  const context = {
    console, Date, Intl, Math, JSON, Promise, setTimeout, clearTimeout,
    URLSearchParams, encodeURIComponent,
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
    localStorage: {
      getItem: (key) => Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null,
      setItem: (key, value) => { storage[key] = String(value); },
      removeItem: (key) => { delete storage[key]; }
    },
    CustomEvent: function CustomEvent(type, options) {
      this.type = type;
      this.detail = options && options.detail;
    },
    document: {
      addEventListener: (type, callback) => {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(callback);
      },
      dispatchEvent: (event) => {
        (listeners[event.type] || []).forEach((callback) => callback(event));
      }
    },
    location: { search: '', href: 'http://localhost:4173/pagamento-profissional.html' },
    Doke: {
      mockData: { load: () => Promise.resolve([]) },
      session: { getCurrentUser: () => user }
    }
  };

  context.window = context;
  const sandbox = vm.createContext(context);
  [
    'assets/js/repositories/orders-repository.js',
    'assets/js/repositories/messages-repository.js',
    'assets/js/repositories/notifications-repository.js',
    'assets/js/repositories/wallet-repository.js',
    'assets/js/services/notification-service.js',
    'assets/js/services/message-service.js',
    'assets/js/services/orders-service.js',
    'assets/js/services/wallet-service.js',
    'assets/js/services/payment-service.js'
  ].forEach((relativePath) => {
    const filename = path.join(projectRoot, relativePath);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename: relativePath });
  });

  return { Doke: sandbox.Doke, context };
}

function findConversation(Doke, orderId) {
  return Doke.repositories.messages.readLocal().find((item) => (
    String(item.orderId || item.order && item.order.id || '') === String(orderId)
  ));
}

function findCharge(conversation, messageId) {
  return (conversation && Array.isArray(conversation.messages) ? conversation.messages : []).find((message) => (
    message.type === 'charge'
    && message.financialKind === 'charge'
    && (!messageId || String(message.id || '') === String(messageId))
  ));
}

async function createChargedOrder(client, professional, suffix, amount = 'R$ 520,00') {
  const clientRuntime = createRuntime(client).Doke;
  const order = await clientRuntime.services.orders.create({
    serviceId: `service_payment_${suffix}`,
    professionalId: professional.id,
    providerId: professional.id,
    providerName: professional.name,
    serviceTitle: `Serviço pagamento ${suffix}`,
    title: `Serviço pagamento ${suffix}`
  });

  const professionalRuntime = createRuntime(professional).Doke;
  await professionalRuntime.services.orders.accept(order.id);
  await professionalRuntime.services.orders.submitProposal(order.id, {
    amount,
    installments: '2x sem juros',
    messageText: `Proposta ${suffix}`
  });

  const clientApprovalRuntime = createRuntime(client).Doke;
  await clientApprovalRuntime.services.orders.approveProposal(order.id, {
    approvalSource: 'payment-hold-contract'
  });

  const chargeRuntime = createRuntime(professional).Doke;
  const chargeResult = await chargeRuntime.services.orders.createCharge(order.id, {
    amount,
    installments: '2x sem juros'
  });

  return { orderId: order.id, amount, charge: chargeResult.message, conversationId: chargeResult.conversationId };
}

function paymentCount(Doke, orderId) {
  return Doke.repositories.payments.readLocal().filter((payment) => String(payment.orderId) === String(orderId)).length;
}

function walletHoldCount(Doke, orderId) {
  return Doke.repositories.wallet.readWallet().transactions.filter((transaction) => (
    String(transaction.orderId) === String(orderId) && transaction.status === 'held'
  )).length;
}

function assertSourceContracts() {
  const pageSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/pagamento-profissional.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(projectRoot, 'assets/js/services/payment-service.js'), 'utf8');
  const orderSource = fs.readFileSync(path.join(projectRoot, 'assets/js/services/orders-service.js'), 'utf8');
  const htmlSource = fs.readFileSync(path.join(projectRoot, 'pagamento-profissional.html'), 'utf8');

  assert(pageSource.includes('paymentService.confirmChargePayment'), 'Página deve delegar pagamento ao payment-service.');
  assert(!pageSource.includes('ordersService.start(orderId'), 'Página não pode usar aprovação da proposta como confirmação de pagamento.');
  assert(serviceSource.includes('function confirmChargePayment(orderId, payload)'), 'Payment service deve expor comando canônico.');
  assert(orderSource.includes('function recordPaymentHold(orderId, payload)'), 'Orders service deve possuir mutação financeira específica.');
  const walletRepositorySource = fs.readFileSync(path.join(projectRoot, 'assets/js/repositories/wallet-repository.js'), 'utf8');
  assert(walletRepositorySource.includes('repositories.payments = Object.freeze'), 'Camada de repository deve expor o ledger canônico de pagamentos.');
  assert(htmlSource.includes('payment-service.js'), 'Página deve carregar o payment service.');
}

async function main() {
  const client = { id: 'client_payment_1', name: 'Cliente Pagamento', role: 'client', initials: 'CP' };
  const otherClient = { id: 'client_payment_2', name: 'Outro Cliente', role: 'client', initials: 'OC' };
  const professional = { id: 'user_profissional_demo', name: 'Profissional Pagamento', role: 'professional', initials: 'PP' };

  assertSourceContracts();

  const orderWithoutChargeClient = createRuntime(client).Doke;
  const orderWithoutCharge = await orderWithoutChargeClient.services.orders.create({
    serviceId: 'service_payment_no_charge',
    professionalId: professional.id,
    providerId: professional.id,
    providerName: professional.name,
    serviceTitle: 'Serviço sem cobrança'
  });
  const noChargeProfessional = createRuntime(professional).Doke;
  await noChargeProfessional.services.orders.accept(orderWithoutCharge.id);
  await noChargeProfessional.services.orders.submitProposal(orderWithoutCharge.id, { amount: 'R$ 300,00' });
  await createRuntime(client).Doke.services.orders.approveProposal(orderWithoutCharge.id);
  await assertRejects(
    createRuntime(client).Doke.services.payments.confirmChargePayment(orderWithoutCharge.id, { amount: 300, grossAmount: 300 }),
    'Pagamento deve ser bloqueado quando não há cobrança real.'
  );

  const canonical = await createChargedOrder(client, professional, 'canonical');
  await assertRejects(
    createRuntime(professional).Doke.services.payments.confirmChargePayment(canonical.orderId, {
      conversationId: canonical.conversationId,
      messageId: canonical.charge.id,
      amount: 520,
      grossAmount: 520,
      method: 'Pix'
    }),
    'Profissional não pode confirmar o pagamento do cliente.'
  );
  await assertRejects(
    createRuntime(otherClient).Doke.services.payments.confirmChargePayment(canonical.orderId, {
      conversationId: canonical.conversationId,
      messageId: canonical.charge.id,
      amount: 520,
      grossAmount: 520,
      method: 'Pix'
    }),
    'Outro cliente não pode pagar pedido sem vínculo.'
  );
  await assertRejects(
    createRuntime(client).Doke.services.payments.confirmChargePayment(canonical.orderId, {
      conversationId: canonical.conversationId,
      messageId: canonical.charge.id,
      amount: 490,
      grossAmount: 520,
      discountAmount: 10,
      method: 'Pix'
    }),
    'Pagamento com composição de valor divergente deve ser rejeitado.'
  );

  const clientRuntime = createRuntime(client).Doke;
  const firstPayment = await clientRuntime.services.payments.confirmChargePayment(canonical.orderId, {
    conversationId: canonical.conversationId,
    messageId: canonical.charge.id,
    amount: 497,
    chargedAmount: 497,
    grossAmount: 520,
    discountAmount: 23,
    method: 'Pix'
  });

  assert(firstPayment.payment.status === 'held', 'Pagamento deve terminar held.');
  assert(firstPayment.payment.escrowStatus === 'held', 'Pagamento deve registrar escrow held.');
  assert(firstPayment.payment.chargedAmount === 497, 'Pagamento deve preservar o valor cobrado do cliente.');
  assert(firstPayment.payment.grossAmount === 520, 'Pagamento deve preservar o valor bruto do profissional.');
  assert(firstPayment.payment.discountAmount === 23, 'Pagamento deve preservar o desconto aplicado.');
  assert(firstPayment.order.status === 'in_progress', 'Pagamento não pode concluir o pedido.');
  assert(firstPayment.order.paymentStatus === 'held', 'Pedido deve refletir pagamento em garantia.');
  assert(firstPayment.order.paymentId === firstPayment.payment.id, 'Pedido deve apontar para o pagamento canônico.');
  assert(firstPayment.order.paymentGrossAmount === 520, 'Pedido deve preservar valor bruto.');
  assert(firstPayment.order.paymentChargedAmount === 497, 'Pedido deve preservar valor cobrado.');
  assert(firstPayment.order.paymentDiscountAmount === 23, 'Pedido deve preservar desconto.');
  assert(firstPayment.charge.paid === true, 'Cobrança deve ficar paga.');
  assert(firstPayment.charge.paymentStatus === 'held', 'Cobrança deve refletir garantia.');
  assert(firstPayment.charge.paymentId === firstPayment.payment.id, 'Cobrança deve apontar para o pagamento.');
  assert(firstPayment.walletTransaction.status === 'held', 'Carteira deve manter o valor em garantia.');
  assert(firstPayment.walletTransaction.grossAmount === 520, 'Recebível deve usar valor bruto, não valor pós-desconto.');
  assert(paymentCount(clientRuntime, canonical.orderId) === 1, 'Pedido deve possuir um registro de pagamento.');
  assert(walletHoldCount(clientRuntime, canonical.orderId) === 1, 'Pedido deve possuir um único recebível held.');

  const professionalNotifications = await createRuntime(professional).Doke.services.notifications.list({ currentUser: true });
  const paymentNotifications = professionalNotifications.filter((notification) => (
    notification.type === 'payment_held' && String(notification.orderId) === String(canonical.orderId)
  ));
  assert(paymentNotifications.length === 1, 'Profissional deve receber uma única notificação de pagamento em garantia.');
  assert(/garantia/i.test(paymentNotifications[0].title + ' ' + paymentNotifications[0].body), 'Notificação deve explicar a garantia.');

  const sameRuntimeRepeat = await clientRuntime.services.payments.confirmChargePayment(canonical.orderId, {
    conversationId: canonical.conversationId,
    messageId: canonical.charge.id,
    amount: 497,
    grossAmount: 520,
    discountAmount: 23,
    method: 'Pix'
  });
  assert(sameRuntimeRepeat.payment.id === firstPayment.payment.id, 'Repetição deve recuperar o mesmo pagamento.');
  assert(paymentCount(clientRuntime, canonical.orderId) === 1, 'Repetição não pode duplicar pagamento.');
  assert(walletHoldCount(clientRuntime, canonical.orderId) === 1, 'Repetição não pode duplicar recebível.');
  await assertRejects(
    clientRuntime.services.payments.confirmChargePayment(canonical.orderId, {
      conversationId: canonical.conversationId,
      messageId: canonical.charge.id,
      amount: 520,
      grossAmount: 520,
      discountAmount: 0,
      method: 'Cartão de crédito'
    }),
    'Pagamento já confirmado não pode aceitar outra composição ou método.'
  );

  const reloadClient = createRuntime(client).Doke;
  const reloadedPayment = await reloadClient.services.payments.getByOrderId(canonical.orderId);
  const reloadedOrder = await reloadClient.services.orders.getById(canonical.orderId);
  const reloadedConversation = findConversation(reloadClient, canonical.orderId);
  const reloadedCharge = findCharge(reloadedConversation, canonical.charge.id);
  assert(reloadedPayment && reloadedPayment.status === 'held', 'Reload deve preservar pagamento held.');
  assert(reloadedOrder.paymentStatus === 'held', 'Reload deve preservar estado financeiro do pedido.');
  assert(reloadedCharge && reloadedCharge.paid === true, 'Reload deve preservar cobrança paga.');

  const concurrent = await createChargedOrder(client, professional, 'concurrent', 'R$ 610,00');
  const runtimeA = createRuntime(client).Doke;
  const runtimeB = createRuntime(client).Doke;
  const concurrentResults = await Promise.all([
    runtimeA.services.payments.confirmChargePayment(concurrent.orderId, {
      conversationId: concurrent.conversationId,
      messageId: concurrent.charge.id,
      amount: 610,
      grossAmount: 610,
      method: 'Cartão de crédito'
    }),
    runtimeB.services.payments.confirmChargePayment(concurrent.orderId, {
      conversationId: concurrent.conversationId,
      messageId: concurrent.charge.id,
      amount: 610,
      grossAmount: 610,
      method: 'Cartão de crédito'
    })
  ]);
  assert(concurrentResults[0].payment.id === concurrentResults[1].payment.id, 'Runtimes concorrentes devem convergir no mesmo pagamento.');
  const concurrentReload = createRuntime(client).Doke;
  assert(paymentCount(concurrentReload, concurrent.orderId) === 1, 'Concorrência deve persistir um pagamento.');
  assert(walletHoldCount(concurrentReload, concurrent.orderId) === 1, 'Concorrência deve persistir um recebível held.');

  const recovery = await createChargedOrder(client, professional, 'recovery', 'R$ 730,00');
  const recoveryRuntime = createRuntime(client).Doke;
  const recoveryOrder = await recoveryRuntime.services.orders.getById(recovery.orderId);
  const recoveryConversation = findConversation(recoveryRuntime, recovery.orderId);
  const recoveryCharge = findCharge(recoveryConversation, recovery.charge.id);
  const recoveryEventKey = ['payment_hold', recovery.orderId, recoveryCharge.id, client.id].join(':');
  const recoveryPaymentId = recoveryRuntime.repositories.payments.createPaymentId(recoveryEventKey);
  await recoveryRuntime.repositories.payments.save({
    id: recoveryPaymentId,
    eventKey: recoveryEventKey,
    orderId: recovery.orderId,
    conversationId: recoveryConversation.id,
    messageId: recoveryCharge.id,
    clientId: client.id,
    professionalId: professional.id,
    status: 'processing',
    amount: 730,
    chargedAmount: 730,
    grossAmount: 730,
    method: 'Pix'
  });
  await recoveryRuntime.services.wallet.registerHeldReceivableFromPayment({
    order: recoveryOrder,
    conversation: recoveryConversation,
    charge: recoveryCharge,
    amount: 730,
    orderId: recovery.orderId,
    conversationId: recoveryConversation.id,
    messageId: recoveryCharge.id,
    paymentId: recoveryPaymentId
  });
  const recovered = await recoveryRuntime.services.payments.confirmChargePayment(recovery.orderId, {
    conversationId: recoveryConversation.id,
    messageId: recoveryCharge.id,
    amount: 730,
    grossAmount: 730,
    method: 'Pix'
  });
  assert(recovered.payment.status === 'held', 'Retry deve finalizar pagamento processing.');
  assert(recovered.order.paymentStatus === 'held', 'Retry deve reconciliar pedido.');
  assert(recovered.charge.paid === true, 'Retry deve reconciliar cobrança.');
  assert(walletHoldCount(recoveryRuntime, recovery.orderId) === 1, 'Retry não pode duplicar recebível já criado.');

  console.log(JSON.stringify({
    canonicalPayment: firstPayment.payment.id,
    roleAndStateGuards: true,
    escrowHeld: true,
    pointsDiscountPreserved: true,
    walletGrossProtected: true,
    reloadPersistence: true,
    concurrentIdempotency: true,
    recoverableProcessing: true,
    notificationIdempotency: true
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
