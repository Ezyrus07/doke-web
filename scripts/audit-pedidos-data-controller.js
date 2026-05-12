#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
function expect(condition, message) {
  if (!condition) failures.push(message);
}

const html = read('pedidos.html');
const controllerPath = 'assets/js/pages/pedidos-data-controller.js';
const controller = exists(controllerPath) ? read(controllerPath) : '';
const mockBoundary = read('assets/js/services/mock-data-boundary.js');
const mockProvider = read('assets/js/services/mock-repository-provider.js');

expect(exists(controllerPath), 'Missing pedidos data controller.');
expect(html.includes('data-orders-page-root'), 'pedidos.html must expose data-orders-page-root.');
expect(html.includes('data-page-key="pedidos"'), 'pedidos.html must expose data-page-key="pedidos".');
expect(html.includes('data-data-ready="orders"'), 'pedidos.html must expose data-data-ready="orders".');
expect(html.includes('data-orders-list'), 'pedidos.html must expose data-orders-list.');
expect(html.includes('data-list-region="orders"'), 'orders list must expose data-list-region="orders".');
expect(html.includes('data-list-kind="orders"'), 'orders list must expose data-list-kind="orders".');
expect((html.match(/data-order-card/g) || []).length >= 3, 'order cards must expose data-order-card hooks.');
expect((html.match(/data-order-id=/g) || []).length >= 3, 'order cards must expose data-order-id hooks.');
expect(html.includes('assets/js/pages/pedidos-data-controller.js'), 'pedidos.html must load pedidos-data-controller.js.');
expect(html.indexOf('assets/js/services/page-data-orchestrator.js') < html.indexOf('assets/js/pages/pedidos-data-controller.js'), 'page-data-orchestrator must load before pedidos-data-controller.');
expect(html.indexOf('assets/js/services/repository-boundary.js') < html.indexOf('assets/js/pages/pedidos-data-controller.js'), 'repository-boundary must load before pedidos-data-controller.');
expect(mockBoundary.includes("orders: 'assets/data/mocks/operations/orders.json'"), 'mock data boundary must register orders mock collection.');
expect(exists('assets/data/mocks/operations/orders.json'), 'Missing operations/orders.json mock collection.');
expect(mockProvider.includes("case 'pedidos':"), 'mock repository provider must support page data for pedidos.');
expect(controller.includes("getPageData('pedidos'"), 'pedidos data controller must use pageDataOrchestrator.getPageData("pedidos").');
expect(controller.includes('doke:orders-data-ready'), 'pedidos data controller must emit doke:orders-data-ready.');
expect(!/fetch\s*\(/.test(controller), 'pedidos data controller must not fetch directly.');
expect(!/localStorage|sessionStorage|firebase|supabase/i.test(controller), 'pedidos data controller must not access storage/backend directly.');
expect(!/style\s*=/.test(controller), 'pedidos data controller must not create inline styles.');

const report = {
  cycle: 37,
  name: 'pedidos data controller',
  checkedAt: new Date().toISOString(),
  failures,
  status: failures.length ? 'failed' : 'passed',
};
fs.mkdirSync(path.join(root, 'docs/validation'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/validation/global-cycle-37-pedidos-data-controller-report.json'), JSON.stringify(report, null, 2) + '\n');

if (failures.length) {
  console.error('Pedidos data controller audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Pedidos data controller audit passed.');
