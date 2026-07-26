#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
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
  'assets/js/services/profile-service.js': ['services.profile', 'getCurrentProfile', 'refreshCurrentProfile'],
  'assets/js/services/search-service.js': ['services.search', 'fromLocationSearch'],
  'assets/js/services/order-service.js': ['services.orders', 'summary'],
  'assets/js/services/message-service.js': ['services.messages', 'listConversations'],
  'assets/js/services/community-service.js': ['services.communities', 'rankingPosition'],
  'assets/js/services/notification-service.js': ['services.notifications', 'unreadCount'],
  'assets/js/services/wallet-service.js': ['services.wallet', 'listTransactions'],
  'assets/js/services/domain-data-service.js': ['Doke.domainData', 'loadPageData'],
};
const optionalServicesByPage = {
  'index.html': new Set([
    'assets/js/services/message-service.js',
    'assets/js/services/wallet-service.js',
  ]),
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
  const positions = new Map();
  const optionalServices = optionalServicesByPage[page] || new Set();
  for (const needle of order) {
    const index = source.lastIndexOf(needle);
    positions.set(needle, index);
    if (index === -1 && !optionalServices.has(needle)) {
      errors.push(`${page} does not load ${needle}`);
    }
  }
  const domainDataIndex = positions.get('assets/js/services/domain-data-service.js');
  const controllerDataIndex = positions.get('assets/js/controllers/controller-data.js');
  const dependencyIndexes = order.slice(0, -2).map((needle) => positions.get(needle)).filter((index) => index >= 0);
  if (domainDataIndex >= 0 && dependencyIndexes.some((index) => index > domainDataIndex)) {
    errors.push(`${page} loads domain-data-service.js before one of its domain dependencies.`);
  }
  if (controllerDataIndex >= 0 && domainDataIndex >= 0 && controllerDataIndex <= domainDataIndex) {
    errors.push(`${page} loads controller-data.js before domain-data-service.js.`);
  }
}

if (errors.length) {
  console.error('Domain services audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

execFileSync(process.execPath, [path.join(root, 'scripts/audit-auth-profile-reconciliation-contract.js')], {
  cwd: root,
  stdio: 'inherit'
});
execFileSync(process.execPath, [path.join(root, 'tests/auth/test-auth-profile-reconciliation-runtime.js')], {
  cwd: root,
  stdio: 'inherit'
});

console.log('Domain services audit passed.');
console.log(`Pages checked: ${pages.length}`);
console.log(`Service files checked: ${serviceFiles.length}`);
