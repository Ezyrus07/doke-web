#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const CANONICAL_AUTH_SERVICE = 'assets/js/services/auth-service.js';
const LEGACY_AUTH_SERVICE = 'assets/js/core/auth-service.js';
const SESSION_STORE = 'assets/js/core/session.js';
const USERS_REPOSITORY = 'assets/js/repositories/users-repository.js';
const AUTH_PAGE_CONTROLLER = 'assets/js/pages/auth.js';
const SUPABASE_CONFIG = 'assets/js/core/supabase-config.js';
const AUTH_DOMAIN_CONTRACT = 'assets/js/contracts/auth-domain-contract.js';
const ROUTE_MAP = 'assets/js/core/auth-route-map.js';
const ROUTE_GUARD = 'assets/js/core/route-guard.js';
const PAGE_BOOTSTRAP = 'assets/js/core/page-bootstrap.js';
const EARLY_AUTH_SURFACE = 'assets/js/core/header-auth-surface-early.js';
const AUTH_PREPAINT_CSS = 'assets/css/core/auth-prepaint-guard.css';
const DOCUMENT_PRELOADER_CSS = 'assets/css/components/feedback/document-preloader.css';
const COMMUNITY_EARLY = 'assets/js/features/community/community-reload-state-early.js';

const requiredFiles = [
  'assets/js/core/app-state.js',
  'assets/js/core/permissions.js',
  SESSION_STORE,
  CANONICAL_AUTH_SERVICE,
  ROUTE_MAP,
  ROUTE_GUARD,
  PAGE_BOOTSTRAP
];

const baselinePages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html'
];

const authPages = [
  'auth/login.html',
  'auth/cadastro.html',
  'auth/esqueci-senha.html'
];

const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const normalizeScriptPath = (value, htmlPath) => {
  const withoutQuery = String(value || '').split('?')[0].split('#')[0].replace(/\\/g, '/');
  if (/^(?:https?:)?\/\//i.test(withoutQuery)) return withoutQuery;
  const htmlDirectory = path.posix.dirname(String(htmlPath || '').replace(/\\/g, '/'));
  return path.posix.normalize(path.posix.join(htmlDirectory === '.' ? '' : htmlDirectory, withoutQuery))
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
};

const readScriptSources = (html, htmlPath) => {
  const sources = [];
  const matcher = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = matcher.exec(html))) sources.push(normalizeScriptPath(match[1], htmlPath));
  return sources;
};

const listActiveHtmlFiles = () => {
  const rootPages = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name);
  const authDirectory = path.join(root, 'auth');
  const nestedAuthPages = fs.existsSync(authDirectory)
    ? fs.readdirSync(authDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
      .map((entry) => `auth/${entry.name}`)
    : [];
  return Array.from(new Set([...rootPages, ...nestedAuthPages])).sort();
};

const assertOrdered = (sources, expected, page) => {
  let lastIndex = -1;
  for (const scriptPath of expected) {
    const index = sources.indexOf(scriptPath);
    if (index === -1) {
      errors.push(`${page} does not load ${scriptPath}`);
      continue;
    }
    if (index <= lastIndex) errors.push(`${page} loads ${scriptPath} outside the canonical auth order`);
    lastIndex = Math.max(lastIndex, index);
  }
};

