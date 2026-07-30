#!/usr/bin/env python3
import json
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, content):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_once(source, old, new, label):
    if new in source:
        return source
    if old not in source:
        raise SystemExit(f'Missing patch anchor: {label}')
    return source.replace(old, new, 1)


write('backend/shared/security/request-freshness-contract.js', r'''\
'use strict';

const crypto = require('crypto');

const REQUEST_ISSUED_AT_HEADER = 'x-doke-request-issued-at';
const REQUEST_NONCE_HEADER = 'x-doke-request-nonce';
const MAX_REQUEST_AGE_MS = 5 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 30 * 1000;
const NONCE_PATTERN = /^ord-[A-Za-z0-9._:-]{16,160}$/;

function readHeader(headers, name) {
  const normalized = String(name || '').toLowerCase();
  const source = headers || {};
  const key = Object.keys(source).find((candidate) => candidate.toLowerCase() === normalized);
  return key ? source[key] : '';
}

function assertRequestFreshness(context) {
  const headers = context && context.headers || {};
  const issuedAtRaw = String(readHeader(headers, REQUEST_ISSUED_AT_HEADER) || '').trim();
  const nonce = String(readHeader(headers, REQUEST_NONCE_HEADER) || '').trim();
  if (!issuedAtRaw || !nonce) {
    throw freshnessError('DOKE_REQUEST_FRESHNESS_REQUIRED', `Missing required ${REQUEST_ISSUED_AT_HEADER} or ${REQUEST_NONCE_HEADER} header.`, 428);
  }
  const issuedAtMs = Date.parse(issuedAtRaw);
  const nowMs = Date.parse(context && context.now || new Date().toISOString());
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(nowMs)) {
    throw freshnessError('DOKE_REQUEST_FRESHNESS_INVALID', 'Request freshness timestamps must be valid ISO-8601 values.', 400);
  }
  if (!NONCE_PATTERN.test(nonce)) {
    throw freshnessError('DOKE_REQUEST_NONCE_INVALID', 'Request nonce does not match the ORD-A07 contract.', 400);
  }
  const ageMs = nowMs - issuedAtMs;
  if (ageMs > MAX_REQUEST_AGE_MS) {
    throw freshnessError('DOKE_REQUEST_EXPIRED', 'Request is older than the five-minute mutation window.', 408);
  }
  if (ageMs < -MAX_FUTURE_SKEW_MS) {
    throw freshnessError('DOKE_REQUEST_FROM_FUTURE', 'Request timestamp exceeds the allowed clock skew.', 400);
  }
  return Object.freeze({
    issuedAt: new Date(issuedAtMs).toISOString(),
    ageMs,
    nonceSha256: crypto.createHash('sha256').update(nonce).digest('hex')
  });
}

function freshnessError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

module.exports = Object.freeze({
  REQUEST_ISSUED_AT_HEADER,
  REQUEST_NONCE_HEADER,
  MAX_REQUEST_AGE_MS,
  MAX_FUTURE_SKEW_MS,
  NONCE_PATTERN,
  assertRequestFreshness
});
''')

handler_path = 'backend/shared/http/create-action-handler.js'
handler = read(handler_path)
handler = replace_once(handler, "const { assertIdempotencyKey } = require('../security/idempotency-contract');\n", "const { assertIdempotencyKey } = require('../security/idempotency-contract');\nconst { assertRequestFreshness } = require('../security/request-freshness-contract');\n", 'freshness import')
handler = replace_once(handler, "    assertRoutePermission(route, actor, requestContext);\n    const idempotencyKey = route.idempotencyRequired ? assertIdempotencyKey(requestContext) : '';\n", "    assertRoutePermission(route, actor, requestContext);\n    const requestFreshness = route.requestFreshnessRequired ? assertRequestFreshness(requestContext) : null;\n    const idempotencyKey = route.idempotencyRequired ? assertIdempotencyKey(requestContext) : '';\n", 'freshness before idempotency')
handler = replace_once(handler, "        actor,\n        idempotencyKey\n", "        actor,\n        idempotencyKey,\n        requestFreshness\n", 'freshness execution context')
write(handler_path, handler)

