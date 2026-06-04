(() => {
  const initReviewPage = () => {
    const root = document.querySelector("[data-review-page]");
    if (!root || root.dataset.reviewReady === "true") return;
    root.dataset.reviewReady = "true";

    const params = new URLSearchParams(window.location.search);
    const conversation = params.get("conversation") || "painting";
    const professional = params.get("professional") || "Studio Aquarela";
    const amount = params.get("amount") || "R$ 280,00";
    const avatar = params.get("avatar") || "assets/img/auth/carpenter-cutout.png";
    const title = params.get("title") || `Avaliar ${professional}`;

    const professionalNode = root.querySelector("[data-review-professional]");
    const avatarNode = root.querySelector("[data-review-avatar]");
    const overallValueNode = root.querySelector("[data-review-overall-value]");
    const backLink = root.querySelector("[data-review-back]");
    const stars = Array.from(root.querySelectorAll("[data-review-star]"));
    const competencyRows = Array.from(root.querySelectorAll("[data-competency]"));
    const topicToggleButtons = Array.from(root.querySelectorAll("[data-review-topic-toggle]"));
    const anonymousInput = root.querySelector("[data-review-anonymous]");
    const noteInput = root.querySelector("[data-review-note]");
    const topicCommentInputs = Array.from(root.querySelectorAll("[data-review-topic-comment]"));
    const submitButton = root.querySelector("[data-review-submit]");

    let rating = 0;
    const competencies = {
      qualidade: 0,
      prazo: 0,
      comunicacao: 0,
      custo: 0
    };

    const syncRating = () => {
      stars.forEach((star) => {
        star.classList.toggle("is-active", Number(star.dataset.reviewStar || 0) <= rating && rating > 0);
      });
      if (overallValueNode) overallValueNode.textContent = rating > 0 ? `${rating.toFixed(1)} de 5` : "Selecione uma nota";
    };

    const syncCompetencies = () => {
      competencyRows.forEach((row) => {
        const key = row.dataset.competency;
        const value = competencies[key] || 0;
        if (value > 0) {
          row.dataset.score = String(value);
        } else {
          delete row.dataset.score;
        }
        row.querySelectorAll("[data-review-competency-star]").forEach((button) => {
          button.classList.toggle("is-active", value > 0 && Number(button.dataset.reviewCompetencyStar || 0) === value);
        });
      });
    };

    if (professionalNode) professionalNode.textContent = professional;
    if (avatarNode) avatarNode.src = avatar;
    if (backLink) backLink.href = `mensagens.html?conversation=${encodeURIComponent(conversation)}&payment=success&completed=1`;

    stars.forEach((star) => {
      star.addEventListener("click", () => {
        rating = Number(star.dataset.reviewStar || 5);
        syncRating();
      });
    });

    competencyRows.forEach((row) => {
      const key = row.dataset.competency;
      row.querySelectorAll("[data-review-competency-star]").forEach((button) => {
        button.addEventListener("click", () => {
          competencies[key] = Number(button.dataset.reviewCompetencyStar || 5);
          syncCompetencies();
        });
      });
    });

    topicToggleButtons.forEach((button) => {
      const key = button.dataset.reviewTopicToggle;
      const panel = root.querySelector(`[data-review-topic-panel="${key}"]`);
      if (!panel) return;

      button.addEventListener("click", () => {
        const isHidden = panel.hasAttribute("hidden");
        if (isHidden) {
          panel.removeAttribute("hidden");
          button.classList.add("is-open");
          const textarea = panel.querySelector("textarea");
          textarea?.focus();
        } else {
          panel.setAttribute("hidden", "");
          button.classList.remove("is-open");
        }
      });
    });

    submitButton?.addEventListener("click", () => {
      const next = new URL("mensagens.html", window.location.href);
      next.searchParams.set("conversation", conversation);
      next.searchParams.set("payment", "success");
      next.searchParams.set("completed", "1");
      next.searchParams.set("review", "1");
      next.searchParams.set("rating", String(rating));
      next.searchParams.set("anonymous", anonymousInput?.checked ? "1" : "0");
      next.searchParams.set("competencias", JSON.stringify(competencies));
      if (noteInput?.value.trim()) {
        next.searchParams.set("comment", noteInput.value.trim());
      }
      const topicComments = {};
      topicCommentInputs.forEach((input) => {
        const key = input.dataset.reviewTopicComment;
        const value = input.value.trim();
        if (key && value) topicComments[key] = value;
      });
      if (Object.keys(topicComments).length) {
        next.searchParams.set("topicComments", JSON.stringify(topicComments));
      }
      const href = `${next.pathname}${next.search}`;
      if (window.DokeNavigate) {
        window.DokeNavigate(href);
      } else {
        window.location.href = href;
      }
    });

    syncRating();
    syncCompetencies();
  };

  window.DokeInitReview = initReviewPage;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReviewPage, { once: true });
  } else {
    initReviewPage();
  }
})();
