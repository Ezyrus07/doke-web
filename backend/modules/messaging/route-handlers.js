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

handlers.createConversationForOrder = createActionHandler(findRouteByName('conversations.createForOrder'), {
  execute({ context, actor }) {
    return messagingService.createConversationForOrder(context, actor, context.params.id);
  }
});

handlers.updateConversationOrder = createActionHandler(findRouteByName('conversations.updateOrder'), {
  execute({ context, actor }) {
    return messagingService.updateConversationOrder(context, actor, context.params.id);
  }
});

handlers.sendMessage = createActionHandler(findRouteByName('messages.send'), {
  execute({ context, actor }) {
    return messagingService.sendMessage(context, actor, context.params.id);
  }
});

handlers.markConversationRead = createActionHandler(findRouteByName('messages.markRead'), {
  execute({ context, actor }) {
    return messagingService.markConversationRead(context, actor, context.params.id);
  }
});

function listRouteDefinitions() {
  return routes.slice();
}

module.exports = Object.freeze({
  routes,
  handlers,
  listRouteDefinitions
});