registry_path = 'backend/shared/http/route-registry.js'
registry = read(registry_path)
replacements = [
    ("route('orders.create', 'POST', '/orders', 'orders', 'createOrder', ['client'], 'order_client', true, true),", "route('orders.create', 'POST', '/orders', 'orders', 'createOrder', ['client'], 'order_client', true, true, false, true),"),
    ("route('orders.accept', 'POST', '/orders/:id/accept', 'orders', 'acceptOrder', ['professional'], 'order_professional', true, true),", "route('orders.accept', 'POST', '/orders/:id/accept', 'orders', 'acceptOrder', ['professional'], 'order_professional', true, true, false, true),"),
    ("route('orders.decline', 'POST', '/orders/:id/decline', 'orders', 'declineOrder', ['professional'], 'order_professional', true, true),", "route('orders.decline', 'POST', '/orders/:id/decline', 'orders', 'declineOrder', ['professional'], 'order_professional', true, true, false, true),"),
    ("route('orders.quote', 'POST', '/orders/:id/quote', 'orders', 'sendQuote', ['professional'], 'order_professional', true, true),", "route('orders.quote', 'POST', '/orders/:id/quote', 'orders', 'sendQuote', ['professional'], 'order_professional', true, true, false, true),"),
    ("route('orders.charge', 'POST', '/orders/:id/charge', 'orders', 'sendCharge', ['professional'], 'order_professional', true, true),", "route('orders.charge', 'POST', '/orders/:id/charge', 'orders', 'sendCharge', ['professional'], 'order_professional', true, true, false, true),"),
    ("route('orders.start', 'POST', '/orders/:id/start', 'orders', 'startOrder', ['professional'], 'order_professional', true, true),", "route('orders.start', 'POST', '/orders/:id/start', 'orders', 'startOrder', ['professional'], 'order_professional', true, true, false, true),"),
    ("route('orders.complete', 'POST', '/orders/:id/complete', 'orders', 'completeOrder', ['professional'], 'order_professional', true, true),", "route('orders.complete', 'POST', '/orders/:id/complete', 'orders', 'completeOrder', ['professional'], 'order_professional', true, true, false, true),"),
    ("route('orders.updateStatus', 'POST', '/orders/:id/status', 'orders', 'updateOrderStatus', ['support', 'admin'], 'internal_operator', true, true, true),", "route('orders.updateStatus', 'POST', '/orders/:id/status', 'orders', 'updateOrderStatus', ['support', 'admin'], 'internal_operator', true, true, true, true),")
]
for old, new in replacements:
    registry = replace_once(registry, old, new, old[:40])
registry = replace_once(registry, 'function route(name, method, path, module, handler, allowedRoles, scope, idempotencyRequired, auditRequired, serviceRoleRequired) {', 'function route(name, method, path, module, handler, allowedRoles, scope, idempotencyRequired, auditRequired, serviceRoleRequired, requestFreshnessRequired) {', 'route signature')
registry = replace_once(registry, "    serviceRoleRequired: Boolean(serviceRoleRequired),\n    authorizationGate: 'backend_route_guard',\n", "    serviceRoleRequired: Boolean(serviceRoleRequired),\n    requestFreshnessRequired: Boolean(requestFreshnessRequired),\n    authorizationGate: 'backend_route_guard',\n", 'route freshness property')
write(registry_path, registry)

node_server_path = 'backend/runtime/staging/node-http-server.js'
node_server = read(node_server_path)
node_server = replace_once(node_server, "const ALLOWED_HEADERS = 'authorization,content-type,x-idempotency-key,x-request-id,apikey';", "const ALLOWED_HEADERS = 'authorization,content-type,x-idempotency-key,x-request-id,x-doke-request-issued-at,x-doke-request-nonce,apikey';", 'CORS headers')
write(node_server_path, node_server)

orders_path = 'assets/js/services/orders-service.js'
orders = read(orders_path)
helpers = r'''

  function createOrdersWriteRequestNonce() {
    var cryptoApi = root.crypto || root.msCrypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return 'ord-' + cryptoApi.randomUUID();
    if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
      var bytes = new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      return 'ord-' + Array.prototype.map.call(bytes, function (value) {
        return value.toString(16).padStart(2, '0');
      }).join('');
    }
    return 'ord-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  function createOrdersWriteFreshnessHeaders() {
    return {
      issuedAt: new Date().toISOString(),
      nonce: createOrdersWriteRequestNonce()
    };
  }
'''
orders = replace_once(orders, "  function ordersWriteCanaryRequest(path, payload, idempotencyKey) {\n", helpers + "\n  function ordersWriteCanaryRequest(path, payload, idempotencyKey) {\n", 'frontend helpers')
orders = replace_once(orders, "      var headers = {\n        Accept: 'application/json',\n        'Content-Type': 'application/json',\n        'x-idempotency-key': idempotencyKey\n      };\n", "      var freshness = createOrdersWriteFreshnessHeaders();\n      var headers = {\n        Accept: 'application/json',\n        'Content-Type': 'application/json',\n        'x-idempotency-key': idempotencyKey,\n        'x-doke-request-issued-at': freshness.issuedAt,\n        'x-doke-request-nonce': freshness.nonce\n      };\n", 'frontend headers')
write(orders_path, orders)

