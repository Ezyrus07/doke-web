#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const CANONICAL_AUTH_SERVICE = 'assets/js/services/auth-service.js';
const SESSION_AUTHORITY = 'assets/js/services/auth-session-authority.js';
const REGISTRATION_AUTHORITY = 'assets/js/services/auth-registration-authority.js';
const PASSWORD_AUTHORITY = 'assets/js/services/auth-password-authority.js';
const LEGACY_AUTH_SERVICE = 'assets/js/core/auth-service.js';
const SESSION_STORE = 'assets/js/core/session.js';
const USERS_REPOSITORY = 'assets/js/repositories/users-repository.js';
const AUTH_PAGE_CONTROLLER = 'assets/js/pages/auth.js';
const PASSWORD_PAGE_CONTROLLER = 'assets/js/pages/auth-password-pages.js';
const SUPABASE_CONFIG = 'assets/js/core/supabase-config.js';
const AUTH_DOMAIN_CONTRACT = 'assets/js/contracts/auth-domain-contract.js';
const ROUTE_MAP = 'assets/js/core/auth-route-map.js';
const ROUTE_GUARD = 'assets/js/core/route-guard.js';
const PAGE_BOOTSTRAP = 'assets/js/core/page-bootstrap.js';
const EARLY_AUTH_SURFACE = 'assets/js/core/header-auth-surface-early.js';
const AUTH_PREPAINT_CSS = 'assets/css/core/auth-prepaint-guard.css';
const DOCUMENT_PRELOADER_CSS = 'assets/css/components/feedback/document-preloader.css';
const COMMUNITY_EARLY = 'assets/js/features/community/community-reload-state-early.js';
const AUTH_A04_MIGRATION = 'supabase/migrations/146_auth_registration_username_authority.sql';
const AUTH_A04_VALIDATION = 'supabase/tests/015_auth_registration_username_authority_validation.sql';
const AUTH_A04_RUNTIME_TEST = 'scripts/test-auth-registration-username-runtime.js';

const requiredFiles = [
  'assets/js/core/app-state.js',
  'assets/js/core/permissions.js',
  SESSION_STORE,
  CANONICAL_AUTH_SERVICE,
  SESSION_AUTHORITY,
  REGISTRATION_AUTHORITY,
  PASSWORD_AUTHORITY,
  PASSWORD_PAGE_CONTROLLER,
  ROUTE_MAP,
  ROUTE_GUARD,
  PAGE_BOOTSTRAP,
  AUTH_A04_MIGRATION,
  AUTH_A04_VALIDATION,
  AUTH_A04_RUNTIME_TEST
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
    assertOrdered(sources, [SESSION_STORE, CANONICAL_AUTH_SERVICE], page);
    const loadsDirectSessionAuthority = sources.includes(SESSION_AUTHORITY);
    const loadsBootstrapAuthority = sources.includes(PAGE_BOOTSTRAP);
    if (!loadsDirectSessionAuthority && !loadsBootstrapAuthority) {
      errors.push(`${page} loads ${CANONICAL_AUTH_SERVICE} without ${SESSION_AUTHORITY} or ${PAGE_BOOTSTRAP}`);
    }
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

  if (page === 'auth/esqueci-senha.html') {
    assertOrdered(sources, [
      SUPABASE_CONFIG,
      SESSION_STORE,
      USERS_REPOSITORY,
      CANONICAL_AUTH_SERVICE,
      SESSION_AUTHORITY,
      PASSWORD_AUTHORITY,
      PASSWORD_PAGE_CONTROLLER
    ], page);
    if (sources.includes(AUTH_PAGE_CONTROLLER)) {
      errors.push(`${page} must not load legacy multi-purpose controller ${AUTH_PAGE_CONTROLLER}`);
    }
  } else {
    assertOrdered(sources, [
      SUPABASE_CONFIG,
      SESSION_STORE,
      USERS_REPOSITORY,
      CANONICAL_AUTH_SERVICE,
      SESSION_AUTHORITY,
      AUTH_PAGE_CONTROLLER
    ], page);
  }
}

const signupSources = readScriptSources(read('auth/cadastro.html'), 'auth/cadastro.html');
assertOrdered(signupSources, [
  SUPABASE_CONFIG,
  SESSION_STORE,
  USERS_REPOSITORY,
  CANONICAL_AUTH_SERVICE,
  SESSION_AUTHORITY,
  REGISTRATION_AUTHORITY,
  AUTH_PAGE_CONTROLLER
], 'auth/cadastro.html');

