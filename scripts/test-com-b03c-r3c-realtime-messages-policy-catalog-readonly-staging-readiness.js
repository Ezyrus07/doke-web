#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const r3b = require('../backend/modules/communities/community-realtime-private-auth-r3b');
const r = require('../backend/modules/communities/community-realtime-private-auth-r3c');
const cfg = require('../config/com-b03c-r3c-realtime-messages-policy-catalog-readonly-staging-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3C-REALTIME-MESSAGES-POLICY-CATALOG-STAGING-READINESS.json');

let checks = 0;
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1; };
const ok = (value, message) => { assert.equal(Boolean(value), true, message); checks += 1; };

eq(r.CONTRACT_ID, cfg.contractId, 'contract');
eq(r.TRIGGER_CONTRACT_ID, 'com-b03c-r3c-realtime-messages-policy-catalog-readonly-staging-trigger-v2', 'attempt 2 trigger contract');
eq(r.PREDECESSOR_VALIDATION_ID, cfg.predecessor.validationId, 'predecessor');
eq(r.PREDECESSOR_STATUS, cfg.predecessor.status, 'predecessor status');
eq(r.REQUIRED_PROJECT_ID, 'zwkczgewzbsorbrjuzpb', 'project');
eq(r.REQUIRED_BRANCH, cfg.checkpoint.branch, 'branch');
eq(r.REQUIRED_PULL_REQUEST, cfg.checkpoint.pullRequest, 'pr');
eq([...r.REQUIRED_SCOPE], cfg.inspection.scope, 'scope');
eq([...r.REQUIRED_POLICY_COLUMNS], cfg.inspection.columns, 'columns');
ok(r.POLICY_INVENTORY_SQL.trim().toLowerCase().startsWith('select '), 'inventory query SELECT only');
ok(r.POLICY_INVENTORY_SQL.includes('from pg_policies'), 'pg_policies source');
ok(r.POLICY_INVENTORY_SQL.includes("schemaname = 'realtime'"), 'realtime schema');
ok(r.POLICY_INVENTORY_SQL.includes("tablename = 'messages'"), 'messages table');

eq(cfg.priorAttempt.authorizationConsumed, true, 'attempt 1 authorization consumed');
eq(cfg.priorAttempt.authorizationReusable, false, 'attempt 1 authorization nonreusable');
eq(cfg.priorAttempt.stagingAccessExecuted, false, 'attempt 1 never accessed staging');

const sample = r.classifyPolicyInventory([
  { policyname: 'read_presence', permissive: 'PERMISSIVE', roles: '{authenticated}', cmd: 'SELECT', qual: "extension = 'presence'", with_check: null },
  { policyname: 'restrict_presence', permissive: 'RESTRICTIVE', roles: '{authenticated}', cmd: 'SELECT', qual: "topic() = 'x'", with_check: null },
  { policyname: 'insert_any', permissive: 'PERMISSIVE', roles: '{authenticated}', cmd: 'INSERT', qual: null, with_check: 'true' }
]);
eq(sample.policyCount, 3, 'policy count');
eq(sample.authenticatedSelectPolicyCount, 2, 'select count');
eq(sample.restrictiveAuthenticatedSelectPolicyCount, 1, 'restrictive count');
eq(sample.restrictiveAuthenticatedSelectPresent, true, 'restrictive present');
eq(sample.exactRootCauseProven, false, 'cause unproven');
eq(r.normalizePolicyRow({ policyname: 'x', permissive: 'PERMISSIVE', roles: '{authenticated}', cmd: 'SELECT', qual: 'true', with_check: null }).policyname, 'x', 'normalize delegated');
eq(r3b.CONTRACT_ID, 'com-b03c-r3b-realtime-messages-policy-composition-readiness-v1', 'r3b dependency stable');

