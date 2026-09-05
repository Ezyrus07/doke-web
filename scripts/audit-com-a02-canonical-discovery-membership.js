'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/com-a02-canonical-discovery-membership.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/com-a02-membership-command-cases.json'), 'utf8'));
const moduleText = fs.readFileSync(path.join(root, 'backend/modules/communities/community-membership-command.js'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'docs/COM-A02-CANONICAL-DISCOVERY-MEMBERSHIP.md'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/com-a02-canonical-discovery-membership.yml'), 'utf8');
const checks = [];
const check = (name, value) => checks.push({ name, passed: Boolean(value) });
const eq = (name, actual, expected) => check(name, actual === expected);
const includes = (name, list, value) => check(name, Array.isArray(list) && list.includes(value));
const unique = (name, list) => check(name, Array.isArray(list) && new Set(list).size === list.length);

eq('contract id', config.contractId, 'com-a02-canonical-discovery-membership-v1');
eq('domain', config.domain, 'COM-001');
eq('source head', config.sourceHead, '30b84d4b1b12890ffeb54cfcb7ad71777f58237d');
eq('scope', config.scope, 'repository_only');
eq('status', config.status, 'contract_complete_runtime_blocked');
['runtimeIntegrated','migrationPrepared','migrationApplied','stagingValidated'].forEach((key) => eq(`${key} false`, config[key], false));
eq('canonical discovery source', config.discovery.canonicalSource, 'canonical_server');
eq('public enumerable', config.discovery.publicEnumerable, true);
eq('private not enumerable', config.discovery.privateEnumerableForNonmembers, false);
eq('invite only not enumerable', config.discovery.inviteOnlyEnumerableForNonmembers, false);
eq('stale authority false', config.discovery.staleOrIncompleteAuthority, false);
['visible','private_not_enumerable','unavailable'].forEach((state) => includes(`discovery state ${state}`, config.discovery.states, state));
unique('discovery states unique', config.discovery.states);

const commands = ['create_community','join_public','request_join','cancel_join_request','invite_member','revoke_invite','accept_invite','reject_invite','approve_join_request','reject_join_request','leave_community'];
eq('command count', config.commands.length, commands.length);
commands.forEach((command) => includes(`command ${command}`, config.commands, command));
unique('commands unique', config.commands);
['accept','replay','reject','conflict','unavailable'].forEach((decision) => includes(`decision ${decision}`, config.decisions, decision));
unique('decisions unique', config.decisions);

eq('request identity uuid', config.identity.clientRequestId, 'uuid_required');
eq('idempotency identity', config.identity.idempotencyKey, 'sha256_actor_command_request');
eq('intent identity', config.identity.intentFingerprint, 'sha256_immutable_intent');
eq('subject identity', config.identity.membershipSubjectKey, 'sha256_community_target_membership');
eq('lost response replay', config.identity.lostResponseReplay, true);
eq('payload drift conflict', config.identity.payloadDriftDecision, 'conflict');

const membership = config.membership;
eq('initial role member', membership.canonicalInitialRole, 'member');
['selfJoinPublicOnly','privateJoinRequiresRequestOrInvitation','oneActiveMembershipPerCommunityUser','oneActiveInvitationPerCommunityUser','oneActiveJoinRequestPerCommunityUser','activeBanBlocksEntry','ownerLeaveRequiresTransfer','revisionCheckRequired'].forEach((key) => eq(`membership ${key}`, membership[key], true));
eq('invitation maximum', membership.invitationMaximumDays, 30);

Object.entries(config.commandEffects).forEach(([key, value]) => eq(`command effect ${key} false`, value, false));
const authorityTrue = ['contractAuthority','discoveryContractAuthority','membershipCommandContractAuthority'];
const authorityFalse = ['communityWriteAuthority','membershipWriteAuthority','invitationWriteAuthority','joinRequestWriteAuthority','roleAuthority','disciplineAuthority','runtimeMutationAuthority','stagingAuthority','productionAuthority'];
authorityTrue.forEach((key) => eq(`authority ${key} true`, config.authority[key], true));
authorityFalse.forEach((key) => eq(`authority ${key} false`, config.authority[key], false));

['COM-B02','COM-B03','COM-B04','AUTH-001','ADM-B03','ADM-B04','LEGAL-B01','LEGAL-B03','LEGAL-B04'].forEach((blocker) => includes(`blocker ${blocker}`, config.preservedBlockers, blocker));
unique('blockers unique', config.preservedBlockers);
Object.entries(config.prohibitedEffects).forEach(([key, value]) => eq(`prohibited ${key} false`, value, false));
check('at least 15 prohibited effects', Object.keys(config.prohibitedEffects).length >= 15);
eq('three next sublots', config.nextSublots.length, 3);
config.nextSublots.forEach((value) => check(`next sublot ${value}`, value.startsWith('COM-A0')));

[
  "require('crypto')",
  "const CONTRACT_ID = 'com-a02-canonical-discovery-membership-v1'",
  'function classifyDiscovery',
  'function buildIdentity',
  'function evaluateCommand',
  "source === 'canonical_server'",
  "writeAuthorized: false",
  "membershipAuthority: false",
  "runtimeMutationAuthority: false",
  "ACTIVE_BAN_BLOCKS_MEMBERSHIP",
  "OWNER_TRANSFER_REQUIRED",
  "IDEMPOTENCY_PAYLOAD_CONFLICT",
  "COMMUNITY_REVISION_CONFLICT",
  'module.exports = Object.freeze'
].forEach((marker) => check(`module marker ${marker}`, moduleText.includes(marker)));
['fetch(', 'axios', 'localStorage', 'supabase', 'process.env', 'child_process', 'http.request', 'https.request'].forEach((marker) => check(`module excludes ${marker}`, !moduleText.includes(marker)));

check('fixture cases >= 30', fixtures.cases.length >= 30);
unique('fixture case names unique', fixtures.cases.map((item) => item.name));
fixtures.cases.forEach((item) => {
  check(`fixture name ${item.name}`, typeof item.name === 'string' && item.name.length > 5);
  includes(`fixture decision ${item.name}`, config.decisions, item.expectedDecision);
  check(`fixture reason ${item.name}`, /^[A-Z0-9_]+$/.test(item.expectedReason));
});

['private communities are not enumerable','stable UUID `clientRequestId`','Exact retry returns `replay`','owner cannot leave','writeAuthorized'].forEach((marker) => check(`docs marker ${marker}`, docs.includes(marker)));
['permissions:\n  contents: read','node --check scripts/audit-com-a02-canonical-discovery-membership.js','node scripts/test-com-a02-canonical-discovery-membership.js','audit-com-a01-authority-baseline.js','audit-rep-a05-rehire-transaction-readiness.js','git diff --check'].forEach((marker) => check(`workflow marker ${marker}`, workflow.includes(marker)));

const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
console.log(JSON.stringify({ contractId: config.contractId, total: checks.length, passed: checks.length - failedChecks.length, failed: failedChecks.length, status: failedChecks.length ? 'failed' : 'passed', failedChecks, effects: config.prohibitedEffects }, null, 2));
if (failedChecks.length) process.exit(1);
