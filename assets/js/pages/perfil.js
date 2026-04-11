window.DokeInitProfile = () => {
  const root = document.querySelector("[data-profile-root]");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const body = document.body;
  const data = window.DokeProfileData || {};
  const profileMode = params.get("mode");
  const publicProfile = data.professionalPublic || {};
  const ownerProfile = data.professionalOwner || {};
  const baseProfile =
    profileMode === "owner"
      ? {
          ...publicProfile,
          ...ownerProfile,
          hero: {
            ...(publicProfile.hero || {}),
            actions: (ownerProfile.hero?.actions || publicProfile.hero?.actions || [])
              .filter((item) => item && item.label !== "Novo anúncio" && item.label !== "Novo anÃºncio")
              .map((item) => ({
                ...item,
                label:
                  item.label === "Editar vitrine pública" || item.label === "Editar vitrine pÃºblica"
                    ? "Editar perfil"
                    : item.label
              })),
            badges: [...((publicProfile.hero?.badges || []).slice(0, 2))]
          },
          tabs: {
            ...(publicProfile.tabs || {}),
            overview: "Visão geral"
          },
          sections: {
            ...(publicProfile.sections || {}),
            overview: ownerProfile.sections?.overview || {}
          }
        }
      : publicProfile;
  const servicePool = window.DokeSearchData?.servicePool || [];
  const shortVideoPool = window.DokeSearchData?.shortVideoPool || [];
  const beforeAfterPool = window.DokeSearchData?.beforeAfterPool || [];

  const els = {
    name: root.querySelector("[data-profile-name]"),
    username: root.querySelector("[data-profile-username]"),
    city: root.querySelector("[data-profile-city]"),
    categories: root.querySelector("[data-profile-categories]"),
    headline: root.querySelector("[data-profile-headline]"),
    avatar: root.querySelector("[data-profile-avatar]"),
    verified: root.querySelector("[data-profile-verified]"),
    nameActions: root.querySelector("[data-profile-name-actions]"),
    stats: root.querySelector("[data-profile-stats]"),
    highlights: root.querySelector("[data-profile-highlights]"),
    actions: root.querySelector("[data-profile-actions]"),
    tabs: [...root.querySelectorAll("[data-profile-tab]")],
    panels: [...root.querySelectorAll("[data-profile-panel]")],
    shareButtons: [...document.querySelectorAll("[data-profile-share]")],
    followersModal: document.querySelector("[data-profile-followers-modal]"),
    followersList: document.querySelector("[data-profile-followers-list]"),
    followersSearch: document.querySelector("[data-profile-followers-search]"),
    followersClose: [...document.querySelectorAll("[data-profile-followers-close]")]
  };

  const panelMap = Object.fromEntries(els.panels.map((panel) => [panel.dataset.profilePanel, panel]));
  const availableTabs = Object.keys(baseProfile.tabs || {});
  const requestedPanel = params.get("panel");
  const state = {
    activeTab: availableTabs.includes(requestedPanel) ? requestedPanel : availableTabs[0] || "services",
    selectingServices: false,
    selectedServices: [],
    selectingPosts: false,
    selectedPosts: []
  };

  const followerDemo = [
    { name: "Marina Alves", handle: "@marinaalves", meta: "Arquiteta", initials: "MA", tone: "blue", following: false },
    { name: "Caio Mendes", handle: "@caiomendes", meta: "Cliente recorrente", initials: "CM", tone: "gold", following: false },
    { name: "Renata Lima", handle: "@renatalima", meta: "Design de interiores", initials: "RL", tone: "coral", following: false },
    { name: "Juliana Prado", handle: "@juprado", meta: "Reformas leves", initials: "JP", tone: "mint", following: true },
    { name: "Bruno Costa", handle: "@brunocosta", meta: "Engenheiro civil", initials: "BC", tone: "navy", following: true },
    { name: "Studio Ninho", handle: "@studioninho", meta: "Estúdio parceiro", initials: "SN", tone: "blue", following: false }
  ];

  const normalize = (value) =>
    String(value || "")
      .replace(/Ã§/g, "ç")
      .replace(/Ã£/g, "ã")
      .replace(/Ã¡/g, "á")
      .replace(/Ã©/g, "é")
      .replace(/Ãª/g, "ê")
      .replace(/Ã­/g, "í")
      .replace(/Ã³/g, "ó")
      .replace(/Ãµ/g, "õ")
      .replace(/Ãº/g, "ú")
      .replace(/Â²/g, "²")
      .replace(/Â·/g, "·")
      .replace(/â€¢/g, "•")
      .replace(/â˜…/g, "★")
      .replace(/â–¶/g, "▶")
      .trim();

  const updateUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("panel", state.activeTab);
    history.replaceState({}, "", url);
  };

  const chipMarkup = (text, accent = false) =>
    `<span class="profile-chip ${accent ? "profile-chip--accent" : ""}">${normalize(text)}</span>`;

  const categoryIcons = {
    painting: `<svg viewBox="0 0 24 24"><path d="m14.7 5.8 3.5 3.5"></path><path d="m10.2 15.3 5.6-5.6 2.1 2.1-5.6 5.6"></path><path d="M8 17.5 6.8 20l2.5-1.2"></path><path d="M4.8 20h3.6"></path></svg>`,
    electrician: `<svg viewBox="0 0 24 24"><path d="M12 4.8a4 4 0 0 0-4 4c0 1.6.8 2.9 1.9 3.8.9.7 1.6 1.8 1.8 2.9h.6c.2-1.1.9-2.2 1.8-2.9A5 5 0 0 0 16 8.8a4 4 0 0 0-4-4Z"></path><path d="M10.3 17.3h3.4"></path><path d="M10.8 19.4h2.4"></path></svg>`,
    plumbing: `<svg viewBox="0 0 24 24"><path d="m14.6 7.2 2.2-2.2a2.1 2.1 0 0 1 3 3l-2.2 2.2"></path><path d="m13.3 8.5 2.2 2.2"></path><path d="m6.2 15.6 7.1-7.1 4 4-7.1 7.1H6.2z"></path></svg>`,
    cleaning: `<svg viewBox="0 0 24 24"><path d="M7 7.6c1.2 1.2 2.8 1.8 5 1.8s3.8-.6 5-1.8"></path><path d="M7 11.6c1.2 1.2 2.8 1.8 5 1.8s3.8-.6 5-1.8"></path><path d="M7 15.6c1.2 1.2 2.8 1.8 5 1.8s3.8-.6 5-1.8"></path></svg>`,
    freight: `<svg viewBox="0 0 24 24"><path d="M5 9h9.5v6H5z"></path><path d="M14.5 10.5h2.7l1.8 1.8v2.7h-4.5"></path><circle cx="8" cy="17" r="1.1"></circle><circle cx="17.2" cy="17" r="1.1"></circle></svg>`
  };

  const getCategoryIcon = (item) => {
    const label = normalize(item?.label).toLowerCase();
    const key = item?.iconKey || (label.includes('pint') || label.includes('acabamento') ? 'painting' : '');
    return categoryIcons[key] || categoryIcons.painting;
  };

  const categoryMarkup = (item) => {
    const clickable = item.accent ? "false" : "true";
    const icon = item.accent
      ? ""
      : `<span class="profile-category-pill__icon" aria-hidden="true">${getCategoryIcon(item)}</span>`;

    return `<button class="profile-category-pill ${item.accent ? "profile-category-pill--accent" : ""}" type="button" data-clickable="${clickable}" ${item.accent ? "" : `data-profile-category="${normalize(item.label)}"`}>
      ${icon}
      <span>${normalize(item.label)}</span>
    </button>`;
  };

  const statMarkup = (item) => `
    <button class="profile-stat" type="button" data-profile-stat="${normalize(item.label).toLowerCase()}">
      <span class="profile-stat__value">${normalize(item.value)}</span>
      <span class="profile-stat__label">${normalize(item.label)}</span>
    </button>
  `;

  const renderFollowersModal = (query = "") => {
    if (!els.followersList) return;
    const normalizedQuery = normalize(query).toLowerCase();
    const visibleFollowers = followerDemo.filter((item) => {
      if (!normalizedQuery) return true;
      return [item.name, item.handle, item.meta].some((value) => normalize(value).toLowerCase().includes(normalizedQuery));
    });

    els.followersList.innerHTML = visibleFollowers
      .map(
        (item) => `
      <article class="profile-follower-card">
        <div class="profile-follower-card__avatar profile-follower-card__avatar--${item.tone}">
          <span>${normalize(item.initials)}</span>
        </div>
        <div class="profile-follower-card__body">
          <strong>${normalize(item.handle)}</strong>
          <span>${normalize(item.name)}</span>
          <small>${normalize(item.meta)}</small>
        </div>
        <button class="profile-follower-card__action ${item.following ? "is-active" : ""}" type="button">${item.following ? "Seguindo" : "Seguir"}</button>
      </article>
    `
      )
      .join("");
  };

  const closeFollowersModal = () => {
    if (!els.followersModal) return;
    els.followersModal.hidden = true;
    body.classList.remove("has-modal-open");
  };

  const toggleServiceSelection = (index) => {
    const exists = state.selectedServices.includes(index);
    state.selectedServices = exists
      ? state.selectedServices.filter((item) => item !== index)
      : [...state.selectedServices, index];
    render();
  };

  const togglePostSelection = (id) => {
    const exists = state.selectedPosts.includes(id);
    state.selectedPosts = exists
      ? state.selectedPosts.filter((item) => item !== id)
      : [...state.selectedPosts, id];
    render();
  };

  const openReviewsPanel = () => {
    closeFollowersModal();
    state.activeTab = "reviews";
    render();
    panelMap.reviews?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openFollowersPanel = () => {
    if (!els.followersModal) return;
    renderFollowersModal();
    els.followersModal.hidden = false;
    body.classList.add("has-modal-open");
    if (els.followersSearch) {
      els.followersSearch.value = "";
      window.setTimeout(() => els.followersSearch?.focus(), 30);
    }
  };

  const actionMarkup = (item) => {
    const classes = `profile-action ${item.tone === "primary" || item.style === "primary" ? "profile-action--success" : ""}`.trim();
    if (item.href) {
      return `
        <a class="${classes}" href="${item.href}">
          ${normalize(item.label)}
        </a>
      `;
    }
    return `
      <button class="${classes}" type="button">
        ${normalize(item.label)}
      </button>
    `;
  };

  const followActionMarkup = (item) => `
    <button class="profile-follow-action" type="button" data-profile-follow aria-pressed="false">${normalize(item.label)}</button>
  `;

  const renderPanelShell = (content) => `
    <div class="profile-panel-layout profile-panel-layout--full">
      <div class="profile-panel-main">${content}</div>
    </div>
  `;

  const renderServiceCards = () => {
    const items = servicePool.slice(0, 3);
    const selectedCount = state.selectedServices.length;
    return `
      ${profileMode === "owner" ? `
      <div class="profile-services-toolbar">
        <button class="profile-services-toolbar__action profile-services-toolbar__action--primary" type="button">Novo</button>
        <button class="profile-services-toolbar__action ${state.selectingServices ? "is-active" : ""}" type="button" data-profile-services-select-toggle>${state.selectingServices ? "Cancelar" : "Selecionar"}</button>
        ${selectedCount === 1 ? `<button class="profile-services-toolbar__action" type="button" data-profile-services-edit>Editar anúncio</button>` : ""}
        ${selectedCount > 1 ? `<span class="profile-services-toolbar__hint">Só dá para editar um anúncio por vez.</span>` : ""}
      </div>
      ` : ""}
      <div class="results-grid profile-services-results">
        ${items
          .map(
            (item, index) => `
          <article class="service-card service-card--featured service-card--feed ${state.selectedServices.includes(index) ? "is-selected" : ""} ${state.selectingServices ? "is-selecting" : ""}" data-profile-service-card="${index}">
            <div class="service-card__media ${item.mediaClass}">
              ${profileMode === "owner" && state.selectingServices
                ? `<button class="service-card__favorite profile-service-select-indicator ${state.selectedServices.includes(index) ? "is-selected" : ""}" type="button" aria-label="Selecionar anúncio" data-profile-service-select="${index}">${state.selectedServices.includes(index) ? "✓" : ""}</button>`
                : `<button class="service-card__favorite" type="button" aria-label="Salvar anúncio">
                <svg viewBox="0 0 24 24"><path d="m12 19-6.6-6.3a4.2 4.2 0 0 1 0-6 4.4 4.4 0 0 1 6.1 0L12 7.2l.5-.5a4.4 4.4 0 0 1 6.1 0 4.2 4.2 0 0 1 0 6Z"></path></svg>
              </button>`}
              <span class="service-card__badge ${item.badgeModifier || ""}">${normalize(item.badge)}</span>
              <div class="service-card__media-content">
                <span class="service-card__category">${normalize(item.category)}</span>
                <strong>${normalize(item.title)}</strong>
              </div>
            </div>
            <div class="service-card__body">
              <div class="service-card__rating">★ ${item.rating.toFixed(1).replace(".", ",")} <span>(${normalize(item.reviews)})</span></div>
              <div class="service-card__meta-row">
                <div class="service-card__profile">
                  <span class="service-card__avatar ${item.avatarClass}" aria-hidden="true"></span>
                  <span class="service-card__location">${normalize(item.location)}</span>
                </div>
              </div>
              <div class="service-card__tags">${item.tags.map((tag) => `<span>${normalize(tag)}</span>`).join("")}</div>
              <div class="service-card__footer">
                <div>
                  <strong class="service-card__price">${normalize(item.price)}</strong>
                </div>
                <span class="service-card__cta" aria-label="Ver anúncio">Ver anúncio</span>
              </div>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    `;
  };

  const renderPosts = () =>
    renderPanelShell(`
      <div class="profile-posts-stack">
        ${profileMode === "owner" ? `
        <div class="profile-services-toolbar">
          <button class="profile-services-toolbar__action profile-services-toolbar__action--primary" type="button">Novo</button>
          <button class="profile-services-toolbar__action ${state.selectingPosts ? "is-active" : ""}" type="button" data-profile-posts-select-toggle>${state.selectingPosts ? "Cancelar" : "Selecionar"}</button>
          ${state.selectedPosts.length === 1 ? `<button class="profile-services-toolbar__action" type="button" data-profile-posts-edit>Editar anúncio</button>` : ""}
          ${state.selectedPosts.length > 1 ? `<span class="profile-services-toolbar__hint">Só dá para editar um anúncio por vez.</span>` : ""}
        </div>
        ` : ""}
        <section class="short-videos" aria-labelledby="profile-short-videos-title">
          <div class="section-heading section-heading--spread home-section-header">
            <div><h2 class="section-heading__title home-section-title" id="profile-short-videos-title">WORKERS</h2></div>
          </div>
          <div class="content-rail">
            <button class="home-categories__arrow content-rail__arrow content-rail__arrow--prev" type="button" aria-label="Ver vídeos anteriores" data-rail-arrow="prev" data-rail-target="profile-short-videos-track">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5 5 5"></path></svg>
            </button>
            <div class="short-videos__track profile-posts-videos" id="profile-short-videos-track" data-rail-track>
              ${shortVideoPool
                .map(
                  (item, index) => `
                <article class="video-card ${item.mediaClass} ${state.selectingPosts ? "is-selecting" : ""} ${state.selectedPosts.includes(`video-${index}`) ? "is-selected" : ""}" data-profile-post-card="video-${index}">
                  ${profileMode === "owner" && state.selectingPosts ? `<button class="profile-post-select-indicator ${state.selectedPosts.includes(`video-${index}`) ? "is-selected" : ""}" type="button" data-profile-post-select="video-${index}" aria-label="Selecionar publicação">${state.selectedPosts.includes(`video-${index}`) ? "✓" : ""}</button>` : ""}
                  <span class="video-card__play">▶</span>
                  <div class="video-card__content"><strong>${normalize(item.title)}</strong></div>
                </article>
              `
                )
                .join("")}
            </div>
            <button class="home-categories__arrow content-rail__arrow content-rail__arrow--next" type="button" aria-label="Ver próximos vídeos" data-rail-arrow="next" data-rail-target="profile-short-videos-track">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5 5-5 5"></path></svg>
            </button>
          </div>
        </section>

        <section class="before-after" aria-labelledby="profile-before-after-title">
          <div class="section-heading section-heading--spread home-section-header">
            <div><h2 class="section-heading__title home-section-title" id="profile-before-after-title">ANTES E DEPOIS</h2></div>
            <a class="section-heading__link" href="#">Ver mais casos</a>
          </div>
          <div class="content-rail">
            <button class="home-categories__arrow content-rail__arrow content-rail__arrow--prev" type="button" aria-label="Ver casos anteriores" data-rail-arrow="prev" data-rail-target="profile-before-after-track">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5 5 5"></path></svg>
            </button>
            <div class="comparison-grid profile-posts-comparison" id="profile-before-after-track" data-rail-track>
              ${beforeAfterPool
                .map(
                  (item, index) => `
                <article class="comparison-card ${state.selectingPosts ? "is-selecting" : ""} ${state.selectedPosts.includes(`compare-${index}`) ? "is-selected" : ""}" data-profile-post-card="compare-${index}">
                  ${profileMode === "owner" && state.selectingPosts ? `<button class="profile-post-select-indicator ${state.selectedPosts.includes(`compare-${index}`) ? "is-selected" : ""}" type="button" data-profile-post-select="compare-${index}" aria-label="Selecionar publicação">${state.selectedPosts.includes(`compare-${index}`) ? "✓" : ""}</button>` : ""}
                  <div class="comparison-card__visual ${item.visualClass}">
                    <div class="comparison-card__half comparison-card__half--before"><span>Antes</span></div>
                    <div class="comparison-card__half comparison-card__half--after"><span>Depois</span></div>
                  </div>
                  <div class="comparison-card__body">
                    <strong>${normalize(item.title)}</strong>
                    <div class="comparison-card__meta">
                      <span>Por ${normalize(item.author)}</span>
                      <span>★ ${String(item.rating).replace(".", ",")}</span>
                    </div>
                  </div>
                </article>
              `
                )
                .join("")}
            </div>
            <button class="home-categories__arrow content-rail__arrow content-rail__arrow--next" type="button" aria-label="Ver próximos casos" data-rail-arrow="next" data-rail-target="profile-before-after-track">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5 5-5 5"></path></svg>
            </button>
          </div>
        </section>
      </div>
    `);

  const renderReviews = () => {
    const groups = baseProfile.sections?.reviews?.groups || [];
    const reviewAds = groups.map((group, index) => ({
      id: `ad-${index + 1}`,
      label: normalize(group.title),
      score: normalize(group.score),
      stars: "★★★★★",
      count: normalize(group.count),
      metrics: (group.highlights || []).map((item) => ({
        label: normalize(item.label),
        value: normalize(item.value),
        text: normalize(item.text || "leitura do anúncio")
      })),
      reviews: (group.items || []).map((item) => ({
        name: normalize(item.author),
        meta: normalize(item.meta),
        rating: normalize(item.rating),
        stars: Number(String(item.rating).replace(",", ".")) >= 4.8 ? "★★★★★" : "★★★★☆",
        text: normalize(item.text),
        tags: (item.tags || []).map(normalize)
      }))
    }));

    return renderPanelShell(`
      <div class="profile-review-switcher">
        <label class="profile-review-switcher__label" for="profile-review-ad">Anúncio</label>
        <select class="profile-review-switcher__select" id="profile-review-ad" data-profile-review-select data-ui-select>
          ${reviewAds.map((ad, index) => `<option value="${ad.id}" ${index === 0 ? "selected" : ""}>${ad.label}</option>`).join("")}
        </select>
      </div>
      <div class="profile-review-hub" data-profile-review-hub data-review-ads='${JSON.stringify(reviewAds).replace(/'/g, "&apos;")}'>
        <div class="profile-review-hub__summary"></div>
        <div class="profile-review-toolbar" role="tablist" aria-label="Filtrar avaliações do anúncio">
          <button class="profile-review-filter is-active" type="button" data-profile-review-filter="all">Todas</button>
          <button class="profile-review-filter" type="button" data-profile-review-filter="positive">Positivas</button>
          <button class="profile-review-filter" type="button" data-profile-review-filter="negative">Negativas</button>
        </div>
        <div class="profile-review-hub__list"></div>
      </div>
    `);
  };

  const renderAbout = () => {
    const section = baseProfile.sections?.about || {};
    const facts = section.facts || [];
    const blocks = section.blocks || [];
    return renderPanelShell(`
      <div class="profile-about-flow">
        <section class="profile-about-hero">
          <div class="profile-about-intro">
            <h3>Como esse perfil trabalha</h3>
            ${blocks.slice(0, 2).map((item) => `<p>${normalize(item.text)}</p>`).join("")}
          </div>
          <article class="profile-about-certificate-card">
            <a class="profile-about-certificate" href="#">
              <div>
                <strong>Profissional certificado</strong>
                <span>Documento validado e aprovado. Clique para visualizar.</span>
              </div>
              <span class="profile-about-certificate__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"></path></svg>
              </span>
            </a>
            <div class="profile-about-diploma">
              <strong>Diploma em Design de Interiores</strong>
              <span>SENAC Bahia</span>
              <small>Concluído em 2021</small>
            </div>
          </article>
        </section>

        <section class="profile-about-meta">
          ${facts
            .map(
              (item) => `
            <article class="profile-about-meta-item">
              <span>${normalize(item.label)}</span>
              <strong>${normalize(item.value)}</strong>
            </article>
          `
            )
            .join("")}
        </section>

        <div class="profile-about-tags-strip" aria-label="Diferenciais">
          ${[
            "Briefing direto",
            "Boa apresentação",
            "Prazo alinhado",
            "Portfólio enxuto",
            "Contato leve"
          ]
            .map((tag, index) => chipMarkup(tag, index < 2))
            .join("")}
        </div>

        <section class="profile-about-trophies">
          <article class="profile-about-trophy profile-about-trophy--1"><span class="profile-about-trophy__icon">T</span><div><strong>Top da semana</strong><small>Mais visto</small></div></article>
          <article class="profile-about-trophy profile-about-trophy--2"><span class="profile-about-trophy__icon">R</span><div><strong>Resposta rápida</strong><small>Retorno consistente</small></div></article>
          <article class="profile-about-trophy profile-about-trophy--3"><span class="profile-about-trophy__icon">C</span><div><strong>Cliente recorrente</strong><small>Boa retenção</small></div></article>
        </section>
      </div>
    `);
  };

  const renderPortfolio = () => {
    const items = baseProfile.sections?.portfolio?.items || [];
    return renderPanelShell(`
      <div class="profile-portfolio-grid">
        ${items
          .map(
            (item) => `
          <article class="profile-portfolio-card">
            <div class="profile-portfolio-thumb"></div>
            <div class="profile-portfolio-card__body">
              <div class="profile-portfolio-card__header">
                <h3>${normalize(item.title)}</h3>
                <span class="profile-portfolio-card__location">${normalize(item.subtitle)}</span>
              </div>
              <p>${normalize(item.text)}</p>
              <div class="profile-portfolio-meta">
                ${(item.chips || []).map((text, index) => chipMarkup(text, index === 0)).join("")}
              </div>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    `);
  };


  const renderAchievements = () => {
    const section = baseProfile.sections?.achievements || {};
    const items = section.items || [];
    return renderPanelShell(`
      <div class="profile-achievements-grid">
        ${items
          .map(
            (item) => `
          <article class="profile-achievement-card profile-achievement-card--${normalize(item.theme || "gold").toLowerCase()} profile-achievement-card--shape-${normalize(item.shape || "shield").toLowerCase()}">
            <div class="profile-achievement-card__top">
              <span class="profile-achievement-card__icon" aria-hidden="true">${normalize(item.icon || "★")}</span>
              <span class="profile-achievement-card__status">${normalize(item.status || "Em progresso")}</span>
            </div>
            <div class="profile-achievement-card__body">
              <div class="profile-achievement-card__header">
                <h3>${normalize(item.title)}</h3>
                <strong class="profile-achievement-card__percent">${Math.max(0, Math.min(100, Number(item.progress) || 0))}%</strong>
              </div>
              <p>${normalize(item.detail)}</p>
              <div class="profile-achievement-card__meta">${normalize(item.metric || "Progresso da conquista")}</div>
              <div class="profile-achievement-card__progress" aria-hidden="true">
                <span style="width: ${Math.max(0, Math.min(100, Number(item.progress) || 0))}%"></span>
              </div>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    `);
  };

  const renderCertificates = () => {
    const section = baseProfile.sections?.certificates || {};
    const items = section.items || [];
    return renderPanelShell(`
      <div class="profile-certificates-grid">
        ${items
          .map(
            (item) => `
          <article class="profile-certificate-card">
            <div class="profile-certificate-card__meta">
              <span class="profile-certificate-card__status">${normalize(item.status)}</span>
              <span class="profile-certificate-card__issuer">${normalize(item.issuer)}</span>
            </div>
            <h3>${normalize(item.title)}</h3>
            <p>${normalize(item.meta)}</p>
          </article>
        `
          )
          .join("")}
      </div>
    `);
  };

  const renderFaq = () => {
    const section = baseProfile.sections?.faq || {};
    const items = section.items || [];
    return renderPanelShell(`
      <div class="profile-faq-list">
        ${items
          .map(
            (item, index) => `
          <article class="profile-faq-card">
            <button type="button" data-profile-faq-toggle aria-expanded="${index === 0 ? "true" : "false"}">
              <h3>${normalize(item.question)}</h3>
              <span aria-hidden="true">${index === 0 ? "−" : "+"}</span>
            </button>
            <p class="profile-faq-card__answer" ${index === 0 ? "" : "hidden"}>${normalize(item.answer)}</p>
          </article>
        `
          )
          .join("")}
      </div>
    `);
  };

  const renderOwnerOverview = () => {
    const section = baseProfile.sections?.overview || {};
    const metrics = section.metrics || [];
    const priorities = section.priorities || [];
    return renderPanelShell(`
      <div class="profile-owner-overview">
        <section class="profile-owner-metrics">
          ${metrics
            .map(
              (item) => `
            <article class="profile-owner-metric-card">
              <strong>${normalize(item.value)}</strong>
              <span>${normalize(item.label)}</span>
              <p>${normalize(item.text)}</p>
            </article>
          `
            )
            .join("")}
        </section>
        <section class="profile-owner-priorities">
          ${priorities
            .map(
              (item, index) => `
            <article class="profile-owner-priority-card">
              <span class="profile-owner-priority-card__index">0${index + 1}</span>
              <div>
                <strong>${normalize(item.title)}</strong>
                <p>${normalize(item.text)}</p>
              </div>
            </article>
          `
            )
            .join("")}
        </section>
      </div>
    `);
  };

  const renderOwnerListings = () => {
    const section = baseProfile.sections?.listings || {};
    const items = section.items || [];
    return renderPanelShell(`
      <div class="profile-owner-listings">
        ${items
          .map(
            (item) => `
          <article class="profile-owner-listing-card">
            <div class="profile-owner-listing-card__top">
              <span class="profile-owner-listing-card__status">${normalize(item.status)}</span>
              <button type="button">Gerenciar</button>
            </div>
            <h3>${normalize(item.title)}</h3>
            <p>${normalize(item.text)}</p>
            <div class="profile-owner-listing-card__meta">
              ${(item.meta || []).map((meta) => `<span>${normalize(meta)}</span>`).join("")}
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    `);
  };

  const renderOwnerReputation = () => {
    const section = baseProfile.sections?.reputation || {};
    const metrics = section.metrics || [];
    const items = section.items || [];
    return renderPanelShell(`
      <div class="profile-owner-reputation">
        <section class="profile-owner-reputation__metrics">
          ${metrics
            .map(
              (item) => `
            <article class="profile-owner-insight-card">
              <span>${normalize(item.label)}</span>
              <strong>${normalize(item.value)}</strong>
            </article>
          `
            )
            .join("")}
        </section>
        <section class="profile-owner-notes">
          ${items
            .map(
              (item) => `
            <article class="profile-owner-note-card">
              <h3>${normalize(item.title)}</h3>
              <p>${normalize(item.text)}</p>
            </article>
          `
            )
            .join("")}
        </section>
      </div>
    `);
  };

  const renderOwnerNotes = (key) => {
    const section = baseProfile.sections?.[key] || {};
    const items = section.items || [];
    return renderPanelShell(`
      <div class="profile-owner-notes">
        ${items
          .map(
            (item) => `
          <article class="profile-owner-note-card">
            <h3>${normalize(item.title || item.eyebrow)}</h3>
            <p>${normalize(item.text)}</p>
            ${item.footer ? `<div class="profile-owner-note-card__footer">${(item.footer || []).map((meta) => `<span>${normalize(meta)}</span>`).join("")}</div>` : ""}
          </article>
        `
          )
          .join("")}
      </div>
    `);
  };

  let highlightTimer = null;

  const renderHeroHighlight = (items, activeIndex = 0, animate = false) => {
    if (!els.highlights) return;
    const safeItems = items.length ? items : [
      { label: "Tempo de resposta", value: "Até 1h", detail: "em horário comercial" }
    ];
    const active = safeItems[activeIndex] || safeItems[0];

    if (!els.highlights.innerHTML.trim()) {
      els.highlights.innerHTML = `
        <article class="profile-highlight-strip${animate ? " is-changing" : ""}" data-profile-highlight-card>
          <span class="profile-highlight-strip__eyebrow">Agora</span>
          <div class="profile-highlight-strip__content">
            <div class="profile-highlight-strip__top">
              <strong class="profile-highlight-strip__value">${normalize(active.value)}</strong>
              <span class="profile-highlight-strip__label">${normalize(active.label)}</span>
            </div>
            <small class="profile-highlight-strip__detail">${normalize(active.detail)}</small>
          </div>
          <div class="profile-highlight-strip__dots" data-profile-highlight-dots>
            ${safeItems.map((_, index) => `<button class="profile-highlight-strip__dot ${index === activeIndex ? "is-active" : ""}" type="button" aria-label="Ver destaque ${index + 1}" data-profile-highlight-dot="${index}"></button>`).join("")}
          </div>
        </article>
      `;
      return;
    }

    const card = els.highlights.querySelector('[data-profile-highlight-card]');
    if (!card) return;
    const value = card.querySelector('.profile-highlight-strip__value');
    const label = card.querySelector('.profile-highlight-strip__label');
    const detail = card.querySelector('.profile-highlight-strip__detail');
    const dots = card.querySelectorAll('[data-profile-highlight-dot]');

    if (animate) {
      card.classList.add('is-changing');
      window.setTimeout(() => {
        if (value) value.textContent = normalize(active.value);
        if (label) label.textContent = normalize(active.label);
        if (detail) detail.textContent = normalize(active.detail);
        dots.forEach((dot) => {
          dot.classList.toggle('is-active', Number(dot.dataset.profileHighlightDot) === activeIndex);
        });
        requestAnimationFrame(() => card.classList.remove('is-changing'));
      }, 170);
      return;
    }

    if (value) value.textContent = normalize(active.value);
    if (label) label.textContent = normalize(active.label);
    if (detail) detail.textContent = normalize(active.detail);
    dots.forEach((dot) => {
      dot.classList.toggle('is-active', Number(dot.dataset.profileHighlightDot) === activeIndex);
    });
  };

  const bindHeroHighlights = (items) => {
    if (!els.highlights) return;
    const safeItems = (items || []).filter((item) => item && (item.value || item.label));
    if (!safeItems.length) return;

    let activeIndex = 0;
    renderHeroHighlight(safeItems, activeIndex, false);

    const startTimer = () => {
      if (highlightTimer || safeItems.length <= 1) return;
      highlightTimer = window.setInterval(() => {
        activeIndex = (activeIndex + 1) % safeItems.length;
        renderHeroHighlight(safeItems, activeIndex, true);
      }, 3200);
    };

    const stopTimer = () => {
      if (!highlightTimer) return;
      window.clearInterval(highlightTimer);
      highlightTimer = null;
    };

    stopTimer();
    startTimer();

    els.highlights.onmouseenter = stopTimer;
    els.highlights.onmouseleave = startTimer;
    els.highlights.querySelectorAll('[data-profile-highlight-dot]').forEach((dot) => {
      dot.onclick = () => {
        activeIndex = Number(dot.dataset.profileHighlightDot) || 0;
        renderHeroHighlight(safeItems, activeIndex, true);
      };
    });
  };

  const renderPanel = (key) => {
    switch (key) {
      case "services":
        return renderPanelShell(renderServiceCards());
      case "posts":
        return renderPosts();
      case "reviews":
        return renderReviews();
      case "about":
        return renderAbout();
      case "portfolio":
        return renderPortfolio();
      case "achievements":
        return renderAchievements();
      case "certificates":
        return renderCertificates();
      case "faq":
        return renderFaq();
      case "overview":
        return renderOwnerOverview();
      case "listings":
        return renderOwnerListings();
      case "reputation":
        return renderOwnerReputation();
      case "content":
        return renderOwnerNotes("content");
      case "settings":
        return renderOwnerNotes("settings");
      default:
        return "";
    }
  };

  const render = () => {
    const hero = baseProfile.hero || {};
    const stats = (hero.stats || []).map((item) => ({ value: item.value, label: item.label })) || [];
    const categories = (hero.badges || []).map((item) => ({ label: item.label, accent: item.tone === "accent" })) || [];
    const actions = (hero.actions || []).filter((item) => item.label !== "Compartilhar");
    const followAction = { label: "Seguir" };
    const rotatingHighlights = hero.rotatingHighlights || [];

    document.title = normalize(baseProfile.pageTitle || "Doke | Perfil");
    body.dataset.profileType = "professional";
    body.dataset.profileView = profileMode === "owner" ? "owner" : "visitor";

    els.name.textContent = normalize(hero.name || "Gabriel Antonio");
    els.username.textContent = normalize(hero.username || "@gabriel");
    els.city.textContent = normalize(hero.location || "Salvador, BA");
    els.avatar.textContent = normalize(hero.avatar || "GA");
    const shortHeadline = normalize(
      hero.headline ||
        "Especialista em ambientes residenciais com foco em leitura visual limpa, acabamento consistente e comunicação objetiva do início ao fim."
    );
    els.headline.innerHTML = `${shortHeadline} <button class="profile-bio__more" type="button" data-profile-more>Ver mais</button>`;
    els.categories.innerHTML = categories.map(categoryMarkup).join("");
    els.verified.hidden = !hero.verified;
    els.verified.dataset.tooltip = 'Selo de perfil verificado pela Doke.';
    els.stats.innerHTML = stats.map(statMarkup).join("");
    els.nameActions.innerHTML = "";
    els.actions.innerHTML = actions.map(actionMarkup).join("");
    bindHeroHighlights(rotatingHighlights);

    const labels = baseProfile.tabs || {};
    els.tabs.forEach((tab) => {
      const key = tab.dataset.profileTab;
      const visible = Boolean(labels[key]);
      const isActive = visible && key === state.activeTab;
      tab.hidden = !visible;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    Object.entries(panelMap).forEach(([key, panel]) => {
      const isActive = key === state.activeTab;
      if (isActive || !panel.innerHTML.trim()) panel.innerHTML = renderPanel(key);
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });

    window.DokeUiSelect?.enhanceAll(root);
    updateUrl();

    root.querySelectorAll('[data-profile-category]').forEach((button) => {
      button.addEventListener('click', () => {
        const label = button.dataset.profileCategory;
        if (!label) return;
        window.open(`resultados.html?q=${encodeURIComponent(label)}`, '_blank', 'noopener');
      });
    });

    root.querySelectorAll("[data-profile-stat]").forEach((button) => {
      button.addEventListener("click", () => {
        const label = button.dataset.profileStat || "";
        if (label.includes("nota") || label.includes("avalia")) {
          openReviewsPanel();
          return;
        }
        if (label.includes("seguidores")) {
          openFollowersPanel();
        }
      });
    });

    root.querySelector("[data-profile-services-select-toggle]")?.addEventListener("click", () => {
      state.selectingServices = !state.selectingServices;
      if (!state.selectingServices) state.selectedServices = [];
      render();
    });

    root.querySelector("[data-profile-services-edit]")?.addEventListener("click", () => {
      if (state.selectedServices.length !== 1) return;
      window.location.href = "detalhe-anuncio.html";
    });

    root.querySelector("[data-profile-posts-select-toggle]")?.addEventListener("click", () => {
      state.selectingPosts = !state.selectingPosts;
      if (!state.selectingPosts) state.selectedPosts = [];
      render();
    });

    root.querySelector("[data-profile-posts-edit]")?.addEventListener("click", () => {
      if (state.selectedPosts.length !== 1) return;
      window.location.href = "detalhe-anuncio.html";
    });

    root.querySelectorAll("[data-profile-service-select]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const index = Number(button.dataset.profileServiceSelect);
        if (Number.isNaN(index)) return;
        if (!state.selectingServices) state.selectingServices = true;
        toggleServiceSelection(index);
      });
    });

    root.querySelectorAll("[data-profile-service-card]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (!state.selectingServices) return;
        if (event.target.closest(".service-card__cta") || event.target.closest(".service-card__favorite")) return;
        const index = Number(card.dataset.profileServiceCard);
        if (Number.isNaN(index)) return;
        toggleServiceSelection(index);
      });
    });

    root.querySelectorAll("[data-profile-post-select]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const id = button.dataset.profilePostSelect;
        if (!id) return;
        if (!state.selectingPosts) state.selectingPosts = true;
        togglePostSelection(id);
      });
    });

    root.querySelectorAll("[data-profile-post-card]").forEach((card) => {
      card.addEventListener("click", () => {
        if (!state.selectingPosts) return;
        const id = card.dataset.profilePostCard;
        if (!id) return;
        togglePostSelection(id);
      });
    });

    root.querySelector('[data-profile-more]')?.addEventListener('click', () => {
      state.activeTab = 'about';
      render();
      panelMap.about?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    root.querySelector('[data-profile-follow]')?.addEventListener('click', (event) => {
      const button = event.currentTarget;
      const active = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(!active));
      button.textContent = active ? 'Seguir' : '✓ Seguindo';
      button.classList.toggle('is-active', !active);
    });

    root.querySelectorAll('[data-profile-faq-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = button.closest('.profile-faq-card');
        if (!card) return;
        const answer = card.querySelector('.profile-faq-card__answer');
        const icon = button.querySelector('span[aria-hidden="true"]');
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        if (answer) answer.hidden = expanded;
        if (icon) icon.textContent = expanded ? '+' : '−';
      });
    });

    document.querySelectorAll("[data-profile-review-hub]").forEach((hub) => {
      if (hub.dataset.profileReviewReady === "true") return;
      hub.dataset.profileReviewReady = "true";

      const select = hub.parentElement?.querySelector("[data-profile-review-select]");
      const summary = hub.querySelector(".profile-review-hub__summary");
      const list = hub.querySelector(".profile-review-hub__list");
      const filters = [...hub.querySelectorAll("[data-profile-review-filter]")];
      const raw = hub.dataset.reviewAds || "[]";
      const avatarPool = [
        "assets/img/auth/carpinteira.png",
        "assets/img/auth/pintor.png",
        "assets/img/auth/pintor-hero.png",
        "assets/img/auth/marceneira-hero.png"
      ];
      let ads = [];
      let activeFilter = "all";

      try {
        ads = JSON.parse(raw.replace(/&apos;/g, "'"));
      } catch {}

      const draw = (id) => {
        const active = ads.find((item) => item.id === id) || ads[0];
        if (!active || !summary || !list) return;
        const summaryCards = [
          {
            label: "Avaliação do anúncio",
            value: active.score,
            text: active.count
          },
          ...active.metrics
        ].slice(0, 6);

        summary.innerHTML = `
          ${summaryCards
            .map(
              (metric, index) => `
            <article class="profile-review-metric ${index === 0 ? "profile-review-metric--score" : "profile-review-metric--compact"}">
              <span>${metric.label}</span>
              <strong>${metric.value}</strong>
              ${index === 0 ? `<div class="profile-review-metric__stars">${active.stars}</div>` : ""}
              <small>${metric.text}</small>
            </article>
          `
            )
            .join("")}
        `;

        list.innerHTML = active.reviews
          .map(
            (item, index) => `
          <article class="profile-review-entry" data-review-tone="${Number(String(item.rating).replace(",", ".")) >= 4.8 ? "positive" : "negative"}">
            <div class="profile-review-entry__head">
              <div class="profile-review-entry__identity">
                <span class="profile-review-entry__avatar-shell">
                  <img class="profile-review-entry__avatar" src="${avatarPool[index % avatarPool.length]}" alt="Foto de perfil de ${item.name}">
                </span>
                <div>
                  <strong>${item.name}</strong>
                  <span>${item.meta}</span>
                </div>
              </div>
              <div class="profile-review-entry__rating">
                <strong>${item.rating}</strong>
                <span>${item.stars}</span>
              </div>
            </div>
            <p>${item.text}</p>
            <div class="profile-review-entry__chips">${item.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
          </article>
        `
          )
          .join("");

        const entries = [...list.querySelectorAll(".profile-review-entry")];
        let visibleCount = 0;
        entries.forEach((entry) => {
          const visible = activeFilter === "all" || entry.dataset.reviewTone === activeFilter;
          entry.hidden = !visible;
          if (visible) visibleCount += 1;
        });

        const oldEmpty = list.querySelector(".profile-review-empty");
        if (!visibleCount) {
          if (!oldEmpty) {
            list.insertAdjacentHTML(
              "beforeend",
              `<article class="profile-review-empty"><strong>Nenhuma avaliação neste filtro</strong><p>Troque o filtro ou selecione outro anúncio para ver mais comentários.</p></article>`
            );
          }
        } else if (oldEmpty) {
          oldEmpty.remove();
        }
      };

      draw(select?.value);
      select?.addEventListener("change", () => draw(select.value));
      filters.forEach((button) => {
        button.addEventListener("click", () => {
          activeFilter = button.dataset.profileReviewFilter || "all";
          filters.forEach((item) => item.classList.toggle("is-active", item === button));
          draw(select?.value);
        });
      });
    });
  };

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeTab = tab.dataset.profileTab;
      render();
    });
  });

  els.followersClose.forEach((button) => {
    button.addEventListener("click", closeFollowersModal);
  });

  els.followersSearch?.addEventListener("input", (event) => {
    renderFollowersModal(event.currentTarget.value);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeFollowersModal();
  });

  if (window.DokeProfileShare && els.shareButtons.length) {
    window.DokeProfileShare.bind(els.shareButtons, () => ({
      title: document.title,
      text: "Confira este perfil na Doke.",
      url: window.location.href
    }));
  }

  render();
};

window.DokeInitProfile();
