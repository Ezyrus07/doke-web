(function () {
  const iconVerified = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5 14.5 6l3.5.5 1 3.3 2.5 2.2-1.2 3.2.3 3.5-3.2 1.2L15 22l-3-1.4L9 22 6.4 19.9l-3.2-1.2.3-3.5L2.3 13l2.5-2.2 1-3.3L9.3 6z"></path>
      <path d="m8.9 12.3 2.1 2.1 4.3-4.6"></path>
    </svg>
  `;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const chipMarkup = (text, accent = false) => `<span class="panel-chip ${accent ? 'panel-chip--accent' : ''}">${escapeHtml(text)}</span>`;

  const sectionHead = (section) => `
    <header class="profile-panel__head">
      <h2>${escapeHtml(section.title || '')}</h2>
      ${section.intro ? `<p>${escapeHtml(section.intro)}</p>` : ''}
    </header>
  `;

  const serviceCard = (item) => `
    <article class="service-card doke-card doke-service-card">
      <div class="service-card__media ${escapeHtml(item.mediaClass || '')}">
        <span class="service-card__badge ${item.badgeTone === 'mint' ? 'service-card__badge--mint' : ''}">${escapeHtml(item.badge || 'Destaque')}</span>
      </div>
      <div class="service-card__body">
        <span class="service-card__category service-card__category--body">${escapeHtml(item.category || item.catégory || '')}</span>
        <h3 class="service-card__title">${escapeHtml(item.title || '')}</h3>
        <div class="service-card__rating">★ ${escapeHtml(item.rating || '')} <span>(${escapeHtml(item.reviews || '')})</span></div>
        <div class="service-card__tags">${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="service-card__meta-row">
          <div class="service-card__profile">
            <span class="service-card__avatar ${escapeHtml(item.avatarClass || '')}" aria-hidden="true"></span>
            <span class="service-card__location">${escapeHtml(item.location || '')}</span>
          </div>
        </div>
        <div class="service-card__footer">
          <strong class="service-card__price">${escapeHtml(item.price || '')}</strong>
          <a class="service-card__cta doke-btn doke-btn--success" href="${escapeHtml(item.ctaHref || 'detalhe-anuncio.html')}">Ver anúncio</a>
        </div>
      </div>
    </article>
  `;

  const feedCard = (item) => `
    <article class="surface-card doke-card">
      ${item.eyebrow ? `<span class="surface-card__eyebrow">${escapeHtml(item.eyebrow)}</span>` : ''}
      <h3>${escapeHtml(item.title || '')}</h3>
      <p>${escapeHtml(item.text || '')}</p>
      <div class="panel-chip-list">${(item.footer || []).map((entry, index) => chipMarkup(entry, index === 0)).join('')}</div>
    </article>
  `;

  const reviewGroup = (group) => `
    <article class="review-group">
      <div class="review-group__top">
        <div><h3>${escapeHtml(group.title || '')}</h3></div>
        <div class="review-group__score">
          <strong>${escapeHtml(group.score || '')}</strong>
          <span>${escapeHtml(group.count || '')}</span>
        </div>
      </div>
      <div class="review-highlight-grid">
        ${(group.highlights || []).map((item) => `
          <div class="review-highlight">
            <strong>${escapeHtml(item.value || '')}</strong>
            <span>${escapeHtml(item.label || '')}</span>
          </div>
        `).join('')}
      </div>
      <div class="review-items">
        ${(group.items || []).map((item) => `
          <article class="review-item">
            <div class="review-item__top">
              <div>
                <strong>${escapeHtml(item.author || '')}</strong>
                <div class="review-item__meta">${escapeHtml(item.meta || '')}</div>
              </div>
              <strong>${escapeHtml(item.rating || '')}</strong>
            </div>
            <p>${escapeHtml(item.text || '')}</p>
            <div class="panel-chip-list">${(item.tags || []).map((tag, index) => chipMarkup(tag, index === 0)).join('')}</div>
          </article>
        `).join('')}
      </div>
    </article>
  `;

  const aboutSection = (section) => `
    ${sectionHead(section)}
    <div class="metric-grid">
      ${(section.facts || []).map((item) => `
        <article class="metric-card">
          <span>${escapeHtml(item.label || '')}</span>
          <strong>${escapeHtml(item.value || '')}</strong>
        </article>
      `).join('')}
    </div>
    <div class="panel-grid panel-grid--three">
      ${(section.blocks || []).map((item) => `
        <article class="surface-card doke-card">
          <h3>${escapeHtml(item.title || '')}</h3>
          <p>${escapeHtml(item.text || '')}</p>
        </article>
      `).join('')}
    </div>
  `;

  const portfolioSection = (section) => `
    ${sectionHead(section)}
    <div class="portfolio-grid">
      ${(section.items || []).map((item) => `
        <article class="portfolio-card">
          ${item.subtitle ? `<span class="portfolio-card__subtitle">${escapeHtml(item.subtitle)}</span>` : ''}
          <h3>${escapeHtml(item.title || '')}</h3>
          <p>${escapeHtml(item.text || '')}</p>
          <div class="panel-chip-list">${(item.chips || []).map((chip, index) => chipMarkup(chip, index === 0)).join('')}</div>
        </article>
      `).join('')}
    </div>
  `;

  const requestsSection = (section) => `
    ${sectionHead(section)}
    <div class="request-card-grid">
      ${(section.items || []).map((item) => `
        <article class="request-card">
          <span class="request-card__status">${escapeHtml(item.status || '')}</span>
          <h3>${escapeHtml(item.title || '')}</h3>
          <p>${escapeHtml(item.text || '')}</p>
          <div class="panel-chip-list">${(item.meta || []).map((entry, index) => chipMarkup(entry, index === 0)).join('')}</div>
        </article>
      `).join('')}
    </div>
  `;

  const ownerOverview = (section) => `
    ${sectionHead(section)}
    <div class="metric-grid">
      ${(section.metrics || []).map((item) => `
        <article class="metric-card">
          <span>${escapeHtml(item.label || '')}</span>
          <strong>${escapeHtml(item.value || '')}</strong>
          <p>${escapeHtml(item.text || '')}</p>
        </article>
      `).join('')}
    </div>
    <div class="panel-grid panel-grid--three">
      ${(section.priorities || []).map((item, index) => `
        <article class="surface-card doke-card owner-priority-card">
          <span class="owner-priority-card__index">0${index + 1}</span>
          <h3>${escapeHtml(item.title || '')}</h3>
          <p>${escapeHtml(item.text || '')}</p>
        </article>
      `).join('')}
    </div>
  `;

  const ownerListings = (section) => `
    ${sectionHead(section)}
    <div class="request-card-grid">
      ${(section.items || []).map((item) => `
        <article class="request-card">
          <span class="request-card__status">${escapeHtml(item.status || '')}</span>
          <h3>${escapeHtml(item.title || '')}</h3>
          <p>${escapeHtml(item.text || '')}</p>
          <div class="panel-chip-list">${(item.meta || []).map((entry, index) => chipMarkup(entry, index === 0)).join('')}</div>
        </article>
      `).join('')}
    </div>
  `;

  const ownerReputation = (section) => `
    ${sectionHead(section)}
    <div class="review-group owner-reputation__summary">
      <div class="owner-reputation__stats">
        ${(section.metrics || []).map((item) => `
          <div class="owner-reputation__stat">
            <strong>${escapeHtml(item.value || '')}</strong>
            <span>${escapeHtml(item.label || '')}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="panel-grid panel-grid--three">
      ${(section.items || []).map((item) => `
        <article class="surface-card doke-card">
          <h3>${escapeHtml(item.title || '')}</h3>
          <p>${escapeHtml(item.text || '')}</p>
        </article>
      `).join('')}
    </div>
  `;

  const ownerSettings = (section) => `
    ${sectionHead(section)}
    <div class="panel-grid panel-grid--three">
      ${(section.items || []).map((item) => `
        <article class="surface-card doke-card">
          <h3>${escapeHtml(item.title || '')}</h3>
          <p>${escapeHtml(item.text || '')}</p>
        </article>
      `).join('')}
    </div>
  `;

  const renderSection = (section) => {
    if (!section) return '';

    switch (section.layout) {
      case 'services':
        return `${sectionHead(section)}<div class="service-cards-grid">${(section.items || []).map(serviceCard).join('')}</div>`;
      case 'feed':
        return `${sectionHead(section)}<div class="panel-grid panel-grid--three">${(section.items || []).map(feedCard).join('')}</div>`;
      case 'review-groups':
        return `${sectionHead(section)}<div class="review-group-list">${(section.groups || []).map(reviewGroup).join('')}</div>`;
      case 'about':
        return aboutSection(section);
      case 'portfolio':
        return portfolioSection(section);
      case 'requests':
        return requestsSection(section);
      case 'owner-overview':
        return ownerOverview(section);
      case 'owner-listings':
        return ownerListings(section);
      case 'owner-reputation':
        return ownerReputation(section);
      case 'owner-settings':
        return ownerSettings(section);
      default:
        return `${sectionHead(section)}<div class="panel-grid panel-grid--three">${(section.items || []).map(feedCard).join('')}</div>`;
    }
  };

  const actionMarkup = (action) => {
    const classes = ['profile-action'];
    if (action.tone === 'primary') classes.push('profile-action--primary');
    if (action.tone === 'ghost') classes.push('profile-action--ghost');

    if (action.href) {
      return `<a class="${classes.join(' ')}" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`;
    }

    return `<button class="${classes.join(' ')}" type="button">${escapeHtml(action.label)}</button>`;
  };

  const mount = (root, profile) => {
    if (!root || !profile) return;
    const hero = profile.hero || {};
    const tabs = profile.tabs || {};
    const firstTab = Object.keys(tabs)[0];

    document.title = profile.pageTitle || document.title;

    root.querySelector('[data-profile-avatar]')?.replaceChildren(document.createTextNode(hero.avatar || 'DK'));
    root.querySelector('[data-profile-name]')?.replaceChildren(document.createTextNode(hero.name || 'Perfil'));
    root.querySelector('[data-profile-username]')?.replaceChildren(document.createTextNode(hero.username || '@doke'));
    root.querySelector('[data-profile-location]')?.replaceChildren(document.createTextNode(hero.location || 'Brasil'));
    root.querySelector('[data-profile-headline]')?.replaceChildren(document.createTextNode(hero.headline || ''));

    const verifiedNode = root.querySelector('[data-profile-verified]');
    if (verifiedNode) {
      verifiedNode.hidden = !hero.verified;
      verifiedNode.innerHTML = hero.verified ? iconVerified : '';
    }

    const badgesNode = root.querySelector('[data-profile-badges]');
    if (badgesNode) {
      badgesNode.innerHTML = (hero.badges || []).map((item) => `<span class="profile-badge ${item.tone === 'accent' ? 'profile-badge--accent' : ''}">${escapeHtml(item.label)}</span>`).join('');
    }

    const statsNode = root.querySelector('[data-profile-stats]');
    if (statsNode) {
      statsNode.innerHTML = (hero.stats || []).map((item) => `
        <article class="profile-stat-card">
          <strong>${escapeHtml(item.value)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </article>
      `).join('');
    }

    const actionsNode = root.querySelector('[data-profile-actions]');
    if (actionsNode) {
      actionsNode.classList.toggle('profile-actions--three', (hero.actions || []).length >= 3);
      actionsNode.innerHTML = (hero.actions || []).map(actionMarkup).join('');
    }

    const tabsNode = root.querySelector('[data-profile-tabs]');
    const panelsNode = root.querySelector('[data-profile-panels]');
    if (!tabsNode || !panelsNode || !firstTab) return;

    let activeTab = firstTab;
    tabsNode.innerHTML = Object.entries(tabs).map(([key, label], index) => `
      <button class="profile-tab ${index === 0 ? 'is-active' : ''}" type="button" data-profile-tab="${escapeHtml(key)}" aria-selected="${index === 0 ? 'true' : 'false'}">${escapeHtml(label)}</button>
    `).join('');

    panelsNode.innerHTML = Object.entries(tabs).map(([key]) => `
      <section class="profile-panel" data-profile-panel="${escapeHtml(key)}" ${key === firstTab ? '' : 'hidden'}>
        ${renderSection(profile.sections?.[key])}
      </section>
    `).join('');

    const syncPanels = () => {
      tabsNode.querySelectorAll('[data-profile-tab]').forEach((button) => {
        const active = button.dataset.profileTab === activeTab;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
      });

      panelsNode.querySelectorAll('[data-profile-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.profilePanel !== activeTab;
      });
    };

    const tabButtons = [...tabsNode.querySelectorAll('[data-profile-tab]')];
    window.DokeProfileTabs?.bind(tabButtons, (nextKey) => {
      activeTab = nextKey;
      syncPanels();
    });

    syncPanels();
  };

  window.DokeProfileRenderer = { mount };
})();
