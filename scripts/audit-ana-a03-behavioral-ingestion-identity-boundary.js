'use strict';
const fs=require('fs');const path=require('path');const a=require('../backend/modules/analytics/behavioral-ingestion-boundary');
const root=path.resolve(__dirname,'..');const c=JSON.parse(fs.readFileSync(path.join(root,'config','ana-a03-behavioral-ingestion-identity-boundary.json'),'utf8'));const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});
check('contract id',a.CONTRACT_ID===c.contractId);check('direct insert false',c.ingestion.browserDirectCanonicalInsert===false);check('anon stitch false',c.sessionPolicy.anonymousToAuthenticatedStitching===false);check('cross device false',c.sessionPolicy.crossDeviceStitching===false);
const edge=fs.readFileSync(path.join(root,'supabase/functions/search-public-services-v2/index.ts'),'utf8');check('search getUser pattern',edge.includes('getUser'));check('search rate limit pattern',edge.includes('enforceActorRateLimit'));check('search service role pattern',edge.includes('serviceRoleClient'));
const rpc=fs.readFileSync(path.join(root,'supabase/migrations/164_service_search_observation_recorder_v2.sql'),'utf8');check('service role recorder',rpc.includes('service_role'));check('observation recorder',rpc.includes('record_service_search'));
const cursor=fs.readFileSync(path.join(root,'supabase/migrations/162_service_search_ranked_rpc_v2.sql'),'utf8');check('HMAC precedent',cursor.includes('hmac')&&cursor.includes('signature'));
Object.entries(c.prohibitedEffects).forEach(([k,v])=>check('effect '+k,v===false));
const failed=checks.filter((x)=>!x.passed).map((x)=>x.name);console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedChecks:failed},null,2));if(failed.length)process.exitCode=1;
