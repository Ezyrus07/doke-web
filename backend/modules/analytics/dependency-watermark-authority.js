'use strict';

const CONTRACT_ID='ana-a07-behavior-ord-watermark-authority-v1';
const BASIS='active_transaction_floor_v1';
const DEPENDENCIES=Object.freeze({
  behavior:Object.freeze({
    sourceDomain:'ANA-001',
    sourceRelation:'private.analytics_behavior_events_v1',
    materializationTime:'received_at',
    eventTime:'occurred_at'
  }),
  order_metric:Object.freeze({
    sourceDomain:'ORD-001',
    sourceRelation:'private.order_metric_events',
    materializationTime:'created_at',
    eventTime:'occurred_at'
  })
});

function ms(value,code){const n=Date.parse(value||'');if(!Number.isFinite(n))throw new Error(code);return n;}
function iso(value){return new Date(value).toISOString();}
function count(value,code){const n=Number(value||0);if(!Number.isInteger(n)||n<0)throw new Error(code);return n;}

function deriveTransactionFloor(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('ANA_WATERMARK_INPUT_INVALID');
  const observed=ms(input.observedAt,'ANA_WATERMARK_OBSERVED_AT_INVALID');
  const prepared=count(input.preparedTransactionCount,'ANA_WATERMARK_PREPARED_COUNT_INVALID');
  if(prepared>0)return Object.freeze({state:'unavailable',freshnessState:'unavailable',reason:'PREPARED_TRANSACTION_PRESENT',basis:BASIS,dataThrough:null});
  const starts=Array.isArray(input.activeTransactionStarts)?input.activeTransactionStarts:[];
  let floor=observed;
  for(const raw of starts){
    const start=ms(raw,'ANA_WATERMARK_XACT_START_INVALID');
    if(start>observed)throw new Error('ANA_WATERMARK_XACT_START_FUTURE');
    // JavaScript Date has millisecond precision. The PostgreSQL runtime candidate
    // uses a one-microsecond predecessor; the conformance model is conservatively 1 ms.
    floor=Math.min(floor,start-1);
  }
  return Object.freeze({state:'available',freshnessState:'fresh',reason:starts.length?'ACTIVE_TRANSACTION_FLOOR':'NO_ACTIVE_TRANSACTION',basis:BASIS,dataThrough:iso(floor),runtimePredecessor:'1 microsecond',conformancePredecessor:'1 millisecond'});
}

function effectiveDataThrough(windowEnd,dependencies){
  const end=ms(windowEnd,'ANA_WATERMARK_WINDOW_END_INVALID');
  if(!Array.isArray(dependencies)||dependencies.length===0)return Object.freeze({state:'unavailable',reason:'DEPENDENCY_WATERMARK_MISSING',dataThrough:null});
  let through=end;
  const normalized=[];
  for(const dep of dependencies){
    if(!dep||dep.freshnessState!=='fresh'||dep.dataThrough==null)return Object.freeze({state:'unavailable',reason:'DEPENDENCY_WATERMARK_UNAVAILABLE',dataThrough:null});
    const dt=ms(dep.dataThrough,'ANA_WATERMARK_DEPENDENCY_TIME_INVALID');
    through=Math.min(through,dt);
    normalized.push(Object.freeze({sourceDomain:String(dep.sourceDomain||''),dataThrough:iso(dt)}));
  }
  return Object.freeze({state:'available',reason:'DEPENDENCY_FLOOR',dataThrough:iso(through),dependencies:Object.freeze(normalized)});
}

function rowEligible(materializedAt,eventAt,dataThrough){
  const m=ms(materializedAt,'ANA_WATERMARK_MATERIALIZED_AT_INVALID');
  const e=ms(eventAt,'ANA_WATERMARK_EVENT_AT_INVALID');
  const d=ms(dataThrough,'ANA_WATERMARK_DATATHROUGH_INVALID');
  return m<=d&&e<=d;
}

module.exports=Object.freeze({CONTRACT_ID,BASIS,DEPENDENCIES,deriveTransactionFloor,effectiveDataThrough,rowEligible});
