window.DokeInitCommunity = function DokeInitCommunity() {
  const page = document.querySelector('[data-communities-page]');
  if (!page || page.dataset.communityReady === 'true') return;
  page.dataset.communityReady = 'true';

  let cards = [...page.querySelectorAll('[data-community-discover-card]')];
  let extraCards = cards.filter((card) => card.hasAttribute('data-community-extra'));

  const refreshDiscoveryCardCollections = () => {
    cards = [...page.querySelectorAll('[data-community-discover-card]')];
    extraCards = cards.filter((card) => card.hasAttribute('data-community-extra'));
  };
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
  const requestMessage = document.querySelector('[data-community-request-message]');
  const requestRole = document.querySelector('[data-community-request-role]');
  const codeModal = document.querySelector('[data-community-code-modal]');
  const createView = page.querySelector('[data-community-create-view]');
  const listView = page.querySelector('[data-community-list-view]');
  const createForm = createView?.querySelector('[data-community-create-form]') || document.querySelector('[data-community-create-modal-form]');
  const createStepKeys = ['details', 'members', 'review'];
  const createStepLabels = {
    details: 'Dados',
    members: 'Pessoas',
    review: 'Revisão'
  };
  let createStepIndex = 0;
  let selectedCreateMemberIds = new Set();
  let createCoverState = { name: '', type: '', dataUrl: '' };
  let cachedCreateMemberCandidates = null;
  let memberSearchRenderTimer = 0;
  let activeRequestButton = null;
  let activeRequestCommunityId = '';
  let activeActionModalTrigger = null;
  let currentFilter = 'all';
  let lastCommunityRenderSignature = '';
  let communityBanCountdownTimer = 0;

  const documentPreloader = document.documentElement.classList.contains('doke-community-document-reload')
    ? document.querySelector('[data-community-document-preloader]')
    : null;
  const communitySkeleton = page.querySelector('[data-community-hydration-skeleton]');
  const incomingCommunityTransition = window.Doke?.communityTransition?.consume('listing');
  if (incomingCommunityTransition) page.dataset.communityTransition = 'from-room';
  const isDirectStableShellCommit = document.documentElement.dataset.dokeRouteVisualMode === 'direct'
    && document.documentElement.dataset.dokeNavigationMode === 'stable-shell';
  const visualHydration = isDirectStableShellCommit
    ? null
    : window.Doke?.communityTransition?.createVisualHydration({
      body: document.body,
      preloader: documentPreloader,
      skeleton: communitySkeleton,
      isTransition: Boolean(incomingCommunityTransition)
    }) || null;
  if (isDirectStableShellCommit && communitySkeleton) communitySkeleton.hidden = true;
  visualHydration?.start();

  const applyCommunityPageState = (nextState) => {
    page.dataset.state = nextState;
    page.dataset.viewState = nextState === 'hydrated' ? 'ready' : nextState;
    page.setAttribute('aria-busy', String(nextState === 'loading'));
    document.body.dataset.dataState = nextState;
    const stateRegion = page.querySelector('[data-state-region]');
    const errorState = page.querySelector('[data-state-error]');
    if (stateRegion) stateRegion.hidden = nextState !== 'error';
    if (errorState) errorState.hidden = nextState !== 'error';
  };

  const setCommunityPageState = (state) => {
    const nextState = state === 'error' ? 'error' : state === 'hydrated' ? 'hydrated' : 'loading';
    if (nextState === 'loading') {
      if (!isDirectStableShellCommit) applyCommunityPageState(nextState);
      return;
    }
    if (visualHydration) {
      applyCommunityPageState(nextState);
      visualHydration.complete(() => {
        if (nextState === 'hydrated' && incomingCommunityTransition?.context?.listingState) {
          window.Doke?.communityTransition?.restoreListingState(incomingCommunityTransition.context.listingState, {
            setFilter: (filter) => {
              const nextFilter = filters.some((item) => item.dataset.communityFilter === filter) ? filter : 'all';
              currentFilter = nextFilter;
              filters.forEach((item) => item.classList.toggle('is-active', item.dataset.communityFilter === nextFilter));
            },
            setSearch: (value) => {
              searchInputs.forEach((input) => { input.value = value || ''; });
              applyFilters();
            }
          });
        }
      });
      return;
    }
    applyCommunityPageState(nextState);
  };

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
    activeRequestCommunityId = String(card?.dataset.communityId || '').trim();

    if (requestTitle) requestTitle.textContent = `Solicitar entrada em ${communityName}`;
    if (requestCopy) {
      requestCopy.textContent = `Conte rapidamente por que você quer participar de ${communityName}. Em condomínios, informe bloco, torre ou unidade se fizer sentido.`;
    }
    if (requestForm) {
      requestForm.hidden = false;
      const submitButton = requestForm.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar solicitação';
      }
      setActionFormFeedback(requestForm, '', '');
    }
    if (requestMessage) requestMessage.value = '';
    if (requestRole) requestRole.value = 'morador';
    const questions = Array.isArray(card?.dataset.communityQuestions ? JSON.parse(card.dataset.communityQuestions || '[]') : []) ? JSON.parse(card?.dataset.communityQuestions || '[]') : [];
    let questionWrap = requestForm?.querySelector('[data-community-request-questions]');
    if (!questionWrap && requestForm) {
      questionWrap = document.createElement('div');
      questionWrap.dataset.communityRequestQuestions = '';
      requestMessage?.parentElement?.after(questionWrap);
    }
    if (questionWrap) {
      questionWrap.innerHTML = questions.map((question, index) => `<label><span>${escapeCommunityHtml(question)}</span><textarea class="doke-textarea" rows="2" required data-community-request-answer="${index}"></textarea></label>`).join('');
      questionWrap.hidden = questions.length === 0;
    }

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

  const getOpenActionModal = () => [codeModal].find((modal) => modal && !modal.hidden);

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
    [codeModal].forEach((modal) => {
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


  const setCreateTriggersExpanded = (expanded) => {
    createTriggers.forEach((trigger) => {
      trigger.setAttribute('aria-expanded', String(expanded));
    });
  };

  const openCreateView = (trigger = null) => {
    if (!createView) return;
    activeActionModalTrigger = trigger;
    closeActionModals({ restoreFocus: false });
    resetCreateWizard();
    createView.hidden = false;
    createView.classList.add('is-active');
    setCreateTriggersExpanded(true);
    page.dataset.communityMode = 'create';
    window.setTimeout(() => {
      createView.scrollIntoView({ block: 'start', behavior: 'smooth' });
      createForm?.querySelector('input, select, textarea, button')?.focus?.();
    }, 40);
  };

  const closeCreateView = ({ restoreFocus = true } = {}) => {
    if (!createView || createView.hidden) return;
    createView.hidden = true;
    createView.classList.remove('is-active');
    resetCreateWizard();
    setCreateTriggersExpanded(false);
    delete page.dataset.communityMode;
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
  const COMMUNITY_DELETED_STORAGE_KEY = 'doke.communities.deleted.local.v1';
  const COMMUNITY_LIFECYCLE_STORAGE_KEY = 'doke.community.lifecycle.local.v1';

  const slugifyCommunity = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'community';


  const createCommunityId = (title) => {
    const base = slugifyCommunity(title);
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `${base}-${window.crypto.randomUUID()}`;
    }
    return `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const readDeletedCommunityTombstones = () => {
    const repository = window.Doke?.communityDomain?.repository;
    if (repository?.readTombstones) return repository.readTombstones();
    try {
      const parsed = JSON.parse(window.localStorage?.getItem(COMMUNITY_DELETED_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => item && item.id) : [];
    } catch (error) {
      return [];
    }
  };

  const isCommunityTombstoned = (communityId) => {
    const id = String(communityId || '').trim();
    if (!id) return false;
    return readDeletedCommunityTombstones().some((item) => String(item?.id || '').trim() === id);
  };

  const readLocalCommunities = () => {
    const repository = window.Doke?.communityDomain?.repository;
    if (repository?.list) return repository.list();
    try {
      const parsed = JSON.parse(window.localStorage?.getItem(COMMUNITY_LIST_STORAGE_KEY) || '[]');
      const tombstonedIds = new Set(readDeletedCommunityTombstones().map((item) => String(item?.id || '').trim()));
      return Array.isArray(parsed) ? parsed.filter((item) => (
        item
        && item.id
        && item.title
        && String(item.status || '').toLowerCase() !== 'deleted'
        && !tombstonedIds.has(String(item.id || '').trim())
      )) : [];
    } catch (error) {
      return [];
    }
  };

  const writeLocalCommunities = (communities) => {
    const repository = window.Doke?.communityDomain?.repository;
    if (repository?.saveAll) return repository.saveAll(communities);
    try {
      window.localStorage?.setItem(COMMUNITY_LIST_STORAGE_KEY, JSON.stringify(communities));
      return true;
    } catch (error) {
      return false;
    }
  };

  const normalizeInviteCode = (value) => String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '');

  const normalizeIdentityKey = (value) => window.Doke?.communityDomain?.identity?.normalizeKey?.(value) ?? String(value || '').trim().toLowerCase();

  const getIdentityKeysFromUser = (user) => {
    const profile = user?.profile || {};
    const rawKeys = [
      user?.id,
      user?.userId,
      user?.email,
      user?.providerProfileId,
      user?.professionalId,
      user?.clientId,
      profile?.id,
      profile?.userId,
      profile?.email,
      ...(Array.isArray(user?.profiles) ? user.profiles.flatMap((item) => [item?.id, item?.userId, item?.email]) : [])
    ];
    return [...new Set(rawKeys.map(normalizeIdentityKey).filter(Boolean))];
  };

  const getMemberIdentityKeys = (member) => [...new Set([
    member?.accountKey,
    member?.id,
    member?.userId,
    member?.profileId,
    member?.email,
    ...(Array.isArray(member?.identityKeys) ? member.identityKeys : [])
  ].map(normalizeIdentityKey).filter(Boolean))];

  const getMemberId = (member) => String(member?.id || member?.userId || member?.profileId || member?.email || '').trim();

  const getCurrentUserProfile = () => {
    const resolver = window.Doke?.communityDomain?.identity?.resolveCurrentUser;
    if (typeof resolver === 'function') return resolver();
    const sessionUser = window.Doke?.session?.getCurrentUser?.() || null;
    const authUser = window.DokeAuth?.service?.getCurrentUser?.() || null;
    const user = sessionUser || authUser || null;
    const identityKeys = [...new Set([
      ...getIdentityKeysFromUser(sessionUser),
      ...getIdentityKeysFromUser(authUser)
    ])].filter(Boolean);
    return {
      id: identityKeys[0] || '',
      name: user?.displayName || user?.name || user?.fullName || user?.email || 'Você',
      email: String(user?.email || ''),
      identityKeys,
      role: 'member',
      source: 'account'
    };
  };

  const isCommunityDebugMode = () => {
    try {
      const value = new URLSearchParams(window.location.search || '').get('communityDebug');
      return value === '1' || value === 'members';
    } catch (error) {
      return false;
    }
  };

  const identitiesIntersect = (left, right) => {
    const leftKeys = new Set((left || []).map(normalizeIdentityKey).filter(Boolean));
    return (right || []).some((key) => leftKeys.has(normalizeIdentityKey(key)));
  };

  const deriveCommunityOwnerId = (record) => {
    const explicit = String(record?.ownerId || record?.createdById || record?.creatorId || '').trim();
    if (explicit) return explicit;
    const ownerMember = Array.isArray(record?.members)
      ? record.members.find((member) => member && String(member.role || '').toLowerCase() === 'owner')
      : null;
    return getMemberId(ownerMember);
  };

  const getCommunityOwnerIdentityKeys = (record) => {
    const ownerMember = Array.isArray(record?.members)
      ? record.members.find((member) => String(member?.role || '').toLowerCase() === 'owner')
      : null;
    return [...new Set([
      record?.ownerId,
      record?.createdById,
      record?.creatorId,
      ...(Array.isArray(record?.ownerIdentityKeys) ? record.ownerIdentityKeys : []),
      ...getMemberIdentityKeys(ownerMember)
    ].map(normalizeIdentityKey).filter(Boolean))];
  };

  const isCurrentUserCommunityOwner = (record, profile = getCurrentUserProfile()) => (
    identitiesIntersect(profile?.identityKeys || [profile?.id], getCommunityOwnerIdentityKeys(record))
  );

  const isCurrentUserCommunityMember = (record, profile = getCurrentUserProfile()) => {
    const profileKeys = profile?.identityKeys || [profile?.id];
    if (!profileKeys.some(Boolean)) return false;
    if (isCurrentUserCommunityOwner(record, profile)) return true;
    return Array.isArray(record?.members)
      && record.members.some((member) => identitiesIntersect(profileKeys, getMemberIdentityKeys(member)));
  };

  const getCommunityRelationship = (record, profile = getCurrentUserProfile()) => {
    const resolver = window.Doke?.communityDomain?.identity?.resolveCommunityRelation;
    if (typeof resolver === 'function') return resolver({ community: record, currentUser: profile }).relation;
    if (isCurrentUserCommunityOwner(record, profile)) return 'owner';
    if (isCurrentUserCommunityMember(record, profile)) return 'member';
    return 'visitor';
  };

  const getCommunityRelationReport = (record, profile = getCurrentUserProfile()) => {
    const resolver = window.Doke?.communityDomain?.identity?.resolveCommunityRelation;
    if (typeof resolver === 'function') return resolver({ community: record, currentUser: profile });
    const relation = getCommunityRelationship(record, profile);
    return {
      relation,
      currentUser: profile,
      currentUserKeys: profile?.identityKeys || [profile?.id],
      ownerIdentityKeys: getCommunityOwnerIdentityKeys(record),
      matchedOwnerKeys: [],
      matchedMember: null,
      matchedMemberKeys: [],
      allowed: relation === 'owner' || relation === 'member'
    };
  };


  const getCommunityBanState = (record, profile = getCurrentUserProfile()) => {
    const relationReport = getCommunityRelationReport(record, profile);
    if (relationReport?.relation !== 'banned' || !relationReport?.matchedBan) {
      return { relationReport, active: false, ban: null, expiresAtMs: 0 };
    }
    const expiresAtMs = relationReport.matchedBan?.expiresAt ? Date.parse(relationReport.matchedBan.expiresAt) : 0;
    if (expiresAtMs && expiresAtMs <= Date.now()) {
      return { relationReport, active: false, ban: relationReport.matchedBan, expiresAtMs };
    }
    return { relationReport, active: true, ban: relationReport.matchedBan, expiresAtMs };
  };

  const formatDurationClock = (totalSeconds) => {
    const seconds = Math.max(0, Number(totalSeconds) || 0);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    if (minutes > 0) return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`;
    return `${remainingSeconds}s`;
  };

  const getCommunityBanCountdownLabel = (banOrExpiresAt) => {
    const expiresAtMs = typeof banOrExpiresAt === 'number'
      ? banOrExpiresAt
      : (banOrExpiresAt?.expiresAt ? Date.parse(banOrExpiresAt.expiresAt) : 0);
    if (!expiresAtMs) return 'Banimento permanente';
    const remainingMs = Math.max(0, expiresAtMs - Date.now());
    if (remainingMs <= 0) return 'Banimento expirando';
    return `Tempo restante: ${formatDurationClock(Math.ceil(remainingMs / 1000))}`;
  };

  const getCommunityBanMessage = (banOrExpiresAt) => {
    const ban = banOrExpiresAt && typeof banOrExpiresAt === 'object' ? banOrExpiresAt : null;
    const expiresAtMs = typeof banOrExpiresAt === 'number'
      ? banOrExpiresAt
      : (ban?.expiresAt ? Date.parse(ban.expiresAt) : 0);
    const reason = ban?.reason ? ` Motivo: ${ban.reason}.` : '';
    const moderator = ban?.bannedByName ? ` Aplicado por: ${ban.bannedByName}.` : '';
    if (!expiresAtMs) return `Você foi banido permanentemente desta comunidade.${reason}${moderator}`;
    const countdownLabel = getCommunityBanCountdownLabel(expiresAtMs).replace(/^Tempo restante:\s*/, '');
    return `Você foi banido desta comunidade. Tempo restante: ${countdownLabel}.${reason}${moderator}`;
  };

  const stopCommunityBanCountdown = () => {
    if (!communityBanCountdownTimer) return;
    window.clearInterval(communityBanCountdownTimer);
    communityBanCountdownTimer = 0;
  };

  const refreshCommunityBanCountdowns = () => {
    const countdownNodes = [...page.querySelectorAll('[data-community-ban-countdown]')];
    if (!countdownNodes.length) {
      stopCommunityBanCountdown();
      return;
    }
    let hasExpiredCard = false;
    countdownNodes.forEach((node) => {
      const expiresAtMs = Number(node.dataset.communityBanExpiresAt || 0);
      const isPermanent = node.dataset.communityBanPermanent === 'true';
      const label = isPermanent ? 'Banimento permanente' : getCommunityBanCountdownLabel(expiresAtMs);
      node.textContent = label;
      if (!isPermanent && expiresAtMs && expiresAtMs <= Date.now()) hasExpiredCard = true;
    });
    if (hasExpiredCard) {
      stopCommunityBanCountdown();
      window.setTimeout(() => renderCommunityCollections({ force: true }), 80);
    }
  };

  const ensureCommunityBanCountdown = () => {
    const hasBannedCards = Boolean(page.querySelector('[data-community-ban-countdown]'));
    if (!hasBannedCards) {
      stopCommunityBanCountdown();
      return;
    }
    refreshCommunityBanCountdowns();
    if (communityBanCountdownTimer) return;
    communityBanCountdownTimer = window.setInterval(refreshCommunityBanCountdowns, 1000);
  };


  const cleanupExpiredCommunityBans = () => {
    const communities = readLocalCommunities();
    const nowMs = Date.now();
    let changed = false;
    const next = communities.map((record) => {
      const bans = Array.isArray(record?.bans) ? record.bans : [];
      const activeBans = bans.filter((ban) => {
        if (!ban?.expiresAt) return true;
        const expiresAtMs = Date.parse(ban.expiresAt);
        return !Number.isFinite(expiresAtMs) || expiresAtMs > nowMs;
      });
      if (activeBans.length === bans.length) return record;
      changed = true;
      return { ...record, bans: activeBans, updatedAt: new Date().toISOString() };
    });
    if (changed) writeLocalCommunities(next);
    return changed;
  };

  const writeCommunityAccessDebug = (label, record, relationReport, decision = {}) => {
    if (!isCommunityDebugMode() || !window.console) return;
    const sessionUser = window.Doke?.session?.getCurrentUser?.() || null;
    const authUser = window.DokeAuth?.service?.getCurrentUser?.() || null;
    const currentUser = relationReport?.currentUser || getCurrentUserProfile();
    const safeUser = (user) => (user ? {
      id: user.id || user.userId || '',
      email: user.email || '',
      accountKey: window.Doke?.communityDomain?.identity?.accountKey?.(user) || ''
    } : null);
    const table = {
      communityId: String(record?.id || ''),
      currentUrl: String(window.location.href || ''),
      canonicalSessionUser: safeUser(sessionUser),
      legacyAuthUser: safeUser(authUser),
      resolvedCurrentUser: { id: currentUser.id || '', accountKey: currentUser.accountKey || '', email: currentUser.email || '', source: currentUser.source || '' },
      resolvedIdentityKeys: relationReport?.currentUserKeys || currentUser.identityKeys || [],
      communityOwnerId: record?.ownerId || record?.createdById || record?.creatorId || '',
      communityOwnerIdentityKeys: relationReport?.ownerIdentityKeys || getCommunityOwnerIdentityKeys(record),
      persistedMembers: (Array.isArray(record?.members) ? record.members : []).map((member) => ({ id: member.id || '', accountKey: member.accountKey || '', email: member.email || '', role: member.role || '', identityKeys: getMemberIdentityKeys(member) })),
      matchedOwnerKeys: relationReport?.matchedOwnerKeys || [],
      matchedMember: relationReport?.matchedMember ? { id: relationReport.matchedMember.id || '', accountKey: relationReport.matchedMember.accountKey || '', email: relationReport.matchedMember.email || '', role: relationReport.matchedMember.role || '' } : null,
      matchedMemberKeys: relationReport?.matchedMemberKeys || [],
      computedRelation: relationReport?.relation || 'visitor',
      privacy: record?.visibility || record?.type || record?.category || '',
      accessDecision: decision.action || (relationReport?.allowed ? 'open' : 'blocked'),
      rejectionReason: decision.reason || ''
    };
    console.groupCollapsed(`[communityDebug] ${label}`);
    console.table(table);
    console.groupEnd();
  };

  const normalizeCommunityRecord = (record) => {
    const title = String(record?.title || record?.name || 'Comunidade Doke').trim() || 'Comunidade Doke';
    const id = String(record?.id || record?.community || slugifyCommunity(title)).trim() || slugifyCommunity(title);
    const category = String(record?.category || record?.type || '').trim();
    const now = new Date().toISOString();
    const inviteCode = normalizeInviteCode(record?.invite?.code || record?.inviteCode || record?.code);
    const normalized = {
      id,
      title,
      category,
      type: String(record?.type || record?.visibility || category || 'public').trim() || 'public',
      visibility: String(record?.visibility || record?.type || category || 'public').trim() || 'public',
      description: String(record?.description || '').trim(),
      rules: Array.isArray(record?.rules) ? record.rules : [],
      tags: Array.isArray(record?.tags) ? record.tags : [],
      links: Array.isArray(record?.links) ? record.links : [],
      joinQuestions: Array.isArray(record?.joinQuestions) ? record.joinQuestions : [],
      entryMode: record?.entryMode === 'approval' ? 'approval' : 'auto',
      requireRulesAcceptance: Boolean(record?.requireRulesAcceptance),
      rulesVersion: Math.max(1, Number(record?.rulesVersion || 1) || 1),
      defaultChannelId: String(record?.defaultChannelId || ''),
      welcomeMessage: String(record?.welcomeMessage || ''),
      onboardingChecklist: Array.isArray(record?.onboardingChecklist) ? record.onboardingChecklist : [],
      onboardingAudience: String(record?.onboardingAudience || 'all'),
      iconUrl: String(record?.iconUrl || '').trim(),
      code: String(record?.code || '').trim(),
      inviteCode,
      invite: inviteCode ? {
        id: String(record?.invite?.id || ('invite-' + inviteCode.toLowerCase())),
        code: inviteCode,
        active: record?.invite?.active !== false,
        createdAt: String(record?.invite?.createdAt || record?.inviteCreatedAt || now),
        expiresAt: String(record?.invite?.expiresAt || record?.inviteExpiresAt || ''),
        generation: Number(record?.invite?.generation || 1),
        maxUses: Math.max(0, Number(record?.invite?.maxUses || 0) || 0),
        uses: Math.max(0, Number(record?.invite?.uses || 0) || 0),
        requireApproval: Boolean(record?.invite?.requireApproval),
        autoRoleId: String(record?.invite?.autoRoleId || '')
      } : null,
      invites: Array.isArray(record?.invites) ? record.invites.map((invite) => ({
        ...invite,
        id: String(invite?.id || ('invite-' + normalizeInviteCode(invite?.code).toLowerCase())),
        code: normalizeInviteCode(invite?.code),
        active: invite?.active !== false,
        maxUses: Math.max(0, Number(invite?.maxUses || 0) || 0),
        uses: Math.max(0, Number(invite?.uses || 0) || 0),
        requireApproval: Boolean(invite?.requireApproval),
        autoRoleId: String(invite?.autoRoleId || '')
      })).filter((invite) => invite.code) : [],
      ownerId: deriveCommunityOwnerId(record),
      ownerAccountKey: normalizeIdentityKey(record?.ownerAccountKey || record?.ownerId || ''),
      ownerIdentityKeys: [...new Set((Array.isArray(record?.ownerIdentityKeys) ? record.ownerIdentityKeys : getCommunityOwnerIdentityKeys(record)).map(normalizeIdentityKey).filter(Boolean))],
      createdById: String(record?.createdById || record?.ownerId || '').trim(),
      roles: Array.isArray(record?.roles) ? record.roles : [],
      role: record?.role || 'member',
      source: record?.source || 'local',
      members: Array.isArray(record?.members) ? record.members.filter((member) => member && member.name).map((member) => ({
        id: String(member.id || member.userId || member.profileId || member.email || slugifyCommunity(member.name)).trim(),
        accountKey: normalizeIdentityKey(member.accountKey || member.email || getMemberIdentityKeys(member)[0] || ''),
        name: String(member.name || '').trim(),
        email: String(member.email || '').trim(),
        identityKeys: getMemberIdentityKeys(member),
        role: member.role || 'member',
        source: member.source || 'messages',
        joinedAt: String(member.joinedAt || '').trim(),
        rulesAcceptedVersion: Math.max(0, Number(member.rulesAcceptedVersion || 0) || 0),
        rulesAcceptedAt: String(member.rulesAcceptedAt || ''),
        onboardingCompletedAt: String(member.onboardingCompletedAt || ''),
        addedBy: String(member.addedBy || '').trim()
      })) : [],
      joinRequests: Array.isArray(record?.joinRequests) ? record.joinRequests.filter((request) => request && request.id).map((request) => ({
        id: String(request.id || '').trim(),
        userId: String(request.userId || '').trim(),
        userName: String(request.userName || '').trim(),
        userEmail: String(request.userEmail || '').trim(),
        identityKeys: Array.isArray(request.identityKeys) ? [...new Set(request.identityKeys.map(normalizeIdentityKey).filter(Boolean))] : [],
        relation: String(request.relation || '').trim(),
        message: String(request.message || '').trim(),
        status: ['pending', 'accepted', 'rejected'].includes(request.status) ? request.status : 'pending',
        requestedAt: String(request.requestedAt || now),
        resolvedAt: String(request.resolvedAt || '').trim(),
        resolvedBy: String(request.resolvedBy || '').trim(),
        attempt: Math.max(1, Number(request.attempt || 1))
      })) : [],
      bans: Array.isArray(record?.bans) ? record.bans.map((ban) => ({
        id: String(ban?.id || '').trim(),
        memberId: String(ban?.memberId || '').trim(),
        accountKey: normalizeIdentityKey(ban?.accountKey || ban?.email || ''),
        email: String(ban?.email || '').trim(),
        name: String(ban?.name || 'Membro').trim() || 'Membro',
        identityKeys: [...new Set([ban?.accountKey, ban?.email, ban?.memberId, ...(Array.isArray(ban?.identityKeys) ? ban.identityKeys : [])].map(normalizeIdentityKey).filter(Boolean))],
        reason: String(ban?.reason || '').trim(),
        bannedAt: String(ban?.bannedAt || '').trim(),
        expiresAt: String(ban?.expiresAt || '').trim(),
        bannedByAccountKey: normalizeIdentityKey(ban?.bannedByAccountKey || ''),
        bannedByName: String(ban?.bannedByName || '').trim()
      })).filter((ban) => ban.identityKeys.length) : [],
      membershipHistory: Array.isArray(record?.membershipHistory) ? record.membershipHistory.slice() : [],
      coverName: String(record?.coverName || record?.cover?.name || '').trim(),
      coverType: String(record?.coverType || record?.cover?.type || '').trim(),
      coverDataUrl: String(record?.coverDataUrl || record?.cover?.dataUrl || '').trim(),
      joinedAt: record?.joinedAt || now,
      updatedAt: now
    };
    const projector = window.Doke?.communityDomain?.members?.projectCommunityMembers;
    if (typeof projector === 'function') normalized.members = projector({ community: normalized, currentUser: getCurrentUserProfile() });
    return normalized;
  };

  const getCommunityDomainOperations = () => window.Doke?.communityDomain?.operations || null;
  const getCommunityDomainRepository = () => window.Doke?.communityDomain?.repository || null;
  const normalizeCommunityRules = (value) => {
    const source = Array.isArray(value) ? value : String(value || '').split(/\r?\n/);
    const seen = new Set();
    return source.map((rule) => String(rule || '').replace(/\s+/g, ' ').trim().slice(0, 160)).filter((rule) => {
      const key = rule.toLowerCase();
      if (!rule || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
  };

  const createCommunityOperationId = (type, communityId, actorId) => {
    const suffix = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `${String(type || 'community-operation').toLowerCase()}-${String(communityId || 'new')}-${String(actorId || 'anonymous')}-${suffix}`;
  };

  const upsertLocalCommunity = (record) => {
    const nextRecord = normalizeCommunityRecord(record);
    if (isCommunityTombstoned(nextRecord.id)) return null;
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
    const record = readLocalCommunities().find((item) => String(item?.id || '') === String(id));
    const cover = record?.coverDataUrl || card?.querySelector('img')?.getAttribute('src') || '';
    const memberCount = normalizeCommunityRecord(record || {}).members.length || Number(card?.dataset.memberCount || 0);
    const messageCount = Number(record?.messageCount || record?.messagesCount || card?.dataset.messageCount || 0);
    return {
      id,
      title,
      category: card?.dataset.category || record?.category || '',
      coverDataUrl: cover,
      avatar: title.slice(0, 2).toUpperCase(),
      memberCount,
      messageCount,
      listingState: {
        scrollY: window.scrollY,
        filter: currentFilter,
        search: getSearchTerm(),
        communityId: id
      },
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


  const categoryFilterFromRecord = (record) => {
    const value = `${record?.category || ''} ${record?.type || ''} ${record?.visibility || ''}`.toLowerCase();
    if (value.includes('condom')) return 'condominios';
    if (value.includes('reforma')) return 'reforma';
    if (value.includes('servi') || value.includes('prof')) return 'servicos';
    if (value.includes('tecn')) return 'tecnologia';
    if (value.includes('dica')) return 'dicas';
    return 'all';
  };

  const isPublicCommunity = (record) => {
    const visibility = String(record?.visibility || record?.type || record?.category || '').trim().toLowerCase();
    if (!visibility) return true;
    if (visibility.includes('privad') || visibility.includes('convite')) return false;
    return visibility === 'public'
      || visibility.includes('públic')
      || visibility.includes('public')
      || visibility.includes('condom')
      || visibility.includes('prof')
      || visibility.includes('servi')
      || visibility.includes('tecn')
      || visibility.includes('reforma')
      || visibility.includes('dica');
  };

  const isInviteOnlyCommunity = (record) => {
    const visibility = String(record?.visibility || record?.type || '').trim().toLowerCase();
    return visibility === 'invite' || visibility.includes('convite');
  };

  const isRequestablePrivateCommunity = (record) => {
    const visibility = String(record?.visibility || record?.type || '').trim().toLowerCase();
    return !isInviteOnlyCommunity(record) && (visibility === 'private' || visibility.includes('privad'));
  };

  const getCurrentUserJoinRequest = (record, profile = getCurrentUserProfile()) => {
    const profileKeys = profile?.identityKeys || [profile?.id];
    const requests = Array.isArray(record?.joinRequests) ? record.joinRequests : [];
    return requests.find((request) => identitiesIntersect(profileKeys, request?.identityKeys || [request?.userId, request?.userEmail])) || null;
  };

  const createCommunityNotification = (payload = {}) => {
    const service = window.Doke?.services?.notifications;
    const recipientAccountKey = String(payload.recipientAccountKey || payload.userId || '').trim();
    if (!service || typeof service.create !== 'function' || !recipientAccountKey) return Promise.resolve(null);
    return service.create({
      type: payload.type || 'community_update',
      category: 'social',
      userId: String(payload.userId || recipientAccountKey).trim(),
      recipientAccountKey,
      actorId: String(payload.actorId || '').trim(),
      actorName: String(payload.actorName || '').trim(),
      eventKey: String(payload.eventKey || '').trim(),
      title: String(payload.title || 'Atualização da comunidade'),
      body: String(payload.body || payload.message || ''),
      targetUrl: String(payload.targetUrl || 'comunidade.html'),
      actionLabel: String(payload.actionLabel || payload.action || 'Abrir'),
      read: false
    }).catch((error) => {
      console.warn('[DokeCommunity:createNotification]', error);
      return null;
    });
  };

  const getCommunityOwnerRecipientId = (record) => {
    const members = Array.isArray(record?.members) ? record.members : [];
    const owner = members.find((member) => String(member?.role || '') === 'owner');
    return String(owner?.accountKey || owner?.email || owner?.id || owner?.userId || record?.ownerId || '').trim();
  };

  const createJoinRequestId = (communityId, profileId) => {
    const suffix = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `request-${slugifyCommunity(communityId)}-${slugifyCommunity(profileId)}-${suffix}`;
  };

  const submitPrivateCommunityRequest = async (communityId, payload = {}) => {
    const profile = getCurrentUserProfile();
    const operations = getCommunityDomainOperations();
    if (operations?.transact) {
      const operation = operations.transact(communityId, {
        type: 'JOIN_REQUEST_CREATED',
        actorId: profile.id,
        targetId: communityId,
        operationId: createCommunityOperationId('join-request', communityId, profile.id)
      }, (storedRecord) => {
        const record = normalizeCommunityRecord(storedRecord);
        if (!isRequestablePrivateCommunity(record) && record.entryMode !== 'approval' && !payload.inviteCode) return { ok: false, message: 'Esta comunidade não aceita solicitações de entrada.' };
        if (getCommunityRelationship(record, profile) !== 'visitor') return { ok: false, message: 'Você já participa desta comunidade.' };
        const requests = Array.isArray(record.joinRequests) ? record.joinRequests.slice() : [];
        const existingIndex = requests.findIndex((request) => identitiesIntersect(profile.identityKeys || [profile.id], request.identityKeys || [request.userId, request.userEmail]));
        const existing = existingIndex >= 0 ? requests[existingIndex] : null;
        if (existing?.status === 'pending') return { ok: false, reason: 'request-already-pending', message: 'Sua solicitação já está aguardando análise.' };
        const now = new Date().toISOString();
        const request = {
          id: existing?.id || createJoinRequestId(record.id, profile.id),
          userId: profile.id,
          accountKey: profile.accountKey || profile.email || profile.id,
          userName: profile.name,
          userEmail: profile.email,
          identityKeys: profile.identityKeys || [profile.accountKey, profile.email, profile.id].filter(Boolean),
          relation: String(payload.relation || '').trim(), message: String(payload.message || '').trim(),
          answers: Array.isArray(payload.answers) ? payload.answers.map((answer) => String(answer || '').trim()).filter(Boolean).slice(0, 5) : [],
          inviteCode: normalizeInviteCode(payload.inviteCode || ''),
          status: 'pending', requestedAt: now, resolvedAt: '', resolvedBy: '', attempt: Number(existing?.attempt || 0) + 1
        };
        if (existingIndex >= 0) requests[existingIndex] = request; else requests.push(request);
        return { record: { ...record, joinRequests: requests, updatedAt: now }, result: request, payload: { requestId: request.id, attempt: request.attempt } };
      });
      if (operation.ok) {
        const request = operation.result || getCurrentUserJoinRequest(operation.record, profile);
        const ownerRecipientId = getCommunityOwnerRecipientId(operation.record);
        const notification = await createCommunityNotification({
          type: 'community-request-received',
          userId: ownerRecipientId,
          recipientAccountKey: ownerRecipientId,
          actorId: profile.id,
          actorName: profile.name,
          eventKey: ['community-request-received', operation.record?.id, request?.id, ownerRecipientId].filter(Boolean).join(':'),
          title: 'Nova solicitação de entrada',
          body: `${profile.name || 'Uma pessoa'} quer participar de ${operation.record?.title || 'sua comunidade'}.`,
          targetUrl: `comunidade-interna.html?community=${encodeURIComponent(operation.record?.id || communityId)}&title=${encodeURIComponent(operation.record?.title || '')}&settings=requests`,
          actionLabel: 'Analisar solicitação'
        });
        if (!notification) return { ok: false, message: 'A solicitação foi salva, mas a notificação do proprietário não foi criada. Recarregue e tente novamente.' };
        return { ok: true, request, record: operation.record, message: 'Solicitação enviada para análise.' };
      }
      if (operation.reason === 'request-already-pending') return { ok: true, pending: true, message: operation.message };
      return { ok: false, message: operation.message || 'Não foi possível enviar a solicitação.' };
    }

    return { ok: false, message: 'Serviço de comunidade indisponível.' };
  };

  const joinPublicCommunity = (record) => {
    if (!record || !isPublicCommunity(record)) return { ok: false, message: 'Esta comunidade não aceita entrada pública.' };
    if (normalizeCommunityRecord(record).entryMode === 'approval') {
      submitPrivateCommunityRequest(record.id, { relation: 'participante', message: 'Solicitação pela descoberta pública.', answers: [] });
      return { ok: true, pending: true, record: normalizeCommunityRecord(record), message: 'Solicitação enviada para aprovação.' };
    }
    const profile = getCurrentUserProfile();
    const operations = getCommunityDomainOperations();
    if (!operations?.transact) return { ok: false, message: 'Serviço de comunidade indisponível.' };
    const operation = operations.transact(record.id, {
      type: 'MEMBER_JOINED', actorId: profile.id, targetId: profile.id,
      operationId: createCommunityOperationId('public-join', record.id, profile.id),
      payload: { source: 'public-discovery' }
    }, (storedRecord) => {
      const current = normalizeCommunityRecord(storedRecord);
      if (!isPublicCommunity(current)) return { ok: false, message: 'Esta comunidade não aceita entrada pública.' };
      const relationship = getCommunityRelationship(current, profile);
      if (relationship === 'owner' || relationship === 'member') return { ok: false, reason: 'already-member', message: 'Você já participa desta comunidade.' };
      const members = Array.isArray(current.members) ? current.members.slice() : [];
      members.push({ id: profile.id, accountKey: profile.accountKey || profile.id, name: profile.name, email: profile.email, identityKeys: profile.identityKeys, role: 'member', source: 'public-discovery', joinedAt: new Date().toISOString(), addedBy: 'self' });
      return { record: { ...current, members, updatedAt: new Date().toISOString() }, payload: { memberId: profile.id } };
    });
    if (operation.ok) return { ok: true, record: operation.record, alreadyMember: false };
    if (operation.reason === 'already-member') return { ok: true, record: normalizeCommunityRecord(record), alreadyMember: true };
    return { ok: false, message: operation.message || 'Não foi possível entrar na comunidade.' };
  };

  const renderDiscoverCommunities = () => {
    const grid = page.querySelector('[data-community-grid]');
    if (!grid) return;

    const profile = getCurrentUserProfile();
    const discoverable = readLocalCommunities().map(normalizeCommunityRecord).filter((record) => (
      record.visibility !== 'hidden'
      && (isPublicCommunity(record) || isRequestablePrivateCommunity(record))
      && getCommunityRelationship(record, profile) === 'visitor'
    ));

    grid.innerHTML = discoverable.map((record) => {
      const isPublic = isPublicCommunity(record);
      const currentRequest = getCurrentUserJoinRequest(record, profile);
      const isPending = currentRequest?.status === 'pending';
      const description = String(record.description || '').trim()
        || (isPublic ? 'Comunidade pública aberta para novos participantes.' : 'Comunidade privada com entrada sujeita à aprovação.');
      const coverMarkup = record.coverDataUrl
        ? `<img alt="" loading="lazy" src="${escapeCommunityHtml(record.coverDataUrl)}"/>`
        : '';
      const requiresApproval = record.entryMode === 'approval';
      const actionMarkup = isPublic && !requiresApproval
        ? '<button class="community-card__action doke-btn doke-btn--primary" data-community-public-join type="button">Participar</button>'
        : `<button class="community-card__action doke-btn doke-btn--ghost${isPending ? ' community-card__action--pending' : ''}" data-community-request type="button"${isPending ? ' disabled' : ''}>${isPending ? 'Solicitação pendente' : 'Solicitar entrada'}</button>`;
      return `
        <article class="community-card community-discover-card doke-card doke-community-card" data-community-discover-card data-community-card data-community-id="${escapeCommunityHtml(record.id)}" data-title="${escapeCommunityHtml(record.title)}" data-category="${categoryFilterFromRecord(record)}" data-community-questions='${JSON.stringify(record.joinQuestions || []).replace(/'/g, "&#39;")}'>
          <div class="community-card__cover">
            ${coverMarkup}
            <span class="community-card__cover-badge">${escapeCommunityHtml(categoryLabelFromRecord(record))}</span>
          </div>
          <div class="community-card__body">
            <div class="community-card__head">
              <h2>${escapeCommunityHtml(record.title)}</h2>
            </div>
            <p>${escapeCommunityHtml(description)}</p>
            <div class="community-card__meta"><span>${isPublic ? 'Comunidade pública' : 'Comunidade privada'}</span></div>
            ${actionMarkup}
          </div>
        </article>
      `;
    }).join('');

    refreshDiscoveryCardCollections();
  };

  const renderLocalCommunities = () => {
    cleanupExpiredCommunityBans();
    const continueList = page.querySelector('[data-community-continue-list]');
    const localSection = page.querySelector('[data-community-local-section]');
    if (!continueList) return;
    const currentProfile = getCurrentUserProfile();
    const localCommunities = readLocalCommunities().filter((record) => {
      const relation = getCommunityRelationship(record, currentProfile);
      return relation !== 'visitor';
    });
    if (localSection) localSection.hidden = localCommunities.length === 0;
    continueList.querySelectorAll('[data-community-local-card]').forEach((item) => item.remove());
    const existingIds = new Set();

    localCommunities.forEach((record) => {
      if (!record?.id || existingIds.has(record.id)) return;
      existingIds.add(record.id);
      const relationReport = getCommunityRelationReport(record, currentProfile);
      const banState = getCommunityBanState(record, currentProfile);
      const isOwner = relationReport.relation === 'owner';
      const isBanned = banState.active;
      const card = document.createElement('article');
      card.className = 'community-continue-card doke-card doke-community-card';
      card.dataset.category = record.category || 'local';
      card.dataset.communityCard = '';
      card.dataset.title = record.title;
      card.dataset.communityId = record.id;
      card.dataset.cardKind = 'community';
      card.dataset.communityLocalCard = '';
      card.dataset.communityQuestions = JSON.stringify(record.joinQuestions || []);
      if (isBanned && banState.expiresAtMs) {
        card.dataset.communityBanExpiresAt = String(banState.expiresAtMs);
      }
      if (isBanned && !banState.expiresAtMs) {
        card.dataset.communityBanPermanent = 'true';
      }
      const coverMarkup = record.coverDataUrl
        ? `<img alt="" loading="lazy" src="${escapeCommunityHtml(record.coverDataUrl)}"/>`
        : '';
      const activityLabel = isOwner
        ? 'Criada por você'
        : (isBanned ? 'Você foi banido' : 'Acesso liberado');
      const metaPrimary = isBanned
        ? 'Acesso bloqueado'
        : (record.source === 'code' ? 'Entrou por código' : 'Comunidade local');
      const metaSecondary = isBanned
        ? `<span data-community-ban-countdown data-community-ban-expires-at="${escapeCommunityHtml(String(banState.expiresAtMs || ''))}" data-community-ban-permanent="${String(!banState.expiresAtMs)}">${escapeCommunityHtml(getCommunityBanCountdownLabel(banState.ban))}</span>`
        : '<span class="community-online">online</span>';
      const banDetailsMarkup = isBanned
        ? `<div class="community-continue-card__ban-details"><span><strong>Motivo:</strong> ${escapeCommunityHtml(banState.ban?.reason || 'Não informado')}</span><span><strong>Aplicado por:</strong> ${escapeCommunityHtml(banState.ban?.bannedByName || 'Moderação')}</span></div>`
        : '';
      const actionMarkup = isBanned
        ? `<button class="community-open-button doke-btn" type="button" disabled aria-disabled="true">Você foi banido</button>`
        : '<button class="community-open-button doke-btn" data-community-enter type="button">Abrir</button>';
      card.innerHTML = `
        ${coverMarkup}
        <div class="community-continue-card__content">
          <span class="community-pill doke-chip">${categoryLabelFromRecord(record)}</span>
          <h3>${escapeCommunityHtml(record.title)}</h3>
          <span class="community-activity">${escapeCommunityHtml(activityLabel)}</span>
          <div class="community-continue-card__meta"><span>${escapeCommunityHtml(metaPrimary)}</span>${metaSecondary}</div>
          ${banDetailsMarkup}
        </div>
        ${actionMarkup}
      `;
      if (relationReport.relation === 'member') writeCommunityAccessDebug('listing-card-access-liberado', record, relationReport, { action: 'open' });
      if (relationReport.relation === 'banned') writeCommunityAccessDebug('listing-card-banido', record, relationReport, { action: 'blocked', reason: 'banned' });
      continueList.prepend(card);
    });
    ensureCommunityBanCountdown();
  };

  let isLeavingCommunitiesPage = false;

  const openCommunityRoom = (context) => {
    if (isLeavingCommunitiesPage) return;
    const target = buildCommunityRoomUrl(context);
    if (!target) return;

    isLeavingCommunitiesPage = true;
    window.Doke?.communityTransition?.begin('room', context);
    saveSelectedCommunity(context);
    page.setAttribute('aria-busy', 'true');

    // Room entry is a full document navigation. Using the global transition
    // helper here can re-fire auth-surface events before the destination loads,
    // which clears and rebuilds the community collections and causes a flash.
    window.location.assign(target);
  };

  const getCommunityRenderSignature = () => {
    const profile = getCurrentUserProfile();
    const records = readLocalCommunities().map(normalizeCommunityRecord).map((record) => ({
      id: record.id,
      title: record.title,
      visibility: record.visibility,
      relation: getCommunityRelationship(record, profile),
      requests: Array.isArray(record.joinRequests) ? record.joinRequests.map((request) => [request.id, request.status, request.accountKey || request.userId].join(':')).join('|') : '',
      members: Array.isArray(record.members) ? record.members.length : 0,
      updatedAt: record.updatedAt || ''
    }));
    return JSON.stringify({
      profile: profile.accountKey || profile.id || profile.email || '',
      filter: currentFilter,
      query: getSearchTerm(),
      records
    });
  };

  const renderCommunityCollections = (options = {}) => {
    if (isLeavingCommunitiesPage) return;
    const signature = getCommunityRenderSignature();
    if (!options.force && page.dataset.communityHydrated === 'true' && signature === lastCommunityRenderSignature) {
      applyFilters();
      return;
    }
    lastCommunityRenderSignature = signature;
    renderLocalCommunities();
    renderDiscoverCommunities();
    applyFilters();
  };

  setCommunityPageState('loading');
  try {
    renderCommunityCollections({ force: true });
    page.dataset.communityHydrated = 'true';
    setCommunityPageState('hydrated');
  } catch (error) {
    setCommunityPageState('error');
    throw error;
  }

  const prefetchCommunityRoom = (target) => {
    const button = target?.closest?.('[data-community-enter], [data-community-public-join]');
    if (!button || !page.contains(button)) return;
    const context = getCommunityContextFromButton(button);
    const url = buildCommunityRoomUrl(context);
    window.Doke?.communityTransition?.prefetch(url, [
      'assets/css/pages/comunidade-interna-foundation.css',
      'assets/js/pages/comunidade-interna.js'
    ]);
  };

  page.addEventListener('pointerover', (event) => prefetchCommunityRoom(event.target), { passive: true });
  page.addEventListener('focusin', (event) => prefetchCommunityRoom(event.target));
  page.addEventListener('touchstart', (event) => prefetchCommunityRoom(event.target), { passive: true });

  page.addEventListener('click', (event) => {
    const enterButton = event.target.closest('[data-community-enter]');
    if (enterButton && page.contains(enterButton)) {
      openCommunityRoom(getCommunityContextFromButton(enterButton));
      return;
    }

    const requestButton = event.target.closest('[data-community-request]');
    if (requestButton && page.contains(requestButton)) {
      openRequestModal(requestButton);
      return;
    }

    const joinButton = event.target.closest('[data-community-public-join]');
    if (!joinButton || !page.contains(joinButton)) return;
    const context = getCommunityContextFromButton(joinButton);
    const record = readLocalCommunities().find((item) => String(item?.id || '') === String(context.id));
    const result = joinPublicCommunity(record);
    if (!result.ok) return;
    const joinedProfile = getCurrentUserProfile();
    try {
      window.sessionStorage?.setItem(`doke.community.welcome.v1:${result.record.id}:${joinedProfile.id}`, '1');
    } catch (error) {
      // Session storage is best effort only.
    }
    openCommunityRoom(result.record);
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
    closeCreateView();
  });

  if (requestForm) {
    requestForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = requestForm.querySelector('[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      const result = await submitPrivateCommunityRequest(activeRequestCommunityId, {
        relation: requestRole?.value || '',
        message: requestMessage?.value || '',
        answers: [...requestForm.querySelectorAll('[data-community-request-answer]')].map((field) => String(field.value || '').trim())
      });
      if (!result.ok) {
        if (submitButton) submitButton.disabled = false;
        setActionFormFeedback(requestForm, result.message || 'Não foi possível enviar a solicitação.', 'error');
        return;
      }
      setActionFormFeedback(requestForm, 'Solicitação enviada. O administrador poderá aprovar ou recusar seu pedido.', 'success');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Solicitação enviada';
      }
      if (activeRequestButton) {
        activeRequestButton.textContent = 'Solicitação pendente';
        activeRequestButton.classList.remove('community-card__action--request');
        activeRequestButton.classList.add('community-card__action--pending');
        activeRequestButton.disabled = true;
      }
      window.setTimeout(() => {
        closeRequestModal();
        renderCommunityCollections();
      }, 1400);
    });
  }

  codeTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openActionModal(codeModal, trigger));
  });

  createTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openCreateView(trigger));
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

  const clearCommunityAccessRoute = () => {
    const url = new URL(window.location.href);
    ['communityAccess', 'community', 'title', 'reason'].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const setCommunityAccessFeedback = (message, state = 'error') => {
    if (!codeFeedback) return;
    codeFeedback.textContent = message;
    codeFeedback.dataset.state = state;
  };

  const findRenderedCommunityCard = (communityId) => [...page.querySelectorAll('[data-community-card]')]
    .find((card) => String(card.dataset.communityId || '') === String(communityId || '')) || null;

  const handleCommunityAccessRoute = () => {
    const params = new URLSearchParams(window.location.search || '');
    const action = String(params.get('communityAccess') || '').trim();
    if (!action) return;

    const communityId = String(params.get('community') || '').trim();
    const record = readLocalCommunities().map(normalizeCommunityRecord)
      .find((item) => String(item.id || '') === communityId) || null;
    const card = findRenderedCommunityCard(communityId);

    if (action === 'deleted' || isCommunityTombstoned(communityId)) {
      setCommunityAccessFeedback('Esta comunidade foi excluída e não está mais disponível.', 'error');
      codeInput?.focus?.();
      clearCommunityAccessRoute();
      return;
    }

    if (action === 'missing' || !record) {
      setCommunityAccessFeedback('Esta comunidade não existe ou não está mais disponível.', 'error');
      codeInput?.focus?.();
      clearCommunityAccessRoute();
      return;
    }

    const relationReport = getCommunityRelationReport(record);
    const relationship = relationReport.relation;
    if (relationship === 'banned') {
      setCommunityAccessFeedback(getCommunityBanMessage(relationReport.matchedBan), 'error');
      card?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      card?.querySelector('[data-community-ban-countdown]')?.focus?.();
      clearCommunityAccessRoute();
      return;
    }
    if (relationship === 'owner' || relationship === 'member') {
      // Never reopen the room automatically after an access redirect. If the
      // room and listing temporarily disagree about identity, automatic reopen
      // creates an infinite sala/listagem redirect cycle. Keep the user on the
      // stable listing and require an explicit click on Abrir after the state is
      // visible and settled.
      clearCommunityAccessRoute();
      setCommunityAccessFeedback('A comunidade está disponível. Clique em Abrir para tentar novamente.', 'success');
      card?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      card?.querySelector('[data-community-enter]')?.focus?.();
      return;
    }

    if (action === 'join') {
      const button = card?.querySelector('[data-community-public-join]');
      setCommunityAccessFeedback('Participe da comunidade pública para acessar a sala.', 'error');
      card?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      button?.focus?.();
      clearCommunityAccessRoute();
      return;
    }

    if (action === 'request') {
      const button = card?.querySelector('[data-community-request]');
      if (button && !button.disabled) openRequestModal(button);
      else setCommunityAccessFeedback('Envie uma solicitação de entrada para acessar esta comunidade.', 'error');
      clearCommunityAccessRoute();
      return;
    }

    if (action === 'pending') {
      setCommunityAccessFeedback('Sua solicitação ainda está aguardando análise. O acesso será liberado após a aprovação.', 'error');
      card?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      clearCommunityAccessRoute();
      return;
    }

    if (action === 'left') {
      setCommunityAccessFeedback('Você saiu da comunidade. As mensagens anteriores foram preservadas e o acesso pode ser solicitado novamente conforme a privacidade.', 'success');
      card?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      clearCommunityAccessRoute();
      return;
    }

    if (action === 'invite') {
      openActionModal(codeModal, codeTriggers[0] || null);
      const modalFeedback = codeModal?.querySelector('[data-community-action-feedback]');
      if (modalFeedback) {
        modalFeedback.textContent = 'Esta comunidade só pode ser acessada com um código de convite válido.';
        modalFeedback.dataset.state = 'error';
        modalFeedback.hidden = false;
      }
      clearCommunityAccessRoute();
      return;
    }

    setCommunityAccessFeedback('Você ainda não tem acesso a esta comunidade.', 'error');
    clearCommunityAccessRoute();
  };

  const validateRequiredField = (field, message) => {
    if (!field || field.value.trim()) return true;
    field.focus();
    field.setAttribute('aria-invalid', 'true');
    const form = field.closest('form');
    if (form) setActionFormFeedback(form, message, 'error');
    return false;
  };

  function escapeCommunityHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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
    if (Array.isArray(cachedCreateMemberCandidates)) return cachedCreateMemberCandidates;
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

    cachedCreateMemberCandidates = [...map.values()].slice(0, 8);
    return cachedCreateMemberCandidates;
  };

  const getCommunityInvites = (record) => {
    const normalized = normalizeCommunityRecord(record || {});
    const invites = Array.isArray(normalized.invites) ? normalized.invites.slice() : [];
    if (normalized.invite && !invites.some((item) => item.code === normalized.invite.code)) invites.unshift(normalized.invite);
    return invites.filter((invite) => invite && invite.code);
  };

  const getCommunityInvite = (record, code = '') => {
    const normalizedCode = normalizeInviteCode(code);
    const invites = getCommunityInvites(record);
    if (normalizedCode) return invites.find((invite) => invite.code === normalizedCode) || null;
    return invites.find((invite) => invite.active !== false && !isInviteExpired(invite) && !(invite.maxUses > 0 && invite.uses >= invite.maxUses)) || null;
  };

  const isInviteExpired = (invite) => {
    if (!invite?.expiresAt) return false;
    const expiresAt = Date.parse(invite.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt <= Date.now();
  };

  const joinCommunityByInvite = (record, invite) => {
    const profile = getCurrentUserProfile();
    const members = Array.isArray(record.members) ? record.members.slice() : [];
    const profileName = String(profile.name || '').trim().toLowerCase();
    const exists = members.some((member) => String(member?.id || '') === String(profile.id)
      || String(member?.name || '').trim().toLowerCase() === profileName);

    if (!exists) {
      members.push({
        id: profile.id,
        accountKey: profile.accountKey || profile.id,
        name: profile.name,
        email: profile.email,
        identityKeys: profile.identityKeys,
        role: String(invite && invite.autoRoleId || 'member'),
        roleIds: invite && invite.autoRoleId ? ['member', String(invite.autoRoleId)] : ['member'],
        source: 'invite',
        joinedAt: new Date().toISOString(),
        addedBy: 'invite'
      });
    }

    const communities = readLocalCommunities();
    const index = communities.findIndex((item) => String(item?.id || '') === String(record.id));
    const saved = {
      ...record,
      members,
      source: record.source || 'invite',
      joinedAt: record.joinedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (index >= 0) communities[index] = saved;
    else communities.unshift(saved);
    writeLocalCommunities(communities);
    return { record: saved, alreadyMember: exists };
  };

  const resolveInviteEntry = (rawCode) => {
    const code = normalizeInviteCode(rawCode);
    if (!code) return { ok: false, code, message: 'Digite um código válido.' };

    const record = readLocalCommunities().find((community) => Boolean(getCommunityInvite(community, code)));
    if (!record) return { ok: false, code, message: 'Convite não encontrado ou revogado.' };

    const invite = getCommunityInvite(record, code);
    if (!invite || invite.active === false) return { ok: false, code, message: 'Este convite foi desativado.' };
    if (isInviteExpired(invite)) return { ok: false, code, message: 'Este convite expirou. Solicite um novo código.' };
    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) return { ok: false, code, message: 'Este convite atingiu o limite de usos.' };
    const banState = getCommunityBanState(record, getCurrentUserProfile());
    if (banState.active) {
      return { ok: false, code, message: getCommunityBanMessage(banState.ban) };
    }

    const requiresApproval = invite.requireApproval || normalizeCommunityRecord(record).entryMode === 'approval';
    if (requiresApproval) {
      const requestResult = submitPrivateCommunityRequest(record.id, {
        relation: 'convidado',
        message: 'Entrada solicitada com convite ' + code,
        inviteCode: code,
        answers: []
      });
      return { ok: false, pending: true, code, message: 'Convite validado. Sua entrada foi enviada para aprovação.' };
    }

    const result = joinCommunityByInvite(record, invite);
    const communities = readLocalCommunities();
    const index = communities.findIndex((item) => String(item?.id || '') === String(record.id));
    if (index >= 0) {
      const updated = normalizeCommunityRecord(communities[index]);
      updated.invites = getCommunityInvites(updated).map((item) => item.code === code ? { ...item, uses: Number(item.uses || 0) + (result.alreadyMember ? 0 : 1) } : item);
      if (updated.invite && updated.invite.code === code) updated.invite = updated.invites.find((item) => item.code === code) || updated.invite;
      communities[index] = updated;
      writeLocalCommunities(communities);
      result.record = updated;
    }
    return {
      ok: true,
      code,
      record: result.record,
      message: result.alreadyMember
        ? 'Você já participa desta comunidade. Abrindo...'
        : 'Entrada confirmada. Abrindo comunidade...'
    };
  };

  const getCreateFormParts = () => {
    if (!createForm) return {};
    return {
      steps: [...createForm.querySelectorAll('[data-community-create-step]')],
      progress: [...createForm.querySelectorAll('[data-community-create-progress]')],
      prevButton: createForm.querySelector('[data-community-create-prev]'),
      nextButton: createForm.querySelector('[data-community-create-next]'),
      submitButton: createForm.querySelector('[data-community-create-submit]'),
      cancelButtons: [...createForm.querySelectorAll('[data-community-create-cancel]')],
      memberSearch: createForm.querySelector('[data-community-member-search]'),
      memberList: createForm.querySelector('[data-community-member-list]'),
      memberEmpty: createForm.querySelector('[data-community-member-empty]'),
      reviewName: createForm.querySelector('[data-community-review-name]'),
      reviewType: createForm.querySelector('[data-community-review-type]'),
      reviewMembers: createForm.querySelector('[data-community-review-members]'),
      reviewRules: createForm.querySelector('[data-community-review-rules]'),
      stepLabel: createForm.querySelector('[data-community-create-step-label]'),
      stepTitle: createForm.querySelector('[data-community-create-step-title]'),
      progressFill: createForm.querySelector('[data-community-create-fill]'),
      coverInput: createForm.querySelector('[data-community-cover-input]'),
      coverPreview: createForm.querySelector('[data-community-cover-preview]'),
      coverRemove: createForm.querySelector('[data-community-cover-remove]'),
      reviewCover: createForm.querySelector('[data-community-review-cover]')
    };
  };

  const COMMUNITY_COVER_MAX_WIDTH = 1600;
  const COMMUNITY_COVER_MAX_HEIGHT = 900;
  const COMMUNITY_COVER_MAX_BYTES = 1.5 * 1024 * 1024;

  const prepareCommunityCover = (file) => new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('invalid-image'));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('error', () => reject(new Error('read-failed')));
    reader.addEventListener('load', () => {
      const image = new Image();
      image.addEventListener('error', () => reject(new Error('decode-failed')));
      image.addEventListener('load', () => {
        const scale = Math.min(1, COMMUNITY_COVER_MAX_WIDTH / image.naturalWidth, COMMUNITY_COVER_MAX_HEIGHT / image.naturalHeight);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('canvas-unavailable'));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        let quality = 0.86;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length * 0.75 > COMMUNITY_COVER_MAX_BYTES && quality > 0.55) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve({
          name: String(file.name || 'capa-da-comunidade').replace(/\.[^.]+$/, '') + '.jpg',
          type: 'image/jpeg',
          dataUrl,
          width,
          height
        });
      });
      image.src = String(reader.result || '');
    });
    reader.readAsDataURL(file);
  });

  const renderCreateCoverPreview = () => {
    const parts = getCreateFormParts();
    const hasCover = Boolean(createCoverState.dataUrl);
    const previewMarkup = hasCover
      ? `<img alt="" src="${escapeCommunityHtml(createCoverState.dataUrl)}"/><span>${escapeCommunityHtml(createCoverState.name || 'Capa anexada')}</span>`
      : '<span>Sem capa anexada</span>';

    [parts.coverPreview, parts.reviewCover].forEach((preview) => {
      if (!preview) return;
      preview.classList.toggle('has-cover', hasCover);
      preview.innerHTML = previewMarkup;
    });

    if (parts.coverRemove) parts.coverRemove.hidden = !hasCover;
  };

  const ensureCreateCoverControls = () => {
    if (!createForm || createForm.querySelector('[data-community-cover-field]')) return;
    const detailsStep = createForm.querySelector('[data-community-create-step="details"]');
    const descriptionField = detailsStep?.querySelector('#community-action-description-input')?.closest('.doke-modal-field, .doke-action-modal__field');
    if (!detailsStep || !descriptionField) return;

    const field = document.createElement('div');
    field.className = 'community-create-cover-upload doke-action-modal__field doke-modal-field';
    field.dataset.communityCoverField = '';
    field.innerHTML = `
      <span>Capa da comunidade</span>
      <div class="community-create-cover-upload__controls">
        <input class="sr-only" id="community-action-cover-input" data-community-cover-input type="file" accept="image/*" />
        <label class="community-create-cover-upload__button doke-btn doke-btn--ghost" for="community-action-cover-input">Anexar capa</label>
        <button class="community-create-cover-upload__remove doke-btn doke-btn--ghost" data-community-cover-remove type="button" hidden>Remover</button>
      </div>
      <div class="community-create-cover-preview" data-community-cover-preview><span>Sem capa anexada</span></div>
    `;
    descriptionField.insertAdjacentElement('afterend', field);

    const reviewCover = createForm.querySelector('.community-action-cover > div');
    if (reviewCover) reviewCover.dataset.communityReviewCover = '';

    const parts = getCreateFormParts();
    parts.coverInput?.addEventListener('change', () => {
      const file = parts.coverInput?.files?.[0];
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) {
        createCoverState = { name: '', type: '', dataUrl: '' };
        if (parts.coverInput) parts.coverInput.value = '';
        renderCreateCoverPreview();
        setActionFormFeedback(createForm, 'Escolha uma imagem para usar como capa.', 'error');
        return;
      }

      prepareCommunityCover(file).then((prepared) => {
        createCoverState = prepared;
        renderCreateCoverPreview();
        setActionFormFeedback(createForm, 'Capa otimizada e anexada.', 'success');
      }).catch(() => {
        createCoverState = { name: '', type: '', dataUrl: '' };
        if (parts.coverInput) parts.coverInput.value = '';
        renderCreateCoverPreview();
        setActionFormFeedback(createForm, 'Não foi possível processar a capa. Tente outra imagem.', 'error');
      });
    });

    parts.coverRemove?.addEventListener('click', () => {
      createCoverState = { name: '', type: '', dataUrl: '' };
      if (parts.coverInput) parts.coverInput.value = '';
      renderCreateCoverPreview();
    });

    renderCreateCoverPreview();
  };

  const scheduleCreateMemberRender = () => {
    window.clearTimeout(memberSearchRenderTimer);
    memberSearchRenderTimer = window.setTimeout(renderCreateMemberCandidates, 120);
  };

  const updateCreateReview = () => {
    const parts = getCreateFormParts();
    const name = createForm?.querySelector('input[name="communityName"]')?.value.trim() || 'Comunidade Doke';
    const type = createForm?.querySelector('select[name="communityType"]')?.value || 'Condomínio';
    const selectedCount = selectedCreateMemberIds.size;
    const rules = normalizeCommunityRules(createForm?.querySelector('textarea[name="communityRules"]')?.value || '');
    if (parts.reviewName) parts.reviewName.textContent = name;
    if (parts.reviewType) parts.reviewType.textContent = type;
    if (parts.reviewMembers) parts.reviewMembers.textContent = selectedCount ? `Você + ${selectedCount}` : 'Você';
    if (parts.reviewRules) parts.reviewRules.textContent = rules.length ? `${rules.length} ${rules.length === 1 ? 'regra' : 'regras'}` : 'Nenhuma regra adicionada';
    renderCreateCoverPreview();
  };

  const setCreateWizardStep = (stepKey, { focus = true } = {}) => {
    if (!createForm) return;
    const nextIndex = Math.max(0, createStepKeys.indexOf(stepKey));
    createStepIndex = nextIndex >= 0 ? nextIndex : 0;
    const activeKey = createStepKeys[createStepIndex];
    createForm.dataset.communityCreateCurrentStep = activeKey;
    const parts = getCreateFormParts();
    const stepNumber = createStepIndex + 1;
    if (parts.stepLabel) parts.stepLabel.textContent = `Etapa ${stepNumber} de ${createStepKeys.length}`;
    if (parts.stepTitle) parts.stepTitle.textContent = createStepLabels[activeKey] || 'Nova comunidade';
    if (parts.progressFill) parts.progressFill.dataset.communityCreateValue = String(Math.round((stepNumber / createStepKeys.length) * 100));

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

    const setActionVisibility = (button, visible) => {
      if (!button) return;
      button.hidden = !visible;
      button.disabled = !visible;
      button.setAttribute('aria-hidden', visible ? 'false' : 'true');
    };

    const isFirstStep = createStepIndex === 0;
    const isLastStep = createStepIndex === createStepKeys.length - 1;
    parts.cancelButtons?.forEach((button) => setActionVisibility(button, isFirstStep));
    setActionVisibility(parts.prevButton, !isFirstStep);
    setActionVisibility(parts.nextButton, !isLastStep);
    setActionVisibility(parts.submitButton, isLastStep);
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
    createCoverState = { name: '', type: '', dataUrl: '' };
    cachedCreateMemberCandidates = null;
    renderCreateCoverPreview();
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

  ensureCreateCoverControls();

  document.querySelectorAll('[data-community-code-modal-form], [data-community-create-form]').forEach((form) => {
    form.addEventListener('input', (event) => {
      const field = event.target.closest('input, textarea');
      if (field) field.removeAttribute('aria-invalid');
      if (form.matches('[data-community-create-form]') && event.target.matches('[data-community-member-search]')) {
        scheduleCreateMemberRender();
      }
    });

    form.addEventListener('change', (event) => {
      if (!form.matches('[data-community-create-form]')) return;
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
        const result = resolveInviteEntry(codeField?.value);
        if (!result.ok) {
          codeField?.setAttribute('aria-invalid', 'true');
          setActionFormFeedback(form, result.message, 'error');
          return;
        }
        setActionFormFeedback(form, result.message, 'success');
        window.setTimeout(() => openCommunityRoom(result.record), 220);
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
      const rulesField = form.querySelector('textarea[name="communityRules"]');
      const creator = getCurrentUserProfile();
      const members = [{ ...creator, role: 'owner' }, ...getSelectedCreateMembers()];
      const createdAt = new Date().toISOString();
      const communityDraft = {
        id: createCommunityId(nameField.value),
        title: nameField.value.trim(),
        category: typeField?.value || 'Comunidade',
        description: descriptionField?.value || '',
        rules: normalizeCommunityRules(rulesField?.value || ''),
        ownerId: creator.id,
        ownerAccountKey: creator.accountKey || creator.email || creator.id,
        ownerIdentityKeys: creator.identityKeys,
        createdById: creator.id,
        coverName: createCoverState.name,
        coverType: createCoverState.type,
        coverDataUrl: createCoverState.dataUrl,
        coverWidth: Number(createCoverState.width || 0),
        coverHeight: Number(createCoverState.height || 0),
        members: members.map((member, index) => ({
          ...member,
          role: index === 0 ? 'owner' : (member.role || 'member'),
          joinedAt: member.joinedAt || createdAt,
          source: index === 0 ? 'creator' : (member.source || 'creation-selection')
        })),
        createdAt,
        source: 'created'
      };
      const createOperation = getCommunityDomainOperations()?.create?.(communityDraft, {
        type: 'COMMUNITY_CREATED', actorId: creator.id, targetId: communityDraft.id,
        operationId: createCommunityOperationId('create', communityDraft.id, creator.id),
        payload: { visibility: communityDraft.category }
      });
      let record = createOperation?.ok ? createOperation.record : null;
      if (!record) {
        setActionFormFeedback(form, 'Não foi possível criar a comunidade. Tente novamente.', 'error');
        return;
      }

      // A newly created community must be owned by the account that completed
      // the creation flow before any room navigation occurs. Persist the
      // canonical identity again after domain migration so private communities
      // can never redirect their own creator to the join-request flow.
      const ownerKeys = [...new Set([
        creator.accountKey,
        creator.id,
        creator.email,
        ...(Array.isArray(creator.identityKeys) ? creator.identityKeys : [])
      ].map(normalizeIdentityKey).filter(Boolean))];
      const ownerAccountKey = normalizeIdentityKey(creator.accountKey || creator.email || ownerKeys[0] || '');
      const ownerMember = {
        ...creator,
        id: String(creator.id || ownerAccountKey || '').trim(),
        accountKey: ownerAccountKey,
        email: String(creator.email || '').trim(),
        identityKeys: ownerKeys,
        role: 'owner',
        source: 'account',
        joinedAt: creator.joinedAt || new Date().toISOString(),
        addedBy: 'community-create'
      };
      const persistedMembers = Array.isArray(record.members) ? record.members : [];
      const membersWithoutOwner = persistedMembers.filter((member) => String(member?.role || '').toLowerCase() !== 'owner');
      const repairedRecord = {
        ...record,
        ownerId: String(ownerMember.id || ownerAccountKey || '').trim(),
        ownerIdentityKeys: ownerKeys,
        createdById: String(ownerMember.id || ownerAccountKey || '').trim(),
        members: [ownerMember, ...membersWithoutOwner]
      };
      const repaired = getCommunityDomainRepository()?.upsert?.(repairedRecord, {
        type: 'COMMUNITY_OWNER_INVARIANT_REPAIRED',
        actorId: ownerMember.id,
        targetId: repairedRecord.id,
        operationId: createCommunityOperationId('owner-invariant', repairedRecord.id, ownerMember.id),
        payload: { source: 'community-create' }
      });
      if (repaired) record = repaired;

      try {
        window.sessionStorage?.setItem('doke.community.recent-create.v1', JSON.stringify({
          communityId: record.id,
          ownerAccountKey,
          ownerIdentityKeys: ownerKeys,
          createdAt: Date.now()
        }));
      } catch (error) {
        // The persisted owner invariant above is authoritative. Session storage
        // only helps the destination recover from a transient auth hydration gap.
      }

      const relationAfterCreate = getCommunityRelationReport(record, creator);
      if (relationAfterCreate.relation !== 'owner') {
        setActionFormFeedback(form, 'A comunidade foi criada, mas não foi possível confirmar sua propriedade. Recarregue a página antes de continuar.', 'error');
        renderCommunityCollections({ force: true });
        return;
      }

      setActionFormFeedback(form, 'Comunidade criada. Abrindo sala...', 'success');
      window.setTimeout(() => openCommunityRoom(record), 220);
    });
  });

  createForm?.querySelector('[data-community-create-next]')?.addEventListener('click', goToNextCreateStep);
  createForm?.querySelector('[data-community-create-prev]')?.addEventListener('click', goToPreviousCreateStep);
  createForm?.querySelectorAll('[data-community-create-cancel]')?.forEach((button) => {
    button.addEventListener('click', () => closeCreateView());
  });
  createForm?.querySelectorAll('[data-community-create-progress]')?.forEach((button) => {
    button.addEventListener('click', () => {
      const targetIndex = createStepKeys.indexOf(button.dataset.communityCreateProgress);
      if (targetIndex < 0 || targetIndex > createStepIndex) return;
      setCreateWizardStep(createStepKeys[targetIndex]);
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
    codeInput.addEventListener('input', () => {
      codeInput.value = normalizeInviteCode(codeInput.value).slice(0, 18);
      codeInput.removeAttribute('aria-invalid');
      codeFeedback.textContent = '';
      delete codeFeedback.dataset.state;
    });

    codeForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const code = normalizeInviteCode(codeInput.value);

      if (!code) {
        codeInput.setAttribute('aria-invalid', 'true');
        codeFeedback.textContent = 'Digite um código válido.';
        codeFeedback.dataset.state = 'error';
        return;
      }

      const result = resolveInviteEntry(code);
      if (!result.ok) {
        codeInput.setAttribute('aria-invalid', 'true');
        codeFeedback.textContent = result.message;
        codeFeedback.dataset.state = 'error';
        return;
      }

      codeFeedback.textContent = result.message;
      codeFeedback.dataset.state = 'success';
      window.setTimeout(() => openCommunityRoom(result.record), 220);
    });
  }

  handleCommunityAccessRoute();
  applyFilters();
  window.addEventListener('storage', (event) => {
    if ([COMMUNITY_LIST_STORAGE_KEY, COMMUNITY_DELETED_STORAGE_KEY, COMMUNITY_LIFECYCLE_STORAGE_KEY].includes(event.key)) {
      cleanupExpiredCommunityBans();
      renderCommunityCollections({ force: true });
    }
  });

  document.addEventListener('doke:auth-session-change', renderCommunityCollections);
  document.addEventListener('doke:auth-surface-ready', renderCommunityCollections);

};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.DokeInitCommunity, { once: true });
} else {
  window.DokeInitCommunity();
}
