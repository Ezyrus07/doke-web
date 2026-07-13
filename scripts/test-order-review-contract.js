#!/usr/bin/env node
/* Canonical post-completion review contract.
   Covers eligibility, role isolation, idempotency, recovery, reputation and UI delegation. */
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
    location: { search: '', href: 'http://localhost:4173/avaliacao-profissional.html' },
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
    'assets/js/repositories/reviews-repository.js',
    'assets/js/services/notification-service.js',
    'assets/js/services/message-service.js',
    'assets/js/services/orders-service.js',
    'assets/js/services/wallet-service.js',
    'assets/js/services/payment-service.js',
    'assets/js/services/review-service.js'
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

async function createCompletedOrder(client, professional, suffix, amount = 'R$ 420,00') {
  const clientRuntime = createRuntime(client).Doke;
  const order = await clientRuntime.services.orders.create({
    serviceId: `service_review_${suffix}`,
    professionalId: professional.id,
    providerId: professional.id,
    displayProfessionalId: `profile_${professional.id}`,
    providerName: professional.name,
    professionalName: professional.name,
    serviceTitle: `Serviço avaliação ${suffix}`,
    title: `Serviço avaliação ${suffix}`
  });

  await createRuntime(professional).Doke.services.orders.accept(order.id);
  await createRuntime(professional).Doke.services.orders.submitProposal(order.id, {
    amount,
    installments: 'À vista',
    messageText: `Proposta ${suffix}`
  });
  await createRuntime(client).Doke.services.orders.approveProposal(order.id, { approvalSource: 'review-contract' });
  const chargeResult = await createRuntime(professional).Doke.services.orders.createCharge(order.id, {
    amount,
    installments: 'À vista'
  });
  const conversation = findConversation(createRuntime(client).Doke, order.id);
  const grossAmount = Number(String(amount).replace(/[^\d,]/g, '').replace(',', '.'));
  await createRuntime(client).Doke.services.payments.confirmChargePayment(order.id, {
    conversationId: conversation.id,
    messageId: chargeResult.message.id,
    amount: grossAmount,
    grossAmount,
    discountAmount: 0,
    method: 'Pix'
  });
  await createRuntime(professional).Doke.services.payments.requestCompletion(order.id, {
    conversationId: conversation.id,
    messageId: chargeResult.message.id,
    completionNote: 'Serviço concluído para avaliação.'
  });
  const completion = await createRuntime(client).Doke.services.payments.confirmCompletion(order.id, {
    conversationId: conversation.id,
    messageId: chargeResult.message.id
  });
  return {
    orderId: order.id,
    conversationId: completion.conversation.id,
    messageId: completion.charge.id,
    completed: completion.order
  };
}

function reviewCount(Doke, orderId) {
  return Doke.repositories.reviews.readLocal().filter((review) => String(review.orderId || '') === String(orderId)).length;
}

function notificationCount(Doke, orderId) {
  return Doke.repositories.notifications.readLocal().filter((item) => (
    item.type === 'order_reviewed' && String(item.orderId || '') === String(orderId)
  )).length;
}

function assertSourceContracts() {
  const pageSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/avaliacao-profissional.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(projectRoot, 'assets/js/services/review-service.js'), 'utf8');
  const messagesSource = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/mensagens.js'), 'utf8');
  const htmlSource = fs.readFileSync(path.join(projectRoot, 'avaliacao-profissional.html'), 'utf8');

  assert(pageSource.includes('service.submitOrderReview(reviewContext.orderId, review)'), 'Página deve delegar envio ao review service.');
  assert(pageSource.includes('service.getEligibility(reviewContext.orderId'), 'Página deve hidratar elegibilidade pelo review service.');
  assert(!pageSource.includes('localStorage'), 'Página de avaliação não pode acessar localStorage diretamente.');
  assert(!pageSource.includes('repositories.reviews') && !pageSource.includes('repositories.orders'), 'Página não pode coordenar repositories de avaliação/pedido.');
  assert(serviceSource.includes('function submitOrderReview(orderId, payload)'), 'Review service deve expor comando canônico.');
  assert(serviceSource.includes("document.dispatchEvent(new CustomEvent('doke:professional-reputation-updated'"), 'Review service deve publicar projeção de reputação.');
  assert(messagesSource.includes('conversation?.order?.reviewId || conversation?.order?.reviewedAt'), 'Chat deve remover oferta de avaliação usando estado canônico do pedido.');
  assert(messagesSource.includes('document.addEventListener("doke:order-reviewed"'), 'Chat deve reidratar após avaliação.');
  assert(htmlSource.includes('assets/js/repositories/reviews-repository.js?v=20260712-canonical-review-v1'), 'Página deve carregar o repository de avaliações em acesso direto.');
  assert(htmlSource.includes('assets/js/services/review-service.js?v=20260712-canonical-review-v1'), 'Página deve carregar o review service em acesso direto.');
  assert(htmlSource.indexOf('assets/js/services/review-service.js') < htmlSource.indexOf('assets/js/pages/avaliacao-profissional.js'), 'Review service deve carregar antes do controller.');
}

