(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var dom = Doke.dom;

  function notificationCard(notification) {
    if (!dom) throw new Error('Doke.dom is required before notification-renderer.js');
    notification = notification || {};

    return dom.create('article', {
      className: 'notification-card doke-card doke-notification-card',
      attrs: {
        'data-notification-id': notification.id || '',
        'data-domain-card': 'notification',
        'data-category': notification.category || notification.type || 'info'
      },
      children: [
        dom.create('div', {
          className: 'notification-card__body doke-card__body doke-notification-card__body',
          children: [
            dom.create('span', { className: 'notification-card__tag doke-badge', text: notification.type || 'Aviso' }),
            dom.create('h3', { className: 'notification-card__title doke-notification-card__title', text: notification.title || 'Notificação' }),
            dom.create('p', { className: 'notification-card__message doke-notification-card__text', text: notification.message || '' }),
            dom.create('time', { className: 'notification-card__time doke-notification-card__meta', text: notification.createdAt || '' })
          ]
        })
      ]
    });
  }

  Doke.renderers = Doke.renderers || {};
  Doke.renderers.notificationCard = notificationCard;
})();
