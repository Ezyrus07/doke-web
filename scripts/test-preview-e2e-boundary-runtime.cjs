'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const REF = 'bqmmbopwfgwffkbtheab';
const issuer = 'https://' + REF + '.supabase.co/auth/v1';
const token = (iss = issuer) => 'e30.' + Buffer.from(JSON.stringify({ iss })).toString('base64url') + '.synthetic';
function configuration(patch = {}) {
  return { profile:'preview-e2e', configurationId:'synthetic-local-only',
    projectRef:REF, frontendOrigin:'https://preview-e2e.test',
    supabaseUrl:'https://' + REF + '.supabase.co', publishableKey:'sb_publishable_synthetic',
    approvedApiOrigin:'https://api-e2e.test', apiBaseUrl:'https://api-e2e.test',
    approvedApiRoutes:['GET /orders','GET /services'], capabilities:{ auth:true, api:true, orders:true, catalog:true },
    ...patch };
}
function world(config, options = {}) {
  const calls = [], values = new Map([['doke.supabase.auth','PUBLIC_SESSION']]), listeners = {};
  const location = new URL(options.href || 'https://preview-e2e.test/index.html');
  const element = { getAttribute:()=>null, setAttribute(){} };
  const document = { documentElement:element, readyState:'loading', querySelectorAll:()=>[],
    addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
    dispatchEvent(event) { for (const fn of listeners[event.type] || []) fn(event); } };
  let clientOptions;
  const raw = {
    auth:{ getSession() { calls.push('getSession'); return Promise.resolve({ data:{session:{access_token:options.token || token(),user:{id:'synthetic'}}} }); },
      onAuthStateChange(){calls.push('subscribe');return {data:{subscription:{unsubscribe(){}}}};},
      signInWithPassword(){calls.push('login');return Promise.resolve({data:{session:null}});} },
    from(table){calls.push('table:'+table);return {};},
    functions:{ invoke(name){calls.push('function:'+name);return Promise.resolve({data:{}});} },
    storage:{ from(bucket){calls.push('bucket:'+bucket);return {};} },
    channel(){calls.push('channel');return {};}, realtime:{connect(){calls.push('socket');}}
  };
  const sdk = { createClient(url,key,opts){calls.push('create:'+url);clientOptions=opts;return raw;} };
  const window = { document, location, Doke:{}, DOKE_RUNTIME_CONFIG:{},
    DOKE_DEPLOYMENT_PROFILE:options.inactive ? undefined : 'preview-e2e',
    atob:s=>Buffer.from(s,'base64').toString('binary'),
    localStorage:{getItem(key){calls.push('storage:'+key);return values.get(key)||null;},setItem(k,v){values.set(k,v);},removeItem(k){values.delete(k);}},
    addEventListener(){}, setTimeout(){}, clearTimeout(){},
    fetch:async(url,opts)=>{calls.push({url,opts});return {ok:true,url,redirected:options.redirected || false,json:async()=>[]};}
  };
  if (config !== undefined) window.DOKE_PREVIEW_E2E_CONFIG = config;
  if (!options.lateSdk) window.supabase = sdk;
  const context = vm.createContext({window,document,console,URL,URLSearchParams,Promise,Proxy,Object,
    CustomEvent:class {constructor(type,opts){this.type=type;this.detail=opts?.detail;}},setTimeout(){},clearTimeout(){},Buffer});
  const run = file => vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  run('assets/js/core/preview-e2e-boundary.js');
  return {window,calls,values,run,sdk,raw,get clientOptions(){return clientOptions;}};
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS '+name); }
(async()=>{
  await test('missing config blocks before client/session creation and stays blocked when config arrives late',()=>{
    const w=world();w.run('assets/js/core/supabase-config.js');
    assert.equal(w.window.DokeSupabase.getClient(),null);assert.equal(w.calls.length,0);
    assert.throws(()=>w.window.DokePreviewE2E.getClient(),/CONFIG_BLOCKED/);
    assert.equal(Object.getOwnPropertyDescriptor(w.window,'DOKE_PREVIEW_E2E_CONFIG').writable,false);
  });
  for (const [name,patch] of Object.entries({
    shared:{projectRef:'zwkczgewzbsorbrjuzpb',supabaseUrl:'https://zwkczgewzbsorbrjuzpb.supabase.co'},
    lookalike:{supabaseUrl:'https://'+REF+'.supabase.co.evil.test'},
    missingApi:{apiBaseUrl:''}, wrongApi:{apiBaseUrl:'https://other.test'}, wrongFrontend:{frontendOrigin:'https://other.test'},
    secretKey:{publishableKey:'sb_secret_not-for-browser'}, finance:{capabilities:{auth:true,payments:true}}
  })) await test(name+' is rejected before any client',()=>{
    const w=world(configuration(patch));assert.throws(()=>w.window.DokePreviewE2E.getClient(),/CONFIG_BLOCKED/);
    assert.equal(w.calls.length,0);
  });
  await test('all capabilities denied by default',()=>{
    const w=world(configuration({capabilities:{}}));assert.throws(()=>w.window.DokePreviewE2E.getClient(),/CAPABILITY_DENIED/);
    for(const name of ['api','search','catalog','orders','upload','functions','realtime','finance']) assert.throws(()=>w.window.DokePreviewE2E.assertCapability(name),/CAPABILITY_DENIED/);
    assert.equal(w.calls.length,0);
  });
  await test('valid late SDK has one client across repeated script loads and navigation',()=>{
    const w=world(configuration(),{lateSdk:true});w.run('assets/js/core/supabase-config.js');
    assert.equal(w.window.DokeSupabase.getClient(),null);
    w.window.supabase=w.sdk;w.window.document.dispatchEvent({type:'doke:supabase-sdk-ready'});
    const first=w.window.DokeSupabase.getClient();w.run('assets/js/core/preview-e2e-boundary.js');
    w.window.location.pathname='/mensagens.html';w.run('assets/js/core/supabase-config.js');
    assert.equal(w.window.DokeSupabase.getClient(),first);
    assert.equal(w.calls.filter(x=>typeof x==='string'&&x.startsWith('create:')).length,1);
    assert.throws(()=>w.window.supabase.createClient('https://evil.test','key'),/CLIENT_BYPASS/);
  });
  await test('SDK session storage cannot recover public session',()=>{
    const w=world(configuration());w.window.DokePreviewE2E.getClient();
    assert.equal(w.clientOptions.auth.storage.getItem('supabase.auth'),null);
    assert.equal(w.values.get('doke.supabase.auth'),'PUBLIC_SESSION');
    assert(w.calls.some(x=>typeof x==='string'&&x.startsWith('storage:doke.preview-e2e.')));
  });
  await test('callbacks require an approved route and capability',()=>{
    const w=world(configuration(),{href:'https://preview-e2e.test/index.html?code=synthetic'});
    assert.throws(()=>w.window.DokePreviewE2E.getClient(),/CALLBACK_DENIED/);assert.equal(w.calls.length,0);
    const valid=world(configuration({capabilities:{auth:true,callbacks:true},callbackPaths:['/auth/login.html']}),{href:'https://preview-e2e.test/auth/login.html?code=synthetic'});
    valid.window.DokePreviewE2E.getClient();assert.equal(valid.clientOptions.auth.detectSessionInUrl,true);
  });
  await test('wrong session issuer is rejected',async()=>{
    const w=world(configuration(),{token:token('https://zwkczgewzbsorbrjuzpb.supabase.co/auth/v1')});
    await assert.rejects(w.window.DokePreviewE2E.getClient().auth.getSession(),/SESSION_ISSUER/);
  });
  await test('Functions Storage Realtime unknown tables and finance stay blocked',()=>{
    const w=world(configuration()),client=w.window.DokePreviewE2E.getClient();
    for(const fn of [()=>client.functions.invoke('self-service-operations'),()=>client.storage.from('service-media'),
      ()=>client.channel('test'),()=>client.realtime.connect(),()=>client.from('wallet'),()=>client.rpc('anything')]) assert.throws(fn,/DENIED/);
    assert(!w.calls.includes('channel'));assert(!w.calls.includes('socket'));
  });
  await test('SDK HTTP transport rejects wrong destination before sending credentials',()=>{
    const w=world(configuration());w.window.DokePreviewE2E.getClient();
    assert.throws(()=>w.clientOptions.global.fetch('https://zwkczgewzbsorbrjuzpb.supabase.co/auth/v1/token',{headers:{Authorization:'secret'}}),/TRANSPORT_ORIGIN/);
    assert.equal(w.calls.filter(x=>typeof x==='object').length,0);
  });
  await test('API origin and route are checked before reading a token; injected clients cannot bypass',async()=>{
    const w=world(configuration());w.run('assets/js/core/supabase-config.js');w.run('assets/js/core/runtime-config.js');
    w.run('assets/js/services/api-repository-provider.js');
    const provider=w.window.Doke.createApiRepositoryProvider({client:{get(){throw Error('bypass used');},post(){}}});
    const data=await provider.list('orders',{});assert.equal(data.length,0);
    const sent=w.calls.find(x=>typeof x==='object');assert(sent.url.startsWith('https://api-e2e.test/orders'));
    assert.equal(sent.opts.redirect,'error');assert.equal(sent.opts.headers.Authorization,'Bearer '+token());
    w.window.Doke.runtimeConfig={apiBaseUrl:'https://other.test',flags:{enableNetworkRequests:true}};
    const before=w.calls.length;await assert.rejects(provider.list('orders',{}),/API_ORIGIN/);assert.equal(w.calls.length,before);
  });
  await test('unexpected API redirect is rejected without retry',async()=>{
    const w=world(configuration(),{redirected:true});w.run('assets/js/core/supabase-config.js');w.run('assets/js/core/runtime-config.js');w.run('assets/js/services/api-repository-provider.js');
    await assert.rejects(w.window.Doke.createApiRepositoryProvider().list('orders',{}),/REDIRECT_DENIED/);
    assert.equal(w.calls.filter(x=>typeof x==='object').length,1);
  });
  await test('config is an immutable copy and diagnostics contain no keys or tokens',()=>{
    const cfg=configuration(),w=world(cfg);cfg.supabaseUrl='https://other.test';
    assert.equal(w.window.DOKE_PREVIEW_E2E_CONFIG.supabaseUrl,'https://'+REF+'.supabase.co');
    const diag=JSON.stringify(w.window.DokePreviewE2E.diagnostic());assert(!diag.includes('sb_publishable'));assert(!diag.includes(token()));
    assert(Object.isFrozen(w.window.DOKE_PREVIEW_E2E_CONFIG));
  });
  await test('repositories fail closed instead of creating fallback clients or returning fixtures',async()=>{
    for(const [file,call] of [
      ['search-repository.js',w=>w.window.Doke.repositories.search.queryPage({})],
      ['services-repository.js',w=>w.window.Doke.repositories.services.load()],
      ['orders-repository.js',w=>w.window.Doke.repositories.orders.load()],
      ['messages-repository.js',w=>w.window.Doke.repositories.messages.load()],
      ['notifications-repository.js',w=>w.window.Doke.repositories.notifications.load()]
    ]) {
      const w=world(configuration({capabilities:{}}));w.run('assets/js/core/supabase-config.js');w.run('assets/js/repositories/'+file);
      await assert.rejects(async()=>call(w),/DENIED/);assert.equal(w.calls.length,0,file);
    }
  });
  await test('every direct HTML entry loads boundary before account surfaces or SDK',()=>{
    const html=fs.readdirSync('.').filter(f=>f.endsWith('.html')).concat(fs.readdirSync('auth').filter(f=>f.endsWith('.html')).map(f=>'auth/'+f));
    for(const file of html){const text=fs.readFileSync(file,'utf8'),first=text.indexOf('preview-e2e-boundary.js');assert(first>=0,file);for(const name of ['supabase-config.js','header-auth-surface-early.js','supabase-js']){const next=text.indexOf(name);if(next>=0)assert(first<next,file+' '+name);}}
  });
  await test('non E2E profile leaves the legacy SDK and configuration intact',()=>{
    const w=world(undefined,{inactive:true});assert.equal(w.window.supabase,w.sdk);assert.equal(w.window.DokePreviewE2E.isActive(),false);
    w.run('assets/js/core/supabase-config.js');assert(w.window.DOKE_SUPABASE_CONFIG.url.includes('zwkczgewzbsorbrjuzpb'));assert.equal(w.calls.filter(x=>typeof x==='string'&&x.startsWith('create:')).length,1);
  });
  console.log('PREVIEW-E2E-BOUNDARY: '+passed+' tests passed (synthetic intercepted transports only).');
})().catch(error=>{console.error(error);process.exitCode=1;});
