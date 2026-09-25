'use strict';

const CONTRACT_ID='ana-a08-retention-cohort-projection-v1';
const METRICS=Object.freeze({
  'retention.repeat_request_30d':Object.freeze({repeatEventType:'order.requested',windowDays:30}),
  'retention.repeat_completion_90d':Object.freeze({repeatEventType:'order.completed',windowDays:90})
});

function iso(value,code){const n=Date.parse(value||'');if(!Number.isFinite(n))throw new Error(code);return new Date(n).toISOString();}
function ms(value,code){const n=Date.parse(value||'');if(!Number.isFinite(n))throw new Error(code);return n;}
function rate(n,d){return d<=0?null:Number((n/d).toFixed(6));}
function text(value){return String(value||'').trim();}
function eventAt(row){return row.occurredAt||row.occurred_at;}
function eventType(row){return text(row.eventType||row.event_type);}
function orderId(row){return text(row.orderId||row.order_id);}
function clientId(row){return text(row.clientId||row.client_id);}
function dimensions(row){return row&&row.dimensions&&typeof row.dimensions==='object'&&!Array.isArray(row.dimensions)?row.dimensions:{};}
function compareEvents(a,b){
  const t=ms(eventAt(a),'ANA_RETENTION_EVENT_TIME_INVALID')-ms(eventAt(b),'ANA_RETENTION_EVENT_TIME_INVALID');if(t)return t;
  const o=orderId(a).localeCompare(orderId(b));if(o)return o;
  return eventType(a).localeCompare(eventType(b));
}

function normalizeSegment(segment){
  const s=segment||{};
  return Object.freeze({
    serviceCategory:text(s.serviceCategory||s.service_category)||null,
    serviceState:(text(s.serviceState||s.service_state)||'').toUpperCase()||null
  });
}
function baselineDimensions(row){
  const d=dimensions(row);
  return Object.freeze({
    serviceCategory:text(d.serviceCategory)||null,
    serviceState:(text(d.serviceState)||'').toUpperCase()||null
  });
}
function segmentMatches(base,segment){
  if(segment.serviceCategory&&base.serviceCategory!==segment.serviceCategory)return false;
  if(segment.serviceState&&base.serviceState!==segment.serviceState)return false;
  return true;
}

function projectRetentionMetric(events,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('ANA_RETENTION_INPUT_INVALID');
  const metricKey=text(input.metricKey);
  const spec=METRICS[metricKey];
  if(!spec)throw new Error('ANA_RETENTION_METRIC_INVALID');
  const dataThrough=iso(input.dataThrough,'ANA_RETENTION_DATATHROUGH_INVALID');
  const through=ms(dataThrough,'ANA_RETENTION_DATATHROUGH_INVALID');
  const segment=normalizeSegment(input.segment);
  const grouped=new Map();
  let excludedMissingClient=0;
  for(const row of events||[]){
    if(!row||typeof row!=='object'||Array.isArray(row))continue;
    const at=ms(eventAt(row),'ANA_RETENTION_EVENT_TIME_INVALID');
    if(at>through)continue;
    const cid=clientId(row);
    if(!cid){excludedMissingClient++;continue;}
    const list=grouped.get(cid)||[];list.push(row);grouped.set(cid,list);
  }

  let denominator=0,numerator=0,excludedImmature=0,excludedMissingDimensions=0,excludedNoCompletion=0;
  let cohortMissingDimensions=0;
  const windowMs=spec.windowDays*86400000;

  for(const list of grouped.values()){
    list.sort(compareEvents);
    const firstCompletion=list.find((e)=>eventType(e)==='order.completed');
    if(!firstCompletion){excludedNoCompletion++;continue;}
    const firstAt=ms(eventAt(firstCompletion),'ANA_RETENTION_EVENT_TIME_INVALID');
    if(firstAt+windowMs>through){excludedImmature++;continue;}
    const base=baselineDimensions(firstCompletion);
    if(!base.serviceCategory||!base.serviceState)cohortMissingDimensions++;
    if((segment.serviceCategory&&!base.serviceCategory)||(segment.serviceState&&!base.serviceState)){
      excludedMissingDimensions++;continue;
    }
    if(!segmentMatches(base,segment))continue;

    denominator++;
    const firstOrder=orderId(firstCompletion);
    const windowEnd=firstAt+windowMs;
    const repeated=list.some((e)=>{
      const at=ms(eventAt(e),'ANA_RETENTION_EVENT_TIME_INVALID');
      return eventType(e)===spec.repeatEventType
        && orderId(e)!==firstOrder
        && at>firstAt
        && at<=windowEnd;
    });
    if(repeated)numerator++;
  }

  return Object.freeze({
    contractId:CONTRACT_ID,
    metricKey,
    windowDays:spec.windowDays,
    repeatEventType:spec.repeatEventType,
    dataThrough,
    segment,
    numerator,
    denominator,
    value:rate(numerator,denominator),
    coverageState:cohortMissingDimensions>0?'partial':'complete',
    excluded:Object.freeze({
      missingClientId:excludedMissingClient,
      noCompletion:excludedNoCompletion,
      immatureCohort:excludedImmature,
      missingRequestedSegmentDimensions:excludedMissingDimensions,
      cohortMissingDimensions
    }),
    identityScope:'canonical_authenticated_client_id_only',
    cohortAnchor:'first_order_completed',
    segmentationAnchor:'first_completion_immutable_service_dimensions',
    crossSegmentRepeatCounts:true,
    rehireInferred:false,
    runtimeAuthority:false
  });
}

function projectRetentionSet(events,input){
  const i=input||{};
  return Object.freeze([
    projectRetentionMetric(events,{...i,metricKey:'retention.repeat_request_30d'}),
    projectRetentionMetric(events,{...i,metricKey:'retention.repeat_completion_90d'})
  ]);
}

module.exports=Object.freeze({CONTRACT_ID,METRICS,projectRetentionMetric,projectRetentionSet});
