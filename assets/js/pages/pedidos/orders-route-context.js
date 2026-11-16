/* Orders route context: resume the order named by ?order= after authorized list hydration.
   Page-only presentation. The server/repository remains the sole source of visible orders. */
(() => {
  'use strict';

  if (window.__dokeOrdersRouteContextBound) return;
  window.__dokeOrdersRouteContextBound = true;

  let hydrated = false;
  let highlighted = null;
  let focused = null;

  const rootForPage = () => document.body?.dataset.page === 'pedidos'
    ? document.querySelector('.orders-page')
    : null;

  const routeOrderId = () => {
    const id = new URLSearchParams(window.location.search).get('order');
    return typeof id === 'string' && id.trim().length <= 256 ? id.trim() : '';
  };

  const clearHighlight = () => {
    if (!highlighted) return;
    highlighted.classList.remove('is-route-highlighted');
    highlighted.removeAttribute('aria-current');
    if (highlighted.dataset.ordersRouteTabindex === 'added') {
      highlighted.removeAttribute('tabindex');
      delete highlighted.dataset.ordersRouteTabindex;
    }
    highlighted = null;
    focused = null;
  };

  const clearFeedback = () => {
    document.querySelectorAll('[data-orders-route-feedback]').forEach((element) => element.remove());
  };

  const reset = () => {
    clearHighlight();
    clearFeedback();
  };

  const reportUnavailable = (root) => {
    let feedback = root.querySelector('[data-orders-route-feedback]');
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.dataset.ordersRouteFeedback = '';
      feedback.className = 'orders-route-feedback doke-page-section';
      feedback.setAttribute('role', 'status');
      const list = root.querySelector('.orders-list');
      if (!list) return;
      list.before(feedback);
    }
    feedback.textContent = 'Este pedido não está disponível nesta conta. Confira a lista abaixo.';
  };

  const focusVisibleCard = (card, list) => {
    if (!card.isConnected || card.hidden || list.hidden || card.getAttribute('aria-hidden') === 'true') return;
    if (card === focused) return;

    // Restore route focus only when the browser is on its neutral page focus.
    // Never override a control that the user has focused while hydration settles.
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement &&
        active !== card && active.tagName !== 'MAIN' &&
        !active.hasAttribute?.('data-doke-main-landmark')) return;

    if (!card.hasAttribute('tabindex')) {
      card.tabIndex = -1;
      card.dataset.ordersRouteTabindex = 'added';
    }
    card.focus({ preventScroll: true });
    card.scrollIntoView?.({ block: 'center', behavior: 'auto' });
    focused = card;
  };

  const sync = () => {
    const root = rootForPage();
    const orderId = routeOrderId();
    if (!root || !orderId) {
      reset();
      return;
    }
    if (!hydrated) return;

    const list = root.querySelector('.orders-list');
    if (!list) return;
    const card = Array.from(list.querySelectorAll('.order-card[data-id]'))
      .find((candidate) => candidate.dataset.id === orderId);

    if (!card) {
      clearHighlight();
      reportUnavailable(root);
      return;
    }

    clearFeedback();
    if (highlighted !== card) {
      clearHighlight();
      highlighted = card;
      card.classList.add('is-route-highlighted');
      card.setAttribute('aria-current', 'location');
    }
    window.requestAnimationFrame(() => {
      if (highlighted === card && rootForPage() === root && routeOrderId() === orderId) {
        focusVisibleCard(card, list);
      }
    });
  };

  document.addEventListener('doke:orders-list-hydrated', () => {
    hydrated = true;
    sync();
  });
  document.addEventListener('doke:page-hydration-ready', (event) => {
    if (event.detail?.page === 'pedidos') sync();
  });
  document.addEventListener('doke:auth-session-change', () => {
    hydrated = false;
    reset();
  });
  document.addEventListener('doke:route-leaving', (event) => {
    if (event.detail?.from === '/pedidos.html') {
      hydrated = false;
      reset();
    }
  });
  // The stable-shell route may focus its main landmark after the order list
  // becomes ready. Re-establish the requested order's focus only on that
  // route's terminal settlement, without changing global navigation policy.
  document.addEventListener('doke:navigation-lifecycle-route', (event) => {
    const detail = event.detail || {};
    if (detail.to !== '/pedidos.html' || !['ready', 'empty'].includes(detail.state)) return;
    if (!highlighted || !rootForPage() || !routeOrderId()) return;
    focused = null;
    sync();

    // The navigation layer may restore main-landmark focus after its ready
    // event. Correct it once, after that frame, only if focus is still on
    // the main landmark. Never steal focus from a user-chosen control.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const card = highlighted;
      const main = document.activeElement;
      if (!card?.isConnected || !rootForPage()?.contains(card)) return;
      if (!routeOrderId() || routeOrderId() !== card.dataset.id) return;
      if (!(main?.tagName === 'MAIN' || main?.hasAttribute?.('data-doke-main-landmark'))) return;
      focused = null;
      sync();
    }));
  });
  window.addEventListener('popstate', sync);

  const onInitialPage = () => {
    const root = rootForPage();
    const list = root?.querySelector('.orders-list');
    if (list?.dataset.localOrdersRendered === 'true' && document.body.dataset.ordersAudience) {
      hydrated = true;
      sync();
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onInitialPage, { once: true });
  } else {
    onInitialPage();
  }
})();
