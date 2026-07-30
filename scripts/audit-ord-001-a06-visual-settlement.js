'use strict';

const assert = require('assert');
const fs = require('fs');

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);

const requiredFiles = [
  'docs/ORD-001-A06-VISUAL-SETTLEMENT-PREFLIGHT.md',
  'docs/validation/ORD-001-A06-VISUAL-SETTLEMENT-PREFLIGHT.json',
  'scripts/audit-ord-001-a06-visual-settlement.js',
  'scripts/test-order-visual-settlement-runtime.js',
  '.github/workflows/ord-001-a06-visual-settlement.yml',
  'assets/js/core/runtime-config.js',
  'assets/js/repositories/orders-repository.js',
  'assets/js/services/orders-service.js',
  'package.json'
];

requiredFiles.forEach((file) => assert(exists(file), `Missing ORD-A06 asset: ${file}`));

const evidence = JSON.parse(read('docs/validation/ORD-001-A06-VISUAL-SETTLEMENT-PREFLIGHT.json'));
const runtime = read('assets/js/core/runtime-config.js');
const repository = read('assets/js/repositories/orders-repository.js');
const service = read('assets/js/services/orders-service.js');
const test = read('scripts/test-order-visual-settlement-runtime.js');
const workflow = read('.github/workflows/ord-001-a06-visual-settlement.yml');
const packageJson = JSON.parse(read('package.json'));

assert.strictEqual(evidence.domain, 'ORD-001');
assert.strictEqual(evidence.sublot, 'ORD-A06');
assert.strictEqual(evidence.status, 'preflight_complete_real_browser_canary_blocked');
assert.strictEqual(evidence.stagingObservation.readOnlyInspection, true);
assert.strictEqual(evidence.stagingObservation.authUsersTotal, 3);
assert.strictEqual(evidence.stagingObservation.historicalFixtureAccounts.client, false);
assert.strictEqual(evidence.stagingObservation.historicalFixtureAccounts.professional, false);
assert.strictEqual(evidence.stagingObservation.rowCounts.orders, 0);
assert.strictEqual(evidence.stagingObservation.rowCounts.budgets, 0);
assert.strictEqual(evidence.executionGate.realBrowserExecutionAllowed, false);
assert.strictEqual(evidence.executionGate.realAccountsUsed, 0);
assert.strictEqual(evidence.executionGate.networkRequestsPerformed, false);
assert.strictEqual(evidence.executionGate.mutationsPerformed, false);
assert.strictEqual(evidence.operationalSafety.productionChanged, false);
assert.strictEqual(evidence.operationalSafety.mergeAuthorized, false);

assert(runtime.includes("ordersReadProvider"), 'Runtime must expose an independent ordersReadProvider.');
assert(runtime.includes("ordersReadProviderStorageKey"), 'Runtime must expose the read-provider storage key.');
assert(runtime.includes("SUPABASE_READ: 'supabase-read'"));
assert(runtime.includes("API_WRITE_CANARY: 'api-write-canary-frontend-activation'"));

assert(repository.includes("config.ordersReadProvider || config.ordersProvider"), 'Repository must read from ordersReadProvider before the command provider.');
assert(repository.includes("remoteReadActive: remoteReadActive"));
assert(!repository.includes('Usando fallback local'));

assert(service.includes("readProvider: 'doke.canary.ordersWrite.readProvider'"), 'Write-canary storage must preserve the read provider.');
assert(service.includes('resolveOrdersReadProvider'));
assert(service.includes('ordersReadProvider: ordersReadProvider'));
assert(service.includes('readProvider: ordersReadProvider'));
assert(service.includes('ordersRemoteReadActive: ordersRemoteReadActive'));
assert(service.includes('fallbackProvider: mockDevelopmentActive ? \'mock-development\' : \'none\''));

assert(test.includes('Browser contexts must not share storage.'));
assert(test.includes("provider.ordersRemoteReadActive, true"));
assert(test.includes("provider.ordersWriteCanaryActive, true"));
assert(test.includes("clientQuoted.status, 'quoted'"));
assert(test.includes("rollbackOrdersWriteCanary"));
assert(!test.includes('STAGING_E2E_DEFAULT_USERS'));
assert(!test.includes('cliente@doke.local'));
assert(!test.includes('profissional@doke.local'));

assert.strictEqual(
  packageJson.scripts['audit:ord-001-a06-visual-settlement'],
  'node scripts/audit-ord-001-a06-visual-settlement.js'
);
assert.strictEqual(
  packageJson.scripts['test:order-visual-settlement-runtime'],
  'node scripts/test-order-visual-settlement-runtime.js'
);

assert(workflow.includes('permissions:\n  contents: read'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('DOKE_ORD_A06_CLIENT_PASSWORD'));
assert(!workflow.includes('DOKE_ORD_A06_PROFESSIONAL_PASSWORD'));
assert(workflow.includes('node scripts/test-order-visual-settlement-runtime.js'));
assert(workflow.includes('node scripts/test-order-command-activation-runtime.js'));
assert(workflow.includes('node scripts/test-order-read-authority-runtime.js'));
assert(workflow.includes('node scripts/audit-domain-completion-matrix.js'));

console.log('ORD-A06 visual settlement preflight audit passed.');
