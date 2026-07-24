#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = process.cwd();
const routeMapSource = fs.readFileSync(path.join(root, 'assets/js/core/auth-route-map.js'), 'utf8');
const routeGuardSource = fs.readFileSync(path.join(root, 'assets/js/core/route-guard.js'), 'utf8');

class ElementStub {
  constructor(tagName) {
    this.tagName = String(tagName || 'div').toUpperCase();
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.textContent = '';
    this.href = '';
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  getAttribute(name) {
    return this.attributes.has(String(name)) ? this.attributes.get(String(name)) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(String(name));
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  querySelector(selector) {
    if (selector === '[data-auth-access-state]') {
      if (this.dataset && this.dataset.authAccessState) return this;
      for (const child of this.children) {
        const match = child.querySelector(selector);
        if (match) return match;
      }
    }
    return null;
  }
}

function createRuntime() {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const html = new ElementStub('html');
  const body = new ElementStub('body');
  html.appendChild(body);

  const document = {
    readyState: 'complete',
    baseURI: 'https://doke.test/index.html',
    documentElement: html,
    body,
    createElement(tagName) { return new ElementStub(tagName); },
    querySelector(selector) { return body.querySelector(selector); },
    addEventListener(type, listener) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      for (const listener of documentListeners.get(event.type) || []) listener(event);
      return true;
    }
  };

  let context = {
    authenticated: false,
    user: null,
    role: 'guest',
    accountStatus: 'active',
    sessionStatus: 'anonymous',
    canAccessAdmin: false
  };
  let authChangeListener = null;
  const redirects = [];

  const location = {
    pathname: '/index.html',
    search: '',
    hash: '',
    href: 'https://doke.test/index.html',
    origin: 'https://doke.test',
    replace(value) { redirects.push({ type: 'replace', value: String(value) }); },
    assign(value) { redirects.push({ type: 'assign', value: String(value) }); }
  };

  const service = {
    getAuthContext() { return Object.assign({}, context); },
    async refreshSession() { return null; },
    onAuthChange(listener) { authChangeListener = listener; return () => {}; },
    redirectIfAuthenticated({ enforce, redirectToApp }) {
      if (enforce && context.authenticated) {
        redirects.push({ type: 'auth-app', value: String(redirectToApp) });
      }
      return context.authenticated;
    }
  };

  const window = {
    document,
    location,
    DokeAuth: { service },
    setTimeout,
    clearTimeout,
    addEventListener(type, listener) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      for (const listener of windowListeners.get(event.type) || []) listener(event);
      return true;
    }
  };
  window.window = window;

