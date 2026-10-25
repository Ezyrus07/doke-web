#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const service=require('../backend/modules/messaging/messaging-service.js');

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='99999999-9999-4999-8999-999999999999';
const conversationId='44444444-4444-4444-8444-444444444444';
function client({missingNeq=false}={}){
  const trace=[];
  const convQuery={
    select(cols){trace.push(['conversations.select',cols]);return this;},
    eq(k,v){trace.push(['conversations.eq',k,v]);return this;},
    async maybeSingle(){return {data:{id:conversationId,client_id:A,professional_id:B,status:'active'},error:null};}
  };
  const msgQuery={
    update(payload){trace.push(['messages.update',payload]);return this;},
    eq(k,v){trace.push(['messages.eq',k,v]);return this;},
    neq(k,v){trace.push(['messages.neq',k,v]);return this;},
    then(ok,fail){trace.push(['messages.executed']);return Promise.resolve({data:[],error:null}).then(ok,fail);}
  };
  if(missingNeq) delete msgQuery.neq;
  return {trace,supabase:{from(table){trace.push(['from',table]);return table==='conversations'?convQuery:table==='messages'?msgQuery:(()=>{throw Error('unexpected table')})();}}};
}
(async()=>{
 const first=client();
 const result=await service.markConversationRead({supabase:first.supabase},{id:B,role:'professional'},conversationId);
 assert.equal(result.status,'read');
 assert.deepEqual(first.trace.filter(x=>x[0]==='messages.neq'),[
  ['messages.neq','sender_id',B],
  ['messages.neq','status','removed']
 ]);
 assert.equal(first.trace.filter(x=>x[0]==='messages.executed').length,1);
 const unsupported=client({missingNeq:true});
 await assert.rejects(
  service.markConversationRead({supabase:unsupported.supabase},{id:B,role:'professional'},conversationId),
  {code:'DOKE_RUNTIME_DEPENDENCY_UNAVAILABLE'}
 );
 assert.equal(unsupported.trace.some(x=>x[0]==='messages.executed'),false);
 const outsider=client();
 await assert.rejects(
  service.markConversationRead({supabase:outsider.supabase},{id:C,role:'client'},conversationId),
  {status:403}
 );
 assert.equal(outsider.trace.some(x=>x[0]==='messages.update'),false);
 console.log('MSG-UPDATE-READ-FILTER PASS: recipient filter, removed exclusion, fail-close, unrelated actor.');
})().catch(e=>{console.error(e);process.exitCode=1;});