const p = cfg.predecessor;
const readyInput = {
  predecessorValidationId: p.validationId,
  predecessorStatus: p.status,
  repositoryAndHistoricalEvidenceExhausted: p.repositoryAndHistoricalEvidenceExhausted,
  currentStagingCatalogReconstructableFromRepositoryEvidence: p.currentStagingCatalogReconstructableFromRepositoryEvidence,
  remoteInventoryObserved: p.remoteInventoryObserved,
  exactRootCauseProven: p.exactRootCauseProven,
  predecessorCertificationStatus: p.finalCertification.status,
  scope: cfg.inspection.scope,
  policyInventoryColumns: cfg.inspection.columns,
  ...cfg.inspection,
  authorizationReceived: false,
  authorizationConsumed: false,
  executionAttempted: false,
  triggerExists: false,
  stagingAccessExecuted: false,
  remoteMutationExecuted: false
};
const ready = r.evaluateRepositoryReadiness(readyInput);
eq(ready.decision, 'repository_read_only_policy_catalog_staging_ready_new_authorization_required', 'ready decision');
eq(ready.repositoryReadinessAuthority, true, 'repo authority');
eq(ready.stagingReadAuthority, false, 'no staging read before authorization');
eq(ready.stagingMutationAuthority, false, 'no staging mutation');
eq(ready.requiredAuthorizationPhrase, cfg.authorization.phrase, 'future phrase');
eq(ready.exactRootCauseProven, false, 'cause remains unproven');

for (const [field, value, reason] of [
  ['predecessorCertificationStatus', 'failure', 'COM_B03C_R3B_FINAL_CERTIFICATION_REQUIRED'],
  ['remoteInventoryObserved', true, 'COM_B03C_R3B_REMOTE_INVENTORY_MUST_REMAIN_UNOBSERVED'],
  ['exactRootCauseProven', true, 'COM_B03C_ROOT_CAUSE_MUST_REMAIN_UNPROVEN'],
  ['scope', ['wrong'], 'COM_B03C_R3C_SCOPE_MISMATCH'],
  ['transactionReadOnlyRequired', false, 'COM_B03C_R3C_REPOSITORY_READINESS_FLAG_MISSING'],
  ['authorizationReceived', true, 'COM_B03C_R3C_PREAUTHORITY_STATE_REQUIRED']
]) eq(r.evaluateRepositoryReadiness({ ...readyInput, [field]: value }).reason, reason, `blocked ${field}`);

const authInput = {
  authorizationPhrase: r.REQUIRED_AUTHORIZATION_PHRASE,
  targetEnvironment: 'staging',
  projectId: r.REQUIRED_PROJECT_ID,
  branch: r.REQUIRED_BRANCH,
  pullRequest: r.REQUIRED_PULL_REQUEST,
  authorizationConsumed: false,
  executionAttempted: false,
  predecessorAuthorizationReusable: false,
  scope: cfg.inspection.scope,
  catalogReadOnlyAllowed: true,
  transactionReadOnlyRequired: true,
  completePolicyInventoryRequired: true,
  restrictivePolicyDetectionRequired: true,
  authenticatedSelectClassificationRequired: true,
  sanitizedDiagnosticsRequired: true,
  noSyntheticIdentityRequired: true,
  noRealtimeChannelRequired: true,
  noPolicyMutationRequired: true,
  noDomainMutationRequired: true,
  noPublicationMutationRequired: true,
  noRuntimeDeployRequired: true,
  noProductionRequired: true,
  noMergeRequired: true,
  singleUse: true,
  reusableAfterFailure: false
};
const authorized = r.evaluateStagingAuthorization(authInput);
eq(authorized.decision, 'authorized_for_single_read_only_realtime_messages_policy_catalog_inspection', 'authorized decision');
eq(authorized.stagingReadAuthority, true, 'bounded staging read');
for (const key of ['stagingMutationAuthority','realtimePolicyMutationAuthority','realtimeSubscriptionAuthority','authIdentityLifecycleAuthority','domainMutationAuthority','publicationMutationAuthority','runtimeDeployAuthority','productionAuthority','pullRequestMergeAuthority']) eq(authorized[key], false, key);
eq(r.evaluateStagingAuthorization({ ...authInput, authorizationPhrase: 'wrong' }).reason, 'COM_B03C_R3C_EXACT_AUTHORIZATION_REQUIRED', 'exact auth');
eq(r.evaluateStagingAuthorization({ ...authInput, authorizationPhrase: r.PREVIOUS_AUTHORIZATION_PHRASE }).reason, 'COM_B03C_R3C_EXACT_AUTHORIZATION_REQUIRED', 'attempt 1 phrase rejected');
eq(r.evaluateStagingAuthorization({ ...authInput, reusableAfterFailure: true }).reason, 'COM_B03C_R3C_AUTHORIZATION_MUST_NOT_BE_REUSABLE', 'nonreusable');

