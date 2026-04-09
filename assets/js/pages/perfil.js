window.DokeInitProfile = () => {
  const root = document.querySelector("[data-profile-root]");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const body = document.body;
  const data = window.DokeProfileData || {};
  const baseProfile = data.professionalPublic || {};
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
    actions: root.querySelector("[data-profile-actions]"),
    tabs: [...root.querySelectorAll("[data-profile-tab]")],
    panels: [...root.querySelectorAll("[data-profile-panel]")],
    shareButtons: [...document.querySelectorAll("[data-profile-share]")]
  };

  const panelMap = Object.fromEntries(els.panels.map((panel) => [panel.dataset.profilePanel, panel]));
  const state = {
    activeTab: els.tabs.some((tab) => tab.dataset.profileTab === params.get("panel"))
      ? params.get("panel")
      : "services"
  };

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

  const categoryMarkup = (item) =>
    `<span class="profile-category-pill ${item.accent ? "profile-category-pill--accent" : ""}">${normalize(item.label)}</span>`;

  const statMarkup = (item) => `
    <div class="profile-stat">
      <span class="profile-stat__value">${normalize(item.value)}</span>
      <span class="profile-stat__label">${normalize(item.label)}</span>
    </div>
  `;

  const actionMarkup = (item) => `
    <button class="profile-action ${item.tone === "primary" || item.style === "primary" ? "profile-action--success" : ""}" type="button">
      ${normalize(item.label)}
    </button>
  `;

  const followActionMarkup = (item) => `
    <button class="profile-follow-action" type="button">${normalize(item.label)}</button>
  `;

  const renderPanelShell = (content) => `
    <div class="profile-panel-layout profile-panel-layout--full">
      <div class="profile-panel-main">${content}</div>
    </div>
  `;

  const renderServiceCards = () => {
    const items = servicePool.slice(0, 3);
    return `
      <div class="results-grid profile-services-results">
        ${items
          .map(
            (item) => `
          <article class="service-card service-card--featured service-card--feed">
            <div class="service-card__media ${item.mediaClass}">
              <button class="service-card__favorite" type="button" aria-label="Salvar anúncio">
                <svg viewBox="0 0 24 24"><path d="m12 19-6.6-6.3a4.2 4.2 0 0 1 0-6 4.4 4.4 0 0 1 6.1 0L12 7.2l.5-.5a4.4 4.4 0 0 1 6.1 0 4.2 4.2 0 0 1 0 6Z"></path></svg>
              </button>
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
                  (item) => `
                <article class="video-card ${item.mediaClass}">
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
                  (item) => `
                <article class="comparison-card">
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
      default:
        return "";
    }
  };

  const render = () => {
    const hero = baseProfile.hero || {};
    const stats = [
      { value: "4,9", label: "Nota média" },
      { value: "46", label: "Projetos" },
      { value: "2h", label: "Resposta" }
    ];
    const categories = [
      { label: "Profissional verificado", accent: true },
      { label: "Design de interiores" }
    ];
    const actions = [
      { label: "Orçamento", tone: "primary" },
      { label: "Mensagem" }
    ];
    const followAction = { label: "Seguir" };

    document.title = "Doke | Perfil público do profissional";
    body.dataset.profileType = "professional";
    body.dataset.profileView = "visitor";

    els.name.textContent = normalize(hero.name || "Gabriel Antonio");
    els.username.textContent = normalize(hero.username || "@gabriel");
    els.city.textContent = normalize(hero.location || "Salvador, BA");
    els.avatar.textContent = normalize(hero.avatar || "GA");
    els.headline.textContent =
      "Especialista em ambientes residenciais com foco em leitura visual limpa, acabamento consistente e comunicação objetiva do início ao fim.";
    els.categories.innerHTML = categories.map(categoryMarkup).join("");
    els.verified.hidden = !hero.verified;
    els.stats.innerHTML = stats.map(statMarkup).join("");
    els.nameActions.innerHTML = followActionMarkup(followAction);
    els.actions.innerHTML = actions.map(actionMarkup).join("");

    els.tabs.forEach((tab) => {
      const isActive = tab.dataset.profileTab === state.activeTab;
      tab.classList.toggle("is-active", isActive);
    });

    Object.entries(panelMap).forEach(([key, panel]) => {
      const isActive = key === state.activeTab;
      if (isActive || !panel.innerHTML.trim()) panel.innerHTML = renderPanel(key);
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });

    window.DokeUiSelect?.enhanceAll(root);
    updateUrl();

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
            <article class="profile-review-metric ${index === 0 ? "profile-review-metric--score" : ""}">
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
