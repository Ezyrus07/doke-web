(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var dom = Doke.dom;

  function money(value) {
    if (value == null || Number.isNaN(Number(value))) return 'Sob orçamento';
    return 'R$ ' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function rating(value) {
    return value == null ? 'Novo' : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function serviceCard(service) {
    if (!dom) throw new Error('Doke.dom is required before service-card-renderer.js');
    service = service || {};

    return dom.create('article', {
      className: 'doke-card doke-service-card',
      attrs: {
        'data-service-id': service.id || '',
        'data-domain-card': 'service'
      },
      children: [
        dom.create('div', {
          className: 'doke-card__media doke-service-card__media',
          children: [
            dom.create('img', {
              attrs: {
                src: service.image || service.imageUrl || 'assets/images/placeholders/service-placeholder.svg',
                alt: service.title || 'Serviço',
                loading: 'lazy'
              }
            })
          ]
        }),
        dom.create('div', {
          className: 'doke-card__body doke-service-card__body',
          children: [
            dom.create('p', { className: 'doke-service-card__category', text: service.category || 'Serviço' }),
            dom.create('h3', { className: 'doke-service-card__title', text: service.title || 'Serviço disponível' }),
            dom.create('p', { className: 'doke-service-card__meta', text: '★ ' + rating(service.rating) + ' · ' + (service.location || 'Salvador, BA') }),
            dom.create('div', {
              className: 'doke-card__footer doke-service-card__footer',
              children: [
                dom.create('strong', { className: 'doke-service-card__price', text: money(service.price || service.startingPrice) }),
                dom.create('a', {
                  className: 'doke-btn doke-btn--primary doke-btn--compact',
                  text: 'Ver detalhes',
                  attrs: { href: service.href || 'detalhe-anuncio.html' }
                })
              ]
            })
          ]
        })
      ]
    });
  }

  Doke.renderers = Doke.renderers || {};
  Doke.renderers.serviceCard = serviceCard;
})();
