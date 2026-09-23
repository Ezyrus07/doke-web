'use strict';
const c=require('../config/ana-a11-liquidity-freshness-policy-derivation.json');
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

eq('scheduler topology','supabase_pg_cron_database_local',c.schedulerTopology.mechanism);
check('scheduler uses direct A10 runner',c.schedulerTopology.invocation==='direct_sql_public.run_analytics_cat_liquidity_projection_v1'&&c.schedulerTopology.edgeFunctionRequired===false);
check('window grid remains unapproved',c.canonicalWindowGrid.windowStepSeconds===null&&c.canonicalWindowGrid.boundaryAnchor===null&&c.canonicalWindowGrid.boundaryTimeZone===null);
check('dimension enumerator cannot reuse snapshots',c.dimensionSeriesAuthority.enumeratorExists===false&&c.dimensionSeriesAuthority.schedulerMayReuseExistingSnapshotDimensionsAsAuthority===false&&c.dimensionSeriesAuthority.mutableCurrentCatalogJoinAllowed===false);
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
