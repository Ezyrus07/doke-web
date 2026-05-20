#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'assets/js/core/dom.js',
  'assets/js/core/events.js',
  'assets/js/core/view-state.js',
  'assets/js/controllers/page-controller-registry.js',
  'assets/js/controllers/controller-bootstrap.js',
  'assets/js/renderers/service-card-renderer.js',
  'assets/js/renderers/order-card-renderer.js',
  'assets/js/renderers/community-card-renderer.js',
  'assets/js/renderers/notification-renderer.js'
];

const pages = {
  'index.html': 'index-controller.js',
  'resultados.html': 'resultados-controller.js',
  'pedidos.html': 'pedidos-controller.js',
  'mensagens.html': 'mensagens-controller.js',
  'comunidade.html': 'comunidade-controller.js',
  'perfil.html': 'perfil-controller.js',
  'carteira.html': 'wallet-controller.js',
  'notificacoes.html': 'notificacoes-controller.js',
  'configuracoes.html': 'configuracoes-controller.js'
};

const errors = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing JS foundation file: ${file}`);
}

for (const [html, controller] of Object.entries(pages)) {
  const full = path.join(root, html);
  if (!fs.existsSync(full)) {
    errors.push(`Missing page: ${html}`);
    continue;
  }
  const source = fs.readFileSync(full, 'utf8');
  ['assets/js/core/dom.js', 'assets/js/core/events.js', 'assets/js/core/view-state.js', 'assets/js/controllers/page-controller-registry.js', `assets/js/controllers/${controller}`, 'assets/js/controllers/controller-bootstrap.js'].forEach((needle) => {
    if (!source.includes(needle)) errors.push(`${html} does not load ${needle}`);
  });
}

const rendererSources = [
  'assets/js/renderers/service-card-renderer.js',
  'assets/js/renderers/order-card-renderer.js',
  'assets/js/renderers/community-card-renderer.js',
  'assets/js/renderers/notification-renderer.js'
].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

['doke-card', 'doke-btn', 'data-domain-card'].forEach((contract) => {
  if (!rendererSources.includes(contract)) errors.push(`Renderers do not preserve UI contract: ${contract}`);
});

if (errors.length) {
  console.error('JS foundation audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('JS foundation audit passed.');
console.log(`Pages checked: ${Object.keys(pages).length}`);
console.log(`Foundation files checked: ${requiredFiles.length}`);
