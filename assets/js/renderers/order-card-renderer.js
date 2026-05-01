(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var dom = Doke.dom;

  function orderCard(order) {
    if (!dom) throw new Error('Doke.dom is required before order-card-renderer.js');
    order = order || {};

    return dom.create('article', {
      className: 'doke-card doke-order-card',
      attrs: {
        'data-order-id': order.id || '',
        'data-domain-card': 'order'
      },
      children: [
        dom.create('div', {
          className: 'doke-card__body doke-order-card__body',
          children: [
            dom.create('span', { className: 'doke-badge doke-order-card__status', text: order.status || 'Em análise' }),
            dom.create('h3', { className: 'doke-order-card__title', text: order.title || 'Pedido de serviço' }),
            dom.create('p', { className: 'doke-order-card__meta', text: order.professionalName || order.clientName || 'Sem responsável definido' }),
            dom.create('p', { className: 'doke-order-card__description', text: order.description || 'Detalhes do pedido serão exibidos aqui.' })
          ]
        }),
        dom.create('div', {
          className: 'doke-card__footer doke-order-card__footer',
          children: [
            dom.create('a', { className: 'doke-btn doke-btn--secondary doke-btn--compact', text: 'Ver pedido', attrs: { href: order.href || 'pedidos.html' } }),
            dom.create('button', { className: 'doke-btn doke-btn--ghost doke-btn--compact', text: 'Mensagem', attrs: { type: 'button' } })
          ]
        })
      ]
    });
  }

  Doke.renderers = Doke.renderers || {};
  Doke.renderers.orderCard = orderCard;
})();
