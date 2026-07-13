#!/usr/bin/env node
/* Canonical completion and escrow release contract.
   Covers professional completion request, client confirmation, dispute blocking,
   held-to-released payment, held-to-available receivable, reload and concurrency. */
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
    location: { search: '', href: 'http://localhost:4173/mensagens.html' },
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

function findWalletTransaction(Doke, orderId) {
  return Doke.repositories.wallet.readWallet().transactions.find((transaction) => (
    String(transaction.orderId || '') === String(orderId)
  ));
}

function notificationCount(Doke, orderId, predicate) {
  return Doke.repositories.notifications.readLocal().filter((notification) => (
    String(notification.orderId || '') === String(orderId) && predicate(notification)
  )).length;
}

async function createChargedOrder(client, professional, suffix, amount = 'R$ 520,00') {
  const clientRuntime = createRuntime(client).Doke;
  const order = await clientRuntime.services.orders.create({
    serviceId: `service_completion_${suffix}`,
    professionalId: professional.id,
    providerId: professional.id,
    providerName: professional.name,
    serviceTitle: `Serviço conclusão ${suffix}`,
    title: `Serviço conclusão ${suffix}`
  });

  const professionalRuntime = createRuntime(professional).Doke;
  await professionalRuntime.services.orders.accept(order.id);
  await professionalRuntime.services.orders.submitProposal(order.id, {
    amount,
    installments: 'À vista',
    messageText: `Proposta ${suffix}`
  });

  await createRuntime(client).Doke.services.orders.approveProposal(order.id, {
    approvalSource: 'completion-release-contract'
  });

  const chargeResult = await createRuntime(professional).Doke.services.orders.createCharge(order.id, {
    amount,
    installments: 'À vista'
  });

  return {
    orderId: order.id,
    amount,
    charge: chargeResult.message,
    conversationId: chargeResult.conversationId
  };
}

async function createHeldOrder(client, professional, suffix, amount = 'R$ 520,00') {
  const charged = await createChargedOrder(client, professional, suffix, amount);
  const numericAmount = Number(String(amount).replace(/[^\d,]/g, '').replace(',', '.'));
  const payment = await createRuntime(client).Doke.services.payments.confirmChargePayment(charged.orderId, {
    conversationId: charged.conversationId,
    messageId: charged.charge.id,
    chargeMessageId: charged.charge.id,
    amount: numericAmount,
    grossAmount: numericAmount,
    discountAmount: 0,
    method: 'Pix'
  });
  return Object.assign({}, charged, { payment });
}

function assertSourceContracts() {
  const messagesHtml = fs.readFileSync(path.join(projectRoot, 'mensagens.html'), 'utf8');
  const messagesSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/mensagens.js'), 'utf8');
  const paymentPageSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/pagamento-profissional.js'), 'utf8');
  const reviewSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/avaliacao-profissional.js'), 'utf8');
  const paymentServiceSource = fs.readFileSync(path.join(projectRoot, 'assets/js/services/payment-service.js'), 'utf8');
  const ordersSource = fs.readFileSync(path.join(projectRoot, 'assets/js/services/orders-service.js'), 'utf8');
  const walletSource = fs.readFileSync(path.join(projectRoot, 'assets/js/services/wallet-service.js'), 'utf8');

  assert(messagesHtml.includes('payment-service.js?v=20260712-completion-release-v1'), 'Mensagens deve carregar payment-service sem adicionar outro script.');
  assert(messagesSource.includes('paymentService.requestCompletion'), 'Chat deve delegar solicitação ao payment-service.');
  assert(messagesSource.includes('paymentService.confirmCompletion'), 'Chat deve delegar confirmação ao payment-service.');
  assert(!messagesSource.includes("updateOrderFromConversation('completed'"), 'Chat não pode concluir pedido por mutação genérica.');
  assert(paymentPageSource.includes('paymentService.confirmCompletion'), 'Página de pagamento deve delegar conclusão ao payment-service.');
  assert(!paymentPageSource.includes('registerReceivableFromOrder'), 'Página de pagamento não pode liberar recebível diretamente.');
  assert(!reviewSource.includes('registerReceivableFromOrder'), 'Avaliação não pode ser autoridade de liberação financeira.');
  assert(paymentServiceSource.includes('function requestCompletion(orderId, payload)'), 'Payment service deve expor solicitação de conclusão.');
  assert(paymentServiceSource.includes('function confirmCompletion(orderId, payload)'), 'Payment service deve expor confirmação e liberação.');
  assert(ordersSource.includes('function recordCompletionRequest(orderId, options)'), 'Orders service deve registrar solicitação de conclusão.');
  assert(walletSource.includes('function releaseHeldReceivableFromCompletion(payload)'), 'Wallet service deve ser autoridade de held para available.');
}

