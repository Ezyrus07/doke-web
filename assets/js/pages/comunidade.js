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

  const COMMUNITY_SELECTION_STORAGE_KEY = 'doke.community.selected.v1';
  const COMMUNITY_LIST_STORAGE_KEY = 'doke.communities.local.v1';

  const slugifyCommunity = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'community';

  const readLocalCommunities = () => {
    try {
      const parsed = JSON.parse(window.localStorage?.getItem(COMMUNITY_LIST_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && item.title) : [];
    } catch (error) {
      return [];
    }
  };

  const writeLocalCommunities = (communities) => {
    try {
      window.localStorage?.setItem(COMMUNITY_LIST_STORAGE_KEY, JSON.stringify(communities));
    } catch (error) {
      // Local storage can be unavailable in restricted browser contexts.
    }
  };

  const normalizeCommunityRecord = (record) => {
    const title = String(record?.title || record?.name || 'Comunidade Doke').trim() || 'Comunidade Doke';
    const id = String(record?.id || record?.community || slugifyCommunity(title)).trim() || slugifyCommunity(title);
    const category = String(record?.category || record?.type || '').trim();
    const now = new Date().toISOString();
    return {
      id,
      title,
      category,
      description: String(record?.description || '').trim(),
      code: String(record?.code || '').trim(),
      role: record?.role || 'member',
      source: record?.source || 'local',
      joinedAt: record?.joinedAt || now,
      updatedAt: now
    };
  };

  const upsertLocalCommunity = (record) => {
    const nextRecord = normalizeCommunityRecord(record);
    const communities = readLocalCommunities();
    const index = communities.findIndex((item) => item.id === nextRecord.id);
    if (index >= 0) {
      communities[index] = { ...communities[index], ...nextRecord, joinedAt: communities[index].joinedAt || nextRecord.joinedAt };
    } else {
      communities.unshift(nextRecord);
    }
    writeLocalCommunities(communities);
    return nextRecord;
  };

  const getCommunityContextFromButton = (button) => {
    const card = button.closest('[data-community-card], [data-community-discover-card]');
    const title = card?.dataset.title
      || card?.querySelector('h3, strong')?.textContent?.trim()
      || button.textContent?.trim()
      || 'Comunidade Doke';
    const id = card?.dataset.communityId || slugifyCommunity(title);
    return {
      id,
      title,
      category: card?.dataset.category || '',
      selectedAt: new Date().toISOString()
    };
  };

  const saveSelectedCommunity = (context) => {
    try {
      window.localStorage?.setItem(COMMUNITY_SELECTION_STORAGE_KEY, JSON.stringify(context));
    } catch (error) {
      // Local storage can be unavailable in restricted browser contexts.
    }
  };

  const buildCommunityRoomUrl = (context) => {
    const params = new URLSearchParams();
    params.set('community', context.id);
    params.set('title', context.title);
    if (context.category) params.set('category', context.category);
    return `comunidade-interna.html?${params.toString()}`;
  };

  const categoryLabelFromRecord = (record) => {
    const value = String(record?.category || '').toLowerCase();
    if (value.includes('condom')) return 'Condomínio';
    if (value.includes('prof')) return 'Profissionais';
    if (value.includes('priv')) return 'Privada';
    if (value.includes('tecn')) return 'Tecnologia';
    if (value.includes('reforma')) return 'Reformas';
    return record?.source === 'code' ? 'Privada' : 'Comunidade';
  };

  const renderLocalCommunities = () => {
    const continueList = page.querySelector('[data-community-continue-list]');
    if (!continueList) return;
    const existingIds = new Set([...continueList.querySelectorAll('[data-community-id]')]
      .map((item) => item.dataset.communityId)
      .filter(Boolean));

    readLocalCommunities().forEach((record) => {
      if (!record?.id || existingIds.has(record.id)) return;
      existingIds.add(record.id);
      const card = document.createElement('article');
      card.className = 'community-continue-card doke-card doke-community-card';
      card.dataset.category = record.category || 'local';
      card.dataset.communityCard = '';
      card.dataset.title = record.title;
      card.dataset.communityId = record.id;
      card.dataset.cardKind = 'community';
      card.innerHTML = `
        <div class="community-continue-card__content">
          <span class="community-pill doke-chip">${categoryLabelFromRecord(record)}</span>
          <h3>${record.title}</h3>
          <span class="community-activity">${record.role === 'owner' ? 'Criada por você' : 'Acesso liberado'}</span>
          <div class="community-continue-card__meta"><span>${record.source === 'code' ? 'Entrou por código' : 'Comunidade local'}</span><span class="community-online">online</span></div>
        </div>
        <button class="community-open-button doke-btn" data-community-enter type="button">Abrir</button>
      `;
      continueList.prepend(card);
    });
  };

  const openCommunityRoom = (context) => {
    saveSelectedCommunity(context);
    const target = buildCommunityRoomUrl(context);
    if (window.DokeNavigate) {
      window.DokeNavigate(target);
    } else {
      window.location.href = target;
    }
  };

  renderLocalCommunities();

  document.querySelectorAll('[data-community-enter]').forEach((button) => {
    button.addEventListener('click', () => {
      openCommunityRoom(getCommunityContextFromButton(button));
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
        const code = codeField.value.trim().toUpperCase();
        const record = upsertLocalCommunity({
          id: `codigo-${slugifyCommunity(code)}`,
          title: `Comunidade ${code}`,
          category: 'privada',
          code,
          source: 'code',
          role: 'member'
        });
        setActionFormFeedback(form, `Código ${code} validado. Abrindo comunidade...`, 'success');
        window.setTimeout(() => openCommunityRoom(record), 220);
        return;
      }

      const nameField = form.querySelector('input[name="communityName"]');
      if (!validateRequiredField(nameField, 'Informe o nome da comunidade para criar o espaço.')) return;
      const typeField = form.querySelector('select[name="communityType"]');
      const descriptionField = form.querySelector('textarea[name="communityDescription"]');
      const record = upsertLocalCommunity({
        id: slugifyCommunity(nameField.value),
        title: nameField.value.trim(),
        category: typeField?.value || 'Comunidade',
        description: descriptionField?.value || '',
        source: 'created',
        role: 'owner'
      });
      setActionFormFeedback(form, 'Comunidade criada. Abrindo sala...', 'success');
      window.setTimeout(() => openCommunityRoom(record), 220);
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

      const code = value.toUpperCase();
      const record = upsertLocalCommunity({
        id: `codigo-${slugifyCommunity(code)}`,
        title: `Comunidade ${code}`,
        category: 'privada',
        code,
        source: 'code',
        role: 'member'
      });
      codeFeedback.textContent = `Código ${code} validado. Abrindo comunidade...`;
      codeFeedback.dataset.state = 'success';
      window.setTimeout(() => openCommunityRoom(record), 220);
    });
  }

  applyFilters();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.DokeInitCommunity, { once: true });
} else {
  window.DokeInitCommunity();
}
