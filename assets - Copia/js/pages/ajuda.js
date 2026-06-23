(() => {
  const initHelpCenter = () => {
    const root = document.querySelector('[data-help-center]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    window.DokeHomeDrawer?.create?.()();

    const filters = [...root.querySelectorAll('[data-help-filter]')];
    const cardsGrid = root.querySelector('[data-help-cards]');
    const cards = [...root.querySelectorAll('[data-help-card]')];
    const search = root.querySelector('[data-help-search]');
    const faqItems = [...root.querySelectorAll('[data-help-faq]')];
    const empty = document.createElement('div');
    empty.className = 'help-empty-state';
    empty.textContent = 'Nenhum resultado encontrado. Tente buscar por outro termo ou abra um chamado com o suporte.';
    empty.hidden = true;
    cardsGrid?.appendChild(empty);

    let activeCategory = 'all';

    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const applyFilter = () => {
      const term = normalize(search?.value);
      let visibleCount = 0;

      cards.forEach((card) => {
        const category = card.dataset.helpCategory || 'all';
        const text = normalize(card.textContent);
        const matchesCategory = activeCategory === 'all' || category === activeCategory;
        const matchesSearch = !term || text.includes(term);
        const visible = matchesCategory && matchesSearch;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      empty.hidden = visibleCount !== 0;
    };

    filters.forEach((button) => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.helpFilter || 'all';
        filters.forEach((item) => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        applyFilter();
      });
    });

    search?.addEventListener('input', applyFilter);

    faqItems.forEach((details) => {
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        faqItems.forEach((item) => {
          if (item !== details) item.open = false;
        });
      });
    });

    const requestedHash = window.location.hash.replace('#', '');
    if (requestedHash) {
      const target = document.getElementById(requestedHash);
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }

    applyFilter();
  };

  window.DokeInitHelpCenter = initHelpCenter;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHelpCenter, { once: true });
  } else {
    initHelpCenter();
  }
})();
