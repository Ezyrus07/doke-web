(() => {
  const getRedirectUrl = (form) => {
    const page = form.closest("[data-budget-page]");
    return page?.dataset.budgetSuccessUrl || "pedidos.html";
  };

  const navigate = (url) => {
    window.location.assign(url);
  };

  const formatSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFiles = (input, list) => {
    const files = Array.from(input.files || []);

    if (!files.length) {
      list.hidden = true;
      list.innerHTML = "";
      return;
    }

    list.hidden = false;
    list.innerHTML = files.map((file, index) => {
      const preview = file.type.startsWith("image/")
        ? `<img src="${URL.createObjectURL(file)}" alt="${file.name.replace(/"/g, '&quot;')}">`
        : `<div class="budget-file-card__empty">Arquivo</div>`;

      return `
        <article class="budget-file-card" title="${file.name}">
          <div class="budget-file-card__thumb">${preview}</div>
          <div class="budget-file-card__body">
            <strong class="budget-file-card__name">${file.name}</strong>
            <span class="budget-file-card__meta">${formatSize(file.size)}</span>
          </div>
          <button class="budget-file-card__remove" type="button" data-budget-file-remove="${index}" aria-label="Remover ${file.name}">×</button>
        </article>
      `;
    }).join("");
  };

  const bindUploadPreview = (form) => {
    if (form.dataset.uploadPreviewBound === "true") return;
    form.dataset.uploadPreviewBound = "true";

    const input = form.querySelector('.budget-upload input[type="file"]');
    const list = form.querySelector('[data-files-list]');
    if (!input || !list) return;

    input.addEventListener('change', () => renderFiles(input, list));

    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-budget-file-remove]');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      const index = Number(button.dataset.budgetFileRemove);
      const files = Array.from(input.files || []);
      if (!Number.isFinite(index)) return;

      const transfer = new DataTransfer();
      files.forEach((file, fileIndex) => {
        if (fileIndex !== index) transfer.items.add(file);
      });
      input.files = transfer.files;
      renderFiles(input, list);
    });
  };

  const playExit = (state, page, onDone) => {
    if (!state || state.hidden) {
      page?.classList.remove('is-success-active');
      onDone?.();
      return;
    }

    state.classList.remove("is-visible");
    state.classList.add("is-leaving");
    page?.classList.remove('is-success-active');

    window.setTimeout(() => {
      state.hidden = true;
      state.classList.remove("is-leaving");
      onDone?.();
    }, 260);
  };

  const createSuccessState = (form) => {
    const page = form.closest("[data-budget-page]");
    if (!page) return null;

    let state = page.querySelector("[data-budget-success-state]");
    if (state) return state;

    state = document.createElement("section");
    state.className = "budget-success-state";
    state.hidden = true;
    state.dataset.budgetSuccessState = "true";
    state.setAttribute("aria-live", "assertive");
    state.innerHTML = `
      <div class="budget-success-sparkles" aria-hidden="true">
        <i></i><i></i><i></i><i></i>
      </div>

      <article class="budget-success-card" role="status" aria-label="Pedido enviado com sucesso">
        <button class="budget-success-card__close" type="button" data-budget-success-close aria-label="Fechar aviso">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18"></path>
          </svg>
        </button>

        <span class="budget-success-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 12.5 9.2 17 19 7"></path>
          </svg>
        </span>

        <span class="budget-success-card__eyebrow">Solicitação criada</span>
        <h2>Pedido enviado</h2>
        <p>Seu pedido foi encaminhado. Acompanhe o retorno do profissional na área de pedidos.</p>

        <div class="budget-success-card__actions">
          <button class="budget-success-card__button budget-success-card__button--primary" type="button" data-budget-success-go>
            Ver pedidos agora
          </button>
        </div>
      </article>
    `;

    page.appendChild(state);
    return state;
  };

  const bindBudgetSuccess = () => {
    document.querySelectorAll("[data-budget-form]").forEach((form) => {
      bindUploadPreview(form);

      if (form.dataset.successBound === "true") return;
      form.dataset.successBound = "true";

      form.addEventListener("submit", (event) => {
        if (!form.checkValidity()) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const page = form.closest('[data-budget-page]');
        const state = createSuccessState(form);
        const redirectUrl = getRedirectUrl(form);

        if (!state) {
          navigate(redirectUrl);
          return;
        }

        page?.classList.add('is-success-active');
        state.hidden = false;
        state.classList.remove("is-leaving");

        window.requestAnimationFrame(() => {
          state.classList.add("is-visible");
          state.querySelector("[data-budget-success-go]")?.focus({ preventScroll: true });
        });

        const goButton = state.querySelector("[data-budget-success-go]");
        const closeButton = state.querySelector("[data-budget-success-close]");

        goButton.onclick = () => navigate(redirectUrl);
        closeButton.onclick = () => playExit(state, page);
      }, true);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindBudgetSuccess, { once: true });
  } else {
    bindBudgetSuccess();
  }

  document.addEventListener("doke:view-ready", bindBudgetSuccess);
})();
