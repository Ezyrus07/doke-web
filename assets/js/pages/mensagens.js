(() => {
  const conversations = {};

  const getConversationInitials = (name) => String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "DK";

  const escapeHtml = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const getCurrentUser = () => {
    try {
      const sessionUser = window.Doke?.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.();
      if (sessionUser) return sessionUser;
    } catch (error) {
      // fallback below
    }

    try {
      const raw = window.localStorage.getItem("doke.auth.session.v1");
      const session = raw ? JSON.parse(raw) : null;
      return session?.user || null;
    } catch (error) {
      return null;
    }
  };

  const getCurrentUserId = () => getCurrentUser()?.id || "";
  const getCurrentUserRole = () => getCurrentUser()?.role || "client";
  const isProfessionalUser = (user = getCurrentUser()) => Boolean(user?.role === "professional");
  const isDemoProfessionalUser = (user = getCurrentUser()) => Boolean(isProfessionalUser(user) && String(user?.id) === "user_profissional_demo");
  const isProfessionalConversationView = (conversation) => {
    const user = getCurrentUser();
    if (!isProfessionalUser(user)) return false;
    const professionalId = String(conversation?.professionalId || conversation?.order?.professionalId || conversation?.order?.providerId || "");
    if (professionalId && professionalId === String(user.id)) return true;
    return isDemoProfessionalUser(user) && Boolean(conversation?.orderId || conversation?.order?.id);
  };
  const canUseChargeAction = (conversation) => Boolean(isProfessionalConversationView(conversation));

  const getChargeCardPresentation = (conversation, message) => {
    const professionalView = isProfessionalConversationView(conversation);
    const ownerView = professionalView && message?.mine === true;
    const orderStatus = getOrderStatus(conversation);
    const reviewed = message?.reviewed === true;
    const completed = reviewed || message?.completed === true || orderStatus === 'completed';
    const paid = completed || message?.paid === true || orderStatus === 'in_progress';

    if (ownerView) {
      if (reviewed) {
        return {
          label: 'Cobrança concluída',
          status: 'Avaliação recebida',
          state: 'reviewed',
          kicker: 'Atendimento avaliado',
          text: message.text || 'O cliente concluiu o fluxo e registrou a avaliação do atendimento.',
          details: ['Recebimento pela Doke', message.installments || 'À vista'],
          note: 'Fluxo encerrado com avaliação registrada.',
          actionHtml: '<span class="message-bubble__charge-meta">Concluído</span>',
          passive: true
        };
      }

      if (completed) {
        return {
          label: 'Cobrança concluída',
          status: 'Aguardando avaliação',
          state: 'completed',
          kicker: 'Atendimento finalizado',
          text: message.text || 'O pedido foi finalizado e o cliente ainda pode avaliar o atendimento.',
          details: ['Recebimento pela Doke', message.installments || 'À vista'],
          note: 'Pedido encerrado. A avaliação do cliente pode chegar a qualquer momento.',
          actionHtml: '<span class="message-bubble__charge-meta">Pedido finalizado</span>',
          passive: true
        };
      }

      if (paid) {
        return {
          label: 'Cobrança aprovada',
          status: 'Pagamento confirmado',
          state: 'paid',
          kicker: 'Atendimento liberado',
          text: message.text || 'O cliente confirmou o pagamento. Agora combine a execução e os próximos passos pelo chat.',
          details: ['Recebimento pela Doke', message.installments || 'À vista'],
          note: 'Pagamento confirmado. Siga com o atendimento.',
          actionHtml: '<span class="message-bubble__charge-meta">Siga com o atendimento</span>',
          passive: true
        };
      }

      return {
        label: 'Cobrança enviada ao cliente',
        status: 'Aguardando cliente',
        state: 'pending',
        kicker: 'Proposta enviada',
        text: message.text || 'Sua proposta foi enviada. O cliente precisa aprovar e pagar para liberar o atendimento.',
        details: ['Recebimento pela Doke', message.installments || 'À vista'],
        note: 'Aguardando aprovação e pagamento do cliente.',
        actionHtml: '<span class="message-bubble__charge-meta">Cliente ainda não pagou</span>',
        passive: true
      };
    }

    if (reviewed) {
      return {
        label: 'Cobrança enviada',
        status: 'Atendimento avaliado',
        state: 'reviewed',
        kicker: 'Proposta aprovada',
        text: message.text || 'O atendimento foi concluído e avaliado.',
        details: ['Pagamento seguro pela Doke', message.installments || 'À vista'],
        note: 'Fluxo encerrado com avaliação registrada.',
        actionHtml: '',
        passive: true
      };
    }

    if (completed) {
      return {
        label: 'Cobrança enviada',
        status: 'Aguardando avaliação',
        state: 'completed',
        kicker: 'Proposta para aprovação',
        text: message.text || 'O atendimento foi concluído. Você ainda pode avaliar por aqui.',
        details: ['Pagamento seguro pela Doke', message.installments || 'À vista'],
        note: 'Avalie para concluir o atendimento.',
        actionHtml: '<button class="message-bubble__charge-pay is-done doke-btn doke-btn--soft" type="button" data-message-review>Avaliar</button>',
        passive: false
      };
    }

    if (paid) {
      return {
        label: 'Cobrança enviada',
        status: 'Pagamento confirmado',
        state: 'paid',
        kicker: 'Proposta para aprovação',
        text: message.text || 'Pagamento confirmado. Agora você pode finalizar o pedido por aqui.',
        details: ['Pagamento seguro pela Doke', message.installments || 'À vista'],
        note: 'Confirme para encerrar o atendimento.',
        actionHtml: '<button class="message-bubble__charge-pay is-complete doke-btn doke-btn--success" type="button" data-message-complete>Finalizar pedido</button>',
        passive: false
      };
    }

    return {
      label: 'Cobrança enviada',
      status: 'Aguardando pagamento',
      state: 'pending',
      kicker: 'Proposta para aprovação',
      text: message.text || 'Proposta pronta para aprovação. Você pode pagar por aqui para confirmar o atendimento.',
      details: ['Pagamento seguro pela Doke', message.installments || 'À vista'],
      note: 'Confirme para liberar o atendimento.',
      actionHtml: '<button class="message-bubble__charge-pay doke-btn doke-btn--primary" type="button" data-message-pay>Pagar agora</button>',
      passive: false
    };
  };
  const syncChargeActionVisibility = (conversation) => {
    const allowed = canUseChargeAction(conversation);
    const button = document.querySelector("[data-messages-charge]");
    if (!button) return false;
    button.hidden = !allowed;
    button.setAttribute("aria-hidden", allowed ? "false" : "true");
    if (!allowed) button.disabled = true;
    return allowed;
  };

  const normalizeLocalMessage = (message, conversation) => {
    const currentUserId = getCurrentUserId();
    const mine = message?.mine === true || Boolean(currentUserId && message?.senderId && String(message.senderId) === String(currentUserId));
    return {
      id: message?.id || "",
      author: mine ? "Você" : message?.author || conversation?.name || "Doke",
      time: message?.time || "agora",
      text: message?.text || message?.body || "",
      mine,
      type: message?.type || "text",
      src: message?.src || "",
      duration: message?.duration || "",
      speed: message?.speed || "1x",
      amount: message?.amount || "",
      installments: message?.installments || "",
      paid: message?.paid === true,
      completed: message?.completed === true,
      reviewed: message?.reviewed === true,
      replyTo: message?.replyTo || null
    };
  };

  const mapLocalConversation = (conversation) => {
    const order = conversation?.order || {};
    const hasOrderContext = Boolean(conversation?.orderId || order.id);
    return {
      avatar: conversation?.avatar || conversation?.peerInitials || "",
      name: conversation?.name || conversation?.peerName || "Profissional Doke",
      peerRole: conversation?.peerRole || "professional",
      lastSeen: conversation?.lastSeen || "Conversa do pedido",
      unread: Number(conversation?.unread || conversation?.unreadCount || 0),
      group: hasOrderContext ? "orders" : conversation?.group || "contacts",
      orderId: conversation?.orderId || order.id || "",
      serviceId: conversation?.serviceId || order.serviceId || "",
      order: {
        id: conversation?.orderId || order.id || "",
        clientId: conversation?.clientId || order.clientId || "",
        clientName: conversation?.clientName || order.clientName || "Cliente Doke",
        professionalId: conversation?.professionalId || order.professionalId || order.providerId || "",
        professionalName: conversation?.professionalName || order.providerName || order.provider || "Profissional Doke",
        title: order.title || order.serviceTitle || conversation?.orderTitle || "Pedido de serviço",
        status: order.status || conversation?.status || "",
        statusLabel: order.statusLabel || conversation?.statusLabel || "Aguardando resposta",
        budget: order.budget || conversation?.budget || "A definir",
        category: order.category || conversation?.category || "Serviço",
        location: order.location || conversation?.location || ""
      },
      messages: (conversation?.messages || []).map((message) => normalizeLocalMessage(message, conversation))
    };
  };

  const getStatusToneClass = (label) => {
    const normalized = String(label || "").toLowerCase();
    if (normalized.includes("conclu") || normalized.includes("final")) return "message-item__deal-status--done";
    if (normalized.includes("cancel") || normalized.includes("recus")) return "message-item__deal-status--done";
    return "message-item__deal-status--pending";
  };

  const ORDER_UNLOCKED_STATUSES = new Set(["conversation", "accepted", "responded", "quoted", "in_progress", "completed"]);

  const getOrderStatus = (conversation) => {
    const explicit = String(conversation?.order?.status || conversation?.status || "").trim();
    if (explicit) return explicit;
    const label = String(conversation?.order?.statusLabel || conversation?.statusLabel || "").toLowerCase();
    if (label.includes("aceito") || label.includes("liberad")) return "conversation";
    if (label.includes("recus")) return "cancelled";
    return "pending";
  };
  const isOrderConversationUnlocked = (conversation) => ORDER_UNLOCKED_STATUSES.has(getOrderStatus(conversation));
  const isOrderPendingAcceptance = (conversation) => getOrderStatus(conversation) === "pending";
  const isOrderDeclined = (conversation) => getOrderStatus(conversation) === "cancelled";

  const getMessagePreview = (message) => {
    if (!message) return "";
    if (message.type === "audio") return "Áudio enviado";
    if (message.type === "image") return "Imagem enviada";
    if (message.type === "charge") return `Cobrança ${message.amount}`;
    return String(message.text || "");
  };

  const renderLocalConversationItem = (id, conversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const statusLabel = conversation.order?.statusLabel || "Aguardando resposta";
    return `
      <button class="message-item doke-message-card doke-card doke-selectable-card" type="button" data-message-id="${escapeHtml(id)}" data-domain-card="message" data-local-conversation="true">
        <span class="message-item__avatar doke-avatar" aria-hidden="true">${escapeHtml(conversation.avatar || getConversationInitials(conversation.name))}</span>
        <span class="message-item__content">
          <span class="message-item__line"><strong>${escapeHtml(conversation.name)}</strong><span class="message-item__time">${escapeHtml(lastMessage?.time || "agora")}</span></span>
          <span class="message-item__deal-status doke-badge ${getStatusToneClass(statusLabel)}">${escapeHtml(statusLabel)}</span>
          <span class="message-item__preview">${escapeHtml(getMessagePreview(lastMessage) || "Sem mensagens ainda.")}</span>
          <span class="message-item__status">${escapeHtml(conversation.lastSeen || "Conversa do pedido")}</span>
        </span>
        <span class="message-item__badge doke-badge" ${conversation.unread ? "" : "hidden"}>${escapeHtml(conversation.unread || "")}</span>
      </button>
    `;
  };

  const getConversationLists = (root) => ({
    ordersList: root.querySelector("[data-messages-orders-list]") || root.querySelector(".messages-list"),
    contactsList: root.querySelector("[data-messages-contacts-list]") || root.querySelector(".messages-list")
  });

  const isRenderedList = (list) => {
    if (!list || !list.isConnected) return false;
    const listStyle = window.getComputedStyle?.(list);
    if (listStyle?.display === "none" || listStyle?.visibility === "hidden") return false;
    const block = list.closest(".messages-block");
    const blockStyle = block ? window.getComputedStyle?.(block) : null;
    if (blockStyle?.display === "none" || blockStyle?.visibility === "hidden") return false;
    return true;
  };

  const getConversationTargetList = (root, conversation) => {
    const { ordersList, contactsList } = getConversationLists(root);
    if (conversation?.group === "orders" && isRenderedList(ordersList)) return ordersList;
    return contactsList || ordersList;
  };

  const ensureLocalConversationCard = (root, conversationId, conversation) => {
    if (!root || !conversationId || !conversation) return false;
    const targetList = getConversationTargetList(root, conversation);
    if (!targetList) return false;

    const existingCard = Array.from(root.querySelectorAll(".message-item[data-message-id]")).find((item) => item.dataset.messageId === String(conversationId));
    if (existingCard) {
      if (existingCard.parentElement !== targetList) {
        targetList.prepend(existingCard);
        return true;
      }
      return false;
    }

    targetList.insertAdjacentHTML("afterbegin", renderLocalConversationItem(conversationId, conversation));
    return true;
  };

  const hydrateLocalConversations = (root) => {
    const service = window.Doke?.services?.messages;
    const { ordersList } = getConversationLists(root);
    if (!service?.listLocalConversations || !ordersList) return false;

    const localConversations = service.listLocalConversations({ currentUser: true }) || [];
    localConversations.slice().reverse().forEach((conversation) => {
      if (!conversation?.id) return;
      const conversationId = String(conversation.id);
      const mapped = mapLocalConversation(conversation);
      const isOrderConversation = Boolean(mapped.orderId || mapped.order?.id || mapped.group === "orders");
      mapped.group = isOrderConversation ? "orders" : "contacts";
      conversations[conversationId] = Object.assign({}, conversations[conversationId] || {}, mapped);
      ensureLocalConversationCard(root, conversationId, conversations[conversationId]);
    });
    return true;
  };

  const persistConversationMessage = (conversationId, message) => {
    return window.Doke?.services?.messages?.sendMessage?.(conversationId, {
      body: message.text || message.body || "",
      text: message.text || message.body || "",
      type: message.type || "text",
      src: message.src || "",
      duration: message.duration || "",
      speed: message.speed || "1x",
      amount: message.amount || "",
      installments: message.installments || "",
      senderId: message.senderId || getCurrentUserId(),
      mine: message.mine !== false,
      author: message.author || "Você",
      replyTo: message.replyTo || null
    }).catch((error) => console.warn("[DokeMessages:sendMessage]", error));
  };

  const persistConversationState = (conversationId) => {
    const conversation = conversations[conversationId];
    const repository = window.Doke?.repositories?.messages;
    if (!conversation || !repository || typeof repository.save !== "function") return Promise.resolve(null);
    return repository.save(conversation).catch((error) => {
      console.warn("[DokeMessages:saveConversationState]", error);
      return null;
    });
  };

  const syncConversationOrderStatus = (conversation, order) => {
    if (!conversation || !order) return;
    conversation.order = Object.assign({}, conversation.order || {}, order);
    conversation.status = order.status || conversation.status;
    conversation.statusLabel = order.statusLabel || conversation.statusLabel;
    conversation.lastSeen = order.statusLabel || conversation.lastSeen;
  };

  let activeMessagesCleanup = null;

  const clearMessagesRouteState = () => {
    document.body?.classList.remove(
      "messages-thread-is-open",
      "is-messages-header-search-open",
      "messages-chat-is-focused",
      "chat-room-mobile-open",
      "is-media-lightbox-open"
    );
    document.documentElement?.classList.remove(
      "messages-thread-is-open",
      "is-messages-header-search-open",
      "messages-chat-is-focused",
      "chat-room-mobile-open",
      "is-media-lightbox-open"
    );
    document.documentElement?.style.removeProperty("--messages-shell-sidebar-width");
    document.documentElement?.style.removeProperty("--messages-app-inline-size");
    ["overflow", "overflow-x", "overflow-y", "height", "position", "top", "width"].forEach((property) => {
      document.documentElement?.style.removeProperty(property);
      document.body?.style.removeProperty(property);
    });
  };

  const registerMessagesCleanup = (cleanup) => {
    activeMessagesCleanup = cleanup;
  };

  window.DokeCleanupMessages = () => {
    try { activeMessagesCleanup?.(); } catch (error) { console.error("[DokeMessages:cleanup]", error); }
    activeMessagesCleanup = null;
    clearMessagesRouteState();
  };

  document.addEventListener("doke:route-leaving", (event) => {
    if (event.detail?.from === "/mensagens.html") {
      window.DokeCleanupMessages?.(event.detail);
    }
  });
  window.addEventListener("pagehide", clearMessagesRouteState);
  window.addEventListener("beforeunload", clearMessagesRouteState);

  const initMessagesPage = () => {
    const root = document.querySelector("[data-messages-page]");
    if (!root || root.dataset.messagesReady === "true") return;
    root.dataset.messagesReady = "true";

    const drawerController = new AbortController();
    const routeCleanupCallbacks = [() => drawerController.abort(), clearMessagesRouteState];
    const addRouteCleanup = (cleanup) => {
      if (typeof cleanup === "function") routeCleanupCallbacks.push(cleanup);
    };
    registerMessagesCleanup(() => {
      while (routeCleanupCallbacks.length) {
        const cleanup = routeCleanupCallbacks.pop();
        try { cleanup(); } catch (error) { console.error("[DokeMessages:route-cleanup]", error); }
      }
      if (root.isConnected) {
        selectedConversationIds.clear();
        selectedMessageIndexes.clear();
        root.classList.remove("messages-app--thread-open", "is-selection-mode");
        messagesList?.setAttribute("aria-multiselectable", "false");
        delete root.dataset.messagesMode;
      }
    });
    window.DokeHomeDrawer?.create({ signal: drawerController.signal })?.();
    hydrateLocalConversations(root);

    let items = [];
    const refreshConversationItems = () => {
      items = Array.from(root.querySelectorAll(".message-item[data-message-id]"));
      return items;
    };
    const prepareConversationItems = () => {
      refreshConversationItems().forEach((item) => {
        item.classList.add("doke-selectable-card");
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", selectedConversationIds?.has?.(item.dataset.messageId) ? "true" : "false");
        if (!item.hasAttribute("tabindex")) item.tabIndex = 0;
      });
    };
    refreshConversationItems();
    const messagesList = root.querySelector("[data-chat-sidebar-scroll]") || root.querySelector("[data-messages-contacts-list]") || root.querySelector(".messages-list");
    const searchForms = Array.from(root.querySelectorAll("[data-messages-search-form]"));
    const searchInputs = Array.from(root.querySelectorAll("[data-messages-search-input]"));
    const resetSearchButton = root.querySelector("[data-messages-reset-search]");
    const emptyState = root.querySelector("[data-messages-empty]");
    const hydration = window.DokePageHydration?.create({
      page: 'mensagens',
      root,
      emptySelectors: ['[data-messages-empty]'],
      skeletonSelectors: ['[data-messages-hydration-skeleton]'],
      readySelectors: ['[data-messages-hydration-ready]'],
      splashSelectors: ['[data-messages-document-preloader]'],
      skeletonMode: 'route-and-document',
      readyPolicy: 'after-skeleton',
      splashDuration: 520,
      waitFor: ['dom', 'auth', 'local-conversations'],
      minDuration: 0,
      maxDuration: 1500,
      hasItems: () => Array.from(root.querySelectorAll('.message-item[data-message-id]'))
        .some((item) => !item.hidden && item.dataset.deleted !== 'true')
    }) || null;
    hydration?.start();
    const ordersCount = root.querySelector("[data-messages-orders-count]");
    const contactsCount = root.querySelector("[data-messages-contacts-count]");
    const mobileCount = root.querySelector("[data-messages-mobile-count]");
    const threadBody = root.querySelector("[data-thread-body]");
    const threadEmpty = root.querySelector("[data-messages-thread-empty]");
    const threadAvatar = root.querySelector("[data-thread-avatar]");
    const threadName = root.querySelector("[data-thread-name]");
    const threadLastSeen = root.querySelector("[data-thread-last-seen]");
    const composer = root.querySelector("[data-messages-composer]");
    const composerInput = root.querySelector("[data-messages-composer-input]");
    const backButton = root.querySelector("[data-messages-back]");
    const chargeButton = root.querySelector("[data-messages-charge]");
    const threadCallToggle = root.querySelector("[data-thread-call-toggle]");
    const threadVideoCallButton = root.querySelector("[data-thread-video-call]");
    const threadMoreToggle = root.querySelector("[data-thread-more-toggle]");
    const chatFocusToggle = root.querySelector("[data-messages-focus-toggle]");
    const chatFocusLabel = root.querySelector("[data-messages-focus-label]");
    const threadCallMenu = root.querySelector("[data-thread-call-menu]");
    const threadMoreMenu = root.querySelector("[data-thread-more-menu]");
    const searchCloseButtons = Array.from(root.querySelectorAll(".orders-header-search__close"));
    const searchToggleButtons = Array.from(document.querySelectorAll("[data-messages-mobile-search-toggle]"));
    const filterToggles = Array.from(document.querySelectorAll("[data-messages-filter-toggle]"));
    const desktopFilterToggle = root.querySelector("[data-messages-desktop-filter-toggle]");
    const filterButtons = Array.from(root.querySelectorAll("[data-messages-filter]"));
    const archiveToggles = Array.from(root.querySelectorAll("[data-messages-archive-toggle]"));
    const clearFilterButtons = Array.from(root.querySelectorAll("[data-messages-clear-filter]"));
    const activeChips = Array.from(root.querySelectorAll("[data-messages-active-chip]"));
    const headerControls = Array.from(root.querySelectorAll("[data-messages-header-controls], .messages-header-controls"));
    const selectToggles = Array.from(document.querySelectorAll("[data-messages-select-toggle]"));
    const desktopSelectToggle = root.querySelector("[data-messages-desktop-select-toggle]");
    const selectModeButtons = Array.from(root.querySelectorAll("[data-messages-select-mode]"));
    const desktopFiltersPanel = root.querySelector("[data-messages-desktop-filters-panel]");
    const desktopSelectPanel = root.querySelector("[data-messages-desktop-select-panel]");
    const imageInput = root.querySelector("[data-messages-image-input]");
    const imageTool = imageInput?.closest(".messages-composer__tool, .doke-chat-composer__tool");
    const sendButton = composer?.querySelector('button[type="submit"]');
    const emojiButton = root.querySelector("[data-messages-emoji]");
    const audioButton = root.querySelector("[data-messages-audio]");
    const replyPreview = root.querySelector("[data-messages-reply-preview]");
    const replyAuthor = root.querySelector("[data-messages-reply-author]");
    const replyText = root.querySelector("[data-messages-reply-text]");
    const selectionBar = root.querySelector("[data-messages-selection]");
    const selectionCount = root.querySelector("[data-messages-selection-count]");
    const selectionClear = root.querySelector("[data-messages-clear-selection]");
    const selectionDelete = root.querySelector("[data-messages-delete-selected]");
    const selectionForward = root.querySelector("[data-messages-forward-selected]");
    const audioDraft = root.querySelector("[data-messages-audio-draft]");
    const audioTime = root.querySelector("[data-messages-audio-time]");
    const audioCancelButton = root.querySelector("[data-messages-audio-cancel]");
    const imageDraft = root.querySelector("[data-messages-image-draft]");
    const imagePreview = root.querySelector("[data-messages-image-preview]");
    const imageCancelButton = root.querySelector("[data-messages-image-cancel]");
    const lightbox = document.querySelector("[data-image-lightbox]");
    const lightboxImage = document.querySelector("[data-image-lightbox-image]");
    const lightboxClose = document.querySelector("[data-image-lightbox-close]");
    const chargeModal = document.querySelector("[data-charge-modal]");
    const chargeForm = document.querySelector("[data-charge-form]");
    const chargeAmountInput = document.querySelector("[data-charge-amount]");
    const chargeInstallments = document.querySelector("[data-charge-installments]");
    const chargeCancelButtons = document.querySelectorAll("[data-charge-cancel]");
    const completionModal = document.querySelector("[data-message-completion-modal]");
    const completionCloseButtons = Array.from(document.querySelectorAll("[data-message-completion-close]"));
    const completionPanels = Array.from(document.querySelectorAll("[data-message-completion-panel]"));
    const completionConfirm = document.querySelector("[data-message-completion-confirm]");
    const completionSubmit = document.querySelector("[data-message-completion-submit]");
    const completionReview = document.querySelector("[data-message-completion-review]");
    const completionError = document.querySelector("[data-message-completion-error]");
    const completionNote = document.querySelector("[data-message-completion-note]");
    const completionIssueLink = document.querySelector("[data-message-completion-issue]");
    const mobileControls = root.querySelector("[data-messages-mobile-controls]") || root.querySelector(".messages-header-controls:not(.messages-header-controls--desktop)");
    const desktopControls = root.querySelector("[data-messages-desktop-controls]");
    const mobileFiltersPanel = root.querySelector("[data-messages-filters-panel]");
    const mobileSelectPanel = root.querySelector("[data-messages-select-panel]");
    const filterToggleButtons = [...filterToggles, desktopFilterToggle].filter(Boolean);
    const selectToggleButtons = [...selectToggles, desktopSelectToggle].filter(Boolean);
    const filterPanels = [mobileFiltersPanel, desktopFiltersPanel].filter(Boolean);
    const conversationSelectPanels = [mobileSelectPanel, desktopSelectPanel].filter(Boolean);
    const filterSummaryRows = Array.from(root.querySelectorAll("[data-messages-filter-summary]"));
    const cardSelectionCountNodes = Array.from(root.querySelectorAll("[data-messages-card-selection-count]"));
    const archiveConversationButtons = Array.from(root.querySelectorAll("[data-messages-archive-conversations]"));
    const clearSelectedButtons = Array.from(root.querySelectorAll("[data-messages-clear-selected]"));

    let selectedMessageIndexes = new Set();
    let selectedConversationIds = new Set();
    let selectedFilterKeys = new Set();
    let selectionMode = false;
    let pendingCompletion = null;

    messagesList?.setAttribute("role", "listbox");
    messagesList?.setAttribute("aria-multiselectable", "false");

    prepareConversationItems();
    let replyToMessage = null;
    let audioDraftSeconds = 0;
    let audioDraftTimer = null;
    let imageDraftSrc = "";

    const updateComposerDraftState = () => {
      if (!composer) return;
      const hasVisibleDraft = [replyPreview, audioDraft, imageDraft].some((item) => item && !item.hidden);
      composer.classList.toggle("has-composer-draft", hasVisibleDraft);
    };


    const filterLabels = {
      all: "Tudo",
      unread: "Não lidas",
      orders: "Pedidos",
      contacts: "Conversas",
      archived: "Arquivadas"
    };

    const isMobileViewport = () => window.innerWidth <= 760;
    const getActiveFilterKeys = () => Array.from(selectedFilterKeys);
    const getActiveFilterLabels = () => getActiveFilterKeys().map((key) => filterLabels[key]).filter(Boolean);

    const syncComposerPlaceholder = () => {
      if (!composerInput) return;
      composerInput.placeholder = window.innerWidth <= 760 ? "Mensagem..." : "Digite sua mensagem...";
    };

    const getVisibleSearchInput = () => {
      return searchInputs.find((input) => input.offsetParent !== null) || searchInputs[0] || null;
    };

    const pageParams = new URLSearchParams(window.location.search);
    const requestedConversationId = pageParams.get("conversation");
    const requestedOrderId = pageParams.get("order") || pageParams.get("orderId") || pageParams.get("pedido");
    const conversationFromOrder = requestedOrderId
      ? Object.keys(conversations).find((id) => String(conversations[id]?.orderId || conversations[id]?.order?.id || "") === String(requestedOrderId))
      : "";
    const firstListedConversationId = items.find((item) => item.dataset.messageId && conversations[item.dataset.messageId])?.dataset.messageId || "";
    let activeId = requestedConversationId && conversations[requestedConversationId]
      ? requestedConversationId
      : conversationFromOrder || firstListedConversationId || "";

    if (activeId && conversations[activeId]) {
      ensureLocalConversationCard(root, activeId, conversations[activeId]);
      prepareConversationItems();
    }

    const isCompactThreadViewport = () => window.innerWidth <= 1180;
    const isMobileRoomViewport = () => window.innerWidth <= 560;

    const setCompactThreadOpen = (isOpen) => {
      const open = Boolean(isOpen) && isCompactThreadViewport();
      const mobileOpen = open && isMobileRoomViewport();
      root.classList.toggle("messages-app--thread-open", open);
      root.dataset.messagesMode = open ? "thread" : "list";
      document.body.classList.toggle("messages-thread-is-open", open);
      document.documentElement.classList.toggle("messages-thread-is-open", open);
      document.body.classList.toggle("chat-room-mobile-open", mobileOpen);
      document.documentElement.classList.toggle("chat-room-mobile-open", mobileOpen);
    };
    const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const getLatestChargeMessage = (conversationId) => {
      const messages = conversations[conversationId]?.messages || [];
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index]?.type === "charge") return messages[index];
      }
      return null;
    };

    const requestDeclineReason = (orderId, trigger) => {
      const conversation = conversations[activeId];
      const orderTitle = conversation?.order?.title || conversation?.order?.serviceTitle || "";
      if (window.DokeDeclineReasonDialog && typeof window.DokeDeclineReasonDialog.request === "function") {
        return window.DokeDeclineReasonDialog.request({
          trigger,
          orderTitle,
          title: "Recusar pedido",
          text: "Explique ao cliente por que este pedido não poderá ser atendido."
        });
      }
      showCopyToast("Não foi possível abrir o modal de justificativa. Recarregue a página e tente novamente.");
      return Promise.resolve(null);
    };

    let activeOrderDetailTrigger = null;

    const orderDetailIcons = {
      close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>',
      action: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v10H8.2L4 20V6.5Z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
      chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v10H8.2L4 20V6.5Z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
      spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"></path><path d="M19 15l.9 2.6L22 18l-2.1.4L19 21l-.9-2.6L16 18l2.1-.4L19 15Z"></path></svg>'
    };

    const createMessagesOrderDetailLayer = () => {
      let layer = document.querySelector("[data-messages-order-detail-layer]");
      if (layer) return layer;

      layer = document.createElement("aside");
      layer.className = "orders-detail-layer";
      layer.dataset.messagesOrderDetailLayer = "true";
      layer.hidden = true;
      layer.setAttribute("aria-hidden", "true");
      layer.innerHTML = `
        <button class="orders-detail-backdrop" type="button" data-messages-order-detail-close aria-label="Fechar detalhes do pedido"></button>
        <section class="orders-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="messages-order-detail-title" tabindex="-1">
          <header class="orders-detail-drawer__header">
            <div class="orders-detail-drawer__header-top">
              <span class="orders-detail-drawer__eyebrow">Detalhes do pedido</span>
              <button class="orders-detail-drawer__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" data-messages-order-detail-close aria-label="Fechar">${orderDetailIcons.close}</button>
            </div>
            <div>
              <h2 class="orders-detail-drawer__title" id="messages-order-detail-title" data-detail-title></h2>
              <p class="orders-detail-drawer__subtitle" data-detail-subtitle></p>
            </div>
            <div class="orders-detail-statusbar" data-detail-statusbar></div>
          </header>

          <div class="orders-detail-drawer__body">
            <section class="orders-detail-section">
              <span class="orders-detail-section__eyebrow">Próxima ação</span>
              <div class="orders-detail-action" data-detail-action>
                <span class="orders-detail-action__icon" data-detail-action-icon aria-hidden="true">${orderDetailIcons.action}</span>
                <div>
                  <strong class="orders-detail-action__title" data-detail-action-title></strong>
                  <p class="orders-detail-action__text" data-detail-action-note></p>
                </div>
              </div>
            </section>

            <section class="orders-detail-section orders-detail-ai" aria-label="Análise IA do pedido">
              <span class="orders-detail-section__eyebrow">Análise IA</span>
              <div class="orders-detail-ai__box">
                <span class="orders-detail-ai__icon" aria-hidden="true">${orderDetailIcons.spark}</span>
                <div>
                  <strong class="orders-detail-ai__title" data-detail-ai-title></strong>
                  <p class="orders-detail-ai__text" data-detail-ai-text></p>
                </div>
              </div>
            </section>

            <section class="orders-detail-section">
              <span class="orders-detail-section__eyebrow">Visão geral</span>
              <dl class="orders-detail-list">
                <div class="orders-detail-row"><dt data-detail-peer-label>Profissional</dt><dd data-detail-company></dd></div>
                <div class="orders-detail-row"><dt>Local</dt><dd data-detail-address></dd></div>
                <div class="orders-detail-row"><dt>Escopo</dt><dd data-detail-scope></dd></div>
                <div class="orders-detail-row"><dt>Orçamento</dt><dd data-detail-budget></dd></div>
                <div class="orders-detail-row"><dt>Pagamento</dt><dd data-detail-payment></dd></div>
                <div class="orders-detail-row"><dt>Prazo</dt><dd data-detail-deadline></dd></div>
                <div class="orders-detail-row"><dt>Materiais</dt><dd data-detail-materials></dd></div>
              </dl>
            </section>

            <section class="orders-detail-section">
              <span class="orders-detail-section__eyebrow">Contexto do pedido</span>
              <p class="orders-detail-flow" data-detail-flow></p>
            </section>

            <section class="orders-detail-section">
              <span class="orders-detail-section__eyebrow">Etapas do pedido</span>
              <div class="orders-detail-timeline" data-detail-timeline></div>
            </section>
          </div>

          <footer class="orders-detail-actions">
            <button class="orders-detail-actions__button orders-detail-actions__button--primary doke-btn doke-btn--primary" type="button" data-messages-order-detail-close>
              ${orderDetailIcons.chat}<span>Voltar para conversa</span>
            </button>
            <button class="orders-detail-actions__button orders-detail-actions__button--secondary doke-btn doke-btn--ghost" type="button" data-messages-order-detail-close>Fechar</button>
          </footer>
        </section>
      `;

      document.body.appendChild(layer);
      return layer;
    };

    const getConversationChargeMessage = (conversation) => {
      const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index]?.type === "charge") return messages[index];
      }
      return null;
    };

    const getMessagesOrderTimeline = (status, order, charge) => {
      const accepted = ["accepted", "conversation", "responded", "quoted", "in_progress", "completed"].includes(status);
      const paymentConfirmed = Boolean(charge?.paid) || status === "in_progress" || status === "completed";
      const completed = status === "completed";

      if (status === "cancelled") {
        return [
          { label: "Pedido recebido", date: order.createdAt || "Registrado na Doke", done: true, current: false },
          { label: "Pedido recusado", date: order.refusalReason || "Fluxo encerrado", done: false, current: true },
          { label: "Conversa bloqueada", date: "Atendimento indisponível", done: false, current: false }
        ];
      }

      return [
        { label: "Pedido recebido", date: order.createdAt || "Registrado na Doke", done: true, current: false },
        { label: "Aceite do profissional", date: accepted ? "Pedido aceito" : "Aguardando resposta", done: accepted, current: status === "pending" },
        {
          label: "Proposta e pagamento",
          date: paymentConfirmed
            ? "Pagamento confirmado"
            : status === "quoted"
              ? "Proposta enviada · aguardando pagamento"
              : "Próxima etapa",
          done: paymentConfirmed,
          current: status === "quoted" && !paymentConfirmed
        },
        {
          label: "Atendimento",
          date: completed ? "Serviço concluído" : status === "in_progress" ? "Etapa atual" : "Após confirmação",
          done: completed,
          current: status === "in_progress"
        }
      ];
    };

    const getMessagesOrderDetails = (conversation) => {
      const order = conversation?.order || {};
      const professionalView = isProfessionalConversationView(conversation);
      const peerLabel = professionalView ? "Cliente" : "Profissional";
      const peerName = professionalView
        ? order.clientName || conversation?.name || "Cliente Doke"
        : order.professionalName || conversation?.name || "Profissional Doke";
      const title = order.title || "Pedido de serviço";
      const location = order.location || "A combinar";
      const budget = order.budget || "A definir";
      const category = order.category || "Serviço";
      const charge = getConversationChargeMessage(conversation);
      const status = getOrderStatus(conversation);

      const statusMap = {
        pending: {
          statusLabel: order.statusLabel || "Aguardando resposta",
          smartBadge: professionalView ? "Ação pendente" : "Aguardando retorno",
          riskLabel: "Médio",
          riskTone: "risk",
          flow: order.flow || "O pedido foi criado e ainda depende do aceite do profissional para liberar a conversa e avançar no atendimento.",
          actionTitle: professionalView ? "Responder pedido" : "Aguardando aceite",
          actionNote: professionalView
            ? "Revise o escopo e aceite ou recuse este pedido para liberar o próximo passo."
            : "O profissional ainda precisa responder ao pedido antes de enviar proposta.",
          aiTitle: "Etapa inicial do fluxo",
          aiText: "Este pedido ainda está no começo. A decisão do profissional libera a negociação e evita atraso no atendimento."
        },
        accepted: {
          statusLabel: order.statusLabel || "Pedido aceito",
          smartBadge: "Conversa liberada",
          riskLabel: "Baixo",
          riskTone: "info",
          flow: order.flow || "O pedido foi aceito e a conversa já pode ser usada para alinhar escopo, prazo e detalhes da proposta.",
          actionTitle: professionalView ? "Enviar proposta" : "Acompanhar proposta",
          actionNote: professionalView
            ? "Use a conversa para enviar a proposta e formalizar o próximo passo do atendimento."
            : "A proposta do profissional deve chegar por esta conversa antes do pagamento.",
          aiTitle: "Negociação liberada",
          aiText: "A conversa já está destravada. O foco agora é transformar o alinhamento em proposta objetiva."
        },
        conversation: {
          statusLabel: order.statusLabel || "Pedido aceito",
          smartBadge: "Conversa liberada",
          riskLabel: "Baixo",
          riskTone: "info",
          flow: order.flow || "O pedido foi aceito e a conversa já pode ser usada para alinhar escopo, prazo e detalhes da proposta.",
          actionTitle: professionalView ? "Enviar proposta" : "Acompanhar proposta",
          actionNote: professionalView
            ? "Use a conversa para enviar a proposta e formalizar o próximo passo do atendimento."
            : "A proposta do profissional deve chegar por esta conversa antes do pagamento.",
          aiTitle: "Negociação liberada",
          aiText: "A conversa já está destravada. O foco agora é transformar o alinhamento em proposta objetiva."
        },
        responded: {
          statusLabel: order.statusLabel || "Respondido",
          smartBadge: "Negociação ativa",
          riskLabel: "Baixo",
          riskTone: "info",
          flow: order.flow || "O pedido já teve retorno e está em negociação. Use a conversa para alinhar escopo e próximos passos.",
          actionTitle: professionalView ? "Enviar proposta" : "Acompanhar resposta",
          actionNote: professionalView
            ? "Formalize a proposta para transformar a negociação em cobrança aprovada."
            : "Acompanhe a negociação e confirme os detalhes antes do pagamento.",
          aiTitle: "Fluxo em negociação",
          aiText: "O histórico da conversa já existe; agora o importante é consolidar proposta, valor e prazo."
        },
        quoted: {
          statusLabel: order.statusLabel || "Proposta enviada",
          smartBadge: charge?.paid ? "Pagamento confirmado" : "Aguardando pagamento",
          riskLabel: charge?.paid ? "Baixo" : "Médio",
          riskTone: charge?.paid ? "info" : "risk",
          flow: order.flow || (charge?.paid
            ? "A proposta foi aprovada e o pagamento já foi registrado. O atendimento segue em andamento."
            : "A proposta foi enviada e o próximo passo é a confirmação do pagamento para liberar o atendimento."),
          actionTitle: professionalView ? "Acompanhar proposta" : "Concluir pagamento",
          actionNote: professionalView
            ? "Aguarde a confirmação do cliente e mantenha a conversa pronta para iniciar o atendimento."
            : "O pagamento precisa ser confirmado na tela de checkout para iniciar o atendimento.",
          aiTitle: "Proposta formalizada",
          aiText: charge?.paid
            ? "O pagamento já entrou no fluxo e o pedido está pronto para execução."
            : "A negociação já virou cobrança. O próximo passo obrigatório é confirmar o pagamento."
        },
        in_progress: {
          statusLabel: order.statusLabel || "Em andamento",
          smartBadge: charge?.paid ? "Pagamento confirmado" : "Atendimento ativo",
          riskLabel: "Baixo",
          riskTone: "success",
          flow: order.flow || "A proposta foi aprovada e o atendimento está em andamento.",
          actionTitle: professionalView ? "Atualizar atendimento" : "Acompanhar atendimento",
          actionNote: professionalView
            ? "Mantenha o cliente atualizado na conversa enquanto executa o serviço."
            : "Use a conversa para acompanhar o andamento e receber atualizações do profissional.",
          aiTitle: "Atendimento iniciado",
          aiText: "Pagamento confirmado e pedido em andamento. Agora a conversa deve servir para acompanhamento e execução."
        },
        completed: {
          statusLabel: order.statusLabel || "Concluído",
          smartBadge: "Serviço concluído",
          riskLabel: "Baixo",
          riskTone: "success",
          flow: order.flow || "O atendimento foi concluído. O próximo passo será encerrar a experiência com avaliação e pós-serviço.",
          actionTitle: professionalView ? "Solicitar avaliação" : "Avaliar profissional",
          actionNote: professionalView
            ? "Feche o ciclo pedindo avaliação e registrando a conclusão do atendimento."
            : "Registre sua avaliação para concluir a experiência após o serviço.",
          aiTitle: "Fluxo concluído",
          aiText: "O pedido já foi executado. O próximo ganho de produto está em conclusão formal e avaliação."
        },
        cancelled: {
          statusLabel: order.statusLabel || "Pedido recusado",
          smartBadge: "Fluxo encerrado",
          riskLabel: "Baixo",
          riskTone: "info",
          flow: order.flow || "Este pedido foi recusado e não seguirá para proposta ou atendimento.",
          actionTitle: "Fluxo encerrado",
          actionNote: professionalView
            ? "Use o histórico para consultar o motivo da recusa."
            : "O atendimento não foi aceito pelo profissional.",
          aiTitle: "Pedido arquivado",
          aiText: "Este fluxo foi encerrado e não exige novas ações operacionais dentro da conversa."
        }
      };

      const config = statusMap[status] || statusMap.pending;

      return {
        title,
        subtitle: location ? `${peerName} • ${location}` : peerName,
        peerLabel,
        peerName,
        status,
        statusLabel: config.statusLabel,
        smartBadge: config.smartBadge,
        riskLabel: config.riskLabel,
        riskTone: config.riskTone,
        address: location,
        scope: order.scope || `Atendimento de ${category.toLowerCase()} acompanhado pela conversa.`,
        budget,
        payment: order.payment || (charge?.amount ? `${charge.amount}${charge.installments ? ` · ${charge.installments}` : ""}` : "A combinar na proposta"),
        deadline: order.timeline || order.deadline || (status === "in_progress" ? "Atendimento em andamento" : "Próxima atualização pela conversa"),
        materials: order.materials || "A confirmar com o profissional",
        flow: config.flow,
        actionTitle: config.actionTitle,
        actionNote: config.actionNote,
        aiTitle: config.aiTitle,
        aiText: config.aiText,
        timeline: getMessagesOrderTimeline(status, order, charge)
      };
    };

    const setOrderDetailText = (layer, selector, value, fallback = "—") => {
      const node = layer.querySelector(selector);
      if (node) node.textContent = String(value || "").trim() || fallback;
    };

    const renderMessagesOrderDetail = (layer, details) => {
      setOrderDetailText(layer, "[data-detail-title]", details.title);
      setOrderDetailText(layer, "[data-detail-subtitle]", details.subtitle);
      setOrderDetailText(layer, "[data-detail-action-title]", details.actionTitle);
      setOrderDetailText(layer, "[data-detail-action-note]", details.actionNote);
      setOrderDetailText(layer, "[data-detail-peer-label]", details.peerLabel);
      setOrderDetailText(layer, "[data-detail-company]", details.peerName);
      setOrderDetailText(layer, "[data-detail-address]", details.address);
      setOrderDetailText(layer, "[data-detail-scope]", details.scope);
      setOrderDetailText(layer, "[data-detail-budget]", details.budget);
      setOrderDetailText(layer, "[data-detail-payment]", details.payment);
      setOrderDetailText(layer, "[data-detail-deadline]", details.deadline);
      setOrderDetailText(layer, "[data-detail-materials]", details.materials);
      setOrderDetailText(layer, "[data-detail-flow]", details.flow);
      setOrderDetailText(layer, "[data-detail-ai-title]", details.aiTitle);
      setOrderDetailText(layer, "[data-detail-ai-text]", details.aiText);

      const action = layer.querySelector("[data-detail-action]");
      const icon = layer.querySelector("[data-detail-action-icon]");
      if (action) {
        action.dataset.risk = details.riskTone === "risk" ? "high" : "low";
        action.dataset.status = details.status;
      }
      if (icon) icon.innerHTML = details.status === "completed" ? orderDetailIcons.check : orderDetailIcons.action;

      const statusbar = layer.querySelector("[data-detail-statusbar]");
      if (statusbar) {
        const secondaryBadge = details.smartBadge && details.smartBadge !== details.statusLabel
          ? details.smartBadge
          : details.status === "in_progress"
            ? "Pagamento confirmado"
            : "Conversa ativa";
        statusbar.innerHTML = `
          <span class="orders-detail-pill">${escapeHtml(details.statusLabel)}</span>
          <span class="orders-detail-pill" data-tone="${escapeHtml(details.riskTone || "info")}">${escapeHtml(secondaryBadge)}</span>
          <span class="orders-detail-pill" data-tone="${escapeHtml(details.riskTone || "info")}">Risco ${escapeHtml(details.riskLabel || "Baixo")}</span>
        `;
      }

      const timeline = layer.querySelector("[data-detail-timeline]");
      if (timeline) {
        timeline.innerHTML = (details.timeline || []).map((step) => `
          <article class="orders-detail-timeline__item ${step.done ? "is-done" : ""} ${step.current ? "is-current" : ""}">
            <span class="orders-detail-timeline__bullet">${step.done ? orderDetailIcons.check : ""}</span>
            <div>
              <div class="orders-detail-timeline__title">${escapeHtml(step.label || "Etapa")}</div>
              <div class="orders-detail-timeline__date">${escapeHtml(step.date || (step.current ? "Etapa atual" : "Próxima etapa"))}</div>
            </div>
          </article>
        `).join("");
      }
    };

    const openMessagesOrderDetail = (trigger) => {
      const conversation = conversations[activeId];
      if (!conversation) return;
      const layer = createMessagesOrderDetailLayer();
      const drawer = layer.querySelector(".orders-detail-drawer");
      activeOrderDetailTrigger = trigger || null;
      renderMessagesOrderDetail(layer, getMessagesOrderDetails(conversation));
      layer.hidden = false;
      layer.setAttribute("aria-hidden", "false");
      document.body.classList.add("orders-detail-open");
      requestAnimationFrame(() => {
        layer.classList.add("is-open");
        drawer?.focus({ preventScroll: true });
      });
    };

    const closeMessagesOrderDetail = () => {
      const layer = document.querySelector("[data-messages-order-detail-layer]");
      if (!layer) return;
      layer.classList.remove("is-open");
      layer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("orders-detail-open");
      window.setTimeout(() => {
        if (!layer.classList.contains("is-open")) layer.hidden = true;
        activeOrderDetailTrigger?.focus?.({ preventScroll: true });
        activeOrderDetailTrigger = null;
      }, 220);
    };

    const renderLinkedOrderContext = (conversation) => {
      const order = conversation?.order || {};
      const role = getCurrentUserRole();
      const professionalView = isProfessionalConversationView(conversation);
      const peerLabel = professionalView ? 'Cliente' : 'Profissional';
      const peerName = professionalView
        ? order.clientName || conversation.name || 'Cliente Doke'
        : order.professionalName || conversation.name || 'Profissional Doke';
      const orderStatus = getOrderStatus(conversation);
      const isPending = isOrderPendingAcceptance(conversation);
      const isDeclined = isOrderDeclined(conversation);
      const unlocked = isOrderConversationUnlocked(conversation);
      let primaryLabel = 'Aguardando aceite';
      let primaryClass = 'doke-btn--soft';
      let primaryAttrs = 'aria-disabled="true" disabled';
      if (isPending && professionalView) {
        primaryLabel = 'Aceitar pedido';
        primaryClass = 'doke-btn--primary';
        primaryAttrs = 'data-messages-accept-order';
      } else if (isDeclined) {
        primaryLabel = 'Pedido recusado';
      } else if (orderStatus === 'accepted' || orderStatus === 'conversation' || orderStatus === 'responded') {
        primaryLabel = professionalView ? 'Enviar proposta' : 'Aguardando proposta';
        primaryClass = professionalView ? 'doke-btn--primary' : 'doke-btn--soft';
        primaryAttrs = professionalView ? 'data-messages-proposal-action' : 'aria-disabled="true" disabled';
      } else if (orderStatus === 'quoted') {
        primaryLabel = professionalView ? 'Proposta enviada' : 'Ver proposta';
      } else if (orderStatus === 'in_progress') {
        primaryLabel = 'Em atendimento';
      } else if (orderStatus === 'completed') {
        primaryLabel = 'Pedido concluído';
      } else if (unlocked && professionalView) {
        primaryLabel = 'Enviar proposta';
        primaryClass = 'doke-btn--primary';
        primaryAttrs = 'data-messages-proposal-action';
      }
      return `
      <section class="messages-order-card messages-order-card--inline doke-card doke-order-card" data-domain-card="order" data-messages-order-context aria-label="Pedido vinculado à conversa">
        <div class="messages-order-card__head doke-order-card__meta">
          <span>Pedido vinculado</span>
          <strong class="doke-badge doke-order-card__status">${escapeHtml(order.statusLabel || 'Em negociação')}</strong>
        </div>
        <div class="messages-order-card__body doke-order-card__body">
          <div class="messages-order-card__copy">
            <h2 class="doke-order-card__title">${escapeHtml(order.title || 'Pedido de serviço')}</h2>
            <dl class="messages-order-card__facts">
              <div><dt>${escapeHtml(peerLabel)}</dt><dd>${escapeHtml(peerName)}</dd></div>
              <div><dt>Estimativa</dt><dd>${escapeHtml(order.budget || 'A definir')}</dd></div>
              <div><dt>Local</dt><dd>${escapeHtml(order.location || 'A combinar')}</dd></div>
              <div><dt>Categoria</dt><dd>${escapeHtml(order.category || 'Serviço')}</dd></div>
            </dl>
          </div>
          <div class="messages-order-card__actions doke-order-card__actions">
            <button class="messages-order-card__button messages-order-card__button--ghost doke-btn doke-btn--ghost" type="button" data-messages-open-order-detail>Ver detalhes</button>
            ${isPending && professionalView ? `<button class="messages-order-card__button doke-btn doke-btn--ghost" type="button" data-messages-decline-order>Recusar</button>` : ""}
            <button class="messages-order-card__button doke-btn ${primaryClass}" type="button" ${primaryAttrs}>${primaryLabel}</button>
          </div>
        </div>
      </section>
    `;
    };
    const syncPaymentFlowFromQuery = () => {
      const conversationId = pageParams.get("conversation");
      if (!conversationId || !conversations[conversationId]) return;
      const charge = getLatestChargeMessage(conversationId);
      if (!charge) return;

      if (pageParams.get("payment") === "success") {
        return;
      }

      if (pageParams.get("completed") === "1") {
        charge.paid = true;
        charge.completed = true;
      }

      if (pageParams.get("review") === "1") {
        charge.paid = true;
        charge.completed = true;
        charge.reviewed = true;
      }
    };
    const updateOrderFromConversation = (status, options = {}) => {
      const conversation = conversations[activeId];
      const orderId = conversation?.order?.id || conversation?.orderId;
      const service = window.Doke?.services?.orders;
      if (!orderId || !service) return Promise.resolve(null);
      const action = status === 'quoted' && typeof service.quote === 'function'
        ? service.quote(orderId, options)
        : status === 'in_progress' && typeof service.start === 'function'
          ? service.start(orderId, options)
          : status === 'completed' && typeof service.complete === 'function'
            ? service.complete(orderId, options)
            : typeof service.updateStatus === 'function'
              ? service.updateStatus(orderId, status, options)
              : Promise.resolve(null);
      return action.then((order) => {
        syncConversationOrderStatus(conversation, order);
        return persistConversationState(activeId).then(() => order);
      });
    };

    const openPaymentPageForCharge = (message) => {
      if (!message) return;
      const conversation = conversations[activeId];
      const orderId = conversation?.order?.id || conversation?.orderId || pageParams.get('order') || '';
      const params = new URLSearchParams();
      if (orderId) params.set('order', orderId);
      if (activeId) params.set('conversation', activeId);
      if (message.id) params.set('message', message.id);
      params.set('source', 'chat');
      const target = `pagamento-profissional.html?${params.toString()}`;
      if (window.DokeNavigate && typeof window.DokeNavigate === 'function') {
        window.DokeNavigate(target);
        return;
      }
      window.location.href = target;
    };

    const confirmChargePayment = (message) => {
      openPaymentPageForCharge(message);
    };

    const syncCounts = () => {
      const visibleItems = refreshConversationItems().filter((item) => !item.hidden && item.dataset.deleted !== "true");
      const { ordersList, contactsList } = getConversationLists(root);
      const ordersListVisible = isRenderedList(ordersList);
      const orders = ordersListVisible
        ? visibleItems.filter((item) => item.parentElement === ordersList || conversations[item.dataset.messageId]?.group === "orders").length
        : 0;
      const contacts = visibleItems.filter((item) => {
        if (!contactsList) return conversations[item.dataset.messageId]?.group === "contacts";
        return item.parentElement === contactsList || (!ordersListVisible && conversations[item.dataset.messageId]?.group === "orders");
      }).length;
      const unread = visibleItems.reduce((total, item) => total + Number(conversations[item.dataset.messageId]?.unread || 0), 0);
      if (ordersCount) ordersCount.textContent = String(orders);
      if (contactsCount) contactsCount.textContent = String(contacts);
      if (mobileCount) mobileCount.textContent = String(unread);
    };

    const setSearchExpanded = (expanded) => {
      root.classList.toggle("is-search-open", expanded);
      searchToggleButtons.forEach((button) => button.setAttribute("aria-expanded", expanded ? "true" : "false"));
      if (!expanded) {
        searchCloseButtons.forEach((button) => button.blur());
      }
    };

    const setToggleExpanded = (toggles, expanded) => {
      toggles.forEach((toggle) => toggle?.setAttribute("aria-expanded", expanded ? "true" : "false"));
    };

    const updateConversationSelectionUI = () => {
      const total = selectedConversationIds.size;
      refreshConversationItems().forEach((item) => {
        const selected = selectedConversationIds.has(item.dataset.messageId);
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-selected", selected ? "true" : "false");
      });
      cardSelectionCountNodes.forEach((node) => {
        node.textContent = `${total} ${total === 1 ? "selecionada" : "selecionadas"}`;
      });
      archiveConversationButtons.forEach((button) => {
        button.disabled = total === 0;
      });
      clearSelectedButtons.forEach((button) => {
        button.disabled = total === 0;
      });
    };

    const setSelectionMode = (enabled, options = {}) => {
      const { preserveSelection = false } = options;
      selectionMode = enabled;
      root.classList.toggle("is-selection-mode", enabled);
      messagesList?.setAttribute("aria-multiselectable", enabled ? "true" : "false");
      if (!enabled) {
        setToggleExpanded(selectToggles, false);
        desktopSelectToggle?.setAttribute("aria-expanded", "false");
        if (!preserveSelection) {
          selectedConversationIds.clear();
          updateConversationSelectionUI();
        }
      }
      if (enabled) {
        updateConversationSelectionUI();
      }
    };

    const closeFiltersPanel = () => {
      filterPanels.forEach((panel) => {
        panel.hidden = true;
      });
      setToggleExpanded(filterToggleButtons, false);
    };

    const closeSelectPanel = (options = {}) => {
      const { preserveSelectionMode = false } = options;
      conversationSelectPanels.forEach((panel) => {
        panel.hidden = true;
      });
      setToggleExpanded(selectToggleButtons, false);
      if (!preserveSelectionMode) {
        setSelectionMode(false);
      }
    };

    const openFiltersPanel = () => {
      const targetPanel = isMobileViewport() ? mobileFiltersPanel : desktopFiltersPanel;
      filterPanels.forEach((panel) => {
        panel.hidden = panel !== targetPanel;
      });
      closeSelectPanel();
      setSearchExpanded(false);
      setToggleExpanded(filterToggleButtons, true);
      syncHeaderControls();
    };

    const openSelectPanel = () => {
      closeFiltersPanel();
      const targetPanel = isMobileViewport() ? mobileSelectPanel : desktopSelectPanel;
      conversationSelectPanels.forEach((panel) => {
        panel.hidden = panel !== targetPanel;
      });
      setSearchExpanded(false);
      setSelectionMode(true, { preserveSelection: true });
      setToggleExpanded(selectToggleButtons, true);
      syncHeaderControls();
    };

    const syncFilterButtons = () => {
      filterButtons.forEach((button) => {
        const key = button.dataset.messagesFilter || "all";
        const isActive = key === "all" ? selectedFilterKeys.size === 0 : selectedFilterKeys.has(key);
        button.classList.toggle("is-active", isActive);
      });
      archiveToggles.forEach((button) => button.setAttribute("aria-pressed", selectedFilterKeys.has("archived") ? "true" : "false"));
    };

    const syncActiveFilterChip = () => {
      const activeLabels = getActiveFilterLabels();
      const showSummary = activeLabels.length > 0 && !selectionMode && !filterPanels.some((panel) => !panel.hidden);
      activeChips.forEach((chip) => {
        chip.textContent = activeLabels.join(" • ") || filterLabels.all;
        chip.hidden = !showSummary;
      });
      clearFilterButtons.forEach((button) => {
        button.hidden = !showSummary;
      });
      filterSummaryRows.forEach((row) => {
        row.hidden = !showSummary;
      });
    };

    const syncHeaderControls = () => {
      const mobileFilterOpen = Boolean(mobileFiltersPanel && !mobileFiltersPanel.hidden);
      const mobileSelectOpen = Boolean(mobileSelectPanel && !mobileSelectPanel.hidden);
      const desktopFilterOpen = Boolean(desktopFiltersPanel && !desktopFiltersPanel.hidden);
      const desktopSelectOpen = Boolean(desktopSelectPanel && !desktopSelectPanel.hidden);
      const hasFilterSummary = getActiveFilterLabels().length > 0 && !selectionMode && !mobileFilterOpen && !desktopFilterOpen;

      syncActiveFilterChip();
      updateConversationSelectionUI();

      if (mobileControls) {
        mobileControls.hidden = !isMobileViewport() || !(mobileFilterOpen || mobileSelectOpen || hasFilterSummary);
      }
      if (desktopControls) {
        desktopControls.hidden = isMobileViewport() || !(desktopFilterOpen || desktopSelectOpen || hasFilterSummary);
      }
    };

    const resetActionSurfaces = () => {
      closeFiltersPanel();
      closeSelectPanel();
      setSearchExpanded(false);
      syncHeaderControls();
    };

    const getSearchQuery = () => normalize(searchInputs.find((input) => String(input.value || "").trim())?.value || "");

    const matchesConversationFilter = (conversation) => {
      if (!conversation) return false;
      if (selectedFilterKeys.size === 0) return true;
      const { ordersList } = getConversationLists(root);
      const ordersListVisible = isRenderedList(ordersList);
      const scopeKeys = ["orders", "contacts"].filter((key) => selectedFilterKeys.has(key));
      if (scopeKeys.length) {
        const displayGroup = !ordersListVisible && conversation.group === "orders" ? "contacts" : conversation.group;
        if (!scopeKeys.includes(displayGroup)) return false;
      }
      if (selectedFilterKeys.has("unread") && Number(conversation.unread || 0) <= 0) {
        return false;
      }
      if (selectedFilterKeys.has("archived") && conversation.archived !== true) {
        return false;
      }
      return true;
    };

    const toggleFilterKey = (key) => {
      if (!key || key === "all") {
        selectedFilterKeys.clear();
      } else {
        selectedFilterKeys = selectedFilterKeys.has(key) ? new Set() : new Set([key]);
      }
      syncFilterButtons();
      syncVisibility();
      syncHeaderControls();
    };


    const refreshConversationCards = () => {
      refreshConversationItems().forEach((item) => {
        const id = item.dataset.messageId;
        const conversation = id ? conversations[id] : null;
        if (!conversation) return;
        const preview = item.querySelector(".message-item__preview");
        const status = item.querySelector(".message-item__status");
        const badge = item.querySelector(".message-item__badge");
        const lastMessage = conversation.messages[conversation.messages.length - 1];

        if (preview) {
          preview.textContent = lastMessage ? getMessagePreview(lastMessage) : "Sem mensagens ainda.";
        }

        if (status) {
          status.textContent = conversation.lastSeen;
        }

        if (badge) {
          badge.hidden = !conversation.unread;
          badge.textContent = String(conversation.unread || 0);
        }
      });
    };

    const clearSelection = () => {
      selectedMessageIndexes = new Set();
      if (selectionBar) selectionBar.hidden = true;
      if (selectionCount) selectionCount.textContent = "0 selecionadas";
    };

    const syncSelectionBar = () => {
      const total = selectedMessageIndexes.size;
      if (!selectionBar || !selectionCount) return;
      selectionBar.hidden = total === 0;
      selectionCount.textContent = `${total} ${total === 1 ? "selecionada" : "selecionadas"}`;
    };

    const scrollThreadToBottom = (smooth = false) => {
      if (!threadBody) return;
      window.requestAnimationFrame(() => {
        threadBody.scrollTo({
          top: threadBody.scrollHeight,
          behavior: smooth ? "smooth" : "auto"
        });
      });
    };

    const scrollThreadToStart = () => {
      if (!threadBody) return;
      threadBody.scrollTop = 0;
      window.requestAnimationFrame(() => {
        threadBody.scrollTop = 0;
        window.requestAnimationFrame(() => {
          threadBody.scrollTop = 0;
        });
      });
    };

    const getConversationLockMessage = (conversation) => {
      if (!conversation || !(conversation.group === "orders" || conversation.orderId || conversation.order?.id)) return "";
      if (isOrderDeclined(conversation)) {
        const reason = conversation.order?.refusalReason ? ` Justificativa: ${conversation.order.refusalReason}` : "";
        return `Pedido recusado pelo profissional.${reason}`;
      }
      if (isOrderPendingAcceptance(conversation)) {
        return isProfessionalConversationView(conversation)
          ? "Aceite o pedido para liberar a conversa com o cliente. Para recusar, informe uma justificativa."
          : "A conversa será liberada quando o profissional aceitar o pedido.";
      }
      return "";
    };

    const syncComposerLock = (conversation) => {
      if (!composer) return;
      const lockedMessage = getConversationLockMessage(conversation);
      const locked = Boolean(lockedMessage);
      composer.classList.toggle("is-locked", locked);
      if (composerInput) {
        composerInput.disabled = locked;
        composerInput.placeholder = locked ? lockedMessage : (window.innerWidth <= 760 ? "Mensagem..." : "Digite sua mensagem...");
      }
      [imageTool, audioButton, emojiButton, sendButton, chargeButton].forEach((button) => {
        if (!button) return;
        button.disabled = locked || (button === chargeButton && !canUseChargeAction(conversation));
      });
    };

    const renderEmptyThread = () => {
      activeId = "";
      clearSelection();
      refreshConversationItems().forEach((item) => item.classList.remove("is-active"));
      if (threadAvatar) threadAvatar.textContent = "DK";
      if (threadName) threadName.textContent = "Selecione uma conversa";
      if (threadLastSeen) threadLastSeen.textContent = "Pedidos e mensagens aparecem aqui";
      const orderAction = root.querySelector(".messages-thread__action--order[data-messages-open-order-detail]");
      if (orderAction) orderAction.disabled = true;
      if (chargeButton) syncChargeActionVisibility(null);
      if (threadBody) {
        threadBody.innerHTML = "";
        threadBody.hidden = true;
      }
      if (threadEmpty) {
        threadEmpty.hidden = false;
        const title = threadEmpty.querySelector("h3");
        const text = threadEmpty.querySelector("p");
        if (title) title.textContent = "Selecione uma conversa.";
        if (text) text.textContent = "Pedidos aceitos e mensagens reais aparecerão aqui.";
      }
      if (composer) composer.classList.add("is-locked");
      if (composerInput) {
        composerInput.disabled = true;
        composerInput.placeholder = "Selecione uma conversa para iniciar.";
      }
      [imageTool, audioButton, emojiButton, sendButton, chargeButton].forEach((button) => {
        if (button) button.disabled = true;
      });
    };

    const renderThread = (id, options = {}) => {
      const conversation = conversations[id];
      if (!conversation || !threadBody) {
        renderEmptyThread();
        return;
      }
      const isSameThread = activeId === id;
      const previousScrollTop = threadBody.scrollTop;
      const { scrollTo = isSameThread ? "preserve" : "start", openOnMobile = false } = options;
      activeId = id;
      if (conversation.unread) {
        conversation.unread = 0;
        window.Doke?.services?.messages?.markAsRead?.(id)?.catch?.((error) => console.warn("[DokeMessages:markAsRead]", error));
      }
      const orderAction = root.querySelector(".messages-thread__action--order[data-messages-open-order-detail]");
      if (orderAction) orderAction.disabled = false;
      if (!isSameThread) clearSelection();
      clearReplyPreview();
      refreshConversationItems().forEach((item) => item.classList.toggle("is-active", item.dataset.messageId === id));
      if (threadAvatar) threadAvatar.textContent = getConversationInitials(conversation.name);
      if (threadName) threadName.textContent = conversation.name;
      if (threadLastSeen) threadLastSeen.textContent = conversation.lastSeen;
      syncChargeActionVisibility(conversation);
      syncComposerLock(conversation);
      const hasOrderContext = conversation.group === "orders" || Boolean(conversation.orderId || conversation.order?.id);
      if (threadEmpty) threadEmpty.hidden = hasOrderContext || conversation.messages.length !== 0;
      if (threadBody) threadBody.hidden = !hasOrderContext && conversation.messages.length === 0;
      const activeInitials = getConversationInitials(conversation.name);
      const lockMessage = getConversationLockMessage(conversation);
      const lockTitle = isOrderDeclined(conversation) ? "Pedido recusado" : "Aguardando aceite do profissional";
      threadBody.innerHTML = (hasOrderContext ? renderLinkedOrderContext(conversation) : "") + (lockMessage ? `
        <section class="messages-thread-lock${isOrderDeclined(conversation) ? " messages-thread-lock--declined" : ""}" data-messages-thread-lock aria-live="polite">
          <div class="messages-thread-lock__icons" aria-hidden="true">
            <span class="messages-thread-lock__icon messages-thread-lock__icon--paint">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M4 7.75h10.6a2.4 2.4 0 0 1 0 4.8H8.9l-1.8 3.1a1.9 1.9 0 0 1-1.65.95H4.9v-3.3H4a2 2 0 0 1-2-2v-1.55a2 2 0 0 1 2-2Z"/>
                <path d="M16.7 8.4 21.2 3.9"/>
                <path d="m18.1 7 2 2"/>
              </svg>
            </span>
            <span class="messages-thread-lock__icon messages-thread-lock__icon--wrench">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M14.6 5.2a4.2 4.2 0 0 0 4.2 5.2l-7.95 7.95a2.1 2.1 0 1 1-2.97-2.97L15.85 7.4a4.2 4.2 0 0 1-1.25-2.2Z"/>
                <path d="M13.85 4.35A4.2 4.2 0 0 1 19.7 9.1"/>
              </svg>
            </span>
            <span class="messages-thread-lock__icon messages-thread-lock__icon--bolt">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M13.2 2.75 5.9 13.2h4.55L9.95 21.25l8.15-11.3h-4.55l-.35-7.2Z"/>
              </svg>
            </span>
          </div>
          <div class="messages-thread-lock__content">
            <strong>${escapeHtml(lockTitle)}</strong>
            <p>${escapeHtml(lockMessage)}</p>
          </div>
        </section>
      ` : "") + conversation.messages.map((message, index) => `
        <article class="message-row${message.mine ? " message-row--me" : ""}${message.type === "charge" ? " message-row--charge" : ""}" data-message-index="${index}">
          ${message.mine ? "" : `<span class="message-row__avatar doke-avatar" aria-hidden="true">${activeInitials}</span>`}
          <div class="message-bubble doke-selectable-card${message.mine ? " message-bubble--me" : ""}${message.type === "image" ? " message-bubble--image-only" : ""}${message.type === "charge" ? " message-bubble--charge" : ""}${selectedMessageIndexes.has(index) ? " is-selected" : ""}" data-message-bubble data-message-index="${index}" role="option" tabindex="0" aria-selected="${selectedMessageIndexes.has(index) ? "true" : "false"}">
            <div class="message-bubble__meta">
              <span>${message.mine ? message.author : ""}</span>
              <span>${message.time}</span>
            </div>
            ${message.replyTo ? `
            <div class="message-bubble__reply${message.mine ? " message-bubble__reply--me" : ""}">
              <strong>${message.replyTo.author}</strong>
              <span>${String(message.replyTo.text || "").slice(0, 72)}</span>
            </div>` : ""}
            ${message.type === "audio" ? `
            <div class="message-bubble__audio">
              <span class="message-bubble__audio-play">▶</span>
              <span class="message-bubble__audio-track"></span>
              <span class="message-bubble__audio-meta">
                <span>${message.duration || "00:00"}</span>
              </span>
              <button class="message-bubble__audio-speed doke-btn doke-btn--ghost doke-btn--sm" type="button" data-audio-speed>${message.speed || "1x"}</button>
            </div>` : message.type === "image" ? `
            <div class="message-bubble__image">
              <img src="${message.src}" alt="Imagem enviada na conversa">
            </div>` : `<p>${message.text}</p>`}
          </div>
        </article>
      `).join("");
      conversation.messages.forEach((message, index) => {
        if (message.type !== "charge") return;
        const bubble = threadBody.querySelector(`.message-bubble[data-message-index="${index}"]`);
        if (!bubble) return;
        const paragraph = bubble.querySelector("p");
        if (paragraph) paragraph.remove();
        const chargeCard = document.createElement("div");
        chargeCard.className = "message-bubble__charge doke-card doke-message-card";
        chargeCard.dataset.domainCard = "message";
        const chargePresentation = getChargeCardPresentation(conversation, message);
        const chargeActionClass = chargePresentation.passive
          ? 'message-bubble__charge-actions message-bubble__charge-actions--passive'
          : 'message-bubble__charge-actions';
        chargeCard.innerHTML = `
          <div class="message-bubble__charge-topline">
            <span class="message-bubble__charge-label doke-badge">${chargePresentation.label}</span>
            <span class="message-bubble__charge-status message-bubble__charge-status--${chargePresentation.state} doke-badge">${chargePresentation.status}</span>
          </div>
          <div class="message-bubble__charge-main">
            <span class="message-bubble__charge-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 3.75h10a2 2 0 0 1 2 2v14.5l-2.4-1.25-2.3 1.25L12 19l-2.3 1.25L7.4 19 5 20.25V5.75a2 2 0 0 1 2-2Z"></path><path d="M8.5 8.25h7"></path><path d="M8.5 11.75h5"></path><path d="M8.5 15.25h7"></path></svg>
            </span>
            <div class="message-bubble__charge-content">
              <span class="message-bubble__charge-kicker">${chargePresentation.kicker}</span>
              <strong class="message-bubble__charge-value">${message.amount}</strong>
              <p class="message-bubble__charge-text">${chargePresentation.text}</p>
            </div>
          </div>
          <div class="message-bubble__charge-details" aria-label="Detalhes da cobrança">
            ${chargePresentation.details.map((detail) => `<span>${detail}</span>`).join('')}
          </div>
          <div class="${chargeActionClass}">
            <span class="message-bubble__charge-note">${chargePresentation.note}</span>
            ${chargePresentation.actionHtml}
          </div>
        `;
        bubble.appendChild(chargeCard);
      });
      syncSelectionBar();
      refreshConversationCards();
      if (isCompactThreadViewport()) {
        setCompactThreadOpen(openOnMobile || root.dataset.messagesMode === "thread");
      }

      window.requestAnimationFrame(() => {
        if (!threadBody) return;
        if (scrollTo === "end") {
          scrollThreadToBottom(false);
          return;
        }
        if (scrollTo === "start") {
          scrollThreadToStart();
          return;
        }
        threadBody.scrollTop = previousScrollTop;
      });
    };

    const formatAudioTime = (totalSeconds) => {
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      return `${minutes}:${seconds}`;
    };

    const stopAudioDraft = () => {
      if (!audioDraftTimer) return;
      window.clearInterval(audioDraftTimer);
      audioDraftTimer = null;
    };

    const resetAudioDraft = () => {
      stopAudioDraft();
      audioDraftSeconds = 0;
      if (audioTime) audioTime.textContent = "00:00";
      audioDraft?.setAttribute("hidden", "");
      updateComposerDraftState();
      audioButton?.classList.remove("is-recording");
      audioButton?.setAttribute("aria-pressed", "false");
    };

    const startAudioDraft = () => {
      if (!audioDraft) return;
      audioDraft.removeAttribute("hidden");
      updateComposerDraftState();
      audioButton?.classList.add("is-recording");
      audioButton?.setAttribute("aria-pressed", "true");
      if (audioTime) audioTime.textContent = formatAudioTime(audioDraftSeconds);
      stopAudioDraft();
      audioDraftTimer = window.setInterval(() => {
        audioDraftSeconds += 1;
        if (audioTime) audioTime.textContent = formatAudioTime(audioDraftSeconds);
      }, 1000);
    };

    const resetImageDraft = () => {
      imageDraftSrc = "";
      if (imagePreview) imagePreview.src = "";
      imageDraft?.setAttribute("hidden", "");
      updateComposerDraftState();
      if (imageInput) imageInput.value = "";
    };

    const clearReplyPreview = () => {
      replyToMessage = null;
      replyPreview?.setAttribute("hidden", "");
      updateComposerDraftState();
      if (replyAuthor) replyAuthor.textContent = "Respondendo";
      if (replyText) replyText.textContent = "";
    };

    const setReplyPreview = (message) => {
      replyToMessage = message;
      if (replyAuthor) replyAuthor.textContent = `Respondendo a ${message.author}`;
      if (replyText) replyText.textContent = String(message.text || "").slice(0, 72);
      replyPreview?.removeAttribute("hidden");
      updateComposerDraftState();
      composerInput?.focus();
    };

    const openLightbox = (src, alt) => {
      if (!lightbox || !lightboxImage || !src) return;
      lightboxImage.src = src;
      lightboxImage.alt = alt || "Imagem ampliada";
      if (typeof lightbox.showModal === "function") {
        if (!lightbox.open) lightbox.showModal();
      } else {
        lightbox.setAttribute("open", "");
      }
    };

    const closeLightbox = () => {
      if (!lightbox) return;
      if (typeof lightbox.close === "function" && lightbox.open) {
        lightbox.close();
      } else {
        lightbox.removeAttribute("open");
      }
      if (lightboxImage) {
        lightboxImage.src = "";
        lightboxImage.alt = "Imagem ampliada";
      }
    };

    const openChargeModal = () => {
      if (!chargeModal) return;
      if (typeof chargeModal.showModal === "function") {
        if (!chargeModal.open) chargeModal.showModal();
      } else {
        chargeModal.setAttribute("open", "");
      }
      chargeAmountInput?.focus();
      chargeAmountInput?.select();
    };

    const closeChargeModal = () => {
      if (!chargeModal) return;
      if (typeof chargeModal.close === "function" && chargeModal.open) {
        chargeModal.close();
      } else {
        chargeModal.removeAttribute("open");
      }
    };


    const setCompletionPanel = (panelName) => {
      completionPanels.forEach((panel) => {
        const active = panel.dataset.messageCompletionPanel === panelName;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
    };

    const setCompletionText = (selector, value) => {
      document.querySelectorAll(selector).forEach((node) => {
        node.textContent = value || '';
      });
    };

    const getCompletionOrderCode = (order = {}) => {
      const code = order.code || order.orderCode || order.number;
      if (code) return String(code).startsWith('#') ? String(code) : `#${code}`;
      const id = String(order.id || order.orderId || '').trim();
      return id ? `#${id}` : '#DK';
    };

    const buildCompletionReviewUrl = (conversation, message) => {
      const orderId = conversation?.order?.id || conversation?.orderId || pageParams.get('order') || '';
      const params = new URLSearchParams();
      if (orderId) params.set('order', orderId);
      if (activeId) params.set('conversation', activeId);
      if (message?.id) params.set('message', message.id);
      params.set('source', 'chat');
      return `avaliacao-profissional.html?${params.toString()}`;
    };

    const openReviewPageForCharge = (message) => {
      const conversation = conversations[activeId] || {};
      const target = buildCompletionReviewUrl(conversation, message);
      if (window.DokeNavigate && typeof window.DokeNavigate === 'function') {
        window.DokeNavigate(target);
        return;
      }
      window.location.href = target;
    };

    const populateCompletionModal = (conversation, message) => {
      const order = conversation?.order || {};
      const serviceTitle = order.serviceTitle || order.title || 'Pedido de serviço';
      const providerName = order.professionalName || order.providerName || conversation?.name || 'Profissional Doke';
      const amount = message?.amount || order.amount || order.budget || 'R$ 0,00';
      const orderCode = getCompletionOrderCode(order);

      setCompletionText('[data-completion-service-title]', serviceTitle);
      setCompletionText('[data-completion-provider-name]', providerName);
      setCompletionText('[data-completion-amount]', amount);
      setCompletionText('[data-completion-order-code]', orderCode);
      if (completionIssueLink) {
        completionIssueLink.href = activeId ? `mensagens.html?conversation=${encodeURIComponent(activeId)}` : 'mensagens.html';
      }
      if (completionNote) completionNote.value = '';
      if (completionConfirm) completionConfirm.checked = true;
      if (completionError) {
        completionError.textContent = 'Confirme que o serviço foi concluído para continuar.';
        completionError.hidden = true;
      }
    };

    const openCompletionModal = (index, message) => {
      const conversation = conversations[activeId];
      if (!completionModal || !conversation || !message) return false;
      pendingCompletion = { conversationId: activeId, messageIndex: index };
      populateCompletionModal(conversation, message);
      setCompletionPanel('confirm');
      completionModal.hidden = false;
      completionModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('messages-completion-modal-open');
      completionConfirm?.focus?.({ preventScroll: true });
      return true;
    };

    const closeCompletionModal = () => {
      if (!completionModal) return;
      completionModal.hidden = true;
      completionModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('messages-completion-modal-open');
    };

    const completeChargeMessage = (conversationId, messageIndex) => {
      const conversation = conversations[conversationId];
      const currentMessage = conversation?.messages?.[messageIndex];
      if (!conversation || !currentMessage || currentMessage.type !== 'charge') return Promise.reject(new Error('Cobrança não encontrada.'));

      const previous = {
        paid: currentMessage.paid,
        completed: currentMessage.completed,
        text: currentMessage.text
      };

      currentMessage.paid = true;
      currentMessage.completed = true;
      currentMessage.text = completionNote?.value?.trim()
        ? `Atendimento concluído. ${completionNote.value.trim()}`
        : currentMessage.text || 'Atendimento concluído. Avaliação liberada.';

      const orderAlreadyCompleted = getOrderStatus(conversation) === 'completed';
      const completionTask = orderAlreadyCompleted
        ? Promise.resolve(conversation.order || null)
        : updateOrderFromConversation('completed', { paymentMessageId: currentMessage.id || '', messageId: currentMessage.id || '' });

      return completionTask
        .then(() => persistConversationState(conversationId))
        .then(() => {
          renderThread(conversationId, { scrollTo: 'end' });
          return currentMessage;
        })
        .catch((error) => {
          currentMessage.paid = previous.paid;
          currentMessage.completed = previous.completed;
          currentMessage.text = previous.text;
          renderThread(conversationId, { scrollTo: 'end' });
          throw error;
        });
    };

    const closeThreadCallMenu = () => {
      threadCallMenu?.setAttribute("hidden", "");
      threadCallToggle?.setAttribute("aria-expanded", "false");
    };

    const closeThreadMoreMenu = () => {
      threadMoreMenu?.setAttribute("hidden", "");
      threadMoreToggle?.setAttribute("aria-expanded", "false");
    };

    const toggleThreadCallMenu = () => {
      if (!threadCallMenu || !threadCallToggle) return;
      const willOpen = threadCallMenu.hidden;
      closeThreadMoreMenu();
      threadCallMenu.hidden = !willOpen;
      threadCallToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
    };

    const toggleThreadMoreMenu = () => {
      if (!threadMoreMenu || !threadMoreToggle) return;
      const willOpen = threadMoreMenu.hidden;
      closeThreadCallMenu();
      threadMoreMenu.hidden = !willOpen;
      threadMoreToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
    };

    const startThreadCall = (type = "audio") => {
      const label = type === "video" ? "Videochamada iniciada" : "Ligação iniciada";
      showCopyToast(label);
      closeThreadCallMenu();
    };

    const setChatFocusMode = (isFocused) => {
      const mode = isFocused ? "focus" : "split";
      root.dataset.chatMode = mode;
      document.body.classList.toggle("messages-chat-is-focused", isFocused);
      chatFocusToggle?.setAttribute("aria-pressed", isFocused ? "true" : "false");
      chatFocusToggle?.setAttribute("aria-label", isFocused ? "Recolher conversa" : "Expandir conversa");
      chatFocusToggle?.setAttribute("title", isFocused ? "Recolher conversa" : "Expandir conversa");
      if (chatFocusLabel) chatFocusLabel.textContent = isFocused ? "Mostrar conversas" : "Expandir conversa";
    };

    const toggleChatFocusMode = () => {
      setChatFocusMode(root.dataset.chatMode !== "focus");
      closeThreadCallMenu();
      closeThreadMoreMenu();
    };

    const syncVisibility = () => {
      const query = getSearchQuery();
      let visibleCount = 0;
      refreshConversationItems().forEach((item) => {
        const conversation = conversations[item.dataset.messageId];
        const notDeleted = item.dataset.deleted !== "true";
        const matchesFilter = matchesConversationFilter(conversation);
        const visible = notDeleted && matchesFilter && (!query || normalize(item.textContent).includes(query));
        item.hidden = !visible;
        if (!visible && selectedConversationIds.has(item.dataset.messageId)) {
          selectedConversationIds.delete(item.dataset.messageId);
        }
        if (visible) visibleCount += 1;
      });
      if (emptyState) {
        const hasVisibleConversation = visibleCount !== 0;
        if (hydration && !hydration.canShowEmpty()) {
          hydration.syncEmpty({ hasItems: true });
        } else if (hydration) {
          hydration.syncEmpty({ hasItems: hasVisibleConversation });
        } else {
          emptyState.hidden = hasVisibleConversation;
          emptyState.setAttribute('aria-hidden', hasVisibleConversation ? 'true' : 'false');
        }
      }
      syncCounts();
      updateConversationSelectionUI();
      syncHeaderControls();
    };

    searchForms.forEach((form) => form.addEventListener("submit", (event) => {
      event.preventDefault();
      syncVisibility();
    }));

    searchInputs.forEach((input) => input.addEventListener("input", () => {
      const value = input.value;
      searchInputs.forEach((node) => {
        if (node !== input) node.value = value;
      });
      syncVisibility();
    }));

    searchCloseButtons.forEach((button) => button.addEventListener("click", () => {
      setSearchExpanded(false);
    }));

    searchToggleButtons.forEach((button) => button.addEventListener("click", () => {
      const willOpen = !root.classList.contains("is-search-open");
      setSearchExpanded(willOpen);
      if (willOpen) {
        window.setTimeout(() => getVisibleSearchInput()?.focus(), 20);
      }
      closeFiltersPanel();
      closeSelectPanel();
      syncHeaderControls();
    }));

    filterToggles.forEach((toggle) => toggle.addEventListener("click", () => {
      const panelOpen = isMobileViewport() ? Boolean(mobileFiltersPanel && !mobileFiltersPanel.hidden) : Boolean(desktopFiltersPanel && !desktopFiltersPanel.hidden);
      if (panelOpen) {
        closeFiltersPanel();
        syncHeaderControls();
        return;
      }
      openFiltersPanel();
    }));

    desktopFilterToggle?.addEventListener("click", () => {
      const panelOpen = Boolean(desktopFiltersPanel && !desktopFiltersPanel.hidden);
      if (panelOpen) {
        closeFiltersPanel();
        syncHeaderControls();
        return;
      }
      openFiltersPanel();
    });

    archiveToggles.forEach((toggle) => toggle.addEventListener("click", () => {
      closeSelectPanel();
      setSearchExpanded(false);
      toggleFilterKey("archived");
    }));

    filterButtons.forEach((button) => button.addEventListener("click", () => {
      toggleFilterKey(button.dataset.messagesFilter || "all");
    }));

    clearFilterButtons.forEach((clearFilterButton) => clearFilterButton.addEventListener("click", () => {
      selectedFilterKeys.clear();
      syncFilterButtons();
      syncVisibility();
      closeFiltersPanel();
      syncHeaderControls();
    }));

    selectToggles.forEach((toggle) => toggle.addEventListener("click", () => {
      const panelOpen = isMobileViewport() ? Boolean(mobileSelectPanel && !mobileSelectPanel.hidden) : Boolean(desktopSelectPanel && !desktopSelectPanel.hidden);
      if (panelOpen) {
        closeSelectPanel();
        syncHeaderControls();
        return;
      }
      openSelectPanel();
    }));

    document.addEventListener("doke:mobile-shell-action", (event) => {
      if (!isMobileViewport()) return;
      const action = event?.detail?.action;
      if (action === "search") {
        const willOpen = !root.classList.contains("is-search-open");
        setSearchExpanded(willOpen);
        closeFiltersPanel();
        closeSelectPanel({ preserveSelectionMode: true });
        syncHeaderControls();
        if (willOpen) window.setTimeout(() => getVisibleSearchInput()?.focus(), 20);
        return;
      }
      if (action === "filters") {
        const panelOpen = Boolean((mobileFiltersPanel || desktopFiltersPanel) && !(mobileFiltersPanel || desktopFiltersPanel).hidden);
        if (panelOpen) {
          closeFiltersPanel();
        } else {
          openFiltersPanel();
        }
        syncHeaderControls();
        return;
      }
      if (action === "select") {
        if (selectionMode) {
          closeSelectPanel();
        } else {
          openSelectPanel();
        }
        syncHeaderControls();
      }
    });

    desktopSelectToggle?.addEventListener("click", () => {
      const panelOpen = Boolean(desktopSelectPanel && !desktopSelectPanel.hidden);
      if (panelOpen) {
        closeSelectPanel();
        syncHeaderControls();
        return;
      }
      openSelectPanel();
    });

    selectModeButtons.forEach((button) => button.addEventListener("click", () => {
      const mode = button.dataset.messagesSelectMode;
      openSelectPanel();
      if (mode === "all") {
        selectedConversationIds = new Set(items.filter((item) => !item.hidden && item.dataset.deleted !== "true").map((item) => item.dataset.messageId));
      } else {
        selectedConversationIds.clear();
      }
      updateConversationSelectionUI();
      syncHeaderControls();
    }));

    archiveConversationButtons.forEach((button) => button.addEventListener("click", () => {
      if (!selectedConversationIds.size) return;
      selectedConversationIds.forEach((id) => {
        if (conversations[id]) {
          conversations[id].archived = true;
        }
      });
      selectedConversationIds.clear();
      updateConversationSelectionUI();
      syncVisibility();
      syncHeaderControls();
    }));

    clearSelectedButtons.forEach((button) => button.addEventListener("click", () => {
      selectedConversationIds.clear();
      updateConversationSelectionUI();
      syncHeaderControls();
    }));

    resetSearchButton?.addEventListener("click", () => {
      searchInputs.forEach((node) => { node.value = ""; });
      selectedFilterKeys.clear();
      syncFilterButtons();
      syncVisibility();
      syncHeaderControls();
    });

    root.addEventListener("click", (event) => {
      const acceptOrderButton = event.target.closest("[data-messages-accept-order]");
      const declineOrderButton = event.target.closest("[data-messages-decline-order]");
      const proposalButton = event.target.closest("[data-messages-proposal-action]");
      if (proposalButton && root.contains(proposalButton)) {
        event.preventDefault();
        event.stopPropagation();
        chargeButton?.click();
        return;
      }

      if ((acceptOrderButton || declineOrderButton) && root.contains(acceptOrderButton || declineOrderButton)) {
        event.preventDefault();
        event.stopPropagation();
        const conversation = conversations[activeId];
        const orderId = conversation?.order?.id || conversation?.orderId;
        if (!orderId || !window.Doke?.services?.orders) return;

        if (acceptOrderButton) {
          acceptOrderButton.disabled = true;
          acceptOrderButton.textContent = "Aceitando...";
          window.Doke.services.orders.accept(orderId).then((order) => {
            if (conversation) {
              conversation.order = Object.assign({}, conversation.order || {}, order || {}, { status: "accepted", statusLabel: "Pedido aceito" });
              conversation.lastSeen = "Conversa liberada";
              conversation.lastMessage = "Conversa liberada";
            }
            renderThread(activeId, { scrollTo: "end" });
          }).catch((error) => {
            acceptOrderButton.disabled = false;
            acceptOrderButton.textContent = "Aceitar pedido";
            showCopyToast(error?.message || "Não foi possível aceitar o pedido.");
          });
          return;
        }

        requestDeclineReason(orderId, declineOrderButton).then((reason) => {
          if (!reason || !reason.trim()) return;

          declineOrderButton.disabled = true;
          declineOrderButton.textContent = "Recusando...";
          window.Doke.services.orders.decline(orderId, reason.trim()).then((order) => {
            if (conversation) {
              conversation.order = Object.assign({}, conversation.order || {}, order || {}, { status: "cancelled", statusLabel: "Pedido recusado", refusalReason: reason.trim() });
              conversation.lastSeen = "Pedido recusado";
              conversation.lastMessage = "Pedido recusado";
            }
            renderThread(activeId, { scrollTo: "end" });
          }).catch((error) => {
            declineOrderButton.disabled = false;
            declineOrderButton.textContent = "Recusar";
            showCopyToast(error?.message || "Não foi possível recusar o pedido.");
          });
        });
        return;
      }

      const detailButton = event.target.closest("[data-messages-open-order-detail]");
      if (!detailButton || !root.contains(detailButton)) return;
      event.preventDefault();
      event.stopPropagation();
      openMessagesOrderDetail(detailButton);
    });

    const handleOrderDetailDocumentClick = (event) => {
      const closeButton = event.target.closest("[data-messages-order-detail-close]");
      if (!closeButton) return;
      event.preventDefault();
      closeMessagesOrderDetail();
    };

    const handleOrderDetailKeydown = (event) => {
      if (event.key === "Escape") closeMessagesOrderDetail();
    };

    document.addEventListener("click", handleOrderDetailDocumentClick);
    document.addEventListener("keydown", handleOrderDetailKeydown);
    addRouteCleanup(() => {
      document.removeEventListener("click", handleOrderDetailDocumentClick);
      document.removeEventListener("keydown", handleOrderDetailKeydown);
      closeMessagesOrderDetail();
    });

    const toggleConversationSelectedByItem = (item) => {
      const id = item?.dataset.messageId;
      if (!id || item.dataset.deleted === "true") return;
      if (selectedConversationIds.has(id)) {
        selectedConversationIds.delete(id);
      } else {
        selectedConversationIds.add(id);
      }
      updateConversationSelectionUI();
      syncHeaderControls();
    };

    messagesList?.addEventListener("click", (event) => {
      const item = event.target.closest(".message-item[data-message-id]");
      if (!item || !messagesList.contains(item)) return;
      const id = item.dataset.messageId;
      if (!id || item.dataset.deleted === "true") return;
      if (selectionMode) {
        toggleConversationSelectedByItem(item);
        return;
      }
      setCompactThreadOpen(true);
      renderThread(id, { scrollTo: "start", openOnMobile: true });
    });

    messagesList?.addEventListener("keydown", (event) => {
      const item = event.target.closest(".message-item[data-message-id]");
      if (!item || !messagesList.contains(item)) return;
      if (!selectionMode || (event.key !== " " && event.key !== "Enter")) return;
      event.preventDefault();
      toggleConversationSelectedByItem(item);
    });

    const refreshLocalConversationSurface = ({ preferRequested = false } = {}) => {
      const hadActiveConversation = Boolean(activeId && conversations[activeId]);
      hydrateLocalConversations(root);
      prepareConversationItems();
      refreshConversationCards();
      syncVisibility();
      hydration?.mark('local-conversations');
      const nextConversationFromOrder = requestedOrderId
        ? Object.keys(conversations).find((id) => String(conversations[id]?.orderId || conversations[id]?.order?.id || "") === String(requestedOrderId))
        : "";
      if (preferRequested && !hadActiveConversation) {
        const nextId = (requestedConversationId && conversations[requestedConversationId] ? requestedConversationId : "")
          || nextConversationFromOrder
          || refreshConversationItems().find((item) => item.dataset.messageId && conversations[item.dataset.messageId])?.dataset.messageId
          || "";
        if (nextId) {
          ensureLocalConversationCard(root, nextId, conversations[nextId]);
          prepareConversationItems();
          refreshConversationCards();
          syncVisibility();
          renderThread(nextId, { scrollTo: "start", openOnMobile: Boolean(requestedOrderId || requestedConversationId) });
        }
      }
    };

    hydration?.mark('dom');
    const markMessagesHydrationAuth = () => {
      hydration?.mark('auth');
      refreshLocalConversationSurface({ preferRequested: true });
    };
    document.addEventListener("doke:auth-session-change", markMessagesHydrationAuth);
    document.addEventListener("doke:auth-surface-ready", markMessagesHydrationAuth);
    document.addEventListener("doke:order-created", () => refreshLocalConversationSurface({ preferRequested: true }));
    document.addEventListener("doke:order-status-changed", () => refreshLocalConversationSurface({ preferRequested: true }));
    document.addEventListener("doke:message-sent", () => refreshLocalConversationSurface({ preferRequested: true }));
    document.addEventListener('doke:page-hydration-ready', (event) => {
      if (event.detail?.page !== 'mensagens') return;
      syncVisibility();
    });
    refreshLocalConversationSurface({ preferRequested: true });
    if (document.documentElement.dataset.authSurfaceReady === 'true') {
      hydration?.mark('auth');
    }

    threadBody?.addEventListener("click", (event) => {
      const bubble = event.target.closest("[data-message-bubble]");
      const speedButton = event.target.closest("[data-audio-speed]");
      if (speedButton) {
        event.preventDefault();
        const index = Number(bubble?.dataset.messageIndex || -1);
        const currentMessage = conversations[activeId]?.messages?.[index];
        if (!currentMessage || currentMessage.type !== "audio") return;
        currentMessage.speed = currentMessage.speed === "1x" ? "1.5x" : currentMessage.speed === "1.5x" ? "2x" : "1x";
        speedButton.textContent = currentMessage.speed;
        return;
      }

      const payButton = event.target.closest("[data-message-pay]");
      if (payButton) {
        event.preventDefault();
        const index = Number(bubble?.dataset.messageIndex || -1);
        const currentMessage = conversations[activeId]?.messages?.[index];
        if (!currentMessage || currentMessage.type !== "charge") return;
        confirmChargePayment(currentMessage);
        return;
      }

      const completeButton = event.target.closest("[data-message-complete]");
      if (completeButton) {
        event.preventDefault();
        const index = Number(bubble?.dataset.messageIndex || -1);
        const conversation = conversations[activeId];
        const currentMessage = conversation?.messages?.[index];
        if (!currentMessage || currentMessage.type !== "charge") return;

        if (!openCompletionModal(index, currentMessage)) {
          completeButton.disabled = true;
          completeButton.setAttribute('aria-busy', 'true');
          completeButton.textContent = 'Finalizando...';
          completeChargeMessage(activeId, index)
            .then(() => showCopyToast('Pedido concluído. Avaliação liberada.'))
            .catch((error) => showCopyToast(error?.message || 'Não foi possível concluir o pedido.'));
        }
        return;
      }

      const reviewButton = event.target.closest("[data-message-review]");
      if (reviewButton) {
        event.preventDefault();
        const index = Number(bubble?.dataset.messageIndex || -1);
        const currentMessage = conversations[activeId]?.messages?.[index];
        if (!currentMessage || currentMessage.type !== "charge") return;
        openReviewPageForCharge(currentMessage);
        return;
      }

      if (selectedMessageIndexes.size && bubble) {
        const index = Number(bubble.dataset.messageIndex || -1);
        if (selectedMessageIndexes.has(index)) {
          selectedMessageIndexes.delete(index);
        } else {
          selectedMessageIndexes.add(index);
        }
        renderThread(activeId);
      }
    });

    threadBody?.addEventListener("click", (event) => {
      const image = event.target.closest(".message-bubble__image img");
      if (!image) return;
      openLightbox(image.currentSrc || image.src, image.alt);
    });


    threadBody?.addEventListener("keydown", (event) => {
      const bubble = event.target.closest("[data-message-bubble]");
      if (!bubble || (event.key !== " " && event.key !== "Enter")) return;
      if (!selectedMessageIndexes.size) return;
      event.preventDefault();
      const index = Number(bubble.dataset.messageIndex || -1);
      if (index < 0) return;
      if (selectedMessageIndexes.has(index)) {
        selectedMessageIndexes.delete(index);
      } else {
        selectedMessageIndexes.add(index);
      }
      renderThread(activeId);
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest('.messages-mobile-header') ||
        target.closest('.messages-header-controls') ||
        target.closest('.messages-desktop-toolbar') ||
        target.closest('.message-item') ||
        target.closest('.messages-thread')
      ) return;
      closeFiltersPanel();
      closeThreadCallMenu();
      closeThreadMoreMenu();
      setSearchExpanded(false);
      if (!selectionMode) {
        closeSelectPanel();
      }
      syncHeaderControls();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      setSearchExpanded(false);
      resetActionSurfaces();
      closeThreadCallMenu();
      closeThreadMoreMenu();
    });


    composer?.addEventListener("submit", (event) => {
      event.preventDefault();
      const activeConversation = conversations[activeId];
      if (!activeConversation) {
        showCopyToast("Selecione uma conversa para enviar mensagem.");
        renderEmptyThread();
        return;
      }
      const lockMessage = getConversationLockMessage(activeConversation);
      if (lockMessage) {
        showCopyToast(lockMessage);
        syncComposerLock(activeConversation);
        return;
      }
      const value = String(composerInput?.value || "").trim();
      if (audioDraft && !audioDraft.hidden) {
        const audioMessage = { author: "Você", time: "agora", mine: true, type: "audio", duration: formatAudioTime(Math.max(audioDraftSeconds, 1)), speed: "1x", replyTo: replyToMessage ? { author: replyToMessage.author, text: replyToMessage.text } : null };
        conversations[activeId].messages.push(audioMessage);
        persistConversationMessage(activeId, audioMessage);
        renderThread(activeId, { scrollTo: "end" });
        composer.reset();
        clearReplyPreview();
        resetAudioDraft();
        composerInput?.focus();
        return;
      }
      if (imageDraftSrc) {
        const imageMessage = { author: "Você", time: "agora", mine: true, type: "image", src: imageDraftSrc, replyTo: replyToMessage ? { author: replyToMessage.author, text: replyToMessage.text } : null };
        conversations[activeId].messages.push(imageMessage);
        persistConversationMessage(activeId, imageMessage);
        renderThread(activeId, { scrollTo: "end" });
        composer.reset();
        clearReplyPreview();
        resetImageDraft();
        composerInput?.focus();
        return;
      }
      if (!value) return;
      const textMessage = { author: "Você", time: "agora", text: value, mine: true, replyTo: replyToMessage ? { author: replyToMessage.author, text: replyToMessage.text } : null };
      conversations[activeId].messages.push(textMessage);
      persistConversationMessage(activeId, textMessage);
      renderThread(activeId, { scrollTo: "end" });
      composer.reset();
      clearReplyPreview();
      composerInput?.focus();
    });

    chargeButton?.addEventListener("click", () => {
      const activeConversation = conversations[activeId];
      if (!activeConversation) {
        showCopyToast("Selecione uma conversa para enviar proposta.");
        renderEmptyThread();
        return;
      }
      if (!canUseChargeAction(activeConversation)) {
        syncChargeActionVisibility(activeConversation);
        showCopyToast("Cobrança é uma ação disponível apenas para profissionais.");
        return;
      }
      const lockMessage = getConversationLockMessage(activeConversation);
      if (lockMessage) {
        showCopyToast(lockMessage);
        return;
      }
      openChargeModal();
    });

    threadCallToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleThreadCallMenu();
    });

    threadVideoCallButton?.addEventListener("click", (event) => {
      event.preventDefault();
      startThreadCall("video");
    });

    threadMoreToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleThreadMoreMenu();
    });


    chatFocusToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleChatFocusMode();
    });

    threadCallMenu?.addEventListener("click", (event) => {
      event.stopPropagation();
      const action = event.target.closest("[data-thread-call-action]")?.dataset.threadCallAction;
      if (!action) return;
      startThreadCall(action === "video" ? "video" : "audio");
    });

    threadMoreMenu?.addEventListener("click", (event) => {
      event.stopPropagation();
      const action = event.target.closest("[data-thread-more-action]")?.dataset.threadMoreAction;
      if (!action) return;
      if (action === "search") {
        setSearchExpanded(true);
        window.setTimeout(() => getVisibleSearchInput()?.focus(), 20);
      } else if (action === "archive") {
        if (conversations[activeId]) conversations[activeId].archived = true;
        syncVisibility();
        showCopyToast("Conversa arquivada");
      } else if (action === "mute") {
        showCopyToast("Conversa silenciada");
      } else if (action === "profile") {
        showCopyToast("Perfil do contato");
      } else if (action === "media") {
        showCopyToast("Mídias e arquivos");
      } else if (action === "block") {
        showCopyToast("Ação registrada");
      }
      closeThreadMoreMenu();
    });

    chargeForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!conversations[activeId]) return;
      const normalized = String(chargeAmountInput?.value || "").trim();
      if (!normalized) return;
      const chargeMessage = {
        author: "Você",
        time: "agora",
        text: "Proposta pronta para aprovação. Você pode pagar por aqui para confirmar o atendimento.",
        mine: true,
        senderId: getCurrentUserId(),
        type: "charge",
        amount: normalized.startsWith("R$") ? normalized : `R$ ${normalized}`,
        installments: chargeInstallments?.selectedOptions?.[0]?.textContent || "À vista",
        paid: false
      };
      conversations[activeId].messages.push(chargeMessage);
      persistConversationMessage(activeId, chargeMessage)
        .then((savedMessage) => {
          if (savedMessage) Object.assign(chargeMessage, savedMessage);
          return updateOrderFromConversation('quoted', {
            amount: chargeMessage.amount,
            budget: chargeMessage.amount,
            installments: chargeMessage.installments
          });
        })
        .then(() => {
          closeChargeModal();
          renderThread(activeId, { scrollTo: "end" });
          showCopyToast('Proposta enviada ao cliente.');
        })
        .catch((error) => showCopyToast(error?.message || 'Não foi possível enviar a proposta.'));
    });

    chargeCancelButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeChargeModal();
      });
    });


    completionCloseButtons.forEach((button) => {
      button.addEventListener('click', closeCompletionModal);
    });

    completionConfirm?.addEventListener('change', () => {
      if (completionError) completionError.hidden = true;
    });

    completionSubmit?.addEventListener('click', () => {
      if (!pendingCompletion) return;
      if (completionConfirm && !completionConfirm.checked) {
        if (completionError) completionError.hidden = false;
        completionConfirm.focus();
        return;
      }
      if (completionError) completionError.hidden = true;
      completionSubmit.disabled = true;
      completionSubmit.setAttribute('aria-busy', 'true');
      completionSubmit.textContent = 'Confirmando...';

      completeChargeMessage(pendingCompletion.conversationId, pendingCompletion.messageIndex)
        .then((message) => {
          setCompletionPanel('success');
          pendingCompletion.message = message;
        })
        .catch((error) => {
          if (completionError) {
            completionError.textContent = error?.message || 'Não foi possível finalizar o pedido.';
            completionError.hidden = false;
          }
        })
        .finally(() => {
          completionSubmit.disabled = false;
          completionSubmit.removeAttribute('aria-busy');
          completionSubmit.textContent = 'Confirmar conclusão';
        });
    });

    completionReview?.addEventListener('click', () => {
      const currentMessage = pendingCompletion?.message
        || conversations[pendingCompletion?.conversationId || activeId]?.messages?.[pendingCompletion?.messageIndex ?? -1];
      if (currentMessage) openReviewPageForCharge(currentMessage);
    });

    completionModal?.addEventListener('click', (event) => {
      if (event.target.closest('[data-message-completion-close]')) closeCompletionModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && completionModal && !completionModal.hidden) closeCompletionModal();
    });

    composer?.addEventListener("click", (event) => {
      const closeButton = event.target.closest("[data-messages-reply-close]");
      const cancelImageButton = event.target.closest("[data-messages-image-cancel]");
      if (closeButton) {
        event.preventDefault();
        event.stopPropagation();
        clearReplyPreview();
        return;
      }
      if (cancelImageButton) {
        event.preventDefault();
        event.stopPropagation();
        resetImageDraft();
      }
    });

    imageInput?.addEventListener("change", () => {
      if (!imageInput.files?.length) return;
      const file = imageInput.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        imageDraftSrc = String(reader.result || "");
        if (imagePreview) imagePreview.src = imageDraftSrc;
        imageDraft?.removeAttribute("hidden");
        updateComposerDraftState();
      };
      reader.readAsDataURL(file);
    });

    emojiButton?.addEventListener("click", () => {
      if (!composerInput) return;
      composerInput.value = `${composerInput.value || ""} 🙂`;
      composerInput.focus();
    });

    audioButton?.setAttribute("aria-pressed", "false");

    audioButton?.addEventListener("click", () => {
      if (audioDraft && !audioDraft.hidden) {
        resetAudioDraft();
        return;
      }
      startAudioDraft();
    });

    audioCancelButton?.addEventListener("click", () => {
      resetAudioDraft();
    });

    selectionClear?.addEventListener("click", () => {
      clearSelection();
      renderThread(activeId);
    });

    selectionDelete?.addEventListener("click", () => {
      const conversation = conversations[activeId];
      if (!conversation || !selectedMessageIndexes.size) return;
      conversation.messages = conversation.messages.filter((_, index) => !selectedMessageIndexes.has(index));
      clearSelection();
      renderThread(activeId);
    });

    selectionForward?.addEventListener("click", () => {
      if (!selectedMessageIndexes.size) return;
      showCopyToast("Encaminhado");
      clearSelection();
      renderThread(activeId);
    });

    backButton?.addEventListener("click", () => {
      setCompactThreadOpen(false);
      replyPreview?.setAttribute("hidden", "");
      audioDraft?.setAttribute("hidden", "");
      imageDraft?.setAttribute("hidden", "");
    });

    document.querySelectorAll('.sidebar a[href="mensagens.html"], .mobile-header-shortcut[href="mensagens.html"]').forEach((link) => {
      if (link.dataset.messagesNavBound === "true") return;
      link.dataset.messagesNavBound = "true";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.DokeNavigate?.("mensagens.html");
      });
    });

    lightboxClose?.addEventListener("click", closeLightbox);

    lightbox?.addEventListener("click", (event) => {
      const surface = event.target.closest(".image-lightbox__surface");
      if (!surface || event.target === surface) closeLightbox();
      if (event.target === lightbox) closeLightbox();
    });

    const handleMessagesResize = () => {
      if (!root.isConnected || document.body?.dataset.page !== "mensagens") {
        window.removeEventListener("resize", handleMessagesResize);
        clearMessagesRouteState();
        return;
      }
      syncComposerPlaceholder();
      setCompactThreadOpen(root.dataset.messagesMode === "thread");
      closeFiltersPanel();
      if (selectionMode) {
        openSelectPanel();
      } else {
        closeSelectPanel();
      }
      setSearchExpanded(false);
      syncHeaderControls();
    };
    window.addEventListener("resize", handleMessagesResize);
    addRouteCleanup(() => window.removeEventListener("resize", handleMessagesResize));

    syncFilterButtons();
    setSearchExpanded(false);
    closeFiltersPanel();
    closeSelectPanel();
    syncVisibility();
    syncPaymentFlowFromQuery();
    refreshConversationCards();
    clearReplyPreview();
    clearSelection();
    resetAudioDraft();
    resetImageDraft();
    syncComposerPlaceholder();
    renderThread(activeId, { scrollTo: "start" });
    if (isCompactThreadViewport()) {
      setCompactThreadOpen(false);
    }
  };

  window.DokeInitMessages = initMessagesPage;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMessagesPage, { once: true });
  } else {
    initMessagesPage();
  }
})();

