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
check('contract leaves values unset',c.currentDecision.windowStepSeconds===null&&c.currentDecision.projectionDelaySloSeconds===null&&c.currentDecision.maxLagSeconds===null);
const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;
