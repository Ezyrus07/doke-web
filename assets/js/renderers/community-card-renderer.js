(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var dom = Doke.dom;

  function communityCard(community) {
    if (!dom) throw new Error('Doke.dom is required before community-card-renderer.js');
    community = community || {};

    return dom.create('article', {
      className: 'doke-card doke-community-card',
      attrs: {
        'data-community-id': community.id || '',
        'data-domain-card': 'community'
      },
      children: [
        dom.create('div', { className: 'doke-community-card__cover', text: community.icon || '🏘️' }),
        dom.create('div', {
          className: 'doke-card__body doke-community-card__body',
          children: [
            dom.create('span', { className: 'doke-badge', text: community.type || 'Comunidade' }),
            dom.create('h3', { className: 'doke-community-card__title', text: community.name || 'Comunidade' }),
            dom.create('p', { className: 'doke-community-card__description', text: community.description || 'Espaço para trocar informações e recomendações.' }),
            dom.create('p', { className: 'doke-community-card__meta', text: (community.memberCount || 0).toLocaleString('pt-BR') + ' membros' })
          ]
        }),
        dom.create('div', {
          className: 'doke-card__footer doke-community-card__footer',
          children: [dom.create('a', { className: 'doke-btn doke-btn--primary doke-btn--compact', text: 'Entrar', attrs: { href: community.href || 'comunidade-interna.html' } })]
        })
      ]
    });
  }

  Doke.renderers = Doke.renderers || {};
  Doke.renderers.communityCard = communityCard;
})();
