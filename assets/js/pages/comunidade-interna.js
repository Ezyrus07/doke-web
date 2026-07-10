(function () {
  'use strict';

  var root = document.querySelector('[data-community-room]');
  if (!root) return;

  var channels = Array.prototype.slice.call(root.querySelectorAll('[data-channel-id]'));
  var selectedChannelIds = new Set();
  var isSelectingChannels = false;
  var channelTitle = root.querySelector('[data-community-thread-title]');
  var channelStatus = root.querySelector('[data-community-thread-status]');
  var messageList = root.querySelector('[data-community-message-list]');
  var pinnedList = root.querySelector('.community-room-pinned-list');
  var composer = root.querySelector('[data-community-composer]');
  var composerInput = root.querySelector('[data-community-composer-input]');
  var sendButton = root.querySelector('[data-community-send]');
  var searchForm = root.querySelector('[data-community-search-form]');
  var searchInput = root.querySelector('[data-community-search-input]');
  var searchClear = root.querySelector('[data-community-search-clear]');
  var emptyState = root.querySelector('[data-community-empty]');
  var resetSearch = root.querySelector('[data-community-reset-search]');
  var channelCount = root.querySelector('[data-community-channel-count]');
  var backButton = root.querySelector('[data-community-back]');
  var filterToggles = Array.prototype.slice.call(document.querySelectorAll('[data-community-filter-toggle]'));
  var filterToggle = filterToggles[0] || null;
  var searchTriggers = Array.prototype.slice.call(document.querySelectorAll('[data-community-search-trigger]'));
  var filterMenu = root.querySelector('[data-community-filter-menu]');
  var moreToggle = root.querySelector('[data-community-more-toggle]');
  var actionsMenu = root.querySelector('[data-community-actions-menu]');
  var attachButton = root.querySelector('[data-community-attach]');
  var attachmentInput = root.querySelector('[data-community-attachment-input]');
  var audioButton = root.querySelector('[data-community-audio]');
  var audioDraft = root.querySelector('[data-community-audio-draft]');
  var audioTime = root.querySelector('[data-community-audio-time]');
  var audioCancel = root.querySelector('[data-community-audio-cancel]');
  var attachmentDraft = root.querySelector('[data-community-attachment-draft]');
  var attachmentPreviewImage = root.querySelector('[data-community-attachment-preview-image]');
  var attachmentTitle = root.querySelector('[data-community-attachment-title]');
  var attachmentCancel = root.querySelector('[data-community-attachment-cancel]');
  var memberSearch = root.querySelector('[data-community-member-search]');
  var memberAddToggle = root.querySelector('[data-community-member-add-toggle]');
  var memberCandidates = root.querySelector('[data-community-member-candidates]');
  var memberList = root.querySelector('[data-community-member-list]');
  var members = Array.prototype.slice.call(root.querySelectorAll('[data-member-search]'));
  var memberCandidateItems = [];
  var currentChannelName = 'Comunidade';
  var selectedAttachment = '';
  var audioDraftSeconds = 0;
  var audioDraftTimer = null;

  var COMMUNITY_SELECTION_STORAGE_KEY = 'doke.community.selected.v1';
  var COMMUNITY_LIST_STORAGE_KEY = 'doke.communities.local.v1';
  var COMMUNITY_MESSAGES_STORAGE_KEY = 'doke.community.messages.local.v1';
  var CONVERSATIONS_STORAGE_KEY = 'doke.conversations.local.v1';
  var LEGACY_CONVERSATIONS_STORAGE_KEY = 'doke.conversations';
  var currentCommunityContext = null;
  var currentChannelId = 'geral';

  if (pinnedList) {
    Array.prototype.slice.call(pinnedList.children).forEach(function (item) {
      item.dataset.communityPinnedBaseline = 'true';
    });
  }

  function safeJsonParse(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function slugifyCommunity(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'community';
  }

  function formatCountLabel(count, singular, plural) {
    return String(count) + ' ' + (count === 1 ? singular : plural);
  }

  function getMemberInitials(name) {
    var words = String(name || 'Você').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'VC';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  function readLocalCommunities() {
    try {
      var parsed = safeJsonParse(window.localStorage && window.localStorage.getItem(COMMUNITY_LIST_STORAGE_KEY));
      return Array.isArray(parsed) ? parsed.filter(function (item) { return item && (item.id || item.title || item.name); }) : [];
    } catch (error) {
      return [];
    }
  }


  function writeLocalCommunities(communities) {
    try {
      window.localStorage && window.localStorage.setItem(COMMUNITY_LIST_STORAGE_KEY, JSON.stringify(Array.isArray(communities) ? communities : []));
    } catch (error) {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }

  function readLocalConversations() {
    var merged = [];
    [CONVERSATIONS_STORAGE_KEY, LEGACY_CONVERSATIONS_STORAGE_KEY].forEach(function (key) {
      try {
        var parsed = safeJsonParse(window.localStorage && window.localStorage.getItem(key));
        if (Array.isArray(parsed)) merged = merged.concat(parsed);
      } catch (error) {
        // Ignore unreadable local conversation payloads.
      }
    });
    return merged.filter(function (conversation) { return conversation && (conversation.id || conversation.peerName || conversation.name); });
  }

  function getConversationMemberCandidates() {
    var unique = new Map();
    readLocalConversations().forEach(function (conversation) {
      var name = String(conversation.peerName || conversation.name || conversation.clientName || conversation.professionalName || conversation.providerName || '').trim();
      if (!name || name.toLowerCase() === 'você') return;
      var id = String(conversation.peerId || conversation.clientId || conversation.professionalId || conversation.providerId || conversation.id || slugifyCommunity(name)).trim();
      if (!id) id = slugifyCommunity(name);
      if (unique.has(id)) return;
      unique.set(id, {
        id: id,
        name: name,
        role: 'member',
        source: 'messages'
      });
    });
    return Array.prototype.slice.call(unique.values());
  }

  function getCurrentUserProfile() {
    var service = window.DokeAuth && window.DokeAuth.service;
    var user = service && typeof service.getCurrentUser === 'function' ? service.getCurrentUser() : null;
    var name = user && (user.displayName || user.name || user.fullName || user.email);
    return {
      id: String(user && user.id || 'current-user'),
      name: String(name || 'Você'),
      role: 'owner',
      source: 'account'
    };
  }

  function normalizeCommunityContext(raw) {
    raw = raw || {};
    var title = String(raw.title || raw.name || '').trim();
    var id = String(raw.id || raw.community || raw.communityId || '').trim();
    if (!title && id) title = id.replace(/[-_]+/g, ' ').replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
    if (!title) title = 'Comunidade Doke';
    return {
      id: id || slugifyCommunity(title),
      title: title,
      category: String(raw.category || '').trim()
    };
  }

  function getCommunityContextFromLocation() {
    var params = new URLSearchParams(window.location.search || '');
    var urlContext = {
      id: params.get('community') || params.get('communityId') || params.get('id') || '',
      title: params.get('title') || params.get('name') || '',
      category: params.get('category') || params.get('categoria') || ''
    };

    if (urlContext.id || urlContext.title) return normalizeCommunityContext(urlContext);

    var stored = null;
    try {
      stored = safeJsonParse(window.localStorage && window.localStorage.getItem(COMMUNITY_SELECTION_STORAGE_KEY));
    } catch (error) {
      stored = null;
    }
    return normalizeCommunityContext(stored);
  }

  function applyCommunityContext() {
    var context = getCommunityContextFromLocation();
    currentCommunityContext = context;
    root.dataset.communityId = context.id;
    root.dataset.communityTitle = context.title;
    root.setAttribute('aria-label', 'Sala interna da comunidade ' + context.title);

    var eyebrow = root.querySelector('.community-room-sidebar__eyebrow');
    if (eyebrow) eyebrow.textContent = context.title;
    currentChannelName = context.title || 'Comunidade';
    if (channelTitle) channelTitle.textContent = currentChannelName;

    var returnLinks = Array.prototype.slice.call(document.querySelectorAll('.community-room-return'));
    returnLinks.forEach(function (link) {
      link.setAttribute('aria-label', 'Voltar para comunidades');
    });

    if (document.title) document.title = 'Doke | ' + context.title;

    try {
      window.localStorage && window.localStorage.setItem(COMMUNITY_SELECTION_STORAGE_KEY, JSON.stringify({
        id: context.id,
        title: context.title,
        category: context.category,
        selectedAt: new Date().toISOString()
      }));
    } catch (error) {
      // Local storage can be unavailable in restricted browser contexts.
    }
    return context;
  }

  applyCommunityContext();

  function normalizeCommunityMember(member) {
    var name = String(member && member.name || '').trim();
    if (!name) return null;
    return {
      id: String(member.id || slugifyCommunity(name)).trim() || slugifyCommunity(name),
      name: name,
      role: String(member.role || '').trim() || 'member',
      source: String(member.source || '').trim() || 'messages'
    };
  }

  function getCurrentCommunityRecord() {
    var context = currentCommunityContext || getCommunityContextFromLocation();
    var id = String(context && context.id || '').trim();
    var title = String(context && context.title || '').trim();
    var communities = readLocalCommunities();
    return communities.find(function (item) {
      var itemId = String(item.id || item.community || '').trim();
      var itemTitle = String(item.title || item.name || '').trim();
      return (id && itemId === id) || (title && itemTitle === title) || (id && slugifyCommunity(itemTitle) === id);
    }) || null;
  }


  function saveCurrentCommunityRecord(nextRecord) {
    if (!nextRecord) return null;
    var context = currentCommunityContext || getCommunityContextFromLocation();
    var id = String(nextRecord.id || context.id || slugifyCommunity(nextRecord.title || context.title)).trim();
    var title = String(nextRecord.title || nextRecord.name || context.title || 'Comunidade Doke').trim();
    var communities = readLocalCommunities();
    var index = communities.findIndex(function (item) {
      var itemId = String(item.id || item.community || '').trim();
      var itemTitle = String(item.title || item.name || '').trim();
      return (id && itemId === id) || (title && itemTitle === title) || (id && slugifyCommunity(itemTitle) === id);
    });
    var saved = Object.assign({}, index >= 0 ? communities[index] : {}, nextRecord, {
      id: id,
      title: title,
      name: title,
      category: nextRecord.category || context.category || nextRecord.category || '',
      updatedAt: new Date().toISOString()
    });
    if (index >= 0) {
      communities[index] = saved;
    } else {
      communities.unshift(saved);
    }
    writeLocalCommunities(communities);
    return saved;
  }

  function updateCurrentCommunityMembers(updater) {
    var record = getCurrentCommunityRecord() || {
      id: getCurrentCommunityId(),
      title: root.dataset.communityTitle || currentChannelName || 'Comunidade Doke',
      category: currentCommunityContext && currentCommunityContext.category || '',
      members: []
    };
    var current = Array.isArray(record.members) ? record.members.slice() : [];
    var nextMembers = typeof updater === 'function' ? updater(current) : current;
    record.members = (Array.isArray(nextMembers) ? nextMembers : []).map(normalizeCommunityMember).filter(Boolean);
    return saveCurrentCommunityRecord(record);
  }

  function getCommunityMembers() {
    var record = getCurrentCommunityRecord();
    var rawMembers = record && Array.isArray(record.members) ? record.members : [];
    var unique = new Map();
    rawMembers.forEach(function (member) {
      var normalized = normalizeCommunityMember(member);
      if (!normalized || unique.has(normalized.id)) return;
      unique.set(normalized.id, normalized);
    });
    return Array.prototype.slice.call(unique.values());
  }

  function createPanelEmptyState(title, copy) {
    var empty = document.createElement('article');
    empty.className = 'community-room-panel-empty doke-empty-state';
    empty.dataset.communityPanelEmpty = 'true';
    var strong = document.createElement('strong');
    strong.textContent = title;
    var paragraph = document.createElement('p');
    paragraph.textContent = copy;
    empty.append(strong, paragraph);
    return empty;
  }

  function createThreadEmptyState() {
    var empty = document.createElement('article');
    empty.className = 'community-room-thread-empty doke-empty-state';
    empty.dataset.communityThreadEmpty = 'true';
    var badge = document.createElement('span');
    badge.className = 'messages-thread-empty__badge';
    badge.textContent = currentChannelName || 'Comunidade';
    var title = document.createElement('h3');
    title.textContent = 'Nenhuma mensagem ainda';
    var copy = document.createElement('p');
    copy.textContent = 'Comece a conversa desta comunidade.';
    empty.append(badge, title, copy);
    return empty;
  }

  function createMemberItem(member) {
    var item = document.createElement('article');
    item.className = 'community-room-member';
    item.dataset.memberSearch = [member.name, member.role, member.source].join(' ');
    item.dataset.communityMemberId = member.id;
    var avatar = document.createElement('b');
    avatar.className = 'doke-avatar';
    avatar.textContent = getMemberInitials(member.name);
    var identity = document.createElement('div');
    var name = document.createElement('strong');
    name.textContent = member.name;
    var source = document.createElement('span');
    source.textContent = member.source === 'account' ? 'Conta principal' : 'Adicionado pelas mensagens';
    identity.append(name, source);
    var role = document.createElement('em');
    role.textContent = member.role === 'owner' ? 'Administrador' : 'Membro';
    item.append(avatar, identity, role);
    if (member.role !== 'owner') {
      var remove = document.createElement('button');
      remove.className = 'community-room-member__remove doke-btn doke-btn--ghost doke-btn--sm';
      remove.type = 'button';
      remove.dataset.communityMemberRemove = member.id;
      remove.textContent = 'Remover';
      item.appendChild(remove);
    }
    return item;
  }

  function createMemberCandidateItem(member) {
    var item = document.createElement('article');
    item.className = 'community-room-member-candidate';
    item.dataset.memberCandidateSearch = [member.name, member.role, member.source].join(' ');
    item.dataset.communityMemberCandidateId = member.id;
    var avatar = document.createElement('b');
    avatar.className = 'doke-avatar';
    avatar.textContent = getMemberInitials(member.name);
    var identity = document.createElement('div');
    var name = document.createElement('strong');
    name.textContent = member.name;
    var source = document.createElement('span');
    source.textContent = 'Contato das mensagens';
    identity.append(name, source);
    var add = document.createElement('button');
    add.className = 'doke-btn doke-btn--secondary doke-btn--sm';
    add.type = 'button';
    add.dataset.communityMemberAdd = member.id;
    add.textContent = 'Adicionar';
    item.append(avatar, identity, add);
    return item;
  }

  function renderMemberCandidates() {
    if (!memberCandidates) return;
    memberCandidates.innerHTML = '';
    var existingIds = new Set(getCommunityMembers().map(function (member) { return String(member.id); }));
    var candidates = getConversationMemberCandidates().filter(function (candidate) { return !existingIds.has(String(candidate.id)); });
    candidates.forEach(function (candidate) {
      memberCandidates.appendChild(createMemberCandidateItem(candidate));
    });
    if (!candidates.length) {
      memberCandidates.appendChild(createPanelEmptyState('Nenhum contato disponível', 'Quando houver conversas recentes, você poderá adicionar pessoas por aqui.'));
    }
    memberCandidateItems = Array.prototype.slice.call(memberCandidates.querySelectorAll('[data-member-candidate-search]'));
  }

  function renderCommunityMembers() {
    if (!memberList) return;
    memberList.innerHTML = '';
    var list = getCommunityMembers();
    list.forEach(function (member) {
      memberList.appendChild(createMemberItem(member));
    });
    if (!list.length) {
      memberList.appendChild(createPanelEmptyState('Nenhum membro adicionado', 'Convide pessoas pelas mensagens ao criar ou editar a comunidade.'));
    }
    members = Array.prototype.slice.call(memberList.querySelectorAll('[data-member-search]'));
    if (memberCandidates && !memberCandidates.hidden) renderMemberCandidates();
  }

  function getChannelMessageCount(channelId) {
    return getStoredChannelMessages(channelId || currentChannelId).length;
  }

  function updateRoomStats() {
    var memberCount = getCommunityMembers().length;
    var messageCount = getChannelMessageCount(currentChannelId);
    var status = [
      formatCountLabel(memberCount, 'membro', 'membros'),
      formatCountLabel(messageCount, 'mensagem', 'mensagens')
    ].join(' • ');
    if (channelStatus) channelStatus.textContent = status;
    if (channelCount) channelCount.textContent = String(channels.length);
    channels.forEach(function (channel) {
      var channelId = channel.dataset.channelId || 'geral';
      var preview = channel.querySelector('.community-room-channel__preview');
      var count = getChannelMessageCount(channelId);
      if (preview && count > 0) preview.textContent = formatCountLabel(count, 'mensagem enviada', 'mensagens enviadas');
      if (channel === channels.find(function (item) { return item.dataset.channelId === currentChannelId; })) {
        channel.dataset.channelStatus = status;
      }
    });
  }

  function updateComposerDraftState() {
    if (!composer) return;
    var hasVisibleDraft = [audioDraft, attachmentDraft].some(function (item) {
      return item && !item.hidden;
    });
    composer.classList.toggle('has-composer-draft', hasVisibleDraft);
  }

  function closeFloatingMenus() {
    if (filterMenu) filterMenu.hidden = true;
    filterToggles.forEach(function (toggle) { toggle.setAttribute('aria-expanded', 'false'); });
    if (actionsMenu) actionsMenu.hidden = true;
    if (moreToggle) moreToggle.setAttribute('aria-expanded', 'false');
  }


  function updateChannelSelectionVisuals() {
    channels.forEach(function (channel) {
      var selected = selectedChannelIds.has(channel.dataset.channelId || '');
      channel.classList.add('doke-selectable-card');
      channel.classList.toggle('is-selected', selected);
      channel.setAttribute('aria-selected', String(selected));
      channel.setAttribute('aria-pressed', String(selected));
    });
  }

  function setChannelSelectionMode(enabled) {
    isSelectingChannels = Boolean(enabled);
    root.classList.toggle('is-selection-mode', isSelectingChannels);
    document.body.classList.toggle('community-room-selection-mode', isSelectingChannels);
    if (!isSelectingChannels) {
      selectedChannelIds.clear();
    }
    closeFloatingMenus();
    updateChannelSelectionVisuals();
  }

  function toggleChannelSelection(channel) {
    var id = channel && channel.dataset.channelId;
    if (!id) return;
    if (selectedChannelIds.has(id)) {
      selectedChannelIds.delete(id);
    } else {
      selectedChannelIds.add(id);
    }
    updateChannelSelectionVisuals();
  }

  function scrollToBottom() {
    if (!messageList) return;
    messageList.scrollTop = messageList.scrollHeight;
  }

  function scrollToStart() {
    if (!messageList) return;
    messageList.scrollTop = 0;
  }

  function getCurrentCommunityId() {
    if (currentCommunityContext && currentCommunityContext.id) return currentCommunityContext.id;
    return root.dataset.communityId || 'community';
  }

  function readCommunityMessageStore() {
    try {
      var parsed = safeJsonParse(window.localStorage && window.localStorage.getItem(COMMUNITY_MESSAGES_STORAGE_KEY));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeCommunityMessageStore(store) {
    try {
      window.localStorage && window.localStorage.setItem(COMMUNITY_MESSAGES_STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }

  function getStoredChannelMessages(channelId) {
    var store = readCommunityMessageStore();
    var communityBucket = store[getCurrentCommunityId()] || {};
    var channelBucket = communityBucket[channelId || currentChannelId] || [];
    return Array.isArray(channelBucket) ? channelBucket.filter(function (message) { return message && message.id; }) : [];
  }

  function createCommunityMessageRecord(payload) {
    var now = new Date();
    var type = payload && payload.type ? payload.type : 'text';
    return {
      id: 'community_msg_' + now.getTime() + '_' + Math.random().toString(36).slice(2, 8),
      communityId: getCurrentCommunityId(),
      communityTitle: root.dataset.communityTitle || (currentCommunityContext && currentCommunityContext.title) || 'Comunidade Doke',
      channelId: currentChannelId || 'geral',
      channelName: currentChannelName || 'Comunidade',
      type: type,
      text: String(payload && payload.text || '').trim(),
      attachmentName: String(payload && payload.attachmentName || '').trim(),
      audioDuration: String(payload && payload.audioDuration || '').trim(),
      mine: true,
      author: 'Você',
      createdAt: now.toISOString()
    };
  }

  function persistCommunityMessage(record) {
    if (!record || !record.id) return;
    var communityId = record.communityId || getCurrentCommunityId();
    var channelId = record.channelId || currentChannelId || 'geral';
    var store = readCommunityMessageStore();
    if (!store[communityId] || typeof store[communityId] !== 'object' || Array.isArray(store[communityId])) {
      store[communityId] = {};
    }
    var messages = Array.isArray(store[communityId][channelId]) ? store[communityId][channelId] : [];
    if (!messages.some(function (item) { return item && item.id === record.id; })) {
      messages.push(record);
    }
    store[communityId][channelId] = messages.slice(-80);
    writeCommunityMessageStore(store);
  }

  function updateCommunityMessageRecord(messageId, updater) {
    if (!messageId || typeof updater !== 'function') return null;
    var communityId = getCurrentCommunityId();
    var channelId = currentChannelId || 'geral';
    var store = readCommunityMessageStore();
    var communityBucket = store[communityId];
    if (!communityBucket || typeof communityBucket !== 'object' || Array.isArray(communityBucket)) return null;
    var messages = Array.isArray(communityBucket[channelId]) ? communityBucket[channelId] : [];
    var updated = null;
    communityBucket[channelId] = messages.map(function (message) {
      if (!message || message.id !== messageId) return message;
      updated = updater(Object.assign({}, message));
      return updated || message;
    });
    writeCommunityMessageStore(store);
    return updated;
  }

  function getPinnedMessagesForCurrentChannel() {
    return getStoredChannelMessages(currentChannelId).filter(function (message) {
      return message && message.pinned;
    }).sort(function (a, b) {
      return String(b.pinnedAt || b.createdAt || '').localeCompare(String(a.pinnedAt || a.createdAt || ''));
    });
  }

  function getMessagePreview(record) {
    if (!record) return 'Mensagem fixada na comunidade.';
    if (record.type === 'audio') return 'Áudio enviado no canal.';
    if (record.attachmentName && !record.text) return 'Anexo: ' + record.attachmentName;
    return String(record.text || record.attachmentName || 'Mensagem enviada.').trim();
  }

  function createPinnedPanelItem(record) {
    var item = document.createElement('article');
    item.dataset.communityLocalPinned = 'true';
    item.dataset.communityMessageId = record.id;

    var label = document.createElement('span');
    label.textContent = record.channelName || currentChannelName || 'Canal';

    var title = document.createElement('strong');
    title.textContent = record.author || 'Você';

    var paragraph = document.createElement('p');
    paragraph.textContent = getMessagePreview(record);

    item.append(label, title, paragraph);
    return item;
  }

  function renderPinnedPanel() {
    if (!pinnedList) return;
    pinnedList.innerHTML = '';
    var pinned = getPinnedMessagesForCurrentChannel();
    if (!pinned.length) {
      pinnedList.appendChild(createPanelEmptyState('Nenhum item fixado', 'Fixe mensagens importantes para aparecerem aqui.'));
      return;
    }
    pinned.forEach(function (record) {
      pinnedList.appendChild(createPinnedPanelItem(record));
    });
  }

  function clearRenderedLocalMessages() {
    if (!messageList) return;
    Array.prototype.slice.call(messageList.querySelectorAll('[data-community-local-message], [data-community-thread-empty]')).forEach(function (message) {
      message.remove();
    });
  }

  function clearThreadEmptyState() {
    if (!messageList) return;
    Array.prototype.slice.call(messageList.querySelectorAll('[data-community-thread-empty]')).forEach(function (empty) {
      empty.remove();
    });
  }

  function renderPersistedMessagesForChannel(channelId) {
    if (!messageList) return;
    clearRenderedLocalMessages();
    var records = getStoredChannelMessages(channelId || currentChannelId);
    records.forEach(function (record) {
      var element = createMessageFromRecord(record);
      if (element) {
        element.dataset.communityLocalMessage = 'true';
        element.dataset.communityMessageId = record.id;
        messageList.appendChild(element);
      }
    });
    if (!records.length) {
      messageList.appendChild(createThreadEmptyState());
    }
    renderPinnedPanel();
    updateRoomStats();
  }

  function formatMessageTime(createdAt) {
    var date = createdAt ? new Date(createdAt) : new Date();
    if (Number.isNaN(date.getTime())) date = new Date();
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function formatAudioTime(totalSeconds) {
    var minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    var seconds = String(totalSeconds % 60).padStart(2, '0');
    return minutes + ':' + seconds;
  }

  function hasActiveAudioDraft() {
    return Boolean(audioDraft && !audioDraft.hidden);
  }

  function stopAudioDraftTimer() {
    if (!audioDraftTimer) return;
    window.clearInterval(audioDraftTimer);
    audioDraftTimer = null;
  }

  function resetAudioDraft() {
    stopAudioDraftTimer();
    audioDraftSeconds = 0;
    if (audioTime) audioTime.textContent = '00:00';
    if (audioDraft) audioDraft.hidden = true;
    updateComposerDraftState();
    if (audioButton) audioButton.classList.remove('is-recording');
    if (audioButton) audioButton.setAttribute('aria-pressed', 'false');
    updateSendState();
  }

  function startAudioDraft() {
    if (!audioDraft) return;
    clearAttachment();
    closeFloatingMenus();
    audioDraft.hidden = false;
    updateComposerDraftState();
    if (audioButton) audioButton.classList.add('is-recording');
    if (audioButton) audioButton.setAttribute('aria-pressed', 'true');
    if (audioTime) audioTime.textContent = formatAudioTime(audioDraftSeconds);
    stopAudioDraftTimer();
    audioDraftTimer = window.setInterval(function () {
      audioDraftSeconds += 1;
      if (audioTime) audioTime.textContent = formatAudioTime(audioDraftSeconds);
    }, 1000);
    updateSendState();
  }

  function isMobileRoomViewport() {
    return window.innerWidth <= 560;
  }

  function setMobileView(view) {
    root.dataset.mobileView = view;
    var isThread = view === 'thread';
    var mobileOpen = isThread && isMobileRoomViewport();
    document.body.classList.toggle('community-room-thread-is-open', isThread);
    document.documentElement.classList.toggle('community-room-thread-is-open', isThread);
    document.body.classList.toggle('chat-room-mobile-open', mobileOpen);
    document.documentElement.classList.toggle('chat-room-mobile-open', mobileOpen);
  }

  window.addEventListener('resize', function () {
    if (!root.isConnected) return;
    setMobileView(root.dataset.mobileView === 'thread' ? 'thread' : 'list');
  });

  function activateChannel(channel) {
    if (!channel) return;
    channels.forEach(function (item) {
      item.classList.toggle('is-active', item === channel);
      if (item === channel) {
        item.setAttribute('aria-current', 'true');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    currentChannelId = channel.dataset.channelId || 'geral';
    currentChannelName = channel.dataset.channelName || currentChannelName || 'Comunidade';
    if (channelTitle) channelTitle.textContent = currentChannelName;
    updateRoomStats();
    var badge = channel.querySelector('.community-room-channel__badge');
    if (badge) badge.remove();
    closeFloatingMenus();
    setMobileView('thread');
    renderPersistedMessagesForChannel(currentChannelId);
    window.requestAnimationFrame(scrollToStart);
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function filterChannels() {
    var term = normalize(searchInput && searchInput.value);
    var visible = 0;
    if (searchForm) searchForm.classList.toggle('has-value', Boolean(term));

    channels.forEach(function (channel) {
      var haystack = normalize([
        channel.dataset.channelName,
        channel.dataset.channelSearch,
        channel.textContent
      ].join(' '));
      var matches = !term || haystack.indexOf(term) !== -1;
      channel.hidden = !matches;
      if (matches) visible += 1;
    });

    if (emptyState) emptyState.hidden = visible !== 0;
    if (channelCount) channelCount.textContent = String(visible);
  }

  function createMessageHeader(authorName, createdAt) {
    var header = document.createElement('header');
    header.className = 'message-bubble__meta';
    var author = document.createElement('strong');
    var time = document.createElement('time');
    author.textContent = authorName || 'Você';
    time.textContent = formatMessageTime(createdAt);
    if (createdAt) time.dateTime = createdAt;
    header.append(author, time);
    return header;
  }

  function appendCommunityMessageActions(bubble, record) {
    if (!bubble || !record || !record.id) return;
    var actions = document.createElement('div');
    actions.className = 'community-room-message__actions';
    actions.dataset.communityMessageActions = 'true';

    var usefulCount = Number(record.usefulCount || 0);
    var useful = document.createElement('button');
    useful.className = 'doke-btn doke-btn--ghost doke-btn--sm';
    useful.type = 'button';
    useful.dataset.communityMessageAction = 'useful';
    useful.textContent = usefulCount ? 'Útil (' + usefulCount + ')' : 'Útil';
    useful.setAttribute('aria-pressed', String(Boolean(record.usefulByMe)));

    var pin = document.createElement('button');
    pin.className = 'doke-btn doke-btn--ghost doke-btn--sm';
    pin.type = 'button';
    pin.dataset.communityMessageAction = 'pin';
    pin.textContent = record.pinned ? 'Desfixar' : 'Fixar';
    pin.setAttribute('aria-pressed', String(Boolean(record.pinned)));

    actions.append(useful, pin);
    bubble.appendChild(actions);
  }

  function syncMessageActionState(article, record) {
    if (!article || !record) return;
    article.classList.toggle('is-community-message-pinned', Boolean(record.pinned));
    var pin = article.querySelector('[data-community-message-action="pin"]');
    if (pin) {
      pin.textContent = record.pinned ? 'Desfixar' : 'Fixar';
      pin.setAttribute('aria-pressed', String(Boolean(record.pinned)));
    }
    var useful = article.querySelector('[data-community-message-action="useful"]');
    if (useful) {
      var usefulCount = Number(record.usefulCount || 0);
      useful.textContent = usefulCount ? 'Útil (' + usefulCount + ')' : 'Útil';
      useful.setAttribute('aria-pressed', String(Boolean(record.usefulByMe)));
    }
  }

  function createMessage(text, options) {
    options = options || {};
    var article = document.createElement('article');
    article.className = 'community-room-message community-room-message--self message-row message-row--me';

    var bubble = document.createElement('div');
    bubble.className = 'community-room-message__bubble message-bubble message-bubble--me';

    var paragraph = document.createElement('p');
    paragraph.textContent = text;

    bubble.append(createMessageHeader(options.author || 'Você', options.createdAt), paragraph);

    var attachmentName = options.attachmentName || selectedAttachment;
    if (attachmentName) {
      var media = document.createElement('div');
      media.className = 'community-room-media-card';
      var label = document.createElement('span');
      label.textContent = attachmentName;
      media.appendChild(label);
      bubble.appendChild(media);
    }

    if (options.recordId) {
      article.dataset.communityMessageId = options.recordId;
      article.classList.toggle('is-community-message-pinned', Boolean(options.pinned));
      appendCommunityMessageActions(bubble, {
        id: options.recordId,
        pinned: options.pinned,
        usefulCount: options.usefulCount,
        usefulByMe: options.usefulByMe
      });
    }

    article.appendChild(bubble);
    return article;
  }

  function createAudioMessage(duration, options) {
    options = options || {};
    var article = document.createElement('article');
    article.className = 'community-room-message community-room-message--self message-row message-row--me';

    var bubble = document.createElement('div');
    bubble.className = 'community-room-message__bubble message-bubble message-bubble--me';

    var audio = document.createElement('div');
    audio.className = 'community-room-message__audio message-bubble__audio';

    var play = document.createElement('span');
    play.className = 'community-room-message__audio-play message-bubble__audio-play';
    play.textContent = '▶';

    var track = document.createElement('span');
    track.className = 'community-room-message__audio-track message-bubble__audio-track';

    var meta = document.createElement('span');
    meta.className = 'community-room-message__audio-meta message-bubble__audio-meta';
    meta.textContent = duration;

    audio.append(play, track, meta);
    bubble.append(createMessageHeader(options.author || 'Você', options.createdAt), audio);
    if (options.recordId) {
      article.dataset.communityMessageId = options.recordId;
      article.classList.toggle('is-community-message-pinned', Boolean(options.pinned));
      appendCommunityMessageActions(bubble, {
        id: options.recordId,
        pinned: options.pinned,
        usefulCount: options.usefulCount,
        usefulByMe: options.usefulByMe
      });
    }
    article.appendChild(bubble);
    return article;
  }

  function createMessageFromRecord(record) {
    if (!record) return null;
    var options = {
      author: record.author || 'Você',
      createdAt: record.createdAt,
      attachmentName: record.attachmentName || '',
      recordId: record.id,
      pinned: Boolean(record.pinned),
      usefulCount: Number(record.usefulCount || 0),
      usefulByMe: Boolean(record.usefulByMe)
    };
    if (record.type === 'audio') {
      return createAudioMessage(record.audioDuration || '00:01', options);
    }
    return createMessage(record.text || 'Mensagem enviada.', options);
  }

  function updateSendState() {
    if (!sendButton || !composerInput) return;
    sendButton.disabled = composerInput.value.trim().length === 0 && !selectedAttachment && !hasActiveAudioDraft();
  }

  function clearAttachment() {
    selectedAttachment = '';
    if (attachmentDraft) attachmentDraft.hidden = true;
    if (attachmentPreviewImage) attachmentPreviewImage.src = '';
    updateComposerDraftState();
    if (attachmentTitle) attachmentTitle.textContent = 'Imagem pronta para envio';
    if (attachmentInput) attachmentInput.value = '';
    updateSendState();
  }

  channels.forEach(function (channel) {
    channel.classList.add('doke-selectable-card');
    channel.setAttribute('role', 'option');
    channel.setAttribute('aria-selected', 'false');
    channel.addEventListener('click', function () {
      if (isSelectingChannels) {
        toggleChannelSelection(channel);
        return;
      }
      activateChannel(channel);
    });
  });

  if (backButton) {
    backButton.addEventListener('click', function () {
      closeFloatingMenus();
      setMobileView('list');
    });
  }

  if (searchForm) {
    searchForm.addEventListener('submit', function (event) {
      event.preventDefault();
      filterChannels();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterChannels);
  }

  searchTriggers.forEach(function (button) {
    button.addEventListener('click', function () {
      if (searchInput) searchInput.focus();
      closeFloatingMenus();
    });
  });

  if (searchClear) {
    searchClear.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      filterChannels();
      if (searchInput) searchInput.focus();
    });
  }

  if (resetSearch) {
    resetSearch.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      filterChannels();
    });
  }

  if (filterToggles.length && filterMenu) {
    filterToggles.forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var next = filterMenu.hidden;
        closeFloatingMenus();
        filterMenu.hidden = !next;
        filterToggles.forEach(function (item) { item.setAttribute('aria-expanded', String(next)); });
      });
    });
  }

  if (moreToggle && actionsMenu) {
    moreToggle.addEventListener('click', function () {
      var next = actionsMenu.hidden;
      closeFloatingMenus();
      actionsMenu.hidden = !next;
      moreToggle.setAttribute('aria-expanded', String(next));
    });
  }

  root.querySelectorAll('[data-community-panel-open]').forEach(function (button) {
    button.addEventListener('click', function () {
      var panelName = button.dataset.communityPanelOpen;
      var panel = root.querySelector('[data-community-panel="' + panelName + '"]');
      closeFloatingMenus();
      root.querySelectorAll('[data-community-panel]').forEach(function (item) {
        item.classList.remove('is-open');
        item.setAttribute('aria-hidden', 'true');
      });
      if (panel) {
        panel.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
      }
    });
  });

  root.querySelectorAll('[data-community-panel-close]').forEach(function (button) {
    button.addEventListener('click', function () {
      root.querySelectorAll('[data-community-panel]').forEach(function (panel) {
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
      });
    });
  });

  function filterMemberPanelItems() {
    var term = normalize(memberSearch && memberSearch.value);
    members.forEach(function (member) {
      member.hidden = Boolean(term) && normalize(member.dataset.memberSearch).indexOf(term) === -1;
    });
    memberCandidateItems.forEach(function (candidate) {
      candidate.hidden = Boolean(term) && normalize(candidate.dataset.memberCandidateSearch).indexOf(term) === -1;
    });
  }

  if (memberSearch) {
    memberSearch.addEventListener('input', filterMemberPanelItems);
  }

  if (memberAddToggle && memberCandidates) {
    memberAddToggle.addEventListener('click', function () {
      var shouldOpen = memberCandidates.hidden;
      memberCandidates.hidden = !shouldOpen;
      memberAddToggle.textContent = shouldOpen ? 'Ocultar contatos' : 'Adicionar das mensagens';
      memberAddToggle.setAttribute('aria-expanded', String(shouldOpen));
      if (shouldOpen) {
        renderMemberCandidates();
        filterMemberPanelItems();
      }
    });
  }

  if (memberCandidates) {
    memberCandidates.addEventListener('click', function (event) {
      var button = event.target.closest('[data-community-member-add]');
      if (!button || !memberCandidates.contains(button)) return;
      var id = String(button.dataset.communityMemberAdd || '').trim();
      var candidate = getConversationMemberCandidates().find(function (item) { return String(item.id) === id; });
      if (!candidate) return;
      updateCurrentCommunityMembers(function (currentMembers) {
        var normalized = currentMembers.map(normalizeCommunityMember).filter(Boolean);
        if (!normalized.some(function (member) { return String(member.id) === String(candidate.id); })) {
          normalized.push(candidate);
        }
        return normalized;
      });
      renderCommunityMembers();
      renderMemberCandidates();
      updateRoomStats();
      filterMemberPanelItems();
    });
  }

  if (memberList) {
    memberList.addEventListener('click', function (event) {
      var button = event.target.closest('[data-community-member-remove]');
      if (!button || !memberList.contains(button)) return;
      var id = String(button.dataset.communityMemberRemove || '').trim();
      if (!id) return;
      updateCurrentCommunityMembers(function (currentMembers) {
        return currentMembers.map(normalizeCommunityMember).filter(function (member) {
          return member && String(member.id) !== id;
        });
      });
      renderCommunityMembers();
      renderMemberCandidates();
      updateRoomStats();
      filterMemberPanelItems();
    });
  }

  if (audioButton) {
    audioButton.setAttribute('aria-pressed', 'false');
    audioButton.addEventListener('click', function () {
      if (hasActiveAudioDraft()) {
        resetAudioDraft();
        return;
      }
      startAudioDraft();
    });
  }

  if (audioCancel) {
    audioCancel.addEventListener('click', resetAudioDraft);
  }

  if (attachmentInput) {
    attachmentInput.addEventListener('change', function () {
      if (!attachmentInput.files || !attachmentInput.files.length) return;
      var file = attachmentInput.files[0];
      resetAudioDraft();
      selectedAttachment = file && file.name ? file.name : 'Imagem';
      var showAttachmentDraft = function () {
        if (attachmentTitle) attachmentTitle.textContent = 'Imagem pronta para envio';
        if (attachmentDraft) attachmentDraft.hidden = false;
        updateComposerDraftState();
        updateSendState();
      };
      if (file && attachmentPreviewImage) {
        var reader = new FileReader();
        reader.onload = function () {
          attachmentPreviewImage.src = String(reader.result || '');
          showAttachmentDraft();
        };
        reader.readAsDataURL(file);
        return;
      }
      showAttachmentDraft();
    });
  }

  if (attachmentCancel) {
    attachmentCancel.addEventListener('click', clearAttachment);
  }

  if (composerInput) {
    composerInput.addEventListener('input', function () {
      composerInput.style.height = 'auto';
      composerInput.style.height = Math.min(composerInput.scrollHeight, 116) + 'px';
      updateSendState();
    });
  }

  if (composer) {
    composer.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = composerInput ? composerInput.value.trim() : '';
      if (!text && !selectedAttachment && !hasActiveAudioDraft()) return;

      if (hasActiveAudioDraft()) {
        var audioRecord = createCommunityMessageRecord({
          type: 'audio',
          audioDuration: formatAudioTime(Math.max(audioDraftSeconds, 1))
        });
        clearThreadEmptyState();
        messageList.appendChild(createMessageFromRecord(audioRecord));
        persistCommunityMessage(audioRecord);
        resetAudioDraft();
      } else {
        var messageText = text || 'Anexo enviado no canal ' + currentChannelName + '.';
        var messageRecord = createCommunityMessageRecord({
          type: selectedAttachment ? 'attachment' : 'text',
          text: messageText,
          attachmentName: selectedAttachment
        });
        clearThreadEmptyState();
        messageList.appendChild(createMessageFromRecord(messageRecord));
        persistCommunityMessage(messageRecord);
      }

      if (composerInput) {
        composerInput.value = '';
        composerInput.style.height = 'auto';
      }
      clearAttachment();
      updateSendState();
      updateRoomStats();
      scrollToBottom();
    });
  }

  if (messageList) {
    messageList.addEventListener('click', function (event) {
      var action = event.target.closest('[data-community-message-action]');
      if (!action || !messageList.contains(action)) return;
      var article = action.closest('[data-community-message-id]');
      var messageId = article && article.dataset.communityMessageId;
      if (!messageId) return;

      var updated = updateCommunityMessageRecord(messageId, function (message) {
        if (action.dataset.communityMessageAction === 'pin') {
          message.pinned = !message.pinned;
          message.pinnedAt = message.pinned ? new Date().toISOString() : '';
        }
        if (action.dataset.communityMessageAction === 'useful') {
          var currentCount = Number(message.usefulCount || 0);
          var nextUseful = !message.usefulByMe;
          message.usefulByMe = nextUseful;
          message.usefulCount = Math.max(0, currentCount + (nextUseful ? 1 : -1));
        }
        return message;
      });

      if (updated) {
        syncMessageActionState(article, updated);
        renderPinnedPanel();
        updateRoomStats();
      }
    });
  }

  document.addEventListener('click', function (event) {
    if (root.contains(event.target)) {
      var insideFloating = event.target.closest('[data-community-filter-toggle], [data-community-filter-menu], [data-community-more-toggle], [data-community-actions-menu], [data-community-attach]');
      if (!insideFloating) closeFloatingMenus();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    closeFloatingMenus();
    resetAudioDraft();
    root.querySelectorAll('[data-community-panel]').forEach(function (panel) {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    });
  });

  document.addEventListener('doke:mobile-shell-action', function (event) {
    if (!event.detail || event.detail.action !== 'select') return;
    setChannelSelectionMode(!isSelectingChannels);
  });

  var initiallyActiveChannel = channels.find(function (channel) { return channel.classList.contains('is-active'); }) || channels[0];
  if (initiallyActiveChannel) {
    currentChannelId = initiallyActiveChannel.dataset.channelId || currentChannelId;
    currentChannelName = initiallyActiveChannel.dataset.channelName || currentChannelName;
  }

  renderCommunityMembers();
  filterChannels();
  renderPersistedMessagesForChannel(currentChannelId);
  updateSendState();
  updateComposerDraftState();
  scrollToStart();
})();
