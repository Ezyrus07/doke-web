#!/usr/bin/env node
/* Doke main marketplace cycle contract test.
   Validates the complete local/mock data chain without a browser:
   order -> accepted -> proposal/charge -> payment -> wallet -> completion -> review -> profile review. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const storage = Object.create(null);
const listeners = Object.create(null);

let currentUser = {
  id: 'user_cliente_demo',
  name: 'Cliente Doke',
  role: 'client',
  initials: 'CD',
  avatarInitials: 'CD'
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertRejects(task, message) {
  let rejected = false;
  try {
    await task;
  } catch (error) {
    rejected = true;
  }
  assert(rejected, message);
}

function parseCurrency(value) {
  const normalized = String(value || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const context = {
  console,
  Date,
  Intl,
  Math,
  JSON,
  Promise,
  setTimeout,
  clearTimeout,
  URLSearchParams,
  encodeURIComponent,
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
  location: {
    search: '',
    href: 'http://localhost:4173/index.html'
  },
  Doke: {
    mockData: { load: () => Promise.resolve([]) }
  }
};

context.window = context;
context.Doke.session = {
  getCurrentUser: () => currentUser
};

const sandbox = vm.createContext(context);

function runAsset(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename: relativePath });
}

function createReloadedDoke(user) {
  const reloadListeners = Object.create(null);
  const reloadContext = {
    console,
    Date,
    Intl,
    Math,
    JSON,
    Promise,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    encodeURIComponent,
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
    localStorage: context.localStorage,
    CustomEvent: context.CustomEvent,
    document: {
      addEventListener: (type, callback) => {
        if (!reloadListeners[type]) reloadListeners[type] = [];
        reloadListeners[type].push(callback);
      },
      dispatchEvent: (event) => {
        (reloadListeners[event.type] || []).forEach((callback) => callback(event));
      }
    },
    location: context.location,
    Doke: {
      mockData: { load: () => Promise.resolve([]) },
      session: { getCurrentUser: () => user }
    }
  };
  reloadContext.window = reloadContext;
  const reloadSandbox = vm.createContext(reloadContext);
  [
    'assets/js/repositories/orders-repository.js',
    'assets/js/repositories/messages-repository.js',
    'assets/js/repositories/notifications-repository.js',
    'assets/js/services/notification-service.js',
    'assets/js/services/message-service.js',
    'assets/js/services/orders-service.js',
    'assets/js/services/payment-service.js',
    'assets/js/repositories/reviews-repository.js',
    'assets/js/services/review-service.js'
  ].forEach((relativePath) => {
    const filename = path.join(projectRoot, relativePath);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), reloadSandbox, { filename: relativePath });
  });
  return reloadSandbox.Doke;
}

[
  'assets/js/repositories/orders-repository.js',
  'assets/js/repositories/messages-repository.js',
  'assets/js/repositories/notifications-repository.js',
  'assets/js/repositories/wallet-repository.js',
  'assets/js/repositories/reviews-repository.js',
  'assets/js/services/notification-service.js',
  'assets/js/services/message-service.js',
  'assets/js/services/orders-service.js',
  'assets/js/services/wallet-service.js',
  'assets/js/services/payment-service.js',
  'assets/js/services/review-service.js'
].forEach(runAsset);

function setUser(user) {
  currentUser = user;
}

function getConversationByOrder(Doke, orderId) {
  return Doke.repositories.messages.readLocal().find((item) => String(item.orderId || item.order && item.order.id) === String(orderId));
}

function isProposalMessage(message) {
  return Boolean(message) && (message.type === 'proposal' || message.financialKind === 'proposal');
}

function isActualChargeMessage(message) {
  return Boolean(message) && message.type === 'charge' && message.financialKind === 'charge';
}

function getProposal(conversation, messageId) {
  const messages = Array.isArray(conversation && conversation.messages) ? conversation.messages : [];
  return messageId
    ? messages.find((message) => String(message.id || '') === String(messageId) && isProposalMessage(message))
    : messages.slice().reverse().find(isProposalMessage);
}

function getCharge(conversation, messageId) {
  const messages = Array.isArray(conversation && conversation.messages) ? conversation.messages : [];
  return messageId
    ? messages.find((message) => String(message.id || '') === String(messageId) && isActualChargeMessage(message))
    : messages.slice().reverse().find(isActualChargeMessage);
}


async function createProfileReview(Doke, conversation, charge) {
  return Doke.services.reviews.submitOrderReview(conversation.order.id || conversation.orderId, {
    conversationId: conversation.id,
    messageId: charge.id,
    rating: 5,
    tags: ['Pontualidade', 'Qualidade'],
    criteria: [{ key: 'quality', rating: 5 }],
    comment: 'Atendimento concluído com qualidade e dentro do prazo.'
  }).then((result) => result.review);
}

async function main() {
  const Doke = sandbox.Doke;
  const amount = 'R$ 280,00';

  const order = await Doke.services.orders.create({
    serviceId: 'svc-renato-acabamentos',
    professionalId: 'user_profissional_demo',
    providerId: 'user_profissional_demo',
    providerName: 'Renato Acabamentos',
    providerInitials: 'RA',
    displayProfessionalId: 'profile_renato_acabamentos',
    serviceTitle: 'Renovação residencial',
    title: 'Renovação residencial',
    category: 'Serviço',
    location: 'Rua Chile, 120 · Salvador - BA',
    description: 'Contrato completo do fluxo principal do marketplace.'
  });

  assert(order.status === 'pending', 'Pedido deveria nascer pending.');
  let conversation = getConversationByOrder(Doke, order.id);
  assert(conversation && conversation.locked === true, 'Conversa inicial deveria existir bloqueada.');
  assert(Doke.repositories.notifications.readLocal().some((item) => item.type === 'order_created' && item.userId === 'user_profissional_demo'), 'Criação deveria notificar o profissional.');

  setUser(null);
  assert(Doke.repositories.orders.listLocal({ currentUser: true }).length === 0, 'Visitante não deveria listar pedidos persistidos.');
  assert(Doke.repositories.messages.listLocal({ currentUser: true }).length === 0, 'Visitante não deveria listar conversas persistidas.');

  setUser({ id: 'user_cliente_outro', name: 'Outro Cliente', role: 'client', initials: 'OC', avatarInitials: 'OC' });
  assert(Doke.repositories.orders.listLocal({ currentUser: true }).length === 0, 'Outro cliente não deveria visualizar o pedido.');
  assert(Doke.repositories.messages.listLocal({ currentUser: true }).length === 0, 'Outro cliente não deveria visualizar a conversa.');
  await assertRejects(Doke.services.orders.getById(order.id), 'Outro cliente não deveria ler o pedido pelo service.');
  await assertRejects(Doke.services.messages.getConversationById(conversation.id), 'Outro cliente não deveria ler a conversa pelo service.');
  await assertRejects(Doke.services.orders.accept(order.id), 'Cliente sem vínculo não deveria aceitar pedido como profissional.');

  setUser({ id: 'user_profissional_demo', name: 'Profissional Doke', role: 'professional', initials: 'PD', avatarInitials: 'PD' });
  await assertRejects(
    Doke.services.orders.submitProposal(order.id, { amount, installments: 'À vista' }),
    'Proposta não deveria ser enviada antes do aceite.'
  );
  conversation = getConversationByOrder(Doke, order.id);
  assert(!getProposal(conversation), 'Tentativa inválida de proposta não deveria persistir mensagem de proposta.');
  assert(!getCharge(conversation), 'Tentativa inválida de proposta não deveria criar cobrança.');

  const accepted = await Doke.services.orders.accept(order.id);
  assert(accepted.status === 'accepted', 'Pedido não foi aceito.');
  conversation = getConversationByOrder(Doke, order.id);
  assert(conversation.status === 'accepted' && conversation.locked === false, 'Conversa não destravou após aceite.');
  await assertRejects(
    Doke.services.orders.submitProposal(order.id, { amount: 'valor inválido', installments: 'À vista' }),
    'Proposta com valor inválido deveria ser rejeitada pelo domínio.'
  );
  conversation = getConversationByOrder(Doke, order.id);
  assert(!getProposal(conversation), 'Valor inválido não deveria persistir mensagem de proposta.');
  assert(!getCharge(conversation), 'Valor inválido não deveria criar cobrança.');

  const proposal = await Doke.services.orders.submitProposal(order.id, {
    amount,
    installments: 'À vista',
    messageText: 'Proposta para aprovação'
  });
  const proposalMessage = proposal.message;
  const quoted = proposal.order;
  assert(proposalMessage && proposalMessage.id, 'Comando de proposta não gerou mensagem no chat.');
  assert(proposalMessage.type === 'proposal' && proposalMessage.financialKind === 'proposal', 'Proposta deve ter tipo financeiro próprio.');
  assert(quoted.status === 'quoted', 'Pedido deveria ficar quoted após envio da proposta.');
  conversation = getConversationByOrder(Doke, order.id);
  assert(conversation.status === 'quoted' && conversation.locked === false, 'Conversa deveria ficar quoted e desbloqueada.');
  assert(getProposal(conversation, proposalMessage.id), 'Conversa quoted deveria manter a mensagem da proposta.');
  assert(!getCharge(conversation), 'Envio da proposta não pode criar cobrança antecipada.');
  assert(Doke.repositories.notifications.readLocal().some((item) => item.title === 'Proposta enviada' && item.userId === 'user_cliente_demo'), 'Proposta deveria notificar o cliente.');

  const proposalCountAfterSubmit = conversation.messages.filter(isProposalMessage).length;
  await assertRejects(
    Doke.services.orders.submitProposal(order.id, { amount: 'R$ 300,00', installments: 'À vista' }),
    'Pedido quoted não deveria aceitar uma segunda proposta pelo mesmo comando.'
  );
  conversation = getConversationByOrder(Doke, order.id);
  assert(conversation.messages.filter(isProposalMessage).length === proposalCountAfterSubmit, 'Proposta repetida não deveria criar mensagem duplicada.');
  assert(!getCharge(conversation), 'Proposta repetida não pode criar cobrança.');

  const reloadedDoke = createReloadedDoke(currentUser);
  const reloadedOrder = reloadedDoke.repositories.orders.listLocal({ currentUser: true }).find((item) => item.id === order.id);
  const reloadedConversation = reloadedDoke.repositories.messages.listLocal({ currentUser: true, orderId: order.id })[0];
  assert(reloadedOrder && reloadedOrder.status === 'quoted', 'Reload deveria preservar o estado quoted do pedido.');
  assert(reloadedConversation && reloadedConversation.status === 'quoted', 'Reload deveria preservar o estado quoted da conversa.');
  assert(getProposal(reloadedConversation, proposalMessage.id), 'Reload deveria preservar a mensagem da proposta.');
  assert(!getCharge(reloadedConversation), 'Reload de quoted não pode inventar cobrança.');

  setUser({ id: 'user_cliente_demo', name: 'Cliente Doke', role: 'client', initials: 'CD', avatarInitials: 'CD' });
  const clientConversation = Doke.repositories.messages.listLocal({ currentUser: true, orderId: order.id })[0];
  assert(clientConversation && getProposal(clientConversation, proposalMessage.id), 'Cliente deveria ver a proposta na conversa.');
  assert(!getCharge(clientConversation), 'Cliente não deve ver cobrança antes da aprovação.');

  const inProgress = await Doke.services.orders.approveProposal(order.id, {
    conversationId: conversation.id,
    approvalSource: 'main-marketplace-cycle'
  });
  assert(inProgress.status === 'in_progress', 'Aprovação deveria mover pedido para in_progress.');
  assert(inProgress.paymentStatus === 'pending', 'Aprovação deveria manter o pagamento pendente.');

  setUser({ id: 'user_profissional_demo', name: 'Profissional Doke', role: 'professional', initials: 'PD', avatarInitials: 'PD' });
  const chargeResult = await Doke.services.orders.createCharge(order.id, {
    amount,
    installments: 'À vista'
  });
  const chargeMessage = chargeResult.message;
  assert(chargeMessage && chargeMessage.id, 'Comando de cobrança não gerou mensagem no chat.');
  assert(chargeMessage.type === 'charge' && chargeMessage.financialKind === 'charge', 'Cobrança deve ter tipo financeiro próprio.');
  assert(chargeResult.order.status === 'in_progress', 'Cobrança não deve alterar o estado de execução.');
  assert(chargeResult.order.paymentStatus === 'pending', 'Cobrança não pode confirmar pagamento automaticamente.');
  assert(chargeResult.order.chargeMessageId === chargeMessage.id, 'Pedido deve guardar o identificador da cobrança canônica.');

  setUser({ id: 'user_cliente_demo', name: 'Cliente Doke', role: 'client', initials: 'CD', avatarInitials: 'CD' });
  conversation = getConversationByOrder(Doke, order.id);
  assert(getProposal(conversation, proposalMessage.id), 'Cobrança não pode substituir a proposta aprovada.');
  assert(getCharge(conversation, chargeMessage.id), 'Cliente deve recuperar a cobrança real na conversa.');
  const paymentResult = await Doke.services.payments.confirmChargePayment(order.id, {
    conversationId: conversation.id,
    messageId: chargeMessage.id,
    amount: 280,
    grossAmount: 280,
    discountAmount: 0,
    method: 'Pix'
  });
  assert(paymentResult.payment.status === 'held', 'Pagamento canônico deveria terminar held.');
  assert(paymentResult.order.paymentStatus === 'held', 'Pedido deveria registrar pagamento em garantia.');
  assert(paymentResult.charge.paid === true, 'Cobrança deveria ficar paid=true após pagamento.');
  assert(paymentResult.walletTransaction.status === 'held', 'Carteira deveria registrar held após pagamento.');
  setUser({ id: 'user_profissional_demo', name: 'Profissional Doke', role: 'professional', initials: 'PD', avatarInitials: 'PD' });
  const completionRequest = await Doke.services.payments.requestCompletion(order.id, {
    conversationId: conversation.id,
    messageId: chargeMessage.id,
    completionNote: 'Serviço finalizado conforme a proposta aprovada.'
  });
  assert(completionRequest.order.completionStatus === 'requested', 'Profissional deveria solicitar formalmente a conclusão.');
  assert(completionRequest.order.paymentStatus === 'held', 'Solicitação não pode liberar o pagamento.');

  setUser({ id: 'user_cliente_demo', name: 'Cliente Doke', role: 'client', initials: 'CD', avatarInitials: 'CD' });
  const completionResult = await Doke.services.payments.confirmCompletion(order.id, {
    conversationId: conversation.id,
    messageId: chargeMessage.id
  });
  const completed = completionResult.order;
  const persisted = { conversation: completionResult.conversation, charge: completionResult.charge };
  const available = completionResult.walletTransaction;
  assert(completed.status === 'completed', 'Confirmação do cliente deveria mover pedido para completed.');
  assert(completed.paymentStatus === 'released', 'Conclusão deveria liberar o pagamento em garantia.');
  assert(available && available.status === 'available', 'Conclusão deveria liberar o recebível na carteira.');

  const wallet = Doke.repositories.wallet.readWallet();
  assert(wallet.transactions.length === 1, 'Carteira deveria manter um recebível atualizado, sem duplicar held/available.');
  assert(wallet.transactions[0].status === 'available', 'Recebível único deveria estar available após conclusão.');

  const review = await createProfileReview(Doke, persisted.conversation, persisted.charge);
  assert(review && review.id, 'Avaliação de perfil não foi criada.');
  const profileReviews = Doke.repositories.reviews.listLocal({ professionalId: 'profile_renato_acabamentos' });
  assert(profileReviews.length === 1, 'Perfil profissional deveria localizar a avaliação pelo profileId.');
  assert(profileReviews[0].rating === 5, 'Avaliação do perfil deveria preservar nota 5.');
  assert(profileReviews[0].verified === true, 'Avaliação publicada no perfil deveria ser verificada.');

  const finalOrder = await Doke.repositories.orders.getById(order.id);
  assert(finalOrder.status === 'completed', 'Pedido final deveria permanecer completed.');
  assert(finalOrder.nextAction === 'Avaliação enviada', 'Pedido avaliado deveria trocar nextAction para Avaliação enviada.');
  assert(finalOrder.reviewRating === 5, 'Pedido avaliado deveria registrar reviewRating.');

  const finalConversation = await Doke.repositories.messages.getById(conversation.id);
  const finalCharge = getCharge(finalConversation, chargeMessage.id);
  assert(finalConversation.status === 'completed', 'Conversa final deveria permanecer completed.');
  assert(finalCharge.paid === true && finalCharge.completed === true && finalCharge.reviewed === true, 'Cobrança final deveria ficar paid/completed/reviewed.');
  assert(finalCharge.walletTransactionId, 'Cobrança final deveria guardar walletTransactionId.');

  const notifications = Doke.repositories.notifications.readLocal();
  assert(notifications.some((item) => item.title === 'Proposta aprovada' && item.userId === 'user_profissional_demo'), 'Aprovação da proposta deveria notificar o profissional.');
  assert(notifications.some((item) => item.type === 'payment_held' && item.userId === 'user_profissional_demo'), 'Pagamento deveria notificar o profissional com semântica de garantia.');
  assert(!notifications.some((item) => item.title === 'Pagamento confirmado' && item.orderId === order.id), 'Aprovação não deveria gerar notificação falsa de pagamento.');
  assert(notifications.some((item) => /Pedido concluído/.test(item.title || '') && item.userId === 'user_profissional_demo'), 'Conclusão deveria notificar o profissional.');
  assert(notifications.some((item) => item.title === 'Saldo disponível' && item.userId === 'user_profissional_demo'), 'Liberação financeira deveria notificar o profissional.');
  assert(notifications.some((item) => item.type === 'order_reviewed' && item.userId === 'user_profissional_demo'), 'Avaliação deveria notificar o profissional.');

  setUser({ id: 'user_cliente_demo', name: 'Cliente Doke', role: 'client', initials: 'CD', avatarInitials: 'CD' });
  const raceOrder = await Doke.services.orders.create({
    serviceId: 'svc-race-proposal',
    professionalId: 'user_profissional_demo',
    providerId: 'user_profissional_demo',
    providerName: 'Profissional Doke',
    serviceTitle: 'Teste de concorrência da proposta',
    title: 'Teste de concorrência da proposta',
    location: 'Salvador - BA'
  });
  setUser({ id: 'user_profissional_demo', name: 'Profissional Doke', role: 'professional', initials: 'PD', avatarInitials: 'PD' });
  await Doke.services.orders.accept(raceOrder.id);
  const raceConversation = getConversationByOrder(Doke, raceOrder.id);
  const notificationsBeforeRace = Doke.repositories.notifications.readLocal().length;
  let raceMessageSentEvents = 0;
  context.document.addEventListener('doke:message-sent', (event) => {
    if (String(event.detail && event.detail.message && event.detail.message.orderId || '') === String(raceOrder.id)) raceMessageSentEvents += 1;
  });

  const originalSetItem = context.localStorage.setItem;
  let injectConcurrentCancellation = true;
  context.localStorage.setItem = (key, value) => {
    originalSetItem(key, value);
    if (!injectConcurrentCancellation || key !== 'doke.conversations.local.v1') return;
    const persistedConversations = JSON.parse(String(value || '[]'));
    const hasRaceProposal = persistedConversations.some((item) => String(item.orderId || '') === String(raceOrder.id)
      && (item.messages || []).some((message) => isProposalMessage(message)));
    if (!hasRaceProposal) return;
    injectConcurrentCancellation = false;
    const persistedOrders = JSON.parse(storage['doke.orders.local.v1'] || '[]');
    const target = persistedOrders.find((item) => String(item.id || '') === String(raceOrder.id));
    if (target) {
      target.status = 'cancelled';
      target.statusLabel = 'Pedido cancelado em outra sessão';
      target.updatedAt = new Date().toISOString();
      Doke.repositories.orders.writeLocal(persistedOrders);
    }
  };

  await assertRejects(
    Doke.services.orders.submitProposal(raceOrder.id, { amount: 'R$ 190,00', installments: 'À vista' }),
    'Mudança concorrente de estado deveria impedir a conclusão da proposta.'
  );
  context.localStorage.setItem = originalSetItem;
  const raceConversationAfterRollback = getConversationByOrder(Doke, raceOrder.id);
  assert(!getProposal(raceConversationAfterRollback), 'Falha concorrente deveria remover a mensagem provisória da proposta.');
  assert(!getCharge(raceConversationAfterRollback), 'Rollback da proposta não deveria criar cobrança.');
  assert(raceMessageSentEvents === 0, 'Proposta revertida não deveria publicar evento de mensagem enviada.');
  assert(Doke.repositories.notifications.readLocal().length === notificationsBeforeRace, 'Proposta revertida não deveria gerar notificação fantasma.');
  assert(raceConversation && raceConversation.id === raceConversationAfterRollback.id, 'Rollback deveria preservar a conversa original.');

  setUser({ id: 'user_cliente_demo', name: 'Cliente Doke', role: 'client', initials: 'CD', avatarInitials: 'CD' });
  const declinedOrderSource = await Doke.services.orders.create({
    serviceId: 'svc-decline-contract',
    professionalId: 'user_profissional_demo',
    providerId: 'user_profissional_demo',
    providerName: 'Profissional Doke',
    serviceTitle: 'Pedido para recusa',
    title: 'Pedido para recusa',
    location: 'Salvador - BA'
  });
  setUser({ id: 'user_profissional_demo', name: 'Profissional Doke', role: 'professional', initials: 'PD', avatarInitials: 'PD' });
  const declinedOrder = await Doke.services.orders.decline(declinedOrderSource.id, 'Agenda indisponível para o período solicitado.');
  assert(declinedOrder.status === 'cancelled', 'Recusa deveria mover o pedido para cancelled.');
  assert(declinedOrder.refusalReason === 'Agenda indisponível para o período solicitado.', 'Recusa deveria persistir a justificativa.');
  const declinedConversation = getConversationByOrder(Doke, declinedOrder.id);
  assert(declinedConversation && declinedConversation.status === 'cancelled', 'Conversa deveria refletir a recusa do pedido.');
  assert(declinedConversation.locked === true, 'Conversa recusada deveria permanecer bloqueada.');
  assert(declinedConversation.order.refusalReason === declinedOrder.refusalReason, 'Conversa deveria persistir a justificativa da recusa.');
  await assertRejects(Doke.services.orders.accept(declinedOrder.id), 'Pedido recusado não deveria voltar para accepted.');
  await assertRejects(
    Doke.services.orders.submitProposal(declinedOrder.id, { amount: 'R$ 150,00', installments: 'À vista' }),
    'Pedido recusado não deveria aceitar proposta.'
  );

  setUser({ id: 'user_cliente_demo', name: 'Cliente Doke', role: 'client', initials: 'CD', avatarInitials: 'CD' });
  const declinedReload = createReloadedDoke(currentUser);
  const declinedReloadOrder = declinedReload.repositories.orders.listLocal({ currentUser: true }).find((item) => item.id === declinedOrder.id);
  const declinedReloadConversation = declinedReload.repositories.messages.listLocal({ currentUser: true, orderId: declinedOrder.id })[0];
  assert(declinedReloadOrder && declinedReloadOrder.status === 'cancelled', 'Reload do cliente deveria preservar o pedido recusado.');
  assert(declinedReloadOrder.refusalReason === declinedOrder.refusalReason, 'Reload deveria preservar a justificativa da recusa.');
  assert(declinedReloadConversation && declinedReloadConversation.locked === true, 'Reload deveria manter a conversa recusada bloqueada.');
  await assertRejects(
    Doke.services.messages.sendMessage(declinedConversation.id, { text: 'Tentativa após recusa', type: 'text' }),
    'Cliente não deveria enviar mensagem em pedido recusado.'
  );

  console.log('Main marketplace cycle contract: OK');
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
