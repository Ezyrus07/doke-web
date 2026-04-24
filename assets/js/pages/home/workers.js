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
      poster: "https://images.pexels.com/photos/7492582/pexels-photo-7492582.jpeg?cs=srgb&dl=pexels-cottonbro-7492582.jpg&fm=jpg&w=900&fit=crop&auto=compress",
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
      poster: "https://images.pexels.com/photos/4933252/pexels-photo-4933252.jpeg?cs=srgb&dl=pexels-curtis-adams-1694007-4933252.jpg&fm=jpg&w=900&fit=crop&auto=compress",
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
      poster: "https://images.pexels.com/photos/7647233/pexels-photo-7647233.jpeg?cs=srgb&dl=pexels-anastasia-shuraeva-7647233.jpg&fm=jpg&w=900&fit=crop&auto=compress",
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
      poster: "https://images.pexels.com/photos/6195951/pexels-photo-6195951.jpeg?cs=srgb&dl=pexels-tima-miroshnichenko-6195951.jpg&fm=jpg&w=900&fit=crop&auto=compress",
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
    }
  ];

  const WORKERS_BY_ID = Object.fromEntries(WORKERS.map((item, index) => [item.id, { item, index }]));

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
          <div class="worker-preview__creator">
            <span class="worker-preview__avatar">${item.avatar}</span>
            <div class="worker-preview__creator-copy">
              <div class="worker-preview__name-line">
                <strong>${item.author}</strong>
                <a href="${item.secondaryHref}">Ver perfil</a>
              </div>
              <span>${item.category} • ${item.duration}</span>
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

  return {
    create({ signal } = {}) {
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

      const syncCommentsVisibility = () => {
        const visible = root.classList.contains('comments-visible');
        commentsToggle?.setAttribute('aria-label', visible ? 'Ocultar comentários' : 'Mostrar comentários');
        commentButtons.forEach((button, index) => {
          const isCurrent = index === activeIndex;
          button.classList.toggle('is-active', visible && isCurrent);
          button.setAttribute('aria-label', visible && isCurrent ? 'Ocultar comentários' : 'Abrir comentários');
        });
      };

      const lockViewport = () => {
        lockedScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.top = `-${lockedScrollY}px`;
        document.body.classList.add('worker-preview-open');
      };

      const unlockViewport = () => {
        const top = document.body.style.top;
        document.body.classList.remove('worker-preview-open');
        document.body.style.top = '';
        const nextScrollY = top ? Math.abs(parseInt(top, 10)) || lockedScrollY : lockedScrollY;
        window.scrollTo(0, nextScrollY);
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
          pauseAll();
          const playback = video.play();
          if (playback?.catch) playback.catch(() => {});
        }
      };

      const togglePlayback = (index) => {
        const item = WORKERS[index];
        const video = videos[index];
        const button = playButtons[index];
        if (!video || !button) return;

        if (video.paused) {
          ensureVideoLoaded(video, item);
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
          lockViewport();
        }
        root.hidden = false;
        root.setAttribute('aria-hidden', 'false');
        root.classList.remove('comments-visible');
        scrollToIndex(match.index);
        syncCommentsVisibility();
      };

      const close = () => {
        if (root.hidden) return;
        pauseAll();
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        root.classList.remove('comments-visible');
        syncCommentsVisibility();
        unlockViewport();
        triggers.forEach((trigger) => trigger.classList.remove('is-active'));
        if (lastTrigger) lastTrigger.focus();
      };

      const observer = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number(visible.target.dataset.workerIndex);
        updateActive(index);
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
        if (event.key === 'Escape') close();
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
