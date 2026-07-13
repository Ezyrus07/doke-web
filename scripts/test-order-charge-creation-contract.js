#!/usr/bin/env node
/* Charge creation contract.
   Covers proposal/charge separation, role and state guards, idempotency,
   reload persistence, concurrent callers, rollback, and payment neutrality. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const storage = Object.create(null);
let storageWriteHook = null;

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
      setItem: (key, value) => {
        storage[key] = String(value);
        if (typeof storageWriteHook === 'function') storageWriteHook(key, String(value));
      },
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
    'assets/js/services/notification-service.js',
    'assets/js/services/message-service.js',
    'assets/js/services/orders-service.js'
  ].forEach((relativePath) => {
    const filename = path.join(projectRoot, relativePath);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename: relativePath });
  });

  return { Doke: sandbox.Doke, context };
}

function isProposal(message) {
  return Boolean(message) && (message.type === 'proposal' || message.financialKind === 'proposal');
}

function isCharge(message) {
  return Boolean(message) && message.type === 'charge' && message.financialKind === 'charge';
}

function findConversation(Doke, orderId) {
  return Doke.repositories.messages.readLocal().find((item) => (
    String(item.orderId || item.order && item.order.id || '') === String(orderId)
  ));
}

function financialMessages(conversation, predicate) {
  return (conversation && Array.isArray(conversation.messages) ? conversation.messages : []).filter(predicate);
}

async function createQuotedOrder(client, professional, suffix, amount = 'R$ 520,00') {
  const clientRuntime = createRuntime(client).Doke;
  const order = await clientRuntime.services.orders.create({
    serviceId: `service_charge_${suffix}`,
    professionalId: professional.id,
    providerId: professional.id,
    providerName: professional.name,
    serviceTitle: `Serviço cobrança ${suffix}`,
    title: `Serviço cobrança ${suffix}`
  });
  const professionalRuntime = createRuntime(professional).Doke;
  await professionalRuntime.services.orders.accept(order.id);
  const proposal = await professionalRuntime.services.orders.submitProposal(order.id, {
    amount,
    installments: '2x sem juros',
    messageText: `Proposta ${suffix}`
  });
  return { orderId: order.id, proposal, amount };
}

async function createApprovedOrder(client, professional, suffix, amount) {
  const quoted = await createQuotedOrder(client, professional, suffix, amount);
  const clientRuntime = createRuntime(client).Doke;
  const approved = await clientRuntime.services.orders.approveProposal(quoted.orderId, {
    approvalSource: 'charge-contract'
  });
  return Object.assign({}, quoted, { approved });
}

function assertSourceContracts() {
  const serviceSource = fs.readFileSync(path.join(projectRoot, 'assets/js/services/orders-service.js'), 'utf8');
  const messagesSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/mensagens.js'), 'utf8');
  const paymentSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/pagamento-profissional.js'), 'utf8');
  const reviewServiceSource = fs.readFileSync(path.join(projectRoot, 'assets/js/services/review-service.js'), 'utf8');

  assert(serviceSource.includes("type: 'proposal'"), 'Service deve persistir proposta com tipo próprio.');
  assert(serviceSource.includes("financialKind: 'charge'"), 'Service deve identificar cobrança real explicitamente.');
  assert(serviceSource.includes('function createCharge(orderId, payload)'), 'Service deve expor comando canônico de cobrança.');
  assert(messagesSource.includes('data-messages-charge-action'), 'Chat deve expor ação contextual de cobrança.');
  assert(messagesSource.includes('ordersService?.createCharge'), 'Chat deve usar o comando canônico de cobrança.');
  assert(paymentSource.includes('isActualChargeMessage'), 'Pagamento deve rejeitar mensagens que sejam apenas propostas.');
  assert(reviewServiceSource.includes('function isActualCharge(conversation, message)'), 'Avaliação deve localizar somente cobrança real no serviço canônico.');
}

async function main() {
  const client = { id: 'client_charge_1', name: 'Cliente Cobrança', role: 'client', initials: 'CC' };
  const otherClient = { id: 'client_charge_2', name: 'Outro Cliente', role: 'client', initials: 'OC' };
  const professional = { id: 'user_profissional_demo', name: 'Profissional Cobrança', role: 'professional', initials: 'PC' };
  const otherProfessional = { id: 'professional_charge_2', name: 'Outro Profissional', role: 'professional', initials: 'OP' };

  assertSourceContracts();

  const quoted = await createQuotedOrder(client, professional, 'state-guard');
  const professionalBeforeApproval = createRuntime(professional).Doke;
  await assertRejects(
    professionalBeforeApproval.services.orders.createCharge(quoted.orderId, { amount: quoted.amount }),
    'Cobrança deve ser bloqueada enquanto a proposta ainda está quoted.'
  );
  let conversation = findConversation(professionalBeforeApproval, quoted.orderId);
  assert(financialMessages(conversation, isProposal).length === 1, 'Pedido quoted deve manter uma proposta.');
  assert(financialMessages(conversation, isCharge).length === 0, 'Pedido quoted não pode ter cobrança.');

  const approved = await createApprovedOrder(client, professional, 'canonical');
  const clientRuntime = createRuntime(client).Doke;
  await assertRejects(
    clientRuntime.services.orders.createCharge(approved.orderId, { amount: approved.amount }),
    'Cliente não pode criar cobrança.'
  );
  const otherClientRuntime = createRuntime(otherClient).Doke;
  await assertRejects(
    otherClientRuntime.services.orders.createCharge(approved.orderId, { amount: approved.amount }),
    'Cliente sem vínculo não pode criar cobrança.'
  );
  const otherProfessionalRuntime = createRuntime(otherProfessional).Doke;
  await assertRejects(
    otherProfessionalRuntime.services.orders.createCharge(approved.orderId, { amount: approved.amount }),
    'Profissional sem vínculo não pode criar cobrança.'
  );

  const professionalRuntime = createRuntime(professional).Doke;
  await assertRejects(
    professionalRuntime.services.orders.createCharge(approved.orderId, { amount: 'R$ 530,00' }),
    'Cobrança com valor diferente da proposta aprovada deve ser rejeitada.'
  );
  conversation = findConversation(professionalRuntime, approved.orderId);
  assert(financialMessages(conversation, isCharge).length === 0, 'Valor divergente não pode persistir cobrança.');

  const [firstCharge, repeatedCharge] = await Promise.all([
    professionalRuntime.services.orders.createCharge(approved.orderId, {
      amount: approved.amount,
      installments: '2x sem juros'
    }),
    professionalRuntime.services.orders.createCharge(approved.orderId, {
      amount: approved.amount,
      installments: '2x sem juros'
    })
  ]);

  assert(firstCharge.message.id === repeatedCharge.message.id, 'Chamadas concorrentes no mesmo runtime devem resolver a mesma cobrança.');
  assert(firstCharge.order.status === 'in_progress', 'Cobrança deve preservar o pedido em execução.');
  assert(firstCharge.order.paymentStatus === 'pending', 'Cobrança não pode confirmar pagamento.');
  assert(firstCharge.order.chargeMessageId === firstCharge.message.id, 'Pedido deve apontar para a cobrança canônica.');
  assert(firstCharge.order.chargeAmount === approved.amount, 'Pedido deve preservar o valor aprovado na cobrança.');
  assert(firstCharge.message.type === 'charge' && firstCharge.message.financialKind === 'charge', 'Mensagem deve ser uma cobrança real.');
  assert(firstCharge.message.paid === false, 'Cobrança deve nascer não paga.');

  conversation = findConversation(professionalRuntime, approved.orderId);
  assert(financialMessages(conversation, isProposal).length === 1, 'Cobrança não pode remover ou converter a proposta.');
  assert(financialMessages(conversation, isCharge).length === 1, 'Pedido deve manter exatamente uma cobrança real.');

  const clientNotifications = await createRuntime(client).Doke.services.notifications.list({ currentUser: true });
  const chargeNotification = clientNotifications.find((item) => item.messageId === firstCharge.message.id);
  assert(Boolean(chargeNotification), 'Cobrança deve notificar o cliente.');
  assert(/cobrança/i.test(chargeNotification.body || ''), 'Notificação deve identificar a cobrança.');
  assert(!/pagamento confirmado|pagou/i.test(chargeNotification.body || ''), 'Notificação da cobrança não pode declarar pagamento confirmado.');

  const reloadProfessional = createRuntime(professional).Doke;
  const persistedOrder = await reloadProfessional.services.orders.getById(approved.orderId);
  assert(persistedOrder.chargeMessageId === firstCharge.message.id, 'Reload deve preservar o identificador da cobrança.');
  assert(persistedOrder.paymentStatus === 'pending', 'Reload deve preservar pagamento pendente.');
  const idempotentAfterReload = await reloadProfessional.services.orders.createCharge(approved.orderId, { amount: approved.amount });
  assert(idempotentAfterReload.idempotent === true, 'Repetição após reload deve ser idempotente.');
  assert(idempotentAfterReload.message.id === firstCharge.message.id, 'Repetição após reload deve recuperar a cobrança existente.');
  conversation = findConversation(reloadProfessional, approved.orderId);
  assert(financialMessages(conversation, isCharge).length === 1, 'Reload idempotente não pode duplicar cobrança.');

  const concurrentOrder = await createApprovedOrder(client, professional, 'cross-runtime', 'R$ 610,00');
  const runtimeA = createRuntime(professional).Doke;
  const runtimeB = createRuntime(professional).Doke;
  const concurrentResults = await Promise.allSettled([
    runtimeA.services.orders.createCharge(concurrentOrder.orderId, { amount: concurrentOrder.amount }),
    runtimeB.services.orders.createCharge(concurrentOrder.orderId, { amount: concurrentOrder.amount })
  ]);
  assert(concurrentResults.some((result) => result.status === 'fulfilled'), 'Concorrência entre runtimes deve registrar uma cobrança vencedora.');
  const concurrentReload = createRuntime(professional).Doke;
  const concurrentPersistedOrder = await concurrentReload.services.orders.getById(concurrentOrder.orderId);
  const concurrentConversation = findConversation(concurrentReload, concurrentOrder.orderId);
  const concurrentCharges = financialMessages(concurrentConversation, isCharge);
  assert(concurrentCharges.length === 1, 'Concorrência entre runtimes deve persistir somente uma cobrança.');
  assert(concurrentPersistedOrder.chargeMessageId === concurrentCharges[0].id, 'Pedido concorrente deve apontar para a cobrança vencedora.');

  const raceOrder = await createApprovedOrder(client, professional, 'rollback', 'R$ 730,00');
  const raceRuntimeBundle = createRuntime(professional);
  const raceRuntime = raceRuntimeBundle.Doke;
  const notificationsBeforeRace = raceRuntime.repositories.notifications.readLocal().length;
  let chargeSentEvents = 0;
  raceRuntimeBundle.context.document.addEventListener('doke:message-sent', (event) => {
    if (String(event.detail && event.detail.message && event.detail.message.orderId || '') === String(raceOrder.orderId)) chargeSentEvents += 1;
  });

  let injectCancellation = true;
  storageWriteHook = (key, value) => {
    if (!injectCancellation || key !== 'doke.conversations.local.v1') return;
    const conversations = JSON.parse(value || '[]');
    const hasProvisionalCharge = conversations.some((item) => (
      String(item.orderId || '') === String(raceOrder.orderId)
      && financialMessages(item, isCharge).length > 0
    ));
    if (!hasProvisionalCharge) return;
    injectCancellation = false;
    const orders = JSON.parse(storage['doke.orders.local.v1'] || '[]');
    const target = orders.find((item) => String(item.id || '') === String(raceOrder.orderId));
    if (target) {
      target.status = 'cancelled';
      target.statusLabel = 'Pedido cancelado em outra sessão';
      target.updatedAt = new Date().toISOString();
      raceRuntime.repositories.orders.writeLocal(orders);
    }
  };

  await assertRejects(
    raceRuntime.services.orders.createCharge(raceOrder.orderId, { amount: raceOrder.amount }),
    'Mudança concorrente do pedido deve impedir o commit da cobrança.'
  );
  storageWriteHook = null;
  const raceReload = createRuntime(professional).Doke;
  const racePersistedOrder = await raceReload.services.orders.getById(raceOrder.orderId);
  const raceConversation = findConversation(raceReload, raceOrder.orderId);
  assert(racePersistedOrder.status === 'cancelled', 'Rollback não pode sobrescrever o cancelamento concorrente.');
  assert(financialMessages(raceConversation, isCharge).length === 0, 'Rollback deve remover a cobrança provisória.');
  assert(raceReload.repositories.notifications.readLocal().length === notificationsBeforeRace, 'Rollback não pode criar notificação fantasma.');
  assert(chargeSentEvents === 0, 'Rollback não pode publicar evento de mensagem enviada.');

  console.log('Order charge creation contract: PASS');
  console.log(JSON.stringify({
    proposalChargeSeparation: true,
    stateAndRoleGuards: true,
    approvedAmountEnforced: true,
    sameRuntimeIdempotency: true,
    reloadIdempotency: true,
    crossRuntimeSingleCharge: true,
    rollbackWithoutGhostEffects: true,
    paymentRemainsPending: true,
    downstreamChargeGuards: true
  }, null, 2));
}

main().catch((error) => {
  storageWriteHook = null;
  console.error('Order charge creation contract: FAIL');
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
