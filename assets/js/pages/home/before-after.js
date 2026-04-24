window.DokeHomeBeforeAfter = (() => {
  const CASES = [
    {
      id: 'case-reforma',
      title: 'Reforma completa de sala',
      provider: 'Studio Casa Viva',
      avatar: 'SC',
      rating: '★ 4,9',
      meta: 'Interiores e reforma • Salvador, BA',
      visualClass: 'comparison-card__visual--reforma',
      description: 'Antes e depois com foco em iluminação, circulação e acabamento visual mais limpo. A prévia valoriza o resultado sem transformar o modal em um painel pesado.',
      timeline: '6 dias',
      gain: '+ leveza visual',
      impact: 'Alto padrão',
      likes: '4,9k',
      saves: '1,3k',
      serviceHref: 'detalhe-anuncio.html',
      profileHref: 'perfil.html',
      highlights: [
        'Ambiente mais claro, com leitura visual menos carregada.',
        'Melhor aproveitamento de parede, iluminação e composição.',
        'Acabamento final mais profissional para foto de portfólio.'
      ],
      tags: ['Sala', 'Reforma', 'Acabamento clean', 'Portfólio']
    },
    {
      id: 'case-bathroom',
      title: 'Banheiro revitalizado sem quebra-quebra',
      provider: 'Renato Acabamentos',
      avatar: 'RA',
      rating: '★ 4,8',
      meta: 'Acabamentos e revitalização • Salvador, BA',
      visualClass: 'comparison-card__visual--bathroom',
      description: 'Atualização visual pensada para modernizar o banheiro com uma intervenção mais limpa, reduzindo sujeira, ruído visual e tempo de obra.',
      timeline: '3 dias',
      gain: '+ valor percebido',
      impact: 'Execução rápida',
      likes: '3,7k',
      saves: '980',
      serviceHref: 'detalhe-anuncio.html',
      profileHref: 'perfil.html',
      highlights: [
        'Novo acabamento aplicado sem intervenção estrutural agressiva.',
        'Metais, iluminação e bancada com aparência mais atual.',
        'Composição clara para ampliar a sensação de espaço.'
      ],
      tags: ['Banheiro', 'Sem quebra-quebra', 'Revitalização', 'Entrega rápida']
    }
  ];

  const CASES_BY_ID = Object.fromEntries(CASES.map((item) => [item.id, item]));

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

  const createMediaMarkup = (item) => `
    <div class="comparison-card__visual ${item.visualClass}" aria-label="Comparativo visual de ${item.title}">
      <div class="comparison-card__half comparison-card__half--before"><span>Antes</span></div>
      <div class="comparison-card__half comparison-card__half--after"><span>Depois</span></div>
    </div>
  `;

  return {
    create({ signal } = {}) {
      const triggers = [...document.querySelectorAll('[data-before-after-trigger]')];
      const root = document.querySelector('[data-before-after-preview]');
      if (!triggers.length || !root) return () => {};

      const mediaHost = root.querySelector('[data-before-after-preview-media]');
      const title = root.querySelector('[data-before-after-preview-title]');
      const avatar = root.querySelector('[data-before-after-preview-avatar]');
      const provider = root.querySelector('[data-before-after-preview-provider]');
      const meta = root.querySelector('[data-before-after-preview-meta]');
      const description = root.querySelector('[data-before-after-preview-description]');
      const timeline = root.querySelector('[data-before-after-preview-timeline]');
      const gain = root.querySelector('[data-before-after-preview-gain]');
      const impact = root.querySelector('[data-before-after-preview-impact]');
      const highlights = root.querySelector('[data-before-after-preview-highlights]');
      const tags = root.querySelector('[data-before-after-preview-tags]');
      const serviceLink = root.querySelector('[data-before-after-preview-service]');
      const profileLink = root.querySelector('[data-before-after-preview-profile]');
      const likeButton = root.querySelector('[data-before-after-like-button]');
      const likeCount = root.querySelector('[data-before-after-like-count]');
      const saveButton = root.querySelector('[data-before-after-save-button]');
      const saveCount = root.querySelector('[data-before-after-save-count]');
      const closeButton = root.querySelector('.before-after-preview__close');
      const closeButtons = root.querySelectorAll('[data-before-after-close]');

      let lockedScrollY = 0;
      let lastTrigger = null;

      const resetInitialState = () => {
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('before-after-preview-open');
        document.body.style.top = '';
        triggers.forEach((trigger) => trigger.classList.remove('is-active'));
      };

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

      const render = (item) => {
        if (mediaHost) mediaHost.innerHTML = createMediaMarkup(item);
        if (title) title.textContent = item.title;
        if (avatar) avatar.textContent = item.avatar;
        if (provider) provider.textContent = item.provider;
        if (meta) meta.textContent = `${item.meta} • ${item.rating}`;
        if (description) description.textContent = item.description;
        if (timeline) timeline.textContent = item.timeline;
        if (gain) gain.textContent = item.gain;
        if (impact) impact.textContent = item.impact;
        if (highlights) {
          highlights.innerHTML = item.highlights.map((point) => `<li>${point}</li>`).join('');
        }
        if (tags) {
          tags.innerHTML = item.tags.map((tag) => `<span>${tag}</span>`).join('');
        }
        if (serviceLink) serviceLink.href = item.serviceHref;
        if (profileLink) profileLink.href = item.profileHref;
        if (likeButton) {
          likeButton.classList.remove('is-active');
          likeButton.dataset.likeCount = `${parseCompactCount(item.likes)}`;
          likeButton.setAttribute('aria-label', 'Curtir caso');
        }
        if (saveButton) {
          saveButton.classList.remove('is-active');
          saveButton.dataset.saveCount = `${parseCompactCount(item.saves)}`;
          saveButton.setAttribute('aria-label', 'Salvar caso');
        }
        if (likeCount) likeCount.textContent = item.likes;
        if (saveCount) saveCount.textContent = item.saves;
        triggers.forEach((trigger) => {
          trigger.classList.toggle('is-active', trigger.dataset.beforeAfterId === item.id);
        });
      };

      const open = (id, trigger) => {
        const item = CASES_BY_ID[id];
        if (!item) return;
        lastTrigger = trigger || lastTrigger;
        render(item);
        root.hidden = false;
        root.setAttribute('aria-hidden', 'false');
        if (!document.body.classList.contains('before-after-preview-open')) {
          lockViewport();
        }
        window.requestAnimationFrame(() => closeButton?.focus({ preventScroll: true }));
      };

      const close = () => {
        const wasOpen = !root.hidden || document.body.classList.contains('before-after-preview-open');
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        triggers.forEach((trigger) => trigger.classList.remove('is-active'));
        if (wasOpen) unlockViewport();
        if (wasOpen && lastTrigger) lastTrigger.focus({ preventScroll: true });
      };

      resetInitialState();

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

      saveButton?.addEventListener('click', () => {
        const current = parseCompactCount(saveButton.dataset.saveCount);
        const saved = saveButton.classList.toggle('is-active');
        const next = saved ? current + 1 : Math.max(0, current - 1);
        saveButton.dataset.saveCount = `${next}`;
        if (saveCount) saveCount.textContent = formatCompactCount(next);
        saveButton.setAttribute('aria-label', saved ? 'Remover salvo' : 'Salvar caso');
      }, { signal });

      closeButtons.forEach((button) => button.addEventListener('click', close, { signal }));

      document.addEventListener('keydown', (event) => {
        if (root.hidden) return;
        if (event.key === 'Escape') close();
      }, { signal });

      signal?.addEventListener('abort', close);

      return close;
    }
  };
})();
