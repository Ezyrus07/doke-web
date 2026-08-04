'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'wal-a03-wallet-projection-authority-v1';
const ENVELOPE_VERSION = 'wallet-projection-envelope-v1';
const STATES = Object.freeze(['unauthenticated', 'loading', 'authoritative', 'stale', 'unavailable']);
const AUTH_STATES = Object.freeze(['authenticated', 'unauthenticated']);
const SOURCES = Object.freeze(['remote_server', 'cached_remote', 'none']);
const REMOTE_STATUSES = Object.freeze(['idle', 'pending', 'success', 'error']);
const UNAVAILABLE_REASONS = Object.freeze(['remote_unavailable', 'remote_timeout', 'remote_error', 'invalid_remote_projection']);
const STALE_REASONS = Object.freeze(['remote_unavailable', 'remote_timeout', 'remote_error', 'refresh_failed', 'cache_expired']);

class WalletProjectionAuthorityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WalletProjectionAuthorityError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WalletProjectionAuthorityError(code, message);
}

function canonicalize(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function fingerprint(value, field) {
  const body = { ...value };
  delete body[field];
  return sha256(canonicalize(body));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function text(value, maxLength = 160) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isoInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T/.test(String(value || '')) && !Number.isNaN(Date.parse(value));
}

function compareInstants(left, right) {
  return Date.parse(left) - Date.parse(right);
}

function normalizeBalances(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('WAL_A03_BALANCES_INVALID', 'Wallet balances are required');
  }
  const balances = {
    availableCents: Number(input.availableCents),
    pendingCents: Number(input.pendingCents),
    reservedCents: Number(input.reservedCents),
    totalCents: Number(input.totalCents)
  };
  Object.entries(balances).forEach(([field, value]) => {
    if (!Number.isSafeInteger(value) || value < 0) {
      fail('WAL_A03_BALANCES_INVALID', `${field} must be a non-negative safe integer`);
    }
  });
  if (balances.totalCents !== balances.availableCents + balances.pendingCents + balances.reservedCents) {
    fail('WAL_A03_BALANCE_INVARIANT', 'totalCents must equal available + pending + reserved');
  }
  return Object.freeze(balances);
}

function assertNullFinancialData(input, state) {
  const forbidden = ['walletId', 'accountScopeHash', 'projectionRevision', 'balances', 'generatedAt', 'expiresAt', 'previousProjectionFingerprint'];
  forbidden.forEach((field) => {
    if (input[field] !== null && input[field] !== undefined) {
      fail('WAL_A03_NONAUTHORITATIVE_VALUE_FORBIDDEN', `${state} cannot contain ${field}`);
    }
  });
}

function derivePresentation(state) {
  switch (state) {
    case 'authoritative':
      return { displayMode: 'authoritative_values', valuesVisible: true, staleWarningRequired: false, retryVisible: false };
    case 'stale':
      return { displayMode: 'stale_values_with_warning', valuesVisible: true, staleWarningRequired: true, retryVisible: true };
    case 'unavailable':
      return { displayMode: 'unavailable_without_values', valuesVisible: false, staleWarningRequired: false, retryVisible: true };
    case 'loading':
      return { displayMode: 'loading_without_values', valuesVisible: false, staleWarningRequired: false, retryVisible: false };
    case 'unauthenticated':
      return { displayMode: 'authentication_required_without_values', valuesVisible: false, staleWarningRequired: false, retryVisible: false };
    default:
      fail('WAL_A03_STATE_INVALID', 'Unsupported wallet projection state');
  }
}

