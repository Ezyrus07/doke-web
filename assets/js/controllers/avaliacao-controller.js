(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'avaliacao';
  var latestSnapshot = null;

  function getSearchParams() {
    try {
      return new URLSearchParams(window.location.search || '');
    } catch (error) {
      return new URLSearchParams('');
    }
  }

  function getText(root, selector) {
    var node = root && root.querySelector(selector);
    return node ? String(node.textContent || '').trim() : '';
  }

  function getImageSource(root, selector) {
    var node = root && root.querySelector(selector);
    return node ? String(node.getAttribute('src') || '').trim() : '';
  }

  function readCompetencies(root) {
    return Array.prototype.slice.call(root ? root.querySelectorAll('[data-competency]') : [])
      .reduce(function (result, row) {
        var key = row.getAttribute('data-competency');
        if (!key) return result;
        result[key] = {
          score: Number(row.getAttribute('data-score') || 0),
          comment: ''
        };
        var comment = root.querySelector('[data-review-topic-comment="' + key + '"]');
        if (comment) result[key].comment = String(comment.value || '').trim();
        return result;
      }, {});
  }

  function readRating(root) {
    var activeStars = Array.prototype.slice.call(root ? root.querySelectorAll('[data-review-star].is-active') : []);
    var lastActive = activeStars[activeStars.length - 1];
    return lastActive ? Number(lastActive.getAttribute('data-review-star') || 0) : 0;
  }

  function readDraft(root) {
    var note = root && root.querySelector('[data-review-note]');
    var anonymous = root && root.querySelector('[data-review-anonymous]');
    return {
      rating: readRating(root),
      competencies: readCompetencies(root),
      comment: note ? String(note.value || '').trim() : '',
      anonymous: Boolean(anonymous && anonymous.checked)
    };
  }

  function readPageContext() {
    var params = getSearchParams();
    var root = document.querySelector('[data-review-page]');
    var professional = params.get('professional') || getText(root, '[data-review-professional]') || 'Studio Aquarela';

    return {
      reviewId: params.get('reviewId') || null,
      orderId: params.get('orderId') || params.get('pedido') || null,
      conversationId: params.get('conversation') || 'painting',
      serviceId: params.get('serviceId') || null,
      professional: professional,
      amount: params.get('amount') || null,
      avatar: params.get('avatar') || getImageSource(root, '[data-review-avatar]') || 'assets/img/auth/carpenter-cutout.png',
      title: params.get('title') || ('Avaliar ' + professional),
      draft: readDraft(root),
      hasRoot: Boolean(root),
      visualContract: 'provisional-layout-preserved'
    };
  }

  function writeState(patch) {
    if (!Doke.state || typeof Doke.state.merge !== 'function') return;
    Doke.state.merge('controllers.' + PAGE_NAME, patch);
  }

  function markBoundaryReady(context) {
    writeState({
      ready: true,
      page: PAGE_NAME,
      mode: 'review-boundary',
      dataStatus: 'initializing',
      context: context,
      hooks: {
        root: '[data-review-page]',
        professional: '[data-review-professional]',
        avatar: '[data-review-avatar]',
        overallRating: '[data-review-star], [data-review-overall-value]',
        competencies: '[data-competency], [data-review-competency-star]',
        comments: '[data-review-note], [data-review-topic-comment]',
        anonymous: '[data-review-anonymous]',
        submit: '[data-review-submit]',
        back: '[data-review-back]'
      }
    });
  }

  function loadPageData(context) {
    if (Doke.controllerData && typeof Doke.controllerData.loadForPage === 'function') {
      return Doke.controllerData.loadForPage(PAGE_NAME).then(function (data) {
        writeState({
          dataStatus: 'ready',
          reviewId: context.reviewId,
          orderId: context.orderId,
          conversationId: context.conversationId,
          source: 'controller-data-boundary'
        });
        return data;
      });
    }

    writeState({
      dataStatus: 'idle',
      source: 'controller-data-unavailable'
    });
    return Promise.resolve({});
  }

  function init(runtimeContext) {
    var context = readPageContext();
    markBoundaryReady(context);
    return loadPageData(context).then(function (data) {
      latestSnapshot = {
        context: context,
        data: data,
        runtimeContext: runtimeContext || {}
      };
      return data;
    });
  }

  Doke.reviewController = Object.freeze({
    readPageContext: readPageContext,
    readDraft: function () { return readDraft(document.querySelector('[data-review-page]')); },
    init: init,
    getLatest: function () { return latestSnapshot; }
  });

  if (Doke.controllers) Doke.controllers.register(PAGE_NAME, { init: init });
})();
