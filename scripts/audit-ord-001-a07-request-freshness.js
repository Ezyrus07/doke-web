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