function createProjectionEnvelope(input) {
  if (!input || typeof input !== 'object') fail('WAL_A03_ENVELOPE_INVALID', 'Wallet projection input is required');
  const state = text(input.state, 40).toLowerCase();
  const authState = text(input.authState, 40).toLowerCase();
  const source = text(input.source, 40).toLowerCase();
  if (!STATES.includes(state) || !AUTH_STATES.includes(authState) || !SOURCES.includes(source)) {
    fail('WAL_A03_ENVELOPE_INVALID', 'State, authState or source is unsupported');
  }
  const observedAt = text(input.observedAt, 64);
  if (!isoInstant(observedAt)) fail('WAL_A03_TIMESTAMP_INVALID', 'observedAt must be a valid ISO instant');

  let walletId = null;
  let accountScopeHash = null;
  let projectionRevision = null;
  let balances = null;
  let generatedAt = null;
  let expiresAt = null;
  let previousProjectionFingerprint = null;
  let reasonCode = input.reasonCode == null ? null : text(input.reasonCode, 80).toLowerCase();

  if (state === 'authoritative' || state === 'stale') {
    if (authState !== 'authenticated') fail('WAL_A03_AUTHORITY_INVALID', `${state} requires an authenticated session`);
    if (source !== (state === 'authoritative' ? 'remote_server' : 'cached_remote')) fail('WAL_A03_SOURCE_INVALID', `${state} has an invalid source`);
    walletId = text(input.walletId, 200);
    accountScopeHash = text(input.accountScopeHash, 80).toLowerCase();
    projectionRevision = Number(input.projectionRevision);
    balances = normalizeBalances(input.balances);
    generatedAt = text(input.generatedAt, 64);
    expiresAt = text(input.expiresAt, 64);
    if (!/^wal_[A-Za-z0-9_-]{12,180}$/.test(walletId)) fail('WAL_A03_ENVELOPE_INVALID', 'Opaque walletId is required');
    if (!isSha256(accountScopeHash)) fail('WAL_A03_ENVELOPE_INVALID', 'accountScopeHash must be SHA-256');
    if (!Number.isSafeInteger(projectionRevision) || projectionRevision < 1) fail('WAL_A03_ENVELOPE_INVALID', 'projectionRevision must be a positive integer');
    if (!isoInstant(generatedAt) || !isoInstant(expiresAt)) fail('WAL_A03_TIMESTAMP_INVALID', 'generatedAt and expiresAt must be valid ISO instants');
    if (compareInstants(generatedAt, observedAt) > 0 || compareInstants(generatedAt, expiresAt) >= 0) fail('WAL_A03_TIMESTAMP_INVALID', 'Projection timestamps are inconsistent');
    if (state === 'authoritative') {
      if (compareInstants(observedAt, expiresAt) >= 0) fail('WAL_A03_AUTHORITATIVE_EXPIRED', 'Authoritative projection must be fresh');
      if (reasonCode !== null || input.previousProjectionFingerprint != null) fail('WAL_A03_ENVELOPE_INVALID', 'Authoritative projection cannot carry stale metadata');
    } else {
      previousProjectionFingerprint = text(input.previousProjectionFingerprint, 80).toLowerCase();
      if (!isSha256(previousProjectionFingerprint) || !STALE_REASONS.includes(reasonCode)) fail('WAL_A03_STALE_METADATA_INVALID', 'Stale projection requires prior fingerprint and reason');
    }
  } else {
    assertNullFinancialData(input, state);
    if (source !== 'none') fail('WAL_A03_SOURCE_INVALID', `${state} must use source none`);
    if (state === 'unauthenticated') {
      if (authState !== 'unauthenticated' || reasonCode !== null) fail('WAL_A03_AUTHORITY_INVALID', 'Unauthenticated state metadata is invalid');
    } else {
      if (authState !== 'authenticated') fail('WAL_A03_AUTHORITY_INVALID', `${state} requires authenticated context`);
      if (state === 'loading' && reasonCode !== null) fail('WAL_A03_ENVELOPE_INVALID', 'Loading state cannot have a failure reason');
      if (state === 'unavailable' && !UNAVAILABLE_REASONS.includes(reasonCode)) fail('WAL_A03_UNAVAILABLE_REASON_INVALID', 'Unavailable state requires a canonical reason');
    }
  }

  const presentation = derivePresentation(state);
  const body = {
    envelopeVersion: ENVELOPE_VERSION,
    contractVersion: CONTRACT_VERSION,
    state,
    authState,
    source,
    walletId,
    accountScopeHash,
    projectionRevision,
    balances,
    generatedAt,
    expiresAt,
    observedAt,
    previousProjectionFingerprint,
    reasonCode,
    displayAuthority: state === 'authoritative' ? 'remote_authoritative' : state === 'stale' ? 'cached_non_authoritative' : 'none',
    mutationAuthority: false,
    withdrawalRequestAllowed: false,
    realMoneyAuthority: false,
    providerTransferAuthority: false,
    productionAuthority: false,
    ...presentation
  };
  return Object.freeze({ ...body, projectionFingerprint: fingerprint(body, 'projectionFingerprint') });
}

