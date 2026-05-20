#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'assets/js/core/app-state.js',
  'assets/js/core/permissions.js',
  'assets/js/core/session.js',
  'assets/js/services/auth-service.js',
  'assets/js/core/page-bootstrap.js'
];

const pages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html'
];

const errors = [];
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
console.log(`Checked pages: ${pages.length}`);
