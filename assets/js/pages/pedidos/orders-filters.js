/* Doke pedidos — filters.
   Responsibility: bind existing filter buttons to the orders state store. */
(function () {
  const ns = (window.DokeOrders = window.DokeOrders || {});
  const data = ns.data;

  const closePanel = () => {
    const panel = data.qs('[data-orders-filters-popover]');
    if (!panel) return;
    panel.hidden = true;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    data.qsa('[data-orders-filter-toggle]').forEach((toggle) => toggle.setAttribute('aria-expanded', 'false'));
  };

  const openPanel = () => {
    const panel = data.qs('[data-orders-filters-popover]');
    if (!panel) return;
    panel.hidden = false;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    data.qsa('[data-orders-filter-toggle]').forEach((toggle) => toggle.setAttribute('aria-expanded', 'true'));
  };

  const bind = () => {
    document.addEventListener('click', (event) => {
      const toggle = event.target.closest('[data-orders-filter-toggle]');
      if (toggle) {
        const panel = data.qs('[data-orders-filters-popover]');
        if (panel) {
          event.preventDefault();
          panel.hidden ? openPanel() : closePanel();
        }
        return;
      }

      const item = event.target.closest('[data-filter]');
      if (item) {
        event.preventDefault();
        ns.state.setFilter(item.dataset.filter || 'all');
        return;
      }

      const clear = event.target.closest('[data-orders-clear-filter]');
      if (clear) {
        event.preventDefault();
        ns.state.setFilter('all');
        closePanel();
        return;
      }

      if (event.target.closest('[data-doke-panel-close]')) {
        closePanel();
      }
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePanel();
    }, true);
  };

  ns.filters = Object.freeze({
    bind,
    openPanel,
    closePanel
  });
})();
