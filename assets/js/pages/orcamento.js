const initBudgetPage = () => {
  const pageRoot = document.querySelector("[data-budget-page]");
  if (!pageRoot || pageRoot.dataset.budgetInitialized === "true") return;
  pageRoot.dataset.budgetInitialized = "true";
  const hydration = window.DokePageHydration?.create({
    page: 'orcamento',
    root: pageRoot,
    errorSelectors: ['[data-state-error]'],
    pendingSelectors: ['[data-budget-hydration-pending]'],
    readySelectors: ['[data-budget-hydration-ready]'],
    skeletonMode: 'never',
    waitFor: ['dom', 'auth', 'service-context'],
    minDuration: 0,
    maxDuration: 8000,
    hasItems: () => true
  }) || null;
  hydration?.start();
  hydration?.mark('dom');
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
  const formatTitleCase = (value) => String(value || "").replace(/\b\w/g, (c) => c.toUpperCase());
  const normalizeBudgetLabel = (value) => String(value || "").replace(/-/g, " ").trim();
  const slugify = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let selectedService = null;
  let provider = pageRoot.dataset.budgetProvider || query.get("pro") || "";
  const explicitServiceLabel = normalizeBudgetLabel(pageRoot.dataset.budgetService || query.get("service") || query.get("servico") || "");
  let service = explicitServiceLabel || "";
  let professionalId = requestedProfessionalId;
  let professionalProfileId = "";

  const createMetricToken = (prefix) => {
    let token = "";
    try {
      token = window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    } catch {
      token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }
    return `${prefix}:${token}`;
  };

  const quoteMetricStorageKey = `doke.quote-funnel:${serviceId || "unknown"}`;
  const readQuoteMetricState = () => {
    try {
      const current = JSON.parse(window.sessionStorage.getItem(quoteMetricStorageKey) || "null");
      if (current?.sessionKey && current?.visitorKey && current?.submitted !== true) return current;
    } catch {
      // sessionStorage can be unavailable; an in-memory session still records this visit.
    }
    const created = {
      sessionKey: createMetricToken("quote-session"),
      visitorKey: createMetricToken("quote-visitor"),
      submitted: false
    };
    try { window.sessionStorage.setItem(quoteMetricStorageKey, JSON.stringify(created)); } catch {}
    return created;
  };
  const quoteMetricState = readQuoteMetricState();
  let quoteMetricStarted = false;
  let quoteMetricCompleted = false;
  let quoteMetricProgressTimer = 0;
  let quoteMetricLastProgress = "";

  const getQuoteMetricsService = () => window.Doke?.services?.quoteTemplateMetrics || null;
  const answerHasValue = (answer) => Array.isArray(answer)
    ? answer.length > 0
    : String(answer ?? "").trim().length > 0;
  const getQuoteProgress = () => {
    const answered = collectCustomAnswers().filter((item) => answerHasValue(item.answer));
    const last = answered[answered.length - 1] || null;
    return {
      answeredQuestionCount: answered.length,
      lastQuestionId: last?.questionId || "",
      lastQuestionLabel: last?.questionSnapshot?.label || ""
    };
  };
  const quoteMetricEventKey = (type, suffix = "") => {
    const normalizedSuffix = String(suffix || "").replace(/[^a-z0-9:_-]+/gi, "-").slice(0, 120);
    return `${quoteMetricState.sessionKey}:${type}${normalizedSuffix ? `:${normalizedSuffix}` : ""}`.slice(0, 220);
  };
  const recordQuoteMetric = (eventType, detail = {}) => {
    const metrics = getQuoteMetricsService();
    if (!metrics?.recordFunnelEvent || !selectedService) return Promise.resolve({ recorded: false, reason: "metrics-unavailable" });
    return metrics.recordFunnelEvent({
      eventType,
      serviceId: selectedService.remoteId || selectedService.remote_id || selectedService.id || serviceId,
      serviceExternalId: selectedService.id || serviceId,
      sessionKey: quoteMetricState.sessionKey,
      visitorKey: quoteMetricState.visitorKey,
      eventKey: detail.eventKey || quoteMetricEventKey(eventType),
      stepIndex: detail.stepIndex || 0,
      answeredQuestionCount: detail.answeredQuestionCount || 0,
      lastQuestionId: detail.lastQuestionId || "",
      lastQuestionLabel: detail.lastQuestionLabel || "",
      orderId: detail.orderId || "",
      orderExternalId: detail.orderExternalId || ""
    }).catch((error) => {
      window.console?.warn?.("[Doke quote metrics] Não foi possível registrar o funil do formulário.", error);
      return { recorded: false, reason: "metric-error" };
    });
  };
  const recordQuoteStarted = (stepIndex = 0) => {
    if (quoteMetricStarted) return;
    quoteMetricStarted = true;
    const progress = getQuoteProgress();
    recordQuoteMetric("started", {
      ...progress,
      stepIndex,
      eventKey: quoteMetricEventKey("started")
    });
  };
  const recordQuoteProgress = (stepIndex) => {
    recordQuoteStarted(stepIndex);
    const progress = getQuoteProgress();
    const signature = `${stepIndex}:${progress.answeredQuestionCount}:${progress.lastQuestionId}`;
    if (signature === quoteMetricLastProgress) return;
    quoteMetricLastProgress = signature;
    recordQuoteMetric("progress", {
      ...progress,
      stepIndex,
      eventKey: quoteMetricEventKey("progress", signature)
    });
  };
  const scheduleQuoteProgress = (stepIndex) => {
    window.clearTimeout(quoteMetricProgressTimer);
    quoteMetricProgressTimer = window.setTimeout(() => recordQuoteProgress(stepIndex), 650);
  };
  const recordQuoteCompleted = (stepIndex) => {
    if (quoteMetricCompleted) return;
    quoteMetricCompleted = true;
    const progress = getQuoteProgress();
    recordQuoteMetric("completed", {
      ...progress,
      stepIndex,
      eventKey: quoteMetricEventKey("completed")
    });
  };
  const recordQuoteSubmitted = (order) => {
    const progress = getQuoteProgress();
    quoteMetricState.submitted = true;
    try { window.sessionStorage.removeItem(quoteMetricStorageKey); } catch {}
    return recordQuoteMetric("submitted", {
      ...progress,
      stepIndex: 2,
      orderId: order?.remoteId || "",
      orderExternalId: order?.id || "",
      eventKey: quoteMetricEventKey("submitted")
    });
  };

  const syncBudgetContext = () => {
    pageRoot.querySelectorAll("[data-budget-provider]").forEach((node) => {
      node.textContent = provider || "o profissional selecionado";
    });

    pageRoot.querySelectorAll("[data-budget-service]").forEach((node) => {
      node.textContent = service ? formatTitleCase(service) : "o serviço selecionado";
    });
  };

  const getServiceImages = (serviceItem) => {
    if (!serviceItem) return [];
    const images = Array.isArray(serviceItem.images) ? serviceItem.images.filter(Boolean) : [];
    if (!images.length && serviceItem.image) images.push(serviceItem.image);
    return images;
  };

  const getSchedule = (serviceItem) => {
    return Array.isArray(serviceItem?.availabilitySchedule)
      ? serviceItem.availabilitySchedule.filter((item) => item && item.day && item.start && item.end)
      : [];
  };

  const renderServiceContext = (serviceItem) => {
    const context = pageRoot.querySelector("[data-budget-service-context]");
    if (!context || !serviceItem) return;

    const image = context.querySelector("[data-budget-context-image]");
    const fallback = context.querySelector("[data-budget-context-fallback]");
    const title = context.querySelector("[data-budget-context-title]");
    const providerNode = context.querySelector("[data-budget-context-provider]");
    const price = context.querySelector("[data-budget-context-price]");
    const region = context.querySelector("[data-budget-context-region]");
    const schedule = context.querySelector("[data-budget-context-schedule]");
    const detailLink = context.querySelector("[data-budget-context-detail]");
    const images = getServiceImages(serviceItem);

    if (image) {
      image.hidden = !images[0];
      if (images[0]) {
        image.src = images[0];
        image.alt = serviceItem.title || "Imagem do serviço";
      } else {
        image.removeAttribute("src");
      }
    }
    if (fallback) {
      fallback.hidden = Boolean(images[0]);
      fallback.textContent = serviceItem.providerInitials || "DK";
    }
    if (title) title.textContent = serviceItem.title || serviceItem.category || "Serviço selecionado";
    if (providerNode) providerNode.textContent = `Por ${serviceItem.providerName || "Profissional Doke"}`;
    if (price) price.textContent = serviceItem.priceLabel || "Sob orçamento";
    if (region) region.textContent = serviceItem.location || serviceItem.serviceRegion || "Região a confirmar";
    if (detailLink) detailLink.href = `detalhe-anuncio.html?id=${encodeURIComponent(serviceItem.id || serviceId)}`;

    if (schedule) {
      const entries = getSchedule(serviceItem).slice(0, 3);
      schedule.textContent = "";
      entries.forEach((item) => {
        const chip = document.createElement("span");
        chip.textContent = `${item.label || item.day} ${item.start}–${item.end}`;
        schedule.appendChild(chip);
      });
      schedule.hidden = !entries.length;
    }

    const exitLink = pageRoot.querySelector("[data-step-exit]");
    if (exitLink) exitLink.href = `detalhe-anuncio.html?id=${encodeURIComponent(serviceItem.id || serviceId)}`;
  };

  const normalizeQuoteQuestionType = (value) => {
    const type = String(value || "short_text").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const aliases = {
      text: "short_text",
      short: "short_text",
      textarea: "long_text",
      long: "long_text",
      select: "single_choice",
      radio: "single_choice",
      multiselect: "multiple_choice",
      checkbox: "multiple_choice",
      boolean: "yes_no"
    };
    return aliases[type] || type;
  };

  const getQuoteQuestions = (serviceItem) => {
    const quoteMode = String(serviceItem?.quoteMode || "default").trim().toLowerCase();
    if (quoteMode !== "custom") return [];
    const template = serviceItem?.quoteTemplate || serviceItem?.budgetTemplate || {};
    const candidates = serviceItem?.quoteQuestions
      || serviceItem?.budgetQuestions
      || template.questions
      || [];
    if (!Array.isArray(candidates)) return [];
    return candidates.slice(0, 10).map((question, index) => {
      const item = question && typeof question === "object" ? question : { label: String(question || "") };
      const label = String(item.label || item.question || item.title || "").trim().slice(0, 120);
      const id = slugify(item.id || item.key || label || `pergunta-${index + 1}`) || `pergunta-${index + 1}`;
      const normalizedType = normalizeQuoteQuestionType(item.type);
      const options = Array.isArray(item.options)
        ? item.options.slice(0, 5).map((option) => {
            if (option && typeof option === "object") {
              return {
                value: String(option.value || option.label || "").trim().slice(0, 80),
                label: String(option.label || option.value || "").trim().slice(0, 80)
              };
            }
            const value = String(option || "").trim().slice(0, 80);
            return { value, label: value };
          }).filter((option) => option.value)
        : [];
      const resolvedType = ["single_choice", "multiple_choice"].includes(normalizedType) && options.length === 0
        ? "short_text"
        : normalizedType;
      const requestedMaxLength = Number(item.maxLength || item.max_length || item.validation?.maxLength);
      const defaultMaxLength = resolvedType === "long_text" ? 1000 : 180;
      const maxLength = Number.isFinite(requestedMaxLength)
        ? Math.min(1000, Math.max(1, requestedMaxLength))
        : defaultMaxLength;
      return {
        id,
        type: resolvedType,
        label,
        helpText: String(item.helpText || item.help_text || item.description || "").trim().slice(0, 180),
        required: item.required === true,
        position: Number.isFinite(Number(item.position)) ? Number(item.position) : index,
        options,
        min: item.min ?? item.validation?.min ?? null,
        max: item.max ?? item.validation?.max ?? null,
        maxLength
      };
    }).filter((question) => question.label).sort((a, b) => a.position - b.position);
  };

  const appendQuestionCopy = (container, question) => {
    const label = document.createElement(container.tagName === "FIELDSET" ? "legend" : "span");
    label.className = "budget-custom-question__label";
    label.textContent = question.required ? `${question.label} *` : question.label;
    container.appendChild(label);
    if (question.helpText) {
      const help = document.createElement("small");
      help.className = "budget-custom-question__help";
      help.textContent = question.helpText;
      container.appendChild(help);
    }
  };

  const renderQuoteQuestion = (question, index) => {
    const inputName = `quote_question_${question.id || index + 1}`;
    const choiceType = ["single_choice", "multiple_choice", "yes_no"].includes(question.type);
    const wrapper = document.createElement(choiceType ? "fieldset" : "label");
    wrapper.className = `budget-custom-question budget-custom-question--${question.type}`;
    wrapper.dataset.budgetCustomQuestion = "";
    wrapper.dataset.questionId = question.id;
    wrapper.dataset.questionType = question.type;
    wrapper.dataset.questionLabel = question.label;
    wrapper.dataset.questionRequired = String(question.required);
    wrapper.dataset.questionPosition = String(question.position);
    wrapper.dataset.questionHelpText = question.helpText || "";
    wrapper.dataset.questionOptions = JSON.stringify(question.options || []);
    appendQuestionCopy(wrapper, question);

    if (choiceType) {
      const choices = document.createElement("div");
      choices.className = "budget-custom-question__choices";
      const options = question.type === "yes_no"
        ? [{ value: "Sim", label: "Sim" }, { value: "Não", label: "Não" }]
        : question.options;
      options.forEach((option, optionIndex) => {
        const optionLabel = document.createElement("label");
        optionLabel.className = "budget-custom-question__option";
        const input = document.createElement("input");
        input.className = "doke-checkbox";
        input.type = question.type === "multiple_choice" ? "checkbox" : "radio";
        input.name = inputName;
        input.value = option.value;
        if (question.required && question.type !== "multiple_choice" && optionIndex === 0) input.required = true;
        const text = document.createElement("span");
        text.textContent = option.label;
        optionLabel.append(input, text);
        choices.appendChild(optionLabel);
      });
      wrapper.appendChild(choices);
      return wrapper;
    }

    const input = document.createElement(question.type === "long_text" ? "textarea" : "input");
    input.name = inputName;
    input.required = question.required;
    input.className = question.type === "long_text" ? "doke-textarea" : "doke-input";
    if (question.type === "number") {
      input.type = "number";
      if (question.min != null) input.min = String(question.min);
      if (question.max != null) input.max = String(question.max);
    } else if (question.type === "date") {
      input.type = "date";
    } else if (question.type !== "long_text") {
      input.type = "text";
      input.maxLength = question.maxLength;
    } else {
      input.maxLength = question.maxLength;
      input.rows = 4;
    }
    wrapper.appendChild(input);
    return wrapper;
  };

  const renderCustomQuestions = (serviceItem) => {
    const region = pageRoot.querySelector("[data-budget-custom-questions]");
    const list = pageRoot.querySelector("[data-budget-custom-question-list]");
    if (!region || !list) return [];
    const questions = getQuoteQuestions(serviceItem);
    list.replaceChildren(...questions.map(renderQuoteQuestion));
    region.hidden = questions.length === 0;
    region.dataset.questionCount = String(questions.length);
    return questions;
  };

  const collectCustomAnswers = () => [...form.querySelectorAll("[data-budget-custom-question]")].map((wrapper) => {
    const controls = [...wrapper.querySelectorAll("input, textarea, select")];
    const questionType = wrapper.dataset.questionType || "short_text";
    let answer = "";
    if (questionType === "multiple_choice") {
      answer = controls.filter((control) => control.checked).map((control) => control.value);
    } else if (["single_choice", "yes_no"].includes(questionType)) {
      answer = controls.find((control) => control.checked)?.value || "";
    } else {
      answer = controls[0]?.value?.trim?.() || controls[0]?.value || "";
    }
    return {
      questionId: wrapper.dataset.questionId || "",
      questionSnapshot: {
        id: wrapper.dataset.questionId || "",
        type: questionType,
        label: wrapper.dataset.questionLabel || "",
        required: wrapper.dataset.questionRequired === "true",
        position: Number(wrapper.dataset.questionPosition || 0),
        helpText: wrapper.dataset.questionHelpText || "",
        options: (() => {
          try {
            return JSON.parse(wrapper.dataset.questionOptions || "[]");
          } catch {
            return [];
          }
        })()
      },
      answer
    };
  });

  const renderCustomAnswersReview = () => {
    const region = pageRoot.querySelector("[data-budget-review-custom-answers]");
    const list = pageRoot.querySelector("[data-budget-review-custom-answer-list]");
    if (!region || !list || !form) return;
    const answered = collectCustomAnswers().filter((item) => Array.isArray(item.answer) ? item.answer.length : String(item.answer || "").trim());
    list.replaceChildren(...answered.map((item) => {
      const row = document.createElement("article");
      row.className = "budget-review-answers__item";
      const label = document.createElement("span");
      label.textContent = item.questionSnapshot.label;
      const value = document.createElement("strong");
      value.textContent = Array.isArray(item.answer) ? item.answer.join(", ") : String(item.answer);
      row.append(label, value);
      return row;
    }));
    region.hidden = answered.length === 0;
  };

  const syncQuoteFormPresentation = (serviceItem) => {
    const quoteMode = String(serviceItem?.quoteMode || "default").trim().toLowerCase();
    pageRoot.dataset.quoteMode = quoteMode;
    const title = pageRoot.querySelector("[data-budget-details-title]");
    const description = pageRoot.querySelector("[data-budget-details-description]");
    const customCopy = pageRoot.querySelector("[data-budget-custom-questions-copy]");
    if (quoteMode === "custom") {
      if (title) title.textContent = "Responda ao profissional";
      if (description) description.textContent = "Descreva o que precisa e responda às perguntas criadas para este anúncio.";
      if (customCopy) customCopy.textContent = "Somente as perguntas definidas pelo profissional aparecem aqui.";
    } else {
      if (title) title.textContent = "Conte o que você precisa";
      if (description) description.textContent = "Descreva o problema ou resultado esperado. A Doke solicitará apenas prazo, endereço e anexos opcionais.";
      if (customCopy) customCopy.textContent = "Responda às perguntas configuradas para este anúncio.";
    }
  };

  const prefillServiceFields = (serviceItem) => {
    if (!form || !serviceItem) return;
    const categoryValue = serviceItem.category || serviceItem.catégory || serviceItem.title || "";
    const categoryInput = form.querySelector('[data-budget-service-category]');
    if (categoryInput) categoryInput.value = categoryValue;
    syncQuoteFormPresentation(serviceItem);
  };

  const hydrateServiceContext = () => {
    if (!serviceId) return Promise.reject(new Error("Serviço não informado. Abra o anúncio e solicite o orçamento novamente."));
    if (!window.Doke?.services?.services?.getById) return Promise.reject(new Error("Serviço de anúncios indisponível."));

    return window.Doke.services.services.getById(serviceId).then((serviceItem) => {
      if (!serviceItem) throw new Error("Este anúncio não foi encontrado.");
      if (String(serviceItem.status || "draft").toLowerCase() !== "active") {
        throw new Error("Este anúncio não está aceitando novos pedidos.");
      }
      const moderationStatus = String(serviceItem.moderationStatus || "published").toLowerCase();
      const hasApprovedVersion = Boolean(serviceItem.approvedVersionId || serviceItem.approved_version_id);
      const approvedContentRemainsPublic = moderationStatus === "changes_required" && hasApprovedVersion;
      if (!["published", "changes_pending_review"].includes(moderationStatus) && !approvedContentRemainsPublic) {
        throw new Error("Este anúncio ainda não foi aprovado para receber pedidos.");
      }
      if (String(serviceItem.quoteMode || "default").toLowerCase() === "disabled") {
        throw new Error("Este profissional recebe somente conversas neste anúncio. Volte ao anúncio e use o botão Conversar.");
      }

      selectedService = serviceItem;
      provider = serviceItem.providerName || serviceItem.professionalName || "Profissional Doke";
      service = normalizeBudgetLabel(serviceItem.title || serviceItem.detailTitle || serviceItem.category || "Serviço selecionado");
      professionalId = serviceItem.professionalId || serviceItem.providerId || serviceItem.ownerId || professionalId;
      professionalProfileId = serviceItem.professionalProfileId || serviceItem.profileId || "";
      syncBudgetContext();
      renderServiceContext(serviceItem);
      prefillServiceFields(serviceItem);
      renderCustomQuestions(serviceItem);
      document.dispatchEvent(new CustomEvent("doke:budget-service-context", {
        detail: {
          service: serviceItem,
          provider,
          professionalId,
          professionalProfileId
        }
      }));
      return serviceItem;
    });
  };

  const showSuccessScreen = (order) => {
    if (!successScreen || !order) {
      if (typeof window.DokeNavigate === 'function') {
        window.DokeNavigate(`${successUrl}?order=${encodeURIComponent(order?.id || "")}`, { source: 'budget-success' });
      }
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
    const prevButton = form.querySelector("[data-step-prev]");
    const nextButton = form.querySelector("[data-step-next]");
    const submitButton = form.querySelector("[data-step-submit]");
    const exitButton = form.querySelector("[data-step-exit]");
    const actions = form.querySelector(".become-pro-actions");
    let currentStep = 0;
    const addressStepIndex = panels.findIndex((panel) => panel.contains(addressRequiredInput));
    let savedLocation = null;
    let lockedScrollY = 0;

    const catégoryInput = form.querySelector('[data-budget-service-category]');
    const applyServiceCategory = () => {
      if (!service || !(selectedService || serviceId || explicitServiceLabel)) return;
      const normalized = formatTitleCase(selectedService?.category || selectedService?.catégory || service);
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
      recordQuoteStarted(currentStep);
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

    const getSelectedAttachmentFiles = () => [...(filesInput?.files || [])];

    const validateSelectedAttachments = (files) => {
      const repository = window.Doke?.repositories?.attachments;
      if (!files?.length || !repository?.validateFiles) return files || [];
      return repository.validateFiles(files, { maxFiles: 8 });
    };

    const validatéStep = (index) => {
      const panel = panels[index];
      if (!panel) return true;
      if (index === addressStepIndex && (!savedLocation || !addressRequiredInput?.value)) {
        openAddressModal();
        return false;
      }
      const requiredMultipleChoice = [...panel.querySelectorAll('[data-budget-custom-question][data-question-required="true"][data-question-type="multiple_choice"]')];
      for (const question of requiredMultipleChoice) {
        const inputs = [...question.querySelectorAll('input[type="checkbox"]')];
        const firstInput = inputs[0];
        if (!inputs.some((input) => input.checked)) {
          firstInput?.setCustomValidity("Selecione pelo menos uma opção.");
          firstInput?.reportValidity();
          firstInput?.focus({ preventScroll: true });
          return false;
        }
        firstInput?.setCustomValidity("");
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
      if (prevButton) prevButton.hidden = currentStep === 0;
      if (exitButton) exitButton.hidden = currentStep !== 0;
      actions?.classList.toggle("has-back-action", currentStep > 0);
      if (nextButton) nextButton.hidden = currentStep === panels.length - 1;
      if (submitButton) submitButton.hidden = currentStep !== panels.length - 1;
      if (currentStep > 0) recordQuoteProgress(currentStep);
      if (currentStep === panels.length - 1) {
        renderCustomAnswersReview();
        recordQuoteCompleted(currentStep);
      }
      const scrollTarget = pageRoot.closest(".detail-budget-modal__dialog") || pageRoot;
      if ("scrollTo" in scrollTarget) {
        scrollTarget.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    syncCount();
    detailsInput?.addEventListener("input", () => {
      syncCount();
      recordQuoteStarted(currentStep);
      scheduleQuoteProgress(currentStep);
    });
    filesInput?.addEventListener("change", () => {
      syncFiles();
      recordQuoteStarted(currentStep);
      scheduleQuoteProgress(currentStep);
    });
    form.addEventListener("input", (event) => {
      if (!event.target.closest?.("[data-budget-custom-question]")) return;
      recordQuoteStarted(currentStep);
      scheduleQuoteProgress(currentStep);
    });
    form.addEventListener("change", (event) => {
      if (!event.target.closest?.("[data-budget-custom-question]")) return;
      recordQuoteStarted(currentStep);
      scheduleQuoteProgress(currentStep);
    });

    choiceGroups.forEach((group) => {
      const input = group.parentElement?.querySelector("[data-choice-input]");
      const buttons = [...group.querySelectorAll("[data-choice-value]")];
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          recordQuoteStarted(currentStep);
          buttons.forEach((item) => item.classList.remove("is-active"));
          button.classList.add("is-active");
          if (input) input.value = button.dataset.choiceValue || "";
          scheduleQuoteProgress(currentStep);
        });
      });
    });

    indicators.forEach((indicator, index) => {
      indicator.addEventListener("click", () => {
        if (index <= currentStep || validatéStep(currentStep)) goToStep(index);
      });
    });

    nextButton?.addEventListener("click", () => {
      recordQuoteStarted(currentStep);
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
      const requestCategory = data.get("catégoria") || selectedService?.category || selectedService?.catégory || "";
      const serviceName = selectedService?.title || service || requestCategory;
      const customAnswers = collectCustomAnswers();
      const quoteTemplate = selectedService?.quoteTemplate || selectedService?.budgetTemplate || {};
      const ordersService = window.Doke?.services?.orders;
      const attachmentsRepository = window.Doke?.repositories?.attachments;
      const attachmentFiles = getSelectedAttachmentFiles();
      try {
        validateSelectedAttachments(attachmentFiles);
      } catch (error) {
        form.dataset.submitState = "idle";
        window.DokeToast?.error?.(error?.message || "Revise os anexos selecionados.");
        return;
      }
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
      const preventLoadingDismiss = (cancelEvent) => {
        cancelEvent.preventDefault();
      };
      loadingScreen?.addEventListener("cancel", preventLoadingDismiss);
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        submitButton.textContent = "Enviando...";
      }

      const attachments = [];

      const payload = {
        provider,
        providerName: provider,
        providerInitials: selectedService?.providerInitials || selectedService?.avatar || "DK",
        professionalId: professionalId || selectedService?.professionalId || selectedService?.providerId || "",
        providerId: professionalId || selectedService?.providerId || selectedService?.professionalId || "",
        professionalProfileId: professionalProfileId || selectedService?.professionalProfileId || "",
        serviceId: serviceId || selectedService?.id || "",
        service: serviceName,
        serviceTitle: serviceName,
        title: serviceName,
        serviceImage: getServiceImages(selectedService)[0] || "",
        serviceImages: getServiceImages(selectedService),
        serviceCategory: requestCategory || selectedService?.category || selectedService?.catégory || "",
        servicePriceMode: selectedService?.priceMode || "",
        servicePrice: selectedService?.priceValue ?? selectedService?.price ?? null,
        servicePriceLabel: selectedService?.priceLabel || "Sob orçamento",
        serviceRegion: selectedService?.location || selectedService?.serviceRegion || "",
        serviceAvailabilitySchedule: getSchedule(selectedService),
        serviceIncludedItems: selectedService?.includedItems || "",
        serviceExcludedItems: selectedService?.excludedItems || "",
        serviceMode: selectedService?.serviceMode || "",
        serviceBillingUnit: selectedService?.billingUnit || "",
        serviceSnapshot: {
          id: selectedService?.id || serviceId,
          title: selectedService?.title || serviceName,
          category: requestCategory || selectedService?.category || selectedService?.catégory || "",
          shortDescription: selectedService?.shortDescription || "",
          providerId: professionalId || selectedService?.professionalId || selectedService?.providerId || "",
          professionalProfileId: professionalProfileId || selectedService?.professionalProfileId || "",
          providerName: provider,
          providerInitials: selectedService?.providerInitials || selectedService?.avatar || "DK",
          priceMode: selectedService?.priceMode || selectedService?.priceType || "",
          priceValue: selectedService?.priceValue ?? selectedService?.price ?? null,
          priceLabel: selectedService?.priceLabel || "Sob orçamento",
          billingUnit: selectedService?.billingUnit || "",
          location: selectedService?.location || selectedService?.serviceRegion || "",
          serviceMode: selectedService?.serviceMode || "",
          availabilitySchedule: getSchedule(selectedService),
          includedItems: selectedService?.includedItems || "",
          excludedItems: selectedService?.excludedItems || "",
          image: getServiceImages(selectedService)[0] || "",
          images: getServiceImages(selectedService)
        },
        requestType: "Solicitação de orçamento",
        scope: "Definido pela descrição e pelas respostas do cliente",
        location: summarizeAddress(savedLocation),
        locationTitle: savedLocation?.titulo || "Endereço salvo",
        locationDetails: savedLocation || {},
        property: "Não solicitado",
        urgency: data.get("urgencia") || "Sem pressa",
        desiredDate: data.get("data") || "",
        daté: data.get("data") || "",
        shift: "Flexível",
        budget: selectedService?.priceLabel || "A definir",
        details: data.get("detalhes") || "",
        description: data.get("detalhes") || "",
        triage: {},
        quoteTemplateVersion: quoteTemplate.version || selectedService?.quoteTemplateVersion || null,
        quoteFunnelSessionKey: quoteMetricState.sessionKey,
        quoteTemplateIdentity: `${quoteTemplate.templateKind || "default"}:${quoteTemplate.personalTemplateId || quoteTemplate.templateId || "default"}:${quoteTemplate.source || "default"}`,
        quoteAnswers: customAnswers,
        quoteQuestionsSnapshot: customAnswers.map((item) => item.questionSnapshot),
        area: "",
        attachments,
        status: "pending",
        statusLabel: "Aguardando resposta",
        nextAction: "Acompanhar pedido",
        createdAt,
        creatédAt: createdAt,
        updatedAt: createdAt
      };

      try {
        const latestService = await window.Doke?.services?.services?.getById?.(serviceId);
        if (!latestService || String(latestService.status || "active").toLowerCase() !== "active") {
          throw new Error("Este anúncio não está mais aceitando novos pedidos.");
        }
        let savedOrder = ordersService?.create
          ? await ordersService.create(payload)
          : Object.assign({ id: `order-${Date.now()}` }, payload);

        if (attachmentFiles.length) {
          if (!attachmentsRepository?.uploadOrderFiles) {
            throw new Error("O serviço de anexos não está disponível. Recarregue a página e tente novamente.");
          }
          const uploadedAttachments = await attachmentsRepository.uploadOrderFiles(savedOrder.id, attachmentFiles, { maxFiles: 8 });
          savedOrder = ordersService?.updateAttachments
            ? await ordersService.updateAttachments(savedOrder.id, uploadedAttachments)
            : Object.assign({}, savedOrder, { attachments: uploadedAttachments });
        }

        recordQuoteSubmitted(savedOrder);
        loadingScreen?.removeEventListener("cancel", preventLoadingDismiss);
        safeSetStorage(window.sessionStorage, storageKey, savedOrder);
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
        window.DokeDialog.alert(error?.message || "Não foi possível enviar o orçamento agora.");
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

  const accountAccess = window.Doke?.services?.accountAccess;
  if (!accountAccess?.guardPage) {
    hydration?.error(new Error('Serviço de autenticação indisponível.'), { source: 'budget-account-access' });
    return;
  }

  accountAccess.guardPage({
    name: 'budget-account-access',
    source: 'orcamento.html'
  }).then((access) => {
    if (!access?.allowed) return null;
    hydration?.mark('auth');
    return hydrateServiceContext();
  }).then(() => {
    hydration?.mark('service-context');
  }).catch((error) => {
    hydration?.error(error, { source: 'budget-hydration' });
  });

};

window.DokeInitBudget = initBudgetPage;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBudgetPage, { once: true });
} else {
  initBudgetPage();
}
