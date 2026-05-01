(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var dom = Doke.dom;

  function notificationCard(notification) {
    if (!dom) throw new Error('Doke.dom is required before notification-renderer.js');
    notification = notification || {};

    return dom.create('article', {
      className: 'doke-card doke-notification-card',
      attrs: {
        'data-notification-id': notification.id || '',
        'data-domain-card': 'notification'
      },
      children: [
        dom.create('div', {
          className: 'doke-card__body doke-notification-card__body',
          children: [
            dom.create('span', { className: 'doke-badge', text: notification.type || 'Aviso' }),
            dom.create('h3', { className: 'doke-notification-card__title', text: notification.title || 'Notificação' }),
            dom.create('p', { className: 'doke-notification-card__message', text: notification.message || '' }),
            dom.create('time', { className: 'doke-notification-card__time', text: notification.createdAt || '' })
          ]
        })
      ]
    });
  }

  Doke.renderers = Doke.renderers || {};
  Doke.renderers.notificationCard = notificationCard;
})();
