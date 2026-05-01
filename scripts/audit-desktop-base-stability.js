#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade-interna.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html',
];

const cssPath = 'assets/css/components/shell/desktop-base-stability.css';
const css = fs.readFileSync(path.join(root, cssPath), 'utf8');
const failures = [];

function requireText(name, source, value) {
  if (!source.includes(value)) failures.push(`${name} missing: ${value}`);
}

requireText(cssPath, css, '@media (min-width: 761px)');
requireText(cssPath, css, '.sidebar[data-shell-sidebar]');
requireText(cssPath, css, '.topbar-search');
requireText(cssPath, css, '.doke-desktop-search-panel');
requireText(cssPath, css, '.doke-grid');
requireText(cssPath, css, '.doke-mobile-shell__bottom-nav');

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  if (!html.includes(cssPath)) failures.push(`${page} does not load ${cssPath}`);
  if (!html.includes('assets/css/components/shell/responsive-boundary.css')) {
    failures.push(`${page} missing responsive-boundary.css before desktop stability`);
  }
  if (!html.includes('data-shell-sidebar')) failures.push(`${page} missing data-shell-sidebar`);
  if (!html.includes('topbar')) failures.push(`${page} missing desktop topbar`);
}

if (failures.length) {
  console.error('Desktop base stability audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Desktop base stability audit passed.');
console.log(`Pages checked: ${pages.length}`);
