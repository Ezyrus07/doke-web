#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r3d = require('../backend/modules/communities/community-realtime-private-auth-r3d');

const root = path.resolve(__dirname, '..');
const config = require('../config/com-b03c-r3d-r3a-policy-materialization-evidence-readiness.json');
const r3c = require('../docs/validation/COM-B03C-R3C-REALTIME-MESSAGES-POLICY-CATALOG-STAGING-ATTEMPT.json');
const historicalExecutor = fs.readFileSync(path.join(root, r3d.HISTORICAL_EXECUTOR_PATH), 'utf8');

let checks = 0;
function ok(value, message) {
  checks += 1;
  if (!value) throw new Error(`DOKE_COM_B03C_R3D_TEST_FAILED:${message}`);
}

ok(config.contractId === r3d.CONTRACT_ID, 'contract id');
ok(config.checkpoint.branch === r3d.REQUIRED_BRANCH, 'branch');
ok(config.checkpoint.pullRequest === r3d.REQUIRED_PULL_REQUEST, 'pull request');
ok(config.checkpoint.matrixVersion === '1.3.113', 'matrix version');
ok(config.checkpoint.maturity === 3, 'maturity');
ok(config.checkpoint.productionGate === 'blocked', 'production gate');
ok(config.predecessor.validationId === r3d.PREDECESSOR_VALIDATION_ID, 'predecessor validation');
ok(config.predecessor.status === r3d.PREDECESSOR_STATUS, 'predecessor status');
ok(r3c.policyInventory.completeInventoryObserved === true, 'R3C complete inventory');
ok(r3c.policyInventory.policyCount === 0, 'R3C current catalog empty');
ok(r3c.effects.remoteMutationExecuted === false, 'R3C no mutation');
ok(r3c.conclusion.presenceExactRootCauseProven === false, 'R3C exact root cause remains false');

ok(historicalExecutor.includes("command:'SELECT',expression"), 'R3A SELECT candidate generated');
ok(historicalExecutor.includes("command:'INSERT',expression:'true'"), 'R3A INSERT true control generated');
ok(historicalExecutor.includes("await db.query('begin')"), 'R3A policy transaction begin');
ok(historicalExecutor.includes("await db.query('commit')"), 'R3A policy transaction commit');
ok(historicalExecutor.includes("select policyname,cmd,roles::text,qual,with_check from pg_policies"), 'R3A own-policy introspection columns');
ok(!historicalExecutor.includes('policyname,permissive'), 'R3A permissive not captured');
ok(historicalExecutor.includes("return{policyCount:q.rows.length,allChecksPassed:true}"), 'R3A evidence collapses introspection to count/boolean');
ok(historicalExecutor.includes("if(x.expression==='true'"), 'R3A literal true verified');
ok(historicalExecutor.includes("if(x.expression==='false'"), 'R3A literal false verified');
ok(!historicalExecutor.includes('complexSelectQualExactMaterializationCaptured'), 'R3A has no exact complex qual proof marker');

const iInstall = historicalExecutor.indexOf('await install(db,ds)');
const iInspect = historicalExecutor.indexOf('const policyInspection=await inspect(db,ds)');
const iClient = historicalExecutor.indexOf('c=await rt(pub,token)');
const iSubscribe = historicalExecutor.indexOf('const join=await subscribe(ch)');
const iDrop = historicalExecutor.indexOf('await drop(db,ds)');
const iGone = historicalExecutor.indexOf('exact(await gone(db,ds),true');
ok(iInstall >= 0 && iInspect > iInstall && iClient > iInspect && iSubscribe > iClient, 'R3A install-inspect-client-subscribe order');
ok(iDrop > iSubscribe && iGone > iDrop, 'R3A per-case drop and absence proof after subscribe');
ok(historicalExecutor.includes("presence:{enabled:true"), 'R3A presence enabled');
ok(historicalExecutor.includes("ch.on('presence',{event:'sync'}"), 'R3A presence listener pre-subscribe');
ok(historicalExecutor.includes('await c.realtime.setAuth(token)'), 'R3A JWT set before channel');

