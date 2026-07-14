(function () {
  'use strict';

  var initProfessionalVerification = async function () {
    var root = document.querySelector('[data-professional-verification-page]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    var hydration = window.DokePageHydration && window.DokePageHydration.create ? window.DokePageHydration.create({
      page: 'verificacao-profissional',
      root: root,
      skeletonSelectors: '[data-professional-verification-hydration-skeleton]',
      readySelectors: '[data-professional-verification-hydration-ready]',
      errorSelectors: '[data-state-error]',
      skeletonMode: 'always',
      readyPolicy: 'after-skeleton',
      minDuration: 0,
      maxDuration: 8000,
      hasItems: function () { return true; }
    }) : null;
    if (hydration) hydration.start();

    if (window.DokeHomeDrawer && window.DokeHomeDrawer.create) window.DokeHomeDrawer.create()();

    var service = window.Doke && window.Doke.services && window.Doke.services.professionalIdentityVerification;
    var form = root.querySelector('.professional-verification-form');
    var formLayout = root.querySelector('[data-professional-verification-form-layout]');
    var statusCard = root.querySelector('[data-professional-verification-status]');
    var statusBadge = root.querySelector('[data-professional-verification-status-badge]');
    var statusTitle = root.querySelector('[data-professional-verification-status-title]');
    var statusDescription = root.querySelector('[data-professional-verification-status-description]');
    var statusReason = root.querySelector('[data-professional-verification-status-reason]');
    var statusDate = root.querySelector('[data-professional-verification-status-date]');
    var resumeButton = root.querySelector('[data-professional-verification-resume]');
    var feedback = root.querySelector('[data-professional-verification-feedback]');
    var panels = Array.from(root.querySelectorAll('[data-verification-step-panel]'));
    var stepTargets = Array.from(root.querySelectorAll('[data-verification-step-target]'));
    var nextButton = root.querySelector('[data-verification-next]');
    var secondaryButton = root.querySelector('[data-verification-secondary]');
    var loadingState = root.querySelector('[data-professional-verification-loading]');
    var submitState = root.querySelector('[data-professional-verification-submit-state]');
    var submitCloseButtons = Array.from(root.querySelectorAll('[data-professional-verification-submit-close]'));
    var verificationType = form && form.elements.namedItem('verificationType');
    var birthDateField = root.querySelector('[data-birth-date-field]');
    var representativeField = root.querySelector('[data-representative-field]');
    var businessDocumentField = root.querySelector('[data-business-document-field]');
    var legalNameLabel = root.querySelector('[data-legal-name-label]');
    var taxIdLabel = root.querySelector('[data-tax-id-label]');
    var totalSteps = panels.length || 3;

    var currentStep = 1;
    var maxReachedStep = 1;
    var currentVerification = null;
    var professionalProfile = null;
    var submitting = false;
    var saveTimer = 0;

    function showFeedback(message, error) {
      if (!feedback) return;
      feedback.textContent = message || '';
      feedback.hidden = !message;
      feedback.classList.toggle('is-success', Boolean(message) && !error);
    }

    function focusField(fieldName) {
      if (!fieldName || !form) return;
      var control = form.querySelector('[name="' + CSS.escape(fieldName) + '"]');
      var target = control && (control.closest('.professional-verification-upload-card') || control);
      if (target && target.focus) target.focus({ preventScroll: true });
      if (target && target.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    function handleError(error) {
      showFeedback(error && error.message || 'Não foi possível concluir esta ação.', true);
      focusField(error && error.field);
    }

    function fileMetadata(input) {
      if (!input) return null;
      var file = input.files && input.files[0];
      if (file) return { fileName: file.name, size: file.size || 0, type: file.type || '', blob: file };
      if (!input.dataset.persistedFileName) return null;
      return {
        fileName: input.dataset.persistedFileName,
        size: Number(input.dataset.persistedFileSize || 0),
        type: input.dataset.persistedFileType || '',
        blob: typeof Blob !== 'undefined' && input._dokePersistedBlob instanceof Blob ? input._dokePersistedBlob : null
      };
    }

    function serialize() {
      var data = {};
      if (!form) return data;
      Array.from(form.elements).forEach(function (control) {
        if (!control.name || control.disabled) return;
        if (control.type === 'file') data[control.name] = fileMetadata(control);
        else if (control.type === 'checkbox') data[control.name] = control.checked;
        else data[control.name] = control.value;
      });
      return data;
    }

    function setFileState(input, metadata) {
      if (!input || !metadata || !metadata.fileName) return;
      input.dataset.persistedFileName = metadata.fileName;
      input.dataset.persistedFileSize = String(metadata.size || 0);
      input.dataset.persistedFileType = metadata.type || '';
      input._dokePersistedBlob = typeof Blob !== 'undefined' && metadata.blob instanceof Blob ? metadata.blob : null;
      var card = input.closest('.professional-verification-upload-card');
      var label = card && card.querySelector('[data-file-label]');
      if (card) card.classList.add('has-file');
      if (label) label.textContent = metadata.fileName;
    }

    function hydrate(verification) {
      if (!form || !verification) return;
      var payload = verification.payload || {};
      Object.keys(payload).forEach(function (name) {
        var control = form.elements.namedItem(name);
        if (!control) return;
        if (control.type === 'file') setFileState(control, payload[name]);
        else if (control.type === 'checkbox') control.checked = Boolean(payload[name]);
        else control.value = payload[name] == null ? '' : String(payload[name]);
      });
    }

    function syncConditionalFields() {
      var business = String(verificationType && verificationType.value || 'individual') === 'business';
      var birthInput = form && form.elements.namedItem('birthDate');
      var representativeInput = form && form.elements.namedItem('representativeName');
      var businessInput = form && form.elements.namedItem('businessDocument');
      if (birthDateField) birthDateField.hidden = business;
      if (birthInput) { birthInput.disabled = business; birthInput.required = !business; }
      if (representativeField) representativeField.hidden = !business;
      if (representativeInput) { representativeInput.disabled = !business; representativeInput.required = business; }
      if (businessDocumentField) businessDocumentField.hidden = !business;
      if (businessInput) { businessInput.disabled = !business; businessInput.required = business; }
      if (legalNameLabel) legalNameLabel.textContent = business ? 'Razão social' : 'Nome legal';
      if (taxIdLabel) taxIdLabel.textContent = business ? 'CNPJ' : 'CPF';
      var taxId = form && form.elements.namedItem('taxId');
      if (taxId) taxId.maxLength = business ? 18 : 14;
    }

    function updateReview() {
      if (!form) return;
      var data = serialize();
      var typeTarget = root.querySelector('[data-review-verification-type]');
      var taxTarget = root.querySelector('[data-review-tax-id]');
      var nameTarget = root.querySelector('[data-review-legal-name]');
      var addressTarget = root.querySelector('[data-review-address]');
      var filesTarget = root.querySelector('[data-review-files]');
      if (typeTarget) typeTarget.textContent = data.verificationType === 'business' ? 'Pessoa jurídica' : 'Pessoa física';
      if (taxTarget) taxTarget.textContent = data.taxId || 'Não informado';
      if (nameTarget) nameTarget.textContent = data.legalName || 'Não informado';
      if (addressTarget) addressTarget.textContent = [data.street, data.number, data.city, data.state].filter(Boolean).join(', ') || 'Não informado';
      var fileNames = ['documentFront', 'documentBack', 'selfieDocument', 'proofOfAddress', 'businessDocument']
        .map(function (key) { return data[key] && data[key].fileName; }).filter(Boolean);
      if (filesTarget) filesTarget.textContent = fileNames.length ? fileNames.length + ' arquivo(s) selecionado(s)' : 'Não informados';
    }

    function setStep(step, options) {
      options = options || {};
      currentStep = Math.max(1, Math.min(totalSteps, Number(step || 1)));
      maxReachedStep = Math.max(maxReachedStep, currentStep);
      panels.forEach(function (panel) {
        var active = Number(panel.dataset.verificationStepPanel) === currentStep;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
      stepTargets.forEach(function (target) {
        var targetStep = Number(target.dataset.verificationStepTarget);
        target.classList.toggle('is-active', targetStep === currentStep);
        target.classList.toggle('is-complete', targetStep < currentStep);
        target.disabled = targetStep > maxReachedStep;
        if (targetStep === currentStep) target.setAttribute('aria-current', 'step');
        else target.removeAttribute('aria-current');
      });
      if (secondaryButton) secondaryButton.textContent = currentStep === 1 ? 'Salvar e sair' : 'Voltar';
      if (nextButton) nextButton.textContent = currentStep === totalSteps ? 'Enviar para análise' : 'Continuar';
      if (currentStep === totalSteps) updateReview();
      showFeedback('');
      if (!options.skipSave) scheduleDraft();
    }

    async function persistDraft() {
      if (!service || !service.saveDraft || !form) return null;
      if (currentVerification && ['submitted', 'under_review', 'verified'].indexOf(currentVerification.status) >= 0) return currentVerification;
      try {
        currentVerification = await service.saveDraft({ currentStep: currentStep, payload: serialize() });
        return currentVerification;
      } catch (error) {
        if (!submitting) handleError(error);
        return null;
      }
    }

    function scheduleDraft() {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(persistDraft, 260);
    }

    function formatDate(value) {
      if (!value) return '';
      var date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }

    function renderStatus(verification) {
      currentVerification = verification || null;
      var status = verification && verification.status || 'not_started';
      var editable = !verification || status === 'not_started';
      if (formLayout) formLayout.hidden = !editable;
      if (statusCard) statusCard.hidden = editable;
      if (editable) return;
      var presentation = service && service.getStatusPresentation ? service.getStatusPresentation(status) : {};
      if (statusBadge) statusBadge.textContent = presentation.label || 'Verificação profissional';
      if (statusTitle) statusTitle.textContent = presentation.title || 'Acompanhe sua verificação';
      if (statusDescription) statusDescription.textContent = presentation.description || '';
      if (statusReason) {
        statusReason.hidden = !(status === 'rejected' && verification.rejectionReason);
        statusReason.textContent = verification.rejectionReason || '';
      }
      if (resumeButton) {
        var canCorrect = status === 'rejected';
        resumeButton.hidden = !canCorrect;
        resumeButton.disabled = !canCorrect;
      }
      var dateValue = verification.decidedAt || verification.reviewStartedAt || verification.submittedAt || verification.updatedAt;
      var formatted = formatDate(dateValue);
      if (statusDate) { statusDate.hidden = !formatted; statusDate.textContent = formatted ? 'Atualizado em: ' + formatted : ''; }
    }

    function openDialog(dialog) {
      if (!dialog) return;
      dialog.hidden = false;
      if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
      else dialog.setAttribute('open', '');
    }

    function closeDialog(dialog) {
      if (!dialog) return;
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
      dialog.hidden = true;
    }

    function clearSensitiveForm() {
      if (!form) return;
      form.reset();
      Array.from(form.querySelectorAll('input[type="file"]')).forEach(function (input) {
        delete input.dataset.persistedFileName;
        delete input.dataset.persistedFileSize;
        delete input.dataset.persistedFileType;
        var card = input.closest('.professional-verification-upload-card');
        var label = card && card.querySelector('[data-file-label]');
        if (card) card.classList.remove('has-file');
        if (label && label.dataset.defaultLabel) label.textContent = label.dataset.defaultLabel;
      });
      syncConditionalFields();
    }

    function setSubmitting(active) {
      submitting = active;
      if (nextButton) {
        nextButton.disabled = active;
        nextButton.setAttribute('aria-busy', active ? 'true' : 'false');
        nextButton.textContent = active ? 'Enviando…' : (currentStep === totalSteps ? 'Enviar para análise' : 'Continuar');
      }
      if (form) Array.from(form.querySelectorAll('input, select, textarea, button')).forEach(function (control) {
        if (control !== nextButton) control.disabled = active;
      });
      if (!active) syncConditionalFields();
    }

    nextButton && nextButton.addEventListener('click', async function () {
      if (submitting || !service) return;
      try { service.validateStep(serialize(), currentStep); }
      catch (error) { handleError(error); return; }

      if (currentStep < totalSteps) {
        await persistDraft();
        setStep(currentStep + 1, { skipSave: true });
        root.querySelector('.professional-verification-form-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      }

      var submissionPayload = serialize();
      setSubmitting(true);
      openDialog(loadingState);
      var minimumLoading = new Promise(function (resolve) { window.setTimeout(resolve, 2000); });
      try {
        var results = await Promise.all([
          service.submit({ payload: submissionPayload }),
          minimumLoading
        ]);
        currentVerification = results[0];
        clearSensitiveForm();
        closeDialog(loadingState);
        openDialog(submitState);
        var successFocus = submitState && (submitState.querySelector('.doke-btn--primary') || submitState.querySelector('[data-professional-verification-submit-close]'));
        successFocus && successFocus.focus({ preventScroll: true });
      } catch (error) {
        closeDialog(loadingState);
        handleError(error);
      } finally {
        setSubmitting(false);
      }
    });

    secondaryButton && secondaryButton.addEventListener('click', async function () {
      if (submitting) return;
      if (currentStep > 1) {
        setStep(currentStep - 1);
        return;
      }
      window.clearTimeout(saveTimer);
      var saved = await persistDraft();
      if (!saved && form) return;
      var target = 'tornar-profissional.html';
      if (typeof window.DokeNavigate === 'function') window.DokeNavigate(target);
      else window.location.href = target;
    });

    stepTargets.forEach(function (target) {
      target.addEventListener('click', function () {
        var targetStep = Number(target.dataset.verificationStepTarget);
        if (!Number.isFinite(targetStep) || targetStep > maxReachedStep || submitting) return;
        setStep(targetStep);
      });
    });

    verificationType && verificationType.addEventListener('change', function () {
      syncConditionalFields();
      updateReview();
      scheduleDraft();
    });

    form && form.addEventListener('input', function () { updateReview(); scheduleDraft(); });
    form && form.addEventListener('change', function () { updateReview(); scheduleDraft(); });

    root.querySelectorAll('.professional-verification-upload-card').forEach(function (card) {
      var input = card.querySelector('input[type="file"]');
      card.addEventListener('keydown', function (event) {
        if ((event.key === 'Enter' || event.key === ' ') && input && !input.disabled) { event.preventDefault(); input.click(); }
      });
      input && input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        input.dataset.persistedFileName = file.name;
        input.dataset.persistedFileSize = String(file.size || 0);
        input.dataset.persistedFileType = file.type || '';
        card.classList.add('has-file');
        var label = card.querySelector('[data-file-label]');
        if (label) label.textContent = file.name;
        updateReview();
        scheduleDraft();
      });
    });

    submitCloseButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        closeDialog(submitState);
        renderStatus(currentVerification);
        statusCard && statusCard.focus({ preventScroll: true });
      });
    });

    submitState && submitState.addEventListener('click', function (event) {
      if (event.target === submitState) {
        closeDialog(submitState);
        renderStatus(currentVerification);
      }
    });

    loadingState && loadingState.addEventListener('cancel', function (event) {
      event.preventDefault();
    });

    resumeButton && resumeButton.addEventListener('click', async function () {
      try {
        currentVerification = await service.reopenRejected();
        hydrate(currentVerification);
        syncConditionalFields();
        maxReachedStep = Math.max(1, Number(currentVerification && currentVerification.currentStep || 1));
        setStep(Math.min(maxReachedStep, 3), { skipSave: true });
        renderStatus(currentVerification);
      } catch (error) { handleError(error); }
    });

    try {
      if (!service || !service.getContext) throw new Error('Serviço de verificação profissional indisponível.');
      var context = await service.getContext();
      professionalProfile = context.professionalProfile;
      currentVerification = context.verification;
      if (currentVerification) hydrate(currentVerification);
      else {
        var user = context.user || {};
        var profile = user.profile || {};
        var cityInput = form && form.elements.namedItem('city');
        var stateInput = form && form.elements.namedItem('state');
        if (cityInput && !cityInput.value) cityInput.value = profile.city || user.city || '';
        if (stateInput && !stateInput.value) stateInput.value = profile.state || user.state || '';
      }
      syncConditionalFields();
      maxReachedStep = Math.max(1, Number(currentVerification && currentVerification.currentStep || 1));
      setStep(Math.min(maxReachedStep, 3), { skipSave: true });
      updateReview();
      renderStatus(currentVerification);
      hydration && hydration.ready({ hasItems: true });
    } catch (error) {
      hydration && hydration.error(error);
      handleError(error);
      if (formLayout) formLayout.hidden = true;
      if (statusCard) {
        statusCard.hidden = false;
        if (statusTitle) statusTitle.textContent = 'Verificação indisponível';
        if (statusDescription) statusDescription.textContent = error.message || 'Crie o perfil profissional antes de iniciar a verificação.';
      }
    }
  };

  window.DokeInitProfessionalVerification = initProfessionalVerification;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initProfessionalVerification, { once: true });
  else initProfessionalVerification();
})();
