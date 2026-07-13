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

  const getService = () => Doke.services?.professionalApplications || null;

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

    form.querySelectorAll('[data-application-field]').forEach((control) => {
      const field = control.dataset.applicationField;
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

  const hydrate = (form, application) => {
    if (!form || !application) return application;
    const fields = application.payload || {};

    Object.entries(fields).forEach(([name, value]) => {
      const toggle = form.querySelector(`[data-application-field="${CSS.escape(name)}"]`);
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

    return application;
  };

  const load = () => {
    const service = getService();
    if (!service?.getCurrentApplication) return Promise.resolve(null);
    return service.getCurrentApplication();
  };

  const save = (form, step) => {
    const service = getService();
    if (!service?.saveDraft || !form) return Promise.resolve(null);
    const draft = serialize(form, step);
    return service.saveDraft(draft);
  };

  const validateStep = (form, step) => {
    const service = getService();
    if (!service?.validateStep) throw new Error('Validação da candidatura indisponível.');
    return service.validateStep(serialize(form, step).payload, step);
  };

  const submit = (form, step, preparedDraft) => mutations.run('professional-application-submit', async () => {
    const service = getService();
    if (!service?.submit) throw new Error('O envio da candidatura profissional não está disponível.');
    setState('submitting');

    try {
      const application = await service.submit(preparedDraft || serialize(form, step));
      core.invalidate({
        domains: ['profiles', 'admin'],
        reason: 'professional-application-submitted'
      });
      setState('success', { applicationId: application?.id || '' });
      return application;
    } catch (error) {
      setState(navigator.onLine === false ? 'offline' : 'error', { error });
      throw error;
    }
  });

  const reopen = () => {
    const service = getService();
    if (!service?.reopenRejected) return Promise.reject(new Error('Não foi possível reabrir a candidatura.'));
    return service.reopenRejected();
  };

  const getPresentation = (status) => {
    const service = getService();
    return service?.getStatusPresentation?.(status) || {
      label: 'Candidatura',
      title: 'Acompanhe sua candidatura',
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
    submit,
    reopen,
    getPresentation
  });
})();