eq(evidence.status, 'repository_read_only_policy_catalog_staging_ready_new_authorization_required', 'evidence status');
eq(evidence.predecessor.certificationStatus, 'success', 'r3b certified');
eq(evidence.futureAuthorization.received, false, 'auth not received');
eq(evidence.futureAuthorization.consumed, false, 'auth not consumed');
eq(evidence.futureAuthorization.executionAttempted, false, 'not attempted');
eq(evidence.futureAuthorization.triggerExists, false, 'no trigger');
eq(evidence.effects.stagingAccessExecuted, false, 'no staging');
eq(evidence.effects.remoteInventoryObserved, false, 'no inventory yet');
eq(evidence.effects.remoteMutationExecuted, false, 'no remote mutation');

const workflow = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/com-b03c-r3c-realtime-messages-policy-catalog-readonly-staging-readiness.yml'), 'utf8');
const executor = fs.readFileSync(path.resolve(__dirname, './execute-com-b03c-r3c-realtime-messages-policy-catalog-readonly-staging.js'), 'utf8');
ok(/pull_request:/.test(workflow), 'PR certification');
ok(/\bpush:/.test(workflow), 'push trigger exists');
ok(workflow.includes('com-b03c-r3c-realtime-messages-policy-catalog-readonly-staging-trigger.json'), 'exact trigger path');
ok(workflow.includes('environment: doke-staging'), 'staging only future inspect job');
ok(workflow.includes('GITHUB_RUN_ATTEMPT'), 'run attempt guard');
ok(workflow.includes('Trigger commit continuity on staging execution'), 'transient trigger continuity guard');
ok(workflow.includes('audit:domain-completion-matrix'), 'matrix audit');
ok(workflow.includes('audit:agent-governance'), 'governance audit');
ok(workflow.includes('git diff --check'), 'diff hygiene');
ok(workflow.includes(r.REQUIRED_AUTHORIZATION_PHRASE), 'attempt 2 workflow authorization');
ok(!workflow.includes(`COM_B03C_R3C_AUTHORIZATION: ${r.PREVIOUS_AUTHORIZATION_PHRASE}`), 'attempt 1 workflow authorization removed');
ok(executor.includes('begin transaction read only'), 'read-only transaction');
ok(executor.includes('r.POLICY_INVENTORY_SQL'), 'catalog query delegated');
ok(!/\bcreate\s+policy\b/i.test(executor), 'no create policy');
ok(!/\bdrop\s+policy\b/i.test(executor), 'no drop policy');
ok(!/\.channel\s*\(/.test(executor), 'no realtime channel');
ok(!/auth\.admin\.createUser/.test(executor), 'no synthetic auth');
ok(!/\binsert\s+into\b/i.test(executor), 'no insert');
ok(!/\bdelete\s+from\b/i.test(executor), 'no delete');
ok(!/\balter\s+publication\b/i.test(executor), 'no publication mutation');

ok(checks >= 75, `expected at least 75 checks, got ${checks}`);
console.log(`COM-B03C-R3C repository staging readiness checks passed: ${checks}/${checks}`);
