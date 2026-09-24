'use strict';

const CONTRACT_ID='ana-a09-canonical-funnel-projection-v1';
const STAGES=Object.freeze(['impression','click','detail','budget_cta','quote_started','quote_completed','quote_submitted','order_requested']);

function text(v){return String(v||'').trim();}
function ms(v,code){const n=Date.parse(v||'');if(!Number.isFinite(n))throw new Error(code);return n;}
function iso(v,code){return new Date(ms(v,code)).toISOString();}
function rate(n,d){return d<=0?null:Number((n/d).toFixed(6));}
function name(r){return text(r.eventName||r.event_name||r.eventType||r.event_type);}
function ses(r){return text(r.analyticsSessionId||r.analytics_session_id);}
function svc(r){return text(r.serviceId||r.service_id);}
function search(r){return text(r.searchRequestId||r.search_request_id);}
function quote(r){return text(r.quoteSessionId||r.quote_session_id);}
function order(r){return text(r.orderId||r.order_id);}
function occurred(r){return r.occurredAt||r.occurred_at;}
function materialized(r,kind){return kind==='order'?(r.createdAt||r.created_at||occurred(r)):(r.receivedAt||r.received_at||occurred(r));}

function behaviorProjection(rows,through){
  const eligible=[];let futureEvent=0,futureMaterialization=0,missingJourney=0;
  for(const row of rows||[]){
    if(!row||typeof row!=='object'||Array.isArray(row))continue;
    const e=ms(occurred(row),'ANA_FUNNEL_EVENT_TIME_INVALID');
    const m=ms(materialized(row,'behavior'),'ANA_FUNNEL_MATERIALIZATION_TIME_INVALID');
    if(e>through){futureEvent++;continue;}
    if(m>through){futureMaterialization++;continue;}
    eligible.push({...row,__at:e});
  }
  eligible.sort((a,b)=>a.__at-b.__at);

  const exposures=new Map(),clicks=new Map(),journeys=new Map();
  function journey(row){
    const a=ses(row),b=svc(row);
    if(!a||!b){missingJourney++;return null;}
    const k=a+'\u0000'+b;
    let j=journeys.get(k);
    if(!j){j={key:k,impressionAt:null,clickAt:null,detailAt:null,budgetAt:null,quotes:new Map()};journeys.set(k,j);}
    return j;
  }

  for(const row of eligible){
    const n=name(row),sid=search(row),service=svc(row);
    if(sid&&service&&(n==='search.result_impression'||n==='search.result_clicked')){
      const k=sid+'\u0000'+service;
      const target=n==='search.result_impression'?exposures:clicks;
      if(!target.has(k)||row.__at<target.get(k))target.set(k,row.__at);
    }
    if(!['search.result_impression','search.result_clicked','service.detail_viewed','service.budget_cta_clicked','quote.started','quote.completed','quote.submitted'].includes(n))continue;
    const j=journey(row);if(!j)continue;
    if(n==='search.result_impression'&&sid&&j.impressionAt===null)j.impressionAt=row.__at;
    if(n==='search.result_clicked'&&sid&&j.impressionAt!==null&&row.__at>=j.impressionAt&&j.clickAt===null)j.clickAt=row.__at;
    if(n==='service.detail_viewed'&&j.clickAt!==null&&row.__at>=j.clickAt&&j.detailAt===null)j.detailAt=row.__at;
    if(n==='service.budget_cta_clicked'&&j.detailAt!==null&&row.__at>=j.detailAt&&j.budgetAt===null)j.budgetAt=row.__at;
    if(n.startsWith('quote.')){
      const qid=quote(row);if(!qid)return;
      const q=j.quotes.get(qid)||{startedAt:null,completedAt:null,submittedAt:null,orderId:null};
      if(n==='quote.started'&&j.budgetAt!==null&&row.__at>=j.budgetAt&&q.startedAt===null)q.startedAt=row.__at;
      if(n==='quote.completed'&&q.startedAt!==null&&row.__at>=q.startedAt&&q.completedAt===null)q.completedAt=row.__at;
      if(n==='quote.submitted'&&q.completedAt!==null&&row.__at>=q.completedAt&&order(row)&&q.submittedAt===null){q.submittedAt=row.__at;q.orderId=order(row);}
      j.quotes.set(qid,q);
    }
  }

  let validClicks=0,orphanClicks=0;
  for(const [k,t] of clicks){const i=exposures.get(k);if(i!==undefined&&t>=i)validClicks++;else orphanClicks++;}
  const counts={impression:0,click:0,detail:0,budget_cta:0,quote_started:0,quote_completed:0,quote_submitted:0};
  const submissions=[];
  for(const j of journeys.values()){
    if(j.impressionAt!==null)counts.impression++;
    if(j.clickAt!==null)counts.click++;
    if(j.detailAt!==null)counts.detail++;
    if(j.budgetAt!==null)counts.budget_cta++;
    let started=false,completed=false,submitted=false;
    for(const q of j.quotes.values()){
      if(q.startedAt!==null)started=true;
      if(q.completedAt!==null)completed=true;
      if(q.submittedAt!==null&&q.orderId){submitted=true;submissions.push({journeyKey:j.key,orderId:q.orderId,submittedAt:q.submittedAt});}
    }
    if(started)counts.quote_started++;
    if(completed)counts.quote_completed++;
    if(submitted)counts.quote_submitted++;
  }
  return {counts,submissions,searchCtr:{numerator:validClicks,denominator:exposures.size,value:rate(validClicks,exposures.size),orphanClicks},excluded:{futureEvent,futureMaterialization,missingJourney}};
}

