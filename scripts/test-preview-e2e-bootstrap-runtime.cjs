'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
const unhandled = [];
process.on('unhandledRejection', error => unhandled.push(error));
function world() {
  const { window, document } = parseHTML('<html><head></head><body></body></html>');
  Object.defineProperty(document, 'readyState', { value: 'loading' });
  Object.defineProperty(document, 'visibilityState', { value: 'visible' });
  const intervals = new Map(), calls = { clients: 0, sdk: 0, network: 0, storage: 0, channels: 0 };
  let denied = true, asyncFailure = false, active = true, timer = 0;
  window.setTimeout = fn => setImmediate(fn);
  window.setInterval = fn => { intervals.set(++timer, fn); return timer; };
  window.clearInterval = id => intervals.delete(id);
  window.localStorage = { getItem() { calls.storage++; return null; }, setItem() { calls.storage++; }, removeItem() { calls.storage++; } };
  window.fetch = () => { calls.network++; throw Error('Unexpected network'); };
  const client = { auth: { getSession() { return asyncFailure ? Promise.reject(Error('SENSITIVE_SYNTHETIC_TOKEN')) : Promise.resolve({ data: { session: null } }); } }, channel() { calls.channels++; throw Error('Unexpected Realtime'); } };
  window.DokePreviewE2E = { isActive: () => active, allowed: () => false };
  window.DokeSupabase = { isPreviewE2E: () => active, requireCapability() { if (denied) { const e = Error('SENSITIVE_SYNTHETIC_TOKEN'); e.code = 'DOKE_E2E_CAPABILITY_DENIED'; throw e; } }, getClient() { calls.clients++; return client; } };
  window.supabase = { createClient() { calls.sdk++; throw Error('Alternate client'); } };
  window.DOKE_SUPABASE_CONFIG = { enabled: true, url: 'https://synthetic.test', anonKey: 'synthetic' };
  window.Doke = { homePublicServices: { refresh() { return asyncFailure ? Promise.reject(Error('SENSITIVE_SYNTHETIC_TOKEN')) : Promise.resolve(0); } } };
  const context = vm.createContext({ window, document, console, Promise, CustomEvent: window.CustomEvent, setTimeout, clearTimeout });
  const run = file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  const event = name => document.dispatchEvent(new window.Event(name));
  return { window, document, calls, intervals, run, event, deny(value) { denied = value; }, fail(value) { asyncFailure = value; }, active(value) { active = value; } };
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
(async () => {
  await test('denied notifications bootstrap/session/visibility/focus never create client, polling, Realtime or fixtures', async () => {
    const w = world(); w.run('assets/js/repositories/notifications-repository.js');
    w.event('DOMContentLoaded'); await flush(); w.event('doke:auth-session-change'); await flush(); w.event('visibilitychange'); w.window.dispatchEvent(new w.window.Event('focus')); await flush();
    assert.equal(w.calls.clients, 0); assert.equal(w.calls.sdk, 0); assert.equal(w.calls.network, 0); assert.equal(w.calls.channels, 0); assert.equal(w.calls.storage, 0); assert.equal(w.intervals.size, 0);
    const status = w.window.Doke.repositories.notifications.getProviderStatus(); assert.equal(status.provider, 'remote-unavailable'); assert.equal(status.fallbackActive, false); assert(!status.lastError.includes('SENSITIVE'));
    await assert.rejects(w.window.Doke.repositories.notifications.load(), /SENSITIVE/);
  });
  await test('notifications asynchronous rejection stops polling and permits authorized recovery', async () => {
    const w = world(); w.deny(false); w.run('assets/js/repositories/notifications-repository.js'); w.event('DOMContentLoaded'); await flush(); assert.equal(w.intervals.size, 1);
    w.fail(true); w.window.dispatchEvent(new w.window.Event('focus')); await flush(); assert.equal(w.intervals.size, 0); assert.equal(w.window.Doke.repositories.notifications.getProviderStatus().fallbackActive, false);
    w.fail(false); w.event('doke:auth-session-change'); await flush(); assert.equal(w.intervals.size, 1);
    w.deny(true); [...w.intervals.values()][0](); await flush(); assert.equal(w.intervals.size, 0); assert.equal(w.calls.channels, 0); assert.equal(w.calls.sdk, 0);
  });
  await test('services SDK-ready synchronous denial is observable and cannot return fixtures', async () => {
    const w = world(); w.run('assets/js/repositories/services-repository.js'); w.event('doke:supabase-sdk-ready'); await flush();
    assert.equal(w.calls.clients, 0); assert.equal(w.calls.sdk, 0);
    const status = w.window.Doke.repositories.services.getProviderStatus(); assert.equal(status.provider, 'remote-unavailable'); assert.equal(status.remoteUnavailable, true); assert.equal(status.fallbackActive, false); assert(!status.lastError.includes('SENSITIVE'));
    assert.throws(() => w.window.Doke.repositories.services.load(), /SENSITIVE/);
  });
  await test('services async refresh rejection handled and normal non-E2E SDK path preserved', async () => {
    const w = world(); w.deny(false); w.fail(true); w.run('assets/js/repositories/services-repository.js'); w.event('doke:supabase-sdk-ready'); await flush();
    assert.equal(w.document.documentElement.getAttribute('data-doke-services-provider'), 'remote-unavailable');
    w.fail(false); w.active(false); w.event('doke:supabase-sdk-ready'); await flush(); assert.equal(w.window.Doke.repositories.services.getProviderStatus().provider, 'supabase'); assert.equal(w.calls.sdk, 0);
  });
  await flush(); assert.equal(unhandled.length, 0); console.log('PASS zero unhandled rejections'); console.log('BOOTSTRAP_RUNTIME: ' + (passed + 1) + ' checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
