/* Doke Flow State Tools
   Responsibility: opt-in developer helper for clearing/seeding local operational flow state.
   Activation: add ?devFlow=1, ?devFlow=reset or ?devFlow=seed to a supported page. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var params = new URLSearchParams(root.location.search || '');
  var command = params.get('devFlow') || '';
  var enabled = Boolean(command) || root.localStorage.getItem('doke.dev.flow.enabled') === 'true';

  if (!enabled) return;

  var STORAGE_KEYS = Object.freeze([
    'doke.orders.local.v1',
    'doke.orders',
    'doke.conversations.local.v1',
    'doke.messages.local.v1',
    'doke.notifications.local.v1',
    'doke.notifications',
    'doke.quoteSubmission'
  ]);

  function getBasePath() {
    return root.location.pathname.indexOf('/auth/') !== -1 ? '../' : '';
  }

  function readJson(key, fallback) {
    try {
      var raw = root.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    root.localStorage.setItem(key, JSON.stringify(value));
  }

  function reset(options) {
    options = options || {};
    STORAGE_KEYS.forEach(function (key) { root.localStorage.removeItem(key); });
    if (options.keepSession === false) root.localStorage.removeItem('doke.auth.session.v1');
    document.dispatchEvent(new CustomEvent('doke:flow-state-reset', { detail: { keepSession: options.keepSession !== false } }));
    return inspect();
  }

  function seed() {
    return fetch(getBasePath() + 'assets/data/dev-flow-seed.json', { cache: 'no-cache', credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Não foi possível carregar assets/data/dev-flow-seed.json.');
        return response.json();
      })
      .then(function (payload) {
        writeJson('doke.orders.local.v1', payload.orders || []);
        writeJson('doke.orders', payload.orders || []);
        writeJson('doke.conversations.local.v1', payload.conversations || []);
        writeJson('doke.messages.local.v1', payload.conversations || []);
        writeJson('doke.notifications.local.v1', payload.notifications || []);
        writeJson('doke.notifications', payload.notifications || []);
        document.dispatchEvent(new CustomEvent('doke:flow-state-seeded', { detail: { seed: payload } }));
        return inspect();
      });
  }

  function inspect() {
    var snapshot = {
      orders: readJson('doke.orders.local.v1', []).length,
      conversations: readJson('doke.conversations.local.v1', []).length,
      notifications: readJson('doke.notifications.local.v1', []).length,
      hasSession: Boolean(readJson('doke.auth.session.v1', null))
    };
    console.info('[DokeFlowDev]', snapshot);
    return snapshot;
  }

  function enable() {
    root.localStorage.setItem('doke.dev.flow.enabled', 'true');
    return inspect();
  }

  function disable() {
    root.localStorage.removeItem('doke.dev.flow.enabled');
    return inspect();
  }

  Doke.flowDev = Object.freeze({
    keys: STORAGE_KEYS,
    reset: reset,
    seed: seed,
    inspect: inspect,
    enable: enable,
    disable: disable
  });

  root.DokeFlowDev = Doke.flowDev;

  if (command === 'reset') reset();
  else if (command === 'seed') seed().catch(function (error) { console.warn('[DokeFlowDev:seed]', error); });
  else inspect();
})();
