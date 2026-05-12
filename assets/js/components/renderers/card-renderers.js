/* Doke card renderers
   Responsibility: fill component templates from normalized data objects.
   These helpers keep page scripts away from hard-coded card markup. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var rendering = Doke.dataRendering;
  var renderers = Doke.renderers || (Doke.renderers = {});

  function missingRendering() {
    return !rendering || typeof rendering.cloneTemplate !== 'function';
  }

  function formatPrice(value, mode) {
    if (value == null || value === '') return '';
    var numeric = Number(value);
    var formatted = Number.isFinite(numeric)
      ? numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
      : String(value);
    return mode === 'from' || mode === 'starting_at' ? 'A partir de ' + formatted : formatted;
  }

  function formatRating(rating, count) {
    var score = rating == null ? '' : String(rating).replace('.', ',');
    if (!count) return score;
    return score + ' (' + count + ')';
  }

  function createFromTemplate(templateSelector, fallbackTag) {
    if (missingRendering()) return document.createElement(fallbackTag || 'article');
    return rendering.cloneTemplate(templateSelector) || document.createElement(fallbackTag || 'article');
  }

  function renderServiceCard(service, templateSelector) {
    service = service || {};
    var node = createFromTemplate(templateSelector || '#service-card-template', 'article');
    node.dataset.serviceCard = 'true';
    if (service.id) node.dataset.serviceId = service.id;

    rendering.setText(node, '[data-service-title]', service.title);
    rendering.setText(node, '[data-service-category]', service.category);
    rendering.setText(node, '[data-service-provider]', service.providerName || service.professionalName);
    rendering.setText(node, '[data-service-location]', service.location || [service.city, service.state].filter(Boolean).join(', '));
    rendering.setText(node, '[data-service-price]', formatPrice(service.price || service.startingPrice, service.priceMode));
    rendering.setText(node, '[data-service-rating]', formatRating(service.rating, service.reviewCount));
    rendering.setImage(node, '[data-service-image]', service.image || service.coverImage, service.imageAlt || service.title || 'Imagem do serviço');
    rendering.setAttribute(node, '[data-service-link]', 'href', service.href || (service.id ? 'detalhe-anuncio.html?id=' + encodeURIComponent(service.id) : null));
    rendering.setAttribute(node, '[data-service-favorite]', 'aria-pressed', service.isFavorite ? 'true' : 'false');
    return node;
  }

  function renderWorkerCard(worker, templateSelector) {
    worker = worker || {};
    var node = createFromTemplate(templateSelector || '#worker-card-template', 'article');
    node.dataset.workerCard = 'true';
    if (worker.id) node.dataset.workerId = worker.id;

    rendering.setText(node, '[data-worker-title]', worker.title);
    rendering.setText(node, '[data-worker-provider]', worker.providerName || worker.authorName);
    rendering.setText(node, '[data-worker-duration]', worker.duration);
    rendering.setText(node, '[data-worker-views]', worker.views);
    rendering.setImage(node, '[data-worker-image]', worker.image || worker.poster, worker.imageAlt || worker.title || 'Vídeo curto do serviço');
    rendering.setAttribute(node, '[data-worker-action]', 'data-worker-id', worker.id || null);
    rendering.setAttribute(node, '[data-worker-favorite]', 'aria-pressed', worker.isSaved ? 'true' : 'false');
    return node;
  }

  function renderPublicationCard(publication, templateSelector) {
    publication = publication || {};
    var node = createFromTemplate(templateSelector || '#publication-card-template', 'article');
    node.dataset.publicationCard = 'true';
    if (publication.id) node.dataset.publicationId = publication.id;

    rendering.setText(node, '[data-publication-title]', publication.title);
    rendering.setText(node, '[data-publication-author]', publication.authorName || publication.providerName);
    rendering.setText(node, '[data-publication-type]', publication.type);
    rendering.setText(node, '[data-publication-likes]', publication.likes);
    rendering.setText(node, '[data-publication-comments]', publication.comments);
    rendering.setText(node, '[data-publication-saves]', publication.saves);
    rendering.setImage(node, '[data-publication-image]', publication.image || publication.coverImage, publication.imageAlt || publication.title || 'Publicação');
    rendering.setAttribute(node, '[data-publication-link]', 'href', publication.href || '#');
    return node;
  }

  function renderReviewCard(review, templateSelector) {
    review = review || {};
    var node = createFromTemplate(templateSelector || '#review-card-template', 'article');
    node.dataset.reviewCard = 'true';
    if (review.id) node.dataset.reviewId = review.id;

    rendering.setText(node, '[data-review-author]', review.authorName);
    rendering.setText(node, '[data-review-initials]', review.authorInitials);
    rendering.setText(node, '[data-review-rating]', String(review.rating || '').replace('.', ','));
    rendering.setText(node, '[data-review-text]', review.text);
    rendering.setText(node, '[data-review-date]', review.dateLabel || review.createdAt);
    rendering.setText(node, '[data-review-service]', review.serviceTitle);
    return node;
  }

  renderers.cards = Object.freeze({
    renderServiceCard: renderServiceCard,
    renderWorkerCard: renderWorkerCard,
    renderPublicationCard: renderPublicationCard,
    renderReviewCard: renderReviewCard,
    formatPrice: formatPrice,
    formatRating: formatRating
  });
})();
