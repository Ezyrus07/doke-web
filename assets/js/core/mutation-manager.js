/* Doke mutation manager
   Responsibility: one logical intent, one in-flight command, explicit receipts,
   safe unknown-outcome handling and authoritative reconciliation hooks. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var VERSION = '20260804-ux-core-002-v1';

  if (Doke.formMutationManager && Doke.formMutationManager.version === VERSION) return;

  var STATES = Object.freeze({
    IDLE: 'idle',
    VALIDATING: 'validating',
    SUBMITTING: 'submitting',
    ACCEPTED: 'accepted',
    CONFIRMED: 'confirmed',
    REJECTED: 'rejected',
    UNKNOWN_OUTCOME: 'unknown_outcome',
    RECONCILING: 'reconciling',
    CONFLICT: 'conflict',
    CANCELLED: 'cancelled'
  });

  var TERMINAL_STATES = Object.freeze([
    STATES.CONFIRMED,
    STATES.REJECTED,
    STATES.CONFLICT,
    STATES.CANCELLED
  ]);

  var TRANSITIONS = Object.freeze({
    idle: Object.freeze(['validating', 'submitting', 'cancelled']),
    validating: Object.freeze(['submitting', 'rejected', 'conflict', 'cancelled']),
    submitting: Object.freeze(['accepted', 'confirmed', 'rejected', 'unknown_outcome', 'conflict', 'cancelled']),
    accepted: Object.freeze(['confirmed', 'rejected', 'unknown_outcome', 'reconciling', 'conflict']),
    unknown_outcome: Object.freeze(['reconciling', 'cancelled']),
    reconciling: Object.freeze(['confirmed', 'rejected', 'unknown_outcome', 'conflict']),
    confirmed: Object.freeze([]),
    rejected: Object.freeze([]),
    conflict: Object.freeze([]),
    cancelled: Object.freeze([])
  });

  var activeByDedupeKey = new Map();
  var recordsByIntentId = new Map();
  var fingerprintsByIdempotencyKey = new Map();
  var receiptsByIntentId = new Map();
  var intentIdsByIdempotencyKey = new Map();
  var sequence = 0;

  function now() {
    return Date.now();
  }

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return prefix + ':' + window.crypto.randomUUID();
    }
    sequence += 1;
    return prefix + ':' + now().toString(36) + ':' + sequence.toString(36) + ':' + Math.random().toString(36).slice(2, 10);
  }

  function canonicalize(value, seen) {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
      if (typeof value === 'undefined') return null;
      return value;
    }

    seen = seen || [];
    if (seen.indexOf(value) !== -1) throw new TypeError('Mutation payload cannot contain circular references.');
    seen.push(value);

    var normalized;
    if (Array.isArray(value)) {
      normalized = value.map(function (item) { return canonicalize(item, seen); });
    } else {
      normalized = {};
      Object.keys(value).sort().forEach(function (key) {
        var item = value[key];
        if (typeof item === 'function' || typeof item === 'symbol' || typeof item === 'undefined') return;
        normalized[key] = canonicalize(item, seen);
      });
    }

    seen.pop();
    return normalized;
  }

  function stableSerialize(value) {
    return JSON.stringify(canonicalize(value));
  }

  function hashString(input) {
    var hash = 2166136261;
    var text = String(input || '');
    for (var index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function fingerprint(payload) {
    return 'fp1:' + hashString(stableSerialize(payload));
  }

  function normalizeText(value, fallback) {
    var text = String(value == null ? '' : value).trim();
    return text || fallback || '';
  }

  function publicRecord(record) {
    if (!record) return null;
    return Object.freeze({
      intentId: record.intent.intentId,
      idempotencyKey: record.intent.idempotencyKey,
      dedupeKey: record.intent.dedupeKey,
      domain: record.intent.domain,
      action: record.intent.action,
      entityType: record.intent.entityType,
      entityId: record.intent.entityId,
      payloadFingerprint: record.intent.payloadFingerprint,
      state: record.state,
      createdAt: record.intent.createdAt,
      updatedAt: record.updatedAt,
      attemptCount: record.attemptCount,
      receipt: record.receipt || null,
      errorCode: record.errorCode || '',
      dedupedCount: record.dedupedCount || 0
    });
  }

  function dispatch(name, record, extra) {
    var detail = Object.assign({ mutation: publicRecord(record) }, extra || {});
    document.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  function resolveBoundary(boundary) {
    if (!boundary) return null;
    if (typeof boundary === 'string') return document.querySelector(boundary);
    return boundary;
  }

  function mapViewState(state) {
    if (state === STATES.VALIDATING || state === STATES.SUBMITTING || state === STATES.ACCEPTED) return 'submitting';
    if (state === STATES.CONFIRMED) return 'success';
    if (state === STATES.UNKNOWN_OUTCOME) return 'unknown_outcome';
    if (state === STATES.RECONCILING) return 'reconciling';
    if (state === STATES.CONFLICT) return 'conflict';
    if (state === STATES.REJECTED) return 'error';
    return null;
  }

  function syncBoundary(record, options) {
    var boundary = resolveBoundary(options && options.boundary);
    var state = mapViewState(record.state);
    if (!boundary || !state) return;

    var contracts = Doke.stateContracts;
    var contentKey = 'view.' + state;
    if (contracts && typeof contracts.setBoundaryState === 'function') {
      contracts.setBoundaryState(boundary, state, {
        contentKey: contentKey,
        announce: state !== 'success'
      });
      return;
    }

    boundary.setAttribute('data-view-state', state);
    boundary.setAttribute('aria-busy', ['submitting', 'reconciling'].indexOf(state) !== -1 ? 'true' : 'false');
  }

  function canTransition(fromState, toState) {
    var allowed = TRANSITIONS[fromState];
    return Boolean(allowed && allowed.indexOf(toState) !== -1);
  }

  function transition(record, nextState, options, extra) {
    if (!record || !canTransition(record.state, nextState)) {
      var error = new Error('Invalid mutation transition: ' + (record ? record.state : 'missing') + ' -> ' + nextState);
      error.code = 'DOKE_MUTATION_INVALID_TRANSITION';
      if (record) dispatch('doke:mutation-transition-rejected', record, { requestedState: nextState });
      throw error;
    }

    var previousState = record.state;
    record.state = nextState;
    record.updatedAt = now();
    if (extra && extra.errorCode) record.errorCode = String(extra.errorCode);
    syncBoundary(record, options || record.options);

    if (record.options && typeof record.options.onStateChange === 'function') {
      record.options.onStateChange(publicRecord(record), previousState);
    }

    dispatch('doke:mutation-state-changed', record, {
      previousState: previousState,
      state: nextState
    });
    return record;
  }

  function createIntent(options) {
    options = options || {};
    var domain = normalizeText(options.domain, 'general');
    var action = normalizeText(options.action, 'mutate');
    var accountId = normalizeText(options.accountId, 'guest');
    var entityType = normalizeText(options.entityType, 'resource');
    var entityId = normalizeText(options.entityId, 'default');
    var payloadFingerprint = options.payloadFingerprint || fingerprint(options.payload == null ? null : options.payload);
    var intentId = normalizeText(options.intentId, createId('intent'));
    var idempotencyKey = normalizeText(options.idempotencyKey, createId('idem'));
    var dedupeKey = normalizeText(
      options.dedupeKey,
      [accountId, domain, action, entityType, entityId, payloadFingerprint].join('|')
    );

    return Object.freeze({
      intentId: intentId,
      idempotencyKey: idempotencyKey,
      dedupeKey: dedupeKey,
      domain: domain,
      action: action,
      accountId: accountId,
      entityType: entityType,
      entityId: entityId,
      payloadFingerprint: payloadFingerprint,
      createdAt: now()
    });
  }

  function assertIdempotency(intent) {
    var known = fingerprintsByIdempotencyKey.get(intent.idempotencyKey);
    if (known && known !== intent.payloadFingerprint) {
      var conflict = new Error('Idempotency key reused with a different payload.');
      conflict.code = 'DOKE_MUTATION_PAYLOAD_CONFLICT';
      conflict.mutationState = STATES.CONFLICT;
      throw conflict;
    }
    fingerprintsByIdempotencyKey.set(intent.idempotencyKey, intent.payloadFingerprint);
    return intentIdsByIdempotencyKey.get(intent.idempotencyKey) || '';
  }

  function classifyError(error, options, record) {
    if (options && typeof options.classifyError === 'function') {
      var classified = options.classifyError(error, publicRecord(record));
      if (classified && Object.values(STATES).indexOf(classified) !== -1) return classified;
    }

    if (error && error.mutationState && Object.values(STATES).indexOf(error.mutationState) !== -1) {
      return error.mutationState;
    }
    if (error && (error.name === 'AbortError' || error.code === 'DOKE_MUTATION_CANCELLED')) return STATES.CANCELLED;
    if (error && (error.unknownOutcome === true || ['TIMEOUT', 'NETWORK_RESPONSE_LOST', 'UNKNOWN_OUTCOME'].indexOf(error.code) !== -1)) {
      return STATES.UNKNOWN_OUTCOME;
    }
    if (error && error.code === 'DOKE_MUTATION_PAYLOAD_CONFLICT') return STATES.CONFLICT;
    return STATES.REJECTED;
  }

  function createReceipt(record, result, options) {
    var authorityReceipt = result && result.authorityReceipt && typeof result.authorityReceipt === 'object'
      ? result.authorityReceipt
      : null;
    var receipt = Object.freeze({
      receiptId: normalizeText(authorityReceipt && authorityReceipt.receiptId, createId('receipt')),
      intentId: record.intent.intentId,
      idempotencyKey: record.intent.idempotencyKey,
      domain: record.intent.domain,
      action: record.intent.action,
      entityType: record.intent.entityType,
      entityId: record.intent.entityId,
      payloadFingerprint: record.intent.payloadFingerprint,
      status: STATES.CONFIRMED,
      authority: normalizeText(
        authorityReceipt && authorityReceipt.authority,
        normalizeText(options && options.authority, 'client-confirmed')
      ),
      authorityReference: normalizeText(authorityReceipt && authorityReceipt.authorityReference, ''),
      confirmedAt: Number(authorityReceipt && authorityReceipt.confirmedAt) || now(),
      resultFingerprint: fingerprint(result && Object.prototype.hasOwnProperty.call(result, 'value') ? result.value : result)
    });
    record.receipt = receipt;
    receiptsByIntentId.set(record.intent.intentId, receipt);
    dispatch('doke:mutation-receipt', record, { receipt: receipt });
    return receipt;
  }

  function execute(options) {
    options = options || {};
    if (typeof options.request !== 'function') {
      return Promise.reject(new TypeError('Mutation request is required.'));
    }

    var intent;
    var knownIntentId;
    try {
      intent = options.intent || createIntent(options);
      knownIntentId = assertIdempotency(intent);
    } catch (error) {
      return Promise.reject(error);
    }

    var knownRecord = knownIntentId ? recordsByIntentId.get(knownIntentId) : recordsByIntentId.get(intent.intentId);
    if (knownRecord) {
      if (knownRecord.state === STATES.CONFIRMED && knownRecord.receipt) {
        return Promise.resolve(Object.freeze({
          state: STATES.CONFIRMED,
          intent: knownRecord.intent,
          result: null,
          receipt: knownRecord.receipt,
          mutation: publicRecord(knownRecord),
          replayed: true
        }));
      }
      if (knownRecord.state === STATES.ACCEPTED || knownRecord.state === STATES.UNKNOWN_OUTCOME || knownRecord.state === STATES.RECONCILING) {
        return Promise.resolve(Object.freeze({
          state: knownRecord.state,
          intent: knownRecord.intent,
          result: null,
          receipt: knownRecord.receipt || null,
          mutation: publicRecord(knownRecord),
          replayed: true
        }));
      }
    }

    var active = activeByDedupeKey.get(intent.dedupeKey);
    if (active) {
      active.record.dedupedCount += 1;
      dispatch('doke:mutation-deduped', active.record);
      return active.promise;
    }

    var record = {
      intent: intent,
      state: STATES.IDLE,
      updatedAt: intent.createdAt,
      attemptCount: 0,
      dedupedCount: 0,
      snapshot: undefined,
      receipt: null,
      errorCode: '',
      options: options
    };
    recordsByIntentId.set(intent.intentId, record);
    intentIdsByIdempotencyKey.set(intent.idempotencyKey, intent.intentId);

    try {
      transition(record, STATES.VALIDATING, options);
      if (typeof options.validate === 'function') options.validate(intent);
      if (typeof options.apply === 'function') record.snapshot = options.apply(intent);
      transition(record, STATES.SUBMITTING, options);
    } catch (error) {
      var setupState = classifyError(error, options, record);
      if (canTransition(record.state, setupState)) transition(record, setupState, options, { errorCode: error.code || '' });
      return Promise.reject(error);
    }

    record.attemptCount += 1;

    var task = Promise.resolve()
      .then(function () {
        return options.request({
          intent: intent,
          idempotencyKey: intent.idempotencyKey,
          payloadFingerprint: intent.payloadFingerprint,
          attempt: record.attemptCount
        });
      })
      .then(function (result) {
        var accepted = Boolean(result && result.accepted === true && result.confirmed !== true);
        if (accepted) {
          transition(record, STATES.ACCEPTED, options);
          return Object.freeze({
            state: STATES.ACCEPTED,
            intent: intent,
            result: result,
            receipt: null,
            mutation: publicRecord(record)
          });
        }

        if (typeof options.commit === 'function') options.commit(result, record.snapshot, intent);
        transition(record, STATES.CONFIRMED, options);
        var receipt = createReceipt(record, result, options);
        return Object.freeze({
          state: STATES.CONFIRMED,
          intent: intent,
          result: result && Object.prototype.hasOwnProperty.call(result, 'value') ? result.value : result,
          receipt: receipt,
          mutation: publicRecord(record)
        });
      })
      .catch(function (error) {
        var failureState = classifyError(error, options, record);
        var shouldRollback = failureState === STATES.REJECTED || failureState === STATES.CONFLICT || failureState === STATES.CANCELLED;
        if (shouldRollback && typeof options.rollback === 'function') {
          options.rollback(record.snapshot, error, intent);
        }
        if (canTransition(record.state, failureState)) {
          transition(record, failureState, options, { errorCode: error && error.code ? error.code : '' });
        }
        error.mutation = publicRecord(record);
        throw error;
      })
      .finally(function () {
        activeByDedupeKey.delete(intent.dedupeKey);
      });

    activeByDedupeKey.set(intent.dedupeKey, { promise: task, record: record });
    return task;
  }

  function reconcile(intentId, reconciler, options) {
    var record = recordsByIntentId.get(String(intentId || ''));
    if (!record) return Promise.reject(new Error('Mutation intent not found.'));
    if (typeof reconciler !== 'function') return Promise.reject(new TypeError('Mutation reconciler is required.'));
    if (record.state !== STATES.UNKNOWN_OUTCOME && record.state !== STATES.ACCEPTED) {
      return Promise.reject(new Error('Mutation is not eligible for reconciliation.'));
    }

    options = Object.assign({}, record.options, options || {});
    transition(record, STATES.RECONCILING, options);
    record.attemptCount += 1;

    return Promise.resolve()
      .then(function () {
        return reconciler({
          intent: record.intent,
          idempotencyKey: record.intent.idempotencyKey,
          payloadFingerprint: record.intent.payloadFingerprint,
          attempt: record.attemptCount
        });
      })
      .then(function (result) {
        if (result && result.unknownOutcome === true) {
          transition(record, STATES.UNKNOWN_OUTCOME, options);
          return Object.freeze({ state: STATES.UNKNOWN_OUTCOME, intent: record.intent, receipt: null, mutation: publicRecord(record) });
        }
        if (result && result.conflict === true) {
          transition(record, STATES.CONFLICT, options);
          return Object.freeze({ state: STATES.CONFLICT, intent: record.intent, receipt: null, mutation: publicRecord(record) });
        }
        if (result && result.confirmed === false) {
          if (typeof options.rollback === 'function') options.rollback(record.snapshot, null, record.intent);
          transition(record, STATES.REJECTED, options);
          return Object.freeze({ state: STATES.REJECTED, intent: record.intent, receipt: null, mutation: publicRecord(record) });
        }

        if (typeof options.commit === 'function') options.commit(result, record.snapshot, record.intent);
        transition(record, STATES.CONFIRMED, options);
        var receipt = createReceipt(record, result, options);
        return Object.freeze({
          state: STATES.CONFIRMED,
          intent: record.intent,
          result: result && Object.prototype.hasOwnProperty.call(result, 'value') ? result.value : result,
          receipt: receipt,
          mutation: publicRecord(record)
        });
      })
      .catch(function (error) {
        var failureState = classifyError(error, options, record);
        var shouldRollback = failureState === STATES.REJECTED || failureState === STATES.CONFLICT || failureState === STATES.CANCELLED;
        if (shouldRollback && typeof options.rollback === 'function') options.rollback(record.snapshot, error, record.intent);
        if (canTransition(record.state, failureState)) transition(record, failureState, options, { errorCode: error.code || '' });
        error.mutation = publicRecord(record);
        throw error;
      });
  }

  function get(intentId) {
    return publicRecord(recordsByIntentId.get(String(intentId || '')));
  }

  function getReceipt(intentId) {
    return receiptsByIntentId.get(String(intentId || '')) || null;
  }

  function isInFlight(dedupeKey) {
    return activeByDedupeKey.has(String(dedupeKey || ''));
  }

  Doke.formMutationManager = Object.freeze({
    version: VERSION,
    states: STATES,
    terminalStates: TERMINAL_STATES,
    transitions: TRANSITIONS,
    createIntent: createIntent,
    execute: execute,
    reconcile: reconcile,
    get: get,
    getReceipt: getReceipt,
    isInFlight: isInFlight,
    fingerprint: fingerprint,
    stableSerialize: stableSerialize
  });
})();
