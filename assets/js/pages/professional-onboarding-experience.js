(() => {
  'use strict';

  const Doke = window.Doke || (window.Doke = {});
  const core = Doke.formExperienceCore;
  if (!core) return;

  const boundary = document.querySelector('[data-state-boundary="tornar-profissional"], [data-become-pro-page]');
  const setState = core.createStateController({
    boundary,
    bodyDatasetKey: 'professionalOnboardingExperienceState'
  });
  const mutations = core.createMutationGuard();

  const getService = () => Doke.services?.professionalProfileSetup || null;

  const serialize = (form, step) => {
    const fields = {};

    new FormData(form).forEach((value, key) => {
      if (value instanceof File) {
        if (value.name) {
          fields[key] = {
            fileName: value.name,
            size: value.size,
            type: value.type
          };
        }
        return;
      }

      if (fields[key] === undefined) fields[key] = value;
      else if (Array.isArray(fields[key])) fields[key].push(value);
      else fields[key] = [fields[key], value];
    });

    form.querySelectorAll('input[type="file"][name]').forEach((control) => {
      if (fields[control.name] || !control.dataset.persistedFileName) return;
      fields[control.name] = {
        fileName: control.dataset.persistedFileName,
        size: Number(control.dataset.persistedFileSize || 0),
        type: control.dataset.persistedFileType || ''
      };
    });

    form.querySelectorAll('[data-profile-setup-field]').forEach((control) => {
      const field = control.dataset.profileSetupField;
      if (!field) return;
      fields[field] = control.getAttribute('aria-pressed') === 'true';
    });

    form.querySelectorAll('input[type="checkbox"][name]').forEach((control) => {
      fields[control.name] = control.checked;
    });

    return {
      currentStep: Number(step || 1),
      payload: fields
    };
  };

  const hydrate = (form, profile) => {
    if (!form || !profile) return profile;
    const fields = profile.payload || {};

    Object.entries(fields).forEach(([name, value]) => {
      const toggle = form.querySelector(`[data-profile-setup-field="${CSS.escape(name)}"]`);
      if (toggle) {
        const active = value === true || value === 'true' || value === 'on';
        toggle.classList.toggle('is-active', active);
        toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
        return;
      }

      form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach((control) => {
        if (control.type === 'file') {
          if (value?.fileName) {
            control.dataset.persistedFileName = value.fileName;
            control.dataset.persistedFileSize = String(value.size || 0);
            control.dataset.persistedFileType = value.type || '';
            const card = control.closest('.become-pro-upload-card');
            card?.classList.add('has-file');
            const label = card?.querySelector('[data-upload-label]');
            const action = card?.querySelector('[data-upload-action]');
            if (label) label.textContent = value.fileName;
            if (action) action.textContent = 'Trocar arquivo';
          }
          return;
        }

        if (control.type === 'radio') {
          control.checked = String(control.value) === String(value);
          return;
        }

        if (control.type === 'checkbox') {
          control.checked = value === true || value === 'true' || value === 'on';
          return;
        }

        control.value = Array.isArray(value) ? value[0] : (value ?? '');
      });
    });

    return profile;
  };

  const load = () => {
    const service = getService();
    if (!service?.getCurrentProfileSetup) return Promise.resolve(null);
    return service.getCurrentProfileSetup();
  };

  const save = (form, step) => {
    const service = getService();
    if (!service?.saveDraft || !form) return Promise.resolve(null);
    return service.saveDraft(serialize(form, step));
  };

  const validateStep = (form, step) => {
    const service = getService();
    if (!service?.validateStep) throw new Error('Validação do perfil profissional indisponível.');
    return service.validateStep(serialize(form, step).payload, step);
  };

  const complete = (form, step, preparedDraft) => mutations.run('professional-profile-setup-complete', async () => {
    const service = getService();
    if (!service?.complete) throw new Error('A criação do perfil profissional não está disponível.');
    setState('submitting');

    try {
      const profile = await service.complete(preparedDraft || serialize(form, step));
      core.invalidate({
        domains: ['profiles'],
        reason: 'professional-profile-created'
      });
      setState('success', { professionalProfileId: profile?.id || '' });
      return profile;
    } catch (error) {
      setState(navigator.onLine === false ? 'offline' : 'error', { error });
      throw error;
    }
  });

  const getPresentation = (status) => {
    const service = getService();
    return service?.getStatusPresentation?.(status) || {
      label: 'Perfil profissional',
      title: 'Acompanhe seu perfil profissional',
      description: 'Consulte o status antes de continuar.'
    };
  };

  Doke.professionalOnboardingExperience = Object.freeze({
    setState,
    serialize,
    hydrate,
    load,
    save,
    validateStep,
    complete,
    getPresentation
  });
})();
