(() => {
  const initBecomePro = () => {
    const root = document.querySelector('[data-become-pro-page]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    window.DokeHomeDrawer?.create?.()();

    const form = root.querySelector('.become-pro-form');
    const panels = [...root.querySelectorAll('[data-step-panel]')];
    const stepCurrent = root.querySelector('[data-step-current]');
    const progressSteps = [...root.querySelectorAll('.become-pro-progress__track span')];
    const progressLabel = root.querySelector('[data-step-progress-label]');
    const progressName = root.querySelector('[data-step-progress-name]');
    const progressFill = root.querySelector('[data-step-progress-fill]');
    const stepTargets = [...root.querySelectorAll('[data-step-target]')];
    const nextButton = root.querySelector('[data-step-next]');
    const backButton = root.querySelector('[data-step-back]');
    const exitButton = root.querySelector('[data-step-exit]');
    const actions = root.querySelector('.become-pro-actions');
    const submitState = root.querySelector('[data-submit-state]');
    const submitClose = root.querySelector('[data-submit-close]');
    const accountTypeInputs = [...root.querySelectorAll('input[name="accountType"]')];
    const companyDocument = root.querySelector('[data-company-document]');
    const counterSource = root.querySelector('[data-count-source]');
    const counterValue = root.querySelector('[data-count-value]');
    const totalSteps = Math.max(1, panels.length);
    const experience = window.Doke?.professionalOnboardingExperience;

    let currentStep = 1;
    let submitting = false;
    let saveTimer = 0;

    const persistDraft = () => experience?.save?.(form, currentStep);
    const scheduleDraft = () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(persistDraft, 180);
    };

    const updateCount = () => {
      if (counterValue && counterSource) {
        counterValue.textContent = String(counterSource.value.length);
      }
    };

    const updateAccountType = () => {
      if (!companyDocument) return;
      const selectedType = accountTypeInputs.find((input) => input.checked)?.value;
      companyDocument.hidden = selectedType !== 'pj';
    };

    const setStep = (step, options = {}) => {
      currentStep = Math.max(1, Math.min(totalSteps, step));

      panels.forEach((panel) => {
        const isActive = Number(panel.dataset.stepPanel) === currentStep;
        panel.hidden = !isActive;
        panel.classList.toggle('is-active', isActive);
      });

      if (stepCurrent) stepCurrent.textContent = String(currentStep);
      if (progressLabel) progressLabel.textContent = `Etapa ${currentStep} de ${totalSteps}`;
      if (progressName) {
        const currentTarget = stepTargets.find((target) => Number(target.dataset.stepTarget) === currentStep);
        progressName.textContent = currentTarget?.dataset.stepName || 'Perfil profissional';
      }

      root.dataset.currentStep = String(currentStep);
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
        nextButton.textContent = currentStep >= totalSteps ? 'Enviar para análise' : 'Continuar';
      }

      if (backButton) {
        const showBack = currentStep > 1;
        backButton.hidden = !showBack;
        backButton.disabled = !showBack;
        backButton.classList.toggle('is-disabled', !showBack);
        actions?.classList.toggle('has-back-action', showBack);
      }

      if (exitButton) exitButton.hidden = currentStep > 1;
      if (!options.skipSave) persistDraft();
    };

    const setSubmitting = (active) => {
      submitting = active;

      if (nextButton) {
        nextButton.disabled = active;
        nextButton.setAttribute('aria-busy', active ? 'true' : 'false');
        nextButton.textContent = active
          ? 'Enviando cadastro…'
          : (currentStep >= totalSteps ? 'Enviar para análise' : 'Continuar');
      }

      form?.querySelectorAll('input, select, textarea, button').forEach((control) => {
        if (control === nextButton) return;
        control.disabled = active;
      });
    };

    nextButton?.addEventListener('click', async () => {
      if (submitting) return;

      if (currentStep < totalSteps) {
        setStep(currentStep + 1);
        root.querySelector('.become-pro-form-card')?.scrollIntoView({
          block: 'start',
          behavior: 'smooth'
        });
        return;
      }

      setSubmitting(true);
      experience?.setState?.('submitting');

      try {
        await experience?.submit?.(form, currentStep);
        experience?.setState?.('success');
        if (submitState) {
          submitState.hidden = false;
          submitState.classList.add('is-visible');
        }
        submitClose?.focus({ preventScroll: true });
      } catch (error) {
        const offline = navigator.onLine === false;
        experience?.setState?.(offline ? 'offline' : 'error', { error });
        persistDraft();
        window.dispatchEvent(new CustomEvent('doke:professional-application-error', {
          detail: { error }
        }));
        window.alert(error?.message || 'Não foi possível enviar o cadastro profissional.');
      } finally {
        setSubmitting(false);
      }
    });

    stepTargets.forEach((target) => {
      target.addEventListener('click', () => {
        const targetStep = Number(target.dataset.stepTarget);
        if (Number.isFinite(targetStep) && !submitting) setStep(targetStep);
      });
    });

    submitClose?.addEventListener('click', () => {
      submitState?.classList.remove('is-visible');
      if (submitState) submitState.hidden = true;
      nextButton?.focus({ preventScroll: true });
      experience?.setState?.('ready');
    });

    backButton?.addEventListener('click', () => {
      if (submitting) return;

      if (currentStep > 1) {
        setStep(currentStep - 1);
        root.querySelector('.become-pro-form-card')?.scrollIntoView({
          block: 'start',
          behavior: 'smooth'
        });
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'perfil.html';
      }
    });

    accountTypeInputs.forEach((input) => {
      input.addEventListener('change', () => {
        updateAccountType();
        scheduleDraft();
      });
    });

    root.querySelectorAll('.become-pro-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        if (submitting) return;
        const active = !button.classList.contains('is-active');
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        scheduleDraft();
      });
    });

    counterSource?.addEventListener('input', updateCount);
    form?.addEventListener('input', scheduleDraft);
    form?.addEventListener('change', scheduleDraft);

    experience?.setState?.('loading');
    const restored = experience?.restore?.(form);
    updateCount();
    updateAccountType();
    setStep(Number(restored?.step || 1), { skipSave: true });
    experience?.setState?.('ready');
  };

  window.DokeInitBecomePro = initBecomePro;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBecomePro, { once: true });
  } else {
    initBecomePro();
  }
})();
