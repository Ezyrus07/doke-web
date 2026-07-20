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
    const params = new URLSearchParams(window.location.search || '');
    const editId = String(params.get('edit') || params.get('serviceId') || '').trim();
    const editMode = Boolean(editId && (params.get('mode') === 'edit' || params.has('edit')));
    const store = core.createDraftStore({ prefix: editMode ? `doke.service-edit.${editId}.v1` : 'doke.service-draft.v2' });
    const mutations = core.createMutationGuard();


    const existingMediaRoot = root.querySelector('[data-existing-service-media]');
    const existingMediaList = root.querySelector('[data-existing-service-media-list]');
    const existingMediaCount = root.querySelector('[data-existing-service-media-count]');

    const syncExistingImageDataset = () => {
      const primary = managedExistingImages[0] || '';
      if (primary) root.dataset.existingServiceImage = primary;
      else delete root.dataset.existingServiceImage;
      root.dataset.existingServiceImagesCount = String(managedExistingImages.length);
    };

    const renderExistingMedia = () => {
      syncExistingImageDataset();
      if (existingMediaRoot) existingMediaRoot.hidden = !editMode || !managedExistingImages.length;
      if (existingMediaCount) existingMediaCount.textContent = `${managedExistingImages.length} ${managedExistingImages.length === 1 ? 'imagem' : 'imagens'}`;
      if (!existingMediaList) return;
      existingMediaList.innerHTML = '';
      managedExistingImages.forEach((url, index) => {
        const item = document.createElement('article');
        item.className = 'post-service-existing-media__item';
        const image = document.createElement('img');
        image.className = 'post-service-existing-media__image';
        image.src = url;
        image.alt = index === 0 ? 'Imagem principal atual do anúncio' : `Imagem extra ${index} do anúncio`;
        const actions = document.createElement('div');
        actions.className = 'post-service-existing-media__actions';
        const label = document.createElement('span');
        label.className = 'post-service-existing-media__label';
        label.textContent = index === 0 ? 'Imagem principal' : `Imagem extra ${index}`;
        const buttons = document.createElement('div');
        buttons.className = 'post-service-existing-media__buttons';
        if (index > 0) {
          const primary = document.createElement('button');
          primary.type = 'button';
          primary.className = 'doke-btn doke-btn--ghost doke-btn--sm';
          primary.dataset.existingMediaPrimary = String(index);
          primary.textContent = 'Definir principal';
          buttons.appendChild(primary);
        }
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'doke-btn doke-btn--danger doke-btn--sm';
        remove.dataset.existingMediaRemove = String(index);
        remove.textContent = 'Remover';
        buttons.appendChild(remove);
        actions.appendChild(label);
        actions.appendChild(buttons);
        item.appendChild(image);
        item.appendChild(actions);
        existingMediaList.appendChild(item);
      });
      window.dispatchEvent(new CustomEvent('doke:service-media-changed', {
        detail: { images: managedExistingImages.slice(), primary: managedExistingImages[0] || '' }
      }));
    };
    let publishCompleted = false;
    let existingService = null;
    let managedExistingImages = [];
    let existingLoad = Promise.resolve(null);
    root.dataset.serviceEditMode = editMode ? 'true' : 'false';

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
        id: editMode ? editId : `service_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
        quoteTemplate: (() => {
          try {
            const parsed = JSON.parse(String(data.get('quoteTemplateJson') || '{}'));
            const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 10) : [];
            return { version: Number(parsed.version) || 1, status: questions.length ? 'active' : 'default', questions };
          } catch (_) { return { version: 1, status: 'default', questions: [] }; }
        })(),
        quoteQuestions: (() => {
          try { return (JSON.parse(String(data.get('quoteTemplateJson') || '{}')).questions || []).slice(0, 10); }
          catch (_) { return []; }
        })(),
        professionalId: core.normalize(currentUser?.id || currentUser?.userId),
        providerId: core.normalize(currentUser?.id || currentUser?.userId),
        providerName: core.normalize(currentUser?.name || currentUser?.displayName) || 'Profissional Doke',
        status: existingService?.status || 'active',
        createdAt: existingService?.createdAt || new Date().toISOString()
      };
    };

    const prepareImage = (file) => {
      if (!file) return Promise.resolve('');
      if (!/^image\/(?:png|jpeg|webp|gif)$/i.test(String(file.type || ''))) return Promise.reject(new Error('Use imagens PNG, JPG, WEBP ou GIF.'));
      if (Number(file.size || 0) > 5 * 1024 * 1024) return Promise.reject(new Error('Cada imagem deve ter no máximo 5 MB.'));
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(String(reader.result || '')), { once: true });
        reader.addEventListener('error', () => reject(new Error('Não foi possível ler uma das imagens.')), { once: true });
        reader.readAsDataURL(file);
      });
    };

    const attachImages = async (payload) => {
      const files = [
        form.elements.namedItem('mainImage')?.files?.[0] || null,
        form.elements.namedItem('extraImageOne')?.files?.[0] || null,
        form.elements.namedItem('extraImageTwo')?.files?.[0] || null
      ];
      const prepared = await Promise.all(files.map(prepareImage));
      const images = managedExistingImages.slice(0, 3);
      prepared.forEach((url, index) => {
        if (!url) return;
        images[index] = url;
      });
      const normalized = images.filter(Boolean).slice(0, 3);
      if (!normalized.length) throw new Error('Adicione pelo menos uma imagem ao anúncio.');
      return Object.assign(payload, { image: normalized[0], images: normalized });
    };

    const persist = async (payload) => {
      const service = Doke.services?.services;
      if (editMode) {
        if (typeof service?.updateOwned !== 'function') throw new Error('A edição de serviços não está disponível nesta versão.');
        return service.updateOwned(editId, payload);
      }
      if (typeof service?.create === 'function') return service.create(payload);
      throw new Error('A publicação de serviços ainda não está disponível nesta versão.');
    };

    const reset = () => {
      publishCompleted = true;
      store.clear();
      form.reset();
      existingService = null;
      managedExistingImages = [];
      renderExistingMedia();
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
        await existingLoad;
        window.DokeServiceQuoteTemplateBuilder?.validate?.();
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
        core.invalidate({ domains: ['marketplace', 'profiles'], reason: editMode ? 'service-updated' : 'service-created' });
        window.dispatchEvent(new CustomEvent(editMode ? 'doke:service-updated' : 'doke:service-created', { detail: { service: saved } }));
        setState('success');
        return saved;
      } catch (error) {
        publishCompleted = false;
        save();
        setState(navigator.onLine ? 'error' : 'offline', { error });
        throw error;
      }
    });

    const setNamedValue = (name, value) => {
      const fields = [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];
      fields.forEach((field) => {
        if (field.type === 'radio') field.checked = String(field.value) === String(value);
        else if (field.type !== 'file') field.value = value == null ? '' : String(value);
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
    };

    const populateExisting = (service) => {
      existingService = service;
      if (!service) throw new Error('Anúncio não encontrado.');
      const user = Doke.session?.getCurrentUser?.() || {};
      const ownerId = String(service.ownerId || service.professionalId || service.providerId || '');
      if (!user.id || ownerId !== String(user.id)) throw new Error('Você não pode editar este anúncio.');
      setNamedValue('adTitle', service.title);
      setNamedValue('category', service.category);
      setNamedValue('specialty', service.specialty);
      setNamedValue('shortDescription', service.shortDescription);
      setNamedValue('fullDescription', service.description);
      setNamedValue('priceType', service.priceType || (service.priceLabel ? 'A partir de' : 'Sob orçamento'));
      setNamedValue('initialPrice', service.priceLabel || service.priceValue || '');
      setNamedValue('billingUnit', service.billingUnit || '');
      setNamedValue('serviceRegion', service.serviceRegion || service.location || '');
      setNamedValue('serviceMode', service.serviceMode || '');
      setNamedValue('includedItems', service.includedItems || '');
      setNamedValue('excludedItems', service.excludedItems || '');
      const quoteTemplate = service.quoteTemplate || { version: service.quoteTemplateVersion || 1, questions: service.quoteQuestions || [] };
      setNamedValue('quoteTemplateJson', JSON.stringify(quoteTemplate));
      window.DokeServiceQuoteTemplateBuilder?.load?.(quoteTemplate);
      const selectedTags = new Set(Array.isArray(service.tags) ? service.tags : []);
      root.querySelectorAll('[data-post-check][data-value]').forEach((button) => {
        const active = selectedTags.has(button.dataset.value);
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      const availability = Array.isArray(service.availabilitySchedule) ? service.availabilitySchedule : [];
      root.querySelectorAll('[data-availability-day]').forEach((checkbox) => {
        const entry = availability.find((item) => item.day === checkbox.value);
        checkbox.checked = Boolean(entry);
        const row = checkbox.closest('[data-availability-row]');
        const times = row ? [...row.querySelectorAll('[data-availability-time]')] : [];
        if (entry && times[0]) times[0].value = entry.start || '';
        if (entry && times[1]) times[1].value = entry.end || '';
        syncAvailabilityRow(checkbox);
      });
      managedExistingImages = Array.isArray(service.images)
        ? service.images.filter(Boolean).slice(0, 3)
        : (service.image ? [service.image] : []);
      renderExistingMedia();
      syncPriceMode();
      window.dispatchEvent(new CustomEvent('doke:service-edit-loaded', { detail: { service, hasExistingImages: Boolean(managedExistingImages.length), images: managedExistingImages.slice() } }));
      return service;
    };

    if (editMode) {
      existingLoad = Promise.resolve().then(() => Doke.services?.services?.getById?.(editId)).then(populateExisting).catch((error) => {
        setState('error', { error });
        window.dispatchEvent(new CustomEvent('doke:service-edit-error', { detail: { error } }));
        throw error;
      });
    }

    form.addEventListener('input', () => store.schedule(serialize, 180));
    form.addEventListener('change', (event) => {
      if (event.target.matches('[data-availability-day]')) syncAvailabilityRow(event.target);
      if (event.target.matches('[name="priceType"]')) syncPriceMode();
      store.schedule(serialize, 180);
    });
    root.addEventListener('click', (event) => {
      const primaryButton = event.target.closest('[data-existing-media-primary]');
      if (primaryButton) {
        const index = Number(primaryButton.dataset.existingMediaPrimary);
        if (Number.isInteger(index) && index > 0 && managedExistingImages[index]) {
          const selected = managedExistingImages.splice(index, 1)[0];
          managedExistingImages.unshift(selected);
          renderExistingMedia();
        }
        return;
      }
      const removeButton = event.target.closest('[data-existing-media-remove]');
      if (removeButton) {
        const index = Number(removeButton.dataset.existingMediaRemove);
        if (Number.isInteger(index) && managedExistingImages[index]) {
          managedExistingImages.splice(index, 1);
          renderExistingMedia();
        }
        return;
      }
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
    const draft = editMode ? null : restore();
    syncPriceMode();
    renderExistingMedia();
    setState('ready');
    const api = Object.freeze({
      submit,
      saveDraft: save,
      clearDraft: store.clear,
      reset,
      getDraft: serialize,
      getAvailability: collectAvailability,
      getManagedImages: () => managedExistingImages.slice(),
      restoredStep: Number(draft?.step || 1) || 1,
      editMode,
      editId,
      ready: existingLoad
    });
    instances.set(root, api);
    Doke.serviceFormExperience = api;
    return api;
  };

  window.DokeInitServiceForm = initServiceForm;
})();