(() => {
  const initDesktopFiltersFallback = () => {
    const root = document.querySelector("[data-messages-page]");
    const toggles = Array.from(root?.querySelectorAll("[data-messages-filter-toggle]") || []);
    const panel = root?.querySelector("[data-messages-desktop-filters-panel]");
    if (!root || !toggles.length || !panel || panel.dataset.filtersFallbackBound === "true") return;
    panel.dataset.filtersFallbackBound = "true";

    const setExpanded = (expanded) => {
      toggles.forEach((toggle) => {
        toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      });
    };

    toggles.forEach((toggle) => {
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        setExpanded(willOpen);
      }, true);
    });

    panel.querySelectorAll("[data-messages-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        window.setTimeout(() => {
          panel.hidden = false;
          setExpanded(true);
        }, 0);
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDesktopFiltersFallback, { once: true });
  } else {
    initDesktopFiltersFallback();
  }
})();


(() => {
  const initInternalMobileHeaderMenu = () => {
    const toggle = document.querySelector('[data-internal-mobile-menu-toggle]');
    const menu = document.querySelector('[data-internal-mobile-menu]');
    if (!toggle || !menu || toggle.dataset.bound === 'true') return;
    toggle.dataset.bound = 'true';

    const close = () => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });

    menu.addEventListener('click', (event) => event.stopPropagation());

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-internal-mobile-menu]') || target.closest('[data-internal-mobile-menu-toggle]')) return;
      close();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInternalMobileHeaderMenu, { once: true });
  } else {
    initInternalMobileHeaderMenu();
  }
})();

