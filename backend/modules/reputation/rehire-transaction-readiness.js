'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'rep-a05-rehire-transaction-readiness-v1';
const STATES = Object.freeze({
  UNAVAILABLE: 'unavailable', REJECTED: 'rejected', REQUOTE_REQUIRED: 'requote_required',
  CONFIRMATION_REQUIRED: 'confirmation_required', READY: 'ready', CREATED: 'created',
  REPLAY: 'replay', CONFLICT: 'conflict'
});
const ACTIONS = Object.freeze({ PREVIEW: 'preview', CREATE: 'create' });
const FORBIDDEN_KEYS = Object.freeze([
  'reviewBody', 'rawReview', 'rawMessage', 'privateMessage', 'rawEvidence', 'rawPayload',
  'password', 'accessToken', 'refreshToken', 'sessionCredential', 'cardNumber', 'cvv',
  'paymentInstrument', 'paymentAuthorization', 'bankAccount', 'bankDestination', 'pixKey',
  'identityDocument', 'sourceProposalId', 'sourcePaymentIntentId', 'sourceEscrowId',
  'sourceChargeId', 'sourceDisputeEvidence'
]);

const text = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const token = (v) => text(v).toLowerCase().replace(/[\s-]+/g, '_');
const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(v));
const isHash = (v) => /^[a-f0-9]{64}$/i.test(text(v));
const sortValue = (v) => Array.isArray(v) ? v.map(sortValue) : (!v || typeof v !== 'object') ? v : Object.keys(v).sort().reduce((o, k) => { o[k] = sortValue(v[k]); return o; }, {});
const stableJson = (v) => JSON.stringify(sortValue(v));
const sha256 = (v) => crypto.createHash('sha256').update(String(v), 'utf8').digest('hex');

