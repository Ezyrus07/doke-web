(() => {
  'use strict';
  const Doke = window.Doke || (window.Doke = {});
  const core = Doke.formExperienceCore;
  if (!core) return;
  const boundary = document.querySelector('[data-state-boundary="tornar-profissional"], [data-become-pro-page]');
  const setState = core.createStateController({ boundary, bodyDatasetKey: 'professionalOnboardingExperienceState' });
  const store = core.createDraftStore({ prefix: 'doke.professional-onboarding-draft.v1' });
  const mutations = core.createMutationGuard();

  const serialize = (form, step) => {
    const fields = {};
    new FormData(form).forEach((value, key) => {
      if (value instanceof File) {
        if (value.name) fields[key] = { fileName: value.name, size: value.size, type: value.type };
        return;
      }
      fields[key] = fields[key] !== undefined ? (Array.isArray(fields[key]) ? [...fields[key], value] : [fields[key], value]) : value;
    });
    form.querySelectorAll('.become-pro-toggle').forEach((button, index) => { fields[`__toggle_${index}`] = button.getAttribute('aria-pressed') === 'true'; });
    return { step, fields };
  };
  const save = (form, step) => { if (!form) return null; try { return store.write(serialize(form, step)); } catch (_) { return null; } };
  const restore = (form) => {
    if (!form) return null;
    const parsed = store.read();
    if (!parsed) return null;
    Object.entries(parsed.fields || {}).forEach(([name, value]) => {
      if (name.startsWith('__toggle_')) {
        const button = form.querySelectorAll('.become-pro-toggle')[Number(name.replace('__toggle_', ''))];
        if (button) { button.classList.toggle('is-active', Boolean(value)); button.setAttribute('aria-pressed', value ? 'true' : 'false'); }
        return;
      }
      if (value && typeof value === 'object' && value.fileName) return;
      form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach((control) => {
        if (control.type === 'file') return;
        if (control.type === 'radio' || control.type === 'checkbox') {
          const values = Array.isArray(value) ? value.map(String) : [String(value)];
          control.checked = values.includes(String(control.value)) || value === true || value === 'on';
        } else control.value = Array.isArray(value) ? value[0] : value;
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    return parsed;
  };
  const resolveSubmitter = () => {
    if (typeof Doke.services?.profile?.submitProfessionalApplication === 'function') return (payload) => Doke.services.profile.submitProfessionalApplication(payload);
    if (typeof Doke.services?.profile?.requestProfessionalProfile === 'function') return (payload) => Doke.services.profile.requestProfessionalProfile(payload);
    if (typeof Doke.repositories?.profile?.submitProfessionalApplication === 'function') return (payload) => Doke.repositories.profile.submitProfessionalApplication(payload);
    return null;
  };
  const submit = (form, step) => mutations.run('professional-onboarding-submit', async () => {
    save(form, step);
    const submitter = resolveSubmitter();
    if (!submitter) throw new Error('O envio do cadastro profissional ainda não está disponível neste ambiente.');
    setState('submitting');
    try {
      const draft = serialize(form, step);
      const payload = { ...draft.fields, userId: core.currentUserId(), status: 'pending_review' };
      const result = await submitter(payload);
      const id = result?.id || result?.applicationId || result?.requestId;
      if (!id) throw new Error('O cadastro não foi confirmado pela fonte de dados.');
      store.clear();
      core.invalidate({ domains: ['profiles', 'admin'], reason: 'professional-application-submitted' });
      window.dispatchEvent(new CustomEvent('doke:professional-application-submitted', { detail: { id, payload } }));
      setState('success', { id }); return result;
    } catch (error) { setState(navigator.onLine === false ? 'offline' : 'error', { error }); throw error; }
  });
  Doke.professionalOnboardingExperience = { getKey: store.key, setState, save, restore, clear: store.clear, submit };
})();
