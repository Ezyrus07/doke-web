document.addEventListener("DOMContentLoaded", function () {
  const mainImage = document.querySelector("[data-gallery-image]");
  const thumbButtons = document.querySelectorAll("[data-gallery-thumb]");
  const prevButton = document.querySelector("[data-gallery-prev]");
  const nextButton = document.querySelector("[data-gallery-next]");
  const expandButton = document.querySelector("[data-gallery-expand]");
  const triageForm = document.getElementById("adTriageForm");
  const successMessage = document.querySelector(".ad-triage-success");

  const images = Array.from(thumbButtons).map((thumb) => thumb.dataset.galleryThumb);
  let currentIndex = 0;

  const setImage = (index) => {
    if (!mainImage || images.length === 0) return;
    currentIndex = (index + images.length) % images.length;
    mainImage.src = images[currentIndex];
    mainImage.alt = `Imagem ${currentIndex + 1} do anúncio`;

    thumbButtons.forEach((thumb, idx) => {
      thumb.classList.toggle("active", idx === currentIndex);
    });
  };

  if (thumbButtons.length > 0) {
    thumbButtons.forEach((thumb, index) => {
      thumb.addEventListener("click", function () {
        setImage(index);
      });
    });
    setImage(0);
  }

  if (prevButton) {
    prevButton.addEventListener("click", function () {
      setImage(currentIndex - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      setImage(currentIndex + 1);
    });
  }

  if (expandButton) {
    expandButton.addEventListener("click", function () {
      const imageUrl = mainImage?.src;
      if (!imageUrl) return;
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    });
  }

  if (triageForm) {
    triageForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const requiredInputs = triageForm.querySelectorAll("[required]");
      let allValid = true;

      requiredInputs.forEach((input) => {
        if (!input.value.trim()) {
          input.classList.add("input-error");
          allValid = false;
        } else {
          input.classList.remove("input-error");
        }
      });

      if (!allValid) {
        return;
      }

      const formData = new FormData(triageForm);
      const payload = {};
      formData.forEach((value, key) => {
        payload[key] = value;
      });

      console.info("Solicitação enviada", payload);

      if (successMessage) {
        successMessage.hidden = false;
      }
      if (triageForm.querySelector(".ad-primary-button")) {
        triageForm.querySelector(".ad-primary-button").disabled = true;
      }
      triageForm.querySelectorAll("input, textarea, select").forEach((input) => {
        input.disabled = true;
      });

      setTimeout(() => {
        if (successMessage) {
          successMessage.textContent = "Obrigado! Solicitação recebida com êxito.";
        }
      }, 300);
    });
  }
});
