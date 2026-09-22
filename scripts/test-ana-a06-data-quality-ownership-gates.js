'use strict';

const gate=require('../backend/modules/analytics/data-quality-gate');
const c=require('../config/ana-a06-data-quality-ownership-gates.json');
const checks=[];
const check=(name,value)=>checks.push({name,passed:Boolean(value)});
const eq=(name,a,b)=>check(name,a===b);
const policies=c.policies;

const healthy=[
  {metricKey:'analytics_projection_missing_rate',sampleCount:25,value:0,healthState:'healthy'},
  {metricKey:'analytics_reconciliation_mismatch_rate',sampleCount:25,value:0,healthState:'healthy'}
];
const pass=gate.evaluatePromotionGate(healthy,policies);
eq('healthy pass',pass.state,'pass');
check('no mutation authority',pass.runtimeMutationAllowed===false&&pass.sourceMutationAllowed===false);
check('no alert authority',pass.alertDeliveryAuthorized===false);

const blocked=gate.evaluatePromotionGate([
  healthy[0],
  {metricKey:'analytics_reconciliation_mismatch_rate',sampleCount:25,value:0.04,healthState:'warning'}
],policies);
eq('nonzero structural defect blocks',blocked.state,'block');

const missing=gate.evaluatePromotionGate([healthy[0]],policies);
eq('missing required metric holds',missing.state,'hold');
check('missing reason',missing.metrics.some((m)=>m.reason==='missing_required_rollup'));

const noData=gate.evaluatePromotionGate([
  {metricKey:'analytics_projection_missing_rate',sampleCount:0,value:null,healthState:'no_data'},
  healthy[1]
],policies);
eq('no data holds',noData.state,'hold');

const belowFloor=gate.evaluatePromotionGate([
  {metricKey:'analytics_projection_missing_rate',sampleCount:0,value:0,healthState:'healthy'},
  healthy[1]
],policies);
eq('below sample floor holds',belowFloor.state,'hold');

let duplicate=false;
try{gate.evaluatePromotionGate([healthy[0],healthy[0],healthy[1]],policies);}catch(e){duplicate=e.message==='ANA_DQ_ROLLUP_DUPLICATE_METRIC';}
check('duplicate fails closed',duplicate);

let unknown=false;
try{gate.evaluatePromotionGate([...healthy,{metricKey:'analytics_processing_lag_seconds',sampleCount:1,value:0}],policies);}catch(e){unknown=e.message==='ANA_DQ_ROLLUP_UNKNOWN_METRIC';}
check('unknown metric fails closed',unknown);

let invalid=false;
try{gate.evaluatePromotionGate([
  {metricKey:'analytics_projection_missing_rate',sampleCount:2,value:1.1,healthState:'warning'},
  healthy[1]
],policies);}catch(e){invalid=e.message==='ANA_DQ_ROLLUP_VALUE_INVALID';}
check('out of range fails closed',invalid);

const failed=checks.filter((x)=>!x.passed).map((x)=>x.name);
console.log(JSON.stringify({contractId:gate.CONTRACT_ID,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;
