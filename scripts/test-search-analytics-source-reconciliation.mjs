import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const proofPath = join(root, 'supabase/functions/_shared/analytics-proof.ts');
const {
  sha256Hex, signAnalyticsEnvelope, verifyAnalyticsEnvelope, attachAnalyticsExposureProofs
} = await import(pathToFileURL(proofPath).href);
const secret = 'synthetic-test-only-hmac-signing-secret';
let checks = 0;
function equal(actual, expected, reason) { assert.deepEqual(actual, expected, reason); checks++; }
function ok(value, reason) { assert.ok(value, reason); checks++; }
async function rejects(task, message, reason) { await assert.rejects(task, { message }, reason); checks++; }

const hashA = await sha256Hex({ b: [2, { z: true, a: 'hello' }], a: 1 });
const hashB = await sha256Hex({ a: 1, b: [2, { a: 'hello', z: true }] });
equal(hashA, hashB, 'Canonical analytics payload hashes are stable across key order');
ok(/^[a-f0-9]{64}$/.test(hashA), 'SHA-256 hex format');

const payload = { searchRequestId: 'synthetic-id', resultPosition: 0, serviceId: 'svc-01' };
const token = await signAnalyticsEnvelope('ana_exposure_v1', payload, secret);
ok(typeof token === 'string' && token.length > 40, 'Signed proof is opaque nonempty URL-safe string');
ok(/^[A-Za-z0-9_-]+$/.test(token), 'Signed proof is base64url');
const verified = await verifyAnalyticsEnvelope(token, 'ana_exposure_v1', secret);
equal(verified, payload, 'Verify returns signed payload');
ok(Object.isFrozen(verified), 'Verification result immutable');
await rejects(() => verifyAnalyticsEnvelope(token, 'wrong_type', secret), 'DOKE_ANALYTICS_TOKEN_INVALID', 'Wrong proof type rejected');
await rejects(() => verifyAnalyticsEnvelope(token, 'ana_exposure_v1', 'wrong-secret-12345678901234'), 'DOKE_ANALYTICS_TOKEN_SIGNATURE_INVALID', 'Wrong signing secret rejected');
await rejects(() => signAnalyticsEnvelope('ana_exposure_v1', payload, 'short'), 'DOKE_ANALYTICS_SIGNING_SECRET_INVALID', 'Short signing key rejected');
await rejects(() => verifyAnalyticsEnvelope('!!notbase64', 'ana_exposure_v1', secret), 'DOKE_ANALYTICS_TOKEN_INVALID', 'Malformed signed envelope rejected');
const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
decoded.payload.serviceId = 'attacker-service';
const tampered = Buffer.from(JSON.stringify(decoded)).toString('base64url');
await rejects(() => verifyAnalyticsEnvelope(tampered, 'ana_exposure_v1', secret), 'DOKE_ANALYTICS_TOKEN_SIGNATURE_INVALID', 'Tampered service ID rejected');

const response = {
  ranking: { version: 'v-02', asOf: '2026-10-23T00:00:00Z' },
  items: [
    { serviceId: 'svc-01', label: 'first' },
    { remoteId: 'remote-02', label: 'second' },
    { label: 'no-id' }
  ],
  untouched: { synthetic: true }
};
const signed = await attachAnalyticsExposureProofs(response, 'req-synthetic', secret, '120');
ok(signed !== response, 'Valid proof produces an independent response');
equal(signed.items.length, 3, 'All search items remain present');
equal(signed.items[0].label, 'first', 'Original item fields remain intact');
equal(signed.items[2].label, 'no-id', 'Item without service ID preserved');
equal(signed.items[2].analyticsExposureProof, undefined, 'No proof for unidentified item');
equal(signed.untouched, response.untouched, 'Non-item response envelope intact');
equal(response.items[0].analyticsExposureProof, undefined, 'No mutation of search RPC response');
const v0 = await verifyAnalyticsEnvelope(signed.items[0].analyticsExposureProof, 'ana_exposure_v1', secret);
const v1 = await verifyAnalyticsEnvelope(signed.items[1].analyticsExposureProof, 'ana_exposure_v1', secret);
equal(v0.serviceId, 'svc-01', 'First proof binds service');
equal(v0.searchRequestId, 'req-synthetic', 'Proof binds request ID');
equal(v0.resultPosition, 0, 'Proof binds result index');
equal(v0.rankingVersion, 'v-02', 'Proof binds ranking version');
equal(v0.asOf, '2026-10-23T00:00:00Z', 'Proof binds ranking timestamp');
equal(v0.surface, 'search', 'Proof binds search surface');
equal(v1.serviceId, 'remote-02', 'Fallback remoteId is signed');
equal(v1.resultPosition, 1, 'Second result index signed');
ok(Date.parse(v0.expiresAt) > Date.now(), 'Proof payload includes future expiry timestamp');
ok(Date.parse(v0.expiresAt) <= Date.now() + 121000, 'Proof TTL bounded by configured seconds');

