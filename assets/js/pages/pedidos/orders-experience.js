/* Doke pedidos — experience contract.
   Responsibility: role-scoped stale-while-revalidate cache, page state and
   optimistic order mutations. It does not own card anatomy or visual layout. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var ns = window.DokeOrders || (window.DokeOrders = {});
  var STALE_TIME = 15000;

  function getUser() {
    try {
      return Doke.session && typeof Doke.session.getCurrentUser === 'function'
        ? Doke.session.getCurrentUser()
        : null;
    } catch (error) {
      return null;
    }
  }

  function getRole(user) {
    return user && (user.role === 'professional' || user.role === 'client')
      ? user.role
      : 'guest';
  }

  function getKey(user) {
    user = user || getUser() || {};
    return ['orders', user.id || 'guest', getRole(user)].join(':');
  }

  function getBoundary() {
    return document.querySelector('.orders-page') || document.querySelector('[data-page="pedidos"]');
  }

  function setState(state, detail) {
    if (Doke.experience && Doke.experience.states) {
      Doke.experience.states.set(getBoundary(), state, detail || {});
    }
    if (document.body && document.body.dataset.page === 'pedidos') {
      document.body.dataset.ordersExperienceState = state;
    }
  }

  function listCurrentUser() {
    var service = Doke.services && Doke.services.orders;
    if (!service || typeof service.listForCurrentUser !== 'function') {
      return Promise.reject(new Error('Serviço de pedidos indisponível.'));
    }
    return service.listForCurrentUser({ fresh: true });
  }

  function load(options) {
    options = options || {};
    var user = getUser() || {};
    var key = getKey(user);
    var cache = Doke.experience && Doke.experience.cache;

    if (!cache) {
      setState('loading', { key: key });
      return listCurrentUser().then(function (orders) {
        setState(orders && orders.length ? 'ready' : 'empty', { key: key });
        return { data: orders || [], stale: false, source: 'service', revalidate: null };
      }).catch(function (error) {
        setState(navigator.onLine === false ? 'offline' : 'error', { key: key, error: error.message });
        throw error;
      });
    }

    var existing = cache.get(key);
    setState(existing && Object.prototype.hasOwnProperty.call(existing, 'data') ? 'refreshing' : 'loading', { key: key });

    return cache.query({
      key: key,
      staleTime: STALE_TIME,
      keepPreviousData: true,
      force: options.force === true,
      fetcher: listCurrentUser
    }).then(function (result) {
      var data = Array.isArray(result.data) ? result.data : [];
      setState(data.length ? (result.stale ? 'refreshing' : 'ready') : 'empty', { key: key, source: result.source });

      if (result.revalidate) {
        result.revalidate.then(function (fresh) {
          document.dispatchEvent(new CustomEvent('doke:orders-experience-updated', {
            detail: { orders: Array.isArray(fresh) ? fresh : [], key: key }
          }));
          setState(fresh && fresh.length ? 'ready' : 'empty', { key: key, source: 'revalidate' });
        }).catch(function (error) {
          setState(navigator.onLine === false ? 'offline' : 'error', { key: key, error: error.message });
        });
      }

      return result;
    }).catch(function (error) {
      setState(navigator.onLine === false ? 'offline' : 'error', { key: key, error: error.message });
      throw error;
    });
  }

  function invalidate() {
    var domainInvalidation = Doke.experience && Doke.experience.invalidation;
    if (domainInvalidation && typeof domainInvalidation.invalidateDomains === 'function') {
      return domainInvalidation.invalidateDomains(['orders', 'messages', 'notifications'], {
        reason: 'orders-experience'
      });
    }
    var cache = Doke.experience && Doke.experience.cache;
    if (cache && typeof cache.invalidatePrefix === 'function') cache.invalidatePrefix('orders:');
    if (Doke.stableShellRouter && typeof Doke.stableShellRouter.invalidate === 'function') {
      Doke.stableShellRouter.invalidate('pedidos.html');
      Doke.stableShellRouter.invalidate('notificacoes.html');
      Doke.stableShellRouter.invalidate('mensagens.html');
    }
    return null;
  }

  function snapshotCard(card) {
    if (!card) return null;
    return {
      card: card,
      parent: card.parentNode,
      next: card.nextSibling,
      html: card.outerHTML,
      controls: Array.from(card.querySelectorAll('button, a')).map(function (control) {
        return {
          control: control,
          disabled: Boolean(control.disabled),
          ariaDisabled: control.getAttribute('aria-disabled')
        };
      })
    };
  }

  function restoreCard(snapshot) {
    if (!snapshot || !snapshot.parent) return;
    if (snapshot.card && snapshot.card.isConnected) {
      snapshot.card.removeAttribute('data-order-mutation');
      snapshot.card.setAttribute('aria-busy', 'false');
      (snapshot.controls || []).forEach(function (item) {
        if (!item.control || !item.control.isConnected) return;
        item.control.disabled = item.disabled;
        if (item.ariaDisabled == null) item.control.removeAttribute('aria-disabled');
        else item.control.setAttribute('aria-disabled', item.ariaDisabled);
        item.control.removeAttribute('data-was-disabled');
      });
      return;
    }
    var wrapper = document.createElement('div');
    wrapper.innerHTML = snapshot.html;
    var restored = wrapper.firstElementChild;
    snapshot.parent.insertBefore(restored, snapshot.next && snapshot.next.parentNode === snapshot.parent ? snapshot.next : null);
  }

  function mutateStatus(options) {
    options = options || {};
    var orderId = String(options.orderId || '');
    var card = options.card || document.querySelector('.order-card[data-id="' + CSS.escape(orderId) + '"]');
    var action = options.action;
    var service = Doke.services && Doke.services.orders;
    if (!orderId || !service || typeof service[action] !== 'function') {
      return Promise.reject(new Error('Ação de pedido indisponível.'));
    }

    var runner = Doke.experience && Doke.experience.optimistic;
    var execute = function () {
      return service[action].apply(service, [orderId].concat(options.args || []));
    };

    if (!runner) return execute().then(function (result) { invalidate(); return result; });

    return runner.mutate({
      key: ['orders', action, orderId].join(':'),
      boundary: card,
      finalState: 'ready',
      apply: function () {
        var snapshot = snapshotCard(card);
        if (card) {
          card.dataset.orderMutation = action;
          card.setAttribute('aria-busy', 'true');
          Array.from(card.querySelectorAll('button, a')).forEach(function (control) {
            control.dataset.wasDisabled = control.disabled ? 'true' : 'false';
            control.disabled = true;
            control.setAttribute('aria-disabled', 'true');
          });
        }
        return snapshot;
      },
      request: execute,
      commit: function (result) {
        invalidate();
        document.dispatchEvent(new CustomEvent('doke:orders-experience-committed', {
          detail: { order: result, action: action, orderId: orderId }
        }));
      },
      rollback: function (snapshot, error) {
        restoreCard(snapshot);
        document.dispatchEvent(new CustomEvent('doke:orders-experience-rollback', {
          detail: { action: action, orderId: orderId, error: error && error.message }
        }));
      }
    });
  }

  ns.experience = Object.freeze({
    load: load,
    invalidate: invalidate,
    getKey: getKey,
    mutateStatus: mutateStatus,
    setState: setState
  });

  if (!(Doke.experience && Doke.experience.invalidation)) {
    ['doke:auth-session-change', 'doke:order-created', 'doke:order-status-changed'].forEach(function (name) {
      document.addEventListener(name, function () { invalidate(); });
    });
  }
})();
