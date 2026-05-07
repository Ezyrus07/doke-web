/* Doke pedidos — header interactions.
   Responsibility: command-bar search toggle only for pedidos.html. */
(function () {
  const bind = () => {
    const root = document.body;
    if (!root?.classList.contains('orders-page-shell')) return;

    const shell = document.querySelector('.orders-page > .home-side-meta');
    const searchButton = shell?.querySelector('.home-side-meta__search');
    const searchForm = shell?.querySelector('.home-side-meta__search-form');
    const searchInput = shell?.querySelector('.home-side-meta__search-input');

    if (!shell || !searchButton || !searchForm || !searchInput) return;

    const openSearch = () => {
      shell.classList.add('is-search-open');
      searchButton.setAttribute('aria-expanded', 'true');
      searchForm.removeAttribute('hidden');
      window.requestAnimationFrame(() => {
        searchInput.focus({ preventScroll: true });
      });
    };

    const closeSearch = () => {
      if (searchInput.value.trim()) return;
      shell.classList.remove('is-search-open');
      searchButton.setAttribute('aria-expanded', 'false');
      searchForm.setAttribute('hidden', '');
    };

    searchButton.setAttribute('aria-expanded', 'false');
    searchButton.setAttribute('aria-controls', searchInput.id || 'desktop-quick-search-orders');
    searchForm.setAttribute('hidden', '');

    searchButton.addEventListener('click', (event) => {
      event.preventDefault();
      if (shell.classList.contains('is-search-open')) {
        searchInput.focus({ preventScroll: true });
      } else {
        openSearch();
      }
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
      if (!shell.classList.contains('is-search-open')) return;
      if (event.target.closest('.home-side-meta__search-form') || event.target.closest('.home-side-meta__search')) return;
      closeSearch();
    }, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
