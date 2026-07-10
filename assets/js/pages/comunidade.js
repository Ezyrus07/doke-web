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
  const requestSuccess = document.querySelector('[data-community-request-success]');
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
    if (requestForm) requestForm.hidden = false;
    if (requestSuccess) requestSuccess.hidden = true;
    if (requestMessage) requestMessage.value = '';
    if (requestRole) requestRole.value = 'morador';

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

  const normalizeIdentityKey = (value) => String(value || '').trim().toLowerCase();

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
    member?.id,
    member?.userId,
    member?.profileId,
    member?.email,
    ...(Array.isArray(member?.identityKeys) ? member.identityKeys : [])
  ].map(normalizeIdentityKey).filter(Boolean))];

  const getMemberId = (member) => String(member?.id || member?.userId || member?.profileId || member?.email || '').trim();

  const getCurrentUserProfile = () => {
    const sessionUser = window.Doke?.session?.getCurrentUser?.();
    const authUser = window.DokeAuth?.service?.getCurrentUser?.();
    const user = sessionUser || authUser || null;
    const name = user?.displayName || user?.name || user?.fullName || user?.email || 'Você';
    const identityKeys = getIdentityKeysFromUser(user);
    const id = identityKeys[0] || `anonymous-${slugifyCommunity(name)}`;
    return {
      id,
      name,
      email: String(user?.email || '').trim(),
      identityKeys,
      role: 'member',
      source: 'account'
    };
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
    if (isCurrentUserCommunityOwner(record, profile)) return 'owner';
    if (isCurrentUserCommunityMember(record, profile)) return 'member';
    return 'visitor';
  };

  const normalizeCommunityRecord = (record) => {
    const title = String(record?.title || record?.name || 'Comunidade Doke').trim() || 'Comunidade Doke';
    const id = String(record?.id || record?.community || slugifyCommunity(title)).trim() || slugifyCommunity(title);
    const category = String(record?.category || record?.type || '').trim();
    const now = new Date().toISOString();
    const inviteCode = normalizeInviteCode(record?.invite?.code || record?.inviteCode || record?.code);
    return {
      id,
      title,
      category,
      type: String(record?.type || record?.visibility || category || 'public').trim() || 'public',
      visibility: String(record?.visibility || record?.type || category || 'public').trim() || 'public',
      description: String(record?.description || '').trim(),
      code: String(record?.code || '').trim(),
      inviteCode,
      invite: inviteCode ? {
        code: inviteCode,
        active: record?.invite?.active !== false,
        createdAt: String(record?.invite?.createdAt || record?.inviteCreatedAt || now),
        expiresAt: String(record?.invite?.expiresAt || record?.inviteExpiresAt || ''),
        generation: Number(record?.invite?.generation || 1)
      } : null,
      ownerId: deriveCommunityOwnerId(record),
      ownerIdentityKeys: [...new Set((Array.isArray(record?.ownerIdentityKeys) ? record.ownerIdentityKeys : getCommunityOwnerIdentityKeys(record)).map(normalizeIdentityKey).filter(Boolean))],
      createdById: String(record?.createdById || record?.ownerId || '').trim(),
      roles: Array.isArray(record?.roles) ? record.roles : [],
      role: record?.role || 'member',
      source: record?.source || 'local',
      members: Array.isArray(record?.members) ? record.members.filter((member) => member && member.name).map((member) => ({
        id: String(member.id || member.userId || member.profileId || member.email || slugifyCommunity(member.name)).trim(),
        name: String(member.name || '').trim(),
        email: String(member.email || '').trim(),
        identityKeys: getMemberIdentityKeys(member),
        role: member.role || 'member',
        source: member.source || 'messages',
        joinedAt: String(member.joinedAt || '').trim(),
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
      coverName: String(record?.coverName || record?.cover?.name || '').trim(),
      coverType: String(record?.coverType || record?.cover?.type || '').trim(),
      coverDataUrl: String(record?.coverDataUrl || record?.cover?.dataUrl || '').trim(),
      joinedAt: record?.joinedAt || now,
      updatedAt: now
    };
  };

  const getCommunityDomainOperations = () => window.Doke?.communityDomain?.operations || null;
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

  const createJoinRequestId = (communityId, profileId) => {
    const suffix = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `request-${slugifyCommunity(communityId)}-${slugifyCommunity(profileId)}-${suffix}`;
  };

  const submitPrivateCommunityRequest = (communityId, payload = {}) => {
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
        if (!isRequestablePrivateCommunity(record)) return { ok: false, message: 'Esta comunidade não aceita solicitações de entrada.' };
        if (getCommunityRelationship(record, profile) !== 'visitor') return { ok: false, message: 'Você já participa desta comunidade.' };
        const requests = Array.isArray(record.joinRequests) ? record.joinRequests.slice() : [];
        const existingIndex = requests.findIndex((request) => identitiesIntersect(profile.identityKeys || [profile.id], request.identityKeys || [request.userId, request.userEmail]));
        const existing = existingIndex >= 0 ? requests[existingIndex] : null;
        if (existing?.status === 'pending') return { ok: false, reason: 'request-already-pending', message: 'Sua solicitação já está aguardando análise.' };
        const now = new Date().toISOString();
        const request = {
          id: existing?.id || createJoinRequestId(record.id, profile.id),
          userId: profile.id, userName: profile.name, userEmail: profile.email,
          identityKeys: profile.identityKeys || [profile.id],
          relation: String(payload.relation || '').trim(), message: String(payload.message || '').trim(),
          status: 'pending', requestedAt: now, resolvedAt: '', resolvedBy: '', attempt: Number(existing?.attempt || 0) + 1
        };
        if (existingIndex >= 0) requests[existingIndex] = request; else requests.push(request);
        return { record: { ...record, joinRequests: requests, updatedAt: now }, result: request, payload: { requestId: request.id, attempt: request.attempt } };
      });
      if (operation.ok) return { ok: true, request: operation.result, record: operation.record, message: 'Solicitação enviada para análise.' };
      if (operation.reason === 'request-already-pending') return { ok: true, pending: true, message: operation.message };
      return { ok: false, message: operation.message || 'Não foi possível enviar a solicitação.' };
    }

    return { ok: false, message: 'Serviço de comunidade indisponível.' };
  };

  const joinPublicCommunity = (record) => {
    if (!record || !isPublicCommunity(record)) return { ok: false, message: 'Esta comunidade não aceita entrada pública.' };
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
      members.push({ id: profile.id, name: profile.name, email: profile.email, identityKeys: profile.identityKeys, role: 'member', source: 'public-discovery', joinedAt: new Date().toISOString(), addedBy: 'self' });
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
      (isPublicCommunity(record) || isRequestablePrivateCommunity(record))
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
      const actionMarkup = isPublic
        ? '<button class="community-card__action doke-btn doke-btn--primary" data-community-public-join type="button">Participar</button>'
        : `<button class="community-card__action doke-btn${isPending ? ' community-card__action--pending' : ''}" data-community-request type="button"${isPending ? ' disabled' : ''}>${isPending ? 'Solicitação pendente' : 'Solicitar entrada'}</button>`;
      return `
        <article class="community-card community-discover-card doke-card doke-community-card" data-community-discover-card data-community-card data-community-id="${escapeCommunityHtml(record.id)}" data-title="${escapeCommunityHtml(record.title)}" data-category="${categoryFilterFromRecord(record)}">
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
    const continueList = page.querySelector('[data-community-continue-list]');
    const localSection = page.querySelector('[data-community-local-section]');
    if (!continueList) return;
    const currentProfile = getCurrentUserProfile();
    const localCommunities = readLocalCommunities().filter((record) => getCommunityRelationship(record, currentProfile) !== 'visitor');
    if (localSection) localSection.hidden = localCommunities.length === 0;
    continueList.querySelectorAll('[data-community-local-card]').forEach((item) => item.remove());
    const existingIds = new Set();

    localCommunities.forEach((record) => {
      if (!record?.id || existingIds.has(record.id)) return;
      existingIds.add(record.id);
      const card = document.createElement('article');
      card.className = 'community-continue-card doke-card doke-community-card';
      card.dataset.category = record.category || 'local';
      card.dataset.communityCard = '';
      card.dataset.title = record.title;
      card.dataset.communityId = record.id;
      card.dataset.cardKind = 'community';
      card.dataset.communityLocalCard = '';
      const coverMarkup = record.coverDataUrl
        ? `<img alt="" loading="lazy" src="${escapeCommunityHtml(record.coverDataUrl)}"/>`
        : '';
      card.innerHTML = `
        ${coverMarkup}
        <div class="community-continue-card__content">
          <span class="community-pill doke-chip">${categoryLabelFromRecord(record)}</span>
          <h3>${escapeCommunityHtml(record.title)}</h3>
          <span class="community-activity">${getCommunityRelationship(record, currentProfile) === 'owner' ? 'Criada por você' : 'Acesso liberado'}</span>
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

  const renderCommunityCollections = () => {
    renderLocalCommunities();
    renderDiscoverCommunities();
    applyFilters();
  };

  renderCommunityCollections();

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

  if (requestForm && requestSuccess) {
    requestForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = submitPrivateCommunityRequest(activeRequestCommunityId, {
        relation: requestRole?.value || '',
        message: requestMessage?.value || ''
      });
      if (!result.ok) {
        setActionFormFeedback(requestForm, result.message || 'Não foi possível enviar a solicitação.', 'error');
        return;
      }
      requestForm.hidden = true;
      requestSuccess.hidden = false;
      if (activeRequestButton) {
        activeRequestButton.textContent = 'Solicitação pendente';
        activeRequestButton.classList.remove('community-card__action--request');
        activeRequestButton.classList.add('community-card__action--pending');
        activeRequestButton.disabled = true;
      }
      window.setTimeout(() => {
        closeRequestModal();
        renderCommunityCollections();
      }, 1800);
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

    const relationship = getCommunityRelationship(record);
    if (relationship === 'owner' || relationship === 'member') {
      clearCommunityAccessRoute();
      openCommunityRoom(record);
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

  const getCommunityInvite = (record) => {
    const code = normalizeInviteCode(record?.invite?.code || record?.inviteCode || record?.code);
    if (!code) return null;
    return {
      code,
      active: record?.invite?.active !== false,
      createdAt: String(record?.invite?.createdAt || record?.inviteCreatedAt || ''),
      expiresAt: String(record?.invite?.expiresAt || record?.inviteExpiresAt || '')
    };
  };

  const isInviteExpired = (invite) => {
    if (!invite?.expiresAt) return false;
    const expiresAt = Date.parse(invite.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt <= Date.now();
  };

  const joinCommunityByInvite = (record) => {
    const profile = getCurrentUserProfile();
    const members = Array.isArray(record.members) ? record.members.slice() : [];
    const profileName = String(profile.name || '').trim().toLowerCase();
    const exists = members.some((member) => String(member?.id || '') === String(profile.id)
      || String(member?.name || '').trim().toLowerCase() === profileName);

    if (!exists) {
      members.push({
        id: profile.id,
        name: profile.name,
        role: 'member',
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

    const record = readLocalCommunities().find((community) => {
      const invite = getCommunityInvite(community);
      return invite && invite.code === code;
    });
    if (!record) return { ok: false, code, message: 'Convite não encontrado ou substituído por um novo código.' };

    const invite = getCommunityInvite(record);
    if (!invite.active) return { ok: false, code, message: 'Este convite foi desativado.' };
    if (isInviteExpired(invite)) return { ok: false, code, message: 'Este convite expirou. Solicite um novo código.' };

    const result = joinCommunityByInvite(record);
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
      stepLabel: createForm.querySelector('[data-community-create-step-label]'),
      stepTitle: createForm.querySelector('[data-community-create-step-title]'),
      progressFill: createForm.querySelector('[data-community-create-fill]'),
      coverInput: createForm.querySelector('[data-community-cover-input]'),
      coverPreview: createForm.querySelector('[data-community-cover-preview]'),
      coverRemove: createForm.querySelector('[data-community-cover-remove]'),
      reviewCover: createForm.querySelector('[data-community-review-cover]')
    };
  };

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

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        createCoverState = {
          name: file.name || 'capa-da-comunidade',
          type: file.type || 'image/*',
          dataUrl: String(reader.result || '')
        };
        renderCreateCoverPreview();
        setActionFormFeedback(createForm, 'Capa anexada. A prévia foi atualizada.', 'success');
      });
      reader.addEventListener('error', () => {
        setActionFormFeedback(createForm, 'Não foi possível carregar a capa. Tente outra imagem.', 'error');
      });
      reader.readAsDataURL(file);
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
    if (parts.reviewName) parts.reviewName.textContent = name;
    if (parts.reviewType) parts.reviewType.textContent = type;
    if (parts.reviewMembers) parts.reviewMembers.textContent = selectedCount ? `Você + ${selectedCount}` : 'Você';
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
      const creator = getCurrentUserProfile();
      const members = [{ ...creator, role: 'owner' }, ...getSelectedCreateMembers()];
      const communityDraft = {
        id: createCommunityId(nameField.value),
        title: nameField.value.trim(),
        category: typeField?.value || 'Comunidade',
        description: descriptionField?.value || '',
        ownerId: creator.id,
        ownerIdentityKeys: creator.identityKeys,
        createdById: creator.id,
        coverName: createCoverState.name,
        coverType: createCoverState.type,
        coverDataUrl: createCoverState.dataUrl,
        members,
        source: 'created'
      };
      const createOperation = getCommunityDomainOperations()?.create?.(communityDraft, {
        type: 'COMMUNITY_CREATED', actorId: creator.id, targetId: communityDraft.id,
        operationId: createCommunityOperationId('create', communityDraft.id, creator.id),
        payload: { visibility: communityDraft.category }
      });
      const record = createOperation?.ok ? createOperation.record : null;
      if (!record) {
        setActionFormFeedback(form, 'Não foi possível criar a comunidade. Tente novamente.', 'error');
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
      renderCommunityCollections();
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
