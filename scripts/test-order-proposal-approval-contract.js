#!/usr/bin/env node
/* Proposal decision contract.
   Covers approval/rejection, role isolation, idempotency, reload persistence,
   and separation between proposal approval and payment confirmation. */
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
    'assets/js/services/notification-service.js',
    'assets/js/services/message-service.js',
    'assets/js/services/orders-service.js'
  ].forEach((relativePath) => {
    const filename = path.join(projectRoot, relativePath);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename: relativePath });
  });
  return sandbox.Doke;
}

async function createQuotedOrder(client, professional, suffix) {
  const clientRuntime = createRuntime(client);
  const order = await clientRuntime.services.orders.create({
    serviceId: `service_proposal_${suffix}`,
    professionalId: professional.id,
    providerId: professional.id,
    providerName: professional.name,
    serviceTitle: `Serviço proposta ${suffix}`,
    title: `Serviço proposta ${suffix}`
  });
  const professionalRuntime = createRuntime(professional);
  await professionalRuntime.services.orders.accept(order.id);
  await professionalRuntime.services.orders.submitProposal(order.id, {
    amount: 'R$ 480,00',
    installments: '2x sem juros'
  });
  return order.id;
}

function assertPageContracts() {
  const messagesSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/mensagens.js'), 'utf8');
  const ordersSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/pedidos-local-orders.js'), 'utf8');

  assert(messagesSource.includes('data-message-approve-proposal'), 'Chat deve expor ação explícita de aprovação da proposta.');
  assert(messagesSource.includes('data-message-reject-proposal'), 'Chat deve expor ação explícita de recusa da proposta.');
  assert(messagesSource.includes("service.approveProposal(orderId, options)"), 'Chat deve chamar o comando canônico de aprovação.');
  assert(!messagesSource.includes("const paid = completed || message?.paid === true || orderStatus === 'in_progress';"), 'Chat não pode inferir pagamento confirmado a partir de in_progress.');
  assert(messagesSource.includes('A aprovação não confirma pagamento'), 'Chat deve comunicar separação entre aprovação e pagamento.');
  assert(ordersSource.includes('data-order-approve-proposal'), 'Pedidos deve expor ação explícita de aprovação.');
  assert(ordersSource.includes('data-order-reject-proposal'), 'Pedidos deve expor ação explícita de recusa.');
}

