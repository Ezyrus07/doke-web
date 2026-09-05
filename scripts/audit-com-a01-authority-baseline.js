'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'com-a01-authority-baseline.json'), 'utf8'));
const checks = [];

function check(name, condition) { checks.push({ name, passed: Boolean(condition) }); }
function equals(name, actual, expected) { check(name, actual === expected); }
function includes(name, collection, expected) { check(name, Array.isArray(collection) && collection.includes(expected)); }
function unique(name, collection) { check(name, Array.isArray(collection) && new Set(collection).size === collection.length); }
function fileContains(relativePath, snippets) {
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  snippets.forEach((snippet) => check(`${relativePath} contains ${snippet}`, content.includes(snippet)));
}

equals('contract id', contract.contractId, 'com-a01-authority-baseline-v1');
equals('domain', contract.domain, 'COM-001');
equals('source head', contract.sourceHead, '71aca60204a736d219d03f1ec20378932d08c26e');
equals('scope', contract.scope, 'repository_only');
equals('status', contract.status, 'baseline_frozen_followup_required');

[
  'runtimeIntegrated',
  'migrationPrepared',
  'migrationApplied',
  'stagingValidated',
  'canonicalMembershipCommandsConfigured',
  'canonicalRoleAndDisciplineConfigured',
  'canonicalRealtimeConfigured',
  'canonicalModerationConfigured'
].forEach((key) => equals(`${key} false`, contract[key], false));

const expectedCurrentAuthority = {
  communityDiscovery: 'split_mock_service_and_browser_local_domain_with_partial_remote_rls',
  communityCreation: 'authenticated_direct_table_insert_or_browser_local_write',
  membership: 'public_self_join_direct_dml_plus_browser_local_membership',
  privateAccess: 'remote_membership_rls_without_server_owned_invitation_or_join_request_command',
  roles: 'database_fixed_owner_moderator_member_vs_browser_custom_roles_and_permissions',
  discipline: 'browser_local_bans_mutes_restrictions_and_channel_discipline',
  posts: 'authenticated_direct_published_insert_plus_browser_local_content',
  channelsAndChat: 'browser_local_only',
  realtime: 'absent_for_community_domain',
  reportsAndAppeals: 'generic_reports_table_without_community_case_or_appeal_contract',
  audit: 'browser_local_audit_events_without_canonical_append_only_server_ledger',
  mediaModeration: 'absent'
};
Object.entries(expectedCurrentAuthority).forEach(([key, value]) => equals(`current authority ${key}`, contract.currentAuthority[key], value));

const expectedSurfaces = [
  'assets/js/features/community/community-domain.js',
  'assets/js/repositories/community-repository.js',
  'assets/js/services/community-service.js',
  'assets/js/pages/comunidade.js',
  'assets/js/pages/comunidade-interna.js',
  'supabase/migrations/003_communication_finance_community.sql',
  'supabase/migrations/116_community_authority.sql',
  'supabase/migrations/120_community_owner_membership_invariant.sql',
  'supabase/tests/010_public_data_authority_validation.sql',
  'scripts/test-community-domain-infrastructure.js',
  'scripts/test-community-domain-transactions.js',
  'scripts/test-community-member-discipline-runtime-contract.js'
];
expectedSurfaces.forEach((surface) => {
  includes(`observed ${surface}`, contract.observedSurfaces, surface);
  check(`file exists ${surface}`, fs.existsSync(path.join(root, surface)));
});
unique('observed surfaces unique', contract.observedSurfaces);

check('twelve baseline findings', Array.isArray(contract.baselineFindings) && contract.baselineFindings.length === 12);
unique('finding ids unique', contract.baselineFindings.map((finding) => finding.id));
[
  ['COM-A01-F01', 'critical', 'browser_authority'],
  ['COM-A01-F02', 'high', 'authority_split'],
  ['COM-A01-F03', 'critical', 'command_boundary'],
  ['COM-A01-F04', 'critical', 'membership_gap'],
  ['COM-A01-F05', 'high', 'role_model_drift'],
  ['COM-A01-F06', 'critical', 'discipline'],
  ['COM-A01-F07', 'high', 'post_moderation'],
  ['COM-A01-F08', 'high', 'realtime'],
  ['COM-A01-F09', 'high', 'channels_and_chat'],
  ['COM-A01-F10', 'high', 'moderation_case'],
  ['COM-A01-F11', 'medium', 'identity'],
  ['COM-A01-F12', 'high', 'media_safety']
].forEach(([id, severity, category]) => {
  const finding = contract.baselineFindings.find((item) => item.id === id);
  check(`${id} exists`, finding);
  equals(`${id} severity`, finding && finding.severity, severity);
  equals(`${id} category`, finding && finding.category, category);
  check(`${id} finding text`, finding && typeof finding.finding === 'string' && finding.finding.length > 70);
  check(`${id} blocker`, finding && typeof finding.blockedBy === 'string' && finding.blockedBy.length > 5);
});

