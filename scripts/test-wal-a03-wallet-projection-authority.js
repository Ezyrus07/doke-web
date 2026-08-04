'use strict';

const assert = require('node:assert/strict');
const fixture = require('../tests/fixtures/wal-a03-wallet-projection-authority-cases.json');
const authority = require('../backend/modules/wallet/wallet-projection-authority');

const cases = [];
function check(id, fn) {
  try {
    fn();
    cases.push({ id, passed: true });
  } catch (error) {
    cases.push({ id, passed: false, error: error.message });
    throw new Error(`WAL-A03 conformance failed [${id}]: ${error.message}`);
  }
}
function expectCode(code, fn) {
  assert.throws(fn, (error) => error && error.code === code);
}

check('contract-version', () => assert.equal(authority.CONTRACT_VERSION, fixture.contractId));
check('envelope-version', () => assert.equal(authority.ENVELOPE_VERSION, 'wallet-projection-envelope-v1'));
check('states-exact', () => assert.deepEqual(authority.STATES, ['unauthenticated', 'loading', 'authoritative', 'stale', 'unavailable']));
check('sources-exact', () => assert.deepEqual(authority.SOURCES, ['remote_server', 'cached_remote', 'none']));

const unauthenticated = authority.resolveWalletProjection({ authState: 'unauthenticated', observedAt: fixture.observedAt });
check('unauthenticated-state', () => assert.equal(unauthenticated.state, 'unauthenticated'));
check('unauthenticated-values-hidden', () => assert.equal(unauthenticated.valuesVisible, false));
check('unauthenticated-balances-null', () => assert.equal(unauthenticated.balances, null));
check('unauthenticated-authority-none', () => assert.equal(unauthenticated.displayAuthority, 'none'));
check('unauthenticated-validation', () => assert.deepEqual(authority.validateProjectionEnvelope(unauthenticated), unauthenticated));

const loading = authority.resolveWalletProjection({ authState: 'authenticated', observedAt: fixture.observedAt, remote: { status: 'pending' } });
check('loading-state', () => assert.equal(loading.state, 'loading'));
check('loading-values-hidden', () => assert.equal(loading.valuesVisible, false));
check('loading-balances-null', () => assert.equal(loading.balances, null));
check('loading-retry-hidden', () => assert.equal(loading.retryVisible, false));
check('loading-validation', () => assert.deepEqual(authority.validateProjectionEnvelope(loading), loading));

const authoritative = [];
fixture.authoritativeCases.forEach((testCase) => {
  const envelope = authority.resolveWalletProjection({
    authState: 'authenticated',
    observedAt: fixture.observedAt,
    remote: { status: 'success', projection: testCase.projection }
  });
  authoritative.push(envelope);
  check(`${testCase.id}-state`, () => assert.equal(envelope.state, 'authoritative'));
  check(`${testCase.id}-source`, () => assert.equal(envelope.source, 'remote_server'));
  check(`${testCase.id}-display-authority`, () => assert.equal(envelope.displayAuthority, 'remote_authoritative'));
  check(`${testCase.id}-values-visible`, () => assert.equal(envelope.valuesVisible, true));
  check(`${testCase.id}-fingerprint`, () => assert.match(envelope.projectionFingerprint, /^[a-f0-9]{64}$/));
  check(`${testCase.id}-validation`, () => assert.deepEqual(authority.validateProjectionEnvelope(envelope), envelope));
  check(`${testCase.id}-mutation-denied`, () => assert.equal(envelope.mutationAuthority, false));
  check(`${testCase.id}-withdrawal-denied`, () => assert.equal(envelope.withdrawalRequestAllowed, false));
  check(`${testCase.id}-money-authority-denied`, () => assert.equal(envelope.realMoneyAuthority || envelope.providerTransferAuthority || envelope.productionAuthority, false));
});
check('explicit-zero-is-authoritative', () => assert.deepEqual(authoritative[1].balances, { availableCents: 0, pendingCents: 0, reservedCents: 0, totalCents: 0 }));

