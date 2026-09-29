'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const c=JSON.parse(fs.readFileSync(path.join(root,'config/ana-a09-funnel-publication-policy-approval-activation-candidate.json'),'utf8'));
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260929133000_ana_a09_funnel_publication_policy_approval_activation_candidate.sql'),'utf8');
const validation=fs.readFileSync(path.join(root,'supabase/tests/055_ana_a09_funnel_publication_policy_approval_activation_candidate_validation.sql'),'utf8');
const checks=[];const check=(n,x)=>checks.push({name:n,passed:Boolean(x)});

check('repository only',c.status==='repository_candidate_temporal_values_unselected_staging_unauthorized'&&c.prohibitedEffects.migrationAppliedToStaging===false&&c.prohibitedEffects.publicationPolicyRowsPersisted===false);
check('publication math',c.policySet.windowStepSeconds===300&&c.policySet.projectionDelaySloSeconds===60&&c.policySet.derivedMaxLagSeconds===360&&c.policySet.windowStepSeconds+c.policySet.projectionDelaySloSeconds===c.policySet.derivedMaxLagSeconds);
check('bounded catch up',c.policySet.maxCatchUpWindowsPerInvocation===3);
check('temporal values deferred',c.policySet.windowAnchor===null&&c.policySet.effectiveFrom===null&&c.approvalContract.futureAuthorizationMustSpecifyWindowAnchor===true&&c.approvalContract.futureAuthorizationMustSpecifyEffectiveFrom===true);
check('exact policy set',c.policySet.policies.length===8&&new Set(c.policySet.policies.map(x=>x.policyId)).size===8&&new Set(c.policySet.policies.map(x=>x.metricKey)).size===8);
check('same policy identities as freshness',c.candidate.reusesExistingFreshnessPolicyIds===true&&c.candidate.exactFreshnessAuthorityRequiredAtEffectiveFrom===true);
check('single-use future activation',c.approvalContract.activationInvocationLimit===1&&c.candidate.replayRejectedByOverlap===true);
check('no scheduler or snapshot authority',c.authorization.snapshotMutationAuthority===false&&c.authorization.runtimeSnapshotAuthority===false&&c.authorization.snapshotPublicationAuthority===false&&c.authorization.schedulerAuthority===false);
check('candidate has no scheduler implementation',!migration.includes('cron.schedule(')&&!migration.includes('append_analytics_metric_snapshot_v1('));
check('validation rollback and transient only',validation.trim().endsWith('rollback;')&&validation.includes('v_funnel_transient<>8')&&c.validation055.expectedPersistentPublicationPolicyDelta===0);
check('next gate staging structure only',c.nextGate.includes('staging-structure authorization')&&c.nextGate.includes('persist zero policies'));

const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;
