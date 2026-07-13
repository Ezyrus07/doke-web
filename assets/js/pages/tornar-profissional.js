(() => {
  'use strict';

  const initBecomePro = async () => {
    const root = document.querySelector('[data-become-pro-page]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    const hydration = window.DokePageHydration?.create?.({
      page: 'tornar-profissional',
      root,
      skeletonSelectors: '[data-professional-onboarding-hydration-skeleton]',
      readySelectors: '[data-professional-onboarding-hydration-ready]',
      errorSelectors: '[data-state-error]',
      skeletonMode: 'hard-load',
      maxDuration: 8000,
      hasItems: () => true
    }) || null;
    hydration?.start();

    window.DokeHomeDrawer?.create?.()();

    const form = root.querySelector('.become-pro-form');
    const formLayout = root.querySelector('[data-professional-application-form-layout]');
    const statusCard = root.querySelector('[data-professional-application-status]');
    const statusBadge = root.querySelector('[data-application-status-badge]');
    const statusTitle = root.querySelector('[data-application-status-title]');
    const statusDescription = root.querySelector('[data-application-status-description]');
    const statusReason = root.querySelector('[data-application-status-reason]');
    const statusDate = root.querySelector('[data-application-status-date]');
    const correctionButton = root.querySelector('[data-application-correct]');
    const feedback = root.querySelector('[data-application-feedback]');
    const panels = [...root.querySelectorAll('[data-step-panel]')];
    const stepCurrent = root.querySelector('[data-step-current]');
    const stepTargets = [...root.querySelectorAll('[data-step-target]')];
    const nextButton = root.querySelector('[data-step-next]');
    const backButton = root.querySelector('[data-step-back]');
    const exitButton = root.querySelector('[data-step-exit]');
    const actions = root.querySelector('.become-pro-actions');
    const submitState = root.querySelector('[data-submit-state]');
    const submitClose = root.querySelector('[data-submit-close]');
    const counterSource = root.querySelector('[data-count-source]');
    const counterValue = root.querySelector('[data-count-value]');
    const categorySelect = form?.elements?.namedItem('mainCategory') || null;
    const otherCategoryInput = form?.elements?.namedItem('otherCategory') || null;
    const otherCategoryField = root.querySelector('[data-other-category-field]');
    const reviewCategory = root.querySelector('[data-review-category]');
    const reviewExperience = root.querySelector('[data-review-experience]');
    const reviewSpecialties = root.querySelector('[data-review-specialties]');
    const reviewRegion = root.querySelector('[data-review-region]');
    const reviewBio = root.querySelector('[data-review-bio]');
    const totalSteps = Math.max(1, panels.length);
    const experience = window.Doke?.professionalOnboardingExperience;

    let currentStep = 1;
    let maxReachedStep = 1;
    let submitting = false;
    let currentApplication = null;
    let saveTimer = 0;

    const showFeedback = (message, error = false) => {
      if (!feedback) return;
      feedback.textContent = message || '';
      feedback.hidden = !message;
      feedback.classList.toggle('is-error', Boolean(error));
      feedback.classList.toggle('is-success', Boolean(message) && !error);
    };

    const clearFeedback = () => showFeedback('');

    const focusField = (fieldName) => {
      if (!fieldName || !form) return;
      const control = form.querySelector(`[name="${CSS.escape(fieldName)}"], [data-application-field="${CSS.escape(fieldName)}"]`);
      const target = control?.closest('.become-pro-upload-card') || control;
      target?.focus?.({ preventScroll: true });
      target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    };

    const handleError = (error) => {
      const message = error?.message || 'Não foi possível concluir esta ação.';
      showFeedback(message, true);
      focusField(error?.field);
    };

    const updateCount = () => {
      if (counterValue && counterSource) counterValue.textContent = String(counterSource.value.length);
    };

    const isOtherCategory = () => String(categorySelect?.value || '') === 'Outros';

    const syncOtherCategoryField = () => {
      const active = isOtherCategory();
      if (otherCategoryField) otherCategoryField.hidden = !active;
      if (otherCategoryInput) {
        otherCategoryInput.disabled = !active;
        otherCategoryInput.required = active;
        otherCategoryInput.setAttribute('aria-required', active ? 'true' : 'false');
      }
    };

    const fieldValue = (name) => String(form?.elements?.namedItem(name)?.value || '').trim();

    const updateReviewSummary = () => {
      const selectedCategory = fieldValue('mainCategory');
      const category = selectedCategory === 'Outros'
        ? fieldValue('otherCategory')
        : selectedCategory;

      if (reviewCategory) reviewCategory.textContent = category || 'Não informada';
      if (reviewExperience) reviewExperience.textContent = fieldValue('experienceYears') || 'Não informada';
      if (reviewSpecialties) reviewSpecialties.textContent = fieldValue('specialties') || 'Não informados';
      if (reviewRegion) reviewRegion.textContent = fieldValue('serviceRegion') || 'Não informado';
      if (reviewBio) reviewBio.textContent = fieldValue('shortBio') || 'Não informada';
    };

    const persistDraft = async () => {
      if (!experience?.save || !form || currentApplication?.status && currentApplication.status !== 'draft') return null;
      try {
        currentApplication = await experience.save(form, currentStep) || currentApplication;
        root.dataset.applicationStatus = currentApplication?.status || 'draft';
        return currentApplication;
      } catch (error) {
        if (!submitting) handleError(error);
        return null;
      }
    };

    const scheduleDraft = () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(persistDraft, 260);
    };

    const setStep = (step, options = {}) => {
      currentStep = Math.max(1, Math.min(totalSteps, Number(step || 1)));
      maxReachedStep = Math.max(maxReachedStep, currentStep);

      panels.forEach((panel) => {
        const isActive = Number(panel.dataset.stepPanel) === currentStep;
        panel.hidden = !isActive;
        panel.classList.toggle('is-active', isActive);
      });

      if (stepCurrent) stepCurrent.textContent = String(currentStep);

      root.dataset.currentStep = String(currentStep);
      stepTargets.forEach((target) => {
        const targetStep = Number(target.dataset.stepTarget);
        target.classList.toggle('is-active', targetStep === currentStep);
        target.classList.toggle('is-complete', targetStep < currentStep);
        if (targetStep === currentStep) target.setAttribute('aria-current', 'step');
        else target.removeAttribute('aria-current');
        target.disabled = targetStep > maxReachedStep;
        target.setAttribute('aria-disabled', targetStep > maxReachedStep ? 'true' : 'false');
      });

      if (nextButton) nextButton.textContent = currentStep >= totalSteps ? 'Enviar para análise' : 'Continuar';

      if (backButton) {
        const showBack = currentStep > 1;
        backButton.hidden = !showBack;
        backButton.disabled = !showBack;
        backButton.classList.toggle('is-disabled', !showBack);
        actions?.classList.toggle('has-back-action', showBack);
      }

      if (exitButton) exitButton.hidden = currentStep > 1;
      if (currentStep === 2) updateReviewSummary();
      clearFeedback();
      if (!options.skipSave) scheduleDraft();
    };

    const setSubmitting = (active) => {
      submitting = active;
      if (nextButton) {
        nextButton.disabled = active;
        nextButton.setAttribute('aria-busy', active ? 'true' : 'false');
        nextButton.textContent = active
          ? 'Enviando candidatura…'
          : (currentStep >= totalSteps ? 'Enviar para análise' : 'Continuar');
      }
      form?.querySelectorAll('input, select, textarea, button').forEach((control) => {
        if (control === nextButton) return;
        control.disabled = active;
      });
    };

    const formatDate = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    };

    const renderApplication = (application) => {
      currentApplication = application || null;
      const status = currentApplication?.status || 'draft';
      root.dataset.applicationStatus = status;
      const isEditable = !currentApplication || status === 'draft';

      if (formLayout) formLayout.hidden = !isEditable;
      if (statusCard) statusCard.hidden = isEditable;

      if (isEditable) return;

      const presentation = experience?.getPresentation?.(status) || {};
      if (statusBadge) statusBadge.textContent = presentation.label || 'Candidatura';
      if (statusTitle) statusTitle.textContent = presentation.title || 'Acompanhe sua candidatura';
      if (statusDescription) statusDescription.textContent = presentation.description || '';

      if (statusReason) {
        statusReason.hidden = status !== 'rejected' || !currentApplication?.rejectionReason;
        statusReason.textContent = currentApplication?.rejectionReason || '';
      }

      const dateValue = currentApplication?.decidedAt || currentApplication?.underReviewAt || currentApplication?.submittedAt || currentApplication?.updatedAt;
      if (statusDate) {
        const formatted = formatDate(dateValue);
        statusDate.hidden = !formatted;
        statusDate.textContent = formatted ? `Última atualização: ${formatted}` : '';
      }

      if (correctionButton) correctionButton.hidden = status !== 'rejected';
    };

    const validateCurrentStep = () => {
      clearFeedback();
      return experience?.validateStep?.(form, currentStep);
    };

    nextButton?.addEventListener('click', async () => {
      if (submitting) return;

      try {
        validateCurrentStep();
      } catch (error) {
        handleError(error);
        return;
      }

      if (currentStep < totalSteps) {
        await persistDraft();
        setStep(currentStep + 1, { skipSave: true });
        root.querySelector('.become-pro-form-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      }

      const preparedDraft = experience?.serialize?.(form, currentStep);
      setSubmitting(true);
      experience?.setState?.('submitting');

      try {
        currentApplication = await experience?.submit?.(form, currentStep, preparedDraft);
        experience?.setState?.('success');
        if (submitState) {
          submitState.hidden = false;
          submitState.classList.add('is-visible');
        }
        submitClose?.focus({ preventScroll: true });
      } catch (error) {
        const offline = navigator.onLine === false;
        experience?.setState?.(offline ? 'offline' : 'error', { error });
        handleError(error);
      } finally {
        setSubmitting(false);
      }
    });

    stepTargets.forEach((target) => {
      target.addEventListener('click', () => {
        const targetStep = Number(target.dataset.stepTarget);
        if (!Number.isFinite(targetStep) || submitting || targetStep > maxReachedStep) return;
        setStep(targetStep);
      });
    });

    submitClose?.addEventListener('click', () => {
      submitState?.classList.remove('is-visible');
      if (submitState) submitState.hidden = true;
      renderApplication(currentApplication);
      experience?.setState?.('ready');
      statusCard?.focus?.({ preventScroll: true });
    });

    correctionButton?.addEventListener('click', async () => {
      if (submitting) return;
      correctionButton.disabled = true;
      try {
        const application = await experience?.reopen?.();
        renderApplication(application);
        experience?.hydrate?.(form, application);
        maxReachedStep = Math.max(1, Number(application?.currentStep || 1));
        setStep(Number(application?.currentStep || 1), { skipSave: true });
        formLayout?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      } catch (error) {
        handleError(error);
      } finally {
        correctionButton.disabled = false;
      }
    });

    exitButton?.addEventListener('click', async (event) => {
      if (submitting) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      const target = exitButton.getAttribute('href') || 'meu-perfil.html';
      exitButton.setAttribute('aria-busy', 'true');
      window.clearTimeout(saveTimer);

      try {
        if (experience?.save) {
          const saved = await persistDraft();
          if (!saved) return;
        }

        if (typeof window.DokeNavigate === 'function') window.DokeNavigate(target);
        else window.location.href = target;
      } finally {
        exitButton.removeAttribute('aria-busy');
      }
    });

    backButton?.addEventListener('click', () => {
      if (submitting) return;
      if (currentStep > 1) {
        setStep(currentStep - 1);
        root.querySelector('.become-pro-form-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'perfil.html';
      }
    });

    root.querySelectorAll('.become-pro-upload-card input[type="file"]').forEach((input) => {
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        const card = input.closest('.become-pro-upload-card');
        const label = card?.querySelector('[data-upload-label]');
        const action = card?.querySelector('[data-upload-action]');
        if (file) {
          input.dataset.persistedFileName = file.name;
          input.dataset.persistedFileSize = String(file.size || 0);
          input.dataset.persistedFileType = file.type || '';
          card?.classList.add('has-file');
          if (label) label.textContent = file.name;
          if (action) action.textContent = 'Trocar arquivo';
        }
        scheduleDraft();
      });
    });

    categorySelect?.addEventListener('change', () => {
      syncOtherCategoryField();
      updateReviewSummary();
      if (isOtherCategory()) otherCategoryInput?.focus({ preventScroll: true });
    });
    otherCategoryInput?.addEventListener('input', updateReviewSummary);
    counterSource?.addEventListener('input', updateCount);
    form?.addEventListener('input', () => {
      updateReviewSummary();
      scheduleDraft();
    });
    form?.addEventListener('change', () => {
      updateReviewSummary();
      scheduleDraft();
    });

    experience?.setState?.('loading');

    try {
      currentApplication = await experience?.load?.();
      if (currentApplication?.status === 'draft') {
        experience?.hydrate?.(form, currentApplication);
        syncOtherCategoryField();
        maxReachedStep = Math.max(1, Number(currentApplication.currentStep || 1));
      }
      syncOtherCategoryField();
      updateCount();
      updateReviewSummary();
      setStep(Number(currentApplication?.currentStep || 1), { skipSave: true });
      experience?.setState?.('ready');
      hydration?.ready({ hasItems: true });
      renderApplication(currentApplication);
    } catch (error) {
      experience?.setState?.('error', { error });
      hydration?.error(error);
      handleError(error);
    }
  };

  window.DokeInitBecomePro = initBecomePro;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBecomePro, { once: true });
  } else {
    initBecomePro();
  }
})();
