'use strict';
const fs=require('fs');const path=require('path');const c=require('../config/ana-a11-liquidity-freshness-policy-derivation.json');const publicationMigration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260923012500_ana_a11_liquidity_publication_policy_authority.sql'),'utf8');const plannerMigration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260923023000_ana_a11_liquidity_window_planner.sql'),'utf8');const migration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260923011500_ana_a11_liquidity_series_orchestration.sql'),'utf8');
const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});const eq=(n,a,b)=>check(n,a===b);
function derive(input){
  if(!input||!Number.isInteger(input.windowStepSeconds)||input.windowStepSeconds<=0)throw new Error('ANA_LIQUIDITY_WINDOW_STEP_REQUIRED');
  if(!Number.isInteger(input.projectionDelaySloSeconds)||input.projectionDelaySloSeconds<0)throw new Error('ANA_LIQUIDITY_PROJECTION_DELAY_SLO_REQUIRED');
  if(input.recoveryGraceSeconds!=null)throw new Error('ANA_LIQUIDITY_IMPLICIT_GRACE_FORBIDDEN');
  return input.windowStepSeconds+input.projectionDelaySloSeconds;
}
eq('synthetic derivation',derive({windowStepSeconds:3600,projectionDelaySloSeconds:300}),3900);
let noStep=false;try{derive({projectionDelaySloSeconds:300});}catch(e){noStep=e.message==='ANA_LIQUIDITY_WINDOW_STEP_REQUIRED';}check('missing cadence rejected',noStep);
let noDelay=false;try{derive({windowStepSeconds:3600});}catch(e){noDelay=e.message==='ANA_LIQUIDITY_PROJECTION_DELAY_SLO_REQUIRED';}check('missing delay rejected',noDelay);
let grace=false;try{derive({windowStepSeconds:3600,projectionDelaySloSeconds:300,recoveryGraceSeconds:60});}catch(e){grace=e.message==='ANA_LIQUIDITY_IMPLICIT_GRACE_FORBIDDEN';}check('unapproved grace rejected',grace);




check('publication policy schema is applied but empty',c.publicationPolicyAuthority.stagingApplied===true&&c.publicationPolicyAuthority.stagingMigrationVersion==='20260923021316'&&c.publicationPolicyAuthority.stagingRows===0&&c.publicationPolicyAuthority.rowCreationAuthorized===false);

check('planner remains repository-only',c.windowPlannerCandidate.stagingApplied===false&&c.windowPlannerCandidate.createsCron===false&&c.windowPlannerCandidate.writesSnapshots===false);
check('planner requires explicit policy',c.windowPlannerCandidate.policyRowRequired===true&&plannerMigration.includes('DOKE_ANALYTICS_PUBLICATION_POLICY_REQUIRED'));
check('planner grid comes from policy',plannerMigration.includes('v_policy.window_anchor')&&plannerMigration.includes('v_policy.window_step_seconds')&&plannerMigration.includes('v_policy.max_catch_up_windows_per_invocation'));
check('planner checks full series completion',plannerMigration.includes('expected_series')&&plannerMigration.includes('missing_count > 0')&&plannerMigration.includes("m.dimensions = e.expected_dimensions"));
check('planner special SQL forms compile portably',!plannerMigration.includes('pg_catalog.extract')&&!plannerMigration.includes('pg_catalog.greatest')&&!plannerMigration.includes('pg_catalog.least')&&plannerMigration.includes('extract(epoch from'));
check('planner is oldest-first and bounded',plannerMigration.includes('order by w.candidate_window_start')&&plannerMigration.includes('limit v_policy.max_catch_up_windows_per_invocation'));

check('staging canaries left no residue',c.stagingStructuralEvidence.postState.publicationPolicyRows===0&&c.stagingStructuralEvidence.postState.freshnessPolicyRows===0&&c.stagingStructuralEvidence.postState.anaLiquidityCrons===0&&c.stagingStructuralEvidence.postState.liquiditySnapshotRows===3);
check('staging canaries proved replay and ambiguity',c.seriesOrchestrationCandidate.canary.firstRun.appendedCount===3&&c.seriesOrchestrationCandidate.canary.replayRun.noChangeCount===3&&c.publicationPolicyAuthority.canary.derivedMaxLagSeconds===360&&c.publicationPolicyAuthority.canary.overlapError==='DOKE_ANALYTICS_PUBLICATION_POLICY_AMBIGUOUS');
check('publication policy has no implicit default',publicationMigration.includes('if v_count = 0 then')&&c.publicationPolicyAuthority.missingEffectivePolicy==='null_no_default');
check('publication policy overlap is unavailable',publicationMigration.includes('DOKE_ANALYTICS_PUBLICATION_POLICY_AMBIGUOUS')&&c.publicationPolicyAuthority.overlappingEffectivePolicies==='fail_closed_DOKE_ANALYTICS_PUBLICATION_POLICY_AMBIGUOUS');
check('publication policy stores derivation inputs',publicationMigration.includes('window_step_seconds integer not null')&&publicationMigration.includes('projection_delay_slo_seconds integer not null')&&publicationMigration.includes('window_anchor timestamptz not null')&&publicationMigration.includes('max_catch_up_windows_per_invocation integer not null'));
check('publication policy derives lag',publicationMigration.includes('derived_max_lag_seconds bigint generated always as')&&publicationMigration.includes('window_step_seconds::bigint + projection_delay_slo_seconds::bigint'));
check('freshness threshold cannot be hand-authorized by candidate',c.publicationPolicyAuthority.freshnessPolicySyncAuthorized===false&&c.authority.freshnessPolicySyncAuthority===false);
eq('fixed duration timezone semantics',c.currentDecision.windowBoundaryTimeZone,'not_applicable_fixed_duration_grid');

