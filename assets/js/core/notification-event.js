/* Doke canonical notification event contract
   Responsibility: normalize event identity, category, priority and privacy metadata.
   This module is pure presentation/domain-contract glue and does not access repositories or backend. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260809-ux-notif-006-v1';
  var CONTRACT = 'notification-event-v1';
  var POLICY_CONTRACT = 'notification-event-policy-matrix-v1';

  if (Doke.notificationEvent && Doke.notificationEvent.version === VERSION) return;

  var CATEGORIES = Object.freeze([
    'MESSAGES',
    'ORDERS',
    'PROPOSALS',
    'PAYMENTS',
    'DISPUTES',
    'ACCOUNT',
    'SECURITY',
    'COMMUNITIES',
    'SOCIAL',
    'PRODUCT',
    'UNKNOWN_OPERATIONAL'
  ]);

  var PRIORITIES = Object.freeze(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']);
  var ATTENTION_STATES = Object.freeze([
    'INFORMATIONAL',
    'ACTION_REQUIRED',
    'URGENT_ACTION_REQUIRED',
    'RESOLVED'
  ]);
  var PRIVACY_LEVELS = Object.freeze([
    'PUBLIC_PREVIEW',
    'PRIVATE_GENERIC',
    'PRIVATE_AUTHENTICATED',
    'SENSITIVE_NO_OS_PREVIEW'
  ]);
  var SOURCE_AUTHORITIES = Object.freeze([
    'CANONICAL_REMOTE',
    'CANONICAL_LOCAL',
    'DEMO',
    'DERIVED_INFORMATIONAL'
  ]);
  var DOMAINS = Object.freeze([
    'MESSAGES',
    'ORDERS',
    'PROPOSALS',
    'PAYMENTS',
    'DISPUTES',
    'ACCOUNT',
    'SECURITY',
    'COMMUNITIES',
    'SOCIAL',
    'PRODUCT',
    'UNKNOWN_OPERATIONAL'
  ]);

  var CHANNEL_VALUES = Object.freeze({
    inbox: Object.freeze(['required', 'optional', 'forbidden']),
    toast: Object.freeze(['allowed', 'silent', 'forbidden']),
    browser: Object.freeze(['allowed', 'generic_only', 'forbidden']),
    sound: Object.freeze(['allowed', 'forbidden']),
    digest: Object.freeze(['allowed', 'forbidden'])
  });

  var PREFIX_CATEGORY = Object.freeze({
    message: 'MESSAGES',
    conversation: 'MESSAGES',
    order: 'ORDERS',
    request: 'ORDERS',
    proposal: 'PROPOSALS',
    budget: 'PROPOSALS',
    payment: 'PAYMENTS',
    charge: 'PAYMENTS',
    refund: 'PAYMENTS',
    payout: 'PAYMENTS',
    wallet: 'PAYMENTS',
    dispute: 'DISPUTES',
    chargeback: 'DISPUTES',
    account: 'ACCOUNT',
    profile: 'ACCOUNT',
    security: 'SECURITY',
    auth: 'SECURITY',
    session: 'SECURITY',
    community: 'COMMUNITIES',
    reaction: 'SOCIAL',
    follow: 'SOCIAL',
    social: 'SOCIAL',
    product: 'PRODUCT',
    announcement: 'PRODUCT'
  });

  var CRITICAL_OPERATIONAL_PREFIXES = Object.freeze([
    'payment', 'charge', 'refund', 'payout', 'wallet',
    'dispute', 'chargeback', 'security', 'auth', 'session'
  ]);

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeUpper(value) {
    return normalizeText(value).replace(/[\s-]+/g, '_').toUpperCase();
  }

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_error) { return value; }
  }

  function includes(list, value) {
    return list.indexOf(value) !== -1;
  }

  function createPolicy(category, priority, attentionState, actionRequired) {
    return Object.freeze({
      contract: POLICY_CONTRACT,
      category: category,
      priority: priority,
      attentionState: attentionState,
      actionRequired: actionRequired === true
    });
  }

  var EVENT_POLICY = Object.freeze({
    message_received: createPolicy('MESSAGES', 'NORMAL', 'INFORMATIONAL', false),

    order_created: createPolicy('ORDERS', 'HIGH', 'ACTION_REQUIRED', true),
    order_status_changed: createPolicy('ORDERS', 'NORMAL', 'INFORMATIONAL', false),
    order_accepted: createPolicy('ORDERS', 'NORMAL', 'INFORMATIONAL', false),
    order_in_progress: createPolicy('ORDERS', 'NORMAL', 'INFORMATIONAL', false),
    order_completed: createPolicy('ORDERS', 'NORMAL', 'RESOLVED', false),
    order_cancelled: createPolicy('ORDERS', 'NORMAL', 'RESOLVED', false),
    order_reviewed: createPolicy('ORDERS', 'LOW', 'INFORMATIONAL', false),
    order_completion_requested: createPolicy('ORDERS', 'HIGH', 'ACTION_REQUIRED', true),

    proposal_sent: createPolicy('PROPOSALS', 'HIGH', 'ACTION_REQUIRED', true),
    proposal_approved: createPolicy('PROPOSALS', 'HIGH', 'INFORMATIONAL', false),
    proposal_rejected: createPolicy('PROPOSALS', 'NORMAL', 'RESOLVED', false),

    payment_held: createPolicy('PAYMENTS', 'HIGH', 'INFORMATIONAL', false),
    wallet_receivable_available: createPolicy('PAYMENTS', 'NORMAL', 'INFORMATIONAL', false),
    wallet_withdraw_requested: createPolicy('PAYMENTS', 'NORMAL', 'INFORMATIONAL', false),
    wallet_withdraw_completed: createPolicy('PAYMENTS', 'NORMAL', 'RESOLVED', false),
    wallet_withdraw_declined: createPolicy('PAYMENTS', 'HIGH', 'ACTION_REQUIRED', true),

    dispute_opened: createPolicy('DISPUTES', 'CRITICAL', 'URGENT_ACTION_REQUIRED', true),
    dispute_reported: createPolicy('DISPUTES', 'HIGH', 'INFORMATIONAL', false),
    dispute_responded: createPolicy('DISPUTES', 'HIGH', 'INFORMATIONAL', false),
    dispute_resolved: createPolicy('DISPUTES', 'HIGH', 'RESOLVED', false)
  });

  function getPolicy(eventType) {
    var normalized = normalizeText(eventType).toLowerCase();
    return EVENT_POLICY[normalized] || null;
  }

  function eventPrefix(eventType) {
    return normalizeText(eventType).toLowerCase().split(/[.:/_-]/)[0] || '';
  }

  function inferCategory(eventType) {
    var prefix = eventPrefix(eventType);
    return PREFIX_CATEGORY[prefix] || 'UNKNOWN_OPERATIONAL';
  }

  function normalizeCategory(value, eventType) {
    var explicit = normalizeUpper(value);
    if (explicit && includes(CATEGORIES, explicit)) return explicit;
    return inferCategory(eventType);
  }

  function normalizePriority(value) {
    var normalized = normalizeUpper(value || 'NORMAL');
    return includes(PRIORITIES, normalized) ? normalized : 'NORMAL';
  }

  function normalizeAttention(value, actionRequired) {
    var normalized = normalizeUpper(value);
    if (includes(ATTENTION_STATES, normalized)) return normalized;
    return actionRequired === true ? 'ACTION_REQUIRED' : 'INFORMATIONAL';
  }

  function normalizePrivacy(value) {
    var normalized = normalizeUpper(value || 'PRIVATE_AUTHENTICATED');
    return includes(PRIVACY_LEVELS, normalized) ? normalized : 'PRIVATE_AUTHENTICATED';
  }

  function normalizeSourceAuthority(value) {
    var normalized = normalizeUpper(value);
    return includes(SOURCE_AUTHORITIES, normalized) ? normalized : '';
  }

  function normalizeDomain(value, category) {
    var normalized = normalizeUpper(value);
    if (includes(DOMAINS, normalized)) return normalized;
    return includes(DOMAINS, category) ? category : 'UNKNOWN_OPERATIONAL';
  }

  function normalizeChannelValue(channel, value) {
    var normalized = normalizeText(value).toLowerCase();
    var allowed = CHANNEL_VALUES[channel] || [];
    return includes(allowed, normalized) ? normalized : '';
  }

  function defaultChannelPolicy(category, privacyLevel) {
    var browser = privacyLevel === 'SENSITIVE_NO_OS_PREVIEW' ? 'forbidden' : 'generic_only';
    var critical = category === 'SECURITY' || category === 'DISPUTES';
    return Object.freeze({
      inbox: 'required',
      toast: critical ? 'allowed' : 'silent',
      browser: browser,
      sound: 'forbidden',
      digest: critical ? 'forbidden' : 'allowed'
    });
  }

  function normalizeChannelPolicy(raw, category, privacyLevel) {
    var defaults = defaultChannelPolicy(category, privacyLevel);
    raw = raw && typeof raw === 'object' ? raw : {};
    return Object.freeze({
      inbox: normalizeChannelValue('inbox', raw.inbox) || defaults.inbox,
      toast: normalizeChannelValue('toast', raw.toast) || defaults.toast,
      browser: normalizeChannelValue('browser', raw.browser) || defaults.browser,
      sound: normalizeChannelValue('sound', raw.sound) || defaults.sound,
      digest: normalizeChannelValue('digest', raw.digest) || defaults.digest
    });
  }

  function primaryEntity(raw) {
    raw = raw || {};
    return normalizeText(
      raw.primaryEntityId
      || raw.messageId
      || raw.orderId
      || raw.proposalId
      || raw.paymentId
      || raw.disputeId
      || raw.conversationId
      || raw.communityId
      || raw.serviceId
      || ''
    );
  }

  function legacyFingerprint(raw) {
    raw = raw || {};
    return normalizeText(raw.domainSequence || raw.sequence || raw.fingerprint || raw.revision || '');
  }

  function buildLegacyDedupeKey(raw, eventType) {
    var entity = primaryEntity(raw);
    var fingerprint = legacyFingerprint(raw);
    if (!eventType || !entity || !fingerprint) return '';
    return ['legacy', eventType, entity, fingerprint].join(':');
  }

  function resolveIdentity(raw, eventType) {
    raw = raw || {};
    var eventId = normalizeText(raw.eventId || raw.event_id || '');
    var explicitDedupe = normalizeText(raw.dedupeKey || raw.eventKey || raw.event_key || '');
    var fallback = buildLegacyDedupeKey(raw, eventType);
    var dedupeKey = eventId || explicitDedupe || fallback;
    return Object.freeze({
      eventId: eventId,
      dedupeKey: dedupeKey,
      identitySource: eventId ? 'eventId' : explicitDedupe ? 'explicit-dedupe' : fallback ? 'legacy-fallback' : 'missing'
    });
  }

  function isCriticalOperational(eventType, category) {
    if (category === 'PAYMENTS' || category === 'DISPUTES' || category === 'SECURITY') return true;
    return includes(CRITICAL_OPERATIONAL_PREFIXES, eventPrefix(eventType));
  }

  function isCanonicalSource(sourceAuthority) {
    return sourceAuthority === 'CANONICAL_REMOTE' || sourceAuthority === 'CANONICAL_LOCAL';
  }

  function getExplicitCanonicalCategory(raw) {
    raw = raw || {};
    var explicit = normalizeUpper(raw.eventCategory || raw.canonicalCategory || '');
    return explicit;
  }

  function normalize(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var eventType = normalizeText(raw.eventType || raw.type || '').toLowerCase();
    var policy = getPolicy(eventType);
    var explicitCanonicalCategory = getExplicitCanonicalCategory(raw);
    var policyCategoryConflict = Boolean(
      policy
      && explicitCanonicalCategory
      && (!includes(CATEGORIES, explicitCanonicalCategory) || explicitCanonicalCategory !== policy.category)
    );
    var rawActionRequired = raw.actionRequired === true || raw.action_required === true;
    var actionRequired = policy ? policy.actionRequired : rawActionRequired;
    var category = policy
      ? policy.category
      : normalizeCategory(raw.eventCategory || raw.canonicalCategory || raw.category, eventType);
    var priority = policy ? policy.priority : normalizePriority(raw.priority);
    var attentionState = policy
      ? policy.attentionState
      : normalizeAttention(raw.attentionState || raw.attention_state, actionRequired);
    var sourceAuthority = normalizeSourceAuthority(raw.sourceAuthority || raw.source_authority);
    var identity = resolveIdentity(raw, eventType);
    var privacyLevel = normalizePrivacy(raw.privacyLevel || raw.privacy_level);
    var sourceDomain = normalizeDomain(raw.sourceDomain || raw.source_domain, category);
    var criticalOperational = isCriticalOperational(eventType, category);
    var canonicalSourceRequired = criticalOperational;
    var sourceAccepted = !canonicalSourceRequired || isCanonicalSource(sourceAuthority);
    var classificationAccepted = category !== 'UNKNOWN_OPERATIONAL';
    var identityAccepted = Boolean(identity.dedupeKey);
    var accepted = Boolean(
      eventType
      && identityAccepted
      && classificationAccepted
      && !policyCategoryConflict
      && sourceAccepted
    );

    return Object.freeze({
      contract: CONTRACT,
      eventId: identity.eventId,
      eventType: eventType,
      eventVersion: Math.max(1, Number(raw.eventVersion || raw.event_version || 1) || 1),
      sourceDomain: sourceDomain,
      sourceAuthority: sourceAuthority,
      dedupeKey: identity.dedupeKey,
      aggregationKey: normalizeText(raw.aggregationKey || raw.aggregation_key || ''),
      category: category,
      priority: priority,
      attentionState: attentionState,
      actionRequired: actionRequired,
      privacyLevel: privacyLevel,
      channelPolicy: normalizeChannelPolicy(raw.channelPolicy || raw.channel_policy, category, privacyLevel),
      accepted: accepted,
      rejectionReason: accepted
        ? ''
        : !eventType
          ? 'missing-event-type'
          : !identityAccepted
            ? 'missing-event-identity'
            : policyCategoryConflict
              ? 'event-policy-category-mismatch'
              : !classificationAccepted
                ? 'unknown-operational-category'
                : !sourceAccepted
                  ? 'non-canonical-critical-source'
                  : 'invalid-event',
      identitySource: identity.identitySource,
      criticalOperational: criticalOperational
    });
  }

  function diagnostic(event, reason) {
    event = event || {};
    return Object.freeze({
      contract: CONTRACT,
      version: VERSION,
      accepted: event.accepted === true,
      category: includes(CATEGORIES, event.category) ? event.category : 'UNKNOWN_OPERATIONAL',
      priority: includes(PRIORITIES, event.priority) ? event.priority : 'NORMAL',
      attentionState: includes(ATTENTION_STATES, event.attentionState) ? event.attentionState : 'INFORMATIONAL',
      identitySource: normalizeText(event.identitySource || 'missing'),
      criticalOperational: event.criticalOperational === true,
      reason: normalizeText(reason || event.rejectionReason || 'normalize')
    });
  }

  var api = Object.freeze({
    version: VERSION,
    contract: CONTRACT,
    policyContract: POLICY_CONTRACT,
    categories: CATEGORIES,
    priorities: PRIORITIES,
    attentionStates: ATTENTION_STATES,
    privacyLevels: PRIVACY_LEVELS,
    sourceAuthorities: SOURCE_AUTHORITIES,
    domains: DOMAINS,
    inferCategory: inferCategory,
    getPolicy: getPolicy,
    normalize: normalize,
    getDedupeKey: function (raw) {
      var eventType = normalizeText(raw && (raw.eventType || raw.type) || '').toLowerCase();
      return resolveIdentity(raw || {}, eventType).dedupeKey;
    },
    diagnostic: diagnostic
  });

  Doke.notificationEvent = api;
}());