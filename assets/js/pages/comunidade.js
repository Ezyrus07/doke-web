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
  const createForm = createModal?.querySelector('[data-community-create-modal-form]');
  const createStepKeys = ['details', 'members', 'review'];
  let createStepIndex = 0;
  let selectedCreateMemberIds = new Set();
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
    if (modal === createModal) resetCreateWizard();
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
      if (modal === createModal) resetCreateWizard();
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
      members: Array.isArray(record?.members) ? record.members.filter((member) => member && member.name).map((member) => ({
        id: String(member.id || slugifyCommunity(member.name)).trim(),
        name: String(member.name || '').trim(),
        role: member.role || 'member',
        source: member.source || 'messages'
      })) : [],
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

  const escapeCommunityHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const getCurrentUserProfile = () => {
    const service = window.DokeAuth && window.DokeAuth.service;
    const user = typeof service?.getCurrentUser === 'function' ? service.getCurrentUser() : null;
    const name = user?.displayName || user?.name || user?.fullName || 'Você';
    return {
      id: String(user?.id || 'current-user'),
      name,
      role: 'owner',
      source: 'account'
    };
  };

  const readLocalConversations = () => {
    const keys = ['doke.conversations.local.v1', 'doke.messages.local.v1'];
    for (const key of keys) {
      try {
        const parsed = JSON.parse(window.localStorage?.getItem(key) || '[]');
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch (error) {
        // Ignore malformed local mock data and fall back to static suggestions.
      }
    }
    return [];
  };

  const getMessageContactCandidates = () => {
    const currentUser = getCurrentUserProfile();
    const map = new Map();
    const addCandidate = (candidate) => {
      const name = String(candidate?.name || '').trim();
      if (!name || name.toLowerCase() === currentUser.name.toLowerCase()) return;
      const id = String(candidate?.id || slugifyCommunity(name)).trim() || slugifyCommunity(name);
      if (map.has(id)) return;
      map.set(id, {
        id,
        name,
        role: candidate?.role || 'member',
        subtitle: candidate?.subtitle || candidate?.source || 'Conversa recente',
        source: candidate?.source || 'messages'
      });
    };

    readLocalConversations().forEach((conversation) => {
      const peerName = conversation.peerName || conversation.name || conversation.clientName || conversation.professionalName || conversation.providerName;
      const peerId = conversation.peerId || conversation.clientId || conversation.professionalId || conversation.providerId;
      addCandidate({
        id: peerId || slugifyCommunity(peerName),
        name: peerName,
        role: conversation.peerRole || 'member',
        subtitle: conversation.order?.title || conversation.serviceTitle || conversation.lastMessage || 'Conversa recente'
      });
    });

    [
      { id: 'cliente-doke', name: 'Cliente Doke', subtitle: 'Conversa recente' },
      { id: 'profissional-doke', name: 'Profissional Doke', subtitle: 'Contato salvo nas mensagens' },
      { id: 'renato-acabamentos', name: 'Renato Acabamentos', subtitle: 'Profissional recente' }
    ].forEach(addCandidate);

    return [...map.values()].slice(0, 8);
  };

  const getCreateFormParts = () => {
    if (!createForm) return {};
    return {
      steps: [...createForm.querySelectorAll('[data-community-create-step]')],
      progress: [...createForm.querySelectorAll('[data-community-create-progress]')],
      prevButton: createForm.querySelector('[data-community-create-prev]'),
      nextButton: createForm.querySelector('[data-community-create-next]'),
      submitButton: createForm.querySelector('[data-community-create-submit]'),
      memberSearch: createForm.querySelector('[data-community-member-search]'),
      memberList: createForm.querySelector('[data-community-member-list]'),
      memberEmpty: createForm.querySelector('[data-community-member-empty]'),
      reviewName: createForm.querySelector('[data-community-review-name]'),
      reviewType: createForm.querySelector('[data-community-review-type]'),
      reviewMembers: createForm.querySelector('[data-community-review-members]')
    };
  };

  const updateCreateReview = () => {
    const parts = getCreateFormParts();
    const name = createForm?.querySelector('input[name="communityName"]')?.value.trim() || 'Comunidade Doke';
    const type = createForm?.querySelector('select[name="communityType"]')?.value || 'Condomínio';
    const selectedCount = selectedCreateMemberIds.size;
    if (parts.reviewName) parts.reviewName.textContent = name;
    if (parts.reviewType) parts.reviewType.textContent = type;
    if (parts.reviewMembers) parts.reviewMembers.textContent = selectedCount ? `Você + ${selectedCount}` : 'Você';
  };

  const setCreateWizardStep = (stepKey, { focus = true } = {}) => {
    if (!createForm) return;
    const nextIndex = Math.max(0, createStepKeys.indexOf(stepKey));
    createStepIndex = nextIndex >= 0 ? nextIndex : 0;
    const activeKey = createStepKeys[createStepIndex];
    const parts = getCreateFormParts();

    parts.steps?.forEach((step) => {
      const isActive = step.dataset.communityCreateStep === activeKey;
      step.hidden = !isActive;
      step.classList.toggle('is-active', isActive);
    });

    parts.progress?.forEach((item) => {
      const isActive = item.dataset.communityCreateProgress === activeKey;
      item.classList.toggle('is-active', isActive);
      item.classList.toggle('is-complete', createStepKeys.indexOf(item.dataset.communityCreateProgress) < createStepIndex);
    });

    if (parts.prevButton) parts.prevButton.hidden = createStepIndex === 0;
    if (parts.nextButton) parts.nextButton.hidden = createStepIndex === createStepKeys.length - 1;
    if (parts.submitButton) parts.submitButton.hidden = createStepIndex !== createStepKeys.length - 1;
    updateCreateReview();

    if (focus) {
      window.setTimeout(() => {
        const activeStep = parts.steps?.find((step) => step.dataset.communityCreateStep === activeKey);
        activeStep?.querySelector('input, select, textarea, button')?.focus?.();
      }, 40);
    }
  };

  const renderCreateMemberCandidates = () => {
    const parts = getCreateFormParts();
    if (!parts.memberList) return;
    const query = String(parts.memberSearch?.value || '').trim().toLowerCase();
    const candidates = getMessageContactCandidates().filter((candidate) => {
      const label = `${candidate.name} ${candidate.subtitle || ''}`.toLowerCase();
      return !query || label.includes(query);
    });

    parts.memberList.innerHTML = candidates.map((candidate) => {
      const checked = selectedCreateMemberIds.has(candidate.id) ? ' checked' : '';
      return `
        <label class="community-create-member">
          <input type="checkbox" name="communityMembers" value="${escapeCommunityHtml(candidate.id)}" data-community-member-option${checked} />
          <span class="community-create-member__avatar">${escapeCommunityHtml(candidate.name.slice(0, 2).toUpperCase())}</span>
          <span class="community-create-member__copy"><strong>${escapeCommunityHtml(candidate.name)}</strong><small>${escapeCommunityHtml(candidate.subtitle)}</small></span>
        </label>
      `;
    }).join('');

    if (parts.memberEmpty) parts.memberEmpty.hidden = candidates.length > 0;
    updateCreateReview();
  };

  const getSelectedCreateMembers = () => {
    const candidates = getMessageContactCandidates();
    return candidates
      .filter((candidate) => selectedCreateMemberIds.has(candidate.id))
      .map((candidate) => ({ id: candidate.id, name: candidate.name, role: 'member', source: candidate.source || 'messages' }));
  };

  const resetCreateWizard = () => {
    if (!createForm) return;
    createForm.reset();
    selectedCreateMemberIds = new Set();
    renderCreateMemberCandidates();
    setCreateWizardStep('details', { focus: false });
  };

  const goToNextCreateStep = () => {
    if (!createForm) return;
    if (createStepKeys[createStepIndex] === 'details') {
      const nameField = createForm.querySelector('input[name="communityName"]');
      if (!validateRequiredField(nameField, 'Informe o nome da comunidade para continuar.')) return;
    }
    setCreateWizardStep(createStepKeys[Math.min(createStepIndex + 1, createStepKeys.length - 1)]);
  };

  const goToPreviousCreateStep = () => {
    setCreateWizardStep(createStepKeys[Math.max(createStepIndex - 1, 0)]);
  };

  document.querySelectorAll('[data-community-code-modal-form], [data-community-create-modal-form]').forEach((form) => {
    form.addEventListener('input', (event) => {
      const field = event.target.closest('input, textarea');
      if (field) field.removeAttribute('aria-invalid');
      if (form.matches('[data-community-create-modal-form]')) {
        if (event.target.matches('[data-community-member-search]')) renderCreateMemberCandidates();
        updateCreateReview();
      }
    });

    form.addEventListener('change', (event) => {
      if (!form.matches('[data-community-create-modal-form]')) return;
      const option = event.target.closest('[data-community-member-option]');
      if (option) {
        if (option.checked) selectedCreateMemberIds.add(option.value);
        else selectedCreateMemberIds.delete(option.value);
        updateCreateReview();
        return;
      }
      updateCreateReview();
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

      if (createStepKeys[createStepIndex] !== 'review') {
        goToNextCreateStep();
        return;
      }

      const nameField = form.querySelector('input[name="communityName"]');
      if (!validateRequiredField(nameField, 'Informe o nome da comunidade para criar o espaço.')) return;
      const typeField = form.querySelector('select[name="communityType"]');
      const descriptionField = form.querySelector('textarea[name="communityDescription"]');
      const members = [getCurrentUserProfile(), ...getSelectedCreateMembers()];
      const record = upsertLocalCommunity({
        id: slugifyCommunity(nameField.value),
        title: nameField.value.trim(),
        category: typeField?.value || 'Comunidade',
        description: descriptionField?.value || '',
        members,
        source: 'created',
        role: 'owner'
      });
      setActionFormFeedback(form, 'Comunidade criada. Abrindo sala...', 'success');
      window.setTimeout(() => openCommunityRoom(record), 220);
    });
  });

  createForm?.querySelector('[data-community-create-next]')?.addEventListener('click', goToNextCreateStep);
  createForm?.querySelector('[data-community-create-prev]')?.addEventListener('click', goToPreviousCreateStep);

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
