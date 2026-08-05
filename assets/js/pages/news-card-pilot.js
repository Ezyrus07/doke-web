(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260804-ux-cards-001-news-v1';
  var applied = false;

  function unique(nodes) {
    return Array.prototype.filter.call(nodes, function (node, index, list) {
      return list.indexOf(node) === index;
    });
  }

  function collectCards(scope) {
    return unique(Array.prototype.slice.call(scope.querySelectorAll(
      '.news-feature, [data-news-card], [data-news-important-card]'
    )));
  }

  function renderTier(index) {
    return index < 4
      ? Doke.cardExperience.renderTiers.INITIAL
      : Doke.cardExperience.renderTiers.DEFERRED;
  }

  function apply() {
    var authority = Doke.cardExperience;
    var scope = document.querySelector('[data-news-page]');
    if (!authority || !scope) return null;

    var cards = collectCards(scope);
    var plan = authority.createRenderPlan(cards, { initialCount: Math.min(cards.length, 4) });

    cards.forEach(function (card, index) {
      var descriptor = authority.normalizeEditorialCard({
        id: card.dataset.newsId || ('news-card-' + index),
        editorial: true
      }, {
        surface: 'news',
        authority: authority.authorities.PLATFORM_EDITORIAL,
        renderTier: renderTier(index),
        identityApplicable: false
      });

      authority.attachCard(card, descriptor);

      var media = card.querySelector(
        '.news-feature__icon, .news-card__icon, .news-important-card__icon, [data-news-card-media]'
      );
      if (media) {
        media.dataset.dokeCardMedia = '';
        authority.markMedia(media, authority.mediaStates.EMPTY, descriptor);
        card.dataset.dokeCardMediaState = authority.mediaStates.EMPTY;
      }

      var categoryBadge = card.querySelector(
        '.news-kicker, [data-news-category-label], [data-news-detail-category]'
      );
      authority.annotateBadge(
        categoryBadge,
        'content_category',
        authority.authorities.PLATFORM_EDITORIAL
      );
    });

    applied = true;
    var report = authority.audit(scope);
    document.dispatchEvent(new CustomEvent('doke:news-card-pilot-ready', {
      detail: {
        version: VERSION,
        cards: report.cards,
        initialCards: plan.initialCount,
        deferredCards: plan.deferred.length
      }
    }));
    return report;
  }

  function schedule() {
    root.setTimeout(apply, 0);
  }

  Doke.newsCardPilot = Object.freeze({
    version: VERSION,
    apply: apply,
    getState: function () { return applied ? 'ready' : 'idle'; }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  document.addEventListener('doke:navigation-lifecycle-route', function (event) {
    var state = event && event.detail && event.detail.state;
    if (state === 'ready' || state === 'empty' || state === 'committed') schedule();
  });
}());
