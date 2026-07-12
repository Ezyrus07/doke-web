(() => {
  'use strict';
  const Doke = window.Doke || (window.Doke = {});
  const core = Doke.formExperienceCore;
  if (!core) return;

  const serializeForm = (form) => {
    const fields = {};
    new FormData(form).forEach((value, name) => {
      if (value instanceof File) return;
      if (fields[name] !== undefined) fields[name] = Array.isArray(fields[name]) ? [...fields[name], value] : [fields[name], value];
      else fields[name] = value;
    });
    form.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      if (input.name) fields[`__checked:${input.name}:${input.value}`] = input.checked;
    });
    return fields;
  };

  const applyFields = (form, fields = {}) => {
    Object.entries(fields).forEach(([name, value]) => {
      if (name.startsWith('__checked:')) {
        const [, fieldName, fieldValue] = name.split(':');
        const input = [...form.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(fieldName)}"]`)]
          .find((item) => String(item.value) === fieldValue);
        if (input) input.checked = Boolean(value);
        return;
      }
      form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach((control) => {
        if (control.type === 'file') return;
        if (control.type === 'radio') control.checked = String(control.value) === String(value);
        else if (control.type === 'checkbox') control.checked = Array.isArray(value) ? value.map(String).includes(String(control.value)) : Boolean(value);
        else control.value = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  };

  const create = ({ root, form }) => {
    if (!root || !form) return null;
    const query = new URLSearchParams(location.search);
    const store = core.createDraftStore({
      prefix: 'doke.budget-draft.v1',
      context: () => query.get('serviceId') || query.get('id') || root.dataset.budgetService || 'generic'
    });
    const setState = core.createStateController({ boundary: root, bodyDatasetKey: 'budgetExperienceState' });
    let step = 0;
    const snapshot = () => ({ step, fields: serializeForm(form) });
    const saveNow = () => { try { return store.write(snapshot()); } catch (_) { return null; } };
    const schedule = () => store.schedule(snapshot, 280);
    const restore = () => {
      const draft = store.read();
      if (!draft) { setState('ready'); return { restored: false, step: 0 }; }
      applyFields(form, draft.fields);
      step = Math.max(0, Number(draft.step || 0));
      setState('ready', { restoredDraft: true });
      return { restored: true, step };
    };
    const onChange = (event) => { if (!event.target?.matches?.('input[type="file"]')) schedule(); };
    form.addEventListener('input', onChange);
    form.addEventListener('change', onChange);
    window.addEventListener('pagehide', saveNow);
    return {
      storageKey: store.key(), restore, saveNow, schedule, clear: store.clear,
      setStep(value) { step = Math.max(0, Number(value || 0)); schedule(); },
      setState,
      destroy() { store.cancel(); form.removeEventListener('input', onChange); form.removeEventListener('change', onChange); window.removeEventListener('pagehide', saveNow); }
    };
  };

  Doke.budgetFormExperience = { create };
})();
