#!/usr/bin/env node
'use strict';

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

function requireSnippet(file, snippet) {
  const content = read(file);
  if (!content.includes(snippet)) failures.push(`${file} missing snippet: ${snippet}`);
}

function requireJs(file) {
  try {
    return require(path.join(root, file));
  } catch (error) {
    failures.push(`${file} cannot be required: ${error.message}`);
    return null;
  }
}

const orderHandlers = read('backend/modules/orders/route-handlers.js');
[
  'handlers.listOrders = createActionHandler',
  'handlers.getOrder = createActionHandler',
  'handlers.createOrder = createActionHandler',
  'handlers.acceptOrder = createActionHandler',
  'handlers.declineOrder = createActionHandler',
  'handlers.sendQuote = createActionHandler',
  'handlers.sendCharge = createActionHandler',
  'handlers.startOrder = createActionHandler',
  'handlers.completeOrder = createActionHandler',
  'handlers.updateOrderStatus = createActionHandler'
].forEach((snippet) => {
  if (!orderHandlers.includes(snippet)) failures.push(`orders route handlers missing ${snippet}`);
});

[
  'listOrders',
  'getOrder',
  'createOrder',
  'acceptOrder',
  'declineOrder',
  'sendQuote',
  'sendCharge',
  'startOrder',
  'completeOrder',
  'updateOrderStatus',
  "from('orders')",
  "from('budgets')",
  "from('order_status_history')",
  'assertOrderAccess',
  'assertProfessionalOrderAccess',
  'normalizeBackendStatus'
].forEach((snippet) => requireSnippet('backend/modules/orders/orders-service.js', snippet));

const registry = requireJs('backend/shared/http/route-registry.js');
const loader = requireJs('backend/shared/http/module-route-loader.js');
if (registry && loader) {
  const orderRoutes = registry.listRoutesByModule('orders');
  orderRoutes.forEach((route) => {
    const handler = loader.getHandler('orders', route.handler);
    if (typeof handler !== 'function') failures.push(`orders handler not loaded: ${route.handler}`);
  });
}

requireSnippet('docs/STAGING-API-RUNTIME.md', 'Sprint 18');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'GET /orders');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'POST /orders/:id/accept');
requireSnippet('docs/API-ENDPOINT-READINESS.md', 'orders runtime');
requireSnippet('docs/BACKEND-INTEGRATION-PLAN.md', 'Sprint 18');
requireSnippet('docs/DATA-READY-CONTRACTS.md', 'audit:staging-orders-runtime');

const packageJson = JSON.parse(read('package.json') || '{}');
if (!packageJson.scripts || packageJson.scripts['audit:staging-orders-runtime'] !== 'node scripts/audit-staging-orders-runtime.js') {
  failures.push('package.json missing audit:staging-orders-runtime script.');
}

if (failures.length) {
  console.error('audit:staging-orders-runtime failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('audit:staging-orders-runtime passed');
