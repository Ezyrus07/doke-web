(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var listeners = new Map();
  var state = {
    bootstrapped: false,
    environment: 'local',
    auth: {
      status: 'anonymous',
      user: null,
      profile: null,
      role: 'guest',
      permissions: []
    },
    ui: {
      page: document.body ? document.body.getAttribute('data-page') || '' : '',
      viewport: window.matchMedia && window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop'
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function get(path) {
    if (!path) return clone(state);
    return path.split('.').reduce(function (acc, key) {
      return acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined;
    }, state);
  }

  function set(path, value) {
    if (!path) return;
    var keys = path.split('.');
    var cursor = state;
    keys.slice(0, -1).forEach(function (key) {
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
      cursor = cursor[key];
    });
    cursor[keys[keys.length - 1]] = value;
    emit(path, get(path));
    emit('*', clone(state));
  }

  function merge(path, value) {
    var current = get(path) || {};
    set(path, Object.assign({}, current, value));
  }

  function on(eventName, handler) {
    if (typeof handler !== 'function') return function () {};
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(handler);
    return function unsubscribe() {
      listeners.get(eventName).delete(handler);
    };
  }

  function emit(eventName, payload) {
    var group = listeners.get(eventName);
    if (!group) return;
    group.forEach(function (handler) {
      try { handler(payload); } catch (error) { console.error('[DokeState]', error); }
    });
  }

  function refreshViewport() {
    set('ui.viewport', window.matchMedia && window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'desktop');
  }

  window.addEventListener('resize', refreshViewport, { passive: true });

  Doke.state = { get: get, set: set, merge: merge, on: on, emit: emit };
})();
