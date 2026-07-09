(function () {
  'use strict';

  var REVIEW_PAGE_VERSION = '20260709-profile-review-sync-v1';
  var BASE_REVIEW_COUNT = 28;
  var BASE_REVIEW_SCORE = 4.9;

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeKey(value) {
    return normalizeText(value).toLowerCase();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatRating(value) {
    var rating = Number(value || 0);
    if (!Number.isFinite(rating) || rating <= 0) rating = 5;
    return rating.toFixed(1).replace('.', ',');
  }

  function getRelativeDateLabel(value) {
    var time = Date.parse(value || '');
    if (!Number.isFinite(time)) return 'Agora';
    var diff = Math.max(0, Date.now() - time);
    var day = 24 * 60 * 60 * 1000;
    if (diff < 60 * 60 * 1000) return 'Agora';
    if (diff < day) return 'Hoje';
    var days = Math.round(diff / day);
    if (days <= 1) return 'Ontem';
    return 'Há ' + days + ' dias';
  }

  function getInitials(value) {
    return normalizeText(value)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join('') || 'CL';
  }

  function getRepository() {
    return window.Doke && window.Doke.repositories && window.Doke.repositories.reviews || null;
  }

  function getTargetProfessionalIds(shell) {
    var params = new URLSearchParams(window.location.search || '');
    return [
      params.get('professionalId'),
      params.get('providerId'),
      params.get('profileId'),
      shell && shell.dataset.professionalId,
      shell && shell.dataset.providerId
    ].map(normalizeText).filter(Boolean);
  }

  function getTargetProfessionalName(shell) {
    return normalizeText(
      shell && (shell.dataset.professionalName || shell.dataset.providerName)
        || document.querySelector('#profile-title')?.textContent
        || 'Studio Aquarela'
    );
  }

  function reviewMatchesProfile(review, profileIds, professionalName) {
    var ids = (review.profileIds || []).concat([
      review.professionalId,
      review.providerId,
      review.displayProfessionalId,
      review.sourceProfessionalId
    ]).map(normalizeText).filter(Boolean);
    if (profileIds.some(function (id) { return ids.indexOf(id) !== -1; })) return true;
    if (professionalName && normalizeKey(review.professionalName || review.providerName) === normalizeKey(professionalName)) return true;
    return false;
  }

  function buildReviewCard(review) {
    var author = normalizeText(review.clientName || review.authorName || review.author || 'Cliente Doke');
    var serviceTitle = normalizeText(review.serviceTitle || review.service || 'Serviço Doke');
    var comment = normalizeText(review.comment || review.text || 'Avaliação registrada pelo cliente após atendimento concluído.');
    var rating = formatRating(review.rating || 5);
    return '' +
      '<article class="doke-review-item doke-review-item--local" data-rating="' + escapeHtml(String(review.rating || 5)) + '" data-review-id="' + escapeHtml(review.id || '') + '" data-review-source="local">' +
        '<span aria-hidden="true" class="doke-review-avatar">' + escapeHtml(review.avatarText || getInitials(author)) + '</span>' +
        '<div class="doke-review-content">' +
          '<div class="doke-review-author"><strong>' + escapeHtml(author) + '</strong><span>' + escapeHtml(serviceTitle) + ' · Pedido verificado</span></div>' +
          '<p class="doke-review-text">' + escapeHtml(comment) + '</p>' +
          '<div class="doke-review-footer"><span class="doke-review-date">' + escapeHtml(getRelativeDateLabel(review.createdAt || review.reviewedAt)) + '</span><span class="doke-review-more">Avaliação do pedido</span></div>' +
        '</div>' +
        '<div class="doke-review-badges"><span class="doke-review-rating"><span>★</span> ' + escapeHtml(rating) + '</span><span class="doke-review-verified">✓ Verificada</span></div>' +
      '</article>';
  }

  function updateSummary(shell, reviews) {
    var scoreNode = shell.querySelector('.doke-reviews-scoreline__score');
    var countNode = shell.querySelector('.doke-reviews-count');
    var visibleCountNode = shell.querySelector('.doke-reviews-visible-count');
    var existingCards = shell.querySelectorAll('.doke-review-list .doke-review-item:not([data-review-source="local"])').length;
    var localCount = reviews.length;
    var totalVisible = existingCards + localCount;

    if (visibleCountNode) {
      visibleCountNode.textContent = totalVisible + ' comentário' + (totalVisible === 1 ? ' exibido' : 's exibidos');
    }

    if (scoreNode || countNode) {
      var totalCount = BASE_REVIEW_COUNT + localCount;
      var scoreSum = (BASE_REVIEW_SCORE * BASE_REVIEW_COUNT) + reviews.reduce(function (sum, review) {
        return sum + (Number(review.rating) || 5);
      }, 0);
      var nextScore = totalCount ? scoreSum / totalCount : BASE_REVIEW_SCORE;
      if (scoreNode) scoreNode.textContent = formatRating(nextScore);
      if (countNode) countNode.textContent = '· ' + totalCount + ' avaliações verificadas';
    }
  }

  function hydrateProfileReviews() {
    var shell = document.querySelector('[data-reviews-scope="profile"]');
    if (!shell) return;
    if (shell.dataset.profileReviewsInitialized === REVIEW_PAGE_VERSION) return;
    shell.dataset.profileReviewsInitialized = REVIEW_PAGE_VERSION;

    var list = shell.querySelector('[data-reviews-list]');
    var repository = getRepository();
    if (!list || !repository || typeof repository.listLocal !== 'function') return;

    var profileIds = getTargetProfessionalIds(shell);
    var professionalName = getTargetProfessionalName(shell);
    var reviews = repository.listLocal({ currentUser: false }).filter(function (review) {
      return reviewMatchesProfile(review, profileIds, professionalName);
    });

    if (!reviews.length) {
      updateSummary(shell, []);
      return;
    }

    list.querySelectorAll('[data-review-source="local"]').forEach(function (item) { item.remove(); });
    list.insertAdjacentHTML('afterbegin', reviews.map(buildReviewCard).join(''));
    updateSummary(shell, reviews);
  }

  window.DokeInitProfileReviews = hydrateProfileReviews;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateProfileReviews, { once: true });
  } else {
    hydrateProfileReviews();
  }

  document.addEventListener('doke:profile-review-created', hydrateProfileReviews);
})();
