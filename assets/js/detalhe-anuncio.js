document.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector("[data-detail-page]");
  if (!page) return;

  const mainImage = page.querySelector("[data-gallery-main]");
  const thumbs = [...page.querySelectorAll("[data-gallery-thumb]")];
  const dots = [...page.querySelectorAll("[data-gallery-dot]")];
  const prevButton = page.querySelector("[data-gallery-prev]");
  const nextButton = page.querySelector("[data-gallery-next]");
  const form = page.querySelector("[data-request-form]");
  const status = page.querySelector("[data-request-status]");
  const voteRail = page.querySelector(".ad-vote-stats");
  const votePrev = page.querySelector("[data-vote-prev]");
  const voteNext = page.querySelector("[data-vote-next]");
  const filterButtons = [...page.querySelectorAll("[data-review-filter]")];
  const reviews = [...page.querySelectorAll(".ad-review[data-review-tone]")];

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
    });
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const nome = String(data.get("nome") || "").trim();
    const detalhes = String(data.get("detalhes") || "").trim();

    if (!nome || !detalhes) {
      status?.classList.remove("is-visible");
      return;
    }

    form.reset();

    if (status) {
      const text = status.querySelector("[data-request-status-text]");
      if (text) {
        text.textContent = `Solicitacao enviada para analise de ${nome}.`;
      }
      status.classList.add("is-visible");
    }
  });
});
