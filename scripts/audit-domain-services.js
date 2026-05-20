#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
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
  'configuracoes.html',
];
const serviceFiles = [
  'assets/js/services/profile-service.js',
  'assets/js/services/search-service.js',
  'assets/js/services/order-service.js',
  'assets/js/services/message-service.js',
  'assets/js/services/community-service.js',
  'assets/js/services/notification-service.js',
  'assets/js/services/wallet-service.js',
  'assets/js/services/domain-data-service.js',
];
const contracts = {
  'assets/js/services/profile-service.js': ['services.profile', 'getCurrentProfile'],
  'assets/js/services/search-service.js': ['services.search', 'fromLocationSearch'],
  'assets/js/services/order-service.js': ['services.orders', 'summary'],
  'assets/js/services/message-service.js': ['services.messages', 'listConversations'],
  'assets/js/services/community-service.js': ['services.communities', 'rankingPosition'],
  'assets/js/services/notification-service.js': ['services.notifications', 'unreadCount'],
  'assets/js/services/wallet-service.js': ['services.wallet', 'listTransactions'],
  'assets/js/services/domain-data-service.js': ['Doke.domainData', 'loadPageData'],
};
const errors = [];

for (const file of serviceFiles) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    errors.push(`Missing domain service file: ${file}`);
    continue;
  }
  const source = fs.readFileSync(full, 'utf8');
  for (const needle of contracts[file] || []) {
    if (!source.includes(needle)) errors.push(`${file} missing contract token: ${needle}`);
  }
}

const controllerData = path.join(root, 'assets/js/controllers/controller-data.js');
if (!fs.existsSync(controllerData)) {
  errors.push('Missing controller-data.js');
} else {
  const source = fs.readFileSync(controllerData, 'utf8');
  ['Doke.domainData.loadPageData', 'dataMode', 'domain-service'].forEach((needle) => {
    if (!source.includes(needle)) errors.push(`controller-data.js missing domain service integration: ${needle}`);
  });
}

for (const page of pages) {
  const full = path.join(root, page);
  if (!fs.existsSync(full)) {
    errors.push(`Missing page: ${page}`);
    continue;
  }
  const source = fs.readFileSync(full, 'utf8');
  const order = [
    'assets/js/services/mock-data-service.js',
    'assets/js/services/profile-service.js',
    'assets/js/services/search-service.js',
    'assets/js/services/order-service.js',
    'assets/js/services/message-service.js',
    'assets/js/services/community-service.js',
    'assets/js/services/notification-service.js',
    'assets/js/services/wallet-service.js',
    'assets/js/services/domain-data-service.js',
    'assets/js/controllers/controller-data.js',
  ];
  let previous = -1;
  for (const needle of order) {
    const index = source.indexOf(needle);
    if (index === -1) {
      errors.push(`${page} does not load ${needle}`);
      continue;
    }
    if (index <= previous) errors.push(`${page} loads ${needle} in the wrong order.`);
    previous = index;
  }
}

if (errors.length) {
  console.error('Domain services audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Domain services audit passed.');
console.log(`Pages checked: ${pages.length}`);
console.log(`Service files checked: ${serviceFiles.length}`);
