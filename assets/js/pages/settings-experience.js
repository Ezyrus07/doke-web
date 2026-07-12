/* Doke settings experience
   Responsibility: verified persistence, page state and unsaved-change tracking. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var boundary = document.querySelector('[data-state-boundary="configuracoes"]');
  var dirtySections = new Set();
  var activeWrites = new Map();

  function setState(state, detail) {
    if (document.body) document.body.dataset.settingsExperienceState = state;
    if (Doke.experience?.states?.set) {
      return Doke.experience.states.set(boundary, state, Object.assign({ domain: 'settings' }, detail || {}));
    }
    if (boundary) {
      boundary.dataset.viewState = state;
      boundary.dataset.experienceState = state;
      boundary.setAttribute('aria-busy', ['loading', 'refreshing', 'submitting'].includes(state) ? 'true' : 'false');
    }
    return state;
  }

  function setDirty(section, dirty) {
    var key = String(section || '').trim();
    if (!key) return dirtySections.size;
    if (dirty) dirtySections.add(key);
    else dirtySections.delete(key);
    document.body?.toggleAttribute('data-settings-has-unsaved-changes', dirtySections.size > 0);
    return dirtySections.size;
  }

  function persist(options) {
    options = options || {};
    var storageKey = String(options.storageKey || '');
    var section = String(options.section || 'all');
    if (!storageKey) return Promise.reject(new Error('Chave de armazenamento das configurações não informada.'));
    if (!options.settings || typeof options.settings !== 'object') return Promise.reject(new Error('Configurações inválidas para persistência.'));

    var mutationKey = storageKey + ':' + section;
    if (activeWrites.has(mutationKey)) return activeWrites.get(mutationKey);

    var serialized = JSON.stringify(options.settings);
    var task = Promise.resolve().then(function () {
      window.localStorage?.setItem(storageKey, serialized);
      var confirmed = window.localStorage?.getItem(storageKey);
      if (confirmed !== serialized) throw new Error('O navegador não confirmou o salvamento das configurações.');
      var parsed = JSON.parse(confirmed);
      document.dispatchEvent(new CustomEvent('doke:settings-persisted', { detail: { section: section } }));
      return parsed;
    }).finally(function () {
      activeWrites.delete(mutationKey);
      if (boundary?.dataset.experienceState === 'success') {
        window.setTimeout(function () { setState('ready'); }, 500);
      }
    });

    activeWrites.set(mutationKey, task);
    return task;
  }

  window.addEventListener('beforeunload', function (event) {
    if (!dirtySections.size) return;
    event.preventDefault();
    event.returnValue = '';
  });

  Doke.settingsExperience = Object.freeze({
    persist: persist,
    setState: setState,
    setDirty: setDirty,
    hasUnsavedChanges: function () { return dirtySections.size > 0; }
  });

  setState('loading');
})();
