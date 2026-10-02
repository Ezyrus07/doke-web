'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const c=JSON.parse(fs.readFileSync(path.join(root,'config/ana-a09-funnel-snapshot-publication-orchestration-candidate.json'),'utf8'));
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260929121600_ana_a09_funnel_snapshot_publication_orchestration_candidate.sql'),'utf8');
const validation=fs.readFileSync(path.join(root,'supabase/tests/054_ana_a09_funnel_snapshot_publication_orchestration_candidate_validation.sql'),'utf8');
const e=JSON.parse(fs.readFileSync(path.join(root,'reports/generated/ana-a09-funnel-snapshot-publication-orchestration-staging-evidence.json'),'utf8'));
const checks=[];const check=(n,x)=>checks.push({name:n,passed:Boolean(x)});
const expected=["funnel.budget_cta_to_quote_started","funnel.click_to_detail","funnel.detail_to_budget_cta","funnel.impression_to_click","funnel.quote_completed_to_submitted","funnel.quote_started_to_completed","funnel.quote_submitted_to_order_requested","funnel.search_ctr"];

check('staging structure reconciled',c.status==='staging_structure_applied_validation_054_pass_evidence_reconciled_pending_exact_head_certification'&&c.prohibitedEffects.stagingMigrationApplied===true&&c.prohibitedEffects.stagingValidationExecuted===true);
check('exact eight metrics',Array.isArray(c.candidate.metricKeys)&&c.candidate.metricKeys.length===8&&JSON.stringify([...c.candidate.metricKeys].sort())===JSON.stringify([...expected].sort()));
check('publication math',c.candidate.windowStepSeconds===300&&c.candidate.projectionDelaySloSeconds===60&&c.candidate.derivedMaxLagSeconds===360&&c.candidate.windowStepSeconds+c.candidate.projectionDelaySloSeconds===c.candidate.derivedMaxLagSeconds);
check('bounded catch up',c.candidate.maxCatchUpWindowsPerInvocation===3&&c.candidate.maxSnapshotAppendAttemptsPerInvocation===24&&c.candidate.metricCount*c.candidate.maxCatchUpWindowsPerInvocation===24);
check('policy anchor unresolved',c.candidate.windowAnchorSelectedNow===false&&c.candidate.effectiveFromSelectedNow===false&&c.candidate.effectiveUntilSelectedNow===false);
check('no second authority',c.candidate.createsSecondPublicationAuthority===false&&c.publicationAuthorityGeneralization.currentGenericSelectorPreserved==='private.current_analytics_metric_publication_policy_v1');
check('a11 remains admissible',migration.includes("'ana-a11-liquidity-freshness-policy-derivation-v1'")&&migration.includes("'ana-a11-liquidity-series-orchestration-v1'"));
check('planner does not auto revise',c.candidate.plannerScope==='missing_global_funnel_windows_only'&&c.candidate.automaticLateFactRevision===false&&c.candidate.lateFactRevisionAuthority==='ANA-A05');
check('no scheduler',c.prohibitedEffects.schedulerCreated===false&&!migration.includes('cron.schedule('));
check('no policy insert',c.prohibitedEffects.publicationPolicyPersisted===false&&!/insert\s+into\s+private\.analytics_metric_publication_policies_v1/i.test(migration));
check('runtime publication remains false',c.authorization.runtimeSnapshotAuthority===false&&c.authorization.snapshotPublicationAuthority===false&&c.authorization.schedulerAuthority===false);
check('validation is nonmutating',validation.includes('VALIDATION_054_FUNNEL_PUBLICATION_POLICY_UNEXPECTED')&&validation.includes('VALIDATION_054_FUNNEL_CRON_UNEXPECTED')&&validation.trim().endsWith('rollback;'));
check('next gate policy candidate only',c.nextGate.includes('publication-policy approval/activation candidate')&&c.nextGate.includes('No publication-policy persistence, snapshot mutation or scheduler activation'));


check('staging evidence pass',e.validation054.status==='PASS'&&e.migration.status==='APPLIED'&&e.migration.appliedStagingVersion==='20260929125652');
check('staging no activation',e.postflight.funnelPublicationPolicyCount===0&&e.postflight.funnelCronCount===0&&e.postflight.snapshotWriteCount===0&&e.postflight.a09GlobalSnapshotCount===8);
check('staging preserves a11',e.postflight.a11PublicationPolicyCount===1&&e.postflight.a11SchedulerCount===1&&e.invariants.preserveA11===true);
check('staging private execution closed',e.postflight.candidateFunctionCount===4&&e.postflight.anonExecute===false&&e.postflight.authenticatedExecute===false&&e.postflight.serviceRoleExecute===false);
check('evidence digest binding',e.reconciliation.authorizationDigestSha256==='1005173681776fcf6b9af072281c9e02e283884cdf5ad77db296c21e0702d7fd'&&c.stagingStructureEvidence.evidenceBlobSha==='0fa5595dd8b0c0ba925ff46fb7c3dbe0bc150595');
const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;
