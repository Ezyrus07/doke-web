window.DokeHomeBeforeAfter = (() => {
  const CASES = [
    {
      id: 'case-reforma',
      title: 'Cozinha planejada renovada',
      provider: 'Studio Casa Viva',
      avatar: 'SC',
      rating: '★ 4,9',
      meta: 'Marcenaria e reforma • Salvador, BA',
      visualClass: 'comparison-card__visual--reforma',
      description: 'Arraste a linha para comparar a mudança. A leitura fica mais natural que a imagem dividida fixa e valoriza melhor o trabalho do profissional.',
      likes: '4,9k',
      commentsCount: '184',
      saves: '1,3k',
      serviceHref: 'detalhe-anuncio.html',
      profileHref: 'perfil.html',
      highlights: [
        'Redistribuição dos armários para melhorar circulação e uso vertical.',
        'Troca de acabamentos escuros por uma composição mais clara.',
        'Bancada e eletros integrados para reduzir ruído visual.'
      ],
      comments: [
        { avatar: 'LT', name: 'Lucas Torres', time: '4 min', text: 'A divisão dos armários ficou muito melhor.', likes: '3 curtidas' },
        { avatar: 'AM', name: 'Amanda Rocha', time: '16 min', text: 'Queria ver uma solução parecida para cozinha pequena.', likes: '6 curtidas' },
        { avatar: 'SC', name: 'Studio Casa Viva', time: 'agora', text: 'Cozinha pequena funciona bem com torre única e bancada limpa.', likes: '9 curtidas' }
      ]
    },
    {
      id: 'case-bathroom',
      title: 'Banheiro revitalizado sem quebra-quebra',
      provider: 'Renato Acabamentos',
      avatar: 'RA',
      rating: '★ 4,8',
      meta: 'Acabamentos e revitalização • Salvador, BA',
      visualClass: 'comparison-card__visual--bathroom',
      description: 'Comparação visual com foco em acabamento, iluminação e limpeza de obra, sem transformar a prévia em um painel pesado.',
      likes: '3,7k',
      commentsCount: '97',
      saves: '980',
      serviceHref: 'detalhe-anuncio.html',
      profileHref: 'perfil.html',
      highlights: [
        'Novo revestimento sobre base existente para evitar quebra excessiva.',
        'Metais e bancada renovados para elevar percepção de cuidado.',
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

  const ensureStylesheet = () => {
    const href = 'assets/css/components/before-after-workers-preview.css';
    if (document.querySelector('link[href*="before-after-workers-preview.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${href}?v=20260425-instagram-structure-v3`;
    document.head.appendChild(link);
  };

  const createMediaMarkup = (item) => `
    <div class="before-after-workers__media-frame">
      <div class="comparison-card__visual ${item.visualClass}">
        <div class="comparison-card__half comparison-card__half--before"><span>Antes</span></div>
        <div class="comparison-card__half comparison-card__half--after"><span>Depois</span></div>
        <button class="before-after-workers__drag" type="button" aria-label="Simular comparação antes e depois">↔</button>
      </div>
    </div>
  `;

  const buildStructure = (root) => {
    const dialog = root.querySelector('.before-after-preview__dialog');
    if (!dialog || dialog.dataset.workersLayout === 'true') return;
    dialog.dataset.workersLayout = 'true';
    dialog.innerHTML = `
      <div class="before-after-workers" role="dialog" aria-modal="true" aria-label="Antes e depois com comentários">
        <section class="before-after-workers__viewer" aria-label="Mídia do antes e depois">
          <div class="before-after-workers__media" data-before-after-preview-media></div>
        </section>

        <aside class="before-after-workers__comments" data-before-after-comments aria-label="Informações e comentários do antes e depois">
          <div class="before-after-workers__comments-head">
            <div class="before-after-workers__post-author">
              <span class="before-after-workers__side-avatar" data-before-after-preview-avatar>DK</span>
              <div>
                <strong data-before-after-preview-provider>—</strong>
                <small data-before-after-preview-meta>—</small>
              </div>
            </div>
            <button type="button" data-before-after-close aria-label="Fechar antes e depois">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
            </button>
          </div>

          <div class="before-after-workers__content-scroll">
            <article class="before-after-workers__post-copy">
              <div class="before-after-workers__post-titleline">
                <span data-before-after-preview-eyebrow>Antes e depois</span>
                <strong data-before-after-preview-title>—</strong>
              </div>
              <p class="before-after-workers__description" data-before-after-preview-description>—</p>
              <div class="before-after-workers__changes">
                <span>O que mudou</span>
                <ul data-before-after-preview-highlights></ul>
              </div>
            </article>

            <div class="before-after-workers__comments-list" data-before-after-comments-list></div>
          </div>

          <div class="before-after-workers__actions" aria-label="Ações do antes e depois">
            <button class="before-after-workers__action before-after-workers__action--like" type="button" data-before-after-like-button data-like-count="0" aria-label="Curtir caso">
              <span aria-hidden="true">${iconHeart}</span><strong data-before-after-like-count>0</strong>
            </button>
            <button class="before-after-workers__action before-after-workers__action--comment is-active" type="button" data-before-after-comments-toggle aria-label="Ocultar comentários">
              <span aria-hidden="true">${iconComment}</span><strong data-before-after-comment-count>0</strong>
            </button>
            <button class="before-after-workers__action" type="button" aria-label="Salvar caso">
              <span aria-hidden="true">${iconSave}</span><strong data-before-after-save-count>0</strong>
            </button>
            <button class="before-after-workers__action" type="button" aria-label="Compartilhar caso">
              <span aria-hidden="true">${iconShare}</span><strong>Enviar</strong>
            </button>
          </div>

          <div class="before-after-workers__cta-row">
            <a data-before-after-preview-profile href="perfil.html">Ver perfil</a>
            <a data-before-after-preview-service href="detalhe-anuncio.html">Ver serviço</a>
          </div>

          <div class="before-after-workers__comment-input">
            <span>DK</span>
            <input type="text" placeholder="Adicionar comentário..." aria-label="Adicionar comentário">
          </div>
        </aside>
      </div>
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
      const description = root.querySelector('[data-before-after-preview-description]');
      const highlights = root.querySelector('[data-before-after-preview-highlights]');
      const serviceLink = root.querySelector('[data-before-after-preview-service]');
      const profileLink = root.querySelector('[data-before-after-preview-profile]');
      const likeButton = root.querySelector('[data-before-after-like-button]');
      const likeCount = root.querySelector('[data-before-after-like-count]');
      const saveCount = root.querySelector('[data-before-after-save-count]');
      const commentCount = root.querySelector('[data-before-after-comment-count]');
      const commentsPanel = root.querySelector('[data-before-after-comments]');
      const commentsList = root.querySelector('[data-before-after-comments-list]');
      const commentsToggles = [...root.querySelectorAll('[data-before-after-comments-toggle]')];
      const closeButtons = root.querySelectorAll('[data-before-after-close]');

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

      const renderComments = (item) => {
        if (!commentsList) return;
        commentsList.innerHTML = item.comments.map((comment) => `
          <article class="before-after-workers__comment">
            <span class="before-after-workers__comment-avatar">${comment.avatar}</span>
            <div class="before-after-workers__comment-body">
              <div class="before-after-workers__comment-head">
                <strong>${comment.name}</strong>
                <span>${comment.time}</span>
              </div>
              <p>${comment.text}</p>
              <div class="before-after-workers__comment-meta">
                <button type="button">Curtir</button>
                <span>${comment.likes}</span>
                <button type="button">Responder</button>
              </div>
            </div>
          </article>
        `).join('');
      };

      const render = (item) => {
        if (mediaHost) mediaHost.innerHTML = createMediaMarkup(item);
        titles.forEach((title) => { title.textContent = item.title; });
        avatars.forEach((avatar) => { avatar.textContent = item.avatar; });
        providers.forEach((provider) => { provider.textContent = item.provider; });
        metas.forEach((meta) => { meta.textContent = `${item.category || item.meta} • ${item.rating}`; });
        if (description) description.textContent = item.description;
        if (highlights) highlights.innerHTML = item.highlights.map((point) => `<li>${point}</li>`).join('');
        if (serviceLink) serviceLink.href = item.serviceHref;
        if (profileLink) profileLink.href = item.profileHref;
        if (likeButton) {
          likeButton.classList.remove('is-active');
          likeButton.dataset.likeCount = `${parseCompactCount(item.likes)}`;
          likeButton.setAttribute('aria-label', 'Curtir caso');
        }
        if (likeCount) likeCount.textContent = item.likes;
        if (saveCount) saveCount.textContent = item.saves;
        if (commentCount) commentCount.textContent = item.commentsCount;
        renderComments(item);
        root.classList.add('comments-visible');
        commentsPanel?.removeAttribute('hidden');
        triggers.forEach((trigger) => trigger.classList.toggle('is-active', trigger.dataset.beforeAfterId === item.id));
      };

      const syncComments = () => {
        const visible = root.classList.contains('comments-visible');
        commentsPanel?.toggleAttribute('hidden', !visible);
        commentsToggles.forEach((button) => button.setAttribute('aria-label', visible ? 'Ocultar comentários' : 'Mostrar comentários'));
        root.querySelector('[data-before-after-comments-toggle]')?.classList.toggle('is-active', visible);
      };

      const open = (id, trigger) => {
        const item = CASES_BY_ID[id];
        if (!item) return;
        lastTrigger = trigger || lastTrigger;
        if (!document.body.classList.contains('before-after-preview-open')) lockViewport();
        render(item);
        syncComments();
        root.hidden = false;
        root.setAttribute('aria-hidden', 'false');
      };

      const close = () => {
        if (root.hidden) return;
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        triggers.forEach((trigger) => trigger.classList.remove('is-active'));
        unlockViewport();
        lastTrigger?.focus();
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

      likeButton?.addEventListener('click', () => {
        const current = parseCompactCount(likeButton.dataset.likeCount);
        const liked = likeButton.classList.toggle('is-active');
        const next = liked ? current + 1 : Math.max(0, current - 1);
        likeButton.dataset.likeCount = `${next}`;
        if (likeCount) likeCount.textContent = formatCompactCount(next);
        likeButton.setAttribute('aria-label', liked ? 'Descurtir caso' : 'Curtir caso');
      }, { signal });

      commentsToggles.forEach((button) => button.addEventListener('click', () => {
        root.classList.toggle('comments-visible');
        syncComments();
      }, { signal }));

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
