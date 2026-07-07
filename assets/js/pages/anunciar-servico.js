(() => {
  const initPostService = () => {
    const root = document.querySelector('[data-post-service-page]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    window.DokeHomeDrawer?.create?.()();

    const panels = [...root.querySelectorAll('[data-step-panel]')];
    const stepCurrent = root.querySelector('[data-step-current]');
    const progressSteps = [...root.querySelectorAll('.post-service-progress__track span')];
    const progressLabel = root.querySelector('[data-step-progress-label]');
    const progressFill = root.querySelector('[data-step-progress-fill]');
    const stepTargets = [...root.querySelectorAll('[data-step-target]')];
    const nextButton = root.querySelector('[data-step-next]');
    const backButton = root.querySelector('[data-step-back]');
    const exitButton = root.querySelector('[data-step-exit]');
    const actions = root.querySelector('.post-service-actions');
    const submitState = root.querySelector('[data-submit-state]');
    if (submitState && submitState.parentElement !== document.body) document.body.appendChild(submitState);
    const totalSteps = Math.max(1, panels.length);
    let currentStep = 1;

    const setStep = (step) => {
      currentStep = Math.max(1, Math.min(totalSteps, step));
      panels.forEach((panel) => {
        const isActive = Number(panel.dataset.stepPanel) === currentStep;
        panel.hidden = !isActive;
        panel.classList.toggle('is-active', isActive);
      });

      if (stepCurrent) stepCurrent.textContent = String(currentStep);
      if (progressLabel) progressLabel.textContent = `Etapa ${currentStep} de ${totalSteps}`;
      if (progressFill) {
        progressFill.dataset.stepProgressValue = String(Math.round((currentStep / totalSteps) * 100));
      }
      progressSteps.forEach((item, index) => {
        item.classList.toggle('is-active', index < currentStep);
      });
      stepTargets.forEach((target) => {
        const targetStep = Number(target.dataset.stepTarget);
        target.classList.toggle('is-active', targetStep === currentStep);
        target.classList.toggle('is-complete', targetStep < currentStep);
      });

      if (nextButton) {
        const label = currentStep >= totalSteps ? 'Enviar para análise' : 'Continuar';
        const textNode = [...nextButton.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.nodeValue = `${label} `;
      }

      if (backButton) {
        const showBack = currentStep > 1;
        backButton.hidden = !showBack;
        backButton.disabled = !showBack;
        backButton.classList.toggle('is-disabled', !showBack);
        actions?.classList.toggle('has-back-action', showBack);
      }

      if (exitButton) {
        exitButton.hidden = currentStep > 1;
      }
    };

    root.querySelectorAll('[data-segment]').forEach((button) => {
      if (!button.dataset.defaultActive) button.dataset.defaultActive = button.classList.contains('is-active') ? 'true' : 'false';
      button.addEventListener('click', () => {
        const group = button.dataset.segment;
        const buttons = [...root.querySelectorAll(`[data-segment="${group}"]`)];
        buttons.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle('is-active', isActive);
          item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        const input = root.querySelector(`input[name="${group}"]`);
        if (input) input.value = button.dataset.value || button.textContent.trim();
        updateReview();
      });
    });

    root.querySelectorAll('[data-post-check]').forEach((button) => {
      if (!button.dataset.defaultActive) button.dataset.defaultActive = button.classList.contains('is-active') ? 'true' : 'false';
      button.addEventListener('click', () => {
        const active = !button.classList.contains('is-active');
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    });

    const counterSource = root.querySelector('[data-count-source]');
    const counterValue = root.querySelector('[data-count-value]');
    const updateCount = () => {
      if (counterValue && counterSource) counterValue.textContent = String(counterSource.value.length);
    };
    counterSource?.addEventListener('input', () => {
      updateCount();
      updateReview();
    });

    const sources = [...root.querySelectorAll('[data-summary-source]')];
    const reviewTitle = root.querySelector('[data-review-title]');
    const reviewShort = root.querySelector('[data-review-short]');
    const reviewPrice = root.querySelector('[data-review-price]');
    const reviewRegion = root.querySelector('[data-review-region]');

    function getSource(name) {
      const field = sources.find((item) => item.dataset.summarySource === name);
      return field?.value?.trim() || '';
    }

    function updateReview() {
      const title = getSource('title');
      const short = getSource('short');
      const priceType = getSource('priceType') || 'A partir de';
      const price = getSource('price');
      const region = getSource('region');
      if (reviewTitle) reviewTitle.textContent = title || 'Pintura residencial com acabamento fino';
      if (reviewShort) reviewShort.textContent = short || 'Descrição curta do anúncio aparecerá aqui.';
      if (reviewPrice) reviewPrice.textContent = price ? `${priceType} R$ ${price}` : `${priceType} R$ 150,00`;
      if (reviewRegion) reviewRegion.textContent = region || 'Belo Horizonte e região';
    }

    sources.forEach((source) => {
      source.addEventListener('input', updateReview);
      source.addEventListener('change', updateReview);
    });

    nextButton?.addEventListener('click', () => {
      if (currentStep < totalSteps) {
        setStep(currentStep + 1);
        root.querySelector('.post-service-form-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else {
        updateReview();
        submitState.hidden = false;
        submitState.classList.add('is-visible');
        nextButton.disabled = true;
        submitState?.querySelector('.post-service-submit-state__button')?.focus({ preventScroll: true });
      }
    });

    stepTargets.forEach((target) => {
      target.addEventListener('click', () => {
        const targetStep = Number(target.dataset.stepTarget);
        if (Number.isFinite(targetStep)) setStep(targetStep);
      });
    });


    backButton?.addEventListener('click', () => {
      if (currentStep > 1) {
        setStep(currentStep - 1);
        root.querySelector('.post-service-form-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'perfil.html?mode=owner&panel=services';
      }
    });

    updateCount();
    updateReview();
    setStep(1);
  };

  window.DokeInitPostService = initPostService;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPostService, { once: true });
  } else {
    initPostService();
  }
})();
