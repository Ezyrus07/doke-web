window.DokeHomeWorkers = (() => {
  const DEMO_VIDEO = "assets/media/workers/worker-demo.mp4";

  const WORKERS = [
    {
      id: "vid-pintura",
      title: "Como renovar parede sem sujeira",
      author: "Carlos Andrade",
      avatar: "CA",
      category: "Pintura residencial",
      duration: "48 segundos",
      mediaClass: "video-card--one",
      poster: "https://images.pexels.com/photos/6474475/pexels-photo-6474475.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
      videoSrc: DEMO_VIDEO,
      likes: "12,4k",
      saves: "3,8k",
      commentsCount: "255",
      commentsLabel: "255 comentários",
      primaryHref: "detalhe-anuncio.html",
      secondaryHref: "perfil.html",
      comments: [
        { avatar: "MP", name: "Marina Prado", text: "Essa proteção no piso faz muita diferença. Já salvei.", time: "2 min" },
        { avatar: "RO", name: "Rafael Oliveira", text: "Tem indicação desse material para parede com textura?", time: "8 min" },
        { avatar: "CA", name: "Carlos Andrade", text: "Para textura eu costumo avaliar antes para não errar o acabamento.", time: "agora" }
      ]
    },
    {
      id: "vid-cozinha",
      title: "Antes e depois de cozinha planejada",
      author: "Studio Casa Viva",
      avatar: "SC",
      category: "Marcenaria e reforma",
      duration: "56 segundos",
      mediaClass: "video-card--two",
      poster: "https://images.pexels.com/photos/5824519/pexels-photo-5824519.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
      videoSrc: DEMO_VIDEO,
      likes: "9,1k",
      saves: "2,2k",
      commentsCount: "184",
      commentsLabel: "184 comentários",
      primaryHref: "detalhe-anuncio.html",
      secondaryHref: "perfil.html",
      comments: [
        { avatar: "LT", name: "Lucas Torres", text: "A divisão dos armários ficou muito melhor.", time: "4 min" },
        { avatar: "AM", name: "Amanda Rocha", text: "Queria ver uma solução parecida para cozinha pequena.", time: "16 min" },
        { avatar: "SC", name: "Studio Casa Viva", text: "Cozinha pequena funciona bem com torre única e bancada limpa.", time: "agora" }
      ]
    },
    {
      id: "vid-eletrica",
      title: "5 erros elétricos que custam caro",
      author: "Marcos Luz",
      avatar: "ML",
      category: "Elétrica residencial",
      duration: "41 segundos",
      mediaClass: "video-card--three",
      poster: "https://images.pexels.com/photos/8005397/pexels-photo-8005397.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
      videoSrc: DEMO_VIDEO,
      likes: "15,7k",
      saves: "4,6k",
      commentsCount: "312",
      commentsLabel: "312 comentários",
      primaryHref: "detalhe-anuncio.html",
      secondaryHref: "perfil.html",
      comments: [
        { avatar: "JV", name: "João Vitor", text: "Esse erro da tomada eu vejo direto em apartamento antigo.", time: "1 min" },
        { avatar: "BE", name: "Bruna Esteves", text: "Dá para revisar antes de trocar disjuntor?", time: "7 min" },
        { avatar: "ML", name: "Marcos Luz", text: "Sim. Primeiro é teste de carga e inspeção do quadro.", time: "agora" }
      ]
    },
    {
      id: "vid-limpeza",
      title: "Limpeza pós-obra em 40 segundos",
      author: "Elaine Santos",
      avatar: "ES",
      category: "Limpeza pós-obra",
      duration: "40 segundos",
      mediaClass: "video-card--four",
      poster: "https://images.pexels.com/photos/6197120/pexels-photo-6197120.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
      videoSrc: DEMO_VIDEO,
      likes: "8,8k",
      saves: "2,9k",
      commentsCount: "97",
      commentsLabel: "97 comentários",
      primaryHref: "detalhe-anuncio.html",
      secondaryHref: "perfil.html",
      comments: [
        { avatar: "CR", name: "Clara Reis", text: "O pó fino depois da obra é o pior. Boa dica.", time: "5 min" },
        { avatar: "PH", name: "Pedro Henrique", text: "Esse processo serve para porcelanato fosco?", time: "22 min" },
        { avatar: "ES", name: "Elaine Santos", text: "Serve, mas o produto precisa ser mais neutro para não manchar.", time: "agora" }
      ]
    },
    {
      id: "vid-manutencao",
      title: "Manutenção rápida antes da vistoria",
      author: "Rafael Gomes",
      avatar: "RG",
      category: "Manutenção residencial",
      duration: "45 segundos",
      mediaClass: "video-card--five",
      poster: "https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
      videoSrc: DEMO_VIDEO,
      likes: "7,4k",
      saves: "1,9k",
      commentsCount: "83",
      commentsLabel: "83 comentários",
      primaryHref: "detalhe-anuncio.html",
      secondaryHref: "perfil.html",
      comments: [
        { avatar: "TN", name: "Thiago Nunes", text: "Essa revisão antes da entrega evita muita dor de cabeça.", time: "3 min" },
        { avatar: "LA", name: "Lia Alves", text: "Você também confere vazamento pequeno em sifão?", time: "11 min" },
        { avatar: "RG", name: "Rafael Gomes", text: "Confiro sim. Normalmente ja resolvo na mesma visita.", time: "agora" }
      ]
    },
    {
      id: "vid-hidraulica",
      title: "Ajuste hidráulico em bancada compacta",
      author: "Nicolas Ribeiro",
      avatar: "NR",
      category: "Hidráulica residencial",
      duration: "43 segundos",
      mediaClass: "video-card--six",
      poster: "https://images.pexels.com/photos/5691622/pexels-photo-5691622.jpeg?auto=compress&cs=tinysrgb&w=1200&q=80",
      videoSrc: DEMO_VIDEO,
      likes: "6,9k",
      saves: "1,6k",
      commentsCount: "71",
      commentsLabel: "71 comentários",
      primaryHref: "detalhe-anuncio.html",
      secondaryHref: "perfil.html",
      comments: [
        { avatar: "VM", name: "Victor Martins", text: "Esse tipo de vazamento costuma aparecer só quando usa a pia.", time: "6 min" },
        { avatar: "BI", name: "Bianca Lima", text: "Dá para fazer esse ajuste sem trocar a bancada?", time: "18 min" },
        { avatar: "NR", name: "Nicolas Ribeiro", text: "Na maioria dos casos sim. Primeiro eu confiro sifão, vedação e pressão.", time: "agora" }
      ]
    }
  ];

  const WORKERS_BY_ID = Object.fromEntries(WORKERS.map((item, index) => [item.id, { item, index }]));
  const PREVIEW_HOVER_DELAY = 140;
  const previewTimes = new Map();

  const getSavedPreviewTime = (id) => Number(previewTimes.get(id) || 0);
  const setSavedPreviewTime = (id, time) => {
    if (!id || !Number.isFinite(time)) return;
    previewTimes.set(id, Math.max(0, time));
  };

  const iconHeart = '<svg viewBox="0 0 24 24"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.7 1-1a5.5 5.5 0 0 0 0-7.8Z"></path></svg>';
  const iconComment = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-8.7 8.2 9.2 9.2 0 0 1-3.7-.8L3 20l1.4-4.8A8 8 0 0 1 3.6 12 8.4 8.4 0 0 1 12.3 3.8 8.4 8.4 0 0 1 21 11.5Z"></path></svg>';
  const iconSave = '<svg viewBox="0 0 24 24"><path d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v14l-7-4-7 4V6a1.5 1.5 0 0 1 1.5-1.5Z"></path></svg>';
  const iconShare = '<svg viewBox="0 0 24 24"><path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4 20-7Z"></path></svg>';

  const createFeedItem = (item, index) => `
    <article class="worker-preview__item" data-worker-feed-item data-worker-index="${index}" data-worker-id="${item.id}">
      <div class="worker-preview__reel">
        <video class="worker-preview__video" data-worker-video muted loop playsinline preload="metadata" poster="${item.poster}"></video>
        <div class="worker-preview__shade"></div>

        <button class="worker-preview__play" type="button" data-worker-play aria-label="Reproduzir vídeo">
          <span>▶</span>
        </button>

        <div class="worker-preview__caption">
          <h3 class="worker-preview__title">${item.title}</h3>
          <p class="worker-preview__subtitle">${item.category}</p>
          <div class="worker-preview__creator">
            <span class="worker-preview__avatar">${item.avatar}</span>
            <div class="worker-preview__creator-copy">
              <div class="worker-preview__name-line">
                <strong>${item.author}</strong>
                <a href="${item.secondaryHref}">Ver perfil</a>
              </div>
              <span>${item.duration}</span>
              <span>${item.title}</span>
            </div>
          </div>

          <a class="worker-preview__service" href="${item.primaryHref}">Ver serviço</a>
        </div>
      </div>

      <aside class="worker-preview__actions" aria-label="Ações do worker">
        <button class="worker-preview__action" type="button" data-worker-like-button data-like-count="${item.likes}" aria-label="Curtir worker">
          <span class="worker-preview__action-icon" aria-hidden="true">${iconHeart}</span>
          <strong>${item.likes}</strong>
        </button>
        <button class="worker-preview__action" type="button" data-worker-comments-button aria-label="Abrir comentários">
          <span class="worker-preview__action-icon" aria-hidden="true">${iconComment}</span>
          <strong>${item.commentsCount}</strong>
        </button>
        <button class="worker-preview__action" type="button" aria-label="Salvar worker">
          <span class="worker-preview__action-icon" aria-hidden="true">${iconSave}</span>
          <strong>${item.saves}</strong>
        </button>
        <button class="worker-preview__action" type="button" aria-label="Compartilhar worker">
          <span class="worker-preview__action-icon" aria-hidden="true">${iconShare}</span>
          <strong>Enviar</strong>
        </button>
      </aside>
    </article>
  `;

  const hydratePreviewCards = ({ signal } = {}) => {
    const cards = [...document.querySelectorAll('.video-card[data-worker-trigger]')];
    const eagerProfilePreview = document.body.classList.contains('profile-page-shell');
    cards.forEach((card) => {
      const record = WORKERS_BY_ID[card.dataset.workerId || '']?.item;
      if (!record || card.dataset.workerPreviewHydrated === '1') return;
      card.dataset.workerPreviewHydrated = '1';
      card.style.setProperty('--worker-card-poster', `url("${record.poster}")`);

      const poster = document.createElement('img');
      poster.className = 'video-card__poster';
      poster.src = record.poster;
      poster.alt = '';
      poster.loading = 'lazy';
      poster.decoding = 'async';
      poster.setAttribute('aria-hidden', 'true');

      const video = document.createElement('video');
      video.className = 'video-card__preview';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.poster = record.poster;
      video.setAttribute('aria-hidden', 'true');

      card.prepend(video);
      card.prepend(poster);

      let hoverTimer = 0;

      const loadVideo = () => {
        if (!video.getAttribute('src')) {
          video.setAttribute('src', record.videoSrc);
          video.load();
        }
      };

      if (eagerProfilePreview) {
        loadVideo();
      }

      const start = () => {
        window.clearTimeout(hoverTimer);
        hoverTimer = window.setTimeout(() => {
          loadVideo();
          const savedTime = getSavedPreviewTime(record.id);
          if (savedTime > 0 && Math.abs(video.currentTime - savedTime) > 0.35) {
            try { video.currentTime = savedTime; } catch (_) {}
          }
          video.muted = true;
          const playback = video.play();
          if (playback?.catch) playback.catch(() => {});
          card.classList.add('is-previewing');
        }, PREVIEW_HOVER_DELAY);
      };

      const stop = () => {
        window.clearTimeout(hoverTimer);
        if (!video.paused) setSavedPreviewTime(record.id, video.currentTime);
        video.pause();
        card.classList.remove('is-previewing');
      };

      video.addEventListener('timeupdate', () => setSavedPreviewTime(record.id, video.currentTime), { signal });
      card.addEventListener('mouseenter', start, { signal });
      card.addEventListener('pointerenter', start, { signal });
      card.addEventListener('focusin', start, { signal });
      card.addEventListener('mouseleave', stop, { signal });
      card.addEventListener('pointerleave', stop, { signal });
      card.addEventListener('focusout', stop, { signal });
    });
  };

  return {
    hydratePreviewCards,
    getWorker(id) { return WORKERS_BY_ID[id]?.item || null; },
    create({ signal } = {}) {
      hydratePreviewCards({ signal });
      const triggers = [...document.querySelectorAll('[data-worker-trigger]')];
      const root = document.querySelector('[data-worker-preview]');
      const feed = root?.querySelector('[data-worker-preview-feed]');
      if (!triggers.length || !root || !feed) return () => {};

      feed.innerHTML = WORKERS.map(createFeedItem).join("");

      const items = [...feed.querySelectorAll('[data-worker-feed-item]')];
      const videos = [...feed.querySelectorAll('[data-worker-video]')];
      const playButtons = [...feed.querySelectorAll('[data-worker-play]')];
      const likeButtons = [...feed.querySelectorAll('[data-worker-like-button]')];
      const commentButtons = [...feed.querySelectorAll('[data-worker-comments-button]')];
      const commentsPanel = root.querySelector('[data-worker-preview-comments]');
      const commentsList = root.querySelector('[data-worker-preview-comments-list]');
      const commentsToggle = root.querySelector('[data-worker-preview-comments-toggle]');
      const commentCountLabel = root.querySelector('[data-worker-preview-comment-count]');
      const closeButtons = root.querySelectorAll('[data-worker-preview-close]');


      let lastTrigger = null;
      let activeIndex = 0;
      let lockedScrollY = 0;
      let lockedAnchor = null;
      let viewportLocked = false;

      const parseCompactCount = (value) => {
        if (typeof value === 'number') return value;
        const normalized = String(value || '0').trim().toLowerCase().replace(/\s+/g, '');
        if (!normalized) return 0;
        if (normalized.endsWith('k')) {
          return Math.round(parseFloat(normalized.replace('k', '').replace(',', '.')) * 1000);
        }
        return parseInt(normalized.replace(/\D/g, ''), 10) || 0;
      };

      const formatCompactCount = (value) => {
        if (value >= 1000) {
          const compact = (value / 1000).toFixed(1).replace('.', ',');
          return `${compact}k`;
        }
        return `${value}`;
      };

      const isMobileCommentsSheet = () => window.matchMedia('(max-width: 760px)').matches;

      const syncCommentsVisibility = () => {
        const visible = root.classList.contains('comments-visible');
        commentsToggle?.setAttribute('aria-label', visible ? 'Ocultar comentários' : 'Mostrar comentários');
        commentButtons.forEach((button, index) => {
          const isCurrent = index === activeIndex;
          button.classList.toggle('is-active', visible && isCurrent);
          button.setAttribute('aria-label', visible && isCurrent ? 'Ocultar comentários' : 'Abrir comentários');
        });
      };

      const lockViewport = (anchor = null) => {
        viewportLocked = true;
        lockedScrollY = window.scrollY || window.pageYOffset || 0;
        lockedAnchor = anchor ? {
          node: anchor,
          top: anchor.getBoundingClientRect().top
        } : null;
        document.body.style.top = `-${lockedScrollY}px`;
        document.body.classList.add('worker-preview-open');
      };

      const unlockViewport = () => {
        if (!viewportLocked) return;
        viewportLocked = false;
        const top = document.body.style.top;
        document.body.classList.remove('worker-preview-open');
        document.body.style.top = '';
        const nextScrollY = top ? Math.abs(parseInt(top, 10)) || lockedScrollY : lockedScrollY;
        const restore = () => window.scrollTo({ top: nextScrollY, behavior: 'auto' });
        const restoreAnchor = () => {
          if (!lockedAnchor?.node?.isConnected) return;
          const currentTop = lockedAnchor.node.getBoundingClientRect().top;
          window.scrollTo({ top: Math.max(0, window.scrollY + currentTop - lockedAnchor.top), behavior: 'auto' });
        };
        restore();
        window.requestAnimationFrame(restore);
        window.setTimeout(restore, 50);
        window.setTimeout(() => {
          restore();
          restoreAnchor();
        }, 180);
        window.setTimeout(() => {
          restoreAnchor();
          lockedAnchor = null;
        }, 420);
      };

      const renderComments = (item) => {
        if (!commentsList) return;
        commentCountLabel.textContent = item.commentsLabel;
        commentsList.innerHTML = item.comments.map((comment, index) => {
          const likes = comment.likes || `${(index + 1) * 3} curtidas`;
          const replies = comment.replies || (index === 0 ? 'Responder' : 'Ver respostas');
          return `
            <article class="worker-preview__comment">
              <span class="worker-preview__comment-avatar">${comment.avatar}</span>
              <div class="worker-preview__comment-body">
                <div class="worker-preview__comment-head">
                  <strong>${comment.name}</strong>
                  <span>${comment.time}</span>
                </div>
                <p>${comment.text}</p>
                <div class="worker-preview__comment-meta">
                  <button type="button" class="worker-preview__comment-action" aria-label="Curtir comentário de ${comment.name}">Curtir</button>
                  <span>${likes}</span>
                  <button type="button" class="worker-preview__comment-action" aria-label="Responder comentário de ${comment.name}">${replies}</button>
                </div>
              </div>
            </article>
          `;
        }).join("");
      };

      const pauseAll = () => {
        videos.forEach((video, index) => {
          video.pause();
          playButtons[index]?.classList.remove('is-playing');
          playButtons[index].querySelector('span').textContent = '▶';
        });
      };

      const ensureVideoLoaded = (video, item) => {
        if (!video.getAttribute('src')) {
          video.setAttribute('src', item.videoSrc);
          video.load();
        }
      };

      const resumeFromPreview = (video, item) => {
        const savedTime = getSavedPreviewTime(item.id);
        if (savedTime <= 0) return;
        try {
          if (Math.abs(video.currentTime - savedTime) > 0.35) video.currentTime = savedTime;
        } catch (_) {}
      };

      const updateActive = (index, { autoplay = false } = {}) => {
        activeIndex = Math.max(0, Math.min(WORKERS.length - 1, index));
        const item = WORKERS[activeIndex];
        items.forEach((node, itemIndex) => node.classList.toggle('is-active', itemIndex === activeIndex));
        triggers.forEach((trigger) => trigger.classList.toggle('is-active', trigger.dataset.workerId === item.id));
        renderComments(item);
        syncCommentsVisibility();

        if (autoplay) {
          const video = videos[activeIndex];
          ensureVideoLoaded(video, item);
          resumeFromPreview(video, item);
          pauseAll();
          const playback = video.play();
          if (playback?.catch) playback.catch(() => {});
          playButtons[activeIndex]?.classList.add('is-playing');
          const activeIcon = playButtons[activeIndex]?.querySelector('span');
          if (activeIcon) activeIcon.textContent = '❚❚';
        }
      };

      const togglePlayback = (index) => {
        const item = WORKERS[index];
        const video = videos[index];
        const button = playButtons[index];
        if (!video || !button) return;

        if (video.paused) {
          ensureVideoLoaded(video, item);
          resumeFromPreview(video, item);
          pauseAll();
          const playback = video.play();
          if (playback?.catch) playback.catch(() => {});
          button.classList.add('is-playing');
          button.querySelector('span').textContent = '❚❚';
        } else {
          video.pause();
          button.classList.remove('is-playing');
          button.querySelector('span').textContent = '▶';
        }
      };

      const scrollToIndex = (index, { autoplay = false } = {}) => {
        updateActive(index, { autoplay });
        items[activeIndex]?.scrollIntoView({ behavior: 'auto', block: 'center' });
      };

      const open = (id, trigger) => {
        const match = WORKERS_BY_ID[id];
        if (!match) return;
        lastTrigger = trigger || lastTrigger;
        if (!document.body.classList.contains('worker-preview-open')) {
          lockViewport(lastTrigger);
        }
        root.hidden = false;
        root.setAttribute('aria-hidden', 'false');
        root.classList.remove('comments-visible');
        scrollToIndex(match.index, { autoplay: true });
        syncCommentsVisibility();
      };

      window.DokeOpenWorkerPreview = open;

      const close = () => {
        if (root.hidden) return;
        pauseAll();
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        root.classList.remove('comments-visible');
        syncCommentsVisibility();
        unlockViewport();
        triggers.forEach((trigger) => trigger.classList.remove('is-active'));
        if (lastTrigger) lastTrigger.focus({ preventScroll: true });
      };

      const observer = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number(visible.target.dataset.workerIndex);
        if (!root.hidden) updateActive(index, { autoplay: true });
      }, {
        root: feed,
        threshold: [0.35, 0.6, 0.82]
      });

      items.forEach((item) => observer.observe(item));

      triggers.forEach((trigger) => {
        const openFromTrigger = () => open(trigger.dataset.workerId, trigger);
        trigger.addEventListener('click', openFromTrigger, { signal });
        trigger.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFromTrigger();
          }
        }, { signal });
      });

      playButtons.forEach((button, index) => {
        button.addEventListener('click', () => togglePlayback(index), { signal });
      });

      videos.forEach((video, index) => {
        video.addEventListener('click', () => togglePlayback(index), { signal });
        video.addEventListener('timeupdate', () => setSavedPreviewTime(WORKERS[index]?.id, video.currentTime), { signal });
        video.addEventListener('play', () => {
          playButtons[index]?.classList.add('is-playing');
          playButtons[index].querySelector('span').textContent = '❚❚';
        }, { signal });
        video.addEventListener('pause', () => {
          playButtons[index]?.classList.remove('is-playing');
          playButtons[index].querySelector('span').textContent = '▶';
        }, { signal });
      });

      likeButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const current = parseCompactCount(button.dataset.likeCount);
          const liked = button.classList.toggle('is-active');
          const next = liked ? current + 1 : Math.max(0, current - 1);
          button.dataset.likeCount = `${next}`;
          const label = formatCompactCount(next);
          const counter = button.querySelector('strong');
          if (counter) counter.textContent = label;
          button.setAttribute('aria-label', liked ? 'Descurtir worker' : 'Curtir worker');
        }, { signal });
      });

      commentButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
          const wasVisible = root.classList.contains('comments-visible');
          const wasSameItem = activeIndex === index;
          updateActive(index);
          const shouldShow = !(wasVisible && wasSameItem);
          root.classList.toggle('comments-visible', shouldShow);
          if (shouldShow && isMobileCommentsSheet()) {
            window.requestAnimationFrame(() => {
              commentsPanel?.querySelector('input')?.focus({ preventScroll: true });
            });
          }
          syncCommentsVisibility();
        }, { signal });
      });

      commentsToggle?.addEventListener('click', () => {
        root.classList.remove('comments-visible');
        syncCommentsVisibility();
      }, { signal });

      closeButtons.forEach((button) => button.addEventListener('click', close, { signal }));

      document.addEventListener('keydown', (event) => {
        if (root.hidden) return;
        if (event.key === 'Escape') {
          if (root.classList.contains('comments-visible')) {
            root.classList.remove('comments-visible');
            syncCommentsVisibility();
            return;
          }
          close();
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          scrollToIndex(activeIndex + 1);
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          scrollToIndex(activeIndex - 1);
        }
      }, { signal });

      signal?.addEventListener('abort', () => {
        observer.disconnect();
        unlockViewport();
        root.hidden = true;
        root.classList.remove('comments-visible');
        syncCommentsVisibility();
        pauseAll();
      });

      return close;
    }
  };
})();
