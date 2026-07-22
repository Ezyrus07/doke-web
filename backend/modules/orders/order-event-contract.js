'use strict';

const { normalizeStatus, normalizeRole } = require('./order-state-machine');

const EVENT_TYPE_BY_STATUS = Object.freeze({
  requested: 'order.requested',
  accepted: 'order.accepted',
  quoted: 'order.quoted',
  scheduled: 'order.scheduled',
  in_progress: 'order.started',
  completed: 'order.completed',
  cancelled: 'order.cancelled',
  disputed: 'order.disputed'
});

const DEFAULT_COPY_BY_STATUS = Object.freeze({
  requested: Object.freeze({ title: 'Novo pedido recebido', body: 'Um cliente enviou uma nova solicitação de serviço.' }),
  accepted: Object.freeze({ title: 'Pedido aceito', body: 'O profissional aceitou sua solicitação de serviço.' }),
  quoted: Object.freeze({ title: 'Novo orçamento recebido', body: 'O profissional enviou ou atualizou o orçamento do pedido.' }),
  scheduled: Object.freeze({ title: 'Serviço agendado', body: 'O pedido recebeu uma data de atendimento.' }),
  in_progress: Object.freeze({ title: 'Serviço iniciado', body: 'O atendimento deste pedido foi iniciado.' }),
  completed: Object.freeze({ title: 'Serviço concluído', body: 'O atendimento deste pedido foi marcado como concluído.' }),
  cancelled: Object.freeze({ title: 'Pedido cancelado', body: 'Este pedido foi cancelado.' }),
  disputed: Object.freeze({ title: 'Disputa aberta', body: 'Uma disputa foi aberta para este pedido.' })
});

function buildOrderDomainEvent(input) {
  const source = input || {};
  const order = source.order || {};
  const orderId = text(order.id || source.orderId);
  const clientId = text(order.client_id || order.clientId);
  const professionalId = text(order.professional_id || order.professionalId);
  const serviceId = text(order.service_id || order.serviceId);
  const previousStatus = source.previousStatus == null ? null : normalizeStatus(source.previousStatus);
  const nextStatus = normalizeStatus(source.nextStatus || order.status);
  const actorId = text(source.actor && source.actor.id || source.actorId) || null;
  const actorRole = normalizeRole(source.actor && source.actor.role || source.actorRole || 'system');
  const sequence = positiveInteger(source.sequence);
  const action = text(source.action || (previousStatus ? 'updateStatus' : 'create'));
  const eventType = EVENT_TYPE_BY_STATUS[nextStatus];

  if (!orderId) throw contractError('DOKE_ORDER_EVENT_ORDER_REQUIRED', 'Order id is required.');
  if (!clientId) throw contractError('DOKE_ORDER_EVENT_CLIENT_REQUIRED', 'Order client id is required.');
  if (!eventType) throw contractError('DOKE_ORDER_EVENT_TYPE_INVALID', `No event type for ${nextStatus}.`);

  const eventKey = `order:${orderId}:v${sequence}`;
  const occurredAt = source.occurredAt || new Date().toISOString();
  const recipients = unique([clientId, professionalId])
    .filter(Boolean)
    .filter((id) => !actorId || id !== actorId)
    .map((recipientId) => Object.freeze({
      recipientId,
      eventKey: `${eventKey}:recipient:${recipientId}`,
      type: eventType.replace('.', '_'),
      category: 'orders',
      title: DEFAULT_COPY_BY_STATUS[nextStatus].title,
      body: DEFAULT_COPY_BY_STATUS[nextStatus].body,
      targetUrl: `pedidos.html?order=${encodeURIComponent(orderId)}`,
      actionLabel: 'Ver pedido'
    }));

  const cacheTags = unique([
    `order:${orderId}`,
    `orders:client:${clientId}`,
    professionalId ? `orders:professional:${professionalId}` : '',
    professionalId ? `conversation:order:${orderId}` : '',
    ...recipients.map((item) => `notifications:user:${item.recipientId}`)
  ]).filter(Boolean);

  return Object.freeze({
    eventKey,
    sequence,
    eventType,
    orderId,
    serviceId: serviceId || null,
    clientId,
    professionalId: professionalId || null,
    previousStatus,
    nextStatus,
    actorId,
    actorRole,
    action,
    note: text(source.note) || defaultNote(nextStatus),
    occurredAt,
    cacheTags: Object.freeze(cacheTags),
    recipients: Object.freeze(recipients),
    metric: Object.freeze({
      eventType,
      orderId,
      serviceId: serviceId || null,
      clientId,
      professionalId: professionalId || null,
      occurredAt
    })
  });
}

function defaultNote(status) {
  return DEFAULT_COPY_BY_STATUS[status] && DEFAULT_COPY_BY_STATUS[status].body || 'Status do pedido atualizado.';
}

function positiveInteger(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw contractError('DOKE_ORDER_EVENT_SEQUENCE_INVALID', 'Order event sequence must be a positive integer.');
  }
  return number;
}

function unique(values) {
  return Array.from(new Set(values));
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

function contractError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.status = 500;
  return error;
}

module.exports = Object.freeze({
  EVENT_TYPE_BY_STATUS,
  DEFAULT_COPY_BY_STATUS,
  buildOrderDomainEvent
});
