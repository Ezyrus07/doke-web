'use strict';

const EVENT_CLASSES=Object.freeze({BEHAVIOR:'behavior',DOMAIN_FACT:'domain_fact',OPERATIONAL_OBSERVABILITY:'operational_observability',DERIVED_PROJECTION:'derived_projection'});
const event=(eventClass,sourceOwner,projectionOwner,clientEmitAllowed,funnelStage,extra={})=>Object.freeze({eventClass,sourceOwner,projectionOwner,clientEmitAllowed,funnelStage,schemaVersion:1,...extra});
const EVENTS=Object.freeze({
'account.registered':event(EVENT_CLASSES.DOMAIN_FACT,'AUTH-001','ANA-001',false,'registration'),
'search.executed':event(EVENT_CLASSES.BEHAVIOR,'SEARCH-001','ANA-001',false,'search'),
'search.result_impression':event(EVENT_CLASSES.BEHAVIOR,'ANA-001','ANA-001',true,'impression',{exposureProofRequired:true}),
'search.result_clicked':event(EVENT_CLASSES.BEHAVIOR,'ANA-001','ANA-001',true,'click',{exposureProofRequired:true}),
'service.detail_viewed':event(EVENT_CLASSES.BEHAVIOR,'ANA-001','ANA-001',true,'detail'),
'service.budget_cta_clicked':event(EVENT_CLASSES.BEHAVIOR,'ANA-001','ANA-001',true,'cta'),
'service.message_cta_clicked':event(EVENT_CLASSES.BEHAVIOR,'ANA-001','ANA-001',true,'cta'),
'quote.started':event(EVENT_CLASSES.BEHAVIOR,'ANA-001','ANA-001',true,'quote'),
'quote.progressed':event(EVENT_CLASSES.BEHAVIOR,'ANA-001','ANA-001',true,'quote'),
'quote.completed':event(EVENT_CLASSES.BEHAVIOR,'ANA-001','ANA-001',true,'quote'),
'quote.submitted':event(EVENT_CLASSES.BEHAVIOR,'ANA-001','ANA-001',true,'quote_submit',{orderReferenceRequired:true}),
'order.requested':event(EVENT_CLASSES.DOMAIN_FACT,'ORD-001','ANA-001',false,'request'),
'order.accepted':event(EVENT_CLASSES.DOMAIN_FACT,'ORD-001','ANA-001',false,'order'),
'order.quoted':event(EVENT_CLASSES.DOMAIN_FACT,'ORD-001','ANA-001',false,'proposal'),
'order.scheduled':event(EVENT_CLASSES.DOMAIN_FACT,'ORD-001','ANA-001',false,'order'),
'order.started':event(EVENT_CLASSES.DOMAIN_FACT,'ORD-001','ANA-001',false,'service_started'),
'order.completed':event(EVENT_CLASSES.DOMAIN_FACT,'ORD-001','ANA-001',false,'completed'),
'order.cancelled':event(EVENT_CLASSES.DOMAIN_FACT,'ORD-001','ANA-001',false,'cancelled'),
'order.disputed':event(EVENT_CLASSES.DOMAIN_FACT,'ORD-001','ANA-001',false,'disputed'),
'payment_intent.created':event(EVENT_CLASSES.DOMAIN_FACT,'PAY-001','ANA-001',false,'payment',{availability:'unavailable_until_PAY_canonical'}),
'payment.authorized':event(EVENT_CLASSES.DOMAIN_FACT,'PAY-001','ANA-001',false,'payment',{availability:'unavailable_until_PAY_canonical'}),
'payment.requires_action':event(EVENT_CLASSES.DOMAIN_FACT,'PAY-001','ANA-001',false,'payment',{availability:'unavailable_until_PAY_canonical'}),
'payment.held':event(EVENT_CLASSES.DOMAIN_FACT,'PAY-001','ANA-001',false,'payment',{availability:'unavailable_until_PAY_canonical'}),
'payment.released':event(EVENT_CLASSES.DOMAIN_FACT,'PAY-001','ANA-001',false,'payment',{availability:'unavailable_until_PAY_canonical'}),
'payment.refunded':event(EVENT_CLASSES.DOMAIN_FACT,'PAY-001','ANA-001',false,'payment',{availability:'unavailable_until_PAY_canonical'}),
'payment.failed':event(EVENT_CLASSES.DOMAIN_FACT,'PAY-001','ANA-001',false,'payment',{availability:'unavailable_until_PAY_canonical'}),
'payment.cancelled':event(EVENT_CLASSES.DOMAIN_FACT,'PAY-001','ANA-001',false,'payment',{availability:'unavailable_until_PAY_canonical'}),
'dispute.opened':event(EVENT_CLASSES.DOMAIN_FACT,'PAY-001','ANA-001',false,'payment',{availability:'unavailable_until_PAY_canonical'}),
'dispute.resolved':event(EVENT_CLASSES.DOMAIN_FACT,'PAY-001','ANA-001',false,'payment',{availability:'unavailable_until_PAY_canonical'}),
'repeat.order_completed':event(EVENT_CLASSES.DERIVED_PROJECTION,'ANA-001','ANA-001',false,'repeat'),
'repeat.paid_transaction':event(EVENT_CLASSES.DERIVED_PROJECTION,'ANA-001','ANA-001',false,'repeat',{availability:'unavailable_until_PAY_canonical'})
});
const LEGACY_ALIASES=Object.freeze({'service_metric_events.view':'service.detail_viewed','service_metric_events.budget':'service.budget_cta_clicked','service_metric_events.message':'service.message_cta_clicked','quote_template_funnel_events.started':'quote.started','quote_template_funnel_events.progress':'quote.progressed','quote_template_funnel_events.completed':'quote.completed','quote_template_funnel_events.submitted':'quote.submitted'});
const FORBIDDEN_ANALYTICS_KEYS=Object.freeze(['raw_query','query_text','answer_text','answer','message','description','address','email','phone','cpf','cnpj','card_number','cardnumber','cvv','bank_account','bankaccount','access_token','refresh_token']);
function resolveEventName(name){const n=String(name||'').trim();return LEGACY_ALIASES[n]||n;}
function getEventDefinition(name){return EVENTS[resolveEventName(name)]||null;}
function containsForbiddenRawData(value){if(!value||typeof value!=='object')return false;if(Array.isArray(value))return value.some(containsForbiddenRawData);return Object.entries(value).some(([k,v])=>FORBIDDEN_ANALYTICS_KEYS.includes(String(k).toLowerCase())||containsForbiddenRawData(v));}
function validateClientSubmission(name,payload={}){const eventName=resolveEventName(name);const d=EVENTS[eventName];if(!d)return Object.freeze({ok:false,code:'ANA_EVENT_UNKNOWN'});if(!d.clientEmitAllowed)return Object.freeze({ok:false,code:'ANA_EVENT_SERVER_AUTHORITY_REQUIRED',eventName});if(containsForbiddenRawData(payload))return Object.freeze({ok:false,code:'ANA_EVENT_SENSITIVE_PAYLOAD_REJECTED',eventName});if(d.exposureProofRequired&&!String(payload.exposureProof||'').trim())return Object.freeze({ok:false,code:'ANA_EXPOSURE_PROOF_REQUIRED',eventName});if(d.orderReferenceRequired&&!String(payload.orderId||'').trim())return Object.freeze({ok:false,code:'ANA_ORDER_REFERENCE_REQUIRED',eventName});return Object.freeze({ok:true,eventName,definition:d});}
module.exports=Object.freeze({TAXONOMY_VERSION:'ana-event-taxonomy-v1',EVENT_CLASSES,EVENTS,LEGACY_ALIASES,FORBIDDEN_ANALYTICS_KEYS,resolveEventName,getEventDefinition,containsForbiddenRawData,validateClientSubmission});