async function main() {
  const client = { id: 'client_review_1', name: 'Cliente Avaliação', role: 'client', initials: 'CA' };
  const otherClient = { id: 'client_review_2', name: 'Outro Cliente', role: 'client', initials: 'OC' };
  const professional = { id: 'user_profissional_demo', name: 'Profissional Avaliado', role: 'professional', initials: 'PA' };

  assertSourceContracts();

  const pending = await createRuntime(client).Doke.services.orders.create({
    serviceId: 'review_pending_service',
    professionalId: professional.id,
    providerId: professional.id,
    providerName: professional.name,
    serviceTitle: 'Pedido ainda pendente'
  });
  await assertRejects(
    createRuntime(client).Doke.services.reviews.submitOrderReview(pending.id, { rating: 5, comment: 'Ainda não deveria avaliar.' }),
    'Pedido pendente não pode ser avaliado.',
    'conclusão'
  );

  const completed = await createCompletedOrder(client, professional, 'canonical');
  assert(completed.completed.status === 'completed' && completed.completed.paymentStatus === 'released', 'Fixture deve terminar completed/released.');

  await assertRejects(
    createRuntime(professional).Doke.services.reviews.submitOrderReview(completed.orderId, {
      conversationId: completed.conversationId,
      messageId: completed.messageId,
      rating: 5
    }),
    'Profissional não pode avaliar o próprio atendimento.'
  );
  await assertRejects(
    createRuntime(otherClient).Doke.services.reviews.submitOrderReview(completed.orderId, {
      conversationId: completed.conversationId,
      messageId: completed.messageId,
      rating: 5
    }),
    'Outro cliente não pode avaliar o pedido.'
  );
  await assertRejects(
    createRuntime(client).Doke.services.reviews.submitOrderReview(completed.orderId, {
      conversationId: completed.conversationId,
      messageId: completed.messageId,
      rating: 0
    }),
    'Nota fora do intervalo deve ser bloqueada.',
    'nota válida'
  );

  const payload = {
    conversationId: completed.conversationId,
    messageId: completed.messageId,
    rating: 4.5,
    tags: ['Qualidade', 'Pontualidade'],
    criteria: [{ key: 'quality', rating: 5 }, { key: 'communication', rating: 4 }],
    comment: 'Serviço concluído com boa qualidade.'
  };
  const clientDoke = createRuntime(client).Doke;
  const first = await clientDoke.services.reviews.submitOrderReview(completed.orderId, payload);
  assert(first.review && first.review.id, 'Avaliação canônica deve possuir identificador.');
  assert(first.created === true && first.idempotent === false, 'Primeiro envio deve criar avaliação.');
  assert(first.review.verified === true, 'Avaliação transacional deve ser verificada.');
  assert(first.review.rating === 4.5, 'Nota deve ser preservada.');
  assert(reviewCount(clientDoke, completed.orderId) === 1, 'Pedido deve ter exatamente uma avaliação.');

  const storedOrder = await clientDoke.repositories.orders.getById(completed.orderId);
  assert(storedOrder.reviewId === first.review.id, 'Pedido deve apontar para avaliação canônica.');
  assert(storedOrder.reviewedBy === client.id, 'Pedido deve registrar cliente avaliador.');
  assert(storedOrder.nextAction === 'Avaliação enviada', 'Pedido deve deixar de oferecer nova avaliação.');
  const storedConversation = await clientDoke.repositories.messages.getById(completed.conversationId);
  const storedCharge = findCharge(storedConversation, completed.messageId);
  assert(storedCharge.reviewed === true && storedCharge.reviewId === first.review.id, 'Cobrança deve refletir avaliação registrada.');
  assert(storedConversation.order.reviewId === first.review.id, 'Conversa deve projetar reviewId do pedido.');
  assert(notificationCount(clientDoke, completed.orderId) === 1, 'Profissional deve receber uma notificação de avaliação.');
  assert(first.reputation.reviewCount === 1 && first.reputation.averageRating === 4.5, 'Reputação deve ser recalculada a partir da avaliação verificada.');

  const retryDoke = createRuntime(client).Doke;
  const retry = await retryDoke.services.reviews.submitOrderReview(completed.orderId, Object.assign({}, payload, {
    rating: 1,
    comment: 'Tentativa de substituir a primeira avaliação.'
  }));
  assert(retry.idempotent === true && retry.review.id === first.review.id, 'Retry deve retornar a mesma avaliação.');
  assert(retry.review.rating === 4.5, 'Retry não pode substituir a primeira nota.');
  assert(reviewCount(retryDoke, completed.orderId) === 1, 'Retry não pode duplicar avaliação.');
  assert(notificationCount(retryDoke, completed.orderId) === 1, 'Retry não pode duplicar notificação.');

  const eligibilityAfterReload = await createRuntime(client).Doke.services.reviews.getEligibility(completed.orderId, {
    conversationId: completed.conversationId,
    messageId: completed.messageId
  });
  assert(eligibilityAfterReload.eligible === false && eligibilityAfterReload.existingReview.id === first.review.id, 'Reload deve reconhecer pedido já avaliado.');

  const concurrentCompleted = await createCompletedOrder(client, professional, 'concurrent');
  const concurrent = await Promise.all([
    createRuntime(client).Doke.services.reviews.submitOrderReview(concurrentCompleted.orderId, Object.assign({}, payload, {
      conversationId: concurrentCompleted.conversationId,
      messageId: concurrentCompleted.messageId,
      rating: 5,
      comment: 'Primeira sessão.'
    })),
    createRuntime(client).Doke.services.reviews.submitOrderReview(concurrentCompleted.orderId, Object.assign({}, payload, {
      conversationId: concurrentCompleted.conversationId,
      messageId: concurrentCompleted.messageId,
      rating: 3,
      comment: 'Segunda sessão.'
    }))
  ]);
  assert(concurrent[0].review.id === concurrent[1].review.id, 'Duas sessões devem convergir para o mesmo reviewId.');
  assert(reviewCount(createRuntime(client).Doke, concurrentCompleted.orderId) === 1, 'Concorrência não pode duplicar avaliação.');
  assert(notificationCount(createRuntime(client).Doke, concurrentCompleted.orderId) === 1, 'Concorrência não pode duplicar notificação.');

  const recoverableCompleted = await createCompletedOrder(client, professional, 'recoverable');
  const recoveryRuntime = createRuntime(client).Doke;
  const originalMessages = recoveryRuntime.repositories.messages;
  let failOnce = true;
  recoveryRuntime.repositories.messages = Object.freeze(Object.assign({}, originalMessages, {
    save: (conversation) => {
      if (failOnce) {
        failOnce = false;
        return Promise.reject(new Error('Falha simulada depois da criação da avaliação.'));
      }
      return originalMessages.save(conversation);
    }
  }));
  await assertRejects(
    recoveryRuntime.services.reviews.submitOrderReview(recoverableCompleted.orderId, Object.assign({}, payload, {
      conversationId: recoverableCompleted.conversationId,
      messageId: recoverableCompleted.messageId
    })),
    'Falha parcial deve ser propagada para permitir retry.'
  );
  assert(reviewCount(recoveryRuntime, recoverableCompleted.orderId) === 1, 'Falha parcial deve preservar avaliação determinística para recuperação.');
  recoveryRuntime.repositories.messages = originalMessages;
  const recovered = await recoveryRuntime.services.reviews.submitOrderReview(recoverableCompleted.orderId, Object.assign({}, payload, {
    conversationId: recoverableCompleted.conversationId,
    messageId: recoverableCompleted.messageId
  }));
  assert(recovered.idempotent === true, 'Retry após falha parcial deve recuperar avaliação existente.');
  assert(recovered.charge.reviewed === true, 'Retry deve concluir projeção da conversa.');
  assert(notificationCount(recoveryRuntime, recoverableCompleted.orderId) === 1, 'Recuperação deve gerar no máximo uma notificação.');

  console.log(JSON.stringify({
    canonicalSingleReview: true,
    roleAndStateGuards: true,
    reloadPersistence: true,
    concurrentIdempotency: true,
    partialFailureRecovery: true,
    reputationProjection: true,
    pageDelegation: true
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
