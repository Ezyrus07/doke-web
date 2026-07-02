#!/usr/bin/env node
/* Audit: operational event toast contract
 * Ensures the global toast authority is loaded consistently and not duplicated in app.js. */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const fail = [];
const version = '20260702-sidebar-quick-alert-flow-v1';
const componentPath = 'assets/js/components/operational-event-toast.js';
const cssPath = 'assets/css/components/feedback/notification-event-toast.css';
const appPath = 'assets/js/core/app.js';

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function listRootHtml() {
  return fs.readdirSync(root)
    .filter((name) => name.endsWith('.html'))
    .sort();
}

if (!exists(componentPath)) fail.push(`${componentPath}: autoridade JS do toast operacional ausente.`);
if (!exists(cssPath)) fail.push(`${cssPath}: autoridade CSS do toast operacional ausente.`);

if (exists(componentPath)) {
  const js = read(componentPath);
  [
    'doke:notification-created',
    'doke:message-sent',
    'doke:order-created',
    'doke:order-status-changed',
    'addEventListener(\'storage\'',
    'Doke.operationalEventToast',
    'data-operational-event-toast',
    'doke:auth-session-change',
    'doke:auth-surface-ready',
    'showSessionDigest',
    'sessionStorage'
  ].forEach((needle) => {
    if (!js.includes(needle)) fail.push(`${componentPath}: contrato obrigatório não encontrado: ${needle}`);
  });
}

if (exists(appPath)) {
  const app = read(appPath);
  if (app.includes('showOperationalToast')) fail.push(`${appPath}: app.js não deve manter implementação própria de toast.`);
  if (app.includes('doke-event-toast__copy')) fail.push(`${appPath}: markup de toast deve pertencer ao componente operacional.`);
  if (!app.includes('window.Doke.syncOperationalBadges = syncSidebarOperationalBadges')) {
    fail.push(`${appPath}: sync de badges deve ser exposto para o componente operacional.`);
  }
}

if (exists(cssPath)) {
  const css = read(cssPath);
  if (css.includes('!important')) fail.push(`${cssPath}: toast operacional não pode usar !important.`);
  ['.doke-event-toast-region', '.doke-event-toast__action', '.doke-event-toast--messages', '.doke-event-toast--orders'].forEach((needle) => {
    if (!css.includes(needle)) fail.push(`${cssPath}: regra esperada ausente: ${needle}`);
  });
}

const coreComponents = read('assets/css/core/components.css');
if (!coreComponents.includes(`notification-event-toast.css?v=${version}`)) {
  fail.push(`assets/css/core/components.css: notification-event-toast.css deve usar v=${version}.`);
}

const htmlFiles = listRootHtml();
htmlFiles.forEach((file) => {
  const html = read(file);
  if (!html.includes('assets/js/core/app.js')) return;
  const appIndex = html.indexOf('assets/js/core/app.js');
  const toastIndex = html.indexOf(`assets/js/components/operational-event-toast.js?v=${version}`);
  if (toastIndex === -1) fail.push(`${file}: deve carregar ${componentPath} com v=${version}.`);
  if (toastIndex !== -1 && toastIndex < appIndex) fail.push(`${file}: operational-event-toast.js deve carregar depois de app.js.`);
});

if (fail.length) {
  console.error('Operational event toast contract failed:\n' + fail.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`Operational event toast contract passed (${htmlFiles.length} root HTML files checked).`);
