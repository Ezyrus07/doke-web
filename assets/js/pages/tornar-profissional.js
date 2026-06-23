(() => {
  const initBecomePro = () => {
    const root = document.querySelector('[data-become-pro-page]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    window.DokeHomeDrawer?.create?.()();

    const panels = [...root.querySelectorAll('[data-step-panel]')];
    const stepCurrent = root.querySelector('[data-step-current]');
    const progressSteps = [...root.querySelectorAll('.become-pro-progress__track span')];
    const progressLabel = root.querySelector('[data-step-progress-label]');
    const progressFill = root.querySelector('[data-step-progress-fill]');
    const stepTargets = [...root.querySelectorAll('[data-step-target]')];
    const nextButton = root.querySelector('[data-step-next]');
    const backButton = root.querySelector('[data-step-back]');
    const exitButton = root.querySelector('[data-step-exit]');
    const actions = root.querySelector('.become-pro-actions');
    const submitState = root.querySelector('[data-submit-state]');
    const submitClose = root.querySelector('[data-submit-close]');
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
      if (progressFill) progressFill.style.width = `${(currentStep / totalSteps) * 100}%`;
      progressSteps.forEach((item, index) => {
        item.classList.toggle('is-active', index < currentStep);
      });
      stepTargets.forEach((target) => {
        const targetStep = Number(target.dataset.stepTarget);
        target.classList.toggle('is-active', targetStep === currentStep);
        target.classList.toggle('is-complete', targetStep < currentStep);
      });

      if (nextButton) {
        const label = currentStep >= totalSteps ? 'Enviar para an\u00e1lise' : 'Continuar';
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

    const closeSelect = (select) => {
      if (!select) return;
      const button = select.querySelector('.become-pro-select__button');
      const menu = select.querySelector('.become-pro-select__menu');
      select.classList.remove('is-open');
      button?.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
    };

    const closeAllSelects = (except) => {
      root.querySelectorAll('[data-pro-select]').forEach((select) => {
        if (select !== except) closeSelect(select);
      });
    };

    root.querySelectorAll('[data-pro-select]').forEach((select) => {
      const input = select.querySelector('input[type="hidden"]');
      const button = select.querySelector('.become-pro-select__button');
      const valueLabel = select.querySelector('[data-pro-select-value]');
      const menu = select.querySelector('.become-pro-select__menu');
      const options = [...select.querySelectorAll('[data-value]')];

      const toggleMenu = () => {
        const willOpen = !select.classList.contains('is-open');
        closeAllSelects(select);
        select.classList.toggle('is-open', willOpen);
        button?.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        if (menu) menu.hidden = !willOpen;
      };

      button?.addEventListener('click', toggleMenu);

      options.forEach((option) => {
        option.addEventListener('click', () => {
          const value = option.dataset.value || option.textContent.trim();
          if (input) input.value = value;
          if (valueLabel) valueLabel.textContent = value;
          select.classList.toggle('has-value', Boolean(value));
          options.forEach((item) => item.classList.toggle('is-selected', item === option));
          closeSelect(select);
          button?.focus({ preventScroll: true });
        });
      });
    });

    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) return;
      if (!event.target.closest('[data-pro-select]')) closeAllSelects();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAllSelects();
    });

    nextButton?.addEventListener('click', () => {
      if (currentStep < totalSteps) {
        setStep(currentStep + 1);
        root.querySelector('.become-pro-form-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else {
        submitState.hidden = false;
        submitState.classList.add('is-visible');
        nextButton.disabled = true;
        submitClose?.focus({ preventScroll: true });
      }
    });

    stepTargets.forEach((target) => {
      target.addEventListener('click', () => {
        const targetStep = Number(target.dataset.stepTarget);
        if (Number.isFinite(targetStep)) setStep(targetStep);
      });
    });

    submitClose?.addEventListener('click', () => {
      submitState?.classList.remove('is-visible');
      if (submitState) submitState.hidden = true;
      if (nextButton) {
        nextButton.disabled = false;
        nextButton.focus({ preventScroll: true });
      }
    });

    backButton?.addEventListener('click', () => {
      if (currentStep > 1) {
        setStep(currentStep - 1);
        root.querySelector('.become-pro-form-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'perfil.html';
      }
    });

    root.querySelectorAll('.become-pro-toggle').forEach((button) => {
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
    counterSource?.addEventListener('input', updateCount);
    updateCount();
    setStep(1);
  };

  window.DokeInitBecomePro = initBecomePro;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBecomePro, { once: true });
  } else {
    initBecomePro();
  }
})();
