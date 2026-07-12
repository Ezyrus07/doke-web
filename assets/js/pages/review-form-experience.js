(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  var core = Doke.formExperienceCore;
  if (!core) return;
  var params = new URLSearchParams(location.search || '');
  var store = core.createDraftStore({
    prefix: 'doke.review-draft.v1',
    context: function () { return params.get('order') || params.get('orderId') || params.get('conversation') || params.get('conversationId') || 'generic'; }
  });
  var boundary = document.querySelector('[data-state-boundary="avaliacao-profissional"]') || document.querySelector('[data-pro-review-page]');
  var setState = core.createStateController({ boundary: boundary, bodyDatasetKey: 'reviewExperienceState' });
  function invalidate() {
    core.invalidate({
      domains: ['profiles', 'orders', 'marketplace', 'notifications', 'detailAd'],
      reason: 'review-created'
    });
  }
  Doke.reviewFormExperience = Object.freeze({
    key: store.key,
    setState: setState,
    saveDraft: function (payload) { try { store.write(payload || {}); return true; } catch (_) { return false; } },
    loadDraft: store.read,
    clearDraft: store.clear,
    invalidate: invalidate,
    normalize: core.normalize
  });
})();
