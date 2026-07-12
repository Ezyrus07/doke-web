(() => {
  const root = window.Doke = window.Doke || {};
  const STORAGE_PREFIX = 'doke.professional-onboarding-draft.v1';
  const TTL = 24 * 60 * 60 * 1000;

  const getUserId = () => {
    try {
      return root.session?.getCurrentUser?.()?.id
        || root.services?.auth?.getCurrentUser?.()?.id
        || 'guest';
    } catch (_) {
      return 'guest';
    }
  };

  const getKey = () => `${STORAGE_PREFIX}:${getUserId()}`;

  const setState = (state, detail = {}) => {
    document.body.dataset.professionalOnboardingExperienceState = state;
    const boundary = document.querySelector('[data-state-boundary="tornar-profissional"], [data-become-pro-page]');
    if (boundary) {
      boundary.dataset.viewState = state;
      boundary.setAttribute('aria-busy', state === 'loading' || state === 'submitting' ? 'true' : 'false');
    }
    root.experience?.states?.set?.(boundary || document.body, state, detail);
  };

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

      if (fields[key] !== undefined) {
        fields[key] = Array.isArray(fields[key]) ? [...fields[key], value] : [fields[key], value];
      } else {
        fields[key] = value;
      }
    });

    form.querySelectorAll('.become-pro-toggle').forEach((button, index) => {
      fields[`__toggle_${index}`] = button.getAttribute('aria-pressed') === 'true';
    });

    return {
      version: 1,
      userId: getUserId(),
      step,
      fields,
      updatedAt: Date.now()
    };
  };

  const save = (form, step) => {
    if (!form) return;
    try {
      localStorage.setItem(getKey(), JSON.stringify(serialize(form, step)));
    } catch (_) {
      // Draft persistence must never block form interaction.
    }
  };

  const restore = (form) => {
    if (!form) return null;

    try {
      const parsed = JSON.parse(localStorage.getItem(getKey()) || 'null');
      if (!parsed || Date.now() - Number(parsed.updatedAt || 0) > TTL) {
        localStorage.removeItem(getKey());
        return null;
      }

      Object.entries(parsed.fields || {}).forEach(([name, value]) => {
        if (name.startsWith('__toggle_')) {
          const index = Number(name.replace('__toggle_', ''));
          const button = form.querySelectorAll('.become-pro-toggle')[index];
          if (button) {
            const active = Boolean(value);
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
          }
          return;
        }

        // Browsers do not allow restoring file inputs. Metadata remains only in the draft payload.
        if (value && typeof value === 'object' && value.fileName) return;

        const controls = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
        controls.forEach((control) => {
          if (control.type === 'file') return;

          if (control.type === 'radio' || control.type === 'checkbox') {
            const values = Array.isArray(value) ? value : [value];
            control.checked = values.includes(control.value) || value === true || value === 'on';
          } else {
            control.value = Array.isArray(value) ? value[0] : value;
          }

          control.dispatchEvent(new Event('input', { bubbles: true }));
          control.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });

      return parsed;
    } catch (_) {
      return null;
    }
  };

  const clear = () => {
    try {
      localStorage.removeItem(getKey());
    } catch (_) {
      // No-op: successful persistence remains authoritative.
    }
  };

  const resolveSubmitter = () => {
    const profile = root.services?.profile;
    if (typeof profile?.submitProfessionalApplication === 'function') {
      return (payload) => profile.submitProfessionalApplication(payload);
    }
    if (typeof profile?.requestProfessionalProfile === 'function') {
      return (payload) => profile.requestProfessionalProfile(payload);
    }
    if (typeof root.repositories?.profile?.submitProfessionalApplication === 'function') {
      return (payload) => root.repositories.profile.submitProfessionalApplication(payload);
    }
    return null;
  };

  const submit = async (form, step) => {
    save(form, step);

    const submitter = resolveSubmitter();
    if (!submitter) {
      throw new Error('O envio do cadastro profissional ainda não está disponível neste ambiente.');
    }

    const draft = serialize(form, step);
    const payload = {
      ...draft.fields,
      userId: draft.userId,
      status: 'pending_review'
    };
    const result = await submitter(payload);
    const id = result?.id || result?.applicationId || result?.requestId;

    if (!id) {
      throw new Error('O cadastro não foi confirmado pela fonte de dados.');
    }

    clear();
    root.experience?.cache?.invalidate?.('profile-owner:');
    root.experience?.cache?.invalidate?.('profile-professional:');
    root.stableShellRouter?.invalidate?.('meu-perfil.html');
    root.stableShellRouter?.invalidate?.('perfil-profissional.html');

    window.dispatchEvent(new CustomEvent('doke:professional-application-submitted', {
      detail: { id, payload }
    }));

    return result;
  };

  root.professionalOnboardingExperience = {
    getKey,
    setState,
    save,
    restore,
    clear,
    submit
  };
})();
