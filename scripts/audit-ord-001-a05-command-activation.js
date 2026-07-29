'use strict';

const assert = require('assert');
const fs = require('fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
const evidence = JSON.parse(read('docs/validation/ORD-001-A05-COMMAND-ACTIVATION.json'));
const migration = read('supabase/migrations/20260729223000_ord_a05_explicit_persona_precedence.sql');
const browser = read('assets/js/services/orders-service.js');
const runtime = read('scripts/test-order-command-activation-runtime.js');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');

assert(ord, 'ORD-001 matrix entry is required.');
assert(Number(matrix.version.split('.').pop()) >= 16, 'Matrix version must include ORD-A05.');
assert(ord.requiredPaths.includes('docs/ORD-001-COMMAND-ACTIVATION-CANARY.md'));
assert(ord.requiredPaths.includes('docs/validation/ORD-001-A05-COMMAND-ACTIVATION.json'));
assert(ord.requiredPaths.includes('supabase/migrations/20260729223000_ord_a05_explicit_persona_precedence.sql'));
assert(ord.tests.includes('audit:ord-001-a05-command-activation'));
assert(ord.tests.includes('test:order-command-activation-runtime'));

const blocker = ord.blockers.find((item) => item.id === 'ORD-B02');
assert(blocker, 'ORD-B02 must remain until the real two-account browser canary is complete.');
assert(/real|browser|two-account|duas contas/i.test(blocker.description), 'ORD-B02 must describe the remaining real browser canary.');
assert.strictEqual(ord.userFacingAuthority, 'hybrid');
assert.strictEqual(ord.productionGate, 'blocked');

assert(migration.includes("v_jwt_role = 'service_role'"));
assert(migration.includes('elsif v_actor_id is not null'));
assert(migration.includes("raise exception using errcode = '42501', message = 'DOKE_ORDER_PARTICIPANT_REQUIRED'"));
assert(migration.includes("elsif session_user in ('postgres', 'supabase_admin', 'service_role')"));

assert(browser.includes('DOKE_ORDER_CANARY_AUTH_REQUIRED'), 'Canary must fail explicitly without an authenticated token.');
assert(browser.includes("headers.Authorization = 'Bearer ' + token"), 'Every canary mutation must use a bearer token.');
assert(browser.includes("Doke.session && typeof Doke.session.getSession === 'function'"), 'Canonical Doke session must be a token source.');
assert(browser.includes('idempotencyKey: extractIdempotencyKey(payload)'), 'Quote action must preserve its idempotency key.');

assert(runtime.includes("'Bearer token-client'"));
assert(runtime.includes("'Bearer token-professional'"));
assert(runtime.includes('DOKE_ORDER_CANARY_AUTH_REQUIRED'));
assert(runtime.includes("'/orders/order_api_1/quote'"));

assert.strictEqual(evidence.status, 'technical_canary_complete');
assert.strictEqual(evidence.stagingRollbackCanary.realAccountsUsed, 0);
assert.strictEqual(evidence.stagingRollbackCanary.thirdPartyTransition.blocked, true);
assert.strictEqual(evidence.stagingRollbackCanary.staleTransition.sqlstate, '40001');
assert.strictEqual(evidence.stagingRollbackCanary.zeroResidue.orders, 0);
assert.strictEqual(evidence.browserRuntime.authorizationHeaderRequired, true);
assert.strictEqual(evidence.manualFollowup.realTwoAccountBrowserCanary, 'pending');
assert.strictEqual(evidence.matrix.frontendActivationBlockerRemaining, true);
assert.strictEqual(evidence.operationalSafety.productionChanged, false);

console.log('ORD-A05 command activation audit passed.');
