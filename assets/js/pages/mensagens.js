(() => {
  const conversations = {};
  let hydratedConversationScope = "";

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
      return window.Doke?.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.() || null;
    } catch (error) {
      return null;
    }
  };

  const getCurrentUserId = () => getCurrentUser()?.id || "";
  const getCurrentUserRole = () => getCurrentUser()?.role || "guest";
  const isProfessionalUser = (user = getCurrentUser()) => Boolean(user?.role === "professional");
  const isDemoProfessionalUser = (user = getCurrentUser()) => Boolean(isProfessionalUser(user) && String(user?.id) === "user_profissional_demo");
  const isProfessionalConversationView = (conversation) => {
    const user = getCurrentUser();
    if (!isProfessionalUser(user)) return false;
    const professionalId = String(conversation?.professionalId || conversation?.order?.professionalId || conversation?.order?.providerId || "");
    if (professionalId && professionalId === String(user.id)) return true;
    return isDemoProfessionalUser(user) && Boolean(conversation?.orderId || conversation?.order?.id);
  };
  const normalizeStatusToken = (value) => {
    const normalized = String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const stateMachine = window.Doke?.services?.orders?.stateMachine;
    if (stateMachine?.normalizeStatus) return stateMachine.normalizeStatus(normalized);
    if (normalized === "conversation") return "accepted";
    if (normalized === "responded") return "quoted";
    return normalized;
  };

  const getOrdersStateMachine = () => window.Doke?.services?.orders?.stateMachine || null;
  const getConversationOrder = (conversation) => Object.assign({}, conversation?.order || {}, {
    id: conversation?.order?.id || conversation?.orderId || "",
    clientId: conversation?.order?.clientId || conversation?.clientId || "",
    professionalId: conversation?.order?.professionalId || conversation?.professionalId || "",
    providerId: conversation?.order?.providerId || conversation?.professionalId || "",
    status: conversation?.order?.status || conversation?.status || "pending"
  });
  const canTransitionConversationOrder = (conversation, nextStatus) => {
    const user = getCurrentUser();
    if (!conversation || !user?.id) return false;
    const order = getConversationOrder(conversation);
    const stateMachine = getOrdersStateMachine();
    if (stateMachine?.canTransition) return stateMachine.canTransition(order, nextStatus, user);
    const current = normalizeStatusToken(order.status);
    const target = normalizeStatusToken(nextStatus);
    if (user.role === "professional" && isProfessionalConversationView(conversation)) {
      return current === "pending" ? ["accepted", "cancelled"].includes(target) : ["accepted", "conversation"].includes(current) && target === "quoted";
    }
    return user.role === "client" && String(order.clientId || "") === String(user.id) && current === "quoted" && ["in_progress", "cancelled"].includes(target);
  };
  const getMessageIdentifier = (message) => String(message?.id || message?.messageId || "").trim();
  const getFinancialMessageKind = (conversation, message) => {
    const type = String(message?.type || "").toLowerCase();
    if (type === "proposal") return "proposal";
    if (type !== "charge") return "";
    const explicitKind = String(message?.financialKind || message?.kind || "").toLowerCase();
    if (explicitKind === "proposal" || explicitKind === "charge") return explicitKind;
    if (message?.chargeCreatedAt || message?.chargeStatus) return "charge";
    const chargeMessageId = String(conversation?.order?.chargeMessageId || "");
    if (chargeMessageId) return getMessageIdentifier(message) === chargeMessageId ? "charge" : "proposal";
    return "proposal";
  };
  const isProposalMessage = (conversation, message) => getFinancialMessageKind(conversation, message) === "proposal";
  const isChargeMessage = (conversation, message) => getFinancialMessageKind(conversation, message) === "charge";
  const isFinancialMessage = (conversation, message) => Boolean(getFinancialMessageKind(conversation, message));
  const getActualChargeMessage = (conversation) => {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (isChargeMessage(conversation, messages[index])) return messages[index];
    }
    return null;
  };
  const getFinancialActionKind = (conversation) => {
    const user = getCurrentUser();
    if (!conversation || !user?.id || !isProfessionalConversationView(conversation)) return "";
    if (canTransitionConversationOrder(conversation, "quoted")) return "proposal";
    const order = getConversationOrder(conversation);
    const service = window.Doke?.services?.orders;
    if (normalizeStatusToken(order.status) !== "in_progress" || getActualChargeMessage(conversation)) return "";
    if (typeof service?.canCreateCharge === "function") {
      return service.canCreateCharge(order, user) ? "charge" : "";
    }
    return order.proposalApprovedAt && !order.chargeMessageId ? "charge" : "";
  };
  const canUseChargeAction = (conversation) => Boolean(getFinancialActionKind(conversation));

  const getDisputeReasonLabel = (dispute) => {
    const code = normalizeStatusToken(dispute?.reasonCode || "");
    const labels = {
      service_not_completed: "Serviço não foi concluído",
      different_result: "Resultado diferente do combinado",
      no_response: "Profissional não respondeu",
      other: "Outro motivo"
    };
    if (labels[code]) return labels[code];
    const reason = String(dispute?.reason || "").split(".")[0].trim();
    return reason || "Relato enviado pelo cliente";
  };

  const getDisputeResponseText = (dispute) => String(dispute?.responseText || dispute?.professionalResponse || "").trim();

  const isDisputePresentationActive = (presentation) => Boolean(presentation && ["contestacao", "analise"].includes(presentation.state));

  const getWalletDisputeForConversation = (conversation) => {
    const wallet = window.Doke?.repositories?.wallet;
    const orderId = conversation?.orderId || conversation?.order?.id || "";
    if (!wallet || typeof wallet.listDisputes !== "function" || !orderId) return null;
    const disputes = wallet.listDisputes({ orderId, currentUser: false }) || [];
    return disputes[0] || null;
  };

  const getWalletTransactionForCharge = (conversation, message) => {
    const wallet = window.Doke?.repositories?.wallet;
    if (!wallet || typeof wallet.readWallet !== "function") return null;
    const data = wallet.readWallet() || {};
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const transactionId = String(message?.walletTransactionId || message?.transactionId || "");
    const orderId = String(conversation?.orderId || conversation?.order?.id || message?.orderId || "");
    const conversationId = String(conversation?.id || message?.conversationId || "");
    const messageId = String(message?.id || message?.messageId || "");
    return transactions.find((transaction) => {
      if (!transaction || String(transaction.type || "").toLowerCase() === "withdraw") return false;
      if (transactionId && String(transaction.id || "") === transactionId) return true;
      if (messageId && String(transaction.messageId || "") === messageId) return true;
      if (orderId && String(transaction.orderId || "") === orderId) return true;
      if (conversationId && String(transaction.conversationId || "") === conversationId) return true;
      return false;
    }) || null;
  };

  const getWalletReceiptUrl = (transaction) => {
    if (!transaction?.id) return "";
    return `carteira.html?transaction=${encodeURIComponent(transaction.id)}&receipt=1`;
  };

  const getChargeReceiptActionHtml = (conversation, message) => {
    const transaction = getWalletTransactionForCharge(conversation, message);
    if (isProfessionalConversationView(conversation)) {
      const receiptUrl = getWalletReceiptUrl(transaction);
      if (!receiptUrl) return "";
      return `<a class="message-bubble__charge-pay doke-btn doke-btn--ghost" href="${escapeHtml(receiptUrl)}" data-message-receivable>Ver recebível</a>`;
    }
    return '<button class="message-bubble__charge-pay doke-btn doke-btn--ghost" type="button" data-message-receipt>Ver comprovante</button>';
  };

  const getConversationDisputePresentation = (conversation) => {
    const dispute = getWalletDisputeForConversation(conversation);
    const explicit = conversation?.order?.disputeStatus || conversation?.disputeStatus || "";
    const status = normalizeStatusToken(dispute?.status || explicit);
    if (!status) return null;

    if (status === "resolvida_profissional") {
      return { state: "resolvida", label: "Repasse liberado", title: "Contestação encerrada", text: "Contestação encerrada. Repasse liberado ao profissional.", dispute };
    }

    if (status === "resolvida_cliente" || status === "reembolsado") {
      return { state: "reembolsado", label: "Reembolsado", title: "Contestação encerrada", text: "Contestação encerrada. Cliente reembolsado.", dispute };
    }

    if (status === "em_analise") {
      return { state: "analise", label: "Em análise", title: "Pedido em análise", text: "Mantenha a conversa centralizada aqui até a análise ser concluída.", dispute };
    }

    return { state: "contestacao", label: "Em contestação", title: "Pedido em contestação", text: "Mantenha a conversa centralizada aqui até a análise ser concluída.", dispute };
  };

  const getProposalCardPresentation = (conversation, message) => {
    const professionalView = isProfessionalConversationView(conversation);
    const orderStatus = getOrderStatus(conversation);
    const rejected = orderStatus === "cancelled" && conversation?.order?.cancellationType === "proposal_rejected";
    const approved = Boolean(conversation?.order?.proposalApprovedAt) || ["in_progress", "completed"].includes(orderStatus);

    if (professionalView) {
      if (rejected) {
        return {
          label: "Proposta recusada",
          status: "Pedido encerrado",
          state: "rejected",
          kicker: "Cliente recusou a proposta",
          text: message.text || "O cliente recusou a proposta e o pedido foi encerrado.",
          details: ["Valor proposto", message.installments || "À vista"],
          note: conversation?.order?.refusalReason || "A decisão ficou registrada no pedido.",
          actionHtml: '<span class="message-bubble__charge-meta">Proposta recusada</span>',
          passive: true
        };
      }
      if (approved) {
        return {
          label: "Proposta aprovada",
          status: "Atendimento liberado",
          state: "approved",
          kicker: "Cliente aprovou a proposta",
          text: message.text || "O cliente aprovou os valores. O atendimento pode seguir e a cobrança será emitida separadamente.",
          details: ["Proposta aceita", message.installments || "À vista"],
          note: "Proposta e cobrança são registros distintos.",
          actionHtml: '<span class="message-bubble__charge-meta">Atendimento em andamento</span>',
          passive: true
        };
      }
      return {
        label: "Proposta enviada",
        status: "Aguardando decisão",
        state: "pending",
        kicker: "Proposta para aprovação",
        text: message.text || "Sua proposta foi enviada. O cliente precisa aprovar ou recusar antes do atendimento.",
        details: ["Valor proposto", message.installments || "À vista"],
        note: "Aguardando a decisão do cliente.",
        actionHtml: '<span class="message-bubble__charge-meta">Cliente ainda não decidiu</span>',
        passive: true
      };
    }

    if (rejected) {
      return {
        label: "Proposta recusada",
        status: "Pedido encerrado",
        state: "rejected",
        kicker: "Decisão registrada",
        text: message.text || "A proposta foi recusada e o pedido foi encerrado.",
        details: ["Valor proposto", message.installments || "À vista"],
        note: conversation?.order?.refusalReason || "A decisão ficou registrada no histórico.",
        actionHtml: '<span class="message-bubble__charge-meta">Proposta recusada</span>',
        passive: true
      };
    }
    if (approved) {
      return {
        label: "Proposta aprovada",
        status: "Atendimento liberado",
        state: "approved",
        kicker: "Proposta aceita",
        text: message.text || "Você aprovou a proposta. A cobrança será enviada separadamente pelo profissional.",
        details: ["Proposta aceita", message.installments || "À vista"],
        note: "A aprovação não confirma pagamento.",
        actionHtml: '<span class="message-bubble__charge-meta">Aguardando cobrança</span>',
        passive: true
      };
    }
    return {
      label: "Proposta enviada",
      status: "Aguardando sua decisão",
      state: "pending",
      kicker: "Proposta para aprovação",
      text: message.text || "Revise os valores e escolha aprovar ou recusar a proposta.",
      details: ["Valor proposto", message.installments || "À vista"],
      note: "A aprovação libera o atendimento, mas não confirma pagamento.",
      actionHtml: '<button class="message-bubble__charge-pay doke-btn doke-btn--primary" type="button" data-message-approve-proposal>Aprovar proposta</button><button class="message-bubble__charge-pay doke-btn doke-btn--ghost" type="button" data-message-reject-proposal>Recusar proposta</button>',
      passive: false
    };
  };

  const getChargeCardPresentation = (conversation, message) => {
    const professionalView = isProfessionalConversationView(conversation);
    const ownerView = professionalView && message?.mine === true;
    const orderStatus = getOrderStatus(conversation);
    const paymentStatus = normalizeStatusToken(conversation?.order?.paymentStatus || message?.paymentStatus || "");
    const completionStatus = normalizeStatusToken(conversation?.order?.completionStatus || message?.completionStatus || "");
    const disputeActive = Boolean(getConversationDisputePresentation(conversation));
    const reviewed = message?.reviewed === true || Boolean(conversation?.order?.reviewId || conversation?.order?.reviewedAt);
    const completed = reviewed || message?.completed === true || orderStatus === "completed" || paymentStatus === "released";
    const paid = message?.paid === true || ["paid", "confirmed", "held", "released"].includes(paymentStatus);
    const completionRequested = completionStatus === "requested";

    if (ownerView) {
      if (reviewed) {
        return {
          label: "Cobrança concluída",
          status: "Avaliação recebida",
          state: "reviewed",
          kicker: "Atendimento avaliado",
          text: message.text || "O cliente concluiu o fluxo e registrou a avaliação do atendimento.",
          details: ["Recebimento pela Doke", message.installments || "À vista"],
          note: "Fluxo encerrado com avaliação registrada.",
          actionHtml: '<span class="message-bubble__charge-meta">Concluído</span>' + getChargeReceiptActionHtml(conversation, message),
          passive: true
        };
      }
      if (completed) {
        return {
          label: "Cobrança concluída",
          status: "Pagamento liberado",
          state: "completed",
          kicker: "Atendimento finalizado",
          text: message.text || "O cliente confirmou a conclusão e o pagamento em garantia foi liberado.",
          details: ["Recebimento pela Doke", message.installments || "À vista"],
          note: "Pedido encerrado. A avaliação do cliente pode chegar a qualquer momento.",
          actionHtml: '<span class="message-bubble__charge-meta">Saldo liberado</span>' + getChargeReceiptActionHtml(conversation, message),
          passive: true
        };
      }
      if (disputeActive) {
        return {
          label: "Cobrança em análise",
          status: "Contestação aberta",
          state: "disputed",
          kicker: "Liberação suspensa",
          text: message.text || "O cliente relatou um problema e o pagamento permanece protegido enquanto a contestação é analisada.",
          details: ["Pagamento em garantia", message.installments || "À vista"],
          note: "A conclusão fica bloqueada até a resolução da contestação.",
          actionHtml: '<span class="message-bubble__charge-meta">Em contestação</span>' + getChargeReceiptActionHtml(conversation, message),
          passive: true
        };
      }
      if (paid && completionRequested) {
        return {
          label: "Conclusão solicitada",
          status: "Aguardando cliente",
          state: "completion-requested",
          kicker: "Serviço informado como concluído",
          text: message.text || "Você informou a conclusão do serviço. O cliente deve confirmar a entrega ou relatar um problema.",
          details: ["Pagamento em garantia", message.installments || "À vista"],
          note: "O valor continua protegido até a confirmação do cliente.",
          actionHtml: '<span class="message-bubble__charge-meta">Aguardando confirmação</span>' + getChargeReceiptActionHtml(conversation, message),
          passive: true
        };
      }
      if (paid) {
        return {
          label: "Cobrança paga",
          status: "Pagamento em garantia",
          state: "paid",
          kicker: "Execução em andamento",
          text: message.text || "O pagamento está protegido pela Doke. Solicite a conclusão somente depois de finalizar o serviço.",
          details: ["Pagamento em garantia", message.installments || "À vista"],
          note: "A solicitação permitirá que o cliente confirme a entrega ou relate um problema.",
          actionHtml: '<button class="message-bubble__charge-pay is-complete doke-btn doke-btn--success" type="button" data-message-request-completion>Solicitar conclusão</button>' + getChargeReceiptActionHtml(conversation, message),
          passive: false
        };
      }
      return {
        label: "Cobrança enviada",
        status: "Aguardando pagamento",
        state: "pending",
        kicker: "Pagamento pendente",
        text: message.text || "A cobrança foi enviada ao cliente e ainda aguarda pagamento.",
        details: ["Pagamento pela Doke", message.installments || "À vista"],
        note: "O atendimento continua em andamento; pagamento ainda não confirmado.",
        actionHtml: '<span class="message-bubble__charge-meta">Aguardando cliente</span>',
        passive: true
      };
    }

    if (reviewed) {
      return {
        label: "Cobrança paga",
        status: "Atendimento avaliado",
        state: "reviewed",
        kicker: "Fluxo concluído",
        text: message.text || "O atendimento foi concluído e avaliado.",
        details: ["Pagamento seguro pela Doke", message.installments || "À vista"],
        note: "Fluxo encerrado com avaliação registrada.",
        actionHtml: getChargeReceiptActionHtml(conversation, message),
        passive: true
      };
    }
    if (completed) {
      return {
        label: "Cobrança paga",
        status: "Pagamento liberado",
        state: "completed",
        kicker: "Atendimento concluído",
        text: message.text || "A conclusão foi confirmada e o pagamento em garantia foi liberado.",
        details: ["Pagamento seguro pela Doke", message.installments || "À vista"],
        note: "Avalie o atendimento para encerrar o fluxo.",
        actionHtml: '<button class="message-bubble__charge-pay is-done doke-btn doke-btn--soft" type="button" data-message-review>Avaliar</button>' + getChargeReceiptActionHtml(conversation, message),
        passive: false
      };
    }
    if (disputeActive) {
      return {
        label: "Cobrança em análise",
        status: "Contestação aberta",
        state: "disputed",
        kicker: "Problema registrado",
        text: message.text || "O pagamento permanece em garantia enquanto a contestação é analisada.",
        details: ["Pagamento protegido", message.installments || "À vista"],
        note: "A conclusão e a liberação ficam suspensas até a resolução.",
        actionHtml: getChargeReceiptActionHtml(conversation, message),
        passive: true
      };
    }
    if (paid && completionRequested) {
      return {
        label: "Conclusão solicitada",
        status: "Confirme a entrega",
        state: "completion-requested",
        kicker: "O profissional concluiu o serviço",
        text: message.text || "Confirme a conclusão para liberar o pagamento ou relate um problema.",
        details: ["Pagamento em garantia", message.installments || "À vista"],
        note: "O valor só será liberado após sua confirmação.",
        actionHtml: '<button class="message-bubble__charge-pay is-complete doke-btn doke-btn--success" type="button" data-message-complete>Confirmar conclusão</button>' + getChargeReceiptActionHtml(conversation, message),
        passive: false
      };
    }
    if (paid) {
      return {
        label: "Cobrança paga",
        status: "Pagamento em garantia",
        state: "paid",
        kicker: "Atendimento em execução",
        text: message.text || "O pagamento está protegido pela Doke enquanto o profissional executa o serviço.",
        details: ["Pagamento seguro pela Doke", message.installments || "À vista"],
        note: "A confirmação será liberada quando o profissional solicitar a conclusão.",
        actionHtml: '<span class="message-bubble__charge-meta">Aguardando conclusão</span>' + getChargeReceiptActionHtml(conversation, message),
        passive: true
      };
    }
    return {
      label: "Cobrança recebida",
      status: "Aguardando pagamento",
      state: "pending",
      kicker: "Pagamento pendente",
      text: message.text || "A cobrança foi emitida com base na proposta aprovada.",
      details: ["Pagamento seguro pela Doke", message.installments || "À vista"],
      note: "O pagamento será confirmado apenas na etapa própria.",
      actionHtml: '<button class="message-bubble__charge-pay doke-btn doke-btn--primary" type="button" data-message-pay>Pagar agora</button>',
      passive: false
    };
  };

  const getFinancialCardPresentation = (conversation, message) => isProposalMessage(conversation, message)
    ? getProposalCardPresentation(conversation, message)
    : getChargeCardPresentation(conversation, message);

  const syncChargeActionVisibility = (conversation) => {
    const actionKind = getFinancialActionKind(conversation);
    const allowed = Boolean(actionKind);
    const button = document.querySelector("[data-messages-charge]");
    if (!button) return false;
    const label = actionKind === "charge" ? "Cobrança" : "Proposta";
    const text = button.querySelector("span");
    if (text) text.textContent = label;
    button.setAttribute("aria-label", actionKind === "charge" ? "Enviar cobrança" : "Enviar proposta");
    button.hidden = !allowed;
    button.setAttribute("aria-hidden", allowed ? "false" : "true");
    button.disabled = !allowed;
    return allowed;
  };

  const getCurrentMessageAuthorProfile = () => {
    const sessionUser = window.Doke?.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.() || {};
    const resolved = window.DokeMessageAuthor?.resolve?.({
      name: sessionUser.displayName || sessionUser.name || sessionUser.fullName || sessionUser.email || 'Você',
      avatarUrl: sessionUser.avatarUrl || sessionUser.avatar || sessionUser.photoUrl || sessionUser.photo || '',
      initials: sessionUser.initials || sessionUser.avatarInitials || ''
    }, 'Você') || { name: 'Você', url: '', initials: 'VC' };
    return resolved;
  };

  const resolveThreadMessageAuthor = (message, conversation) => {
    const current = getCurrentMessageAuthorProfile();
    if (message?.mine) return current;
    const peerName = message?.author || conversation?.name || conversation?.peerName || 'Membro';
    return window.DokeMessageAuthor?.resolve?.({
      name: peerName,
      avatarUrl: message?.authorAvatarUrl || message?.avatarUrl || conversation?.avatarUrl || conversation?.photoUrl || conversation?.avatar || '',
      initials: message?.authorInitials || conversation?.peerInitials || conversation?.initials || ''
    }, peerName) || { name: peerName, url: '', initials: getConversationInitials(peerName) };
  };

  const renderMessageAuthorAvatar = (author) => {
    if (author?.url) {
      return `<span class="message-author-avatar doke-avatar" aria-hidden="true"><img src="${escapeHtml(author.url)}" alt="" loading="lazy" decoding="async"></span>`;
    }
    return `<span class="message-author-avatar doke-avatar" aria-hidden="true">${escapeHtml(author?.initials || 'DK')}</span>`;
  };

  const normalizeLocalMessage = (message, conversation) => {
    const currentUserId = getCurrentUserId();
    const mine = message?.mine === true || Boolean(currentUserId && message?.senderId && String(message.senderId) === String(currentUserId));
    return {
      id: message?.id || "",
      senderId: message?.senderId || message?.authorId || "",
      author: mine ? "Você" : message?.author || conversation?.name || "Doke",
      authorAvatarUrl: message?.authorAvatarUrl || message?.avatarUrl || "",
      authorInitials: message?.authorInitials || "",
      createdAt: message?.createdAt || message?.sentAt || message?.timestamp || "",
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
      paymentMethod: message?.paymentMethod || "",
      paidAmount: message?.paidAmount || "",
      walletTransactionId: message?.walletTransactionId || "",
      transactionId: message?.transactionId || "",
      walletReleased: message?.walletReleased === true,
      replyTo: message?.replyTo || null
    };
  };

  const mapLocalConversation = (conversation) => {
    const order = conversation?.order || {};
    const hasOrderContext = Boolean(conversation?.orderId || order.id);
    return {
      avatar: conversation?.avatar || conversation?.peerInitials || "",
      avatarUrl: conversation?.avatarUrl || conversation?.photoUrl || (/^(data:image\/|blob:|https?:\/\/|assets\/|\/)/i.test(String(conversation?.avatar || "")) ? conversation.avatar : ""),
      peerInitials: conversation?.peerInitials || "",
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

  const ORDER_STATUS_PRESENTATION = {
    accepted: { label: "Pedido aceito", lastSeen: "Conversa liberada", unlocked: true },
    conversation: { label: "Pedido aceito", lastSeen: "Conversa liberada", unlocked: true },
    quoted: { label: "Proposta enviada", lastSeen: "Proposta enviada", unlocked: true },
    in_progress: { label: "Em andamento", lastSeen: "Atendimento em andamento", unlocked: true },
    completed: { label: "Concluído", lastSeen: "Pedido concluído", unlocked: true },
    cancelled: { label: "Pedido recusado", lastSeen: "Pedido recusado", unlocked: false }
  };

  const isWaitingForAcceptanceCopy = (value) => /aguardando\s+(aceite|resposta)/i.test(String(value || ""));

  const getLocalOrderById = (orderId) => {
    const id = String(orderId || "").trim();
    if (!id) return null;
    const service = window.Doke?.services?.orders;
    if (!service || typeof service.listLocal !== "function") return null;
    try {
      return (service.listLocal({ currentUser: true }) || []).find((order) => String(order?.id || "") === id) || null;
    } catch (error) {
      console.warn("[DokeMessages:reconcileLocalOrderStatus]", error);
      return null;
    }
  };

  const reconcileLocalConversationOrder = (conversation) => {
    const orderId = String(conversation?.orderId || conversation?.order?.id || "").trim();
    const authoritativeOrder = getLocalOrderById(orderId);
    const authoritativeStatus = String(authoritativeOrder?.status || "").trim();
    const presentation = ORDER_STATUS_PRESENTATION[authoritativeStatus];
    if (!authoritativeOrder || !presentation) return { conversation, changed: false };

    const nextOrder = Object.assign({}, conversation.order || {}, authoritativeOrder, {
      status: authoritativeStatus,
      statusLabel: authoritativeOrder.statusLabel || presentation.label
    });
    const nextLocked = !presentation.unlocked;
    const nextLastSeen = authoritativeOrder.statusLabel || presentation.lastSeen;
    const nextLastMessage = isWaitingForAcceptanceCopy(conversation.lastMessage)
      ? presentation.lastSeen
      : conversation.lastMessage;
    const changed = String(conversation.status || conversation.order?.status || "") !== authoritativeStatus
      || String(conversation.statusLabel || conversation.order?.statusLabel || "") !== String(nextOrder.statusLabel || "")
      || conversation.locked !== nextLocked
      || String(conversation.lastSeen || "") !== String(nextLastSeen || "")
      || String(conversation.order?.status || "") !== authoritativeStatus
      || String(conversation.order?.statusLabel || "") !== String(nextOrder.statusLabel || "")
      || String(conversation.lastMessage || "") !== String(nextLastMessage || "");

    if (!changed) return { conversation, changed: false };

    return {
      changed: true,
      conversation: Object.assign({}, conversation, {
        orderId: orderId || authoritativeOrder.id || "",
        serviceId: conversation.serviceId || authoritativeOrder.serviceId || "",
        clientId: conversation.clientId || authoritativeOrder.clientId || "",
        professionalId: conversation.professionalId || authoritativeOrder.professionalId || authoritativeOrder.providerId || "",
        status: authoritativeStatus,
        statusLabel: nextOrder.statusLabel,
        locked: nextLocked,
        lastSeen: nextLastSeen,
        lastMessage: nextLastMessage,
        order: nextOrder
      })
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

  const getMessagePreview = (message, conversation = null) => {
    if (!message) return "";
    if (message.type === "audio") return "Áudio enviado";
    if (message.type === "image") return "Imagem enviada";
    const financialKind = getFinancialMessageKind(conversation, message);
    if (financialKind === "proposal") return `Proposta ${message.amount || "enviada"}`;
    if (financialKind === "charge") return `Cobrança ${message.amount || "enviada"}`;
    return String(message.text || "");
  };

  const renderLocalConversationItem = (id, conversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const disputePresentation = getConversationDisputePresentation(conversation);
    const statusLabel = disputePresentation ? disputePresentation.label : conversation.order?.statusLabel || "Aguardando resposta";
    return `
      <button class="message-item doke-message-card doke-card doke-selectable-card" type="button" data-message-id="${escapeHtml(id)}" data-domain-card="message" data-local-conversation="true"${disputePresentation ? ` data-message-dispute-state="${escapeHtml(disputePresentation.state)}"` : ""}>
        <span class="message-item__avatar doke-avatar" aria-hidden="true">${escapeHtml(conversation.avatar || getConversationInitials(conversation.name))}</span>
        <span class="message-item__content">
          <span class="message-item__line"><strong>${escapeHtml(conversation.name)}</strong><span class="message-item__time">${escapeHtml(lastMessage?.time || "agora")}</span></span>
          <span class="message-item__deal-status doke-badge ${getStatusToneClass(statusLabel)}">${escapeHtml(statusLabel)}</span>
          <span class="message-item__preview">${escapeHtml(getMessagePreview(lastMessage, conversation) || "Sem mensagens ainda.")}</span>
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

  const getConversationScopeKey = () => {
    const user = getCurrentUser();
    return user?.id ? `${String(user.id)}:${String(user.role || "guest")}` : "guest";
  };

  const clearHydratedConversationScope = (root) => {
    Object.keys(conversations).forEach((conversationId) => delete conversations[conversationId]);
    root?.querySelectorAll?.('[data-local-conversation="true"]').forEach((card) => card.remove());
  };

  const hydrateLocalConversations = (root) => {
    const service = window.Doke?.services?.messages;
    const { ordersList } = getConversationLists(root);
    const scopeKey = getConversationScopeKey();
    const scopeChanged = scopeKey !== hydratedConversationScope;

    if (scopeChanged) {
      clearHydratedConversationScope(root);
      hydratedConversationScope = scopeKey;
    }

    if (!service?.listLocalConversations || !ordersList) {
      return { scopeChanged, count: 0, conversationIds: [] };
    }

    const localConversations = service.listLocalConversations({ currentUser: true }) || [];
    const currentConversationIds = new Set();
    localConversations.slice().reverse().forEach((conversation) => {
      if (!conversation?.id) return;
      const conversationId = String(conversation.id);
      currentConversationIds.add(conversationId);
      const reconciliation = reconcileLocalConversationOrder(conversation);
      const sourceConversation = reconciliation.conversation || conversation;
      if (reconciliation.changed) {
        const repository = window.Doke?.repositories?.messages;
        repository?.save?.(sourceConversation)?.catch?.((error) => console.warn("[DokeMessages:saveReconciledConversation]", error));
      }
      const mapped = mapLocalConversation(sourceConversation);
      const isOrderConversation = Boolean(mapped.orderId || mapped.order?.id || mapped.group === "orders");
      mapped.group = isOrderConversation ? "orders" : "contacts";
      conversations[conversationId] = Object.assign({}, conversations[conversationId] || {}, mapped);
      ensureLocalConversationCard(root, conversationId, conversations[conversationId]);
    });

    Object.keys(conversations).forEach((conversationId) => {
      if (!currentConversationIds.has(conversationId)) delete conversations[conversationId];
    });
    root.querySelectorAll('[data-local-conversation="true"]').forEach((card) => {
      if (!currentConversationIds.has(String(card.dataset.messageId || ""))) card.remove();
    });

    return {
      scopeChanged,
      count: currentConversationIds.size,
      conversationIds: Array.from(currentConversationIds)
    };
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

  const publishConversationNotification = (conversationId, message, kind = 'message') => {
    const conversation = conversations[conversationId] || {};
    const currentUserId = String(getCurrentUserId() || '');
    const recipientAccountKey = String(
      currentUserId && currentUserId === String(conversation.professionalId || '')
        ? (conversation.clientId || '')
        : (conversation.professionalId || conversation.clientId || '')
    ).trim();
    if (!recipientAccountKey || recipientAccountKey === currentUserId) return;
    const isMention = kind === 'mention';
    window.DokeInAppNotifications?.publish({
      type: isMention ? 'direct_message_mention' : 'direct_message',
      category: 'messages',
      recipientAccountKey,
      userId: recipientAccountKey,
      actorId: currentUserId,
      actorName: getCurrentUser()?.name || 'Nova mensagem',
      eventKey: `direct-message:${conversationId}:${Date.now()}`,
      title: isMention ? 'Você foi mencionado' : `Nova mensagem de ${getCurrentUser()?.name || 'um contato'}`,
      body: String(message?.text || (message?.type === 'image' ? 'Imagem' : message?.type === 'audio' ? 'Áudio' : 'Nova mensagem')).slice(0, 140),
      targetUrl: `mensagens.html?conversation=${encodeURIComponent(conversationId)}`,
      actionLabel: 'Abrir conversa',
      conversationId,
      scopeKey: `conversation:${conversationId}`,
      actions: [
        { label: 'Responder', action: 'quick-reply', conversationId },
        { label: 'Abrir', url: `mensagens.html?conversation=${encodeURIComponent(conversationId)}` }
      ]
    });
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
      maxDuration: 8000,
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
    let receiptModal = null;
    let receiptModalReturnFocus = null;

    const formatReceiptCurrency = (value) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }
      const text = String(value || "").trim();
      if (!text) return "R$ 0,00";
      if (/^R\$/.test(text)) return text;
      const numeric = Number(text.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(numeric)) return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      return text;
    };

    const formatReceiptDate = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "Registrado no pedido";
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return raw;
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    const getReceiptOrderCode = (order = {}) => {
      const code = order.code || order.orderCode || order.number;
      if (code) return String(code).startsWith("#") ? String(code) : `#${code}`;
      const id = String(order.id || order.orderId || "").trim();
      return id ? `#${id}` : "#DK";
    };

    const buildMessageReceipt = (conversation, message) => {
      const order = conversation?.order || {};
      const transaction = getWalletTransactionForCharge(conversation, message) || {};
      const transactionId = transaction.id || message?.walletTransactionId || message?.transactionId || "";
      return {
        status: message?.completed || order.status === "completed" ? "Pedido concluído" : "Pagamento confirmado",
        amount: formatReceiptCurrency(message?.paidAmount || message?.amount || transaction.grossAmount || transaction.amount || order.budget),
        service: order.serviceTitle || order.title || conversation?.orderTitle || "Pedido de serviço",
        professional: order.professionalName || order.providerName || order.provider || conversation?.professionalName || conversation?.name || "Profissional Doke",
        orderCode: getReceiptOrderCode(order),
        method: message?.paymentMethod || transaction.paymentMethod || "Pagamento pela Doke",
        date: formatReceiptDate(transaction.updatedAt || transaction.createdAt || message?.paidAt || order.updatedAt || order.createdAt),
        transactionId: transactionId || "Comprovante local",
        source: transactionId ? "Transação Doke" : "Comprovante local do pedido"
      };
    };

    const createReceiptModal = () => {
      if (receiptModal?.isConnected) return receiptModal;
      receiptModal = document.createElement("div");
      receiptModal.className = "messages-receipt-modal doke-overlay doke-overlay--action";
      receiptModal.dataset.messageReceiptModal = "true";
      receiptModal.hidden = true;
      receiptModal.setAttribute("aria-hidden", "true");
      receiptModal.innerHTML = `
        <span class="messages-receipt-modal__backdrop doke-overlay__backdrop" data-message-receipt-close aria-hidden="true"></span>
        <section class="messages-receipt-modal__card doke-overlay__surface doke-modal-surface doke-modal-surface--compact" role="dialog" aria-modal="true" aria-labelledby="messages-receipt-title" aria-describedby="messages-receipt-description" tabindex="-1">
          <div class="messages-receipt-header doke-overlay__header doke-modal-header">
            <div>
              <span class="messages-receipt-eyebrow doke-modal-eyebrow">Comprovante do pedido</span>
              <h2 class="doke-modal-title" id="messages-receipt-title">Pagamento confirmado</h2>
              <p class="doke-modal-description" id="messages-receipt-description">Resumo do pagamento registrado neste atendimento.</p>
            </div>
            <button class="messages-receipt-modal__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" aria-label="Fechar comprovante" data-message-receipt-close>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>
            </button>
          </div>
          <div class="messages-receipt-body doke-overlay__body doke-modal-body">
            <dl class="messages-receipt-summary doke-modal-summary-card" aria-label="Dados do comprovante">
              <div><dt>Status</dt><dd data-receipt-status>Pagamento confirmado</dd></div>
              <div><dt>Valor pago</dt><dd data-receipt-amount>R$ 0,00</dd></div>
              <div><dt>Profissional</dt><dd data-receipt-professional>Profissional Doke</dd></div>
              <div><dt>Serviço</dt><dd data-receipt-service>Pedido de serviço</dd></div>
              <div><dt>Pedido</dt><dd data-receipt-order>#DK</dd></div>
              <div><dt>Forma de pagamento</dt><dd data-receipt-method>Pagamento pela Doke</dd></div>
              <div><dt>Data</dt><dd data-receipt-date>Registrado no pedido</dd></div>
              <div><dt>ID da transação</dt><dd data-receipt-transaction>Comprovante local</dd></div>
            </dl>
            <p class="doke-modal-description" data-receipt-source>Comprovante local do pedido.</p>
          </div>
          <div class="messages-receipt-actions doke-overlay__actions doke-modal-actions doke-modal-actions--single">
            <button class="messages-receipt-button doke-btn doke-btn--primary" type="button" data-message-receipt-close>Fechar</button>
          </div>
        </section>
      `;
      document.body.appendChild(receiptModal);
      return receiptModal;
    };

    const closeReceiptModal = () => {
      if (!receiptModal) return;
      receiptModal.hidden = true;
      receiptModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("messages-receipt-modal-open");
      receiptModalReturnFocus?.focus?.({ preventScroll: true });
      receiptModalReturnFocus = null;
    };

    const setReceiptText = (selector, value) => {
      receiptModal?.querySelectorAll(selector).forEach((node) => {
        node.textContent = value || "";
      });
    };

    const openReceiptModal = (conversation, message, trigger) => {
      createReceiptModal();
      const receipt = buildMessageReceipt(conversation, message);
      receiptModalReturnFocus = trigger || document.activeElement;
      setReceiptText("[data-receipt-status]", receipt.status);
      setReceiptText("[data-receipt-amount]", receipt.amount);
      setReceiptText("[data-receipt-professional]", receipt.professional);
      setReceiptText("[data-receipt-service]", receipt.service);
      setReceiptText("[data-receipt-order]", receipt.orderCode);
      setReceiptText("[data-receipt-method]", receipt.method);
      setReceiptText("[data-receipt-date]", receipt.date);
      setReceiptText("[data-receipt-transaction]", receipt.transactionId);
      setReceiptText("[data-receipt-source]", receipt.source);
      receiptModal.hidden = false;
      receiptModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("messages-receipt-modal-open");
      receiptModal.querySelector(".doke-modal-surface")?.focus?.({ preventScroll: true });
    };

    let pendingCompletion = null;

    messagesList?.setAttribute("role", "listbox");
    messagesList?.setAttribute("aria-multiselectable", "false");

    prepareConversationItems();
    let replyToMessage = null;
    let audioDraftSeconds = 0;
    let audioDraftTimer = null;
    let imageDraftSrc = "";
    let messageContextIndex = -1;
    let activeThreadMessageIndex = -1;
    const advancedMessageFilter = { query: "", author: "all", period: "all", attachment: "all" };

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
    const hasDirectThreadRequest = Boolean(requestedConversationId || requestedOrderId);
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
    const getLatestChargeMessage = (conversationId) => getActualChargeMessage(conversations[conversationId]);

    const requestDeclineReason = (orderId, trigger, options = {}) => {
      const conversation = conversations[activeId];
      const orderTitle = conversation?.order?.title || conversation?.order?.serviceTitle || "";
      if (window.DokeDeclineReasonDialog && typeof window.DokeDeclineReasonDialog.request === "function") {
        return window.DokeDeclineReasonDialog.request({
          trigger,
          orderTitle,
          title: options.title || "Recusar pedido",
          text: options.text || "Explique ao cliente por que este pedido não poderá ser atendido."
        });
      }
      showCopyToast("Não foi possível abrir o modal de justificativa. Recarregue a página e tente novamente.");
      return Promise.resolve(null);
    };

    const requestIssueReport = (conversation, trigger) => {
      const orderTitle = conversation?.order?.title || conversation?.order?.serviceTitle || conversation?.orderTitle || "";
      if (window.DokeIssueReportDialog && typeof window.DokeIssueReportDialog.request === "function") {
        return window.DokeIssueReportDialog.request({
          trigger,
          orderTitle,
          title: "Relatar problema",
          text: "Conte o que aconteceu. O repasse ficará pausado enquanto o pedido é analisado.",
          submitLabel: "Enviar relato"
        });
      }
      showCopyToast("Não foi possível abrir o relato. Recarregue a página e tente novamente.");
      return Promise.resolve(null);
    };

    const submitIssueReport = (conversation, message, report) => {
      const wallet = window.Doke?.services?.wallet;
      if (!wallet || typeof wallet.openDispute !== "function") return Promise.reject(new Error("Contestação indisponível."));
      const orderId = conversation?.order?.id || conversation?.orderId || pageParams.get("order") || "";
      if (!orderId) return Promise.reject(new Error("Pedido não identificado."));
      return wallet.openDispute({
        orderId,
        transactionId: message?.walletTransactionId || message?.transactionId || "",
        messageId: message?.id || conversation?.messageId || "",
        conversationId: conversation?.id || activeId || "",
        professionalId: conversation?.professionalId || conversation?.order?.professionalId || "",
        clientId: getCurrentUserId() || conversation?.clientId || conversation?.order?.clientId || "",
        reason: report.reason,
        reasonCode: report.reasonCode,
        openedBy: "client"
      });
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
            <button class="orders-detail-actions__button orders-detail-actions__button--secondary doke-btn doke-btn--ghost" type="button" data-messages-order-detail-close>Fechar</button>
            <button class="orders-detail-actions__button orders-detail-actions__button--primary doke-btn doke-btn--primary" type="button" data-messages-order-detail-close>
              ${orderDetailIcons.chat}<span>Voltar para conversa</span>
            </button>
          </footer>
        </section>
      `;

      document.body.appendChild(layer);
      return layer;
    };

    const getConversationChargeMessage = (conversation) => getActualChargeMessage(conversation);

    const getMessagesOrderTimeline = (status, order, charge) => {
      const accepted = ["accepted", "conversation", "responded", "quoted", "in_progress", "completed"].includes(status);
      const proposalApproved = Boolean(order?.proposalApprovedAt) || ["in_progress", "completed"].includes(status);
      const completed = status === "completed";

      if (status === "cancelled") {
        const proposalRejected = order?.cancellationType === "proposal_rejected";
        return [
          { label: "Pedido recebido", date: order.createdAt || "Registrado na Doke", done: true, current: false },
          { label: proposalRejected ? "Proposta recusada" : "Pedido recusado", date: order.refusalReason || "Fluxo encerrado", done: false, current: true },
          { label: "Conversa bloqueada", date: "Atendimento indisponível", done: false, current: false }
        ];
      }

      return [
        { label: "Pedido recebido", date: order.createdAt || "Registrado na Doke", done: true, current: false },
        { label: "Aceite do profissional", date: accepted ? "Pedido aceito" : "Aguardando resposta", done: accepted, current: status === "pending" },
        {
          label: "Decisão da proposta",
          date: proposalApproved
            ? "Proposta aprovada"
            : status === "quoted"
              ? "Aguardando decisão do cliente"
              : "Próxima etapa",
          done: proposalApproved,
          current: status === "quoted"
        },
        {
          label: "Atendimento",
          date: completed ? "Serviço concluído" : status === "in_progress" ? "Etapa atual" : "Após aprovação",
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
            ? "Formalize a proposta para registrar valor, prazo e condições antes da decisão do cliente."
            : "Acompanhe a negociação e confirme os detalhes antes do pagamento.",
          aiTitle: "Fluxo em negociação",
          aiText: "O histórico da conversa já existe; agora o importante é consolidar proposta, valor e prazo."
        },
        quoted: {
          statusLabel: order.statusLabel || "Proposta enviada",
          smartBadge: "Aguardando decisão",
          riskLabel: "Médio",
          riskTone: "risk",
          flow: order.flow || "A proposta foi enviada e o cliente deve aprovar ou recusar antes do atendimento.",
          actionTitle: professionalView ? "Acompanhar proposta" : "Decidir proposta",
          actionNote: professionalView
            ? "Aguarde a decisão do cliente e mantenha a conversa pronta para iniciar o atendimento."
            : "Revise valores, prazo e escopo antes de aprovar ou recusar.",
          aiTitle: "Proposta formalizada",
          aiText: "A negociação já virou proposta. O próximo passo obrigatório é a decisão do cliente."
        },
        in_progress: {
          statusLabel: order.statusLabel || "Em andamento",
          smartBadge: charge?.paid ? "Pagamento confirmado" : charge ? "Cobrança enviada" : "Proposta aprovada",
          riskLabel: "Baixo",
          riskTone: "success",
          flow: order.flow || "A proposta foi aprovada e o atendimento está em andamento.",
          actionTitle: professionalView ? "Atualizar atendimento" : "Acompanhar atendimento",
          actionNote: professionalView
            ? "Mantenha o cliente atualizado na conversa enquanto executa o serviço."
            : "Use a conversa para acompanhar o andamento e receber atualizações do profissional.",
          aiTitle: "Atendimento iniciado",
          aiText: charge?.paid
            ? "Pagamento confirmado e pedido em andamento. A conversa deve servir para acompanhamento e execução."
            : charge
              ? "Cobrança enviada e pedido em andamento. O pagamento ainda não foi confirmado."
              : "Proposta aprovada e pedido em andamento. A cobrança ainda precisa ser emitida pelo profissional."
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
            ? "Proposta aprovada"
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
        `).join("") + renderDisputeTimelineEvent(conversation);
      }
    };

    const openMessagesOrderDetail = (trigger) => {
      const conversation = conversations[activeId];
      if (!conversation) { releaseNotificationAction(); return; }
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

    const renderDisputeTimelineEvent = (conversation) => {
      const presentation = getConversationDisputePresentation(conversation);
      if (!presentation) return "";
      const reasonLabel = getDisputeReasonLabel(presentation.dispute);
      const responseText = getDisputeResponseText(presentation.dispute);
      const statusCopy = isDisputePresentationActive(presentation)
        ? "O repasse ficará pausado até a análise ser concluída."
        : presentation.text;
      return `
        <section class="messages-dispute-timeline-event" data-messages-dispute-event data-messages-dispute-state="${escapeHtml(presentation.state)}" aria-label="Evento de contestação do pedido">
          <div class="messages-dispute-timeline-event__icon" aria-hidden="true">!</div>
          <div class="messages-dispute-timeline-event__content">
            <strong>${escapeHtml(presentation.title || "Pedido contestado")}</strong>
            <p>${escapeHtml(statusCopy)}</p>
            <span>Motivo: ${escapeHtml(reasonLabel)}</span>
          </div>
        </section>
        ${responseText ? `
        <section class="messages-dispute-timeline-event messages-dispute-timeline-event--response" data-messages-dispute-response-event aria-label="Resposta do profissional à contestação">
          <div class="messages-dispute-timeline-event__icon" aria-hidden="true">✓</div>
          <div class="messages-dispute-timeline-event__content">
            <strong>Resposta do profissional enviada</strong>
            <p>${escapeHtml(responseText)}</p>
            <span>Acompanhe a resolução por esta conversa.</span>
          </div>
        </section>` : ""}
      `;
    };

    const syncDisputeComposerNotice = (conversation) => {
      const notice = root.querySelector("[data-messages-dispute-composer]");
      if (!notice) return;
      const presentation = getConversationDisputePresentation(conversation);
      const shouldShow = isDisputePresentationActive(presentation);
      notice.hidden = !shouldShow;
      if (!shouldShow) return;
      const title = notice.querySelector("[data-messages-dispute-composer-title]");
      const text = notice.querySelector("[data-messages-dispute-composer-text]");
      if (title) title.textContent = presentation.state === "analise" ? "Pedido em análise" : "Contestação em andamento";
      if (text) text.textContent = "Responda por esta conversa até a análise ser concluída.";
    };

    const renderLinkedOrderContext = (conversation) => {
      const order = conversation?.order || {};
      const professionalView = isProfessionalConversationView(conversation);
      const peerLabel = professionalView ? 'Cliente' : 'Profissional';
      const peerName = professionalView
        ? order.clientName || conversation.name || 'Cliente Doke'
        : order.professionalName || conversation.name || 'Profissional Doke';
      const orderStatus = getOrderStatus(conversation);
      const disputePresentation = getConversationDisputePresentation(conversation);
      const statusLabel = disputePresentation ? disputePresentation.label : order.statusLabel || 'Em negociação';
      const isDeclined = isOrderDeclined(conversation);
      const canAccept = canTransitionConversationOrder(conversation, 'accepted');
      const canDeclineRequest = professionalView && orderStatus === 'pending' && canTransitionConversationOrder(conversation, 'cancelled');
      const canRejectProposal = !professionalView && orderStatus === 'quoted' && canTransitionConversationOrder(conversation, 'cancelled');
      const canDecline = canDeclineRequest || canRejectProposal;
      const ordersService = window.Doke?.services?.orders;
      const canCancelBeforePayment = Boolean(
        ordersService?.canCancelBeforePayment?.(order, getCurrentUser())
        && !canDecline
      );
      const canQuote = canTransitionConversationOrder(conversation, 'quoted');
      const canApproveProposal = canTransitionConversationOrder(conversation, 'in_progress');
      const financialActionKind = getFinancialActionKind(conversation);
      let primaryLabel = 'Aguardando aceite';
      let primaryClass = 'doke-btn--soft';
      let primaryAttrs = 'aria-disabled="true" disabled';

      if (disputePresentation && !isDisputePresentationActive(disputePresentation)) {
        primaryLabel = disputePresentation.state === 'reembolsado' ? 'Cliente reembolsado' : 'Repasse liberado';
      } else if (canAccept) {
        primaryLabel = 'Aceitar pedido';
        primaryClass = 'doke-btn--primary';
        primaryAttrs = 'data-messages-accept-order';
      } else if (isDeclined) {
        primaryLabel = 'Pedido recusado';
      } else if (canQuote) {
        primaryLabel = 'Enviar proposta';
        primaryClass = 'doke-btn--primary';
        primaryAttrs = 'data-messages-proposal-action';
      } else if (financialActionKind === 'charge') {
        primaryLabel = 'Enviar cobrança';
        primaryClass = 'doke-btn--primary';
        primaryAttrs = 'data-messages-charge-action';
      } else if (canApproveProposal) {
        primaryLabel = 'Aprovar proposta';
        primaryClass = 'doke-btn--primary';
        primaryAttrs = 'data-messages-approve-proposal';
      } else if (orderStatus === 'accepted' || orderStatus === 'conversation' || orderStatus === 'responded') {
        primaryLabel = professionalView ? 'Proposta indisponível' : 'Aguardando proposta';
      } else if (orderStatus === 'quoted') {
        primaryLabel = professionalView ? 'Proposta enviada' : 'Ver proposta';
      } else if (orderStatus === 'in_progress') {
        primaryLabel = getConversationChargeMessage(conversation) ? 'Cobrança enviada' : 'Em atendimento';
      } else if (orderStatus === 'completed') {
        primaryLabel = 'Pedido concluído';
      }

      return `
      <section class="messages-order-card messages-order-card--inline doke-card doke-order-card" data-domain-card="order" data-messages-order-context aria-label="Pedido vinculado à conversa">
        <div class="messages-order-card__head doke-order-card__meta">
          <span>Pedido vinculado</span>
          <strong class="doke-badge doke-order-card__status">${escapeHtml(statusLabel)}</strong>
        </div>
        ${disputePresentation ? `
        <div class="messages-dispute-notice" data-messages-dispute-state="${escapeHtml(disputePresentation.state)}">
          <strong>${escapeHtml(disputePresentation.title)}</strong>
          <span>${escapeHtml(disputePresentation.text)}</span>
        </div>` : ``}
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
            ${canDecline ? `<button class="messages-order-card__button doke-btn doke-btn--ghost" type="button" data-messages-decline-order>${professionalView ? "Recusar" : "Recusar proposta"}</button>` : ""}
            ${canCancelBeforePayment ? `<button class="messages-order-card__button doke-btn doke-btn--ghost" type="button" data-messages-cancel-order>Cancelar pedido</button>` : ""}
            <button class="messages-order-card__button doke-btn ${primaryClass}" type="button" ${primaryAttrs}>${primaryLabel}</button>
          </div>
        </div>
      </section>
    `;
    };
    const syncPaymentFlowFromQuery = () => {
      const conversationId = pageParams.get("conversation");
      if (!conversationId || !conversations[conversationId]) return;
      // Query parameters are navigation hints only. Financial and completion
      // state must always come from the repositories/services after hydration.
    };
    const updateOrderFromConversation = (status, options = {}) => {
      const conversation = conversations[activeId];
      const orderId = conversation?.order?.id || conversation?.orderId;
      const service = window.Doke?.services?.orders;
      if (!orderId || !service) return Promise.resolve(null);
      const action = status === 'quoted' && typeof service.quote === 'function'
        ? service.quote(orderId, options)
        : status === 'in_progress' && typeof service.approveProposal === 'function'
          ? service.approveProposal(orderId, options)
          : status === 'in_progress'
            ? Promise.reject(new Error('Comando canônico de aprovação indisponível.'))
            : typeof service.updateStatus === 'function'
              ? service.updateStatus(orderId, status, options)
              : Promise.resolve(null);
      return action.then((order) => {
        syncConversationOrderStatus(conversation, order);
        return persistConversationState(activeId).then(() => order);
      });
    };

    const approveActiveProposal = (trigger) => {
      const conversation = conversations[activeId];
      const ordersService = window.Doke?.services?.orders;
      if (!conversation || typeof ordersService?.approveProposal !== 'function') {
        showCopyToast("A aprovação da proposta está indisponível. Recarregue a página e tente novamente.");
        return Promise.resolve(null);
      }
      if (!canTransitionConversationOrder(conversation, 'in_progress')) {
        renderThread(activeId, { scrollTo: "preserve" });
        showCopyToast("Esta proposta já não pode ser aprovada.");
        return Promise.resolve(null);
      }

      if (trigger) {
        trigger.disabled = true;
        trigger.setAttribute('aria-busy', 'true');
      }
      return updateOrderFromConversation('in_progress', { approvalSource: 'messages-proposal' }).then((order) => {
        if (conversation) {
          conversation.lastSeen = order?.statusLabel || 'Proposta aprovada';
          conversation.lastMessage = 'Proposta aprovada pelo cliente';
        }
        return persistConversationState(activeId).then(() => {
          renderThread(activeId, { scrollTo: "preserve" });
          showCopyToast("Proposta aprovada. O atendimento foi liberado.");
          return order;
        });
      }).catch((error) => {
        renderThread(activeId, { scrollTo: "preserve" });
        showCopyToast(error?.message || "Não foi possível aprovar a proposta.");
        return null;
      });
    };

    const rejectActiveProposal = (trigger) => {
      const conversation = conversations[activeId];
      const orderId = conversation?.order?.id || conversation?.orderId;
      const ordersService = window.Doke?.services?.orders;
      if (!conversation || !orderId || !ordersService?.rejectProposal) {
        showCopyToast("Não foi possível localizar a proposta vinculada.");
        return Promise.resolve(null);
      }
      if (!canTransitionConversationOrder(conversation, 'cancelled')) {
        renderThread(activeId, { scrollTo: "preserve" });
        showCopyToast("Esta proposta já não pode ser recusada.");
        return Promise.resolve(null);
      }

      return requestDeclineReason(orderId, trigger, {
        title: "Recusar proposta",
        text: "Explique ao profissional por que a proposta não será aprovada."
      }).then((reason) => {
        if (!reason || !reason.trim()) return null;
        if (trigger) {
          trigger.disabled = true;
          trigger.setAttribute('aria-busy', 'true');
        }
        return ordersService.rejectProposal(orderId, reason.trim(), { rejectionSource: 'messages-proposal' }).then((order) => {
          syncConversationOrderStatus(conversation, order);
          conversation.lastSeen = order?.statusLabel || 'Proposta recusada';
          conversation.lastMessage = 'Proposta recusada pelo cliente';
          return persistConversationState(activeId).then(() => order);
        }).then((order) => {
          renderThread(activeId, { scrollTo: "preserve" });
          showCopyToast("Proposta recusada e pedido encerrado.");
          return order;
        }).catch((error) => {
          renderThread(activeId, { scrollTo: "preserve" });
          showCopyToast(error?.message || "Não foi possível recusar a proposta.");
          return null;
        });
      });
    };

    const cancelActiveOrderBeforePayment = (trigger) => {
      const conversation = conversations[activeId];
      const order = conversation?.order || {};
      const orderId = order.id || conversation?.orderId;
      const ordersService = window.Doke?.services?.orders;
      if (!conversation || !orderId || typeof ordersService?.cancelBeforePayment !== 'function') {
        showCopyToast('O cancelamento do pedido está indisponível.');
        return Promise.resolve(null);
      }
      if (typeof ordersService.canCancelBeforePayment !== 'function' || !ordersService.canCancelBeforePayment(order, getCurrentUser())) {
        renderThread(activeId, { scrollTo: 'preserve' });
        showCopyToast('Este pedido já não pode ser cancelado por este fluxo.');
        return Promise.resolve(null);
      }

      return requestDeclineReason(orderId, trigger, {
        title: 'Cancelar pedido',
        text: 'Explique por que o pedido será encerrado antes da confirmação do pagamento.'
      }).then((reason) => {
        if (!reason || !reason.trim()) return null;
        if (trigger) {
          trigger.disabled = true;
          trigger.setAttribute('aria-busy', 'true');
          trigger.textContent = 'Cancelando...';
        }
        return ordersService.cancelBeforePayment(orderId, reason.trim(), { cancellationSource: 'messages-order-card' }).then((savedOrder) => {
          syncConversationOrderStatus(conversation, savedOrder);
          conversation.lastSeen = savedOrder?.statusLabel || 'Pedido cancelado';
          conversation.lastMessage = 'Pedido cancelado antes do pagamento';
          return persistConversationState(activeId).then(() => savedOrder);
        }).then((savedOrder) => {
          renderThread(activeId, { scrollTo: 'preserve' });
          showCopyToast('Pedido cancelado. Nenhum valor foi movimentado.');
          return savedOrder;
        }).catch((error) => {
          renderThread(activeId, { scrollTo: 'preserve' });
          showCopyToast(error?.message || 'Não foi possível cancelar o pedido.');
          return null;
        });
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
      syncDisputeComposerNotice(null);
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

    const ensureAdvancedMessageSurfaces = () => {
      if (!root.querySelector('[data-message-context-menu]')) {
        const menu = document.createElement('div');
        menu.className = 'messages-message-menu doke-toolbar';
        menu.dataset.messageContextMenu = '';
        menu.hidden = true;
        menu.setAttribute('role', 'menu');
        menu.innerHTML = `
          <button class="doke-btn doke-btn--ghost" type="button" data-advanced-message-action="reply">Responder</button>
          <button class="doke-btn doke-btn--ghost" type="button" data-advanced-message-action="thread">Responder em thread</button>
          <button class="doke-btn doke-btn--ghost" type="button" data-advanced-message-action="react">Reagir</button>
          <button class="doke-btn doke-btn--ghost" type="button" data-advanced-message-action="forward">Encaminhar</button>
          <button class="doke-btn doke-btn--ghost" type="button" data-advanced-message-action="pin">Fixar mensagem</button>
          <button class="doke-btn doke-btn--ghost" type="button" data-advanced-message-action="history">Histórico de edição</button>
          <button class="doke-btn doke-btn--ghost" type="button" data-advanced-message-action="edit">Editar</button>`;
        document.body.appendChild(menu);
      }
      if (!root.querySelector('[data-message-pinned-banner]')) {
        const banner = document.createElement('button');
        banner.className = 'messages-pinned-banner';
        banner.dataset.messagePinnedBanner = '';
        banner.hidden = true;
        banner.innerHTML = `<button class="messages-pinned-banner__main" type="button" data-message-pinned-jump><span class="messages-pinned-banner__icon" aria-hidden="true">⌖</span><span class="messages-pinned-banner__content"><strong data-message-pinned-author>Mensagem fixada</strong><span data-message-pinned-preview></span></span></button><span class="messages-pinned-banner__position" data-message-pinned-position></span><span class="messages-pinned-banner__nav"><button type="button" class="doke-icon-btn doke-icon-btn--flat" data-message-pinned-prev aria-label="Mensagem fixada anterior">‹</button><button type="button" class="doke-icon-btn doke-icon-btn--flat" data-message-pinned-next aria-label="Próxima mensagem fixada">›</button></span>`;
        threadBody?.parentElement?.insertBefore(banner, threadBody);
      }
      if (!root.querySelector('[data-messages-advanced-search]')) {
        const panel = document.createElement('section');
        panel.className = 'messages-advanced-search doke-message-card';
        panel.dataset.messagesAdvancedSearch = '';
        panel.hidden = true;
        panel.innerHTML = `
          <div class="messages-advanced-search__head"><strong>Buscar nesta conversa</strong><button class="doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" data-messages-advanced-search-close aria-label="Fechar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg></button></div>
          <div class="messages-advanced-search__grid">
            <label><span>Texto</span><input class="doke-input" type="search" data-messages-advanced-query placeholder="Buscar mensagem..."></label>
            <label><span>Autor</span><select class="doke-select" data-messages-advanced-author><option value="all">Todos</option><option value="me">Você</option><option value="other">Outra pessoa</option></select></label>
            <label><span>Período</span><select class="doke-select" data-messages-advanced-period><option value="all">Todo período</option><option value="today">Hoje</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option></select></label>
            <label><span>Conteúdo</span><select class="doke-select" data-messages-advanced-attachment><option value="all">Tudo</option><option value="image">Imagem</option><option value="audio">Áudio</option><option value="file">Arquivo</option></select></label>
          </div>`;
        threadBody?.parentElement?.insertBefore(panel, threadBody);
      }
      if (!root.querySelector('[data-message-thread-panel]')) {
        const panel = document.createElement('aside');
        panel.className = 'messages-thread-replies';
        panel.dataset.messageThreadPanel = '';
        panel.hidden = true;
        panel.innerHTML = `<header><div><strong>Thread</strong><span data-message-thread-summary></span></div><button class="doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" data-message-thread-close aria-label="Fechar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg></button></header><div class="messages-thread-replies__list" data-message-thread-list></div><form data-message-thread-form><input class="doke-input" data-message-thread-input placeholder="Responder na thread"><button class="doke-btn doke-btn--primary" type="submit">Enviar</button></form>`;
        document.body.appendChild(panel);
      }
      if (!root.querySelector('[data-message-history-modal]')) {
        const modal = document.createElement('div');
        modal.className = 'messages-history-modal';
        modal.dataset.messageHistoryModal = '';
        modal.hidden = true;
        modal.innerHTML = `<button class="messages-history-modal__backdrop" type="button" data-message-history-close aria-label="Fechar histórico"></button><section role="dialog" aria-modal="true" aria-label="Histórico de edição"><header><strong>Histórico de edição</strong><button class="doke-icon-btn doke-icon-btn--flat" type="button" data-message-history-close>×</button></header><div data-message-history-list></div></section>`;
        document.body.appendChild(modal);
      }
    };

    const getMessageText = (message) => String(message?.text || (message?.type === 'image' ? 'Imagem' : message?.type === 'audio' ? 'Áudio' : '')).trim();
    const ensureMessageAdvancedState = (message) => {
      if (!message || typeof message !== 'object') return message;
      if (!message.reactions || typeof message.reactions !== 'object') message.reactions = {};
      if (!Array.isArray(message.editHistory)) message.editHistory = [];
      if (!Array.isArray(message.threadReplies)) message.threadReplies = [];
      if (typeof message.pinned !== 'boolean') message.pinned = false;
      return message;
    };
    const messageMatchesAdvancedFilter = (message) => {
      const query = advancedMessageFilter.query.toLowerCase();
      if (query && !getMessageText(message).toLowerCase().includes(query)) return false;
      if (advancedMessageFilter.author === 'me' && !message.mine) return false;
      if (advancedMessageFilter.author === 'other' && message.mine) return false;
      if (advancedMessageFilter.attachment !== 'all' && message.type !== advancedMessageFilter.attachment) return false;
      if (advancedMessageFilter.period !== 'all' && message.createdAt) {
        const created = Date.parse(message.createdAt);
        if (created) {
          const age = Date.now() - created;
          const max = advancedMessageFilter.period === 'today' ? 86400000 : advancedMessageFilter.period === '7d' ? 604800000 : 2592000000;
          if (age > max) return false;
        }
      }
      return true;
    };
    const renderMessageReactions = (message, index) => {
      ensureMessageAdvancedState(message);
      const entries = Object.entries(message.reactions).filter(([, users]) => Array.isArray(users) && users.length);
      if (!entries.length) return '';
      return `<div class="message-bubble__reactions">${entries.map(([emoji, users]) => `<button type="button" class="message-reaction" data-message-reaction="${escapeHtml(emoji)}" data-message-index="${index}" aria-label="Reagir com ${escapeHtml(emoji)}">${escapeHtml(emoji)} <span>${users.length}</span></button>`).join('')}</div>`;
    };
    const renderMessageThreadLink = (message, index) => {
      ensureMessageAdvancedState(message);
      if (!message.threadReplies.length) return '';
      return `<button class="message-thread-link doke-btn doke-btn--ghost doke-btn--sm" type="button" data-message-thread-open data-message-index="${message.originalIndex}">${message.threadReplies.length} ${message.threadReplies.length === 1 ? 'resposta' : 'respostas'}</button>`;
    };
    const persistAdvancedConversation = () => {
      try { persistConversationState(activeId); } catch (error) { console.warn('[DokeMessages:advanced-persist]', error); }
    };
    const getPinnedMessages = (conversation) => (conversation?.messages || [])
      .map((message, index) => ({ message: ensureMessageAdvancedState(message), index }))
      .filter(item => item.message.pinned)
      .sort((a, b) => String(b.message.pinnedAt || b.message.createdAt || '').localeCompare(String(a.message.pinnedAt || a.message.createdAt || '')));
    const getPinnedMessagePreview = (message) => {
      if (message?.type === 'image') return 'Imagem fixada';
      if (message?.type === 'audio') return 'Áudio fixado';
      if (message?.type === 'file') return message.fileName || 'Arquivo fixado';
      return getMessageText(message) || 'Mensagem fixada';
    };
    const highlightMessage = (index) => {
      const bubble = threadBody?.querySelector(`[data-message-bubble][data-message-index="${index}"]`);
      if (!bubble) return;
      bubble.scrollIntoView({ behavior: 'smooth', block: 'center' });
      bubble.classList.remove('is-pin-highlighted');
      requestAnimationFrame(() => bubble.classList.add('is-pin-highlighted'));
      window.setTimeout(() => bubble.classList.remove('is-pin-highlighted'), 2600);
    };
    let activePinnedIndex = 0;
    const renderPinnedBanner = (conversation) => {
      const banner = root.querySelector('[data-message-pinned-banner]');
      if (!banner) return;
      const pinned = getPinnedMessages(conversation);
      banner.hidden = pinned.length === 0;
      if (!pinned.length) {
        activePinnedIndex = 0;
        return;
      }
      activePinnedIndex = Math.min(activePinnedIndex, pinned.length - 1);
      const current = pinned[activePinnedIndex];
      banner.dataset.messageIndex = String(current.index);
      const author = banner.querySelector('[data-message-pinned-author]');
      const preview = banner.querySelector('[data-message-pinned-preview]');
      const position = banner.querySelector('[data-message-pinned-position]');
      const prev = banner.querySelector('[data-message-pinned-prev]');
      const next = banner.querySelector('[data-message-pinned-next]');
      if (author) author.textContent = `${current.message.mine ? 'Você' : (current.message.author || conversation.name)}:`;
      if (preview) preview.textContent = getPinnedMessagePreview(current.message);
      if (position) position.textContent = `${activePinnedIndex + 1}/${pinned.length}`;
      if (prev) prev.disabled = pinned.length < 2;
      if (next) next.disabled = pinned.length < 2;
    };
    const movePinnedBanner = (direction) => {
      const conversation = conversations[activeId];
      const pinned = getPinnedMessages(conversation);
      if (!pinned.length) return;
      activePinnedIndex = (activePinnedIndex + direction + pinned.length) % pinned.length;
      renderPinnedBanner(conversation);
    };

    ensureAdvancedMessageSurfaces();

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
      syncDisputeComposerNotice(conversation);
      const hasOrderContext = conversation.group === "orders" || Boolean(conversation.orderId || conversation.order?.id);
      if (threadEmpty) threadEmpty.hidden = hasOrderContext || conversation.messages.length !== 0;
      if (threadBody) threadBody.hidden = !hasOrderContext && conversation.messages.length === 0;
      const activeInitials = getConversationInitials(conversation.name);
      conversation.messages.forEach(ensureMessageAdvancedState);
      const renderedMessages = conversation.messages.map((message, index, messages) => ({
        ...message,
        originalIndex: index,
        groupStart: !window.DokeMessageAuthor || window.DokeMessageAuthor.startsGroup(messages, index, 300000),
        resolvedAuthor: resolveThreadMessageAuthor(message, conversation)
      })).filter(messageMatchesAdvancedFilter);
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
      ` : "") + renderedMessages.map((message) => `
        <article class="message-row has-author-avatar${message.mine ? " message-row--me" : ""}${isFinancialMessage(conversation, message) ? " message-row--charge" : ""}${message.groupStart ? " is-message-group-start" : " is-message-group-continuation"}" data-message-index="${message.originalIndex}">
          ${renderMessageAuthorAvatar(message.resolvedAuthor)}
          <div class="message-bubble doke-selectable-card${message.mine ? " message-bubble--me" : ""}${message.type === "image" ? " message-bubble--image-only" : ""}${isFinancialMessage(conversation, message) ? " message-bubble--charge" : ""}${message.pinned ? " is-message-pinned" : ""}${selectedMessageIndexes.has(message.originalIndex) ? " is-selected" : ""}" data-message-bubble data-message-index="${message.originalIndex}" role="option" tabindex="0" aria-selected="${selectedMessageIndexes.has(message.originalIndex) ? "true" : "false"}">
            <div class="message-bubble__meta">
              <span>${escapeHtml(message.mine ? "Você" : message.resolvedAuthor.name)}</span>
              <span>${message.time}</span>
            </div>
            ${message.pinned ? `<span class="message-bubble__pinned-badge">⌖ Fixada</span>` : ""}
            ${message.replyTo ? `
            <div class="message-bubble__reply${message.mine ? " message-bubble__reply--me" : ""}">
              <strong>${message.replyTo.author}</strong>
              <span>${String(message.replyTo.text || "").slice(0, 72)}</span>
            </div>` : ""}
            ${message.forwardedFrom ? `<div class="message-bubble__forwarded">Encaminhada de ${escapeHtml(message.forwardedFrom)}</div>` : ""}
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
            ${message.editedAt ? `<span class="message-bubble__edited">editada</span>` : ""}
            ${renderMessageReactions(message, message.originalIndex)}
            ${renderMessageThreadLink(message, message.originalIndex)}
          </div>
        </article>
      `).join("");
      renderPinnedBanner(conversation);
      conversation.messages.forEach((message, index) => {
        if (!isFinancialMessage(conversation, message)) return;
        const bubble = threadBody.querySelector(`.message-bubble[data-message-index="${index}"]`);
        if (!bubble) return;
        const paragraph = bubble.querySelector("p");
        if (paragraph) paragraph.remove();
        const chargeCard = document.createElement("div");
        chargeCard.className = "message-bubble__charge doke-card doke-message-card";
        chargeCard.dataset.domainCard = "message";
        const chargePresentation = getFinancialCardPresentation(conversation, message);
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
          <div class="message-bubble__charge-details" aria-label="Detalhes financeiros">
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
      const conversation = conversations[activeId];
      const actionKind = getFinancialActionKind(conversation);
      if (!actionKind) return;
      const isCharge = actionKind === "charge";
      chargeModal.dataset.financialAction = actionKind;
      const eyebrow = chargeModal.querySelector(".charge-modal__eyebrow");
      const eyebrowTextNode = eyebrow ? Array.from(eyebrow.childNodes).find((node) => node.nodeType === 3) : null;
      if (eyebrowTextNode) eyebrowTextNode.nodeValue = isCharge ? "Cobrança" : "Proposta";
      const title = chargeModal.querySelector(".doke-financial-modal__title");
      const description = chargeModal.querySelector(".surface-modal__intro p");
      const amountLabel = chargeModal.querySelector(".charge-modal__field > span");
      const submit = chargeForm?.querySelector('[type="submit"]');
      const close = chargeModal.querySelector("[data-charge-cancel][aria-label]");
      if (title) title.textContent = isCharge ? "Nova cobrança" : "Nova proposta";
      if (description) description.textContent = isCharge
        ? "Envie a cobrança correspondente ao valor aprovado."
        : "Formalize o valor para aprovação do cliente.";
      if (amountLabel) amountLabel.textContent = isCharge ? "Valor da cobrança" : "Valor da proposta";
      if (submit) {
        submit.textContent = isCharge ? "Enviar cobrança" : "Enviar proposta";
        submit.dataset.actionLoadingLabel = isCharge ? "Enviando cobrança" : "Enviando proposta";
      }
      if (close) close.setAttribute("aria-label", isCharge ? "Fechar cobrança" : "Fechar proposta");
      if (isCharge && chargeAmountInput) {
        const approvedAmount = String(conversation?.order?.proposalAmount || conversation?.order?.budget || "")
          .replace(/^\s*R\$\s*/i, "")
          .trim();
        if (approvedAmount) chargeAmountInput.value = approvedAmount;
      }
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
      if (completionModal) completionModal.dataset.completionState = panelName;
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
        const orderId = order.id || conversation?.orderId || '';
        completionIssueLink.href = orderId ? `pedidos.html?order=${encodeURIComponent(orderId)}&action=report_problem` : activeId ? `mensagens.html?conversation=${encodeURIComponent(activeId)}` : 'mensagens.html';
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

    const requestChargeCompletion = (conversationId, messageIndex) => {
      const conversation = conversations[conversationId];
      const currentMessage = conversation?.messages?.[messageIndex];
      const orderId = conversation?.order?.id || conversation?.orderId || "";
      const paymentService = window.Doke?.services?.payments;
      if (!conversation || !currentMessage || !isChargeMessage(conversation, currentMessage)) {
        return Promise.reject(new Error('Cobrança não encontrada.'));
      }
      if (!orderId || typeof paymentService?.requestCompletion !== 'function') {
        return Promise.reject(new Error('Comando canônico de solicitação de conclusão indisponível.'));
      }

      return paymentService.requestCompletion(orderId, {
        conversationId,
        messageId: currentMessage.id || currentMessage.messageId || '',
        chargeMessageId: currentMessage.id || currentMessage.messageId || ''
      }).then((result) => {
        if (result?.conversation) conversations[conversationId] = result.conversation;
        else if (result?.order) syncConversationOrderStatus(conversation, result.order);
        renderThread(conversationId, { scrollTo: 'preserve' });
        return result?.charge || getActualChargeMessage(conversations[conversationId] || conversation) || currentMessage;
      });
    };

    const completeChargeMessage = (conversationId, messageIndex) => {
      const conversation = conversations[conversationId];
      const currentMessage = conversation?.messages?.[messageIndex];
      const orderId = conversation?.order?.id || conversation?.orderId || "";
      const paymentService = window.Doke?.services?.payments;
      if (!conversation || !currentMessage || !isChargeMessage(conversation, currentMessage)) {
        return Promise.reject(new Error('Cobrança não encontrada.'));
      }
      if (!orderId || typeof paymentService?.confirmCompletion !== 'function') {
        return Promise.reject(new Error('Comando canônico de confirmação da conclusão indisponível.'));
      }

      return paymentService.confirmCompletion(orderId, {
        conversationId,
        messageId: currentMessage.id || currentMessage.messageId || '',
        chargeMessageId: currentMessage.id || currentMessage.messageId || '',
        completionNote: completionNote?.value?.trim() || ''
      }).then((result) => {
        if (result?.conversation) conversations[conversationId] = result.conversation;
        else if (result?.order) syncConversationOrderStatus(conversation, result.order);
        renderThread(conversationId, { scrollTo: 'end' });
        return result?.charge || getActualChargeMessage(conversations[conversationId] || conversation) || currentMessage;
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
      const hasVisibleConversation = visibleCount !== 0;
      root.classList.toggle("messages-app--empty-results", !hasVisibleConversation);
      if (emptyState) {
        if (hydration && !hydration.canShowEmpty()) {
          root.classList.remove("messages-app--empty-results");
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
      const cancelOrderButton = event.target.closest("[data-messages-cancel-order]");
      const approveProposalButton = event.target.closest("[data-messages-approve-proposal]");
      const proposalButton = event.target.closest("[data-messages-proposal-action]");
      const chargeActionButton = event.target.closest("[data-messages-charge-action]");
      const financialActionButton = proposalButton || chargeActionButton;
      if (financialActionButton && root.contains(financialActionButton)) {
        event.preventDefault();
        event.stopPropagation();
        const conversation = conversations[activeId];
        const actionKind = getFinancialActionKind(conversation);
        if (!actionKind) {
          renderThread(activeId, { scrollTo: "preserve" });
          showCopyToast("Esta ação financeira não está disponível no estado atual do pedido.");
          return;
        }
        openChargeModal();
        return;
      }

      if (cancelOrderButton && root.contains(cancelOrderButton)) {
        event.preventDefault();
        event.stopPropagation();
        cancelActiveOrderBeforePayment(cancelOrderButton);
        return;
      }

      if (approveProposalButton && root.contains(approveProposalButton)) {
        event.preventDefault();
        event.stopPropagation();
        approveActiveProposal(approveProposalButton);
        return;
      }

      if ((acceptOrderButton || declineOrderButton) && root.contains(acceptOrderButton || declineOrderButton)) {
        event.preventDefault();
        event.stopPropagation();
        const conversation = conversations[activeId];
        const orderId = conversation?.order?.id || conversation?.orderId;
        const ordersService = window.Doke?.services?.orders;
        const nextStatus = acceptOrderButton ? "accepted" : "cancelled";
        if (!orderId || !ordersService) return;
        if (!canTransitionConversationOrder(conversation, nextStatus)) {
          renderThread(activeId, { scrollTo: "preserve" });
          showCopyToast("Esta ação não é permitida no estado atual do pedido.");
          return;
        }

        if (acceptOrderButton) {
          acceptOrderButton.disabled = true;
          acceptOrderButton.textContent = "Aceitando...";
          ordersService.accept(orderId).then((order) => {
            if (conversation) {
              syncConversationOrderStatus(conversation, order);
              conversation.lastSeen = order?.statusLabel || "Conversa liberada";
              conversation.lastMessage = order?.statusLabel || "Conversa liberada";
            }
            renderThread(activeId, { scrollTo: "end" });
          }).catch((error) => {
            acceptOrderButton.disabled = false;
            acceptOrderButton.textContent = "Aceitar pedido";
            showCopyToast(error?.message || "Não foi possível aceitar o pedido.");
          });
          return;
        }

        const proposalRejection = !isProfessionalConversationView(conversation) && getOrderStatus(conversation) === 'quoted';
        requestDeclineReason(orderId, declineOrderButton, proposalRejection ? {
          title: "Recusar proposta",
          text: "Explique ao profissional por que a proposta não será aprovada."
        } : {}).then((reason) => {
          if (!reason || !reason.trim()) return;
          if (!canTransitionConversationOrder(conversation, "cancelled")) {
            renderThread(activeId, { scrollTo: "preserve" });
            showCopyToast("Este pedido já não pode ser recusado.");
            return;
          }

          declineOrderButton.disabled = true;
          declineOrderButton.textContent = "Recusando...";
          const declineTask = proposalRejection && typeof ordersService.rejectProposal === 'function'
            ? ordersService.rejectProposal(orderId, reason.trim(), { rejectionSource: 'messages-order-card' })
            : ordersService.decline(orderId, reason.trim());
          declineTask.then((order) => {
            if (conversation) {
              syncConversationOrderStatus(conversation, order);
              conversation.order = Object.assign({}, conversation.order || {}, { refusalReason: reason.trim() });
              conversation.lastSeen = order?.statusLabel || "Pedido recusado";
              conversation.lastMessage = order?.statusLabel || "Pedido recusado";
            }
            renderThread(activeId, { scrollTo: "end" });
          }).catch((error) => {
            declineOrderButton.disabled = false;
            declineOrderButton.textContent = proposalRejection ? "Recusar proposta" : "Recusar";
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
      const previousActiveId = activeId;
      const hydrationResult = hydrateLocalConversations(root);
      const activeConversationRemoved = Boolean(previousActiveId && !conversations[previousActiveId]);

      if (hydrationResult.scopeChanged) {
        selectedConversationIds.clear();
        selectedMessageIndexes.clear();
        activeId = "";
        renderEmptyThread();
      } else if (activeConversationRemoved) {
        activeId = "";
        renderEmptyThread();
      }

      prepareConversationItems();
      refreshConversationCards();
      syncVisibility();
      hydration?.mark('local-conversations');

      const nextConversationFromOrder = requestedOrderId
        ? Object.keys(conversations).find((id) => String(conversations[id]?.orderId || conversations[id]?.order?.id || "") === String(requestedOrderId))
        : "";
      const hasActiveConversation = Boolean(activeId && conversations[activeId]);
      const shouldSelectConversation = preferRequested && !hasActiveConversation;

      if (shouldSelectConversation) {
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
        return;
      }

      if (hasActiveConversation) {
        renderThread(activeId, { scrollTo: "preserve", openOnMobile: false });
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
    document.addEventListener("doke:order-reviewed", () => refreshLocalConversationSurface({ preferRequested: true }));
    document.addEventListener("doke:message-sent", () => refreshLocalConversationSurface({ preferRequested: true }));
    document.addEventListener("doke:message-removed", () => refreshLocalConversationSurface({ preferRequested: true }));
    document.addEventListener('doke:page-hydration-ready', (event) => {
      if (event.detail?.page !== 'mensagens') return;
      syncVisibility();
    });
    refreshLocalConversationSurface({ preferRequested: true });
    if (document.documentElement.dataset.authSurfaceReady === 'true') {
      hydration?.mark('auth');
    }

    const closeMessageContextMenu = () => {
      const menu = document.querySelector('[data-message-context-menu]');
      if (menu) menu.hidden = true;
      messageContextIndex = -1;
    };
    const openMessageContextMenu = (event, index) => {
      const menu = document.querySelector('[data-message-context-menu]');
      const message = conversations[activeId]?.messages?.[index];
      if (!menu || !message) return;
      messageContextIndex = index;
      const edit = menu.querySelector('[data-advanced-message-action="edit"]');
      if (edit) edit.hidden = !message.mine || message.type !== 'text';
      const history = menu.querySelector('[data-advanced-message-action="history"]');
      if (history) history.hidden = !Array.isArray(message.editHistory) || !message.editHistory.length;
      const pin = menu.querySelector('[data-advanced-message-action="pin"]');
      if (pin) pin.textContent = message.pinned ? 'Desfixar mensagem' : 'Fixar mensagem';
      menu.style.left = `${Math.min(event.clientX, window.innerWidth - 240)}px`;
      menu.style.top = `${Math.min(event.clientY, window.innerHeight - 300)}px`;
      menu.hidden = false;
    };
    const openMessageHistory = (message) => {
      const modal = document.querySelector('[data-message-history-modal]');
      const list = modal?.querySelector('[data-message-history-list]');
      if (!modal || !list) return;
      const history = Array.isArray(message.editHistory) ? message.editHistory : [];
      list.innerHTML = history.length ? history.slice().reverse().map(item => `<article><p>${escapeHtml(item.text || '')}</p><time>${escapeHtml(item.editedAt || '')}</time></article>`).join('') : '<p>Nenhuma versão anterior.</p>';
      modal.hidden = false;
    };
    const openMessageThread = (index) => {
      const panel = document.querySelector('[data-message-thread-panel]');
      const message = conversations[activeId]?.messages?.[index];
      if (!panel || !message) return;
      ensureMessageAdvancedState(message);
      activeThreadMessageIndex = index;
      const list = panel.querySelector('[data-message-thread-list]');
      const summary = panel.querySelector('[data-message-thread-summary]');
      if (summary) summary.textContent = getMessageText(message).slice(0, 72);
      if (list) list.innerHTML = message.threadReplies.length ? message.threadReplies.map(reply => `<article><strong>${escapeHtml(reply.author || 'Você')}</strong><p>${escapeHtml(reply.text || '')}</p><time>${escapeHtml(reply.time || '')}</time></article>`).join('') : '<p class="messages-thread-replies__empty">Nenhuma resposta ainda.</p>';
      panel.hidden = false;
      panel.querySelector('[data-message-thread-input]')?.focus();
    };

    threadBody?.addEventListener('contextmenu', (event) => {
      const bubble = event.target.closest('[data-message-bubble]');
      if (!bubble) return;
      event.preventDefault();
      openMessageContextMenu(event, Number(bubble.dataset.messageIndex || -1));
    });

    document.querySelector('[data-message-context-menu]')?.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-advanced-message-action]')?.dataset.advancedMessageAction;
      const message = conversations[activeId]?.messages?.[messageContextIndex];
      if (!action || !message) return;
      if (action === 'reply') setReplyPreview(message);
      if (action === 'thread') openMessageThread(messageContextIndex);
      if (action === 'react') {
        const emoji = await window.DokeDialog.prompt('Escolha o emoji da reação.', '👍', { title: 'Adicionar reação', label: 'Emoji', confirmText: 'Adicionar' });
        if (emoji) {
          ensureMessageAdvancedState(message);
          const userId = getCurrentUserId() || 'me';
          const users = Array.isArray(message.reactions[emoji]) ? message.reactions[emoji] : [];
          message.reactions[emoji] = users.includes(userId) ? users.filter(id => id !== userId) : users.concat(userId);
          persistAdvancedConversation();
          renderThread(activeId);
        }
      }
      if (action === 'edit' && message.mine && message.type !== 'image' && message.type !== 'audio') {
        const nextText = await window.DokeDialog.prompt('Edite o conteúdo da mensagem.', getMessageText(message), { title: 'Editar mensagem', label: 'Mensagem', confirmText: 'Salvar' });
        if (nextText && nextText.trim() && nextText.trim() !== getMessageText(message)) {
          ensureMessageAdvancedState(message);
          message.editHistory.push({ text: getMessageText(message), editedAt: new Date().toLocaleString('pt-BR') });
          message.text = nextText.trim();
          message.editedAt = new Date().toISOString();
          persistAdvancedConversation();
          renderThread(activeId);
        }
      }
      if (action === 'pin') {
        ensureMessageAdvancedState(message);
        message.pinned = !message.pinned;
        message.pinnedAt = message.pinned ? new Date().toISOString() : '';
        persistAdvancedConversation();
        renderThread(activeId);
        showCopyToast(message.pinned ? 'Mensagem fixada' : 'Mensagem desafixada');
      }
      if (action === 'history') openMessageHistory(message);
      if (action === 'forward') {
        const targets = Object.entries(conversations).filter(([id]) => id !== activeId);
        const targetName = await window.DokeDialog.prompt(`Escolha a conversa de destino.\n\n${targets.map(([, c]) => c.name).join('\n')}`, '', { title: 'Encaminhar mensagem', label: 'Conversa', confirmText: 'Encaminhar' });
        const target = targets.find(([, c]) => c.name.toLowerCase() === String(targetName || '').trim().toLowerCase());
        if (target) {
          const copy = { ...message, mine: true, author: 'Você', time: 'agora', forwardedFrom: message.mine ? 'Você' : message.author, reactions: {}, threadReplies: [], editHistory: [] };
          target[1].messages.push(copy);
          persistConversationMessage(target[0], copy);
          showCopyToast('Mensagem encaminhada');
        }
      }
      closeMessageContextMenu();
    });

    root.querySelector('[data-message-pinned-jump]')?.addEventListener('click', () => {
      const banner = root.querySelector('[data-message-pinned-banner]');
      const index = Number(banner?.dataset.messageIndex || -1);
      if (index >= 0) highlightMessage(index);
    });
    root.querySelector('[data-message-pinned-prev]')?.addEventListener('click', () => movePinnedBanner(-1));
    root.querySelector('[data-message-pinned-next]')?.addEventListener('click', () => movePinnedBanner(1));

    threadBody?.addEventListener('click', (event) => {
      const reaction = event.target.closest('[data-message-reaction]');
      if (reaction) {
        const index = Number(reaction.dataset.messageIndex || -1);
        const message = conversations[activeId]?.messages?.[index];
        if (!message) return;
        ensureMessageAdvancedState(message);
        const emoji = reaction.dataset.messageReaction;
        const userId = getCurrentUserId() || 'me';
        const users = Array.isArray(message.reactions[emoji]) ? message.reactions[emoji] : [];
        message.reactions[emoji] = users.includes(userId) ? users.filter(id => id !== userId) : users.concat(userId);
        persistAdvancedConversation();
        renderThread(activeId);
        return;
      }
      const threadLink = event.target.closest('[data-message-thread-open]');
      if (threadLink) {
        openMessageThread(Number(threadLink.dataset.messageIndex || -1));
      }
    });

    document.querySelector('[data-message-thread-close]')?.addEventListener('click', () => {
      const panel = document.querySelector('[data-message-thread-panel]');
      if (panel) panel.hidden = true;
      activeThreadMessageIndex = -1;
    });
    document.querySelector('[data-message-thread-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = event.currentTarget.querySelector('[data-message-thread-input]');
      const value = String(input?.value || '').trim();
      const message = conversations[activeId]?.messages?.[activeThreadMessageIndex];
      if (!value || !message) return;
      ensureMessageAdvancedState(message);
      message.threadReplies.push({ author: 'Você', text: value, time: new Date().toLocaleString('pt-BR') });
      if (input) input.value = '';
      persistAdvancedConversation();
      openMessageThread(activeThreadMessageIndex);
      renderThread(activeId);
    });
    document.querySelectorAll('[data-message-history-close]').forEach(button => button.addEventListener('click', () => {
      const modal = document.querySelector('[data-message-history-modal]');
      if (modal) modal.hidden = true;
    }));

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

      const approveProposalButton = event.target.closest("[data-message-approve-proposal]");
      if (approveProposalButton) {
        event.preventDefault();
        approveActiveProposal(approveProposalButton);
        return;
      }

      const rejectProposalButton = event.target.closest("[data-message-reject-proposal]");
      if (rejectProposalButton) {
        event.preventDefault();
        rejectActiveProposal(rejectProposalButton);
        return;
      }

      const payButton = event.target.closest("[data-message-pay]");
      if (payButton) {
        event.preventDefault();
        const index = Number(bubble?.dataset.messageIndex || -1);
        const conversation = conversations[activeId];
        const currentMessage = conversation?.messages?.[index];
        if (!currentMessage || !isChargeMessage(conversation, currentMessage)) return;
        confirmChargePayment(currentMessage);
        return;
      }

      const receiptButton = event.target.closest("[data-message-receipt]");
      if (receiptButton) {
        event.preventDefault();
        const index = Number(bubble?.dataset.messageIndex || -1);
        const conversation = conversations[activeId];
        const currentMessage = conversation?.messages?.[index];
        if (!currentMessage || !isChargeMessage(conversation, currentMessage)) return;
        openReceiptModal(conversation, currentMessage, receiptButton);
        return;
      }

      const requestCompletionButton = event.target.closest("[data-message-request-completion]");
      if (requestCompletionButton) {
        event.preventDefault();
        const index = Number(bubble?.dataset.messageIndex || -1);
        const conversation = conversations[activeId];
        const currentMessage = conversation?.messages?.[index];
        if (!currentMessage || !isChargeMessage(conversation, currentMessage)) return;
        requestCompletionButton.disabled = true;
        requestCompletionButton.setAttribute('aria-busy', 'true');
        requestChargeCompletion(activeId, index)
          .then(() => showCopyToast('Conclusão solicitada ao cliente.'))
          .catch((error) => {
            showCopyToast(error?.message || 'Não foi possível solicitar a conclusão.');
            renderThread(activeId, { scrollTo: 'preserve' });
          });
        return;
      }

      const completeButton = event.target.closest("[data-message-complete]");
      if (completeButton) {
        event.preventDefault();
        const index = Number(bubble?.dataset.messageIndex || -1);
        const conversation = conversations[activeId];
        const currentMessage = conversation?.messages?.[index];
        if (!currentMessage || !isChargeMessage(conversation, currentMessage)) return;

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
        const conversation = conversations[activeId];
        const currentMessage = conversation?.messages?.[index];
        if (!currentMessage || !isChargeMessage(conversation, currentMessage)) return;
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
      closeReceiptModal();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-message-receipt-close]")) return;
      if (!target.closest("[data-message-receipt-modal]")) return;
      event.preventDefault();
      closeReceiptModal();
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
        publishConversationNotification(activeId, audioMessage, /(^|\s)@[\w.-]+/.test(String(audioMessage.text || '')) ? 'mention' : 'message');
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
        publishConversationNotification(activeId, imageMessage, /(^|\s)@[\w.-]+/.test(String(imageMessage.text || '')) ? 'mention' : 'message');
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
      publishConversationNotification(activeId, textMessage, /(^|\s)@[\w.-]+/.test(String(textMessage.text || '')) ? 'mention' : 'message');
      renderThread(activeId, { scrollTo: "end" });
      composer.reset();
      clearReplyPreview();
      composerInput?.focus();
    });



    const pendingNotificationActions = new Set();
    document.addEventListener('doke:notification-action', (event) => {
      const action = event.detail || {};
      const actionId = String(action.id || action.actionKey || '');
      if (actionId && pendingNotificationActions.has(actionId)) return;
      if (actionId) pendingNotificationActions.add(actionId);
      const releaseNotificationAction = () => { if (actionId) pendingNotificationActions.delete(actionId); };

      if (action.kind === 'quick-reply') {
        const conversationId = String(action.conversationId || '');
        const text = String(action.text || '').trim();
        if (!conversationId || !text || !conversations[conversationId]) {
          document.dispatchEvent(new CustomEvent('doke:notification-action-error', {
            detail: { notificationId: action.notificationId, message: 'Não foi possível localizar a conversa.', retryPayload: action }
          }));
          releaseNotificationAction();
          return;
        }
        const message = { id: `quick-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, author: 'Você', time: 'agora', text, mine: true, quickReply: true };
        conversations[conversationId].messages.push(message);
        Promise.resolve(persistConversationMessage(conversationId, message)).then(() => {
          publishConversationNotification(conversationId, message, /(^|\s)@[\w.-]+/.test(text) ? 'mention' : 'message');
          if (activeId === conversationId) renderThread(conversationId, { scrollTo: 'end' });
          window.DokeInAppNotifications?.recordActionResult(action.notificationId, 'completed', 'Resposta enviada.', { kind: 'delete-last-message', conversationId, messageId: message.id });
          showCopyToast('Resposta enviada pela notificação.');
        }).catch((error) => {
          conversations[conversationId].messages = conversations[conversationId].messages.filter((item) => item !== message);
          document.dispatchEvent(new CustomEvent('doke:notification-action-error', {
            detail: { notificationId: action.notificationId, message: error?.message || 'Não foi possível enviar a resposta.', retryPayload: action }
          }));
        }).finally(releaseNotificationAction);
        return;
      }

      if (action.kind === 'delete-last-message') {
        const conversationId = String(action.conversationId || '');
        const conversation = conversations[conversationId];
        if (!conversation) { releaseNotificationAction(); return; }
        const messages = conversation.messages || [];
        const index = action.messageId
          ? messages.findIndex((message) => String(message.id || '') === String(action.messageId))
          : messages.map((message) => Boolean(message.quickReply)).lastIndexOf(true);
        if (index < 0) {
          document.dispatchEvent(new CustomEvent('doke:notification-action-error', {
            detail: { notificationId: action.notificationId, message: 'A resposta já não pode ser desfeita.' }
          }));
          releaseNotificationAction();
          return;
        }
        messages.splice(index, 1);
        if (activeId === conversationId) renderThread(conversationId, { scrollTo: 'preserve' });
        window.DokeInAppNotifications?.recordActionResult(action.notificationId, 'completed', 'Resposta desfeita.');
        releaseNotificationAction();
        return;
      }

      releaseNotificationAction();
    });

    chargeButton?.addEventListener("click", () => {
      const activeConversation = conversations[activeId];
      if (!activeConversation) {
        showCopyToast("Selecione uma conversa para continuar.");
        renderEmptyThread();
        return;
      }
      const actionKind = getFinancialActionKind(activeConversation);
      if (!actionKind) {
        syncChargeActionVisibility(activeConversation);
        showCopyToast("Esta ação financeira não está disponível no estado atual do pedido.");
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
        const panel = root.querySelector('[data-messages-advanced-search]');
        if (panel) {
          panel.hidden = !panel.hidden;
          window.setTimeout(() => panel.querySelector('[data-messages-advanced-query]')?.focus(), 20);
        }
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

    const syncAdvancedMessageSearch = () => {
      const panel = root.querySelector('[data-messages-advanced-search]');
      if (!panel) return;
      advancedMessageFilter.query = String(panel.querySelector('[data-messages-advanced-query]')?.value || '').trim();
      advancedMessageFilter.author = String(panel.querySelector('[data-messages-advanced-author]')?.value || 'all');
      advancedMessageFilter.period = String(panel.querySelector('[data-messages-advanced-period]')?.value || 'all');
      advancedMessageFilter.attachment = String(panel.querySelector('[data-messages-advanced-attachment]')?.value || 'all');
      renderThread(activeId, { scrollTo: 'preserve' });
    };
    root.querySelector('[data-messages-advanced-search]')?.addEventListener('input', syncAdvancedMessageSearch);
    root.querySelector('[data-messages-advanced-search]')?.addEventListener('change', syncAdvancedMessageSearch);
    root.querySelector('[data-messages-advanced-search-close]')?.addEventListener('click', () => {
      const panel = root.querySelector('[data-messages-advanced-search]');
      if (panel) panel.hidden = true;
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-message-context-menu]') && !event.target.closest('[data-message-bubble]')) closeMessageContextMenu();
    });

    chargeForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const conversationId = activeId;
      const conversation = conversations[conversationId];
      const ordersService = window.Doke?.services?.orders;
      const orderId = conversation?.order?.id || conversation?.orderId;
      const normalized = String(chargeAmountInput?.value || "").trim();
      const submitButton = chargeForm.querySelector('[type="submit"]');
      const actionKind = chargeModal?.dataset.financialAction || getFinancialActionKind(conversation);
      const isChargeAction = actionKind === "charge";
      const command = isChargeAction ? ordersService?.createCharge : ordersService?.submitProposal;

      if (!conversation || !orderId || typeof command !== "function") {
        showCopyToast(isChargeAction
          ? "O comando de cobrança está indisponível."
          : "O comando de proposta está indisponível.");
        return;
      }
      if (!normalized) {
        showCopyToast(isChargeAction ? "Informe o valor da cobrança." : "Informe o valor da proposta.");
        chargeAmountInput?.focus();
        return;
      }
      if (!canUseChargeAction(conversation) || getFinancialActionKind(conversation) !== actionKind) {
        closeChargeModal();
        renderThread(conversationId, { scrollTo: "preserve" });
        showCopyToast("O pedido mudou de estado e esta ação não está mais disponível.");
        return;
      }

      const amount = normalized.startsWith("R$") ? normalized : `R$ ${normalized}`;
      const installments = chargeInstallments?.selectedOptions?.[0]?.textContent || "À vista";
      if (submitButton) submitButton.disabled = true;

      command.call(ordersService, orderId, {
        amount,
        budget: amount,
        installments,
        messageText: isChargeAction
          ? "Cobrança enviada. Realize o pagamento pela Doke para registrar a transação com segurança."
          : "Proposta pronta para aprovação. Revise os valores e confirme para liberar o atendimento."
      }).then((result) => {
        const currentConversation = conversations[conversationId];
        if (currentConversation && result?.order) syncConversationOrderStatus(currentConversation, result.order);
        if (currentConversation && result?.message) {
          const messageId = getMessageIdentifier(result.message);
          const alreadyHydrated = messageId && currentConversation.messages.some((message) => getMessageIdentifier(message) === messageId);
          if (!alreadyHydrated) currentConversation.messages.push(result.message);
          currentConversation.lastMessage = getMessagePreview(result.message, currentConversation) || currentConversation.lastMessage;
          currentConversation.lastSeen = result.order?.statusLabel || currentConversation.lastSeen;
        }
        closeChargeModal();
        if (activeId === conversationId) renderThread(conversationId, { scrollTo: "end" });
        showCopyToast(isChargeAction ? "Cobrança enviada ao cliente." : "Proposta enviada ao cliente.");
      }).catch((error) => {
        if (error?.rollbackMessageFailed) {
          console.warn("[DokeMessages:financialMessageRollback]", error.rollbackError || error);
        }
        showCopyToast(error?.message || (isChargeAction
          ? "Não foi possível enviar a cobrança."
          : "Não foi possível enviar a proposta."));
      }).finally(() => {
        if (submitButton) submitButton.disabled = false;
      });
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

    completionIssueLink?.addEventListener('click', (event) => {
      event.preventDefault();
      const contextId = pendingCompletion?.conversationId || activeId;
      const conversation = conversations[contextId];
      const message = pendingCompletion?.message || conversation?.messages?.[pendingCompletion?.messageIndex ?? -1] || getLatestChargeMessage(contextId);
      if (!conversation) {
        showCopyToast('Selecione uma conversa para relatar o problema.');
        return;
      }

      requestIssueReport(conversation, completionIssueLink).then((report) => {
        if (!report) return;
        completionIssueLink.setAttribute('aria-busy', 'true');
        completionIssueLink.textContent = 'Enviando...';
        submitIssueReport(conversation, message, report)
          .then(() => {
            closeCompletionModal();
            refreshLocalConversationSurface({ preferRequested: true });
            if (contextId && conversations[contextId]) renderThread(contextId, { scrollTo: 'start', openOnMobile: true });
            showCopyToast('Relato enviado. O pedido entrou em contestação.');
          })
          .catch((error) => showCopyToast(error?.message || 'Não foi possível enviar o relato.'))
          .finally(() => {
            completionIssueLink.removeAttribute('aria-busy');
            completionIssueLink.textContent = 'Tenho um problema';
          });
      });
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
    ["doke:wallet-dispute-opened", "doke:wallet-dispute-resolved", "doke:order-dispute-synced", "doke:completion-requested", "doke:payment-released"].forEach((eventName) => {
      document.addEventListener(eventName, () => {
        hydrateLocalConversations(root);
        syncVisibility();
        if (activeId) renderThread(activeId);
      });
    });

    renderThread(activeId, { scrollTo: "start", openOnMobile: hasDirectThreadRequest });
    if (isCompactThreadViewport()) {
      setCompactThreadOpen(hasDirectThreadRequest);
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


/* Mensagens — mantém o topo da conversa estável durante a hidratação inicial. */
(() => {
  if (document.body?.dataset.page !== 'mensagens') return;

  const resetThreadTop = () => {
    document.querySelectorAll('[data-thread-body]').forEach((threadBody) => {
      try {
        threadBody.scrollTop = 0;
      } catch (error) {
        // Thread may be detached during route swaps.
      }
    });
  };

  const resetThreadTopOnNextFrames = () => {
    requestAnimationFrame(() => requestAnimationFrame(resetThreadTop));
  };

  const observeInitialThreadHydration = () => {
    resetThreadTopOnNextFrames();
    window.addEventListener('load', resetThreadTopOnNextFrames, { once: true });

    const body = document.querySelector('[data-thread-body]');
    if (!body || typeof MutationObserver !== 'function') return;

    const observer = new MutationObserver(resetThreadTopOnNextFrames);
    observer.observe(body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 2500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeInitialThreadHydration, { once: true });
  } else {
    observeInitialThreadHydration();
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
