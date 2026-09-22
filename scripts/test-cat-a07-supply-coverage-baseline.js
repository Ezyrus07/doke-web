'use strict';
const c=require('../config/cat-a07-supply-coverage-baseline.json');
const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});const eq=(n,a,b)=>check(n,a===b);
function baselineFact(last,current,serviceId='svc'){
  if(last&&last.eligibleAfter!==current.eligible)throw new Error('CAT_A07_STATE_DRIFT');
  if(last&&current.eligible&&(last.visibleVersionId!==current.visibleVersionId||last.category!==current.category||last.state!==current.state))throw new Error('CAT_A07_VISIBLE_SNAPSHOT_DRIFT');
  return {
    serviceId,
    eligibleBefore:last?last.eligibleAfter:false,
    eligibleAfter:current.eligible,
    visibleVersionIdAfter:current.eligible?current.visibleVersionId:null,
    dimensionsAfter:current.eligible?{category:current.category,state:current.state}:null,
    coverageKind:'activation_baseline'
  };
}
let f=baselineFact(null,{eligible:true,visibleVersionId:'v1',category:'cat',state:'BA'});eq('new eligible opens coverage',f.eligibleBefore,false);eq('new eligible after',f.eligibleAfter,true);
f=baselineFact(null,{eligible:false,visibleVersionId:null,category:null,state:null});eq('new ineligible baseline false',f.eligibleAfter,false);
f=baselineFact({eligibleAfter:true,visibleVersionId:'v1',category:'cat',state:'BA'},{eligible:true,visibleVersionId:'v1',category:'cat',state:'BA'});eq('stable eligible stays true',f.eligibleBefore,true);
let stateDrift=false;try{baselineFact({eligibleAfter:false},{eligible:true,visibleVersionId:'v1',category:'cat',state:'BA'});}catch(e){stateDrift=e.message==='CAT_A07_STATE_DRIFT';}check('eligibility drift aborts',stateDrift);
let dimensionDrift=false;try{baselineFact({eligibleAfter:true,visibleVersionId:'v1',category:'cat',state:'BA'},{eligible:true,visibleVersionId:'v2',category:'cat',state:'SP'});}catch(e){dimensionDrift=e.message==='CAT_A07_VISIBLE_SNAPSHOT_DRIFT';}check('visible snapshot drift aborts',dimensionDrift);
function coverage(windowStart,completeFrom){return Date.parse(windowStart)<Date.parse(completeFrom)?'partial':'potentially_complete';}
eq('pre epoch partial',coverage('2026-01-01T00:00:00Z','2026-01-02T00:00:00Z'),'partial');
eq('post epoch can complete',coverage('2026-01-02T00:00:00Z','2026-01-02T00:00:00Z'),'potentially_complete');
check('no historical inference',c.strategy.historicalInferenceAllowed===false);
const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;
