(function () {
  'use strict';

  var communityRoomAuthWaitTimer = null;

  function isCommunityAuthHydrated() {
    var state = document.documentElement && document.documentElement.dataset
      ? document.documentElement.dataset.authenticated
      : '';
    return state === 'true' || state === 'false';
  }

  function scheduleCommunityRoomAfterAuth() {
    var root = document.querySelector('[data-community-room]');
    if (!root || root.dataset.communityRoomReady === 'true' || root.dataset.communityAuthWaiting === 'true') return;
    root.dataset.communityAuthWaiting = 'true';

    var resume = function () {
      if (communityRoomAuthWaitTimer) {
        window.clearTimeout(communityRoomAuthWaitTimer);
        communityRoomAuthWaitTimer = null;
      }
      root.dataset.communityAuthWaiting = 'false';
      document.removeEventListener('doke:auth-session-change', resume);
      document.removeEventListener('doke:auth-surface-ready', resume);
      window.requestAnimationFrame(function () { window.DokeInitCommunityRoom(); });
    };

    document.addEventListener('doke:auth-session-change', resume, { once: true });
    document.addEventListener('doke:auth-surface-ready', resume, { once: true });
    communityRoomAuthWaitTimer = window.setTimeout(resume, 1800);
  }

  window.DokeInitCommunityRoom = function DokeInitCommunityRoom() {
    var root = document.querySelector('[data-community-room]');
    if (!root || root.dataset.communityRoomReady === 'true') return;
    if (!isCommunityAuthHydrated()) {
      scheduleCommunityRoomAfterAuth();
      return;
    }
    root.dataset.communityRoomReady = 'true';

   var incomingCommunityTransition = window.Doke && window.Doke.communityTransition && window.Doke.communityTransition.consume('room');
   if (incomingCommunityTransition) root.dataset.communityTransition = 'from-listing';

  var channels = Array.prototype.slice.call(root.querySelectorAll('[data-channel-id]'));
  var channelList = root.querySelector('[data-community-channel-list]');
  var selectedChannelIds = new Set();
  var isSelectingChannels = false;
  var channelTitle = root.querySelector('[data-community-thread-title]');
  var channelStatus = root.querySelector('[data-community-thread-status]');
  var channelAvatar = root.querySelector('.community-room-thread__avatar');

  function applyIncomingTransitionSnapshot() {
    var snapshot = incomingCommunityTransition && incomingCommunityTransition.context;
    if (!snapshot || !snapshot.id) return;
    if (snapshot.title && channelTitle) channelTitle.textContent = snapshot.title;
    if (snapshot.title && channelAvatar) channelAvatar.textContent = String(snapshot.avatar || snapshot.title.slice(0, 2) || '#').toUpperCase();
    if (channelStatus) {
      var parts = [];
      if (Number(snapshot.memberCount || 0) > 0) parts.push(Number(snapshot.memberCount) + (Number(snapshot.memberCount) === 1 ? ' membro' : ' membros'));
      if (Number(snapshot.messageCount || 0) > 0) parts.push(Number(snapshot.messageCount) + (Number(snapshot.messageCount) === 1 ? ' mensagem' : ' mensagens'));
      channelStatus.textContent = parts.join(' • ') || 'Preparando comunidade...';
    }
    root.dataset.communitySnapshotReady = 'true';
  }

  applyIncomingTransitionSnapshot();
  var messageList = root.querySelector('[data-community-message-list]');
  var pinnedList = root.querySelector('.community-room-pinned-list');
  var composer = root.querySelector('[data-community-composer]');
  var composerInput = root.querySelector('[data-community-composer-input]');
  var mentionPicker = root.querySelector('[data-community-mention-picker]');
  var selectedMentions = [];
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
  var auditList = root.querySelector('[data-community-audit-list]');
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
  var requestList = root.querySelector('[data-community-request-list]');
  var requestFeedback = root.querySelector('[data-community-request-feedback]');
  var requestFilter = root.querySelector('[data-community-request-filter]');
  var manageForm = root.querySelector('[data-community-manage-form]');
  var manageName = root.querySelector('[data-community-manage-name]');
  var manageDescription = root.querySelector('[data-community-manage-description]');
  var manageRules = root.querySelector('[data-community-manage-rules]');
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
  var channelAdminList = root.querySelector('[data-community-channel-admin-list]');
  var channelForm = root.querySelector('[data-community-channel-form]');
  var channelNameInput = root.querySelector('[data-community-channel-name]');
  var channelDescriptionInput = root.querySelector('[data-community-channel-description]');
  var channelCategoryInput = root.querySelector('[data-community-channel-category]');
  var channelEditIdInput = root.querySelector('[data-community-channel-edit-id]');
  var channelSubmitButton = root.querySelector('[data-community-channel-submit]');
  var channelTypeInput = root.querySelector('[data-community-channel-type]');
  var channelReadOnlyInput = root.querySelector('[data-community-channel-readonly]');
  var channelSlowModeInput = root.querySelector('[data-community-channel-slow-mode]');
  var channelBlockLinksInput = root.querySelector('[data-community-channel-block-links]');
  var channelViewRoles = root.querySelector('[data-community-channel-view-roles]');
  var channelSendRoles = root.querySelector('[data-community-channel-send-roles]');
  var channelFeedback = root.querySelector('[data-community-channel-feedback]');
  var roleForm = root.querySelector('[data-community-role-form]');
  var roleName = root.querySelector('[data-community-role-name]');
  var roleColor = root.querySelector('[data-community-role-color]');
  var roleFeedback = root.querySelector('[data-community-role-feedback]');
  var rolePermissionInputs = Array.prototype.slice.call(root.querySelectorAll('[data-community-role-permissions] input[type="checkbox"]'));
  var roleList = root.querySelector('[data-community-role-list]');
  var transferForm = root.querySelector('[data-community-transfer-form]');
  var transferMember = root.querySelector('[data-community-transfer-member]');
  var transferConfirm = root.querySelector('[data-community-transfer-confirm]');
  var transferFeedback = root.querySelector('[data-community-transfer-feedback]');
  var deleteConfirm = root.querySelector('[data-community-delete-confirm]');
  var deleteFeedback = root.querySelector('[data-community-delete-feedback]');
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
  var COMMUNITY_CHANNEL_STATE_STORAGE_KEY = 'doke.community.channel-state.local.v1';
  var COMMUNITY_AUDIT_STORAGE_KEY = 'doke.community.audit.local.v1';
  var COMMUNITY_ANTISPAM_STORAGE_KEY = 'doke.community.antispam.local.v1';
  var COMMUNITY_DELETED_STORAGE_KEY = 'doke.communities.deleted.local.v1';
  var COMMUNITY_LIFECYCLE_STORAGE_KEY = 'doke.community.lifecycle.local.v1';
  var CONVERSATIONS_STORAGE_KEY = 'doke.conversations.local.v1';
  var LEGACY_CONVERSATIONS_STORAGE_KEY = 'doke.conversations';
  var MESSAGES_STORAGE_KEY = 'doke.messages.local.v1';
  var LEGACY_MESSAGES_STORAGE_KEY = 'doke.messages';
  var currentCommunityContext = null;
  var currentCommunityRecordSnapshot = null;
  var lastCommunityMembersSignature = '';
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

  function readDeletedCommunityTombstones() {
    var repository = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.repository;
    if (repository && repository.readTombstones) return repository.readTombstones();
    try {
      var parsed = safeJsonParse(window.localStorage && window.localStorage.getItem(COMMUNITY_DELETED_STORAGE_KEY));
      return Array.isArray(parsed) ? parsed.filter(function (item) { return item && item.id; }) : [];
    } catch (error) {
      return [];
    }
  }

  function writeDeletedCommunityTombstones(tombstones) {
    var repository = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.repository;
    if (repository && repository.writeTombstones) return repository.writeTombstones(tombstones);
    try {
      window.localStorage && window.localStorage.setItem(COMMUNITY_DELETED_STORAGE_KEY, JSON.stringify(Array.isArray(tombstones) ? tombstones : []));
    } catch (error) {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }

  function isCommunityTombstoned(communityId) {
    var id = String(communityId || '').trim();
    if (!id) return false;
    return readDeletedCommunityTombstones().some(function (item) { return String(item.id || '').trim() === id; });
  }

  function readLocalCommunities() {
    var repository = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.repository;
    if (repository && repository.list) return repository.list();
    try {
      var parsed = safeJsonParse(window.localStorage && window.localStorage.getItem(COMMUNITY_LIST_STORAGE_KEY));
      var tombstonedIds = new Set(readDeletedCommunityTombstones().map(function (item) { return String(item.id || '').trim(); }));
      return Array.isArray(parsed) ? parsed.filter(function (item) {
        var id = String(item && (item.id || item.community) || '').trim();
        return item && (id || item.title || item.name) && String(item.status || '').toLowerCase() !== 'deleted' && !tombstonedIds.has(id);
      }) : [];
    } catch (error) {
      return [];
    }
  }


  function writeLocalCommunities(communities) {
    var repository = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.repository;
    if (repository && repository.saveAll) return repository.saveAll(communities);
    try {
      window.localStorage && window.localStorage.setItem(COMMUNITY_LIST_STORAGE_KEY, JSON.stringify(Array.isArray(communities) ? communities : []));
      return true;
    } catch (error) {
      return false;
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

    var membersList = Array.prototype.slice.call(unique.values());
    if (!membersList.length && currentIsOwner) {
      var ownerFallback = normalizeCommunityMember(Object.assign({}, currentProfile, {
        role: 'owner',
        source: 'account'
      }));
      if (ownerFallback) membersList.push(ownerFallback);
    }
    return membersList;
  }

  function normalizeIdentityKey(value) {
    var normalizer = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.identity && window.Doke.communityDomain.identity.normalizeKey;
    return typeof normalizer === 'function' ? normalizer(value) : String(value || '').trim().toLowerCase();
  }

  function uniqueIdentityKeys(values) {
    return Array.from(new Set((values || []).map(normalizeIdentityKey).filter(Boolean)));
  }

  function getIdentityKeysFromUser(user) {
    var profile = user && user.profile || {};
    var profiles = user && Array.isArray(user.profiles) ? user.profiles : [];
    return uniqueIdentityKeys([
      user && user.id,
      user && user.userId,
      user && user.email,
      user && user.providerProfileId,
      user && user.professionalId,
      user && user.clientId,
      profile && profile.id,
      profile && profile.userId,
      profile && profile.email
    ].concat(profiles.reduce(function (keys, item) {
      return keys.concat([item && item.id, item && item.userId, item && item.email]);
    }, [])));
  }

  function getMemberIdentityKeys(member) {
    return uniqueIdentityKeys([
      member && member.accountKey,
      member && member.id,
      member && member.userId,
      member && member.profileId,
      member && member.email
    ].concat(member && Array.isArray(member.identityKeys) ? member.identityKeys : []));
  }

  function identitiesIntersect(left, right) {
    var leftSet = new Set(uniqueIdentityKeys(left));
    return uniqueIdentityKeys(right).some(function (key) { return leftSet.has(key); });
  }

  function getCurrentUserProfile() {
    var resolver = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.identity && window.Doke.communityDomain.identity.resolveCurrentUser;
    var service = window.DokeAuth && window.DokeAuth.service;
    var sessionUser = window.Doke && window.Doke.session && typeof window.Doke.session.getCurrentUser === 'function' ? window.Doke.session.getCurrentUser() : null;
    var authUser = service && typeof service.getCurrentUser === 'function' ? service.getCurrentUser() : null;
    var resolved = typeof resolver === 'function' ? resolver() : null;
    var user = resolved || sessionUser || authUser || null;
    var identityKeys = uniqueIdentityKeys(getIdentityKeysFromUser(sessionUser).concat(getIdentityKeysFromUser(authUser)).concat(resolved && resolved.identityKeys || []));
    var avatarSource = window.DokeMessageAuthor && window.DokeMessageAuthor.resolve ? window.DokeMessageAuthor.resolve({
      name: user && (user.displayName || user.name || user.fullName || user.email),
      avatarUrl: user && (user.avatarUrl || user.avatar || user.photoUrl || user.photo),
      initials: user && (user.initials || user.avatarInitials)
    }, 'Você') : { url: '', initials: '' };
    return {
      id: String(resolved && resolved.id || identityKeys[0] || ''),
      accountKey: String(resolved && resolved.accountKey || identityKeys[0] || ''),
      name: String(user && (user.displayName || user.name || user.fullName || user.email) || 'Você'),
      email: String(user && user.email || ''),
      avatarUrl: avatarSource.url || '',
      initials: avatarSource.initials || '',
      identityKeys: identityKeys,
      role: String(resolved && resolved.role || 'member'),
      source: String(resolved && resolved.source || 'account')
    };
  }

  function isCommunityDebugMode() {
    try {
      var value = new URLSearchParams(window.location.search || '').get('communityDebug');
      return value === '1' || value === 'members';
    } catch (error) {
      return false;
    }
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

  function markCommunityListingTransition(event) {
    if (event && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    var transition = window.Doke && window.Doke.communityTransition;
    if (!transition || typeof transition.begin !== 'function') return;
    transition.begin('listing', currentCommunityContext || getCommunityContextFromLocation());
  }

  currentCommunityContext = getCommunityContextFromLocation();
  root.hidden = true;
  root.dataset.communityAccessState = 'checking';
  root.dataset.communityHydrated = 'false';
  document.body.dataset.dataState = 'loading';

  var documentPreloader = document.documentElement.classList.contains('doke-community-document-reload')
    ? document.querySelector('[data-community-room-document-preloader]')
    : null;
  var roomSkeleton = document.querySelector('[data-community-room-skeleton]');
  var visualHydration = window.Doke && window.Doke.communityTransition && window.Doke.communityTransition.createVisualHydration
    ? window.Doke.communityTransition.createVisualHydration({
      body: document.body,
      preloader: documentPreloader,
      skeleton: roomSkeleton,
      isTransition: Boolean(incomingCommunityTransition)
    })
    : null;
  if (visualHydration) visualHydration.start();

  function applyCommunityRoomPageState(nextState) {
    document.body.dataset.dataState = nextState;
    root.dataset.state = nextState;
    root.setAttribute('aria-busy', String(nextState === 'loading'));
  }

  function setCommunityRoomPageState(state) {
    var nextState = state === 'error' ? 'error' : state === 'hydrated' ? 'hydrated' : 'loading';
    if (nextState === 'loading') {
      applyCommunityRoomPageState(nextState);
      return;
    }
    if (visualHydration) {
      visualHydration.complete(function () {
        applyCommunityRoomPageState(nextState);
      });
      return;
    }
    applyCommunityRoomPageState(nextState);
  }

  Array.prototype.slice.call(document.querySelectorAll('.community-room-return')).forEach(function (link) {
    link.addEventListener('click', markCommunityListingTransition);
  });

  function normalizeMemberRoleIds(member) {
    var values = (Array.isArray(member && member.roleIds) ? member.roleIds : []).concat(member && member.role ? [member.role] : []);
    var seen = new Set();
    var normalized = values.map(function (value) { return String(value || '').trim(); }).filter(function (value) {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
    return normalized.length ? normalized : ['member'];
  }

  function getMemberPrimaryRole(member) {
    var roles = normalizeMemberRoleIds(member).filter(function (roleId) { return roleId !== 'member'; });
    return String(member && member.role || roles[roles.length - 1] || 'member');
  }

  function normalizeCommunityMember(member) {
    var name = String(member && member.name || '').trim();
    if (!name) return null;
    return {
      id: String(member.id || member.userId || member.profileId || member.email || slugifyCommunity(name)).trim() || slugifyCommunity(name),
      accountKey: normalizeIdentityKey(member.accountKey || member.email || getMemberIdentityKeys(member)[0] || ''),
      name: name,
      email: String(member.email || '').trim(),
      identityKeys: getMemberIdentityKeys(member),
      role: String(member.role || (Array.isArray(member.roleIds) && member.roleIds[0]) || '').trim() || 'member',
      roleIds: normalizeMemberRoleIds(member),
      source: String(member.source || '').trim() || 'messages',
      joinedAt: String(member.joinedAt || '').trim(),
      addedBy: String(member.addedBy || '').trim(),
      membershipVersion: Math.max(1, Number(member.membershipVersion || 1)),
      mutedUntil: String(member.mutedUntil || '').trim(),
      restrictedUntil: String(member.restrictedUntil || '').trim(),
      disciplineReason: String(member.disciplineReason || '').trim(),
      disciplinedByAccountKey: String(member.disciplinedByAccountKey || '').trim(),
      disciplinedAt: String(member.disciplinedAt || '').trim()
    };
  }

  function getMemberIdentityKey(member) {
    var normalized = normalizeCommunityMember(member);
    if (!normalized) return '';
    return (normalized.identityKeys && normalized.identityKeys[0]) || String(normalized.id) + '|' + normalize(normalized.name);
  }


  var COMMUNITY_PERMISSION_KEYS = ['pinMessages', 'deleteMessages', 'addMembers', 'removeMembers', 'editCommunity', 'manageRoles', 'manageChannels', 'mentionRoles', 'bypassSlowMode', 'moderateMembers'];

  function normalizePermissions(permissions) {
    var normalized = {};
    COMMUNITY_PERMISSION_KEYS.forEach(function (key) {
      normalized[key] = Boolean(permissions && permissions[key]);
    });
    return normalized;
  }

  function getDefaultRoles() {
    return [
      { id: 'owner', name: 'Administrador', color: '#0f6f64', system: true, permissions: normalizePermissions({ pinMessages: true, deleteMessages: true, addMembers: true, removeMembers: true, editCommunity: true, manageRoles: true, manageChannels: true, mentionRoles: true, bypassSlowMode: true, moderateMembers: true }) },
      { id: 'moderator', name: 'Moderador', color: '#2167ae', system: true, permissions: normalizePermissions({ pinMessages: true, deleteMessages: true, addMembers: true, removeMembers: true, moderateMembers: true }) },
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
      permissions: normalizePermissions(role.permissions),
      createdAt: String(role.createdAt || '').trim(),
      createdByAccountKey: normalizeIdentityKey(role.createdByAccountKey || '')
    };
  }

  function getCommunityRolesForRecord(record) {
    var projector = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.roles && window.Doke.communityDomain.roles.projectCommunityRoles;
    if (typeof projector === 'function') return projector({ community: record || {} });
    var roles = getDefaultRoles();
    if (record && Array.isArray(record.roles)) roles = roles.concat(record.roles);
    var unique = new Map();
    roles.forEach(function (role) {
      var normalized = normalizeCommunityRole(role);
      if (!normalized || unique.has(normalized.id)) return;
      unique.set(normalized.id, normalized);
    });
    return Array.prototype.slice.call(unique.values());
  }

  function getCommunityRoles() {
    return getCommunityRolesForRecord(getCurrentCommunityRecord());
  }

  function debugCommunityRoles(stage, details) {
    var enabled = false;
    try { enabled = new URLSearchParams(window.location.search || '').get('communityDebug') === 'roles'; } catch (error) {}
    if (!enabled || !window.console) return;
    var record = getCurrentCommunityRecord() || {};
    var projected = getCommunityRolesForRecord(record);
    console.debug('[communityDebug:roles]', stage, Object.assign({
      communityId: String(record.id || getCurrentCommunityId() || ''),
      roleDraft: null,
      recordBeforeTransaction: null,
      transactionResult: null,
      persistedRecordAfterTransaction: record,
      currentCommunitySnapshot: currentCommunityRecordSnapshot,
      projectedRoles: projected,
      renderedRoleIds: roleList ? Array.prototype.map.call(roleList.querySelectorAll('[data-community-role-id]'), function (node) { return node.dataset.communityRoleId; }) : [],
      memberSelectOptions: memberList ? Array.prototype.map.call(memberList.querySelectorAll('[data-community-member-role-toggle]'), function (input) { return input.value + ':' + String(input.checked); }) : [],
      migrationVersion: Number(record.schemaVersion || 0)
    }, details || {}));
  }

  function getCommunityMemberTargetKey(member) {
    var normalized = normalizeCommunityMember(member);
    if (!normalized) return '';
    return String(normalized.accountKey || normalized.email || normalized.id || getMemberIdentityKey(normalized)).trim();
  }

  function memberMatchesTarget(member, targetKey) {
    var target = String(targetKey || '').trim();
    if (!target || !member) return false;
    if ([member.id, member.accountKey, member.email].some(function (value) { return String(value || '').trim() === target; })) return true;
    return identitiesIntersect(getMemberIdentityKeys(member), [target]);
  }

  function getCurrentMemberForRecord(record) {
    var profile = getCurrentUserProfile();
    var relationResolver = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.identity && window.Doke.communityDomain.identity.resolveCommunityRelation;
    if (typeof relationResolver === 'function') {
      var report = relationResolver({ community: record || {}, currentUser: profile });
      if (report.relation === 'owner') return Object.assign({}, profile, { role: 'owner' });
      if (report.matchedMember) return Object.assign({}, report.matchedMember, { role: report.matchedMember.role || 'member' });
      return Object.assign({}, profile, { role: 'visitor' });
    }
    return getCurrentCommunityMember();
  }

  function canCommunityForRecord(permission, record) {
    var member = getCurrentMemberForRecord(record);
    var permissionService = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.permissions;
    if (permissionService && permissionService.can) {
      return permissionService.can(permission, {
        relationship: String(member.role || '') === 'owner' ? 'owner' : 'member',
        member: member,
        roles: getCommunityRolesForRecord(record)
      });
    }
    if (String(member.role || '') === 'owner') return true;
    var role = getCommunityRolesForRecord(record).find(function (item) { return String(item.id) === String(member.role || 'member'); });
    return Boolean(role && role.permissions && role.permissions[permission]);
  }

  function getRoleLabel(roleId) {
    var role = getCommunityRoles().find(function (item) { return String(item.id) === String(roleId); });
    return role ? role.name : 'Membro';
  }

  function getMemberRoleLabels(member) {
    return normalizeMemberRoleIds(member).filter(function (roleId) { return roleId !== 'member' || normalizeMemberRoleIds(member).length === 1; }).map(getRoleLabel);
  }

  function getRoleColor(roleId) {
    var role = getCommunityRoles().find(function (item) { return String(item.id) === String(roleId); });
    return role ? role.color : '#64748b';
  }

  function getCurrentCommunityMember() {
    var profile = getCurrentUserProfile();
    var record = getCurrentCommunityRecord() || {};
    var relationResolver = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.identity && window.Doke.communityDomain.identity.resolveCommunityRelation;
    if (typeof relationResolver === 'function') {
      var report = relationResolver({ community: record, currentUser: profile });
      if (report.relation === 'owner') return Object.assign({}, profile, { role: 'owner' });
      if (report.matchedMember) return Object.assign({}, report.matchedMember, { role: report.matchedMember.role || 'member' });
      return Object.assign({}, profile, { role: 'visitor' });
    }
    var ownerKeys = uniqueIdentityKeys([
      record.ownerId,
      record.createdById,
      record.creatorId
    ].concat(Array.isArray(record.ownerIdentityKeys) ? record.ownerIdentityKeys : []));
    var ownerMember = Array.isArray(record.members) ? record.members.find(function (member) {
      return String(member && member.role || '').toLowerCase() === 'owner';
    }) : null;
    ownerKeys = uniqueIdentityKeys(ownerKeys.concat(getMemberIdentityKeys(ownerMember)));
    if (identitiesIntersect(profile.identityKeys || [profile.id], ownerKeys)) return Object.assign({}, profile, { role: 'owner' });
    return getCommunityMembers().find(function (member) {
      return identitiesIntersect(profile.identityKeys || [profile.id], getMemberIdentityKeys(member));
    }) || Object.assign({}, profile, { role: 'visitor' });
  }

  function canCommunity(permission) {
    var member = getCurrentCommunityMember();
    var permissionService = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.permissions;
    if (permissionService && permissionService.can) {
      return permissionService.can(permission, {
        relationship: String(member.role || '') === 'owner' ? 'owner' : 'member',
        member: member,
        roles: getCommunityRoles()
      });
    }
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
    root.querySelectorAll('[data-community-settings-tab="channels"], [data-community-panel="channels"]').forEach(function (node) { setPermissionState(node, canCommunity('manageChannels'), 'Sem permissão para gerenciar canais'); });
    root.querySelectorAll('[data-community-settings-tab="invite"]').forEach(function (node) { setPermissionState(node, canCommunity('addMembers'), 'Sem permissão para gerar convites'); });
    root.querySelectorAll('[data-community-settings-tab="requests"]').forEach(function (node) { setPermissionState(node, canCommunity('addMembers'), 'Sem permissão para revisar solicitações'); });
    if (memberAddToggle) setPermissionState(memberAddToggle, canCommunity('addMembers'), 'Sem permissão para adicionar membros');
    var currentMember = getCurrentCommunityMember();
    var isOwner = String(currentMember.role || '') === 'owner';
    root.querySelectorAll('[data-community-settings-tab="transfer"], [data-community-panel="transfer"]').forEach(function (node) {
      setPermissionState(node, isOwner, 'Somente o proprietário pode transferir a comunidade');
    });
    root.querySelectorAll('[data-community-danger-zone], [data-community-settings-tab="danger"]').forEach(function (node) {
      node.hidden = String(currentMember.role || '') !== 'owner';
    });
    root.querySelectorAll('[data-community-settings-tab="leave"], [data-community-panel="leave"]').forEach(function (node) {
      node.hidden = String(currentMember.role || '') === 'owner' || String(currentMember.role || '') === 'visitor';
    });
  }

  function ensureCurrentCommunityRecord() {
    var record = getCurrentCommunityRecord();
    if (!record) return null;
    var derivedOwnerId = deriveCommunityOwnerId(record);
    if (!record.ownerId && derivedOwnerId) {
      record = saveCurrentCommunityRecord(Object.assign({}, record, { ownerId: derivedOwnerId })) || record;
    }
    return record;
  }

  function getCurrentCommunityRecord() {
    var context = currentCommunityContext || getCommunityContextFromLocation();
    var id = String(context && context.id || '').trim();
    var title = String(context && context.title || '').trim();
    var communities = readLocalCommunities();
    var exact = null;

    if (id) {
      exact = communities.find(function (item) {
        return String(item.id || item.community || '').trim() === id;
      }) || null;
    } else if (title) {
      exact = communities.find(function (item) {
        return !String(item.id || item.community || '').trim()
          && String(item.title || item.name || '').trim() === title;
      }) || null;
    }

    var snapshotMatches = currentCommunityRecordSnapshot && (
      (id && String(currentCommunityRecordSnapshot.id || currentCommunityRecordSnapshot.community || '').trim() === id)
      || (!id && title && String(currentCommunityRecordSnapshot.title || currentCommunityRecordSnapshot.name || '').trim() === title)
    );

    if (snapshotMatches && !exact) return currentCommunityRecordSnapshot;

    if (exact) currentCommunityRecordSnapshot = exact;
    return exact;
  }

  function applyCurrentCommunityRecordSnapshot(record) {
    if (!record) return null;
    var currentId = getCurrentCommunityId();
    var recordId = String(record.id || record.community || '').trim();
    if (currentId && recordId && currentId !== recordId) return null;
    currentCommunityRecordSnapshot = record;
    return currentCommunityRecordSnapshot;
  }



  function normalizeCommunityVisibility(record) {
    var value = String(record && (record.visibility || record.type || record.category) || '').trim().toLowerCase();
    if (value === 'invite' || value.indexOf('convite') !== -1) return 'invite';
    if (value === 'private' || value.indexOf('privad') !== -1) return 'private';
    return 'public';
  }

  function getCurrentJoinRequest(record) {
    var profile = getCurrentUserProfile();
    var requests = record && Array.isArray(record.joinRequests) ? record.joinRequests : [];
    return requests.find(function (request) {
      return identitiesIntersect(profile.identityKeys || [profile.id], request && (request.identityKeys || [request.userId, request.userEmail]));
    }) || null;
  }

  function repairRecentCreatedCommunityOwnership(record) {
    if (!record || !record.id) return record;
    var marker = null;
    try {
      marker = JSON.parse(window.sessionStorage && window.sessionStorage.getItem('doke.community.recent-create.v1') || 'null');
    } catch (error) {
      marker = null;
    }
    if (!marker || String(marker.communityId || '') !== String(record.id || '')) return record;
    if (!Number.isFinite(Number(marker.createdAt)) || Date.now() - Number(marker.createdAt) > 120000) {
      try { window.sessionStorage && window.sessionStorage.removeItem('doke.community.recent-create.v1'); } catch (error) {}
      return record;
    }

    var profile = getCurrentUserProfile();
    var profileKeys = uniqueIdentityKeys([
      profile && profile.accountKey,
      profile && profile.id,
      profile && profile.email
    ].concat(profile && Array.isArray(profile.identityKeys) ? profile.identityKeys : [], marker.ownerIdentityKeys || []));
    var markerKey = normalizeIdentityKey(marker.ownerAccountKey || '');
    if (markerKey && profileKeys.length && !profileKeys.includes(markerKey)) return record;
    if (!profileKeys.length) return record;

    var ownerAccountKey = normalizeIdentityKey(profile && (profile.accountKey || profile.email) || markerKey || profileKeys[0]);
    var ownerId = String(profile && profile.id || ownerAccountKey || '').trim();
    var ownerMember = Object.assign({}, profile, {
      id: ownerId,
      accountKey: ownerAccountKey,
      email: String(profile && profile.email || '').trim(),
      identityKeys: profileKeys,
      role: 'owner',
      source: 'account',
      joinedAt: String(profile && profile.joinedAt || new Date().toISOString()),
      addedBy: 'community-create'
    });
    var members = Array.isArray(record.members) ? record.members : [];
    var withoutOwners = members.filter(function (member) {
      return String(member && member.role || '').toLowerCase() !== 'owner';
    });
    var repaired = Object.assign({}, record, {
      ownerId: ownerId,
      ownerIdentityKeys: profileKeys,
      createdById: ownerId,
      members: [ownerMember].concat(withoutOwners)
    });
    var repository = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.repository;
    var saved = repository && typeof repository.upsert === 'function'
      ? repository.upsert(repaired, {
        type: 'COMMUNITY_OWNER_INVARIANT_REPAIRED',
        actorId: ownerId,
        targetId: repaired.id,
        payload: { source: 'room-bootstrap' }
      })
      : saveCurrentCommunityRecord(repaired);
    return saved || repaired;
  }

  function getCommunityAccessDecision(record) {
    if (!record) return { allowed: false, action: 'missing', reason: 'community-not-found' };
    var relationResolver = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.identity && window.Doke.communityDomain.identity.resolveCommunityRelation;
    var relationReport = typeof relationResolver === 'function'
      ? relationResolver({ community: record, currentUser: getCurrentUserProfile() })
      : null;
    var role = relationReport ? relationReport.relation : String(getCurrentCommunityMember().role || 'visitor');
    if (role === 'owner' || role === 'member') {
      return { allowed: true, action: 'open', role: role, relationReport: relationReport };
    }

    var visibility = normalizeCommunityVisibility(record);
    if (visibility === 'public') return { allowed: false, action: 'join', reason: 'membership-required', relationReport: relationReport };
    if (visibility === 'invite') return { allowed: false, action: 'invite', reason: 'invite-required', relationReport: relationReport };

    var request = getCurrentJoinRequest(record);
    if (request && request.status === 'pending') return { allowed: false, action: 'pending', reason: 'request-pending', relationReport: relationReport };
    return { allowed: false, action: 'request', reason: request && request.status === 'rejected' ? 'request-rejected' : 'request-required', relationReport: relationReport };
  }

  function writeCommunityAccessDebug(label, record, decision) {
    if (!isCommunityDebugMode() || !window.console) return;
    var relationReport = decision && decision.relationReport;
    var sessionUser = window.Doke && window.Doke.session && typeof window.Doke.session.getCurrentUser === 'function' ? window.Doke.session.getCurrentUser() : null;
    var authUser = window.DokeAuth && window.DokeAuth.service && typeof window.DokeAuth.service.getCurrentUser === 'function' ? window.DokeAuth.service.getCurrentUser() : null;
    var accountResolver = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.identity && window.Doke.communityDomain.identity.accountKey;
    var currentUser = relationReport && relationReport.currentUser || getCurrentUserProfile();
    function safeUser(user) {
      return user ? {
        id: user.id || user.userId || '',
        email: user.email || '',
        accountKey: typeof accountResolver === 'function' ? accountResolver(user) : ''
      } : null;
    }
    var table = {
      communityId: String(record && record.id || getCurrentCommunityId() || ''),
      currentUrl: String(window.location.href || ''),
      canonicalSessionUser: safeUser(sessionUser),
      legacyAuthUser: safeUser(authUser),
      resolvedCurrentUser: { id: currentUser.id || '', accountKey: currentUser.accountKey || '', email: currentUser.email || '', source: currentUser.source || '' },
      resolvedIdentityKeys: relationReport && relationReport.currentUserKeys || currentUser.identityKeys || [],
      communityOwnerId: record && (record.ownerId || record.createdById || record.creatorId) || '',
      communityOwnerIdentityKeys: relationReport && relationReport.ownerIdentityKeys || [],
      persistedMembers: (Array.isArray(record && record.members) ? record.members : []).map(function (member) {
        return { id: member.id || '', accountKey: member.accountKey || '', email: member.email || '', role: member.role || '', identityKeys: getMemberIdentityKeys(member) };
      }),
      matchedOwnerKeys: relationReport && relationReport.matchedOwnerKeys || [],
      matchedMember: relationReport && relationReport.matchedMember ? { id: relationReport.matchedMember.id || '', accountKey: relationReport.matchedMember.accountKey || '', email: relationReport.matchedMember.email || '', role: relationReport.matchedMember.role || '' } : null,
      matchedMemberKeys: relationReport && relationReport.matchedMemberKeys || [],
      computedRelation: relationReport && relationReport.relation || decision && decision.role || 'visitor',
      privacy: normalizeCommunityVisibility(record),
      accessDecision: decision && decision.action || 'missing',
      rejectionReason: decision && decision.reason || ''
    };
    console.groupCollapsed('[communityDebug] ' + label);
    console.table(table);
    console.groupEnd();
  }

  function redirectToCommunityAccess(decision, record) {
    if (root.dataset.communityRedirecting === 'true') return;
    root.dataset.communityRedirecting = 'true';
    root.hidden = true;
    setCommunityRoomPageState('loading');
    writeCommunityAccessDebug('room-access-redirect', record, decision);
    var params = new URLSearchParams();
    params.set('communityAccess', decision.action || 'missing');
    if (record && record.id) params.set('community', record.id);
    if (record && (record.title || record.name)) params.set('title', record.title || record.name);
    if (decision.reason) params.set('reason', decision.reason);
    var target = 'comunidade.html?' + params.toString();

    // Access denial must end the current document lifecycle. Using the SPA
    // navigation helper here can leave both page controllers alive long enough
    // for the listing to reopen the room and create a redirect loop.
    window.location.replace(target);
  }

  function getCommunityDomainOperations() {
    return window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.operations || null;
  }

  function getCommunityNotificationsService() {
    return window.Doke && window.Doke.services && window.Doke.services.notifications || null;
  }

  function createCommunityNotification(payload) {
    var service = getCommunityNotificationsService();
    var recipientAccountKey = String(payload && (payload.recipientAccountKey || payload.userId) || '').trim();
    if (!service || typeof service.create !== 'function' || !payload || !recipientAccountKey) return Promise.resolve(null);
    return service.create({
      type: payload.type || 'community_update',
      category: 'social',
      userId: String(payload.userId || recipientAccountKey).trim(),
      recipientAccountKey: recipientAccountKey,
      actorId: String(payload.actorId || '').trim(),
      actorName: String(payload.actorName || '').trim(),
      eventKey: String(payload.eventKey || '').trim(),
      title: String(payload.title || 'Atualização da comunidade'),
      body: String(payload.body || payload.message || ''),
      targetUrl: String(payload.targetUrl || 'comunidade.html'),
      actionLabel: String(payload.actionLabel || payload.action || 'Abrir'),
      read: false
    }).catch(function (error) {
      console.warn('[DokeCommunity:createNotification]', error);
      return null;
    });
  }

  function createCommunityOperationId(type, communityId, actorId) {
    var suffix = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    return String(type || 'community-operation').toLowerCase() + '-' + String(communityId || 'unknown') + '-' + String(actorId || 'anonymous') + '-' + suffix;
  }


  function transactCurrentCommunity(type, targetId, mutator, payload) {
    var operations = getCommunityDomainOperations();
    var profile = getCurrentUserProfile();
    var communityId = getCurrentCommunityId();
    if (!operations || typeof operations.transact !== 'function') {
      return { ok: false, reason: 'domain-unavailable', message: 'Serviço de comunidade indisponível.' };
    }
    var operation = operations.transact(communityId, {
      type: type,
      actorId: profile.id,
      targetId: targetId || communityId,
      operationId: createCommunityOperationId(type, communityId, profile.id),
      payload: payload || {}
    }, mutator);
    if (!operation || !operation.ok) return operation;
    var repository = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.repository;
    var persistedRecord = repository && typeof repository.getById === 'function' ? repository.getById(communityId) : operation.record;
    operation.record = applyCurrentCommunityRecordSnapshot(persistedRecord || operation.record);
    return operation;
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
    if (index < 0) return null;
    var existing = communities[index];
    var saved = Object.assign({}, existing, nextRecord, {
      ownerId: String(deriveCommunityOwnerId(nextRecord) || deriveCommunityOwnerId(existing) || ''),
      id: id,
      title: title,
      name: title,
      category: nextRecord.category || context.category || nextRecord.category || '',
      updatedAt: new Date().toISOString()
    });
    communities[index] = saved;
    writeLocalCommunities(communities);
    return saved;
  }

  function updateCurrentCommunityMembers(updater) {
    var record = ensureCurrentCommunityRecord();
    if (!record) return null;
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

  function renderOwnershipTransferOptions() {
    if (!transferMember) return;
    var currentValue = String(transferMember.value || '');
    transferMember.innerHTML = '<option value="">Selecione um membro</option>';
    getCommunityMembers().filter(function (member) {
      return member && String(member.role || '') !== 'owner';
    }).forEach(function (member) {
      var option = document.createElement('option');
      option.value = String(member.id || '');
      option.textContent = member.name + ' · ' + getRoleLabel(member.role);
      transferMember.appendChild(option);
    });
    if (currentValue && Array.prototype.some.call(transferMember.options, function (option) { return option.value === currentValue; })) {
      transferMember.value = currentValue;
    }
  }

  function createOwnershipHistoryEntry(previousOwner, nextOwner, actor) {
    return {
      id: 'ownership-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      action: 'transferred',
      previousOwnerId: String(previousOwner && previousOwner.id || ''),
      previousOwnerName: String(previousOwner && previousOwner.name || ''),
      previousOwnerIdentityKeys: getMemberIdentityKeys(previousOwner),
      nextOwnerId: String(nextOwner && nextOwner.id || ''),
      nextOwnerName: String(nextOwner && nextOwner.name || ''),
      nextOwnerIdentityKeys: getMemberIdentityKeys(nextOwner),
      actorId: String(actor && actor.id || ''),
      actorName: String(actor && actor.name || ''),
      transferredAt: new Date().toISOString()
    };
  }

  function transferCommunityOwnership(targetMemberId) {
    var actor = getCurrentUserProfile();
    var operations = getCommunityDomainOperations();
    var communityId = getCurrentCommunityId();
    if (!operations || !operations.transact) return { ok: false, reason: 'domain-unavailable' };
    var operation = operations.transact(communityId, {
      type: 'OWNER_TRANSFERRED', actorId: actor.id, targetId: String(targetMemberId || ''),
      operationId: createCommunityOperationId('owner-transfer', communityId, actor.id)
    }, function (record) {
      var actorMember = getCurrentCommunityMember();
      if (String(actorMember && actorMember.role || '') !== 'owner') return { ok: false, reason: 'owner-required' };
      var members = Array.isArray(record.members) ? record.members.map(normalizeCommunityMember).filter(Boolean) : [];
      var previousOwner = members.find(function (member) { return String(member.role || '') === 'owner'; });
      var nextOwner = members.find(function (member) { return String(member.id || '') === String(targetMemberId || ''); });
      if (!previousOwner || !nextOwner || String(nextOwner.role || '') === 'owner') return { ok: false, reason: 'invalid-target' };
      if (identitiesIntersect(getMemberIdentityKeys(previousOwner), getMemberIdentityKeys(nextOwner))) return { ok: false, reason: 'same-account' };
      var normalizedMembers = members.map(function (member) {
        var next = Object.assign({}, member);
        if (identitiesIntersect(getMemberIdentityKeys(next), getMemberIdentityKeys(previousOwner))) next.role = 'member';
        if (identitiesIntersect(getMemberIdentityKeys(next), getMemberIdentityKeys(nextOwner))) next.role = 'owner';
        return next;
      });
      if (normalizedMembers.filter(function (member) { return member.role === 'owner'; }).length !== 1) return { ok: false, reason: 'owner-invariant' };
      var history = Array.isArray(record.ownershipHistory) ? record.ownershipHistory.slice() : [];
      history.push(createOwnershipHistoryEntry(previousOwner, nextOwner, actor));
      return {
        record: Object.assign({}, record, { ownerId: String(nextOwner.id || ''), ownerAccountKey: String(nextOwner.accountKey || nextOwner.email || nextOwner.id || ''), ownerIdentityKeys: getMemberIdentityKeys(nextOwner), members: normalizedMembers, ownershipHistory: history }),
        result: { previousOwner: previousOwner, nextOwner: nextOwner },
        payload: { previousOwnerId: previousOwner.id, nextOwnerId: nextOwner.id }
      };
    });
    return operation.ok
      ? { ok: true, record: operation.record, previousOwner: operation.result && operation.result.previousOwner, nextOwner: operation.result && operation.result.nextOwner }
      : operation;
  }

  function createMembershipHistoryEntry(member, action, reason, actor) {
    var now = new Date().toISOString();
    var entry = {
      id: 'membership-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      memberId: String(member && member.id || ''),
      memberName: String(member && member.name || ''),
      identityKeys: getMemberIdentityKeys(member),
      action: action,
      reason: String(reason || '').trim(),
      actorId: String(actor && actor.id || ''),
      actorName: String(actor && actor.name || ''),
      createdAt: now
    };
    if (action === 'left') entry.leftAt = now;
    if (action === 'removed') entry.removedAt = now;
    return entry;
  }

  function removeCommunityMember(member, action, reason) {
    if (!member || String(member.role || '') === 'owner') return { ok: false, reason: 'owner-protected' };
    var actor = getCurrentUserProfile();
    var operations = getCommunityDomainOperations();
    var communityId = getCurrentCommunityId();
    if (!operations || !operations.transact) return { ok: false, reason: 'domain-unavailable' };
    var eventType = action === 'left' ? 'MEMBER_LEFT' : 'MEMBER_REMOVED';
    var operation = operations.transact(communityId, {
      type: eventType, actorId: actor.id, targetId: String(member.id || ''),
      operationId: createCommunityOperationId(eventType, communityId, actor.id),
      payload: { reason: String(reason || '') }
    }, function (record) {
      var memberKeys = getMemberIdentityKeys(member);
      var removedMember = null;
      var nextMembers = (Array.isArray(record.members) ? record.members : []).filter(function (candidate) {
        var matches = identitiesIntersect(memberKeys, getMemberIdentityKeys(candidate));
        if (matches && !removedMember) removedMember = normalizeCommunityMember(candidate);
        return !matches;
      });
      if (!removedMember) return { ok: false, reason: 'member-not-found' };
      var history = Array.isArray(record.membershipHistory) ? record.membershipHistory.slice() : [];
      history.push(createMembershipHistoryEntry(removedMember, action, reason, actor));
      return { record: Object.assign({}, record, { members: nextMembers, membershipHistory: history }), result: removedMember, payload: { memberId: removedMember.id, action: action } };
    });
    return operation.ok ? { ok: true, member: operation.result, record: operation.record } : operation;
  }

  function leaveCurrentCommunity() {
    var member = getCurrentCommunityMember();
    if (!member || String(member.role || '') === 'visitor') return { ok: false, reason: 'not-member' };
    if (String(member.role || '') === 'owner') return { ok: false, reason: 'owner-must-transfer-or-delete' };
    return removeCommunityMember(member, 'left', 'voluntary-leave');
  }

  function reconcileCommunityMemberRecord(sourceRecord) {
    var record = sourceRecord && typeof sourceRecord === 'object' ? sourceRecord : null;
    if (!record || !record.id) return record;

    var originalMembers = Array.isArray(record.members) ? record.members : [];
    var nextMembers = originalMembers.map(normalizeCommunityMember).filter(Boolean);
    var currentProfile = getCurrentUserProfile();
    var relationResolver = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.identity && window.Doke.communityDomain.identity.resolveCommunityRelation;
    var relationReport = typeof relationResolver === 'function'
      ? relationResolver({ community: record, currentUser: currentProfile })
      : null;
    var ownerId = deriveCommunityOwnerId(record);
    var ownerKeys = uniqueIdentityKeys([ownerId].concat(Array.isArray(record.ownerIdentityKeys) ? record.ownerIdentityKeys : []));
    var ownerIndex = nextMembers.findIndex(function (member) {
      return String(member.role || '') === 'owner'
        || identitiesIntersect(getMemberIdentityKeys(member), ownerKeys)
        || (ownerId && String(member.id || '') === String(ownerId));
    });

    if (relationReport && relationReport.relation === 'owner') {
      var currentOwner = Object.assign({}, ownerIndex >= 0 ? nextMembers[ownerIndex] : {}, currentProfile, {
        id: currentProfile.id || ownerId || currentProfile.accountKey,
        accountKey: currentProfile.accountKey || currentProfile.email || currentProfile.id || ownerId,
        email: currentProfile.email || '',
        identityKeys: uniqueIdentityKeys((currentProfile.identityKeys || []).concat(ownerKeys)),
        name: currentProfile.name || 'Você',
        role: 'owner',
        source: 'account',
        joinedAt: ownerIndex >= 0 && nextMembers[ownerIndex].joinedAt || record.createdAt || new Date().toISOString()
      });
      if (ownerIndex >= 0) nextMembers[ownerIndex] = currentOwner;
      else nextMembers.unshift(currentOwner);
    } else if (ownerIndex < 0 && (ownerId || ownerKeys.length)) {
      nextMembers.unshift({
        id: ownerId || ownerKeys[0],
        accountKey: ownerKeys[0] || ownerId,
        name: 'Administrador',
        role: 'owner',
        source: 'account',
        identityKeys: ownerKeys,
        joinedAt: record.createdAt || ''
      });
    } else if (ownerIndex >= 0) {
      nextMembers[ownerIndex] = Object.assign({}, nextMembers[ownerIndex], {
        role: 'owner',
        identityKeys: uniqueIdentityKeys(getMemberIdentityKeys(nextMembers[ownerIndex]).concat(ownerKeys))
      });
    }

    (Array.isArray(record.joinRequests) ? record.joinRequests : []).forEach(function (request) {
      if (!request || request.status !== 'accepted') return;
      var requestKeys = uniqueIdentityKeys([request.accountKey, request.userId, request.userEmail].concat(request.identityKeys || []));
      if (!requestKeys.length) return;
      var memberIndex = nextMembers.findIndex(function (member) {
        return identitiesIntersect(requestKeys, getMemberIdentityKeys(member));
      });
      var memberPatch = {
        id: request.userId || request.accountKey || request.userEmail || requestKeys[0],
        accountKey: request.accountKey || request.userEmail || request.userId || requestKeys[0],
        email: request.userEmail || '',
        identityKeys: requestKeys,
        name: request.userName || 'Membro',
        role: memberIndex >= 0 && nextMembers[memberIndex].role === 'owner' ? 'owner' : 'member',
        source: 'join-request',
        joinedAt: memberIndex >= 0 && nextMembers[memberIndex].joinedAt || request.resolvedAt || request.requestedAt || new Date().toISOString(),
        addedBy: request.resolvedBy || ''
      };
      if (memberIndex >= 0) nextMembers[memberIndex] = Object.assign({}, nextMembers[memberIndex], memberPatch);
      else nextMembers.push(memberPatch);
    });

    var unique = new Map();
    nextMembers.forEach(function (member) {
      var normalized = normalizeCommunityMember(member);
      if (!normalized) return;
      var key = getMemberIdentityKey(normalized) || String(normalized.id || normalized.name || '').trim().toLowerCase();
      if (!key) return;
      var existing = unique.get(key);
      if (!existing || (existing.role !== 'owner' && normalized.role === 'owner')) unique.set(key, normalized);
    });
    nextMembers = Array.prototype.slice.call(unique.values());

    var before = JSON.stringify(originalMembers);
    var after = JSON.stringify(nextMembers);
    if (before === after) return record;

    var repaired = Object.assign({}, record, { members: nextMembers, updatedAt: new Date().toISOString() });
    var repository = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.repository;
    var saved = repository && typeof repository.upsert === 'function'
      ? repository.upsert(repaired, {
        type: 'COMMUNITY_MEMBERS_RECONCILED',
        actorId: currentProfile.accountKey || currentProfile.id || '',
        targetId: repaired.id,
        payload: { memberCount: nextMembers.length }
      })
      : saveCurrentCommunityRecord(repaired);
    return saved || repaired;
  }

  function getCommunityMembers() {
    var canonicalRecord = getCurrentCommunityRecord() || {};
    var projector = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.members && window.Doke.communityDomain.members.projectCommunityMembers;
    if (typeof projector === 'function') {
      return projector({ community: canonicalRecord, currentUser: getCurrentUserProfile() });
    }
    var record = reconcileCommunityMemberRecord(getCurrentCommunityRecord() || {}) || {};
    var rawMembers = Array.isArray(record.members) ? record.members.slice() : [];
    var currentProfile = getCurrentUserProfile();
    var relationResolver = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.identity && window.Doke.communityDomain.identity.resolveCommunityRelation;
    var relationReport = typeof relationResolver === 'function'
      ? relationResolver({ community: record, currentUser: currentProfile })
      : null;
    var ownerId = deriveCommunityOwnerId(record);
    var ownerKeys = uniqueIdentityKeys([ownerId].concat(Array.isArray(record.ownerIdentityKeys) ? record.ownerIdentityKeys : []));
    var storedOwner = rawMembers.find(function (member) { return String(member && member.role || '') === 'owner'; }) || null;
    ownerKeys = uniqueIdentityKeys(ownerKeys.concat(getMemberIdentityKeys(storedOwner)));

    if (relationReport && relationReport.relation === 'owner') {
      var ownerIndex = rawMembers.findIndex(function (member) {
        return String(member && member.role || '') === 'owner'
          || identitiesIntersect(getMemberIdentityKeys(member), currentProfile.identityKeys || [currentProfile.id]);
      });
      var ownerProfile = Object.assign({}, rawMembers[ownerIndex] || {}, currentProfile, {
        id: currentProfile.id || ownerId,
        accountKey: currentProfile.accountKey || currentProfile.id || ownerId,
        identityKeys: uniqueIdentityKeys((currentProfile.identityKeys || []).concat(ownerKeys)),
        role: 'owner',
        source: 'account',
        joinedAt: rawMembers[ownerIndex] && rawMembers[ownerIndex].joinedAt || record.createdAt || ''
      });
      if (ownerIndex >= 0) rawMembers[ownerIndex] = ownerProfile;
      else rawMembers.unshift(ownerProfile);
    } else if (storedOwner) {
      var storedOwnerIndex = rawMembers.indexOf(storedOwner);
      rawMembers[storedOwnerIndex] = Object.assign({}, storedOwner, { role: 'owner', identityKeys: uniqueIdentityKeys(getMemberIdentityKeys(storedOwner).concat(ownerKeys)) });
    } else if (ownerId || ownerKeys.length) {
      rawMembers.unshift({
        id: ownerId || ownerKeys[0],
        accountKey: ownerKeys[0] || ownerId,
        name: 'Administrador',
        role: 'owner',
        source: 'account',
        identityKeys: ownerKeys
      });
    }

    if (relationReport && relationReport.relation === 'member' && relationReport.matchedMember) {
      var currentMemberKeys = getMemberIdentityKeys(relationReport.matchedMember);
      if (!rawMembers.some(function (member) { return identitiesIntersect(getMemberIdentityKeys(member), currentMemberKeys); })) {
        rawMembers.push(relationReport.matchedMember);
      }
    }

    var unique = new Map();
    rawMembers.forEach(function (member) {
      var normalized = normalizeCommunityMember(member);
      if (!normalized) return;
      if (identitiesIntersect(getMemberIdentityKeys(normalized), ownerKeys) || (ownerId && String(normalized.id) === ownerId)) normalized.role = 'owner';
      var key = getMemberIdentityKey(normalized) || String(normalized.id || normalized.name || '').trim().toLowerCase();
      if (!key) return;
      var existing = unique.get(key);
      if (!existing || (existing.role !== 'owner' && normalized.role === 'owner')) unique.set(key, normalized);
    });
    return Array.prototype.slice.call(unique.values());
  }

  function getCommunityMembersSignature(record) {
    var projected = getCommunityMembers();
    return JSON.stringify({
      communityId: String(record && record.id || ''),
      schemaVersion: Number(record && record.schemaVersion || 0),
      updatedAt: String(record && record.updatedAt || ''),
      members: projected.map(function (member) {
        return [member.accountKey || member.id || '', normalizeMemberRoleIds(member).join(','), member.membershipVersion || 1];
      })
    });
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


  function createRoleChecklist(member) {
    var fieldset = document.createElement('fieldset');
    fieldset.className = 'community-member-directory__role-list';
    fieldset.setAttribute('aria-label', 'Cargos de ' + String(member.name || 'membro'));
    var targetKey = getCommunityMemberTargetKey(member);
    var selectedRoles = new Set(normalizeMemberRoleIds(member));
    getCommunityRoles().forEach(function (role) {
      if (String(role.id) === 'owner' || String(role.id) === 'member') return;
      var label = document.createElement('label');
      label.className = 'community-member-directory__role-option';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'doke-checkbox';
      input.value = role.id;
      input.checked = selectedRoles.has(String(role.id));
      input.dataset.communityMemberRoleToggle = targetKey;
      var copy = document.createElement('span');
      copy.className = 'community-member-directory__role-option-copy';
      var name = document.createElement('strong');
      name.textContent = role.name;
      var description = document.createElement('small');
      var permissionCount = Object.keys(role.permissions || {}).filter(function (key) { return role.permissions[key]; }).length;
      description.textContent = permissionCount ? permissionCount + ' permissões' : 'Sem permissões extras';
      copy.append(name, description);
      label.append(input, copy);
      fieldset.appendChild(label);
    });
    if (!fieldset.children.length) {
      var empty = document.createElement('p');
      empty.className = 'community-member-directory__role-empty';
      empty.textContent = 'Crie cargos em Configurações para atribuí-los.';
      fieldset.appendChild(empty);
    }
    return fieldset;
  }

  function isFutureDisciplineDate(value) {
    var time = Date.parse(String(value || ''));
    return Number.isFinite(time) && time > Date.now();
  }

  function getMemberDisciplineLabel(member) {
    if (isFutureDisciplineDate(member && member.mutedUntil)) return 'Silenciado até ' + new Date(member.mutedUntil).toLocaleString('pt-BR');
    if (isFutureDisciplineDate(member && member.restrictedUntil)) return 'Restrito até ' + new Date(member.restrictedUntil).toLocaleString('pt-BR');
    return '';
  }

  function getDisciplineDurationMs(value) {
    var map = { '1h': 3600000, '24h': 86400000, '7d': 604800000 };
    return map[value] || 3600000;
  }

  function disciplineCommunityMember(memberId, action, reason, durationKey) {
    var profile = getCurrentUserProfile();
    var result = transactCurrentCommunity('MEMBER_DISCIPLINE_CHANGED', memberId, function (storedRecord) {
      if (!canCommunityForRecord('moderateMembers', storedRecord)) return { ok: false, message: 'Sem permissão para moderar membros.' };
      var members = getCommunityMembersForRecord(storedRecord);
      var target = members.find(function (member) { return String(member.id) === String(memberId); });
      if (!target || target.role === 'owner') return { ok: false, message: 'Esse membro não pode receber esta ação.' };
      var now = new Date();
      var until = new Date(now.getTime() + getDisciplineDurationMs(durationKey || '1h')).toISOString();
      var nextMembers = members.map(function (member) {
        if (String(member.id) !== String(memberId)) return member;
        var patch = { disciplineReason: reason, disciplinedAt: now.toISOString(), disciplinedByAccountKey: profile.accountKey || profile.email || profile.id || '' };
        if (action === 'mute') patch.mutedUntil = until;
        if (action === 'restrict') patch.restrictedUntil = until;
        if (action === 'clear') { patch.mutedUntil = ''; patch.restrictedUntil = ''; patch.disciplineReason = ''; }
        return Object.assign({}, member, patch);
      });
      return { record: Object.assign({}, storedRecord, { members: nextMembers, updatedAt: now.toISOString() }), payload: { memberId: memberId, action: action, reason: reason, until: action === 'clear' ? '' : until } };
    });
    if (result.ok) appendCommunityAuditEvent(action === 'clear' ? 'memberDisciplineCleared' : (action === 'mute' ? 'memberMuted' : 'memberRestricted'), { targetMemberId: memberId, reason: reason, until: result.payload && result.payload.until });
    return result;
  }

  function banCommunityMember(member, reason) {
    var profile = getCurrentUserProfile();
    var target = normalizeCommunityMember(member);
    if (!target) return { ok: false, message: 'Membro não encontrado.' };
    var result = transactCurrentCommunity('MEMBER_BANNED', target.id, function (storedRecord) {
      if (!canCommunityForRecord('moderateMembers', storedRecord)) return { ok: false, message: 'Sem permissão para banir membros.' };
      var members = getCommunityMembersForRecord(storedRecord);
      var current = members.find(function (item) { return String(item.id) === String(target.id); });
      if (!current || current.role === 'owner') return { ok: false, message: 'Esse membro não pode ser banido.' };
      var identityKeys = getMemberIdentityKeys(current);
      var ban = { id: 'ban-' + Date.now().toString(36), memberId: current.id, accountKey: current.accountKey || '', email: current.email || '', name: current.name, identityKeys: identityKeys, reason: reason, bannedAt: new Date().toISOString(), bannedByAccountKey: profile.accountKey || profile.email || profile.id || '', bannedByName: profile.name || 'Administrador' };
      var bans = (Array.isArray(storedRecord.bans) ? storedRecord.bans : []).filter(function (entry) { return !identitiesIntersect(entry.identityKeys || [], identityKeys); });
      bans.push(ban);
      return { record: Object.assign({}, storedRecord, { members: members.filter(function (item) { return String(item.id) !== String(target.id); }), bans: bans, updatedAt: new Date().toISOString() }), payload: { memberId: target.id, reason: reason } };
    });
    if (result.ok) appendCommunityAuditEvent('memberBanned', { targetMemberId: target.id, targetMemberName: target.name, reason: reason });
    return result;
  }

  function createMemberItem(member) {
    var isOwner = String(member.role || '') === 'owner';
    var currentProfile = getCurrentUserProfile();
    var isCurrentUser = identitiesIntersect(
      currentProfile.identityKeys || [currentProfile.id],
      getMemberIdentityKeys(member)
    );
    var canManageRoles = !isOwner && canCommunity('manageRoles');
    var canRemoveMember = !isOwner && canCommunity('removeMembers');
    var canModerateMember = !isOwner && canCommunity('moderateMembers');
    var hasActions = canManageRoles || canRemoveMember || canModerateMember;

    var item = document.createElement('article');
    item.className = 'community-member-directory__row' + (isOwner ? ' is-owner' : '');
    item.dataset.memberSearch = [member.name, member.source].concat(getMemberRoleLabels(member)).join(' ');
    item.dataset.communityMemberId = member.id;

    var avatarWrap = document.createElement('div');
    avatarWrap.className = 'community-member-directory__avatar-wrap';
    var avatar = document.createElement('b');
    avatar.className = 'community-member-directory__avatar doke-avatar';
    avatar.textContent = getMemberInitials(member.name);
    avatarWrap.appendChild(avatar);
    if (isCurrentUser) {
      var presenceDot = document.createElement('span');
      presenceDot.className = 'community-member-directory__presence-dot';
      presenceDot.setAttribute('aria-label', 'Online agora');
      avatarWrap.appendChild(presenceDot);
    }

    var identity = document.createElement('div');
    identity.className = 'community-member-directory__identity';
    var titleRow = document.createElement('div');
    titleRow.className = 'community-member-directory__title-row';
    var name = document.createElement('strong');
    name.className = 'community-member-directory__name';
    name.textContent = isCurrentUser ? 'Você' : member.name;
    titleRow.appendChild(name);
    if (isOwner) {
      var ownerBadge = document.createElement('span');
      ownerBadge.className = 'community-member-directory__owner-badge';
      ownerBadge.textContent = 'Dono';
      titleRow.appendChild(ownerBadge);
    }
    var subtitle = document.createElement('span');
    subtitle.className = 'community-member-directory__subtitle';
    subtitle.textContent = isCurrentUser ? 'Online agora' : (getMemberDisciplineLabel(member) || getMemberRoleLabels(member).join(' · '));
    identity.append(titleRow, subtitle);

    item.append(avatarWrap, identity);

    if (hasActions) {
      var actions = document.createElement('div');
      actions.className = 'community-member-directory__actions';
      var menuButton = document.createElement('button');
      menuButton.type = 'button';
      menuButton.className = 'community-member-directory__menu-button doke-icon-btn doke-icon-btn--flat';
      menuButton.dataset.communityMemberMenuToggle = member.id;
      menuButton.setAttribute('aria-label', 'Ações de ' + String(member.name || 'membro'));
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.textContent = '•••';

      var menu = document.createElement('div');
      menu.className = 'community-member-directory__menu';
      menu.dataset.communityMemberMenu = member.id;
      menu.hidden = true;

      if (canManageRoles) {
        var roleField = document.createElement('label');
        roleField.className = 'community-member-directory__field';
        var roleLabel = document.createElement('span');
        roleLabel.textContent = 'Cargos';
        roleField.append(roleLabel, createRoleChecklist(member));
        menu.appendChild(roleField);
      }

      if (canModerateMember) {
        var discipline = document.createElement('div');
        discipline.className = 'community-member-directory__discipline-actions';
        [['mute', 'Silenciar 1h'], ['restrict', 'Restringir 24h']].forEach(function (entry) {
          var actionButton = document.createElement('button');
          actionButton.type = 'button';
          actionButton.className = 'doke-btn doke-btn--ghost doke-btn--sm';
          actionButton.dataset.communityMemberDiscipline = entry[0];
          actionButton.dataset.communityMemberId = member.id;
          actionButton.dataset.duration = entry[0] === 'mute' ? '1h' : '24h';
          actionButton.textContent = entry[1];
          discipline.appendChild(actionButton);
        });
        if (getMemberDisciplineLabel(member)) {
          var clearButton = document.createElement('button');
          clearButton.type = 'button'; clearButton.className = 'doke-btn doke-btn--ghost doke-btn--sm';
          clearButton.dataset.communityMemberDiscipline = 'clear'; clearButton.dataset.communityMemberId = member.id;
          clearButton.textContent = 'Remover restrição'; discipline.appendChild(clearButton);
        }
        var banButton = document.createElement('button');
        banButton.type = 'button'; banButton.className = 'doke-btn doke-btn--danger doke-btn--sm';
        banButton.dataset.communityMemberBan = member.id; banButton.textContent = 'Banir membro';
        discipline.appendChild(banButton);
        menu.appendChild(discipline);
      }

      if (canRemoveMember) {
        var remove = document.createElement('button');
        remove.className = 'community-member-directory__remove doke-btn doke-btn--danger doke-btn--sm';
        remove.type = 'button';
        remove.dataset.communityMemberRemove = member.id;
        remove.textContent = 'Remover da comunidade';
        menu.appendChild(remove);
      }

      actions.append(menuButton, menu);
      item.appendChild(actions);
    } else {
      var roleBadge = document.createElement('span');
      roleBadge.className = 'community-member-directory__role-badge';
      roleBadge.textContent = isOwner ? 'Dono' : getMemberRoleLabels(member).join(' · ');
      item.appendChild(roleBadge);
    }

    return item;
  }

  function getMemberGroup(member) {
    var roleId = getMemberPrimaryRole(member);
    if (roleId === 'owner') return { id: 'owner', label: 'Dono' };
    var role = getCommunityRoles().find(function (item) { return String(item.id) === roleId; });
    return { id: roleId, label: role && role.name ? role.name : 'Membros' };
  }

  function renderMemberGroup(group, groupMembers) {
    var section = document.createElement('section');
    section.className = 'community-member-directory__group';
    section.dataset.communityMemberGroup = group.id;
    var heading = document.createElement('h3');
    heading.className = 'community-member-directory__group-title';
    heading.textContent = group.label + ' — ' + groupMembers.length;
    var rows = document.createElement('div');
    rows.className = 'community-member-directory__rows';
    groupMembers.forEach(function (member) { rows.appendChild(createMemberItem(member)); });
    section.append(heading, rows);
    return section;
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
    var currentRecord = getCurrentCommunityRecord() || {};
    lastCommunityMembersSignature = JSON.stringify({
      communityId: String(currentRecord.id || ''),
      schemaVersion: Number(currentRecord.schemaVersion || 0),
      updatedAt: String(currentRecord.updatedAt || ''),
      members: list.map(function (member) { return [member.accountKey || member.id || '', normalizeMemberRoleIds(member).join(','), member.membershipVersion || 1]; })
    });
    var memberDebugger = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.members && window.Doke.communityDomain.members.debug;
    if (typeof memberDebugger === 'function') memberDebugger('before-renderer', currentRecord, getCurrentUserProfile(), list);
    var grouped = new Map();
    list.forEach(function (member) {
      var group = getMemberGroup(member);
      if (!grouped.has(group.id)) grouped.set(group.id, { group: group, members: [] });
      grouped.get(group.id).members.push(member);
    });
    Array.from(grouped.values())
      .sort(function (a, b) {
        if (a.group.id === 'owner') return -1;
        if (b.group.id === 'owner') return 1;
        return a.group.label.localeCompare(b.group.label, 'pt-BR');
      })
      .forEach(function (entry) {
        memberList.appendChild(renderMemberGroup(entry.group, entry.members));
      });
    if (!list.length) {
      memberList.appendChild(createPanelEmptyState('Nenhum membro adicionado', 'Adicione pessoas das mensagens para formar esta comunidade.'));
    }
    members = Array.prototype.slice.call(memberList.querySelectorAll('[data-member-search]'));
    if (window.DokeUiSelect && typeof window.DokeUiSelect.enhanceAll === 'function') {
      window.DokeUiSelect.enhanceAll(memberList);
      window.DokeUiSelect.refresh && window.DokeUiSelect.refresh(memberList);
    }
    if (memberCandidates && !memberCandidates.hidden) renderMemberCandidates();
  }

  function getCommunityJoinRequests() {
    var record = ensureCurrentCommunityRecord() || {};
    return Array.isArray(record.joinRequests) ? record.joinRequests.slice() : [];
  }

  function requestMatchesFilter(request) {
    var filter = String(requestFilter && requestFilter.value || 'pending');
    return filter === 'all' || String(request && request.status || 'pending') === filter;
  }

  function getRequestStatusLabel(status) {
    if (status === 'accepted') return 'Aprovada';
    if (status === 'rejected') return 'Recusada';
    return 'Pendente';
  }

  function createRequestItem(request) {
    var item = document.createElement('article');
    item.className = 'community-room-request-item doke-card';
    item.dataset.communityRequestId = request.id;

    var avatar = document.createElement('b');
    avatar.className = 'community-room-request-item__avatar doke-avatar';
    avatar.textContent = getMemberInitials(request.userName || 'Pessoa');

    var content = document.createElement('div');
    content.className = 'community-room-request-item__content';

    var heading = document.createElement('div');
    heading.className = 'community-room-request-item__heading';
    var name = document.createElement('strong');
    name.className = 'community-room-request-item__name';
    name.textContent = request.userName || 'Usuário';
    var status = document.createElement('span');
    status.className = 'community-room-request-item__status community-room-request-item__status--' + String(request.status || 'pending');
    status.textContent = getRequestStatusLabel(request.status);
    heading.append(name, status);

    var meta = document.createElement('span');
    meta.className = 'community-room-request-item__meta';
    meta.textContent = request.relation || 'Solicitação de entrada';
    content.append(heading, meta);

    if (request.message) {
      var message = document.createElement('p');
      message.className = 'community-room-request-message';
      message.textContent = request.message;
      content.appendChild(message);
    }

    item.append(avatar, content);

    if (request.status === 'pending') {
      var actions = document.createElement('div');
      actions.className = 'community-room-request-actions';
      var reject = document.createElement('button');
      reject.type = 'button';
      reject.className = 'doke-btn doke-btn--ghost doke-btn--sm';
      reject.dataset.communityRequestResolve = 'rejected';
      reject.textContent = 'Recusar';
      var accept = document.createElement('button');
      accept.type = 'button';
      accept.className = 'doke-btn doke-btn--primary doke-btn--sm';
      accept.dataset.communityRequestResolve = 'accepted';
      accept.textContent = 'Aceitar';
      actions.append(reject, accept);
      item.appendChild(actions);
    }
    return item;
  }

  function renderJoinRequests() {
    if (!requestList) return;
    requestList.innerHTML = '';
    var requests = getCommunityJoinRequests().filter(requestMatchesFilter).sort(function (left, right) {
      return Date.parse(right.requestedAt || 0) - Date.parse(left.requestedAt || 0);
    });
    requests.forEach(function (request) { requestList.appendChild(createRequestItem(request)); });
    if (!requests.length) {
      requestList.appendChild(createPanelEmptyState('Nenhuma solicitação', 'As solicitações de entrada nesta comunidade aparecerão aqui.'));
    }
  }

  async function resolveJoinRequest(requestId, status) {
    if (!canCommunity('addMembers')) return { ok: false, message: 'Sem permissão para revisar solicitações.' };
    if (status !== 'accepted' && status !== 'rejected') return { ok: false, message: 'Estado de solicitação inválido.' };
    var actor = getCurrentUserProfile();
    var operations = getCommunityDomainOperations();
    var communityId = getCurrentCommunityId();
    if (!operations || !operations.transact) return { ok: false, message: 'Serviço de comunidade indisponível.' };

    var operation = operations.transact(communityId, {
      type: status === 'accepted' ? 'JOIN_REQUEST_ACCEPTED' : 'JOIN_REQUEST_REJECTED',
      actorId: actor.id,
      targetId: String(requestId || ''),
      operationId: createCommunityOperationId('join-request-' + status, communityId, actor.id)
    }, function (record) {
      var requests = Array.isArray(record.joinRequests) ? record.joinRequests.slice() : [];
      var index = requests.findIndex(function (request) { return String(request.id) === String(requestId); });
      if (index < 0) return { ok: false, reason: 'request-not-found', message: 'Solicitação não encontrada.' };
      var request = Object.assign({}, requests[index]);
      if (request.status !== 'pending') return { ok: false, reason: 'request-already-resolved', message: 'Esta solicitação já foi analisada.' };

      var now = new Date().toISOString();
      request.status = status;
      request.resolvedAt = now;
      request.resolvedBy = actor.id;
      requests[index] = request;

      var members = Array.isArray(record.members) ? record.members.slice() : [];
      var acceptedMember = null;
      if (status === 'accepted') {
        var accountKey = String(request.accountKey || request.userEmail || request.userId || '').trim();
        var requestKeys = uniqueIdentityKeys([accountKey, request.userId, request.userEmail].concat(request.identityKeys || []));
        if (!requestKeys.length) return { ok: false, reason: 'request-without-identity', message: 'A solicitação não possui uma identidade válida.' };

        var memberIndex = members.findIndex(function (candidate) {
          var candidateAccountKey = String(candidate && candidate.accountKey || '').trim().toLowerCase();
          return (accountKey && candidateAccountKey && candidateAccountKey === accountKey.toLowerCase())
            || identitiesIntersect(requestKeys, getMemberIdentityKeys(candidate));
        });
        var memberPatch = {
          id: request.userId || accountKey || requestKeys[0],
          accountKey: accountKey || requestKeys[0],
          name: request.userName || 'Membro',
          email: request.userEmail || '',
          identityKeys: requestKeys,
          role: 'member',
          source: 'join-request',
          joinedAt: memberIndex >= 0 && members[memberIndex].joinedAt || now,
          addedBy: actor.id,
          membershipVersion: Math.max(1, Number(memberIndex >= 0 && members[memberIndex].membershipVersion || 1))
        };
        if (memberIndex >= 0) {
          if (String(members[memberIndex].role || '') === 'owner') return { ok: false, reason: 'owner-request-conflict', message: 'O proprietário já participa da comunidade.' };
          members[memberIndex] = Object.assign({}, members[memberIndex], memberPatch);
          acceptedMember = members[memberIndex];
        } else {
          members.push(memberPatch);
          acceptedMember = memberPatch;
        }
      }

      return {
        record: Object.assign({}, record, { joinRequests: requests, members: members, updatedAt: now }),
        result: { request: request, member: acceptedMember },
        payload: { requestId: request.id, status: status, memberId: acceptedMember && acceptedMember.id || '' }
      };
    });

    if (!operation.ok) return { ok: false, message: operation.message || 'Não foi possível concluir a solicitação.' };

    var persisted = operation.record || getCurrentCommunityRecord();
    var persistedRequest = (persisted && Array.isArray(persisted.joinRequests) ? persisted.joinRequests : []).find(function (request) {
      return String(request.id) === String(requestId);
    });
    if (!persistedRequest || persistedRequest.status !== status) {
      return { ok: false, message: 'A decisão não foi persistida. Recarregue e tente novamente.' };
    }
    if (status === 'accepted') {
      var acceptedKeys = uniqueIdentityKeys([
        persistedRequest.accountKey,
        persistedRequest.userId,
        persistedRequest.userEmail
      ].concat(persistedRequest.identityKeys || []));
      var persistedMember = (Array.isArray(persisted.members) ? persisted.members : []).find(function (member) {
        return identitiesIntersect(acceptedKeys, getMemberIdentityKeys(member));
      });
      if (!persistedMember) {
        return { ok: false, message: 'A solicitação foi aprovada, mas o membro não foi persistido. Recarregue e tente novamente.' };
      }
    }

    var resolved = operation.result && operation.result.request || persistedRequest;
    var recipientId = String(resolved.userId || resolved.accountKey || resolved.userEmail || '').trim();
    var recipientAccountKey = String(resolved.accountKey || resolved.userEmail || resolved.userId || recipientId).trim();
    var communityTitle = String(persisted && (persisted.title || persisted.name) || 'a comunidade');
    var notification = await createCommunityNotification({
      type: status === 'accepted' ? 'community-request-approved' : 'community-request-rejected',
      userId: recipientId,
      recipientAccountKey: recipientAccountKey,
      actorId: actor.id,
      actorName: actor.name,
      eventKey: [status === 'accepted' ? 'community-request-approved' : 'community-request-rejected', communityId, requestId, recipientAccountKey].filter(Boolean).join(':'),
      title: status === 'accepted' ? 'Solicitação aprovada' : 'Solicitação recusada',
      body: status === 'accepted'
        ? 'Você agora participa de ' + communityTitle + '.'
        : 'Sua solicitação para ' + communityTitle + ' foi recusada.',
      targetUrl: status === 'accepted'
        ? 'comunidade-interna.html?community=' + encodeURIComponent(communityId) + '&title=' + encodeURIComponent(communityTitle)
        : 'comunidade.html',
      actionLabel: status === 'accepted' ? 'Abrir comunidade' : 'Ver comunidades'
    });
    if (!notification) return { ok: false, message: 'A decisão foi salva, mas a notificação do solicitante não foi criada. Recarregue antes de tentar novamente.' };

    return {
      ok: true,
      record: persisted,
      request: persistedRequest,
      member: operation.result && operation.result.member || null,
      message: status === 'accepted' ? 'Solicitação aprovada e membro adicionado.' : 'Solicitação recusada.'
    };
  }

  function getCurrentAccountKey() {
    var profile = getCurrentUserProfile();
    return String(profile.accountKey || profile.email || profile.id || '').trim().toLowerCase();
  }

  function readCommunityChannelStateStore() {
    try {
      var parsed = safeJsonParse(window.localStorage && window.localStorage.getItem(COMMUNITY_CHANNEL_STATE_STORAGE_KEY));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeCommunityChannelStateStore(store) {
    try {
      window.localStorage && window.localStorage.setItem(COMMUNITY_CHANNEL_STATE_STORAGE_KEY, JSON.stringify(store || {}));
      return true;
    } catch (error) {
      return false;
    }
  }

  function getChannelState(channelId, accountKey) {
    var store = readCommunityChannelStateStore();
    var community = store[getCurrentCommunityId()] || {};
    var account = community[String(accountKey || getCurrentAccountKey()).toLowerCase()] || {};
    return Object.assign({ lastReadAt: '', muted: false }, account[channelId || currentChannelId] || {});
  }

  function updateChannelState(channelId, updater, accountKey) {
    var resolvedAccountKey = String(accountKey || getCurrentAccountKey()).trim().toLowerCase();
    if (!resolvedAccountKey) return null;
    var communityId = getCurrentCommunityId();
    var resolvedChannelId = channelId || currentChannelId || 'geral';
    var store = readCommunityChannelStateStore();
    store[communityId] = store[communityId] && typeof store[communityId] === 'object' ? store[communityId] : {};
    store[communityId][resolvedAccountKey] = store[communityId][resolvedAccountKey] && typeof store[communityId][resolvedAccountKey] === 'object' ? store[communityId][resolvedAccountKey] : {};
    var current = Object.assign({ lastReadAt: '', muted: false }, store[communityId][resolvedAccountKey][resolvedChannelId] || {});
    var next = typeof updater === 'function' ? updater(current) : current;
    store[communityId][resolvedAccountKey][resolvedChannelId] = Object.assign({}, current, next || {}, { updatedAt: new Date().toISOString() });
    return writeCommunityChannelStateStore(store) ? store[communityId][resolvedAccountKey][resolvedChannelId] : null;
  }

  function markChannelRead(channelId) {
    var messages = getStoredChannelMessages(channelId || currentChannelId);
    var latest = messages.length ? messages[messages.length - 1].createdAt : new Date().toISOString();
    return updateChannelState(channelId, function (state) {
      state.lastReadAt = latest || new Date().toISOString();
      return state;
    });
  }

  function getChannelUnreadCount(channelId) {
    var state = getChannelState(channelId);
    var lastRead = state.lastReadAt ? new Date(state.lastReadAt).getTime() : 0;
    return getStoredChannelMessages(channelId).filter(function (message) {
      if (!message || isMessageOwnedByCurrentUser(message)) return false;
      var created = message.createdAt ? new Date(message.createdAt).getTime() : 0;
      return created > lastRead;
    }).length;
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


  function normalizeCommunityRules(value) {
    var source = Array.isArray(value) ? value : String(value || '').split(/\r?\n/);
    var seen = new Set();
    return source.map(function (rule) {
      return String(rule || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    }).filter(function (rule) {
      var key = rule.toLowerCase();
      if (!rule || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
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
    if (manageRules) manageRules.value = normalizeCommunityRules(record.rules).join('\n');
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

  function renderRoles(recordOverride) {
    if (!roleList) return;
    roleList.innerHTML = '';
    var roles = getCommunityRolesForRecord(recordOverride || getCurrentCommunityRecord()).filter(function (role) { return role && !role.system; });
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
    debugCommunityRoles('rendered');
  }

  function updateCurrentCommunityRoles(updater) {
    var record = ensureCurrentCommunityRecord() || {};
    var customRoles = Array.isArray(record.roles) ? record.roles.filter(function (role) { return role && !role.system; }) : [];
    var nextRoles = typeof updater === 'function' ? updater(customRoles) : customRoles;
    record.roles = (Array.isArray(nextRoles) ? nextRoles : []).map(normalizeCommunityRole).filter(Boolean).filter(function (role) { return !role.system; });
    return saveCurrentCommunityRecord(record);
  }


  function getCommunityChannelsForRecord(record) {
    var projector = window.Doke && window.Doke.communityDomain && window.Doke.communityDomain.channels && window.Doke.communityDomain.channels.projectCommunityChannels;
    if (typeof projector === 'function') return projector({ community: record || {} });
    var source = record && Array.isArray(record.channels) ? record.channels : [];
    return source.length ? source : [{ id: 'geral', name: 'Geral', description: 'Conversa principal da comunidade', type: 'text', readOnly: false, allowedRoleIds: [], sendRoleIds: [] }];
  }

  function getCurrentMemberRoleIds() {
    var member = getCurrentCommunityMember() || {};
    return normalizeMemberRoleIds(member);
  }

  function canViewChannel(channel) {
    if (!channel) return false;
    var member = getCurrentCommunityMember() || {};
    if (String(member.role || '') === 'owner') return true;
    var allowed = Array.isArray(channel.allowedRoleIds) ? channel.allowedRoleIds : [];
    if (!allowed.length) return true;
    var roleIds = getCurrentMemberRoleIds();
    return allowed.some(function (roleId) { return roleIds.indexOf(roleId) !== -1; });
  }

  function canSendToChannel(channel) {
    if (!channel || !canViewChannel(channel)) return false;
    var member = getCurrentCommunityMember() || {};
    if (String(member.role || '') === 'owner') return true;
    if (!channel.readOnly) return true;
    var sendRoleIds = Array.isArray(channel.sendRoleIds) ? channel.sendRoleIds : [];
    if (!sendRoleIds.length) return canCommunity('manageChannels');
    var roleIds = getCurrentMemberRoleIds();
    return sendRoleIds.some(function (roleId) { return roleIds.indexOf(roleId) !== -1; });
  }

  function readCommunityAntispamStore() {
    try {
      var parsed = safeJsonParse(window.localStorage && window.localStorage.getItem(COMMUNITY_ANTISPAM_STORAGE_KEY));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) { return {}; }
  }

  function writeCommunityAntispamStore(store) {
    try {
      window.localStorage && window.localStorage.setItem(COMMUNITY_ANTISPAM_STORAGE_KEY, JSON.stringify(store || {}));
      return true;
    } catch (error) { return false; }
  }

  function getAntispamScopeKey(channelId) {
    return [getCurrentCommunityId(), channelId || 'geral', getCurrentAccountKey()].join(':');
  }

  function normalizeSpamText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function containsWebLink(value) {
    return /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|com\.br|net|org|io|app|dev|gg)\b)/i.test(String(value || ''));
  }

  function registerAntispamViolation(reason, channel, detail) {
    appendCommunityAuditEvent('message-security-violation', {
      channelId: channel && channel.id || currentChannelId || 'geral',
      reason: reason,
      detail: detail || ''
    });
  }

  function validateCommunityMessageSecurity(text, channel) {
    channel = channel || getCurrentChannelRecord() || {};
    var now = Date.now();
    var scopeKey = getAntispamScopeKey(channel.id);
    var store = readCommunityAntispamStore();
    var state = store[scopeKey] && typeof store[scopeKey] === 'object' ? store[scopeKey] : { sentAt: [], recentTexts: [] };
    var blockedUntil = Number(state.blockedUntil || 0);
    if (blockedUntil > now) {
      var remaining = Math.max(1, Math.ceil((blockedUntil - now) / 1000));
      return { allowed: false, message: 'Envio bloqueado por ' + remaining + 's devido a excesso de mensagens.', reason: 'temporary-block' };
    }
    if (channel.blockLinks && containsWebLink(text) && !canCommunity('manageChannels')) {
      return { allowed: false, message: 'Links não são permitidos neste canal.', reason: 'blocked-link' };
    }
    var slowModeSeconds = Number(channel.slowModeSeconds || 0);
    if (slowModeSeconds > 0 && !canCommunity('bypassSlowMode')) {
      var lastSentAt = Number(state.lastSentAt || 0);
      var waitMs = slowModeSeconds * 1000 - (now - lastSentAt);
      if (waitMs > 0) return { allowed: false, message: 'Aguarde ' + Math.ceil(waitMs / 1000) + 's para enviar outra mensagem.', reason: 'slow-mode' };
    }
    var sentAt = (Array.isArray(state.sentAt) ? state.sentAt : []).filter(function (timestamp) { return now - Number(timestamp) < 10000; });
    if (sentAt.length >= 5 && !canCommunity('bypassSlowMode')) {
      state.blockedUntil = now + 30000;
      state.sentAt = sentAt;
      store[scopeKey] = state;
      writeCommunityAntispamStore(store);
      return { allowed: false, message: 'Muitas mensagens em sequência. Envio bloqueado por 30s.', reason: 'flood' };
    }
    var normalized = normalizeSpamText(text);
    var recentTexts = (Array.isArray(state.recentTexts) ? state.recentTexts : []).filter(function (entry) { return entry && now - Number(entry.at) < 30000; });
    if (normalized && recentTexts.filter(function (entry) { return entry.text === normalized; }).length >= 2 && !canCommunity('bypassSlowMode')) {
      return { allowed: false, message: 'Evite enviar a mesma mensagem repetidamente.', reason: 'duplicate-message' };
    }
    return { allowed: true, state: state, store: store, scopeKey: scopeKey, normalizedText: normalized, now: now };
  }

  function commitCommunityMessageSecurity(validation) {
    if (!validation || !validation.allowed) return;
    var state = validation.state || {};
    state.lastSentAt = validation.now;
    state.sentAt = (Array.isArray(state.sentAt) ? state.sentAt : []).concat(validation.now).slice(-10);
    state.recentTexts = (Array.isArray(state.recentTexts) ? state.recentTexts : []).concat(validation.normalizedText ? [{ text: validation.normalizedText, at: validation.now }] : []).slice(-10);
    delete state.blockedUntil;
    validation.store[validation.scopeKey] = state;
    writeCommunityAntispamStore(validation.store);
  }

  function getCurrentChannelRecord() {
    return getCommunityChannelsForRecord(getCurrentCommunityRecord()).find(function (channel) { return channel.id === currentChannelId; }) || null;
  }

  function syncChannelComposerAccess() {
    var channel = getCurrentChannelRecord();
    var allowed = canSendToChannel(channel);
    if (composerInput) {
      composerInput.disabled = !allowed;
      composerInput.placeholder = allowed ? 'Digite sua mensagem...' : 'Este canal é somente leitura';
    }
    [attachButton, audioButton].forEach(function (button) { if (button) button.disabled = !allowed; });
    if (sendButton) sendButton.disabled = !allowed || (composerInput && !composerInput.value.trim() && !selectedAttachment && !hasActiveAudioDraft());
    if (composer) composer.dataset.channelReadOnly = String(!allowed);
  }

  function getMemberAccountKey(member) {
    return String(member && (member.accountKey || member.email || member.id || member.userId) || '').trim().toLowerCase();
  }

  function memberCanViewChannel(member, channel) {
    if (!member || !channel) return false;
    if (String(member.role || '') === 'owner') return true;
    var allowed = Array.isArray(channel.allowedRoleIds) ? channel.allowedRoleIds : [];
    if (!allowed.length) return true;
    var roles = normalizeMemberRoleIds(member);
    return allowed.some(function (roleId) { return roles.indexOf(roleId) !== -1; });
  }

  function isChannelMutedForAccount(channelId, accountKey) {
    return Boolean(getChannelState(channelId, accountKey).muted);
  }

  async function notifyAnnouncementChannel(messageRecord, channel) {
    if (!messageRecord || !channel || channel.type !== 'announcements') return;
    var currentKey = getCurrentAccountKey();
    var communityTitle = String(messageRecord.communityTitle || root.dataset.communityTitle || 'Comunidade Doke');
    var members = getCommunityMembers();
    await Promise.all(members.filter(function (member) {
      var accountKey = getMemberAccountKey(member);
      return accountKey && accountKey !== currentKey && memberCanViewChannel(member, channel) && !isChannelMutedForAccount(channel.id, accountKey);
    }).map(function (member) {
      var accountKey = getMemberAccountKey(member);
      return createCommunityNotification({
        type: 'community-channel-announcement',
        userId: String(member.id || member.userId || accountKey),
        recipientAccountKey: accountKey,
        actorId: messageRecord.authorId,
        actorName: messageRecord.author,
        eventKey: ['community-channel-announcement', messageRecord.communityId, channel.id, messageRecord.id, accountKey].join(':'),
        title: '# ' + channel.name + ' • ' + communityTitle,
        body: messageRecord.text || (messageRecord.attachmentDisplayName ? 'Novo anexo publicado.' : 'Nova publicação no canal.'),
        targetUrl: 'comunidade-interna.html?community=' + encodeURIComponent(messageRecord.communityId) + '&channel=' + encodeURIComponent(channel.id),
        actionLabel: 'Abrir canal'
      });
    }));
  }

  function createChannelButton(channel) {
    var button = document.createElement('div');
    button.className = 'community-room-channel doke-btn';
    button.tabIndex = 0;
    button.dataset.channelId = channel.id;
    button.dataset.channelName = channel.name;
    button.dataset.channelSearch = [channel.name, channel.description, channel.type, channel.category].join(' ');
    button.dataset.channelCategory = channel.category || 'Canais';
    button.setAttribute('role', 'option');
    var icon = document.createElement('span');
    icon.className = 'community-room-channel__icon';
    icon.textContent = channel.type === 'announcements' ? '!' : '#';
    var copy = document.createElement('span');
    copy.className = 'community-room-channel__copy';
    var name = document.createElement('strong');
    name.textContent = channel.name;
    var preview = document.createElement('span');
    preview.className = 'community-room-channel__preview';
    preview.textContent = channel.description || (channel.readOnly ? 'Somente leitura' : 'Canal da comunidade');
    copy.append(name, preview);
    var meta = document.createElement('span');
    meta.className = 'community-room-channel__meta';
    var unread = document.createElement('span');
    unread.className = 'community-room-channel__badge';
    unread.dataset.communityChannelUnread = channel.id;
    var unreadCount = getChannelUnreadCount(channel.id);
    unread.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    unread.hidden = unreadCount === 0;
    var mute = document.createElement('button');
    mute.className = 'community-room-channel__mute doke-icon-btn doke-icon-btn--flat';
    mute.type = 'button';
    mute.dataset.communityChannelMute = channel.id;
    var muted = isChannelMutedForAccount(channel.id, getCurrentAccountKey());
    mute.setAttribute('aria-pressed', String(muted));
    mute.setAttribute('aria-label', muted ? 'Ativar notificações do canal' : 'Silenciar canal');
    mute.textContent = muted ? '×' : '•';
    meta.append(unread, mute);
    button.append(icon, copy, meta);
    button.addEventListener('click', function (event) {
      if (event.target.closest('[data-community-channel-mute]')) return;
      activateChannel(button);
    });
    button.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target.closest('[data-community-channel-mute]')) return;
      event.preventDefault();
      activateChannel(button);
    });
    mute.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var nextMuted = !isChannelMutedForAccount(channel.id, getCurrentAccountKey());
      updateChannelState(channel.id, function (state) { state.muted = nextMuted; return state; });
      renderChannels(getCurrentCommunityRecord());
    });
    return button;
  }

  function renderChannels(record) {
    if (!channelList) return;
    var all = getCommunityChannelsForRecord(record || getCurrentCommunityRecord());
    var visible = all.filter(canViewChannel);
    channelList.replaceChildren();
    var currentCategory = '';
    visible.forEach(function (channel) {
      var category = channel.category || 'Canais';
      if (category !== currentCategory) {
        currentCategory = category;
        var heading = document.createElement('div');
        heading.className = 'community-room-channel-category';
        heading.textContent = category;
        channelList.appendChild(heading);
      }
      channelList.appendChild(createChannelButton(channel));
    });
    channels = Array.prototype.slice.call(channelList.querySelectorAll('[data-channel-id]'));
    var active = channels.find(function (item) { return item.dataset.channelId === currentChannelId; }) || channels[0];
    if (active) {
      currentChannelId = active.dataset.channelId || 'geral';
      currentChannelName = active.dataset.channelName || 'Geral';
      channels.forEach(function (item) { item.classList.toggle('is-active', item === active); });
      if (channelTitle) channelTitle.textContent = currentChannelName;
    }
    syncChannelComposerAccess();
    filterChannels();
  }

  function renderChannelRoleOptions(container, selectedIds) {
    if (!container) return;
    container.replaceChildren();
    var selected = new Set(Array.isArray(selectedIds) ? selectedIds : []);
    getCommunityRolesForRecord(getCurrentCommunityRecord()).filter(function (role) { return role.id !== 'owner'; }).forEach(function (role) {
      var label = document.createElement('label');
      label.className = 'community-room-channel-role-option';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'doke-checkbox';
      input.value = role.id;
      input.checked = selected.has(role.id);
      var text = document.createElement('span');
      text.textContent = role.name;
      label.append(input, text);
      container.appendChild(label);
    });
  }

  function renderChannelAdmin(record) {
    if (!channelAdminList) return;
    channelAdminList.replaceChildren();
    getCommunityChannelsForRecord(record || getCurrentCommunityRecord()).forEach(function (channel) {
      var item = document.createElement('article');
      item.className = 'community-room-channel-admin-item';
      var copy = document.createElement('div');
      var title = document.createElement('strong');
      title.textContent = '# ' + channel.name;
      var meta = document.createElement('span');
      meta.textContent = [channel.category || 'Canais', channel.type === 'announcements' ? 'Avisos' : 'Conversa', channel.readOnly ? 'Somente leitura' : 'Todos podem enviar', Number(channel.slowModeSeconds || 0) ? 'Modo lento: ' + channel.slowModeSeconds + 's' : '', channel.blockLinks ? 'Links bloqueados' : ''].filter(Boolean).join(' • ');
      copy.append(title, meta);
      item.appendChild(copy);
      var actions = document.createElement('div');
      actions.className = 'community-room-channel-admin-item__actions';
      var edit = document.createElement('button');
      edit.className = 'doke-btn doke-btn--ghost doke-btn--sm';
      edit.type = 'button';
      edit.dataset.communityChannelEdit = channel.id;
      edit.textContent = 'Editar';
      actions.appendChild(edit);
      var up = document.createElement('button');
      up.className = 'doke-btn doke-btn--ghost doke-btn--sm'; up.type = 'button'; up.dataset.communityChannelMove = channel.id; up.dataset.direction = '-1'; up.textContent = '↑'; actions.appendChild(up);
      var down = document.createElement('button');
      down.className = 'doke-btn doke-btn--ghost doke-btn--sm'; down.type = 'button'; down.dataset.communityChannelMove = channel.id; down.dataset.direction = '1'; down.textContent = '↓'; actions.appendChild(down);
      if (channel.id !== 'geral') {
        var remove = document.createElement('button');
        remove.className = 'doke-btn doke-btn--ghost doke-btn--sm';
        remove.type = 'button';
        remove.dataset.communityChannelRemove = channel.id;
        remove.textContent = 'Remover';
        actions.appendChild(remove);
      }
      item.appendChild(actions);
      channelAdminList.appendChild(item);
    });
    renderChannelRoleOptions(channelViewRoles, []);
    renderChannelRoleOptions(channelSendRoles, []);
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
      var unreadBadge = channel.querySelector('[data-community-channel-unread]');
      var unreadCount = getChannelUnreadCount(channelId);
      if (unreadBadge) {
        unreadBadge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        unreadBadge.hidden = unreadCount === 0;
      }
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

  function createCommunityOperationId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return String(prefix || 'community') + '_' + window.crypto.randomUUID();
    }
    return String(prefix || 'community') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }

  function normalizeMentionLabel(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function getMentionCandidates(query) {
    var normalizedQuery = String(query || '').trim().toLocaleLowerCase('pt-BR');
    var currentProfile = getCurrentUserProfile();
    var candidates = [];
    getCommunityMembers().forEach(function (member) {
      var accountKey = getMemberAccountKey(member);
      if (!accountKey || accountKey === getMemberAccountKey(currentProfile)) return;
      var label = normalizeMentionLabel(member.name || member.displayName || member.email || 'Membro');
      if (!label) return;
      candidates.push({
        type: 'member',
        id: String(member.id || member.userId || accountKey),
        accountKey: accountKey,
        label: label,
        subtitle: getMemberRoleLabels(member).join(' · ') || 'Membro'
      });
    });
    if (canCommunity('mentionRoles')) {
      getCommunityRoles().filter(function (role) { return role && role.id !== 'owner' && role.id !== 'member'; }).forEach(function (role) {
        candidates.push({
          type: 'role',
          id: String(role.id),
          accountKey: '',
          label: normalizeMentionLabel(role.name),
          subtitle: 'Cargo'
        });
      });
    }
    return candidates.filter(function (candidate) {
      return !normalizedQuery || candidate.label.toLocaleLowerCase('pt-BR').indexOf(normalizedQuery) !== -1;
    }).slice(0, 8);
  }

  function getActiveMentionQuery() {
    if (!composerInput) return null;
    var cursor = Number(composerInput.selectionStart || 0);
    var before = composerInput.value.slice(0, cursor);
    var match = before.match(/(?:^|\s)@([^@\n]{0,40})$/);
    if (!match) return null;
    return {
      query: match[1] || '',
      start: cursor - match[1].length - 1,
      end: cursor
    };
  }

  function closeMentionPicker() {
    if (!mentionPicker) return;
    mentionPicker.hidden = true;
    mentionPicker.innerHTML = '';
  }

  function insertMentionCandidate(candidate) {
    if (!composerInput || !candidate) return;
    var active = getActiveMentionQuery();
    if (!active) return;
    var token = '@' + candidate.label;
    composerInput.value = composerInput.value.slice(0, active.start) + token + ' ' + composerInput.value.slice(active.end);
    var nextCursor = active.start + token.length + 1;
    composerInput.setSelectionRange(nextCursor, nextCursor);
    var mentionKey = candidate.type + ':' + candidate.id;
    selectedMentions = selectedMentions.filter(function (item) { return item.key !== mentionKey; });
    selectedMentions.push({
      key: mentionKey,
      type: candidate.type,
      id: candidate.id,
      accountKey: candidate.accountKey || '',
      label: candidate.label
    });
    closeMentionPicker();
    updateSendState();
    composerInput.focus();
  }

  function renderMentionPicker() {
    if (!mentionPicker) return;
    var active = getActiveMentionQuery();
    if (!active) { closeMentionPicker(); return; }
    var candidates = getMentionCandidates(active.query);
    mentionPicker.innerHTML = '';
    if (!candidates.length) { closeMentionPicker(); return; }
    candidates.forEach(function (candidate, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'community-mention-picker__option';
      button.setAttribute('role', 'option');
      button.dataset.communityMentionIndex = String(index);
      var avatar = document.createElement('span');
      avatar.className = 'community-mention-picker__avatar';
      avatar.textContent = candidate.type === 'role' ? '@' : getInitials(candidate.label);
      var copy = document.createElement('span');
      copy.className = 'community-mention-picker__copy';
      var title = document.createElement('strong');
      title.textContent = candidate.label;
      var subtitle = document.createElement('small');
      subtitle.textContent = candidate.subtitle;
      copy.append(title, subtitle);
      button.append(avatar, copy);
      button.addEventListener('click', function () { insertMentionCandidate(candidate); });
      mentionPicker.appendChild(button);
    });
    mentionPicker.hidden = false;
  }

  function getMessageMentions(textValue) {
    var text = String(textValue || '');
    return selectedMentions.filter(function (mention) {
      return text.toLocaleLowerCase('pt-BR').indexOf(('@' + mention.label).toLocaleLowerCase('pt-BR')) !== -1;
    }).map(function (mention) {
      return {
        type: mention.type,
        id: mention.id,
        accountKey: mention.accountKey || '',
        label: mention.label
      };
    });
  }

  function getMentionRecipients(messageRecord, channel) {
    var recipients = new Map();
    var members = getCommunityMembers();
    (Array.isArray(messageRecord && messageRecord.mentions) ? messageRecord.mentions : []).forEach(function (mention) {
      if (mention.type === 'member') {
        members.forEach(function (member) {
          var accountKey = getMemberAccountKey(member);
          if (!accountKey || !memberCanViewChannel(member, channel)) return;
          if (accountKey === String(mention.accountKey || '').toLowerCase() || String(member.id || member.userId || '') === String(mention.id || '')) {
            recipients.set(accountKey, member);
          }
        });
        return;
      }
      if (mention.type === 'role') {
        members.forEach(function (member) {
          var accountKey = getMemberAccountKey(member);
          if (!accountKey || !memberCanViewChannel(member, channel)) return;
          if (normalizeMemberRoleIds(member).indexOf(String(mention.id || '')) !== -1) recipients.set(accountKey, member);
        });
      }
    });
    recipients.delete(getCurrentAccountKey());
    return Array.from(recipients.values());
  }

  async function notifyMessageMentions(messageRecord, channel) {
    if (!messageRecord || !channel || !Array.isArray(messageRecord.mentions) || !messageRecord.mentions.length) return;
    var recipients = getMentionRecipients(messageRecord, channel);
    var communityTitle = String(messageRecord.communityTitle || root.dataset.communityTitle || 'Comunidade Doke');
    await Promise.all(recipients.map(function (member) {
      var accountKey = getMemberAccountKey(member);
      return createCommunityNotification({
        type: 'community-message-mention',
        userId: String(member.id || member.userId || accountKey),
        recipientAccountKey: accountKey,
        actorId: messageRecord.authorId,
        actorName: messageRecord.author,
        eventKey: ['community-message-mention', messageRecord.communityId, channel.id, messageRecord.id, accountKey].join(':'),
        title: messageRecord.author + ' mencionou você em #' + channel.name,
        body: messageRecord.text || 'Você foi mencionado em uma mensagem.',
        targetUrl: 'comunidade-interna.html?community=' + encodeURIComponent(messageRecord.communityId) + '&channel=' + encodeURIComponent(channel.id) + '&message=' + encodeURIComponent(messageRecord.id),
        actionLabel: 'Ver mensagem'
      });
    }));
  }

  function appendMentionAwareText(container, textValue, mentions) {
    var text = String(textValue || '');
    var list = Array.isArray(mentions) ? mentions.slice().sort(function (a, b) { return String(b.label || '').length - String(a.label || '').length; }) : [];
    if (!list.length) { container.textContent = text; return; }
    var labels = list.map(function (mention) { return '@' + mention.label; }).filter(Boolean);
    if (!labels.length) { container.textContent = text; return; }
    var escaped = labels.map(function (label) { return label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    var regex = new RegExp('(' + escaped.join('|') + ')', 'gi');
    text.split(regex).forEach(function (part) {
      var matched = list.find(function (mention) { return ('@' + mention.label).toLocaleLowerCase('pt-BR') === part.toLocaleLowerCase('pt-BR'); });
      if (!matched) { container.appendChild(document.createTextNode(part)); return; }
      var mark = document.createElement('span');
      mark.className = 'community-message-mention';
      mark.dataset.mentionType = matched.type;
      mark.textContent = part;
      container.appendChild(mark);
    });
  }

  function focusRequestedMessage() {
    var params = new URLSearchParams(window.location.search || '');
    var messageId = String(params.get('message') || '').trim();
    if (!messageId || !messageList) return;
    var message = messageList.querySelector('[data-community-message-id="' + CSS.escape(messageId) + '"]');
    if (!message) return;
    message.classList.add('is-community-message-target');
    message.scrollIntoView({ block: 'center', behavior: 'smooth' });
    window.setTimeout(function () { message.classList.remove('is-community-message-target'); }, 2400);
  }

  function createCommunityMessageRecord(payload) {
    var now = new Date();
    var type = payload && payload.type ? payload.type : 'text';
    var operationId = String(payload && payload.operationId || createCommunityOperationId('message'));
    var profile = getCurrentUserProfile();
    return {
      id: 'community_msg_' + now.getTime() + '_' + Math.random().toString(36).slice(2, 8),
      operationId: operationId,
      schemaVersion: 2,
      communityId: getCurrentCommunityId(),
      communityTitle: root.dataset.communityTitle || (currentCommunityContext && currentCommunityContext.title) || 'Comunidade Doke',
      channelId: currentChannelId || 'geral',
      channelName: currentChannelName || 'Comunidade',
      type: type,
      text: String(payload && payload.text || '').trim(),
      mentions: Array.isArray(payload && payload.mentions) ? payload.mentions.map(function (mention) { return Object.assign({}, mention); }) : [],
      attachmentName: String(payload && payload.attachmentName || '').trim(),
      attachmentDisplayName: String(payload && payload.attachmentDisplayName || '').trim(),
      attachmentType: String(payload && payload.attachmentType || '').trim(),
      attachmentSize: Number(payload && payload.attachmentSize || 0),
      attachmentKind: String(payload && payload.attachmentKind || '').trim(),
      attachmentDataUrl: String(payload && payload.attachmentDataUrl || '').trim(),
      audioDuration: String(payload && payload.audioDuration || '').trim(),
      author: profile.name || 'Você',
      authorId: profile.id,
      authorAccountKey: profile.accountKey || profile.id,
      authorEmail: profile.email || '',
      authorAvatarUrl: profile.avatarUrl || '',
      authorInitials: profile.initials || '',
      authorIdentityKeys: uniqueIdentityKeys(profile.identityKeys || [profile.accountKey, profile.email, profile.id]),
      usefulByAccountKeys: [],
      usefulCount: 0,
      createdAt: now.toISOString()
    };
  }

  function readCommunityAuditStore() {
    try {
      var parsed = safeJsonParse(window.localStorage && window.localStorage.getItem(COMMUNITY_AUDIT_STORAGE_KEY));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) { return {}; }
  }

  function writeCommunityAuditStore(store) {
    try {
      window.localStorage && window.localStorage.setItem(COMMUNITY_AUDIT_STORAGE_KEY, JSON.stringify(store || {}));
      return true;
    } catch (error) { return false; }
  }

  function appendCommunityAuditEvent(type, payload) {
    var communityId = getCurrentCommunityId();
    if (!communityId || !type) return null;
    var profile = getCurrentUserProfile();
    var store = readCommunityAuditStore();
    var events = Array.isArray(store[communityId]) ? store[communityId] : [];
    var event = Object.assign({
      id: 'audit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      type: type, communityId: communityId, channelId: currentChannelId || 'geral',
      actorAccountKey: profile.accountKey || profile.email || profile.id || '',
      actorName: profile.name || 'Membro', createdAt: new Date().toISOString()
    }, payload || {});
    events.push(event);
    store[communityId] = events.slice(-250);
    writeCommunityAuditStore(store);
    return event;
  }

  function getCommunityAuditEvents() {
    var store = readCommunityAuditStore();
    return (Array.isArray(store[getCurrentCommunityId()]) ? store[getCurrentCommunityId()] : []).slice().reverse();
  }

  function formatAuditEvent(event) {
    var labels = { messageEdited: 'editou uma mensagem', messageDeleted: 'removeu uma mensagem', messageRestored: 'restaurou uma mensagem', messagePinned: 'fixou uma mensagem', messageUnpinned: 'desafixou uma mensagem', memberMuted: 'silenciou um membro', memberRestricted: 'restringiu um membro', memberDisciplineCleared: 'removeu uma restrição', memberBanned: 'baniu um membro', memberKicked: 'expulsou um membro' };
    return labels[event.type] || 'realizou uma ação administrativa';
  }

  function renderCommunityAuditLog() {
    if (!auditList) return;
    auditList.innerHTML = '';
    var events = getCommunityAuditEvents();
    if (!events.length) {
      var empty = document.createElement('p');
      empty.className = 'community-room-panel-empty';
      empty.textContent = 'Nenhuma ação de moderação registrada.';
      auditList.appendChild(empty);
      return;
    }
    events.forEach(function (event) {
      var item = document.createElement('article');
      item.className = 'community-audit-item';
      var copy = document.createElement('div');
      var title = document.createElement('strong');
      title.textContent = (event.actorName || 'Membro') + ' ' + formatAuditEvent(event);
      var meta = document.createElement('span');
      meta.textContent = new Date(event.createdAt).toLocaleString('pt-BR') + (event.reason ? ' • Motivo: ' + event.reason : '');
      copy.append(title, meta);
      item.appendChild(copy);
      if (event.type === 'messageDeleted' && event.messageId) {
        var restore = document.createElement('button');
        restore.type = 'button'; restore.className = 'doke-btn doke-btn--ghost';
        restore.dataset.communityAuditRestore = event.messageId;
        restore.dataset.communityAuditChannel = event.channelId || 'geral';
        restore.textContent = 'Restaurar';
        item.appendChild(restore);
      }
      auditList.appendChild(item);
    });
  }

  function persistCommunityMessage(record) {
    if (!record || !record.id) return null;
    var communityId = record.communityId || getCurrentCommunityId();
    var channelId = record.channelId || currentChannelId || 'geral';
    var store = readCommunityMessageStore();
    if (!store[communityId] || typeof store[communityId] !== 'object' || Array.isArray(store[communityId])) {
      store[communityId] = {};
    }
    var messages = Array.isArray(store[communityId][channelId]) ? store[communityId][channelId] : [];
    var existing = messages.find(function (item) {
      if (!item) return false;
      if (item.id === record.id) return true;
      return Boolean(record.operationId && item.operationId && item.operationId === record.operationId);
    });
    if (existing) return existing;
    messages.push(record);
    store[communityId][channelId] = messages.slice(-80);
    writeCommunityMessageStore(store);
    return record;
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
    if (!record || record.deletedAt) return false;
    var profile = getCurrentUserProfile();
    var isOwnMessage = isMessageOwnedByCurrentUser(record);
    var isModeratorAction = !isOwnMessage;
    if (isModeratorAction && !canCommunity('deleteMessages')) return false;
    var reason = '';
    if (isModeratorAction) {
      reason = String(window.prompt('Informe o motivo da remoção desta mensagem:') || '').trim();
      if (!reason) return false;
    }
    var updated = updateCommunityMessageRecord(messageId, function (message) {
      message.deletedAt = new Date().toISOString();
      message.deletedByAccountKey = profile.accountKey || profile.email || profile.id || '';
      message.deletedByName = profile.name || 'Membro';
      message.deletionReason = reason;
      message.pinned = false;
      return message;
    });
    if (!updated) return false;
    appendCommunityAuditEvent('messageDeleted', { messageId: messageId, targetAuthorName: record.author || 'Membro', reason: reason, moderatorAction: isModeratorAction });
    renderPersistedMessagesForChannel(currentChannelId || 'geral');
    renderPinnedPanel(); renderCommunityAuditLog();
    return true;
  }

  function editCommunityMessage(messageId) {
    var record = getCommunityMessageRecord(messageId);
    if (!record || record.deletedAt || !isMessageOwnedByCurrentUser(record)) return false;
    var nextText = String(window.prompt('Editar mensagem:', record.text || '') || '').trim();
    if (!nextText || nextText === String(record.text || '').trim()) return false;
    var profile = getCurrentUserProfile();
    var updated = updateCommunityMessageRecord(messageId, function (message) {
      var history = Array.isArray(message.editHistory) ? message.editHistory.slice() : [];
      history.push({ text: message.text || '', editedAt: new Date().toISOString(), editedByAccountKey: profile.accountKey || profile.email || profile.id || '' });
      message.editHistory = history.slice(-20);
      message.text = nextText; message.editedAt = new Date().toISOString();
      message.editedByAccountKey = profile.accountKey || profile.email || profile.id || '';
      return message;
    });
    if (!updated) return false;
    appendCommunityAuditEvent('messageEdited', { messageId: messageId });
    renderPersistedMessagesForChannel(currentChannelId || 'geral'); renderCommunityAuditLog();
    return true;
  }

  function restoreCommunityMessage(messageId, channelId) {
    if (!canCommunity('deleteMessages')) return false;
    var previousChannelId = currentChannelId;
    currentChannelId = channelId || currentChannelId || 'geral';
    var updated = updateCommunityMessageRecord(messageId, function (message) {
      delete message.deletedAt; delete message.deletedByAccountKey; delete message.deletedByName; delete message.deletionReason;
      message.restoredAt = new Date().toISOString();
      return message;
    });
    currentChannelId = previousChannelId;
    if (!updated) return false;
    appendCommunityAuditEvent('messageRestored', { messageId: messageId, channelId: channelId || 'geral' });
    if ((channelId || 'geral') === (currentChannelId || 'geral')) renderPersistedMessagesForChannel(currentChannelId || 'geral');
    renderCommunityAuditLog();
    return true;
  }

  function applyCommunityMessageAction(messageId, actionName) {
    if (actionName === 'delete') return deleteCommunityMessage(messageId);
    if (actionName === 'edit') return editCommunityMessage(messageId);
    if (actionName === 'pin' && !canCommunity('pinMessages')) return null;
    if (!messageId || !actionName) return null;
    var updated = updateCommunityMessageRecord(messageId, function (message) {
      if (actionName === 'pin') {
        message.pinned = !message.pinned;
        message.pinnedAt = message.pinned ? new Date().toISOString() : '';
        var actor = getCurrentUserProfile();
        message.pinnedByAccountKey = message.pinned ? (actor.accountKey || actor.email || actor.id || '') : '';
        message.pinnedByName = message.pinned ? (actor.name || 'Membro') : '';
      }
      if (actionName === 'useful') {
        var profile = getCurrentUserProfile();
        var accountKey = String(profile.accountKey || profile.email || profile.id || '').trim().toLowerCase();
        var usefulBy = Array.isArray(message.usefulByAccountKeys) ? message.usefulByAccountKeys.map(function (key) { return String(key || '').trim().toLowerCase(); }).filter(Boolean) : [];
        if (!accountKey) return message;
        var hasUseful = usefulBy.indexOf(accountKey) !== -1;
        message.usefulByAccountKeys = hasUseful ? usefulBy.filter(function (key) { return key !== accountKey; }) : usefulBy.concat(accountKey);
        message.usefulCount = message.usefulByAccountKeys.length;
        delete message.usefulByMe;
      }
      return message;
    });
    if (updated) {
      if (actionName === 'pin') appendCommunityAuditEvent(updated.pinned ? 'messagePinned' : 'messageUnpinned', { messageId: messageId });
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
    records.forEach(function (record, index) {
      var element = createMessageFromRecord(record, records, index);
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
    focusRequestedMessage();
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
    markChannelRead(currentChannelId);
    updateRoomStats();
    syncChannelComposerAccess();
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
    var isOwnMessage = isMessageOwnedByCurrentUser(record);
    if (isOwnMessage && !record.deletedAt) {
      var edit = document.createElement('button');
      edit.className = 'doke-btn doke-btn--ghost'; edit.type = 'button';
      edit.dataset.communityContextAction = 'edit'; edit.dataset.communityMessageId = messageId;
      edit.setAttribute('role', 'menuitem'); edit.textContent = 'Editar mensagem';
      menu.appendChild(edit);
    }
    if ((isOwnMessage || canCommunity('deleteMessages')) && !record.deletedAt) {
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
    var groupStart = options.groupStart !== false;
    article.className = 'community-room-message message-row has-author-avatar' + (mine ? ' community-room-message--self message-row--me' : ' message-row--them') + (groupStart ? ' is-message-group-start' : ' is-message-group-continuation');

    var avatar = window.DokeMessageAuthor && window.DokeMessageAuthor.createAvatar
      ? window.DokeMessageAuthor.createAvatar({ name: options.author, avatarUrl: options.avatarUrl, initials: options.authorInitials }, { className: 'message-author-avatar doke-avatar' })
      : document.createElement('span');
    var bubble = document.createElement('div');
    bubble.className = 'community-room-message__bubble message-bubble' + (mine ? ' message-bubble--me' : ' message-bubble--them');

    bubble.appendChild(createMessageHeader(options.author || 'Você', options.createdAt));

    if (text) {
      var paragraph = document.createElement('p');
      appendMentionAwareText(paragraph, text, options.mentions);
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

    article.append(avatar, bubble);
    return article;
  }

  function createAudioMessage(duration, options) {
    options = options || {};
    var article = document.createElement('article');
    var mine = options.mine !== false;
    var groupStart = options.groupStart !== false;
    article.className = 'community-room-message message-row has-author-avatar' + (mine ? ' community-room-message--self message-row--me' : ' message-row--them') + (groupStart ? ' is-message-group-start' : ' is-message-group-continuation');

    var avatar = window.DokeMessageAuthor && window.DokeMessageAuthor.createAvatar
      ? window.DokeMessageAuthor.createAvatar({ name: options.author, avatarUrl: options.avatarUrl, initials: options.authorInitials }, { className: 'message-author-avatar doke-avatar' })
      : document.createElement('span');
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
    article.append(avatar, bubble);
    return article;
  }

  function isMessageOwnedByCurrentUser(record) {
    if (!record) return false;
    var profile = getCurrentUserProfile();
    var currentKeys = uniqueIdentityKeys([profile.accountKey, profile.id, profile.email].concat(profile.identityKeys || []));
    var authorKeys = uniqueIdentityKeys([
      record.authorAccountKey,
      record.authorId,
      record.authorEmail
    ].concat(Array.isArray(record.authorIdentityKeys) ? record.authorIdentityKeys : []));
    return currentKeys.length > 0 && authorKeys.length > 0 && identitiesIntersect(currentKeys, authorKeys);
  }

  function isMessageUsefulByCurrentUser(record) {
    if (!record) return false;
    var profile = getCurrentUserProfile();
    var accountKey = String(profile.accountKey || profile.email || profile.id || '').trim().toLowerCase();
    if (!accountKey) return false;
    return (Array.isArray(record.usefulByAccountKeys) ? record.usefulByAccountKeys : []).some(function (key) {
      return String(key || '').trim().toLowerCase() === accountKey;
    });
  }

  function resolveCommunityMessageAuthor(record) {
    var mine = isMessageOwnedByCurrentUser(record);
    var profile = getCurrentUserProfile();
    var source = mine ? profile : null;
    if (!source) {
      var community = getCurrentCommunityRecord();
      var members = community && Array.isArray(community.members) ? community.members : [];
      source = members.find(function (member) {
        return identitiesIntersect(getMemberIdentityKeys(member), uniqueIdentityKeys([
          record && record.authorAccountKey,
          record && record.authorId,
          record && record.authorEmail
        ].concat(record && Array.isArray(record.authorIdentityKeys) ? record.authorIdentityKeys : [])));
      }) || {};
    }
    var fallback = {
      name: mine ? 'Você' : (record && record.author || source.name || 'Membro'),
      avatarUrl: record && record.authorAvatarUrl || source.avatarUrl || source.avatar || source.photoUrl || '',
      initials: record && record.authorInitials || source.initials || source.avatarInitials || ''
    };
    return window.DokeMessageAuthor && window.DokeMessageAuthor.resolve
      ? window.DokeMessageAuthor.resolve(fallback, fallback.name)
      : { name: fallback.name, url: fallback.avatarUrl, initials: fallback.initials };
  }

  function createMessageFromRecord(record, records, index) {
    if (!record) return null;
    var authorProfile = resolveCommunityMessageAuthor(record);
    if (record.deletedAt) {
      var deletedNode = createMessage('Mensagem removida' + (record.deletionReason ? ': ' + record.deletionReason : '.'), {
        author: authorProfile.name, avatarUrl: authorProfile.url, authorInitials: authorProfile.initials,
        groupStart: true, createdAt: record.createdAt, recordId: record.id, mine: isMessageOwnedByCurrentUser(record)
      });
      deletedNode.classList.add('community-room-message--deleted');
      return deletedNode;
    }
    var options = {
      author: authorProfile.name,
      avatarUrl: authorProfile.url,
      authorInitials: authorProfile.initials,
      groupStart: !window.DokeMessageAuthor || window.DokeMessageAuthor.startsGroup(records || [record], Number(index || 0), 300000),
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
      usefulByMe: isMessageUsefulByCurrentUser(record),
      mine: isMessageOwnedByCurrentUser(record),
      mentions: Array.isArray(record.mentions) ? record.mentions : []
    };
    if (record.type === 'audio') {
      return createAudioMessage(record.audioDuration || '00:01', options);
    }
    var displayText = String(record.text || '');
    if (record.editedAt && displayText) displayText += '  ·  editada';
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
    if (panelName === 'requests') renderJoinRequests();
    if (panelName === 'audit') renderCommunityAuditLog();
    if (panelName === 'transfer') renderOwnershipTransferOptions();
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

  function openRequestedSettingsPanel() {
    var params = new URLSearchParams(window.location.search || '');
    var panelName = String(params.get('settings') || params.get('communitySettings') || '').trim();
    if (!panelName) return;
    var tab = settingsTabs.find(function (item) {
      return item.dataset.communitySettingsTab === panelName;
    });
    if (!tab || tab.hidden || tab.disabled) return;
    closeFloatingMenus();
    var record = ensureCurrentCommunityRecord();
    if (settingsName) settingsName.textContent = record && (record.title || record.name) || 'Comunidade';
    activateSettingsSection(panelName);
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
      var operation = transactCurrentCommunity('MEMBER_ADDED', candidate.id, function (storedRecord) {
        if (!canCommunity('addMembers')) return { ok: false, reason: 'forbidden', message: 'Sem permissão para adicionar membros.' };
        var normalized = (Array.isArray(storedRecord.members) ? storedRecord.members : []).map(normalizeCommunityMember).filter(Boolean);
        var duplicate = normalized.some(function (member) {
          return String(member.id) === String(candidate.id) || normalize(member.name) === normalize(candidate.name) || identitiesIntersect(getMemberIdentityKeys(member), getMemberIdentityKeys(candidate));
        });
        if (duplicate) return { ok: false, reason: 'already-member', message: 'Essa pessoa já faz parte da comunidade.' };
        var member = Object.assign({}, candidate, { role: 'member', joinedAt: new Date().toISOString(), addedBy: getCurrentUserProfile().id, source: candidate.source || 'conversation' });
        normalized.push(member);
        return { record: Object.assign({}, storedRecord, { members: normalized, updatedAt: new Date().toISOString() }), result: member, payload: { memberId: member.id, source: member.source } };
      });
      setPanelFeedback(memberFeedback, operation.ok ? 'Membro adicionado com sucesso.' : (operation.message || 'Não foi possível adicionar essa pessoa.'));
      renderCommunityMembers();
      renderMemberCandidates();
      updateRoomStats();
      filterMemberPanelItems();
    });
  }

  if (channelForm) {
    channelForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!canCommunity('manageChannels')) return;
      var name = String(channelNameInput && channelNameInput.value || '').replace(/^#+/, '').trim();
      if (!name) { setPanelFeedback(channelFeedback, 'Informe um nome para o canal.'); return; }
      var editingId = String(channelEditIdInput && channelEditIdInput.value || '').trim();
      var id = editingId || ('canal-' + slugifyCommunity(name));
      var viewRoles = Array.prototype.slice.call(channelViewRoles ? channelViewRoles.querySelectorAll('input:checked') : []).map(function (input) { return input.value; });
      var sendRoles = Array.prototype.slice.call(channelSendRoles ? channelSendRoles.querySelectorAll('input:checked') : []).map(function (input) { return input.value; });
      var actor = getCurrentUserProfile();
      var eventType = editingId ? 'CHANNEL_UPDATED' : 'CHANNEL_CREATED';
      var operation = transactCurrentCommunity(eventType, id, function (storedRecord) {
        if (!canCommunityForRecord('manageChannels', storedRecord)) return { ok: false, reason: 'forbidden', message: 'Sem permissão para gerenciar canais.' };
        var existing = getCommunityChannelsForRecord(storedRecord);
        if (existing.some(function (channel) { return channel.id !== editingId && normalize(channel.name) === normalize(name); })) return { ok: false, reason: 'channel-exists', message: 'Esse canal já existe.' };
        var nextChannel = { id: id, name: name, description: String(channelDescriptionInput && channelDescriptionInput.value || '').trim(), category: String(channelCategoryInput && channelCategoryInput.value || 'Canais').trim() || 'Canais', type: String(channelTypeInput && channelTypeInput.value || 'text'), readOnly: Boolean(channelReadOnlyInput && channelReadOnlyInput.checked), slowModeSeconds: Number(channelSlowModeInput && channelSlowModeInput.value || 0), blockLinks: Boolean(channelBlockLinksInput && channelBlockLinksInput.checked), allowedRoleIds: viewRoles, sendRoleIds: sendRoles, position: existing.find(function (channel) { return channel.id === editingId; })?.position ?? existing.length, createdAt: existing.find(function (channel) { return channel.id === editingId; })?.createdAt || new Date().toISOString(), createdByAccountKey: actor.accountKey || actor.id || '' };
        var channelsNext = editingId ? existing.map(function (channel) { return channel.id === editingId ? nextChannel : channel; }) : existing.concat(nextChannel);
        return { record: Object.assign({}, storedRecord, { channels: channelsNext, updatedAt: new Date().toISOString() }), payload: { channelId: id } };
      });
      if (!operation.ok) { setPanelFeedback(channelFeedback, operation.message || 'Não foi possível criar o canal.'); return; }
      if (channelNameInput) channelNameInput.value = '';
      if (channelDescriptionInput) channelDescriptionInput.value = '';
      if (channelCategoryInput) channelCategoryInput.value = '';
      if (channelEditIdInput) channelEditIdInput.value = '';
      if (channelSubmitButton) channelSubmitButton.textContent = 'Criar canal';
      if (channelReadOnlyInput) channelReadOnlyInput.checked = false;
      if (channelSlowModeInput) channelSlowModeInput.value = '0';
      if (channelBlockLinksInput) channelBlockLinksInput.checked = false;
      renderChannels(operation.record);
      renderChannelAdmin(operation.record);
      setPanelFeedback(channelFeedback, editingId ? 'Canal atualizado com sucesso.' : 'Canal criado com sucesso.');
    });
  }

  if (channelAdminList) {
    channelAdminList.addEventListener('click', function (event) {
      if (!canCommunity('manageChannels')) return;
      var editButton = event.target.closest('[data-community-channel-edit]');
      if (editButton) {
        var editId = String(editButton.dataset.communityChannelEdit || '');
        var channel = getCommunityChannelsForRecord(getCurrentCommunityRecord()).find(function (item) { return item.id === editId; });
        if (!channel) return;
        if (channelEditIdInput) channelEditIdInput.value = channel.id;
        if (channelNameInput) channelNameInput.value = channel.name;
        if (channelDescriptionInput) channelDescriptionInput.value = channel.description || '';
        if (channelCategoryInput) channelCategoryInput.value = channel.category || 'Canais';
        if (channelTypeInput) channelTypeInput.value = channel.type || 'text';
        if (channelReadOnlyInput) channelReadOnlyInput.checked = Boolean(channel.readOnly);
        if (channelSlowModeInput) channelSlowModeInput.value = String(Number(channel.slowModeSeconds || 0));
        if (channelBlockLinksInput) channelBlockLinksInput.checked = Boolean(channel.blockLinks);
        renderChannelRoleOptions(channelViewRoles, channel.allowedRoleIds || []);
        renderChannelRoleOptions(channelSendRoles, channel.sendRoleIds || []);
        if (channelSubmitButton) channelSubmitButton.textContent = 'Salvar alterações';
        channelNameInput && channelNameInput.focus();
        return;
      }
      var moveButton = event.target.closest('[data-community-channel-move]');
      if (moveButton) {
        var moveId = String(moveButton.dataset.communityChannelMove || '');
        var direction = Number(moveButton.dataset.direction || 0);
        var moveOperation = transactCurrentCommunity('CHANNEL_REORDERED', moveId, function (storedRecord) {
          var list = getCommunityChannelsForRecord(storedRecord).slice();
          var index = list.findIndex(function (item) { return item.id === moveId; });
          var target = index + direction;
          if (index < 0 || target < 0 || target >= list.length) return { ok: false, message: 'Esse canal já está no limite da ordem.' };
          var swap = list[index]; list[index] = list[target]; list[target] = swap;
          list = list.map(function (item, position) { return Object.assign({}, item, { position: position }); });
          return { record: Object.assign({}, storedRecord, { channels: list, updatedAt: new Date().toISOString() }) };
        });
        if (moveOperation.ok) { renderChannels(moveOperation.record); renderChannelAdmin(moveOperation.record); }
        else setPanelFeedback(channelFeedback, moveOperation.message || 'Não foi possível reordenar.');
        return;
      }
      var button = event.target.closest('[data-community-channel-remove]');
      if (!button) return;
      var id = String(button.dataset.communityChannelRemove || '');
      var operation = transactCurrentCommunity('CHANNEL_DELETED', id, function (storedRecord) {
        if (!canCommunityForRecord('manageChannels', storedRecord)) return { ok: false, reason: 'forbidden', message: 'Sem permissão para gerenciar canais.' };
        var next = getCommunityChannelsForRecord(storedRecord).filter(function (channel) { return channel.id !== id; });
        return { record: Object.assign({}, storedRecord, { channels: next, updatedAt: new Date().toISOString() }), payload: { channelId: id } };
      });
      if (!operation.ok) { setPanelFeedback(channelFeedback, operation.message || 'Não foi possível remover o canal.'); return; }
      if (currentChannelId === id) currentChannelId = 'geral';
      renderChannels(operation.record);
      renderChannelAdmin(operation.record);
      renderPersistedMessagesForChannel(currentChannelId);
    });
  }

  if (memberList) {
    memberList.addEventListener('click', function (event) {
      var toggle = event.target.closest('[data-community-member-menu-toggle]');
      if (toggle && memberList.contains(toggle)) {
        var menuId = String(toggle.dataset.communityMemberMenuToggle || '');
        var menu = memberList.querySelector('[data-community-member-menu="' + menuId.replace(/"/g, '\"') + '"]');
        memberList.querySelectorAll('[data-community-member-menu]').forEach(function (candidate) {
          if (candidate !== menu) candidate.hidden = true;
        });
        memberList.querySelectorAll('[data-community-member-menu-toggle]').forEach(function (candidate) {
          if (candidate !== toggle) candidate.setAttribute('aria-expanded', 'false');
        });
        if (menu) {
          menu.hidden = !menu.hidden;
          toggle.setAttribute('aria-expanded', String(!menu.hidden));
        }
        return;
      }
      var disciplineButton = event.target.closest('[data-community-member-discipline]');
      if (disciplineButton && memberList.contains(disciplineButton)) {
        var disciplineAction = disciplineButton.dataset.communityMemberDiscipline;
        var disciplineId = disciplineButton.dataset.communityMemberId;
        var reason = disciplineAction === 'clear' ? 'restrição removida pelo moderador' : window.prompt('Informe o motivo da ação:');
        if (!reason) return;
        var disciplineResult = disciplineCommunityMember(disciplineId, disciplineAction, reason.trim(), disciplineButton.dataset.duration || '1h');
        setPanelFeedback(memberFeedback, disciplineResult.ok ? 'Ação disciplinar aplicada.' : (disciplineResult.message || 'Não foi possível aplicar a ação.'));
        renderCommunityMembers();
        return;
      }
      var banButton = event.target.closest('[data-community-member-ban]');
      if (banButton && memberList.contains(banButton)) {
        var banId = String(banButton.dataset.communityMemberBan || '');
        var banReason = window.prompt('Informe o motivo obrigatório do banimento:');
        if (!banReason || !banReason.trim()) return;
        var banTarget = getCommunityMembers().find(function (member) { return String(member.id) === banId; });
        var banResult = banCommunityMember(banTarget, banReason.trim());
        setPanelFeedback(memberFeedback, banResult.ok ? 'Membro banido e removido da comunidade.' : (banResult.message || 'Não foi possível banir.'));
        renderCommunityMembers(); renderMemberCandidates(); updateRoomStats();
        return;
      }
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
      var targetMember = getCommunityMembers().find(function (member) { return String(member.id) === id; });
      var removal = removeCommunityMember(targetMember, 'removed', 'removed-by-community-admin');
      if (removal.ok) appendCommunityAuditEvent('memberKicked', { targetMemberId: id, targetMemberName: targetMember && targetMember.name || '', reason: 'removed-by-community-admin' });
      setPanelFeedback(memberFeedback, removal.ok ? 'Membro removido da comunidade.' : 'Membro não encontrado.');
      renderCommunityMembers();
      renderMemberCandidates();
      updateRoomStats();
      filterMemberPanelItems();
    });
  }


  if (requestFilter) {
    requestFilter.addEventListener('change', renderJoinRequests);
  }

  if (requestList) {
    requestList.addEventListener('click', async function (event) {
      var button = event.target.closest('[data-community-request-resolve]');
      if (!button || !requestList.contains(button)) return;
      var item = button.closest('[data-community-request-id]');
      var actionButtons = item ? Array.prototype.slice.call(item.querySelectorAll('[data-community-request-resolve]')) : [];
      actionButtons.forEach(function (actionButton) { actionButton.disabled = true; });
      var result = await resolveJoinRequest(item && item.dataset.communityRequestId, button.dataset.communityRequestResolve);
      setPanelFeedback(requestFeedback, result.message);
      if (result.ok) {
        renderJoinRequests();
        renderCommunityMembers();
        renderMemberCandidates();
        updateRoomStats();
        syncCommunityPermissionUI();
      } else {
        actionButtons.forEach(function (actionButton) { actionButton.disabled = false; });
      }
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
      if (!title) {
        setPanelFeedback(manageFeedback, 'Informe um nome válido para a comunidade.');
        return;
      }
      var operation = transactCurrentCommunity('COMMUNITY_UPDATED', record.id, function (storedRecord) {
        if (!canCommunity('editCommunity')) return { ok: false, reason: 'forbidden', message: 'Sem permissão para editar a comunidade.' };
        return {
          record: Object.assign({}, storedRecord, {
            title: title,
            name: title,
            description: String(manageDescription && manageDescription.value || '').trim(),
            rules: normalizeCommunityRules(manageRules && manageRules.value || storedRecord.rules),
            type: String(manageType && manageType.value || 'public'),
            color: String(manageColor && manageColor.value || '#168f7d'),
            cover: Object.assign({}, manageCoverState || {}),
            updatedAt: new Date().toISOString()
          }),
          payload: { fields: ['title', 'description', 'rules', 'type', 'color', 'cover'] }
        };
      });
      if (!operation.ok) {
        setPanelFeedback(manageFeedback, operation.message || 'Não foi possível salvar as alterações.');
        return;
      }
      applySavedCommunityRecord(operation.record);
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
      var operation = transactCurrentCommunity('INVITE_REGENERATED', nextInvite.code, function (storedRecord) {
        if (!canCommunity('addMembers')) return { ok: false, reason: 'forbidden', message: 'Sem permissão para gerar convites.' };
        return {
          record: Object.assign({}, storedRecord, { invite: nextInvite, inviteCode: nextInvite.code, updatedAt: new Date().toISOString() }),
          payload: { previousCode: String(storedRecord.invite && storedRecord.invite.code || storedRecord.inviteCode || ''), nextCode: nextInvite.code, generation: nextInvite.generation }
        };
      });
      if (!operation.ok) {
        setPanelFeedback(memberFeedback, operation.message || 'Não foi possível gerar um novo convite.');
        return;
      }
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
      var actor = getCurrentUserProfile();
      var role = normalizeCommunityRole({ id: 'role-' + slugifyCommunity(name), name: name, color: String(roleColor && roleColor.value || '#2167ae'), permissions: permissions, system: false, createdAt: new Date().toISOString(), createdByAccountKey: actor.accountKey || actor.id || '' });
      var recordBeforeTransaction = getCurrentCommunityRecord();
      var operation = transactCurrentCommunity('ROLE_CREATED', role.id, function (storedRecord) {
        if (!canCommunityForRecord('manageRoles', storedRecord)) return { ok: false, reason: 'forbidden', message: 'Sem permissão para gerenciar cargos.' };
        var allRoles = getCommunityRolesForRecord(storedRecord);
        var normalizedName = normalize(role.name);
        var exists = allRoles.some(function (item) {
          return String(item && item.id) === String(role.id) || normalize(item && item.name) === normalizedName;
        });
        if (exists) return { ok: false, reason: 'role-exists', message: 'Esse cargo já existe.' };
        var roles = Array.isArray(storedRecord.roles) ? storedRecord.roles.slice() : [];
        roles.push(role);
        return { record: Object.assign({}, storedRecord, { roles: roles, updatedAt: new Date().toISOString() }), payload: { roleId: role.id, permissions: role.permissions } };
      });
      var persistedRecord = operation && operation.ok ? operation.record : null;
      var created = Boolean(persistedRecord && Array.isArray(persistedRecord.roles) && persistedRecord.roles.some(function (item) {
        return String(item && item.id || '') === String(role.id) || normalize(item && item.name) === normalize(role.name);
      }));
      if (!created) {
        setPanelFeedback(roleFeedback, operation && operation.message || 'Não foi possível criar o cargo.');
        renderRoles(persistedRecord || getCurrentCommunityRecord());
        return;
      }
      if (roleName) roleName.value = '';
      rolePermissionInputs.forEach(function (input) { input.checked = false; });
      renderRoles(persistedRecord);
      renderCommunityMembers();
      debugCommunityRoles('role-created', { roleDraft: role, recordBeforeTransaction: recordBeforeTransaction, transactionResult: operation, persistedRecordAfterTransaction: persistedRecord });
      setPanelFeedback(roleFeedback, 'Cargo criado com sucesso.');
      if (roleList && roleList.lastElementChild) {
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
      var operation = transactCurrentCommunity('ROLE_DELETED', id, function (storedRecord) {
        if (!canCommunityForRecord('manageRoles', storedRecord)) return { ok: false, reason: 'forbidden', message: 'Sem permissão para gerenciar cargos.' };
        var roles = Array.isArray(storedRecord.roles) ? storedRecord.roles.slice() : [];
        var target = roles.find(function (role) { return String(role && role.id) === id; });
        if (!target || target.system || ['owner', 'member', 'moderator'].indexOf(id) !== -1) return { ok: false, reason: 'protected-role', message: 'Esse cargo não pode ser removido.' };
        var reassigned = 0;
        var members = (Array.isArray(storedRecord.members) ? storedRecord.members : []).map(function (member) {
          var next = Object.assign({}, member);
          var roleIds = normalizeMemberRoleIds(next).filter(function (roleId) { return roleId !== id && roleId !== 'owner'; });
          if (normalizeMemberRoleIds(next).indexOf(id) !== -1) {
            next.roleIds = roleIds.length ? roleIds : ['member'];
            if (String(next.role || '') === id) next.role = roleIds.length ? roleIds[roleIds.length - 1] : 'member';
            reassigned += 1;
          }
          return next;
        });
        return { record: Object.assign({}, storedRecord, { roles: roles.filter(function (role) { return String(role && role.id) !== id; }), members: members, updatedAt: new Date().toISOString() }), payload: { roleId: id, reassignedMembers: reassigned } };
      });
      if (!operation.ok) {
        setPanelFeedback(roleFeedback, operation.message || 'Não foi possível remover o cargo.');
        return;
      }
      var persistedRecord = applyCurrentCommunityRecordSnapshot(operation.record) || getCurrentCommunityRecord();
      var deleted = persistedRecord
        && !getCommunityRolesForRecord(persistedRecord).some(function (role) { return String(role.id) === id; })
        && !(Array.isArray(persistedRecord.members) ? persistedRecord.members : []).some(function (member) { return normalizeMemberRoleIds(member).indexOf(id) !== -1; });
      if (!deleted) {
        setPanelFeedback(roleFeedback, 'A remoção do cargo não foi persistida. Recarregue e tente novamente.');
        return;
      }
      renderRoles(persistedRecord);
      renderCommunityMembers();
    });
  }

  if (memberList) {
    memberList.addEventListener('change', function (event) {
      var input = event.target.closest('[data-community-member-role-toggle]');
      if (!input || !memberList.contains(input)) return;
      if (!canCommunity('manageRoles')) return;
      var targetKey = String(input.dataset.communityMemberRoleToggle || '').trim();
      var roleId = String(input.value || '').trim();
      var shouldAssign = Boolean(input.checked);
      var record = ensureCurrentCommunityRecord() || {};
      var roleExists = getCommunityRolesForRecord(record).some(function (role) { return String(role.id) === roleId && !['owner', 'member'].includes(roleId); });
      var targetMember = (Array.isArray(record.members) ? record.members : []).find(function (member) { return memberMatchesTarget(member, targetKey); });
      if (!roleExists || !targetMember || String(targetMember.role || '') === 'owner') {
        renderCommunityMembers();
        setPanelFeedback(memberFeedback, 'Não foi possível alterar esse cargo.');
        return;
      }
      var operation = transactCurrentCommunity('MEMBER_ROLES_CHANGED', targetKey + ':' + roleId, function (storedRecord) {
        if (!canCommunityForRecord('manageRoles', storedRecord)) return { ok: false, reason: 'forbidden', message: 'Sem permissão para gerenciar cargos.' };
        var validRole = getCommunityRolesForRecord(storedRecord).some(function (role) { return String(role.id) === roleId && !['owner', 'member'].includes(roleId); });
        if (!validRole) return { ok: false, reason: 'invalid-role', message: 'Cargo inválido.' };
        var changed = false;
        var changedMemberId = '';
        var actor = getCurrentUserProfile();
        var members = (Array.isArray(storedRecord.members) ? storedRecord.members : []).map(function (member) {
          var next = Object.assign({}, member);
          if (!memberMatchesTarget(next, targetKey) || String(next.role || '') === 'owner') return next;
          var roleIds = normalizeMemberRoleIds(next).filter(function (id) { return id !== 'owner' && id !== 'member'; });
          var hasRole = roleIds.indexOf(roleId) !== -1;
          if (shouldAssign && !hasRole) roleIds.push(roleId);
          if (!shouldAssign && hasRole) roleIds = roleIds.filter(function (id) { return id !== roleId; });
          next.roleIds = ['member'].concat(roleIds);
          next.role = roleIds.length ? roleIds[roleIds.length - 1] : 'member';
          next.roleUpdatedAt = new Date().toISOString();
          next.roleUpdatedBy = String(actor.accountKey || actor.id || '');
          changedMemberId = String(next.id || next.accountKey || targetKey);
          changed = true;
          return next;
        });
        if (!changed) return { ok: false, reason: 'member-not-found', message: 'Membro não encontrado.' };
        return { record: Object.assign({}, storedRecord, { members: members, updatedAt: new Date().toISOString() }), payload: { memberId: changedMemberId, roleId: roleId, assigned: shouldAssign } };
      });
      var persistedMember = operation.ok && operation.record && (Array.isArray(operation.record.members) ? operation.record.members : []).find(function (member) { return memberMatchesTarget(member, targetKey); });
      var persisted = Boolean(persistedMember && (normalizeMemberRoleIds(persistedMember).indexOf(roleId) !== -1) === shouldAssign);
      setPanelFeedback(memberFeedback, persisted ? 'Cargos atualizados com sucesso.' : (operation.message || 'A alteração não foi persistida.'));
      renderCommunityMembers();
      syncCommunityPermissionUI();
    });
  }

  root.querySelectorAll('[data-community-panel-open]').forEach(function (button) {
    button.addEventListener('click', function () {
      var panelName = button.dataset.communityPanelOpen;
      if (panelName === 'manage') syncManageForm();
      if (panelName === 'invite') renderInviteCode();
      if (panelName === 'roles') renderRoles();
      if (panelName === 'requests') renderJoinRequests();
      if (panelName === 'transfer') renderOwnershipTransferOptions();
      if (panelName === 'members') {
        renderCommunityMembers();
        renderMemberCandidates();
      }
    });
  });

  if (transferForm) {
    transferForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (String(getCurrentCommunityMember().role || '') !== 'owner') {
        setPanelFeedback(transferFeedback, 'Somente o proprietário pode transferir a comunidade.');
        return;
      }
      if (String(transferConfirm && transferConfirm.value || '').trim().toUpperCase() !== 'TRANSFERIR') {
        setPanelFeedback(transferFeedback, 'Digite TRANSFERIR para confirmar.');
        return;
      }
      var result = transferCommunityOwnership(transferMember && transferMember.value);
      if (!result.ok) {
        var messages = {
          'invalid-target': 'Selecione um membro válido.',
          'same-account': 'A propriedade já pertence a esta conta.',
          'owner-invariant': 'A transferência foi bloqueada para preservar um único proprietário.'
        };
        setPanelFeedback(transferFeedback, messages[result.reason] || 'Não foi possível transferir a propriedade.');
        return;
      }
      if (transferConfirm) transferConfirm.value = '';
      setPanelFeedback(transferFeedback, 'Propriedade transferida para ' + result.nextOwner.name + '.');
      renderCommunityMembers();
      syncCommunityPermissionUI();
      updateRoomStats();
      window.setTimeout(function () {
        closeCommunitySettings();
      }, 500);
    });
  }

  root.querySelectorAll('[data-community-exit]').forEach(function (button) {
    button.addEventListener('click', function () {
      var member = getCurrentCommunityMember();
      if (String(member.role || '') === 'owner') {
        window.alert('O proprietário precisa transferir a propriedade ou excluir a comunidade.');
        return;
      }
      if (String(member.role || '') === 'visitor') return;
      var record = ensureCurrentCommunityRecord();
      var name = record && (record.title || record.name) || 'esta comunidade';
      if (!window.confirm('Sair de ' + name + '? Você perderá o acesso até entrar novamente.')) return;
      var result = leaveCurrentCommunity();
      if (!result.ok) return;
      try {
        var selected = safeJsonParse(window.localStorage && window.localStorage.getItem(COMMUNITY_SELECTION_STORAGE_KEY));
        if (selected && String(selected.id || '') === String(record && record.id || '')) {
          window.localStorage.removeItem(COMMUNITY_SELECTION_STORAGE_KEY);
        }
      } catch (error) {
        // Storage cleanup is best-effort only.
      }
      redirectToCommunityAccess({ action: 'left', reason: 'membership-ended' }, record);
    });
  });

  function createCommunityDeletionTombstone(record, actor) {
    var deletedAt = new Date().toISOString();
    var cancelledRequests = Array.isArray(record && record.joinRequests) ? record.joinRequests.map(function (request) {
      if (!request || request.status !== 'pending') return request;
      return Object.assign({}, request, {
        status: 'cancelled',
        resolvedAt: deletedAt,
        resolvedBy: String(actor && actor.id || ''),
        resolutionReason: 'community-deleted'
      });
    }) : [];
    return {
      id: String(record && record.id || ''),
      title: String(record && (record.title || record.name) || ''),
      status: 'deleted',
      deletedAt: deletedAt,
      deletedBy: String(actor && actor.id || ''),
      deletedByName: String(actor && actor.name || ''),
      ownerId: String(record && record.ownerId || ''),
      ownerIdentityKeys: Array.isArray(record && record.ownerIdentityKeys) ? record.ownerIdentityKeys.slice() : [],
      invite: record && record.invite ? Object.assign({}, record.invite, { active: false, invalidatedAt: deletedAt, invalidatedReason: 'community-deleted' }) : null,
      joinRequests: cancelledRequests,
      lifecycleVersion: 1
    };
  }

  function clearDeletedCommunityArtifacts(communityId) {
    var id = String(communityId || '').trim();
    if (!id) return;
    var store = readCommunityMessageStore();
    delete store[id];
    writeCommunityMessageStore(store);
    try {
      var selected = safeJsonParse(window.localStorage && window.localStorage.getItem(COMMUNITY_SELECTION_STORAGE_KEY));
      if (selected && String(selected.id || '') === id) window.localStorage.removeItem(COMMUNITY_SELECTION_STORAGE_KEY);
    } catch (error) {
      // Storage cleanup is best-effort only.
    }
  }

  function deleteCurrentCommunityPermanently() {
    var member = getCurrentCommunityMember();
    if (String(member && member.role || '') !== 'owner') return { ok: false, reason: 'owner-required' };
    var record = ensureCurrentCommunityRecord();
    if (!record) return { ok: false, reason: 'community-not-found' };
    var currentId = String(record.id || getCurrentCommunityId() || '').trim();
    var actor = getCurrentUserProfile();
    var operations = getCommunityDomainOperations();
    if (!operations || !operations.delete) return { ok: false, reason: 'domain-unavailable' };
    var operation = operations.delete(currentId, {
      type: 'COMMUNITY_DELETED', actorId: actor.id, targetId: currentId,
      operationId: createCommunityOperationId('community-delete', currentId, actor.id)
    }, function (storedRecord) {
      return { tombstone: createCommunityDeletionTombstone(storedRecord, actor) };
    });
    if (!operation.ok) return operation;
    clearDeletedCommunityArtifacts(currentId);
    try {
      window.localStorage && window.localStorage.setItem(COMMUNITY_LIFECYCLE_STORAGE_KEY, JSON.stringify({
        action: 'deleted', communityId: currentId, deletedAt: operation.tombstone.deletedAt, deletedBy: actor.id
      }));
    } catch (error) {
      // Cross-tab notification is best-effort only.
    }
    return { ok: true, tombstone: operation.tombstone };
  }

  root.querySelectorAll('[data-community-leave]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (String(getCurrentCommunityMember().role || '') !== 'owner') return;
      var record = ensureCurrentCommunityRecord();
      var name = String(record && (record.title || record.name) || '').trim();
      var confirmation = String(deleteConfirm && deleteConfirm.value || '').trim();
      if (!name || confirmation !== name) {
        setPanelFeedback(deleteFeedback, 'Digite exatamente o nome da comunidade para confirmar.');
        if (deleteConfirm) deleteConfirm.focus();
        return;
      }
      var result = deleteCurrentCommunityPermanently();
      if (!result.ok) {
        setPanelFeedback(deleteFeedback, result.reason === 'owner-required' ? 'Somente o proprietário pode excluir a comunidade.' : 'Não foi possível excluir a comunidade.');
        return;
      }
      setPanelFeedback(deleteFeedback, 'Comunidade excluída. Redirecionando...');
      window.setTimeout(function () {
        redirectToCommunityAccess({ action: 'deleted', reason: 'community-deleted' }, result.tombstone);
      }, 120);
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
      renderMentionPicker();
    });
    composerInput.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMentionPicker();
    });
  }

  if (composer) {
    composer.addEventListener('submit', async function (event) {
      event.preventDefault();
      var text = composerInput ? composerInput.value.trim() : '';
      var currentMember = getCurrentMemberForRecord(ensureCurrentCommunityRecord() || {});
      if (isFutureDisciplineDate(currentMember && currentMember.mutedUntil) || isFutureDisciplineDate(currentMember && currentMember.restrictedUntil)) {
        var restrictionLabel = getMemberDisciplineLabel(currentMember) || 'Envio temporariamente bloqueado.';
        setPanelFeedback(channelFeedback, restrictionLabel + (currentMember.disciplineReason ? ' • Motivo: ' + currentMember.disciplineReason : ''));
        return;
      }
      if (!canSendToChannel(getCurrentChannelRecord())) { syncChannelComposerAccess(); return; }
      if (!text && !selectedAttachment && !hasActiveAudioDraft()) return;

      var activeChannel = getCurrentChannelRecord();
      var securityCheck = validateCommunityMessageSecurity(text, activeChannel);
      if (!securityCheck.allowed) {
        registerAntispamViolation(securityCheck.reason, activeChannel, securityCheck.message);
        setPanelFeedback(channelFeedback, securityCheck.message);
        if (composerInput) composerInput.focus();
        return;
      }

      if (hasActiveAudioDraft()) {
        var audioRecord = createCommunityMessageRecord({
          type: 'audio',
          audioDuration: formatAudioTime(Math.max(audioDraftSeconds, 1))
        });
        var persistedAudio = persistCommunityMessage(audioRecord);
        if (persistedAudio) {
          commitCommunityMessageSecurity(securityCheck);
          clearThreadEmptyState();
          renderPersistedMessagesForChannel(currentChannelId || 'geral');
          markChannelRead(currentChannelId || 'geral');
          await notifyAnnouncementChannel(persistedAudio, getCurrentChannelRecord());
          await notifyMessageMentions(persistedAudio, getCurrentChannelRecord());
        }
        resetAudioDraft();
      } else {
        var attachmentPayload = selectedAttachmentMeta || null;
        var messageRecord = createCommunityMessageRecord({
          type: attachmentPayload ? 'attachment' : 'text',
          text: text,
          mentions: getMessageMentions(text),
          attachmentName: attachmentPayload ? attachmentPayload.name : '',
          attachmentDisplayName: attachmentPayload ? attachmentPayload.displayName : '',
          attachmentType: attachmentPayload ? attachmentPayload.type : '',
          attachmentSize: attachmentPayload ? attachmentPayload.size : 0,
          attachmentKind: attachmentPayload ? attachmentPayload.kind : '',
          attachmentDataUrl: attachmentPayload ? attachmentPayload.dataUrl : ''
        });
        var persistedMessage = persistCommunityMessage(messageRecord);
        if (persistedMessage) {
          commitCommunityMessageSecurity(securityCheck);
          clearThreadEmptyState();
          renderPersistedMessagesForChannel(currentChannelId || 'geral');
          markChannelRead(currentChannelId || 'geral');
          await notifyAnnouncementChannel(persistedMessage, getCurrentChannelRecord());
          await notifyMessageMentions(persistedMessage, getCurrentChannelRecord());
        }
      }

      if (composerInput) {
        composerInput.value = '';
        composerInput.style.height = 'auto';
      }
      selectedMentions = [];
      closeMentionPicker();
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
    var restoreAction = event.target.closest('[data-community-audit-restore]');
    if (restoreAction) {
      restoreCommunityMessage(restoreAction.dataset.communityAuditRestore, restoreAction.dataset.communityAuditChannel);
      return;
    }
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
    if (event.key === COMMUNITY_CHANNEL_STATE_STORAGE_KEY) {
      renderChannels(getCurrentCommunityRecord());
      updateRoomStats();
      return;
    }
    if (event.key === COMMUNITY_AUDIT_STORAGE_KEY) { renderCommunityAuditLog(); return; }
    if (event.key === COMMUNITY_MESSAGES_STORAGE_KEY) {
      renderPersistedMessagesForChannel(currentChannelId || 'geral');
      if (!document.hidden) markChannelRead(currentChannelId || 'geral');
      renderPinnedPanel();
      updateRoomStats();
      return;
    }
    if (![COMMUNITY_LIST_STORAGE_KEY, COMMUNITY_DELETED_STORAGE_KEY, COMMUNITY_LIFECYCLE_STORAGE_KEY].includes(event.key)) return;
    var currentId = getCurrentCommunityId();
    if (isCommunityTombstoned(currentId)) {
      root.dataset.communityAccessState = 'deleted';
      root.hidden = true;
      redirectToCommunityAccess({ action: 'deleted', reason: 'community-deleted' }, { id: currentId, title: currentCommunityContext && currentCommunityContext.title });
      return;
    }
    var refreshedRecord = getCurrentCommunityRecord();
    var refreshedMembersSignature = getCommunityMembersSignature(refreshedRecord || {});
    if (event.key === COMMUNITY_LIST_STORAGE_KEY && refreshedMembersSignature === lastCommunityMembersSignature) return;
    lastCommunityMembersSignature = refreshedMembersSignature;
    var refreshedDecision = getCommunityAccessDecision(refreshedRecord);
    if (!refreshedDecision.allowed) {
      root.dataset.communityAccessState = 'revoked';
      root.hidden = true;
      redirectToCommunityAccess(refreshedDecision, refreshedRecord);
      return;
    }
    renderCommunityMembers();
    if (memberCandidates && !memberCandidates.hidden) renderMemberCandidates();
    renderRoles();
    renderChannels(refreshedRecord);
    renderChannelAdmin(refreshedRecord);
    renderInviteCode();
    renderJoinRequests();
    updateRoomStats();
    syncCommunityPermissionUI();
  });

  function showCommunityWelcomeIfPending() {
    var modal = document.querySelector('[data-community-welcome-modal]');
    if (!modal) return;
    var profile = getCurrentUserProfile();
    var communityId = getCurrentCommunityId();
    var key = 'doke.community.welcome.v1:' + communityId + ':' + profile.id;
    var shouldOpen = false;
    try {
      shouldOpen = window.sessionStorage && window.sessionStorage.getItem(key) === '1';
      if (shouldOpen) window.sessionStorage.removeItem(key);
    } catch (error) {
      shouldOpen = false;
    }
    if (!shouldOpen) return;
    var record = getCurrentCommunityRecord() || currentCommunityContext || {};
    var title = modal.querySelector('[data-community-welcome-title]');
    if (title) title.textContent = 'Bem-vindo à ' + String(record.title || record.name || 'comunidade') + '!';
    var rules = normalizeCommunityRules(record.rules);
    var rulesBody = modal.querySelector('[data-community-welcome-rules-body]');
    var rulesSection = modal.querySelector('[data-community-welcome-rules-section]');
    var rulesList = modal.querySelector('[data-community-welcome-rules]');
    if (rulesList) {
      rulesList.replaceChildren();
      rules.forEach(function (rule) {
        var item = document.createElement('li');
        item.textContent = rule;
        rulesList.appendChild(item);
      });
    }
    if (rulesSection) rulesSection.hidden = rules.length === 0;
    if (rulesBody) rulesBody.hidden = rules.length === 0;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('community-modal-open');
    window.setTimeout(function () { modal.querySelector('.doke-btn--primary[data-community-welcome-close]')?.focus?.(); }, 40);
  }

  document.querySelectorAll('[data-community-welcome-close]').forEach(function (button) {
    button.addEventListener('click', function () {
      var modal = button.closest('[data-community-welcome-modal]');
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('community-modal-open');
    });
  });

  var requestedChannelId = '';
  try { requestedChannelId = String(new URLSearchParams(window.location.search || '').get('channel') || '').trim(); } catch (error) {}
  var initiallyActiveChannel = channels.find(function (channel) { return requestedChannelId && channel.dataset.channelId === requestedChannelId; })
    || channels.find(function (channel) { return channel.classList.contains('is-active'); })
    || channels[0];
  if (initiallyActiveChannel) {
    currentChannelId = initiallyActiveChannel.dataset.channelId || currentChannelId;
    currentChannelName = initiallyActiveChannel.dataset.channelName || currentChannelName;
  }

  var initialCommunityId = getCurrentCommunityId();
  if (isCommunityTombstoned(initialCommunityId)) {
    root.dataset.communityAccessState = 'deleted';
    redirectToCommunityAccess({ action: 'deleted', reason: 'community-deleted' }, { id: initialCommunityId, title: currentCommunityContext && currentCommunityContext.title });
    return;
  }
  var accessRecord = repairRecentCreatedCommunityOwnership(getCurrentCommunityRecord());
  var accessDecision = getCommunityAccessDecision(accessRecord);
  if (!accessDecision.allowed) {
    root.dataset.communityAccessState = 'denied';
    redirectToCommunityAccess(accessDecision, accessRecord);
    return;
  }
  writeCommunityAccessDebug('room-access-allowed', accessRecord, accessDecision);
  try { window.sessionStorage && window.sessionStorage.removeItem('doke.community.recent-create.v1'); } catch (error) {}

  applyCommunityContext();
  root.dataset.communityAccessState = 'allowed';
  ensureCurrentCommunityRecord();
  syncManageForm();
  renderInviteCode();
  renderRoles();
  renderChannels(accessRecord);
  renderChannelAdmin(accessRecord);
  renderCommunityMembers();
  renderJoinRequests();
  syncCommunityPermissionUI();
  openRequestedSettingsPanel();
  filterChannels();
  renderPersistedMessagesForChannel(currentChannelId);
  showCommunityWelcomeIfPending();
  updateSendState();
  updateComposerDraftState();
  scrollToStart();
  root.hidden = false;
  root.dataset.communityHydrated = 'true';
  setCommunityRoomPageState('hydrated');
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

  window.setTimeout(function () {
    var body = document.body;
    var room = document.querySelector('[data-community-room]');
    if (!body || !room || body.dataset.dataState !== 'loading') return;
    body.dataset.dataState = 'error';
    room.dataset.state = 'error';
    room.setAttribute('aria-busy', 'false');
    room.hidden = false;
    var preloader = document.querySelector('[data-community-room-document-preloader]');
    if (preloader) {
      preloader.hidden = true;
      preloader.setAttribute('aria-hidden', 'true');
    }
    console.error('[Community room] Hydration timeout: fallback reveal applied.');
  }, 4500);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.DokeInitCommunityRoom, { once: true });
  } else {
    window.DokeInitCommunityRoom();
  }
})();