function validateProjectionEnvelope(envelope) {
  if (!envelope || envelope.envelopeVersion !== ENVELOPE_VERSION || envelope.contractVersion !== CONTRACT_VERSION) fail('WAL_A03_ENVELOPE_INVALID', 'Unsupported wallet projection envelope');
  const rebuilt = createProjectionEnvelope(envelope);
  if (!isSha256(envelope.projectionFingerprint) || envelope.projectionFingerprint !== rebuilt.projectionFingerprint) fail('WAL_A03_FINGERPRINT_MISMATCH', 'Wallet projection fingerprint mismatch');
  if (envelope.mutationAuthority !== false || envelope.withdrawalRequestAllowed !== false || envelope.realMoneyAuthority !== false || envelope.providerTransferAuthority !== false || envelope.productionAuthority !== false) fail('WAL_A03_AUTHORITY_FORBIDDEN', 'Projection envelope cannot grant mutation or money authority');
  return rebuilt;
}

function createUnauthenticatedProjection(observedAt) {
  return createProjectionEnvelope({ state: 'unauthenticated', authState: 'unauthenticated', source: 'none', observedAt, reasonCode: null });
}

function createLoadingProjection(observedAt) {
  return createProjectionEnvelope({ state: 'loading', authState: 'authenticated', source: 'none', observedAt, reasonCode: null });
}

function createUnavailableProjection(reasonCode, observedAt) {
  return createProjectionEnvelope({ state: 'unavailable', authState: 'authenticated', source: 'none', observedAt, reasonCode });
}

function createAuthoritativeProjection(input) {
  return createProjectionEnvelope({ ...input, state: 'authoritative', authState: 'authenticated', source: 'remote_server', reasonCode: null, previousProjectionFingerprint: null });
}

function createStaleProjection(cachedProjection, reasonCode, observedAt) {
  const cached = validateProjectionEnvelope(cachedProjection);
  if (!['authoritative', 'stale'].includes(cached.state)) fail('WAL_A03_CACHE_INVALID', 'Only a validated remote projection may become stale');
  return createProjectionEnvelope({
    state: 'stale',
    authState: 'authenticated',
    source: 'cached_remote',
    walletId: cached.walletId,
    accountScopeHash: cached.accountScopeHash,
    projectionRevision: cached.projectionRevision,
    balances: cached.balances,
    generatedAt: cached.generatedAt,
    expiresAt: cached.expiresAt,
    observedAt,
    previousProjectionFingerprint: cached.projectionFingerprint,
    reasonCode
  });
}

function resolveWalletProjection(input) {
  if (!input || typeof input !== 'object') fail('WAL_A03_RESOLUTION_INVALID', 'Resolution input is required');
  const observedAt = text(input.observedAt, 64);
  const authState = text(input.authState, 40).toLowerCase();
  if (authState === 'unauthenticated') return createUnauthenticatedProjection(observedAt);
  if (authState !== 'authenticated') fail('WAL_A03_RESOLUTION_INVALID', 'Unknown authState');
  const remote = input.remote || {};
  const remoteStatus = text(remote.status || 'idle', 40).toLowerCase();
  if (!REMOTE_STATUSES.includes(remoteStatus)) fail('WAL_A03_RESOLUTION_INVALID', 'Unknown remote status');
  if (remoteStatus === 'idle' || remoteStatus === 'pending') return createLoadingProjection(observedAt);
  if (remoteStatus === 'success') {
    if (!remote.projection || typeof remote.projection !== 'object') fail('WAL_A03_RESOLUTION_INVALID', 'Successful remote read requires a projection');
    return createAuthoritativeProjection({ ...remote.projection, observedAt });
  }
  const reasonCode = text(remote.reasonCode || 'remote_error', 80).toLowerCase();
  if (input.cachedProjection) return createStaleProjection(input.cachedProjection, STALE_REASONS.includes(reasonCode) ? reasonCode : 'remote_error', observedAt);
  return createUnavailableProjection(UNAVAILABLE_REASONS.includes(reasonCode) ? reasonCode : 'remote_error', observedAt);
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  ENVELOPE_VERSION,
  STATES,
  AUTH_STATES,
  SOURCES,
  REMOTE_STATUSES,
  UNAVAILABLE_REASONS,
  STALE_REASONS,
  WalletProjectionAuthorityError,
  sha256,
  createProjectionEnvelope,
  validateProjectionEnvelope,
  createUnauthenticatedProjection,
  createLoadingProjection,
  createUnavailableProjection,
  createAuthoritativeProjection,
  createStaleProjection,
  resolveWalletProjection
});