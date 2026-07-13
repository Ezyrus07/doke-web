#!/usr/bin/env node
/* Canonical cancellation and dispute contract.
   Covers pre-payment cancellation, held-payment dispute, response, refund/release,
   reload idempotency, role isolation and terminal-resolution exclusivity. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const storage = Object.create(null);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertRejects(task, message, includes) {
  let error = null;
  try { await task; } catch (caught) { error = caught; }
  assert(error, message);
  if (includes) assert(String(error.message || error).includes(includes), `${message} Motivo inesperado: ${error.message || error}`);
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
    location: { search: '', href: 'http://localhost:4173/pedidos.html' },
    Doke: {
      mockData: { load: () => Promise.resolve([]) },
      session: { getCurrentUser: () => user }
    }
  };

  context.window = context;
  const sandbox = vm.createContext(context);
  [
    'assets/js/core/permissions.js',
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

function findDisputes(Doke, orderId) {
  return Doke.repositories.wallet.listDisputes({ orderId, currentUser: false }) || [];
}

function notificationCount(Doke, orderId, type) {
  return Doke.repositories.notifications.readLocal().filter((item) => (
    String(item.orderId || '') === String(orderId) && (!type || item.type === type)
  )).length;
}

function findNotification(Doke, orderId, predicate) {
  return Doke.repositories.notifications.readLocal().find((item) => (
    String(item.orderId || '') === String(orderId) && (!predicate || predicate(item))
  )) || null;
}

async function createOrder(client, professional, suffix) {
  return createRuntime(client).Doke.services.orders.create({
    serviceId: `service_dispute_${suffix}`,
    professionalId: professional.id,
    providerId: professional.id,
    providerName: professional.name,
    serviceTitle: `Serviço disputa ${suffix}`,
    title: `Serviço disputa ${suffix}`
  });
}

async function createChargedOrder(client, professional, suffix, amount = 'R$ 520,00') {
  const order = await createOrder(client, professional, suffix);
  await createRuntime(professional).Doke.services.orders.accept(order.id);
  await createRuntime(professional).Doke.services.orders.submitProposal(order.id, {
    amount,
    installments: 'À vista',
    messageText: `Proposta ${suffix}`
  });
  await createRuntime(client).Doke.services.orders.approveProposal(order.id, {
    approvalSource: 'cancellation-dispute-contract'
  });
  const charge = await createRuntime(professional).Doke.services.orders.createCharge(order.id, {
    amount,
    installments: 'À vista'
  });
  return { orderId: order.id, charge: charge.message, conversationId: charge.conversationId, amount };
}

async function createHeldOrder(client, professional, suffix, amount = 'R$ 520,00', discount = 0) {
  const charged = await createChargedOrder(client, professional, suffix, amount);
  const grossAmount = Number(String(amount).replace(/[^\d,]/g, '').replace(',', '.'));
  const payment = await createRuntime(client).Doke.services.payments.confirmChargePayment(charged.orderId, {
    conversationId: charged.conversationId,
    messageId: charged.charge.id,
    chargeMessageId: charged.charge.id,
    amount: grossAmount - discount,
    grossAmount,
    discountAmount: discount,
    method: 'Pix'
  });
  return Object.assign({}, charged, { payment: payment.payment, grossAmount, chargedAmount: grossAmount - discount });
}

function assertSourceContracts() {
  const ordersSource = fs.readFileSync(path.join(projectRoot, 'assets/js/services/orders-service.js'), 'utf8');
  const walletServiceSource = fs.readFileSync(path.join(projectRoot, 'assets/js/services/wallet-service.js'), 'utf8');
  const walletRepositorySource = fs.readFileSync(path.join(projectRoot, 'assets/js/repositories/wallet-repository.js'), 'utf8');
  const ordersPageSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/pedidos-local-orders.js'), 'utf8');
  const messagesSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/mensagens.js'), 'utf8');

  assert(ordersSource.includes('function canCancelBeforePayment(order, actor)'), 'Orders service deve expor a autorização canônica de cancelamento.');
  assert(ordersSource.includes('function cancelBeforePayment(orderId, reason, options)'), 'Orders service deve expor cancelamento pré-pagamento.');
  assert(ordersSource.includes('Pedidos com pagamento iniciado exigem cancelamento financeiro'), 'Cancelamento genérico deve bloquear pedidos pagos.');
  assert(walletServiceSource.includes("releaseStatus: 'blocked_by_dispute'"), 'Disputa deve congelar explicitamente a liberação.');
  assert(walletServiceSource.includes("status: 'refunded'"), 'Resolução pró-cliente deve projetar pagamento refunded.');
  assert(walletServiceSource.includes("status: 'released'"), 'Resolução pró-profissional deve projetar pagamento released.');
  assert(walletRepositorySource.includes('payload.deferSideEffects !== true'), 'Repository deve permitir side effects coordenados pelo service.');
  assert(!ordersPageSource.includes('Doke.services && Doke.services.wallet || Doke.repositories'), 'Pedidos não deve fazer fallback direto para repository ao abrir disputa.');
  assert(!messagesSource.includes('window.Doke?.services?.wallet || window.Doke?.repositories?.wallet'), 'Mensagens não deve fazer fallback direto para repository ao abrir disputa.');
  assert(ordersPageSource.includes("paymentStatus === 'held'"), 'Ação de relatar problema deve exigir pagamento em garantia.');
  assert(ordersPageSource.includes('data-order-cancel-before-payment'), 'Pedidos deve expor cancelamento pré-pagamento usando ação secundária existente.');
  assert(ordersPageSource.includes('ordersService.cancelBeforePayment'), 'Pedidos deve delegar cancelamento ao orders service.');
  assert(messagesSource.includes('data-messages-cancel-order'), 'Mensagens deve expor cancelamento pré-pagamento no contexto do pedido.');
  assert(messagesSource.includes('ordersService.cancelBeforePayment'), 'Mensagens deve delegar cancelamento ao orders service.');
}

async function main() {
  const client = { id: 'client_dispute_1', name: 'Cliente Disputa', role: 'client', initials: 'CD' };
  const otherClient = { id: 'client_dispute_2', name: 'Outro Cliente', role: 'client', initials: 'OC' };
  const professional = { id: 'user_profissional_demo', name: 'Profissional Disputa', role: 'professional', initials: 'PD' };
  const otherProfessional = { id: 'professional_dispute_2', name: 'Outro Profissional', role: 'professional', initials: 'OP' };
  const support = { id: 'support_dispute_1', name: 'Suporte Doke', role: 'support', initials: 'SD' };

  assertSourceContracts();

  const pending = await createOrder(client, professional, 'cancel-pending');
  const cancelledPending = await createRuntime(client).Doke.services.orders.cancelBeforePayment(
    pending.id,
    'Não preciso mais do serviço.',
    { cancellationSource: 'contract' }
  );
  assert(cancelledPending.status === 'cancelled', 'Cliente deve cancelar solicitação antes do aceite.');
  assert(cancelledPending.cancellationType === 'client_cancelled_before_payment', 'Cancelamento deve registrar o tipo canônico.');
  assert(!cancelledPending.paymentId, 'Cancelamento pré-pagamento não deve criar pagamento.');
  const clientCancellationNotification = findNotification(createRuntime(professional).Doke, pending.id, (item) => item.title === 'Pedido cancelado');
  assert(clientCancellationNotification, 'Cancelamento do cliente deve notificar o profissional como pedido cancelado.');
  assert(clientCancellationNotification.body.includes('cancelou o pedido') && !clientCancellationNotification.body.includes('Profissional') , 'Notificação não pode atribuir cancelamento do cliente ao profissional.');

  const professionalCancellationOrder = await createOrder(client, professional, 'cancel-professional');
  await createRuntime(professional).Doke.services.orders.accept(professionalCancellationOrder.id);
  const cancelledByProfessional = await createRuntime(professional).Doke.services.orders.cancelBeforePayment(
    professionalCancellationOrder.id,
    'Não conseguirei executar o serviço.',
    { cancellationSource: 'contract' }
  );
  assert(cancelledByProfessional.cancellationType === 'professional_cancelled_before_payment', 'Cancelamento profissional deve registrar o tipo canônico.');
  const professionalCancellationNotification = findNotification(createRuntime(client).Doke, professionalCancellationOrder.id, (item) => item.title === 'Pedido cancelado');
  assert(professionalCancellationNotification && professionalCancellationNotification.body.includes('Profissional Disputa cancelou'), 'Cancelamento profissional deve ser comunicado corretamente ao cliente.');

  const accepted = await createOrder(client, professional, 'cancel-accepted');
  await createRuntime(professional).Doke.services.orders.accept(accepted.id);
  const cancelledAccepted = await createRuntime(client).Doke.services.orders.cancelBeforePayment(
    accepted.id,
    'Decidi não continuar.',
    { cancellationSource: 'contract' }
  );
  assert(cancelledAccepted.status === 'cancelled', 'Cliente deve cancelar pedido aceito antes de proposta/pagamento.');

  const approvedWithoutPayment = await createChargedOrder(client, professional, 'cancel-approved', 'R$ 300,00');
  const cancelledApproved = await createRuntime(client).Doke.services.orders.cancelBeforePayment(
    approvedWithoutPayment.orderId,
    'Não vou realizar o pagamento.',
    { cancellationSource: 'contract' }
  );
  assert(cancelledApproved.status === 'cancelled', 'Cliente deve cancelar antes do pagamento mesmo após aprovação da proposta.');
  assert(!cancelledApproved.paymentId, 'Cancelamento antes do pagamento não deve criar ledger financeiro.');

  const held = await createHeldOrder(client, professional, 'held-client-refund', 'R$ 520,00', 20);
  const unrelatedHeld = await createHeldOrder(client, professional, 'held-unrelated', 'R$ 180,00', 0);
  const unrelatedRuntime = createRuntime(client).Doke;
  const unrelatedTransaction = findWalletTransaction(unrelatedRuntime, unrelatedHeld.orderId);
  await assertRejects(
    createRuntime(client).Doke.services.wallet.openDispute({
      orderId: held.orderId,
      transactionId: unrelatedTransaction.id,
      reason: 'Tentativa de usar recebível de outro pedido.'
    }),
    'Contestação deve rejeitar recebível pertencente a outro pedido.',
    'Recebível em garantia não encontrado'
  );
  await assertRejects(
    createRuntime(client).Doke.services.orders.cancelBeforePayment(held.orderId, 'Quero cancelar.', {}),
    'Cancelamento simples deve ser bloqueado depois do pagamento.',
    'pagamento já foi iniciado'
  );
  await assertRejects(
    createRuntime(otherClient).Doke.services.wallet.openDispute({ orderId: held.orderId, reason: 'Tentativa indevida.' }),
    'Outro cliente não pode abrir disputa.'
  );
  await assertRejects(
    createRuntime(professional).Doke.services.wallet.openDispute({ orderId: held.orderId, reason: 'Tentativa profissional.' }),
    'Profissional não pode abrir disputa como cliente.'
  );

  const clientRuntime = createRuntime(client).Doke;
  const opened = await clientRuntime.services.wallet.openDispute({
    orderId: held.orderId,
    transactionId: held.payment.walletTransactionId,
    conversationId: held.conversationId,
    messageId: held.charge.id,
    reasonCode: 'different_result',
    reason: 'Resultado diferente do combinado.'
  });
  assert(opened.dispute.status === 'contestacao_aberta', 'Disputa deve nascer aberta.');
  assert(opened.order.status === 'in_progress', 'Abertura de disputa não deve concluir nem cancelar o pedido.');
  assert(opened.order.paymentStatus === 'held', 'Pedido deve manter pagamento held durante disputa.');
  assert(opened.payment.status === 'held', 'Ledger de pagamento deve permanecer held.');
  assert(opened.payment.releaseStatus === 'blocked_by_dispute', 'Pagamento deve registrar liberação bloqueada.');
  assert(opened.transaction.status === 'held', 'Recebível deve continuar held.');
  assert(findDisputes(clientRuntime, held.orderId).length === 1, 'Deve existir uma única disputa por pedido ativo.');

  const concurrentOpen = await Promise.all([
    createRuntime(client).Doke.services.wallet.openDispute({ orderId: held.orderId, reason: 'Resultado diferente do combinado.' }),
    createRuntime(client).Doke.services.wallet.openDispute({ orderId: held.orderId, reason: 'Resultado diferente do combinado.' })
  ]);
  assert(concurrentOpen[0].dispute.id === concurrentOpen[1].dispute.id, 'Aberturas concorrentes devem convergir para a mesma disputa.');
  assert(findDisputes(clientRuntime, held.orderId).length === 1, 'Concorrência não pode duplicar disputa.');

  await assertRejects(
    createRuntime(otherProfessional).Doke.services.wallet.respondDispute({
      disputeId: opened.dispute.id,
      orderId: held.orderId,
      responseText: 'Resposta indevida.'
    }),
    'Outro profissional não pode responder à disputa.'
  );

  const responded = await createRuntime(professional).Doke.services.wallet.respondDispute({
    disputeId: opened.dispute.id,
    orderId: held.orderId,
    responseText: 'O serviço foi executado conforme as evidências anexadas.'
  });
  assert(responded.dispute.status === 'em_analise', 'Resposta profissional deve mover disputa para análise.');
  assert(responded.order.disputeStatus === 'em_analise', 'Pedido deve refletir disputa em análise.');
  assert(responded.payment.status === 'held', 'Resposta não pode liberar o pagamento.');

  await assertRejects(
    createRuntime(client).Doke.services.payments.confirmCompletion(held.orderId, {
      conversationId: held.conversationId,
      messageId: held.charge.id
    }),
    'Conclusão deve permanecer bloqueada durante disputa.'
  );

  await assertRejects(
    createRuntime(support).Doke.services.wallet.resolveDispute({
      disputeId: opened.dispute.id,
      orderId: held.orderId,
      resolution: 'qualquer_coisa',
      reason: 'Resolução inválida.'
    }),
    'Suporte deve informar uma resolução terminal explícita.',
    'explicitamente'
  );

  const refunded = await createRuntime(support).Doke.services.wallet.resolveDispute({
    disputeId: opened.dispute.id,
    orderId: held.orderId,
    resolution: 'cliente',
    reason: 'Evidências favoráveis ao cliente.'
  });
  assert(refunded.resolution === 'cliente', 'Resolução deve indicar cliente.');
  assert(refunded.payment.status === 'refunded', 'Pagamento deve terminar refunded.');
  assert(refunded.payment.escrowStatus === 'refunded', 'Escrow deve terminar refunded.');
  assert(Number(refunded.payment.refundAmount) === held.chargedAmount, 'Reembolso deve usar o valor efetivamente pago pelo cliente.');
  assert(refunded.order.status === 'cancelled', 'Pedido reembolsado deve ser encerrado como cancelled.');
  assert(refunded.order.cancellationType === 'dispute_refund', 'Pedido deve registrar cancelamento por reembolso de disputa.');
  assert(refunded.transaction.status === 'refunded', 'Recebível deve terminar refunded.');
  assert(Number(refunded.transaction.clientRefundAmount) === held.chargedAmount, 'Transação deve registrar reembolso integral do valor cobrado.');
  const refundedCharge = findCharge(findConversation(createRuntime(client).Doke, held.orderId), held.charge.id);
  assert(refundedCharge && refundedCharge.paymentStatus === 'refunded', 'Cobrança deve refletir reembolso.');

  const refundedRetry = await createRuntime(support).Doke.services.wallet.resolveDispute({
    disputeId: opened.dispute.id,
    orderId: held.orderId,
    resolution: 'cliente'
  });
  assert(refundedRetry.dispute.id === refunded.dispute.id, 'Retry da resolução deve reutilizar a mesma disputa.');
  await assertRejects(
    createRuntime(support).Doke.services.wallet.resolveDispute({
      disputeId: opened.dispute.id,
      orderId: held.orderId,
      resolution: 'profissional'
    }),
    'Resolução terminal não pode ser invertida.'
  );
  assert(notificationCount(createRuntime(client).Doke, held.orderId, 'order_dispute_resolved') === 2, 'Resolução deve notificar cliente e profissional uma única vez cada.');

  const professionalWin = await createHeldOrder(client, professional, 'held-professional-release', 'R$ 410,00');
  const openedProfessionalWin = await createRuntime(client).Doke.services.wallet.openDispute({
    orderId: professionalWin.orderId,
    reasonCode: 'service_not_completed',
    reason: 'Serviço não foi concluído.'
  });
  const released = await createRuntime(support).Doke.services.wallet.resolveDispute({
    disputeId: openedProfessionalWin.dispute.id,
    orderId: professionalWin.orderId,
    resolution: 'profissional',
    reason: 'Evidências confirmam a execução.'
  });
  assert(released.payment.status === 'released', 'Resolução pró-profissional deve liberar pagamento.');
  assert(released.order.status === 'completed', 'Resolução pró-profissional deve concluir pedido.');
  assert(released.order.paymentStatus === 'released', 'Pedido deve refletir pagamento released.');
  assert(released.transaction.status === 'available', 'Recebível deve ficar available para o profissional.');
  assert(released.order.completionStatus === 'confirmed', 'Conclusão deve ser confirmada pela resolução de suporte.');

  await assertRejects(
    createRuntime(client).Doke.services.wallet.openDispute({
      orderId: professionalWin.orderId,
      reason: 'Tentativa após conclusão.'
    }),
    'Pedido concluído não pode abrir contestação comum.'
  );

  const sourceRuntime = createRuntime(client).Doke;
  const releasedConversation = findConversation(sourceRuntime, professionalWin.orderId);
  const releasedCharge = findCharge(releasedConversation, professionalWin.charge.id);
  assert(releasedCharge && releasedCharge.paymentStatus === 'released', 'Conversa deve refletir liberação após resolução.');
  assert(findWalletTransaction(sourceRuntime, professionalWin.orderId).status === 'available', 'Reload deve preservar recebível liberado.');

  console.log(JSON.stringify({
    prePaymentCancellation: true,
    paidCancellationBlocked: true,
    heldDisputeRequired: true,
    transactionIdentityGuard: true,
    explicitResolutionRequired: true,
    pageCancellationActions: true,
    cancellationNotificationSemantics: true,
    roleIsolation: true,
    concurrentSingleDispute: true,
    completionBlockedDuringDispute: true,
    clientResolution: 'held -> refunded',
    professionalResolution: 'held -> released',
    terminalResolutionExclusive: true,
    reloadPersistence: true
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
