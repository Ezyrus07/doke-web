#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = process.cwd();
const authSource = fs.readFileSync(path.join(root, 'assets/js/services/auth-service.js'), 'utf8');
const ownerProfileSource = fs.readFileSync(path.join(root, 'assets/js/pages/owner-profile-experience.js'), 'utf8');

const forbiddenSource = [
  'AUTH_ENDPOINTS',
  'CANARY_REQUIRED_ENDPOINTS',
  'apiAccessToken',
  'readAccessTokenFromPayload',
  'setApiAccessTokenFromPayload',
  'clearApiAccessToken',
  'normalizeApiErrorMessage',
  'apiRequest',
  'normalizeApiSessionPayload',
  'setSessionFromApiPayload',
  'fetchApiCurrentIdentity',
  'apiLogin',
  'apiRegister',
  'refreshApiSession',
  'refreshCurrentIdentity',
  'getAuthProviderStatus',
  'getAuthIdentityCanaryStatus',
  'canUseApiAuth',
  "'/auth/login'",
  "'/auth/register'",
  "'/auth/logout'",
  "'/auth/session'"
];

for (const snippet of forbiddenSource) {
  assert(!authSource.includes(snippet), 'auth-service still contains retired browser adapter snippet: ' + snippet);
}
assert(authSource.includes("const AUTH_PROVIDER_VALUES = Object.freeze({ supabase: 'supabase' })"));
assert(authSource.includes('getActiveAuthProvider: () => AUTH_PROVIDER_VALUES.supabase'));
assert(ownerProfileSource.includes('auth.refreshSession({ silent: true })'));
assert(!ownerProfileSource.includes('refreshApiSession'));

class CustomEventStub {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}

const session = {
  getSession() { return null; },
  read() { return null; },
  getCurrentUser() { return null; },
  getUser() { return null; },
  hasRole() { return false; },
  subscribe() { return () => {}; },
  clear() {},
  write(value) { return value; },
  getAuthContext() { return Object.freeze({ authenticated: false, user: null, role: 'guest', permissions: [], provider: 'supabase' }); }
};
const document = {
  readyState: 'complete',
  documentElement: { dataset: {} },
  querySelectorAll() { return []; },
  addEventListener() {},
  dispatchEvent() { return true; }
};
const window = {
  document,
  Doke: { session },
  DokeAuth: { session, repositories: {} },
  DOKE_SUPABASE_CONFIG: { enabled: false },
  location: { pathname: '/index.html', search: '', hash: '', assign() {}, replace() {} },
  localStorage: { removeItem() {} },
  setTimeout(fn) { fn(); return 0; },
  clearTimeout() {},
  console
};
window.window = window;
const sandbox = { window, document, CustomEvent: CustomEventStub, URL, URLSearchParams, Promise, console, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout };
vm.createContext(sandbox);
vm.runInContext(authSource, sandbox, { filename: 'auth-service.js' });

assert.strictEqual(window.DokeAuth.getActiveAuthProvider(), 'supabase');
assert.strictEqual(typeof window.DokeAuth.refreshSession, 'function');
for (const retiredExport of ['refreshApiSession', 'refreshCurrentIdentity', 'getAuthProviderStatus', 'getAuthIdentityCanaryStatus']) {
  assert.strictEqual(Object.prototype.hasOwnProperty.call(window.DokeAuth, retiredExport), false, retiredExport + ' remains public');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(window.DokeAuth.service, retiredExport), false, retiredExport + ' remains on service facade');
}

console.log('Browser auth adapter retirement runtime test passed.');
console.log('- Supabase remains the only browser authentication provider');
console.log('- the historical /auth/* adapter is absent from browser runtime');
console.log('- owner profile refresh uses the canonical provider session');
