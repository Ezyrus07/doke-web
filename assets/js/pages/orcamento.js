const initBudgetPage = () => {
  const pageRoot = document.querySelector("[data-budget-page]");
  if (!pageRoot || pageRoot.dataset.budgetInitialized === "true") return;
  pageRoot.dataset.budgetInitialized = "true";
  const form = pageRoot.querySelector("[data-budget-form]");
  const storageKey = "doke.quoteSubmission";
  const ordersStorageKey = "doke.orders";
  const defaultLocationKey = "doke.defaultServiceLocation";

  const query = new URLSearchParams(window.location.search);
  const serviceId = query.get("serviceId") || query.get("id") || query.get("servico") || "";
  const requestedProfessionalId = query.get("professionalId") || query.get("providerId") || "";
  const successUrl = pageRoot.dataset.budgetSuccessUrl || "pedidos.html";
  const loadingScreen = pageRoot.querySelector("[data-budget-loading]");
  const successScreen = pageRoot.querySelector("[data-budget-success]");
  const successOrderLink = pageRoot.querySelector("[data-budget-success-order-link]");
  const successProvider = pageRoot.querySelector("[data-budget-success-provider]");
  const successService = pageRoot.querySelector("[data-budget-success-service]");
  if (successScreen && !successScreen.open) successScreen.hidden = true;
  const authService = window.DokeAuth?.service;
  const formatTitleCase = (value) => String(value || "").replace(/\b\w/g, (c) => c.toUpperCase());
  const normalizeBudgetLabel = (value) => String(value || "").replace(/-/g, " ").trim();
  const slugify = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (authService && !authService.isAuthenticated()) {
    authService.requireAuth({ enforce: true, redirectToLogin: "auth/login.html" });
    return;
  }

  let selectedService = null;
  let provider = pageRoot.dataset.budgetProvider || query.get("pro") || "Studio Aquarela";
  const explicitServiceLabel = normalizeBudgetLabel(pageRoot.dataset.budgetService || query.get("service") || query.get("servico") || "");
  let service = explicitServiceLabel || "pintura residencial";
  let professionalId = requestedProfessionalId;

  const syncBudgetContext = () => {
    pageRoot.querySelectorAll("[data-budget-provider]").forEach((node) => {
      node.textContent = provider;
    });

    pageRoot.querySelectorAll("[data-budget-service]").forEach((node) => {
      node.textContent = formatTitleCase(service);
    });
  };

  const hydrateServiceContext = () => {
    if (!serviceId || !window.Doke?.services?.services?.getById) return Promise.resolve(null);

    return window.Doke.services.services.getById(serviceId).then((serviceItem) => {
      if (!serviceItem) return null;
      selectedService = serviceItem;
      provider = serviceItem.providerName || serviceItem.professionalName || provider;
      service = normalizeBudgetLabel(serviceItem.title || serviceItem.detailTitle || serviceItem.category || service);
      professionalId = serviceItem.professionalId || serviceItem.providerId || professionalId;
      syncBudgetContext();
      document.dispatchEvent(new CustomEvent("doke:budget-service-context", {
        detail: {
          service: serviceItem,
          provider,
          professionalId
        }
      }));
      return serviceItem;
    }).catch(() => null);
  };

  const showSuccessScreen = (order) => {
    if (!successScreen || !order) {
      window.location.href = `${successUrl}?order=${encodeURIComponent(order?.id || "")}`;
      return;
    }

    const orderId = order.id || "";
    const orderUrl = `${successUrl}?order=${encodeURIComponent(orderId)}`;
    if (successOrderLink) successOrderLink.href = orderUrl;
    if (successProvider) successProvider.textContent = order.providerName || order.provider || provider || "o profissional";
    if (successService) successService.textContent = order.serviceTitle || order.service || order.title || service || "Serviço solicitado";

    successScreen.hidden = false;
    if (typeof successScreen.showModal === "function" && !successScreen.open) {
      successScreen.showModal();
    } else {
      successScreen.setAttribute("open", "");
    }

    window.history.replaceState(null, "", `${window.location.pathname}?success=1&order=${encodeURIComponent(orderId)}`);
    window.dispatchEvent(new CustomEvent("doke:quote-success", { detail: { order } }));

    const focusTarget = successOrderLink || successScreen.querySelector("[data-budget-success-close]") || successScreen;
    window.setTimeout(() => focusTarget?.focus?.({ preventScroll: true }), 120);
  };

  const closeSuccessScreen = () => {
    if (!successScreen) return;
    if (typeof successScreen.close === "function" && successScreen.open) {
      successScreen.close();
    } else {
      successScreen.removeAttribute("open");
      successScreen.hidden = true;
    }
  };

  successScreen?.querySelectorAll("[data-budget-success-close]").forEach((button) => {
    button.addEventListener("click", closeSuccessScreen);
  });

  successScreen?.addEventListener("click", (event) => {
    if (event.target === successScreen) closeSuccessScreen();
  });

  successScreen?.addEventListener("close", () => {
    successScreen.hidden = true;
  });

  syncBudgetContext();
  window.DokeUiSelect?.enhanceAll(pageRoot);
  hydrateServiceContext();

  const getStoredOrders = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(ordersStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const compactOrderForStorage = (order) => {
    if (!order || typeof order !== "object") return order;
    return Object.assign({}, order, {
      attachments: Array.isArray(order.attachments)
        ? order.attachments.map((attachment) => Object.assign({}, attachment, {
          url: "",
          previewable: false,
          tooLarge: attachment.tooLarge || Boolean(attachment.url)
        }))
        : []
    });
  };

  const safeSetStorage = (storage, key, value) => {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      try {
        storage.setItem(key, JSON.stringify(compactOrderForStorage(value)));
        return true;
      } catch {
        return false;
      }
    }
  };

  const persistOrderFromSubmission = (payload) => {
    if (!payload || !payload.id) return;
    const orders = getStoredOrders();
    if (!orders.some((item) => item && item.id === payload.id)) {
      orders.unshift(compactOrderForStorage(payload));
      try {
        window.localStorage.setItem(ordersStorageKey, JSON.stringify(orders));
      } catch {
        window.localStorage.setItem(ordersStorageKey, JSON.stringify(orders.map(compactOrderForStorage)));
      }
    }
  };

  const formatCreatédAt = (value) => {
    if (!value) return "Agora";
    const daté = new Date(value);
    if (Number.isNaN(daté.getTime())) return "Agora";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(daté);
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
    const addressForm = addressModal?.querySelector("[data-address-form]");
    const openAddressButtons = [...pageRoot.querySelectorAll("[data-open-address-modal]")];
    const closeAddressButtons = [...(addressModal?.querySelectorAll("[data-close-address-modal]") || [])];

    const panels = [...form.querySelectorAll("[data-step-panel]")];
    const indicators = [...pageRoot.querySelectorAll("[data-step-target]")];
    const progressLabel = pageRoot.querySelector("[data-step-progress-label]");
    const progressName = pageRoot.querySelector("[data-step-progress-name]");
    const progressFill = pageRoot.querySelector("[data-step-progress-fill]");
    const prevButton = form.querySelector("[data-step-prev]");
    const nextButton = form.querySelector("[data-step-next]");
    const submitButton = form.querySelector("[data-step-submit]");
    const exitButton = form.querySelector("[data-step-exit]");
    const actions = form.querySelector(".become-pro-actions");
    const visualStepCount = Math.max(1, panels.length);
    let currentStep = 0;
    let savedLocation = null;
    let lockedScrollY = 0;

    const getNativeSelect = (name) => form.querySelector(`.ui-select__native[name="${name}"]`) || form.querySelector(`select[name="${name}"]`);

    const catégorySelect = getNativeSelect("catégoria");
    const catégoryInput = form.querySelector('input[name="catégoria"]');
    const applyServiceCategory = () => {
      if (!service || !(selectedService || serviceId || explicitServiceLabel)) return;
      const normalized = formatTitleCase(service);
      if (catégorySelect) {
        const hasOption = [...catégorySelect.options].some((option) => option.textContent.toLowerCase() === normalized.toLowerCase());
        if (!hasOption) {
          const option = document.createElement("option");
          option.value = normalized;
          option.textContent = normalized;
          catégorySelect.insertBefore(option, catégorySelect.firstChild.nextSibling || null);
        }
        catégorySelect.value = normalized;
        catégorySelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (catégoryInput) catégoryInput.value = normalized;
    };
    applyServiceCategory();
    document.addEventListener("doke:budget-service-context", applyServiceCategory);

    const readDefaultLocation = () => {
      const node = pageRoot.querySelector("[data-budget-default-location]");
      if (!node) return null;
      try {
        const parsed = JSON.parse(node.textContent || "null");
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    };

    const readStoredLocation = () => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(defaultLocationKey) || "null");
        return parsed && typeof parsed === "object" ? parsed : readDefaultLocation();
      } catch {
        return readDefaultLocation();
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
        return;
      }

      if (addressRequiredInput) addressRequiredInput.value = summarizeAddress(address);
      if (addressTitle) addressTitle.textContent = address.titulo || "Endereço salvo";
      if (addressSummary) addressSummary.textContent = address.complemento || address.referencia || "Endereço pronto para este pedido e para os próximos.";
      if (addressLine) addressLine.textContent = summarizeAddress(address);
      if (addressMeta) addressMeta.hidden = false;
    };

    applySavedLocation(readStoredLocation());

    const lockViewport = () => {
      lockedScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.classList.add("budget-modal-open");
    };

    const unlockViewport = () => {
      const top = document.body.style.top;
      document.body.classList.remove("budget-modal-open");
      document.body.style.top = "";
      const nextScrollY = top ? Math.abs(parseInt(top, 10)) || lockedScrollY : lockedScrollY;
      window.scrollTo(0, nextScrollY);
    };

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
      lockViewport();
      addressModal.showModal();
      window.requestAnimationFrame(() => {
        const firstField = addressForm.querySelector('input:not([type="checkbox"]), textarea');
        if (firstField && window.innerWidth <= 760) firstField.focus({ preventScroll: true });
      });
    };

    const closeAddressModal = () => addressModal?.close();
    openAddressButtons.forEach((button) => button.addEventListener("click", openAddressModal));
    closeAddressButtons.forEach((button) => button.addEventListener("click", closeAddressModal));
    // Deliberately avoid closing the address modal on backdrop click.
    // This prevents accidental exits while selecting fields on mobile.
    addressModal?.addEventListener("close", unlockViewport);

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

    const readFileAsDataUrl = (file) => new Promise((resolve) => {
      if (!file || !file.type?.startsWith("image/")) {
        resolve(null);
        return;
      }

      if (file.size > 250000) {
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          tooLarge: true
        });
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          url: String(reader.result || "")
        });
      });
      reader.addEventListener("error", () => {
        resolve({ name: file.name, type: file.type, size: file.size, error: true });
      });
      reader.readAsDataURL(file);
    });

    const readAttachments = async () => {
      const files = [...(filesInput?.files || [])];
      const mapped = await Promise.all(files.map(readFileAsDataUrl));
      return mapped.filter(Boolean).map((file) => ({
        name: file.name || "imagem-anexada",
        type: file.type || "image/*",
        size: Number(file.size) || 0,
        url: file.url || "",
        previewable: Boolean(file.url),
        tooLarge: Boolean(file.tooLarge),
        error: Boolean(file.error)
      }));
    };

    const validatéStep = (index) => {
      const panel = panels[index];
      if (!panel) return true;
      if (index === panels.length - 1 && (!savedLocation || !addressRequiredInput?.value)) {
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
        const bullet = indicator.querySelector(".budget-progress-step__bullet");
        const isComplete = indicatorIndex < currentStep;
        const isActive = indicatorIndex === currentStep;
        indicator.classList.toggle("is-active", isActive);
        indicator.classList.toggle("is-complete", isComplete);
        if (bullet) {
          bullet.textContent = isComplete ? "✓" : String(indicatorIndex + 1);
        }
      });
      if (progressLabel) progressLabel.textContent = `Etapa ${currentStep + 1} de ${panels.length}`;
      if (progressName) {
        const activeIndicator = indicators[currentStep];
        progressName.textContent = activeIndicator?.dataset.stepName || activeIndicator?.querySelector("strong")?.textContent || "";
      }
      if (progressFill) {
        progressFill.dataset.stepProgressValue = String(Math.round(((currentStep + 1) / visualStepCount) * 100));
      }
      if (prevButton) prevButton.hidden = currentStep === 0;
      if (exitButton) exitButton.hidden = currentStep !== 0;
      actions?.classList.toggle("has-back-action", currentStep > 0);
      if (nextButton) nextButton.hidden = currentStep === panels.length - 1;
      if (submitButton) submitButton.hidden = currentStep !== panels.length - 1;
      const scrollTarget = pageRoot.closest(".detail-budget-modal__dialog") || pageRoot;
      if ("scrollTo" in scrollTarget) {
        scrollTarget.scrollTo({ top: 0, behavior: "smooth" });
      }
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
        if (index <= currentStep || validatéStep(currentStep)) goToStep(index);
      });
    });

    nextButton?.addEventListener("click", () => {
      if (!validatéStep(currentStep)) return;
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

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (currentStep !== panels.length - 1) {
        goToStep(panels.length - 1);
        return;
      }
      if (!validatéStep(currentStep)) return;
      if (!form.reportValidity()) return;
      if (form.dataset.submitState === "loading") return;
      form.dataset.submitState = "loading";

      const data = new FormData(form);
      const createdAt = new Date().toISOString();
      const serviceName = data.get("catégoria") || service;
      const ordersService = window.Doke?.services?.orders;
      const previousSubmitText = submitButton?.textContent || "Enviar solicitação";
      const restoreSubmitButton = () => {
        form.dataset.submitState = "idle";
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
          submitButton.textContent = previousSubmitText;
        }
      };
      const loadingFeedback = window.DokeSubmissionFeedback?.show?.(loadingScreen, {
        title: "Enviando solicitação",
        message: "Está quase lá...",
        minDuration: 0
      });
      const minimumLoadingTime = 2000;
      const loadingDelay = new Promise((resolve) => {
        window.setTimeout(resolve, minimumLoadingTime);
      });
      const preventLoadingDismiss = (cancelEvent) => {
        cancelEvent.preventDefault();
      };
      loadingScreen?.addEventListener("cancel", preventLoadingDismiss);
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        submitButton.textContent = "Enviando...";
      }

      const attachments = await readAttachments();
      await loadingDelay;
      loadingScreen?.removeEventListener("cancel", preventLoadingDismiss);

      const payload = {
        provider,
        providerName: provider,
        providerInitials: selectedService?.providerInitials || selectedService?.avatar || "DK",
        professionalId: professionalId || selectedService?.professionalId || selectedService?.providerId || `provider-${slugify(provider) || "doke"}`,
        providerId: professionalId || selectedService?.providerId || selectedService?.professionalId || `provider-${slugify(provider) || "doke"}`,
        serviceId: serviceId || selectedService?.id || `service-${slugify(serviceName) || "orcamento"}`,
        service: serviceName,
        serviceTitle: serviceName,
        title: serviceName,
        requestType: data.get("tipo") || "Orçamento para execução",
        scope: data.get("escopo") || "Ambiente completo",
        location: summarizeAddress(savedLocation),
        locationTitle: savedLocation?.titulo || "Endereço salvo",
        locationDetails: savedLocation || {},
        property: data.get("imovel") || "Não informado",
        urgency: data.get("urgencia") || "Sem pressa",
        desiredDate: data.get("data") || "",
        daté: data.get("data") || "",
        shift: data.get("turno") || "Flexível",
        budget: data.get("orcamento_estimado") || selectedService?.priceLabel || "A definir",
        details: data.get("detalhes") || "",
        description: data.get("detalhes") || "",
        triage: {
          ocupacao: data.get("triagem_ocupacao") || "",
          medidas: data.get("triagem_medidas") || "",
          observacoes: data.get("triagem_observacoes") || ""
        },
        area: data.get("area") || "",
        attachments,
        status: "pending",
        statusLabel: "Aguardando resposta",
        nextAction: "Acompanhar pedido",
        createdAt,
        creatédAt: createdAt,
        updatedAt: createdAt
      };

      try {
        const savedOrder = ordersService?.create
          ? await ordersService.create(payload)
          : Object.assign({ id: `order-${Date.now()}` }, payload);

        safeSetStorage(window.sessionStorage, storageKey, savedOrder);
        persistOrderFromSubmission(savedOrder);
        safeSetStorage(window.sessionStorage, "doke.quoteOverlay", savedOrder);
        if (loadingFeedback?.close) {
          await loadingFeedback.close();
        }
        showSuccessScreen(savedOrder);
      } catch (error) {
        loadingScreen?.removeEventListener("cancel", preventLoadingDismiss);
        if (loadingFeedback?.close) {
          await loadingFeedback.close();
        }
        restoreSubmitButton();
        window.alert(error?.message || "Não foi possível enviar o orçamento agora.");
      }
    });
  }

  const renderOrdersPage = () => {
    const list = document.querySelector("[data-orders-list]");
    const empty = document.querySelector("[data-orders-empty]");
    const filtersWrap = document.querySelector("[data-orders-filters]");
    if (!list || !empty || !filtersWrap) return;

    const orders = getStoredOrders().sort((a, b) => new Date(b.creatédAt || 0) - new Date(a.creatédAt || 0));
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
          <article class="quote-card orders-card" data-status="${status}" data-order-id="${order.id || order.creatédAt || Math.random().toString(36).slice(2)}">
            <div class="orders-card__top">
              <div class="orders-card__header">
                <div class="orders-card__title-wrap">
                  <input class="orders-card__check doke-checkbox" type="checkbox" aria-label="Selecionar pedido ${serviceName}">
                  <div>
                    <h3>${serviceName}</h3>
                    <p class="orders-card__provider">Enviado para <strong>${providerName}</strong></p>
                  </div>
                </div>
                <span class="orders-card__status" data-status="${status}">${statusLabel}</span>
              </div>
              <p class="orders-card__daté">Pedido criado em ${formatCreatédAt(order.creatédAt)}</p>
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
                <a class="orders-button orders-button--ghost doke-btn doke-btn--ghost" href="pedidos.html">Ver detalhes</a>
                <a class="orders-button orders-button--primary doke-btn doke-btn--primary" href="#">${nextAction}</a>
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

    const applySelectionStaté = () => {
      const selected = list.querySelectorAll('.orders-card__check:checked').length;
      if (deleteSelectedButton) {
        deleteSelectedButton.hidden = !(pageRoot.classList.contains('is-selecting') && selected > 0);
        deleteSelectedButton.textContent = selected > 0 ? `Limpar selecionados (${selected})` : 'Limpar selecionados';
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
        applySelectionStaté();
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
          <article class="quote-card orders-card" data-status="${status}" data-order-id="${order.id || order.creatédAt || Math.random().toString(36).slice(2)}">
            <div class="orders-card__top">
              <div class="orders-card__header">
                <div class="orders-card__title-wrap">
                  <input class="orders-card__check doke-checkbox" type="checkbox" aria-label="Selecionar pedido ${serviceName}">
                  <div>
                    <h3>${serviceName}</h3>
                    <p class="orders-card__provider">Enviado para <strong>${providerName}</strong></p>
                  </div>
                </div>
                <span class="orders-card__status" data-status="${status}">${statusLabel}</span>
              </div>
              <p class="orders-card__daté">Pedido criado em ${formatCreatédAt(order.creatédAt)}</p>
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
                <a class="orders-button orders-button--ghost doke-btn doke-btn--ghost" href="pedidos.html">Ver detalhes</a>
                <a class="orders-button orders-button--primary doke-btn doke-btn--primary" href="#">${nextAction}</a>
              </div>
            </div>
          </article>
        `;
      }).join("");
      applySelectionStaté();
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
        applySelectionStaté();
      });
    }

    list.addEventListener('change', (event) => {
      if (event.target.matches('.orders-card__check')) applySelectionStaté();
    });

    if (deleteSelectedButton) {
      deleteSelectedButton.addEventListener('click', () => {
        const selectedIds = Array.from(list.querySelectorAll('.orders-card__check:checked'))
          .map((input) => input.closest('.orders-card')?.dataset.orderId)
          .filter(Boolean);
        if (!selectedIds.length) return;
        const nextOrders = getStoredOrders().filter((order) => !selectedIds.includes(order.id || order.creatédAt));
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
