(function () {
  const DEFAULT_MIN_DURATION = 950;

  const resolveRoot = (target) => {
    if (!target) return null;
    if (typeof target === "string") return document.querySelector(target);
    return target;
  };

  const setText = (root, selector, value) => {
    const node = root?.querySelector(selector);
    if (node && value) node.textContent = value;
  };

  const show = (target, options = {}) => {
    const root = resolveRoot(target);
    if (!root) return null;

    const startedAt = Date.now();
    const minDuration = Number.isFinite(Number(options.minDuration))
      ? Math.max(0, Number(options.minDuration))
      : DEFAULT_MIN_DURATION;

    setText(root, "[data-submission-feedback-title]", options.title || root.dataset.submissionFeedbackTitle || "Enviando solicitação");
    setText(root, "[data-submission-feedback-message]", options.message || root.dataset.submissionFeedbackMessage || "Preparando tudo com segurança.");

    root.hidden = false;
    root.setAttribute("aria-busy", "true");
    document.body.classList.add("doke-submission-feedback-open");

    if (typeof root.showModal === "function" && !root.open) {
      root.showModal();
    } else {
      root.setAttribute("open", "");
    }

    const close = () => {
      const elapsed = Date.now() - startedAt;
      const delay = Math.max(0, minDuration - elapsed);
      return new Promise((resolve) => {
        window.setTimeout(() => {
          root.removeAttribute("aria-busy");
          if (typeof root.close === "function" && root.open) {
            root.close();
          } else {
            root.removeAttribute("open");
            root.hidden = true;
            document.body.classList.remove("doke-submission-feedback-open");
          }
          resolve();
        }, delay);
      });
    };

    return { close, root };
  };

  document.addEventListener("close", (event) => {
    const root = event.target;
    if (!(root instanceof HTMLDialogElement)) return;
    if (!root.matches("[data-submission-feedback]")) return;
    root.hidden = true;
    root.removeAttribute("aria-busy");
    document.body.classList.remove("doke-submission-feedback-open");
  }, true);

  window.DokeSubmissionFeedback = Object.freeze({ show });
}());
