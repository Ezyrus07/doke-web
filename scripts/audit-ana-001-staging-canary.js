'use strict';

const fs=require('fs');
const path=require('path');
const runner=require('./run-ana-001-staging-canary');
const root=path.resolve(__dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'config','ana-001-staging-canary-readiness.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'scripts','run-ana-001-staging-canary.js'),'utf8');
const browserConfig=fs.readFileSync(path.join(root,'assets','js','core','supabase-config.js'),'utf8');
const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});

check('contract id',config.contractId==='ana-001-staging-canary-v1');
check('staging only',config.scope==='staging_only');
check('production forbidden',config.productionAllowed===false);
check('generic continuation rejected',config.requiredAuthorization.genericContinuationAccepted===false);
check('browser client disabled requirement',config.browserClientMustRemainDisabledDuringDirectCanary===true);
check('browser config disabled',browserConfig.includes('analyticsEnabled: false'));
check('15 cases',config.cases.length===15);
['same_client_event_payload_drift_rejected','tampered_exposure_proof_rejected','owner_detail_traffic_excluded','metric_snapshot_append_then_no_change'].forEach(x=>check('case '+x,config.cases.includes(x)));
check('runner requires exact confirmation',source.includes('config.requiredAuthorization.environmentVariable')&&source.includes('config.requiredAuthorization.exactPhrase'));
check('runner blocks production-like host',source.includes('production_target_forbidden'));
check('runner requires synthetic identity',source.includes('synthetic_client_identity_required')&&source.includes('synthetic_professional_identity_required'));
check('runner never prints passwords',!source.includes('console.log(env.clientPassword)')&&!source.includes('console.log(env.professionalPassword)'));
check('runner no payment mutation',!source.includes('payment.held')&&!source.includes('payment.released'));
check('runner checks client disabled',source.includes("analyticsEnabled: false"));
check('dry plan has zero network',runner.buildPlan({}).capabilities.networkRequestsPerformed===0);

const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:config.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedChecks:failed},null,2));
if(failed.length)process.exitCode=1;
