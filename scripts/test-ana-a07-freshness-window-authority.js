'use strict';
const f=require('../backend/modules/analytics/freshness-window-authority');
const w=require('../backend/modules/analytics/dependency-watermark-authority');
const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});const eq=(n,a,b)=>check(n,a===b);
const now='2026-01-03T00:05:00Z';
const base={id:'s2',metricKey:'marketplace.resolved_quote_fill_rate',metricVersion:'v1',windowStart:'2026-01-02T00:00:00Z',windowEnd:'2026-01-03T00:00:00Z',dataThrough:'2026-01-03T00:00:00Z',computedAt:'2026-01-03T00:01:00Z',revision:2,dimensions:{serviceState:'BA'},projectionState:'authoritative',sampleCount:0};
const older={...base,id:'s1',windowStart:'2026-01-01T00:00:00Z',windowEnd:'2026-01-02T00:00:00Z',dataThrough:'2026-01-02T00:00:00Z',computedAt:'2026-01-02T00:01:00Z',revision:1};
const deps=[{sourceDomain:'ORD-001',dataThrough:'2026-01-03T00:00:00Z',freshnessState:'fresh'}];
eq('latest closed selected',f.selectCanonicalWindow([older,base],now).selected.id,'s2');
const reordered={...older,id:'s1b',dimensions:{serviceState:'BA'}};eq('stable dimensions canonicalized',f.selectCanonicalWindow([older,reordered,base],now).selected.id,'s2');
eq('no threshold unavailable',f.evaluateLatestWindow([older,base],null,deps,now).freshnessState,'unavailable');
const fresh=f.evaluateLatestWindow([older,base],{maxLagSeconds:600},deps,now);eq('fresh state',fresh.freshnessState,'fresh');eq('fresh projection mapping',fresh.projectionState,'authoritative');
eq('zero sample does not stale',fresh.freshnessState,'fresh');
eq('lag stale',f.evaluateLatestWindow([older,base],{maxLagSeconds:60},deps,now).freshnessState,'stale');
const partial={...base,dataThrough:'2026-01-02T23:59:00Z'};eq('partial coverage stale',f.evaluateFreshness(partial,{maxLagSeconds:600},deps,now).reason,'WINDOW_PARTIALLY_COVERED');
const unavailableDep=[{sourceDomain:'ORD-001',freshnessState:'unavailable',dataThrough:null}];eq('dependency unavailable',f.evaluateLatestWindow([base],{maxLagSeconds:600},unavailableDep,now).freshnessState,'unavailable');
const missingState=[{sourceDomain:'ORD-001',dataThrough:'2026-01-03T00:00:00Z'}];eq('missing dependency state unavailable',f.evaluateLatestWindow([base],{maxLagSeconds:600},missingState,now).reason,'DEPENDENCY_STATE_MISSING');
const staleDep=[{sourceDomain:'ORD-001',freshnessState:'stale',dataThrough:'2026-01-03T00:00:00Z'}];eq('dependency stale propagates',f.evaluateLatestWindow([base],{maxLagSeconds:600},staleDep,now).freshnessState,'stale');
const newerBad={...base,id:'s3',windowStart:'2026-01-03T00:00:00Z',windowEnd:'2026-01-04T00:00:00Z',dataThrough:'2026-01-03T00:00:00Z',computedAt:'2026-01-03T00:02:00Z',revision:1};eq('future window excluded',f.selectCanonicalWindow([older,base,newerBad],now).selected.id,'s2');
let overclaim=false;try{f.evaluateFreshness({...base,dataThrough:'2026-01-03T00:00:00Z'},{maxLagSeconds:600},[{sourceDomain:'ORD-001',dataThrough:'2026-01-02T23:58:00Z',freshnessState:'fresh'}],now);}catch(e){overclaim=false;}const over=f.evaluateFreshness({...base,dataThrough:'2026-01-03T00:00:00Z'},{maxLagSeconds:600},[{sourceDomain:'ORD-001',dataThrough:'2026-01-02T23:58:00Z',freshnessState:'fresh'}],now);eq('dependency overclaim unavailable',over.reason,'DATATHROUGH_EXCEEDS_DEPENDENCY_WATERMARK');
let mixed=false;try{f.selectCanonicalWindow([base,{...older,metricKey:'other.metric'}],now);}catch(e){mixed=e.message==='ANA_FRESHNESS_SERIES_MIXED';}check('mixed series fail closed',mixed);
let future=false;try{f.dependencyWatermark([{sourceDomain:'ORD-001',dataThrough:'2026-01-03T00:06:00Z',freshnessState:'fresh'}],base.windowEnd,now);}catch(e){future=e.message==='ANA_FRESHNESS_DEPENDENCY_FUTURE_WATERMARK';}check('future watermark fail closed',future);

const floorOpen=w.deriveTransactionFloor({observedAt:'2026-01-03T00:05:00Z',activeTransactionStarts:[],preparedTransactionCount:0});
eq('transaction floor advances with empty source',floorOpen.dataThrough,'2026-01-03T00:05:00.000Z');
const floorBusy=w.deriveTransactionFloor({observedAt:'2026-01-03T00:05:00Z',activeTransactionStarts:['2026-01-03T00:04:30Z','2026-01-03T00:04:50Z'],preparedTransactionCount:0});
eq('transaction floor uses earliest active predecessor',floorBusy.dataThrough,'2026-01-03T00:04:29.999Z');
const floorPrepared=w.deriveTransactionFloor({observedAt:'2026-01-03T00:05:00Z',activeTransactionStarts:[],preparedTransactionCount:1});
eq('prepared transaction fails closed',floorPrepared.state,'unavailable');
const funnelThrough=w.effectiveDataThrough('2026-01-03T00:05:00Z',[
  {sourceDomain:'ANA-001',freshnessState:'fresh',dataThrough:'2026-01-03T00:04:58Z'},
  {sourceDomain:'ORD-001',freshnessState:'fresh',dataThrough:'2026-01-03T00:04:55Z'}
]);
eq('cross-domain dataThrough uses dependency minimum',funnelThrough.dataThrough,'2026-01-03T00:04:55.000Z');
check('late materialized old event excluded',w.rowEligible('2026-01-03T00:05:01Z','2026-01-03T00:04:00Z','2026-01-03T00:05:00Z')===false);
check('materialized in-bound event included',w.rowEligible('2026-01-03T00:04:59Z','2026-01-03T00:04:00Z','2026-01-03T00:05:00Z')===true);
let futureXact=false;try{w.deriveTransactionFloor({observedAt:'2026-01-03T00:05:00Z',activeTransactionStarts:['2026-01-03T00:05:01Z'],preparedTransactionCount:0});}catch(e){futureXact=e.message==='ANA_WATERMARK_XACT_START_FUTURE';}check('future active transaction rejected',futureXact);
const failed=checks.filter((x)=>!x.passed).map((x)=>x.name);
console.log(JSON.stringify({contractId:f.CONTRACT_ID,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;
