(() => {
  'use strict';

  const DRAFT_VERSION = 1;
  const DEFAULT_STALE_TIME = 24 * 60 * 60 * 1000;
  const SAVE_DELAY = 280;

  const normalize = (value) => String(value || '').trim();
  const safeParse = (value, fallback = null) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const resolveUserId = () => {
    const session = window.DokeAuth?.service?.getCurrentUser?.()
      || window.Doke?.session?.getCurrentUser?.()
      || safeParse(window.localStorage.getItem('doke.auth.session'), null)
      || safeParse(window.localStorage.getItem('doke.currentUser'), null);
    return normalize(session?.id || session?.userId || session?.uid || 'guest');
  };

  const resolveContext = (root) => {
    const query = new URLSearchParams(window.location.search);
    return normalize(
      query.get('serviceId')
      || query.get('id')
      || query.get('servico')
      || root?.dataset?.budgetService
      || 'generic'
    );
  };

  const getKey = (root) => `doke.budget-draft.v${DRAFT_VERSION}:${resolveUserId()}:${resolveContext(root)}`;

  const setState = (root, state, meta = {}) => {
    if (!root) return;
    root.dataset.viewState = state;
    root.setAttribute('aria-busy', state === 'loading' || state === 'submitting' ? 'true' : 'false');
    document.body.dataset.budgetExperienceState = state;
    window.Doke?.experience?.states?.set?.(root, state, meta);
  };

  const serializeForm = (form) => {
    const fields = {};
    const data = new FormData(form);
    for (const [name, value] of data.entries()) {
      if (value instanceof File) continue;
      if (Object.prototype.hasOwnProperty.call(fields, name)) {
        fields[name] = Array.isArray(fields[name]) ? [...fields[name], value] : [fields[name], value];
      } else {
        fields[name] = value;
      }
    }

    form.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach((input) => {
      if (!input.name) return;
      if (input.type === 'checkbox') fields[`__checked:${input.name}`] = input.checked;
    });

    return fields;
  };

  const applyFields = (form, fields) => {
    if (!fields || typeof fields !== 'object') return;

    Object.entries(fields).forEach(([name, value]) => {
      if (name.startsWith('__checked:')) {
        const fieldName = name.slice('__checked:'.length);
        form.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(fieldName)}"]`).forEach((input) => {
          input.checked = Boolean(value);
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        return;
      }

      const controls = [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];
      controls.forEach((control) => {
        if (control.type === 'file') return;
        if (control.type === 'radio') {
          control.checked = String(control.value) === String(value);
        } else if (control.type === 'checkbox') {
          control.checked = Array.isArray(value)
            ? value.map(String).includes(String(control.value))
            : Boolean(value);
        } else {
          control.value = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
        }
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  };

  const create = ({ root, form }) => {
    if (!root || !form) return null;
    const storageKey = getKey(root);
    let timer = 0;
    let currentStep = 0;
    let destroyed = false;

    const read = () => {
      const parsed = safeParse(window.localStorage.getItem(storageKey), null);
      if (!parsed || parsed.version !== DRAFT_VERSION || !parsed.fields) return null;
      if (Date.now() - Number(parsed.updatedAt || 0) > DEFAULT_STALE_TIME) {
        window.localStorage.removeItem(storageKey);
        return null;
      }
      return parsed;
    };

    const persist = () => {
      if (destroyed || form.dataset.submitState === 'loading') return false;
      const draft = {
        version: DRAFT_VERSION,
        userId: resolveUserId(),
        context: resolveContext(root),
        step: currentStep,
        fields: serializeForm(form),
        updatedAt: Date.now()
      };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(draft));
        root.dataset.draftState = 'saved';
        window.dispatchEvent(new CustomEvent('doke:budget-draft-saved', { detail: { storageKey, draft } }));
        return true;
      } catch {
        root.dataset.draftState = 'error';
        return false;
      }
    };

    const schedule = () => {
      window.clearTimeout(timer);
      root.dataset.draftState = 'saving';
      timer = window.setTimeout(persist, SAVE_DELAY);
    };

    const restore = () => {
      const draft = read();
      if (!draft) {
        setState(root, 'ready');
        return { restored: false, step: 0 };
      }
      applyFields(form, draft.fields);
      currentStep = Math.max(0, Number(draft.step || 0));
      root.dataset.draftState = 'restored';
      setState(root, 'ready', { restoredDraft: true });
      window.dispatchEvent(new CustomEvent('doke:budget-draft-restored', { detail: { storageKey, draft } }));
      return { restored: true, step: currentStep };
    };

    const clear = () => {
      window.clearTimeout(timer);
      window.localStorage.removeItem(storageKey);
      root.dataset.draftState = 'cleared';
      window.dispatchEvent(new CustomEvent('doke:budget-draft-cleared', { detail: { storageKey } }));
    };

    const setStep = (step) => {
      currentStep = Math.max(0, Number(step || 0));
      schedule();
    };

    const onInput = (event) => {
      if (event.target?.matches?.('input[type="file"]')) return;
      schedule();
    };

    form.addEventListener('input', onInput);
    form.addEventListener('change', onInput);
    window.addEventListener('pagehide', persist);

    return {
      storageKey,
      restore,
      saveNow: persist,
      schedule,
      clear,
      setStep,
      setState: (state, meta) => setState(root, state, meta),
      destroy() {
        destroyed = true;
        window.clearTimeout(timer);
        form.removeEventListener('input', onInput);
        form.removeEventListener('change', onInput);
        window.removeEventListener('pagehide', persist);
      }
    };
  };

  window.Doke = window.Doke || {};
  window.Doke.budgetFormExperience = { create, setState };
})();