store_path = 'backend/shared/security/persistent-idempotency-store.js'
store = read(store_path)
store = replace_once(store, 'if (existing) return evaluateExistingEntry(existing, route, actorId, requestHash);', 'if (existing) return evaluateExistingEntry(existing, route, actorId, requestHash, context);', 'existing context')
store = replace_once(store, 'if (racedEntry) return evaluateExistingEntry(racedEntry, route, actorId, requestHash);', 'if (racedEntry) return evaluateExistingEntry(racedEntry, route, actorId, requestHash, context);', 'race context')
store = replace_once(store, 'function evaluateExistingEntry(existing, route, actorId, requestHash) {', 'function evaluateExistingEntry(existing, route, actorId, requestHash, context) {', 'evaluation signature')
store = replace_once(store, "  const status = String(existing.status || '').toLowerCase();\n", "  if (isIdempotencyEntryExpired(existing, context)) throw expired();\n\n  const status = String(existing.status || '').toLowerCase();\n", 'expiry enforcement')
store = replace_once(store, '\nfunction normalizeResponseBody(result) {', "\nfunction isIdempotencyEntryExpired(existing, context) {\n  const expiresAtMs = Date.parse(existing && existing.expires_at || '');\n  if (!Number.isFinite(expiresAtMs)) return false;\n  const nowMs = Date.parse(context && context.now || new Date().toISOString());\n  return Number.isFinite(nowMs) && nowMs >= expiresAtMs;\n}\n\nfunction normalizeResponseBody(result) {", 'expiry helper')
store = replace_once(store, '  failIdempotencyEntry,\n  buildIdempotencyDebugPayload', '  failIdempotencyEntry,\n  isIdempotencyEntryExpired,\n  buildIdempotencyDebugPayload', 'expiry export')
write(store_path, store)

write('scripts/test-order-request-freshness-runtime.js', r'''\
#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { MAX_REQUEST_AGE_MS, MAX_FUTURE_SKEW_MS, assertRequestFreshness } = require('../backend/shared/security/request-freshness-contract');
const { findRouteByName } = require('../backend/shared/http/route-registry');
const { isIdempotencyEntryExpired } = require('../backend/shared/security/persistent-idempotency-store');

const now = '2026-07-30T12:00:00.000Z';
const nonce = 'ord-0123456789abcdef0123456789abcdef';
const valid = assertRequestFreshness({ now, headers: { 'x-doke-request-issued-at': '2026-07-30T11:59:00.000Z', 'x-doke-request-nonce': nonce } });
assert.strictEqual(valid.ageMs, 60000);
assert.strictEqual(valid.nonceSha256.length, 64);
assertError({}, 'DOKE_REQUEST_FRESHNESS_REQUIRED');
assertError({ now, headers: { 'x-doke-request-issued-at': new Date(Date.parse(now) - MAX_REQUEST_AGE_MS - 1).toISOString(), 'x-doke-request-nonce': nonce } }, 'DOKE_REQUEST_EXPIRED');
assertError({ now, headers: { 'x-doke-request-issued-at': new Date(Date.parse(now) + MAX_FUTURE_SKEW_MS + 1).toISOString(), 'x-doke-request-nonce': nonce } }, 'DOKE_REQUEST_FROM_FUTURE');
assertError({ now, headers: { 'x-doke-request-issued-at': now, 'x-doke-request-nonce': 'weak' } }, 'DOKE_REQUEST_NONCE_INVALID');
for (const name of ['orders.create', 'orders.accept', 'orders.decline', 'orders.quote', 'orders.charge', 'orders.start', 'orders.complete', 'orders.updateStatus']) {
  assert.strictEqual(findRouteByName(name).requestFreshnessRequired, true, `${name} must require freshness.`);
}
assert.strictEqual(findRouteByName('orders.list').requestFreshnessRequired, false);
assert.strictEqual(findRouteByName('orders.get').requestFreshnessRequired, false);
assert.strictEqual(isIdempotencyEntryExpired({ expires_at: '2026-07-30T11:59:59.999Z' }, { now }), true);
assert.strictEqual(isIdempotencyEntryExpired({ expires_at: '2026-07-30T12:00:00.001Z' }, { now }), false);
assert.strictEqual(isIdempotencyEntryExpired({ expires_at: null }, { now }), false);
console.log('ORD-A07 request freshness runtime test passed.');
function assertError(context, code) {
  assert.throws(() => assertRequestFreshness(context), (error) => error && error.code === code);
}
''')