  const sandbox = {
    window,
    document,
    CustomEvent: class CustomEventStub {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    URL,
    URLSearchParams,
    Promise,
    Date,
    Set,
    Object,
    String,
    Boolean,
    Number,
    console,
    setTimeout,
    clearTimeout
  };

  vm.createContext(sandbox);
  vm.runInContext(routeMapSource, sandbox, { filename: 'auth-route-map.js' });
  vm.runInContext(routeGuardSource, sandbox, { filename: 'route-guard.js' });

  return {
    window,
    document,
    redirects,
    setContext(next) { context = Object.assign({}, context, next); },
    setRoute(pathname, search = '', hash = '') {
      location.pathname = pathname;
      location.search = search;
      location.hash = hash;
      location.href = 'https://doke.test' + pathname + search + hash;
      document.baseURI = location.href;
      redirects.length = 0;
      body.children.slice().forEach((child) => child.remove());
      delete html.dataset.authRouteDecision;
      delete html.dataset.authGuard;
      delete html.dataset.authGuardMode;
    },
    authChange() {
      if (authChangeListener) authChangeListener();
    }
  };
}

function activeContext(overrides = {}) {
  return Object.assign({
    authenticated: true,
    user: { id: 'user-1', role: 'client' },
    role: 'client',
    accountStatus: 'active',
    sessionStatus: 'active',
    canAccessAdmin: false
  }, overrides);
}

async function main() {
  const runtime = createRuntime();
  const guard = runtime.window.DokeAuth.guard;
  const routes = runtime.window.DokeAuth.routes;

  await guard.evaluate();

  assert(routes.PRIVATE_ROUTES.includes('perfil-profissional.html'));
  assert(!routes.PUBLIC_ROUTES.includes('perfil-profissional.html'));
  assert.strictEqual(routes.getRoutePolicy('/admin.html').requiresAdmin, true);

  runtime.setRoute('/pedidos.html');
  runtime.setContext({
    authenticated: false,
    user: null,
    role: 'guest',
    accountStatus: 'active',
    sessionStatus: 'anonymous',
    canAccessAdmin: false
  });
  await guard.evaluate();
  assert.strictEqual(runtime.document.documentElement.dataset.authRouteDecision, 'redirecting');
  assert.strictEqual(runtime.redirects.length, 1);
  const anonymousRedirect = new URL(runtime.redirects[0].value);
  assert.strictEqual(anonymousRedirect.origin, 'https://doke.test');
  assert.strictEqual(anonymousRedirect.pathname, '/auth/login.html');
  assert.strictEqual(anonymousRedirect.searchParams.get('next'), '/pedidos.html');

  runtime.setRoute('/pedidos.html');
  runtime.setContext(activeContext());
  await guard.evaluate();
  assert.strictEqual(runtime.document.documentElement.dataset.authRouteDecision, 'authorized');

  runtime.setRoute('/pedidos.html');
  runtime.setContext(activeContext({ sessionStatus: 'expired' }));
  await guard.evaluate();
  assert.strictEqual(runtime.document.documentElement.dataset.authRouteDecision, 'expired');
  assert(runtime.document.querySelector('[data-auth-access-state]'));

  runtime.setRoute('/pedidos.html');
  runtime.setContext(activeContext({ sessionStatus: 'revoked' }));
  await guard.evaluate();
  assert.strictEqual(runtime.document.documentElement.dataset.authRouteDecision, 'revoked');

  runtime.setRoute('/pedidos.html');
  runtime.setContext(activeContext({ accountStatus: 'suspended' }));
  await guard.evaluate();
  assert.strictEqual(runtime.document.documentElement.dataset.authRouteDecision, 'suspended');

  runtime.setRoute('/pedidos.html');
  runtime.setContext(activeContext({ accountStatus: 'disabled' }));
  await guard.evaluate();
  assert.strictEqual(runtime.document.documentElement.dataset.authRouteDecision, 'disabled');

  runtime.setRoute('/admin.html');
  runtime.setContext(activeContext({ role: 'client', canAccessAdmin: false }));
  await guard.evaluate();
  assert.strictEqual(runtime.document.documentElement.dataset.authRouteDecision, 'forbidden');

  runtime.setRoute('/admin.html');
  runtime.setContext(activeContext({
    user: { id: 'support-1', role: 'support' },
    role: 'support',
    canAccessAdmin: true
  }));
  await guard.evaluate();
  assert.strictEqual(runtime.document.documentElement.dataset.authRouteDecision, 'authorized');

  runtime.setRoute('/index.html');
  runtime.setContext({
    authenticated: false,
    user: null,
    role: 'guest',
    accountStatus: 'active',
    sessionStatus: 'anonymous',
    canAccessAdmin: false
  });
  await guard.evaluate();
  assert.strictEqual(runtime.document.documentElement.dataset.authRouteDecision, 'authorized');

  runtime.setRoute('/auth/login.html');
  runtime.setContext(activeContext());
  await guard.evaluate();
  assert(runtime.redirects.some((entry) => entry.type === 'auth-app'));

  console.log('Canonical auth route guard runtime test passed.');
  console.log('- anonymous private routes redirect with a same-origin next path');
  console.log('- active private sessions are authorized');
  console.log('- expired, revoked, suspended and disabled states fail closed');
  console.log('- admin routes reject ordinary users and authorize support/admin context');
  console.log('- public routes remain available');
}

main().catch((error) => {
  console.error('Canonical auth route guard runtime test failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});
