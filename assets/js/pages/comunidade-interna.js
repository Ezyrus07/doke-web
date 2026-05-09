document.addEventListener('DOMContentLoaded', () => {
  const messages = document.querySelector('[data-community-room-messages]');
  const form = document.querySelector('[data-community-room-form]');
  const input = document.querySelector('[data-community-room-input]');
  const submit = document.querySelector('[data-community-room-submit]');
  const imageInput = document.querySelector('[data-community-image-input]');
  const imageDraft = document.querySelector('[data-community-image-draft]');
  const imagePreview = document.querySelector('[data-community-image-preview]');
  const imageCancel = document.querySelector('[data-community-image-cancel]');
  const audioButton = document.querySelector('[data-community-audio]');
  const audioDraft = document.querySelector('[data-community-audio-draft]');
  const audioTime = document.querySelector('[data-community-audio-time]');
  const audioCancel = document.querySelector('[data-community-audio-cancel]');
  const emojiButton = document.querySelector('[data-community-emoji]');
  const searchToggle = document.querySelector('[data-community-search-toggle]');
  const searchForm = document.querySelector('[data-community-search-form]');
  const searchInput = document.querySelector('[data-community-search-input]');
  const searchClear = document.querySelector('[data-community-search-clear]');
  const membersToggle = document.querySelector('[data-community-members-toggle]');
  const membersPanel = document.querySelector('[data-community-members-panel]');
  const pinsToggle = document.querySelector('[data-community-pins-toggle]');
  const pinsPanel = document.querySelector('[data-community-pins-panel]');
  const pinsClose = document.querySelector('[data-community-pins-close]');
  const menuToggle = document.querySelector('[data-community-menu-toggle]');
  const channelMenu = document.querySelector('[data-community-menu]');

  if (!messages) return;

  let imageDraftSrc = '';
  let audioDraftSeconds = 0;
  let audioDraftTimer = null;

  const scrollToLatest = () => {
    messages.scrollTop = messages.scrollHeight;
  };

  const scrollToStart = () => {
    messages.scrollTop = 0;
  };

  const syncSubmitState = () => {
    if (!submit) return;
    const hasText = Boolean(input?.value.trim());
    const hasImage = Boolean(imageDraftSrc);
    const hasAudio = Boolean(audioDraft && !audioDraft.hidden);
    submit.disabled = !(hasText || hasImage || hasAudio);
  };

  const autoResizeComposer = () => {
    if (!input || input.tagName !== 'TEXTAREA') return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  };

  const filterMessages = () => {
    if (!searchInput) return;
    const term = searchInput.value.trim().toLocaleLowerCase('pt-BR');
    const items = messages.querySelectorAll('.community-message');
    const dividers = messages.querySelectorAll('.community-day-divider');

    messages.classList.toggle('is-searching', term.length > 0);

    dividers.forEach((divider) => {
      divider.hidden = term.length > 0;
    });

    items.forEach((item) => {
      const text = item.textContent.toLocaleLowerCase('pt-BR');
      item.hidden = term.length > 0 && !text.includes(term);
    });
  };

  const openSearch = () => {
    if (!searchForm || !searchToggle || !searchInput) return;
    setPinsPanelState(false);
    setChannelMenuState(false);
    searchForm.hidden = false;
    searchToggle.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => searchInput.focus());
  };

  const closeSearch = () => {
    if (!searchForm || !searchToggle || !searchInput) return;
    searchInput.value = '';
    filterMessages();
    searchForm.hidden = true;
    searchToggle.setAttribute('aria-expanded', 'false');
    scrollToLatest();
  };

  const setMembersPanelState = (isOpen) => {
    if (!membersToggle || !membersPanel) return;
    document.body.classList.toggle('is-members-open', isOpen);
    membersToggle.classList.toggle('is-active', isOpen);
    membersToggle.setAttribute('aria-expanded', String(isOpen));
    membersPanel.setAttribute('aria-hidden', String(!isOpen));
  };

  const toggleMembersPanel = () => {
    const isOpen = document.body.classList.contains('is-members-open');
    setMembersPanelState(!isOpen);
  };

  const setPinsPanelState = (isOpen) => {
    if (!pinsToggle || !pinsPanel) return;
    pinsPanel.hidden = !isOpen;
    pinsToggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      setChannelMenuState(false);
      if (searchForm && !searchForm.hidden) closeSearch();
    }
  };

  const setChannelMenuState = (isOpen) => {
    if (!menuToggle || !channelMenu) return;
    channelMenu.hidden = !isOpen;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      setPinsPanelState(false);
      if (searchForm && !searchForm.hidden) closeSearch();
    }
  };

  const formatAudioTime = (totalSeconds) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const stopAudioDraftTimer = () => {
    if (!audioDraftTimer) return;
    window.clearInterval(audioDraftTimer);
    audioDraftTimer = null;
  };

  const resetAudioDraft = () => {
    stopAudioDraftTimer();
    audioDraftSeconds = 0;
    if (audioTime) audioTime.textContent = '00:00';
    audioDraft?.setAttribute('hidden', '');
    audioButton?.classList.remove('is-recording');
    syncSubmitState();
  };

  const startAudioDraft = () => {
    if (!audioDraft) return;
    audioDraft.removeAttribute('hidden');
    audioButton?.classList.add('is-recording');
    if (audioTime) audioTime.textContent = formatAudioTime(audioDraftSeconds);
    stopAudioDraftTimer();
    audioDraftTimer = window.setInterval(() => {
      audioDraftSeconds += 1;
      if (audioTime) audioTime.textContent = formatAudioTime(audioDraftSeconds);
      syncSubmitState();
    }, 1000);
    syncSubmitState();
  };

  const resetImageDraft = () => {
    imageDraftSrc = '';
    if (imagePreview) imagePreview.src = '';
    imageDraft?.setAttribute('hidden', '');
    if (imageInput) imageInput.value = '';
    syncSubmitState();
  };

  const createOwnImageMessage = (src) => {
    const article = document.createElement('article');
    article.className = 'community-message community-message--own community-message--media';
    article.innerHTML = `
      <span class="community-message__avatar">DK</span>
      <div class="community-message__content">
        <div class="community-message__meta"><strong>Gabriel</strong><span>Você • agora</span></div>
        <figure class="community-message__image"><img alt="Imagem anexada"></figure>
        <div class="community-message__actions"><button type="button">Editar</button><button type="button">Responder</button></div>
      </div>
    `;
    article.querySelector('img').src = src;
    return article;
  };

  const createOwnAudioMessage = (duration) => {
    const article = document.createElement('article');
    article.className = 'community-message community-message--own community-message--audio';
    article.innerHTML = `
      <span class="community-message__avatar">DK</span>
      <div class="community-message__content">
        <div class="community-message__meta"><strong>Gabriel</strong><span>Você • agora</span></div>
        <div class="community-message-audio" aria-label="Áudio enviado">
          <span class="community-message-audio__play">▶</span>
          <span class="community-message-audio__track"></span>
          <span class="community-message-audio__duration"></span>
        </div>
        <div class="community-message__actions"><button type="button">Editar</button><button type="button">Responder</button></div>
      </div>
    `;
    article.querySelector('.community-message-audio__duration').textContent = duration;
    return article;
  };

  const createOwnMessage = (text) => {
    const article = document.createElement('article');
    article.className = 'community-message community-message--own';
    article.innerHTML = `
      <span class="community-message__avatar">DK</span>
      <div class="community-message__content">
        <div class="community-message__meta"><strong>Gabriel</strong><span>Você • agora</span></div>
        <p></p>
        <div class="community-message__actions"><button type="button">Editar</button><button type="button">Responder</button></div>
      </div>
    `;
    article.querySelector('p').textContent = text;
    return article;
  };

  input?.addEventListener('input', () => {
    syncSubmitState();
    autoResizeComposer();
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input?.value.trim() || '';

    if (audioDraft && !audioDraft.hidden) {
      const duration = formatAudioTime(Math.max(audioDraftSeconds, 1));
      messages.appendChild(createOwnAudioMessage(duration));
      resetAudioDraft();
      if (input) input.value = '';
      syncSubmitState();
      autoResizeComposer();
      scrollToLatest();
      input?.focus();
      return;
    }

    if (imageDraftSrc) {
      messages.appendChild(createOwnImageMessage(imageDraftSrc));
      resetImageDraft();
      if (input) input.value = '';
      syncSubmitState();
      autoResizeComposer();
      scrollToLatest();
      input?.focus();
      return;
    }

    if (!value) return;
    messages.appendChild(createOwnMessage(value));
    if (input) input.value = '';
    syncSubmitState();
    autoResizeComposer();
    scrollToLatest();
    input?.focus();
  });

  searchToggle?.addEventListener('click', () => {
    if (!searchForm) return;
    searchForm.hidden ? openSearch() : closeSearch();
  });

  searchInput?.addEventListener('input', filterMessages);

  searchClear?.addEventListener('click', () => {
    if (!searchInput) return;
    searchInput.value = '';
    filterMessages();
    searchInput.focus();
  });

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  imageInput?.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      imageDraftSrc = String(reader.result || '');
      if (imagePreview) imagePreview.src = imageDraftSrc;
      imageDraft?.removeAttribute('hidden');
      syncSubmitState();
    };
    reader.readAsDataURL(file);
  });

  imageCancel?.addEventListener('click', (event) => {
    event.preventDefault();
    resetImageDraft();
    input?.focus();
  });

  audioButton?.addEventListener('click', () => {
    if (audioDraft && !audioDraft.hidden) {
      resetAudioDraft();
      input?.focus();
      return;
    }
    startAudioDraft();
  });

  audioCancel?.addEventListener('click', (event) => {
    event.preventDefault();
    resetAudioDraft();
    input?.focus();
  });

  emojiButton?.addEventListener('click', () => {
    if (!input) return;
    input.value = `${input.value || ''} 🙂`;
    input.focus();
    syncSubmitState();
    autoResizeComposer();
  });

  membersToggle?.addEventListener('click', toggleMembersPanel);
  pinsToggle?.addEventListener('click', () => setPinsPanelState(Boolean(pinsPanel?.hidden)));
  pinsClose?.addEventListener('click', () => setPinsPanelState(false));
  menuToggle?.addEventListener('click', () => setChannelMenuState(Boolean(channelMenu?.hidden)));

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const clickedPins = target.closest('[data-community-pins-panel], [data-community-pins-toggle]');
    const clickedMenu = target.closest('[data-community-menu], [data-community-menu-toggle]');
    if (!clickedPins) setPinsPanelState(false);
    if (!clickedMenu) setChannelMenuState(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && searchForm && !searchForm.hidden) {
      closeSearch();
    }
    if (event.key === 'Escape' && document.body.classList.contains('is-members-open')) {
      setMembersPanelState(false);
    }
    if (event.key === 'Escape') {
      setPinsPanelState(false);
      setChannelMenuState(false);
    }
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      autoResizeComposer();
      scrollToStart();
    });
  });

  setMembersPanelState(false);
  syncSubmitState();
  autoResizeComposer();
  window.addEventListener('pageshow', scrollToStart);
  window.addEventListener('resize', () => {
    autoResizeComposer();
  });
});
