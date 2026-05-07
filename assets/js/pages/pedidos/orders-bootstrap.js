/* Doke pedidos — command center bootstrap.
   Wires data, intelligence, state, filters and render layers together. */
(function () {
  const ns = (window.DokeOrders = window.DokeOrders || {});

  const pageReady = () => document.body?.dataset.page === 'pedidos';

  const init = () => {
    if (!pageReady() || !ns.data || !ns.intelligence || !ns.state || !ns.render) return;

    const orders = ns.data.readOrders();
    ns.state.subscribe(ns.render.render);
    ns.state.setOrders(orders);

    if (ns.filters?.bind) {
      ns.filters.bind();
    }

    document.dispatchEvent(new CustomEvent('doke:orders-command-center-ready', {
      detail: {
        version: 'v2',
        total: orders.length
      }
    }));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
