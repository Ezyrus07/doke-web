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
    const totalSteps = Math.max(1, panels.length);
    let currentStep = 1;

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
        const experience = window.Doke?.serviceFormExperience;
        if (!experience?.submit) return;
        experience.submit()
          .then(() => {
            submitState.hidden = false;
            submitState.classList.add('is-visible');
            submitState?.querySelector('a, button')?.focus({ preventScroll: true });
          })
          .catch((error) => {
            window.dispatchEvent(new CustomEvent('doke:service-submit-error', { detail: { error } }));
          });
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
      } else {
        const back = window.Doke?.navigation?.back;
        if (typeof back !== 'function') throw new Error('Doke navigation lifecycle is unavailable.');
        back('perfil.html?mode=owner&panel=services', { source: 'anunciar-servico-back' });
      }
    });

    updateCount();
    updateReview();
    setStep(Number(window.Doke?.serviceFormExperience?.restoredStep || 1));
  };

  const getGuardSurface = () => {
    const root = document.querySelector('[data-post-service-page]');
    if (!root) return null;
    return {
      root,
      skeleton: root.querySelector('[data-post-service-guard-skeleton]'),
      ready: [...root.querySelectorAll('[data-post-service-guard-ready]')],
      error: root.querySelector('[data-post-service-guard-error]'),
      errorMessage: root.querySelector('[data-post-service-guard-error-message]'),
      retry: root.querySelector('[data-post-service-guard-retry]')
    };
  };

  const setGuardSurface = (state, error) => {
    const surface = getGuardSurface();
    if (!surface) return;
    const pending = state === 'pending' || state === 'redirecting';
    const allowed = state === 'allowed';
    const failed = state === 'error';

    surface.root.dataset.viewState = pending ? 'loading' : failed ? 'error' : 'ready';
    surface.root.setAttribute('aria-busy', pending ? 'true' : 'false');
    if (surface.skeleton) {
      surface.skeleton.hidden = !pending;
      surface.skeleton.setAttribute('aria-hidden', pending ? 'false' : 'true');
    }
    surface.ready.forEach((node) => {
      node.hidden = !allowed;
      node.setAttribute('aria-hidden', allowed ? 'false' : 'true');
    });
    if (surface.error) {
      surface.error.hidden = !failed;
      surface.error.setAttribute('aria-hidden', failed ? 'false' : 'true');
    }
    if (failed && surface.errorMessage) {
      surface.errorMessage.textContent = error?.message || 'Tente novamente. Se o problema continuar, retorne ao seu perfil.';
    }
    if (failed) surface.error?.focus({ preventScroll: true });
  };

  const denyWhenGuardUnavailable = (error) => {
    document.documentElement.dataset.professionalAccessState = 'denied';
    const lifecycle = window.DokeNavigationLifecycle;
    const guardId = lifecycle?.guard?.begin({ name: 'publish-service', source: 'anunciar-servico' });
    lifecycle?.guard?.fail(guardId, error || new Error('Serviço de acesso profissional indisponível.'), {
      source: 'anunciar-servico'
    });
    setGuardSurface('error', error);
  };

  const initPostService = () => {
    const access = window.Doke?.services?.professionalAccess;
    const action = access?.ACTIONS?.PUBLISH_SERVICE || 'publish_service';
    setGuardSurface('pending');

    if (!access?.guardPage) {
      denyWhenGuardUnavailable();
      return;
    }

    access.guardPage(action, {
      hardRedirect: true,
      guardName: 'publish-service',
      source: 'anunciar-servico',
      fallbackUrl: 'meu-perfil.html'
    }).then((result) => {
      if (!result?.allowed) {
        setGuardSurface('redirecting');
        return;
      }
      setGuardSurface('allowed');
      mountPostService();
      window.DokeNavigationLifecycle?.page?.ready({
        page: 'anunciar-servico',
        source: 'professional-access-guard',
        hasItems: true
      });
    }).catch((error) => {
      denyWhenGuardUnavailable(error);
    });
  };

  const bindGuardRetry = () => {
    const retry = document.querySelector('[data-post-service-guard-retry]');
    if (!retry || retry.dataset.bound === 'true') return;
    retry.dataset.bound = 'true';
    retry.addEventListener('click', initPostService);
  };

  window.DokeInitPostService = initPostService;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { bindGuardRetry(); initPostService(); }, { once: true });
  } else {
    bindGuardRetry();
    initPostService();
  }
})();
