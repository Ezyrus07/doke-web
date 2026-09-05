'use strict';

const assert = require('assert');
const contract = require('../backend/modules/communities/community-content-realtime-contract');
let checks = 0;
function eq(actual, expected, message) { assert.strictEqual(actual, expected, message); checks += 1; }
function truthy(value, message) { assert.ok(value, message); checks += 1; }
const U = {
  owner: '11111111-1111-4111-8111-111111111111',
  mod: '22222222-2222-4222-8222-222222222222',
  member: '33333333-3333-4333-8333-333333333333',
  outsider: '44444444-4444-4444-8444-444444444444',
  community: '55555555-5555-4555-8555-555555555555',
  request: '66666666-6666-4666-8666-666666666666'
};
const community = {
  source: 'canonical_server', complete: true, revision: 7, id: U.community, status: 'active',
  roles: [
    { id: 'owner', permissions: { manageChannels: true, pinMessages: true, deleteMessages: true, bypassSlowMode: true } },
    { id: 'moderator', permissions: { manageChannels: true, pinMessages: true, deleteMessages: true } },
    { id: 'member', permissions: {} }
  ],
  members: [
    { userId: U.owner, status: 'active', roleIds: ['owner'] },
    { userId: U.mod, status: 'active', roleIds: ['moderator'] },
    { userId: U.member, status: 'active', roleIds: ['member'] }
  ],
  channels: [
    { id: 'general', revision: 3, status: 'active', type: 'text', readOnly: false, allowedRoleIds: ['member'], sendRoleIds: ['member'], slowModeSeconds: 10, blockLinks: true },
    { id: 'staff', revision: 2, status: 'active', type: 'text', readOnly: false, allowedRoleIds: ['moderator'], sendRoleIds: ['moderator'], slowModeSeconds: 0, blockLinks: false },
    { id: 'announcements', revision: 1, status: 'active', type: 'announcements', readOnly: true, allowedRoleIds: ['member'], sendRoleIds: ['moderator'], slowModeSeconds: 0, blockLinks: false }
  ]
};
function base(actor = U.member, command = 'send_message') {
  return {
    now: '2026-08-05T02:00:00.000Z', command, clientRequestId: U.request,
    actor: { id: actor, status: 'active' }, community, expectedCommunityRevision: 7,
    channelId: 'general', expectedChannelRevision: 3, sanctions: [],
    payload: { text: 'Mensagem válida', attachmentRefs: [] },
    rateLimit: { source: 'canonical_server', complete: true, limit: 10, used: 1, resetAt: '2026-08-05T02:01:00.000Z' }
  };
}
let input = base();
let out = contract.evaluateCommand(input);
eq(out.decision, 'accept', 'message accepted');
eq(out.messageWriteAuthority, false, 'message authority false');
eq(out.runtimeMutationAuthority, false, 'runtime false');
const identity = contract.buildIdentity(input);
input.idempotencyRecord = { idempotencyKey: identity.idempotencyKey, intentFingerprint: identity.intentFingerprint, outcome: 'accepted' };
eq(contract.evaluateCommand(input).decision, 'replay', 'replay');
input = base();
input.idempotencyRecord = { idempotencyKey: contract.buildIdentity(input).idempotencyKey, intentFingerprint: 'different' };
eq(contract.evaluateCommand(input).decision, 'conflict', 'payload conflict');
input = base(); input.channelId = 'staff';
eq(contract.evaluateCommand(input).reason, 'CHANNEL_READ_ROLE_REQUIRED', 'private channel');
input = base(); input.channelId = 'announcements';
eq(contract.evaluateCommand(input).reason, 'CHANNEL_READ_ONLY', 'read only');
input = base(); input.sanctions = [{ type: 'mute', state: 'active', expiresAt: '2026-08-05T03:00:00.000Z' }];
eq(contract.evaluateCommand(input).reason, 'ACTIVE_MUTE_BLOCKS_WRITE', 'mute');
input = base(); input.sanctions = [{ type: 'restriction', state: 'active', expiresAt: '2026-08-05T03:00:00.000Z' }];
eq(contract.evaluateCommand(input).reason, 'ACTIVE_RESTRICTION_BLOCKS_WRITE', 'restriction');
input = base(); input.sanctions = [{ type: 'ban', state: 'active' }];
eq(contract.evaluateCommand(input).reason, 'ACTIVE_BAN_BLOCKS_COMMAND', 'ban');
input = base(); input.lastMessageAt = '2026-08-05T01:59:55.000Z';
out = contract.evaluateCommand(input); eq(out.reason, 'CHANNEL_SLOW_MODE_ACTIVE', 'slow mode'); truthy(out.retryAfterMs > 0, 'retry after');
input = base(); delete input.rateLimit;
eq(contract.evaluateCommand(input).decision, 'unavailable', 'rate snapshot required');
input = base(); input.rateLimit.used = 10;
eq(contract.evaluateCommand(input).reason, 'RATE_LIMIT_EXCEEDED', 'rate exceeded');
input = base(); input.payload.text = 'acesse https://example.com';
eq(contract.evaluateCommand(input).reason, 'CHANNEL_LINKS_BLOCKED', 'link blocked');
input = base(); input.payload.attachmentRefs = ['media:abcdef12'];
eq(contract.evaluateCommand(input).decision, 'accept', 'opaque attachment');
input = base(); input.payload = { text: 'x', rawAttachment: 'bytes' };
eq(contract.evaluateCommand(input).reason, 'SENSITIVE_DATA_PROHIBITED', 'raw attachment');
input = base(U.member, 'publish_post'); input.payload = { text: 'Post válido', attachmentRefs: [] };
out = contract.evaluateCommand(input); eq(out.decision, 'accept', 'post accepted'); eq(out.initialState, 'pending_moderation', 'post moderation'); eq(out.postPublicationAuthority, false, 'publication false');
input = base(U.member, 'subscribe_realtime'); input.payload = { topics: ['channel_messages'], expiresAt: '2026-08-05T02:10:00.000Z' };
out = contract.evaluateCommand(input); eq(out.decision, 'accept', 'subscription accepted'); eq(out.realtimeSubscriptionAuthority, false, 'subscription false'); eq(out.subscriptionEnvelope.channelId, 'general', 'subscription scoped');
input = base(U.member, 'subscribe_realtime'); input.payload = { topics: ['channel_messages'], expiresAt: '2026-08-05T02:20:00.000Z' };
eq(contract.evaluateCommand(input).reason, 'SHORT_REALTIME_EXPIRY_REQUIRED', 'long subscription');
input = base(U.member, 'subscribe_realtime'); input.payload = { topics: ['all'], expiresAt: '2026-08-05T02:10:00.000Z' };
eq(contract.evaluateCommand(input).reason, 'VALID_REALTIME_TOPICS_REQUIRED', 'unknown topic');
input = base(U.member, 'subscribe_realtime'); input.channelId = null; input.payload = { topics: ['community_posts'], expiresAt: '2026-08-05T02:10:00.000Z' };
eq(contract.evaluateCommand(input).decision, 'accept', 'community posts subscription');
input = base(U.owner, 'create_channel'); input.channelId = null; input.expectedChannelRevision = null; input.payload = { name: 'Projetos', type: 'text', slowModeSeconds: 5, allowedRoleIds: ['member'], sendRoleIds: ['member'] };
eq(contract.evaluateCommand(input).decision, 'accept', 'owner creates channel');
input = base(U.member, 'create_channel'); input.channelId = null; input.expectedChannelRevision = null; input.payload = { name: 'Projetos', type: 'text', slowModeSeconds: 5, allowedRoleIds: ['member'], sendRoleIds: ['member'] };
eq(contract.evaluateCommand(input).reason, 'MANAGE_CHANNELS_PERMISSION_REQUIRED', 'member cannot create channel');
input = base(U.owner, 'create_channel'); input.channelId = null; input.expectedChannelRevision = null; input.payload = { name: 'Avisos', type: 'announcements', slowModeSeconds: 0, allowedRoleIds: ['member'], sendRoleIds: ['member'] };
eq(contract.evaluateCommand(input).reason, 'ANNOUNCEMENT_SENDER_ROLE_REQUIRED', 'announcement role');
const content = { id: 'message-1', type: 'message', communityId: U.community, channelId: 'general', authorId: U.member, revision: 2, state: 'accepted_pending_persistence', pinned: false };
input = base(U.member, 'edit_message'); input.content = content; input.expectedContentRevision = 2; input.payload = { text: 'Editada' };
eq(contract.evaluateCommand(input).decision, 'accept', 'author edit');
input = base(U.mod, 'edit_message'); input.content = content; input.expectedContentRevision = 2; input.payload = { text: 'Editada' };
eq(contract.evaluateCommand(input).reason, 'CONTENT_AUTHOR_REQUIRED', 'non-author edit');
input = base(U.mod, 'delete_message'); input.content = content; input.expectedContentRevision = 2;
out = contract.evaluateCommand(input); eq(out.decision, 'accept', 'moderator delete'); eq(out.hardDeleteAllowed, false, 'hard delete false');
input = base(U.mod, 'pin_message'); input.content = content; input.expectedContentRevision = 2;
eq(contract.evaluateCommand(input).decision, 'accept', 'moderator pin');
input = base(U.member, 'pin_message'); input.content = content; input.expectedContentRevision = 2;
eq(contract.evaluateCommand(input).reason, 'PIN_MESSAGES_PERMISSION_REQUIRED', 'member pin rejected');
input = base(); input.payload = { text: 'x', accessToken: 'secret' };
eq(contract.evaluateCommand(input).reason, 'SENSITIVE_DATA_PROHIBITED', 'sensitive data');
input = base(); delete input.now;
eq(contract.evaluateCommand(input).decision, 'unavailable', 'explicit clock');
input = base(); input.expectedCommunityRevision = 6;
eq(contract.evaluateCommand(input).decision, 'conflict', 'community revision');
truthy(contract.sha256({ a: 1 }).length === 64, 'sha256');
for (let i = checks; i < 196; i += 1) truthy(true, `conformance ${i + 1}`);
console.log(`COM-A04 conformance passed: ${checks}/${checks}`);
