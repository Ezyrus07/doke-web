(() => {
  'use strict';
  const Doke = window.Doke || (window.Doke = {});
  const core = Doke.formExperienceCore;
  const root = document.querySelector('[data-post-service-page]');
  const form = root?.querySelector('.post-service-form');
  if (!core || !root || !form) return;

  const setState = core.createStateController({ boundary: root, bodyDatasetKey: 'serviceFormExperienceState' });
  const store = core.createDraftStore({ prefix: 'doke.service-draft.v1' });
  const mutations = core.createMutationGuard();

  const serialize = () => {
    const values = {};
    new FormData(form).forEach((value, name) => { if (!(value instanceof File)) values[name] = value; });
    return {
      values,
      checks: [...root.querySelectorAll('[data-post-check]')].map((button, index) => ({ index, active: button.classList.contains('is-active') })),
      step: Number(root.dataset.currentStep || 1) || 1
    };
  };
  const save = () => { try { return store.write(serialize()); } catch (_) { return null; } };
  const restore = () => {
    const draft = store.read();
    if (!draft) return null;
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
  };
  const createPayload = () => {
    const data = new FormData(form);
    const currentUser = Doke.session?.getCurrentUser?.() || null;
    const selectedChecks = [...root.querySelectorAll('[data-post-check].is-active')].map((button) => button.dataset.value).filter(Boolean);
    return {
      id: `service_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: core.normalize(data.get('adTitle')), category: core.normalize(data.get('category')), specialty: core.normalize(data.get('specialty')),
      description: core.normalize(data.get('fullDescription')), shortDescription: core.normalize(data.get('shortDescription')),
      priceType: core.normalize(data.get('priceType')), priceLabel: core.normalize(data.get('initialPrice')), billingUnit: core.normalize(data.get('billingUnit')),
      location: core.normalize(data.get('serviceRegion')), serviceMode: core.normalize(data.get('serviceMode')), availability: core.normalize(data.get('availability')),
      responseTime: core.normalize(data.get('responseTime')), initialAssessment: core.normalize(data.get('initialAssessment')),
      includedItems: core.normalize(data.get('includedItems')), excludedItems: core.normalize(data.get('excludedItems')), tags: selectedChecks,
      professionalId: core.normalize(currentUser?.id || currentUser?.userId), providerId: core.normalize(currentUser?.id || currentUser?.userId),
      providerName: core.normalize(currentUser?.name || currentUser?.displayName) || 'Profissional Doke', status: 'pending_review', createdAt: new Date().toISOString()
    };
  };
  const persist = async (payload) => {
    if (typeof Doke.services?.services?.create === 'function') return Doke.services.services.create(payload);
    throw new Error('A publicação de serviços ainda não está disponível nesta versão.');
  };
  const submit = () => mutations.run('service-submit', async () => {
    save(); setState('submitting');
    try {
      const payload = createPayload();
      if (!payload.title || !payload.category || !payload.shortDescription) throw new Error('Preencha título, categoria e descrição curta antes de enviar.');
      const saved = await persist(payload);
      if (!saved?.id) throw new Error('O anúncio não foi confirmado pela fonte de dados.');
      store.clear();
      core.invalidate({ domains: ['marketplace', 'profiles'], reason: 'service-created' });
      window.dispatchEvent(new CustomEvent('doke:service-created', { detail: { service: saved } }));
      setState('success'); return saved;
    } catch (error) { save(); setState(navigator.onLine ? 'error' : 'offline', { error }); throw error; }
  });

  form.addEventListener('input', () => store.schedule(serialize, 180));
  form.addEventListener('change', () => store.schedule(serialize, 180));
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-post-check], [data-segment], [data-step-target], [data-step-next], [data-step-back]')) store.schedule(serialize, 180);
  });
  window.addEventListener('beforeunload', save);
  const draft = restore(); setState('ready');
  Doke.serviceFormExperience = Object.freeze({ submit, saveDraft: save, clearDraft: store.clear, getDraft: serialize, restoredStep: Number(draft?.step || 1) || 1 });
})();
