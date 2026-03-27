const initDetailPage = () => {
  const page = document.querySelector("[data-detail-page]");
  if (!page || page.dataset.detailInitialized === "true") return;
  page.dataset.detailInitialized = "true";

  const mainImage = page.querySelector("[data-gallery-main]");
  const thumbs = [...page.querySelectorAll("[data-gallery-thumb]")];
  const dots = [...page.querySelectorAll("[data-gallery-dot]")];
  const prevButton = page.querySelector("[data-gallery-prev]");
  const nextButton = page.querySelector("[data-gallery-next]");
  const voteRail = page.querySelector(".ad-vote-stats");
  const votePrev = page.querySelector("[data-vote-prev]");
  const voteNext = page.querySelector("[data-vote-next]");
  const filterButtons = [...page.querySelectorAll("[data-review-filter]")];
  const reviews = [...page.querySelectorAll(".ad-review[data-review-tone]")];
  const voteCards = [...page.querySelectorAll(".ad-vote-card[data-review-tone]")];
  const extraReviews = [...page.querySelectorAll("[data-review-extra]")];
  const reviewsMoreButton = page.querySelector("[data-reviews-more]");
  const budgetModal = document.querySelector("[data-budget-modal]");
  const budgetOpenButtons = [...document.querySelectorAll("[data-budget-open]")];
  const budgetCloseButtons = [...document.querySelectorAll("[data-budget-close]")];
  const budgetRoot = document.querySelector("[data-budget-page]");
  const budgetDialog = budgetModal?.querySelector(".detail-budget-modal__dialog");
  let lockedScrollY = 0;

  let currentIndex = Math.max(0, thumbs.findIndex((thumb) => thumb.classList.contains("is-active")));

  const applyImage = (index) => {
    const thumb = thumbs[index];
    if (!thumb || !mainImage) return;

    const src = thumb.dataset.full || thumb.querySelector("img")?.src;
    const alt = thumb.dataset.alt || thumb.querySelector("img")?.alt || "";

    if (src) mainImage.src = src;
    mainImage.alt = alt;

    thumbs.forEach((item, itemIndex) => {
      item.classList.toggle("is-active", itemIndex === index);
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === index);
    });

    currentIndex = index;
  };

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener("click", () => applyImage(index));
  });

  prevButton?.addEventListener("click", () => {
    applyImage((currentIndex - 1 + thumbs.length) % thumbs.length);
  });

  nextButton?.addEventListener("click", () => {
    applyImage((currentIndex + 1) % thumbs.length);
  });

  votePrev?.addEventListener("click", () => {
    voteRail?.scrollBy({ left: -280, behavior: "smooth" });
  });

  voteNext?.addEventListener("click", () => {
    voteRail?.scrollBy({ left: 280, behavior: "smooth" });
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.reviewFilter || "all";

      filterButtons.forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });

      reviews.forEach((review) => {
        const tone = review.dataset.reviewTone || "positive";
        const visible = filter === "all" || tone === filter;
        review.hidden = !visible;
      });

      voteCards.forEach((card) => {
        const tone = card.dataset.reviewTone || "positive";
        const visible = filter === "all" || tone === filter;
        card.hidden = !visible;
      });
    });
  });

  reviewsMoreButton?.addEventListener("click", () => {
    extraReviews.forEach((review) => {
      review.hidden = false;
    });
    reviewsMoreButton.hidden = true;
  });

  const syncBudgetContext = (button) => {
    if (!budgetRoot || !button) return;
    const provider = button.dataset.budgetProvider || "Studio Aquarela";
    const service = button.dataset.budgetService || "reforma residencial premium";

    budgetRoot.dataset.budgetProvider = provider;
    budgetRoot.dataset.budgetService = service;
    budgetRoot.dataset.budgetSuccessUrl = "index.html?quote=sent";

    budgetRoot.querySelectorAll("[data-budget-provider]").forEach((node) => {
      node.textContent = provider;
    });

    budgetRoot.querySelectorAll("[data-budget-service]").forEach((node) => {
      node.textContent = service.replace(/\b\w/g, (char) => char.toUpperCase());
    });
  };

  const openBudgetModal = (button) => {
    if (!budgetModal) return;
    syncBudgetContext(button);

    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.classList.add("detail-budget-open");

    if (typeof budgetModal.showModal === "function") {
      if (!budgetModal.open) budgetModal.showModal();
    } else {
      budgetModal.setAttribute("open", "");
    }

    if (typeof window.DokeInitBudget === "function") window.DokeInitBudget();

    window.requestAnimationFrame(() => {
      const firstField = budgetRoot?.querySelector("[data-details-input]");
      firstField?.focus();
    });
  };

  const closeBudgetModal = () => {
    if (!budgetModal) return;

    if (typeof budgetModal.close === "function" && budgetModal.open) {
      budgetModal.close();
    } else {
      budgetModal.removeAttribute("open");
      document.body.style.top = "";
      document.body.classList.remove("detail-budget-open");
      window.scrollTo(0, lockedScrollY);
    }
  };

  budgetOpenButtons.forEach((button) => {
    button.addEventListener("click", () => openBudgetModal(button));
  });

  budgetCloseButtons.forEach((button) => {
    button.addEventListener("click", closeBudgetModal);
  });

  budgetModal?.addEventListener("click", (event) => {
    if (budgetDialog && !budgetDialog.contains(event.target)) {
      closeBudgetModal();
    }
  });

  budgetModal?.addEventListener("close", () => {
    const top = document.body.style.top;
    const nextScrollY = top ? Math.abs(parseInt(top, 10)) || lockedScrollY : lockedScrollY;
    document.body.style.top = "";
    document.body.classList.remove("detail-budget-open");
    window.scrollTo(0, nextScrollY);
  });
};

window.DokeInitDetailPage = initDetailPage;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDetailPage, { once: true });
} else {
  initDetailPage();
}
