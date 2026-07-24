#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const CANONICAL_AUTH_SERVICE = 'assets/js/services/auth-service.js';
const LEGACY_AUTH_SERVICE = 'assets/js/core/auth-service.js';
const SESSION_STORE = 'assets/js/core/session.js';
const USERS_REPOSITORY = 'assets/js/repositories/users-repository.js';
const AUTH_PAGE_CONTROLLER = 'assets/js/pages/auth.js';
const SUPABASE_CONFIG = 'assets/js/core/supabase-config.js';

const requiredFiles = [
  'assets/js/core/app-state.js',
  'assets/js/core/permissions.js',
  SESSION_STORE,
  CANONICAL_AUTH_SERVICE,
  'assets/js/core/page-bootstrap.js'
];

const pages = [
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
  while ((match = matcher.exec(html))) {
    sources.push(normalizeScriptPath(match[1], htmlPath));
  }
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
    if (index <= lastIndex) {
      errors.push(`${page} loads ${scriptPath} outside the canonical auth order`);
    }
    lastIndex = Math.max(lastIndex, index);
  }
};

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required auth/session file: ${file}`);
}

for (const page of pages) {
  const pagePath = path.join(root, page);
  if (!fs.existsSync(pagePath)) {
    errors.push(`Missing page: ${page}`);
    continue;
  }
  const html = fs.readFileSync(pagePath, 'utf8');
  for (const file of requiredFiles) {
    if (!html.includes(file)) errors.push(`${page} does not load ${file}`);
  }
  if (!/<body[^>]*data-page=/.test(html)) errors.push(`${page} is missing body[data-page]`);
}

const activeHtmlFiles = listActiveHtmlFiles();
let canonicalConsumerCount = 0;
for (const page of activeHtmlFiles) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const sources = readScriptSources(html, page);

  if (sources.includes(LEGACY_AUTH_SERVICE)) {
    errors.push(`${page} loads dormant legacy authority ${LEGACY_AUTH_SERVICE}`);
  }

  if (sources.includes(CANONICAL_AUTH_SERVICE)) {
    canonicalConsumerCount += 1;
    assertOrdered(sources, [SESSION_STORE, CANONICAL_AUTH_SERVICE], page);
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
  const html = fs.readFileSync(pagePath, 'utf8');
  const sources = readScriptSources(html, page);
  if (!sources.some((source) => source.includes('@supabase/supabase-js@2'))) {
    errors.push(`${page} does not load Supabase JS v2`);
  }
  assertOrdered(sources, [SUPABASE_CONFIG, SESSION_STORE, USERS_REPOSITORY, CANONICAL_AUTH_SERVICE, AUTH_PAGE_CONTROLLER], page);
}

const canonicalSource = fs.readFileSync(path.join(root, CANONICAL_AUTH_SERVICE), 'utf8');
for (const token of [
  'const api = Object.freeze({',
  'ns.service = api;',
  'Object.assign(ns, api);',
  'signInWithPassword',
  'signUp',
  'isSupabaseAuthRequired'
]) {
  if (!canonicalSource.includes(token)) {
    errors.push(`${CANONICAL_AUTH_SERVICE} is missing canonical authority token: ${token}`);
  }
}

const legacySource = fs.readFileSync(path.join(root, LEGACY_AUTH_SERVICE), 'utf8');
if (!legacySource.includes('doke.auth.session.v2') || !legacySource.includes('doke.auth.users.v1')) {
  errors.push(`${LEGACY_AUTH_SERVICE} no longer matches the identified dormant legacy implementation; review the authority classification`);
}

const shellCss = fs.readFileSync(path.join(root, 'assets/css/components/shell/mobile-app-shell.css'), 'utf8');
if (/body\.doke-mobile-shell-mounted \.doke-mobile-shell\s*{[\s\S]{0,120}position:\s*fixed\s*!important/.test(shellCss)) {
  errors.push('Mobile shell header is fixed/sticky. Expected non-sticky absolute shell.');
}

if (errors.length) {
  console.error('Auth/session contract audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Auth/session contract audit passed.');
console.log(`Checked files: ${requiredFiles.length}`);
console.log(`Checked baseline pages: ${pages.length}`);
console.log(`Checked active HTML pages: ${activeHtmlFiles.length}`);
console.log(`Canonical auth consumers: ${canonicalConsumerCount}`);
console.log(`Dormant legacy consumers: 0`);