for (const page of ['auth/login.html', 'auth/esqueci-senha.html']) {
  const sources = readScriptSources(read(page), page);
  if (sources.includes(REGISTRATION_AUTHORITY)) {
    errors.push(`${page} must not load signup-only authority ${REGISTRATION_AUTHORITY}`);
  }
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

const sessionAuthoritySource = read(SESSION_AUTHORITY);
for (const token of [
  "const VERSION = 'AUTH-A06'",
  'client.auth.refreshSession()',
  "local: 'local'",
  "others: 'others'",
  "global: 'global'",
  'signOutCurrentDevice',
  'signOutOtherSessions',
  'signOutAllSessions',
  'ns.service = facade;',
  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',
  'updateCurrentUser'
]) {
  if (!sessionAuthoritySource.includes(token)) errors.push(`${SESSION_AUTHORITY} missing session authority token: ${token}`);
}
for (const retired of ['updateCurrentProfile']) {
  if (canonicalSource.includes(retired)) errors.push(`${CANONICAL_AUTH_SERVICE} still exposes retired profile mutation facade: ${retired}`);
  if (sessionAuthoritySource.includes(retired + ',')) errors.push(`${SESSION_AUTHORITY} still publishes retired profile mutation facade: ${retired}`);
  if (sessionAuthoritySource.includes('const ' + retired)) errors.push(`${SESSION_AUTHORITY} still implements retired profile mutation facade: ${retired}`);
}
for (const forbidden of ['localStorage.setItem', 'sessionStorage.setItem', 'access_token:', 'refresh_token:']) {
  if (sessionAuthoritySource.includes(forbidden)) errors.push(`${SESSION_AUTHORITY} contains forbidden persistence token: ${forbidden}`);
}

const registrationSource = read(REGISTRATION_AUTHORITY);
for (const token of [
  "version: 'AUTH-A04'",
  "client.rpc('check_username_availability'",
  'authority_unavailable',
  'authorityUnavailableResult',
  'ns.registrationAuthority = api;',
  'ns.checkUsernameAvailability = checkUsernameAvailability;',
  'ns.register = register;',
  'registrationAuthority: api'
]) {
  if (!registrationSource.includes(token)) errors.push(`${REGISTRATION_AUTHORITY} missing registration authority token: ${token}`);
}
for (const forbidden of ['baseCheckUsernameAvailability', 'localStorage.setItem', 'sessionStorage.setItem', 'access_token', 'refresh_token', 'service_role']) {
  if (registrationSource.includes(forbidden)) errors.push(`${REGISTRATION_AUTHORITY} contains forbidden fallback, persistence or credential token: ${forbidden}`);
}

const migrationSource = read(AUTH_A04_MIGRATION);
for (const token of [
  'public.normalize_username',
  'public.is_reserved_username',
  'public.is_valid_username',
  'public.check_username_availability',
  'trg_enforce_user_profile_username',
  'private.materialize_auth_account',
  'DOKE_IDENTITY_USERNAME_TAKEN',
  'grant execute on function public.check_username_availability(text) to anon, authenticated, service_role'
]) {
  if (!migrationSource.includes(token)) errors.push(`${AUTH_A04_MIGRATION} missing authority token: ${token}`);
}
if (migrationSource.includes('grant all')) errors.push(`${AUTH_A04_MIGRATION} cannot grant broad privileges`);

const authA04ValidationSource = read(AUTH_A04_VALIDATION);
for (const token of ['begin;', 'AUTH_A04_SIGNUP_RACE_NOT_BLOCKED', 'AUTH_A04_RESERVED_SIGNUP_NOT_BLOCKED', 'rollback;']) {
  if (!authA04ValidationSource.includes(token)) errors.push(`${AUTH_A04_VALIDATION} missing validation token: ${token}`);
}

for (const forbidden of [
  'RECOVERY_KEY',
  'generateRecoveryCode',
  'debugCode',
  'updatePassword(recovery.userId',
  'const checkUsernameAvailability = async'
]) {
  if (canonicalSource.includes(forbidden)) errors.push(`${CANONICAL_AUTH_SERVICE} still contains browser identity fallback token: ${forbidden}`);
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
  'authRouteDecision',
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
for (const token of [
  'ensureAuthRouteGuard',
  'ensureAuthSessionAuthority',
  'auth-session-authority.js',
  'auth-route-map.js',
  'route-guard.js',
  'failClosedAuthGuard'
]) {
  if (!pageBootstrapSource.includes(token)) errors.push(`${PAGE_BOOTSTRAP} missing canonical auth bootstrap token: ${token}`);
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

execFileSync(process.execPath, [path.join(root, AUTH_A04_RUNTIME_TEST)], {
  cwd: root,
  stdio: 'inherit'
});

console.log('Auth/session contract audit passed.');
console.log(`Checked files: ${requiredFiles.length}`);
console.log(`Checked baseline pages: ${baselinePages.length}`);
console.log(`Checked active HTML pages: ${activeHtmlFiles.length}`);
console.log(`Canonical auth consumers: ${canonicalConsumerCount}`);
console.log(`Protected routes: ${routes.PRIVATE_ROUTES.length}`);
console.log('AUTH-A04 registration authority: enforced');
console.log('AUTH-A05 password authority: enforced');
console.log('AUTH-A06 session authority and per-route controllers: enforced');
console.log('Dormant legacy consumers: 0');
