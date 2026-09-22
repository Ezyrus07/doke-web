'use strict';
const CONTRACT_ID='ana-a04-marketplace-funnel-health-projections-v1';
const A07=require('./freshness-window-authority');
const CAT_LIQUIDITY_CONTRACT_ID='ana-a10-cat-liquidity-projection-v1';
const CAT_LIQUIDITY_METRIC_KEY='liquidity.active_service_seconds';
function rate(n,d){n=Number(n||0);d=Number(d||0);return d<=0?null:Number((n/d).toFixed(6));}
function cmp(a,b){const ao=String(a.orderId||a.order_id||''),bo=String(b.orderId||b.order_id||'');if(ao!==bo)return ao.localeCompare(bo);const as=Number(a.sequenceNo||a.sequence_no||0),bs=Number(b.sequenceNo||b.sequence_no||0);if(as!==bs)return as-bs;return Date.parse(a.occurredAt||a.occurred_at||0)-Date.parse(b.occurredAt||b.occurred_at||0);}
function iso(v){const n=Date.parse(v||'');return Number.isFinite(n)?new Date(n).toISOString():null;}
function buildOrderSummaries(events){const map=new Map();[...(events||[])].sort(cmp).forEach((e)=>{const id=String(e.orderId||e.order_id||'');if(!id)return;const r=map.get(id)||{orderId:id,clientId:String(e.clientId||e.client_id||''),requestedAt:null,firstQuotedAt:null,finalEventType:null,finalOccurredAt:null,everDisputed:false,eventTypes:[]};const type=String(e.eventType||e.event_type||''),at=iso(e.occurredAt||e.occurred_at);r.eventTypes.push(type);if(type==='order.requested'&&!r.requestedAt)r.requestedAt=at;if(type==='order.quoted'&&!r.firstQuotedAt)r.firstQuotedAt=at;if(type==='order.disputed')r.everDisputed=true;r.finalEventType=type||r.finalEventType;r.finalOccurredAt=at||r.finalOccurredAt;map.set(id,r);});return Object.freeze([...map.values()].map(Object.freeze));}
function timeToFirstQuoteSeconds(r){return !r||!r.requestedAt||!r.firstQuotedAt?null:Math.max(0,Math.floor((Date.parse(r.firstQuotedAt)-Date.parse(r.requestedAt))/1000));}
function resolvedQuoteFillRate(rows){let q=0,c=0;(rows||[]).forEach((r)=>{if(r.firstQuotedAt)q++;else if(r.finalEventType==='order.cancelled')c++;});return Object.freeze({numerator:q,denominator:q+c,value:rate(q,q+c)});}
function resolvedFulfillmentRate(rows){let c=0,x=0;(rows||[]).forEach((r)=>{if(r.finalEventType==='order.completed')c++;if(r.finalEventType==='order.cancelled')x++;});return Object.freeze({numerator:c,denominator:c+x,value:rate(c,c+x)});}
function disputeIncidence(rows){const e=(rows||[]).filter((r)=>r.requestedAt),n=e.filter((r)=>r.everDisputed).length;return Object.freeze({numerator:n,denominator:e.length,value:rate(n,e.length)});}
function repeatCompletionRate(rows,days,dataThrough){days=Number(days);const through=Date.parse(dataThrough);if(!Number.isFinite(days)||days<=0||!Number.isFinite(through))throw new Error('ANA_RETENTION_WINDOW_INVALID');const map=new Map();(rows||[]).filter((r)=>r.clientId&&r.finalEventType==='order.completed'&&r.finalOccurredAt).forEach((r)=>{const a=map.get(r.clientId)||[];a.push(Date.parse(r.finalOccurredAt));map.set(r.clientId,a);});let d=0,n=0;const win=days*86400000;for(const times of map.values()){times.sort((a,b)=>a-b);const first=times[0];if(first>through-win)continue;d++;if(times.slice(1).some((t)=>t>first&&t<=first+win))n++;}return Object.freeze({numerator:n,denominator:d,value:rate(n,d),windowDays:days});}
function buildSupplyIntervals(events,dataThrough){const through=Date.parse(dataThrough);if(!Number.isFinite(through))throw new Error('ANA_SUPPLY_DATATHROUGH_INVALID');const map=new Map();[...(events||[])].sort((a,b)=>Date.parse(a.occurredAt||a.occurred_at)-Date.parse(b.occurredAt||b.occurred_at)).forEach((e)=>{const id=String(e.serviceId||e.service_id||'');if(!id)return;const a=map.get(id)||[];a.push(e);map.set(id,a);});const out=[];for(const [serviceId,list] of map){let from=null,dimensions=null;for(const e of list){const type=String(e.eventType||e.event_type||''),at=Date.parse(e.occurredAt||e.occurred_at);if(!Number.isFinite(at))continue;if((type==='listing_published'||type==='listing_restored')&&from==null){from=at;dimensions=e.dimensions||null;}else if(type==='version_approved'&&from!=null){out.push(Object.freeze({serviceId,activeFrom:new Date(from).toISOString(),activeUntil:new Date(at).toISOString(),dimensions}));from=at;dimensions=e.dimensions||dimensions;}else if((type==='listing_paused'||type==='listing_unpublished')&&from!=null){out.push(Object.freeze({serviceId,activeFrom:new Date(from).toISOString(),activeUntil:new Date(at).toISOString(),dimensions}));from=null;dimensions=null;}}if(from!=null&&from<through)out.push(Object.freeze({serviceId,activeFrom:new Date(from).toISOString(),activeUntil:new Date(through).toISOString(),dimensions}));}return Object.freeze(out);}
function activeServiceSeconds(intervals,start,end){start=Date.parse(start);end=Date.parse(end);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw new Error('ANA_SUPPLY_WINDOW_INVALID');return Math.floor((intervals||[]).reduce((sum,i)=>sum+Math.max(0,Math.min(end,Date.parse(i.activeUntil))-Math.max(start,Date.parse(i.activeFrom))),0)/1000);}
function financialMetricState(metricKey,paymentCanonical){return paymentCanonical?Object.freeze({metricKey,projectionState:'authoritative',value:null,reasonCode:'CALCULATION_REQUIRED',dependency:'PAY-001'}):Object.freeze({metricKey,projectionState:'unavailable',value:null,reasonCode:'PAYMENT_AUTHORITY_NOT_CANONICAL',dependency:'PAY-001'});}

