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
  const PROFESSIONAL_DEFAULT_TABS = {
    services: "Serviços",
    workers: "Workers",
    beforeAfter: "Publicações",
    reviews: "Avaliações",
    about: "Sobre",
    portfolio: "Portfólio",
    achievements: "Conquistas",
    certificates: "Certificados",
    faq: "FAQ"
  };
  const professionalTabs = {
    ...PROFESSIONAL_DEFAULT_TABS,
    ...(publicProfile.tabs || {})
  };
  const clientOwnerProfile = {
    pageTitle: "Doke | Meu perfil de cliente",
    hero: {
      ...(clientPublicProfile.hero || {}),
      badges: [],
      stats: [],
      actions: [
        { label: "Editar perfil", tone: "primary", role: "edit-profile" },
        { label: "Tornar-se profissional", href: "tornar-profissional.html", tone: "ghost", role: "become-professional" }
      ],
      rotatingHighlights: []
    },
    tabs: {
      about: "Sobre",
      achievements: "Conquistas"
    },
    sections: {
      about: clientPublicProfile.sections?.about || {},
      achievements: {
        layout: "achievements",
        title: "Conquistas do cliente",
        intro: "Marcos que valorizam sua reputação como contratante dentro do Doke.",
        items: [
          {
            title: "Cliente verificado",
            detail: "Conta com dados básicos validados para transmitir mais confiança aos profissionais.",
            icon: "✓",
            theme: "mint",
            shape: "shield",
            progress: 100,
            status: "Desbloqueada",
            metric: "Perfil validado"
          },
          {
            title: "Briefing claro",
            detail: "Pedidos publicados com descrição objetiva, fotos e prioridades bem definidas.",
            icon: "★",
            theme: "blue",
            shape: "ticket",
            progress: 86,
            status: "86% concluída",
            metric: "Meta: briefing completo"
          },
          {
            title: "Boa comunicação",
            detail: "Histórico de respostas rápidas durante conversas e alinhamentos de orçamento.",
            icon: "↗",
            theme: "gold",
            shape: "blob",
            progress: 72,
            status: "Em evolução",
            metric: "Resposta em até 2h"
          }
        ]
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
            actions: [
              { label: "Editar perfil", tone: "primary", role: "edit-profile" }
            ],
            badges: [...((publicProfile.hero?.badges || []).slice(0, 2))]
          },
          tabs: {
            ...professionalTabs,
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
              stats: [],
              rotatingHighlights: [],
              actions: [
                { label: "Mensagem", href: "mensagens.html", tone: "primary" },
                ...(params.get("from") === "owner"
                  ? [{ label: "Voltar ao meu perfil", href: "perfil.html?mode=client-owner", tone: "ghost" }]
                  : [])
              ]
            },
            tabs: {
              about: clientPublicProfile.tabs?.about || "Sobre"
            },
            sections: {
              about: clientPublicProfile.sections?.about || {}
            }
          }
        : profileMode === "client-owner"
          ? clientOwnerProfile
        : {
            ...publicProfile,
            tabs: professionalTabs
          };
  const PROFILE_TAB_ORDER = [
    "services",
    "workers",
    "beforeAfter",
    "reviews",
    "about",
    "portfolio",
    "achievements",
    "certificates",
    "faq",
    "overview",
    "listings"
  ];

  const PROFILE_VISIBLE_TABS = new Set(PROFILE_TAB_ORDER);

  if (baseProfile.tabs) {
    baseProfile.tabs = Object.fromEntries(
      PROFILE_TAB_ORDER
        .filter((key) => Object.prototype.hasOwnProperty.call(baseProfile.tabs, key) && PROFILE_VISIBLE_TABS.has(key))
        .map((key) => [key, baseProfile.tabs[key]])
    );
  }

  if (baseProfile.tabs?.posts) {
    const nextTabs = {};
    Object.entries(baseProfile.tabs).forEach(([key, label]) => {
      if (key === "posts") {
        nextTabs.beforeAfter = "Publicações";
        return;
      }
      nextTabs[key] = label;
    });
    baseProfile.tabs = nextTabs;
  }

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
    optionsHost: root.querySelector("[data-profile-options-host]"),
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
  const requestedPanelRaw = params.get("panel");
  const requestedPanel = requestedPanelRaw === "posts" ? "workers" : requestedPanelRaw;
  const rebuildProfileTabs = () => {
    const tabsHost = root.querySelector('[data-profile-section="tabs"]');
    if (!tabsHost) return;

    tabsHost.innerHTML = availableTabs
      .map((key) => `
        <button
          class="profile-tab"
          type="button"
          data-profile-tab="${key}"
        >
          ${baseProfile.tabs[key]}
        </button>
      `)
      .join("");

    els.tabs = [...root.querySelectorAll("[data-profile-tab]")];
  };

  rebuildProfileTabs();

  const state = {
    activeTab: availableTabs.includes(requestedPanel) ? requestedPanel : availableTabs[0] || "services",
    selectingServices: false,
    selectedServices: [],
    selectingPosts: false,
    selectedPosts: [],
    selectingWorkers: false,
    selectedWorkers: []
  };
  let hasSyncedInitialTabRailScroll = false;


  let postsPreviewController = null;

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


  const mediaTabs = new Set(["services", "workers", "beforeAfter"]);

  const switchProfileTab = (nextTab) => {
    if (!nextTab || nextTab === state.activeTab) return;

    const panels = root.querySelector('[data-profile-section="panels"]');
    const pageScroller = document.querySelector(".page__content");
    const previousScrollY = window.scrollY || window.pageYOffset || 0;
    const previousScrollX = window.scrollX || window.pageXOffset || 0;
    const previousPageScrollTop = pageScroller?.scrollTop || 0;
    const previousPageScrollLeft = pageScroller?.scrollLeft || 0;
    const shouldLockPanel = Boolean(panels);
    const panelsRect = panels?.getBoundingClientRect?.();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const neededPanelHeight = panelsRect
      ? Math.max(0, viewportHeight + Math.max(previousScrollY, previousPageScrollTop) - panelsRect.top + 80)
      : 0;
    const previousPanelHeight = panels ? Math.max(panels.offsetHeight, 620, neededPanelHeight) : 0;

    if (shouldLockPanel) {
      panels.style.minHeight = `${previousPanelHeight}px`;
      body.classList.add("is-profile-tab-switching");
    }

    state.activeTab = nextTab;
    render();

    const restoreScroll = () => {
      const currentY = window.scrollY || window.pageYOffset || 0;
      if (Math.abs(currentY - previousScrollY) > 2) {
        window.scrollTo({ top: previousScrollY, left: previousScrollX, behavior: "auto" });
      }
      if (pageScroller && Math.abs(pageScroller.scrollTop - previousPageScrollTop) > 2) {
        pageScroller.scrollTo({
          top: previousPageScrollTop,
          left: previousPageScrollLeft,
          behavior: "auto"
        });
      }
    };

    window.requestAnimationFrame(() => {
      restoreScroll();
      window.requestAnimationFrame(() => {
        restoreScroll();
        window.setTimeout(restoreScroll, 0);
        window.setTimeout(() => {
          restoreScroll();
          body.classList.remove("is-profile-tab-switching");
        }, 120);
      });
    });
  };

  const syncActiveTabState = () => {
    body.dataset.profileActiveTab = state.activeTab || "services";
    const tabsHost = root.querySelector('[data-profile-section="tabs"]');
    if (tabsHost) tabsHost.dataset.activeTab = state.activeTab || "services";
  };

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

  const toggleWorkerSelection = (id) => {
    const exists = state.selectedWorkers.includes(id);
    state.selectedWorkers = exists
      ? state.selectedWorkers.filter((item) => item !== id)
      : [...state.selectedWorkers, id];
    render();
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

  const actionRole = (item = {}) => {
    if (item.role) return item.role;
    const key = normalizeActionLabel(item.label);
    if (key.includes("solicitar orcamento")) return "primary";
    if (key.includes("orcamento")) return "primary";
    if (key.includes("seguir")) return "follow";
    if (key.includes("mensagem")) return "message";
    if (key.includes("publicar")) return "publish";
    if (key.includes("anunciar") || key.includes("novo anuncio")) return "announce";
    if (key.includes("editar perfil")) return "edit-profile";
    if (key.includes("tornar-se profissional")) return "become-professional";
    if (key.includes("ver perfil publico")) return "public-profile";
    return "secondary";
  };

  const actionMarkup = (item) => {
    const classes = `profile-action ${item.tone === "primary" || item.style === "primary" ? "profile-action--success" : ""}`.trim();
    const labelKey = normalizeActionLabel(item.label);
    const role = actionRole(item);
    if (labelKey.includes("solicitar orcamento")) {
      const compactLabel = window.matchMedia('(max-width: 760px)').matches ? "Or�amento" : normalize(item.label);
      return `
        <button class="${classes}" type="button" data-profile-action-role="${role}" data-profile-mobile-label="Or�amento" data-budget-open data-budget-provider="${escapeAttr(item.provider || "Studio Aquarela")}" data-budget-service="${escapeAttr(item.service || "reforma residencial de alto padrao")}">
          <span class="profile-action__label" data-profile-mobile-label="Or�amento">${compactLabel}</span>
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

  const profileOptionsMarkup = () => `
    <div class="profile-options-menu" data-profile-options>
      <button class="profile-options-menu__trigger" type="button" data-profile-options-trigger aria-expanded="false" aria-haspopup="menu" aria-label="Mais opcoes do perfil">
        <span class="profile-options-menu__dots" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
      <div class="profile-options-menu__panel" role="menu" data-profile-options-panel hidden>
        <button type="button" role="menuitem" data-profile-copy-link>Copiar link do perfil</button>
        <button type="button" role="menuitem" data-profile-report>Denunciar perfil</button>
        <button type="button" role="menuitem" data-profile-report>Reportar problema</button>
      </div>
    </div>
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

  const isVisitorProfessionalMobile = () => window.matchMedia('(max-width: 760px)').matches;


  const buildIndexLikeCards = (items) => `
    <div class="results-grid profile-services-results profile-services-results--stacked">
      ${items.map((item, index) => renderServiceCard(item, index)).join("")}
    </div>
  `;

  const renderShowcaseSectionHeader = ({ eyebrow = "", title = "", href = "#", linkLabel = "Ver todos" } = {}) => `
    <div class="profile-showcase-section__header">
      <div class="profile-showcase-section__heading">
        ${eyebrow ? `<span class="profile-showcase-section__eyebrow">${normalize(eyebrow)}</span>` : ""}
        <h3 class="profile-showcase-section__title">${normalize(title)}</h3>
      </div>
      <a class="profile-showcase-section__link" href="${href}">${normalize(linkLabel)}</a>
    </div>
  `;

  const renderServiceCard = (item, index) => `
    <article class="doke-ad-card doke-ad-card--featured ${state.selectedServices.includes(index) ? "is-selected" : ""} ${state.selectingServices ? "is-selecting" : ""}" data-profile-service-card="${index}">
      <div class="doke-ad-card__media ${String(item.mediaClass || "").replace("service-card__media", "doke-ad-card__media")}">
        ${profileMode === "owner" && state.selectingServices
          ? `<button class="doke-ad-card__favorite profile-service-select-indicator ${state.selectedServices.includes(index) ? "is-selected" : ""}" type="button" aria-label="Selecionar anuncio" data-profile-service-select="${index}">${state.selectedServices.includes(index) ? "&#10003;" : ""}</button>`
          : `<button class="doke-ad-card__favorite" type="button" aria-label="Salvar anuncio">
              <svg viewBox="0 0 24 24"><path d="m12 19-6.6-6.3a4.2 4.2 0 0 1 0-6 4.4 4.4 0 0 1 6.1 0L12 7.2l.5-.5a4.4 4.4 0 0 1 6.1 0 4.2 4.2 0 0 1 0 6Z"></path></svg>
            </button>`}
        <span class="doke-ad-card__badge">${normalize(item.badge)}</span>
      </div>
      <div class="doke-ad-card__body">
        <span class="doke-ad-card__category">${["Pintura residencial", "El&eacute;trica 24h", "Diarista premium"][index] || normalize(item.category)}</span>
        <h3 class="doke-ad-card__title">${normalize(item.title)}</h3>
        <div class="doke-ad-card__rating" aria-label="Avaliacao ${item.rating.toFixed(1).replace(".", ",")} baseada em ${normalize(item.reviews)}">
          <span class="doke-ad-card__rating-star">&#9733;</span>
          <strong>${item.rating.toFixed(1).replace(".", ",")}</strong>
          <span>(${normalize(item.reviews)})</span>
        </div>
        <div class="doke-ad-card__tags" aria-label="Tags do anuncio">${item.tags.slice(0, 2).map((tag) => `<span>${normalize(tag)}</span>`).join("")}</div>
        <div class="doke-ad-card__location">
          <span class="doke-ad-card__avatar" aria-hidden="true"></span>
          <span class="doke-ad-card__location-text"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.7A2.7 2.7 0 1 1 12 6.3a2.7 2.7 0 0 1 0 5.4Z"></path></svg><span>${normalize(item.location)}</span></span>
        </div>
        <div class="doke-ad-card__footer">
          <strong class="doke-ad-card__price">${normalize(item.price)}</strong>
          <a class="doke-ad-card__cta" href="detalhe-anuncio.html">Ver an&uacute;ncio</a>
        </div>
      </div>
    </article>
  `;

  const renderServicesRail = () => {
    const items = servicePool.slice(0, 3);
    return `
      <div class="results-grid profile-services-results">
        ${items.map((item, index) => renderServiceCard(item, index)).join("")}
      </div>
    `;
  };

  const renderShowcaseServicesSection = () => `
    <section class="profile-showcase-section profile-showcase-section--services" aria-labelledby="profile-showcase-services-title">
      ${renderShowcaseSectionHeader({
        eyebrow: 'Servi�os',
        title: 'Servi�os em destaque',
        href: 'resultados.html?type=services',
        linkLabel: 'Ver todos'
      })}
      ${renderServicesRail()}
    </section>
  `;

  const renderServiceCards = () => {
    if (profileMode === "client") {
      return renderClientRequests();
    }

    const selectedCount = state.selectedServices.length;

    if (isVisitorProfessionalMobile()) {
      return renderServicesRail();
    }

    return `
      ${profileMode === "owner" ? `
      <div class="profile-services-toolbar">
        <button class="profile-services-toolbar__action profile-services-toolbar__action--primary" type="button">Novo servi&ccedil;o</button>
        <button class="profile-services-toolbar__action ${state.selectingServices ? "is-active" : ""}" type="button" data-profile-services-select-toggle>${state.selectingServices ? "Cancelar" : "Selecionar"}</button>
        ${selectedCount === 1 ? `<button class="profile-services-toolbar__action" type="button" data-profile-services-edit>Editar Servi&ccedil;o</button>` : ""}
        ${selectedCount > 1 ? `<span class="profile-services-toolbar__hint">S� d� para editar um Servi�o por vez.</span>` : ""}
      </div>
      ` : ""}
      ${renderServicesRail()}
    `;
  };

  const BEFORE_AFTER_PREVIEW_IDS = {
    "ba-sala": "case-reforma",
    "ba-banheiro": "case-bathroom"
  };

  const getBeforeAfterPreviewId = (item = {}) => {
    if (item.previewId) return item.previewId;
    if (BEFORE_AFTER_PREVIEW_IDS[item.id]) return BEFORE_AFTER_PREVIEW_IDS[item.id];
    if (String(item.visualClass || "").includes("bathroom")) return "case-bathroom";
    return "case-reforma";
  };

  const refreshPostPreviews = () => {
    postsPreviewController?.abort();
    postsPreviewController = null;

    const shouldEnablePreviewRails = ["workers", "beforeAfter"].includes(state.activeTab);
    if (!shouldEnablePreviewRails || state.selectingPosts) return;
    if (!document.querySelector('[data-worker-preview]') && !document.querySelector('[data-before-after-preview]')) return;

    postsPreviewController = new AbortController();
    const signal = postsPreviewController.signal;

    window.DokeHomeWorkers?.create({ signal });
    window.DokeHomeBeforeAfter?.create({ signal });
  };



  const WORKER_CARDS = [
    {
      id: "vid-pintura",
      variant: "video-card--one",
      badge: "Dispon�vel hoje",
      title: "Pintura residencial com acabamento limpo",
      meta: "1,2 mil visualiza��es"
    },
    {
      id: "vid-cozinha",
      variant: "video-card--two",
      badge: "Resposta r�pida",
      title: "Antes e depois de parede nivelada",
      meta: "842 visualiza��es"
    },
    {
      id: "vid-eletrica",
      variant: "video-card--three",
      badge: "Top da semana",
      title: "Organiza��o do p�s-obra em 30 segundos",
      meta: "2,4 mil visualiza��es"
    },
    {
      id: "vid-limpeza",
      variant: "video-card--four",
      badge: "Novo worker",
      title: "Como protegemos m�veis antes da pintura",
      meta: "618 visualiza��es"
    }
  ];

  const PROFILE_PUBLICATIONS = [
    {
      id: "case-kitchen",
      type: "photo",
      cardClass: "publication-card--photo",
      mediaClass: "publication-card__media--kitchen",
      label: "Foto",
      title: "Cozinha com marcenaria sob medida",
      author: "Studio Casa Viva",
      likes: 142,
      comments: 28,
      saves: 36
    },
    {
      id: "case-reforma",
      type: "video",
      cardClass: "publication-card--video",
      mediaClass: "publication-card__media--living",
      label: "V�deo",
      title: "Tour r�pido da reforma",
      author: "Renato Acabamentos",
      likes: 98,
      comments: 19,
      saves: 22
    },
    {
      id: "case-bathroom",
      type: "beforeAfter",
      cardClass: "publication-card--before-after",
      mediaClass: "publication-card__comparison",
      label: "Antes e depois",
      title: "Banheiro revitalizado sem quebra-quebra",
      author: "Renato Acabamentos",
      likes: 176,
      comments: 31,
      saves: 45
    }
  ];

  const renderWorkersSection = () => `
    <div class="short-videos__track profile-workers-rail ${state.selectingWorkers ? "is-selecting" : ""}" data-rail-track aria-label="Workers">
      ${WORKER_CARDS.map((item) => {
        const isSelected = state.selectedWorkers.includes(item.id);
        return `
        <article class="video-card ${item.variant} doke-card doke-worker-card doke-media-card ${state.selectingWorkers ? "is-selecting" : ""} ${isSelected ? "is-selected" : ""}"
          data-worker-trigger
          data-worker-id="${item.id}"
          data-profile-worker-card="${item.id}"
          role="button"
          tabindex="0"
          aria-haspopup="dialog"
          aria-label="Abrir worker: ${normalize(item.title)}">
          ${profileMode === "owner" && state.selectingWorkers ? `<button class="profile-post-select-indicator ${isSelected ? "is-selected" : ""}" type="button" data-profile-worker-select="${item.id}" aria-label="Selecionar worker">${isSelected ? "&#10003;" : ""}</button>` : ""}
          <div class="profile-worker-card__content" aria-hidden="true">
            <span class="profile-worker-card__badge">${normalize(item.badge)}</span>
            <h3 class="profile-worker-card__title">${normalize(item.title)}</h3>
            <p class="profile-worker-card__meta">${normalize(item.meta)}</p>
          </div>
        </article>
      `;
      }).join("")}
    </div>
  `;

  const renderPublicationCard = (item, index) => {
    const postId = `publication-${index}`;
    const isSelected = state.selectedPosts.includes(postId);
    const selectButton = profileMode === "owner" && state.selectingPosts
      ? `<button class="profile-post-select-indicator ${isSelected ? "is-selected" : ""}" type="button" data-profile-post-select="${postId}" aria-label="Selecionar publicacao">${isSelected ? "&#10003;" : ""}</button>`
      : "";

    const mediaMarkup = item.type === "beforeAfter"
      ? `
        <div class="publication-card__media publication-card__comparison">
          <span class="publication-card__type publication-card__type--comparison">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15v13h-15z"></path><path d="M12 5.5v13"></path></svg>
            ${item.label}
          </span>
          <div class="publication-card__half publication-card__half--before"><span>Antes</span></div>
          <div class="publication-card__half publication-card__half--after"><span>Depois</span></div>
        </div>
      `
      : `
        <div class="publication-card__media ${item.mediaClass}">
          <span class="publication-card__type">
            ${item.type === "video"
              ? `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="13" height="13" rx="3"></rect><path d="m16.5 10 4-2.5v9l-4-2.5Z"></path></svg>`
              : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8.2A2.2 2.2 0 0 1 6.7 6h2.1l1.1-1.5h4.2L15.2 6h2.1a2.2 2.2 0 0 1 2.2 2.2v8.6a2.2 2.2 0 0 1-2.2 2.2H6.7a2.2 2.2 0 0 1-2.2-2.2V8.2Z"></path><circle cx="12" cy="12.5" r="3.4"></circle></svg>`
            }
            ${item.label}
          </span>
          ${item.type === "video" ? `<span class="publication-card__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"></path></svg></span>` : ""}
        </div>
      `;

    return `
      <article class="publication-card ${item.cardClass} doke-card ${state.selectingPosts ? "is-selecting" : ""} ${isSelected ? "is-selected" : ""}"
        data-profile-post-card="${postId}"
        data-before-after-trigger
        data-before-after-id="${item.id}"
        role="button"
        tabindex="0"
        aria-haspopup="dialog"
        aria-label="Abrir publicacao: ${normalize(item.title)}">
        ${selectButton}
        ${mediaMarkup}
        <div class="publication-card__content">
          <h3 class="publication-card__title">${normalize(item.title)}</h3>
          <p class="publication-card__author">Por <a href="perfil.html">${normalize(item.author)}</a></p>
          <div class="publication-card__actions" aria-label="Interacoes da publicacao">
            <span class="publication-card__action"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.6c0 5.4-8.8 10.2-8.8 10.2S3.2 14 3.2 8.6A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.4Z"></path></svg>${item.likes}</span>
            <span class="publication-card__action"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 11.5a7.3 7.3 0 0 1 7.6-7.1 7.3 7.3 0 0 1 7.6 7.1 7.3 7.3 0 0 1-7.6 7.1 8.7 8.7 0 0 1-2.9-.5L5 19.4l1.2-3.2a6.7 6.7 0 0 1-2-4.7Z"></path></svg>${item.comments}</span>
            <span class="publication-card__action"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v14l-7-4-7 4V6a1.5 1.5 0 0 1 1.5-1.5Z"></path></svg>${item.saves}</span>
          </div>
        </div>
      </article>
    `;
  };

  const renderPublicationsSection = () => `
    <div class="publication-grid profile-publications-grid" data-rail-track aria-label="Publicacoes">
      ${PROFILE_PUBLICATIONS.map((item, index) => renderPublicationCard(item, index)).join("")}
    </div>
  `;

  const renderShowcaseVisitorSections = () => `
    <div class="profile-showcase-stack">
      ${renderShowcaseServicesSection()}
      ${renderWorkersSection()}
      ${renderPublicationsSection()}
    </div>
  `;

  const renderWorkers = () => {
    if (profileMode === "client") return renderClientReferences();

    return renderPanelShell(`
      <div class="profile-publications-stack profile-publications-stack--workers">
        ${profileMode === "owner" ? `
        <div class="profile-services-toolbar">
          <button class="profile-services-toolbar__action profile-services-toolbar__action--primary" type="button">Novo Worker</button>
          <button class="profile-services-toolbar__action ${state.selectingWorkers ? "is-active" : ""}" type="button" data-profile-workers-select-toggle>${state.selectingWorkers ? "Cancelar" : "Selecionar"}</button>
          ${state.selectedWorkers.length === 1 ? `<button class="profile-services-toolbar__action" type="button" data-profile-workers-edit>Editar Worker</button>` : ""}
          ${state.selectedWorkers.length > 1 ? `<span class="profile-services-toolbar__hint">So da para editar um Worker por vez.</span>` : ""}
        </div>
        ` : ""}
        ${renderWorkersSection()}
      </div>
    `);
  };

  const renderPosts = () => {
    if (profileMode === "client") return renderClientReferences();

    return renderPanelShell(`
      <div class="profile-publications-stack ${profileMode === "owner" ? "profile-publications-stack--owner" : ""}">
        ${profileMode === "owner" ? `
        <div class="profile-services-toolbar">
          <button class="profile-services-toolbar__action profile-services-toolbar__action--primary" type="button">Nova publica��o</button>
          <button class="profile-services-toolbar__action ${state.selectingPosts ? "is-active" : ""}" type="button" data-profile-posts-select-toggle>${state.selectingPosts ? "Cancelar" : "Selecionar"}</button>
          ${state.selectedPosts.length === 1 ? `<button class="profile-services-toolbar__action" type="button" data-profile-posts-edit>Editar publica��o</button>` : ""}
          ${state.selectedPosts.length > 1 ? `<span class="profile-services-toolbar__hint">S� d� para editar uma publica��o por vez.</span>` : ""}
        </div>
        ` : ""}
        ${renderPublicationsSection()}
      </div>
    `);
  };

  const renderReviews = () => renderPanelShell(`
    <section class="doke-reviews-shell doke-reviews-shell--profile" aria-labelledby="profile-reviews-title" data-profile-section="reviews">
      <div class="doke-reviews-panel">
        <div class="doke-reviews-panel__top">
          <div class="doke-reviews-summary">
            <h2 class="doke-reviews-title" id="profile-reviews-title">Reputação do perfil</h2>
            <div class="doke-reviews-scoreline" aria-label="Nota média do perfil: 4,9 de 5">
              <strong class="doke-reviews-scoreline__score">4,9</strong>
              <span class="doke-reviews-stars" aria-hidden="true">★★★★★</span>
              <span class="doke-reviews-count">· 126 avaliações verificadas</span>
            </div>
            <p class="doke-reviews-subnote">Baseado em serviços concluídos</p>
            <span class="doke-reviews-recommendation">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                <path d="M7 11l4-8a3 3 0 0 1 3 3v4h4.4a2 2 0 0 1 1.9 2.6l-2 7A2 2 0 0 1 17.4 21H7Z"></path>
              </svg>
              96% recomendam
            </span>
          </div>

          <div class="doke-reviews-bars" aria-label="Distribuição de avaliações do perfil">
            <div class="doke-reviews-bar">
              <span>5 estrelas</span>
              <span class="doke-reviews-bar__track" aria-hidden="true"><span class="doke-reviews-bar__fill doke-reviews-bar__fill--81"></span></span>
              <strong>102</strong>
            </div>
            <div class="doke-reviews-bar">
              <span>4 estrelas</span>
              <span class="doke-reviews-bar__track" aria-hidden="true"><span class="doke-reviews-bar__fill doke-reviews-bar__fill--19"></span></span>
              <strong>24</strong>
            </div>
          </div>
        </div>

        <div class="doke-reviews-divider" aria-hidden="true"></div>

        <div class="doke-reviews-metrics" aria-label="Pontos fortes avaliados">
          <div class="doke-review-metric">
            <span class="doke-review-metric__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M12 7v5l3 2"></path></svg></span>
            <span class="doke-review-metric__copy"><span class="doke-review-metric__label">Pontualidade</span><strong class="doke-review-metric__value">4,9</strong></span>
          </div>
          <div class="doke-review-metric">
            <span class="doke-review-metric__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6h14v9H8l-3 3Z"></path><path d="M8 10h8"></path></svg></span>
            <span class="doke-review-metric__copy"><span class="doke-review-metric__label">Comunicação</span><strong class="doke-review-metric__value">4,8</strong></span>
          </div>
          <div class="doke-review-metric">
            <span class="doke-review-metric__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.4-2.8 7.4-7 9-4.2-1.6-7-4.6-7-9V6Z"></path><path d="m9 12 2 2 4-4"></path></svg></span>
            <span class="doke-review-metric__copy"><span class="doke-review-metric__label">Qualidade</span><strong class="doke-review-metric__value">4,9</strong></span>
          </div>
          <div class="doke-review-metric">
            <span class="doke-review-metric__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 13 13 20 4 11V4h7Z"></path><circle cx="8.5" cy="8.5" r="1.2"></circle></svg></span>
            <span class="doke-review-metric__copy"><span class="doke-review-metric__label">Preço</span><strong class="doke-review-metric__value">4,7</strong></span>
          </div>
          <div class="doke-review-metric">
            <span class="doke-review-metric__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"></circle><path d="M5 20a7 7 0 0 1 14 0"></path></svg></span>
            <span class="doke-review-metric__copy"><span class="doke-review-metric__label">Atendimento</span><strong class="doke-review-metric__value">5,0</strong></span>
          </div>
          <div class="doke-review-metric">
            <span class="doke-review-metric__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v4"></path><path d="M12 17v4"></path><path d="M3 12h4"></path><path d="M17 12h4"></path><path d="m6 6 2.5 2.5"></path><path d="m15.5 15.5L18 18"></path><path d="m18 6-2.5 2.5"></path><path d="m8.5 15.5L6 18"></path></svg></span>
            <span class="doke-review-metric__copy"><span class="doke-review-metric__label">Limpeza</span><strong class="doke-review-metric__value">4,8</strong></span>
          </div>
        </div>

        <div class="doke-reviews-divider" aria-hidden="true"></div>

        <div class="doke-reviews-filter-row">
          <div class="doke-reviews-filters" aria-label="Filtros de avaliações">
            <button class="doke-review-filter is-active" type="button" data-review-filter="all">Todas</button>
            <button class="doke-review-filter" type="button" data-review-filter="recent">Recentes</button>
            <button class="doke-review-filter" type="button" data-review-filter="positive">Positivas</button>
            <button class="doke-review-filter" type="button" data-review-filter="context">Com contexto</button>
          </div>
          <span class="doke-reviews-visible-count">2 comentários exibidos</span>
        </div>

        <div class="doke-review-list">
          <article class="doke-review-item" data-review-id="profile-review-marina" data-rating="5.0">
            <div class="doke-review-avatar" aria-hidden="true">MA</div>
            <div class="doke-review-content">
              <header class="doke-review-author"><strong>Marina Alves</strong><span>Apartamento · cliente verificada</span></header>
              <p class="doke-review-text">A proteção foi muito bem feita, o cronograma foi respeitado e o resultado final ficou uniforme sem correria.</p>
              <footer class="doke-review-footer"><span class="doke-review-date">Há 3 dias</span><a class="doke-review-more" href="#">Mostrar mais →</a></footer>
            </div>
            <div class="doke-review-badges" aria-label="Avaliação 5,0 verificada"><span class="doke-review-rating"><span aria-hidden="true">★</span> 5,0</span><span class="doke-review-verified">✓ Verificada</span></div>
          </article>

          <article class="doke-review-item" data-review-id="profile-review-bruno" data-rating="4.8">
            <div class="doke-review-avatar" aria-hidden="true">BC</div>
            <div class="doke-review-content">
              <header class="doke-review-author"><strong>Bruno Costa</strong><span>Cobertura · cliente verificado</span></header>
              <p class="doke-review-text">Gostei da clareza no escopo, do cuidado com a limpeza e da forma de sinalizar cada etapa antes da execução.</p>
              <footer class="doke-review-footer"><span class="doke-review-date">Há 5 dias</span><a class="doke-review-more" href="#">Mostrar mais →</a></footer>
            </div>
            <div class="doke-review-badges" aria-label="Avaliação 4,8 verificada"><span class="doke-review-rating"><span aria-hidden="true">★</span> 4,8</span><span class="doke-review-verified">✓ Verificada</span></div>
          </article>
        </div>

        <a class="doke-reviews-all" href="#">Ver todas as avaliações →</a>
      </div>
    </section>
  `);

  const renderAbout = () => {
    const section = baseProfile.sections?.about || {};
    const facts = section.facts || [];
    const blocks = section.blocks || [];

    if (profileMode === "client" || profileMode === "client-owner") {
      const clientTexts = [
        "Organiza pedidos com fotos, medidas e prioridades antes de conversar com profissionais.",
        "Prefere propostas objetivas, prazos claros e etapas combinadas antes de fechar o servi&ccedil;o.",
        "Valoriza atendimento direto, cuidado com o ambiente e atualiza&ccedil;&otilde;es durante a execu&ccedil;&atilde;o."
      ];

      return renderPanelShell(`
        <section class="profile-client-about profile-client-about--single" aria-label="Sobre o cliente">
          <article class="profile-client-about__card">
            <span class="profile-client-about__eyebrow">Sobre o cliente</span>
            <h3>Contrata com escopo claro e decis&atilde;o r&aacute;pida</h3>
            <p>Perfil preparado para receber propostas melhores: o pedido costuma chegar com contexto, refer&ecirc;ncias e crit&eacute;rios de escolha bem definidos.</p>
            <ul class="profile-client-about__list">
              ${clientTexts.map((text) => `<li>${text}</li>`).join("")}
            </ul>
          </article>
          <article class="profile-client-about__card profile-client-pro-cta">
            <span class="profile-client-about__eyebrow">Conta profissional</span>
            <h3>Comece a anunciar seus serviços</h3>
            <p>Transforme este perfil em uma vitrine profissional para receber pedidos, conversar com clientes e publicar seus anúncios.</p>
            <a class="profile-client-pro-cta__button" href="tornar-profissional.html" data-profile-action-role="become-professional">
              Tornar-se profissional
            </a>
          </article>
        </section>
      `);
    }

    const defaultAboutText = [
      "Antes de comecar, o profissional entende o objetivo, o ambiente e a urgencia do pedido. Isso ajuda a transformar a solicitacao em um escopo claro, reduz retrabalho e alinha expectativas antes da visita.",
      "Atua melhor em projetos que exigem cuidado com acabamento, protecao do ambiente e leitura estetica do espaco."
    ];

    const aboutText = blocks.length
      ? blocks.slice(0, 2).map((item) => normalize(item.text))
      : defaultAboutText;

    const factFallbacks = [
      { label: "Atendimento", value: "Residencial e comercial leve" },
      { label: "Formato", value: "Visita tecnica + execucao" },
      { label: "Regioes", value: "Salvador e Lauro de Freitas" },
      { label: "Especialidade", value: "Pintura, retoque e acabamento fino" }
    ];

    const factItems = factFallbacks.map((fallback, index) => ({
      label: normalize(facts[index]?.label || fallback.label),
      value: normalize(facts[index]?.value || fallback.value)
    }));

    const trustItems = [
      { label: "Perfil certificado", detail: "Documento validado" },
      { label: "Diploma validado", detail: "SENAC Bahia" },
      { label: "Cliente recorrente", detail: "Boa retencao" }
    ];

    const differentialItems = [
      { initials: "T", title: "Top da semana", text: "Mais visto" },
      { initials: "R", title: "Resposta rapida", text: "Retorno consistente" },
      { initials: "C", title: "Cliente recorrente", text: "Boa retencao" }
    ];

    return renderPanelShell(`
      <div class="profile-about-flow profile-about-flow--clean">
        <section class="profile-about-main-card" aria-labelledby="profile-about-title">
          <div class="profile-about-main-card__content">
            <span class="profile-about-main-card__eyebrow">Sobre o profissional</span>
            <h3 id="profile-about-title">Como trabalha</h3>
            ${aboutText.map((text) => `<p>${text}</p>`).join("")}
          </div>

          <div class="profile-about-trust-list" aria-label="Sinais de confianca">
            ${trustItems.map((item) => `
              <article class="profile-about-trust-item">
                <span aria-hidden="true">&#10003;</span>
                <div>
                  <strong>${item.label}</strong>
                  <small>${item.detail}</small>
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <section class="profile-about-facts" aria-label="Ficha tecnica do perfil">
          ${factItems.map((item) => `
            <article class="profile-about-fact-row">
              <span>${item.label}</span>
              <strong>${item.value}</strong>
            </article>
          `).join("")}
        </section>

        <section class="profile-about-differentials" aria-label="Diferenciais">
          ${differentialItems.map((item) => `
            <article class="profile-about-differential">
              <span class="profile-about-differential__icon" aria-hidden="true">${item.initials}</span>
              <div>
                <strong>${item.title}</strong>
                <small>${item.text}</small>
              </div>
            </article>
          `).join("")}
        </section>
      </div>
    `);
  };


  const renderPortfolio = () => {
    const items = baseProfile.sections?.portfolio?.items || [];
    const fallbackItems = [
      {
        title: "Sala contemporanea em tons claros",
        subtitle: "Pintura + revisao de acabamento",
        text: "Ambiente com correcao de textura, iluminacao valorizada e leitura mais leve na area social.",
        chips: ["Antes e depois", "2 dias", "Acabamento fino"],
        mediaClass: "profile-portfolio-media--living"
      },
      {
        title: "Quarto infantil com paleta suave",
        subtitle: "Consultoria de cor + execucao",
        text: "Definicao de paleta, teste de amostra e acabamento final com foco em conforto visual.",
        chips: ["Paleta guiada", "Cliente recorrente", "Execucao limpa"],
        mediaClass: "profile-portfolio-media--bedroom"
      },
      {
        title: "Revisao fina em apartamento alugado",
        subtitle: "Retoque pos-obra",
        text: "Intervencao rapida para corrigir falhas visuais sem transformar o pedido em obra longa.",
        chips: ["Retorno rapido", "Alta satisfacao", "Sem quebra-quebra"],
        mediaClass: "profile-portfolio-media--apartment"
      }
    ];

    const portfolioItems = (items.length ? items : fallbackItems).slice(0, 6).map((item, index) => ({
      title: normalize(item.title || fallbackItems[index % fallbackItems.length].title),
      subtitle: normalize(item.subtitle || fallbackItems[index % fallbackItems.length].subtitle),
      text: normalize(item.text || fallbackItems[index % fallbackItems.length].text),
      chips: (item.chips && item.chips.length ? item.chips : fallbackItems[index % fallbackItems.length].chips).map(normalize),
      mediaClass: item.mediaClass || fallbackItems[index % fallbackItems.length].mediaClass
    }));

    return renderPanelShell(`
      <div class="profile-portfolio-grid profile-portfolio-grid--showcase">
        ${portfolioItems
          .map(
            (item) => `
          <article class="profile-portfolio-card profile-portfolio-card--showcase">
            <div class="profile-portfolio-media ${item.mediaClass}">
              <span class="profile-portfolio-media__badge">${item.chips[0] || "Projeto"}</span>
            </div>
            <div class="profile-portfolio-card__body">
              <div class="profile-portfolio-card__header">
                <span class="profile-portfolio-card__category">${item.subtitle}</span>
                <h3>${item.title}</h3>
              </div>
              <p>${item.text}</p>
              <div class="profile-portfolio-meta">
                ${item.chips.slice(0, 3).map((text, chipIndex) => `<span class="profile-portfolio-chip ${chipIndex === 0 ? "profile-portfolio-chip--accent" : ""}">${text}</span>`).join("")}
              </div>
              <a class="profile-portfolio-card__cta" href="#">Ver projeto <span aria-hidden="true">&rarr;</span></a>
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
    const fallbackItems = [
      { status: "Verificado", issuer: "Equipe Doke", title: "Identidade validada", meta: "Documento e selfie aprovados" },
      { status: "Certificado", issuer: "SENAC Bahia", title: "Curso de Design de Interiores", meta: "Concluido em 2021" },
      { status: "Atualizado", issuer: "Formacao complementar", title: "Boas praticas de atendimento", meta: "Atualizacao recente" }
    ];
    const certificates = (items.length ? items : fallbackItems).slice(0, 3).map((item, index) => ({
      status: normalize(item.status || fallbackItems[index]?.status || "Validado"),
      issuer: normalize(item.issuer || fallbackItems[index]?.issuer || "Doke"),
      title: normalize(item.title || fallbackItems[index]?.title || "Certificado validado"),
      meta: normalize(item.meta || fallbackItems[index]?.meta || "Informacao validada"),
      tone: index === 0 ? "primary" : index === 1 ? "education" : "practice"
    }));

    return renderPanelShell(`
      <div class="profile-certificates-showcase">
        ${certificates.map((item, index) => `
          <article class="profile-certificate-card profile-certificate-card--${item.tone}">
            <div class="profile-certificate-card__icon" aria-hidden="true">${index === 0 ? "ID" : index === 1 ? "ED" : "BP"}</div>
            <div class="profile-certificate-card__body">
              <div class="profile-certificate-card__meta">
                <span class="profile-certificate-card__status">${item.status}</span>
                <span class="profile-certificate-card__issuer">${item.issuer}</span>
              </div>
              <h3>${item.title}</h3>
              <p>${item.meta}</p>
              <a class="profile-certificate-card__cta" href="#">Ver detalhes</a>
            </div>
          </article>
        `).join("")}
      </div>
    `);
  };


  const renderFaq = () => {
    const section = baseProfile.sections?.faq || {};
    const items = section.items || [];
    return renderPanelShell(`
      <section class="profile-faq-accordion" aria-label="Perguntas frequentes">
        ${items
          .map(
            (item, index) => `
          <article class="profile-faq-card profile-faq-card--compact">
            <button type="button" data-profile-faq-toggle aria-expanded="${index === 0 ? "true" : "false"}">
              <h3>${normalize(item.question)}</h3>
              <span aria-hidden="true">${index === 0 ? "&minus;" : "+"}</span>
            </button>
            <p class="profile-faq-card__answer" ${index === 0 ? "" : "hidden"}>${normalize(item.answer)}</p>
          </article>
        `
          )
          .join("")}
      </section>
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
        title: "Post recomendado: publica��es com prova visual curta",
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
      case "workers":
        return renderWorkers();
      case "beforeAfter":
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
    const isPhoneHero = window.matchMedia('(max-width: 760px)').matches;
    const shortHeadline = isPhoneHero && baseHeadline.length > 64
      ? `${baseHeadline.slice(0, 61).trimEnd()}...`
      : baseHeadline;
    const shouldShowMore = isPhoneHero && baseHeadline.length > 64 && profileMode !== "client";
    els.headline.innerHTML = shouldShowMore
      ? `<span class="profile-bio__text">${shortHeadline}</span> <button class="profile-bio__more" type="button" data-profile-more>Ver mais</button>`
      : `<span class="profile-bio__text">${shortHeadline}</span>`;
    els.categories.innerHTML = profileMode === "client" || profileMode === "client-owner" ? "" : categories.map(categoryMarkup).join("");
    els.verified.hidden = true;
    els.verified.removeAttribute("data-tooltip");
    els.verified.removeAttribute("aria-label");
    const heroActions = (isPhoneHero
      ? actions.filter((item) => normalizeActionLabel(item.label) !== "seguir")
      : actions).filter((item) => normalizeActionLabel(item.label) !== "seguir");
    els.stats.innerHTML = stats.map(statMarkup).join("");
    els.nameActions.innerHTML = profileMode === "owner" || profileMode === "client-owner" ? "" : followActionMarkup(followAction);
    const showProfileOptions = profileMode !== "owner" && profileMode !== "client-owner";
    if (els.optionsHost) {
      els.optionsHost.innerHTML = showProfileOptions ? profileOptionsMarkup() : "";
    }
    els.actions.innerHTML = heroActions.map((item) => actionMarkup(item)).join("");
    bindHeroHighlights(rotatingHighlights);

    syncActiveTabState();

    const labels = baseProfile.tabs || {};
    els.tabs.forEach((tab) => {
      const key = tab.dataset.profileTab;
      const visible = Boolean(labels[key]);
      const isActive = visible && key === state.activeTab;
      tab.hidden = !visible;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      if (isActive) {
        tab.setAttribute("aria-current", "page");
      } else {
        tab.removeAttribute("aria-current");
      }
    });

    if (!hasSyncedInitialTabRailScroll && els.tabsHost && window.matchMedia("(max-width: 760px)").matches) {
      els.tabsHost.scrollLeft = 0;
      hasSyncedInitialTabRailScroll = true;
    }

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

    root.querySelector("[data-profile-workers-select-toggle]")?.addEventListener("click", () => {
      state.selectingWorkers = !state.selectingWorkers;
      if (!state.selectingWorkers) state.selectedWorkers = [];
      render();
    });

    root.querySelector("[data-profile-workers-edit]")?.addEventListener("click", () => {
      if (state.selectedWorkers.length !== 1) return;
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

    root.querySelectorAll("[data-profile-worker-select]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const id = button.dataset.profileWorkerSelect;
        if (!id) return;
        if (!state.selectingWorkers) state.selectingWorkers = true;
        toggleWorkerSelection(id);
      });
    });

    root.querySelectorAll("[data-profile-worker-card]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (!state.selectingWorkers) return;
        event.preventDefault();
        event.stopPropagation();
        const id = card.dataset.profileWorkerCard;
        if (!id) return;
        toggleWorkerSelection(id);
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
      switchProfileTab('about');
    });

    refreshPostPreviews();

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

    root.querySelectorAll('[data-profile-options]').forEach((menu) => {
      const trigger = menu.querySelector('[data-profile-options-trigger]');
      const panel = menu.querySelector('[data-profile-options-panel]');
      if (!trigger || !panel) return;

      const closeMenu = () => {
        panel.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      };

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextOpen = panel.hidden;
        panel.hidden = !nextOpen;
        trigger.setAttribute('aria-expanded', String(nextOpen));
      });

      menu.querySelector('[data-profile-copy-link]')?.addEventListener('click', async () => {
        const url = window.location.href.split('#')[0];
        try {
          await navigator.clipboard?.writeText(url);
          trigger.setAttribute('data-feedback', 'copied');
          window.setTimeout(() => trigger.removeAttribute('data-feedback'), 1200);
        } catch {
          window.prompt('Copie o link do perfil:', url);
        }
        closeMenu();
      });

      menu.querySelectorAll('[data-profile-report]').forEach((button) => {
        button.addEventListener('click', () => {
          closeMenu();
          window.alert('Obrigado. A equipe Doke vai analisar este perfil.');
        });
      });

      document.addEventListener('click', (event) => {
        if (!menu.contains(event.target)) closeMenu();
      }, { passive: true });
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
};

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      els.tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
        if (isActive) {
          item.setAttribute("aria-current", "page");
        } else {
          item.removeAttribute("aria-current");
        }
      });
      body.dataset.profileActiveTab = tab.dataset.profileTab || "services";
      const tabsHost = root.querySelector('[data-profile-section="tabs"]');
      if (tabsHost) tabsHost.dataset.activeTab = tab.dataset.profileTab || "services";
      tab.blur();

      switchProfileTab(tab.dataset.profileTab);
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


  const openPostPreviewFromTrigger = (trigger) => {
    if (!trigger || state.selectingPosts) return false;

    const workerTrigger = trigger.closest?.("[data-worker-trigger]");
    if (workerTrigger) {
      refreshPostPreviews();
      window.DokeOpenWorkerPreview?.(workerTrigger.dataset.workerId || "", workerTrigger);
      return true;
    }

    const beforeAfterTrigger = trigger.closest?.("[data-before-after-trigger]");
    if (beforeAfterTrigger) {
      refreshPostPreviews();
      window.DokeOpenBeforeAfterPreview?.(beforeAfterTrigger.dataset.beforeAfterId || "", beforeAfterTrigger);
      return true;
    }

    return false;
  };

  root.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-worker-trigger], [data-before-after-trigger]");
    if (!trigger || !root.contains(trigger) || state.selectingPosts) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openPostPreviewFromTrigger(trigger);
  }, true);

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const trigger = event.target.closest("[data-worker-trigger], [data-before-after-trigger]");
    if (!trigger || !root.contains(trigger) || state.selectingPosts) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openPostPreviewFromTrigger(trigger);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFollowersModal();
      closeEditModal();
    }
  });

  const bindHorizontalProfileRails = () => {
    if (window.__dokeProfileHorizontalRailsBound) return;
    window.__dokeProfileHorizontalRailsBound = true;

    const railSelector = [
      ".profile-tabs",
      ".profile-posts-stack .short-videos__track",
      ".profile-posts-stack .comparison-grid"
    ].join(", ");

    document.addEventListener("wheel", (event) => {
      const rail = event.target.closest?.(railSelector);
      if (!rail) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (rail.scrollWidth <= rail.clientWidth + 4) return;

      rail.scrollLeft += event.deltaY;
      event.preventDefault();
    }, { passive: false });
  };

  if (window.DokeProfileShare && els.shareButtons.length) {
    window.DokeProfileShare.bind(els.shareButtons, () => ({
      title: document.title,
      text: "Confira este perfil na Doke.",
      url: window.location.href
    }));
  }


  bindHorizontalProfileRails();

  render();
};

window.DokeInitProfile();

