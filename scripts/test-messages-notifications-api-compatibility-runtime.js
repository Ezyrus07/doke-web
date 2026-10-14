'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const client='11111111-1111-4111-8111-111111111111',pro='22222222-2222-4222-8222-222222222222';
function boot(o={}){
 const calls=[],events=[],ledger=new Map();let writes=0,localReads=0,posts=0;
 const actor={id:o.actor||client,role:o.actor===pro?'professional':'client'};
 const conv={id:'conv-1',orderId:'order-1',clientId:client,professionalId:pro,participants:[client,pro],status:o.active?'pending':'accepted',backendStatus:o.active?'active':'pending',order:{id:'order-1',status:o.active?'pending':'accepted'},messages:[{id:'old',senderId:client,body:'old'}]};
 const c={console:{warn(){}},Date,Math,Promise,Map,Set,URLSearchParams,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,Uint8Array,
 location:{search:'',hostname:'localhost'},CustomEvent:function(t,i){this.type=t;this.detail=i.detail;},document:{documentElement:{setAttribute(){}},dispatchEvent:e=>events.push(e),addEventListener(){}},localStorage:{getItem:()=>null,setItem:()=>{writes++;}},
 DOKE_SUPABASE_CLIENT:{auth:{getSession:async()=>({data:{session:o.guest?null:{access_token:o.expired?'expired.session.token':'synthetic.session.token'}}})}},
 Doke:{runtimeConfig:{environment:'staging',dataProvider:'api',remoteAuthorityRequired:true,apiBaseUrl:o.blocked?'':'https://synthetic.invalid',flags:{enableNetworkRequests:true}},session:{getCurrentUser:()=>actor},services:{},repositories:{messages:{normalize:v=>v,normalizeMessage:v=>v,getById:async()=>{localReads++;return conv;},addMessage:async()=>{writes++;return{id:'local'};}},notifications:{markAsRead:async()=>{writes++;return{id:'local'};}},orders:{normalize:v=>v}}}};
 c.window=c;c.fetch=async(url,r)=>{
  const p=new URL(url).pathname;calls.push({path:p,...r});let status=200,data;
  if(!r.headers.Authorization||r.headers.Authorization.includes('expired'))status=401;
  if(o.http&&r.method!=='GET')status=o.http;
  if(r.method==='GET')data={conversation:conv};
  else{
   posts++;const b=JSON.parse(r.body||'{}');
   if(o.network&&posts<=o.network)throw Error('synthetic network loss');
   if(o.timeout&&posts===1)status=408;
   if(p.startsWith('/orders/')&&p.endsWith('/accept'))data={order:{id:'order-1',clientId:client,professionalId:pro,status:'accepted'}};
   else if(p.startsWith('/notifications'))data=o.emptyNotification?null:p.endsWith('/read-all')?{ok:true,userId:client,status:'read'}:{notification:{id:o.wrongNotification?'other':'note-1',userId:client,read:true},status:'read'};
   else {
    const key=r.headers['x-idempotency-key'];const replayed=ledger.has(key);let entity=ledger.get(key);
    if(!entity){entity=b.action==='sendMessage'?{message:{id:'msg-'+(ledger.size+1),conversationId:o.wrongConversation?'other':'conv-1',senderId:actor.id,body:b.body}}:b.action==='createForOrder'||b.action==='updateOrder'?{conversation:conv}:{ok:true};ledger.set(key,entity);}
    data={data:o.emptyData?{}:entity,acknowledgement:o.noAck?null:{commandId:o.wrongAck?'other':b.commandId,action:b.action,status:replayed?'replayed':'accepted'}};
   }
  }
  return{ok:status===200,status,json:async()=>data};
 };
 const ctx=vm.createContext(c);const load=f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
 load('assets/js/services/repository-boundary.js');c.Doke.repositoryBoundary.registerProvider('mock',{action:async()=>{writes++;return{id:'mock'};}});
 load('assets/js/services/api-repository-provider.js');c.Doke.repositoryBoundary.setProvider('api',{strict:false});
 load('assets/js/services/message-command-executor.js');c.Doke.messageCommandExecutor=c.Doke.messageCommandReliability.createExecutor({sleep:async()=>{}});
 load('assets/js/services/message-service.js');load('assets/js/services/notification-service.js');load('assets/js/services/orders-service.js');
 return{c,m:c.Doke.services.messages,n:c.Doke.services.notifications,orders:c.Doke.services.orders,calls,events,ledger,writes:()=>writes,localReads:()=>localReads};
}
const cases=[];function test(name,run){cases.push([name,run]);}
function send(r,key='send-1'){return r.m.sendMessage('conv-1',{body:'synthetic message',commandId:key});}
function noSuccess(r){assert.equal(r.events.filter(e=>e.type==='doke:message-sent').length,0);assert.equal(r.writes(),0);}
test('conversation envelope and active backend state',async()=>{const r=boot({active:true});assert.equal((await r.m.getConversationById('conv-1')).id,'conv-1');assert.equal((await send(r)).conversationId,'conv-1');});
test('participants checked before mutation',async()=>{const r=boot({actor:'33333333-3333-4333-8333-333333333333'});await assert.rejects(send(r),/permissão/);assert.equal(r.calls.filter(c=>c.method==='POST').length,0);noSuccess(r);});
test('transport session, omitted cookies, metadata and valid ACK',async()=>{const r=boot();const sent=await send(r);assert.ok(sent.id);const p=r.calls.find(c=>c.method==='POST');assert.equal(p.headers.Authorization,'Bearer synthetic.session.token');assert.equal(p.credentials,'omit');assert.equal(p.headers['x-idempotency-key'],'send-1');assert.equal(p.headers['x-request-id'],'send-1');assert.equal(p.headers['x-doke-command-attempt'],'1');assert.ok(Date.parse(p.headers['x-doke-command-created-at']));assert.ok(Date.parse(p.headers['x-doke-request-issued-at']));assert.ok(p.headers['x-doke-request-nonce']);assert.equal(JSON.parse(p.body).__requestMeta,undefined);assert.equal(r.events.filter(e=>e.type==='doke:message-sent').length,1);});
test('duplicate in-flight and replay keep one message and one UI effect',async()=>{const r=boot();const [a,b]=await Promise.all([send(r),send(r)]);assert.equal(a.id,b.id);assert.equal((await send(r)).id,a.id);assert.equal(r.ledger.size,1);assert.equal(r.events.filter(e=>e.type==='doke:message-sent').length,1);});
test('network retry preserves command identity and refreshes nonce',async()=>{const r=boot({network:1});await send(r);const p=r.calls.filter(c=>c.method==='POST'&&c.path.endsWith('/messages'));assert.equal(p.length,2);assert.equal(p[0].headers['x-idempotency-key'],p[1].headers['x-idempotency-key']);assert.equal(p[1].headers['x-doke-command-attempt'],'2');assert.notEqual(p[0].headers['x-doke-request-nonce'],p[1].headers['x-doke-request-nonce']);});
test('timeout retry and terminal network loss',async()=>{await send(boot({timeout:true}));const r=boot({network:3});await assert.rejects(send(r));assert.equal(r.calls.filter(c=>c.method==='POST').length,3);noSuccess(r);});
test('401/403/409 never retry or emit success',async()=>{for(const http of[401,403,409]){const r=boot({http});await assert.rejects(send(r));assert.equal(r.calls.filter(c=>c.method==='POST').length,1);noSuccess(r);}});
test('missing and expired sessions rejected',async()=>{for(const o of[{guest:true},{expired:true}]){const r=boot(o);await assert.rejects(send(r));noSuccess(r);}});
test('missing or mismatched ACK rejected',async()=>{for(const o of[{noAck:true},{wrongAck:true}]){const r=boot(o);await assert.rejects(send(r),{code:'DOKE_MESSAGES_COMMAND_ACK_INVALID'});noSuccess(r);}});
test('ACK without entity ID rejected',async()=>{const r=boot({emptyData:true});await assert.rejects(send(r),{code:'DOKE_MESSAGES_COMMAND_ACK_INVALID'});noSuccess(r);});
test('ACK for another conversation rejected',async()=>{const r=boot({wrongConversation:true});await assert.rejects(send(r),{code:'DOKE_MESSAGES_COMMAND_ACK_INVALID'});noSuccess(r);});
test('accepted order keeps conversation identity on replay and reload',async()=>{const r=boot({actor:pro});await r.orders.accept('order-1',{idempotencyKey:'accept-1'});await r.orders.accept('order-1',{idempotencyKey:'accept-1'});const events=r.events.filter(e=>e.type==='doke:order-status-changed');assert.equal(events[0].detail.conversation.id,'conv-1');assert.equal(events[1].detail.conversation.id,'conv-1');assert.equal((await r.m.getConversationById('conv-1')).id,'conv-1');assert.equal(r.ledger.size,1);});
test('notifications transport and 401/403/409 rejection',async()=>{const r=boot();assert.equal((await r.n.markAsRead('note-1')).notification.id,'note-1');const p=r.calls[0];assert.equal(p.credentials,'omit');assert.ok(p.headers.Authorization);assert.ok(p.headers['x-doke-request-nonce']);for(const options of[{http:401},{http:403},{http:409},{guest:true},{expired:true},{network:1}]){const x=boot(options);await assert.rejects(async()=>x.n.dismiss('note-1'));assert.equal(x.writes(),0);}});
test('empty notification result cannot report success',async()=>{const r=boot({emptyNotification:true});await assert.rejects(async()=>r.n.markAsRead('note-1'));assert.equal(r.writes(),0);});
test('required remote authority never falls back',async()=>{const r=boot({blocked:true});await assert.rejects(async()=>r.n.markAsRead('note-1'));await assert.rejects(async()=>r.m.getConversationById('conv-1'));assert.equal(r.writes(),0);assert.equal(r.localReads(),0);assert.equal(r.calls.length,0);});
test('empty entity ACK cannot confirm create/update/read/remove',async()=>{
 for(const action of['create','update','read','remove']){const r=boot({emptyData:true});const run=()=>action==='create'?r.m.createConversationForOrder({id:'order-1'}):action==='update'?r.m.updateConversationOrder({id:'order-1',conversationId:'conv-1'}):action==='read'?r.m.markAsRead('conv-1'):r.m.removeMessage('conv-1','old');await assert.rejects(run,{code:'DOKE_MESSAGES_COMMAND_ACK_INVALID'});assert.equal(r.events.filter(e=>e.type==='doke:message-removed').length,0);}
});
test('notification identity mismatch and empty bulk ACK rejected',async()=>{const r=boot({wrongNotification:true});await assert.rejects(async()=>r.n.dismiss('note-1'));const x=boot({emptyNotification:true});await assert.rejects(async()=>x.n.markAllAsRead({}));assert.equal((await boot().n.markAllAsRead({})).ok,true);});
test('CORS admits command metadata without widening origins',async()=>{
 const file=path.join(root,'backend/runtime/staging/node-http-server.js'),mod={exports:{}};
 const localRequire=name=>name.startsWith('.')?require(path.resolve(path.dirname(file),name)):require(name);localRequire.main=null;
 vm.runInNewContext(fs.readFileSync(file,'utf8')+';module.exports={__cors:applyCorsHeaders};',{require:localRequire,module:mod,process:{env:{}},URL,console,Buffer});
 const headers={};mod.exports.__cors({setHeader:(k,v)=>{headers[k]=v;}},'http://127.0.0.1:5617');
 assert.ok(headers['access-control-allow-headers'].includes('x-doke-command-attempt'));assert.ok(headers['access-control-allow-headers'].includes('x-doke-command-created-at'));
 assert.equal(headers['access-control-allow-origin'],'http://127.0.0.1:5617');const denied={};mod.exports.__cors({setHeader:(k,v)=>{denied[k]=v;}},'https://untrusted.invalid');assert.equal(denied['access-control-allow-origin'],undefined);
});
test('HTTP runtime preserves acknowledgement with resource payload',async()=>{
 const file=path.join(root,'backend/runtime/staging/staging-api-runtime.js'),mod={exports:{}};
 const ack={commandId:'wire-1',action:'sendMessage',status:'accepted'};
 const localRequire=name=>name.endsWith('module-route-loader')?{getHandler:()=>async()=>({data:{message:{id:'wire-msg',conversationId:'conv-1'}},acknowledgement:ack})}:name.endsWith('supabase-actor-resolver')?{resolveSupabaseActor:async()=>({id:client,role:'client'}),toGuestActor:()=>({role:'guest'})}:require(path.resolve(path.dirname(file),name));
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:localRequire,module:mod,URL,Date,Object,Array,String,Number,Boolean,Error});
 const api=mod.exports.createStagingApiRuntime({env:{},supabaseUrl:'https://synthetic.invalid',anonKey:'synthetic-anon',serviceApiKey:'synthetic-service',enableServiceRole:true,allowNetwork:true,createClient:()=>({})});
 const response=await api.handle({method:'POST',path:'/conversations/conv-1/messages',headers:{authorization:'Bearer synthetic.session.token'},body:{commandId:'wire-1'}});
 assert.equal(response.status,200);assert.equal(response.body.message.id,'wire-msg');assert.equal(response.body.acknowledgement.commandId,'wire-1');
});
(async()=>{let failures=0;for(const[name,run]of cases){try{await run();console.log('PASS '+name);}catch(e){failures++;console.error('FAIL '+name+': '+e.message);}}console.log(`${cases.length-failures}/${cases.length} P2B compatibility cases passed`);process.exitCode=failures?1:0;})();
