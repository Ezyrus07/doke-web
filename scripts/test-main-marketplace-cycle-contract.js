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
    'assets/js/services/orders-service.js'
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
  'assets/js/services/wallet-service.js'
].forEach(runAsset);

function setUser(user) {
  currentUser = user;
}

function getConversationByOrder(Doke, orderId) {
  return Doke.repositories.messages.readLocal().find((item) => String(item.orderId || item.order && item.order.id) === String(orderId));
}

function getCharge(conversation, messageId) {
  const messages = Array.isArray(conversation && conversation.messages) ? conversation.messages : [];
  return messageId
    ? messages.find((message) => String(message.id || '') === String(messageId))
    : messages.slice().reverse().find((message) => message && message.type === 'charge');
}

async function persistChargeState(Doke, conversationId, messageId, flags) {
  const conversation = await Doke.repositories.messages.getById(conversationId);
  assert(conversation, 'Conversa da cobrança não foi encontrada.');
  const charge = getCharge(conversation, messageId);
  assert(charge, 'Mensagem de cobrança não foi encontrada.');
  Object.assign(charge, flags || {});
  if (flags && flags.paid) charge.text = charge.text || 'Pagamento confirmado. Atendimento liberado.';
  const savedConversation = await Doke.repositories.messages.save(conversation);
  return { conversation: savedConversation, charge };
}

async function registerPaymentHold(Doke, order, conversation, charge, amount) {
  const result = await Doke.services.wallet.registerHeldReceivableFromPayment({
    order,
    conversation,
    charge,
    amount,
    orderId: order.id,
    conversationId: conversation.id,
    messageId: charge.id
  });
  assert(result && result.transaction, 'Pagamento não criou recebível em garantia na carteira.');
  assert(result.transaction.status === 'held', 'Recebível pós-pagamento deveria ficar held.');
  assert(result.transaction.grossAmount === parseCurrency(amount), 'Recebível held não preservou valor bruto da cobrança.');
  return result.transaction;
}

async function releaseReceivable(Doke, order, conversation, charge, amount) {
  const result = await Doke.services.wallet.registerReceivableFromOrder({
    order,
    conversation,
    charge,
    amount,
    orderId: order.id,
    conversationId: conversation.id,
    messageId: charge.id
  });
  assert(result && result.transaction, 'Conclusão não liberou/criou recebível na carteira.');
  assert(result.transaction.status === 'available', 'Recebível pós-conclusão deveria ficar available.');
  assert(result.transaction.netAmount === 266, 'Recebível available deveria descontar taxa mockada de 5% sobre R$ 280,00.');
  return result.transaction;
}

