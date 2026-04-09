const authService = window.DokeAuth || null;

document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.togglePassword || "");
    if (!input) return;

    const nextType = input.type === "password" ? "text" : "password";
    input.type = nextType;
    button.setAttribute(
      "aria-label",
      nextType === "password" ? "Mostrar senha" : "Ocultar senha"
    );
  });
});

document.querySelectorAll("[data-handle-input]").forEach((input) => {
  const wrapper = input.closest(".auth-input--prefix");
  if (!wrapper) return;

  const renderHandle = () => {
    wrapper.classList.toggle("is-active", input.value.trim().length > 0);
  };

  input.addEventListener("input", renderHandle);
  renderHandle();
});

function applyPhoneMask(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) {
    const middle = digits.length === 11 ? 7 : 6;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, middle)}-${digits.slice(middle)}`;
  }

  return value;
}

document.querySelectorAll("[data-phone-mask]").forEach((input) => {
  input.addEventListener("blur", () => {
    const raw = input.value.trim();
    if (!raw || /[A-Za-z@]/.test(raw)) return;
    input.value = applyPhoneMask(raw);
  });
});

function scorePassword(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

document.querySelectorAll("[data-password-strength]").forEach((input) => {
  const meter = input
    .closest(".auth-field")
    ?.nextElementSibling;

  const bars = meter && meter.classList.contains("auth-password-strength")
    ? Array.from(meter.querySelectorAll("[data-strength-bar]"))
    : [];
  const label = meter ? meter.nextElementSibling : null;

  if (!bars.length) return;

  const renderStrength = () => {
    const value = input.value.trim();
    const score = scorePassword(value);
    const hasValue = value.length > 0;

    meter.classList.toggle("is-empty", !hasValue);

    bars.forEach((bar, index) => {
      bar.classList.toggle("is-on", hasValue && index < score);
    });

    if (label && label.hasAttribute("data-strength-label")) {
      label.classList.toggle("is-empty", !hasValue);

      if (!hasValue) {
        label.textContent = "";
      } else if (score <= 1) {
        label.textContent = "Senha fraca";
      } else if (score <= 2) {
        label.textContent = "Senha moderada";
      } else {
        label.textContent = "Senha forte";
      }
    }
  };

  input.addEventListener("input", renderStrength);
  renderStrength();
});

function setFeedback(element, tone, message) {
  if (!element) return;

  if (!message) {
    element.textContent = "";
    element.className = "auth-feedback is-hidden";
    return;
  }

  element.textContent = message;
  element.className = `auth-feedback auth-feedback--${tone}`;
}

function setButtonLoading(button, isLoading, loadingLabel) {
  if (!button) return;

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingLabel : button.dataset.defaultLabel;
}

function redirectToHome() {
  window.location.href = "../index.html";
}

function isStrongPassword(password) {
  return scorePassword(password) >= 3;
}

const loginForm = document.querySelector("[data-auth-login]");

if (authService && loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const loginInput = document.getElementById("email-login");
    const passwordInput = document.getElementById("senha-login");
    const submitButton = loginForm.querySelector("[data-auth-submit]");
    const feedback = loginForm.querySelector("[data-auth-feedback]");

    const login = loginInput ? loginInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!login || !password) {
      setFeedback(feedback, "error", "Preencha o acesso e a senha para entrar.");
      return;
    }

    try {
      setButtonLoading(submitButton, true, "Entrando...");
      setFeedback(feedback, "success", "Validando seu acesso...");
      const user = await authService.signIn({ login, password });
      setFeedback(feedback, "success", `Acesso liberado. Bem-vindo, ${user.name}.`);
      window.setTimeout(redirectToHome, 700);
    } catch (error) {
      setFeedback(feedback, "error", error.message);
    } finally {
      setButtonLoading(submitButton, false, "Entrar");
    }
  });
}

const signupForm = document.querySelector("[data-auth-signup]");

if (authService && signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nameInput = document.getElementById("nome-cadastro");
    const emailInput = document.getElementById("email-cadastro");
    const passwordInput = document.getElementById("senha-cadastro");
    const submitButton = signupForm.querySelector("[data-auth-submit]");
    const feedback = signupForm.querySelector("[data-auth-feedback]");
    const confirmationPanel = signupForm.querySelector("[data-confirmation-panel]");

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!name || !email || !password) {
      setFeedback(feedback, "error", "Preencha nome, e-mail e senha.");
      return;
    }

    if (!authService.isEmail(email)) {
      setFeedback(feedback, "error", "Digite um e-mail valido para continuar.");
      return;
    }

    if (!isStrongPassword(password)) {
      setFeedback(feedback, "error", "Use uma senha mais forte para criar a conta.");
      return;
    }

    try {
      setButtonLoading(submitButton, true, "Criando conta...");
      setFeedback(feedback, "success", "Preparando seu acesso no Doke...");
      const user = await authService.register({ name, email, password });
      if (user.pendingConfirmation) {
        setFeedback(feedback, "success", "Conta criada. Agora confirme o e-mail para liberar o acesso.");
        confirmationPanel?.classList.remove("is-hidden");
      } else {
        confirmationPanel?.classList.add("is-hidden");
        setFeedback(feedback, "success", `Conta criada com sucesso. Bem-vindo, ${user.name}.`);
        window.setTimeout(redirectToHome, 900);
      }
    } catch (error) {
      setFeedback(feedback, "error", error.message);
    } finally {
      setButtonLoading(submitButton, false, "Criar conta");
    }
  });
}

const recoveryForm = document.querySelector("[data-auth-recovery]");

if (authService && recoveryForm) {
  const feedback = recoveryForm.querySelector("[data-auth-feedback]");
  const submitButton = recoveryForm.querySelector("[data-auth-submit]");
  const resetButton = recoveryForm.querySelector("[data-recovery-reset-submit]");
  const resetSection = recoveryForm.querySelector("[data-recovery-reset]");
  const contactLabel = recoveryForm.querySelector("[data-recovery-contact-label]");
  const contactInput = document.getElementById("recovery-contact");
  const codeInput = document.getElementById("recovery-code");
  const nextPasswordInput = document.getElementById("recovery-password");
  const methodInputs = Array.from(
    recoveryForm.querySelectorAll('input[name="recovery-method"]')
  );

  const recoveryStaté = {
    method: "email",
    contact: ""
  };

  const syncMethodCopy = () => {
    const selected = methodInputs.find((input) => input.checked);
    recoveryStaté.method = selected ? selected.value : "email";

    if (!contactLabel || !contactInput) return;

    if (recoveryStaté.method === "phone") {
      contactLabel.textContent = "Telefone cadastrado";
      contactInput.placeholder = "(11) 99999-9999";
      contactInput.value = applyPhoneMask(contactInput.value);
    } else {
      contactLabel.textContent = "E-mail cadastrado";
      contactInput.placeholder = "voce@email.com";
    }
  };

  methodInputs.forEach((input) => {
    input.addEventListener("change", syncMethodCopy);
  });

  syncMethodCopy();

  recoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const contact = contactInput ? contactInput.value.trim() : "";
    recoveryStaté.contact = contact;

    if (!contact) {
      setFeedback(feedback, "error", "Informe o contato usado na sua conta.");
      return;
    }

    if (
      recoveryStaté.method === "email" &&
      !authService.isEmail(contact)
    ) {
      setFeedback(feedback, "error", "Digite um e-mail valido para recuperar o acesso.");
      return;
    }

    if (
      recoveryStaté.method === "phone" &&
      !authService.isPhone(contact)
    ) {
      setFeedback(feedback, "error", "Digite um telefone valido com DDD.");
      return;
    }

    try {
      setButtonLoading(submitButton, true, "Enviando...");
      const result = await authService.requestRecovery({
        method: recoveryStaté.method,
        contact
      });

      const message = result.debugCode
        ? `Codigo enviado para ${result.maskedContact}. Ambiente local: use ${result.debugCode} para redefinir a senha.`
        : `Codigo enviado para ${result.maskedContact}. Verifique seu contato para continuar a redefinicao.`;

      setFeedback(
        feedback,
        "success",
        message
      );

      resetSection?.classList.remove("is-hidden");
    } catch (error) {
      setFeedback(feedback, "error", error.message);
    } finally {
      setButtonLoading(submitButton, false, "Enviar codigo");
    }
  });

  resetButton?.addEventListener("click", async () => {
    const code = codeInput ? codeInput.value.trim() : "";
    const nextPassword = nextPasswordInput ? nextPasswordInput.value : "";

    if (!recoveryStaté.contact) {
      setFeedback(feedback, "error", "Solicite o codigo primeiro.");
      return;
    }

    if (!code || !nextPassword) {
      setFeedback(feedback, "error", "Preencha o codigo recebido e a nova senha.");
      return;
    }

    if (!isStrongPassword(nextPassword)) {
      setFeedback(feedback, "error", "Use uma nova senha mais forte.");
      return;
    }

    try {
      setButtonLoading(resetButton, true, "Redefinindo...");
      await authService.resetPassword({
        method: recoveryStaté.method,
        contact: recoveryStaté.contact,
        code,
        nextPassword
      });

      setFeedback(feedback, "success", "Senha redefinida com sucesso. Voce ja pode entrar.");
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
    } catch (error) {
      setFeedback(feedback, "error", error.message);
    } finally {
      setButtonLoading(resetButton, false, "Redefinir senha");
    }
  });
}

const quoteText = document.querySelector("[data-auth-quote]");
const quoteAuthor = document.querySelector("[data-auth-author]");
const quoteRole = document.querySelector("[data-auth-role]");
const prevButton = document.querySelector("[data-auth-prev]");
const nextButton = document.querySelector("[data-auth-next]");

if (quoteText && quoteAuthor && quoteRole && prevButton && nextButton) {
  const quotes = [
    {
      text: "Entre para acompanhar pedidos, mensagens e oportunidades em um fluxo mais organizado dentro do Doke.",
      author: "Area centralizada",
      role: "Gestao mais clara para quem usa a plataforma"
    },
    {
      text: "O cadastro foi pensado para ser direto, profissional e pronto para conectar clientes, profissionais e negocios.",
      author: "Entrada profissional",
      role: "Onboarding alinhado com a identidade do site"
    },
    {
      text: "Com uma camada de acesso mais clara, o Doke transmite confianca antes mesmo do usuario comecar a navegar.",
      author: "Experiencia Doke",
      role: "Base preparada para crescer com o produto"
    }
  ];

  let current = 0;

  const renderQuote = () => {
    const quote = quotes[current];
    quoteText.textContent = quote.text;
    quoteAuthor.textContent = quote.author;
    quoteRole.textContent = quote.role;
  };

  prevButton.addEventListener("click", () => {
    current = (current - 1 + quotes.length) % quotes.length;
    renderQuote();
  });

  nextButton.addEventListener("click", () => {
    current = (current + 1) % quotes.length;
    renderQuote();
  });

  renderQuote();
}
