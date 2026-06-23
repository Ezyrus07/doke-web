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
  var members = Array.prototype.slice.call(root.querySelectorAll('[data-member-search]'));
  var currentChannelName = '# Geral';
  var selectedAttachment = '';
  var audioDraftSeconds = 0;
  var audioDraftTimer = null;

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

    currentChannelName = channel.dataset.channelName || '# Geral';
    if (channelTitle) channelTitle.textContent = currentChannelName;
    if (channelStatus) channelStatus.textContent = channel.dataset.channelStatus || '128 membros • 12 online';
    var badge = channel.querySelector('.community-room-channel__badge');
    if (badge) badge.remove();
    closeFloatingMenus();
    setMobileView('thread');
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

  function createMessageHeader() {
    var header = document.createElement('header');
    header.className = 'message-bubble__meta';
    var author = document.createElement('strong');
    var time = document.createElement('time');
    var now = new Date();
    author.textContent = 'Você';
    time.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    header.append(author, time);
    return header;
  }

  function createMessage(text) {
    var article = document.createElement('article');
    article.className = 'community-room-message community-room-message--self message-row message-row--me';

    var bubble = document.createElement('div');
    bubble.className = 'community-room-message__bubble message-bubble message-bubble--me';

    var paragraph = document.createElement('p');
    paragraph.textContent = text;

    bubble.append(createMessageHeader(), paragraph);

    if (selectedAttachment) {
      var media = document.createElement('div');
      media.className = 'community-room-media-card';
      var label = document.createElement('span');
      label.textContent = selectedAttachment;
      media.appendChild(label);
      bubble.appendChild(media);
    }

    article.appendChild(bubble);
    return article;
  }

  function createAudioMessage(duration) {
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
    bubble.append(createMessageHeader(), audio);
    article.appendChild(bubble);
    return article;
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

  if (memberSearch) {
    memberSearch.addEventListener('input', function () {
      var term = normalize(memberSearch.value);
      members.forEach(function (member) {
        member.hidden = term && normalize(member.dataset.memberSearch).indexOf(term) === -1;
      });
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
        messageList.appendChild(createAudioMessage(formatAudioTime(Math.max(audioDraftSeconds, 1))));
        resetAudioDraft();
      } else {
        var messageText = text || 'Anexo enviado no canal ' + currentChannelName + '.';
        messageList.appendChild(createMessage(messageText));
      }

      if (composerInput) {
        composerInput.value = '';
        composerInput.style.height = 'auto';
      }
      clearAttachment();
      updateSendState();
      scrollToBottom();
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

  filterChannels();
  updateSendState();
  updateComposerDraftState();
  scrollToStart();
})();