async function createProfileReview(Doke, conversation, charge) {
  const order = conversation.order || {};
  const reviewedAt = new Date().toISOString();
  const review = await Doke.repositories.reviews.create({
    eventKey: ['profile_review', order.id, charge.id, 'profile_renato_acabamentos'].filter(Boolean).join(':'),
    orderId: order.id || conversation.orderId,
    conversationId: conversation.id,
    messageId: charge.id,
    serviceId: order.serviceId || conversation.serviceId || '',
    serviceTitle: order.serviceTitle || order.title || 'Renovação residencial',
    professionalId: order.professionalId || order.providerId || conversation.professionalId || 'user_profissional_demo',
    providerId: order.professionalId || order.providerId || conversation.professionalId || 'user_profissional_demo',
    displayProfessionalId: 'profile_renato_acabamentos',
    sourceProfessionalId: 'profile_renato_acabamentos',
    profileIds: [
      order.professionalId || order.providerId || conversation.professionalId || 'user_profissional_demo',
      'profile_renato_acabamentos'
    ],
    professionalName: order.providerName || order.professionalName || 'Renato Acabamentos',
    providerName: order.providerName || order.professionalName || 'Renato Acabamentos',
    clientId: currentUser.id,
    clientName: currentUser.name,
    avatarText: currentUser.initials,
    rating: 5,
    tags: ['Pontualidade', 'Qualidade'],
    criteria: [{ key: 'quality', rating: 5 }],
    comment: 'Atendimento concluído com qualidade e dentro do prazo.',
    text: 'Atendimento concluído com qualidade e dentro do prazo.',
    verified: true,
    source: 'completed-order',
    reviewedAt
  });

  await Doke.services.notifications.create({
    type: 'order_reviewed',
    category: 'orders',
    userId: order.professionalId || order.providerId || conversation.professionalId || 'user_profissional_demo',
    actorId: currentUser.id,
    actorName: currentUser.name,
    orderId: order.id || conversation.orderId,
    conversationId: conversation.id,
    messageId: charge.id,
    serviceId: order.serviceId || conversation.serviceId || '',
    eventKey: ['order_reviewed', order.id || conversation.orderId, charge.id, order.professionalId || order.providerId || 'user_profissional_demo'].filter(Boolean).join(':'),
    title: 'Avaliação recebida',
    body: currentUser.name + ' avaliou o atendimento com nota 5,0.',
    targetUrl: 'mensagens.html?order=' + encodeURIComponent(order.id || conversation.orderId || '') + '&conversation=' + encodeURIComponent(conversation.id || ''),
    actionLabel: 'Abrir conversa',
    read: false
  });

  const storedOrder = await Doke.repositories.orders.getById(order.id || conversation.orderId);
  await Doke.repositories.orders.save(Object.assign({}, storedOrder, {
    reviewedAt,
    reviewRating: 5,
    reviewTags: ['Pontualidade', 'Qualidade'],
    nextAction: 'Avaliação enviada',
    updatedAt: reviewedAt
  }));

  const currentConversation = await Doke.repositories.messages.getById(conversation.id);
  const currentCharge = getCharge(currentConversation, charge.id);
  currentCharge.reviewed = true;
  currentCharge.review = {
    rating: 5,
    tags: ['Pontualidade', 'Qualidade'],
    comment: 'Atendimento concluído com qualidade e dentro do prazo.',
    reviewedAt
  };
  currentConversation.lastSeen = 'Atendimento avaliado';
  currentConversation.lastMessage = 'Atendimento avaliado pelo cliente.';
  currentConversation.order = Object.assign({}, currentConversation.order || {}, {
    reviewedAt,
    reviewRating: 5,
    reviewTags: ['Pontualidade', 'Qualidade']
  });
  await Doke.repositories.messages.save(currentConversation);

  return review;
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
  assert(!getCharge(conversation), 'Tentativa inválida de proposta não deveria persistir cobrança.');

  const accepted = await Doke.services.orders.accept(order.id);
  assert(accepted.status === 'accepted', 'Pedido não foi aceito.');
  conversation = getConversationByOrder(Doke, order.id);
  assert(conversation.status === 'accepted' && conversation.locked === false, 'Conversa não destravou após aceite.');
  await assertRejects(
    Doke.services.orders.submitProposal(order.id, { amount: 'valor inválido', installments: 'À vista' }),
    'Proposta com valor inválido deveria ser rejeitada pelo domínio.'
  );
  conversation = getConversationByOrder(Doke, order.id);
  assert(!getCharge(conversation), 'Valor inválido não deveria persistir mensagem de proposta.');

  const proposal = await Doke.services.orders.submitProposal(order.id, {
    amount,
    installments: 'À vista',
    messageText: 'Proposta para aprovação'
  });
  const chargeMessage = proposal.message;
  const quoted = proposal.order;
  assert(chargeMessage && chargeMessage.id, 'Comando de proposta não gerou mensagem no chat.');
  assert(quoted.status === 'quoted', 'Pedido deveria ficar quoted após envio da proposta.');
  conversation = getConversationByOrder(Doke, order.id);
  assert(conversation.status === 'quoted' && conversation.locked === false, 'Conversa deveria ficar quoted e desbloqueada.');
  assert(getCharge(conversation, chargeMessage.id), 'Conversa quoted deveria manter mensagem type=charge.');
  assert(Doke.repositories.notifications.readLocal().some((item) => item.title === 'Proposta enviada' && item.userId === 'user_cliente_demo'), 'Proposta deveria notificar o cliente.');

  const chargeCountAfterProposal = conversation.messages.filter((message) => message && message.type === 'charge').length;
  await assertRejects(
    Doke.services.orders.submitProposal(order.id, { amount: 'R$ 300,00', installments: 'À vista' }),
    'Pedido quoted não deveria aceitar uma segunda proposta pelo mesmo comando.'
  );
  conversation = getConversationByOrder(Doke, order.id);
  assert(conversation.messages.filter((message) => message && message.type === 'charge').length === chargeCountAfterProposal, 'Proposta repetida não deveria criar cobrança duplicada.');

  const reloadedDoke = createReloadedDoke(currentUser);
  const reloadedOrder = reloadedDoke.repositories.orders.listLocal({ currentUser: true }).find((item) => item.id === order.id);
  const reloadedConversation = reloadedDoke.repositories.messages.listLocal({ currentUser: true, orderId: order.id })[0];
  assert(reloadedOrder && reloadedOrder.status === 'quoted', 'Reload deveria preservar o estado quoted do pedido.');
  assert(reloadedConversation && reloadedConversation.status === 'quoted', 'Reload deveria preservar o estado quoted da conversa.');
  assert(getCharge(reloadedConversation, chargeMessage.id), 'Reload deveria preservar a mensagem da proposta.');

  setUser({ id: 'user_cliente_demo', name: 'Cliente Doke', role: 'client', initials: 'CD', avatarInitials: 'CD' });
  const clientConversation = Doke.repositories.messages.listLocal({ currentUser: true, orderId: order.id })[0];
  assert(clientConversation && getCharge(clientConversation, chargeMessage.id), 'Cliente deveria ver cobrança na conversa.');

  const inProgress = await Doke.services.orders.start(order.id, {
    conversationId: conversation.id,
    paymentMessageId: chargeMessage.id
  });
  assert(inProgress.status === 'in_progress', 'Pagamento deveria mover pedido para in_progress.');
  let persisted = await persistChargeState(Doke, conversation.id, chargeMessage.id, {
    paid: true,
    paymentMethod: 'Pix',
    paidAmount: amount
  });
  assert(persisted.charge.paid === true, 'Cobrança deveria ficar paid=true após pagamento.');
  const held = await registerPaymentHold(Doke, inProgress, persisted.conversation, persisted.charge, amount);
  assert(held.status === 'held', 'Carteira deveria registrar held após pagamento.');

  const completed = await Doke.services.orders.complete(order.id);
  assert(completed.status === 'completed', 'Conclusão deveria mover pedido para completed.');
  persisted = await persistChargeState(Doke, conversation.id, chargeMessage.id, {
    paid: true,
    completed: true,
    paymentMethod: 'Pix',
    paidAmount: amount
  });
  const available = await releaseReceivable(Doke, completed, persisted.conversation, persisted.charge, amount);
  const completedCharge = getCharge(persisted.conversation, chargeMessage.id);
  completedCharge.walletTransactionId = available.id;
  completedCharge.walletReleased = true;
  persisted = {
    conversation: await Doke.repositories.messages.save(persisted.conversation),
    charge: completedCharge
  };

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
  assert(notifications.some((item) => item.title === 'Pagamento confirmado' && item.userId === 'user_profissional_demo'), 'Pagamento confirmado deveria notificar o profissional.');
  assert(notifications.some((item) => item.title === 'Pedido concluído' && item.userId === 'user_profissional_demo'), 'Conclusão deveria notificar o profissional.');
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
      && (item.messages || []).some((message) => message && message.type === 'charge'));
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
  assert(!getCharge(raceConversationAfterRollback), 'Falha concorrente deveria remover a mensagem provisória da proposta.');
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
