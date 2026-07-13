#!/usr/bin/env node
/* Doke order transaction cycle gate.
   Responsibility: enforce canonical order states and run every transactional contract as one release gate. */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const serviceSource = fs.readFileSync(path.join(root, 'assets/js/services/orders-service.js'), 'utf8');
const productSources = [
  'assets/js/pages/pedidos-local-orders.js',
  'assets/js/pages/pedidos/orders-data.js',
  'assets/js/pages/mensagens.js',
  'assets/js/components/operational-event-toast.js'
].map((file) => ({ file, source: fs.readFileSync(path.join(root, file), 'utf8') }));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(serviceSource.includes("conversation: 'accepted'"), 'Alias conversation -> accepted precisa estar declarado na máquina canônica.');
assert(serviceSource.includes("responded: 'quoted'"), 'Alias responded -> quoted precisa estar declarado na máquina canônica.');
assert(serviceSource.includes("statuses: Object.freeze(['pending', 'accepted', 'quoted', 'in_progress', 'completed', 'cancelled'])"), 'Catálogo canônico de estados está ausente.');
assert(!/\n\s{4}conversation:\s*Object\.freeze\(\{/.test(serviceSource), 'conversation não pode continuar como nó operacional da máquina de estados.');
assert(serviceSource.includes('normalizeStatus: normalizeStatusToken'), 'Normalizador canônico precisa estar exposto pelo service.');

productSources.forEach(({ file, source }) => {
  assert(/normalizeStatus|normalizeOrderStatus/.test(source), `${file} precisa normalizar estados na fronteira de leitura.`);
});

const contracts = [
  'test-orders-role-reload-contract.js',
  'test-order-proposal-approval-contract.js',
  'test-order-charge-creation-contract.js',
  'test-order-payment-hold-contract.js',
  'test-order-completion-release-contract.js',
  'test-order-cancellation-dispute-contract.js',
  'test-order-review-contract.js',
  'test-main-marketplace-cycle-contract.js'
];

for (const contract of contracts) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', contract)], {
    cwd: root,
    encoding: 'utf8'
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert(result.status === 0, `Contrato transacional falhou: ${contract}`);
}

console.log(JSON.stringify({
  canonicalStates: ['pending', 'accepted', 'quoted', 'in_progress', 'completed', 'cancelled'],
  legacyAliases: { conversation: 'accepted', responded: 'quoted' },
  contractsPassed: contracts.length,
  transactionCycleGate: true
}, null, 2));
