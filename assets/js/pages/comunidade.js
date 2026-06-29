window.DokeInitCommunity = function DokeInitCommunity() {
  const page = document.querySelector('[data-communities-page]');
  if (!page || page.dataset.communityReady === 'true') return;
  page.dataset.communityReady = 'true';

  const cards = [...page.querySelectorAll('[data-community-discover-card]')];
  const extraCards = cards.filter((card) => card.hasAttribute('data-community-extra'));
  const loadMoreWrap = page.querySelector('[data-community-load-more-wrap]');
  const loadMoreButton = page.querySelector('[data-community-load-more]');
  let loadedExtraCount = 0;
  const LOAD_MORE_STEP = 3;
  const filters = [...page.querySelectorAll('[data-community-filter]')];
  const emptyState = page.querySelector('[data-community-empty]');
  const searchInputs = [...page.querySelectorAll('[data-community-search], [data-community-search-mobile]')];
  const codeTriggers = [...document.querySelectorAll('[data-community-code-trigger]')];
  const createTriggers = [...document.querySelectorAll('[data-community-create]')];
  const focusSearchTriggers = [...page.querySelectorAll('[data-community-focus-search]')];
  const mobileSearchToggle = page.querySelector('[data-community-mobile-search-toggle]');
  const mobileSearchPanel = page.querySelector('[data-community-mobile-search]');
  const codeForm = page.querySelector('[data-community-code-form]');
  const codeInput = page.querySelector('[data-community-code-input]');
  const codeFeedback = page.querySelector('[data-community-code-feedback]');
  const requestModal = document.querySelector('[data-community-request-modal]');
  const requestTitle = document.querySelector('#community-request-title');
  const requestCopy = document.querySelector('[data-community-request-copy]');
  const requestForm = document.querySelector('[data-community-request-form]');
  const requestSuccess = document.querySelector('[data-community-request-success]');
  const requestMessage = document.querySelector('[data-community-request-message]');
  const codeModal = document.querySelector('[data-community-code-modal]');
  const createModal = document.querySelector('[data-community-create-modal]');
  let activeRequestButton = null;
  let activeActionModalTrigger = null;
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

  const setActionTriggersExpanded = (modal, expanded) => {
    const modalId = modal?.id;
    if (!modalId) return;
    document.querySelectorAll(`[aria-controls="${modalId}"]`).forEach((trigger) => {
      trigger.setAttribute('aria-expanded', String(expanded));
    });
  };

  const resetActionModalFeedback = (modal) => {
    const feedback = modal?.querySelector('[data-community-action-feedback]');
    if (!feedback) return;
    feedback.hidden = true;
    feedback.textContent = '';
    delete feedback.dataset.state;
  };

  const getActionModalFocusables = (modal) => {
    if (!modal) return [];
    return [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((item) => !item.disabled && item.offsetParent !== null);
  };

  const getOpenActionModal = () => [codeModal, createModal].find((modal) => modal && !modal.hidden);

  const openActionModal = (modal, trigger = null) => {
    if (!modal) return;
    closeActionModals({ restoreFocus: false });
    activeActionModalTrigger = trigger;
    resetActionModalFeedback(modal);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    setActionTriggersExpanded(modal, true);
    document.body.classList.add('community-modal-open', 'doke-action-modal-open');
    window.setTimeout(() => {
      const focusTarget = modal.querySelector('input, textarea, select, button:not([data-community-action-close])')
        || modal.querySelector('[role="dialog"]');
      focusTarget?.focus?.();
    }, 80);
  };

  const closeActionModals = ({ restoreFocus = true } = {}) => {
    [codeModal, createModal].forEach((modal) => {
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      setActionTriggersExpanded(modal, false);
      resetActionModalFeedback(modal);
    });
    if (!requestModal || requestModal.hidden) {
      document.body.classList.remove('community-modal-open', 'doke-action-modal-open');
    }
    if (restoreFocus) activeActionModalTrigger?.focus?.();
    activeActionModalTrigger = null;
  };

  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      currentFilter = filter.dataset.communityFilter || 'all';
      loadedExtraCount = 0;
      filters.forEach((item) => {
        const isActive = item === filter;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
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
      if (window.DokeNavigate) {
        window.DokeNavigate('comunidade-interna.html');
      } else {
        window.location.href = 'comunidade-interna.html';
      }
    });
  });

  document.querySelectorAll('[data-community-request]').forEach((button) => {
    button.addEventListener('click', () => openRequestModal(button));
  });

  document.querySelectorAll('[data-community-request-close]').forEach((button) => {
    button.addEventListener('click', closeRequestModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      const modal = getOpenActionModal();
      if (!modal) return;
      const focusables = getActionModalFocusables(modal);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
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
    trigger.addEventListener('click', () => openActionModal(codeModal, trigger));
  });

  createTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openActionModal(createModal, trigger));
  });

  focusSearchTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const target = searchInputs.find((input) => input.offsetParent !== null) || searchInputs[0];
      if (!target) return;
      target.focus();
      target.select?.();
    });
  });

  document.querySelectorAll('[data-community-action-close]').forEach((button) => {
    button.addEventListener('click', closeActionModals);
  });

  const setActionFormFeedback = (form, message, state = 'success') => {
    const feedback = form.querySelector('[data-community-action-feedback]');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.dataset.state = state;
    feedback.hidden = false;
  };

  const validateRequiredField = (field, message) => {
    if (!field || field.value.trim()) return true;
    field.focus();
    field.setAttribute('aria-invalid', 'true');
    const form = field.closest('form');
    if (form) setActionFormFeedback(form, message, 'error');
    return false;
  };

  document.querySelectorAll('[data-community-code-modal-form], [data-community-create-modal-form]').forEach((form) => {
    form.addEventListener('input', (event) => {
      const field = event.target.closest('input, textarea');
      if (field) field.removeAttribute('aria-invalid');
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (form.matches('[data-community-code-modal-form]')) {
        const codeField = form.querySelector('input[name="communityCode"]');
        if (!validateRequiredField(codeField, 'Digite o código da comunidade para continuar.')) return;
        setActionFormFeedback(form, `Código ${codeField.value.trim().toUpperCase()} pronto para validação.`, 'success');
        return;
      }

      const nameField = form.querySelector('input[name="communityName"]');
      if (!validateRequiredField(nameField, 'Informe o nome da comunidade para criar o espaço.')) return;
      setActionFormFeedback(form, 'Comunidade criada como rascunho visual. A integração real entra na etapa de backend.', 'success');
    });
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
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.DokeInitCommunity, { once: true });
} else {
  window.DokeInitCommunity();
}
