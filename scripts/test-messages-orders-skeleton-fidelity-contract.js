'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const messagesHtml = read('mensagens.html');
const messagesCss = read('assets/css/pages/mensagens/page-hydration-states.css');
const ordersCss = read('assets/css/pages/pedidos/orders-command-center.css');

[
  'messages-hydration-skeleton__brand',
  'messages-hydration-skeleton__tools',
  'messages-hydration-skeleton__filter-strip',
  'messages-hydration-skeleton__line-row',
  'messages-hydration-skeleton__order-card',
  'messages-hydration-skeleton__message-row--incoming',
  'messages-hydration-skeleton__message-row--outgoing',
  'messages-hydration-skeleton__composer-send'
].forEach((token) => assert(messagesHtml.includes(token), `Mensagens deve materializar ${token}.`));

assert(!messagesHtml.includes('messages-hydration-skeleton__context'), 'Mensagens não deve manter o placeholder genérico antigo de contexto.');
assert(!messagesHtml.includes('messages-hydration-skeleton__badge'), 'Mensagens não deve manter o badge antigo sem contrato CSS.');
assert(!messagesCss.includes('__item--compact {\nbody.messages-page-shell .messages-hydration-skeleton__item--compact'), 'CSS de Mensagens não deve conter seletor duplicado/malformado.');
assert(
  ordersCss.includes('html:not([data-orders-role="professional"]) body.orders-page-shell [data-orders-hydration-skeleton="planner"]'),
  'Pedidos deve ocultar o skeleton de agenda para papéis não profissionais.'
);

console.log('PASS messages-orders-skeleton-fidelity-contract');
