window.DokeInitProfile = () => {
  const root = document.querySelector("[data-profile-root]");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const body = document.body;
  const data = window.DokeProfileData || {};
  const profileMode = params.get("mode");
  const publicProfile = data.professionalPublic || {};
  const clientPublicProfile = data.clientPublic || {};
  const ownerProfile = data.professionalOwner || {};
  const clientOwnerProfile = {
    pageTitle: "Doke | Meu perfil de cliente",
    hero: {
      ...(clientPublicProfile.hero || {}),
      badges: [],
      stats: [
        { value: "18,4 mil", label: "seguidores" },
        { value: "26", label: "serviços feitos" },
        { value: "4,9", label: "nota média" }
      ],
      actions: [
        { label: "Editar perfil", tone: "primary" },
        { label: "Ver perfil público", href: "perfil.html?mode=client&from=owner", tone: "ghost" }
      ],
      rotatingHighlights: [
        { label: "Comunidade", value: "18,4 mil", detail: "seguidores acompanhando seu perfil" },
        { label: "Execuções", value: "26", detail: "serviços concluídos com profissionais" },
        { label: "Resposta", value: "Até 2h", detail: "tempo médio para responder contatos" }
      ]
    },
    tabs: {
      about: "Sobre",
      portfolio: "Portfólios"
    },
    sections: {
      about: clientPublicProfile.sections?.about || {},
      portfolio: {
        ...(clientPublicProfile.sections?.collections || {}),
        title: "Portfólios compartilhados",
        intro: "Portfólios salvos e republicados no seu perfil para orientar profissionais com o estilo que você busca."
      }
    }
  };
  const normalizeActionLabel = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const baseProfile =
    profileMode === "owner"
      ? {
          ...publicProfile,
          ...ownerProfile,
          hero: {
            ...(publicProfile.hero || {}),
            actions: (ownerProfile.hero?.actions || publicProfile.hero?.actions || [])
              .filter((item) => item && !normalizeActionLabel(item.label).includes("novo anuncio"))
              .map((item) => {
                const isEditAction = normalizeActionLabel(item.label).includes("editar vitrine publica");

                return {
                  ...item,
                  href: isEditAction ? undefined : item.href,
                  label: isEditAction ? "Editar perfil" : item.label
                };
              }),
            badges: [...((publicProfile.hero?.badges || []).slice(0, 2))]
          },
          tabs: {
            ...(publicProfile.tabs || {}),
            overview: "Estatísticas"
          },
          sections: {
            ...(publicProfile.sections || {}),
            overview: ownerProfile.sections?.overview || {}
          }
        }
      : profileMode === "client"
        ? {
            ...clientPublicProfile,
            hero: {
              ...(clientPublicProfile.hero || {}),
              badges: [],
              stats: [
                { value: "18,4 mil", label: "seguidores" },
                { value: "26", label: "serviços feitos" },
                { value: "4,9", label: "nota média" }
              ],
              rotatingHighlights: [
                { label: "Comunidade", value: "18,4 mil", detail: "seguidores acompanhando o perfil" },
                { label: "Execuções", value: "26", detail: "serviços concluídos com profissionais" },
                { label: "Resposta", value: "Até 2h", detail: "tempo médio para responder contatos" }
              ],
              actions: [
                { label: "Mensagem", href: "mensagens.html", tone: "primary" },
                ...(params.get("from") === "owner"
                  ? [{ label: "Voltar ao meu perfil", href: "perfil.html?mode=client-owner", tone: "ghost" }]
                  : [])
              ]
            },
            tabs: {
              about: clientPublicProfile.tabs?.about || "Sobre",
              portfolio: clientPublicProfile.tabs?.collections || "Portfólios"
            },
            sections: {
              about: clientPublicProfile.sections?.about || {},
              portfolio: {
                ...(clientPublicProfile.sections?.collections || {}),
                title: "Portfólios compartilhados",
                intro: "Portfólios salvos e republicados no perfil do cliente, no estilo de referência compartilhada entre cliente e profissional."
              }
            }
          }
        : profileMode === "client-owner"
          ? clientOwnerProfile
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
    followersClose: [...document.querySelectorAll("[data-profile-followers-close]")],
    editModal: document.querySelector("[data-profile-edit-modal]"),
    editClose: [...document.querySelectorAll("[data-profile-edit-close]")],
    editForm: document.querySelector("[data-profile-edit-form]"),
    editName: document.querySelector("[data-profile-edit-name]"),
    editBio: document.querySelector("[data-profile-edit-bio]"),
    editHighlight: document.querySelector("[data-profile-edit-highlight]"),
    editAvatar: document.querySelector("[data-profile-edit-avatar]"),
    editHighlightField: document.querySelector("[data-profile-edit-highlight-field]"),
    editCategoryField: document.querySelector("[data-profile-edit-category-field]")
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

  const getCategoryIcon = (item) => {
    const label = normalize(item?.label).toLowerCase();
    const preferredKey = item?.iconKey || label;

    if (window.DokeCategoryIcons && typeof window.DokeCategoryIcons.iconMarkup === "function") {
      return window.DokeCategoryIcons.iconMarkup(preferredKey);
    }

    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h10a2 2 0 0 0 0-4H9"></path><path d="M15 7v3"></path><path d="M15 10h-4a2 2 0 0 0-2 2v2"></path><path d="M9 14v5"></path></svg>`;
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

  const closeEditModal = () => {
    if (!els.editModal) return;
    els.editModal.hidden = true;
    body.classList.remove("has-modal-open");
  };

  const openEditModal = () => {
    if (!els.editModal) return;
    closeFollowersModal();
    const hero = baseProfile.hero || {};
    const firstHighlight = (hero.rotatingHighlights || [])[0] || {};
    const isClientProfile = profileMode === "client" || profileMode === "client-owner";
    if (els.editName) els.editName.value = normalize(hero.name || "Gabriel Antonio");
    if (els.editBio) els.editBio.value = normalize(hero.headline || "");
    if (els.editHighlight) els.editHighlight.value = normalize(firstHighlight.detail || "");
    if (els.editAvatar) els.editAvatar.textContent = normalize(hero.avatar || "GA");
    if (els.editHighlightField) els.editHighlightField.hidden = isClientProfile;
    if (els.editCategoryField) els.editCategoryField.hidden = isClientProfile;
    document.querySelectorAll("[data-profile-edit-preview-name]").forEach((node) => {
      node.textContent = els.editName?.value || normalize(hero.name || "Gabriel Antonio");
    });
    document.querySelectorAll("[data-profile-edit-preview-username]").forEach((node) => {
      const usernameField = document.querySelector("[data-profile-edit-username]");
      node.textContent = usernameField?.value || normalize(hero.username || "@gabriel");
    });
    document.querySelectorAll("[data-profile-edit-preview-city]").forEach((node) => {
      const cityField = document.querySelector("[data-profile-edit-city]");
      node.textContent = cityField?.value || normalize(hero.location || "Salvador, BA");
    });
    els.editModal.hidden = false;
    body.classList.add("has-modal-open");
    window.setTimeout(() => {
      els.editModal?.querySelector("input, textarea")?.focus();
    }, 30);
  };

  const bindOwnerDashboard = () => {
    const dashboard = root.querySelector("[data-owner-dashboard]");
    if (!dashboard || dashboard.dataset.ready === "true") return;
    dashboard.dataset.ready = "true";

    const lineChart = dashboard.querySelector("[data-dashboard-line-chart]");
    const total = dashboard.querySelector("[data-dashboard-total]");
    const labelButtons = [...dashboard.querySelectorAll("[data-dashboard-index]")];
    const periodButtons = [...dashboard.querySelectorAll("[data-dashboard-period]")];
    const pointCircles = [...dashboard.querySelectorAll("[data-dashboard-point-circle]")];
    const funnelRows = [...dashboard.querySelectorAll("[data-dashboard-funnel]")];

    const chartLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const readSeries = (key) =>
      (lineChart?.dataset[`series${key.toUpperCase()}`] || "")
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => !Number.isNaN(value));

    const drawSeries = (key) => {
      if (!lineChart) return;
      const series = readSeries(key);
      if (!series.length) return;
      const max = Math.max(...series, 1);
      const coords = series.map((value, index) => ({
        x: 26 + index * 58,
        y: 164 - (value / max) * 112,
        value
      }));
      const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
      const area = `M ${coords[0].x} 164 L ${coords.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${coords[coords.length - 1].x} 164 Z`;

      lineChart.querySelector(".profile-owner-line-chart__line")?.setAttribute("points", line);
      lineChart.querySelector(".profile-owner-line-chart__area")?.setAttribute("d", area);
      pointCircles.forEach((circle, index) => {
        const point = coords[index];
        if (!point) return;
        circle.setAttribute("cx", String(point.x));
        circle.setAttribute("cy", String(point.y));
      });
      labelButtons.forEach((button, index) => {
        const value = series[index];
        if (value == null) return;
        button.querySelector("span").textContent = chartLabels[index];
        button.querySelector("strong").textContent = String(value);
        button.classList.toggle("is-active", value === Math.max(...series));
      });
      if (total) total.textContent = String(series.reduce((sum, value) => sum + value, 0));
    };

    periodButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.dashboardPeriod;
        if (!key) return;
        periodButtons.forEach((item) => item.classList.toggle("is-active", item === button));
        drawSeries(key);
      });
    });

    labelButtons.forEach((button) => {
      button.addEventListener("mouseenter", () => {
        labelButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      });
      button.addEventListener("focus", () => {
        labelButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      });
    });

    funnelRows.forEach((row) => {
      row.addEventListener("mouseenter", () => {
        funnelRows.forEach((item) => item.classList.toggle("is-active", item === row));
      });
      row.addEventListener("focus", () => {
        funnelRows.forEach((item) => item.classList.toggle("is-active", item === row));
      });
    });
  };

  const escapeAttr = (value) => String(value || "").replace(/"/g, "&quot;");

  const actionRole = (label = "") => {
    const key = normalizeActionLabel(label);
    if (key.includes("solicitar orcamento")) return "primary";
    if (key.includes("seguir")) return "follow";
    if (key.includes("mensagem")) return "message";
    return "secondary";
  };

  const actionMarkup = (item) => {
    const classes = `profile-action ${item.tone === "primary" || item.style === "primary" ? "profile-action--success" : ""}`.trim();
    const labelKey = normalizeActionLabel(item.label);
    const role = actionRole(item.label);
    if (labelKey.includes("solicitar orcamento")) {
      return `
        <button class="${classes}" type="button" data-profile-action-role="${role}" data-budget-open data-budget-provider="${escapeAttr(item.provider || "Studio Aquarela")}" data-budget-service="${escapeAttr(item.service || "reforma residencial de alto padrao")}">
          ${normalize(item.label)}
        </button>
      `;
    }
    if (item.href) {
      return `
        <a class="${classes}" href="${item.href}" data-profile-action-role="${role}">
          ${normalize(item.label)}
        </a>
      `;
    }
    return `
      <button class="${classes}" type="button" data-profile-action-role="${role}">
        ${normalize(item.label)}
      </button>
    `;
  };

  const followActionMarkup = (item) => `
    <button class="profile-follow-action" type="button" data-profile-follow data-profile-action-role="follow" aria-pressed="false">${normalize(item.label)}</button>
  `;

  const renderPanelShell = (content) => `
    <div class="profile-panel-layout profile-panel-layout--full">
      <div class="profile-panel-main">${content}</div>
    </div>
  `;

  const renderClientRequests = () => {
    const section = baseProfile.sections?.services || {};
    const items = section.items || [];
    return `
      <div class="profile-owner-listings">
        ${items
          .map(
            (item) => `
          <article class="profile-owner-listing-card">
            <div class="profile-owner-listing-card__top">
              <span class="profile-owner-listing-card__status">${normalize(item.status)}</span>
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
    `;
  };

  const renderClientReferences = () => {
    const section = baseProfile.sections?.posts || {};
    const items = section.items || [];
    return renderPanelShell(`
      <div class="profile-owner-notes">
        ${items
          .map(
            (item) => `
          <article class="profile-owner-note-card">
            <span class="profile-owner-listing-card__status">${normalize(item.eyebrow || "Referência")}</span>
            <h3>${normalize(item.title)}</h3>
            <p>${normalize(item.text)}</p>
            <div class="profile-owner-note-card__footer">
              ${(item.footer || []).map((meta) => `<span>${normalize(meta)}</span>`).join("")}
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    `);
  };

  const renderServiceCards = () => {
    if (profileMode === "client") {
      return renderClientRequests();
    }
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
    profileMode === "client"
      ? renderClientReferences()
      : renderPanelShell(`
      <div class="profile-posts-stack ${profileMode === "owner" ? "profile-posts-stack--owner" : ""}">
        ${profileMode === "owner" ? `
        <div class="profile-services-toolbar">
          <button class="profile-services-toolbar__action profile-services-toolbar__action--primary" type="button">Novo</button>
          <button class="profile-services-toolbar__action ${state.selectingPosts ? "is-active" : ""}" type="button" data-profile-posts-select-toggle>${state.selectingPosts ? "Cancelar" : "Selecionar"}</button>
          ${state.selectedPosts.length === 1 ? `<button class="profile-services-toolbar__action" type="button" data-profile-posts-edit>Editar an?ncio</button>` : ""}
          ${state.selectedPosts.length > 1 ? `<span class="profile-services-toolbar__hint">S? d? para editar um an?ncio por vez.</span>` : ""}
        </div>
        ` : ""}
        <section class="short-videos" aria-labelledby="profile-short-videos-title">
          <div class="content-rail">
            <button class="home-categories__arrow content-rail__arrow content-rail__arrow--prev" type="button" aria-label="Ver v?deos anteriores" data-rail-arrow="prev" data-rail-target="profile-short-videos-track">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5 5 5"></path></svg>
            </button>
            <div class="short-videos__track profile-posts-videos" id="profile-short-videos-track" data-rail-track>
              ${shortVideoPool
                .map(
                  (item, index) => `
                <article class="video-card ${item.mediaClass} ${state.selectingPosts ? "is-selecting" : ""} ${state.selectedPosts.includes(`video-${index}`) ? "is-selected" : ""}" data-profile-post-card="video-${index}">
                  ${profileMode === "owner" && state.selectingPosts ? `<button class="profile-post-select-indicator ${state.selectedPosts.includes(`video-${index}`) ? "is-selected" : ""}" type="button" data-profile-post-select="video-${index}" aria-label="Selecionar publica??o">${state.selectedPosts.includes(`video-${index}`) ? "?" : ""}</button>` : ""}
                  <span class="video-card__play">?</span>
                  <div class="video-card__content"><strong>${normalize(item.title)}</strong></div>
                </article>
              `
                )
                .join("")}
            </div>
            <button class="home-categories__arrow content-rail__arrow content-rail__arrow--next" type="button" aria-label="Ver pr?ximos v?deos" data-rail-arrow="next" data-rail-target="profile-short-videos-track">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5 5-5 5"></path></svg>
            </button>
          </div>
        </section>

        <section class="before-after">
          <div class="content-rail">
            <button class="home-categories__arrow content-rail__arrow content-rail__arrow--prev" type="button" aria-label="Ver casos anteriores" data-rail-arrow="prev" data-rail-target="profile-before-after-track">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5 5 5 5"></path></svg>
            </button>
            <div class="comparison-grid profile-posts-comparison" id="profile-before-after-track" data-rail-track>
              ${beforeAfterPool
                .map(
                  (item, index) => `
                <article class="comparison-card ${state.selectingPosts ? "is-selecting" : ""} ${state.selectedPosts.includes(`compare-${index}`) ? "is-selected" : ""}" data-profile-post-card="compare-${index}">
                  ${profileMode === "owner" && state.selectingPosts ? `<button class="profile-post-select-indicator ${state.selectedPosts.includes(`compare-${index}`) ? "is-selected" : ""}" type="button" data-profile-post-select="compare-${index}" aria-label="Selecionar publica??o">${state.selectedPosts.includes(`compare-${index}`) ? "?" : ""}</button>` : ""}
                  <div class="comparison-card__visual ${item.visualClass}">
                    <div class="comparison-card__half comparison-card__half--before"><span>Antes</span></div>
                    <div class="comparison-card__half comparison-card__half--after"><span>Depois</span></div>
                  </div>
                  <div class="comparison-card__body">
                    <strong>${normalize(item.title)}</strong>
                    <div class="comparison-card__meta">
                      <span>Por ${normalize(item.author)}</span>
                      <span>? ${String(item.rating).replace(".", ",")}</span>
                    </div>
                  </div>
                </article>
              `
                )
                .join("")}
            </div>
            <button class="home-categories__arrow content-rail__arrow content-rail__arrow--next" type="button" aria-label="Ver pr?ximos casos" data-rail-arrow="next" data-rail-target="profile-before-after-track">
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
      count: normalize(group.count),
      metrics: (group.highlights || []).slice(0, 6).map((item) => ({
        label: normalize(item.label),
        value: normalize(item.value),
        icon: normalize(item.icon || '✦')
      })),
      reviews: (group.items || []).map((item) => {
        const meta = normalize(item.meta);
        const normalizedMeta = meta.toLowerCase();
        const isRecent = /dia|dias|semana|semanas|recente/.test(normalizedMeta);
        return {
          name: normalize(item.author),
          meta,
          rating: normalize(item.rating),
          text: normalize(item.text),
          tags: (item.tags || []).map(normalize),
          groups: `${Number(String(item.rating).replace(',', '.')) >= 4.8 ? 'positivas ' : ''}${isRecent ? 'recentes ' : ''}`.trim() || 'all'
        };
      })
    }));

    return renderPanelShell(`
      <div class="profile-review-detail">
        ${reviewAds.length > 1 ? `
          <div class="profile-review-switcher">
            <label class="profile-review-switcher__label" for="profile-review-ad">Anúncio</label>
            <select class="profile-review-switcher__select" id="profile-review-ad" data-profile-review-select data-ui-select>
              ${reviewAds.map((ad, index) => `<option value="${ad.id}" ${index === 0 ? 'selected' : ''}>${ad.label}</option>`).join('')}
            </select>
          </div>
        ` : ''}
        <div class="profile-review-section-head">
          <span>${reviewAds[0]?.score || '5,0'} de 5</span>
          <h3>Preferido pelos clientes</h3>
        </div>
        <div class="profile-review-hub" data-profile-review-hub data-review-ads='${JSON.stringify(reviewAds).replace(/'/g, '&apos;')}'></div>
      </div>
    `);
  };

  const renderAbout = () => {
    const section = baseProfile.sections?.about || {};
    const facts = section.facts || [];
    const blocks = section.blocks || [];

    if (profileMode === "client" || profileMode === "client-owner") {
      return renderPanelShell(`
        <div class="profile-client-about">
          <article class="profile-client-about__card">
            ${blocks.map((item) => `<p>${normalize(item.text)}</p>`).join("")}
          </article>
        </div>
      `);
    }

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
    const dashboardSeries = {
      "7d": [3, 5, 4, 7, 6, 8, 6],
      "30d": [8, 11, 9, 14, 13, 17, 15],
      "90d": [18, 24, 20, 28, 30, 34, 32]
    };
    const conversionStages = [
      { label: "Visualizações", value: 1280, color: "rgba(38, 99, 164, 0.9)" },
      { label: "Cliques", value: 412, color: "rgba(28, 145, 143, 0.9)" },
      { label: "Conversas", value: 96, color: "rgba(37, 174, 122, 0.9)" },
      { label: "Orçamentos", value: 28, color: "rgba(255, 176, 64, 0.95)" }
    ];
    const sourceSegments = [
      { label: "Busca", value: 46, tone: "#246eb2" },
      { label: "Seguidores", value: 28, tone: "#21a18f" },
      { label: "Avaliações", value: 16, tone: "#62d59f" },
      { label: "Portfólio", value: 10, tone: "#ffb04c" }
    ];
    const aiInsights = [
      {
        badge: "A??o recomendada",
        title: "Separar an?ncio de consultoria do an?ncio de execu??o",
        text: "A IA identificou inten??o misturada nos cliques. Separar os dois fluxos tende a melhorar a resposta qualificada e reduzir conversa morna.",
        cta: "Aplicar sugest?o"
      },
      {
        badge: "Resposta sugerida",
        title: "Lead com alto potencial parado h? 42 min",
        text: "Cliente abriu portf?lio, voltou ao an?ncio e clicou em avalia??es. Melhor resposta: curta, com pergunta filtradora e proposta de visita.",
        cta: "Ver resposta"
      },
      {
        badge: "Conte?do da semana",
        title: "Post recomendado: antes e depois com prova visual curta",
        text: "Seu perfil est? convertendo melhor quando mostra processo visual em menos de 20 segundos. A IA sugere publicar isso primeiro.",
        cta: "Gerar rascunho"
      }
    ];
    const chartPoints = dashboardSeries["7d"];
    const chartMax = Math.max(...chartPoints, 1);
    const chartLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const chartCoords = chartPoints.map((value, index) => {
      const x = 26 + index * 58;
      const y = 164 - (value / chartMax) * 112;
      return { x, y, value, label: chartLabels[index] };
    });
    const chartLine = chartCoords.map((point) => `${point.x},${point.y}`).join(" ");
    const chartArea = `M ${chartCoords[0].x} 164 L ${chartCoords.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${chartCoords[chartCoords.length - 1].x} 164 Z`;
    const funnelMax = Math.max(...conversionStages.map((item) => item.value), 1);
    const sourceGradient = sourceSegments
      .reduce((acc, item) => {
        const start = acc.offset;
        const end = start + item.value;
        acc.parts.push(`${item.tone} ${start}% ${end}%`);
        acc.offset = end;
        return acc;
      }, { offset: 0, parts: [] })
      .parts
      .join(", ");
    return renderPanelShell(`
      <div class="profile-owner-overview profile-owner-dashboard" data-owner-dashboard>
        <section class="profile-owner-dashboard__board">
          <article class="profile-owner-chart-card profile-owner-chart-card--wide" data-dashboard-line-card>
            <div class="profile-owner-chart-card__top">
              <div>
                <span class="profile-owner-chart-card__eyebrow">Fluxo</span>
                <h3>Evolução de leads</h3>
              </div>
              <div class="profile-owner-chart-switch">
                <button class="profile-owner-chart-switch__button is-active" type="button" data-dashboard-period="7d">7d</button>
                <button class="profile-owner-chart-switch__button" type="button" data-dashboard-period="30d">30d</button>
                <button class="profile-owner-chart-switch__button" type="button" data-dashboard-period="90d">90d</button>
              </div>
            </div>
            <div class="profile-owner-chart-card__highlight">
              <strong data-dashboard-total>${chartPoints.reduce((sum, value) => sum + value, 0)}</strong>
              <span>Leads no período selecionado</span>
            </div>
            <div class="profile-owner-line-chart" data-dashboard-line-chart data-series-7d="${dashboardSeries["7d"].join(",")}" data-series-30d="${dashboardSeries["30d"].join(",")}" data-series-90d="${dashboardSeries["90d"].join(",")}">
              <svg viewBox="0 0 400 190" aria-hidden="true">
                <defs>
                  <linearGradient id="profile-owner-line-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="rgba(69, 220, 176, 0.38)"></stop>
                    <stop offset="100%" stop-color="rgba(69, 220, 176, 0.02)"></stop>
                  </linearGradient>
                </defs>
                <path class="profile-owner-line-chart__area" d="${chartArea}"></path>
                <polyline class="profile-owner-line-chart__line" points="${chartLine}"></polyline>
                ${chartCoords
                  .map(
                    (point) => `
                  <g class="profile-owner-line-chart__point" data-dashboard-point>
                    <circle cx="${point.x}" cy="${point.y}" r="6" data-dashboard-point-circle></circle>
                  </g>
                `
                  )
                  .join("")}
              </svg>
              <div class="profile-owner-line-chart__labels" data-dashboard-labels>
                ${chartCoords
                  .map(
                    (point) => `
                  <button class="profile-owner-line-chart__label ${point.value === Math.max(...chartPoints) ? "is-active" : ""}" type="button" data-dashboard-index="${chartCoords.indexOf(point)}">
                    <span>${point.label}</span>
                    <strong>${point.value}</strong>
                  </button>
                `
                  )
                  .join("")}
              </div>
            </div>
          </article>

          <article class="profile-owner-chart-card">
            <div class="profile-owner-chart-card__top">
              <div>
                <span class="profile-owner-chart-card__eyebrow">Funil</span>
                <h3>Conversão por etapa</h3>
              </div>
            </div>
            <div class="profile-owner-funnel">
              ${conversionStages
                .map(
                  (item, index) => `
                <button class="profile-owner-funnel__row ${index === 0 ? "is-active" : ""}" type="button" data-dashboard-funnel="${index}">
                  <div class="profile-owner-funnel__meta">
                    <span>${item.label}</span>
                    <strong>${item.value}</strong>
                  </div>
                  <div class="profile-owner-funnel__bar">
                    <span style="width:${(item.value / funnelMax) * 100}%; background:${item.color};"></span>
                  </div>
                </button>
              `
                )
                .join("")}
            </div>
          </article>

          <article class="profile-owner-chart-card">
            <div class="profile-owner-chart-card__top">
              <div>
                <span class="profile-owner-chart-card__eyebrow">Origem</span>
                <h3>De onde chegam os contatos</h3>
              </div>
            </div>
            <div class="profile-owner-source">
              <div class="profile-owner-source__ring" style="--source-gradient:${sourceGradient};">
                <div class="profile-owner-source__ring-core">
                  <strong>100%</strong>
                  <span>do tráfego</span>
                </div>
              </div>
              <div class="profile-owner-source__legend">
                ${sourceSegments
                  .map(
                    (item) => `
                  <button class="profile-owner-source__item" type="button">
                    <span class="profile-owner-source__dot" style="--dot:${item.tone};"></span>
                    <span>${item.label}</span>
                    <strong>${item.value}%</strong>
                  </button>
                `
                  )
                  .join("")}
              </div>
            </div>
          </article>
        </section>
        <section class="profile-owner-ai-panel">
          <div class="profile-owner-ai-panel__head">
            <div>
              <span class="profile-owner-dashboard__eyebrow profile-owner-dashboard__eyebrow--ai">IA Doke</span>
              <h3>O que a IA faria agora no seu lugar</h3>
              <p>Sugest?es visuais para guiar o profissional em an?ncios, resposta e conte?do sem sair da dashboard.</p>
            </div>
            <button class="profile-owner-ai-panel__assistant" type="button">Abrir assistente</button>
          </div>
          <div class="profile-owner-ai-grid">
            ${aiInsights
              .map(
                (item, index) => `
              <article class="profile-owner-ai-card profile-owner-ai-card--tone-${index + 1}">
                <span class="profile-owner-ai-card__badge">${normalize(item.badge)}</span>
                <h4>${normalize(item.title)}</h4>
                <p>${normalize(item.text)}</p>
                <button class="profile-owner-ai-card__action" type="button">${normalize(item.cta)}</button>
              </article>
            `
              )
              .join("")}
          </div>
        </section>
        <section class="profile-owner-metrics profile-owner-dashboard__metrics">
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
        <section class="profile-owner-dashboard__section">
          <div class="profile-owner-dashboard__section-head">
            <div>
              <span class="profile-owner-dashboard__eyebrow">Pr?ximos passos</span>
              <h3>Prioridades da semana</h3>
            </div>
          </div>
          <div class="profile-owner-priorities">
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
          </div>
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
    const primaryService = categories.find((item) => !normalizeActionLabel(item.label).includes("verificado"))?.label || "reforma residencial de alto padrao";
    const actions = (hero.actions || []).filter((item) => item.label !== "Compartilhar").map((item) => ({ ...item, provider: hero.name || "Studio Aquarela", service: item.service || primaryService }));
    const followAction = { label: "Seguir" };
    const rotatingHighlights = hero.rotatingHighlights || [];

    document.title = normalize(baseProfile.pageTitle || "Doke | Perfil");
    body.dataset.profileType = profileMode === "client" || profileMode === "client-owner" ? "client" : "professional";
    body.dataset.profileView = profileMode === "owner" || profileMode === "client-owner" ? "owner" : "visitor";

    els.name.textContent = normalize(hero.name || "Gabriel Antonio");
    els.username.textContent = normalize(hero.username || "@gabriel");
    els.city.textContent = normalize(hero.location || "Salvador, BA");
    els.avatar.textContent = normalize(hero.avatar || "GA");
    const baseHeadline = normalize(
      hero.headline ||
        "Especialista em ambientes residenciais com foco em leitura visual limpa, acabamento consistente e comunicação objetiva do início ao fim."
    );
    const isPhoneHero = window.matchMedia('(max-width: 760px)').matches && body.dataset.profileView === 'visitor' && body.dataset.profileType === 'professional';
    const shortHeadline = isPhoneHero && baseHeadline.length > 54
      ? `${baseHeadline.slice(0, 51).trimEnd()}...`
      : baseHeadline;
    els.headline.innerHTML = `${shortHeadline} <button class="profile-bio__more" type="button" data-profile-more>Ver mais</button>`;
    els.categories.innerHTML = profileMode === "client" || profileMode === "client-owner" ? "" : categories.map(categoryMarkup).join("");
    els.verified.hidden = !hero.verified;
    els.verified.dataset.tooltip = 'Selo de perfil verificado pela Doke.';
    const heroActions = isPhoneHero
      ? actions.filter((item) => normalizeActionLabel(item.label) !== "seguir")
      : actions;
    els.stats.innerHTML = stats.map(statMarkup).join("");
    els.nameActions.innerHTML = profileMode === "client" || isPhoneHero ? followActionMarkup(followAction) : "";
    els.actions.innerHTML = heroActions.map((item) => item.label === "Seguir" ? followActionMarkup(item) : actionMarkup(item)).join("");
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
    bindOwnerDashboard();
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

    document.querySelector("[data-profile-edit-name]")?.addEventListener("input", (event) => {
      document.querySelectorAll("[data-profile-edit-preview-name]").forEach((node) => {
        node.textContent = event.currentTarget.value || "Studio Aquarela";
      });
    });

    document.querySelector("[data-profile-edit-username]")?.addEventListener("input", (event) => {
      document.querySelectorAll("[data-profile-edit-preview-username]").forEach((node) => {
        node.textContent = event.currentTarget.value || "@studioaquarela";
      });
    });

    document.querySelector("[data-profile-edit-city]")?.addEventListener("input", (event) => {
      document.querySelectorAll("[data-profile-edit-preview-city]").forEach((node) => {
        node.textContent = event.currentTarget.value || "Salvador, BA";
      });
    });

    root.querySelector('[data-profile-follow]')?.addEventListener('click', (event) => {
      const button = event.currentTarget;
      const active = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(!active));
      button.textContent = active ? 'Seguir' : 'Seguindo';
      button.classList.toggle('is-active', !active);
    });

    root.querySelectorAll('.profile-action').forEach((button) => {
      if (button.textContent.trim().toLowerCase() !== 'editar perfil') return;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        openEditModal();
      });
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

      const metricIcons = ["★", "✦", "◔", "⌁", "$", "✓"];
      const toneGroup = (review) => review.groups || "all";

      const draw = (id) => {
        const active = ads.find((item) => item.id === id) || ads[0];
        if (!active) return;

        const metricsMarkup = (active.metrics || []).slice(0, 6).map((metric, index) => `
          <div>
            <span><i class="detail-scoreboard__metric-icon">${metric.icon || metricIcons[index] || '✦'}</i>${metric.label}</span>
            <strong>${metric.value}</strong>
          </div>
        `).join('');

        const reviewsMarkup = active.reviews.map((item, index) => `
          <article class="detail-review" data-review-group="${toneGroup(item)}">
            <strong>${item.tags?.[0] || item.name}</strong>
            <p>${item.text}</p>
            <div class="detail-review__author">
              <img src="${avatarPool[index % avatarPool.length]}" alt="Foto de perfil de ${item.name}">
              <span>${item.name} - ${item.meta}</span>
            </div>
          </article>
        `).join('');

        hub.innerHTML = `
          <div class="detail-scoreboard">
            <div class="detail-scoreboard__hero">
              <strong>${active.score}</strong>
              <span>${active.count}</span>
            </div>
            <div class="detail-scoreboard__grid">${metricsMarkup}</div>
          </div>

          <div class="detail-filter-chips">
            <button class="detail-chip detail-chip--filter ${activeFilter === 'all' ? 'is-active' : ''}" type="button" data-profile-review-filter="all">Todas</button>
            <button class="detail-chip detail-chip--filter ${activeFilter === 'recentes' ? 'is-active' : ''}" type="button" data-profile-review-filter="recentes">Recentes</button>
            <button class="detail-chip detail-chip--filter ${activeFilter === 'positivas' ? 'is-active' : ''}" type="button" data-profile-review-filter="positivas">Positivas</button>
          </div>

          <div class="detail-review-grid">${reviewsMarkup}</div>
        `;

        const cards = [...hub.querySelectorAll('.detail-review')];
        let visibleCount = 0;
        cards.forEach((card) => {
          const visible = activeFilter === 'all' || card.dataset.reviewGroup?.includes(activeFilter);
          card.hidden = !visible;
          if (visible) visibleCount += 1;
        });

        const grid = hub.querySelector('.detail-review-grid');
        if (grid && !visibleCount) {
          grid.innerHTML = '<article class="profile-review-empty"><strong>Nenhuma avaliação neste filtro</strong><p>Troque o filtro ou selecione outro anúncio para ver mais comentários.</p></article>';
        }

        hub.querySelectorAll('[data-profile-review-filter]').forEach((button) => {
          button.addEventListener('click', () => {
            activeFilter = button.dataset.profileReviewFilter || 'all';
            draw(select?.value);
          });
        });
      };

      draw(select?.value);
      select?.addEventListener('change', () => {
        activeFilter = 'all';
        draw(select.value);
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

  els.editClose.forEach((button) => {
    button.addEventListener("click", closeEditModal);
  });

  els.followersSearch?.addEventListener("input", (event) => {
    renderFollowersModal(event.currentTarget.value);
  });

  els.editForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const hero = baseProfile.hero || {};
    hero.name = normalize(els.editName?.value || hero.name || "Gabriel Antonio");
    hero.headline = normalize(els.editBio?.value || hero.headline || "");
    hero.avatar = hero.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || normalize(hero.avatar || "GA");

    const currentHighlights = [...(hero.rotatingHighlights || [])];
    if (currentHighlights.length) {
      currentHighlights[0] = {
        ...currentHighlights[0],
        detail: normalize(els.editHighlight?.value || currentHighlights[0].detail || "")
      };
    } else {
      currentHighlights.push({
        label: "Agora",
        value: hero.name,
        detail: normalize(els.editHighlight?.value || "")
      });
    }
    hero.rotatingHighlights = currentHighlights;
    baseProfile.hero = hero;
    render();
    closeEditModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFollowersModal();
      closeEditModal();
    }
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