write('scripts/audit-ord-001-a07-request-freshness.js', r'''\
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const required = ['backend/shared/security/request-freshness-contract.js','backend/shared/security/persistent-idempotency-store.js','backend/shared/http/create-action-handler.js','backend/shared/http/route-registry.js','backend/runtime/staging/node-http-server.js','assets/js/services/orders-service.js','scripts/test-order-request-freshness-runtime.js','docs/ORD-001-A07-REQUEST-FRESHNESS.md','docs/validation/ORD-001-A07-REQUEST-FRESHNESS.json','package.json'];
const failures = [];
const read = (file) => fs.readFileSync(file, 'utf8');
required.forEach((file) => { if (!fs.existsSync(file)) failures.push(`Missing ${file}`); });
if (!failures.length) {
  const contract = read(required[0]); const store = read(required[1]); const handler = read(required[2]); const registry = read(required[3]); const server = read(required[4]); const frontend = read(required[5]); const pkg = JSON.parse(read('package.json')); const evidence = JSON.parse(read('docs/validation/ORD-001-A07-REQUEST-FRESHNESS.json'));
  for (const token of ['x-doke-request-issued-at','x-doke-request-nonce','DOKE_REQUEST_EXPIRED','DOKE_REQUEST_FROM_FUTURE','MAX_REQUEST_AGE_MS']) if (!contract.includes(token)) failures.push(`Contract missing ${token}`);
  if (handler.indexOf('assertRequestFreshness(requestContext)') < 0) failures.push('Handler does not enforce freshness.');
  if (handler.indexOf('assertRequestFreshness(requestContext)') > handler.indexOf('claimIdempotencyEntry(')) failures.push('Freshness must precede idempotency claim.');
  if (!registry.includes('requestFreshnessRequired: Boolean(requestFreshnessRequired)')) failures.push('Route registry missing freshness flag.');
  for (const name of ['orders.create','orders.accept','orders.decline','orders.quote','orders.charge','orders.start','orders.complete','orders.updateStatus']) if (!registry.includes(`route('${name}'`) || !registry.match(new RegExp(`route\\('${name.replace('.', '\\.')}[^\\n]+true\\),`))) failures.push(`${name} missing freshness flag.`);
  for (const header of ['x-doke-request-issued-at','x-doke-request-nonce']) { if (!server.includes(header)) failures.push(`CORS missing ${header}`); if (!frontend.includes(`'${header}'`)) failures.push(`Frontend missing ${header}`); }
  if (!store.includes('isIdempotencyEntryExpired(existing, context)')) failures.push('Persistent idempotency expiry is not enforced.');
  if (!pkg.scripts['audit:ord-001-a07-request-freshness'] || !pkg.scripts['test:ord-001-a07-request-freshness']) failures.push('Package commands missing.');
  if (evidence.status !== 'request_freshness_contract_complete_not_deployed') failures.push('Evidence status mismatch.');
}
if (failures.length) { console.error('ORD-A07 request freshness audit failed:'); failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
console.log('ORD-A07 request freshness audit passed.');
''')

