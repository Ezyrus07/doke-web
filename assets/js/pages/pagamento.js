(() => {
  const parseCurrency = (value) =>
    Number(String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;

  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.max(0, value));

  const digitsOnly = (value) => String(value || "").replace(/\D/g, "");
  const formatCardNumber = (value) => digitsOnly(value).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  const formatExpiry = (value) => {
    const digits = digitsOnly(value).slice(0, 4);
    return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };
  const formatCpf = (value) => {
    const digits = digitsOnly(value).slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const validatéEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  const validatéCardNumber = (value) => {
    const length = digitsOnly(value).length;
    return length >= 13 && length <= 16;
  };
  const validatéExpiry = (value) => {
    const clean = formatExpiry(value);
    if (!/^\d{2}\/\d{2}$/.test(clean)) return false;
    const [monthText, yearText] = clean.split("/");
    const month = Number(monthText);
    const year = Number(`20${yearText}`);
    if (month < 1 || month > 12) return false;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return year > currentYear || (year === currentYear && month >= currentMonth);
  };
  const validatéCvv = (value) => /^\d{3,4}$/.test(digitsOnly(value));
  const validatéCpf = (value) => digitsOnly(value).length === 11;

  const initPaymentPage = () => {
    const root = document.querySelector("[data-payment-page]");
    if (!root || root.dataset.paymentReady === "true") return;
    root.dataset.paymentReady = "true";

    const params = new URLSearchParams(window.location.search);
    const amount = params.get("amount") || "R$ 280,00";
    const installments = params.get("installments") || "À vista";
    const professional = params.get("professional") || "Studio Aquarela";
    const description = params.get("description") || "Proposta pronta para aprovação.";
    const avatar = params.get("avatar") || "assets/img/auth/carpenter-cutout.png";
    const title = params.get("title") || "Pagamento do pedido";
    const conversation = params.get("conversation") || "painting";

    const amountNode = root.querySelector("[data-payment-amount]");
    const installmentsNode = root.querySelector("[data-payment-installments]");
    const professionalNode = root.querySelector("[data-payment-professional]");
    const descriptionNode = root.querySelector("[data-payment-description]");
    const titleNode = root.querySelector("[data-payment-title]");
    const avatarNode = root.querySelector("[data-payment-avatar]");
    const submitButton = root.querySelector("[data-payment-submit]");
    const overlay = document.querySelector("[data-payment-overlay]");
    const processingCard = document.querySelector("[data-payment-processing]");
    const successCard = document.querySelector("[data-payment-success]");
    const backLink = document.querySelector("[data-payment-back]");
    const finishLink = document.querySelector("[data-payment-finish]");
    const pointsBalanceNode = root.querySelector("[data-payment-points-balance]");
    const pointsToggle = root.querySelector("[data-payment-points-toggle]");
    const pointsControls = root.querySelector("[data-payment-points-controls]");
    const pointsInput = root.querySelector("[data-payment-points-input]");
    const pointsValueNode = root.querySelector("[data-payment-points-value]");
    const pointsRow = root.querySelector("[data-payment-points-row]");
    const pointsSummaryNode = root.querySelector("[data-payment-points-summary]");
    const methodButtons = Array.from(root.querySelectorAll("[data-payment-method]"));
    const panels = Array.from(root.querySelectorAll("[data-payment-panel]"));
    const paymentForm = root.querySelector("[data-payment-form]");
    const savedCardButton = root.querySelector("[data-saved-card]");
    const addCardButton = root.querySelector("[data-payment-add-card]");
    const nameInput = root.querySelector("[data-payment-name]");
    const cardInput = root.querySelector("[data-payment-card-number]");
    const expiryInput = root.querySelector("[data-payment-expiry]");
    const cvvInput = root.querySelector("[data-payment-cvv]");
    const documentInput = root.querySelector("[data-payment-document]");
    const emailInput = root.querySelector("[data-payment-email]");
    const feedback = root.querySelector("[data-payment-feedback]");

    let paymentTimer = null;
    const pointsBalance = 230;
    const pointCurrencyRaté = 0.1;
    const baseAmount = parseCurrency(amount);

    const navigatéTo = (href) => {
      if (!href) return;
      overlay?.setAttribute("hidden", "");
      if (window.DokeNavigate) {
        window.DokeNavigate(href);
      } else {
        window.location.href = href;
      }
    };

    const withQuery = (path, extra = {}) => {
      const next = new URL(path, window.location.href);
      next.searchParams.set("conversation", conversation);
      next.searchParams.set("professional", professional);
      next.searchParams.set("amount", amount);
      next.searchParams.set("installments", installments);
      next.searchParams.set("description", description);
      next.searchParams.set("avatar", avatar);
      next.searchParams.set("title", title);
      Object.entries(extra).forEach(([key, value]) => {
        if (value == null || value === "") return;
        next.searchParams.set(key, String(value));
      });
      return `${next.pathname}${next.search}`;
    };

    const clearInvalidStaté = () => {
      [nameInput, cardInput, expiryInput, cvvInput, documentInput, emailInput].forEach((input) => {
        input?.classList.remove("is-invalid");
      });
    };

    const setFeedback = (message = "") => {
      if (!feedback) return;
      feedback.textContent = message;
      feedback.hidden = !message;
    };

    const invalidaté = (input, message) => {
      clearInvalidStaté();
      input?.classList.add("is-invalid");
      setFeedback(message);
      input?.focus();
    };

    const setMethod = (method) => {
      methodButtons.forEach((button) => {
        const active = button.dataset.paymentMethod === method;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      panels.forEach((panel) => {
        panel.hidden = panel.dataset.paymentPanel !== method;
      });
    };

    const updatéPoints = () => {
      if (!pointsToggle || !pointsInput || !amountNode) return;
      const enabled = pointsToggle.checked;
      const rawRequested = Number(pointsInput.value || 0);
      const normalizedPoints = Math.max(0, Math.min(pointsBalance, Math.floor(rawRequested)));
      if (String(normalizedPoints) !== String(pointsInput.value)) {
        pointsInput.value = String(normalizedPoints);
      }

      const discount = enabled ? normalizedPoints * pointCurrencyRaté : 0;
      const total = Math.max(0, baseAmount - discount);

      if (pointsControls) pointsControls.hidden = !enabled;
      if (pointsRow) pointsRow.hidden = !enabled;
      if (pointsValueNode) pointsValueNode.textContent = formatCurrency(discount);
      if (pointsSummaryNode) pointsSummaryNode.textContent = `${normalizedPoints} pts · -${formatCurrency(discount)}`;
      amountNode.textContent = formatCurrency(total);
    };

    const setCardMode = (mode) => {
      const usingSaved = mode === "saved";
      savedCardButton?.classList.toggle("is-active", usingSaved);
      savedCardButton?.setAttribute("aria-pressed", String(usingSaved));
      addCardButton?.classList.toggle("is-active", !usingSaved);
      if (paymentForm) paymentForm.hidden = usingSaved;
      setFeedback("");
      clearInvalidStaté();
    };

    const setSuccessLinks = () => {
      if (backLink) backLink.setAttribute("href", withQuery("mensagens.html", { payment: "success" }));
      if (finishLink) finishLink.setAttribute("href", withQuery("finalizar-pedido.html", { payment: "success" }));
    };

    if (amountNode) amountNode.textContent = amount;
    if (installmentsNode) installmentsNode.textContent = installments;
    if (professionalNode) professionalNode.textContent = professional;
    if (descriptionNode) descriptionNode.textContent = description;
    if (titleNode) titleNode.textContent = title;
    if (avatarNode) avatarNode.src = avatar;
    if (pointsBalanceNode) pointsBalanceNode.textContent = String(pointsBalance);
    if (paymentForm) paymentForm.hidden = true;

    setSuccessLinks();

    cardInput?.addEventListener("input", () => {
      cardInput.value = formatCardNumber(cardInput.value);
      cardInput.classList.remove("is-invalid");
      setFeedback("");
    });
    expiryInput?.addEventListener("input", () => {
      expiryInput.value = formatExpiry(expiryInput.value);
      expiryInput.classList.remove("is-invalid");
      setFeedback("");
    });
    cvvInput?.addEventListener("input", () => {
      cvvInput.value = digitsOnly(cvvInput.value).slice(0, 4);
      cvvInput.classList.remove("is-invalid");
      setFeedback("");
    });
    documentInput?.addEventListener("input", () => {
      documentInput.value = formatCpf(documentInput.value);
      documentInput.classList.remove("is-invalid");
      setFeedback("");
    });
    nameInput?.addEventListener("input", () => {
      nameInput.value = nameInput.value.replace(/\s{2,}/g, " ").slice(0, 60);
      nameInput.classList.remove("is-invalid");
      setFeedback("");
    });
    emailInput?.addEventListener("input", () => {
      emailInput.value = emailInput.value.trimStart().slice(0, 80);
      emailInput.classList.remove("is-invalid");
      setFeedback("");
    });

    methodButtons.forEach((button) => {
      button.addEventListener("click", () => setMethod(button.dataset.paymentMethod || "card"));
    });
    savedCardButton?.addEventListener("click", () => setCardMode("saved"));
    addCardButton?.addEventListener("click", () => {
      setCardMode("new");
      nameInput?.focus();
    });
    pointsToggle?.addEventListener("change", updatéPoints);
    pointsInput?.addEventListener("input", updatéPoints);

    document.querySelectorAll(".payment-success__actions a").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        navigatéTo(link.getAttribute("href") || "");
      });
    });

    submitButton?.addEventListener("click", () => {
      const activeMethod = methodButtons.find((button) => button.classList.contains("is-active"))?.dataset.paymentMethod || "card";

      if (activeMethod === "card" && !paymentForm?.hidden) {
        const nameValue = String(nameInput?.value || "").trim();
        const cardValue = String(cardInput?.value || "");
        const expiryValue = String(expiryInput?.value || "");
        const cvvValue = String(cvvInput?.value || "");
        const documentValue = String(documentInput?.value || "");
        const emailValue = String(emailInput?.value || "").trim();

        if (nameValue.length < 5) return invalidaté(nameInput, "Preencha o nome do titular como aparece no cartão.");
        if (!validatéCardNumber(cardValue)) return invalidaté(cardInput, "Digite um número de cartão válido com 13 a 16 dígitos.");
        if (!validatéExpiry(expiryValue)) return invalidaté(expiryInput, "Informe uma validade futura no formato MM/AA.");
        if (!validatéCvv(cvvValue)) return invalidaté(cvvInput, "O CVV precisa ter 3 ou 4 números.");
        if (!validatéCpf(documentValue)) return invalidaté(documentInput, "Informe um CPF válido com 11 dígitos.");
        if (!validatéEmail(emailValue)) return invalidaté(emailInput, "Digite um e-mail válido para receber o comprovante.");
      }

      clearInvalidStaté();
      setFeedback("");
      overlay?.removeAttribute("hidden");
      processingCard?.removeAttribute("hidden");
      successCard?.setAttribute("hidden", "");
      if (submitButton) {
        submitButton.textContent = "Processando...";
        submitButton.setAttribute("disabled", "true");
      }
      paymentForm?.querySelectorAll("input").forEach((input) => input.setAttribute("disabled", "true"));
      methodButtons.forEach((button) => button.setAttribute("disabled", "true"));
      savedCardButton?.setAttribute("disabled", "true");
      addCardButton?.setAttribute("disabled", "true");

      if (paymentTimer) window.clearTimeout(paymentTimer);
      paymentTimer = window.setTimeout(() => {
        processingCard?.setAttribute("hidden", "");
        successCard?.removeAttribute("hidden");
        if (submitButton) submitButton.textContent = "Pagamento enviado";
      }, 1400);
    });

    setCardMode("saved");
    setMethod("card");
    updatéPoints();
  };

  window.DokeInitPayment = initPaymentPage;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPaymentPage, { once: true });
  } else {
    initPaymentPage();
  }
})();