async function main() {
  const client = { id: 'client_completion_1', name: 'Cliente Conclusão', role: 'client', initials: 'CC' };
  const otherClient = { id: 'client_completion_2', name: 'Outro Cliente', role: 'client', initials: 'OC' };
  const professional = { id: 'user_profissional_demo', name: 'Profissional Conclusão', role: 'professional', initials: 'PC' };
  const otherProfessional = { id: 'professional_completion_2', name: 'Outro Profissional', role: 'professional', initials: 'OP' };

  assertSourceContracts();

  const unpaid = await createChargedOrder(client, professional, 'unpaid', 'R$ 300,00');
  await assertRejects(
    createRuntime(professional).Doke.services.payments.requestCompletion(unpaid.orderId, {
      conversationId: unpaid.conversationId,
      messageId: unpaid.charge.id
    }),
    'Profissional não pode solicitar conclusão antes do pagamento em garantia.'
  );

  const heldWithoutRequest = await createHeldOrder(client, professional, 'without-request', 'R$ 340,00');
  await assertRejects(
    createRuntime(client).Doke.services.payments.confirmCompletion(heldWithoutRequest.orderId, {
      conversationId: heldWithoutRequest.conversationId,
      messageId: heldWithoutRequest.charge.id
    }),
    'Cliente não pode concluir antes da solicitação do profissional.'
  );

  const canonical = await createHeldOrder(client, professional, 'canonical', 'R$ 520,00');
  await assertRejects(
    createRuntime(client).Doke.services.payments.requestCompletion(canonical.orderId, {
      conversationId: canonical.conversationId,
      messageId: canonical.charge.id
    }),
    'Cliente não pode solicitar conclusão em nome do profissional.'
  );
  await assertRejects(
    createRuntime(otherProfessional).Doke.services.payments.requestCompletion(canonical.orderId, {
      conversationId: canonical.conversationId,
      messageId: canonical.charge.id
    }),
    'Outro profissional não pode solicitar conclusão.'
  );

  const professionalRuntime = createRuntime(professional).Doke;
  const requested = await professionalRuntime.services.payments.requestCompletion(canonical.orderId, {
    conversationId: canonical.conversationId,
    messageId: canonical.charge.id,
    completionNote: 'Serviço finalizado e ambiente entregue.'
  });
  assert(requested.order.status === 'in_progress', 'Solicitação não pode concluir o pedido.');
  assert(requested.order.completionStatus === 'requested', 'Pedido deve registrar completionStatus requested.');
  assert(requested.order.paymentStatus === 'held', 'Solicitação deve manter pagamento held.');
  assert(requested.payment.status === 'held', 'Solicitação deve manter ledger held.');
  assert(requested.charge.completionStatus === 'requested', 'Cobrança deve registrar a solicitação.');
  assert(requested.conversation.order.completionStatus === 'requested', 'Conversa deve projetar a solicitação sem sobrescrever o pedido.');
  assert(findWalletTransaction(professionalRuntime, canonical.orderId).status === 'held', 'Recebível deve permanecer held durante a confirmação.');
  assert(notificationCount(professionalRuntime, canonical.orderId, (item) => item.type === 'completion_requested') === 1, 'Cliente deve receber uma única notificação de conclusão solicitada.');

  const requestReload = createRuntime(professional).Doke;
  const requestAgain = await requestReload.services.payments.requestCompletion(canonical.orderId, {
    conversationId: canonical.conversationId,
    messageId: canonical.charge.id
  });
  assert(requestAgain.order.completionStatus === 'requested', 'Reload deve preservar solicitação de conclusão.');
  assert(notificationCount(requestReload, canonical.orderId, (item) => item.type === 'completion_requested') === 1, 'Retry não pode duplicar notificação de solicitação.');

  await assertRejects(
    createRuntime(client).Doke.services.orders.complete(canonical.orderId),
    'Orders service deve bloquear conclusão sem liberação canônica.'
  );
  await assertRejects(
    createRuntime(professional).Doke.services.payments.confirmCompletion(canonical.orderId, {
      conversationId: canonical.conversationId,
      messageId: canonical.charge.id
    }),
    'Profissional não pode confirmar a própria conclusão.'
  );
  await assertRejects(
    createRuntime(otherClient).Doke.services.payments.confirmCompletion(canonical.orderId, {
      conversationId: canonical.conversationId,
      messageId: canonical.charge.id
    }),
    'Outro cliente não pode liberar o pagamento.'
  );

  const clientRuntime = createRuntime(client).Doke;
  const released = await clientRuntime.services.payments.confirmCompletion(canonical.orderId, {
    conversationId: canonical.conversationId,
    messageId: canonical.charge.id,
    completionNote: 'Entrega confirmada pelo cliente.'
  });
  assert(released.order.status === 'completed', 'Confirmação deve concluir o pedido.');
  assert(released.order.completionStatus === 'confirmed', 'Pedido deve registrar conclusão confirmada.');
  assert(released.order.paymentStatus === 'released', 'Pedido deve registrar pagamento released.');
  assert(released.order.escrowStatus === 'released', 'Pedido deve registrar garantia liberada.');
  assert(released.payment.status === 'released', 'Ledger deve terminar released.');
  assert(released.payment.escrowStatus === 'released', 'Ledger deve liberar escrow.');
  assert(released.charge.completed === true, 'Cobrança deve ficar completed.');
  assert(released.charge.paymentStatus === 'released', 'Cobrança deve registrar pagamento released.');
  assert(released.conversation.status === 'completed' && released.conversation.order.status === 'completed', 'Conversa deve permanecer completed após atualizar a cobrança.');
  assert(released.walletTransaction.status === 'available', 'Recebível deve ficar available.');
  assert(released.walletTransaction.releaseStatus === 'liberado', 'Recebível deve registrar liberação.');
  assert(notificationCount(clientRuntime, canonical.orderId, (item) => item.title === 'Saldo disponível') === 1, 'Profissional deve receber uma única notificação de saldo disponível.');
  assert(notificationCount(clientRuntime, canonical.orderId, (item) => /Pedido concluído/.test(item.title || '')) === 1, 'Conclusão deve gerar uma única notificação do pedido.');

  const releasedAgain = await createRuntime(client).Doke.services.payments.confirmCompletion(canonical.orderId, {
    conversationId: canonical.conversationId,
    messageId: canonical.charge.id
  });
  assert(releasedAgain.payment.id === released.payment.id, 'Retry deve preservar paymentId.');
  assert(releasedAgain.walletTransaction.id === released.walletTransaction.id, 'Retry deve preservar recebível.');
  assert(notificationCount(clientRuntime, canonical.orderId, (item) => item.title === 'Saldo disponível') === 1, 'Retry não pode duplicar notificação financeira.');

  const disputed = await createHeldOrder(client, professional, 'disputed', 'R$ 610,00');
  await createRuntime(professional).Doke.services.payments.requestCompletion(disputed.orderId, {
    conversationId: disputed.conversationId,
    messageId: disputed.charge.id
  });
  const disputeClient = createRuntime(client).Doke;
  const disputedTransaction = findWalletTransaction(disputeClient, disputed.orderId);
  await disputeClient.services.wallet.openDispute({
    transactionId: disputedTransaction.id,
    orderId: disputed.orderId,
    conversationId: disputed.conversationId,
    messageId: disputed.charge.id,
    reasonCode: 'service_not_completed',
    reason: 'O serviço ainda não foi concluído.'
  });
  await assertRejects(
    disputeClient.services.payments.confirmCompletion(disputed.orderId, {
      conversationId: disputed.conversationId,
      messageId: disputed.charge.id
    }),
    'Contestação ativa deve bloquear conclusão e liberação.'
  );
  const disputedOrder = await disputeClient.services.orders.getById(disputed.orderId);
  const disputedPayment = await disputeClient.services.payments.getByOrderId(disputed.orderId);
  const disputedWallet = findWalletTransaction(disputeClient, disputed.orderId);
  assert(disputedOrder.status === 'in_progress', 'Pedido contestado deve permanecer em execução.');
  assert(disputedPayment.status === 'held', 'Pagamento contestado deve permanecer held.');
  assert(disputedWallet.status === 'held', 'Recebível contestado não pode ficar available.');
  assert(disputedWallet.releaseStatus === 'contestacao', 'Recebível deve refletir contestação.');

  const concurrent = await createHeldOrder(client, professional, 'concurrent', 'R$ 730,00');
  await createRuntime(professional).Doke.services.payments.requestCompletion(concurrent.orderId, {
    conversationId: concurrent.conversationId,
    messageId: concurrent.charge.id
  });
  const runtimeA = createRuntime(client).Doke;
  const runtimeB = createRuntime(client).Doke;
  const concurrentResults = await Promise.all([
    runtimeA.services.payments.confirmCompletion(concurrent.orderId, {
      conversationId: concurrent.conversationId,
      messageId: concurrent.charge.id
    }),
    runtimeB.services.payments.confirmCompletion(concurrent.orderId, {
      conversationId: concurrent.conversationId,
      messageId: concurrent.charge.id
    })
  ]);
  assert(concurrentResults[0].payment.id === concurrentResults[1].payment.id, 'Confirmações concorrentes devem convergir no mesmo pagamento.');
  assert(concurrentResults[0].walletTransaction.id === concurrentResults[1].walletTransaction.id, 'Confirmações concorrentes devem convergir no mesmo recebível.');
  const concurrentReload = createRuntime(client).Doke;
  const concurrentOrder = await concurrentReload.services.orders.getById(concurrent.orderId);
  const concurrentPayment = await concurrentReload.services.payments.getByOrderId(concurrent.orderId);
  const concurrentWallet = concurrentReload.repositories.wallet.readWallet().transactions.filter((item) => String(item.orderId) === String(concurrent.orderId));
  assert(concurrentOrder.status === 'completed', 'Concorrência deve persistir pedido completed.');
  assert(concurrentPayment.status === 'released', 'Concorrência deve persistir pagamento released.');
  assert(concurrentWallet.length === 1 && concurrentWallet[0].status === 'available', 'Concorrência deve manter um recebível available.');
  assert(notificationCount(concurrentReload, concurrent.orderId, (item) => item.title === 'Saldo disponível') === 1, 'Concorrência não pode duplicar notificação financeira.');

  console.log(JSON.stringify({
    professionalRequestRequired: true,
    clientConfirmationRequired: true,
    escrowRelease: 'held -> released',
    receivableRelease: 'held -> available',
    roleIsolation: true,
    disputeBlocksRelease: true,
    reloadIdempotency: true,
    concurrentIdempotency: true,
    evaluationSeparatedFromRelease: true
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