(() => {
  const initMessagesHeaderParity = () => {
    const pageRoot = document.querySelector('[data-messages-page]');
    const body = document.body;
    if (!pageRoot || !body || body.dataset.messagesHeaderParityReady === 'true') return;
    body.dataset.messagesHeaderParityReady = 'true';

    const searchToggle = document.querySelector('[data-messages-header-search-toggle]');
    const filterToggle = document.querySelector('[data-messages-header-filter-toggle]');
    const searchInput = pageRoot.querySelector('[data-messages-search-input]');
    const filterPanel = pageRoot.querySelector('[data-messages-desktop-filters-panel]');
    const internalFilterToggle = pageRoot.querySelector('[data-messages-filter-toggle]');

    const syncFilterState = (expanded) => {
      [filterToggle, internalFilterToggle].filter(Boolean).forEach((toggle) => {
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    };

    searchToggle?.addEventListener('click', () => {
      const willOpen = !body.classList.contains('is-messages-header-search-open');
      body.classList.toggle('is-messages-header-search-open', willOpen);
      searchToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) window.requestAnimationFrame(() => searchInput?.focus());
    });

    pageRoot.querySelectorAll('.messages-sidebar-search__close').forEach((button) => {
      button.addEventListener('click', () => {
        body.classList.remove('is-messages-header-search-open');
        searchToggle?.setAttribute('aria-expanded', 'false');
      });
    });

    filterToggle?.addEventListener('click', (event) => {
      if (!filterPanel) return;
      event.preventDefault();
      const willOpen = filterPanel.hidden;
      filterPanel.hidden = !willOpen;
      syncFilterState(willOpen);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMessagesHeaderParity, { once: true });
  } else {
    initMessagesHeaderParity();
  }
})();

/* Mensagens — rota tipo app: evita restauração de scroll entre reloads/zoom. */
(() => {
  if (document.body?.dataset.page !== 'mensagens') return;

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  const resetMessagesViewport = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    [
      document.querySelector('.app-shell'),
      document.querySelector('.page'),
      document.querySelector('.page__content'),
      document.querySelector('.messages-shell-content'),
      document.querySelector('.messages-app'),
      document.querySelector('.messages-sidebar'),
      document.querySelector('.messages-thread__body')
    ].filter(Boolean).forEach((node) => {
      node.scrollTop = 0;
      node.scrollLeft = 0;
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(resetMessagesViewport), { once: true });
  } else {
    requestAnimationFrame(resetMessagesViewport);
  }
})();

/* Mensagens — sincroniza medidas do workspace em zoom baixo sem aplicar estilo inline. */
(() => {
  if (document.body?.dataset.page !== 'mensagens') return;

  const root = document.documentElement;
  const readSidebarWidth = () => {
    const sidebar = document.querySelector('.app-shell > .sidebar, .app-shell > [data-shell-sidebar]');
    const rect = sidebar?.getBoundingClientRect();
    const fallback = parseFloat(getComputedStyle(root).getPropertyValue('--doke-desktop-sidebar-width')) || 272;
    return Math.max(0, Math.round(rect?.width || fallback));
  };

  const stopMessagesWorkspaceMetrics = () => {
    window.removeEventListener('resize', syncMessagesWorkspaceMetrics);
    window.visualViewport?.removeEventListener('resize', syncMessagesWorkspaceMetrics);
    window.visualViewport?.removeEventListener('scroll', syncMessagesWorkspaceMetrics);
    root.style.removeProperty('--messages-shell-sidebar-width');
    root.style.removeProperty('--messages-app-inline-size');
  };

  const syncMessagesWorkspaceMetrics = () => {
    if (document.body?.dataset.page !== 'mensagens') {
      stopMessagesWorkspaceMetrics();
      return;
    }
    const viewportWidth = Math.round(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0);
    const sidebarWidth = readSidebarWidth();
    root.style.setProperty('--messages-shell-sidebar-width', `${sidebarWidth}px`);
    root.style.setProperty('--messages-app-inline-size', `${Math.max(0, viewportWidth - sidebarWidth)}px`);
  };

  syncMessagesWorkspaceMetrics();
  window.addEventListener('resize', syncMessagesWorkspaceMetrics, { passive: true });
  window.visualViewport?.addEventListener('resize', syncMessagesWorkspaceMetrics, { passive: true });
  window.visualViewport?.addEventListener('scroll', syncMessagesWorkspaceMetrics, { passive: true });
  document.addEventListener('doke:route-leaving', (event) => {
    if (event.detail?.from === '/mensagens.html') stopMessagesWorkspaceMetrics();
  });
})();
