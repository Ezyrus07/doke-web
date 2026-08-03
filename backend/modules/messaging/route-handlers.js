'use strict';

const { listRoutesByModule, findRouteByName } = require('../../shared/http/route-registry');
const { createActionHandler, notImplementedHandler } = require('../../shared/http/create-action-handler');
const messagingService = require('./messaging-service');

const routes = listRoutesByModule('messaging');
const handlers = routes.reduce((index, route) => {
  index[route.handler] = notImplementedHandler(route);
  return index;
}, {});

handlers.listConversations = createActionHandler(findRouteByName('conversations.list'), {
  execute({ context, actor }) {
    return messagingService.listConversations(context, actor);
  }
});

handlers.getConversation = createActionHandler(findRouteByName('conversations.get'), {
  execute({ context, actor }) {
    return messagingService.getConversation(context, actor, context.params.id);
  }
});

function readHeader(headers, name) {
  const source = headers && typeof headers === 'object' ? headers : {};
  const expected = String(name || '').toLowerCase();
  const key = Object.keys(source).find((entry) => String(entry).toLowerCase() === expected);
  return key ? String(source[key] || '').trim() : '';
}

function createMessagingCommandHandler(routeName, execute) {
  const route = findRouteByName(routeName);
  const baseHandler = createActionHandler(route, { execute });
  return async function messagingCommandHandler(context) {
    const response = await baseHandler(context);
    const commandId = readHeader(context && context.headers, 'x-idempotency-key') || String(context && context.body && context.body.commandId || '').trim();
    if (!commandId) {
      const error = new Error('Messaging command acknowledgement requires an idempotency key.');
      error.code = 'DOKE_MESSAGES_COMMAND_ID_REQUIRED';
      error.status = 400;
      throw error;
    }
    const replayed = response && response.replayed === true;
    return Object.freeze(Object.assign({}, response, {
      acknowledgement: Object.freeze({
        commandId,
        action: context && context.body && context.body.action || routeName.split('.').pop(),
        route: route.name,
        status: replayed ? 'replayed' : 'accepted',
        replayed,
        acknowledgedAt: context && context.now || new Date().toISOString()
      })
    }));
  };
}

handlers.createConversationForOrder = createMessagingCommandHandler('conversations.createForOrder', function ({ context, actor }) {
  return messagingService.createConversationForOrder(context, actor, context.params.id);
});

handlers.updateConversationOrder = createMessagingCommandHandler('conversations.updateOrder', function ({ context, actor }) {
  return messagingService.updateConversationOrder(context, actor, context.params.id);
});

handlers.sendMessage = createMessagingCommandHandler('messages.send', function ({ context, actor }) {
  return messagingService.sendMessage(context, actor, context.params.id);
});

handlers.removeMessage = createMessagingCommandHandler('messages.remove', function ({ context, actor }) {
  return messagingService.removeMessage(context, actor, context.params.id);
});

handlers.markConversationRead = createMessagingCommandHandler('messages.markRead', function ({ context, actor }) {
  return messagingService.markConversationRead(context, actor, context.params.id);
});

function listRouteDefinitions() {
  return routes.slice();
}

module.exports = Object.freeze({
  routes,
  handlers,
  listRouteDefinitions
});