function catValue(row,camel,snake){return row&&row[camel]!=null?row[camel]:row&&row[snake]!=null?row[snake]:null;}
function catText(value){return String(value==null?'':value).trim();}
function catTime(value,code){const n=Date.parse(value||'');if(!Number.isFinite(n))throw new Error(code);return n;}
function catIso(value,code){return new Date(catTime(value,code)).toISOString();}
function normalizeCatActivationState(state){
  if(!state||typeof state!=='object'||Array.isArray(state))throw new Error('ANA_LIQUIDITY_ACTIVATION_STATE_REQUIRED');
  const contractId=catText(catValue(state,'contractId','contract_id'));
  if(contractId&&contractId!=='cat-a06-listing-visibility-timeline-v1')throw new Error('ANA_LIQUIDITY_ACTIVATION_CONTRACT_INVALID');
  const activatedAt=catIso(catValue(state,'activatedAt','activated_at'),'ANA_LIQUIDITY_ACTIVATED_AT_INVALID');
  const coverageBeforeActivation=catText(catValue(state,'coverageBeforeActivation','coverage_before_activation'));
  if(coverageBeforeActivation!=='partial')throw new Error('ANA_LIQUIDITY_PREACTIVATION_COVERAGE_INVALID');
  const baselinePolicy=catText(catValue(state,'existingListingBaselinePolicy','existing_listing_baseline_policy'));
  if(!['not_performed_synthetic_only','explicitly_authorized'].includes(baselinePolicy))throw new Error('ANA_LIQUIDITY_BASELINE_POLICY_INVALID');
  return Object.freeze({contractId:'cat-a06-listing-visibility-timeline-v1',activatedAt,coverageBeforeActivation,baselinePolicy});
}
function normalizeCatLedgerEvent(row){
  if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('ANA_LIQUIDITY_EVENT_INVALID');
  const serviceId=catText(catValue(row,'serviceId','service_id'));
  const sequenceNo=Number(catValue(row,'sequenceNo','sequence_no'));
  const sourceTransitionKey=catText(catValue(row,'sourceTransitionKey','source_transition_key'));
  const eligibleBefore=catValue(row,'eligibleBefore','eligible_before');
  const eligibleAfter=catValue(row,'eligibleAfter','eligible_after');
  if(!serviceId)throw new Error('ANA_LIQUIDITY_SERVICE_ID_REQUIRED');
  if(!Number.isInteger(sequenceNo)||sequenceNo<1)throw new Error('ANA_LIQUIDITY_SEQUENCE_INVALID');
  if(!sourceTransitionKey)throw new Error('ANA_LIQUIDITY_TRANSITION_KEY_REQUIRED');
  if(typeof eligibleBefore!=='boolean'||typeof eligibleAfter!=='boolean')throw new Error('ANA_LIQUIDITY_ELIGIBILITY_INVALID');
  const occurredAt=catIso(catValue(row,'occurredAt','occurred_at'),'ANA_LIQUIDITY_EVENT_TIME_INVALID');
  const coverageKind=catText(catValue(row,'coverageKind','coverage_kind')||'observed_transition');
  if(!['observed_transition','activation_baseline'].includes(coverageKind))throw new Error('ANA_LIQUIDITY_COVERAGE_KIND_INVALID');
  return Object.freeze({serviceId,sequenceNo,sourceTransitionKey,eligibleBefore,eligibleAfter,occurredAt,coverageKind,
    visibleVersionIdBefore:catText(catValue(row,'visibleVersionIdBefore','visible_version_id_before'))||null,
    visibleVersionIdAfter:catText(catValue(row,'visibleVersionIdAfter','visible_version_id_after'))||null,
    dimensionSnapshotBefore:catValue(row,'dimensionSnapshotBefore','dimension_snapshot_before'),
    dimensionSnapshotAfter:catValue(row,'dimensionSnapshotAfter','dimension_snapshot_after')});
}
function normalizeSupplyDimensions(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('ANA_LIQUIDITY_DIMENSIONS_REQUIRED');
  const categoryId=catText(value.categoryId??value.category_id),categorySlug=catText(value.categorySlug??value.category_slug),category=catText(value.category),state=catText(value.state),city=catText(value.city);
  if(!categoryId&&!categorySlug&&!category)throw new Error('ANA_LIQUIDITY_CATEGORY_IDENTITY_REQUIRED');
  if(!state)throw new Error('ANA_LIQUIDITY_STATE_REQUIRED');
  return Object.freeze({categoryId:categoryId||null,categorySlug:categorySlug||null,category:category||null,state,city:city||null});
}
function buildCatSupplyIntervals(events,activationState,dataThrough){
  const activation=normalizeCatActivationState(activationState),through=catTime(dataThrough,'ANA_LIQUIDITY_DATATHROUGH_INVALID'),activated=catTime(activation.activatedAt,'ANA_LIQUIDITY_ACTIVATED_AT_INVALID');
  const keys=new Set(),groups=new Map();
  for(const raw of events||[]){
    const event=normalizeCatLedgerEvent(raw);
    if(keys.has(event.sourceTransitionKey))throw new Error('ANA_LIQUIDITY_TRANSITION_KEY_DUPLICATE');
    keys.add(event.sourceTransitionKey);
    const at=catTime(event.occurredAt,'ANA_LIQUIDITY_EVENT_TIME_INVALID');
    if(at>through)continue;
    if(at<activated)throw new Error('ANA_LIQUIDITY_EVENT_BEFORE_ACTIVATION');
    const rows=groups.get(event.serviceId)||[];rows.push(event);groups.set(event.serviceId,rows);
  }
  const intervals=[],issues=new Set();
  for(const [serviceId,rows] of groups){
    rows.sort((a,b)=>a.sequenceNo-b.sequenceNo);
    let expected=1,lastAt=activated,known=false,current=false,open=null;
    for(const event of rows){
      if(event.sequenceNo!==expected)throw new Error('ANA_LIQUIDITY_SEQUENCE_GAP');expected++;
      const at=catTime(event.occurredAt,'ANA_LIQUIDITY_EVENT_TIME_INVALID');
      if(at<lastAt)throw new Error('ANA_LIQUIDITY_EVENT_TIME_REGRESSION');lastAt=at;
      if(known&&event.eligibleBefore!==current)throw new Error('ANA_LIQUIDITY_LEDGER_STATE_MISMATCH');
      if(!known&&event.eligibleBefore)issues.add('LEFT_TRUNCATED_SERVICE_HISTORY');
      if(event.eligibleBefore&&event.eligibleAfter){
        if(open&&at>open.fromMs)intervals.push(Object.freeze({serviceId,activeFrom:new Date(open.fromMs).toISOString(),activeUntil:new Date(at).toISOString(),dimensions:open.dimensions,visibleVersionId:open.visibleVersionId,coverageKind:open.coverageKind}));
        if(!open)issues.add('LEFT_TRUNCATED_SERVICE_HISTORY');
        open={fromMs:at,dimensions:normalizeSupplyDimensions(event.dimensionSnapshotAfter),visibleVersionId:event.visibleVersionIdAfter,coverageKind:event.coverageKind};
      }else if(event.eligibleBefore&&!event.eligibleAfter){
        if(open&&at>open.fromMs)intervals.push(Object.freeze({serviceId,activeFrom:new Date(open.fromMs).toISOString(),activeUntil:new Date(at).toISOString(),dimensions:open.dimensions,visibleVersionId:open.visibleVersionId,coverageKind:open.coverageKind}));
        if(!open)issues.add('LEFT_TRUNCATED_SERVICE_HISTORY');open=null;
      }else if(!event.eligibleBefore&&event.eligibleAfter){
        if(open)throw new Error('ANA_LIQUIDITY_LEDGER_STATE_MISMATCH');
        open={fromMs:at,dimensions:normalizeSupplyDimensions(event.dimensionSnapshotAfter),visibleVersionId:event.visibleVersionIdAfter,coverageKind:event.coverageKind};
      }else if(open)throw new Error('ANA_LIQUIDITY_LEDGER_STATE_MISMATCH');
      known=true;current=event.eligibleAfter;
    }
    if(open&&open.fromMs<through)intervals.push(Object.freeze({serviceId,activeFrom:new Date(open.fromMs).toISOString(),activeUntil:new Date(through).toISOString(),dimensions:open.dimensions,visibleVersionId:open.visibleVersionId,coverageKind:open.coverageKind}));
  }
  intervals.sort((a,b)=>a.serviceId.localeCompare(b.serviceId)||Date.parse(a.activeFrom)-Date.parse(b.activeFrom)||Date.parse(a.activeUntil)-Date.parse(b.activeUntil));
  return Object.freeze({activation,intervals:Object.freeze(intervals),coverageIssues:Object.freeze([...issues].sort())});
}
function aggregateCatSupplyIntervals(intervals,windowStart,windowEnd){
  const start=catTime(windowStart,'ANA_LIQUIDITY_WINDOW_START_INVALID'),end=catTime(windowEnd,'ANA_LIQUIDITY_WINDOW_END_INVALID');
  if(end<=start)throw new Error('ANA_LIQUIDITY_WINDOW_INVALID');
  let totalMs=0;const segments=new Map();
  for(const interval of intervals||[]){
    const from=catTime(interval.activeFrom,'ANA_LIQUIDITY_INTERVAL_START_INVALID'),until=catTime(interval.activeUntil,'ANA_LIQUIDITY_INTERVAL_END_INVALID');
    if(until<from)throw new Error('ANA_LIQUIDITY_INTERVAL_INVALID');
    const overlap=Math.max(0,Math.min(end,until)-Math.max(start,from));if(!overlap)continue;
    const d=normalizeSupplyDimensions(interval.dimensions);totalMs+=overlap;
    const categoryKey=d.categoryId||d.categorySlug||d.category,key=categoryKey+'\u0000'+d.state;
    const row=segments.get(key)||{categoryId:d.categoryId,categorySlug:d.categorySlug,category:d.category,state:d.state,milliseconds:0};
    row.milliseconds+=overlap;segments.set(key,row);
  }
  const segmentRows=[...segments.values()].map((row)=>Object.freeze({categoryId:row.categoryId,categorySlug:row.categorySlug,category:row.category,state:row.state,observedLowerBoundSeconds:Math.floor(row.milliseconds/1000)})).sort((a,b)=>String(a.categoryId||a.categorySlug||a.category).localeCompare(String(b.categoryId||b.categorySlug||b.category))||a.state.localeCompare(b.state));
  return Object.freeze({observedLowerBoundSeconds:Math.floor(totalMs/1000),segments:Object.freeze(segmentRows)});
}
function projectCatLiquidity(events,activationState,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('ANA_LIQUIDITY_INPUT_INVALID');
  const activation=normalizeCatActivationState(activationState),windowStart=catIso(input.windowStart,'ANA_LIQUIDITY_WINDOW_START_INVALID'),windowEnd=catIso(input.windowEnd,'ANA_LIQUIDITY_WINDOW_END_INVALID'),evaluatedAt=catIso(input.evaluatedAt,'ANA_LIQUIDITY_EVALUATED_AT_INVALID');
  const startMs=catTime(windowStart,'x'),endMs=catTime(windowEnd,'x'),nowMs=catTime(evaluatedAt,'x');
  if(endMs<=startMs)throw new Error('ANA_LIQUIDITY_WINDOW_INVALID');
  if(endMs>nowMs)return Object.freeze({contractId:CAT_LIQUIDITY_CONTRACT_ID,metricKey:CAT_LIQUIDITY_METRIC_KEY,status:'unavailable',coverageState:'partial',reason:'WINDOW_NOT_CLOSED',windowStart,windowEnd,dataThrough:null,valueSeconds:null,observedLowerBoundSeconds:null,segments:Object.freeze([]),runtimeAuthority:false});
  const dep=input.catDependency,sourceDomain=catText(dep&&(dep.sourceDomain??dep.source_domain));
  if(sourceDomain!=='CAT-001')throw new Error('ANA_LIQUIDITY_CAT_DEPENDENCY_REQUIRED');
  const watermark=A07.dependencyWatermark([dep],windowEnd,evaluatedAt);
  if(watermark.freshnessState==='unavailable')return Object.freeze({contractId:CAT_LIQUIDITY_CONTRACT_ID,metricKey:CAT_LIQUIDITY_METRIC_KEY,status:'unavailable',coverageState:'partial',reason:watermark.reason,windowStart,windowEnd,dataThrough:null,valueSeconds:null,observedLowerBoundSeconds:null,segments:Object.freeze([]),runtimeAuthority:false});
  const dataThrough=watermark.dataThrough,throughMs=catTime(dataThrough,'ANA_LIQUIDITY_DATATHROUGH_INVALID');
  if(throughMs<=startMs)return Object.freeze({contractId:CAT_LIQUIDITY_CONTRACT_ID,metricKey:CAT_LIQUIDITY_METRIC_KEY,status:'unavailable',coverageState:'partial',reason:'WINDOW_COVERAGE_UNAVAILABLE',windowStart,windowEnd,dataThrough,valueSeconds:null,observedLowerBoundSeconds:null,segments:Object.freeze([]),runtimeAuthority:false});
  const built=buildCatSupplyIntervals(events,activation,dataThrough),effectiveEnd=new Date(Math.min(endMs,throughMs)).toISOString(),aggregate=aggregateCatSupplyIntervals(built.intervals,windowStart,effectiveEnd),reasons=new Set(built.coverageIssues);
  if(startMs<catTime(activation.activatedAt,'x'))reasons.add('PRE_ACTIVATION_HISTORY_PARTIAL');
  if(activation.baselinePolicy!=='explicitly_authorized')reasons.add('ACTIVATION_BASELINE_NOT_COMPLETE');
  if(throughMs<endMs)reasons.add('DEPENDENCY_WATERMARK_BEFORE_WINDOW_END');
  if(watermark.freshnessState==='stale')reasons.add('CAT_DEPENDENCY_STALE');
  const coverageReasons=[...reasons].sort(),complete=coverageReasons.length===0,segments=aggregate.segments.map((row)=>Object.freeze({...row,valueSeconds:complete?row.observedLowerBoundSeconds:null}));
  return Object.freeze({contractId:CAT_LIQUIDITY_CONTRACT_ID,metricKey:CAT_LIQUIDITY_METRIC_KEY,status:complete?'complete':'partial',coverageState:complete?'complete':'partial',coverageReasons:Object.freeze(coverageReasons),windowStart,windowEnd,dataThrough,valueSeconds:complete?aggregate.observedLowerBoundSeconds:null,observedLowerBoundSeconds:aggregate.observedLowerBoundSeconds,segments:Object.freeze(segments),intervals:built.intervals,dependency:Object.freeze({sourceDomain:'CAT-001',freshnessState:watermark.freshnessState,dataThrough}),runtimeAuthority:false});
}

module.exports=Object.freeze({CONTRACT_ID,CAT_LIQUIDITY_CONTRACT_ID,CAT_LIQUIDITY_METRIC_KEY,rate,buildOrderSummaries,timeToFirstQuoteSeconds,resolvedQuoteFillRate,resolvedFulfillmentRate,disputeIncidence,repeatCompletionRate,buildSupplyIntervals,activeServiceSeconds,financialMetricState,normalizeCatActivationState,normalizeCatLedgerEvent,normalizeSupplyDimensions,buildCatSupplyIntervals,aggregateCatSupplyIntervals,projectCatLiquidity});
