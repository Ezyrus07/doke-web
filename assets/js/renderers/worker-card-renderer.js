(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var dom = Doke.dom;

  function workerCard(worker) {
    if (!dom) throw new Error('Doke.dom is required before worker-card-renderer.js');
    worker = worker || {};

    var id = worker.id || '';
    var title = worker.title || worker.description || 'Worker disponível';
    var poster = worker.poster || worker.image || worker.imageUrl || 'assets/img/workers/worker-pintura.png';
    var preview = worker.preview || worker.videoPreview || worker.previewUrl || '';

    return dom.create('button', {
      className: 'video-card worker-card doke-card doke-worker-card doke-media-card ' + (worker.className || ''),
      attrs: {
        type: 'button',
        'aria-label': worker.ariaLabel || ('Abrir worker: ' + title),
        'data-worker-card': '',
        'data-card-kind': 'worker',
        'data-worker-id': id,
        'data-worker-trigger': '',
        'data-worker-title': title,
        'data-worker-provider': worker.providerName || worker.author || '',
        'data-worker-category': worker.category || '',
        'data-worker-duration': worker.duration || '',
        'data-worker-views': worker.views || '',
        'data-worker-likes': worker.likes || ''
      },
      children: [
        dom.create('img', {
          className: 'video-card__poster worker-card__poster',
          attrs: {
            src: poster,
            alt: worker.alt || title,
            loading: 'lazy',
            'data-worker-poster': ''
          }
        }),
        preview ? dom.create('video', {
          className: 'video-card__preview worker-card__preview',
          attrs: {
            src: preview,
            muted: true,
            playsinline: true,
            preload: 'metadata',
            'aria-hidden': 'true',
            'data-worker-preview': ''
          }
        }) : null,
        dom.create('span', { className: 'sr-only', text: title, attrs: { 'data-worker-title-text': '' } })
      ]
    });
  }

  Doke.renderers = Doke.renderers || {};
  Doke.renderers.workerCard = workerCard;
})();