check('category series key is case-normalized',migration.includes('pg_catalog.lower(coalesce(')&&c.seriesOrchestrationCandidate.categorySeriesKey==='lower(coalesce(categoryId, categorySlug, category))');
check('category representation classes are not merged',c.dimensionSeriesAuthority.categoryIdentityContinuity.categoryIdEquivalentToSlugOrName===false&&c.dimensionSeriesAuthority.categoryIdentityContinuity.historicalRepresentationRewriteAllowed===false&&c.seriesOrchestrationCandidate.crossRepresentationMergeAllowed===false);
check('legacy freeform identity remains valid',c.dimensionSeriesAuthority.categoryIdentityContinuity.stagingEvidence.legacyFreeformServiceHasCanonicalCategoryRow===false);

check('series authority is staging-applied without activation',c.seriesOrchestrationCandidate.stagingApplied===true&&c.seriesOrchestrationCandidate.stagingMigrationVersion==='20260923021120'&&c.seriesOrchestrationCandidate.cronCreated===false&&c.seriesOrchestrationCandidate.policyRowsWritten===false);
check('series universe is CAT-fact-backed',migration.includes('dimension_snapshot_after')&&migration.includes('cat_listing_supply_coverage_epochs_v1')&&migration.includes('cat_listing_visibility_watermark_v1'));
check('series universe never joins mutable catalog',!migration.includes('public.services')&&!migration.includes('public.service_versions'));
check('window orchestration is canonical delegation',migration.includes('run_analytics_cat_liquidity_window_v1')&&migration.includes('run_analytics_cat_liquidity_projection_v1'));
check('window orchestration accepts only append authority states',migration.includes("'APPENDED', 'NO_CHANGE'")&&migration.includes('DOKE_ANALYTICS_LIQUIDITY_SNAPSHOT_STATE_INVALID'));
check('dimension runtime authority is staging validated',c.authority.dimensionEnumeratorRuntimeAuthority===true&&c.dimensionSeriesAuthority.stagingEnumeratorExists===true&&c.dimensionSeriesAuthority.enumeratorExists===true);

eq('scheduler topology','supabase_pg_cron_database_local',c.schedulerTopology.mechanism);
check('scheduler uses direct A10 runner',c.schedulerTopology.invocation==='direct_sql_public.run_analytics_cat_liquidity_projection_v1'&&c.schedulerTopology.edgeFunctionRequired===false);
check('window grid remains unapproved',c.canonicalWindowGrid.windowStepSeconds===null&&c.canonicalWindowGrid.boundaryAnchor===null&&c.canonicalWindowGrid.boundaryTimeZone==='not_applicable_fixed_duration_grid'&&c.canonicalWindowGrid.timeZoneIsIndependentAuthority===false);
check('dimension enumerator cannot reuse snapshots as authority',c.dimensionSeriesAuthority.enumeratorExists===true&&c.dimensionSeriesAuthority.stagingEnumeratorExists===true&&c.dimensionSeriesAuthority.schedulerMayReuseExistingSnapshotDimensionsAsAuthority===false&&c.dimensionSeriesAuthority.mutableCurrentCatalogJoinAllowed===false);
check('catch-up cannot skip gaps',c.missedWindowRecovery.processingOrder==='oldest missing canonical closed window first'&&c.missedWindowRecovery.skipDirectlyToLatestAllowed===false);
check('catch-up limit remains unset',c.missedWindowRecovery.maxCatchUpWindowsPerInvocation===null&&c.missedWindowRecovery.unboundedCatchUpAllowed===false);
check('exact replay remains safe',c.missedWindowRecovery.exactReplayBehavior.includes('NO_CHANGE'));
eq('divergent concurrency fails closed',c.missedWindowRecovery.divergentConcurrentWriteBehavior,'DOKE_ANALYTICS_METRIC_REVISION_CONFLICT');

check('contract leaves values unset',c.currentDecision.windowStepSeconds===null&&c.currentDecision.projectionDelaySloSeconds===null&&c.currentDecision.maxLagSeconds===null);
check('CAT watermark uses snapshot barrier',c.sourceDomainWatermarkSemantics.sourceDomain==='CAT-001'&&c.sourceDomainWatermarkSemantics.basis==='transaction_snapshot_barrier_v1');
check('event max is not watermark',c.sourceDomainWatermarkSemantics.maxEventOccurredAtIsWatermark===false);
check('computedAt is not watermark',c.sourceDomainWatermarkSemantics.computedAtIsWatermark===false);
check('source lag remains separate',c.sourceDomainWatermarkSemantics.sourceLagFoldedIntoMaxLagSeconds===false);
eq('fresh maps authoritative',c.freshnessStateSemantics.projectionStateMapping.fresh,'authoritative');
eq('stale maps stale',c.freshnessStateSemantics.projectionStateMapping.stale,'stale');
eq('unavailable maps unavailable',c.freshnessStateSemantics.projectionStateMapping.unavailable,'unavailable');
check('scheduler remains unauthorized',c.pendingAuthorityDecisions.scheduler.currentlyAuthorized===false);
const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;
