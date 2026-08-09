#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const r = require('../backend/modules/communities/community-realtime-private-auth-r3b');
const cfg = require('../config/com-b03c-r3b-realtime-messages-policy-composition-readiness.json');
let checks = 0;
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1; };
const ok = (value, message) => { assert.equal(Boolean(value), true, message); checks += 1; };

eq(r.CONTRACT_ID, cfg.contractId, 'contract');
eq(r.REQUIRED_BRANCH, cfg.checkpoint.branch, 'branch');
eq(r.REQUIRED_PULL_REQUEST, cfg.checkpoint.pullRequest, 'pr');
eq([...r.REQUIRED_POLICY_COLUMNS], cfg.policyInventory.columns, 'policy columns');
ok(r.POLICY_INVENTORY_SQL.includes("from pg_policies"), 'pg_policies query');
ok(r.POLICY_INVENTORY_SQL.includes("schemaname = 'realtime'"), 'realtime schema');
ok(r.POLICY_INVENTORY_SQL.includes("tablename = 'messages'"), 'messages table');

eq(r.normalizePermissive('PERMISSIVE'), true, 'permissive string');
eq(r.normalizePermissive('RESTRICTIVE'), false, 'restrictive string');
eq(r.normalizePermissive(true), true, 'permissive bool');
eq(r.normalizeRoles('{authenticated,service_role}'), ['authenticated', 'service_role'], 'roles text');
eq(r.normalizeRoles(['authenticated']), ['authenticated'], 'roles array');
assert.throws(() => r.normalizePermissive('unknown')); checks += 1;
assert.throws(() => r.normalizePolicyRow({ policyname: 'x' })); checks += 1;

const restrictive = r.classifyPolicyInventory([
  { policyname: 'broadcast_read', permissive: 'PERMISSIVE', roles: '{authenticated}', cmd: 'SELECT', qual: "extension = 'broadcast'", with_check: null },
  { policyname: 'presence_guard', permissive: 'RESTRICTIVE', roles: '{authenticated}', cmd: 'SELECT', qual: "extension <> 'presence'", with_check: null },
  { policyname: 'insert_control', permissive: 'PERMISSIVE', roles: '{authenticated}', cmd: 'INSERT', qual: null, with_check: 'true' }
]);
eq(restrictive.policyCount, 3, 'inventory count');
eq(restrictive.authenticatedSelectPolicyCount, 2, 'auth select count');
eq(restrictive.restrictiveAuthenticatedSelectPolicyCount, 1, 'restrictive count');
eq(restrictive.restrictiveAuthenticatedSelectPresent, true, 'restrictive present');
eq(restrictive.restrictivePolicyNames, ['presence_guard'], 'restrictive names');
eq(restrictive.exactRootCauseProven, false, 'cause not proven');
eq(restrictive.remoteConfirmationRequiredBeforeRuntimeChange, true, 'remote confirmation required');

const permissiveOnly = r.classifyPolicyInventory([
  { policyname: 'read_all', permissive: true, roles: ['authenticated'], cmd: 'SELECT', qual: 'true', with_check: null }
]);
eq(permissiveOnly.restrictiveAuthenticatedSelectPresent, false, 'no restrictive');

const p = cfg.predecessor;
const readyInput = {
  predecessorValidationId: p.validationId,
  predecessorStatus: p.status,
  r3aAuthorizationConsumed: p.authorizationConsumed,
  r3aAuthorizationReusable: p.authorizationReusable,
  r3aZeroResidueProven: p.zeroResidueProven,
  uidTopicDirectPasses: p.uidTopicDirectPasses,
  uidExtensionPairRejected: p.uidExtensionPairRejected,
  topicExtensionPairRejected: p.topicExtensionPairRejected,
  allFullConjunctionVariantsRejected: p.allFullConjunctionVariantsRejected,
  exactRootCauseProven: p.exactRootCauseProven,
  policyInventoryColumns: cfg.policyInventory.columns,
  completePolicyInventoryRequired: true,
  restrictivePolicyDetectionRequired: true,
  authenticatedSelectScopeRequired: true,
  policyInventoryQueryFrozen: true,
  causalPromotionBlockedUntilInventoryObserved: true,
  stagingReadPlanned: false,
  stagingMutationPlanned: false,
  triggerCreationPlanned: false,
  realtimePolicyMutationPlanned: false,
  realtimeSubscriptionPlanned: false,
  communityPostsExecutionPlanned: false,
  channelMessagesExecutionPlanned: false,
  domainMutationPlanned: false,
  publicationMutationPlanned: false,
  runtimeDeployPlanned: false,
  productionPlanned: false,
  mergePlanned: false,
  realUserMutationPlanned: false
};
const ready = r.evaluateRepositoryReadiness(readyInput);
eq(ready.decision, 'repository_realtime_messages_policy_composition_rca_ready', 'repository readiness');
eq(ready.repositoryReadinessAuthority, true, 'repo authority');
for (const key of ['stagingReadAuthority', 'stagingMutationAuthority', 'realtimePolicyMutationAuthority', 'realtimeSubscriptionAuthority', 'runtimeDeployAuthority', 'productionAuthority', 'pullRequestMergeAuthority']) eq(ready[key], false, key);
for (const [field, value, reason] of [
  ['exactRootCauseProven', true, 'COM_B03C_R3A_ROOT_CAUSE_MUST_REMAIN_UNPROVEN'],
  ['policyInventoryColumns', ['policyname'], 'COMPLETE_PG_POLICIES_COLUMN_SET_REQUIRED'],
  ['restrictivePolicyDetectionRequired', false, 'COM_B03C_R3B_REPOSITORY_READINESS_FLAG_MISSING'],
  ['stagingReadPlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED'],
  ['triggerCreationPlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED'],
  ['productionPlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED']
]) eq(r.evaluateRepositoryReadiness({ ...readyInput, [field]: value }).reason, reason, `blocked ${field}`);

eq(cfg.status, 'repository_policy_composition_rca_ready_no_staging_authority', 'status');
eq(cfg.policyInventory.remoteInventoryObserved, false, 'remote inventory absent');
eq(cfg.authority.stagingReadAuthority, false, 'no staging read');
eq(cfg.authority.triggerCreationAuthority, false, 'no trigger');
eq(cfg.authority.productionAuthority, false, 'no production');
eq(cfg.authority.pullRequestMergeAuthority, false, 'no merge');

const workflow = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/com-b03c-r3b-realtime-messages-policy-composition-readiness.yml'), 'utf8');
ok(/pull_request:/.test(workflow), 'pull request only');
ok(!/^\s*push:/m.test(workflow), 'no push trigger');
ok(!/environment:\s*doke-staging/.test(workflow), 'no staging environment');
ok(!/secrets\./.test(workflow), 'no secrets');
ok(!/SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD/.test(workflow), 'no staging credentials');
ok(/audit:domain-completion-matrix/.test(workflow), 'domain audit');
ok(/audit:agent-governance/.test(workflow), 'governance audit');
ok(/git diff --check/.test(workflow), 'diff check');
ok(checks >= 45, `expected >=45 checks, got ${checks}`);
console.log(`COM-B03C-R3B repository RCA readiness checks passed: ${checks}/${checks}`);
