'use strict';

const { listRoutesByModule, findRouteByName } = require('../../shared/http/route-registry');
const { createActionHandler, notImplementedHandler } = require('../../shared/http/create-action-handler');
const {
  listOrders,
  getOrder,
  createOrder,
  acceptOrder,
  declineOrder,
  sendQuote,
  sendCharge,
  startOrder,
  completeOrder,
  updateOrderStatus
} = require('./orders-service');

const routes = listRoutesByModule('orders');
const routeByName = (name) => findRouteByName(name);

const handlers = routes.reduce((index, route) => {
  index[route.handler] = notImplementedHandler(route);
  return index;
}, {});

handlers.listOrders = createActionHandler(routeByName('orders.list'), {
  async execute({ context, actor }) {
    return listOrders(context, actor);
  }
});

handlers.getOrder = createActionHandler(routeByName('orders.get'), {
  async execute({ context, actor }) {
    return getOrder(context, actor, context.params && context.params.id);
  }
});

handlers.createOrder = createActionHandler(routeByName('orders.create'), {
  async execute({ context, actor }) {
    return createOrder(context, actor);
  }
});

handlers.acceptOrder = createActionHandler(routeByName('orders.accept'), {
  async execute({ context, actor }) {
    return acceptOrder(context, actor, context.params && context.params.id);
  }
});

handlers.declineOrder = createActionHandler(routeByName('orders.decline'), {
  async execute({ context, actor }) {
    return declineOrder(context, actor, context.params && context.params.id);
  }
});

handlers.sendQuote = createActionHandler(routeByName('orders.quote'), {
  async execute({ context, actor }) {
    return sendQuote(context, actor, context.params && context.params.id);
  }
});

handlers.sendCharge = createActionHandler(routeByName('orders.charge'), {
  async execute({ context, actor }) {
    return sendCharge(context, actor, context.params && context.params.id);
  }
});

handlers.startOrder = createActionHandler(routeByName('orders.start'), {
  async execute({ context, actor }) {
    return startOrder(context, actor, context.params && context.params.id);
  }
});

handlers.completeOrder = createActionHandler(routeByName('orders.complete'), {
  async execute({ context, actor }) {
    return completeOrder(context, actor, context.params && context.params.id);
  }
});

handlers.updateOrderStatus = createActionHandler(routeByName('orders.updateStatus'), {
  async execute({ context, actor }) {
    return updateOrderStatus(context, actor, context.params && context.params.id);
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
