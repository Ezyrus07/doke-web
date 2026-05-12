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

    const detailHref = service.href || 'detalhe-anuncio.html';
    const tags = Array.isArray(service.tags) ? service.tags.slice(0, 2) : [];

    return dom.create('article', {
      className: 'service-card service-card--result doke-card doke-service-card',
      attrs: {
        'data-service-card': '',
        'data-card-kind': 'service',
        'data-service-id': service.id || '',
        'data-domain-card': 'service'
      },
      children: [
        dom.create('a', {
          className: 'service-card__media doke-card__media doke-service-card__media ' + (service.mediaClass || ''),
          attrs: {
            href: detailHref,
            'data-service-link': '',
            'aria-label': 'Ver anúncio de ' + (service.title || 'serviço')
          },
          children: [
            dom.create('img', {
              attrs: {
                src: service.image || service.imageUrl || 'assets/images/placeholders/service-placeholder.svg',
                alt: service.title || 'Serviço',
                loading: 'lazy',
                'data-service-image': ''
              }
            }),
            dom.create('span', {
              className: 'service-card__badge',
              text: service.badge || 'Em destaque',
              attrs: { 'data-service-badge': '' }
            }),
            dom.create('button', {
              className: 'service-card__favorite',
              attrs: {
                type: 'button',
                'aria-label': 'Salvar anúncio',
                'aria-pressed': service.isFavorite ? 'true' : 'false',
                'data-favorite-action': '',
                'data-service-id': service.id || ''
              },
              html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19-6.6-6.3a4.2 4.2 0 0 1 0-6 4.4 4.4 0 0 1 6.1 0L12 7.2l.5-.5a4.4 4.4 0 0 1 6.1 0 4.2 4.2 0 0 1 0 6Z"></path></svg>'
            })
          ]
        }),
        dom.create('div', {
          className: 'service-card__body doke-service-card__body',
          children: [
            dom.create('span', {
              className: 'service-card__category service-card__category--body',
              text: service.category || 'Serviço',
              attrs: { 'data-service-category': '' }
            }),
            dom.create('h3', {
              className: 'service-card__title doke-service-card__title',
              text: service.title || 'Serviço disponível',
              attrs: { 'data-service-title': '' }
            }),
            dom.create('div', {
              className: 'service-card__rating',
              html: '★ ' + rating(service.rating) + ' <span>(' + (service.reviews || '0 avaliações') + ')</span>',
              attrs: {
                'data-service-rating': '',
                'data-rating-value': service.rating == null ? '' : String(service.rating),
                'data-rating-count': service.reviews || ''
              }
            }),
            dom.create('div', {
              className: 'service-card__tags',
              attrs: { 'data-service-tags': '' },
              children: tags.map(function (tag) {
                return dom.create('span', { text: tag, attrs: { 'data-service-tag': tag } });
              })
            }),
            dom.create('div', {
              className: 'service-card__meta-row',
              children: [
                dom.create('div', {
                  className: 'service-card__profile',
                  children: [
                    dom.create('span', {
                      className: 'service-card__avatar ' + (service.avatarClass || ''),
                      attrs: { 'aria-hidden': 'true', 'data-service-avatar': '' }
                    }),
                    dom.create('span', {
                      className: 'service-card__location',
                      text: service.location || 'Salvador, BA',
                      attrs: { 'data-service-location': '' }
                    })
                  ]
                })
              ]
            }),
            dom.create('div', {
              className: 'service-card__footer doke-card__footer doke-service-card__footer',
              children: [
                dom.create('strong', {
                  className: 'service-card__price doke-service-card__price',
                  text: money(service.price || service.startingPrice),
                  attrs: { 'data-service-price': '' }
                }),
                dom.create('a', {
                  className: 'service-card__cta doke-btn doke-btn--primary doke-btn--compact',
                  text: 'Ver anúncio',
                  attrs: { href: detailHref, 'data-service-cta': '' }
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
