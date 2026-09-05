#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const r = require('../backend/modules/communities/community-realtime-r2a-residue-cleanup-readiness');
const cfg = require('../config/com-b03c-r2a-residue-cleanup-readiness.json');
let checks = 0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks+=1;};

eq(r.CONTRACT_ID,cfg.contractId,'contract');
eq(r.REQUIRED_PROJECT_ID,'zwkczgewzbsorbrjuzpb','project');
eq(r.REQUIRED_BRANCH,'com/com-001-baseline-audit','branch');
eq(r.REQUIRED_PULL_REQUEST,61,'pr');
eq(r.REQUIRED_AUTHORIZATION_PHRASE,cfg.authorization.requiredPhrase,'phrase');
eq(r.POLICY_PREFIX,cfg.selectors.policyPrefix,'policy prefix');
eq(r.AUTH_EMAIL_PREFIX,cfg.selectors.authEmailPrefix,'email prefix');
eq(r.AUTH_EMAIL_SUFFIX,cfg.selectors.authEmailSuffix,'email suffix');
eq(r.AUTH_USER_PURPOSE,cfg.selectors.authUserPurpose,'user purpose');
const good={
 predecessorValidationId:cfg.predecessor.validationId, predecessorStatus:cfg.predecessor.status,
 predecessorAuthorizationConsumed:true, predecessorAuthorizationReusable:false, cleanupZeroResidueAlreadyProven:false,
 policyPrefix:r.POLICY_PREFIX, authEmailPrefix:r.AUTH_EMAIL_PREFIX, authEmailSuffix:r.AUTH_EMAIL_SUFFIX, authUserPurpose:r.AUTH_USER_PURPOSE,
 inspectPoliciesPrepared:true, dropMatchingPoliciesPrepared:true, inspectSyntheticAuthPrepared:true,
 deleteMatchingSyntheticAuthPrepared:true, postCleanupZeroResidueVerificationPrepared:true, sanitizedEvidencePrepared:true,
 createRealtimePoliciesPlanned:false, openRealtimeChannelsPlanned:false, rerunPredicateLadderPlanned:false,
 communityPostsExecutionPlanned:false, channelMessagesExecutionPlanned:false, publicationMutationPlanned:false,
 runtimeDeployPlanned:false, productionPlanned:false, mergePlanned:false, realUserMutationPlanned:false
};
const ready=r.evaluateRepositoryReadiness(good);
eq(ready.decision,'repository_cleanup_recovery_ready_new_authorization_required','ready');
eq(ready.repositoryReadinessAuthority,true,'repo authority');
for(const k of ['stagingInspectionAuthority','stagingCleanupAuthority','realtimePolicyCreateAuthority','realtimeSubscriptionAuthority','diagnosticRerunAuthority','publicationMutationAuthority','runtimeDeployAuthority','productionAuthority','pullRequestMergeAuthority']) eq(ready[k],false,`no ${k}`);
for(const [k,v,reason] of [
 ['predecessorStatus','wrong','COM_B03C_R2_CLEANUP_UNPROVEN_STATUS_REQUIRED'],
 ['predecessorAuthorizationConsumed',false,'COM_B03C_R2_SINGLE_USE_HISTORY_REQUIRED'],
 ['cleanupZeroResidueAlreadyProven',true,'R2A_NOT_REQUIRED_WHEN_ZERO_RESIDUE_PROVEN'],
 ['policyPrefix','wrong','R2A_EXACT_RESIDUE_SELECTORS_REQUIRED'],
 ['authUserPurpose','wrong','R2A_EXACT_RESIDUE_SELECTORS_REQUIRED'],
 ['inspectPoliciesPrepared',false,'R2A_REQUIRED_CLEANUP_CAPABILITY_MISSING'],
 ['rerunPredicateLadderPlanned',true,'R2A_PROHIBITED_ACTION_PLANNED'],
 ['productionPlanned',true,'R2A_PROHIBITED_ACTION_PLANNED']
]) eq(r.evaluateRepositoryReadiness({...good,[k]:v}).reason,reason,`blocked ${k}`);
const authGood={
 authorizationPhrase:r.REQUIRED_AUTHORIZATION_PHRASE,targetEnvironment:'staging',projectId:r.REQUIRED_PROJECT_ID,
 branch:r.REQUIRED_BRANCH,pullRequest:r.REQUIRED_PULL_REQUEST,authorizationConsumed:false,executionAttempted:false,
 predecessorAuthorizationReusable:false,policyPrefix:r.POLICY_PREFIX,authEmailPrefix:r.AUTH_EMAIL_PREFIX,authEmailSuffix:r.AUTH_EMAIL_SUFFIX,authUserPurpose:r.AUTH_USER_PURPOSE,
 inspectPoliciesAllowed:true,dropMatchingPoliciesAllowed:true,inspectSyntheticAuthAllowed:true,deleteMatchingSyntheticAuthAllowed:true,
 postCleanupZeroResidueVerificationRequired:true,sanitizedEvidenceRequired:true,createRealtimePoliciesAllowed:false,
 openRealtimeChannelsAllowed:false,rerunPredicateLadderAllowed:false,communityPostsExecutionAllowed:false,channelMessagesExecutionAllowed:false,
 publicationMutationAllowed:false,runtimeDeployAllowed:false,productionAllowed:false,mergeAllowed:false,realUserMutationAllowed:false
};
const auth=r.evaluateStagingAuthorization(authGood);
eq(auth.decision,'authorized_for_single_bounded_r2_residue_inspection_and_cleanup_only','auth');
eq(auth.singleUse,true,'single');eq(auth.reusableAfterFailure,false,'non reusable');eq(auth.stagingCleanupAuthority,true,'cleanup');eq(auth.syntheticCanaryIdentityCleanupAuthority,true,'synthetic cleanup');
for(const k of ['realtimePolicyCreateAuthority','realtimeSubscriptionAuthority','diagnosticRerunAuthority','publicationMutationAuthority','runtimeDeployAuthority','productionAuthority','pullRequestMergeAuthority']) eq(auth[k],false,`auth no ${k}`);
for(const [k,v,reason] of [
 ['authorizationPhrase','wrong','EXPLICIT_COM_B03C_R2A_STAGING_AUTHORIZATION_REQUIRED'],
 ['targetEnvironment','production','STAGING_TARGET_MISMATCH'],['branch','main','PULL_REQUEST_BOUNDARY_MISMATCH'],
 ['authorizationConsumed',true,'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED'],['predecessorAuthorizationReusable',true,'COM_B03C_R2_AUTHORIZATION_REUSE_PROHIBITED'],
 ['policyPrefix','bad','R2A_EXACT_RESIDUE_SELECTORS_REQUIRED'],['inspectPoliciesAllowed',false,'R2A_REQUIRED_FLAG_MISSING'],
 ['openRealtimeChannelsAllowed',true,'R2A_PROHIBITED_FLAG_ENABLED'],['realUserMutationAllowed',true,'R2A_PROHIBITED_FLAG_ENABLED']
]) eq(r.evaluateStagingAuthorization({...authGood,[k]:v}).reason,reason,`auth blocked ${k}`);
eq(cfg.status,'repository_cleanup_recovery_certified_new_authorization_required','status');
eq(cfg.certification.runId,31285930006,'cert run');eq(cfg.certification.certifyJobId,93174632736,'cert job');eq(cfg.certification.certifyResult,'success','cert success');eq(cfg.certification.authorizeResult,'skipped','authorize skipped');eq(cfg.certification.canaryResult,'skipped','canary skipped');eq(cfg.certification.stagingAccessExecuted,false,'no staging during cert');eq(cfg.authority.repositoryReadinessAuthority,true,'cfg repo authority');eq(cfg.authorization.received,false,'not received');eq(cfg.authorization.consumed,false,'not consumed');eq(cfg.authorization.executionAttempted,false,'not attempted');eq(cfg.authorization.triggerExists,false,'no trigger');
for(const k of ['createRealtimePoliciesAllowed','openRealtimeChannelsAllowed','rerunPredicateLadderAllowed','communityPostsExecutionAllowed','channelMessagesExecutionAllowed','publicationMutationAllowed','runtimeDeployAllowed','productionAllowed','mergeAllowed','realUserMutationAllowed']) eq(cfg.futureCleanupBoundary[k],false,`cfg no ${k}`);
assert.ok(checks>=50,`expected >=50 checks, got ${checks}`);
console.log(`COM-B03C-R2A residue cleanup readiness checks passed: ${checks}/${checks}`);
