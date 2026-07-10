(function () {
  'use strict';

  window.DokeInitCommunityRoom = function DokeInitCommunityRoom() {
    var root = document.querySelector('[data-community-room]');
    if (!root || root.dataset.communityRoomReady === 'true') return;
    root.dataset.communityRoomReady = 'true';

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
  var settingsOpen = root.querySelector('[data-community-settings-open]');
  var settingsSidebar = root.querySelector('[data-community-settings-sidebar]');
  var settingsName = root.querySelector('[data-community-settings-name]');
  var settingsSearchForm = root.querySelector('[data-community-settings-search-form]');
  var settingsSearchInput = root.querySelector('[data-community-settings-search]');
  var settingsTabs = Array.prototype.slice.call(root.querySelectorAll('[data-community-settings-tab]'));
  var settingsCloseButtons = Array.prototype.slice.call(root.querySelectorAll('[data-community-settings-close]'));
  var attachButton = root.querySelector('[data-community-attach]');
  var attachmentInput = root.querySelector('[data-community-attachment-input]');
  var audioButton = root.querySelector('[data-community-audio]');
  var audioDraft = root.querySelector('[data-community-audio-draft]');
  var audioTime = root.querySelector('[data-community-audio-time]');
  var audioCancel = root.querySelector('[data-community-audio-cancel]');
  var attachmentDraft = root.querySelector('[data-community-attachment-draft]');
  var attachmentPreviewImage = root.querySelector('[data-community-attachment-preview-image]');
  var attachmentTitle = root.querySelector('[data-community-attachment-title]');
  var attachmentMeta = root.querySelector('[data-community-attachment-meta]');
  var attachmentCancel = root.querySelector('[data-community-attachment-cancel]');
  var memberSearch = root.querySelector('[data-community-member-search]');
  var memberAddToggle = root.querySelector('[data-community-member-add-toggle]');
  var memberCandidates = root.querySelector('[data-community-member-candidates]');
  var memberList = root.querySelector('[data-community-member-list]');
  var memberFeedback = root.querySelector('[data-community-member-feedback]');
  var manageForm = root.querySelector('[data-community-manage-form]');
  var manageName = root.querySelector('[data-community-manage-name]');
  var manageDescription = root.querySelector('[data-community-manage-description]');
  var manageType = root.querySelector('[data-community-manage-type]');
  var manageColor = root.querySelector('[data-community-manage-color]');
  var manageCover = root.querySelector('[data-community-manage-cover]');
  var manageCoverPick = root.querySelector('[data-community-cover-pick]');
  var manageCoverName = root.querySelector('[data-community-cover-name]');
  var manageCoverPreview = root.querySelector('[data-community-cover-preview]');
  var manageFeedback = root.querySelector('[data-community-manage-feedback]');
  var themeButtons = Array.prototype.slice.call(root.querySelectorAll('[data-community-theme-color]'));
  var inviteCodeLabel = root.querySelector('[data-community-invite-code]');
  var inviteMeta = root.querySelector('[data-community-invite-meta]');
  var inviteCopy = root.querySelector('[data-community-invite-copy]');
  var inviteRegenerate = root.querySelector('[data-community-invite-regenerate]');
  var roleForm = root.querySelector('[data-community-role-form]');
  var roleName = root.querySelector('[data-community-role-name]');
  var roleColor = root.querySelector('[data-community-role-color]');
  var roleFeedback = root.querySelector('[data-community-role-feedback]');
  var rolePermissionInputs = Array.prototype.slice.call(root.querySelectorAll('[data-community-role-permissions] input[type="checkbox"]'));
  var roleList = root.querySelector('[data-community-role-list]');
  var messageContextMenu = null;
  var members = Array.prototype.slice.call(root.querySelectorAll('[data-member-search]'));
  var memberCandidateItems = [];
  var currentChannelName = 'Comunidade';
  var selectedAttachment = '';
  var selectedAttachmentMeta = null;
  var audioDraftSeconds = 0;
  var audioDraftTimer = null;

  var COMMUNITY_SELECTION_STORAGE_KEY = 'doke.community.selected.v1';
  var COMMUNITY_LIST_STORAGE_KEY = 'doke.communities.local.v1';
  var COMMUNITY_MESSAGES_STORAGE_KEY = 'doke.community.messages.local.v1';
  var CONVERSATIONS_STORAGE_KEY = 'doke.conversations.local.v1';
  var LEGACY_CONVERSATIONS_STORAGE_KEY = 'doke.conversations';
  var MESSAGES_STORAGE_KEY = 'doke.messages.local.v1';
  var LEGACY_MESSAGES_STORAGE_KEY = 'doke.messages';
  var currentCommunityContext = null;
  var currentChannelId = 'geral';
  var manageCoverState = { name: '', type: '', dataUrl: '' };

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

  function formatFileSize(bytes) {
    var size = Number(bytes || 0);
    if (!size || size < 0) return '';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return Math.round(size / 1024) + ' KB';
    return (size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1).replace('.', ',') + ' MB';
  }

  function getAttachmentKind(type, name) {
    var mime = String(type || '').toLowerCase();
    var fileName = String(name || '').toLowerCase();
    if (mime.indexOf('image/') === 0 || /\.(png|jpe?g|webp|gif|avif)$/i.test(fileName)) return 'image';
    if (mime.indexOf('audio/') === 0 || /\.(mp3|wav|ogg|m4a)$/i.test(fileName)) return 'audio-file';
    if (mime.indexOf('video/') === 0 || /\.(mp4|mov|webm)$/i.test(fileName)) return 'video';
    if (mime.indexOf('pdf') !== -1 || /\.pdf$/i.test(fileName)) return 'pdf';
    return 'file';
  }

  function formatAttachmentType(type, name) {
    var mime = String(type || '').toLowerCase();
    var fileName = String(name || '');
    var extension = (fileName.match(/\.([a-z0-9]{2,6})$/i) || [])[1];
    if (extension) return extension.toUpperCase();
    if (mime.indexOf('image/') === 0) return mime.replace('image/', '').toUpperCase();
    if (mime.indexOf('application/pdf') === 0) return 'PDF';
    if (mime.indexOf('audio/') === 0) return 'Áudio';
    if (mime.indexOf('video/') === 0) return 'Vídeo';
    return 'Arquivo';
  }

  function getAttachmentDisplayName(meta) {
    var kind = meta && meta.kind;
    if (kind === 'image') return 'Imagem enviada';
    if (kind === 'audio-file') return 'Áudio anexado';
    if (kind === 'video') return 'Vídeo anexado';
    if (kind === 'pdf') return 'Documento PDF';
    return 'Arquivo enviado';
  }

  function getAttachmentMetaText(meta) {
    if (!meta) return '';
    return [formatAttachmentType(meta.type, meta.name), formatFileSize(meta.size)].filter(Boolean).join(' · ');
  }

  function createAttachmentMetaFromFile(file, dataUrl) {
    var name = file && file.name ? String(file.name) : 'anexo';
    var type = file && file.type ? String(file.type) : '';
    var size = file && file.size ? Number(file.size) : 0;
    var kind = getAttachmentKind(type, name);
    return {
      name: name,
      type: type,
      size: size,
      kind: kind,
      dataUrl: String(dataUrl || ''),
      displayName: getAttachmentDisplayName({ kind: kind })
    };
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

  function extractConversationList(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];

    var candidates = [];
    ['conversations', 'threads', 'items', 'data', 'records'].forEach(function (key) {
      if (Array.isArray(payload[key])) candidates = candidates.concat(payload[key]);
    });

    Object.keys(payload).forEach(function (key) {
      var value = payload[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (value.id || value.peerName || value.name || value.clientName || value.professionalName || value.providerName || value.order) {
          candidates.push(value);
        }
      }
    });

    return candidates;
  }

  function readLocalConversations() {
    var merged = [];
    [CONVERSATIONS_STORAGE_KEY, LEGACY_CONVERSATIONS_STORAGE_KEY, MESSAGES_STORAGE_KEY, LEGACY_MESSAGES_STORAGE_KEY].forEach(function (key) {
      try {
        var parsed = safeJsonParse(window.localStorage && window.localStorage.getItem(key));
        merged = merged.concat(extractConversationList(parsed));
      } catch (error) {
        // Ignore unreadable local conversation payloads.
      }
    });
    return merged.filter(function (conversation) {
      return conversation && (conversation.id || conversation.peerName || conversation.name || conversation.clientName || conversation.professionalName || conversation.providerName || conversation.order);
    });
  }

  function isValidContactName(name) {
    var normalized = String(name || '').trim().toLowerCase();
    if (!normalized) return false;
    return !['você', 'voce', 'eu', 'doke', 'conta doke'].includes(normalized);
  }

  function readCommunityRelatedStoragePayloads() {
    var payloads = [];
    try {
      if (!window.localStorage) return payloads;
      for (var index = 0; index < window.localStorage.length; index += 1) {
        var key = String(window.localStorage.key(index) || '');
        if (!/(conversation|message|mensagen|chat|order|pedido|contact|contato)/i.test(key)) continue;
        var parsed = safeJsonParse(window.localStorage.getItem(key));
        if (parsed) payloads.push(parsed);
      }
    } catch (error) {
      // Ignore blocked localStorage enumeration.
    }
    return payloads;
  }

  function extractPeopleFromPayload(payload, addCandidate) {
    var visited = new Set();
    var nameKeys = ['name', 'displayName', 'fullName', 'peerName', 'clientName', 'customerName', 'professionalName', 'providerName', 'contactName', 'participantName', 'senderName', 'authorName', 'userName', 'fromName', 'recipientName'];
    var idKeys = ['id', 'userId', 'profileId', 'contactId', 'participantId', 'peerId', 'clientId', 'customerId', 'professionalId', 'providerId', 'senderId', 'authorId'];

    function walk(value, fallbackId) {
      if (!value || typeof value !== 'object') return;
      if (visited.has(value)) return;
      visited.add(value);

      var id = '';
      var name = '';
      idKeys.some(function (key) {
        if (value[key]) { id = value[key]; return true; }
        return false;
      });
      nameKeys.some(function (key) {
        if (value[key]) { name = value[key]; return true; }
        return false;
      });
      if (name) addCandidate(id || fallbackId, name, 'messages');

      Object.keys(value).forEach(function (key) {
        var child = value[key];
        if (!child || typeof child !== 'object') return;
        if (Array.isArray(child)) {
          child.forEach(function (item, itemIndex) { walk(item, String(fallbackId || id || key) + '-' + itemIndex); });
          return;
        }
        walk(child, String(fallbackId || id || key));
      });
    }

    walk(payload, 'contact');
  }

  function getConversationMemberCandidates() {
    var unique = new Map();
    var owner = getCurrentUserProfile();

    function addCandidate(id, name, source) {
      name = String(name || '').trim();
      if (!isValidContactName(name)) return;
      id = String(id || slugifyCommunity(name)).trim() || slugifyCommunity(name);
      if (owner && owner.id && String(id) === String(owner.id)) return;
      if (unique.has(id)) return;
      unique.set(id, {
        id: id,
        name: name,
        role: 'member',
        source: source || 'messages'
      });
    }

    function addPersonObject(person, fallbackId, source) {
      if (!person || typeof person !== 'object') return;
      addCandidate(
        person.id || person.userId || person.profileId || person.contactId || person.participantId || fallbackId,
        person.name || person.displayName || person.fullName || person.peerName || person.clientName || person.professionalName || person.providerName || person.senderName || person.authorName || person.email,
        source || 'messages'
      );
    }

    readLocalConversations().forEach(function (conversation) {
      var order = conversation.order || {};
      addCandidate(conversation.peerId || conversation.id, conversation.peerName || conversation.name, 'messages');
      addCandidate(conversation.clientId || order.clientId || conversation.id, conversation.clientName || order.clientName || order.customerName || order.client || order.customer, 'messages');
      addCandidate(conversation.professionalId || conversation.providerId || order.professionalId || order.providerId || conversation.id, conversation.professionalName || conversation.providerName || order.professionalName || order.providerName || order.provider || order.professional, 'messages');
      addCandidate(conversation.contactId || conversation.id, conversation.contactName || conversation.customerName || conversation.participantName || conversation.senderName || conversation.recipientName, 'messages');

      ['participants', 'members', 'users', 'contacts', 'attendees'].forEach(function (key) {
        if (!Array.isArray(conversation[key])) return;
        conversation[key].forEach(function (person, index) {
          addPersonObject(person, conversation.id ? conversation.id + '-' + key + '-' + index : '', 'messages');
        });
      });

      if (Array.isArray(conversation.messages)) {
        conversation.messages.forEach(function (message) {
          addCandidate(message.senderId || message.authorId || message.userId || message.id, message.authorName || message.author || message.senderName || message.userName || message.fromName, 'messages');
          addPersonObject(message.sender, message.senderId || message.id, 'messages');
          addPersonObject(message.author, message.authorId || message.id, 'messages');
          addPersonObject(message.user, message.userId || message.id, 'messages');
        });
      }
    });

    readCommunityRelatedStoragePayloads().forEach(function (payload) {
      extractPeopleFromPayload(payload, addCandidate);
    });

    return Array.prototype.slice.call(unique.values());
  }

  function getCurrentUserProfile() {
    var service = window.DokeAuth && window.DokeAuth.service;
    var user = service && typeof service.getCurrentUser === 'function' ? service.getCurrentUser() : null;
    var name = user && (user.displayName || user.name || user.fullName || user.email);
    var id = user && (user.id || user.userId || user.profile && (user.profile.userId || user.profile.id) || user.email);
    return {
      id: String(id || 'anonymous-' + slugifyCommunity(name || 'voce')),
      name: String(name || 'Você'),
      role: 'member',
      source: 'account'
    };
  }

  function deriveCommunityOwnerId(record) {
    var explicit = String(record && (record.ownerId || record.createdById || record.creatorId) || '').trim();
    if (explicit) return explicit;
    var ownerMember = record && Array.isArray(record.members) ? record.members.find(function (member) {
      return member && String(member.role || '').toLowerCase() === 'owner';
    }) : null;
    return String(ownerMember && (ownerMember.id || ownerMember.userId || ownerMember.profileId) || '').trim();
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
      source: String(member.source || '').trim() || 'messages',
      joinedAt: String(member.joinedAt || '').trim(),
      addedBy: String(member.addedBy || '').trim()
    };
  }

  function getMemberIdentityKey(member) {
    var normalized = normalizeCommunityMember(member);
    if (!normalized) return '';
    return String(normalized.id) + '|' + normalize(normalized.name);
  }


  var COMMUNITY_PERMISSION_KEYS = ['pinMessages', 'deleteMessages', 'addMembers', 'removeMembers', 'editCommunity', 'manageRoles'];

  function normalizePermissions(permissions) {
    var normalized = {};
    COMMUNITY_PERMISSION_KEYS.forEach(function (key) {
      normalized[key] = Boolean(permissions && permissions[key]);
    });
    return normalized;
  }

  function getDefaultRoles() {
    return [
      { id: 'owner', name: 'Administrador', color: '#0f6f64', system: true, permissions: normalizePermissions({ pinMessages: true, deleteMessages: true, addMembers: true, removeMembers: true, editCommunity: true, manageRoles: true }) },
      { id: 'moderator', name: 'Moderador', color: '#2167ae', system: true, permissions: normalizePermissions({ pinMessages: true, deleteMessages: true, addMembers: true, removeMembers: true }) },
      { id: 'member', name: 'Membro', color: '#64748b', system: true, permissions: normalizePermissions({}) }
    ];
  }

  function normalizeCommunityRole(role) {
    var name = String(role && role.name || '').trim();
    if (!name) return null;
    return {
      id: String(role.id || slugifyCommunity(name)).trim() || slugifyCommunity(name),
      name: name,
      color: String(role.color || '#2167ae').trim() || '#2167ae',
      system: Boolean(role.system),
      permissions: normalizePermissions(role.permissions)
    };
  }

  function getCommunityRoles() {
    var record = getCurrentCommunityRecord();
    var roles = getDefaultRoles();
    if (record && Array.isArray(record.roles)) {
      roles = roles.concat(record.roles);
    }
    var unique = new Map();
    roles.forEach(function (role) {
      var normalized = normalizeCommunityRole(role);
      if (!normalized || unique.has(normalized.id)) return;
      unique.set(normalized.id, normalized);
    });
    return Array.prototype.slice.call(unique.values());
  }

  function getRoleLabel(roleId) {
    var role = getCommunityRoles().find(function (item) { return String(item.id) === String(roleId); });
    return role ? role.name : 'Membro';
  }

  function getRoleColor(roleId) {
    var role = getCommunityRoles().find(function (item) { return String(item.id) === String(roleId); });
    return role ? role.color : '#64748b';
  }

  function getCurrentCommunityMember() {
    var profile = getCurrentUserProfile();
    var record = getCurrentCommunityRecord();
    var ownerId = deriveCommunityOwnerId(record);
    if (String(profile.id) === ownerId) return Object.assign({}, profile, { role: 'owner' });
    return getCommunityMembers().find(function (member) { return String(member.id) === String(profile.id); }) || Object.assign({}, profile, { role: 'member' });
  }

  function canCommunity(permission) {
    var member = getCurrentCommunityMember();
    if (String(member.role || '') === 'owner') return true;
    var role = getCommunityRoles().find(function (item) { return String(item.id) === String(member.role || 'member'); });
    return Boolean(role && role.permissions && role.permissions[permission]);
  }

  function setPermissionState(node, allowed, unavailableLabel) {
    if (!node) return;
    node.hidden = !allowed;
    node.disabled = !allowed;
    node.setAttribute('aria-disabled', String(!allowed));
    if (!allowed && unavailableLabel) node.title = unavailableLabel;
  }

  function syncCommunityPermissionUI() {
    root.querySelectorAll('[data-community-panel-open="manage"]').forEach(function (node) { setPermissionState(node, canCommunity('editCommunity'), 'Sem permissão para editar a comunidade'); });
    root.querySelectorAll('[data-community-panel-open="roles"]').forEach(function (node) { setPermissionState(node, canCommunity('manageRoles'), 'Sem permissão para gerenciar cargos'); });
    root.querySelectorAll('[data-community-panel-open="invite"]').forEach(function (node) { setPermissionState(node, canCommunity('addMembers'), 'Sem permissão para gerar convites'); });
    root.querySelectorAll('[data-community-settings-tab="manage"]').forEach(function (node) { setPermissionState(node, canCommunity('editCommunity'), 'Sem permissão para editar a comunidade'); });
    root.querySelectorAll('[data-community-settings-tab="roles"]').forEach(function (node) { setPermissionState(node, canCommunity('manageRoles'), 'Sem permissão para gerenciar cargos'); });
    root.querySelectorAll('[data-community-settings-tab="invite"]').forEach(function (node) { setPermissionState(node, canCommunity('addMembers'), 'Sem permissão para gerar convites'); });
    if (memberAddToggle) setPermissionState(memberAddToggle, canCommunity('addMembers'), 'Sem permissão para adicionar membros');
    var currentMember = getCurrentCommunityMember();
    root.querySelectorAll('[data-community-danger-zone], [data-community-settings-tab="danger"]').forEach(function (node) {
      node.hidden = String(currentMember.role || '') !== 'owner';
    });
  }

  function ensureCurrentCommunityRecord() {
    var record = getCurrentCommunityRecord();
    if (record) {
      var derivedOwnerId = deriveCommunityOwnerId(record);
      if (!record.ownerId && derivedOwnerId) {
        record = saveCurrentCommunityRecord(Object.assign({}, record, { ownerId: derivedOwnerId }));
      }
      return record;
    }
    return saveCurrentCommunityRecord({
      id: getCurrentCommunityId(),
      title: root.dataset.communityTitle || currentChannelName || 'Comunidade Doke',
      category: currentCommunityContext && currentCommunityContext.category || '',
      ownerId: getCurrentUserProfile().id,
      members: [getCurrentUserProfile()],
      roles: [],
      invite: createInviteRecord(),
      inviteCode: ''
    });
  }

  function getCurrentCommunityRecord() {
    var context = currentCommunityContext || getCommunityContextFromLocation();
    var id = String(context && context.id || '').trim();
    var title = String(context && context.title || '').trim();
    var communities = readLocalCommunities();
    if (id) {
      var exact = communities.find(function (item) {
        return String(item.id || item.community || '').trim() === id;
      });
      if (exact) return exact;
    }
    if (!id && title) {
      return communities.find(function (item) {
        return !String(item.id || item.community || '').trim()
          && String(item.title || item.name || '').trim() === title;
      }) || null;
    }
    return null;
  }


  function saveCurrentCommunityRecord(nextRecord) {
    if (!nextRecord) return null;
    var context = currentCommunityContext || getCommunityContextFromLocation();
    var id = String(nextRecord.id || context.id || slugifyCommunity(nextRecord.title || context.title)).trim();
    var title = String(nextRecord.title || nextRecord.name || context.title || 'Comunidade Doke').trim();
    var communities = readLocalCommunities();
    var index = communities.findIndex(function (item) {
      return String(item.id || item.community || '').trim() === id;
    });
    var existing = index >= 0 ? communities[index] : {};
    var saved = Object.assign({}, existing, nextRecord, {
      ownerId: String(deriveCommunityOwnerId(nextRecord) || deriveCommunityOwnerId(existing) || (index < 0 ? getCurrentUserProfile().id : '')),
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
    var record = ensureCurrentCommunityRecord() || {
      id: getCurrentCommunityId(),
      title: root.dataset.communityTitle || currentChannelName || 'Comunidade Doke',
      category: currentCommunityContext && currentCommunityContext.category || '',
      ownerId: getCurrentUserProfile().id,
      members: []
    };
    var current = Array.isArray(record.members) ? record.members.slice() : [];
    var nextMembers = typeof updater === 'function' ? updater(current) : current;
    var ownerId = deriveCommunityOwnerId(record);
    var storedOwner = current.find(function (member) { return member && String(member.id) === ownerId; });
    var ownerProfile = storedOwner || { id: ownerId, name: 'Administrador', role: 'owner', source: 'account' };
    var unique = new Map();

    [ownerProfile].concat(Array.isArray(nextMembers) ? nextMembers : []).forEach(function (member) {
      var normalized = normalizeCommunityMember(member);
      if (!normalized) return;
      if (String(normalized.id) === ownerId) normalized.role = 'owner';
      var key = getMemberIdentityKey(normalized);
      if (!key || unique.has(key)) return;
      unique.set(key, normalized);
    });

    record.members = Array.prototype.slice.call(unique.values());
    return saveCurrentCommunityRecord(record);
  }

  function getCommunityMembers() {
    var record = getCurrentCommunityRecord();
    var rawMembers = record && Array.isArray(record.members) ? record.members.slice() : [];
    var owner = getCurrentUserProfile();
    var ownerId = deriveCommunityOwnerId(record);
    if (ownerId && !rawMembers.some(function (member) { return member && String(member.id) === ownerId; })) {
      rawMembers.unshift({ id: ownerId, name: 'Administrador', role: 'owner', source: 'account' });
    }
    var unique = new Map();
    rawMembers.forEach(function (member) {
      var normalized = normalizeCommunityMember(member);
      if (!normalized) return;
      if (String(normalized.id) === ownerId) normalized.role = 'owner';
      var key = getMemberIdentityKey(normalized);
      if (!key || unique.has(key)) return;
      unique.set(key, normalized);
    });
    return Array.prototype.slice.call(unique.values());
  }

  function createPanelEmptyState(title, copy) {
    var empty = document.createElement('article');
    empty.className = 'community-room-panel-empty doke-empty-state';
    empty.dataset.communityPanelEmpty = 'true';
    var icon = document.createElement('span');
    icon.className = 'community-room-panel-empty__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '+';
    var content = document.createElement('div');
    content.className = 'community-room-panel-empty__content';
    var strong = document.createElement('strong');
    strong.textContent = title;
    var paragraph = document.createElement('p');
    paragraph.textContent = copy;
    content.append(strong, paragraph);
    empty.append(icon, content);
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


  function createRoleSelect(member) {
    var select = document.createElement('select');
    select.className = 'community-room-member__role-select doke-input';
    select.dataset.communityMemberRole = member.id;
    getCommunityRoles().forEach(function (role) {
      var option = document.createElement('option');
      option.value = role.id;
      option.textContent = role.name;
      if (String(member.role || 'member') === String(role.id)) option.selected = true;
      select.appendChild(option);
    });
    return select;
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
    role.textContent = getRoleLabel(member.role);
    role.style.setProperty('--community-member-role-color', getRoleColor(member.role));
    item.append(avatar, identity, role);
    if (member.role !== 'owner' && canCommunity('manageRoles')) {
      item.appendChild(createRoleSelect(member));
      var remove = document.createElement('button');
      remove.className = 'community-room-member__remove doke-btn doke-btn--ghost doke-btn--sm';
      remove.type = 'button';
      remove.dataset.communityMemberRemove = member.id;
      remove.textContent = 'Remover';
      if (canCommunity('removeMembers')) item.appendChild(remove);
    } else if (member.role !== 'owner' && canCommunity('removeMembers')) {
      var removeOnly = document.createElement('button');
      removeOnly.className = 'community-room-member__remove doke-btn doke-btn--ghost doke-btn--sm';
      removeOnly.type = 'button';
      removeOnly.dataset.communityMemberRemove = member.id;
      removeOnly.textContent = 'Remover';
      item.appendChild(removeOnly);
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
    var existingKeys = new Set();
    getCommunityMembers().forEach(function (member) {
      existingKeys.add(String(member.id));
      existingKeys.add(normalize(member.name));
    });
    var candidates = getConversationMemberCandidates().filter(function (candidate) {
      return !existingKeys.has(String(candidate.id)) && !existingKeys.has(normalize(candidate.name));
    });
    candidates.forEach(function (candidate) {
      memberCandidates.appendChild(createMemberCandidateItem(candidate));
    });
    if (!candidates.length) {
      memberCandidates.appendChild(createPanelEmptyState('Nenhum contato disponível', 'Converse com clientes ou profissionais para adicionar contatos aqui.'));
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
      memberList.appendChild(createPanelEmptyState('Nenhum membro adicionado', 'Adicione pessoas das mensagens para formar esta comunidade.'));
    }
    members = Array.prototype.slice.call(memberList.querySelectorAll('[data-member-search]'));
    if (memberCandidates && !memberCandidates.hidden) renderMemberCandidates();
  }

  function getChannelMessageCount(channelId) {
    return getStoredChannelMessages(channelId || currentChannelId).length;
  }


  function normalizeInviteCode(value) {
    return String(value || '').trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '');
  }

  function generateInviteCode() {
    var existingCodes = new Set(readLocalCommunities().map(function (community) {
      return normalizeInviteCode(community && community.invite && community.invite.code || community && community.inviteCode || community && community.code);
    }).filter(Boolean));
    var code = '';
    do {
      code = 'DOKE-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    } while (existingCodes.has(code));
    return code;
  }

  function createInviteRecord(previousInvite) {
    var createdAt = new Date();
    var expiresAt = new Date(createdAt.getTime() + (30 * 24 * 60 * 60 * 1000));
    return {
      code: generateInviteCode(),
      active: true,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      generation: Number(previousInvite && previousInvite.generation || 0) + 1
    };
  }

  function getCommunityInvite() {
    var record = ensureCurrentCommunityRecord() || {};
    var legacyCode = normalizeInviteCode(record.inviteCode || record.code);
    var invite = record.invite && normalizeInviteCode(record.invite.code) ? Object.assign({}, record.invite, {
      code: normalizeInviteCode(record.invite.code),
      active: record.invite.active !== false
    }) : null;
    if (!invite && legacyCode) {
      var now = new Date();
      invite = {
        code: legacyCode,
        active: true,
        createdAt: String(record.inviteCreatedAt || now.toISOString()),
        expiresAt: String(record.inviteExpiresAt || new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString()),
        generation: 1
      };
    }
    if (!invite) invite = createInviteRecord();
    if (!record.invite || record.invite.code !== invite.code) {
      saveCurrentCommunityRecord(Object.assign({}, record, { invite: invite, inviteCode: invite.code }));
    }
    return invite;
  }

  function getInviteCode() {
    return getCommunityInvite().code;
  }

  function renderInviteCode() {
    var invite = getCommunityInvite();
    if (inviteCodeLabel) inviteCodeLabel.textContent = invite.code;
    if (inviteMeta) {
      var expiresAt = invite.expiresAt ? new Date(invite.expiresAt) : null;
      inviteMeta.textContent = expiresAt && !Number.isNaN(expiresAt.getTime())
        ? 'Válido até ' + expiresAt.toLocaleDateString('pt-BR') + '. Gerar um novo código invalida o anterior.'
        : 'Gerar um novo código invalida o anterior.';
    }
  }

  function updateCoverPreview(cover) {
    if (!manageCoverPreview) return;
    var dataUrl = cover && (cover.dataUrl || cover.url || cover.src);
    var name = String(cover && (cover.name || cover.fileName) || '').trim();
    var safeName = name || 'Capa selecionada';
    manageCoverPreview.classList.toggle('has-cover', Boolean(dataUrl));
    if (manageCoverName) {
      manageCoverName.textContent = dataUrl ? safeName : 'Nenhuma imagem selecionada';
    }
    if (manageCoverPick) {
      manageCoverPick.textContent = dataUrl ? 'Trocar capa' : 'Escolher capa';
    }
    if (dataUrl) {
      manageCoverPreview.innerHTML = '<img alt="Preview da capa" src="' + String(dataUrl).replace(/"/g, '&quot;') + '"><span>' + safeName + '</span>';
    } else {
      manageCoverPreview.textContent = 'Prévia da capa';
    }
  }

  function setPanelFeedback(node, message) {
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    window.clearTimeout(node._dokeFeedbackTimer);
    node._dokeFeedbackTimer = window.setTimeout(function () { node.hidden = true; }, 1800);
  }

  function applyCommunityTheme(color) {
    color = String(color || '#168f7d').trim() || '#168f7d';
    root.style.setProperty('--community-room-accent', color);
    root.querySelectorAll('.community-room-thread__avatar, .community-room-message__avatar, .community-room-channel__avatar').forEach(function (avatar) {
      avatar.style.background = 'linear-gradient(135deg, ' + color + ', #2167ae)';
    });
  }

  function syncManageForm() {
    var record = ensureCurrentCommunityRecord() || {};
    if (manageName) manageName.value = record.title || root.dataset.communityTitle || currentChannelName || '';
    if (manageDescription) manageDescription.value = record.description || record.copy || '';
    if (manageType) manageType.value = record.type || record.visibility || 'public';
    if (manageColor) manageColor.value = record.color || '#168f7d';
    manageCoverState = Object.assign({ name: '', type: '', dataUrl: '' }, record.cover || {});
    updateCoverPreview(manageCoverState);
    applyCommunityTheme(record.color || '#168f7d');
  }

  function applySavedCommunityRecord(record) {
    if (!record) return;
    var nextTitle = String(record.title || record.name || currentChannelName || 'Comunidade Doke').trim();
    currentChannelName = nextTitle;
    root.dataset.communityTitle = nextTitle;
    if (channelTitle) channelTitle.textContent = nextTitle;
    var sidebarTitle = root.querySelector('.community-room-sidebar__title');
    if (sidebarTitle) sidebarTitle.textContent = nextTitle;
    var eyebrow = root.querySelector('.community-room-sidebar__eyebrow');
    if (eyebrow) eyebrow.textContent = nextTitle;
    try {
      window.localStorage && window.localStorage.setItem(COMMUNITY_SELECTION_STORAGE_KEY, JSON.stringify({
        id: record.id || getCurrentCommunityId(),
        title: nextTitle,
        category: record.category || '',
        selectedAt: new Date().toISOString()
      }));
    } catch (error) {}
    applyCommunityTheme(record.color || '#168f7d');
    updateCoverPreview(record.cover || manageCoverState);
    if (document.title) document.title = 'Doke | ' + nextTitle;
  }

  function renderRoles() {
    if (!roleList) return;
    roleList.innerHTML = '';
    var roles = getCommunityRoles();
    if (!roles.length) {
      var empty = document.createElement('div');
      empty.className = 'community-room-role-empty';
      empty.textContent = 'Nenhum cargo criado ainda.';
      roleList.appendChild(empty);
      return;
    }
    roles.forEach(function (role) {
      var item = document.createElement('article');
      item.className = 'community-room-role-item';
      item.dataset.communityRoleId = role.id;
      var swatch = document.createElement('span');
      swatch.className = 'community-room-role-item__swatch';
      swatch.style.background = role.color;
      var body = document.createElement('div');
      var name = document.createElement('strong');
      name.textContent = role.name;
      var meta = document.createElement('span');
      var permissionCount = COMMUNITY_PERMISSION_KEYS.filter(function (key) { return role.permissions && role.permissions[key]; }).length;
      meta.textContent = (role.system ? 'Cargo padrão' : 'Cargo personalizado') + ' • ' + permissionCount + ' permissões';
      body.append(name, meta);
      item.append(swatch, body);
      if (!role.system && canCommunity('manageRoles')) {
        var remove = document.createElement('button');
        remove.className = 'doke-btn doke-btn--ghost doke-btn--sm';
        remove.type = 'button';
        remove.dataset.communityRoleRemove = role.id;
        remove.textContent = 'Remover';
        item.appendChild(remove);
      }
      roleList.appendChild(item);
    });
  }

  function updateCurrentCommunityRoles(updater) {
    var record = ensureCurrentCommunityRecord() || {};
    var customRoles = Array.isArray(record.roles) ? record.roles.filter(function (role) { return role && !role.system; }) : [];
    var nextRoles = typeof updater === 'function' ? updater(customRoles) : customRoles;
    record.roles = (Array.isArray(nextRoles) ? nextRoles : []).map(normalizeCommunityRole).filter(Boolean).filter(function (role) { return !role.system; });
    return saveCurrentCommunityRecord(record);
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

  function closeMessageContextMenu() {
    if (messageContextMenu) {
      messageContextMenu.remove();
      messageContextMenu = null;
    }
  }

  function closeFloatingMenus() {
    if (filterMenu) filterMenu.hidden = true;
    filterToggles.forEach(function (toggle) { toggle.setAttribute('aria-expanded', 'false'); });
    if (actionsMenu) actionsMenu.hidden = true;
    if (moreToggle) moreToggle.setAttribute('aria-expanded', 'false');
    closeMessageContextMenu();
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
      attachmentDisplayName: String(payload && payload.attachmentDisplayName || '').trim(),
      attachmentType: String(payload && payload.attachmentType || '').trim(),
      attachmentSize: Number(payload && payload.attachmentSize || 0),
      attachmentKind: String(payload && payload.attachmentKind || '').trim(),
      attachmentDataUrl: String(payload && payload.attachmentDataUrl || '').trim(),
      audioDuration: String(payload && payload.audioDuration || '').trim(),
      mine: true,
      author: 'Você',
      authorId: getCurrentUserProfile().id,
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

  function getCommunityMessageRecord(messageId) {
    if (!messageId) return null;
    var communityId = getCurrentCommunityId();
    var channelId = currentChannelId || 'geral';
    var store = readCommunityMessageStore();
    var communityBucket = store[communityId];
    if (!communityBucket || typeof communityBucket !== 'object' || Array.isArray(communityBucket)) return null;
    var messages = Array.isArray(communityBucket[channelId]) ? communityBucket[channelId] : [];
    return messages.find(function (message) { return message && message.id === messageId; }) || null;
  }

  function deleteCommunityMessage(messageId) {
    if (!messageId) return false;
    var record = getCommunityMessageRecord(messageId);
    var profile = getCurrentUserProfile();
    var isOwnMessage = record && (record.mine !== false || String(record.authorId || '') === String(profile.id));
    if (!isOwnMessage && !canCommunity('deleteMessages')) return false;
    var communityId = getCurrentCommunityId();
    var channelId = currentChannelId || 'geral';
    var store = readCommunityMessageStore();
    var communityBucket = store[communityId];
    if (!communityBucket || !Array.isArray(communityBucket[channelId])) return false;
    communityBucket[channelId] = communityBucket[channelId].filter(function (message) { return message && message.id !== messageId; });
    writeCommunityMessageStore(store);
    renderPersistedMessagesForChannel(channelId);
    return true;
  }

  function applyCommunityMessageAction(messageId, actionName) {
    if (actionName === 'delete') return deleteCommunityMessage(messageId);
    if (actionName === 'pin' && !canCommunity('pinMessages')) return null;
    if (!messageId || !actionName) return null;
    var updated = updateCommunityMessageRecord(messageId, function (message) {
      if (actionName === 'pin') {
        message.pinned = !message.pinned;
        message.pinnedAt = message.pinned ? new Date().toISOString() : '';
      }
      if (actionName === 'useful') {
        var currentCount = Number(message.usefulCount || 0);
        var nextUseful = !message.usefulByMe;
        message.usefulByMe = nextUseful;
        message.usefulCount = Math.max(0, currentCount + (nextUseful ? 1 : -1));
      }
      return message;
    });
    if (updated) {
      var article = messageList && messageList.querySelector('[data-community-message-id="' + CSS.escape(messageId) + '"]');
      if (article) syncMessageActionState(article, updated);
      renderPinnedPanel();
      updateRoomStats();
    }
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
    if (record.attachmentKind === 'image' || record.attachmentDataUrl) return 'Imagem enviada.';
    if (record.attachmentName && !record.text) return getAttachmentDisplayName(record) + '.';
    return String(record.text || getAttachmentDisplayName(record) || 'Mensagem enviada.').trim();
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
    bubble.dataset.communityMessageContext = 'true';
  }

  function openMessageContextMenu(article, clientX, clientY) {
    if (!article || !article.dataset.communityMessageId) return;
    closeMessageContextMenu();
    var messageId = article.dataset.communityMessageId;
    var record = getCommunityMessageRecord(messageId) || {};
    var menu = document.createElement('div');
    menu.className = 'community-room-message-menu doke-menu doke-popover';
    menu.dataset.communityMessageMenu = 'true';
    menu.setAttribute('role', 'menu');

    var useful = document.createElement('button');
    useful.className = 'doke-btn doke-btn--ghost';
    useful.type = 'button';
    useful.dataset.communityContextAction = 'useful';
    useful.dataset.communityMessageId = messageId;
    useful.setAttribute('role', 'menuitem');
    useful.textContent = record.usefulByMe ? 'Remover útil' : 'Marcar como útil';

    var pin = document.createElement('button');
    pin.className = 'doke-btn doke-btn--ghost';
    pin.type = 'button';
    pin.dataset.communityContextAction = 'pin';
    pin.dataset.communityMessageId = messageId;
    pin.setAttribute('role', 'menuitem');
    pin.textContent = record.pinned ? 'Desfixar mensagem' : 'Fixar mensagem';

    menu.appendChild(useful);
    if (canCommunity('pinMessages')) menu.appendChild(pin);

    var profile = getCurrentUserProfile();
    var isOwnMessage = record.mine !== false || String(record.authorId || '') === String(profile.id);
    if (isOwnMessage || canCommunity('deleteMessages')) {
      var remove = document.createElement('button');
      remove.className = 'doke-btn doke-btn--ghost';
      remove.type = 'button';
      remove.dataset.communityContextAction = 'delete';
      remove.dataset.communityMessageId = messageId;
      remove.setAttribute('role', 'menuitem');
      remove.textContent = 'Excluir mensagem';
      menu.appendChild(remove);
    }
    document.body.appendChild(menu);

    var rect = menu.getBoundingClientRect();
    var margin = 12;
    var left = Math.min(Math.max(clientX, margin), window.innerWidth - rect.width - margin);
    var top = Math.min(Math.max(clientY, margin), window.innerHeight - rect.height - margin);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    messageContextMenu = menu;
    useful.focus();
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

  function createAttachmentNode(meta) {
    if (!meta || (!meta.name && !meta.dataUrl)) return null;
    var kind = meta.kind || getAttachmentKind(meta.type, meta.name);

    if (kind === 'image' && meta.dataUrl) {
      var imageWrap = document.createElement('div');
      imageWrap.className = 'message-bubble__image';

      var image = document.createElement('img');
      image.src = meta.dataUrl;
      image.alt = 'Imagem enviada na comunidade';
      image.loading = 'lazy';
      image.dataset.mediaTitle = 'Imagem da comunidade';
      image.dataset.mediaAlt = 'Imagem enviada na comunidade';

      imageWrap.appendChild(image);
      return imageWrap;
    }

    var card = document.createElement('div');
    card.className = 'community-room-file-card doke-card doke-message-card';

    var icon = document.createElement('span');
    icon.className = 'community-room-file-card__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = kind === 'pdf' ? 'PDF' : 'ARQ';

    var copy = document.createElement('div');
    copy.className = 'community-room-file-card__copy';
    var title = document.createElement('strong');
    title.textContent = getAttachmentDisplayName(meta);
    var detail = document.createElement('span');
    detail.textContent = getAttachmentMetaText(meta) || 'Arquivo';
    copy.append(title, detail);

    card.append(icon, copy);
    return card;
  }

  function createMessage(text, options) {
    options = options || {};
    var article = document.createElement('article');
    var mine = options.mine !== false;
    article.className = 'community-room-message message-row' + (mine ? ' community-room-message--self message-row--me' : ' message-row--them');

    var bubble = document.createElement('div');
    bubble.className = 'community-room-message__bubble message-bubble' + (mine ? ' message-bubble--me' : ' message-bubble--them');

    bubble.appendChild(createMessageHeader(options.author || 'Você', options.createdAt));

    if (text) {
      var paragraph = document.createElement('p');
      paragraph.textContent = text;
      bubble.appendChild(paragraph);
    }

    var attachmentNode = createAttachmentNode(options.attachment);
    if (attachmentNode) bubble.appendChild(attachmentNode);

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
    var mine = options.mine !== false;
    article.className = 'community-room-message message-row' + (mine ? ' community-room-message--self message-row--me' : ' message-row--them');

    var bubble = document.createElement('div');
    bubble.className = 'community-room-message__bubble message-bubble' + (mine ? ' message-bubble--me' : ' message-bubble--them');

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
      attachment: {
        name: record.attachmentName || '',
        displayName: record.attachmentDisplayName || getAttachmentDisplayName(record),
        type: record.attachmentType || '',
        size: Number(record.attachmentSize || 0),
        kind: record.attachmentKind || getAttachmentKind(record.attachmentType, record.attachmentName),
        dataUrl: record.attachmentDataUrl || ''
      },
      recordId: record.id,
      pinned: Boolean(record.pinned),
      usefulCount: Number(record.usefulCount || 0),
      usefulByMe: Boolean(record.usefulByMe),
      mine: record.mine !== false
    };
    if (record.type === 'audio') {
      return createAudioMessage(record.audioDuration || '00:01', options);
    }
    var displayText = String(record.text || '');
    if (record.type === 'attachment' && /^Anexo enviado no canal/i.test(displayText)) {
      displayText = '';
    }
    return createMessage(displayText, options);
  }

  function updateSendState() {
    if (!sendButton || !composerInput) return;
    sendButton.disabled = composerInput.value.trim().length === 0 && !selectedAttachment && !hasActiveAudioDraft();
  }

  function clearAttachment() {
    selectedAttachment = '';
    selectedAttachmentMeta = null;
    if (attachmentDraft) {
      attachmentDraft.hidden = true;
      attachmentDraft.classList.remove('has-image', 'has-file');
    }
    if (attachmentPreviewImage) {
      attachmentPreviewImage.src = '';
      attachmentPreviewImage.hidden = false;
    }
    updateComposerDraftState();
    if (attachmentTitle) attachmentTitle.textContent = 'Imagem pronta para envio';
    if (attachmentMeta) attachmentMeta.textContent = 'Preview do anexo';
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

  function activateSettingsSection(panelName) {
    var panel = root.querySelector('[data-community-panel="' + panelName + '"]');
    root.classList.add('is-settings-mode', 'has-settings-panel');
    if (settingsSidebar) settingsSidebar.hidden = false;
    root.querySelectorAll('[data-community-panel]').forEach(function (item) {
      item.classList.remove('is-open');
      item.setAttribute('aria-hidden', 'true');
    });
    settingsTabs.forEach(function (tab) {
      var active = tab.dataset.communitySettingsTab === panelName;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    if (panel) {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
    }
    if (panelName === 'manage') syncManageForm();
    if (panelName === 'invite') renderInviteCode();
    if (panelName === 'roles') renderRoles();
    if (panelName === 'members') {
      renderCommunityMembers();
      renderMemberCandidates();
    }
  }

  function filterCommunitySettings(query) {
    var normalizedQuery = String(query || '').trim().toLocaleLowerCase('pt-BR');
    settingsTabs.forEach(function (tab) {
      if (tab.disabled) return;
      var label = String(tab.dataset.communitySettingsLabel || tab.textContent || '').trim().toLocaleLowerCase('pt-BR');
      tab.hidden = Boolean(normalizedQuery && label.indexOf(normalizedQuery) === -1);
    });
    root.querySelectorAll('.community-settings-nav__section').forEach(function (section) {
      var visibleItems = Array.prototype.slice.call(section.querySelectorAll('[data-community-settings-tab]')).some(function (tab) {
        return !tab.hidden;
      });
      section.hidden = !visibleItems;
    });
  }

  function openCommunitySettings() {
    closeFloatingMenus();
    var record = ensureCurrentCommunityRecord();
    if (settingsName) settingsName.textContent = record && (record.title || record.name) || 'Comunidade';
    var firstAllowed = settingsTabs.find(function (tab) { return !tab.hidden && !tab.disabled; });
    activateSettingsSection(firstAllowed ? firstAllowed.dataset.communitySettingsTab : 'members');
  }

  function closeCommunitySettings() {
    root.classList.remove('is-settings-mode', 'has-settings-panel');
    if (settingsSearchInput) settingsSearchInput.value = '';
    filterCommunitySettings('');
    if (settingsSidebar) settingsSidebar.hidden = true;
    root.querySelectorAll('[data-community-panel]').forEach(function (panel) {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    });
  }

  if (settingsOpen) settingsOpen.addEventListener('click', openCommunitySettings);
  if (settingsSearchForm) {
    settingsSearchForm.addEventListener('submit', function (event) { event.preventDefault(); });
  }
  if (settingsSearchInput) {
    settingsSearchInput.addEventListener('input', function () {
      filterCommunitySettings(settingsSearchInput.value);
    });
  }
  settingsTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateSettingsSection(tab.dataset.communitySettingsTab);
    });
  });
  settingsCloseButtons.forEach(function (button) {
    button.addEventListener('click', closeCommunitySettings);
  });

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
      if (!canCommunity('addMembers')) return;
      var id = String(button.dataset.communityMemberAdd || '').trim();
      var candidate = getConversationMemberCandidates().find(function (item) { return String(item.id) === id; });
      if (!candidate) return;
      var added = false;
      updateCurrentCommunityMembers(function (currentMembers) {
        var normalized = currentMembers.map(normalizeCommunityMember).filter(Boolean);
        var duplicate = normalized.some(function (member) {
          return String(member.id) === String(candidate.id) || normalize(member.name) === normalize(candidate.name);
        });
        if (!duplicate) {
          normalized.push(Object.assign({}, candidate, {
            role: 'member',
            joinedAt: new Date().toISOString(),
            addedBy: getCurrentUserProfile().id
          }));
          added = true;
        }
        return normalized;
      });
      setPanelFeedback(memberFeedback, added ? 'Membro adicionado com sucesso.' : 'Essa pessoa já faz parte da comunidade.');
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
      if (!canCommunity('removeMembers')) return;
      var id = String(button.dataset.communityMemberRemove || '').trim();
      if (!id) return;
      var record = ensureCurrentCommunityRecord() || {};
      if (String(record.ownerId || '') === id) {
        setPanelFeedback(memberFeedback, 'O administrador da comunidade não pode ser removido.');
        return;
      }
      var removed = false;
      updateCurrentCommunityMembers(function (currentMembers) {
        return currentMembers.map(normalizeCommunityMember).filter(function (member) {
          var keep = member && String(member.id) !== id;
          if (!keep) removed = true;
          return keep;
        });
      });
      setPanelFeedback(memberFeedback, removed ? 'Membro removido da comunidade.' : 'Membro não encontrado.');
      renderCommunityMembers();
      renderMemberCandidates();
      updateRoomStats();
      filterMemberPanelItems();
    });
  }


  if (manageCoverPick && manageCover) {
    manageCoverPick.addEventListener('click', function () {
      manageCover.click();
    });
  }

  if (manageCover) {
    manageCover.addEventListener('change', function () {
      var file = manageCover.files && manageCover.files[0];
      if (!file) {
        manageCoverState = { name: '', type: '', dataUrl: '' };
        updateCoverPreview(manageCoverState);
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        manageCoverState = { name: file.name, type: file.type || 'image', dataUrl: String(reader.result || '') };
        updateCoverPreview(manageCoverState);
      };
      reader.readAsDataURL(file);
    });
  }

  themeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var color = String(button.dataset.communityThemeColor || '#168f7d');
      if (manageColor) manageColor.value = color;
      applyCommunityTheme(color);
    });
  });

  if (manageForm) {
    manageForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!canCommunity('editCommunity')) return;
      var record = ensureCurrentCommunityRecord() || {};
      var title = String(manageName && manageName.value || record.title || currentChannelName || 'Comunidade Doke').trim();
      var saved = saveCurrentCommunityRecord(Object.assign({}, record, {
        title: title,
        name: title,
        description: String(manageDescription && manageDescription.value || '').trim(),
        type: String(manageType && manageType.value || 'public'),
        color: String(manageColor && manageColor.value || '#168f7d'),
        cover: Object.assign({}, manageCoverState || {})
      }));
      applySavedCommunityRecord(saved);
      updateRoomStats();
      setPanelFeedback(manageFeedback, 'Alterações salvas com sucesso.');
    });
  }

  if (inviteCopy) {
    inviteCopy.addEventListener('click', function () {
      var code = getInviteCode();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(function () {});
      }
      inviteCopy.textContent = 'Copiado';
      window.setTimeout(function () { inviteCopy.textContent = 'Copiar código'; }, 1400);
    });
  }

  if (inviteRegenerate) {
    inviteRegenerate.addEventListener('click', function () {
      if (!canCommunity('addMembers')) return;
      var record = ensureCurrentCommunityRecord() || {};
      var nextInvite = createInviteRecord(record.invite);
      saveCurrentCommunityRecord(Object.assign({}, record, {
        invite: nextInvite,
        inviteCode: nextInvite.code
      }));
      renderInviteCode();
      setPanelFeedback(memberFeedback, 'Novo convite gerado. O código anterior foi invalidado.');
    });
  }

  if (roleForm) {
    roleForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!canCommunity('manageRoles')) return;
      var name = String(roleName && roleName.value || '').trim();
      if (!name) return;
      var permissions = {};
      rolePermissionInputs.forEach(function (input) { permissions[input.value] = input.checked; });
      var role = { id: 'role-' + slugifyCommunity(name), name: name, color: String(roleColor && roleColor.value || '#2167ae'), permissions: permissions };
      var created = false;
      updateCurrentCommunityRoles(function (roles) {
        var exists = roles.some(function (item) { return String(item.id) === String(role.id); });
        if (!exists) created = true;
        return exists ? roles : roles.concat(role);
      });
      if (roleName) roleName.value = '';
      rolePermissionInputs.forEach(function (input) { input.checked = false; });
      renderRoles();
      renderCommunityMembers();
      setPanelFeedback(roleFeedback, created ? 'Cargo criado com sucesso.' : 'Esse cargo já existe.');
      if (created && roleList && roleList.lastElementChild) {
        roleList.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  if (roleList) {
    roleList.addEventListener('click', function (event) {
      var button = event.target.closest('[data-community-role-remove]');
      if (!button || !roleList.contains(button)) return;
      if (!canCommunity('manageRoles')) return;
      var id = String(button.dataset.communityRoleRemove || '').trim();
      updateCurrentCommunityRoles(function (roles) {
        return roles.filter(function (role) { return String(role.id) !== id; });
      });
      updateCurrentCommunityMembers(function (currentMembers) {
        return currentMembers.map(function (member) {
          member = normalizeCommunityMember(member);
          if (member && String(member.role) === id) member.role = 'member';
          return member;
        }).filter(Boolean);
      });
      renderRoles();
      renderCommunityMembers();
    });
  }

  if (memberList) {
    memberList.addEventListener('change', function (event) {
      var select = event.target.closest('[data-community-member-role]');
      if (!select || !memberList.contains(select)) return;
      if (!canCommunity('manageRoles')) return;
      var id = String(select.dataset.communityMemberRole || '').trim();
      var roleId = String(select.value || 'member').trim();
      var record = ensureCurrentCommunityRecord() || {};
      var roleExists = getCommunityRoles().some(function (role) { return String(role.id) === roleId && roleId !== 'owner'; });
      if (!roleExists || String(record.ownerId || '') === id) {
        renderCommunityMembers();
        setPanelFeedback(memberFeedback, 'Não foi possível alterar esse cargo.');
        return;
      }
      var changed = false;
      updateCurrentCommunityMembers(function (currentMembers) {
        return currentMembers.map(function (member) {
          member = normalizeCommunityMember(member);
          if (member && String(member.id) === id) {
            member.role = roleId;
            changed = true;
          }
          return member;
        }).filter(Boolean);
      });
      setPanelFeedback(memberFeedback, changed ? 'Cargo atualizado com sucesso.' : 'Membro não encontrado.');
      renderCommunityMembers();
    });
  }

  root.querySelectorAll('[data-community-panel-open]').forEach(function (button) {
    button.addEventListener('click', function () {
      var panelName = button.dataset.communityPanelOpen;
      if (panelName === 'manage') syncManageForm();
      if (panelName === 'invite') renderInviteCode();
      if (panelName === 'roles') renderRoles();
      if (panelName === 'members') {
        renderCommunityMembers();
        renderMemberCandidates();
      }
    });
  });

  root.querySelectorAll('[data-community-leave]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (String(getCurrentCommunityMember().role || '') !== 'owner') return;
      var record = ensureCurrentCommunityRecord();
      var name = record && (record.title || record.name) || 'esta comunidade';
      if (!window.confirm('Excluir ' + name + '? Esta ação remove a comunidade localmente.')) return;
      var currentId = getCurrentCommunityId();
      writeLocalCommunities(readLocalCommunities().filter(function (item) {
        return String(item.id || item.community || '') !== String(currentId);
      }));
      var store = readCommunityMessageStore();
      delete store[currentId];
      writeCommunityMessageStore(store);
      window.location.href = 'comunidade.html';
    });
  });

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
      var kind = getAttachmentKind(file && file.type, file && file.name);
      var showAttachmentDraft = function (meta) {
        selectedAttachmentMeta = meta;
        selectedAttachment = meta.displayName || getAttachmentDisplayName(meta);
        if (attachmentDraft) {
          attachmentDraft.hidden = false;
          attachmentDraft.classList.toggle('has-image', kind === 'image' && Boolean(meta.dataUrl));
          attachmentDraft.classList.toggle('has-file', kind !== 'image' || !meta.dataUrl);
        }
        if (attachmentTitle) attachmentTitle.textContent = meta.displayName || getAttachmentDisplayName(meta);
        if (attachmentMeta) attachmentMeta.textContent = getAttachmentMetaText(meta) || 'Pronto para envio';
        if (attachmentPreviewImage) {
          attachmentPreviewImage.hidden = !(kind === 'image' && meta.dataUrl);
          attachmentPreviewImage.src = kind === 'image' && meta.dataUrl ? meta.dataUrl : '';
        }
        updateComposerDraftState();
        updateSendState();
      };
      if (file && kind === 'image') {
        var reader = new FileReader();
        reader.onload = function () {
          showAttachmentDraft(createAttachmentMetaFromFile(file, reader.result));
        };
        reader.readAsDataURL(file);
        return;
      }
      showAttachmentDraft(createAttachmentMetaFromFile(file, ''));
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
        var attachmentPayload = selectedAttachmentMeta || null;
        var messageRecord = createCommunityMessageRecord({
          type: attachmentPayload ? 'attachment' : 'text',
          text: text,
          attachmentName: attachmentPayload ? attachmentPayload.name : '',
          attachmentDisplayName: attachmentPayload ? attachmentPayload.displayName : '',
          attachmentType: attachmentPayload ? attachmentPayload.type : '',
          attachmentSize: attachmentPayload ? attachmentPayload.size : 0,
          attachmentKind: attachmentPayload ? attachmentPayload.kind : '',
          attachmentDataUrl: attachmentPayload ? attachmentPayload.dataUrl : ''
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
    });

    messageList.addEventListener('contextmenu', function (event) {
      var article = event.target.closest('[data-community-message-id]');
      if (!article || !messageList.contains(article)) return;
      event.preventDefault();
      openMessageContextMenu(article, event.clientX, event.clientY);
    });
  }

  document.addEventListener('click', function (event) {
    var contextAction = event.target.closest('[data-community-context-action]');
    if (contextAction && messageContextMenu && messageContextMenu.contains(contextAction)) {
      applyCommunityMessageAction(contextAction.dataset.communityMessageId, contextAction.dataset.communityContextAction);
      closeMessageContextMenu();
      return;
    }
    if (messageContextMenu && !event.target.closest('[data-community-message-menu]')) closeMessageContextMenu();
  });

  document.addEventListener('click', function (event) {
    if (root.contains(event.target)) {
      var insideFloating = event.target.closest('[data-community-filter-toggle], [data-community-filter-menu], [data-community-more-toggle], [data-community-actions-menu], [data-community-attach], [data-community-message-menu]');
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

  window.addEventListener('storage', function (event) {
    if (event.key !== COMMUNITY_LIST_STORAGE_KEY) return;
    renderCommunityMembers();
    if (memberCandidates && !memberCandidates.hidden) renderMemberCandidates();
    renderRoles();
    renderInviteCode();
    updateRoomStats();
    syncCommunityPermissionUI();
  });

  var initiallyActiveChannel = channels.find(function (channel) { return channel.classList.contains('is-active'); }) || channels[0];
  if (initiallyActiveChannel) {
    currentChannelId = initiallyActiveChannel.dataset.channelId || currentChannelId;
    currentChannelName = initiallyActiveChannel.dataset.channelName || currentChannelName;
  }

  ensureCurrentCommunityRecord();
  syncManageForm();
  renderInviteCode();
  renderRoles();
  renderCommunityMembers();
  syncCommunityPermissionUI();
  filterChannels();
  renderPersistedMessagesForChannel(currentChannelId);
  updateSendState();
  updateComposerDraftState();
  scrollToStart();
  };

  document.addEventListener('doke:route-ready', function (event) {
    var path = String(event && event.detail && event.detail.path || window.location.pathname || '');
    if (!/comunidade-interna\.html(?:$|[?#])/.test(path) && !/comunidade-interna\.html/.test(window.location.pathname || '')) return;
    window.requestAnimationFrame(function () {
      window.DokeInitCommunityRoom();
    });
  });

  window.addEventListener('pageshow', function () {
    window.requestAnimationFrame(function () {
      window.DokeInitCommunityRoom();
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.DokeInitCommunityRoom, { once: true });
  } else {
    window.DokeInitCommunityRoom();
  }
})();
