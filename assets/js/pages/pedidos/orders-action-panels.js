/* Pedidos action panels v3
   Final controller for the desktop/mobile action panels.
   It runs after the legacy pedidos scripts and forces the real hidden state. */
(function () {
  const SELECTORS = {
    controls: '#orders-action-controls',
    filtersPanel: '[data-orders-filters-popover]',
    selectPanel: '[data-orders-select-panel]',
    filterToggle: '[data-orders-filter-toggle]',
    selectToggle: '[data-orders-select-toggle]',
  };

  const bind = () => {
    if (!document.body?.classList.contains('orders-page-shell')) return;

    const controls = document.querySelector(SELECTORS.controls);
    const filtersPanel = document.querySelector(SELECTORS.filtersPanel);
    const selectPanel = document.querySelector(SELECTORS.selectPanel);

    if (!controls || !filtersPanel || !selectPanel) return;

    const filterToggles = Array.from(document.querySelectorAll(SELECTORS.filterToggle));
    const selectToggles = Array.from(document.querySelectorAll(SELECTORS.selectToggle));

    const setButtons = (buttons, active) => {
      buttons.forEach((button) => {
        button.setAttribute('aria-expanded', active ? 'true' : 'false');
        button.classList.toggle('is-active', active);
      });
    };

    const syncBodyState = () => {
      document.body.classList.toggle('has-orders-action-panel-open', !controls.hidden);
    };

    const syncSelectionMode = (active) => {
      document.querySelector('.orders-page')?.dispatchEvent(new CustomEvent('doke:orders-selection-panel', {
        bubbles: true,
        detail: { active }
      }));
    };

    const hide = () => {
      controls.hidden = true;
      filtersPanel.hidden = true;
      selectPanel.hidden = true;
      controls.dataset.activePanel = '';
      setButtons(filterToggles, false);
      setButtons(selectToggles, false);
      syncBodyState();
      syncSelectionMode(false);
    };

    const show = (type) => {
      const isFilters = type === 'filters';
      const targetPanel = isFilters ? filtersPanel : selectPanel;
      const otherPanel = isFilters ? selectPanel : filtersPanel;
      const targetButtons = isFilters ? filterToggles : selectToggles;
      const otherButtons = isFilters ? selectToggles : filterToggles;

      const alreadyOpen = !controls.hidden && !targetPanel.hidden;

      if (alreadyOpen) {
        hide();
        return;
      }

      controls.hidden = false;
      targetPanel.hidden = false;
      otherPanel.hidden = true;
      controls.dataset.activePanel = type;

      setButtons(targetButtons, true);
      setButtons(otherButtons, false);
      syncBodyState();
      syncSelectionMode(type === 'select');

      if (!document.body.classList.contains('doke-mobile-shell-mounted')) {
        targetPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };

    window.DokeOrdersActionPanels = {
      close: hide,
      toggleFilters: () => show('filters'),
      toggleSelect: () => show('select'),
      openFilters: () => {
        if (controls.hidden || filtersPanel.hidden) show('filters');
      },
      openSelect: () => {
        if (controls.hidden || selectPanel.hidden) show('select');
      }
    };

    const bindToggle = (button, type) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        show(type);
      }, true);
    };

    filterToggles.forEach((button) => bindToggle(button, 'filters'));
    selectToggles.forEach((button) => bindToggle(button, 'select'));

    controls.addEventListener('click', (event) => {
      const close = event.target.closest('[data-doke-panel-close]');
      if (close && controls.contains(close)) {
        event.preventDefault();
        hide();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !controls.hidden) hide();
    });

    document.addEventListener('click', (event) => {
      if (controls.hidden) return;
      if (event.target.closest(SELECTORS.filterToggle + ', [data-shell-filter]')) return;
      if (event.target.closest(SELECTORS.selectToggle + ', [data-shell-select]')) return;
      if (event.target.closest(SELECTORS.controls)) return;
      hide();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