function loadRouteContract() {
  const sandbox = {
    window: {
      location: { pathname: '/index.html' },
      DokeAuth: {}
    }
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(read(ROUTE_MAP), sandbox, { filename: ROUTE_MAP });
  return sandbox.window.DokeAuth.routes;
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required auth/session file: ${file}`);
}

for (const page of baselinePages) {
  const pagePath = path.join(root, page);
  if (!fs.existsSync(pagePath)) {
    errors.push(`Missing page: ${page}`);
    continue;
  }
  const html = read(page);
  for (const file of ['assets/js/core/app-state.js', 'assets/js/core/permissions.js', SESSION_STORE, CANONICAL_AUTH_SERVICE, PAGE_BOOTSTRAP]) {
    if (!html.includes(file)) errors.push(`${page} does not load ${file}`);
  }
  if (!/<body[^>]*data-page=/.test(html)) errors.push(`${page} is missing body[data-page]`);
}

const activeHtmlFiles = listActiveHtmlFiles();
let canonicalConsumerCount = 0;
for (const page of activeHtmlFiles) {
  const html = read(page);
  const sources = readScriptSources(html, page);

  if (sources.includes(LEGACY_AUTH_SERVICE)) {
    errors.push(`${page} loads dormant legacy authority ${LEGACY_AUTH_SERVICE}`);
  }

  if (sources.includes(CANONICAL_AUTH_SERVICE)) {
    canonicalConsumerCount += 1;
    assertOrdered(sources, [SESSION_STORE, CANONICAL_AUTH_SERVICE, PAGE_BOOTSTRAP], page);
  }
}

if (canonicalConsumerCount === 0) {
  errors.push(`No active HTML page loads canonical auth authority ${CANONICAL_AUTH_SERVICE}`);
}

for (const page of authPages) {
  const pagePath = path.join(root, page);
  if (!fs.existsSync(pagePath)) {
    errors.push(`Missing auth page: ${page}`);
    continue;
  }
  const html = read(page);
  const sources = readScriptSources(html, page);
  if (!sources.some((source) => source.includes('@supabase/supabase-js@2'))) {
    errors.push(`${page} does not load Supabase JS v2`);
  }
  assertOrdered(sources, [SUPABASE_CONFIG, SESSION_STORE, USERS_REPOSITORY, CANONICAL_AUTH_SERVICE, AUTH_PAGE_CONTROLLER], page);
}

const canonicalSource = read(CANONICAL_AUTH_SERVICE);
for (const token of [
  'const api = Object.freeze({',
  'ns.service = api;',
  'Object.assign(ns, api);',
  'signInWithPassword',
  'signUp',
  'isSupabaseAuthRequired',
  'onAuthStateChange',
  'getAccessToken',
  'refreshSupabaseSession'
]) {
  if (!canonicalSource.includes(token)) errors.push(`${CANONICAL_AUTH_SERVICE} is missing canonical authority token: ${token}`);
}

const sessionSource = read(SESSION_STORE);
for (const token of ['SENSITIVE_SESSION_KEYS', 'normalizeSessionProvider', "if (value === 'supabase') return 'supabase'"]) {
  if (!sessionSource.includes(token)) errors.push(`${SESSION_STORE} missing canonical sanitized-session token: ${token}`);
}
for (const forbidden of ['token: session.token', 'refreshToken: session.refreshToken', 'token: meta.token', 'refreshToken: meta.refreshToken']) {
  if (sessionSource.includes(forbidden)) errors.push(`${SESSION_STORE} still persists secret field: ${forbidden}`);
}

const authDomainSource = read(AUTH_DOMAIN_CONTRACT);
if (!authDomainSource.includes("SUPABASE: 'supabase'")) {
  errors.push(`${AUTH_DOMAIN_CONTRACT} does not recognize Supabase session provider`);
}

const legacySource = read(LEGACY_AUTH_SERVICE);
if (!legacySource.includes('doke.auth.session.v2') || !legacySource.includes('doke.auth.users.v1')) {
  errors.push(`${LEGACY_AUTH_SERVICE} no longer matches the identified dormant legacy implementation; review the authority classification`);
}

const routes = loadRouteContract();
if (!routes || typeof routes.getRoutePolicy !== 'function') {
  errors.push(`${ROUTE_MAP} did not expose getRoutePolicy`);
} else {
  if (!routes.PRIVATE_ROUTES.includes('perfil-profissional.html')) {
    errors.push('perfil-profissional.html must be a private owner route');
  }
  if (routes.PUBLIC_ROUTES.includes('perfil-profissional.html')) {
    errors.push('perfil-profissional.html cannot remain public');
  }
  for (const route of routes.ADMIN_ROUTES || []) {
    const policy = routes.getRoutePolicy(route);
    if (!policy.requiresAdmin || !policy.requiresAuth) errors.push(`${route} must require authenticated admin access`);
  }

  const communityEarlySource = read(COMMUNITY_EARLY);
  const documentPreloaderSource = read(DOCUMENT_PRELOADER_CSS);

  for (const page of routes.PRIVATE_ROUTES) {
    if (!fs.existsSync(path.join(root, page))) {
      errors.push(`Private route is missing HTML: ${page}`);
      continue;
    }
    const html = read(page);
    const sources = readScriptSources(html, page);

    if (!sources.includes(EARLY_AUTH_SURFACE)) errors.push(`${page} does not load ${EARLY_AUTH_SURFACE}`);
    if (!sources.includes(PAGE_BOOTSTRAP)) errors.push(`${page} does not load ${PAGE_BOOTSTRAP}`);

    const hasStaticPrepaint = /<html\b[^>]*data-auth-guard=["']pending["']/i.test(html)
      && html.includes(AUTH_PREPAINT_CSS);
    const hasCommunityPrepaint = ['comunidade.html', 'comunidade-interna.html'].includes(page)
      && sources.includes(COMMUNITY_EARLY)
      && communityEarlySource.includes("dataset.authGuard = 'pending'")
      && documentPreloaderSource.includes('@import url("../../core/auth-prepaint-guard.css")');

    if (!hasStaticPrepaint && !hasCommunityPrepaint) {
      errors.push(`${page} does not establish a render-blocking protected-route prepaint state`);
    }
  }
}

const routeGuardSource = read(ROUTE_GUARD);
for (const token of [
  'data-auth-route-decision',
  'refreshSession',
  'requiresAdmin',
  'canAccessAdmin',
  'renderAccessState',
  'admin_access_required',
  'authentication_required',
  'sessionStatus',
  'accountStatus'
]) {
  if (!routeGuardSource.includes(token)) errors.push(`${ROUTE_GUARD} missing access-state token: ${token}`);
}
if (routeGuardSource.includes("return htmlMode || bodyMode || 'observe'")) {
  errors.push(`${ROUTE_GUARD} still defaults protected routes to observe`);
}

const pageBootstrapSource = read(PAGE_BOOTSTRAP);
for (const token of ['ensureAuthRouteGuard', 'auth-route-map.js', 'route-guard.js', 'failClosedAuthGuard']) {
  if (!pageBootstrapSource.includes(token)) errors.push(`${PAGE_BOOTSTRAP} missing canonical guard bootstrap token: ${token}`);
}

const authPrepaintSource = read(AUTH_PREPAINT_CSS);
for (const token of [
  'data-auth-route-decision="authorized"',
  'data-auth-route-decision="forbidden"',
  '.doke-auth-access-state',
  'visibility: hidden'
]) {
  if (!authPrepaintSource.includes(token)) errors.push(`${AUTH_PREPAINT_CSS} missing prepaint/access-state token: ${token}`);
}
if (authPrepaintSource.includes('!important')) errors.push(`${AUTH_PREPAINT_CSS} must not use !important`);

const shellCss = read('assets/css/components/shell/mobile-app-shell.css');
if (/body\.doke-mobile-shell-mounted \.doke-mobile-shell\s*{[\s\S]{0,120}position:\s*fixed\s*!important/.test(shellCss)) {
  errors.push('Mobile shell header is fixed/sticky. Expected non-sticky absolute shell.');
}

if (errors.length) {
  console.error('Auth/session contract audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

execFileSync(process.execPath, [path.join(root, 'scripts/test-auth-route-guard-runtime.js')], {
  cwd: root,
  stdio: 'inherit'
});

console.log('Auth/session contract audit passed.');
console.log(`Checked files: ${requiredFiles.length}`);
console.log(`Checked baseline pages: ${baselinePages.length}`);
console.log(`Checked active HTML pages: ${activeHtmlFiles.length}`);
console.log(`Canonical auth consumers: ${canonicalConsumerCount}`);
console.log(`Protected routes: ${routes.PRIVATE_ROUTES.length}`);
console.log('Dormant legacy consumers: 0');
