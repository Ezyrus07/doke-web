#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pages = {
  'index.html': 'index-controller.js',
  'resultados.html': 'resultados-controller.js',
  'pedidos.html': 'pedidos-controller.js',
  'mensagens.html': 'mensagens-controller.js',
  'comunidade.html': 'comunidade-controller.js',
  'comunidade-interna.html': 'comunidade-interna-controller.js',
  'perfil.html': 'perfil-controller.js',
  'carteira.html': 'wallet-controller.js',
  'notificacoes.html': 'notificacoes-controller.js',
  'configuracoes.html': 'configuracoes-controller.js',
};

const requiredFiles = [
  'assets/js/services/mock-data-service.js',
  'assets/js/controllers/controller-data.js',
  'assets/data/mock-users.json',
  'assets/data/mock-services.json',
  'assets/data/mock-orders.json',
  'assets/data/mock-messages.json',
  'assets/data/mock-communities.json',
  'assets/data/mock-notifications.json',
  'assets/data/mock-wallet.json',
];

const errors = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing mock/controller dependency: ${file}`);
}

for (const [html, controller] of Object.entries(pages)) {
  const htmlPath = path.join(root, html);
  if (!fs.existsSync(htmlPath)) {
    errors.push(`Missing page: ${html}`);
    continue;
  }
  const source = fs.readFileSync(htmlPath, 'utf8');
  [
    'assets/js/services/mock-data-service.js',
    'assets/js/controllers/controller-data.js',
    `assets/js/controllers/${controller}`,
    'assets/js/controllers/controller-bootstrap.js',
  ].forEach((needle) => {
    if (!source.includes(needle)) errors.push(`${html} does not load ${needle}`);
  });

  const mockIndex = source.indexOf('assets/js/services/mock-data-service.js');
  const dataIndex = source.indexOf('assets/js/controllers/controller-data.js');
  const controllerIndex = source.indexOf(`assets/js/controllers/${controller}`);
  const bootstrapIndex = source.indexOf('assets/js/controllers/controller-bootstrap.js');
  if (!(mockIndex >= 0 && dataIndex > mockIndex && controllerIndex > dataIndex && bootstrapIndex > controllerIndex)) {
    errors.push(`${html} loads mock/controller scripts in the wrong order.`);
  }
}

const serviceSource = fs.existsSync(path.join(root, 'assets/js/services/mock-data-service.js'))
  ? fs.readFileSync(path.join(root, 'assets/js/services/mock-data-service.js'), 'utf8')
  : '';
['Doke.mockData', 'loadMany', 'listResources', 'clearCache'].forEach((contract) => {
  if (!serviceSource.includes(contract)) errors.push(`mock-data-service.js missing contract: ${contract}`);
});

const controllerDataSource = fs.existsSync(path.join(root, 'assets/js/controllers/controller-data.js'))
  ? fs.readFileSync(path.join(root, 'assets/js/controllers/controller-data.js'), 'utf8')
  : '';
['Doke.controllerData', 'pageResources', 'loadForPage', 'dataStatus'].forEach((contract) => {
  if (!controllerDataSource.includes(contract)) errors.push(`controller-data.js missing contract: ${contract}`);
});

for (const controller of Object.values(pages)) {
  const file = path.join(root, 'assets/js/controllers', controller);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('Doke.controllerData.loadForPage')) {
    errors.push(`${controller} is not wired to Doke.controllerData.loadForPage`);
  }
}

if (errors.length) {
  console.error('Controller/mock wiring audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Controller/mock wiring audit passed.');
console.log(`Pages checked: ${Object.keys(pages).length}`);
console.log(`Mock files checked: ${requiredFiles.length}`);
