#!/usr/bin/env node
/* Doke operational flow contract test.
   Validates the local data chain without a browser: auth user -> order -> conversation -> notification -> role-aware reads. */
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

function readJson(key, fallback) {
  try {
    return storage[key] ? JSON.parse(storage[key]) : fallback;
  } catch (error) {
    return fallback;
  }
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
  Doke: {
    mockData: { load: () => Promise.resolve([]) }
  }
};

context.window = context;
context.Doke.session = {
  getCurrentUser: () => currentUser
};

function runAsset(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename: relativePath });
}

const sandbox = vm.createContext(context);

[
  'assets/js/repositories/orders-repository.js',
  'assets/js/repositories/messages-repository.js',
  'assets/js/repositories/notifications-repository.js',
  'assets/js/services/notification-service.js',
  'assets/js/services/message-service.js',
  'assets/js/services/orders-service.js'
].forEach(runAsset);

async function main() {
  const Doke = sandbox.Doke;
  const order = await Doke.services.orders.create({
    serviceId: 'svc-pintura-carlos',
    professionalId: 'user_profissional_demo',
    providerId: 'user_profissional_demo',
    providerName: 'Profissional Doke',
    providerInitials: 'PD',
    serviceTitle: 'Pintura residencial de contrato',
    title: 'Pintura residencial de contrato',
    location: 'Salvador - BA',
    description: 'Smoke test do fluxo operacional.'
  });

  assert(order.id, 'Pedido não recebeu id.');
  assert(order.clientId === 'user_cliente_demo', 'Pedido não recebeu clientId da sessão.');
  assert(order.professionalId === 'user_profissional_demo', 'Pedido não recebeu professionalId.');

  const orders = Doke.repositories.orders.readLocal();
  const conversations = Doke.repositories.messages.readLocal();
  const notifications = Doke.repositories.notifications.readLocal();

  assert(orders.length === 1, `Esperado 1 pedido local; recebido ${orders.length}.`);
  assert(conversations.length === 1, `Esperada 1 conversa local; recebido ${conversations.length}.`);
  assert(conversations[0].orderId === order.id, 'Conversa não está vinculada ao pedido.');
  assert(notifications.length === 1, `Esperada 1 notificação local; recebido ${notifications.length}.`);
  assert(notifications[0].type === 'order_created', 'Primeira notificação deveria ser order_created.');
  assert(notifications[0].userId === 'user_profissional_demo', 'Notificação de pedido deveria ir para o profissional.');

  await Doke.services.notifications.createOrderCreated(order, {
    actor: currentUser,
    conversationId: conversations[0].id
  });
  assert(Doke.repositories.notifications.readLocal().length === 1, 'Notificação order_created duplicou com mesmo eventKey.');

  currentUser = {
    id: 'user_profissional_demo',
    name: 'Profissional Doke',
    role: 'professional',
    initials: 'PD',
    avatarInitials: 'PD'
  };

  const proOrders = Doke.services.orders.listLocal({ currentUser: true });
  assert(proOrders.length === 1, 'Profissional não enxerga o pedido recebido.');

  const proConversation = Doke.repositories.messages.listLocal({ currentUser: true })[0];
  assert(proConversation.peerRole === 'client', 'Profissional deveria ver cliente como contato.');
  assert(proConversation.peerName === 'Cliente Doke', 'Nome do cliente não foi resolvido para o profissional.');

  let lockedError = null;
  try {
    await Doke.services.messages.sendMessage(proConversation.id, {
      body: 'Mensagem antes do aceite não deve ser enviada.'
    });
  } catch (error) {
    lockedError = error;
  }
  assert(lockedError && /profissional aceitar o pedido/i.test(lockedError.message), 'Conversa pendente deveria bloquear mensagem antes do aceite.');

  const acceptedOrder = await Doke.services.orders.accept(order.id);
  assert(acceptedOrder.status === 'accepted', 'Aceite do profissional não atualizou o pedido para accepted.');
  assert(acceptedOrder.statusLabel === 'Pedido aceito', 'Aceite do profissional não normalizou statusLabel.');

  const acceptedConversation = Doke.repositories.messages.listLocal({ currentUser: true })[0];
  assert(acceptedConversation.order.status === 'accepted', 'Conversa não herdou status accepted do pedido.');
  assert(acceptedConversation.locked === false, 'Conversa aceita deveria estar desbloqueada.');
  assert(acceptedConversation.lastSeen === 'Conversa liberada', 'Conversa aceita deveria exibir lastSeen de conversa liberada.');

  const afterAcceptNotifications = Doke.repositories.notifications.readLocal();
  assert(afterAcceptNotifications.length === 2, `Esperadas 2 notificações após aceite; recebido ${afterAcceptNotifications.length}.`);
  assert(afterAcceptNotifications.some((item) => item.type === 'order_status_changed' && item.userId === 'user_cliente_demo'), 'Notificação de aceite deveria ir para o cliente.');

  const sent = await Doke.services.messages.sendMessage(acceptedConversation.id, {
    body: 'Posso te enviar uma proposta ainda hoje.'
  });
  assert(sent && sent.id, 'Mensagem enviada não recebeu id.');

  const afterMessageNotifications = Doke.repositories.notifications.readLocal();
  assert(afterMessageNotifications.length === 3, `Esperadas 3 notificações após mensagem; recebido ${afterMessageNotifications.length}.`);
  assert(afterMessageNotifications.some((item) => item.type === 'message_received' && item.userId === 'user_cliente_demo'), 'Notificação de mensagem não foi para o cliente.');

  currentUser = {
    id: 'user_cliente_demo',
    name: 'Cliente Doke',
    role: 'client',
    initials: 'CD',
    avatarInitials: 'CD'
  };

  const clientNotifications = Doke.repositories.notifications.listLocal({ dismissed: false });
  assert(clientNotifications.length === 2, `Cliente deveria ver 2 notificações próprias; recebeu ${clientNotifications.length}.`);
  assert(clientNotifications.some((item) => item.type === 'order_status_changed'), 'Cliente deveria ver notificação de aceite do pedido.');
  assert(clientNotifications.some((item) => item.type === 'message_received'), 'Cliente deveria ver notificação de mensagem.');

  const clientConversation = Doke.repositories.messages.listLocal({ currentUser: true })[0];
  assert(clientConversation.peerRole === 'professional', 'Cliente deveria ver profissional como contato.');

  console.log('Operational flow contract: OK');
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
