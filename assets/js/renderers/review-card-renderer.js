(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var dom = Doke.dom;

  function initials(name) {
    return String(name || 'Cliente')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join('') || 'CL';
  }

  function ratingValue(value) {
    return value == null ? '5,0' : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function reviewCard(review) {
    if (!dom) throw new Error('Doke.dom is required before review-card-renderer.js');
    review = review || {};

    var author = review.authorName || review.author || 'Cliente Doke';
    var value = ratingValue(review.rating);

    return dom.create('article', {
      className: 'profile-review-card profile-review-card--clean doke-review-card ' + (review.className || ''),
      attrs: {
        'data-review-card': '',
        'data-card-kind': 'review',
        'data-review-id': review.id || '',
        'data-review-service-id': review.serviceId || '',
        'data-review-author-id': review.authorId || '',
        'data-rating-value': value,
        'data-review-verified': review.verified ? 'true' : 'false'
      },
      children: [
        dom.create('div', {
          className: 'profile-review-card__head',
          children: [
            dom.create('div', {
              className: 'profile-review-card__client',
              children: [
                dom.create('span', {
                  className: 'profile-review-card__avatar doke-avatar',
                  text: review.avatarText || initials(author),
                  attrs: { 'data-review-avatar': '', 'data-avatar': '' }
                }),
                dom.create('span', {
                  children: [
                    dom.create('strong', { text: author, attrs: { 'data-review-author': '' } }),
                    dom.create('span', { text: review.subtitle || review.serviceTitle || 'Cliente verificado', attrs: { 'data-review-subtitle': '' } })
                  ]
                })
              ]
            }),
            dom.create('div', {
              className: 'profile-review-card__rating doke-rating',
              attrs: { 'data-rating': '' },
              children: [
                dom.create('strong', { text: value, attrs: { 'data-rating-value-text': '' } }),
                dom.create('span', { text: '★★★★★', attrs: { 'aria-hidden': 'true' } })
              ]
            })
          ]
        }),
        dom.create('p', { text: review.text || review.content || 'Avaliação do cliente.', attrs: { 'data-review-text': '' } }),
        dom.create('div', {
          className: 'profile-review-card__footer',
          children: [
            dom.create('span', { text: review.serviceTitle || 'Serviço Doke', attrs: { 'data-review-service-title': '' } }),
            dom.create('span', { text: review.dateLabel || review.createdAt || '', attrs: { 'data-review-date': '' } })
          ]
        })
      ]
    });
  }

  Doke.renderers = Doke.renderers || {};
  Doke.renderers.reviewCard = reviewCard;
})();