fixture.failureCases.forEach((testCase) => {
  const unavailable = authority.resolveWalletProjection({
    authState: 'authenticated',
    observedAt: fixture.observedAt,
    remote: { status: 'error', reasonCode: testCase.reasonCode }
  });
  check(`${testCase.id}-unavailable-state`, () => assert.equal(unavailable.state, 'unavailable'));
  check(`${testCase.id}-no-balances`, () => assert.equal(unavailable.balances, null));
  check(`${testCase.id}-no-zero`, () => assert.equal(JSON.stringify(unavailable).includes('availableCents'), false));
  check(`${testCase.id}-retry-visible`, () => assert.equal(unavailable.retryVisible, true));
  check(`${testCase.id}-validation`, () => assert.deepEqual(authority.validateProjectionEnvelope(unavailable), unavailable));
});

const stale = authority.resolveWalletProjection({
  authState: 'authenticated',
  observedAt: '2026-08-04T18:56:00.000Z',
  remote: { status: 'error', reasonCode: 'remote_timeout' },
  cachedProjection: authoritative[0]
});
check('stale-state', () => assert.equal(stale.state, 'stale'));
check('stale-source', () => assert.equal(stale.source, 'cached_remote'));
check('stale-values-preserved', () => assert.deepEqual(stale.balances, authoritative[0].balances));
check('stale-prior-fingerprint', () => assert.equal(stale.previousProjectionFingerprint, authoritative[0].projectionFingerprint));
check('stale-warning', () => assert.equal(stale.staleWarningRequired, true));
check('stale-display-nonauthoritative', () => assert.equal(stale.displayAuthority, 'cached_non_authoritative'));
check('stale-actions-denied', () => assert.equal(stale.mutationAuthority || stale.withdrawalRequestAllowed, false));
check('stale-validation', () => assert.deepEqual(authority.validateProjectionEnvelope(stale), stale));