function deterministicUuid(seed) {
  const b = Buffer.from(sha256(seed).slice(0, 32), 'hex');
  b[6] = (b[6] & 15) | 80;
  b[8] = (b[8] & 63) | 128;
  const h = b.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
function containsForbiddenRawData(v) {
  if (Array.isArray(v)) return v.some(containsForbiddenRawData);
  if (!v || typeof v !== 'object') return false;
  return Object.keys(v).some((k) => FORBIDDEN_KEYS.includes(k) || containsForbiddenRawData(v[k]));
}
function iso(v, field) {
  const raw = text(v); const time = Date.parse(raw);
  if (!raw || !Number.isFinite(time)) throw new Error(`invalid_timestamp:${field}`);
  return new Date(time).toISOString();
}
function uuid(v, field) { const out = text(v); if (!isUuid(out)) throw new Error(`invalid_uuid:${field}`); return out; }
function hash(v, field) { const out = text(v); if (!isHash(out)) throw new Error(`invalid_hash:${field}`); return out.toLowerCase(); }

function normalizeIntent(raw) {
  if (!raw || typeof raw !== 'object' || containsForbiddenRawData(raw)) throw new Error('invalid_rehire_intent');
  const out = {
    action: token(raw.action || ACTIONS.PREVIEW),
    rehireIntentId: uuid(raw.rehireIntentId, 'rehireIntentId'),
    idempotencyKey: text(raw.idempotencyKey),
    actorId: uuid(raw.actorId, 'actorId'),
    sourceOrderId: uuid(raw.sourceOrderId, 'sourceOrderId'),
    professionalId: uuid(raw.professionalId, 'professionalId'),
    serviceId: uuid(raw.serviceId, 'serviceId'),
    sourceLineageFingerprint: hash(raw.sourceLineageFingerprint, 'sourceLineageFingerprint'),
    requestedScopeFingerprint: hash(raw.requestedScopeFingerprint, 'requestedScopeFingerprint'),
    requestedLocationFingerprint: hash(raw.requestedLocationFingerprint, 'requestedLocationFingerprint'),
    requestedScheduleFingerprint: hash(raw.requestedScheduleFingerprint, 'requestedScheduleFingerprint'),
    requestedAt: iso(raw.requestedAt, 'requestedAt'), confirmation: null
  };
  if (!Object.values(ACTIONS).includes(out.action)) throw new Error('unsupported_action');
  if (!out.idempotencyKey.startsWith('rehire_v1_')) throw new Error('invalid_idempotency_key');
  if (raw.confirmation != null) {
    if (!raw.confirmation || typeof raw.confirmation !== 'object') throw new Error('invalid_confirmation');
    out.confirmation = Object.freeze({
      confirmationId: uuid(raw.confirmation.confirmationId, 'confirmationId'),
      quoteFingerprint: hash(raw.confirmation.quoteFingerprint, 'confirmation.quoteFingerprint'),
      availabilityFingerprint: hash(raw.confirmation.availabilityFingerprint, 'confirmation.availabilityFingerprint'),
      termsFingerprint: hash(raw.confirmation.termsFingerprint, 'confirmation.termsFingerprint'),
      scopeFingerprint: hash(raw.confirmation.scopeFingerprint, 'confirmation.scopeFingerprint'),
      confirmedAt: iso(raw.confirmation.confirmedAt, 'confirmation.confirmedAt')
    });
  }
  const identity = {
    rehireIntentId: out.rehireIntentId, actorId: out.actorId, sourceOrderId: out.sourceOrderId,
    professionalId: out.professionalId, serviceId: out.serviceId,
    sourceLineageFingerprint: out.sourceLineageFingerprint,
    requestedScopeFingerprint: out.requestedScopeFingerprint,
    requestedLocationFingerprint: out.requestedLocationFingerprint,
    requestedScheduleFingerprint: out.requestedScheduleFingerprint
  };
  return Object.freeze({ ...out, intentFingerprint: sha256(stableJson(identity)) });
}

function normalizeSnapshot(raw) {
  if (!raw || typeof raw !== 'object' || containsForbiddenRawData(raw)) throw new Error('invalid_rehire_snapshot');
  if (token(raw.source) !== 'canonical_server' || raw.authoritative !== true) throw new Error('non_canonical_snapshot');
  const s = raw.sourceOrder || {}; const c = raw.current || {};
  const out = {
    source: 'canonical_server', authoritative: true, now: iso(raw.now, 'now'), snapshotRevision: text(raw.snapshotRevision), actorActive: raw.actorActive === true,
    sourceOrder: {
      orderId: uuid(s.orderId, 'sourceOrder.orderId'), clientId: uuid(s.clientId, 'sourceOrder.clientId'),
      professionalId: uuid(s.professionalId, 'sourceOrder.professionalId'), serviceId: uuid(s.serviceId, 'sourceOrder.serviceId'),
      status: token(s.status), paymentStatus: token(s.paymentStatus), settlementState: token(s.settlementState), disputeState: token(s.disputeState),
      orderRevision: text(s.orderRevision), lineageFingerprint: hash(s.lineageFingerprint, 'sourceOrder.lineageFingerprint')
    },
    current: {
      professionalActive: c.professionalActive === true, serviceActive: c.serviceActive === true, serviceBookable: c.serviceBookable === true,
      currency: text(c.currency).toUpperCase(), priceCents: Number(c.priceCents), catalogRevision: text(c.catalogRevision), serviceRevision: text(c.serviceRevision),
      quoteId: uuid(c.quoteId, 'current.quoteId'), quoteRevision: text(c.quoteRevision), quoteFingerprint: hash(c.quoteFingerprint, 'current.quoteFingerprint'),
      quoteExpiresAt: iso(c.quoteExpiresAt, 'current.quoteExpiresAt'), availabilityRevision: text(c.availabilityRevision),
      availabilityFingerprint: hash(c.availabilityFingerprint, 'current.availabilityFingerprint'), available: c.available === true,
      scopeFingerprint: hash(c.scopeFingerprint, 'current.scopeFingerprint'), locationFingerprint: hash(c.locationFingerprint, 'current.locationFingerprint'),
      scheduleFingerprint: hash(c.scheduleFingerprint, 'current.scheduleFingerprint'), termsVersion: text(c.termsVersion),
      termsFingerprint: hash(c.termsFingerprint, 'current.termsFingerprint'), paymentPolicyVersion: text(c.paymentPolicyVersion),
      feePolicyVersion: text(c.feePolicyVersion), cancellationPolicyVersion: text(c.cancellationPolicyVersion)
    }
  };
  if (!out.snapshotRevision || !out.sourceOrder.orderRevision) throw new Error('missing_revision');
  ['catalogRevision','serviceRevision','quoteRevision','availabilityRevision','termsVersion','paymentPolicyVersion','feePolicyVersion','cancellationPolicyVersion']
    .forEach((k) => { if (!out.current[k]) throw new Error(`missing_current_${k}`); });
  if (!Number.isSafeInteger(out.current.priceCents) || out.current.priceCents < 0) throw new Error('invalid_current_price');
  if (out.current.currency !== 'BRL') throw new Error('unsupported_currency');
  return Object.freeze(out);
}

const terminal = (state, reason) => Object.freeze({ contractId: CONTRACT_ID, state, reason, transactionAuthority: false, paymentAuthority: false, runtimeAuthority: false });

function buildTransaction(intent, snapshot) {
  const seed = `${CONTRACT_ID}:${intent.rehireIntentId}:${intent.intentFingerprint}`;
  const c = snapshot.current;
  const tx = {
    contractId: CONTRACT_ID, newOrderId: deterministicUuid(`${seed}:order`), newTransactionId: deterministicUuid(`${seed}:transaction`),
    sourceOrderId: intent.sourceOrderId, sourceOrderRole: 'lineage_only', clientId: intent.actorId, professionalId: intent.professionalId, serviceId: intent.serviceId,
    catalogRevision: c.catalogRevision, serviceRevision: c.serviceRevision, quoteId: c.quoteId, quoteRevision: c.quoteRevision,
    quoteFingerprint: c.quoteFingerprint, priceCents: c.priceCents, currency: c.currency,
    availabilityRevision: c.availabilityRevision, availabilityFingerprint: c.availabilityFingerprint,
    scopeFingerprint: c.scopeFingerprint, locationFingerprint: c.locationFingerprint, scheduleFingerprint: c.scheduleFingerprint,
    termsVersion: c.termsVersion, termsFingerprint: c.termsFingerprint, paymentPolicyVersion: c.paymentPolicyVersion,
    feePolicyVersion: c.feePolicyVersion, cancellationPolicyVersion: c.cancellationPolicyVersion,
    newProposalId: null, newPaymentIntentId: null, newEscrowId: null, newChargeId: null,
    autoPaymentAllowed: false, oldCommercialTermsCopied: false, oldFinancialReferencesCopied: false,
    requiresDownstreamOrderAuthority: true, requiresDownstreamPaymentAuthority: true
  };
  if (tx.newOrderId === intent.sourceOrderId) throw new Error('source_order_id_reuse');
  return Object.freeze({ ...tx, transactionFingerprint: sha256(stableJson(tx)) });
}

function evaluateRehire(rawIntent, rawSnapshot, priorOutcome) {
  let intent; let snapshot;
  try { intent = normalizeIntent(rawIntent); snapshot = normalizeSnapshot(rawSnapshot); }
  catch (error) { return terminal(STATES.UNAVAILABLE, error.message); }
  if (priorOutcome) {
    if (priorOutcome.idempotencyKey !== intent.idempotencyKey) return terminal(STATES.CONFLICT, 'idempotency_key_mismatch');
    if (priorOutcome.intentFingerprint !== intent.intentFingerprint) return terminal(STATES.CONFLICT, 'intent_fingerprint_mismatch');
    if (priorOutcome.state === STATES.CREATED && priorOutcome.transaction) {
      return Object.freeze({ ...priorOutcome, state: STATES.REPLAY, replayOf: priorOutcome.outcomeFingerprint, transactionAuthority: false, paymentAuthority: false, runtimeAuthority: false });
    }
  }
  const s = snapshot.sourceOrder; const c = snapshot.current;
  if (!snapshot.actorActive) return terminal(STATES.REJECTED, 'actor_inactive');
  if (s.orderId !== intent.sourceOrderId || s.clientId !== intent.actorId) return terminal(STATES.REJECTED, 'source_actor_mismatch');
  if (s.professionalId !== intent.professionalId || s.serviceId !== intent.serviceId) return terminal(STATES.CONFLICT, 'source_subject_mismatch');
  if (s.lineageFingerprint !== intent.sourceLineageFingerprint) return terminal(STATES.CONFLICT, 'source_lineage_mismatch');
  if (s.status !== 'completed' || s.paymentStatus !== 'released' || s.settlementState !== 'reconciled') return terminal(STATES.REJECTED, 'source_order_not_final');
  if (!['none','resolved','appeal_resolved'].includes(s.disputeState)) return terminal(STATES.REJECTED, 'source_dispute_blocks_rehire');
  if (!c.professionalActive || !c.serviceActive || !c.serviceBookable) return terminal(STATES.UNAVAILABLE, 'current_subject_unavailable');
  const changed = [];
  if (intent.requestedScopeFingerprint !== c.scopeFingerprint) changed.push('scope');
  if (intent.requestedLocationFingerprint !== c.locationFingerprint) changed.push('location');
  if (intent.requestedScheduleFingerprint !== c.scheduleFingerprint) changed.push('schedule');
  if (!c.available) changed.push('availability');
  if (Date.parse(snapshot.now) >= Date.parse(c.quoteExpiresAt)) changed.push('quote_expired');
  if (changed.length) return Object.freeze({ ...terminal(STATES.REQUOTE_REQUIRED, 'current_terms_require_refresh'), changed, currentQuoteFingerprint: c.quoteFingerprint, currentAvailabilityFingerprint: c.availabilityFingerprint, currentTermsFingerprint: c.termsFingerprint });
  const x = intent.confirmation;
  const confirmed = x && x.quoteFingerprint === c.quoteFingerprint && x.availabilityFingerprint === c.availabilityFingerprint
    && x.termsFingerprint === c.termsFingerprint && x.scopeFingerprint === c.scopeFingerprint && Date.parse(x.confirmedAt) <= Date.parse(snapshot.now);
  if (!confirmed) return Object.freeze({ ...terminal(STATES.CONFIRMATION_REQUIRED, 'explicit_current_terms_confirmation_required'), currentQuoteFingerprint: c.quoteFingerprint, currentAvailabilityFingerprint: c.availabilityFingerprint, currentTermsFingerprint: c.termsFingerprint, priceCents: c.priceCents, currency: c.currency });
  const transaction = buildTransaction(intent, snapshot);
  const base = { contractId: CONTRACT_ID, state: intent.action === ACTIONS.CREATE ? STATES.CREATED : STATES.READY,
    reason: intent.action === ACTIONS.CREATE ? 'new_transaction_envelope_created' : 'current_terms_confirmed',
    idempotencyKey: intent.idempotencyKey, intentFingerprint: intent.intentFingerprint, transaction,
    transactionAuthority: false, paymentAuthority: false, runtimeAuthority: false };
  return Object.freeze({ ...base, outcomeFingerprint: sha256(stableJson(base)) });
}

function buildRetentionSignal(outcome) {
  if (!outcome || !Object.values(STATES).includes(outcome.state)) throw new Error('invalid_outcome');
  const tx = outcome.transaction || {};
  const signal = { contractId: CONTRACT_ID, event: 'rehire_readiness_evaluated', outcomeState: outcome.state,
    professionalIdHash: tx.professionalId ? sha256(tx.professionalId) : null, serviceIdHash: tx.serviceId ? sha256(tx.serviceId) : null,
    sourceOrderIdHash: tx.sourceOrderId ? sha256(tx.sourceOrderId) : null, newOrderIdHash: tx.newOrderId ? sha256(tx.newOrderId) : null,
    amountIncluded: false, rawIdentityIncluded: false, analyticsWriteAuthority: false, runtimeAuthority: false };
  return Object.freeze({ ...signal, signalFingerprint: sha256(stableJson(signal)) });
}

module.exports = Object.freeze({ CONTRACT_ID, STATES, ACTIONS, FORBIDDEN_KEYS, normalizeIntent, normalizeSnapshot,
  evaluateRehire, buildRetentionSignal, containsForbiddenRawData, deterministicUuid, stableJson, sha256 });