const positive = r3d.evaluateRepositoryReadiness({
  predecessorValidationId: config.predecessor.validationId,
  predecessorStatus: config.predecessor.status,
  r3cAttempt2AuthorizationConsumed: true,
  r3cAttempt2AuthorizationReusable: false,
  futurePolicySnapshotColumns: config.futureEvidenceRequirements.policySnapshotColumns,
  ...config.historicalR3aExecutor,
  r3cCurrentPersistentCatalogEmpty: true,
  r3cRemoteMutationFalse: true,
  supabaseAuthorizationCacheScopedToConnectionDocumented: true,
  ...config.observabilityGap,
  futureExactStoredPolicySnapshotRequired: true,
  futureCompleteCatalogAtCaseTimeRequired: true,
  futurePolicyCountAndCommandSplitRequired: true,
  futureExpectedVsStoredPredicateEvidenceRequired: true,
  futureSnapshotBeforeRealtimeSubscribeRequired: true,
  futurePerCaseCleanupInventoryRequired: true,
  arbitrarySleepProhibitedWithoutEvidence: true,
  causalPromotionBlockedUntilNewEvidence: true,
  stagingReadPlanned: false,
  stagingMutationPlanned: false,
  triggerCreationPlanned: false,
  authorizationPhraseDefined: false,
  realtimePolicyMutationPlanned: false,
  realtimeSubscriptionPlanned: false,
  authIdentityLifecyclePlanned: false,
  communityPostsExecutionPlanned: false,
  channelMessagesExecutionPlanned: false,
  domainMutationPlanned: false,
  publicationMutationPlanned: false,
  runtimeDeployPlanned: false,
  productionPlanned: false,
  mergePlanned: false,
  realUserMutationPlanned: false
});
ok(positive.decision === 'repository_r3a_policy_materialization_evidence_gap_isolated', 'positive readiness decision');
ok(positive.repositoryReadinessAuthority === true, 'repository authority');
ok(positive.stagingReadAuthority === false, 'no staging read authority');
ok(positive.stagingMutationAuthority === false, 'no staging mutation authority');
ok(positive.realtimeSubscriptionAuthority === false, 'no realtime authority');
ok(positive.runtimeDeployAuthority === false, 'no runtime deploy authority');
ok(positive.productionAuthority === false, 'no production authority');
ok(positive.pullRequestMergeAuthority === false, 'no merge authority');
ok(positive.exactRootCauseProven === false, 'root cause remains unproven');
ok(positive.proven.sameConnectionAuthorizationCacheExplainsCrossCaseResult === false, 'same-connection cache not promoted');
ok(positive.unresolved.exactStoredComplexSelectQualAtR3aCaseTime === true, 'stored qual remains unresolved');
ok(positive.unresolved.completePolicyCatalogAtR3aCaseTime === true, 'case-time catalog remains unresolved');

const unsafe = r3d.evaluateRepositoryReadiness({
  predecessorValidationId: config.predecessor.validationId,
  predecessorStatus: config.predecessor.status,
  r3cAttempt2AuthorizationConsumed: true,
  r3cAttempt2AuthorizationReusable: false,
  futurePolicySnapshotColumns: config.futureEvidenceRequirements.policySnapshotColumns,
  ...config.historicalR3aExecutor,
  r3cCurrentPersistentCatalogEmpty: true,
  r3cRemoteMutationFalse: true,
  supabaseAuthorizationCacheScopedToConnectionDocumented: true,
  ...config.observabilityGap,
  futureExactStoredPolicySnapshotRequired: true,
  futureCompleteCatalogAtCaseTimeRequired: true,
  futurePolicyCountAndCommandSplitRequired: true,
  futureExpectedVsStoredPredicateEvidenceRequired: true,
  futureSnapshotBeforeRealtimeSubscribeRequired: true,
  futurePerCaseCleanupInventoryRequired: true,
  arbitrarySleepProhibitedWithoutEvidence: true,
  causalPromotionBlockedUntilNewEvidence: true,
  stagingReadPlanned: true
});
ok(unsafe.decision === 'blocked_repository_only', 'staging intent fails closed');
ok(unsafe.stagingReadAuthority === false, 'blocked staging authority remains false');

console.log(`COM-B03C-R3D readiness: ${checks}/${checks} checks passed`);
