(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260804-ux-cards-001-v1';
  var CONTRACT_VERSION = 'card-contract-v1';

  var CARD_KINDS = Object.freeze({
    SERVICE: 'service',
    PROFESSIONAL: 'professional',
    EDITORIAL: 'editorial',
    PUBLICATION: 'publication',
    BEFORE_AFTER: 'before_after',
    WORKER: 'worker',
    UNKNOWN: 'unknown'
  });

  var AUTHORITIES = Object.freeze({
    REMOTE_CATALOG: 'remote_catalog',
    SERVER_RECONCILED: 'server_reconciled',
    PLATFORM_EDITORIAL: 'platform_editorial',
    LOCAL_FIXTURE: 'local_fixture',
    USER_GENERATED: 'user_generated',
    UNKNOWN: 'unknown'
  });

  var IDENTITY_STATES = Object.freeze({
    NOT_APPLICABLE: 'not_applicable',
    UNKNOWN: 'unknown',
    DECLARED: 'declared',
    PROFILE_LINKED: 'profile_linked',
    VERIFIED: 'verified',
    DISPUTED: 'disputed'
  });

  var VERIFICATION_STATES = Object.freeze({
    NOT_APPLICABLE: 'not_applicable',
    UNVERIFIED: 'unverified',
    UNPROVEN: 'unproven',
    VERIFIED: 'verified',
    DISPUTED: 'disputed',
    UNKNOWN: 'unknown'
  });

  var VERIFICATION_PROVENANCE = Object.freeze({
    NONE: 'none',
    SELF_DECLARED: 'self_declared',
    PROFILE_SNAPSHOT: 'profile_snapshot',
    PROFESSIONAL_VERIFICATION_AUTHORITY: 'professional_verification_authority',
    SERVER_ATTESTED: 'server_attested',
    KYC_REVIEWED: 'kyc_reviewed',
    UNKNOWN: 'unknown'
  });

  var MEDIA_STATES = Object.freeze({
    EMPTY: 'empty',
    RESERVED: 'reserved',
    LOADING: 'loading',
    READY: 'ready',
    ERROR: 'error'
  });

  var MEDIA_PRIORITIES = Object.freeze({
    CRITICAL: 'critical',
    IMPORTANT: 'important',
    OPTIONAL: 'optional'
  });

  var RENDER_TIERS = Object.freeze({
    INITIAL: 'initial',
    DEFERRED: 'deferred'
  });

  var TRUSTED_VERIFICATION_PROVENANCE = Object.freeze([
    VERIFICATION_PROVENANCE.PROFESSIONAL_VERIFICATION_AUTHORITY,
    VERIFICATION_PROVENANCE.SERVER_ATTESTED,
    VERIFICATION_PROVENANCE.KYC_REVIEWED
  ]);

  var listeners = new Set();

  function token(value, fallback) {
    var normalized = String(value == null ? '' : value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._:-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 96);
    if (normalized) return normalized;
    return arguments.length > 1 ? fallback : 'unknown';
  }

  function finite(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, minimum, maximum, fallback) {
    var number = finite(value, fallback);
    return Math.min(maximum, Math.max(minimum, number));
  }

  function fingerprint(value) {
    var input = String(value == null ? '' : value);
    var hash = 2166136261;
    for (var index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(String(value || '').trim());
  }

  function enumValue(collection, value, fallback) {
    var normalized = token(value, '');
    return Object.keys(collection).some(function (key) { return collection[key] === normalized; })
      ? normalized
      : fallback;
  }

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze(value[key]); });
    return Object.freeze(value);
  }

  function emit(type, detail) {
    var payload = Object.freeze(Object.assign({
      type: token(type, 'event'),
      contractVersion: CONTRACT_VERSION
    }, detail || {}));
    listeners.forEach(function (listener) {
      try { listener(payload); } catch (error) { console.error('[DokeCards]', error); }
    });
    try {
      document.dispatchEvent(new CustomEvent('doke:card-experience', { detail: payload }));
    } catch (error) {}
    return payload;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.add(listener);
    return function unsubscribe() { listeners.delete(listener); };
  }

  function normalizeAuthority(input, options) {
    input = input || {};
    options = options || {};
    var explicit = enumValue(AUTHORITIES, options.authority || input.cardAuthority || input.sourceAuthority, '');
    if (explicit) return explicit;

    if (options.editorial === true || input.editorial === true) {
      return AUTHORITIES.PLATFORM_EDITORIAL;
    }

    var provider = token(input.provider || input.dataProvider || input.sourceProvider, '');
    var syncStatus = token(input.syncStatus || input.sync_status, '');
    var remoteId = input.remoteId || input.remote_id || '';
    var canonicalId = input.serviceId || input.id || '';

    if (
      isUuid(remoteId)
      || (provider === 'supabase' && isUuid(canonicalId))
      || (syncStatus === 'synced' && (isUuid(remoteId) || isUuid(canonicalId)))
    ) {
      return AUTHORITIES.REMOTE_CATALOG;
    }

    if (
      syncStatus.indexOf('server') !== -1
      || syncStatus === 'reconciled'
      || provider === 'server'
    ) {
      return AUTHORITIES.SERVER_RECONCILED;
    }

    if (
      syncStatus.indexOf('fixture') !== -1
      || syncStatus.indexOf('local') !== -1
      || provider === 'mock'
      || provider === 'fixture'
    ) {
      return AUTHORITIES.LOCAL_FIXTURE;
    }

    if (input.userGenerated === true) return AUTHORITIES.USER_GENERATED;
    return AUTHORITIES.UNKNOWN;
  }

  function normalizeProvenance(value) {
    var normalized = token(value, '');
    var aliases = {
      professional_verification_operations: VERIFICATION_PROVENANCE.PROFESSIONAL_VERIFICATION_AUTHORITY,
      professional_verification_service: VERIFICATION_PROVENANCE.PROFESSIONAL_VERIFICATION_AUTHORITY,
      professional_verification: VERIFICATION_PROVENANCE.PROFESSIONAL_VERIFICATION_AUTHORITY,
      kyc: VERIFICATION_PROVENANCE.KYC_REVIEWED,
      reviewer_approved: VERIFICATION_PROVENANCE.KYC_REVIEWED,
      server: VERIFICATION_PROVENANCE.SERVER_ATTESTED,
      public_profile: VERIFICATION_PROVENANCE.PROFILE_SNAPSHOT
    };
    if (aliases[normalized]) return aliases[normalized];
    return enumValue(VERIFICATION_PROVENANCE, normalized, VERIFICATION_PROVENANCE.UNKNOWN);
  }

  function normalizeIdentity(input, options) {
    input = input || {};
    options = options || {};

    if (options.identityApplicable === false) {
      return freeze({
        state: IDENTITY_STATES.NOT_APPLICABLE,
        verification: VERIFICATION_STATES.NOT_APPLICABLE,
        provenance: VERIFICATION_PROVENANCE.NONE,
        badgeEligible: false
      });
    }

    var identityId = input.providerId
      || input.professionalId
      || input.ownerId
      || input.profileId
      || input.professionalProfileId
      || '';
    var declaredName = input.providerName || input.professionalName || input.displayName || '';
    var verification = input.verification && typeof input.verification === 'object'
      ? input.verification
      : {};
    var status = token(
      options.verificationStatus
      || input.providerVerificationStatus
      || input.verificationStatus
      || verification.status,
      ''
    );
    var provenance = normalizeProvenance(
      options.verificationProvenance
      || input.providerVerificationAuthority
      || input.verificationAuthority
      || input.verificationProvenance
      || verification.authority
      || verification.provenance
    );
    var claimedVerified = input.verified === true
      || input.providerVerified === true
      || verification.verified === true
      || status === 'verified'
      || status === 'approved';
    var disputed = status === 'rejected'
      || status === 'suspended'
      || status === 'disputed'
      || verification.disputed === true;
    var trusted = TRUSTED_VERIFICATION_PROVENANCE.indexOf(provenance) !== -1;
    var confirmedStatus = status === 'verified' || status === 'approved';

    var state = identityId
      ? IDENTITY_STATES.PROFILE_LINKED
      : declaredName
        ? IDENTITY_STATES.DECLARED
        : IDENTITY_STATES.UNKNOWN;
    var verificationState = VERIFICATION_STATES.UNVERIFIED;
    var badgeEligible = false;

    if (disputed) {
      state = IDENTITY_STATES.DISPUTED;
      verificationState = VERIFICATION_STATES.DISPUTED;
    } else if (claimedVerified && confirmedStatus && trusted) {
      state = IDENTITY_STATES.VERIFIED;
      verificationState = VERIFICATION_STATES.VERIFIED;
      badgeEligible = true;
    } else if (claimedVerified) {
      verificationState = VERIFICATION_STATES.UNPROVEN;
      if (provenance === VERIFICATION_PROVENANCE.UNKNOWN) {
        provenance = VERIFICATION_PROVENANCE.SELF_DECLARED;
      }
    } else if (!declaredName && !identityId) {
      verificationState = VERIFICATION_STATES.UNKNOWN;
    }

    return freeze({
      state: state,
      verification: verificationState,
      provenance: provenance,
      badgeEligible: badgeEligible
    });
  }

  function normalizeRatio(value, width, height) {
    var ratio = finite(value, 0);
    if (ratio <= 0 && finite(width, 0) > 0 && finite(height, 0) > 0) {
      ratio = finite(width, 0) / finite(height, 1);
    }
    return clamp(ratio, 0.5, 3, 1.6);
  }

  function normalizeMedia(input, options) {
    input = input || {};
    options = options || {};
    var images = Array.isArray(input.images) ? input.images.filter(Boolean) : [];
    var source = options.mediaUrl
      || input.image
      || input.imageUrl
      || input.mediaUrl
      || images[0]
      || '';
    var width = clamp(
      options.mediaWidth || input.imageWidth || input.mediaWidth,
      1,
      4096,
      640
    );
    var height = clamp(
      options.mediaHeight || input.imageHeight || input.mediaHeight,
      1,
      4096,
      400
    );
    var ratio = normalizeRatio(options.mediaRatio || input.mediaRatio, width, height);
    var priority = enumValue(
      MEDIA_PRIORITIES,
      options.mediaPriority || input.mediaPriority,
      MEDIA_PRIORITIES.OPTIONAL
    );
    var state = source ? MEDIA_STATES.RESERVED : MEDIA_STATES.EMPTY;

    return freeze({
      state: state,
      hasSource: Boolean(source),
      width: Math.round(width),
      height: Math.round(height),
      ratio: Number(ratio.toFixed(4)),
      priority: priority
    });
  }

  function normalizeRenderTier(value) {
    return enumValue(RENDER_TIERS, value, RENDER_TIERS.INITIAL);
  }

  function cardFingerprint(input, options) {
    input = input || {};
    options = options || {};
    var identity = input.serviceId
      || input.remoteId
      || input.remote_id
      || input.id
      || input.slug
      || options.identity
      || [options.kind, options.surface, options.position].join(':');
    return fingerprint(identity || 'card');
  }

  function normalizeServiceCard(service, options) {
    service = service || {};
    options = options || {};
    return freeze({
      contractVersion: CONTRACT_VERSION,
      fingerprint: cardFingerprint(service, Object.assign({ kind: CARD_KINDS.SERVICE }, options)),
      kind: CARD_KINDS.SERVICE,
      surface: token(options.surface, 'marketplace'),
      authority: normalizeAuthority(service, options),
      identity: normalizeIdentity(service, options),
      media: normalizeMedia(service, options),
      renderTier: normalizeRenderTier(options.renderTier),
      badgeKinds: Object.freeze(['listing_status'])
    });
  }

  function normalizeEditorialCard(card, options) {
    card = card || {};
    options = options || {};
    var mediaInput = Object.assign({}, card, {
      editorial: true
    });
    return freeze({
      contractVersion: CONTRACT_VERSION,
      fingerprint: cardFingerprint(card, Object.assign({ kind: CARD_KINDS.EDITORIAL }, options)),
      kind: CARD_KINDS.EDITORIAL,
      surface: token(options.surface, 'editorial'),
      authority: AUTHORITIES.PLATFORM_EDITORIAL,
      identity: normalizeIdentity({}, { identityApplicable: false }),
      media: normalizeMedia(mediaInput, options),
      renderTier: normalizeRenderTier(options.renderTier),
      badgeKinds: Object.freeze(['content_category'])
    });
  }

  function attachCard(element, descriptor) {
    if (!element || !descriptor) return false;
    element.dataset.dokeCardContract = descriptor.contractVersion;
    element.dataset.dokeCardFingerprint = descriptor.fingerprint;
    element.dataset.dokeCardKind = descriptor.kind;
    element.dataset.dokeCardSurface = descriptor.surface;
    element.dataset.dokeCardAuthority = descriptor.authority;
    element.dataset.dokeCardIdentityState = descriptor.identity.state;
    element.dataset.dokeCardVerification = descriptor.identity.verification;
    element.dataset.dokeCardVerificationProvenance = descriptor.identity.provenance;
    element.dataset.dokeCardMediaState = descriptor.media.state;
    element.dataset.dokeCardRenderTier = descriptor.renderTier;
    element.classList && element.classList.add('doke-card-contract');
    emit('card-attached', {
      cardFingerprint: descriptor.fingerprint,
      kind: descriptor.kind,
      surface: descriptor.surface,
      authority: descriptor.authority,
      identityState: descriptor.identity.state,
      verification: descriptor.identity.verification,
      mediaState: descriptor.media.state,
      renderTier: descriptor.renderTier
    });
    return true;
  }

  function markMedia(boundary, state, descriptor) {
    if (!boundary) return false;
    var next = enumValue(MEDIA_STATES, state, MEDIA_STATES.ERROR);
    boundary.dataset.dokeCardMediaState = next;
    if (descriptor && descriptor.fingerprint) {
      emit('media-state', {
        cardFingerprint: descriptor.fingerprint,
        state: next,
        priority: descriptor.media && descriptor.media.priority || MEDIA_PRIORITIES.OPTIONAL
      });
    }
    return true;
  }

  function bindImage(image, boundary, descriptor) {
    if (!image || !descriptor || !descriptor.media) return false;
    var media = descriptor.media;
    if (boundary) {
      boundary.dataset.dokeCardMedia = '';
      boundary.style && boundary.style.setProperty
        && boundary.style.setProperty('--doke-card-media-aspect', String(media.ratio));
    }
    image.dataset.dokeCardImage = '';
    if (!image.hasAttribute || !image.hasAttribute('width')) image.setAttribute('width', String(media.width));
    if (!image.hasAttribute || !image.hasAttribute('height')) image.setAttribute('height', String(media.height));
    image.setAttribute('decoding', 'async');
    image.setAttribute('loading', media.priority === MEDIA_PRIORITIES.CRITICAL ? 'eager' : 'lazy');
    image.setAttribute('fetchpriority', media.priority === MEDIA_PRIORITIES.CRITICAL ? 'high' : 'low');

    if (!media.hasSource) {
      markMedia(boundary, MEDIA_STATES.EMPTY, descriptor);
      return true;
    }

    markMedia(boundary, MEDIA_STATES.LOADING, descriptor);
    var complete = image.complete === true && finite(image.naturalWidth, 0) > 0;
    if (complete) {
      markMedia(boundary, MEDIA_STATES.READY, descriptor);
      return true;
    }

    image.addEventListener('load', function () {
      markMedia(boundary, MEDIA_STATES.READY, descriptor);
    }, { once: true });
    image.addEventListener('error', function () {
      markMedia(boundary, MEDIA_STATES.ERROR, descriptor);
    }, { once: true });
    return true;
  }

  function createVerificationBadge(identity) {
    if (!identity || identity.badgeEligible !== true) return null;
    if (identity.verification !== VERIFICATION_STATES.VERIFIED) return null;
    if (TRUSTED_VERIFICATION_PROVENANCE.indexOf(identity.provenance) === -1) return null;

    var badge = document.createElement('span');
    badge.className = 'doke-card-verification-badge';
    badge.dataset.dokeCardBadgeKind = 'identity_verification';
    badge.dataset.dokeCardBadgeProvenance = identity.provenance;
    badge.setAttribute('aria-label', 'Identidade verificada');
    badge.setAttribute('title', 'Identidade verificada pela Doke');
    badge.textContent = 'Identidade verificada';
    return badge;
  }

  function annotateBadge(element, kind, authority) {
    if (!element) return false;
    element.dataset.dokeCardBadgeKind = token(kind, 'status');
    element.dataset.dokeCardBadgeAuthority = enumValue(
      AUTHORITIES,
      authority,
      AUTHORITIES.UNKNOWN
    );
    return true;
  }

  function createRenderPlan(items, options) {
    var source = Array.isArray(items) ? items.slice() : [];
    options = options || {};
    var initialCount = Math.round(clamp(options.initialCount, 0, source.length, Math.min(source.length, 4)));
    return freeze({
      initial: source.slice(0, initialCount),
      deferred: source.slice(initialCount),
      initialCount: initialCount,
      totalCount: source.length
    });
  }

  function audit(scope) {
    var owner = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
    var cards = Array.prototype.slice.call(owner.querySelectorAll('[data-doke-card-contract]'));
    var result = {
      cards: cards.length,
      unknownAuthority: 0,
      unprovenVerification: 0,
      verifiedClaims: 0,
      mediaLoading: 0,
      mediaError: 0,
      deferredCards: 0
    };

    cards.forEach(function (card) {
      if (card.dataset.dokeCardAuthority === AUTHORITIES.UNKNOWN) result.unknownAuthority += 1;
      if (card.dataset.dokeCardVerification === VERIFICATION_STATES.UNPROVEN) result.unprovenVerification += 1;
      if (card.dataset.dokeCardVerification === VERIFICATION_STATES.VERIFIED) result.verifiedClaims += 1;
      if (card.dataset.dokeCardMediaState === MEDIA_STATES.LOADING) result.mediaLoading += 1;
      if (card.dataset.dokeCardMediaState === MEDIA_STATES.ERROR) result.mediaError += 1;
      if (card.dataset.dokeCardRenderTier === RENDER_TIERS.DEFERRED) result.deferredCards += 1;
    });

    var frozen = freeze(result);
    emit('audit', frozen);
    return frozen;
  }

  var api = Object.freeze({
    version: VERSION,
    contractVersion: CONTRACT_VERSION,
    kinds: CARD_KINDS,
    authorities: AUTHORITIES,
    identityStates: IDENTITY_STATES,
    verificationStates: VERIFICATION_STATES,
    verificationProvenance: VERIFICATION_PROVENANCE,
    mediaStates: MEDIA_STATES,
    mediaPriorities: MEDIA_PRIORITIES,
    renderTiers: RENDER_TIERS,
    trustedVerificationProvenance: TRUSTED_VERIFICATION_PROVENANCE,
    fingerprint: fingerprint,
    normalizeAuthority: normalizeAuthority,
    normalizeIdentity: normalizeIdentity,
    normalizeMedia: normalizeMedia,
    normalizeServiceCard: normalizeServiceCard,
    normalizeEditorialCard: normalizeEditorialCard,
    attachCard: attachCard,
    markMedia: markMedia,
    bindImage: bindImage,
    createVerificationBadge: createVerificationBadge,
    annotateBadge: annotateBadge,
    createRenderPlan: createRenderPlan,
    audit: audit,
    subscribe: subscribe
  });

  Doke.cardExperience = api;
  try {
    document.dispatchEvent(new CustomEvent('doke:card-experience-ready', {
      detail: {
        version: VERSION,
        contractVersion: CONTRACT_VERSION
      }
    }));
  } catch (error) {}
}());