check('tamper-state-detected', () => expectCode('WAL_A03_ENVELOPE_INVALID', () => authority.validateProjectionEnvelope({ ...authoritative[0], state: 'made_up' })));
check('tamper-balance-detected', () => expectCode('WAL_A03_BALANCE_INVARIANT', () => authority.validateProjectionEnvelope({ ...authoritative[0], balances: { ...authoritative[0].balances, availableCents: 1 } })));
check('tamper-authority-detected', () => expectCode('WAL_A03_AUTHORITY_FORBIDDEN', () => authority.validateProjectionEnvelope({ ...authoritative[0], mutationAuthority: true })));
check('expired-authoritative-rejected', () => expectCode('WAL_A03_AUTHORITATIVE_EXPIRED', () => authority.createAuthoritativeProjection({ ...fixture.authoritativeCases[0].projection, observedAt: '2026-08-04T18:56:00.000Z' })));
check('future-generated-rejected', () => expectCode('WAL_A03_TIMESTAMP_INVALID', () => authority.createAuthoritativeProjection({ ...fixture.authoritativeCases[0].projection, generatedAt: '2026-08-04T18:51:00.000Z', observedAt: fixture.observedAt })));
check('negative-balance-rejected', () => expectCode('WAL_A03_BALANCES_INVALID', () => authority.createAuthoritativeProjection({ ...fixture.authoritativeCases[0].projection, balances: { availableCents: -1, pendingCents: 0, reservedCents: 0, totalCents: -1 }, observedAt: fixture.observedAt })));
check('fractional-balance-rejected', () => expectCode('WAL_A03_BALANCES_INVALID', () => authority.createAuthoritativeProjection({ ...fixture.authoritativeCases[0].projection, balances: { availableCents: 1.5, pendingCents: 0, reservedCents: 0, totalCents: 1.5 }, observedAt: fixture.observedAt })));
check('balance-total-mismatch-rejected', () => expectCode('WAL_A03_BALANCE_INVARIANT', () => authority.createAuthoritativeProjection({ ...fixture.authoritativeCases[0].projection, balances: { availableCents: 1, pendingCents: 2, reservedCents: 3, totalCents: 7 }, observedAt: fixture.observedAt })));
check('local-source-authoritative-rejected', () => expectCode('WAL_A03_SOURCE_INVALID', () => authority.createProjectionEnvelope({ ...fixture.authoritativeCases[0].projection, state: 'authoritative', authState: 'authenticated', source: 'cached_remote', observedAt: fixture.observedAt })));
check('unavailable-zero-rejected', () => expectCode('WAL_A03_NONAUTHORITATIVE_VALUE_FORBIDDEN', () => authority.createProjectionEnvelope({ state: 'unavailable', authState: 'authenticated', source: 'none', observedAt: fixture.observedAt, reasonCode: 'remote_error', balances: { availableCents: 0, pendingCents: 0, reservedCents: 0, totalCents: 0 } })));
check('loading-zero-rejected', () => expectCode('WAL_A03_NONAUTHORITATIVE_VALUE_FORBIDDEN', () => authority.createProjectionEnvelope({ state: 'loading', authState: 'authenticated', source: 'none', observedAt: fixture.observedAt, reasonCode: null, balances: { availableCents: 0, pendingCents: 0, reservedCents: 0, totalCents: 0 } })));
check('unauthenticated-wallet-rejected', () => expectCode('WAL_A03_NONAUTHORITATIVE_VALUE_FORBIDDEN', () => authority.createProjectionEnvelope({ state: 'unauthenticated', authState: 'unauthenticated', source: 'none', observedAt: fixture.observedAt, reasonCode: null, walletId: 'wal_synthetic_wallet_0001' })));
check('stale-without-cache-rejected', () => expectCode('WAL_A03_STALE_METADATA_INVALID', () => authority.createProjectionEnvelope({ ...fixture.authoritativeCases[0].projection, state: 'stale', authState: 'authenticated', source: 'cached_remote', observedAt: '2026-08-04T18:56:00.000Z', reasonCode: 'remote_timeout' })));
check('stale-from-unavailable-rejected', () => expectCode('WAL_A03_CACHE_INVALID', () => authority.createStaleProjection(authority.createUnavailableProjection('remote_error', fixture.observedAt), 'remote_error', '2026-08-04T18:56:00.000Z')));
check('unknown-unavailable-reason-rejected', () => expectCode('WAL_A03_UNAVAILABLE_REASON_INVALID', () => authority.createUnavailableProjection('not_found', fixture.observedAt)));
check('unknown-remote-status-rejected', () => expectCode('WAL_A03_RESOLUTION_INVALID', () => authority.resolveWalletProjection({ authState: 'authenticated', observedAt: fixture.observedAt, remote: { status: 'local' } })));
check('remote-success-without-payload-rejected', () => expectCode('WAL_A03_RESOLUTION_INVALID', () => authority.resolveWalletProjection({ authState: 'authenticated', observedAt: fixture.observedAt, remote: { status: 'success' } })));
check('invalid-account-hash-rejected', () => expectCode('WAL_A03_ENVELOPE_INVALID', () => authority.createAuthoritativeProjection({ ...fixture.authoritativeCases[0].projection, accountScopeHash: 'plain-account-id', observedAt: fixture.observedAt })));
check('invalid-wallet-id-rejected', () => expectCode('WAL_A03_ENVELOPE_INVALID', () => authority.createAuthoritativeProjection({ ...fixture.authoritativeCases[0].projection, walletId: 'wallet-1', observedAt: fixture.observedAt })));
check('invalid-revision-rejected', () => expectCode('WAL_A03_ENVELOPE_INVALID', () => authority.createAuthoritativeProjection({ ...fixture.authoritativeCases[0].projection, projectionRevision: 0, observedAt: fixture.observedAt })));
check('deterministic-fingerprint', () => {
  const first = authority.createAuthoritativeProjection({ ...fixture.authoritativeCases[0].projection, observedAt: fixture.observedAt });
  const second = authority.createAuthoritativeProjection({ ...fixture.authoritativeCases[0].projection, observedAt: fixture.observedAt });
  assert.equal(first.projectionFingerprint, second.projectionFingerprint);
});

const result = {
  contractId: authority.CONTRACT_VERSION,
  total: cases.length,
  passed: cases.filter((item) => item.passed).length,
  failed: cases.filter((item) => !item.passed).length,
  status: 'passed'
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);