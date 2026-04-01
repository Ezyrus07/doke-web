(() => {
  const initOrderFinalizePage = () => {
    const root = document.querySelector("[data-order-finalize-page]");
    if (!root || root.dataset.finalizeReady === "true") return;
    root.dataset.finalizeReady = "true";

    const params = new URLSearchParams(window.location.search);
    const conversation = params.get("conversation") || "painting";
    const professional = params.get("professional") || "Studio Aquarela";
    const amount = params.get("amount") || "R$ 280,00";
    const installments = params.get("installments") || "À vista";
    const avatar = params.get("avatar") || "assets/img/auth/carpenter-cutout.png";
    const title = params.get("title") || `Finalizar pedido com ${professional}`;

    const titleNode = root.querySelector("[data-finalize-title]");
    const professionalNode = root.querySelector("[data-finalize-professional]");
    const avatarNode = root.querySelector("[data-finalize-avatar]");
    const amountNode = root.querySelector("[data-finalize-amount]");
    const installmentsNode = root.querySelector("[data-finalize-installments]");
    const fileInput = root.querySelector("[data-finalize-image-input]");
    const preview = root.querySelector("[data-finalize-preview]");
    const previewImage = root.querySelector("[data-finalize-preview-image]");
    const removeImageButton = root.querySelector("[data-finalize-remove-image]");
    const backLink = root.querySelector("[data-finalize-back]");
    const noteInput = root.querySelector("[data-finalize-note]");
    const submitButton = root.querySelector("[data-finalize-submit]");

    if (titleNode) titleNode.textContent = title;
    if (professionalNode) professionalNode.textContent = professional;
    if (avatarNode) avatarNode.src = avatar;
    if (amountNode) amountNode.textContent = amount;
    if (installmentsNode) installmentsNode.textContent = installments;
    if (backLink) backLink.href = `mensagens.html?conversation=${encodeURIComponent(conversation)}&payment=success`;

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file || !preview || !previewImage) return;
      const reader = new FileReader();
      reader.onload = () => {
        previewImage.src = String(reader.result || "");
        preview.hidden = false;
      };
      reader.readAsDataURL(file);
    });

    removeImageButton?.addEventListener("click", () => {
      if (preview) preview.hidden = true;
      if (previewImage) previewImage.src = "";
      if (fileInput) fileInput.value = "";
    });

    submitButton?.addEventListener("click", () => {
      const next = new URL("avaliacao.html", window.location.href);
      next.searchParams.set("conversation", conversation);
      next.searchParams.set("professional", professional);
      next.searchParams.set("amount", amount);
      next.searchParams.set("avatar", avatar);
      next.searchParams.set("title", `Avaliar ${professional}`);
      if (noteInput?.value.trim()) next.searchParams.set("note", noteInput.value.trim());
      const href = `${next.pathname}${next.search}`;
      if (window.DokeNavigate) {
        window.DokeNavigate(href);
      } else {
        window.location.href = href;
      }
    });
  };

  window.DokeInitOrderFinalize = initOrderFinalizePage;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOrderFinalizePage, { once: true });
  } else {
    initOrderFinalizePage();
  }
})();
