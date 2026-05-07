/* Pedidos header search
   Matches the index-style behavior: the search input replaces the icon button in the command group. */
(function () {
  const bind = () => {
    if (!document.body?.classList.contains('orders-page-shell')) return;

    const header = document.querySelector('.orders-page .home-side-meta');
    const searchButton = header?.querySelector('.home-side-meta__search');
    const searchForm = header?.querySelector('.home-side-meta__search-form');
    const searchInput = header?.querySelector('.home-side-meta__search-input');

    if (!header || !searchButton || !searchForm || !searchInput) return;

    const openSearch = () => {
      header.classList.remove('is-search-closing');
      header.classList.add('is-search-open');
      searchButton.setAttribute('aria-expanded', 'true');
      searchForm.removeAttribute('hidden');

      window.requestAnimationFrame(() => {
        searchInput.focus({ preventScroll: true });
      });
    };

    const closeSearch = () => {
      if (searchInput.value.trim()) return;

      header.classList.add('is-search-closing');
      header.classList.remove('is-search-open');
      searchButton.setAttribute('aria-expanded', 'false');

      window.setTimeout(() => {
        if (!header.classList.contains('is-search-open')) {
          searchForm.setAttribute('hidden', '');
          header.classList.remove('is-search-closing');
        }
      }, 180);
    };

    searchButton.setAttribute('aria-expanded', 'false');
    searchButton.setAttribute('aria-controls', searchInput.id || 'desktop-quick-search-orders');
    searchForm.setAttribute('hidden', '');

    searchButton.addEventListener('click', (event) => {
      event.preventDefault();
      openSearch();
    });

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        searchInput.value = '';
        closeSearch();
        searchButton.focus({ preventScroll: true });
      }
    });

    searchInput.addEventListener('blur', () => {
      window.setTimeout(closeSearch, 120);
    });

    document.addEventListener('click', (event) => {
      if (!header.classList.contains('is-search-open')) return;
      if (event.target.closest('.home-side-meta__search')) return;
      if (event.target.closest('.home-side-meta__search-form')) return;
      closeSearch();
    }, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
