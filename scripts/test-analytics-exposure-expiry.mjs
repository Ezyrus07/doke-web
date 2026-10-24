import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(import.meta.dirname, '..');
const { signAnalyticsEnvelope, verifyAnalyticsEnvelope, attachAnalyticsExposureProofs } =
  await import(pathToFileURL(join(root, 'supabase/functions/_shared/analytics-proof.ts')).href);
const secret = 'synthetic-test-only-expiration-secret-32-bytes';
const NOW = Date.parse('2026-10-23T15:00:00.000Z');
const priorNow = Date.now;
let checks = 0;
const base = {
  searchRequestId: 'synthetic-request', serviceId: 'synthetic-service',
  resultPosition: 0, rankingVersion: 'search-rank-v0',
  asOf: '2026-10-23T14:59:00.000Z', surface: 'search',
  expiresAt: new Date(NOW + 120000).toISOString()
};
async function accepted(description, body, type = 'ana_exposure_v1') {
  const token = await signAnalyticsEnvelope(type, body, secret);
  assert.deepEqual(await verifyAnalyticsEnvelope(token, type, secret), body, description);
  checks++;
}
async function denied(description, body, code) {
  // JSON cannot carry undefined keys; build the actual wire representation first.
  const wireBody = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
  const token = await signAnalyticsEnvelope('ana_exposure_v1', wireBody, secret);
  await assert.rejects(
    verifyAnalyticsEnvelope(token, 'ana_exposure_v1', secret),
    { message: code }, description
  );
  checks++;
}
try {
  Date.now = () => NOW;
  await accepted('Unexpired proof', base);
  await accepted('One-hour expiry boundary', { ...base, expiresAt: new Date(NOW + 3600000).toISOString() });
  await accepted('One millisecond remaining', { ...base, expiresAt: new Date(NOW + 1).toISOString() });
  await denied('Past expiry', { ...base, expiresAt: new Date(NOW - 1).toISOString() }, 'DOKE_ANALYTICS_TOKEN_EXPIRED');
  await denied('Exactly expired', { ...base, expiresAt: new Date(NOW).toISOString() }, 'DOKE_ANALYTICS_TOKEN_EXPIRED');
  await denied('Validity too long', { ...base, expiresAt: new Date(NOW + 3600001).toISOString() }, 'DOKE_ANALYTICS_TOKEN_INVALID');
  for (const [name, expiresAt] of [
    ['Missing expiry', undefined], ['Null expiry', null], ['Numeric expiry', NOW + 120000],
    ['Blank expiry', ''], ['Malformed expiry', 'not-a-date'],
    ['Locale expiry', 'October 23, 2026'], ['Missing timezone', '2026-10-23T15:02:00'],
    ['Offset ISO', '2026-10-23T12:02:00-03:00'], ['Truncated ISO', '2026-10-23T15:02:00Z']
  ]) {
    await denied(name, { ...base, expiresAt }, 'DOKE_ANALYTICS_TOKEN_INVALID');
  }
  for (const [name, data] of [
    ['Request ID missing', { searchRequestId: '' }],
    ['Service ID missing', { serviceId: null }],
    ['Ranking missing', { rankingVersion: '   ' }],
    ['As-of missing', { asOf: undefined }],
    ['Surface invalid', { surface: 'payment' }],
    ['Fractional result index', { resultPosition: 0.5 }],
    ['Negative result index', { resultPosition: -1 }],
    ['String result index', { resultPosition: '1' }]
  ]) await denied(name, { ...base, ...data }, 'DOKE_ANALYTICS_TOKEN_INVALID');

  const token = await signAnalyticsEnvelope('ana_exposure_v1', base, secret);
  const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  decoded.payload.expiresAt = new Date(NOW + 240000).toISOString();
  await assert.rejects(
    verifyAnalyticsEnvelope(Buffer.from(JSON.stringify(decoded)).toString('base64url'), 'ana_exposure_v1', secret),
    { message: 'DOKE_ANALYTICS_TOKEN_SIGNATURE_INVALID' }, 'Forged expiry cannot extend life'
  );
  checks++;
  await accepted('Unrelated envelope type remains valid without expiry', { value: 'synthetic' }, 'generic_test_v1');

  const response = { ranking: { version: 'v1', asOf: new Date(NOW).toISOString() }, items: [{ serviceId: 'a' }] };
  const signed = await attachAnalyticsExposureProofs(response, 'req', secret, '120');
  assert.ok(signed.items[0].analyticsExposureProof);
  checks++;
  await verifyAnalyticsEnvelope(signed.items[0].analyticsExposureProof, 'ana_exposure_v1', secret);
  checks++;
  Date.now = () => NOW + 120000;
  await assert.rejects(
    verifyAnalyticsEnvelope(signed.items[0].analyticsExposureProof, 'ana_exposure_v1', secret),
    { message: 'DOKE_ANALYTICS_TOKEN_EXPIRED' }
  );
  checks++;
} finally {
  Date.now = priorNow;
}
console.log('EDGE-ANALYTICS-EXPIRY PASS: ' + checks + ' offline deterministic checks, no external requests.');
