'use strict';

const CONTRACT_ID='ana-a09-canonical-funnel-projection-v1';
const STAGES=Object.freeze([
  'impression','click','detail','budget_cta','quote_started','quote_completed','quote_submitted','order_requested'
]);

function text(value){return String(value||'').trim();}
function ms(value,code){const n=Date.parse(value||'');if(!Number.isFinite(n))throw new Error(code);return n;}
function iso(value,code){return new Date(ms(value,code)).toISOString();}
function rate(n,d){return d<=0?null:Number((n/d).toFixed(6));}
function eventName(row){return text(row.eventName||row.event_name);}
function sessionId(row){return text(row.analyticsSessionId||row.analytics_session_id);}
function serviceId(row){return text(row.serviceId||row.service_id);}
function searchId(row){return text(row.searchRequestId||row.search_request_id);}
function quoteId(row){return text(row.quoteSessionId||row.quote_session_id);}
function orderId(row){return text(row.orderId||row.order_id);}
function occurredAt(row){return row.occurredAt||row.occurred_at;}

function projectCanonicalFunnel(behaviorEvents,orderEvents,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('ANA_FUNNEL_INPUT_INVALID');
  const dataThrough=iso(input.dataThrough,'ANA_FUNNEL_DATATHROUGH_INVALID');
  const through=ms(dataThrough,'ANA_FUNNEL_DATATHROUGH_INVALID');

  const behavior=[];
  let excludedFutureBehavior=0,excludedMissingJourneyKey=0;
  for(const row of behaviorEvents||[]){
    if(!row||typeof row!=='object'||Array.isArray(row))continue;
    const at=ms(occurredAt(row),'ANA_FUNNEL_EVENT_TIME_INVALID');
    if(at>through){excludedFutureBehavior++;continue;}
    behavior.push({...row,__at:at});
  }

  const requestedOrders=new Set();
  let excludedFutureOrder=0;
  for(const row of orderEvents||[]){
    if(!row||typeof row!=='object'||Array.isArray(row))continue;
    const at=ms(occurredAt(row),'ANA_FUNNEL_ORDER_TIME_INVALID');
    if(at>through){excludedFutureOrder++;continue;}
    if(eventName(row)==='order.requested'&&orderId(row))requestedOrders.add(orderId(row));
  }

  const exposureImpressions=new Set();
  const exposureClicks=new Set();
  for(const row of behavior){
    const name=eventName(row),sid=searchId(row),svc=serviceId(row);
    if(!sid||!svc)continue;
    const key=sid+'\u0000'+svc;
    if(name==='search.result_impression')exposureImpressions.add(key);
    if(name==='search.result_clicked')exposureClicks.add(key);
  }
  let validExposureClicks=0,orphanExposureClicks=0;
  for(const key of exposureClicks){
    if(exposureImpressions.has(key))validExposureClicks++;
    else orphanExposureClicks++;
  }

  const journeys=new Map();
  function journey(row){
    const ses=sessionId(row),svc=serviceId(row);
    if(!ses||!svc){excludedMissingJourneyKey++;return null;}
    const key=ses+'\u0000'+svc;
    let j=journeys.get(key);
    if(!j){
      j={key,sessionId:ses,serviceId:svc,impression:false,click:false,detail:false,budgetCta:false,quoteStarted:false,quoteCompleted:false,quoteSubmitted:false,orderRequested:false,quoteSessions:new Map()};
      journeys.set(key,j);
    }
    return j;
  }

  for(const row of behavior){
    const name=eventName(row);
    if(!['search.result_impression','search.result_clicked','service.detail_viewed','service.budget_cta_clicked','quote.started','quote.completed','quote.submitted'].includes(name))continue;
    const j=journey(row);if(!j)continue;
    if(name==='search.result_impression'&&searchId(row))j.impression=true;
    if(name==='search.result_clicked'&&searchId(row))j.click=true;
    if(name==='service.detail_viewed')j.detail=true;
    if(name==='service.budget_cta_clicked')j.budgetCta=true;
    if(name.startsWith('quote.')){
      const qid=quoteId(row);
      if(!qid)continue;
      const q=j.quoteSessions.get(qid)||{started:false,completed:false,submitted:false,orderId:null};
      if(name==='quote.started')q.started=true;
      if(name==='quote.completed')q.completed=true;
      if(name==='quote.submitted'){q.submitted=true;q.orderId=orderId(row)||q.orderId;}
      j.quoteSessions.set(qid,q);
    }
  }

  for(const j of journeys.values()){
    for(const q of j.quoteSessions.values()){
      if(q.started)j.quoteStarted=true;
      if(q.started&&q.completed)j.quoteCompleted=true;
      if(q.started&&q.completed&&q.submitted&&q.orderId){
        j.quoteSubmitted=true;
        if(requestedOrders.has(q.orderId))j.orderRequested=true;
      }
    }
  }

  const counts={impression:0,click:0,detail:0,budget_cta:0,quote_started:0,quote_completed:0,quote_submitted:0,order_requested:0};
  const orphans={click_without_impression:0,detail_without_click:0,budget_cta_without_detail:0,quote_started_without_budget_cta:0,quote_completed_without_started:0,quote_submitted_without_completed_or_order:0,order_request_missing_for_submitted:0};
  for(const j of journeys.values()){
    if(j.impression)counts.impression++; else if(j.click)orphans.click_without_impression++;
    if(j.impression&&j.click)counts.click++;
    else if(j.detail)orphans.detail_without_click++;
    if(j.impression&&j.click&&j.detail)counts.detail++;
    else if(j.budgetCta)orphans.budget_cta_without_detail++;
    if(j.impression&&j.click&&j.detail&&j.budgetCta)counts.budget_cta++;
    else if(j.quoteStarted)orphans.quote_started_without_budget_cta++;
    if(j.impression&&j.click&&j.detail&&j.budgetCta&&j.quoteStarted)counts.quote_started++;
    else if(j.quoteCompleted)orphans.quote_completed_without_started++;
    if(j.impression&&j.click&&j.detail&&j.budgetCta&&j.quoteStarted&&j.quoteCompleted)counts.quote_completed++;
    else if(j.quoteSubmitted)orphans.quote_submitted_without_completed_or_order++;
    if(j.impression&&j.click&&j.detail&&j.budgetCta&&j.quoteStarted&&j.quoteCompleted&&j.quoteSubmitted)counts.quote_submitted++;
    if(j.quoteSubmitted&&!j.orderRequested)orphans.order_request_missing_for_submitted++;
    if(j.impression&&j.click&&j.detail&&j.budgetCta&&j.quoteStarted&&j.quoteCompleted&&j.quoteSubmitted&&j.orderRequested)counts.order_requested++;
  }

  const transitions={};
  for(let i=1;i<STAGES.length;i++){
    const from=STAGES[i-1],to=STAGES[i];
    transitions[from+'_to_'+to]=Object.freeze({numerator:counts[to],denominator:counts[from],value:rate(counts[to],counts[from])});
  }

  return Object.freeze({
    contractId:CONTRACT_ID,
    dataThrough,
    searchCtr:Object.freeze({numerator:validExposureClicks,denominator:exposureImpressions.size,value:rate(validExposureClicks,exposureImpressions.size),orphanClicks:orphanExposureClicks}),
    strictSessionServiceFunnel:Object.freeze({counts:Object.freeze(counts),transitions:Object.freeze(transitions)}),
    excluded:Object.freeze({futureBehaviorEvents:excludedFutureBehavior,futureOrderEvents:excludedFutureOrder,missingSessionOrServiceKey:excludedMissingJourneyKey}),
    orphanStages:Object.freeze(orphans),
    linkage:Object.freeze({
      search:'search_request_id + service_id',
      behavioralJourney:'analytics_session_id + service_id',
      quote:'quote_session_id',
      transactionalHandoff:'quote.submitted.order_id -> canonical ORD order.requested'
    }),
    anonymousIdentityStitching:false,
    temporalHeuristicJoin:false,
    runtimeAuthority:false
  });
}

module.exports=Object.freeze({CONTRACT_ID,STAGES,projectCanonicalFunnel});
