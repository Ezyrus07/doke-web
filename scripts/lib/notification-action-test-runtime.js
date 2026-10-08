'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createRuntime(Doke, { registerThrows = false, accountStorage = true } = {}) {
  const values = new Map();
  function memory(data = new Map()) {
    return {
      get length() { return data.size; },
      key: (index) => Array.from(data.keys())[index] ?? null,
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: (key) => data.delete(key)
    };
  }
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-08-09T21:30:00-03:00'])); }
    static now() { return new Date('2026-08-09T21:30:00-03:00').getTime(); }
  }
  const window = { Doke, localStorage: memory(values), sessionStorage: memory() };
  const context = vm.createContext({
    window, Date: FixedDate,
    document: { dispatchEvent() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  });
  const run = (name) => vm.runInContext(fs.readFileSync(path.join(__dirname, '../../assets/js/core', name + '.js'), 'utf8'), context);
  if (accountStorage) {
    run('account-storage');
    if (registerThrows) Doke.accountStorage = { ...Doke.accountStorage, registerDomain() { throw new Error('registration unavailable'); } };
  }
  run('notification-action');
  return { window, values, api: Doke.notificationAction, reloadAction: () => run('notification-action') };
}

module.exports = { createRuntime };
