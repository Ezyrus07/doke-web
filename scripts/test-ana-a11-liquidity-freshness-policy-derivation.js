'use strict';
const fs=require('fs');const path=require('path');const c=require('../config/ana-a11-liquidity-freshness-policy-derivation.json');const publicationMigration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260923012500_ana_a11_liquidity_publication_policy_authority.sql'),'utf8');const plannerMigration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260923023000_ana_a11_liquidity_window_planner.sql'),'utf8');const activationMigration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260923025000_ana_a11_liquidity_policy_activation.sql'),'utf8');const executorMigration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260923024000_ana_a11_liquidity_catch_up_executor.sql'),'utf8');const migration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260923011500_ana_a11_liquidity_series_orchestration.sql'),'utf8');
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




check('publication policy schema has revision 1 row',c.publicationPolicyAuthority.stagingApplied===true&&c.publicationPolicyAuthority.stagingMigrationVersion==='20260923021316'&&c.publicationPolicyAuthority.stagingRows===1&&c.publicationPolicyAuthority.rowCreationAuthorized===false&&c.publicationPolicyAuthority.rowCreationCompleted===true);


check('catch-up executor staging structural runtime only',c.catchUpExecutorCandidate.stagingApplied===true&&c.catchUpExecutorCandidate.stagingMigrationVersion==='20260923130307'&&c.catchUpExecutorCandidate.stagingValidation==='PASS'&&c.catchUpExecutorCandidate.createsCron===false&&c.catchUpExecutorCandidate.choosesNumericPolicy===false&&c.authority.catchUpExecutorRuntimeAuthority===true);
check('catch-up executor delegates planner and window authority',executorMigration.includes('private.plan_analytics_cat_liquidity_windows_v1')&&executorMigration.includes('private.run_analytics_cat_liquidity_window_v1'));
check('catch-up executor has no direct policy authority',c.catchUpExecutorCandidate.directPolicyRead===false&&c.catchUpExecutorCandidate.directFreshnessPolicyWrite===false&&!executorMigration.includes('analytics_metric_publication_policies_v1'));
check('catch-up executor preserves planner order',executorMigration.includes('order by p.window_ordinal')&&c.catchUpExecutorCandidate.executionOrder==='planner windowOrdinal ascending');
check('catch-up rejects corrupted planner order',executorMigration.includes('DOKE_ANALYTICS_LIQUIDITY_PLANNER_ORDER_INVALID')&&executorMigration.includes('v_window.window_ordinal <> v_planned_count + 1')&&c.catchUpExecutorCandidate.plannerBypassAllowed===false);


check('policy activation staging structural runtime only',c.policyActivationCandidate.stagingApplied===true&&c.policyActivationCandidate.stagingMigrationVersion==='20260923130310'&&c.policyActivationCandidate.stagingValidation==='PASS'&&c.policyActivationCandidate.createsCron===false&&c.policyActivationCandidate.policyValuesChosen===false&&c.authority.policyActivationRuntimeAuthority===true);
check('policy activation is atomic coupling',activationMigration.includes('insert into private.analytics_metric_publication_policies_v1')&&activationMigration.includes('insert into private.analytics_metric_freshness_policies_v1')&&c.policyActivationCandidate.insertsPublicationPolicy===true&&c.policyActivationCandidate.insertsFreshnessPolicy===true);
check('policy activation forbids hand-entered max lag',activationMigration.includes('v_max_lag_seconds :=')&&activationMigration.includes('p_window_step_seconds::bigint + p_projection_delay_slo_seconds::bigint')&&!activationMigration.includes('p_max_lag_seconds'));
check('policy activation rejects registry overlap',activationMigration.includes('DOKE_ANALYTICS_PUBLICATION_POLICY_OVERLAP')&&activationMigration.includes('DOKE_ANALYTICS_FRESHNESS_POLICY_OVERLAP'));

check('planner staging structural runtime only',c.windowPlannerCandidate.stagingApplied===true&&c.windowPlannerCandidate.stagingMigrationVersion==='20260923130303'&&c.windowPlannerCandidate.stagingValidation==='PASS'&&c.windowPlannerCandidate.createsCron===false&&c.windowPlannerCandidate.writesSnapshots===false&&c.authority.windowPlannerRuntimeAuthority===true);
check('staging canaries are rollback-only and bounded',c.windowPlannerCandidate.canary.rollbackOnly===true&&c.windowPlannerCandidate.canary.completeOnlyAfterAllRequiredSeries===true&&c.catchUpExecutorCandidate.canary.thirdReplay.plannedWindowCount===0&&c.policyActivationCandidate.canary.cronCreatedInTransaction===false);
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
check('freshness threshold was atomically synchronized',c.publicationPolicyAuthority.freshnessPolicySyncAuthorized===false&&c.publicationPolicyAuthority.freshnessPolicySyncCompleted===true&&c.authority.freshnessPolicySyncAuthority===true);
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
check('scheduler uses bounded A11 catch-up target',c.schedulerTopology.invocation==='direct_sql_private.run_analytics_cat_liquidity_catch_up_v1'&&c.schedulerTopology.futureCronTarget==='private.run_analytics_cat_liquidity_catch_up_v1'&&c.schedulerTopology.bypassPlannerAllowed===false&&c.schedulerTopology.edgeFunctionRequired===false);
check('window grid revision 1 persisted',c.canonicalWindowGrid.windowStepSeconds===300&&c.canonicalWindowGrid.boundaryAnchor==='1970-01-01T00:00:00Z'&&c.canonicalWindowGrid.boundaryTimeZone==='not_applicable_fixed_duration_grid'&&c.canonicalWindowGrid.timeZoneIsIndependentAuthority===false);
check('dimension enumerator cannot reuse snapshots as authority',c.dimensionSeriesAuthority.enumeratorExists===true&&c.dimensionSeriesAuthority.stagingEnumeratorExists===true&&c.dimensionSeriesAuthority.schedulerMayReuseExistingSnapshotDimensionsAsAuthority===false&&c.dimensionSeriesAuthority.mutableCurrentCatalogJoinAllowed===false);
check('catch-up cannot skip gaps',c.missedWindowRecovery.processingOrder==='oldest missing canonical closed window first'&&c.missedWindowRecovery.skipDirectlyToLatestAllowed===false);
check('catch-up limit revision 1 persisted',c.missedWindowRecovery.maxCatchUpWindowsPerInvocation===3&&c.missedWindowRecovery.unboundedCatchUpAllowed===false);
check('exact replay remains safe',c.missedWindowRecovery.exactReplayBehavior.includes('NO_CHANGE'));
eq('divergent concurrency fails closed',c.missedWindowRecovery.divergentConcurrentWriteBehavior,'DOKE_ANALYTICS_METRIC_REVISION_CONFLICT');

check('contract records revision 1 values',c.currentDecision.windowStepSeconds===300&&c.currentDecision.projectionDelaySloSeconds===60&&c.currentDecision.maxLagSeconds===360&&c.currentDecision.maxCatchUpWindowsPerInvocation===3);
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
