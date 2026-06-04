
(() => {
  const root = document.querySelector('[data-profile-root]');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const body = document.body;

  const profiles = window.DokeProfileData || {};

  const els = {
    name: root.querySelector('[data-profile-name]'),
    username: root.querySelector('[data-profile-username]'),
    city: root.querySelector('[data-profile-city]'),
    categories: root.querySelector('[data-profile-categories]'),
    headline: root.querySelector('[data-profile-headline]'),
    avatar: root.querySelector('[data-profile-avatar]'),
    verified: root.querySelector('[data-profile-verified]'),
    nameActions: root.querySelector('[data-profile-name-actions]'),
    stats: root.querySelector('[data-profile-stats]'),
    actions: root.querySelector('[data-profile-actions]'),
    tabs: [...root.querySelectorAll('[data-profile-tab]')],
    panels: {
      services: root.querySelector('[data-profile-panel="services"]'),
      portfolio: root.querySelector('[data-profile-panel="portfolio"]'),
      reviews: root.querySelector('[data-profile-panel="reviews"]')
    },
    shareButtons: [...document.querySelectorAll('[data-profile-share]')],
    modeShortcuts: [...document.querySelectorAll('[data-profile-mode-shortcut]')]
  };

  const state = {
    type: params.get('type') === 'professional' ? 'professional' : 'personal',
    view: params.get('view') === 'owner' ? 'owner' : 'visitor',
    activeTab: ['services', 'portfolio', 'reviews'].includes(params.get('panel')) ? params.get('panel') : 'services'
  };

  const updateUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('type', state.type);
    url.searchParams.set('view', state.view);
    url.searchParams.set('panel', state.activeTab);
    history.replaceState({}, '', url);
  };

  const chipMarkup = (text, accent = false) => `<span class="profile-chip ${accent ? 'profile-chip--accent' : ''}">${text}</span>`;
  const categoryMarkup = (item) => `<span class="profile-category-pill ${item.accent ? 'profile-category-pill--accent' : ''}">${item.label}</span>`;

  const statMarkup = (item) => `
    <div class="profile-stat">
      <span class="profile-stat__value">${item.value}</span>
      <span class="profile-stat__label">${item.label}</span>
    </div>
  `;

  const actionMarkup = (item) => `
    <button class="profile-action ${item.style === 'primary' ? 'profile-action--primary' : ''} ${item.tone ? `profile-action--${item.tone}` : ''}" type="button">${item.label}</button>
  `;

  const followActionMarkup = (item) => `
    <button class="profile-follow-action" type="button">${item.label}</button>
  `;

  const renderSectionHead = (section) => `
    <div class="profile-section-head">
      <h2>${section.title}</h2>
      <p>${section.intro}</p>
    </div>
  `;

  const renderServices = (section) => `
    ${renderSectionHead(section)}
    <div class="profile-services-grid">
      ${section.items.map(item => `
        <article class="profile-service-card">
          <h3>${item.title}</h3>
          <p>${item.text}</p>
          <div class="profile-service-meta">
            ${item.footer.map((text, index) => chipMarkup(text, index === 0)).join('')}
          </div>
        </article>
      `).join('')}
    </div>
  `;

  const renderPortfolio = (section, isProfessional) => `
    ${renderSectionHead(section)}
    <div class="profile-portfolio-grid">
      ${section.items.map(item => `
        <article class="profile-portfolio-card">
          <div class="profile-portfolio-thumb"></div>
          <h3>${item.title}</h3>
          <p>${item.text}</p>
          <div class="profile-portfolio-meta">
            ${item.footer.map((text, index) => chipMarkup(text, index === 0 && isProfessional)).join('')}
          </div>
        </article>
      `).join('')}
    </div>
  `;

  const renderReviews = (section) => `
    ${renderSectionHead(section)}
    <div class="profile-review-grid">
      ${section.items.map(item => `
        <article class="profile-review-card">
          <div class="profile-review-card__top">
            <h3>${item.title}</h3>
            <span class="profile-review-card__stars">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4.5 2.3 4.8 5.2.8-3.8 3.8.9 5.3-4.6-2.5-4.6 2.5.9-5.3-3.8-3.8 5.2-.8z"></path></svg>
              ${item.badge}
            </span>
          </div>
          <p>${item.text}</p>
          <div class="profile-review-meta">
            ${item.footer.map((text, index) => chipMarkup(text, index === 0)).join('')}
          </div>
        </article>
      `).join('')}
    </div>
  `;

  const renderTabs = (profile) => {
    window.DokeProfileTabs?.sync(els.tabs, profile.tabs, state.activeTab);
  };

  const renderPanels = (profile) => {
    els.panels.services.innerHTML = renderServices(profile.services);
    els.panels.portfolio.innerHTML = renderPortfolio(profile.portfolio, state.type === 'professional');
    els.panels.reviews.innerHTML = renderReviews(profile.reviews);

    Object.entries(els.panels).forEach(([key, panel]) => {
      const isActive = key === state.activeTab;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });
  };

  const render = () => {
    const profile = profiles[state.type];
    document.title = profile.title;
    body.dataset.profileType = state.type;
    body.dataset.profileView = state.view;

    els.name.textContent = profile.name;
    els.username.textContent = profile.username;
    els.city.textContent = profile.city;
    els.avatar.textContent = profile.avatar;
    els.headline.textContent = profile.headline;
    els.categories.innerHTML = profile.categories.map(categoryMarkup).join('');
    els.verified.hidden = !profile.verified;
    els.stats.innerHTML = profile.stats.map(statMarkup).join('');
    const actions = profile.actions[state.view];
    const followAction = state.view === 'visitor'
      ? actions.find((item) => item.label === 'Seguir')
      : null;
    const footerActions = followAction
      ? actions.filter((item) => item.label !== 'Seguir')
      : actions;

    els.nameActions.innerHTML = followAction ? followActionMarkup(followAction) : '';
    els.actions.innerHTML = footerActions.map(actionMarkup).join('');

    renderTabs(profile);
    renderPanels(profile);
    updateUrl();
  };

  window.DokeProfileTabs?.bind(els.tabs, (key) => {
    state.activeTab = key;
    render();
  });

  els.modeShortcuts.forEach(button => {
    button.addEventListener('click', () => {
      state.view = state.view === 'owner' ? 'visitor' : 'owner';
      render();
    });
  });

  window.DokeProfileShare?.bind(els.shareButtons, () => ({
    title: document.title,
    text: 'Confira este perfil na Doke.',
    url: window.location.href
  }));

  render();
})();
