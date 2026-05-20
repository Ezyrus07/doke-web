(function () {
  'use strict';

  var root = document.querySelector('[data-community-room]');
  if (!root) return;

  var channels = Array.prototype.slice.call(root.querySelectorAll('[data-channel-id]'));
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
  var filterToggle = root.querySelector('[data-community-filter-toggle]');
  var filterMenu = root.querySelector('[data-community-filter-menu]');
  var moreToggle = root.querySelector('[data-community-more-toggle]');
  var actionsMenu = root.querySelector('[data-community-actions-menu]');
  var attachButton = root.querySelector('[data-community-attach]');
  var attachmentPreview = root.querySelector('[data-community-attachment-preview]');
  var attachmentDraft = root.querySelector('[data-community-attachment-draft]');
  var attachmentTitle = root.querySelector('[data-community-attachment-title]');
  var attachmentCancel = root.querySelector('[data-community-attachment-cancel]');
  var memberSearch = root.querySelector('[data-community-member-search]');
  var members = Array.prototype.slice.call(root.querySelectorAll('[data-member-search]'));
  var currentChannelName = '# Geral';
  var selectedAttachment = '';

  function closeFloatingMenus() {
    if (filterMenu) filterMenu.hidden = true;
    if (filterToggle) filterToggle.setAttribute('aria-expanded', 'false');
    if (actionsMenu) actionsMenu.hidden = true;
    if (moreToggle) moreToggle.setAttribute('aria-expanded', 'false');
    if (attachmentPreview) attachmentPreview.hidden = true;
  }

  function scrollToBottom() {
    if (!messageList) return;
    messageList.scrollTop = messageList.scrollHeight;
  }

  function scrollToStart() {
    if (!messageList) return;
    messageList.scrollTop = 0;
  }

  function setMobileView(view) {
    root.dataset.mobileView = view;
  }

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

  function createMessage(text) {
    var article = document.createElement('article');
    article.className = 'community-room-message community-room-message--self message-row message-row--me';

    var bubble = document.createElement('div');
    bubble.className = 'community-room-message__bubble message-bubble message-bubble--me';

    var header = document.createElement('header');
    header.className = 'message-bubble__meta';
    var author = document.createElement('strong');
    var time = document.createElement('time');
    var now = new Date();
    author.textContent = 'Você';
    time.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    header.append(author, time);

    var paragraph = document.createElement('p');
    paragraph.textContent = text;

    bubble.append(header, paragraph);

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

  function updateSendState() {
    if (!sendButton || !composerInput) return;
    sendButton.disabled = composerInput.value.trim().length === 0 && !selectedAttachment;
  }

  function clearAttachment() {
    selectedAttachment = '';
    if (attachmentDraft) attachmentDraft.hidden = true;
    if (attachmentTitle) attachmentTitle.textContent = 'Anexo pronto';
    updateSendState();
  }

  channels.forEach(function (channel) {
    channel.addEventListener('click', function () {
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

  if (filterToggle && filterMenu) {
    filterToggle.addEventListener('click', function () {
      var next = filterMenu.hidden;
      closeFloatingMenus();
      filterMenu.hidden = !next;
      filterToggle.setAttribute('aria-expanded', String(next));
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

  if (attachButton && attachmentPreview) {
    attachButton.addEventListener('click', function () {
      var next = attachmentPreview.hidden;
      closeFloatingMenus();
      attachmentPreview.hidden = !next;
    });
  }

  root.querySelectorAll('[data-attachment-type]').forEach(function (button) {
    button.addEventListener('click', function () {
      selectedAttachment = button.dataset.attachmentType || 'Anexo';
      if (attachmentTitle) attachmentTitle.textContent = selectedAttachment + ' pronto para envio';
      if (attachmentDraft) attachmentDraft.hidden = false;
      if (attachmentPreview) attachmentPreview.hidden = true;
      updateSendState();
    });
  });

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
      if (!text && !selectedAttachment) return;
      var messageText = text || 'Anexo enviado no canal ' + currentChannelName + '.';
      messageList.appendChild(createMessage(messageText));
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
      var insideFloating = event.target.closest('[data-community-filter-toggle], [data-community-filter-menu], [data-community-more-toggle], [data-community-actions-menu], [data-community-attach], [data-community-attachment-preview]');
      if (!insideFloating) closeFloatingMenus();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    closeFloatingMenus();
    root.querySelectorAll('[data-community-panel]').forEach(function (panel) {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    });
  });

  filterChannels();
  updateSendState();
  scrollToStart();
})();
