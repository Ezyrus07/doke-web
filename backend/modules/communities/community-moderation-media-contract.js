'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'com-a05-moderation-appeal-media-readiness-v1';
const DECISIONS = Object.freeze(['accept', 'replay', 'reject', 'conflict', 'unavailable']);
const COMMANDS = Object.freeze([
  'create_report', 'triage_report', 'dismiss_report', 'hide_content', 'remove_content',
  'recommend_sanction', 'open_appeal', 'approve_appeal', 'deny_appeal',
  'register_media', 'record_media_scan', 'quarantine_media', 'release_media', 'reject_media'
]);
const TARGET_TYPES = Object.freeze(['community_post', 'channel_message', 'media_asset', 'community_member']);
const REPORT_REASONS = Object.freeze([
  'spam', 'harassment', 'hate_or_abuse', 'sexual_content', 'violence',
  'scam_or_fraud', 'privacy', 'impersonation', 'illegal_content', 'self_harm', 'other'
]);
const REPORT_STATES = Object.freeze([
  'open', 'triaged', 'under_review', 'resolved_dismissed', 'resolved_hidden',
  'resolved_removed', 'appeal_open', 'appeal_review', 'appeal_resolved', 'closed'
]);
const CONTENT_STATES = Object.freeze(['pending_moderation', 'published', 'hidden', 'removed', 'restored']);
const APPEAL_STATES = Object.freeze(['none', 'open', 'under_review', 'approved', 'denied']);
const MEDIA_STATES = Object.freeze([
  'declared', 'quarantined', 'scan_clean', 'scan_suspicious', 'scan_malicious',
  'scan_unavailable', 'released', 'rejected', 'expired'
]);
const SCAN_RESULTS = Object.freeze(['clean', 'suspicious', 'malicious', 'unavailable']);
const SANCTION_TYPES = Object.freeze(['ban', 'mute', 'restriction']);
const ALLOWED_MEDIA_TYPES = Object.freeze([
  'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'
]);
const MAX_MEDIA_BYTES = Object.freeze({
  'image/jpeg': 10 * 1024 * 1024,
  'image/png': 10 * 1024 * 1024,
  'image/webp': 10 * 1024 * 1024,
  'video/mp4': 100 * 1024 * 1024,
  'video/webm': 100 * 1024 * 1024
});
const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'authorization', 'cookie', 'card', 'pan', 'cvv',
  'bankaccount', 'bank_account', 'pixkey', 'pix_key', 'identitydocument',
  'identity_document', 'rawmessage', 'raw_message', 'rawpayload', 'raw_payload',
  'rawbody', 'raw_body', 'binary', 'bytes', 'filebody', 'file_body', 'privatekey',
  'private_key', 'accesstoken', 'refresh_token', 'sessiontoken', 'webhooksecret',
  'webhook_secret', 'apikey', 'api_key'
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = stable(value[key]);
    return out;
  }, {});
}

function sha256(value) {
  return crypto.createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(stable(value)))
    .digest('hex');
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/i.test(String(value || ''));
}

function isoMillis(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value, max = 240) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : text.slice(0, max);
}

function containsSensitive(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsSensitive(item, seen));
  return Object.entries(value).some(([key, item]) =>
    SENSITIVE_KEYS.has(String(key).toLowerCase()) || containsSensitive(item, seen)
  );
}

