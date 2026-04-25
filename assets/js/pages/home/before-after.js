window.DokeHomeBeforeAfter = (() => {
  const CASES = [
    {
      id: 'case-reforma',
      title: 'Reforma completa de sala',
      provider: 'Studio Casa Viva',
      avatar: 'SC',
      rating: '4,9',
      meta: 'Marcenaria e reforma • Salvador, BA',
      visualClass: 'comparison-card__visual--reforma',
      description: 'Projeto completo com troca de marcenaria, acabamento mais claro e melhor aproveitamento da circulação. O antes e depois mostra a transformação visual sem poluir a leitura do serviço.',
      likes: '4,9k',
      commentsCount: '184',
      saves: '1,3k',
      serviceHref: 'detalhe-anuncio.html',
      profileHref: 'perfil.html',
      highlights: [
        'Marcenaria redistribuída para liberar circulação e valorizar o uso vertical.',
        'Paleta clara, bancada limpa e eletros integrados para reduzir ruído visual.',
        'Acabamentos atualizados mantendo uma leitura mais premium e comercial.'
      ],
      comments: [
        {
          avatar: 'LT',
          name: 'Lucas Torres',
          time: '4 min',
          text: 'A divisão dos armários ficou muito melhor.',
          likes: '3 curtidas',
          replies: [
            { avatar: 'SC', name: 'Studio Casa Viva', time: 'agora', text: 'Esse foi o ponto principal do projeto: liberar circulação sem perder armazenamento.', likes: '2 curtidas' }
          ]
        },
        { avatar: 'AM', name: 'Amanda Rocha', time: '16 min', text: 'Queria ver uma solução parecida para cozinha pequena.', likes: '6 curtidas' },
        { avatar: 'SC', name: 'Studio Casa Viva', time: 'agora', text: 'Cozinha pequena funciona bem com torre única e bancada limpa.', likes: '9 curtidas' }
      ]
    },
    {
      id: 'case-bathroom',
      title: 'Banheiro revitalizado sem quebra-quebra',
      provider: 'Renato Acabamentos',
      avatar: 'RA',
      rating: '4,8',
      meta: 'Acabamentos e revitalização • Salvador, BA',
      visualClass: 'comparison-card__visual--bathroom',
      description: 'Revitalização com foco em acabamento, iluminação e limpeza de obra. A comparação favorece a decisão do cliente sem transformar o modal em um painel pesado.',
      likes: '3,7k',
      commentsCount: '97',
      saves: '980',
      serviceHref: 'detalhe-anuncio.html',
      profileHref: 'perfil.html',
      highlights: [
        'Novo revestimento sobre base existente para evitar quebra excessiva.',
        'Metais e bancada renovados para elevar a percepção de cuidado.',
        'Iluminação e paleta mais claras para ampliar a sensação de espaço.'
      ],
      comments: [
        { avatar: 'BR', name: 'Bruna Reis', time: '7 min', text: 'Esse tipo de reforma sem quebrar tudo é exatamente o que eu procurava.', likes: '4 curtidas' },
        { avatar: 'PH', name: 'Pedro Henrique', time: '19 min', text: 'O acabamento ficou muito mais limpo. Dá para fazer em banheiro alugado?', likes: '2 curtidas' },
        { avatar: 'RA', name: 'Renato Acabamentos', time: 'agora', text: 'Depende do material atual, mas dá para avaliar opções reversíveis.', likes: '8 curtidas' }
      ]
    }
  ];

  const CASES_BY_ID = Object.fromEntries(CASES.map((item) => [item.id, item]));

  const iconHeart = '<svg viewBox="0 0 24 24"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.7 1-1a5.5 5.5 0 0 0 0-7.8Z"></path></svg>';
  const iconComment = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-8.7 8.2 9.2 9.2 0 0 1-3.7-.8L3 20l1.4-4.8A8 8 0 0 1 3.6 12 8.4 8.4 0 0 1 12.3 3.8 8.4 8.4 0 0 1 21 11.5Z"></path></svg>';
  const iconSave = '<svg viewBox="0 0 24 24"><path d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v14l-7-4-7 4V6a1.5 1.5 0 0 1 1.5-1.5Z"></path></svg>';
  const iconShare = '<svg viewBox="0 0 24 24"><path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4 20-7Z"></path></svg>';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

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
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.', ',')}k`;
    return `${value}`;
  };

  const formatCommentLikes = (value) => {
    const count = Number(value) || 0;
    if (count <= 0) return 'Curtir';
    return `${count} ${count === 1 ? 'curtida' : 'curtidas'}`;
  };

  const createId = (prefix = 'comment') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const normalizeComment = (comment, index = 0, parentPrefix = 'comment') => ({
    id: comment.id || `${parentPrefix}-${index}`,
    avatar: comment.avatar || 'DK',
    name: comment.name || 'Usuário',
    time: comment.time || 'agora',
    text: comment.text || '',
    likeCount: Number.isFinite(comment.likeCount) ? comment.likeCount : parseCompactCount(comment.likes),
    liked: Boolean(comment.liked),
    repliesOpen: Boolean(comment.repliesOpen),
    replies: Array.isArray(comment.replies)
      ? comment.replies.map((reply, replyIndex) => normalizeComment(reply, replyIndex, `${parentPrefix}-${index}-reply`))
      : []
  });

  const getStorageKey = (id) => `doke:before-after:${id}:state:v2`;

  const getDefaultState = (item) => ({
    liked: false,
    saved: false,
    following: false,
    likeCount: parseCompactCount(item.likes),
    saveCount: parseCompactCount(item.saves),
    commentTotal: parseCompactCount(item.commentsCount),
    comments: item.comments.map((comment, index) => normalizeComment(comment, index, `${item.id}-comment`))
  });

  const loadState = (item) => {
    const fallback = getDefaultState(item);
    try {
      const saved = JSON.parse(localStorage.getItem(getStorageKey(item.id)) || 'null');
      if (!saved || !Array.isArray(saved.comments)) return fallback;
      return {
        ...fallback,
        ...saved,
        comments: saved.comments.map((comment, index) => normalizeComment(comment, index, `${item.id}-comment`))
      };
    } catch (_) {
      return fallback;
    }
  };

  const saveState = (item, state) => {
    try {
      localStorage.setItem(getStorageKey(item.id), JSON.stringify(state));
    } catch (_) {
      // LocalStorage can be unavailable in private/restricted contexts. The UI still works in-memory.
    }
  };

  const ensureStylesheet = () => {
    const href = 'assets/css/components/before-after-workers-preview.css';
    if (document.querySelector('link[href*="before-after-workers-preview.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${href}?v=20260425-instagram-modal-v5-comments`;
    document.head.appendChild(link);
  };

  const createMediaMarkup = (item) => `
    <div class="before-after-post__media-frame" data-before-after-media-frame data-before-after-view="compare">
      <div class="comparison-card__visual ${item.visualClass}" aria-label="Comparação visual antes e depois">
        <div class="comparison-card__half comparison-card__half--before"><span>Antes</span></div>
        <div class="comparison-card__half comparison-card__half--after"><span>Depois</span></div>
        <span class="before-after-post__split-line" aria-hidden="true"></span>
      </div>

      <button class="before-after-post__media-nav before-after-post__media-nav--before" type="button" data-before-after-media-mode="before" aria-label="Ver somente a imagem de antes">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"></path></svg>
      </button>
      <button class="before-after-post__media-nav before-after-post__media-nav--after" type="button" data-before-after-media-mode="after" aria-label="Ver somente a imagem de depois">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>
      </button>

      <div class="before-after-post__media-switch" role="group" aria-label="Alternar visualização do antes e depois">
        <button type="button" data-before-after-media-mode="before">Antes</button>
        <button class="is-active" type="button" data-before-after-media-mode="compare">Comparar</button>
        <button type="button" data-before-after-media-mode="after">Depois</button>
      </div>
    </div>
  `;

  const buildStructure = (root) => {
    const dialog = root.querySelector('.before-after-preview__dialog');
    if (!dialog || dialog.dataset.instagramLayout === 'v5-comments') return;

    dialog.dataset.instagramLayout = 'v5-comments';
    dialog.innerHTML = `
      <button class="before-after-preview__close before-after-preview__close--fixed" type="button" data-before-after-close aria-label="Fechar antes e depois">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
      </button>

      <article class="before-after-post" role="dialog" aria-modal="true" aria-label="Publicação antes e depois">
        <section class="before-after-post__viewer" aria-label="Mídia do antes e depois">
          <div class="before-after-post__media" data-before-after-preview-media></div>
        </section>

        <aside class="before-after-post__sidebar" aria-label="Comentários do antes e depois">
          <header class="before-after-post__header">
            <a class="before-after-post__author" data-before-after-preview-profile href="perfil.html">
              <span class="before-after-post__avatar" data-before-after-preview-avatar>DK</span>
              <span class="before-after-post__author-copy">
                <strong data-before-after-preview-provider>—</strong>
                <small><span class="before-after-post__rating">★ <b data-before-after-preview-rating>—</b></span><span data-before-after-preview-meta>—</span></small>
              </span>
            </a>
            <button class="before-after-post__follow" type="button" data-before-after-follow>Seguir</button>
            <button class="before-after-post__more" type="button" aria-label="Mais opções">
              <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
            </button>
          </header>

          <div class="before-after-post__comments-head">
            <strong><span data-before-after-comment-count>0</span> comentários</strong>
            <button class="before-after-post__comments-close" type="button" data-before-after-close aria-label="Fechar comentários">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
            </button>
          </div>

          <div class="before-after-post__comments-scroll" data-before-after-comments>
            <article class="before-after-post__caption">
              <span class="before-after-post__avatar before-after-post__avatar--sm" data-before-after-preview-avatar>DK</span>
              <div class="before-after-post__caption-copy">
                <p><strong data-before-after-preview-provider>—</strong> <b data-before-after-preview-title>—</b> <span data-before-after-preview-description>—</span></p>
                <div class="before-after-post__changes">
                  <span>O que mudou</span>
                  <ul data-before-after-preview-highlights></ul>
                </div>
                <time>há 18 horas</time>
              </div>
            </article>

            <div class="before-after-post__comments-list" data-before-after-comments-list></div>
          </div>

          <footer class="before-after-post__footer">
            <div class="before-after-post__actions" aria-label="Ações do antes e depois">
              <div class="before-after-post__actions-left">
                <button class="before-after-post__action before-after-post__action--like" type="button" data-before-after-like-button aria-label="Curtir caso">
                  <span aria-hidden="true">${iconHeart}</span>
                </button>
                <button class="before-after-post__action before-after-post__action--comment" type="button" data-before-after-comments-focus aria-label="Comentar">
                  <span aria-hidden="true">${iconComment}</span>
                </button>
                <button class="before-after-post__action before-after-post__action--share" type="button" data-before-after-share aria-label="Compartilhar caso">
                  <span aria-hidden="true">${iconShare}</span>
                </button>
              </div>
              <button class="before-after-post__action before-after-post__action--save" type="button" data-before-after-save-button aria-label="Salvar caso">
                <span aria-hidden="true">${iconSave}</span>
              </button>
            </div>

            <div class="before-after-post__engagement">
              <strong><span data-before-after-like-count>0</span> curtidas</strong>
              <button type="button" data-before-after-comments-focus>Ver todos os <span data-before-after-comment-count>0</span> comentários</button>
            </div>

            <div class="before-after-post__timestamp">
              <span>há 18 horas</span>
              <a data-before-after-preview-service href="detalhe-anuncio.html">Ver serviço</a>
            </div>

            <form class="before-after-post__comment-input" data-before-after-comment-form autocomplete="off">
              <span class="before-after-post__mini-avatar">DK</span>
              <div class="before-after-post__comment-field">
                <span class="before-after-post__replying" data-before-after-replying hidden>
                  Respondendo a <b></b>
                  <button type="button" data-before-after-cancel-reply aria-label="Cancelar resposta">cancelar</button>
                </span>
                <input type="text" data-before-after-comment-input placeholder="Adicione um comentário..." aria-label="Adicionar comentário" maxlength="220">
              </div>
              <button type="submit" data-before-after-comment-submit disabled>Publicar</button>
            </form>
          </footer>
        </aside>
      </article>
    `;
  };

  return {
    create({ signal } = {}) {
      ensureStylesheet();

      const triggers = [...document.querySelectorAll('[data-before-after-trigger]')];
      const root = document.querySelector('[data-before-after-preview]');
      if (!triggers.length || !root) return () => {};

      buildStructure(root);

      const mediaHost = root.querySelector('[data-before-after-preview-media]');
      const titles = [...root.querySelectorAll('[data-before-after-preview-title]')];
      const avatars = [...root.querySelectorAll('[data-before-after-preview-avatar]')];
      const providers = [...root.querySelectorAll('[data-before-after-preview-provider]')];
      const metas = [...root.querySelectorAll('[data-before-after-preview-meta]')];
      const rating = root.querySelector('[data-before-after-preview-rating]');
      const description = root.querySelector('[data-before-after-preview-description]');
      const highlights = root.querySelector('[data-before-after-preview-highlights]');
      const serviceLinks = [...root.querySelectorAll('[data-before-after-preview-service]')];
      const profileLinks = [...root.querySelectorAll('[data-before-after-preview-profile]')];
      const likeButton = root.querySelector('[data-before-after-like-button]');
      const likeCountNodes = [...root.querySelectorAll('[data-before-after-like-count]')];
      const saveButton = root.querySelector('[data-before-after-save-button]');
      const commentCountNodes = [...root.querySelectorAll('[data-before-after-comment-count]')];
      const commentsRegion = root.querySelector('[data-before-after-comments]');
      const commentsList = root.querySelector('[data-before-after-comments-list]');
      const commentsFocusButtons = [...root.querySelectorAll('[data-before-after-comments-focus]')];
      const closeButtons = [...root.querySelectorAll('[data-before-after-close]')];
      const followButton = root.querySelector('[data-before-after-follow]');
      const shareButton = root.querySelector('[data-before-after-share]');
      const commentForm = root.querySelector('[data-before-after-comment-form]');
      const commentInput = root.querySelector('[data-before-after-comment-input]');
      const commentSubmit = root.querySelector('[data-before-after-comment-submit]');
      const replyingHint = root.querySelector('[data-before-after-replying]');
      const cancelReply = root.querySelector('[data-before-after-cancel-reply]');

      let currentMediaView = 'compare';
      let currentItem = null;
      let currentState = null;
      let replyTargetId = null;
      let lockedScrollY = 0;
      let lastTrigger = null;

      const lockViewport = () => {
        lockedScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.top = `-${lockedScrollY}px`;
        document.body.classList.add('before-after-preview-open');
      };

      const unlockViewport = () => {
        const top = document.body.style.top;
        document.body.classList.remove('before-after-preview-open');
        document.body.style.top = '';
        const nextScrollY = top ? Math.abs(parseInt(top, 10)) || lockedScrollY : lockedScrollY;
        window.scrollTo(0, nextScrollY);
      };

      const syncFormState = () => {
        if (!commentInput || !commentSubmit) return;
        commentSubmit.disabled = commentInput.value.trim().length === 0;
      };

      const clearReplyTarget = () => {
        replyTargetId = null;
        if (replyingHint) {
          replyingHint.hidden = true;
          const nameNode = replyingHint.querySelector('b');
          if (nameNode) nameNode.textContent = '';
        }
        if (commentInput) commentInput.placeholder = 'Adicione um comentário...';
      };

      const findComment = (comments, id) => comments.find((comment) => comment.id === id);

      const getReplyTarget = () => currentState ? findComment(currentState.comments, replyTargetId) : null;

      const focusCommentInput = () => {
        commentsRegion?.scrollTo({ top: commentsRegion.scrollHeight, behavior: 'smooth' });
        window.requestAnimationFrame(() => commentInput?.focus({ preventScroll: true }));
      };

      const setReplyTarget = (commentId) => {
        const target = currentState ? findComment(currentState.comments, commentId) : null;
        if (!target) return;
        replyTargetId = commentId;
        if (replyingHint) {
          replyingHint.hidden = false;
          const nameNode = replyingHint.querySelector('b');
          if (nameNode) nameNode.textContent = target.name;
        }
        if (commentInput) commentInput.placeholder = `Responder a ${target.name}...`;
        focusCommentInput();
      };

      const syncStateUI = () => {
        if (!currentState || !currentItem) return;

        likeButton?.classList.toggle('is-active', currentState.liked);
        likeButton?.setAttribute('aria-label', currentState.liked ? 'Descurtir caso' : 'Curtir caso');
        saveButton?.classList.toggle('is-active', currentState.saved);
        saveButton?.setAttribute('aria-label', currentState.saved ? 'Remover dos salvos' : 'Salvar caso');

        if (followButton) {
          followButton.classList.toggle('is-active', currentState.following);
          followButton.textContent = currentState.following ? 'Seguindo' : 'Seguir';
          followButton.setAttribute('aria-label', currentState.following ? `Deixar de seguir ${currentItem.provider}` : `Seguir ${currentItem.provider}`);
        }

        likeCountNodes.forEach((node) => { node.textContent = formatCompactCount(currentState.likeCount); });
        commentCountNodes.forEach((node) => { node.textContent = formatCompactCount(currentState.commentTotal); });
      };

      const createCommentMarkup = (comment, { isReply = false } = {}) => {
        const repliesCount = comment.replies?.length || 0;
        const ariaName = escapeHtml(comment.name);
        return `
          <article class="before-after-post__comment${isReply ? ' before-after-post__comment--reply' : ''}" data-comment-id="${escapeHtml(comment.id)}">
            <span class="before-after-post__avatar before-after-post__avatar--sm">${escapeHtml(comment.avatar)}</span>
            <div class="before-after-post__comment-body">
              <div class="before-after-post__comment-head">
                <strong>${escapeHtml(comment.name)}</strong>
                <span>${escapeHtml(comment.time)}</span>
              </div>
              <p>${escapeHtml(comment.text)}</p>
              <div class="before-after-post__comment-meta">
                <button class="before-after-post__comment-like-text${comment.liked ? ' is-active' : ''}" type="button" data-before-after-comment-like aria-label="Curtir comentário de ${ariaName}">${formatCommentLikes(comment.likeCount)}</button>
                ${!isReply ? `<button type="button" data-before-after-reply="${escapeHtml(comment.id)}">Responder</button>` : ''}
                ${!isReply && repliesCount ? `<button type="button" data-before-after-toggle-replies="${escapeHtml(comment.id)}" aria-expanded="${comment.repliesOpen ? 'true' : 'false'}">${comment.repliesOpen ? 'Ocultar respostas' : `Ver respostas (${repliesCount})`}</button>` : ''}
              </div>
              ${!isReply && repliesCount ? `
                <div class="before-after-post__replies" data-before-after-replies="${escapeHtml(comment.id)}" ${comment.repliesOpen ? '' : 'hidden'}>
                  ${comment.replies.map((reply) => createCommentMarkup(reply, { isReply: true })).join('')}
                </div>
              ` : ''}
            </div>
            <button class="before-after-post__comment-like${comment.liked ? ' is-active' : ''}" type="button" data-before-after-comment-like aria-label="Curtir comentário de ${ariaName}">${iconHeart}</button>
          </article>
        `;
      };

      const renderComments = () => {
        if (!commentsList || !currentState) return;
        commentsList.innerHTML = currentState.comments.map((comment) => createCommentMarkup(comment)).join('');
      };

      const setMediaView = (view = 'compare') => {
        const safeView = ['before', 'compare', 'after'].includes(view) ? view : 'compare';
        currentMediaView = safeView;

        const frame = root.querySelector('[data-before-after-media-frame]');
        if (!frame) return;

        frame.dataset.beforeAfterView = safeView;
        frame.querySelectorAll('[data-before-after-media-mode]').forEach((button) => {
          const active = button.dataset.beforeAfterMediaMode === safeView;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      };

      const render = (item) => {
        currentItem = item;
        currentState = loadState(item);
        replyTargetId = null;
        currentMediaView = 'compare';

        if (mediaHost) {
          mediaHost.innerHTML = createMediaMarkup(item);
          setMediaView(currentMediaView);
        }

        titles.forEach((title) => { title.textContent = item.title; });
        avatars.forEach((avatar) => { avatar.textContent = item.avatar; });
        providers.forEach((provider) => { provider.textContent = item.provider; });
        metas.forEach((meta) => { meta.textContent = item.meta; });
        if (rating) rating.textContent = item.rating;
        if (description) description.textContent = item.description;
        if (highlights) highlights.innerHTML = item.highlights.map((point) => `<li>${escapeHtml(point)}</li>`).join('');
        serviceLinks.forEach((link) => { link.href = item.serviceHref; });
        profileLinks.forEach((link) => { link.href = item.profileHref; });

        clearReplyTarget();
        if (commentInput) commentInput.value = '';
        syncFormState();
        renderComments();
        syncStateUI();
        triggers.forEach((trigger) => trigger.classList.toggle('is-active', trigger.dataset.beforeAfterId === item.id));
      };

      const persistAndRefresh = () => {
        if (!currentItem || !currentState) return;
        saveState(currentItem, currentState);
        renderComments();
        syncStateUI();
        syncFormState();
      };

      const open = (id, trigger) => {
        const item = CASES_BY_ID[id];
        if (!item) return;
        lastTrigger = trigger || lastTrigger;
        if (!document.body.classList.contains('before-after-preview-open')) lockViewport();
        render(item);
        root.hidden = false;
        root.setAttribute('aria-hidden', 'false');
        root.querySelector('.before-after-preview__close')?.focus({ preventScroll: true });
      };

      const close = () => {
        if (root.hidden) return;
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        triggers.forEach((trigger) => trigger.classList.remove('is-active'));
        unlockViewport();
        lastTrigger?.focus({ preventScroll: true });
      };

      triggers.forEach((trigger) => {
        const handleOpen = () => open(trigger.dataset.beforeAfterId, trigger);
        trigger.addEventListener('click', handleOpen, { signal });
        trigger.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpen();
          }
        }, { signal });
      });

      mediaHost?.addEventListener('click', (event) => {
        const viewButton = event.target.closest('[data-before-after-media-mode]');
        if (!viewButton) return;
        event.preventDefault();
        event.stopPropagation();
        setMediaView(viewButton.dataset.beforeAfterMediaMode);
      }, { signal });

      likeButton?.addEventListener('click', () => {
        if (!currentState) return;
        currentState.liked = !currentState.liked;
        currentState.likeCount += currentState.liked ? 1 : -1;
        currentState.likeCount = Math.max(0, currentState.likeCount);
        persistAndRefresh();
      }, { signal });

      saveButton?.addEventListener('click', () => {
        if (!currentState) return;
        currentState.saved = !currentState.saved;
        persistAndRefresh();
      }, { signal });

      followButton?.addEventListener('click', () => {
        if (!currentState) return;
        currentState.following = !currentState.following;
        persistAndRefresh();
      }, { signal });

      shareButton?.addEventListener('click', () => {
        if (!shareButton) return;
        const originalLabel = shareButton.getAttribute('aria-label') || 'Compartilhar caso';
        shareButton.classList.add('is-sent');
        shareButton.setAttribute('aria-label', 'Compartilhado');
        window.setTimeout(() => {
          shareButton.classList.remove('is-sent');
          shareButton.setAttribute('aria-label', originalLabel);
        }, 1100);
      }, { signal });

      commentsFocusButtons.forEach((button) => button.addEventListener('click', () => {
        focusCommentInput();
      }, { signal }));

      commentsList?.addEventListener('click', (event) => {
        if (!currentState) return;

        const commentNode = event.target.closest('[data-comment-id]');
        const commentId = commentNode?.dataset.commentId;
        if (!commentId) return;

        const parentComment = findComment(currentState.comments, commentId);
        const parentOfReply = currentState.comments.find((comment) => comment.replies?.some((reply) => reply.id === commentId));
        const targetComment = parentComment || parentOfReply?.replies.find((reply) => reply.id === commentId);
        if (!targetComment) return;

        const likeControl = event.target.closest('[data-before-after-comment-like]');
        if (likeControl) {
          targetComment.liked = !targetComment.liked;
          targetComment.likeCount += targetComment.liked ? 1 : -1;
          targetComment.likeCount = Math.max(0, targetComment.likeCount);
          persistAndRefresh();
          return;
        }

        const replyControl = event.target.closest('[data-before-after-reply]');
        if (replyControl) {
          setReplyTarget(replyControl.dataset.beforeAfterReply);
          return;
        }

        const repliesControl = event.target.closest('[data-before-after-toggle-replies]');
        if (repliesControl) {
          const comment = findComment(currentState.comments, repliesControl.dataset.beforeAfterToggleReplies);
          if (!comment) return;
          comment.repliesOpen = !comment.repliesOpen;
          persistAndRefresh();
        }
      }, { signal });

      commentInput?.addEventListener('input', syncFormState, { signal });

      cancelReply?.addEventListener('click', () => {
        clearReplyTarget();
        syncFormState();
        commentInput?.focus({ preventScroll: true });
      }, { signal });

      commentForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!currentItem || !currentState || !commentInput) return;

        const text = commentInput.value.trim().replace(/\s+/g, ' ');
        if (!text) return;

        const newComment = normalizeComment({
          id: createId(replyTargetId ? 'reply' : 'comment'),
          avatar: 'DK',
          name: 'Você',
          time: 'agora',
          text,
          likeCount: 0,
          liked: false,
          replies: []
        });

        const target = getReplyTarget();
        if (target) {
          target.replies = target.replies || [];
          target.replies.push(newComment);
          target.repliesOpen = true;
        } else {
          currentState.comments.push(newComment);
        }

        currentState.commentTotal += 1;
        commentInput.value = '';
        clearReplyTarget();
        persistAndRefresh();
        focusCommentInput();
      }, { signal });

      closeButtons.forEach((button) => button.addEventListener('click', close, { signal }));
      root.querySelector('.before-after-preview__scrim')?.addEventListener('click', close, { signal });

      document.addEventListener('keydown', (event) => {
        if (root.hidden) return;
        if (event.key === 'Escape') close();
      }, { signal });

      signal?.addEventListener('abort', () => {
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('before-after-preview-open');
        document.body.style.top = '';
      });

      return close;
    }
  };
})();