check('nineteen invariants', Array.isArray(contract.mandatoryInvariants) && contract.mandatoryInvariants.length === 19);
unique('invariants unique', contract.mandatoryInvariants);
[
  'authenticated UUID sessions never create authoritative community state in localStorage',
  'community discovery uses one canonical projection with explicit public private and unavailable states',
  'community creation and mutation use server-owned commands with stable client request identity',
  'private communities are not enumerable by nonmembers',
  'invitations and join requests have canonical identity expiry status and idempotency',
  'membership decisions are concurrency-safe and auditable',
  'the canonical owner membership cannot be deleted downgraded or reassigned implicitly',
  'members cannot self-promote or grant permissions they do not possess',
  'bans mutes restrictions and channel discipline use canonical cases with reason actor expiry and revision',
  'posts and messages enter an explicit content lifecycle rather than client-selected publication',
  'community realtime subscriptions are scoped by canonical membership and channel access',
  'lost-response retries return the same membership post message or moderation outcome',
  'community media uses validated private upload authority moderation and retention rules',
  'local fixtures and caches never create production community or moderation authority'
].forEach((invariant) => includes(`invariant ${invariant}`, contract.mandatoryInvariants, invariant));

const expectedAuthority = {
  contractAuthority: true,
  baselineAuthority: true,
  communityCommandAuthority: false,
  membershipAuthority: false,
  roleAuthority: false,
  disciplineAuthority: false,
  postPublicationAuthority: false,
  communityRealtimeAuthority: false,
  moderationAuthority: false,
  mediaAuthority: false,
  runtimeMutationAuthority: false,
  stagingAuthority: false,
  productionAuthority: false
};
Object.entries(expectedAuthority).forEach(([key, value]) => equals(`authority ${key}`, contract.authority[key], value));

[
  'COM-B02', 'COM-B03', 'COM-B04',
  'AUTH-001', 'ADM-B03', 'ADM-B04',
  'LEGAL-B01', 'LEGAL-B03', 'LEGAL-B04'
].forEach((blocker) => includes(`preserved blocker ${blocker}`, contract.preservedBlockers, blocker));
unique('preserved blockers unique', contract.preservedBlockers);

const expectedEffects = [
  'networkRequests',
  'databaseConnections',
  'stagingReads',
  'stagingMutations',
  'migrations',
  'deployments',
  'providerContact',
  'credentialsConfigured',
  'realCommunityCreated',
  'realMembershipChanged',
  'realRoleChanged',
  'realSanctionApplied',
  'realPostCreated',
  'realMessageCreated',
  'realReportCreated',
  'realAppealCreated',
  'realMediaUploaded',
  'realUserDataChanged',
  'productionChanges'
];
expectedEffects.forEach((effect) => equals(`prohibited effect ${effect}`, contract.prohibitedEffects[effect], false));
equals('prohibited effect count', Object.keys(contract.prohibitedEffects).length, expectedEffects.length);

const expectedSublots = [
  'COM-A02 canonical discovery, invitations, join requests and idempotent membership commands',
  'COM-A03 canonical roles, permissions, bans, mutes, restrictions and audit ledger',
  'COM-A04 canonical posts, channels, messages, realtime and rate-limit authority',
  'COM-A05 reports, sanctions, restoration, appeals and media-moderation readiness'
];
equals('next sublot count', contract.nextSublots.length, expectedSublots.length);
expectedSublots.forEach((sublot) => includes(`next sublot ${sublot}`, contract.nextSublots, sublot));

fileContains('assets/js/features/community/community-domain.js', [
  "doke.communities.local.v1",
  "doke.communities.deleted.local.v1",
  "doke.community.events.local.v1",
  "doke.community.audit.local.v1",
  'PERMISSION_KEYS',
  'normalizeBan',
  'normalizeJoinRequest',
  'slowModeSeconds',
  'blockLinks',
  'channelDiscipline'
]);
fileContains('assets/js/services/community-service.js', [
  "Doke.mockData.load('communities')",
  'services.communities',
  'list: list',
  'getById: getById'
]);
fileContains('assets/js/repositories/community-repository.js', [
  'createCommunityRepository',
  'runtime?.listCommunities',
  'runtime?.getCommunity'
]);
fileContains('supabase/migrations/003_communication_finance_community.sql', [
  'create table if not exists public.communities',
  'create table if not exists public.community_members',
  "role in ('member', 'moderator', 'owner')",
  'create table if not exists public.community_posts',
  "status in ('published', 'hidden', 'removed')",
  'create table if not exists public.reports'
]);
fileContains('supabase/migrations/116_community_authority.sql', [
  'private.is_community_member',
  'private.is_community_manager',
  'communities_owner_insert',
  'community_members_join_insert',
  'community_posts_member_insert',
  "and status = 'published'",
  'grant insert, update, delete on table public.communities to authenticated',
  'grant select, insert, delete on table public.community_members to authenticated',
  'grant insert, delete on table public.community_posts to authenticated'
]);
fileContains('supabase/migrations/120_community_owner_membership_invariant.sql', [
  "role in ('member', 'moderator')",
  'community.owner_id = community_members.user_id',
  "role <> 'owner'"
]);

[
  'config/com-a01-authority-baseline.json',
  'docs/COM-A01-AUTHORITY-BASELINE.md',
  'scripts/audit-com-a01-authority-baseline.js',
  'scripts/test-com-a01-authority-baseline.js',
  '.github/workflows/com-a01-authority-baseline.yml'
].forEach((file) => check(`permanent file ${file}`, fs.existsSync(path.join(root, file))));

const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
const result = {
  contractId: contract.contractId,
  sourceHead: contract.sourceHead,
  total: checks.length,
  passed: checks.length - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks,
  effects: contract.prohibitedEffects
};
console.log(JSON.stringify(result, null, 2));
if (failedChecks.length) process.exit(1);
