/* Doke pedidos — command center bootstrap.
   Wires data, intelligence, state, filters and render layers together. */
(function () {
  const ns = (window.DokeOrders = window.DokeOrders || {});
  let subscribed = false;
  let filtersBound = false;

  const pageReady = () => document.body?.dataset.page === 'pedidos';

  const syncOrders = () => {
    if (!pageReady() || !ns.data || !ns.state) return false;
    const orders = ns.data.readOrders();
    ns.state.setOrders(orders);
    document.dispatchEvent(new CustomEvent('doke:orders-command-center-ready', {
      detail: {
        version: 'v2',
        total: orders.length
      }
    }));
    return true;
  };

  const scheduleSyncOrders = () => {
    window.requestAnimationFrame(() => {
      syncOrders();
    });
  };

  const init = () => {
    if (!pageReady() || !ns.data || !ns.intelligence || !ns.state || !ns.render) return;

    if (!subscribed) {
      ns.state.subscribe(ns.render.render);
      subscribed = true;
    }

    syncOrders();

    if (!filtersBound && ns.filters?.bind) {
      ns.filters.bind();
      filtersBound = true;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('doke:orders-list-hydrated', scheduleSyncOrders);
  document.addEventListener('doke:auth-surface-ready', scheduleSyncOrders);
  document.addEventListener('doke:auth-session-change', scheduleSyncOrders);
  document.addEventListener('doke:order-created', scheduleSyncOrders);
  document.addEventListener('doke:order-status-changed', scheduleSyncOrders);
  window.setTimeout(scheduleSyncOrders, 180);
  window.setTimeout(scheduleSyncOrders, 520);
})();
