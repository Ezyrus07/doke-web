#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const routeMapSource = fs.readFileSync(path.join(ROOT, 'assets/js/core/auth-route-map.js'), 'utf8');
const routeGuardSource = fs.readFileSync(path.join(ROOT, 'assets/js/core/route-guard.js'), 'utf8');

class CustomEventStub {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

async function flush(count = 8) {
  for (let index = 0; index < count; index += 1) await Promise.resolve();
}

async function main() {
  let authListener = null;
  let refreshCalls = 0;
  const documentListeners = new Map();
  const windowListeners = new Map();

  const document = {
    readyState: 'complete',
    baseURI: 'https://staging.example/orcamento.html',
    body: { dataset: {} },
    documentElement: { dataset: {} },
    querySelector() { return null; },
    createElement() { throw new Error('Unexpected access-state render.'); },
    addEventListener(type, listener) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      (documentListeners.get(event.type) || []).forEach((listener) => listener(event));
      return true;
    }
  };

  const context = {
    authenticated: true,
    user: { id: 'client-1', role: 'client', accountStatus: 'active' },
    role: 'client',
    accountStatus: 'active',
    sessionStatus: 'active',
    canAccessAdmin: false
  };

  const service = {
    getAuthContext() { return context; },
    onAuthChange(listener) {
      authListener = listener;
      return () => { authListener = null; };
    },
    async refreshSession() {
      refreshCalls += 1;
      if (refreshCalls < 5 && authListener) authListener();
      return context;
    },
    redirectIfAuthenticated() { return false; }
  };

  const window = {
    document,
    DokeAuth: { service },
    location: {
      pathname: '/orcamento.html',
      search: '',
      hash: '',
      href: 'https://staging.example/orcamento.html',
      replace() {}
    },
    addEventListener(type, listener) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(listener);
    }
  };
  window.window = window;

  const sandbox = {
    window,
    document,
    CustomEvent: CustomEventStub,
    URL,
    URLSearchParams,
    Promise,
    Set,
    Date,
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(routeMapSource, sandbox, { filename: 'auth-route-map.js' });
  vm.runInContext(routeGuardSource, sandbox, { filename: 'route-guard.js' });
  await flush();

  assert.strictEqual(refreshCalls, 1, 'private-route auth-change re-evaluation must not recursively refresh the provider session');
  assert.strictEqual(document.documentElement.dataset.authRouteDecision, 'authorized', 'private route should settle as authorized after the refreshed session');

  const pageshow = (windowListeners.get('pageshow') || [])[0];
  assert.strictEqual(typeof pageshow, 'function', 'route guard must keep the pageshow refresh hook');
  pageshow();
  await flush();
  assert.strictEqual(refreshCalls, 2, 'pageshow should still perform one fresh authority check');
  assert.strictEqual(document.documentElement.dataset.authRouteDecision, 'authorized');

  console.log('Auth route guard refresh-loop test passed.');
  console.log('- session-change re-evaluation does not recursively refresh authority');
  console.log('- private route still settles as authorized');
  console.log('- pageshow still performs a fresh authority check');
}

main().catch((error) => {
  console.error('Auth route guard refresh-loop test failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});
