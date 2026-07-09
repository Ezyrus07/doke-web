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

  setUser({ id: 'user_profissional_demo', name: 'Profissional Doke', role: 'professional', initials: 'PD', avatarInitials: 'PD' });
  const accepted = await Doke.services.orders.accept(order.id);
  assert(accepted.status === 'accepted', 'Pedido não foi aceito.');
  conversation = getConversationByOrder(Doke, order.id);
  assert(conversation.status === 'accepted' && conversation.locked === false, 'Conversa não destravou após aceite.');

  const chargeMessage = await Doke.services.messages.sendMessage(conversation.id, {
    type: 'charge',
    body: 'Proposta para aprovação',
    text: 'Proposta para aprovação',
    amount,
    installments: 'À vista',
    paid: false,
    orderId: order.id
  });
  assert(chargeMessage && chargeMessage.id, 'Cobrança não gerou mensagem no chat.');

  const quoted = await Doke.services.orders.quote(order.id, { amount, installments: 'À vista' });
  assert(quoted.status === 'quoted', 'Pedido deveria ficar quoted após envio da proposta.');
  conversation = getConversationByOrder(Doke, order.id);
  assert(conversation.status === 'quoted' && conversation.locked === false, 'Conversa deveria ficar quoted e desbloqueada.');
  assert(getCharge(conversation, chargeMessage.id), 'Conversa quoted deveria manter mensagem type=charge.');
  assert(Doke.repositories.notifications.readLocal().some((item) => item.title === 'Proposta enviada' && item.userId === 'user_cliente_demo'), 'Proposta deveria notificar o cliente.');

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

  console.log('Main marketplace cycle contract: OK');
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
