(() => {
  const detailCopy = {
    'Novo perfil profissional está chegando': [
      'Esse é um exemplo do comportamento ao abrir uma novidade: a interface mantém o usuário no mesmo contexto e exibe o conteúdo completo em uma camada de detalhe.',
      'Na versão real, esse conteúdo pode vir do backend com título, resumo, categoria, data, público-alvo e CTA específico.',
      'O objetivo é evitar uma navegação pesada para cada comunicado simples, mantendo a experiência rápida e clara.'
    ],
    'Melhorias nos cards de serviços': [
      'Os cards receberam ajustes para facilitar leitura, comparação e tomada de decisão antes de abrir um anúncio.',
      'Também é possível usar esse espaço para listar impactos da atualização, próximos passos e links relacionados.'
    ],
    'Nova experiência de comunidade': [
      'A área de comunidade foi pensada para aproximar clientes, profissionais e grupos locais sem poluir a navegação principal.',
      'Esse detalhe pode mostrar regras, exemplos de uso e atalhos para entrar ou criar comunidades.'
    ],
    'Atualização de notificações': [
      'O usuário passa a ter mais clareza sobre quais avisos recebeu e quais canais deseja priorizar.',
      'No futuro, esse detalhe pode abrir diretamente as preferências de notificações.'
    ],
    'Segurança da conta reforçada': [
      'Essa novidade comunica melhorias de segurança sem gerar alarme desnecessário.',
      'O detalhe pode orientar o usuário a revisar senha, sessões ativas e dados de recuperação.'
    ],
    'Manutenção programada': [
      'Comunicados operacionais precisam ser diretos: quando acontece, quanto tempo dura e quais áreas podem ser afetadas.',
      'Aqui a plataforma consegue avisar sem transformar manutenção em notificação pessoal.'
    ],
    'Novos recursos para profissionais': [
      'Esse detalhe explica novas ferramentas para profissionais, com foco em benefícios claros e próximos passos.',
      'Quando a funcionalidade existir no backend, o CTA pode levar direto para ativação ou configuração.'
    ]
  };

  const initNewsPage = () => {
    const root = document.querySelector('[data-news-page]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    window.DokeHomeDrawer?.create?.();

    const filters = [...root.querySelectorAll('[data-news-filter]')];
    const cards = [...root.querySelectorAll('[data-news-card]')];
    const importantCards = [...root.querySelectorAll('[data-news-important-card]')];
    const loadMore = root.querySelector('[data-news-load-more]');
    const extraCards = [...root.querySelectorAll('.news-card.is-extra')];
    const modal = root.querySelector('[data-news-detail-modal]');
    const modalTitle = root.querySelector('[data-news-detail-title]');
    const modalSummary = root.querySelector('[data-news-detail-summary]');
    const modalDate = root.querySelector('[data-news-detail-date]');
    const modalCategory = root.querySelector('[data-news-detail-category]');
    const modalContent = root.querySelector('[data-news-detail-content]');
    const modalCloseButtons = [...root.querySelectorAll('[data-news-detail-close]')];

    const openDetail = (source) => {
      if (!modal) return;
      const title = source.querySelector('h2, h3')?.textContent?.trim() || 'Novidade';
      const summary = source.querySelector('p')?.textContent?.trim() || 'Veja os detalhes desta novidade da plataforma.';
      const date = source.querySelector('time')?.textContent?.trim() || 'Atualização recente';
      const category = source.querySelector('.news-kicker')?.textContent?.trim() || 'Importante';
      const paragraphs = detailCopy[title] || [
        'Este é um exemplo de leitura detalhada para uma novidade. O usuário entende o conteúdo sem sair da página.',
        'A estrutura já deixa espaço para conteúdo dinâmico vindo do backend no futuro.'
      ];

      modalTitle.textContent = title;
      modalSummary.textContent = summary;
      modalDate.textContent = date;
      modalCategory.textContent = category;
      modalContent.innerHTML = '<p>' + paragraphs.map((item) => item.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]))).join('</p><p>') + '</p><ul><li>Categoria: ' + category + '</li><li>Status: exemplo navegável</li><li>Origem: central de novidades</li></ul>';

      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('news-detail-open');
      modal.querySelector('[data-news-detail-close]')?.focus({ preventScroll: true });
    };

    const closeDetail = () => {
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('news-detail-open');
    };

    const makeInteractive = (card) => {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('click', (event) => {
        if (event.target.closest('button, a')) return;
        openDetail(card);
      });
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openDetail(card);
      });
    };

    [...cards, ...importantCards].forEach(makeInteractive);

    root.querySelector('.news-primary-action')?.addEventListener('click', (event) => {
      event.stopPropagation();
      openDetail(root.querySelector('.news-feature'));
    });

    modalCloseButtons.forEach((button) => button.addEventListener('click', closeDetail));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal && !modal.hidden) closeDetail();
    });

    const applyFilter = (category) => {
      filters.forEach((button) => {
        const isActive = button.dataset.newsFilter === category;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      cards.forEach((card) => {
        const cardCategory = card.dataset.newsCategory || 'all';
        const shouldShow = category === 'all' || cardCategory === category;
        if (card.classList.contains('is-extra') && card.hidden && shouldShow && loadMore?.dataset.expanded !== 'true') {
          return;
        }
        card.hidden = !shouldShow;
      });

      if (loadMore) {
        if (category === 'all') {
          loadMore.hidden = false;
          if (loadMore.dataset.expanded !== 'true') {
            extraCards.forEach((card) => { card.hidden = true; });
          }
        } else {
          loadMore.hidden = true;
        }
      }
    };

    filters.forEach((button) => {
      button.addEventListener('click', () => applyFilter(button.dataset.newsFilter || 'all'));
    });

    loadMore?.addEventListener('click', () => {
      const expanded = loadMore.dataset.expanded === 'true';
      loadMore.dataset.expanded = expanded ? 'false' : 'true';
      if (expanded) {
        extraCards.forEach((card) => { card.hidden = true; });
        loadMore.querySelector('span').textContent = 'Carregar mais';
      } else {
        extraCards.forEach((card) => { card.hidden = false; });
        loadMore.querySelector('span').textContent = 'Mostrar menos';
      }
    });

    applyFilter('all');
  };

  window.DokeInitNews = initNewsPage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsPage, { once: true });
  } else {
    initNewsPage();
  }
})();