for (const [name, envSecret, ttl, data] of [
  ['missing secret', null, '120', response],
  ['too-short secret', 'bad', '120', response],
  ['missing TTL', secret, null, response],
  ['invalid TTL', secret, 'nonsense', response],
  ['TTL below range', secret, '29', response],
  ['TTL above range', secret, '3601', response],
  ['missing ranking version', secret, '120', { ranking: { asOf: '2026-10-23' }, items: [] }],
  ['missing ranking asOf', secret, '120', { ranking: { version: 'v-02' }, items: [] }]
]) {
  const actual = await attachAnalyticsExposureProofs(data, 'req-synthetic', envSecret, ttl);
  ok(actual === data, 'Disabled/missing proof config returns original response: ' + name);
}

// Strictly preserve repository's authenticated RPC path while importing deployed analytics.
const searchIndex = readFileSync(join(root, 'supabase/functions/search-public-services-v2/index.ts'), 'utf8');
const selfIndex = readFileSync(join(root, 'supabase/functions/self-service-operations/index.ts'), 'utf8');
const selfOps = readFileSync(join(root, 'supabase/functions/self-service-operations/operations.mjs'), 'utf8');
const requiredSearch = [
  'authClient.auth.getUser(userJwt)',
  'actorId && userJwt ? { Authorization:',
  'record_analytics_behavior_event_v1',
  'search.executed',
  'attachAnalyticsExposureProofs(',
  'DOKE_ANALYTICS_EXPOSURE_SECRET',
  'DOKE_ANALYTICS_EXPOSURE_TTL_SECONDS',
  '../_shared/analytics-proof.ts',
  'record_service_search_observation_v2'
];
for (const marker of requiredSearch) {
  ok(searchIndex.includes(marker), 'Search source retains: ' + marker);
}
ok(
  searchIndex.indexOf('await recordSearchExecuted(context,') > searchIndex.indexOf('outcome: "success"'),
  'Analytics event issued only after successful search result handling'
);
ok(
  searchIndex.indexOf('const responseWithProofs = await attachAnalyticsExposureProofs(') >
    searchIndex.indexOf('await recordSearchExecuted(context,'),
  'Proofs are attached after analytics recording'
);
for (const action of [
  'prepare_transaction_attachment_uploads',
  'confirm_transaction_attachment_uploads',
  'remove_transaction_attachment'
]) {
  ok(selfIndex.includes('action === "' + action + '"'), 'Transaction attachment handler retained: ' + action);
  ok(selfOps.includes("'" + action + "'"), 'Transaction attachment action allowlisted: ' + action);
}
ok(selfIndex.includes('authorize_transaction_attachment_removal_internal'), 'Removal authorization RPC remains');
ok(selfIndex.includes('createSignedUploadUrl(path, { upsert: false })'), 'Transaction upload signed URL forbids upsert');
ok(selfIndex.includes('mark_transaction_attachment_removed_internal'), 'Removal records final status');
console.log('SEARCH-ANALYTICS-RECONCILE PASS: ' + checks +
  ' synthetic offline assertions, no network calls or provider writes.');
