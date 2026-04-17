
(() => {
  const initProfileBudgetModal = () => {
    const modal = document.querySelector("[data-budget-modal]");
    const root = document.querySelector("[data-budget-page]");
    if (!modal || !root || root.dataset.profileBudgetReady === "true") return;
    root.dataset.profileBudgetReady = "true";

    const openButtons = [...document.querySelectorAll("[data-budget-open]")];
    const closeButtons = [...document.querySelectorAll("[data-budget-close]")];
    let lockedScrollY = 0;

    const syncContext = (button) => {
      const provider = button?.dataset.budgetProvider || root.dataset.budgetProvider || "Studio Aquarela";
      const service = button?.dataset.budgetService || root.dataset.budgetService || "reforma residencial de alto padrao";
      root.dataset.budgetProvider = provider;
      root.dataset.budgetService = service;
      root.dataset.budgetSuccessUrl = "pedidos.html?from=profile";
      root.querySelectorAll("[data-budget-provider]").forEach((node) => {
        node.textContent = provider;
      });
      root.querySelectorAll("[data-budget-service]").forEach((node) => {
        node.textContent = service.replace(/\b\w/g, (char) => char.toUpperCase());
      });
    };

    const openModal = (button) => {
      syncContext(button);
      lockedScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.classList.add("detail-budget-open");
      if (typeof modal.showModal === "function") {
        if (!modal.open) modal.showModal();
      } else {
        modal.setAttribute("open", "");
      }
      if (typeof window.DokeInitBudget === "function") window.DokeInitBudget();
      window.requestAnimationFrame(() => {
        const firstField = root.querySelector("[data-details-input]");
        firstField?.focus({ preventScroll: true });
      });
    };

    const closeModal = () => {
      if (typeof modal.close === "function" && modal.open) {
        modal.close();
      } else {
        modal.removeAttribute("open");
        const top = document.body.style.top;
        const nextScrollY = top ? Math.abs(parseInt(top, 10)) || lockedScrollY : lockedScrollY;
        document.body.style.top = "";
        document.body.classList.remove("detail-budget-open");
        window.scrollTo(0, nextScrollY);
      }
    };

    openButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        openModal(button);
      });
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        closeModal();
      });
    });

    modal.addEventListener("close", () => {
      const top = document.body.style.top;
      const nextScrollY = top ? Math.abs(parseInt(top, 10)) || lockedScrollY : lockedScrollY;
      document.body.style.top = "";
      document.body.classList.remove("detail-budget-open");
      window.scrollTo(0, nextScrollY);
    });
  };

  window.DokeInitProfileBudgetModal = initProfileBudgetModal;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProfileBudgetModal, { once: true });
  } else {
    initProfileBudgetModal();
  }
})();