function projectCanonicalFunnel(behaviorEvents,orderEvents,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('ANA_FUNNEL_INPUT_INVALID');
  const base=ms(input.dataThrough,'ANA_FUNNEL_DATATHROUGH_INVALID');
  const behaviorThrough=ms(input.behaviorDataThrough||input.dataThrough,'ANA_FUNNEL_BEHAVIOR_DATATHROUGH_INVALID');
  const orderThrough=ms(input.orderDataThrough||input.dataThrough,'ANA_FUNNEL_ORDER_DATATHROUGH_INVALID');
  const cross=Math.min(base,behaviorThrough,orderThrough);
  const behavior=behaviorProjection(behaviorEvents,behaviorThrough);
  const crossBehavior=behaviorProjection(behaviorEvents,cross);

  const requested=new Map();
  let futureOrder=0,futureOrderMaterialization=0;
  for(const row of orderEvents||[]){
    if(!row||typeof row!=='object'||Array.isArray(row))continue;
    const e=ms(occurred(row),'ANA_FUNNEL_ORDER_TIME_INVALID');
    const m=ms(materialized(row,'order'),'ANA_FUNNEL_ORDER_MATERIALIZATION_TIME_INVALID');
    if(e>cross){futureOrder++;continue;}
    if(m>cross){futureOrderMaterialization++;continue;}
    if(name(row)==='order.requested'&&order(row)){
      const id=order(row);if(!requested.has(id)||e<requested.get(id))requested.set(id,e);
    }
  }

  const finalJourneys=new Set();
  for(const s of crossBehavior.submissions){const t=requested.get(s.orderId);if(t!==undefined&&t>=s.submittedAt)finalJourneys.add(s.journeyKey);}
  const counts={...behavior.counts,order_requested:finalJourneys.size};
  const transitions={};
  for(let i=1;i<STAGES.length;i++){
    const from=STAGES[i-1],to=STAGES[i];
    const denominator=from==='quote_submitted'?crossBehavior.counts.quote_submitted:counts[from];
    const numerator=to==='order_requested'?finalJourneys.size:counts[to];
    transitions[from+'_to_'+to]=Object.freeze({numerator,denominator,value:rate(numerator,denominator)});
  }

  return Object.freeze({
    contractId:CONTRACT_ID,
    dataThrough:iso(base,'ANA_FUNNEL_DATATHROUGH_INVALID'),
    behaviorDataThrough:new Date(behaviorThrough).toISOString(),
    crossDomainDataThrough:new Date(cross).toISOString(),
    searchCtr:Object.freeze(behavior.searchCtr),
    strictSessionServiceFunnel:Object.freeze({counts:Object.freeze(counts),transitions:Object.freeze(transitions)}),
    excluded:Object.freeze({
      futureBehaviorEvents:behavior.excluded.futureEvent,
      futureBehaviorMaterializations:behavior.excluded.futureMaterialization,
      futureOrderEvents:futureOrder,
      futureOrderMaterializations:futureOrderMaterialization,
      missingSessionOrServiceKey:behavior.excluded.missingJourney
    }),
    linkage:Object.freeze({
      search:'search_request_id + service_id',
      behavioralJourney:'analytics_session_id + service_id',
      quote:'same quote_session_id',
      transactionalHandoff:'quote.submitted.order_id -> canonical ORD order.requested'
    }),
    anonymousIdentityStitching:false,
    temporalHeuristicJoin:false,
    runtimeAuthority:false
  });
}

module.exports=Object.freeze({CONTRACT_ID,STAGES,projectCanonicalFunnel});
