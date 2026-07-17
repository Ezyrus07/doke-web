(() => {
  'use strict';

  const instances = new WeakMap();
  const DAY_LABELS = Object.freeze({
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo'
  });

  const initServiceForm = () => {
    const Doke = window.Doke || (window.Doke = {});
    const core = Doke.formExperienceCore;
    const root = document.querySelector('[data-post-service-page]');
    const form = root?.querySelector('.post-service-form');
    if (!core || !root || !form) return null;
    if (instances.has(root)) return instances.get(root);

    const setState = core.createStateController({ boundary: root, bodyDatasetKey: 'serviceFormExperienceState' });
    const store = core.createDraftStore({ prefix: 'doke.service-draft.v2' });
    const mutations = core.createMutationGuard();
    let publishCompleted = false;

    const serialize = () => {
      const values = {};
      [...form.elements].forEach((field) => {
        if (!field.name || field.type === 'file') return;
        if (field.type === 'checkbox') {
          if (!Array.isArray(values[field.name])) values[field.name] = [];
          if (field.checked) values[field.name].push(field.value);
          return;
        }
        if (field.type === 'radio') {
          if (field.checked) values[field.name] = field.value;
          return;
        }
        values[field.name] = field.value;
      });
      return {
        values,
        checks: [...root.querySelectorAll('[data-post-check]')].map((button, index) => ({ index, active: button.classList.contains('is-active') })),
        step: Number(root.dataset.currentStep || 1) || 1
      };
    };

    const save = () => {
      if (publishCompleted) return null;
      try { return store.write(serialize()); } catch (_) { return null; }
    };

    const syncAvailabilityRow = (checkbox) => {
      const row = checkbox?.closest('[data-availability-row]');
      if (!row) return;
      row.classList.toggle('is-active', checkbox.checked);
      row.querySelectorAll('[data-availability-time]').forEach((input) => {
        input.disabled = !checkbox.checked;
      });
    };

    const syncPriceMode = () => {
      const priceType = form.elements.namedItem('priceType')?.value || 'A partir de';
      const quoteOnly = priceType === 'Sob orçamento';
      const price = form.elements.namedItem('initialPrice');
      const billing = form.elements.namedItem('billingUnit');
      if (price) {
        price.disabled = quoteOnly;
        price.required = !quoteOnly;
        if (quoteOnly) price.value = '';
      }
      if (billing) {
        billing.disabled = quoteOnly;
        billing.required = !quoteOnly;
        if (quoteOnly) billing.value = '';
      }
      root.querySelectorAll('[data-price-dependent]').forEach((field) => {
        field.classList.toggle('is-disabled', quoteOnly);
      });
      root.dataset.priceMode = quoteOnly ? 'quote' : 'priced';
    };

    const applyAvailabilityTemplate = (mode) => {
      const start = root.querySelector('[data-availability-template-start]')?.value || '08:00';
      const end = root.querySelector('[data-availability-template-end]')?.value || '18:00';
      if (!start || !end || start >= end) throw new Error('Revise o intervalo padrão da disponibilidade.');
      const weekdays = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      root.querySelectorAll('[data-availability-day]').forEach((checkbox) => {
        const shouldApply = mode === 'all' || weekdays.has(checkbox.value);
        if (!shouldApply) return;
        checkbox.checked = true;
        const row = checkbox.closest('[data-availability-row]');
        const times = row ? [...row.querySelectorAll('[data-availability-time]')] : [];
        if (times[0]) times[0].value = start;
        if (times[1]) times[1].value = end;
        syncAvailabilityRow(checkbox);
      });
      store.schedule(serialize, 0);
      window.dispatchEvent(new CustomEvent('doke:service-availability-applied', { detail: { mode, start, end } }));
    };

    const restore = () => {
      const draft = store.read();
      if (!draft) return null;
      Object.entries(draft.values || {}).forEach(([name, value]) => {
        const fields = [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];
        if (!fields.length) return;
        fields.forEach((field) => {
          if (field.type === 'file') return;
          if (field.type === 'checkbox') {
            field.checked = Array.isArray(value) && value.includes(field.value);
            syncAvailabilityRow(field);
          } else if (field.type === 'radio') {
            field.checked = String(value) === String(field.value);
          } else {
            field.value = value;
          }
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
      (draft.checks || []).forEach((entry) => {
        const button = [...root.querySelectorAll('[data-post-check]')][entry.index];
        if (!button) return;
        button.classList.toggle('is-active', Boolean(entry.active));
        button.setAttribute('aria-pressed', entry.active ? 'true' : 'false');
      });
      return draft;
    };

    const collectAvailability = () => [...form.querySelectorAll('[data-availability-day]:checked')].map((checkbox) => {
      const day = checkbox.value;
      const start = form.elements.namedItem(`availabilityStart_${day}`)?.value || '';
      const end = form.elements.namedItem(`availabilityEnd_${day}`)?.value || '';
      return { day, label: DAY_LABELS[day] || day, start, end };
    });

    const createPayload = () => {
      const data = new FormData(form);
      const currentUser = Doke.session?.getCurrentUser?.() || null;
      const selectedChecks = [...root.querySelectorAll('[data-post-check].is-active[data-value]')]
        .map((button) => button.dataset.value)
        .filter(Boolean);
      const availabilitySchedule = collectAvailability();
      return {
        id: `service_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: core.normalize(data.get('adTitle')),
        category: core.normalize(data.get('category')),
        specialty: core.normalize(data.get('specialty')),
        description: core.normalize(data.get('fullDescription')),
        shortDescription: core.normalize(data.get('shortDescription')),
        priceType: core.normalize(data.get('priceType')),
        priceLabel: core.normalize(data.get('priceType')) === 'Sob orçamento' ? '' : core.normalize(data.get('initialPrice')),
        billingUnit: core.normalize(data.get('priceType')) === 'Sob orçamento' ? '' : core.normalize(data.get('billingUnit')),
        location: core.normalize(data.get('serviceRegion')),
        serviceRegion: core.normalize(data.get('serviceRegion')),
        serviceMode: core.normalize(data.get('serviceMode')),
        availabilitySchedule,
        availability: availabilitySchedule.map((item) => `${item.label} ${item.start}–${item.end}`).join('; '),
        includedItems: core.normalize(data.get('includedItems')),
        excludedItems: core.normalize(data.get('excludedItems')),
        tags: selectedChecks,
        professionalId: core.normalize(currentUser?.id || currentUser?.userId),
        providerId: core.normalize(currentUser?.id || currentUser?.userId),
        providerName: core.normalize(currentUser?.name || currentUser?.displayName) || 'Profissional Doke',
        status: 'active',
        createdAt: new Date().toISOString()
      };
    };

    const prepareImage = (file) => {
      if (!file) return Promise.resolve('');
      if (!/^image\/(?:png|jpeg|webp|gif)$/i.test(String(file.type || ''))) return Promise.reject(new Error('Use imagens PNG, JPG, WEBP ou GIF.'));
      if (Number(file.size || 0) > 420 * 1024) return Promise.reject(new Error('Cada imagem deve ter no máximo 420 KB no modo local.'));
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(String(reader.result || '')), { once: true });
        reader.addEventListener('error', () => reject(new Error('Não foi possível ler uma das imagens.')), { once: true });
        reader.readAsDataURL(file);
      });
    };

    const attachImages = async (payload) => {
      const main = form.elements.namedItem('mainImage')?.files?.[0] || null;
      const extraOne = form.elements.namedItem('extraImageOne')?.files?.[0] || null;
      const extraTwo = form.elements.namedItem('extraImageTwo')?.files?.[0] || null;
      const images = (await Promise.all([prepareImage(main), prepareImage(extraOne), prepareImage(extraTwo)])).filter(Boolean);
      return Object.assign(payload, { image: images[0] || '', images });
    };

    const persist = async (payload) => {
      if (typeof Doke.services?.services?.create === 'function') return Doke.services.services.create(payload);
      throw new Error('A publicação de serviços ainda não está disponível nesta versão.');
    };

    const reset = () => {
      publishCompleted = true;
      store.clear();
      form.reset();
      root.querySelectorAll('[data-availability-day]').forEach((checkbox) => syncAvailabilityRow(checkbox));
      root.querySelectorAll('[data-post-check]').forEach((button) => {
        const active = button.dataset.defaultActive === 'true';
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      root.querySelectorAll('[data-segment]').forEach((button) => {
        const active = button.dataset.defaultActive === 'true';
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (active) {
          const input = root.querySelector(`input[name="${button.dataset.segment}"]`);
          if (input) input.value = button.dataset.value || button.textContent.trim();
        }
      });
      root.dataset.currentStep = '1';
      window.dispatchEvent(new CustomEvent('doke:service-form-reset', { detail: { root } }));
    };

    const submit = () => mutations.run('service-submit', async () => {
      save();
      setState('submitting');
      try {
        const payload = await attachImages(createPayload());
        if (!payload.title || !payload.category || !payload.shortDescription) throw new Error('Preencha título, categoria e descrição curta antes de publicar.');
        if (!payload.location || !payload.serviceMode) throw new Error('Informe região e forma de atendimento.');
        if (payload.priceType !== 'Sob orçamento' && (!payload.priceLabel || !payload.billingUnit)) throw new Error('Informe o valor inicial e a unidade de cobrança.');
        if (!payload.availabilitySchedule.length) throw new Error('Selecione ao menos um dia e horário de disponibilidade.');
        const invalidTime = payload.availabilitySchedule.find((item) => !item.start || !item.end || item.start >= item.end);
        if (invalidTime) throw new Error(`Revise o horário de ${invalidTime.label}.`);
        const saved = await persist(payload);
        if (!saved?.id) throw new Error('O anúncio não foi confirmado pela fonte de dados.');
        reset();
        core.invalidate({ domains: ['marketplace', 'profiles'], reason: 'service-created' });
        window.dispatchEvent(new CustomEvent('doke:service-created', { detail: { service: saved } }));
        setState('success');
        return saved;
      } catch (error) {
        publishCompleted = false;
        save();
        setState(navigator.onLine ? 'error' : 'offline', { error });
        throw error;
      }
    });

    form.addEventListener('input', () => store.schedule(serialize, 180));
    form.addEventListener('change', (event) => {
      if (event.target.matches('[data-availability-day]')) syncAvailabilityRow(event.target);
      if (event.target.matches('[name="priceType"]')) syncPriceMode();
      store.schedule(serialize, 180);
    });
    root.addEventListener('click', (event) => {
      const applyButton = event.target.closest('[data-availability-apply]');
      if (applyButton) {
        try { applyAvailabilityTemplate(applyButton.dataset.availabilityApply); }
        catch (error) { window.dispatchEvent(new CustomEvent('doke:service-submit-error', { detail: { error } })); }
      }
      if (event.target.closest('[data-post-check], [data-segment], [data-step-target], [data-step-next], [data-step-back]')) store.schedule(serialize, 180);
      if (event.target.closest('[data-segment="priceType"]')) window.setTimeout(syncPriceMode, 0);
    });
    window.addEventListener('beforeunload', save);

    root.querySelectorAll('[data-availability-day]').forEach((checkbox) => syncAvailabilityRow(checkbox));
    const draft = restore();
    syncPriceMode();
    setState('ready');
    const api = Object.freeze({
      submit,
      saveDraft: save,
      clearDraft: store.clear,
      reset,
      getDraft: serialize,
      getAvailability: collectAvailability,
      restoredStep: Number(draft?.step || 1) || 1
    });
    instances.set(root, api);
    Doke.serviceFormExperience = api;
    return api;
  };

  window.DokeInitServiceForm = initServiceForm;
})();
