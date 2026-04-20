(() => {
  const conversations = {
    painting: {
      avatar: "assets/img/auth/carpenter-cutout.png",
      name: "Studio Aquarela",
      lastSeen: "Online agora",
      unread: 2,
      group: "orders",
      messages: [
        { author: "Studio Aquarela", time: "09:12", text: "Recebemos seu pedido e já separamos uma proposta base para pintura interna com pequenos reparos.", mine: false },
        { author: "Você", time: "09:18", text: "Perfeito. Quero entender prazo, matériais incluídos e se vocês conseguem começar ainda esta semana.", mine: true },
        { author: "Studio Aquarela", time: "09:26", text: "Conseguimos iniciar em até 7 dias. Tinta, proteção e acabamento já entram no orçamento.", mine: false },
        { author: "Studio Aquarela", time: "09:27", text: "Se fizer sentido, posso te enviar agora a versão fechada da proposta para aprovação.", mine: false }
      ]
    },
    "living-room": {
      avatar: "assets/img/auth/marceneira-hero.png",
      name: "Casa Viva Reformas",
      lastSeen: "Visto há 12 min",
      unread: 1,
      group: "orders",
      messages: [
        { author: "Casa Viva Reformas", time: "11:48", text: "Analisei as fotos e dá para concentrar a obra em 3 frentes: gesso, pintura e marcenaria leve.", mine: false },
        { author: "Você", time: "11:54", text: "Quero priorizar primeiro a pintura e os ajustes de elétrica. Marcenaria pode ficar para uma segunda etapa.", mine: true },
        { author: "Casa Viva Reformas", time: "12:11", text: "Fechado. Com essa divisão, o prazo fica mais confortável e consigo te mandar um escopo enxuto ainda hoje.", mine: false }
      ]
    },
    electrical: {
      avatar: "assets/img/auth/carpenter-cutout.png",
      name: "Luz Técnica",
      lastSeen: "Visto ontem",
      unread: 0,
      group: "orders",
      messages: [
        { author: "Luz Técnica", time: "Ontem", text: "Finalizamos a instalação elétrica e deixamos o quadro identificado para facilitar manutenção futura.", mine: false },
        { author: "Você", time: "Ontem", text: "Recebi tudo certo. Obrigado pelo cuidado com a limpeza e a organização.", mine: true },
        { author: "Luz Técnica", time: "Ontem", text: "Quando puder, deixe sua avaliação aqui na plataforma para encerrar o atendimento.", mine: false }
      ]
    },
    amanda: {
      avatar: "assets/img/auth/marceneira-hero.png",
      name: "Amanda Rocha",
      lastSeen: "Online há 5 min",
      unread: 0,
      group: "contacts",
      messages: [
        { author: "Amanda Rocha", time: "08:33", text: "Conseguiu fechar com aquele profissional que eu te indiquei?", mine: false },
        { author: "Você", time: "08:37", text: "Consegui sim. O atendimento foi ótimo e já estamos alinhando o orçamento.", mine: true },
        { author: "Amanda Rocha", time: "08:40", text: "Fechou, depois me manda as fotos daquele ambiente.", mine: false }
      ]
    },
    marcos: {
      avatar: "assets/img/auth/carpenter-cutout.png",
      name: "Marcos Lima",
      lastSeen: "Visto ontem às 20:18",
      unread: 0,
      group: "contacts",
      messages: [
        { author: "Marcos Lima", time: "Ontem", text: "Valeu por indicar o profissional. Gostei bastante do atendimento.", mine: false },
        { author: "Você", time: "Ontem", text: "Boa. Depois me conta como ficou o resultado final.", mine: true }
      ]
    }
  };


  conversations.marcos.archived = true;
  conversations.electrical.archived = false;

  const initMessagesPage = () => {
    const root = document.querySelector("[data-messages-page]");
    if (!root || root.dataset.messagesReady === "true") return;
    root.dataset.messagesReady = "true";

    const drawerController = new AbortController();
    window.DokeHomeDrawer?.create({ signal: drawerController.signal })?.();

    const items = Array.from(root.querySelectorAll(".message-item[data-message-id]"));
    const searchForms = Array.from(root.querySelectorAll("[data-messages-search-form]"));
    const searchInputs = Array.from(root.querySelectorAll("[data-messages-search-input]"));
    const searchInput = searchInputs[0] || null;
    const resetSearchButton = root.querySelector("[data-messages-reset-search]");
    const emptyStaté = root.querySelector("[data-messages-empty]");
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
    const searchCloseButtons = Array.from(root.querySelectorAll(".orders-header-search__close"));
    const mobileSearchButton = root.querySelector("[data-messages-mobile-search-toggle]");
    const filterToggles = Array.from(root.querySelectorAll("[data-messages-filter-toggle]"));
    const filtersPanel = root.querySelector("[data-messages-filters-panel]");
    const filterButtons = Array.from(root.querySelectorAll("[data-messages-filter]"));
    const archiveToggles = Array.from(root.querySelectorAll("[data-messages-archive-toggle]"));
    const clearFilterButton = root.querySelector("[data-messages-clear-filter]");
    const activeChip = root.querySelector("[data-messages-active-chip]");
    const headerControls = root.querySelector('.messages-header-controls');
    const selectToggles = Array.from(root.querySelectorAll("[data-messages-select-toggle]"));
    const selectPanel = root.querySelector("[data-messages-select-panel]");
    const selectModeButtons = Array.from(root.querySelectorAll("[data-messages-select-mode]"));
    const deleteConversationButton = root.querySelector("[data-messages-delete-conversations]");
    const imageInput = root.querySelector("[data-messages-image-input]");
    const emojiButton = root.querySelector("[data-messages-emoji]");
    const audioButton = root.querySelector("[data-messages-audio]");
    const messageMenu = root.querySelector("[data-message-menu]");
    const replyPreview = root.querySelector("[data-messages-reply-preview]");
    const replyAuthor = root.querySelector("[data-messages-reply-author]");
    const replyText = root.querySelector("[data-messages-reply-text]");
    const replyClose = root.querySelector("[data-messages-reply-close]");
    const copyToast = root.querySelector("[data-messages-copy-toast]");
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

    let contextMessageIndex = -1;
    let longPressTimer = null;
    let activeBubble = null;
    let selectedMessageIndexes = new Set();
    let selectedConversationIds = new Set();
    let currentFilter = "all";
    let selectionMode = false;
    let replyToMessage = null;
    let copyToastTimer = null;
    let audioDraftSeconds = 0;
    let audioDraftTimer = null;
    let imageDraftSrc = "";

    const syncComposerPlaceholder = () => {
      if (!composerInput) return;
      composerInput.placeholder = window.innerWidth <= 760 ? "Mensagem..." : "Digite sua mensagem...";
    };

    const pageParams = new URLSearchParams(window.location.search);
    let activeId = pageParams.get("conversation") && conversations[pageParams.get("conversation")] ? pageParams.get("conversation") : "painting";
    const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const getLatéstChargeMessage = (conversationId) => {
      const messages = conversations[conversationId]?.messages || [];
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (messages[index]?.type === "charge") return messages[index];
      }
      return null;
    };
    const syncPaymentFlowFromQuery = () => {
      const conversationId = pageParams.get("conversation");
      if (!conversationId || !conversations[conversationId]) return;
      const charge = getLatéstChargeMessage(conversationId);
      if (!charge) return;

      if (pageParams.get("payment") === "success") {
        charge.paid = true;
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
    const openPaymentPage = (message) => {
      const query = new URLSearchParams({
        amount: message.amount || "R$ 0,00",
        installments: message.installments || "À vista",
        professional: conversations[activeId]?.name || "Profissional",
        description: message.text || "Cobrança enviada na conversa.",
        avatar: conversations[activeId]?.avatar || "",
        title: `Cobrança de ${conversations[activeId]?.name || "profissional"}`,
        conversation: activeId
      });

      const nextUrl = `pagamento.html?${query.toString()}`;
      if (window.DokeNavigate) {
        window.DokeNavigate(nextUrl);
      } else {
        window.location.href = nextUrl;
      }
    };


    const syncCounts = () => {
      const visibleItems = items.filter((item) => !item.hidden && item.dataset.deleted !== "true");
      const orders = visibleItems.filter((item) => conversations[item.dataset.messageId]?.group === "orders").length;
      const contacts = visibleItems.filter((item) => conversations[item.dataset.messageId]?.group === "contacts").length;
      const unread = visibleItems.reduce((total, item) => total + Number(conversations[item.dataset.messageId]?.unread || 0), 0);
      if (ordersCount) ordersCount.textContent = String(orders);
      if (contactsCount) contactsCount.textContent = String(contacts);
      if (mobileCount) mobileCount.textContent = String(unread);
    };

    const setSearchExpanded = (expanded) => {
      root.classList.toggle("is-search-open", expanded);
      mobileSearchButton?.setAttribute("aria-expanded", expanded ? "true" : "false");
      if (!expanded) {
        searchCloseButtons.forEach((button) => button.blur());
      }
    };

    const setToggleExpanded = (toggles, expanded) => {
      toggles.forEach((toggle) => toggle.setAttribute("aria-expanded", expanded ? "true" : "false"));
    };

    const syncHeaderControls = () => {
      if (!headerControls) return;
      const showStatus = activeChip && !activeChip.hidden;
      headerControls.hidden = !Boolean(showStatus || (filtersPanel && !filtersPanel.hidden) || (selectPanel && !selectPanel.hidden));
    };

    const closeFiltersPanel = () => {
      if (filtersPanel) filtersPanel.hidden = true;
      setToggleExpanded(filterToggles, false);
      syncHeaderControls();
    };

    const closeSelectPanel = () => {
      if (selectPanel) selectPanel.hidden = true;
      setToggleExpanded(selectToggles, false);
      syncHeaderControls();
    };

    const setSelectionMode = (enabled) => {
      selectionMode = enabled;
      root.classList.toggle("is-selection-mode", enabled);
      if (!enabled) setToggleExpanded(selectToggles, false);
      if (!enabled) {
        selectedConversationIds.clear();
        items.forEach((item) => item.classList.remove("is-selected"));
      }
    };

    const syncActiveFilterChip = () => {
      if (!activeChip || !clearFilterButton) return;
      const labels = {
        all: "Tudo",
        unread: "Não lidas",
        orders: "Pedidos",
        contacts: "Conversas",
        archived: "Arquivadas"
      };
      activeChip.textContent = labels[currentFilter] || "Tudo";
      activeChip.hidden = currentFilter === "all";
      clearFilterButton.hidden = currentFilter === "all";
      archiveToggles.forEach((button) => button.setAttribute("aria-pressed", currentFilter === "archived" ? "true" : "false"));
      syncHeaderControls();
    };

    const resetActionSurfaces = () => {
      closeFiltersPanel();
      closeSelectPanel();
      setSelectionMode(false);
    };

    const getSearchQuery = () => normalize(searchInputs.find((input) => String(input.value || "").trim())?.value || "");

    const matchesConversationFilter = (conversation) => {
      if (!conversation) return false;
      if (currentFilter === "all") return true;
      if (currentFilter === "unread") return Number(conversation.unread || 0) > 0;
      if (currentFilter === "orders") return conversation.group === "orders";
      if (currentFilter === "contacts") return conversation.group === "contacts";
      if (currentFilter === "archived") return conversation.archived === true;
      return true;
    };

    const getMessagePreview = (message) => {
      if (!message) return "";
      if (message.type === "audio") return "Audio enviado";
      if (message.type === "image") return "Imagem enviada";
      if (message.type === "charge") return `Cobrança ${message.amount}`;
      return String(message.text || "");
    };

    const refreshConversationCards = () => {
      items.forEach((item) => {
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


    const renderThread = (id) => {
      const conversation = conversations[id];
      if (!conversation || !threadBody) return;
      const isSameThread = activeId === id;
      activeId = id;
      contextMessageIndex = -1;
      if (!isSameThread) clearSelection();
      clearReplyPreview();
      messageMenu?.setAttribute("hidden", "");
      activeBubble?.classList.remove("is-context-target");
      activeBubble = null;
      items.forEach((item) => item.classList.toggle("is-active", item.dataset.messageId === id));
      if (threadAvatar) threadAvatar.src = conversation.avatar;
      if (threadName) threadName.textContent = conversation.name;
      if (threadLastSeen) threadLastSeen.textContent = conversation.lastSeen;
      if (threadEmpty) threadEmpty.hidden = conversation.messages.length !== 0;
      if (threadBody) threadBody.hidden = conversation.messages.length === 0;
      threadBody.innerHTML = conversation.messages.map((message, index) => `
        <article class="message-row${message.mine ? " message-row--me" : ""}" data-message-index="${index}">
          ${message.mine ? "" : `<img class="message-row__avatar" src="${conversation.avatar}" alt="Foto de perfil de ${conversation.name}">`}
          <div class="message-bubble${message.mine ? " message-bubble--me" : ""}${message.type === "image" ? " message-bubble--image-only" : ""}${selectedMessageIndexes.has(index) ? " is-selected" : ""}" data-message-bubble data-message-index="${index}">
            <div class="message-bubble__meta">
              <span>${message.author}</span>
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
              <button class="message-bubble__audio-speed" type="button" data-audio-speed>${message.speed || "1x"}</button>
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
        chargeCard.className = "message-bubble__charge";
        const chargeStatus = message.reviewed
          ? "Atendimento avaliado"
          : message.completed
            ? "Aguardando avaliação"
            : message.paid
              ? "Pagamento confirmado"
              : "Aguardando pagamento";
        const chargeAction = message.reviewed
          ? ""
          : message.completed
            ? `<button class="message-bubble__charge-pay is-done" type="button" data-message-review>Avaliar</button>`
            : message.paid
              ? `<button class="message-bubble__charge-pay is-complete" type="button" data-message-complete>Finalizar pedido</button>`
              : `<button class="message-bubble__charge-pay" type="button" data-message-pay>Pagar</button>`;
        chargeCard.innerHTML = `
          <div class="message-bubble__charge-head">
            <span class="message-bubble__charge-label">Cobrança</span>
            <strong class="message-bubble__charge-value">${message.amount}</strong>
          </div>
          <div class="message-bubble__charge-text">${message.text}</div>
          <div class="message-bubble__charge-text">${message.installments || "À vista"}</div>
          <div class="message-bubble__charge-actions">
            <span class="message-bubble__charge-status">${chargeStatus}</span>
            ${chargeAction}
          </div>
        `;
        bubble.appendChild(chargeCard);
      });
      syncSelectionBar();
      refreshConversationCards();
      if (window.innerWidth <= 767) {
        root.classList.add("messages-app--thread-open");
      }
    };

    const hideMessageMenu = () => {
      messageMenu?.setAttribute("hidden", "");
      activeBubble?.classList.remove("is-context-target");
      activeBubble = null;
      contextMessageIndex = -1;
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
    };

    const startAudioDraft = () => {
      if (!audioDraft) return;
      audioDraft.removeAttribute("hidden");
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
      if (imageInput) imageInput.value = "";
    };

    const showCopyToast = (label = "Copiado") => {
      if (!copyToast) return;
      copyToast.textContent = label;
      copyToast.hidden = false;
      if (copyToastTimer) window.clearTimeout(copyToastTimer);
      copyToastTimer = window.setTimeout(() => {
        copyToast.hidden = true;
      }, 900);
    };

    const clearReplyPreview = () => {
      replyToMessage = null;
      replyPreview?.setAttribute("hidden", "");
      if (replyAuthor) replyAuthor.textContent = "Respondendo";
      if (replyText) replyText.textContent = "";
    };

    const setReplyPreview = (message) => {
      replyToMessage = message;
      if (replyAuthor) replyAuthor.textContent = `Respondendo a ${message.author}`;
      if (replyText) replyText.textContent = String(message.text || "").slice(0, 72);
      replyPreview?.removeAttribute("hidden");
      composerInput?.focus();
    };

    const openMessageMenu = (bubble, x, y) => {
      if (!messageMenu || !bubble) return;
      activeBubble?.classList.remove("is-context-target");
      activeBubble = bubble;
      bubble.classList.add("is-context-target");
      contextMessageIndex = Number(bubble.dataset.messageIndex || -1);
      messageMenu.hidden = false;
      const menuWidth = 180;
      const menuHeight = 150;
      const left = Math.min(Math.max(12, x), window.innerWidth - menuWidth - 12);
      const top = Math.min(Math.max(12, y), window.innerHeight - menuHeight - 12);
      messageMenu.style.left = `${left}px`;
      messageMenu.style.top = `${top}px`;
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

    const syncVisibility = () => {
      const query = getSearchQuery();
      let visibleCount = 0;
      items.forEach((item) => {
        const conversation = conversations[item.dataset.messageId];
        const notDeleted = item.dataset.deleted !== "true";
        const matchesFilter = matchesConversationFilter(conversation);
        const visible = notDeleted && matchesFilter && (!query || normalize(item.textContent).includes(query));
        item.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      if (emptyStaté) emptyStaté.hidden = visibleCount !== 0;
      syncCounts();
      syncActiveFilterChip();
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

    mobileSearchButton?.addEventListener("click", () => {
      const willOpen = !root.classList.contains("is-search-open");
      setSearchExpanded(willOpen);
      if (willOpen) {
        window.setTimeout(() => searchInputs[0]?.focus(), 20);
      }
      closeFiltersPanel();
      closeSelectPanel();
    });

    filterToggles.forEach((toggle) => toggle.addEventListener("click", () => {
      const willOpen = filtersPanel?.hidden !== false;
      if (filtersPanel) filtersPanel.hidden = !willOpen;
      setToggleExpanded(filterToggles, willOpen);
      closeSelectPanel();
      setSearchExpanded(false);
      syncHeaderControls();
    }));

    archiveToggles.forEach((toggle) => toggle.addEventListener("click", () => {
      currentFilter = currentFilter === "archived" ? "all" : "archived";
      closeFiltersPanel();
      closeSelectPanel();
      setSearchExpanded(false);
      syncVisibility();
    }));

    filterButtons.forEach((button) => button.addEventListener("click", () => {
      currentFilter = button.dataset.messagesFilter || "all";
      filterButtons.forEach((node) => node.classList.toggle("is-active", node === button));
      syncVisibility();
      closeFiltersPanel();
    }));

    clearFilterButton?.addEventListener("click", () => {
      currentFilter = "all";
      filterButtons.forEach((node) => node.classList.toggle("is-active", node.dataset.messagesFilter === "all"));
      syncVisibility();
    });

    selectToggles.forEach((toggle) => toggle.addEventListener("click", () => {
      const willOpen = selectPanel?.hidden !== false;
      if (selectPanel) selectPanel.hidden = !willOpen;
      setToggleExpanded(selectToggles, willOpen);
      closeFiltersPanel();
      setSearchExpanded(false);
      setSelectionMode(willOpen);
      syncHeaderControls();
    }));

    selectModeButtons.forEach((button) => button.addEventListener("click", () => {
      const mode = button.dataset.messagesSelectMode;
      setSelectionMode(true);
      if (mode === "all") {
        selectedConversationIds = new Set(items.filter((item) => !item.hidden && item.dataset.deleted !== "true").map((item) => item.dataset.messageId));
        items.forEach((item) => item.classList.toggle("is-selected", selectedConversationIds.has(item.dataset.messageId)));
      } else {
        selectedConversationIds.clear();
        items.forEach((item) => item.classList.remove("is-selected"));
      }
      closeSelectPanel();
    }));

    deleteConversationButton?.addEventListener("click", () => {
      if (!selectedConversationIds.size) return;
      items.forEach((item) => {
        if (selectedConversationIds.has(item.dataset.messageId)) {
          item.dataset.deleted = "true";
          item.hidden = true;
        }
      });
      setSelectionMode(false);
      syncVisibility();
    });

    resetSearchButton?.addEventListener("click", () => {
      searchInputs.forEach((node) => { node.value = ""; });
      currentFilter = "all";
      filterButtons.forEach((node) => node.classList.toggle("is-active", node.dataset.messagesFilter === "all"));
      syncVisibility();
    });

    items.forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.dataset.messageId;
        if (!id || item.dataset.deleted === "true") return;
        if (selectionMode) {
          if (selectedConversationIds.has(id)) {
            selectedConversationIds.delete(id);
            item.classList.remove("is-selected");
          } else {
            selectedConversationIds.add(id);
            item.classList.add("is-selected");
          }
          return;
        }
        renderThread(id);
      });
    });

    threadBody?.addEventListener("contextmenu", (event) => {
      const bubble = event.target.closest("[data-message-bubble]");
      if (!bubble) return;
      event.preventDefault();
      openMessageMenu(bubble, event.clientX, event.clientY);
    });

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
        openPaymentPage(currentMessage);
        return;
      }

      const completeButton = event.target.closest("[data-message-complete]");
      if (completeButton) {
        event.preventDefault();
        const index = Number(bubble?.dataset.messageIndex || -1);
        const currentMessage = conversations[activeId]?.messages?.[index];
        if (!currentMessage || currentMessage.type !== "charge") return;
        const query = new URLSearchParams({
          conversation: activeId,
          professional: conversations[activeId]?.name || "Profissional",
          amount: currentMessage.amount || "R$ 0,00",
          installments: currentMessage.installments || "À vista",
          description: currentMessage.text || "Finalize o pedido para liberar o atendimento.",
          avatar: conversations[activeId]?.avatar || "",
          title: `Finalizar pedido com ${conversations[activeId]?.name || "profissional"}`
        });
        const nextUrl = `finalizar-pedido.html?${query.toString()}`;
        if (window.DokeNavigate) {
          window.DokeNavigate(nextUrl);
        } else {
          window.location.href = nextUrl;
        }
        return;
      }

      const reviewButton = event.target.closest("[data-message-review]");
      if (reviewButton) {
        event.preventDefault();
        const index = Number(bubble?.dataset.messageIndex || -1);
        const currentMessage = conversations[activeId]?.messages?.[index];
        if (!currentMessage || currentMessage.type !== "charge") return;
        const query = new URLSearchParams({
          conversation: activeId,
          professional: conversations[activeId]?.name || "Profissional",
          amount: currentMessage.amount || "R$ 0,00",
          avatar: conversations[activeId]?.avatar || "",
          title: `Avaliar ${conversations[activeId]?.name || "profissional"}`
        });
        const nextUrl = `avaliacao.html?${query.toString()}`;
        if (window.DokeNavigate) {
          window.DokeNavigate(nextUrl);
        } else {
          window.location.href = nextUrl;
        }
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

    threadBody?.addEventListener("pointerdown", (event) => {
      const bubble = event.target.closest("[data-message-bubble]");
      if (!bubble || event.pointerType === "mouse") return;
      longPressTimer = window.setTimeout(() => {
        openMessageMenu(bubble, event.clientX || 24, event.clientY || 24);
      }, 420);
    });

    ["pointerup", "pointercancel", "pointermove", "scroll"].forEach((eventName) => {
      threadBody?.addEventListener(eventName, () => {
        if (longPressTimer) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (messageMenu?.hidden) return;
      if (event.target.closest("[data-message-menu]")) return;
      if (event.target.closest("[data-message-bubble]")) return;
      hideMessageMenu();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.messages-mobile-header') || target.closest('.messages-header-controls')) return;
      resetActionSurfaces();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      setSearchExpanded(false);
      resetActionSurfaces();
      hideMessageMenu();
    });

    messageMenu?.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-message-action]")?.dataset.messageAction;
      const conversation = conversations[activeId];
      const message = conversation?.messages?.[contextMessageIndex];
      if (!action || !message) return;

      if (action === "select") {
        selectedMessageIndexes.add(contextMessageIndex);
        renderThread(activeId);
      }

      if (action === "reply" && composerInput) {
        setReplyPreview(message);
      }

      if (action === "copy") {
        try {
          await navigator.clipboard.writeText(message.text);
        } catch (_) {
          composerInput && (composerInput.value = message.text);
        }
        showCopyToast();
      }

      if (action === "delete") {
        conversation.messages.splice(contextMessageIndex, 1);
        clearSelection();
        renderThread(activeId);
      }

      hideMessageMenu();
    });

    composer?.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = String(composerInput?.value || "").trim();
      if (audioDraft && !audioDraft.hidden) {
        conversations[activeId].messages.push({ author: "Você", time: "agora", mine: true, type: "audio", duration: formatAudioTime(Math.max(audioDraftSeconds, 1)), speed: "1x", replyTo: replyToMessage ? { author: replyToMessage.author, text: replyToMessage.text } : null });
        renderThread(activeId);
        composer.reset();
        clearReplyPreview();
        resetAudioDraft();
        composerInput?.focus();
        return;
      }
      if (imageDraftSrc) {
        conversations[activeId].messages.push({ author: "Você", time: "agora", mine: true, type: "image", src: imageDraftSrc, replyTo: replyToMessage ? { author: replyToMessage.author, text: replyToMessage.text } : null });
        renderThread(activeId);
        composer.reset();
        clearReplyPreview();
        resetImageDraft();
        composerInput?.focus();
        return;
      }
      if (!value) return;
      conversations[activeId].messages.push({ author: "Você", time: "agora", text: value, mine: true, replyTo: replyToMessage ? { author: replyToMessage.author, text: replyToMessage.text } : null });
      renderThread(activeId);
      composer.reset();
      clearReplyPreview();
      composerInput?.focus();
    });

    chargeButton?.addEventListener("click", () => {
      openChargeModal();
    });

    chargeForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const normalized = String(chargeAmountInput?.value || "").trim();
      if (!normalized) return;
      conversations[activeId].messages.push({
        author: conversations[activeId].name,
        time: "agora",
        text: "Proposta pronta para aprovação. Você pode pagar por aqui para confirmar o atendimento.",
        mine: false,
        type: "charge",
        amount: normalized.startsWith("R$") ? normalized : `R$ ${normalized}`,
        installments: chargeInstallments?.selectedOptions?.[0]?.textContent || "À vista",
        paid: false
      });
      closeChargeModal();
      renderThread(activeId);
    });

    chargeCancelButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeChargeModal();
      });
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
      };
      reader.readAsDataURL(file);
    });

    emojiButton?.addEventListener("click", () => {
      if (!composerInput) return;
      composerInput.value = `${composerInput.value || ""} 🙂`;
      composerInput.focus();
    });

    audioButton?.addEventListener("click", () => {
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
      hideMessageMenu();
      root.classList.remove("messages-app--thread-open");
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

    window.addEventListener("resize", () => {
      hideMessageMenu();
      syncComposerPlaceholder();
      if (window.innerWidth > 767) {
        root.classList.remove("messages-app--thread-open");
        setSearchExpanded(false);
        closeFiltersPanel();
        closeSelectPanel();
      }
    });

    filterButtons.forEach((node) => node.classList.toggle("is-active", node.dataset.messagesFilter === "all"));
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
    if (copyToast) copyToast.hidden = true;
    syncComposerPlaceholder();
    renderThread(activeId);
    if (window.innerWidth <= 767) {
      root.classList.remove("messages-app--thread-open");
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
