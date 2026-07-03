#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing file: ${file}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function requireSnippets(file, snippets) {
  const content = read(file);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${file} missing snippet: ${snippet}`);
  }
}

requireSnippets('assets/js/services/orders-service.js', [
  'getOrdersProviderStatus',
  'shouldUseOrdersApi',
  "boundary.list('orders'",
  "boundary.create('orders'",
  "boundary.action('orders'",
  'ordersBoundaryAction',
  'provider: \'api\''
]);

requireSnippets('assets/js/services/api-repository-provider.js', [
  "decline: '/orders/:id/decline'",
  "quote: '/orders/:id/quote'",
  "start: '/orders/:id/start'",
  "updateStatus: '/orders/:id/status'"
]);

requireSnippets('assets/js/services/mock-repository-provider.js', [
  'mockOrderCreate',
  'mockOrderUpdate',
  'mockOrderAction',
  "getResourceName(resourceName) === 'orders'"
]);

requireSnippets('assets/js/repositories/orders-repository.js', [
  'normalizeStatus',
  "requested: 'pending'",
  "charged: 'quoted'",
  'backendStatus'
]);

for (const file of ['pedidos.html', 'mensagens.html', 'orcamento.html', 'pagamento-profissional.html', 'admin.html']) {
  requireSnippets(file, [
    'assets/js/services/repository-boundary.js',
    'assets/js/services/mock-repository-provider.js',
    'assets/js/services/api-repository-provider.js'
  ]);
}

requireSnippets('docs/API-ADAPTER-CONTRACT.md', [
  'Sprint 12C',
  'POST /orders/:id/decline',
  'POST /orders/:id/status'
]);

requireSnippets('docs/BACKEND-INTEGRATION-PLAN.md', [
  'Sprint 12C',
  'Pedidos reais controlados',
  'Mensagens reais'
]);

const packageJson = read('package.json');
try {
  const parsed = JSON.parse(packageJson);
  if (!parsed.scripts || parsed.scripts['audit:orders-api-contract'] !== 'node scripts/audit-orders-api-contract.js') {
    failures.push('package.json missing audit:orders-api-contract script.');
  }
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Orders API contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Orders API contract audit passed.');
console.log('Orders provider default remains mock; API path is controlled by repositoryBoundary.');
