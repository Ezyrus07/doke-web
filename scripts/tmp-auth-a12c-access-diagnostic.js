#!/usr/bin/env node
'use strict';
const assert=require('assert');const fs=require('fs');const vm=require('vm');
const source=fs.readFileSync('assets/js/services/professional-access-service.js','utf8');
function CE(type,o={}){this.type=type;this.detail=o.detail;}
async function execute(scenario){
 let provider='supabase',accountRole='professional',sessionMutations=0,result=null;
 const actor={id:'00000000-0000-4000-8000-000000000071',role:'client',type:'client'};
 const rows={
  users:()=>({id:actor.id,role:accountRole,status:'active'}),
  professional_profiles:()=>({id:'profile-remote',user_id:actor.id,setup_status:'active',verification_status:'verified',document_status:'verified'}),
  professional_identity_verifications:()=>({id:'verification-remote',user_id:actor.id,professional_profile_id:'profile-remote',status:'verified',document_status:'verified'})
 };
 const queries=[];const client={from(table){queries.push(table);return{select(){return this},eq(){return this},maybeSingle(){return Promise.resolve({data:rows[table](),error:null})}}}};
 const window={Doke:{services:{},repositories:{professionalProfiles:{getByUserId:async()=>({id:'local-profile',userId:'local-client',status:'active',verificationStatus:'verified',documentStatus:'verified'})},professionalIdentityVerifications:{getByUserId:async()=>({id:'local-verification',userId:'local-client',status:'verified'})}},permissions:{PROFESSIONAL_ACTIONS:{ACCESS_PROFILE:'access_professional_profile'},evaluateProfessionalAccess(action,context){return Object.assign({},context,{action,allowed:context.user&&context.user.role==='professional'})}},session:{getCurrentUser(){return actor},getSession(){return{provider,user:actor}},setCurrentUser(){sessionMutations++}}},DokeSupabase:{getClient(){return client}},location:{pathname:'/perfil-profissional.html',search:'',replace(){},assign(){}},dispatchEvent(){}};window.window=window;
 const document={documentElement:{dataset:{}},dispatchEvent(){}};
 vm.runInNewContext(source,{window,document,console,Promise,Object,Array,String,Number,Boolean,JSON,Math,RegExp,Error,CustomEvent:CE,encodeURIComponent},{filename:'professional-access-service.js'});
 const service=window.Doke.services.professionalAccess;
 if(scenario==='remote'){result=await service.resolveContext();assert.strictEqual(result.user.role,'professional');assert(queries.includes('users'));}
 else if(scenario==='conflict'){accountRole='client';result=await service.resolveContext();assert.strictEqual(result.user.role,'client');}
 else if(scenario==='provider'){provider='mock';await assert.rejects(service.resolveContext(),e=>e&&e.code==='DOKE_PROFESSIONAL_AUTHORITY_UNAVAILABLE');}
 else if(scenario==='local'){provider='mock';result=await service.resolveContext({id:'local-client',role:'client',type:'client'});assert.strictEqual(result.user.role,'client');}
 else throw new Error('unknown scenario '+scenario);
 assert.strictEqual(sessionMutations,0);
 return {ok:true,scenario,queries,sessionMutations,result};
}
(async()=>{
 const scenario=process.argv[2];let report;
 try{report=await execute(scenario);}catch(error){report={ok:false,scenario,error:{name:error&&error.name||'',code:error&&error.code||'',message:error&&error.message||'',stack:error&&error.stack||''}};}
 fs.mkdirSync('reports/generated',{recursive:true});
 const file='reports/generated/tmp-auth-a12c-access-'+scenario+'.json';
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
})().catch(error=>{console.error(error&&error.stack||error);process.exit(1)});
