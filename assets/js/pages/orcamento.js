const initBudgetPage = () => {
  const pageRoot = document.querySelector("[data-budget-page]");
  if (!pageRoot || pageRoot.dataset.budgetInitialized === "true") return;
  pageRoot.dataset.budgetInitialized = "true";
  const form = document.querySelector("[data-budget-form]");
  const storageKey = "doke.quoteSubmission";
  const ordersStorageKey = "doke.orders";
  const defaultLocationKey = "doke.defaultServiceLocation";

  const query = new URLSearchParams(window.location.search);
  const provider = query.get("pro") || "Studio Aquarela";
  const service = (query.get("service") || "reforma residencial premium").replace(/-/g, " ");
  const formatTitleCase = (value) => String(value || "").replace(/\b\w/g, (c) => c.toUpperCase());

  document.querySelectorAll("[data-budget-provider]").forEach((node) => {
    node.textContent = provider;
  });

  document.querySelectorAll("[data-budget-service]").forEach((node) => {
    node.textContent = formatTitleCase(service);
  });

  const createUiSelect = (select) => {
    if (!select || select.dataset.uiReady === "true") return;

    const wrapper = document.createElement("div");
    wrapper.className = "ui-select";

    const native = select.cloneNode(true);
    native.classList.add("ui-select__native");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ui-select__trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.innerHTML = '<span class="ui-select__label"></span><span class="ui-select__caret" aria-hidden="true"></span>';

    const menu = document.createElement("div");
    menu.className = "ui-select__menu";
    menu.hidden = true;

    const currentValue = () => native.options[native.selectedIndex]?.textContent || native.options[0]?.textContent || "Selecione";
    const setLabel = () => {
      const label = trigger.querySelector(".ui-select__label");
      if (label) label.textContent = currentValue();
      [...menu.querySelectorAll(".ui-select__option")].forEach((optionButton) => {
        optionButton.classList.toggle("is-selected", optionButton.dataset.value === native.value);
      });
    };

    [...native.options].forEach((option) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "ui-select__option";
      optionButton.dataset.value = option.value;
      optionButton.textContent = option.textContent;
      optionButton.addEventListener("click", () => {
        native.value = option.value;
        native.dispatchEvent(new Event("change", { bubbles: true }));
        setLabel();
        menu.hidden = true;
        wrapper.classList.remove("is-open");
      });
      menu.appendChild(optionButton);
    });

    trigger.addEventListener("click", () => {
      const willOpen = menu.hidden;
      document.querySelectorAll(".ui-select.is-open").forEach((item) => {
        if (item !== wrapper) {
          item.classList.remove("is-open");
          const itemMenu = item.querySelector(".ui-select__menu");
          if (itemMenu) itemMenu.hidden = true;
        }
      });
      menu.hidden = !willOpen;
      wrapper.classList.toggle("is-open", willOpen);
    });

    native.addEventListener("change", setLabel);
    setLabel();

    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(native);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    select.remove();
    native.dataset.uiReady = "true";
  };

  document.querySelectorAll("select[data-ui-select]").forEach(createUiSelect);

  document.addEventListener("click", (event) => {
    document.querySelectorAll(".ui-select.is-open").forEach((item) => {
      if (!item.contains(event.target)) {
        item.classList.remove("is-open");
        const menu = item.querySelector(".ui-select__menu");
        if (menu) menu.hidden = true;
      }
    });
  });

  const getStoredOrders = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(ordersStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const persistOrderFromSubmission = (payload) => {
    if (!payload || !payload.id) return;
    const orders = getStoredOrders();
    if (!orders.some((item) => item && item.id === payload.id)) {
      orders.unshift(payload);
      window.localStorage.setItem(ordersStorageKey, JSON.stringify(orders));
    }
  };

  const formatCreatedAt = (value) => {
    if (!value) return "Agora";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Agora";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
  };

  if (form) {
    const detailsInput = form.querySelector("[data-details-input]");
    const detailsCount = form.querySelector("[data-details-count]");
    const filesInput = form.querySelector('input[type="file"]');
    const filesList = form.querySelector("[data-files-list]");
    const choiceGroups = [...form.querySelectorAll("[data-choice-group]")];
    const addressRequiredInput = form.querySelector("[data-address-required]");
    const addressTitle = form.querySelector("[data-address-title]");
    const addressSummary = form.querySelector("[data-address-summary]");
    const addressLine = form.querySelector("[data-address-line]");
    const addressMeta = form.querySelector("[data-address-meta]");
    const addressModal = document.querySelector("[data-address-modal]");
    const addressForm = document.querySelector("[data-address-form]");
    const headerChipLabel = document.querySelector("[data-saved-address-chip]");
    const headerChipButton = headerChipLabel?.closest("[data-open-address-modal]");
    const openAddressButtons = [...document.querySelectorAll("[data-open-address-modal]")];
    const closeAddressButtons = [...document.querySelectorAll("[data-close-address-modal]")];

    const panels = [...form.querySelectorAll("[data-step-panel]")];
    const indicators = [...form.querySelectorAll("[data-step-target]")];
    const prevButton = form.querySelector("[data-step-prev]");
    const nextButton = form.querySelector("[data-step-next]");
    const submitButton = form.querySelector("[data-step-submit]");
    const successSection = pageRoot.querySelector("[data-budget-success]");
    const loadingSection = pageRoot.querySelector("[data-budget-loading]");
    let currentStep = 0;
    let savedLocation = null;

    const getNativeSelect = (name) => form.querySelector(`.ui-select__native[name="${name}"]`) || form.querySelector(`select[name="${name}"]`);

    const categorySelect = getNativeSelect("categoria");
    const categoryInput = form.querySelector('input[name="categoria"]');
    if (service) {
      const normalized = formatTitleCase(service);
      if (categorySelect) {
        const hasOption = [...categorySelect.options].some((option) => option.textContent.toLowerCase() === normalized.toLowerCase());
        if (!hasOption) {
          const option = document.createElement("option");
          option.value = normalized;
          option.textContent = normalized;
          categorySelect.insertBefore(option, categorySelect.firstChild.nextSibling || null);
        }
        categorySelect.value = normalized;
        categorySelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (categoryInput) categoryInput.value = normalized;
    }

    const readStoredLocation = () => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(defaultLocationKey) || "null");
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    };

    const summarizeAddress = (address) => {
      if (!address) return "";
      const line1 = [address.rua, address.numero].filter(Boolean).join(", ");
      const line2 = [address.bairro, address.cidade, address.uf].filter(Boolean).join(" · ");
      return [line1, line2].filter(Boolean).join(" · ");
    };

    const applySavedLocation = (address) => {
      savedLocation = address;
      if (!address) {
        if (addressRequiredInput) addressRequiredInput.value = "";
        if (addressTitle) addressTitle.textContent = "Você ainda não adicionou um endereço";
        if (addressSummary) addressSummary.textContent = "";
        if (addressLine) addressLine.textContent = "";
        if (addressMeta) addressMeta.hidden = true;
        if (headerChipButton) headerChipButton.hidden = false;
        return;
      }

      if (addressRequiredInput) addressRequiredInput.value = summarizeAddress(address);
      if (addressTitle) addressTitle.textContent = address.titulo || "Endereço salvo";
      if (addressSummary) addressSummary.textContent = address.complemento || address.referencia || "Endereço pronto para este pedido e para os próximos.";
      if (addressLine) addressLine.textContent = summarizeAddress(address);
      if (addressMeta) addressMeta.hidden = false;
      if (headerChipLabel) headerChipLabel.textContent = address.titulo || "Endereço salvo";
      if (headerChipButton) headerChipButton.hidden = false;
    };

    applySavedLocation(readStoredLocation());

    const openAddressModal = () => {
      if (!addressModal || !addressForm) return;
      if (savedLocation) {
        Object.entries(savedLocation).forEach(([key, value]) => {
          const field = addressForm.elements.namedItem(key);
          if (field && "value" in field) field.value = value || "";
        });
        const checkedField = addressForm.elements.namedItem("padrao");
        if (checkedField && "checked" in checkedField) checkedField.checked = true;
      } else {
        addressForm.reset();
        const city = addressForm.elements.namedItem("cidade");
        const uf = addressForm.elements.namedItem("uf");
        const padrao = addressForm.elements.namedItem("padrao");
        if (city) city.value = "Salvador";
        if (uf) uf.value = "BA";
        if (padrao) padrao.checked = true;
      }
      addressModal.showModal();
    };

    const closeAddressModal = () => addressModal?.close();
    openAddressButtons.forEach((button) => button.addEventListener("click", openAddressModal));
    closeAddressButtons.forEach((button) => button.addEventListener("click", closeAddressModal));
    addressModal?.addEventListener("click", (event) => {
      const dialogBox = addressModal.querySelector(".address-modal__dialog");
      if (dialogBox && !dialogBox.contains(event.target)) closeAddressModal();
    });

    addressForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!addressForm.reportValidity()) return;
      const data = new FormData(addressForm);
      const payload = {
        titulo: String(data.get("titulo") || "Endereço salvo"),
        rua: String(data.get("rua") || ""),
        numero: String(data.get("numero") || ""),
        bairro: String(data.get("bairro") || ""),
        cidade: String(data.get("cidade") || "Salvador"),
        uf: String(data.get("uf") || "BA").toUpperCase(),
        complemento: String(data.get("complemento") || ""),
        referencia: String(data.get("referencia") || "")
      };
      if (data.get("padrao")) {
        window.localStorage.setItem(defaultLocationKey, JSON.stringify(payload));
      }
      applySavedLocation(payload);
      closeAddressModal();
    });

    const syncCount = () => {
      if (!detailsInput || !detailsCount) return;
      detailsCount.textContent = String(detailsInput.value.length);
    };

    const syncFiles = () => {
      if (!filesInput || !filesList) return;
      const files = [...(filesInput.files || [])];
      filesList.innerHTML = "";
      filesList.hidden = files.length === 0;
      files.forEach((file) => {
        const item = document.createElement("span");
        item.textContent = file.name;
        filesList.appendChild(item);
      });
    };

    const validateStep = (index) => {
      const panel = panels[index];
      if (!panel) return true;
      if (index === 1 && (!savedLocation || !addressRequiredInput?.value)) {
        openAddressModal();
        return false;
      }
      const fields = [...panel.querySelectorAll("input, select, textarea")].filter((field) => {
        if (field.type === "hidden" || field.type === "file") return false;
        if (field.type === "checkbox") return field.required;
        return true;
      });
      for (const field of fields) {
        if (!field.checkValidity()) {
          field.reportValidity();
          return false;
        }
      }
      return true;
    };

    const goToStep = (index) => {
      currentStep = Math.max(0, Math.min(index, panels.length - 1));
      panels.forEach((panel, panelIndex) => {
        const active = panelIndex === currentStep;
        panel.hidden = !active;
        panel.classList.toggle("is-active", active);
      });
      indicators.forEach((indicator, indicatorIndex) => {
        indicator.classList.toggle("is-active", indicatorIndex === currentStep);
      });
      if (prevButton) prevButton.hidden = currentStep === 0;
      if (nextButton) nextButton.hidden = currentStep === panels.length - 1;
      if (submitButton) submitButton.hidden = currentStep !== panels.length - 1;
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    syncCount();
    detailsInput?.addEventListener("input", syncCount);
    filesInput?.addEventListener("change", syncFiles);

    choiceGroups.forEach((group) => {
      const input = group.parentElement?.querySelector("[data-choice-input]");
      const buttons = [...group.querySelectorAll("[data-choice-value]")];
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          buttons.forEach((item) => item.classList.remove("is-active"));
          button.classList.add("is-active");
          if (input) input.value = button.dataset.choiceValue || "";
        });
      });
    });

    indicators.forEach((indicator, index) => {
      indicator.addEventListener("click", () => {
        if (index <= currentStep || validateStep(currentStep)) goToStep(index);
      });
    });

    nextButton?.addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      goToStep(currentStep + 1);
    });

    prevButton?.addEventListener("click", () => goToStep(currentStep - 1));
    submitButton?.addEventListener("click", (event) => {
      event.preventDefault();
      if (currentStep !== panels.length - 1) return;
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    });
    goToStep(0);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (currentStep !== panels.length - 1) {
        goToStep(panels.length - 1);
        return;
      }
      if (!validateStep(currentStep)) return;
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const payload = {
        id: `order-${Date.now()}`,
        provider,
        service: data.get("categoria") || service,
        requestType: data.get("tipo") || "Orçamento para execução",
        scope: data.get("escopo") || "Ambiente completo",
        location: summarizeAddress(savedLocation),
        locationTitle: savedLocation?.titulo || "Endereço salvo",
        locationDetails: savedLocation || {},
        property: data.get("imovel") || "Não informado",
        urgency: data.get("urgencia") || "Sem pressa",
        date: data.get("data") || "",
        shift: data.get("turno") || "Flexível",
        details: data.get("detalhes") || "",
        triage: {
          ocupacao: data.get("triagem_ocupacao") || "",
          medidas: data.get("triagem_medidas") || "",
          observacoes: data.get("triagem_observacoes") || ""
        },
        area: data.get("area") || "",
        attachments: [...(filesInput?.files || [])].map((file) => file.name),
        status: "pending",
        statusLabel: "Aguardando resposta",
        nextAction: "Acompanhar pedido",
        createdAt: new Date().toISOString()
      };

      window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
      persistOrderFromSubmission(payload);
      const map = {
        "[data-success-service]": payload.service,
        "[data-success-provider]": payload.provider,
        "[data-success-location]": payload.locationTitle || payload.location,
        "[data-success-urgency]": payload.urgency
      };
      Object.entries(map).forEach(([selector, value]) => {
        const node = document.querySelector(selector);
        if (node && value) node.textContent = value;
      });
      form.style.display = "none";
      form.hidden = true;

      if (loadingSection) {
        loadingSection.hidden = false;
        loadingSection.style.display = "grid";
        loadingSection.classList.add("is-active");
        window.requestAnimationFrame(() => {
          loadingSection.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      }

      window.setTimeout(() => {
        if (loadingSection) {
          loadingSection.hidden = true;
          loadingSection.style.display = "none";
          loadingSection.classList.remove("is-active");
        }
        if (successSection) {
          successSection.hidden = false;
          successSection.style.display = "block";
          successSection.classList.add("is-active");
          pageRoot.classList.add("is-success");
          window.requestAnimationFrame(() => {
            successSection.scrollIntoView({ block: "start", behavior: "smooth" });
          });
        }
      }, 1400);
    });
  }

  const renderOrdersPage = () => {
    const list = document.querySelector("[data-orders-list]");
    const empty = document.querySelector("[data-orders-empty]");
    const filtersWrap = document.querySelector("[data-orders-filters]");
    if (!list || !empty || !filtersWrap) return;

    const orders = getStoredOrders().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const counts = {
      all: orders.length,
      total: orders.length,
      pending: orders.filter((item) => item.status === "pending").length,
      conversation: orders.filter((item) => item.status === "conversation").length,
      responded: orders.filter((item) => item.status === "responded").length,
      completed: orders.filter((item) => item.status === "completed").length,
      cancelled: orders.filter((item) => item.status === "cancelled").length
    };

    const metrics = {
      "[data-orders-total]": counts.total,
      "[data-orders-pending]": counts.pending,
      "[data-orders-conversation]": counts.conversation,
      "[data-orders-completed]": counts.completed
    };

    Object.entries(metrics).forEach(([selector, value]) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = String(value);
    });

    Object.entries(counts).forEach(([key, value]) => {
      document.querySelectorAll(`[data-filter-count="${key}"]`).forEach((node) => {
        node.textContent = `(${value})`;
      });
    });

    const statusLabels = {
      pending: "Aguardando resposta",
      conversation: "Em conversa",
      responded: "Respondido",
      completed: "Concluído",
      cancelled: "Cancelado"
    };

    const nextActionLabels = {
      pending: "Acompanhar pedido",
      conversation: "Abrir conversa",
      responded: "Ver resposta",
      completed: "Ver resumo",
      cancelled: "Ver detalhes"
    };

    const render = (statusFilter = "all") => {
      const filtered = statusFilter === "all" ? orders : orders.filter((order) => order.status === statusFilter);
      if (!filtered.length) {
        list.innerHTML = "";
        empty.hidden = false;
        return;
      }

      empty.hidden = true;
      list.innerHTML = filtered.map((order) => {
        const status = order.status || "pending";
        const serviceName = order.service || "Serviço solicitado";
        const providerName = order.provider || "Profissional Doke";
        const summary = order.details || "Seu pedido foi registrado e está pronto para seguir por aqui.";
        const location = order.locationTitle || order.location || "A definir";
        const urgency = order.urgency || "Sem pressa";
        const requestType = order.requestType || "Pedido enviado";
        const statusLabel = order.statusLabel || statusLabels[status] || "Aguardando";
        const nextAction = order.nextAction || nextActionLabels[status] || "Ver detalhes";

        return `
          <article class="quote-card orders-card" data-status="${status}" data-order-id="${order.id || order.createdAt || Math.random().toString(36).slice(2)}">
            <div class="orders-card__top">
              <div class="orders-card__header">
                <div class="orders-card__title-wrap">
                  <input class="orders-card__check" type="checkbox" aria-label="Selecionar pedido ${serviceName}">
                  <div>
                    <h3>${serviceName}</h3>
                    <p class="orders-card__provider">Enviado para <strong>${providerName}</strong></p>
                  </div>
                </div>
                <span class="orders-card__status" data-status="${status}">${statusLabel}</span>
              </div>
              <p class="orders-card__date">Pedido criado em ${formatCreatedAt(order.createdAt)}</p>
            </div>

            <div class="orders-card__meta">
              <article><span>Local</span><strong>${location}</strong></article>
              <article><span>Urgência</span><strong>${urgency}</strong></article>
              <article><span>Tipo</span><strong>${requestType}</strong></article>
            </div>

            <div class="orders-card__body">
              <div class="orders-card__summary">
                <strong>Resumo do pedido</strong>
                <p>${summary}</p>
              </div>
              <div class="orders-card__timeline">
                <strong>Próximo passo</strong>
                <p>${nextAction} dentro do Doke.</p>
              </div>
            </div>

            <div class="orders-card__footer">
              <p class="orders-card__next">Tudo fica centralizado aqui para acompanhar respostas e próximos passos.</p>
              <div class="orders-card__actions">
                <a class="orders-button orders-button--ghost" href="pedidos.html">Ver detalhes</a>
                <a class="orders-button orders-button--primary" href="#">${nextAction}</a>
              </div>
            </div>
          </article>
        `;
      }).join("");
    };

    const searchWrap = document.querySelector("[data-orders-search-wrap]");
    const searchToggle = document.querySelector("[data-orders-search-toggle]");
    const searchClose = document.querySelector("[data-orders-search-close]");
    const searchInput = document.querySelector("[data-orders-search-input]");
    const filtersWrapElement = document.querySelector("[data-orders-filters]");
    const selectToggle = document.querySelector("[data-orders-select-toggle]");
    const deleteSelectedButton = document.querySelector("[data-orders-delete-selected]");
    let currentFilter = "all";
    let searchTerm = "";

    const applySelectionState = () => {
      const selected = list.querySelectorAll('.orders-card__check:checked').length;
      if (deleteSelectedButton) {
        deleteSelectedButton.hidden = !(pageRoot.classList.contains('is-selecting') && selected > 0);
        deleteSelectedButton.textContent = selected > 0 ? `Excluir selecionados (${selected})` : 'Excluir selecionados';
      }
    };

    const renderFiltered = () => {
      const filtered = currentFilter === "all"
        ? orders
        : orders.filter((order) => order.status === currentFilter);
      const searched = searchTerm
        ? filtered.filter((order) => {
            const haystack = [order.service, order.provider, order.details, order.locationTitle, order.location, order.requestType]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return haystack.includes(searchTerm);
          })
        : filtered;

      if (!searched.length) {
        list.innerHTML = "";
        empty.hidden = false;
        applySelectionState();
        return;
      }

      empty.hidden = true;
      list.innerHTML = searched.map((order) => {
        const status = order.status || "pending";
        const serviceName = order.service || "Serviço solicitado";
        const providerName = order.provider || "Profissional Doke";
        const summary = order.details || "Seu pedido foi registrado e está pronto para seguir por aqui.";
        const location = order.locationTitle || order.location || "A definir";
        const urgency = order.urgency || "Sem pressa";
        const requestType = order.requestType || "Pedido enviado";
        const statusLabel = order.statusLabel || statusLabels[status] || "Aguardando";
        const nextAction = order.nextAction || nextActionLabels[status] || "Ver detalhes";

        return `
          <article class="quote-card orders-card" data-status="${status}" data-order-id="${order.id || order.createdAt || Math.random().toString(36).slice(2)}">
            <div class="orders-card__top">
              <div class="orders-card__header">
                <div class="orders-card__title-wrap">
                  <input class="orders-card__check" type="checkbox" aria-label="Selecionar pedido ${serviceName}">
                  <div>
                    <h3>${serviceName}</h3>
                    <p class="orders-card__provider">Enviado para <strong>${providerName}</strong></p>
                  </div>
                </div>
                <span class="orders-card__status" data-status="${status}">${statusLabel}</span>
              </div>
              <p class="orders-card__date">Pedido criado em ${formatCreatedAt(order.createdAt)}</p>
            </div>

            <div class="orders-card__meta">
              <article><span>Local</span><strong>${location}</strong></article>
              <article><span>Urgência</span><strong>${urgency}</strong></article>
              <article><span>Tipo</span><strong>${requestType}</strong></article>
            </div>

            <div class="orders-card__body">
              <div class="orders-card__summary">
                <strong>Resumo do pedido</strong>
                <p>${summary}</p>
              </div>
              <div class="orders-card__timeline">
                <strong>Próximo passo</strong>
                <p>${nextAction} dentro do Doke.</p>
              </div>
            </div>

            <div class="orders-card__footer">
              <p class="orders-card__next">Tudo fica centralizado aqui para acompanhar respostas e próximos passos.</p>
              <div class="orders-card__actions">
                <a class="orders-button orders-button--ghost" href="pedidos.html">Ver detalhes</a>
                <a class="orders-button orders-button--primary" href="#">${nextAction}</a>
              </div>
            </div>
          </article>
        `;
      }).join("");
      applySelectionState();
    };

    filtersWrap.addEventListener("click", (event) => {
      const button = event.target.closest("[data-status-filter], [data-filter]");
      if (!button) return;
      filtersWrap.querySelectorAll("[data-status-filter], [data-filter]").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      currentFilter = button.dataset.statusFilter || button.dataset.filter || "all";
      renderFiltered();
    });

    const closeSearch = ({ clear = false } = {}) => {
      if (!searchWrap) return;
      searchWrap.classList.remove('is-open');
      searchToggle?.classList.remove('is-active');
      filtersWrapElement?.classList.remove('is-hidden');
      pageRoot.classList.remove('search-open');
      if (clear && searchInput) {
        searchInput.value = '';
        searchTerm = '';
      }
      renderFiltered();
    };

    const setSearchMode = (isOpen) => {
      if (!searchWrap) return;
      searchWrap.classList.toggle("is-open", isOpen);
      searchToggle?.classList.toggle('is-active', isOpen);
      filtersWrapElement?.classList.toggle("is-hidden", isOpen);
      pageRoot.classList.toggle('search-open', isOpen);
      if (isOpen) {
        searchInput?.focus();
      } else if (searchInput) {
        searchInput.value = "";
        searchTerm = '';
      }
      renderFiltered();
    };

    if (searchToggle && searchWrap) {
      searchToggle.addEventListener("click", () => {
        const willOpen = !searchWrap.classList.contains("is-open");
        setSearchMode(willOpen);
      });
    }

    if (searchClose && searchWrap) {
      searchClose.addEventListener("click", () => setSearchMode(false));
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        renderFiltered();
      });
    }

    document.addEventListener('click', (event) => {
      if (!searchWrap || !searchWrap.classList.contains('is-open')) return;
      if (searchWrap.contains(event.target)) return;
      closeSearch();
    });


    if (selectToggle) {
      selectToggle.addEventListener('click', () => {
        pageRoot.classList.toggle('is-selecting');
        if (!pageRoot.classList.contains('is-selecting')) {
          list.querySelectorAll('.orders-card__check').forEach((input) => {
            input.checked = false;
          });
        }
        applySelectionState();
      });
    }

    list.addEventListener('change', (event) => {
      if (event.target.matches('.orders-card__check')) applySelectionState();
    });

    if (deleteSelectedButton) {
      deleteSelectedButton.addEventListener('click', () => {
        const selectedIds = Array.from(list.querySelectorAll('.orders-card__check:checked'))
          .map((input) => input.closest('.orders-card')?.dataset.orderId)
          .filter(Boolean);
        if (!selectedIds.length) return;
        const nextOrders = getStoredOrders().filter((order) => !selectedIds.includes(order.id || order.createdAt));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextOrders));
        window.location.reload();
      });
    }

    renderFiltered();
  };

  renderOrdersPage();

};

window.DokeInitBudget = initBudgetPage;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBudgetPage, { once: true });
} else {
  initBudgetPage();
}
