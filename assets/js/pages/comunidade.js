document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-communities-page]');
  if (!page) return;

  const cards = [...page.querySelectorAll('[data-community-card]')];
  const filters = [...page.querySelectorAll('[data-community-filter]')];
  const emptyState = page.querySelector('[data-community-empty]');
  const searchInputs = [...page.querySelectorAll('[data-community-search], [data-community-search-mobile]')];
  const codeTriggers = [...page.querySelectorAll('[data-community-code-trigger]')];
  const createTriggers = [...page.querySelectorAll('[data-community-create]')];
  const mobileSearchToggle = page.querySelector('[data-community-mobile-search-toggle]');
  const mobileSearchPanel = page.querySelector('[data-community-mobile-search]');
  const codeForm = page.querySelector('[data-community-code-form]');
  const codeInput = page.querySelector('[data-community-code-input]');
  const codeFeedback = page.querySelector('[data-community-code-feedback]');

  let currentFilter = 'all';

  const getSearchTerm = () => {
    const filledInput = searchInputs.find((input) => input.value.trim().length > 0);
    return (filledInput?.value || '').trim().toLowerCase();
  };

  const syncSearchInputs = (source) => {
    const value = source.value;
    searchInputs.forEach((input) => {
      if (input !== source) input.value = value;
    });
  };

  const applyFilters = () => {
    const query = getSearchTerm();
    let visibleCount = 0;

    cards.forEach((card) => {
      const category = card.dataset.category || '';
      const title = (card.dataset.title || '').toLowerCase();
      const text = card.textContent.toLowerCase();
      const matchesFilter = currentFilter === 'all' || category === currentFilter;
      const matchesQuery = !query || title.includes(query) || text.includes(query);
      const isVisible = matchesFilter && matchesQuery;
      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (emptyState) emptyState.hidden = visibleCount > 0;
  };

  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      currentFilter = filter.dataset.communityFilter || 'all';
      filters.forEach((item) => item.classList.toggle('is-active', item === filter));
      applyFilters();
    });
  });

  searchInputs.forEach((input) => {
    input.addEventListener('input', () => {
      syncSearchInputs(input);
      applyFilters();
    });
  });

  codeTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      document.getElementById('community-code-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      window.setTimeout(() => codeInput?.focus(), 260);
    });
  });

  createTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      window.alert('Fluxo de criação de comunidade ainda será conectado.');
    });
  });

  if (mobileSearchToggle && mobileSearchPanel) {
    mobileSearchToggle.addEventListener('click', () => {
      const hidden = mobileSearchPanel.hasAttribute('hidden');
      mobileSearchPanel.toggleAttribute('hidden');
      mobileSearchToggle.setAttribute('aria-expanded', String(hidden));
      if (hidden) {
        mobileSearchPanel.querySelector('input')?.focus();
      }
    });
  }

  if (codeForm && codeInput && codeFeedback) {
    codeForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = codeInput.value.trim();

      if (!value) {
        codeFeedback.textContent = 'Digite um código válido.';
        codeFeedback.dataset.state = 'error';
        return;
      }

      codeFeedback.textContent = `Código ${value.toUpperCase()} pronto para validação.`;
      codeFeedback.dataset.state = 'success';
    });
  }

  applyFilters();
});
