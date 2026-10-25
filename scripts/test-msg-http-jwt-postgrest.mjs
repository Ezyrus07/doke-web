#!/usr/bin/env node
'use strict';
// Actual isolated PostgREST HTTP calls with freshly HMAC-signed synthetic JWTs.
// This does not exercise GoTrue, Supabase Storage or any hosted project.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');

assert.equal(process.env.RUN_SYNTHETIC_HTTP_TEST,'true','refuse non-synthetic execution');
const BASE='http://127.0.0.1:30571';
const secret=process.env.JWT_TEST_SECRET;
assert.equal(secret,'synthetic-jwt-secret-msg-http-2026-please-never-reuse');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='99999999-9999-4999-8999-999999999999';
const msgA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const msgB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function token(actor,role='authenticated',expires=900) {
 const now=Math.floor(Date.now()/1000);
 const header=encode({alg:'HS256',typ:'JWT'});
 const payload=encode({sub:actor,role,aud:'authenticated',iat:now,exp:now+expires,iss:'synthetic-ci'});
 const msg=header+'.'+payload;
 return msg+'.'+crypto.createHmac('sha256',secret).update(msg).digest('base64url');
}
async function request(path,{actor,method='GET',payload,auth=undefined,prefer=false}={}){
 const headers={'Accept':'application/json'};
 if(actor)headers.Authorization='Bearer '+token(actor);
 if(auth!==undefined)headers.Authorization=auth;
 if(payload!==undefined)headers['Content-Type']='application/json';
 if(prefer)headers.Prefer='return=representation';
 const res=await fetch(BASE+path,{method,headers,body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
 const text=await res.text();
 let body;try{body=text?JSON.parse(text):null}catch{body=text;}
 return {status:res.status,body};
}
const query=id=>'/messages?id=eq.'+id+'&select=id,sender_id,conversation_id,status,body';
function rowCheck(res,expected,label){
 assert.equal(res.status,200,label+' HTTP '+res.status+' '+JSON.stringify(res.body));
 assert.ok(Array.isArray(res.body),label+' not array');
 assert.equal(res.body.length,1,label+' unexpected row count');
 if(expected)for(const [key,val] of Object.entries(expected))assert.equal(res.body[0][key],val,label+' '+key);
}
function denied(res,label){
 assert.ok(res.status>=400 && res.status<500,label+' HTTP '+res.status+' '+JSON.stringify(res.body));
}
async function main(){
 const initial=await request(query(msgA),{actor:B});
 rowCheck(initial,{sender_id:A,status:'sent'},'recipient can view message');
 console.log('HTTP_JWT_RECIPIENT_SELECT_PASS');

 const anon=await request(query(msgA));
 denied(anon,'anonymous private message read');
 const expired=await request(query(msgA),{auth:'Bearer '+token(B,'authenticated',-30)});
 denied(expired,'expired token');
 const invalidJwt=token(B);const brokenJwt=invalidJwt.slice(0,-1)+(invalidJwt.endsWith('A')?'B':'A');
 denied(await request(query(msgA),{auth:'Bearer '+brokenJwt}),'tampered token');
 const serviceSpoof=await request(query(msgA),{auth:'Bearer '+token(B,'service_role')});
 denied(serviceSpoof,'service role not granted to HTTP authenticator');
 console.log('HTTP_JWT_ANON_EXPIRED_INVALID_SERVICE_DENIED');

 const outsider=await request(query(msgA),{actor:C});
 assert.equal(outsider.status,200,'outsider GET returned error '+JSON.stringify(outsider));
 assert.deepEqual(outsider.body,[],'outsider saw a message');
 console.log('HTTP_JWT_NONPARTICIPANT_SELECT_HIDDEN');

 const forged=await request(query(msgA),{actor:B,method:'PATCH',payload:{sender_id:B},prefer:true});
 denied(forged,'sender spoof');
 rowCheck(await request(query(msgA),{actor:B}),{sender_id:A},'sender unchanged');
 console.log('HTTP_JWT_AUTHORSHIP_PATCH_DENIED');

 const illegalDelete=await request(query(msgA),{actor:B,method:'PATCH',payload:{status:'removed',body:''},prefer:true});
 denied(illegalDelete,'recipient removes somebody else message');
 rowCheck(await request(query(msgA),{actor:B}),{status:'sent'},'recipient removal unchanged');
 console.log('HTTP_JWT_RECIPIENT_CANNOT_REMOVE');

 const unrelatedUpdate=await request(query(msgA),{actor:C,method:'PATCH',payload:{status:'read'},prefer:true});
 assert.equal(unrelatedUpdate.status,200,'unrelated update HTTP '+JSON.stringify(unrelatedUpdate));
 assert.deepEqual(unrelatedUpdate.body,[],'unrelated user changed row');
 console.log('HTTP_JWT_NONPARTICIPANT_RLS_UPDATE_ZERO_ROWS');

 const read=await request(query(msgA),{actor:B,method:'PATCH',payload:{status:'read'},prefer:true});
 rowCheck(read,{status:'read',body:'synthetic-a'},'recipient read');
 console.log('HTTP_JWT_RECIPIENT_READ_PASS');

 const senderEdit=await request(query(msgA),{actor:A,method:'PATCH',payload:{body:'tampered'},prefer:true});
 denied(senderEdit,'sender arbitrary body edit');
 const senderRemove=await request(query(msgA),{actor:A,method:'PATCH',payload:{status:'removed',body:''},prefer:true});
 rowCheck(senderRemove,{status:'removed',body:''},'sender remove');
 console.log('HTTP_JWT_SENDER_REMOVE_PASS');

 const resurrect=await request(query(msgA),{actor:B,method:'PATCH',payload:{status:'read'},prefer:true});
 denied(resurrect,'removed message resurrection');
 rowCheck(await request(query(msgA),{actor:A}),{status:'removed',body:''},'removed state retained');
 console.log('HTTP_JWT_REMOVED_MESSAGE_STAYS_REMOVED');

 const readReply=await request(query(msgB),{actor:A,method:'PATCH',payload:{status:'read'},prefer:true});
 rowCheck(readReply,{status:'read',sender_id:B},'opposite direction read');
 console.log('HTTP_JWT_OPPOSITE_DIRECTION_READ_PASS');

 const hiddenRpc=await request('/rpc/transaction_attachment_from_path',{actor:B,method:'POST',payload:{p_object_path:'synthetic/path'}});
 denied(hiddenRpc,'private helper not exposed through public schema');
 console.log('HTTP_JWT_PRIVATE_SCHEMA_NOT_EXPOSED');

 console.log('MSG_HTTP_JWT_POSTGREST_SYNTHETIC_CI_PASS_NOT_SUPABASE_STORAGE');
}
main().catch(e=>{console.error('MSG_HTTP_JWT_POSTGREST_SYNTHETIC_CI_FAIL',e?.message||e);process.exitCode=1;});