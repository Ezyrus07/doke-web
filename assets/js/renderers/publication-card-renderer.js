(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var dom = Doke.dom;

  var icons = {
    photo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.4-2h7.2L17 7h3v12H4z"></path><circle cx="12" cy="13" r="3.2"></circle></svg>',
    video: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7v10l8-5z"></path></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19-6.6-6.3a4.2 4.2 0 0 1 0-6 4.4 4.4 0 0 1 6.1 0L12 7.2l.5-.5a4.4 4.4 0 0 1 6.1 0 4.2 4.2 0 0 1 0 6Z"></path></svg>',
    comment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H8l-3 3z"></path></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-3-6 3z"></path></svg>'
  };

  function publicationMedia(publication) {
    var type = publication.type || 'foto';
    var image = publication.image || publication.imageUrl || '';
    var preview = publication.preview || publication.videoPreview || '';
    var className = 'publication-card__media ' + (publication.mediaClass || '');

    if (publication.beforeImage || publication.afterImage) {
      return dom.create('div', {
        className: className + ' publication-card__comparison',
        attrs: { 'data-publication-media': '', 'data-publication-layout': 'before-after' },
        children: [
          dom.create('div', {
            className: 'publication-card__half publication-card__half--before',
            attrs: { 'data-publication-before': '' },
            children: [
              publication.beforeImage ? dom.create('img', { attrs: { src: publication.beforeImage, alt: publication.beforeAlt || 'Antes', loading: 'lazy' } }) : null,
              dom.create('span', { text: publication.beforeLabel || 'Antes' })
            ]
          }),
          dom.create('div', {
            className: 'publication-card__half publication-card__half--after',
            attrs: { 'data-publication-after': '' },
            children: [
              publication.afterImage ? dom.create('img', { attrs: { src: publication.afterImage, alt: publication.afterAlt || 'Depois', loading: 'lazy' } }) : null,
              dom.create('span', { text: publication.afterLabel || 'Depois' })
            ]
          })
        ]
      });
    }

    return dom.create('div', {
      className: className,
      attrs: { 'data-publication-media': '' },
      children: [
        image ? dom.create('img', {
          className: 'publication-card__poster',
          attrs: { src: image, alt: publication.alt || publication.title || 'Publicação', loading: 'lazy', 'data-publication-image': '' }
        }) : null,
        preview ? dom.create('video', {
          className: 'publication-card__preview',
          attrs: { src: preview, muted: true, playsinline: true, preload: 'metadata', 'aria-hidden': 'true', 'data-publication-preview': '' }
        }) : null,
        dom.create('span', { className: 'publication-card__type', html: (type === 'video' ? icons.video : icons.photo) + '<span data-publication-type>' + String(type).toUpperCase() + '</span>' }),
        type === 'video' ? dom.create('span', { className: 'publication-card__play', html: icons.video, attrs: { 'aria-hidden': 'true' } }) : null
      ]
    });
  }

  function metric(label, value, icon) {
    return dom.create('span', {
      className: 'publication-card__action',
      html: icon + '<span>' + (value == null ? '0' : String(value)) + '</span>',
      attrs: { 'aria-label': label + ': ' + (value == null ? 0 : value) }
    });
  }

  function publicationCard(publication) {
    if (!dom) throw new Error('Doke.dom is required before publication-card-renderer.js');
    publication = publication || {};

    return dom.create('article', {
      className: 'publication-card doke-card doke-publication-card ' + (publication.className || ''),
      attrs: {
        'data-publication-card': '',
        'data-card-kind': 'publication',
        'data-publication-id': publication.id || '',
        'data-publication-type-value': publication.type || 'foto',
        'data-publication-author-id': publication.authorId || ''
      },
      children: [
        publicationMedia(publication),
        dom.create('div', {
          className: 'publication-card__content',
          children: [
            dom.create('h3', { className: 'publication-card__title', text: publication.title || 'Publicação', attrs: { 'data-publication-title': '' } }),
            dom.create('p', {
              className: 'publication-card__author',
              html: 'Por <a href="' + (publication.authorHref || '#') + '" data-publication-author>' + (publication.author || publication.authorName || 'Profissional') + '</a>'
            }),
            publication.description ? dom.create('p', { className: 'publication-card__description', text: publication.description, attrs: { 'data-publication-description': '' } }) : null,
            dom.create('div', {
              className: 'publication-card__actions',
              attrs: { 'data-publication-actions': '' },
              children: [
                metric('Curtidas', publication.likes, icons.heart),
                metric('Comentários', publication.comments, icons.comment),
                metric('Salvos', publication.saves, icons.save)
              ]
            })
          ]
        })
      ]
    });
  }

  Doke.renderers = Doke.renderers || {};
  Doke.renderers.publicationCard = publicationCard;
})();