write('docs/ORD-001-A07-REQUEST-FRESHNESS.md', """# ORD-001 / ORD-A07 — Frescor de requisições e resistência a replay

## Objetivo

Impedir que comandos de pedidos capturados ou atrasados sejam aceitos indefinidamente, preservando a idempotência persistente como autoridade contra duplicação.

## Contrato

Toda mutação de pedidos exige `x-doke-request-issued-at` e `x-doke-request-nonce`. O servidor aceita no máximo cinco minutos de idade e trinta segundos de avanço de relógio. O nonce usa o namespace `ord-` e nunca é persistido em texto nos relatórios.

A validação ocorre depois da autorização da rota e antes da reserva da chave idempotente. Replays exatos dentro da janela convergem para a resposta armazenada; requisições antigas, futuras ou com nonce inválido falham antes da mutação.

## Integração

O frontend gera os dois cabeçalhos para cada chamada do canário. O runtime Node permite os cabeçalhos no CORS. Rotas GET não exigem frescor.

A expiração de `api_idempotency_keys.expires_at` agora é aplicada ao ler uma chave existente. Chaves expiradas não podem ser reutilizadas.

## Limites

Este lote não cria assinatura criptográfica no navegador, não substitui JWT, autorização, RLS ou idempotência e não autoriza o canário visual real. Nenhum deploy, conta ou dado de staging foi alterado.
""")

evidence = {
  'domain': 'ORD-001', 'sublot': 'ORD-A07', 'status': 'request_freshness_contract_complete_not_deployed', 'environment': 'staging', 'recordedAt': '2026-07-30T08:02:00-03:00',
  'objective': 'Reject stale or future order mutations before idempotency claim while preserving exact replay convergence.',
  'contract': {'issuedAtHeader': 'x-doke-request-issued-at', 'nonceHeader': 'x-doke-request-nonce', 'maximumAgeSeconds': 300, 'maximumFutureSkewSeconds': 30, 'orderMutationRoutesProtected': 8, 'readRoutesProtected': 0, 'persistentIdempotencyExpiryEnforced': True, 'browserSharedSecretIntroduced': False},
  'currentExecution': {'deployedToStaging': False, 'accountsUsed': 0, 'networkRequestsPerformed': False, 'mutationsPerformed': False, 'ordersCreated': 0, 'productionChanged': False},
  'privacy': {'rawNoncesRecorded': False, 'emailsRecorded': False, 'passwordsRecorded': False, 'tokensRecorded': False, 'serviceRoleRecorded': False},
  'remainingBlockers': ['deploy_staging_runtime_with_request_freshness_contract', 'execute_read_only_preflight_against_deployed_runtime', 'explicit_authorization_for_real_visual_canary'],
  'nextAction': 'Validate the contract in CI, then deploy only through the controlled staging release path before any authorized visual canary.'
}
write('docs/validation/ORD-001-A07-REQUEST-FRESHNESS.json', json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')

package_path = Path('package.json')
package = json.loads(package_path.read_text(encoding='utf-8'))
package.setdefault('scripts', {})['audit:ord-001-a07-request-freshness'] = 'node scripts/audit-ord-001-a07-request-freshness.js'
package['scripts']['test:ord-001-a07-request-freshness'] = 'node scripts/test-order-request-freshness-runtime.js'
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

matrix_path = Path('config/domain-completion-matrix.json')
matrix = json.loads(matrix_path.read_text(encoding='utf-8'))
matrix['version'] = '1.3.22'
matrix['updatedAt'] = '2026-07-30T08:02:00-03:00'
domain = next(item for item in matrix['domains'] if item['id'] == 'ORD-001')
def append_unique(target, values):
    for value in values:
        if value not in target:
            target.append(value)
append_unique(domain['requiredPaths'], ['backend/shared/security/request-freshness-contract.js','scripts/audit-ord-001-a07-request-freshness.js','scripts/test-order-request-freshness-runtime.js','docs/ORD-001-A07-REQUEST-FRESHNESS.md','docs/validation/ORD-001-A07-REQUEST-FRESHNESS.json'])
append_unique(domain['tests'], ['audit:ord-001-a07-request-freshness','test:ord-001-a07-request-freshness'])
append_unique(domain['evidence'], ['ORD-A07 adds a five-minute request freshness window and thirty-second future clock skew limit to every order mutation before idempotency claim.','The orders frontend emits per-request issued-at and nonce headers, while the staging Node runtime exposes only those explicit headers through CORS.','Existing persistent idempotency entries now enforce expires_at when read, preventing expired keys from being replayed or reused.','No browser shared secret or false request-signature claim was introduced; JWT, route authorization, RLS and idempotency remain independent controls.'])
append_unique(domain['nextActions'], ['Deploy the ORD-A07 request freshness contract only through the controlled staging release path and rerun the non-mutating preflight.','Retain explicit authorization as a separate prerequisite before the real two-context visual canary.'])
matrix_path.write_text(json.dumps(matrix, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

Path(__file__).unlink()
print('ORD-A07 reconciliation complete.')
