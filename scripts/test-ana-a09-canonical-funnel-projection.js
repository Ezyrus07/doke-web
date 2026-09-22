'use strict';
const f=require('../backend/modules/analytics/canonical-funnel-projection');
const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});const eq=(n,a,b)=>check(n,a===b);
const s='00000000-0000-4000-8000-000000000001',svc='00000000-0000-4000-8000-000000000002',search='00000000-0000-4000-8000-000000000003',q='00000000-0000-4000-8000-000000000004',o='00000000-0000-4000-8000-000000000005';
const events=[
 {eventName:'search.result_impression',analyticsSessionId:s,serviceId:svc,searchRequestId:search,occurredAt:'2026-01-01T00:00:01Z'},
 {eventName:'search.result_clicked',analyticsSessionId:s,serviceId:svc,searchRequestId:search,occurredAt:'2026-01-01T00:00:02Z'},
 {eventName:'service.detail_viewed',analyticsSessionId:s,serviceId:svc,occurredAt:'2026-01-01T00:00:03Z'},
 {eventName:'service.budget_cta_clicked',analyticsSessionId:s,serviceId:svc,occurredAt:'2026-01-01T00:00:04Z'},
 {eventName:'quote.started',analyticsSessionId:s,serviceId:svc,quoteSessionId:q,occurredAt:'2026-01-01T00:00:05Z'},
 {eventName:'quote.completed',analyticsSessionId:s,serviceId:svc,quoteSessionId:q,occurredAt:'2026-01-01T00:00:06Z'},
 {eventName:'quote.submitted',analyticsSessionId:s,serviceId:svc,quoteSessionId:q,orderId:o,occurredAt:'2026-01-01T00:00:08Z'},
 {eventName:'search.result_clicked',analyticsSessionId:'orphan-session',serviceId:'orphan-service',searchRequestId:'orphan-search',occurredAt:'2026-01-01T00:00:02Z'},
 {eventName:'service.detail_viewed',analyticsSessionId:'future',serviceId:svc,occurredAt:'2027-01-01T00:00:00Z'}
];
const orders=[{eventName:'order.requested',orderId:o,occurredAt:'2026-01-01T00:00:07Z'}];
const out=f.projectCanonicalFunnel(events,orders,{dataThrough:'2026-01-02T00:00:00Z'});
eq('ctr numerator',out.searchCtr.numerator,1);eq('ctr denominator',out.searchCtr.denominator,1);eq('ctr value',out.searchCtr.value,1);eq('orphan ctr click',out.searchCtr.orphanClicks,1);
for(const stage of f.STAGES)eq('strict stage '+stage,out.strictSessionServiceFunnel.counts[stage],1);
eq('submitted to order',out.strictSessionServiceFunnel.transitions.quote_submitted_to_order_requested.value,1);
check('future behavior excluded',out.excluded.futureBehaviorEvents===1);
check('no stitching',out.anonymousIdentityStitching===false);
check('no temporal heuristic',out.temporalHeuristicJoin===false);
const noOrder=f.projectCanonicalFunnel(events,[],{dataThrough:'2026-01-02T00:00:00Z'});
eq('missing order stops final stage',noOrder.strictSessionServiceFunnel.counts.order_requested,0);
check('missing order recorded',noOrder.orphanStages.order_request_missing_for_submitted>=1);
const zero=f.projectCanonicalFunnel([],[],{dataThrough:'2026-01-02T00:00:00Z'});
eq('zero denominator null',zero.searchCtr.value,null);
let bad=false;try{f.projectCanonicalFunnel([],[],{dataThrough:'bad'});}catch(e){bad=e.message==='ANA_FUNNEL_DATATHROUGH_INVALID';}check('invalid datathrough rejected',bad);
const failed=checks.filter((x)=>!x.passed).map((x)=>x.name);
console.log(JSON.stringify({contractId:f.CONTRACT_ID,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;
