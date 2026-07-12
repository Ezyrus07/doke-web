(() => {
  'use strict';

  const root = document.querySelector('[data-post-service-page]');
  const form = root?.querySelector('.post-service-form');
  if (!root || !form) return;

  const STORAGE_PREFIX = 'doke.service-draft.v1';
  const MAX_AGE = 24 * 60 * 60 * 1000;
  const experience = window.Doke?.experience;
  let saveTimer = 0;

  const getUserId = () => {
    const session = window.Doke?.session?.getCurrentUser?.() || window.Doke?.auth?.getCurrentUser?.() || null;
    return String(session?.id || session?.userId || 'anonymous');
  };

  const key = () => `${STORAGE_PREFIX}:${getUserId()}`;

  const setState = (state, detail = '') => {
    root.dataset.viewState = state;
    root.dataset.stateBoundary = root.dataset.stateBoundary || 'anunciar-servico';
    document.body.dataset.serviceFormExperienceState = state;
    if (detail) root.dataset.stateDetail = detail;
    else delete root.dataset.stateDetail;
    experience?.states?.set?.(root, state, { detail });
  };

  const serialize = () => {
    const values = {};
    new FormData(form).forEach((value, name) => {
      if (value instanceof File) return;
      values[name] = value;
    });

    const checks = [...root.querySelectorAll('[data-post-check]')].map((button, index) => ({
      index,
      value: button.dataset.value || '',
      active: button.classList.contains('is-active')
    }));

    const step = Number(root.dataset.currentStep || 1) || 1;
    return { values, checks, step, savedAt: Date.now() };
  };

  const save = () => {
    try {
      localStorage.setItem(key(), JSON.stringify(serialize()));
    } catch (error) {
      // Draft persistence is best-effort and must not block the form.
    }
  };

  const scheduleSave = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(save, 180);
  };

  const restore = () => {
    try {
      const raw = localStorage.getItem(key());
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (!draft?.savedAt || Date.now() - draft.savedAt > MAX_AGE) {
        localStorage.removeItem(key());
        return null;
      }

      Object.entries(draft.values || {}).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);
        if (!field || field instanceof RadioNodeList || field.type === 'file') return;
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });

      (draft.checks || []).forEach((entry) => {
        const button = [...root.querySelectorAll('[data-post-check]')][entry.index];
        if (!button) return;
        button.classList.toggle('is-active', Boolean(entry.active));
        button.setAttribute('aria-pressed', entry.active ? 'true' : 'false');
      });

      return draft;
    } catch (error) {
      return null;
    }
  };

  const clear = () => {
    try { localStorage.removeItem(key()); } catch (error) {}
  };

  const createPayload = () => {
    const data = new FormData(form);
    const currentUser = window.Doke?.session?.getCurrentUser?.() || null;
    const id = `service_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const selectedChecks = [...root.querySelectorAll('[data-post-check].is-active')]
      .map((button) => button.dataset.value)
      .filter(Boolean);

    return {
      id,
      title: String(data.get('adTitle') || '').trim(),
      category: String(data.get('category') || '').trim(),
      specialty: String(data.get('specialty') || '').trim(),
      description: String(data.get('fullDescription') || '').trim(),
      shortDescription: String(data.get('shortDescription') || '').trim(),
      priceType: String(data.get('priceType') || '').trim(),
      priceLabel: String(data.get('initialPrice') || '').trim(),
      billingUnit: String(data.get('billingUnit') || '').trim(),
      location: String(data.get('serviceRegion') || '').trim(),
      serviceMode: String(data.get('serviceMode') || '').trim(),
      availability: String(data.get('availability') || '').trim(),
      responseTime: String(data.get('responseTime') || '').trim(),
      initialAssessment: String(data.get('initialAssessment') || '').trim(),
      includedItems: String(data.get('includedItems') || '').trim(),
      excludedItems: String(data.get('excludedItems') || '').trim(),
      tags: selectedChecks,
      professionalId: String(currentUser?.id || currentUser?.userId || ''),
      providerId: String(currentUser?.id || currentUser?.userId || ''),
      providerName: String(currentUser?.name || currentUser?.displayName || 'Profissional Doke'),
      status: 'pending_review',
      createdAt: new Date().toISOString()
    };
  };

  const persist = async (payload) => {
    const serviceApi = window.Doke?.services?.services;
    if (typeof serviceApi?.create === 'function') return serviceApi.create(payload);
    const repository = window.Doke?.repositories?.services;
    if (typeof repository?.save === 'function') return repository.save(payload);
    throw new Error('A publicação de serviços ainda não está disponível nesta versão.');
  };

  const invalidate = () => {
    experience?.cache?.invalidatePrefix?.('marketplace:');
    experience?.cache?.invalidatePrefix?.('profile-professional:');
    ['index.html', 'resultados.html', 'perfil-profissional.html', 'perfil.html'].forEach((route) => {
      window.Doke?.stableShellRouter?.invalidate?.(route);
    });
    window.dispatchEvent(new CustomEvent('doke:service-created'));
  };

  const submit = async () => {
    if (root.dataset.submitting === 'true') return null;
    save();
    root.dataset.submitting = 'true';
    setState('submitting');
    const nextButton = root.querySelector('[data-step-next]');
    const previousLabel = nextButton?.textContent || '';
    if (nextButton) {
      nextButton.disabled = true;
      nextButton.setAttribute('aria-busy', 'true');
      nextButton.textContent = 'Enviando anúncio…';
    }

    try {
      const payload = createPayload();
      if (!payload.title || !payload.category || !payload.shortDescription) {
        throw new Error('Preencha título, categoria e descrição curta antes de enviar.');
      }
      const saved = await persist(payload);
      if (!saved?.id) throw new Error('O anúncio não foi confirmado pela fonte de dados.');
      clear();
      invalidate();
      setState('success');
      return saved;
    } catch (error) {
      save();
      setState(navigator.onLine ? 'error' : 'offline', error?.message || 'Falha ao enviar anúncio.');
      throw error;
    } finally {
      root.dataset.submitting = 'false';
      if (nextButton) {
        nextButton.disabled = false;
        nextButton.removeAttribute('aria-busy');
        nextButton.textContent = previousLabel;
      }
    }
  };

  form.addEventListener('input', scheduleSave);
  form.addEventListener('change', scheduleSave);
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-post-check], [data-segment], [data-step-target], [data-step-next], [data-step-back]')) scheduleSave();
  });
  window.addEventListener('beforeunload', save);

  const draft = restore();
  setState('ready');

  window.Doke = window.Doke || {};
  window.Doke.serviceFormExperience = Object.freeze({
    submit,
    saveDraft: save,
    clearDraft: clear,
    getDraft: serialize,
    restoredStep: Number(draft?.step || 1) || 1
  });
})();
