(() => {
  const mountPostService = () => {
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
    const submitStateTitle = submitState?.querySelector('[data-submit-state-title]');
    const submitStateMessage = submitState?.querySelector('[data-submit-state-message]');
    const submitStateActions = submitState?.querySelector('[data-submit-state-actions]');
    const submitStateIcon = submitState?.querySelector('[data-submit-state-icon]');

    const showSubmitState = (phase, detail) => {
      if (!submitState) return;
      const isPending = phase === 'pending';
      submitState.dataset.phase = phase;
      submitState.hidden = false;
      submitState.classList.add('is-visible');
      const editing = root.dataset.serviceEditMode === 'true';
      if (submitStateTitle) submitStateTitle.textContent = isPending
        ? (editing ? 'Enviando alterações para análise' : 'Enviando anúncio para análise')
        : (editing ? 'Alterações enviadas para análise' : 'Anúncio enviado para análise');
      if (submitStateMessage) submitStateMessage.textContent = isPending
        ? (editing
          ? 'Preparando uma nova versão sem substituir o anúncio atualmente aprovado.'
          : 'Salvando a versão e enviando as informações para a fila de análise.')
        : (editing
          ? 'A versão pública anterior permanece disponível enquanto as alterações são analisadas.'
          : 'Seu anúncio ficará visível para os clientes somente depois da aprovação.');
      if (submitStateActions) submitStateActions.hidden = isPending;
      if (submitStateIcon) submitStateIcon.classList.toggle('is-pending', isPending);
      if (!isPending) submitState?.querySelector('a, button')?.focus({ preventScroll: true });
    };

    const hideSubmitState = () => {
      if (!submitState) return;
      submitState.hidden = true;
      submitState.classList.remove('is-visible');
      delete submitState.dataset.phase;
      if (submitStateActions) submitStateActions.hidden = false;
      if (submitStateIcon) submitStateIcon.classList.remove('is-pending');
    };
    const totalSteps = Math.max(1, panels.length);
    const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
    const ALLOWED_UPLOAD_TYPES = /^(?:image\/png|image\/jpeg|image\/webp|image\/gif)$/i;
    let currentStep = 1;
    let highestValidatedStep = 0;
    const quoteModeInput = root.querySelector('[data-quote-mode-input]');
    const quoteTemplateInput = root.querySelector('[data-quote-template-json]');
    const quoteModeOptions = [...root.querySelectorAll('[data-quote-mode-option]')];
    const quoteModePanels = [...root.querySelectorAll('[data-quote-mode-panel]')];

    const normalizeQuoteMode = (value) => ['default', 'custom', 'disabled'].includes(String(value || '').trim().toLowerCase())
      ? String(value).trim().toLowerCase()
      : 'default';

    const quoteModeLabel = (mode) => ({
      default: 'Modelo recomendado pela Doke',
      custom: 'Formulário personalizado',
      disabled: 'Somente conversa — sem pedidos de orçamento'
    })[normalizeQuoteMode(mode)];

    const quoteModeReviewLabel = (mode) => {
      const normalizedMode = normalizeQuoteMode(mode);
      if (normalizedMode !== 'custom') return quoteModeLabel(normalizedMode);
      try {
        const template = JSON.parse(quoteTemplateInput?.value || '{}');
        const questionCount = Array.isArray(template?.questions) ? template.questions.length : 0;
        const templateLabel = String(template?.templateLabel || '').trim();
        if (templateLabel) return `${templateLabel} · ${questionCount} ${questionCount === 1 ? 'pergunta' : 'perguntas'}`;
        return questionCount ? `Formulário personalizado · ${questionCount} ${questionCount === 1 ? 'pergunta' : 'perguntas'}` : 'Formulário personalizado';
      } catch (_) {
        return 'Formulário personalizado';
      }
    };

    const syncQuoteMode = (requestedMode, options = {}) => {
      const mode = normalizeQuoteMode(requestedMode || quoteModeInput?.value);
      if (quoteModeInput) quoteModeInput.value = mode;
      root.dataset.quoteMode = mode;
      quoteModeOptions.forEach((button) => {
        const active = button.dataset.quoteModeOption === mode;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-checked', active ? 'true' : 'false');
      });
      quoteModePanels.forEach((panel) => {
        const active = panel.dataset.quoteModePanel === mode;
        panel.hidden = !active;
        panel.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      if (options.emit !== false) {
        quoteModeInput?.dispatchEvent(new Event('change', { bubbles: true }));
        window.dispatchEvent(new CustomEvent('doke:service-quote-mode-changed', { detail: { mode } }));
      }
      return mode;
    };

    const formatFileSize = (bytes) => {
      const value = Number(bytes || 0);
      if (!value) return '0 KB';
      if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
      return `${(value / (1024 * 1024)).toFixed(1).replace('.0', '')} MB`;
    };

    const syncUploadCard = (input, options = {}) => {
      if (!input) return true;
      const card = input.closest('[data-upload-card], .post-service-upload-card');
      const status = card?.querySelector('[data-upload-status]');
      const file = input.files?.[0] || null;
      card?.classList.remove('has-file');
      if (!file) {
        card?.classList.remove('has-error');
        input.removeAttribute('aria-invalid');
        if (status) status.textContent = 'Selecionar imagem';
        return true;
      }
      let message = '';
      if (!ALLOWED_UPLOAD_TYPES.test(String(file.type || ''))) message = 'Use PNG, JPG, WEBP ou GIF.';
      else if (Number(file.size || 0) > MAX_UPLOAD_BYTES) message = 'A imagem deve ter no máximo 5 MB.';
      if (message) {
        card?.classList.add('has-error');
        input.setAttribute('aria-invalid', 'true');
        if (status) status.textContent = message;
        if (options.clearInvalid !== false) input.value = '';
        return false;
      }
      card?.classList.remove('has-error');
      card?.classList.add('has-file');
      input.removeAttribute('aria-invalid');
      if (status) status.textContent = `${file.name} · ${formatFileSize(file.size)}`;
      return true;
    };

    const syncAllUploadCards = () => {
      root.querySelectorAll('[data-upload-input], .post-service-upload-card input[type="file"]').forEach((input) => syncUploadCard(input, { clearInvalid: false }));
    };

    const showSubmissionError = (error) => {
      const message = root.querySelector(`[data-step-error="${totalSteps}"]`);
      const text = error?.message || 'Não foi possível enviar o anúncio para análise. Revise os dados e tente novamente.';
      if (message) {
        message.textContent = text;
        message.hidden = false;
        message.setAttribute('tabindex', '-1');
        message.focus({ preventScroll: true });
        message.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      root.dataset.submitState = 'error';
    };

    const applyEditPresentation = () => {
      if (root.dataset.serviceEditMode !== 'true') return;
      const title = root.querySelector('.doke-form-page-title');
      const description = root.querySelector('.doke-form-page-description');
      if (title) title.textContent = 'EDITAR SERVIÇO';
      if (description) description.textContent = 'Crie uma nova versão para análise sem substituir imediatamente o anúncio aprovado.';
      if (exitButton) {
        exitButton.textContent = 'Cancelar edição';
        exitButton.href = 'perfil-profissional.html#profile-ads';
      }
    };

    const getStepPanel = (step) => root.querySelector(`[data-step-panel="${step}"]`);

    const clearStepError = (step) => {
      const panel = getStepPanel(step);
      const message = root.querySelector(`[data-step-error="${step}"]`);
      if (message) {
        message.hidden = true;
        message.textContent = '';
      }
      panel?.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
      panel?.querySelectorAll('.has-error').forEach((field) => field.classList.remove('has-error'));
    };

    const failStep = (step, message, field) => {
      const error = root.querySelector(`[data-step-error="${step}"]`);
      if (error) {
        error.textContent = message;
        error.hidden = false;
      }
      if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.closest('.doke-field, .post-service-upload-card, [data-availability-row]')?.classList.add('has-error');
        field.focus({ preventScroll: true });
        field.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } else {
        error?.focus?.({ preventScroll: true });
        error?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return false;
    };

    const validateNativeFields = (step) => {
      const panel = getStepPanel(step);
      const fields = [...(panel?.querySelectorAll('input, select, textarea') || [])]
        .filter((field) => !field.disabled && field.type !== 'hidden');
      for (const field of fields) {
        if (!field.checkValidity()) {
          return failStep(step, field.validationMessage || 'Preencha os campos obrigatórios desta etapa.', field);
        }
      }
      return true;
    };

    const validateStep = (step) => {
      clearStepError(step);
      if (!validateNativeFields(step)) return false;

      if (step === 2) {
        const priceType = root.querySelector('[name="priceType"]')?.value || '';
        const price = root.querySelector('[name="initialPrice"]');
        const billing = root.querySelector('[name="billingUnit"]');
        if (priceType !== 'Sob orçamento' && !price?.value.trim()) return failStep(step, 'Informe o valor inicial ou selecione Sob orçamento.', price);
        if (priceType !== 'Sob orçamento' && !billing?.value) return failStep(step, 'Selecione a unidade de cobrança.', billing);

        const selectedDays = [...root.querySelectorAll('[data-availability-day]:checked')];
        if (!selectedDays.length) return failStep(step, 'Selecione pelo menos um dia de disponibilidade.', root.querySelector('[data-availability-day]'));
        for (const checkbox of selectedDays) {
          const row = checkbox.closest('[data-availability-row]');
          const times = [...(row?.querySelectorAll('[data-availability-time]') || [])];
          if (!times[0]?.value || !times[1]?.value || times[0].value >= times[1].value) {
            return failStep(step, 'Revise o horário: o fim precisa ser posterior ao início.', times[0] || checkbox);
          }
        }
      }

      if (step === 3) {
        const uploadInputs = [...root.querySelectorAll('[data-upload-input], .post-service-upload-card input[type="file"]')];
        const invalidUpload = uploadInputs.find((input) => input.files?.length && !syncUploadCard(input));
        if (invalidUpload) return failStep(step, 'Revise as imagens selecionadas antes de continuar.', invalidUpload);
        const mainImage = root.querySelector('[name="mainImage"]');
        const hasExistingImage = Boolean(root.dataset.existingServiceImage);
        if (!mainImage?.files?.length && !hasExistingImage) return failStep(step, 'Adicione uma imagem principal real do serviço.', mainImage);
      }

      if (step === 4) {
        const mode = syncQuoteMode(quoteModeInput?.value, { emit: false });
        if (mode === 'custom') {
          try {
            const template = window.DokeServiceQuoteTemplateBuilder?.validate?.();
            if (!template?.questions?.length) return failStep(step, 'Adicione pelo menos uma pergunta ou escolha o modelo recomendado da Doke.', root.querySelector('[data-quote-question-add]'));
          } catch (error) {
            return failStep(step, error?.message || 'Revise as perguntas personalizadas.', root.querySelector('[data-quote-template-builder]'));
          }
        }
      }

      if (step === 5) {
        const confirmations = [...root.querySelectorAll('.post-service-confirm [data-post-check]')];
        const unchecked = confirmations.find((button) => !button.classList.contains('is-active'));
        if (unchecked) return failStep(step, 'Confirme as informações e aceite as regras para enviar para análise.', unchecked);
      }

      highestValidatedStep = Math.max(highestValidatedStep, step);
      return true;
    };

    const validateThrough = (targetStep) => {
      for (let step = 1; step < targetStep; step += 1) {
        if (!validateStep(step)) {
          setStep(step);
          return false;
        }
      }
      return true;
    };

    const setStep = (step) => {
      currentStep = Math.max(1, Math.min(totalSteps, step));
      root.dataset.currentStep = String(currentStep);
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
        const editing = root.dataset.serviceEditMode === 'true';
        const label = currentStep >= totalSteps ? (editing ? 'Enviar alterações para análise' : 'Enviar para análise') : 'Continuar';
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

    quoteModeOptions.forEach((button) => {
      button.addEventListener('click', () => {
        syncQuoteMode(button.dataset.quoteModeOption);
        updateReview();
      });
    });

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
        if (input) {
          input.value = button.dataset.value || button.textContent.trim();
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
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

    const counterSources = [...root.querySelectorAll('[data-count-source]')];
    const updateCharacterCount = (source) => {
      const counterValue = source.closest('.doke-field')?.querySelector('[data-count-value]');
      if (!counterValue) return;
      counterValue.textContent = String(source.value.length);
    };
    const updateCharacterCounts = () => counterSources.forEach(updateCharacterCount);
    counterSources.forEach((source) => {
      source.addEventListener('input', () => {
        updateCharacterCount(source);
        updateReview();
      });
      source.addEventListener('change', () => updateCharacterCount(source));
    });

    const sources = [...root.querySelectorAll('[data-summary-source]')];
    const reviewTitle = root.querySelector('[data-review-title]');
    const reviewShort = root.querySelector('[data-review-short]');
    const reviewPrice = root.querySelector('[data-review-price]');
    const reviewRegion = root.querySelector('[data-review-region]');
    const reviewCategory = root.querySelector('[data-review-category]');
    const reviewMode = root.querySelector('[data-review-mode]');
    const reviewAvailability = root.querySelector('[data-review-availability]');
    const reviewImages = root.querySelector('[data-review-images]');
    const reviewTags = root.querySelector('[data-review-tags]');
    const reviewQuoteMode = root.querySelector('[data-review-quote-mode]');
    const reviewModerationCopy = root.querySelector('[data-review-moderation-copy]');
    const reviewImage = root.querySelector('[data-review-image]');
    const reviewImagePlaceholder = root.querySelector('[data-review-media-placeholder]');
    let reviewObjectUrl = '';

    function getSource(name) {
      const field = sources.find((item) => item.dataset.summarySource === name);
      return field?.value?.trim() || '';
    }

    function formatAvailability() {
      const rows = [...root.querySelectorAll('[data-availability-day]:checked')].map((checkbox) => {
        const row = checkbox.closest('[data-availability-row]');
        const label = row?.querySelector('.post-service-availability__day span')?.textContent?.trim() || checkbox.value;
        const times = [...(row?.querySelectorAll('[data-availability-time]') || [])].map((input) => input.value).filter(Boolean);
        return times.length === 2 ? `${label}, ${times[0]}–${times[1]}` : label;
      });
      return rows.length ? rows.join(' · ') : 'Nenhum horário informado';
    }

    function updateReviewImage() {
      const files = ['mainImage', 'extraImageOne', 'extraImageTwo']
        .map((name) => root.querySelector(`[name="${name}"]`)?.files?.[0] || null)
        .filter(Boolean);
      const existingCount = Number(root.dataset.existingServiceImagesCount || 0) || 0;
      const effectiveCount = Math.max(existingCount, files.length);
      if (reviewImages) reviewImages.textContent = effectiveCount ? `${effectiveCount} ${effectiveCount === 1 ? 'imagem no anúncio' : 'imagens no anúncio'}` : 'Nenhuma imagem selecionada';
      if (reviewObjectUrl) {
        URL.revokeObjectURL(reviewObjectUrl);
        reviewObjectUrl = '';
      }
      const main = files[0];
      const existingImage = root.dataset.existingServiceImage || '';
      if (reviewImage) {
        reviewImage.hidden = !main && !existingImage;
        if (main) {
          reviewObjectUrl = URL.createObjectURL(main);
          reviewImage.src = reviewObjectUrl;
        } else if (existingImage) {
          reviewImage.src = existingImage;
        } else {
          reviewImage.removeAttribute('src');
        }
      }
      if (reviewImagePlaceholder) reviewImagePlaceholder.hidden = Boolean(main || existingImage);
    }

    function updateReview() {
      const title = getSource('title');
      const short = getSource('short');
      const priceType = getSource('priceType') || 'A partir de';
      const price = getSource('price');
      const region = getSource('region');
      const category = root.querySelector('[name="category"]')?.value?.trim() || '';
      const mode = root.querySelector('[name="serviceMode"]')?.value?.trim() || '';
      const tags = [...root.querySelectorAll('[data-post-check].is-active[data-value]')].map((button) => button.dataset.value).filter(Boolean);
      if (reviewTitle) reviewTitle.textContent = title || 'Informe o título do anúncio';
      if (reviewShort) reviewShort.textContent = short || 'A descrição curta aparecerá aqui.';
      if (reviewCategory) reviewCategory.textContent = category || 'Categoria não informada';
      if (reviewPrice) reviewPrice.textContent = priceType === 'Sob orçamento' ? 'Sob orçamento' : (price ? `${priceType} R$ ${price}` : 'Preço não informado');
      if (reviewRegion) reviewRegion.textContent = region || 'Região não informada';
      if (reviewMode) reviewMode.textContent = mode || 'Forma de atendimento não informada';
      if (reviewAvailability) reviewAvailability.textContent = formatAvailability();
      if (reviewTags) reviewTags.textContent = tags.length ? tags.join(', ') : 'Nenhum diferencial selecionado';
      const quoteMode = normalizeQuoteMode(quoteModeInput?.value);
      if (reviewQuoteMode) reviewQuoteMode.textContent = quoteModeReviewLabel(quoteMode);
      if (reviewModerationCopy) reviewModerationCopy.textContent = root.dataset.serviceEditMode === 'true'
        ? 'A versão atualmente aprovada continua pública enquanto estas alterações são analisadas.'
        : 'O anúncio será enviado para análise antes de aparecer para os clientes.';
      updateReviewImage();
    }

    sources.forEach((source) => {
      source.addEventListener('input', updateReview);
      source.addEventListener('change', updateReview);
    });
    quoteModeInput?.addEventListener('change', () => {
      syncQuoteMode(quoteModeInput.value, { emit: false });
      updateReview();
    });
    quoteTemplateInput?.addEventListener('input', updateReview);
    window.addEventListener('doke:service-quote-template-changed', updateReview);
    window.addEventListener('doke:service-media-changed', (event) => {
      const images = Array.isArray(event.detail?.images) ? event.detail.images : [];
      const mainImage = root.querySelector('[data-main-service-image], [name="mainImage"]');
      // A obrigatoriedade do upload pertence ao service-form-experience, que sabe
      // quando a hidratação das imagens atuais terminou. Aqui apenas removemos o
      // erro visual quando já existe ao menos uma imagem válida.
      if (mainImage && images.length) {
        mainImage.setCustomValidity('');
        mainImage.removeAttribute('aria-invalid');
        mainImage.closest('[data-upload-card], .post-service-upload-card')?.classList.remove('has-error');
        clearStepError(3);
      }
      updateReview();
    });
    root.querySelectorAll('[name="category"], [name="serviceMode"], [data-availability-day], [data-availability-time], [name="mainImage"], [name="extraImageOne"], [name="extraImageTwo"]').forEach((source) => {
      source.addEventListener('input', updateReview);
      source.addEventListener('change', updateReview);
    });
    root.querySelectorAll('[data-upload-input], .post-service-upload-card input[type="file"]').forEach((input) => {
      input.addEventListener('change', () => {
        syncUploadCard(input);
        updateReview();
      });
    });
    root.querySelectorAll('[data-post-check]').forEach((button) => button.addEventListener('click', () => window.setTimeout(updateReview, 0)));
    window.addEventListener('doke:service-media-changed', updateReview);

    nextButton?.addEventListener('click', () => {
      if (currentStep < totalSteps) {
        if (!validateStep(currentStep)) return;
        setStep(currentStep + 1);
        root.querySelector('.post-service-form-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else {
        if (!validateStep(currentStep)) return;
        updateReview();
        const experience = window.Doke?.serviceFormExperience;
        if (!experience?.submit) {
          showSubmissionError(new Error('O serviço de análise não foi carregado. Atualize a página e tente novamente.'));
          return;
        }
        clearStepError(totalSteps);
        delete root.dataset.submitState;
        nextButton.disabled = true;
        showSubmitState('pending');
        experience.submit()
          .then(() => {
            showSubmitState('success');
          })
          .catch((error) => {
            hideSubmitState();
            showSubmissionError(error);
            window.dispatchEvent(new CustomEvent('doke:service-submit-error', { detail: { error } }));
          })
          .finally(() => {
            nextButton.disabled = false;
          });
      }
    });

    stepTargets.forEach((target) => {
      target.addEventListener('click', () => {
        const targetStep = Number(target.dataset.stepTarget);
        if (!Number.isFinite(targetStep)) return;
        if (targetStep <= currentStep) {
          setStep(targetStep);
          return;
        }
        if (!validateThrough(targetStep)) return;
        setStep(targetStep);
      });
    });


    backButton?.addEventListener('click', () => {
      if (currentStep > 1) {
        setStep(currentStep - 1);
        root.querySelector('.post-service-form-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else {
        const back = window.Doke?.navigation?.back;
        if (typeof back !== 'function') throw new Error('Doke navigation lifecycle is unavailable.');
        back('perfil.html?mode=owner&panel=services', { source: 'anunciar-servico-back' });
      }
    });

    window.addEventListener('doke:service-edit-loaded', () => {
      root.dataset.serviceEditMode = 'true';
      applyEditPresentation();
      updateCharacterCounts();
      syncAllUploadCards();
      syncQuoteMode(quoteModeInput?.value, { emit: false });
      updateReview();
      setStep(1);
    });

    window.addEventListener('doke:service-form-reset', () => {
      currentStep = 1;
      updateCharacterCounts();
      syncAllUploadCards();
      syncQuoteMode(quoteModeInput?.value, { emit: false });
      updateReview();
      setStep(1);
    });

    applyEditPresentation();
    updateCharacterCounts();
    syncAllUploadCards();
    syncQuoteMode(quoteModeInput?.value, { emit: false });
    updateReview();
    const restoredStep = Number(window.Doke?.serviceFormExperience?.restoredStep || 1);
    setStep(restoredStep > 1 && validateThrough(restoredStep) ? restoredStep : 1);
  };

  const GUARD_TIMEOUT_MS = 6000;
  const pageControllers = new WeakMap();

  const withGuardTimeout = (operation) => {
    let timeoutId = 0;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        const error = new Error('Não foi possível validar o acesso profissional agora. Tente novamente.');
        error.code = 'PROFESSIONAL_ACCESS_TIMEOUT';
        reject(error);
      }, GUARD_TIMEOUT_MS);
    });
    return Promise.race([Promise.resolve(operation), timeout]).finally(() => {
      if (timeoutId) window.clearTimeout(timeoutId);
    });
  };

  const setPageLifecycleState = (root, state) => {
    if (!root) return;
    root.dataset.pageLifecycleState = state;
    if (state === 'redirected') {
      root.dataset.viewState = 'redirected';
      root.setAttribute('aria-busy', 'false');
      document.body?.setAttribute('data-page-hydration', 'redirected');
      document.documentElement.dataset.pageHydration = 'redirected';
      document.dispatchEvent(new CustomEvent('doke:page-hydration-state', {
        detail: { page: 'anunciar-servico', state: 'redirected', source: 'professional-access-check' }
      }));
    }
  };

  const failWithoutHydration = (root, error) => {
    const pending = root?.querySelector('[data-post-service-access-pending]');
    const ready = [...(root?.querySelectorAll('[data-post-service-guard-ready]') || [])];
    const errorSurface = root?.querySelector('[data-post-service-guard-error]');
    if (pending) {
      pending.hidden = true;
      pending.setAttribute('aria-hidden', 'true');
    }
    ready.forEach((node) => {
      node.hidden = true;
      node.setAttribute('aria-hidden', 'true');
    });
    if (errorSurface) {
      errorSurface.hidden = false;
      errorSurface.setAttribute('aria-hidden', 'false');
    }
    const message = root?.querySelector('[data-post-service-guard-error-message]');
    if (message) message.textContent = error?.message || 'Tente novamente. Se o problema continuar, retorne ao seu perfil.';
    if (root) {
      root.dataset.viewState = 'error';
      root.dataset.pageLifecycleState = 'error';
      root.setAttribute('aria-busy', 'false');
    }
    errorSurface?.focus({ preventScroll: true });
  };

  const createHydration = (root) => {
    if (!window.DokePageHydration?.create) return null;
    return window.DokePageHydration.create({
      page: 'anunciar-servico',
      root,
      pendingSelectors: '[data-post-service-guard-hydration-skeleton]',
      readySelectors: '[data-post-service-guard-ready]',
      errorSelectors: '[data-post-service-guard-error]',
      skeletonMode: 'never',
      maxDuration: GUARD_TIMEOUT_MS + 1000,
      hasItems: () => true,
      onRetry: () => initPostService({ retry: true })
    });
  };

  const settleHydration = (hydration, method, payload) => new Promise((resolve) => {
    const finish = (state) => {
      document.removeEventListener('doke:page-hydration-state', onState);
      resolve(state);
    };
    const onState = (event) => {
      if (event.detail?.page !== 'anunciar-servico') return;
      if (!['ready', 'empty', 'error'].includes(event.detail?.state)) return;
      finish(event.detail.state);
    };
    document.addEventListener('doke:page-hydration-state', onState);
    hydration[method](payload);
    const current = hydration.getState?.();
    if (['ready', 'empty', 'error'].includes(current)) finish(current);
  });

  const redirectDeniedAccess = (access, result, root, hydration) => {
    const target = access?.redirectFor?.(result) || 'meu-perfil.html';
    hydration?.syncPending(false);
    hydration?.syncReady(false);
    hydration?.syncError(false);
    setPageLifecycleState(root, 'redirected');
    document.documentElement.dataset.professionalAccessState = 'denied';
    const navigate = window.Doke?.navigation?.go;
    if (typeof navigate === 'function') {
      Promise.resolve(navigate(target, {
        replace: true,
        forceDocument: false,
        source: 'anunciar-servico-professional-access'
      })).catch((error) => {
        console.error('[Doke][anunciar-servico] Falha ao redirecionar acesso negado', {
          target,
          error
        });
        window.location.replace(target);
      });
    } else {
      window.location.replace(target);
    }
    return Object.assign({}, result || {}, { redirect: target });
  };

  const runPageLifecycle = async (root, record) => {
    const access = window.Doke?.services?.professionalAccess;
    const action = access?.ACTIONS?.PUBLISH_SERVICE || 'publish_service';
    const hydration = createHydration(root);
    record.hydration = hydration;
    setPageLifecycleState(root, 'loading');

    if (!hydration) {
      const error = new Error('A autoridade de hidratação da página não foi carregada.');
      record.state = 'error';
      failWithoutHydration(root, error);
      console.error('[Doke][anunciar-servico] Falha ao iniciar lifecycle da página', { action, error });
      return { allowed: false, state: 'error', error };
    }
    hydration.start();

    if (!access || typeof access.can !== 'function') {
      const error = new Error('Serviço de acesso profissional indisponível.');
      record.state = 'error';
      await settleHydration(hydration, 'error', error);
      setPageLifecycleState(root, 'error');
      console.error('[Doke][anunciar-servico] Falha no guard profissional', {
        userId: window.Doke?.session?.getCurrentUser?.()?.id || null,
        action,
        professionalProfile: null,
        verification: null,
        error
      });
      return { allowed: false, state: 'error', error };
    }

    try {
      const result = await withGuardTimeout(access.can(action));
      document.documentElement.dataset.professionalAccessState = result?.allowed ? 'allowed' : 'denied';
      if (!result?.allowed) {
        record.state = 'redirected';
        return redirectDeniedAccess(access, result, root, hydration);
      }

      window.DokeInitServiceQuoteTemplateBuilder?.();
      const formExperience = window.DokeInitServiceForm?.();
      if (!formExperience) {
        throw new Error('O controller do formulário de serviço não foi registrado.');
      }
      if (formExperience.ready) await formExperience.ready;
      mountPostService();
      const terminalState = await settleHydration(hydration, 'ready', { hasItems: true });
      if (terminalState !== 'ready') {
        throw new Error('A hidratação do formulário não alcançou o estado ready.');
      }
      record.state = 'ready';
      setPageLifecycleState(root, 'ready');
      return result;
    } catch (error) {
      record.state = 'error';
      if (hydration.getState?.() !== 'error') {
        await settleHydration(hydration, 'error', error);
      }
      setPageLifecycleState(root, 'error');
      const message = root.querySelector('[data-post-service-guard-error-message]');
      if (message) message.textContent = error?.message || 'Tente novamente. Se o problema continuar, retorne ao seu perfil.';
      root.querySelector('[data-post-service-guard-error]')?.focus({ preventScroll: true });
      console.error('[Doke][anunciar-servico] Falha no guard profissional', {
        userId: window.Doke?.session?.getCurrentUser?.()?.id || null,
        action,
        professionalProfile: null,
        verification: null,
        error
      });
      return { allowed: false, state: 'error', error };
    }
  };

  const initPostService = (options = {}) => {
    const root = document.querySelector('[data-post-service-page]');
    if (!root) return Promise.resolve({ mounted: false, state: 'unmounted' });
    bindGuardRetry(root);

    const existing = pageControllers.get(root);
    if (existing && (!options.retry || existing.state === 'loading' || existing.state === 'ready')) {
      return existing.promise;
    }

    const record = {
      state: 'loading',
      hydration: null,
      promise: null
    };
    record.promise = runPageLifecycle(root, record);
    pageControllers.set(root, record);
    return record.promise;
  };

  const bindGuardRetry = (root = document) => {
    const retry = root.querySelector('[data-post-service-guard-retry]');
    if (!retry || retry.dataset.bound === 'true') return;
    retry.dataset.bound = 'true';
    retry.addEventListener('click', () => {
      initPostService({ retry: true }).catch((error) => {
        console.error('[Doke][anunciar-servico] Falha ao tentar novamente', {
          error
        });
      });
    });
  };

  window.DokeInitPostService = initPostService;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { bindGuardRetry(); initPostService(); }, { once: true });
  } else {
    bindGuardRetry();
    initPostService();
  }
})();
