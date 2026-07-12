/* Doke wallet experience
   Responsibility: wallet cache, stale-while-revalidate state, domain
   invalidation and optimistic mutation coordination for carteira.html. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var STALE_TIME = 12000;
  var snapshot = null;
  var activeKey = '';

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      return Doke.session.getCurrentUser() || null;
    }
    try {
      var raw = window.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function getCacheKey() {
    var user = getCurrentUser() || {};
    return 'wallet:' + String(user.id || 'guest') + ':' + String(user.role || 'guest');
  }

  function setPageState(state, detail) {
    var boundary = document.querySelector('[data-state-boundary="carteira"]') || document.querySelector('.wallet-page');
    if (Doke.experience && Doke.experience.states) {
      Doke.experience.states.set(boundary, state, Object.assign({ domain: 'wallet' }, detail || {}));
    } else if (boundary) {
      boundary.dataset.viewState = state;
      boundary.dataset.experienceState = state;
      boundary.setAttribute('aria-busy', ['loading', 'refreshing', 'submitting'].indexOf(state) !== -1 ? 'true' : 'false');
    }
    if (document.body) document.body.dataset.walletExperienceState = state;
  }

  function emitUpdated(wallet, detail) {
    snapshot = wallet ? clone(wallet) : wallet;
    document.dispatchEvent(new CustomEvent('doke:wallet-experience-updated', {
      detail: Object.assign({ wallet: clone(snapshot), cacheKey: activeKey || getCacheKey() }, detail || {})
    }));
    return snapshot;
  }

  function load(fetcher, options) {
    options = options || {};
    if (typeof fetcher !== 'function') return Promise.reject(new Error('Wallet fetcher is required.'));

    var key = getCacheKey();
    activeKey = key;
    var cache = Doke.experience && Doke.experience.cache;
    setPageState(snapshot ? 'refreshing' : 'loading', { cacheKey: key });

    if (!cache || typeof cache.query !== 'function') {
      return Promise.resolve().then(fetcher).then(function (wallet) {
        emitUpdated(wallet, { source: 'repository', stale: false });
        setPageState(wallet ? 'ready' : 'empty', { cacheKey: key });
        return { data: clone(wallet), source: 'repository', stale: false, revalidate: null };
      }).catch(function (error) {
        setPageState(navigator.onLine === false ? 'offline' : 'error', { cacheKey: key, error: error && error.message });
        throw error;
      });
    }

    return cache.query({
      key: key,
      staleTime: STALE_TIME,
      keepPreviousData: true,
      force: options.force === true,
      fetcher: fetcher
    }).then(function (result) {
      emitUpdated(result.data, { source: result.source, stale: result.stale === true });
      setPageState(result.stale ? 'refreshing' : (result.data ? 'ready' : 'empty'), { cacheKey: key });

      if (result.revalidate && typeof result.revalidate.then === 'function') {
        result.revalidate.then(function (freshWallet) {
          emitUpdated(freshWallet, { source: 'revalidate', stale: false });
          setPageState(freshWallet ? 'ready' : 'empty', { cacheKey: key });
        }).catch(function (error) {
          setPageState(snapshot ? 'ready' : (navigator.onLine === false ? 'offline' : 'error'), {
            cacheKey: key,
            error: error && error.message
          });
        });
      }
      return result;
    }).catch(function (error) {
      setPageState(snapshot ? 'ready' : (navigator.onLine === false ? 'offline' : 'error'), {
        cacheKey: key,
        error: error && error.message
      });
      throw error;
    });
  }

  function prime(wallet) {
    snapshot = wallet ? clone(wallet) : wallet;
    activeKey = getCacheKey();
    var cache = Doke.experience && Doke.experience.cache;
    if (cache && typeof cache.write === 'function') {
      cache.write(activeKey, clone(snapshot), { staleTime: STALE_TIME });
    }
    return clone(snapshot);
  }

  function invalidate() {
    var cache = Doke.experience && Doke.experience.cache;
    if (cache && typeof cache.invalidatePrefix === 'function') cache.invalidatePrefix('wallet:');
    if (Doke.stableShellRouter && typeof Doke.stableShellRouter.invalidate === 'function') {
      Doke.stableShellRouter.invalidate('carteira.html');
    }
    document.dispatchEvent(new CustomEvent('doke:wallet-experience-invalidated'));
  }

  function mutate(options) {
    options = options || {};
    var optimistic = Doke.experience && Doke.experience.optimistic;
    if (!optimistic || typeof optimistic.mutate !== 'function') {
      return Promise.resolve()
        .then(function () { return typeof options.apply === 'function' ? options.apply() : undefined; })
        .then(function (localSnapshot) {
          return Promise.resolve().then(options.request).then(function (result) {
            if (typeof options.commit === 'function') options.commit(result, localSnapshot);
            return result;
          }).catch(function (error) {
            if (typeof options.rollback === 'function') options.rollback(localSnapshot, error);
            throw error;
          });
        });
    }

    return optimistic.mutate({
      key: options.key,
      boundary: document.querySelector('[data-state-boundary="carteira"]') || document.querySelector('.wallet-page'),
      apply: options.apply,
      request: options.request,
      commit: options.commit,
      rollback: options.rollback,
      finalState: options.finalState || 'ready'
    });
  }

  [
    'doke:auth-session-change',
    'doke:payment-confirmed',
    'doke:order-completed',
    'doke:wallet-receivable-created',
    'doke:wallet-receivable-updated',
    'doke:wallet-withdraw-requested',
    'doke:wallet-withdraw-completed',
    'doke:wallet-withdraw-resolved',
    'doke:wallet-bank-account-saved',
    'doke:wallet-dispute-opened',
    'doke:wallet-dispute-resolved'
  ].forEach(function (eventName) {
    document.addEventListener(eventName, invalidate);
  });

  Doke.walletExperience = Object.freeze({
    load: load,
    prime: prime,
    invalidate: invalidate,
    mutate: mutate,
    setState: setPageState,
    getSnapshot: function () { return clone(snapshot); },
    getCacheKey: getCacheKey
  });
})();
