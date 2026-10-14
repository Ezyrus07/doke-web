'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function boot(environment,reverse=false){
 const attributes={},listeners=new Map(),events=[];
 const document={documentElement:{setAttribute:(key,value)=>{attributes[key]=value;}}};
 const c={document,Doke:{},DOKE_RUNTIME_CONFIG:{environment,apiBaseUrl:'',flags:{enableNetworkRequests:false}},location:{hostname:environment==='local'?'localhost':'preview.synthetic.invalid',search:''},localStorage:{getItem:()=>null},URLSearchParams,CustomEvent:function(type,options){this.type=type;this.detail=options.detail;},console:{warn(){}},addEventListener(type,fn){listeners.set(type,fn);},dispatchEvent(event){events.push(event);listeners.get(event.type)?.(event);}};c.window=c;
 const ctx=vm.createContext(c);const load=file=>vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 if(reverse){c.Doke.runtimeConfig={dataProvider:'blocked',remoteAuthorityRequired:true,flags:{}};load('assets/js/services/repository-boundary.js');load('assets/js/core/runtime-config.js');}
 else{load('assets/js/core/runtime-config.js');load('assets/js/services/repository-boundary.js');}
 return{c,attributes,events,b:c.Doke.repositoryBoundary};
}
for(const reverse of [false,true]){const r=boot('staging',reverse);r.b.registerProvider('mock',{list:()=>[{id:'fake-success'}]});assert.equal(r.b.setProvider('mock',{strict:false}),null);assert.throws(()=>r.b.getProvider('mock'),{code:'DOKE_REMOTE_AUTHORITY_UNAVAILABLE'});assert.equal(r.attributes['data-doke-data-provider'],'blocked');assert.equal(r.attributes['data-doke-requested-data-provider'],'mock');assert.ok(r.events.every(e=>Object.keys(e.detail).every(k=>['activeProvider','requestedProvider'].includes(k))));}
const local=boot('local');local.b.registerProvider('mock',{list:()=>[]});local.b.setProvider('mock');assert.equal(local.attributes['data-doke-data-provider'],'mock');
const source=fs.readFileSync('assets/js/services/repository-boundary.js','utf8');for(const token of ['document.','querySelector','localStorage','sessionStorage','fetch(','supabase','firebase'])assert.ok(!source.toLowerCase().includes(token.toLowerCase()),'Forbidden coupling: '+token);
console.log('Repository boundary isolation: PASS (both load orders, remote mock denial, local fixture, no DOM/storage/network/SDK coupling).');