async function main() {
  const client = { id: 'client_approval_1', name: 'Cliente Aprovação', role: 'client' };
  const otherClient = { id: 'client_approval_2', name: 'Outro Cliente', role: 'client' };
  const professional = { id: 'user_profissional_demo', name: 'Profissional Aprovação', role: 'professional' };

  assertPageContracts();

  const approvalOrderId = await createQuotedOrder(client, professional, 'approval');
  const professionalRuntime = createRuntime(professional);
  await assertRejects(
    professionalRuntime.services.orders.approveProposal(approvalOrderId),
    'Profissional não pode aprovar a própria proposta.'
  );
  await assertRejects(
    professionalRuntime.services.orders.rejectProposal(approvalOrderId, 'Não quero esta proposta.'),
    'Profissional não pode recusar a proposta em nome do cliente.'
  );

  const otherClientRuntime = createRuntime(otherClient);
  await assertRejects(
    otherClientRuntime.services.orders.approveProposal(approvalOrderId),
    'Cliente não vinculado não pode aprovar a proposta.'
  );
  await assertRejects(
    otherClientRuntime.services.orders.rejectProposal(approvalOrderId, 'Valor alto.'),
    'Cliente não vinculado não pode recusar a proposta.'
  );

  const clientRuntime = createRuntime(client);
  const before = await clientRuntime.services.orders.getById(approvalOrderId);
  assert(before.status === 'quoted', 'Pedido deve estar quoted antes da aprovação.');

  const [firstApproval, concurrentApproval] = await Promise.all([
    clientRuntime.services.orders.approveProposal(approvalOrderId, { approvalSource: 'contract-test', paymentStatus: 'paid' }),
    clientRuntime.services.orders.approveProposal(approvalOrderId, { approvalSource: 'contract-test' })
  ]);

  assert(firstApproval.status === 'in_progress', 'Aprovação deve mover pedido para in_progress.');
  assert(concurrentApproval.id === firstApproval.id, 'Chamadas concorrentes devem resolver o mesmo pedido.');
  assert(firstApproval.proposalApprovedBy === client.id, 'Aprovação deve registrar o cliente responsável.');
  assert(Boolean(firstApproval.proposalApprovedAt), 'Aprovação deve registrar data e hora.');
  assert(firstApproval.approvalSource === 'contract-test', 'Aprovação deve registrar a origem do comando.');
  assert(firstApproval.paymentStatus === 'pending', 'Aprovação não pode aceitar pagamento forjado pelo caller.');

  const approvalProfessionalNotifications = await createRuntime(professional).services.notifications.list({ currentUser: true });
  const approvalNotification = approvalProfessionalNotifications.find((item) => item.orderId === approvalOrderId && item.title === 'Proposta aprovada');
  assert(Boolean(approvalNotification), 'Aprovação deve notificar o profissional como proposta aprovada.');
  assert(!/pagou|pagamento confirmado/i.test(approvalNotification.body || ''), 'Aprovação não pode gerar notificação falsa de pagamento.');

  const idempotentRuntime = createRuntime(client);
  const idempotent = await idempotentRuntime.services.orders.approveProposal(approvalOrderId);
  assert(idempotent.status === 'in_progress', 'Repetição após reload deve ser idempotente.');
  assert(idempotent.proposalApprovedAt === firstApproval.proposalApprovedAt, 'Repetição não pode alterar a data original da aprovação.');
  await assertRejects(
    idempotentRuntime.services.orders.rejectProposal(approvalOrderId, 'Mudei de ideia.'),
    'Proposta aprovada não pode ser recusada depois do início da execução.'
  );

  const approvalReload = createRuntime(client);
  const approvedReloaded = await approvalReload.services.orders.getById(approvalOrderId);
  assert(approvedReloaded.status === 'in_progress', 'Reload deve preservar in_progress.');
  assert(approvedReloaded.proposalApprovedBy === client.id, 'Reload deve preservar o aprovador.');
  assert(approvedReloaded.paymentStatus === 'pending', 'Reload deve preservar pagamento pendente.');
  assert(approvalReload.services.orders.stateMachine.canTransition(approvedReloaded, 'in_progress', client) === false, 'Máquina não deve expor transição repetida.');

  const rejectionOrderId = await createQuotedOrder(client, professional, 'rejection');
  const rejectionRuntime = createRuntime(client);
  await assertRejects(
    rejectionRuntime.services.orders.rejectProposal(rejectionOrderId, ''),
    'Recusa deve exigir justificativa.'
  );
  const rejected = await rejectionRuntime.services.orders.rejectProposal(
    rejectionOrderId,
    'O prazo proposto não atende à necessidade.',
    { rejectionSource: 'contract-test' }
  );
  assert(rejected.status === 'cancelled', 'Recusa deve encerrar o pedido.');
  assert(rejected.statusLabel === 'Proposta recusada', 'Recusa deve ter rótulo específico de proposta.');
  assert(rejected.cancellationType === 'proposal_rejected', 'Recusa deve registrar o tipo de encerramento.');
  assert(rejected.proposalRejectedBy === client.id, 'Recusa deve registrar o cliente responsável.');
  assert(Boolean(rejected.proposalRejectedAt), 'Recusa deve registrar data e hora.');
  assert(rejected.refusalReason === 'O prazo proposto não atende à necessidade.', 'Recusa deve persistir a justificativa.');

  const rejectionProfessionalNotifications = await createRuntime(professional).services.notifications.list({ currentUser: true });
  const rejectionNotification = rejectionProfessionalNotifications.find((item) => item.orderId === rejectionOrderId && item.title === 'Proposta recusada');
  assert(Boolean(rejectionNotification), 'Recusa deve notificar o profissional como proposta recusada.');
  assert(/Cliente Aprovação recusou a proposta/.test(rejectionNotification.body || ''), 'Notificação de recusa deve identificar o ator e a decisão corretos.');

  const rejectionReload = createRuntime(client);
  const rejectedReloaded = await rejectionReload.services.orders.getById(rejectionOrderId);
  assert(rejectedReloaded.status === 'cancelled', 'Reload deve preservar proposta recusada.');
  assert(rejectedReloaded.cancellationType === 'proposal_rejected', 'Reload deve preservar o motivo estrutural do cancelamento.');
  assert(rejectedReloaded.refusalReason === rejected.refusalReason, 'Reload deve preservar a justificativa da recusa.');
  const repeatedRejection = await rejectionReload.services.orders.rejectProposal(rejectionOrderId, 'Outra justificativa.');
  assert(repeatedRejection.proposalRejectedAt === rejected.proposalRejectedAt, 'Recusa repetida não pode alterar a data original.');
  assert(repeatedRejection.refusalReason === rejected.refusalReason, 'Recusa repetida não pode sobrescrever a justificativa original.');
  await assertRejects(
    rejectionReload.services.orders.approveProposal(rejectionOrderId),
    'Proposta recusada não pode ser aprovada depois do encerramento.'
  );

  console.log('Order proposal decision contract: PASS');
  console.log(JSON.stringify({
    approvalTransition: 'quoted -> in_progress',
    rejectionTransition: 'quoted -> cancelled',
    roleIsolation: true,
    concurrentIdempotency: true,
    reloadPersistence: true,
    paymentSeparatedFromApproval: true,
    notificationSemantics: true,
    pageActions: true
  }, null, 2));
}

main().catch((error) => {
  console.error('Order proposal decision contract: FAIL');
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
