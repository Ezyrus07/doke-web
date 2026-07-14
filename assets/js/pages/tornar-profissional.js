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
    const formLayout = root.querySelector('[data-professional-profile-form-layout]');
    const statusCard = root.querySelector('[data-professional-profile-status]');
    const statusBadge = root.querySelector('[data-professional-profile-status-badge]');
    const statusTitle = root.querySelector('[data-professional-profile-status-title]');
    const statusDescription = root.querySelector('[data-professional-profile-status-description]');
    const statusDate = root.querySelector('[data-professional-profile-status-date]');
    const verificationLink = root.querySelector('[data-professional-verification-link]');
    const feedback = root.querySelector('[data-professional-profile-feedback]');
    const panels = [...root.querySelectorAll('[data-step-panel]')];
    const stepCurrent = root.querySelector('[data-step-current]');
    const stepTargets = [...root.querySelectorAll('[data-step-target]')];
    const nextButton = root.querySelector('[data-step-next]');
    const backButton = root.querySelector('[data-step-back]');
    const exitButton = root.querySelector('[data-step-exit]');
    const actions = root.querySelector('.become-pro-actions');
    const submitState = root.querySelector('[data-submit-state]');
    const submitCloseButtons = [...root.querySelectorAll('[data-submit-close]')];
    const submitPrimaryAction = root.querySelector('[data-submit-verification]');
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
    let currentProfile = null;
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
      const control = form.querySelector(`[name="${CSS.escape(fieldName)}"], [data-profile-setup-field="${CSS.escape(fieldName)}"]`);
      const target = control?.closest('.become-pro-upload-card') || control;
      target?.focus?.({ preventScroll: true });
      target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    };

    const handleError = (error) => {
      showFeedback(error?.message || 'Não foi possível concluir esta ação.', true);
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
      const category = selectedCategory === 'Outros' ? fieldValue('otherCategory') : selectedCategory;
      if (reviewCategory) reviewCategory.textContent = category || 'Não informada';
      if (reviewExperience) reviewExperience.textContent = fieldValue('experienceYears') || 'Não informada';
      if (reviewSpecialties) reviewSpecialties.textContent = fieldValue('specialties') || 'Não informados';
      if (reviewRegion) reviewRegion.textContent = fieldValue('serviceRegion') || 'Não informado';
      if (reviewBio) reviewBio.textContent = fieldValue('shortBio') || 'Não informada';
    };

    const persistDraft = async () => {
      if (!experience?.save || !form || (currentProfile?.status && currentProfile.status !== 'draft')) return null;
      try {
        currentProfile = await experience.save(form, currentStep) || currentProfile;
        root.dataset.professionalProfileStatus = currentProfile?.status || 'draft';
        return currentProfile;
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

      if (nextButton) nextButton.textContent = currentStep >= totalSteps ? 'Criar perfil profissional' : 'Continuar';

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
          ? 'Criando perfil…'
          : (currentStep >= totalSteps ? 'Criar perfil profissional' : 'Continuar');
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

    const renderProfile = (profile) => {
      currentProfile = profile || null;
      const status = currentProfile?.status || 'draft';
      root.dataset.professionalProfileStatus = status;
      const isEditable = !currentProfile || status === 'draft';

      if (formLayout) formLayout.hidden = !isEditable;
      if (statusCard) statusCard.hidden = isEditable;
      if (verificationLink) {
        verificationLink.hidden = status !== 'pending_verification';
        const verificationStatus = String(currentProfile?.verificationStatus || 'not_started');
        verificationLink.textContent = verificationStatus === 'rejected'
          ? 'Corrigir verificação'
          : (verificationStatus === 'submitted' || verificationStatus === 'under_review'
            ? 'Acompanhar verificação'
            : 'Iniciar verificação');
      }
      if (isEditable) return;

      const presentation = experience?.getPresentation?.(status) || {};
      if (statusBadge) statusBadge.textContent = presentation.label || 'Perfil profissional';
      if (statusTitle) statusTitle.textContent = presentation.title || 'Perfil profissional criado';
      if (statusDescription) statusDescription.textContent = presentation.description || '';

      const formatted = formatDate(currentProfile?.completedAt || currentProfile?.updatedAt);
      if (statusDate) {
        statusDate.hidden = !formatted;
        statusDate.textContent = formatted ? `Criado em: ${formatted}` : '';
      }
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
        currentProfile = await experience?.complete?.(form, currentStep, preparedDraft);
        experience?.setState?.('success');
        if (submitState) {
          submitState.hidden = false;
          if (submitState instanceof HTMLDialogElement && typeof submitState.showModal === 'function') {
            if (!submitState.open) submitState.showModal();
          } else {
            submitState.classList.add('is-visible');
          }
        }
        window.requestAnimationFrame(() => submitPrimaryAction?.focus({ preventScroll: true }));
      } catch (error) {
        experience?.setState?.(navigator.onLine === false ? 'offline' : 'error', { error });
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

    const finalizeSubmitState = () => {
      if (submitState) {
        submitState.classList.remove('is-visible');
        submitState.hidden = true;
      }
      renderProfile(currentProfile);
      experience?.setState?.('ready');
      statusCard?.focus?.({ preventScroll: true });
    };

    const closeSubmitState = () => {
      if (submitState instanceof HTMLDialogElement && submitState.open) {
        submitState.close();
        return;
      }
      finalizeSubmitState();
    };

    submitCloseButtons.forEach((button) => button.addEventListener('click', closeSubmitState));
    submitState?.addEventListener('close', finalizeSubmitState);

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
        const navigate = window.Doke?.navigation?.go || window.DokeNavigate;
        if (typeof navigate !== 'function') throw new Error('Doke navigation lifecycle is unavailable.');
        await navigate(target, { source: 'tornar-profissional-exit' });
      } finally {
        exitButton.removeAttribute('aria-busy');
      }
    });

    backButton?.addEventListener('click', () => {
      if (submitting) return;
      if (currentStep > 1) {
        setStep(currentStep - 1);
        root.querySelector('.become-pro-form-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else {
        const back = window.Doke?.navigation?.back;
        if (typeof back !== 'function') throw new Error('Doke navigation lifecycle is unavailable.');
        back('meu-perfil.html', { source: 'tornar-profissional-back' });
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
      currentProfile = await experience?.load?.();
      if (currentProfile?.status === 'draft') {
        experience?.hydrate?.(form, currentProfile);
        syncOtherCategoryField();
        maxReachedStep = Math.max(1, Number(currentProfile.currentStep || 1));
      }
      syncOtherCategoryField();
      updateCount();
      updateReviewSummary();
      setStep(Number(currentProfile?.currentStep || 1), { skipSave: true });
      experience?.setState?.('ready');
      hydration?.ready({ hasItems: true });
      renderProfile(currentProfile);
    } catch (error) {
      experience?.setState?.('error', { error });
      hydration?.error(error);
      handleError(error);
    }
  };

  window.DokeInitBecomePro = initBecomePro;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBecomePro, { once: true });
  else initBecomePro();
})();
