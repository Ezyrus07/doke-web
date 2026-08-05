(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var VERSION = '20260804-ux-perf-001-news-v1';
  var journey = null;
  var observer = null;
  var idleAudit = null;

  function getRoot() {
    return document.querySelector('[data-state-boundary="novidades"], [data-news-page]');
  }

  function hasUsefulContent(root) {
    return Boolean(root && root.querySelector('h1') && root.querySelector('[data-news-card], .news-feature'));
  }

  function isInteractive(root) {
    return Boolean(root && (root.dataset.ready === 'true' || window.DokeInitNews || window.DokeInitNewsPage));
  }

  function releasePreloader(source) {
    var preloader = document.querySelector('[data-news-document-preloader], [data-doke-document-preloader]');
    if (!preloader || preloader.hidden || preloader.getAttribute('aria-hidden') === 'true') return false;
    if (!window.DokeDocumentPreloader || typeof window.DokeDocumentPreloader.release !== 'function') return false;
    window.DokeDocumentPreloader.release(source || 'news-first-useful-content');
    return true;
  }

  function sync() {
    var root = getRoot();
    if (!root || !journey) return false;
    if (hasUsefulContent(root)) {
      journey.markContentReady({ source: 'static-editorial-content' });
      releasePreloader('news-first-useful-content');
    }
    if (isInteractive(root)) journey.markInteractive({ source: 'news-bindings-ready' });
    return journey.isTerminal();
  }

  function scheduleAudit() {
    if (!Doke.performanceExperience || idleAudit) return;
    idleAudit = Doke.performanceExperience.scheduleOptional({
      id: 'news.post-paint-audit',
      journeyId: journey.id,
      timeout: 900,
      allowSaveData: false,
      run: function () {
        var responsive = Doke.responsiveExperience;
        if (responsive && typeof responsive.auditOverflow === 'function') {
          responsive.auditOverflow({ source: 'news-performance-pilot' });
        }
        return Doke.performanceExperience.getSnapshot();
      }
    });
    idleAudit.promise.catch(function () {});
  }

  function start() {
    if (!Doke.performanceExperience) return null;
    if (journey) return journey;
    journey = Doke.performanceExperience.startJourney({
      id: 'news-first-useful-content',
      route: 'novidades',
      source: 'news-performance-pilot',
      budgets: {
        shellReadyMs: 1800,
        firstUsefulContentMs: 2200,
        interactiveMs: 3000,
        settleMs: 3800
      }
    });
    journey.markShellReady({ source: 'static-shell-present' });
    sync();
    scheduleAudit();

    var root = getRoot();
    if (root && typeof MutationObserver === 'function' && !journey.isTerminal()) {
      observer = new MutationObserver(function () {
        if (sync() && observer) {
          observer.disconnect();
          observer = null;
        }
      });
      observer.observe(root, { attributes: true, childList: true, subtree: true });
    }

    window.addEventListener('doke:news-preference-restored', function () {
      journey.mark('optional-preference-restored', { source: 'account-storage' });
    }, { once: true });
    window.addEventListener('doke:news-experience-error', function () {
      journey.mark('optional-preference-degraded', { source: 'news-experience' });
    }, { once: true });
    return journey;
  }

  var api = Object.freeze({
    version: VERSION,
    start: start,
    sync: sync,
    getSnapshot: function () { return journey ? journey.getSnapshot() : null; }
  });

  Doke.newsPerformancePilot = api;
  start();
}());
