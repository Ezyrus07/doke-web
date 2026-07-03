'use strict';

const { listRoutesByModule, findRouteByName } = require('../../shared/http/route-registry');
const { createActionHandler, notImplementedHandler } = require('../../shared/http/create-action-handler');
const notificationsService = require('./notifications-service');

const routes = listRoutesByModule('notifications');
const handlers = routes.reduce((index, route) => {
  index[route.handler] = notImplementedHandler(route);
  return index;
}, {});

handlers.listNotifications = createActionHandler(findRouteByName('notifications.list'), {
  execute({ context, actor }) {
    return notificationsService.listNotifications(context, actor);
  }
});

handlers.getNotification = createActionHandler(findRouteByName('notifications.get'), {
  execute({ context, actor }) {
    return notificationsService.getNotification(context, actor, context.params.id);
  }
});

handlers.createNotification = createActionHandler(findRouteByName('notifications.create'), {
  execute({ context, actor }) {
    return notificationsService.createNotification(context, actor);
  }
});

handlers.updateNotification = createActionHandler(findRouteByName('notifications.update'), {
  execute({ context, actor }) {
    return notificationsService.updateNotification(context, actor, context.params.id);
  }
});

handlers.markNotificationRead = createActionHandler(findRouteByName('notifications.read'), {
  execute({ context, actor }) {
    return notificationsService.markNotificationRead(context, actor, context.params.id);
  }
});

handlers.dismissNotification = createActionHandler(findRouteByName('notifications.dismiss'), {
  execute({ context, actor }) {
    return notificationsService.dismissNotification(context, actor, context.params.id);
  }
});

handlers.markAllNotificationsRead = createActionHandler(findRouteByName('notifications.readAll'), {
  execute({ context, actor }) {
    return notificationsService.markAllNotificationsRead(context, actor);
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
