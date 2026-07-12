#!/usr/bin/env node
/* Focused pre-payment order flow contract.
   Covers role separation and persistence across independent runtime reloads. */
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
    location: { search: '', href: 'http://localhost:4173/pedidos.html' },
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

  return sandbox.Doke;
}

function findConversationByOrder(Doke, orderId) {
  return Doke.repositories.messages.readLocal().find((item) => (
    String(item.orderId || item.order && item.order.id || '') === String(orderId)
  ));
}

function countProposalMessages(conversation) {
  return (conversation && Array.isArray(conversation.messages) ? conversation.messages : [])
    .filter((message) => message && (message.type === 'proposal' || message.financialKind === 'proposal')).length;
}

function countChargeMessages(conversation) {
  return (conversation && Array.isArray(conversation.messages) ? conversation.messages : [])
    .filter((message) => message && message.type === 'charge' && message.financialKind === 'charge').length;
}

async function main() {
  const client = { id: 'client_reload_1', name: 'Cliente Reload', role: 'client', initials: 'CR' };
  const otherClient = { id: 'client_reload_2', name: 'Outro Cliente', role: 'client', initials: 'OC' };
  const professional = { id: 'user_profissional_demo', name: 'Profissional Reload', role: 'professional', initials: 'PR' };
  const otherProfessional = { id: 'professional_reload_2', name: 'Outro Profissional', role: 'professional', initials: 'OP' };

  const clientRuntime = createRuntime(client);
  const created = await clientRuntime.services.orders.create({
    serviceId: 'service_reload_1',
    professionalId: professional.id,
    providerId: professional.id,
    providerName: professional.name,
    serviceTitle: 'Instalação elétrica',
    title: 'Instalação elétrica',
    description: 'Contrato focado de reload e separação de papéis.'
  });

  assert(created.status === 'pending', 'Pedido deve nascer pending.');
  assert(clientRuntime.services.orders.stateMachine.canTransition(created, 'accepted', client) === false, 'Cliente não pode aceitar o próprio pedido inicial.');
  await assertRejects(clientRuntime.services.orders.accept(created.id), 'Service deve bloquear aceite pelo cliente.');
  await assertRejects(clientRuntime.services.orders.decline(created.id, 'Não desejo continuar.'), 'Cliente não pode recusar como profissional no estado pending.');

  const otherClientRuntime = createRuntime(otherClient);
  await assertRejects(otherClientRuntime.services.orders.getById(created.id), 'Outro cliente não pode ler pedido por ID.');
  assert((await otherClientRuntime.services.orders.listForCurrentUser()).length === 0, 'Outro cliente não pode listar o pedido.');

  const otherProfessionalRuntime = createRuntime(otherProfessional);
  await assertRejects(otherProfessionalRuntime.services.orders.getById(created.id), 'Profissional não vinculado não pode ler pedido por ID.');
  await assertRejects(otherProfessionalRuntime.services.orders.accept(created.id), 'Profissional não vinculado não pode aceitar pedido.');

  const professionalRuntime = createRuntime(professional);
  const visiblePending = await professionalRuntime.services.orders.getById(created.id);
  assert(visiblePending && visiblePending.status === 'pending', 'Profissional vinculado deve recuperar pedido pending após reload.');
  const accepted = await professionalRuntime.services.orders.accept(created.id);
  assert(accepted.status === 'accepted', 'Aceite deve persistir estado accepted.');

  const clientAfterAccept = createRuntime(client);
  const acceptedReloaded = await clientAfterAccept.services.orders.getById(created.id);
  assert(acceptedReloaded && acceptedReloaded.status === 'accepted', 'Cliente deve recuperar accepted após reload independente.');
  let conversation = findConversationByOrder(clientAfterAccept, created.id);
  assert(conversation && conversation.locked === false, 'Conversa deve estar liberada após aceite persistido.');

  await assertRejects(
    clientAfterAccept.services.orders.submitProposal(created.id, { amount: 'R$ 350,00' }),
    'Cliente não pode enviar proposta.'
  );

  const professionalAfterAccept = createRuntime(professional);
  const proposal = await professionalAfterAccept.services.orders.submitProposal(created.id, {
    amount: 'R$ 350,00',
    installments: '2x sem juros',
    messageText: 'Proposta de instalação elétrica.'
  });
  assert(proposal.order.status === 'quoted', 'Proposta deve mover pedido para quoted.');

  const clientAfterProposal = createRuntime(client);
  const quotedReloaded = await clientAfterProposal.services.orders.getById(created.id);
  assert(quotedReloaded && quotedReloaded.status === 'quoted', 'Cliente deve recuperar quoted após reload.');
  conversation = findConversationByOrder(clientAfterProposal, created.id);
  assert(conversation && conversation.locked === false, 'Chat deve permanecer liberado no estado quoted.');
  assert(countProposalMessages(conversation) === 1, 'Proposta deve produzir exatamente uma mensagem de proposta.');
  assert(countChargeMessages(conversation) === 0, 'Proposta ainda não aprovada não pode produzir cobrança.');
  assert(clientAfterProposal.services.orders.stateMachine.canTransition(quotedReloaded, 'in_progress', client) === true, 'Cliente vinculado deve poder aprovar proposta.');
  assert(clientAfterProposal.services.orders.stateMachine.canTransition(quotedReloaded, 'in_progress', professional) === false, 'Profissional não pode aprovar a própria proposta.');

  const duplicateProposalRuntime = createRuntime(professional);
  await assertRejects(
    duplicateProposalRuntime.services.orders.submitProposal(created.id, { amount: 'R$ 360,00' }),
    'Proposta duplicada deve ser bloqueada.'
  );
  const afterDuplicateAttempt = findConversationByOrder(duplicateProposalRuntime, created.id);
  assert(countProposalMessages(afterDuplicateAttempt) === 1, 'Tentativa duplicada não pode criar proposta adicional.');
  assert(countChargeMessages(afterDuplicateAttempt) === 0, 'Tentativa duplicada de proposta não pode criar cobrança.');

  const declineClientRuntime = createRuntime(client);
  const declinedOrder = await declineClientRuntime.services.orders.create({
    serviceId: 'service_reload_2',
    professionalId: professional.id,
    providerId: professional.id,
    providerName: professional.name,
    serviceTitle: 'Reparo hidráulico',
    title: 'Reparo hidráulico'
  });

  const declineProfessionalRuntime = createRuntime(professional);
  const declined = await declineProfessionalRuntime.services.orders.decline(declinedOrder.id, 'Agenda indisponível para o prazo solicitado.');
  assert(declined.status === 'cancelled', 'Recusa profissional deve persistir cancelled.');
  assert(declined.refusalReason === 'Agenda indisponível para o prazo solicitado.', 'Justificativa de recusa deve persistir.');

  const declineClientReload = createRuntime(client);
  const declinedReloaded = await declineClientReload.services.orders.getById(declinedOrder.id);
  assert(declinedReloaded && declinedReloaded.status === 'cancelled', 'Cliente deve recuperar recusa após reload.');
  assert(declinedReloaded.refusalReason === 'Agenda indisponível para o prazo solicitado.', 'Reload deve preservar justificativa.');
  const declinedConversation = findConversationByOrder(declineClientReload, declinedOrder.id);
  assert(declinedConversation && declinedConversation.locked === true, 'Conversa recusada deve permanecer bloqueada.');

  console.log('Orders role/reload contract: PASS');
  console.log(JSON.stringify({
    creation: 'pending',
    professionalAcceptance: 'accepted',
    proposal: 'quoted',
    reloadPersistence: true,
    roleIsolation: true,
    duplicateProposalBlocked: true,
    declinePersistence: true
  }, null, 2));
}

main().catch((error) => {
  console.error('Orders role/reload contract: FAIL');
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