function opaqueRefReady(value) {
  const ref = String(value || '');
  if (!/^opaque:[a-z0-9][a-z0-9:_-]{7,180}$/i.test(ref)) return false;
  return !/[?&#=@]/.test(ref) && !/https?:\/\//i.test(ref);
}

function canonicalSnapshotReady(snapshot) {
  return Boolean(
    snapshot &&
    snapshot.source === 'canonical_server' &&
    snapshot.complete === true &&
    Number.isInteger(snapshot.revision) &&
    snapshot.revision > 0
  );
}

function actorReady(actor) {
  return Boolean(actor && isUuid(actor.id) && actor.status === 'active');
}

function result(decision, reason, identity = null, extra = {}) {
  if (!DECISIONS.includes(decision)) throw new Error('INVALID_DECISION');
  return freeze({
    contractId: CONTRACT_ID,
    decision,
    reason,
    identity,
    reportWriteAuthority: false,
    moderationWriteAuthority: false,
    disciplineWriteAuthority: false,
    appealWriteAuthority: false,
    mediaWriteAuthority: false,
    storageAuthority: false,
    runtimeMutationAuthority: false,
    stagingAuthority: false,
    productionAuthority: false,
    ...extra
  });
}

function effectivePermissions(community, actorId) {
  const member = Array.isArray(community && community.members)
    ? community.members.find((item) => item && item.userId === actorId && item.status === 'active')
    : null;
  return member && member.permissions && typeof member.permissions === 'object'
    ? member.permissions
    : {};
}

function activeSanction(community, userId, type) {
  const sanctions = Array.isArray(community && community.sanctions) ? community.sanctions : [];
  return sanctions.some((item) =>
    item && item.targetUserId === userId && item.type === type && item.state === 'active'
  );
}

function buildIdentity(input) {
  const immutable = {
    contractId: CONTRACT_ID,
    command: input.command,
    clientRequestId: input.clientRequestId,
    actorId: input.actor && input.actor.id,
    communityId: input.community && input.community.id,
    reportId: input.report && input.report.id || input.reportId || null,
    targetType: input.target && input.target.type || null,
    targetId: input.target && input.target.id || null,
    mediaId: input.media && input.media.id || null,
    appealId: input.appeal && input.appeal.id || null,
    expectedRevision: input.expectedRevision,
    payload: input.payload || {}
  };
  return freeze({
    idempotencyKey: sha256({
      contractId: CONTRACT_ID,
      actorId: immutable.actorId,
      command: immutable.command,
      clientRequestId: immutable.clientRequestId
    }),
    intentFingerprint: sha256(immutable),
    subjectKey: sha256({
      contractId: CONTRACT_ID,
      communityId: immutable.communityId,
      reportId: immutable.reportId,
      targetType: immutable.targetType,
      targetId: immutable.targetId,
      mediaId: immutable.mediaId,
      appealId: immutable.appealId
    })
  });
}

function buildEventDraft(input, identity, action, extra = {}) {
  const prior = input.ledgerHead || null;
  const revision = prior ? Number(prior.revision) + 1 : 1;
  const previousEventHash = prior && isSha256(prior.eventHash) ? prior.eventHash : null;
  const event = {
    contractId: CONTRACT_ID,
    eventId: `evt-${identity.intentFingerprint.slice(0, 24)}`,
    communityId: input.community.id,
    reportId: input.report && input.report.id || input.reportId || null,
    targetType: input.target && input.target.type || null,
    targetId: input.target && input.target.id || null,
    mediaId: input.media && input.media.id || null,
    appealId: input.appeal && input.appeal.id || null,
    action,
    actorId: input.actor.id,
    actorRole: input.actor.role || null,
    reasonCode: input.payload && input.payload.reasonCode || null,
    occurredAt: new Date(isoMillis(input.now)).toISOString(),
    revision,
    previousEventHash,
    intentFingerprint: identity.intentFingerprint,
    ...extra
  };
  return freeze({ ...event, eventHash: sha256(event) });
}

function baseChecks(input) {
  const nowMs = isoMillis(input && input.now);
  if (!input || typeof input !== 'object' || nowMs === null) {
    return { error: result('unavailable', 'EXPLICIT_UTC_CLOCK_REQUIRED') };
  }
  if (!COMMANDS.includes(input.command)) return { error: result('reject', 'COMMAND_NOT_ALLOWED') };
  if (!actorReady(input.actor)) return { error: result('reject', 'ACTIVE_AUTHENTICATED_ACTOR_REQUIRED') };
  if (!isUuid(input.clientRequestId)) return { error: result('reject', 'STABLE_REQUEST_ID_REQUIRED') };
  if (containsSensitive(input.payload || {}) || containsSensitive(input.media || {})) {
    return { error: result('reject', 'RAW_SENSITIVE_DATA_PROHIBITED') };
  }
  const identity = buildIdentity(input);
  if (input.idempotencyRecord && input.idempotencyRecord.idempotencyKey === identity.idempotencyKey) {
    if (input.idempotencyRecord.intentFingerprint !== identity.intentFingerprint) {
      return { error: result('conflict', 'IDEMPOTENCY_PAYLOAD_CONFLICT', identity) };
    }
    return { error: result('replay', 'IDEMPOTENT_REPLAY', identity, {
      priorOutcome: input.idempotencyRecord.outcome || null
    }) };
  }
  if (!canonicalSnapshotReady(input.community) || !isUuid(input.community.id)) {
    return { error: result('unavailable', 'CANONICAL_COMMUNITY_SNAPSHOT_REQUIRED', identity) };
  }
  if (input.community.status !== 'active') {
    return { error: result('reject', 'COMMUNITY_NOT_ACTIVE', identity) };
  }
  if (input.expectedRevision !== input.community.revision) {
    return { error: result('conflict', 'COMMUNITY_REVISION_CONFLICT', identity) };
  }
  const permissions = effectivePermissions(input.community, input.actor.id);
  const activeMember = Array.isArray(input.community.members) &&
    input.community.members.some((item) =>
      item && item.userId === input.actor.id && item.status === 'active'
    );
  if (!activeMember && input.actor.role !== 'system_worker') {
    return { error: result('reject', 'ACTIVE_COMMUNITY_MEMBERSHIP_REQUIRED', identity) };
  }
  if (activeSanction(input.community, input.actor.id, 'ban')) {
    return { error: result('reject', 'ACTIVE_BAN_BLOCKS_MODERATION_COMMAND', identity) };
  }
  return { identity, permissions, nowMs };
}

function targetReady(target) {
  return Boolean(
    target &&
    TARGET_TYPES.includes(target.type) &&
    isUuid(target.id) &&
    isUuid(target.communityId) &&
    isUuid(target.authorId || target.userId || target.uploaderId) &&
    Number.isInteger(target.revision) &&
    target.revision > 0 &&
    typeof target.state === 'string'
  );
}

function reportReady(report) {
  return Boolean(
    report &&
    isUuid(report.id) &&
    isUuid(report.communityId) &&
    isUuid(report.reporterId) &&
    TARGET_TYPES.includes(report.targetType) &&
    isUuid(report.targetId) &&
    REPORT_REASONS.includes(report.reason) &&
    REPORT_STATES.includes(report.state) &&
    Number.isInteger(report.revision) &&
    report.revision > 0
  );
}

function validEvidenceRefs(value) {
  return Array.isArray(value) &&
    value.length <= 20 &&
    value.every((item) => opaqueRefReady(item));
}

function mediaReady(media) {
  return Boolean(
    media &&
    isUuid(media.id) &&
    isUuid(media.communityId) &&
    isUuid(media.uploaderId) &&
    ALLOWED_MEDIA_TYPES.includes(media.mediaType) &&
    Number.isInteger(media.sizeBytes) &&
    media.sizeBytes > 0 &&
    media.sizeBytes <= MAX_MEDIA_BYTES[media.mediaType] &&
    isSha256(media.contentDigest) &&
    opaqueRefReady(media.storageRef) &&
    MEDIA_STATES.includes(media.state) &&
    Number.isInteger(media.revision) &&
    media.revision > 0
  );
}

function scanReady(scan, media) {
  return Boolean(
    scan &&
    SCAN_RESULTS.includes(scan.result) &&
    isSha256(scan.contentDigest) &&
    scan.contentDigest === media.contentDigest &&
    isSha256(scan.scannerIdHash) &&
    normalizeText(scan.engineVersion, 80).length >= 1 &&
    isoMillis(scan.scannedAt) !== null
  );
}

function independentModerator(input, actorId) {
  const original = input.report && input.report.originalModeratorId;
  const author = input.target && (input.target.authorId || input.target.userId || input.target.uploaderId);
  const reporter = input.report && input.report.reporterId;
  return actorId !== original && actorId !== author && actorId !== reporter;
}

function evaluateReportCommand(input, checks) {
  const { identity, permissions } = checks;
  if (!targetReady(input.target)) return result('reject', 'CANONICAL_TARGET_REQUIRED', identity);
  if (input.target.communityId !== input.community.id) return result('conflict', 'TARGET_COMMUNITY_MISMATCH', identity);

  if (input.command === 'create_report') {
    const reason = input.payload && input.payload.reason;
    if (!REPORT_REASONS.includes(reason)) return result('reject', 'VALID_REPORT_REASON_REQUIRED', identity);
    const summary = normalizeText(input.payload && input.payload.summary, 500);
    if (summary.length < 4) return result('reject', 'REPORT_SUMMARY_REQUIRED', identity);
    if (input.openReport && input.openReport.reporterId === input.actor.id &&
        input.openReport.targetId === input.target.id &&
        input.openReport.reason === reason) {
      return result('replay', 'OPEN_REPORT_ALREADY_EXISTS', identity, { reportId: input.openReport.id });
    }
    const reportId = `00000000-0000-4000-8000-${identity.intentFingerprint.slice(0, 12)}`;
    return result('accept', 'REPORT_CREATE_ACCEPTED', identity, {
      reportId,
      initialReportState: 'open',
      targetVisibilityChanged: false,
      eventDraft: buildEventDraft(input, identity, 'report_created', {
        reportId, targetState: input.target.state
      })
    });
  }

  if (!reportReady(input.report)) return result('reject', 'CANONICAL_REPORT_REQUIRED', identity);
  if (input.report.communityId !== input.community.id ||
      input.report.targetId !== input.target.id ||
      input.report.targetType !== input.target.type) {
    return result('conflict', 'REPORT_TARGET_MISMATCH', identity);
  }
  if (!permissions.moderateMembers) return result('reject', 'MODERATE_MEMBERS_PERMISSION_REQUIRED', identity);
  if (!independentModerator(input, input.actor.id)) return result('reject', 'INDEPENDENT_MODERATOR_REQUIRED', identity);

  if (input.command === 'triage_report') {
    if (input.report.state !== 'open') return result('conflict', 'REPORT_NOT_OPEN', identity);
    if (!validEvidenceRefs(input.payload && input.payload.evidenceRefs || [])) {
      return result('reject', 'OPAQUE_EVIDENCE_REFS_REQUIRED', identity);
    }
    return result('accept', 'REPORT_TRIAGE_ACCEPTED', identity, {
      nextReportState: 'under_review',
      targetVisibilityChanged: false,
      eventDraft: buildEventDraft(input, identity, 'report_triaged')
    });
  }

  if (!['under_review', 'triaged'].includes(input.report.state)) {
    return result('conflict', 'REPORT_NOT_UNDER_REVIEW', identity);
  }
  const reasonCode = normalizeText(input.payload && input.payload.reasonCode, 80);
  if (reasonCode.length < 3) return result('reject', 'REASON_CODE_REQUIRED', identity);
  if (!validEvidenceRefs(input.payload && input.payload.evidenceRefs || [])) {
    return result('reject', 'OPAQUE_EVIDENCE_REFS_REQUIRED', identity);
  }

  if (input.command === 'dismiss_report') {
    return result('accept', 'REPORT_DISMISS_ACCEPTED', identity, {
      nextReportState: 'resolved_dismissed',
      nextTargetState: input.target.state,
      eventDraft: buildEventDraft(input, identity, 'report_dismissed')
    });
  }

  if (input.command === 'hide_content') {
    if (!['published', 'pending_moderation', 'restored'].includes(input.target.state)) {
      return result('conflict', 'TARGET_NOT_HIDEABLE', identity);
    }
    return result('accept', 'CONTENT_HIDE_ACCEPTED', identity, {
      nextReportState: 'resolved_hidden',
      nextTargetState: 'hidden',
      hardDeleteAllowed: false,
      eventDraft: buildEventDraft(input, identity, 'content_hidden', {
        priorTargetState: input.target.state,
        nextTargetState: 'hidden'
      })
    });
  }

  if (input.command === 'remove_content') {
    if (!['hidden', 'published', 'pending_moderation'].includes(input.target.state)) {
      return result('conflict', 'TARGET_NOT_REMOVABLE', identity);
    }
    const approval = input.payload && input.payload.approval;
    if (!approval || !isUuid(approval.approverId) || approval.approverId === input.actor.id ||
        approval.approverId === input.report.reporterId ||
        approval.approverId === (input.target.authorId || input.target.uploaderId || input.target.userId) ||
        approval.status !== 'approved' || !isSha256(approval.approvalHash)) {
      return result('reject', 'INDEPENDENT_REMOVAL_APPROVAL_REQUIRED', identity);
    }
    return result('accept', 'CONTENT_REMOVE_ACCEPTED', identity, {
      nextReportState: 'resolved_removed',
      nextTargetState: 'removed',
      hardDeleteAllowed: false,
      dualControlSatisfied: true,
      eventDraft: buildEventDraft(input, identity, 'content_removed', {
        priorTargetState: input.target.state,
        nextTargetState: 'removed',
        approvalHash: approval.approvalHash
      })
    });
  }

  if (input.command === 'recommend_sanction') {
    if (input.target.type !== 'community_member') {
      return result('reject', 'MEMBER_TARGET_REQUIRED_FOR_SANCTION', identity);
    }
    const sanctionType = input.payload && input.payload.sanctionType;
    if (!SANCTION_TYPES.includes(sanctionType)) {
      return result('reject', 'VALID_SANCTION_TYPE_REQUIRED', identity);
    }
    return result('accept', 'SANCTION_RECOMMENDATION_ACCEPTED', identity, {
      recommendedSanctionType: sanctionType,
      comA03AuthorityRequired: true,
      sanctionApplied: false,
      eventDraft: buildEventDraft(input, identity, 'sanction_recommended', {
        sanctionType
      })
    });
  }

  return result('reject', 'REPORT_COMMAND_NOT_HANDLED', identity);
}

function evaluateAppealCommand(input, checks) {
  const { identity, permissions, nowMs } = checks;
  if (!targetReady(input.target) || !reportReady(input.report)) {
    return result('reject', 'CANONICAL_REPORT_AND_TARGET_REQUIRED', identity);
  }
  if (!['resolved_hidden', 'resolved_removed', 'appeal_open', 'appeal_review'].includes(input.report.state)) {
    return result('conflict', 'REPORT_NOT_APPEALABLE', identity);
  }
  const authorId = input.target.authorId || input.target.userId || input.target.uploaderId;

  if (input.command === 'open_appeal') {
    if (input.actor.id !== authorId) return result('reject', 'ONLY_AFFECTED_AUTHOR_MAY_APPEAL', identity);
    if (input.appeal && ['open', 'under_review'].includes(input.appeal.state)) {
      return result('replay', 'ACTIVE_APPEAL_ALREADY_EXISTS', identity, { appealId: input.appeal.id });
    }
    const resolvedAtMs = isoMillis(input.report.resolvedAt);
    if (resolvedAtMs === null || nowMs > resolvedAtMs + 14 * 24 * 60 * 60 * 1000) {
      return result('reject', 'APPEAL_WINDOW_EXPIRED', identity);
    }
    const statement = normalizeText(input.payload && input.payload.statement, 1000);
    if (statement.length < 8) return result('reject', 'APPEAL_STATEMENT_REQUIRED', identity);
    const appealId = `00000000-0000-4000-8000-${identity.intentFingerprint.slice(0, 12)}`;
    return result('accept', 'APPEAL_OPEN_ACCEPTED', identity, {
      appealId,
      nextReportState: 'appeal_open',
      nextAppealState: 'open',
      targetStateChanged: false,
      eventDraft: buildEventDraft(input, identity, 'appeal_opened', { appealId })
    });
  }

  if (!input.appeal || !isUuid(input.appeal.id) ||
      !['open', 'under_review'].includes(input.appeal.state)) {
    return result('reject', 'ACTIVE_APPEAL_REQUIRED', identity);
  }
  if (!permissions.moderateMembers) return result('reject', 'MODERATE_MEMBERS_PERMISSION_REQUIRED', identity);
  if (!independentModerator(input, input.actor.id) ||
      input.actor.id === input.appeal.appellantId ||
      input.actor.id === input.appeal.openedById) {
    return result('reject', 'INDEPENDENT_APPEAL_REVIEWER_REQUIRED', identity);
  }
  const reasonCode = normalizeText(input.payload && input.payload.reasonCode, 80);
  if (reasonCode.length < 3) return result('reject', 'REASON_CODE_REQUIRED', identity);
  if (!validEvidenceRefs(input.payload && input.payload.evidenceRefs || [])) {
    return result('reject', 'OPAQUE_EVIDENCE_REFS_REQUIRED', identity);
  }

  if (input.command === 'approve_appeal') {
    if (!['hidden', 'removed'].includes(input.target.state)) {
      return result('conflict', 'TARGET_NOT_RESTORABLE', identity);
    }
    if (!isSha256(input.payload && input.payload.priorDecisionEventHash)) {
      return result('reject', 'PRIOR_DECISION_HASH_REQUIRED', identity);
    }
    return result('accept', 'APPEAL_APPROVE_ACCEPTED', identity, {
      nextReportState: 'appeal_resolved',
      nextAppealState: 'approved',
      nextTargetState: 'restored',
      priorDecisionImmutable: true,
      eventDraft: buildEventDraft(input, identity, 'appeal_approved', {
        priorDecisionEventHash: input.payload.priorDecisionEventHash,
        priorTargetState: input.target.state,
        nextTargetState: 'restored'
      })
    });
  }

  if (input.command === 'deny_appeal') {
    return result('accept', 'APPEAL_DENY_ACCEPTED', identity, {
      nextReportState: 'appeal_resolved',
      nextAppealState: 'denied',
      nextTargetState: input.target.state,
      priorDecisionImmutable: true,
      eventDraft: buildEventDraft(input, identity, 'appeal_denied')
    });
  }

  return result('reject', 'APPEAL_COMMAND_NOT_HANDLED', identity);
}

function evaluateMediaCommand(input, checks) {
  const { identity, permissions } = checks;

  if (input.command === 'register_media') {
    const media = input.media || {};
    if (!isUuid(media.id) || !isUuid(media.communityId) || media.communityId !== input.community.id ||
        media.uploaderId !== input.actor.id || !ALLOWED_MEDIA_TYPES.includes(media.mediaType) ||
        !Number.isInteger(media.sizeBytes) || media.sizeBytes <= 0 ||
        media.sizeBytes > MAX_MEDIA_BYTES[media.mediaType] ||
        !isSha256(media.contentDigest) || !opaqueRefReady(media.storageRef)) {
      return result('reject', 'VALID_SANITIZED_MEDIA_METADATA_REQUIRED', identity);
    }
    if (media.mediaType.startsWith('image/') &&
        (!Number.isInteger(media.width) || media.width < 1 || media.width > 12000 ||
         !Number.isInteger(media.height) || media.height < 1 || media.height > 12000)) {
      return result('reject', 'VALID_IMAGE_DIMENSIONS_REQUIRED', identity);
    }
    if (media.mediaType.startsWith('video/') &&
        (!Number.isInteger(media.durationSeconds) || media.durationSeconds < 1 || media.durationSeconds > 600)) {
      return result('reject', 'VALID_VIDEO_DURATION_REQUIRED', identity);
    }
    return result('accept', 'MEDIA_REGISTER_ACCEPTED', identity, {
      initialMediaState: 'quarantined',
      publicVisibility: false,
      eventDraft: buildEventDraft(input, identity, 'media_registered', {
        contentDigest: media.contentDigest,
        mediaType: media.mediaType,
        sizeBytes: media.sizeBytes
      })
    });
  }

  if (!mediaReady(input.media)) return result('reject', 'CANONICAL_MEDIA_SNAPSHOT_REQUIRED', identity);
  if (input.media.communityId !== input.community.id) return result('conflict', 'MEDIA_COMMUNITY_MISMATCH', identity);

  if (input.command === 'record_media_scan') {
    if (input.actor.role !== 'system_worker') return result('reject', 'SYSTEM_WORKER_REQUIRED', identity);
    if (!scanReady(input.payload && input.payload.scan, input.media)) {
      return result('reject', 'AUTHENTICATED_SCAN_ATTESTATION_REQUIRED', identity);
    }
    const nextMediaState = `scan_${input.payload.scan.result}`;
    return result('accept', 'MEDIA_SCAN_RECORD_ACCEPTED', identity, {
      nextMediaState,
      publicVisibility: false,
      eventDraft: buildEventDraft(input, identity, 'media_scan_recorded', {
        scanResult: input.payload.scan.result,
        scannerIdHash: input.payload.scan.scannerIdHash,
        contentDigest: input.media.contentDigest
      })
    });
  }

  if (!permissions.moderateMembers) return result('reject', 'MODERATE_MEMBERS_PERMISSION_REQUIRED', identity);
  if (input.actor.id === input.media.uploaderId) return result('reject', 'INDEPENDENT_MEDIA_REVIEWER_REQUIRED', identity);

  if (input.command === 'quarantine_media') {
    if (input.media.state === 'quarantined') return result('replay', 'MEDIA_ALREADY_QUARANTINED', identity);
    return result('accept', 'MEDIA_QUARANTINE_ACCEPTED', identity, {
      nextMediaState: 'quarantined',
      publicVisibility: false,
      eventDraft: buildEventDraft(input, identity, 'media_quarantined')
    });
  }

  if (input.command === 'release_media') {
    if (input.media.state !== 'scan_clean' ||
        !scanReady(input.payload && input.payload.scan, input.media) ||
        input.payload.scan.result !== 'clean') {
      return result('reject', 'MATCHING_CLEAN_SCAN_REQUIRED', identity);
    }
    const approval = input.payload && input.payload.approval;
    if (!approval || !isUuid(approval.approverId) || approval.approverId === input.actor.id ||
        approval.approverId === input.media.uploaderId || approval.status !== 'approved' ||
        !isSha256(approval.approvalHash)) {
      return result('reject', 'INDEPENDENT_MEDIA_RELEASE_APPROVAL_REQUIRED', identity);
    }
    return result('accept', 'MEDIA_RELEASE_ACCEPTED', identity, {
      nextMediaState: 'released',
      publicVisibility: true,
      dualControlSatisfied: true,
      eventDraft: buildEventDraft(input, identity, 'media_released', {
        approvalHash: approval.approvalHash,
        contentDigest: input.media.contentDigest
      })
    });
  }

  if (input.command === 'reject_media') {
    if (!['scan_suspicious', 'scan_malicious', 'scan_unavailable', 'quarantined'].includes(input.media.state)) {
      return result('conflict', 'MEDIA_NOT_REJECTABLE', identity);
    }
    const reasonCode = normalizeText(input.payload && input.payload.reasonCode, 80);
    if (reasonCode.length < 3) return result('reject', 'REASON_CODE_REQUIRED', identity);
    return result('accept', 'MEDIA_REJECT_ACCEPTED', identity, {
      nextMediaState: 'rejected',
      publicVisibility: false,
      hardDeleteAllowed: false,
      eventDraft: buildEventDraft(input, identity, 'media_rejected')
    });
  }

  return result('reject', 'MEDIA_COMMAND_NOT_HANDLED', identity);
}

function evaluateCommand(input) {
  const checks = baseChecks(input);
  if (checks.error) return checks.error;

  if (['create_report', 'triage_report', 'dismiss_report', 'hide_content',
       'remove_content', 'recommend_sanction'].includes(input.command)) {
    return evaluateReportCommand(input, checks);
  }
  if (['open_appeal', 'approve_appeal', 'deny_appeal'].includes(input.command)) {
    return evaluateAppealCommand(input, checks);
  }
  return evaluateMediaCommand(input, checks);
}

function assessReadiness(input) {
  const reasons = [];
  if (!input || input.approvedPolicy !== true) reasons.push('APPROVED_POLICY_REQUIRED');
  if (!input || input.serverCommandHandler !== true) reasons.push('SERVER_COMMAND_HANDLER_REQUIRED');
  if (!input || input.canonicalMembershipProjection !== true) reasons.push('CANONICAL_MEMBERSHIP_REQUIRED');
  if (!input || input.canonicalGovernanceProjection !== true) reasons.push('CANONICAL_GOVERNANCE_REQUIRED');
  if (!input || input.appendOnlyAuditLedger !== true) reasons.push('APPEND_ONLY_AUDIT_LEDGER_REQUIRED');
  if (!input || input.mediaQuarantineStorage !== true) reasons.push('MEDIA_QUARANTINE_STORAGE_REQUIRED');
  if (!input || input.authenticatedScanner !== true) reasons.push('AUTHENTICATED_SCANNER_REQUIRED');
  if (!input || input.independentAppealQueue !== true) reasons.push('INDEPENDENT_APPEAL_QUEUE_REQUIRED');
  if (!input || input.rateLimitAuthority !== true) reasons.push('RATE_LIMIT_AUTHORITY_REQUIRED');
  if (!input || input.stagingValidated !== true) reasons.push('STAGING_VALIDATION_REQUIRED');
  return freeze({
    contractId: CONTRACT_ID,
    structurallyReady: reasons.length === 0,
    reasons,
    moderationWriteAuthority: false,
    disciplineWriteAuthority: false,
    mediaWriteAuthority: false,
    runtimeMutationAuthority: false,
    productionAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  DECISIONS,
  COMMANDS,
  TARGET_TYPES,
  REPORT_REASONS,
  REPORT_STATES,
  CONTENT_STATES,
  APPEAL_STATES,
  MEDIA_STATES,
  SCAN_RESULTS,
  SANCTION_TYPES,
  ALLOWED_MEDIA_TYPES,
  MAX_MEDIA_BYTES,
  stable,
  sha256,
  containsSensitive,
  opaqueRefReady,
  buildIdentity,
  buildEventDraft,
  evaluateCommand,
  assessReadiness
});
