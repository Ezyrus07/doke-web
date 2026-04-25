document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-communities-page]');
  if (!page) return;

  const cards = [...page.querySelectorAll('[data-community-discover-card]')];
  const extraCards = cards.filter((card) => card.hasAttribute('data-community-extra'));
  const loadMoreWrap = page.querySelector('[data-community-load-more-wrap]');
  const loadMoreButton = page.querySelector('[data-community-load-more]');
  let loadedExtraCount = 0;
  const LOAD_MORE_STEP = 3;
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
  const requestModal = document.querySelector('[data-community-request-modal]');
  const customSelects = [...document.querySelectorAll('[data-community-select]')];
  const requestTitle = document.querySelector('#community-request-title');
  const requestCopy = document.querySelector('[data-community-request-copy]');
  const requestForm = document.querySelector('[data-community-request-form]');
  const requestSuccess = document.querySelector('[data-community-request-success]');
  const requestMessage = document.querySelector('[data-community-request-message]');
  const codeModal = document.querySelector('[data-community-code-modal]');
  const createModal = document.querySelector('[data-community-create-modal]');
  let activeRequestButton = null;
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

  const getMatchingExtraCards = () => {
    const query = getSearchTerm();

    return extraCards.filter((card) => {
      const category = card.dataset.category || '';
      const title = (card.dataset.title || '').toLowerCase();
      const text = card.textContent.toLowerCase();
      const matchesFilter = currentFilter === 'all' || category === currentFilter;
      const matchesQuery = !query || title.includes(query) || text.includes(query);
      return matchesFilter && matchesQuery;
    });
  };

  const updateLoadMoreState = () => {
    if (!loadMoreWrap || !loadMoreButton) return;
    const matchingExtras = getMatchingExtraCards();
    const hasMore = matchingExtras.length > loadedExtraCount;
    loadMoreWrap.hidden = !hasMore;
    loadMoreButton.hidden = !hasMore;
  };

  const applyFilters = () => {
    const query = getSearchTerm();
    let visibleCount = 0;
    const matchingExtras = getMatchingExtraCards();

    cards.forEach((card) => {
      const category = card.dataset.category || '';
      const title = (card.dataset.title || '').toLowerCase();
      const text = card.textContent.toLowerCase();
      const matchesFilter = currentFilter === 'all' || category === currentFilter;
      const matchesQuery = !query || title.includes(query) || text.includes(query);
      const isMatch = matchesFilter && matchesQuery;
      const isExtra = card.hasAttribute('data-community-extra');
      const extraIndex = matchingExtras.indexOf(card);
      const extraIsLoaded = !isExtra || (extraIndex > -1 && extraIndex < loadedExtraCount);
      const isVisible = isMatch && extraIsLoaded;

      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (emptyState) emptyState.hidden = visibleCount > 0 || matchingExtras.length > 0;
    updateLoadMoreState();
  };

  const openRequestModal = (button) => {
    if (!requestModal) return;
    const card = button.closest('[data-community-card]');
    const communityName = card?.dataset.title || 'esta comunidade';
    activeRequestButton = button;

    if (requestTitle) requestTitle.textContent = `Solicitar entrada em ${communityName}`;
    if (requestCopy) {
      requestCopy.textContent = `Conte rapidamente por que você quer participar de ${communityName}. Em condomínios, informe bloco, torre ou unidade se fizer sentido.`;
    }
    if (requestForm) requestForm.hidden = false;
    if (requestSuccess) requestSuccess.hidden = true;
    if (requestMessage) requestMessage.value = '';

    requestModal.hidden = false;
    requestModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('community-modal-open');
    window.setTimeout(() => requestMessage?.focus(), 80);
  };

  const closeRequestModal = () => {
    if (!requestModal) return;
    requestModal.hidden = true;
    requestModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('community-modal-open');
  };

  const openActionModal = (modal) => {
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('community-modal-open');
    window.setTimeout(() => modal.querySelector('input, select, textarea, button')?.focus(), 80);
  };

  const closeActionModals = () => {
    [codeModal, createModal].forEach((modal) => {
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
    });
    if (!requestModal || requestModal.hidden) document.body.classList.remove('community-modal-open');
  };

  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      currentFilter = filter.dataset.communityFilter || 'all';
      loadedExtraCount = 0;
      filters.forEach((item) => item.classList.toggle('is-active', item === filter));
      applyFilters();
    });
  });

  searchInputs.forEach((input) => {
    input.addEventListener('input', () => {
      syncSearchInputs(input);
      loadedExtraCount = 0;
      applyFilters();
    });
  });

  if (loadMoreButton) {
    loadMoreButton.addEventListener('click', () => {
      loadedExtraCount += LOAD_MORE_STEP;
      applyFilters();
    });
  }

  document.querySelectorAll('[data-community-enter]').forEach((button) => {
    button.addEventListener('click', () => {
      window.location.href = 'comunidade-interna.html';
    });
  });

  document.querySelectorAll('[data-community-request]').forEach((button) => {
    button.addEventListener('click', () => openRequestModal(button));
  });

  document.querySelectorAll('[data-community-request-close]').forEach((button) => {
    button.addEventListener('click', closeRequestModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (requestModal && !requestModal.hidden) closeRequestModal();
    closeActionModals();
  });

  if (requestForm && requestSuccess) {
    requestForm.addEventListener('submit', (event) => {
      event.preventDefault();
      requestForm.hidden = true;
      requestSuccess.hidden = false;
      if (activeRequestButton) {
        activeRequestButton.textContent = 'Solicitação enviada';
        activeRequestButton.classList.remove('community-card__action--request');
        activeRequestButton.classList.add('community-card__action--pending');
        activeRequestButton.disabled = true;
      }
      window.setTimeout(closeRequestModal, 1800);
    });
  }

  codeTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openActionModal(codeModal));
  });

  createTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openActionModal(createModal));
  });

  document.querySelectorAll('[data-community-action-close]').forEach((button) => {
    button.addEventListener('click', closeActionModals);
  });

  document.querySelectorAll('[data-community-code-modal-form], [data-community-create-modal-form]').forEach((form) => {
    form.addEventListener('submit', (event) => event.preventDefault());
  });

  const closeCustomSelects = (except = null) => {
    customSelects.forEach((select) => {
      if (except && select === except) return;
      select.classList.remove('is-open');
      const trigger = select.querySelector('[data-community-select-trigger]');
      const menu = select.querySelector('.community-select__menu');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
    });
  };

  customSelects.forEach((select) => {
    const trigger = select.querySelector('[data-community-select-trigger]');
    const menu = select.querySelector('.community-select__menu');
    const label = select.querySelector('[data-community-select-label]');
    const valueInput = select.querySelector('[data-community-select-value]');
    const options = [...select.querySelectorAll('[data-community-select-option]')];

    if (!trigger || !menu || !label || !valueInput || !options.length) return;

    trigger.addEventListener('click', () => {
      const isOpen = select.classList.contains('is-open');
      closeCustomSelects(select);
      select.classList.toggle('is-open', !isOpen);
      menu.hidden = isOpen;
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });

    options.forEach((option) => {
      option.addEventListener('click', () => {
        const nextValue = option.dataset.value || option.textContent.trim();
        valueInput.value = nextValue;
        label.textContent = nextValue;
        options.forEach((item) => {
          const selected = item === option;
          item.classList.toggle('is-selected', selected);
          item.setAttribute('aria-selected', String(selected));
        });
        closeCustomSelects();
        trigger.focus();
      });
    });
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-community-select]')) return;
    closeCustomSelects();
  });

  if (mobileSearchToggle && mobileSearchPanel) {
    mobileSearchToggle.addEventListener('click', () => {
      const hidden = mobileSearchPanel.hasAttribute('hidden');
      mobileSearchPanel.toggleAttribute('hidden');
      mobileSearchToggle.setAttribute('aria-expanded', String(hidden));
      if (hidden) mobileSearchPanel.querySelector('input')?.focus();
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
