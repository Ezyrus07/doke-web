'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class MemoryStorage {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  key(i) { return [...this.values.keys()][i] ?? null; }
  getItem(k) { return this.values.get(k) ?? null; }
  setItem(k,v) { this.values.set(k,String(v)); }
  removeItem(k) { this.values.delete(k); }
}
function environment(contextId, shared = new MemoryStorage()) {
  const prefix = 'doke.preview-e2e.bqmmbopwfgwffkbtheab.' + contextId + ':';
  const window = {
    Doke:{}, localStorage:shared, sessionStorage:new MemoryStorage(),
    crypto:{randomUUID:()=> '11111111-2222-4333-8444-555555555555'},
    document:{dispatchEvent(){}}, addEventListener(){},
    ...(contextId ? {DokePreviewE2E:{isActive:()=>true,storageKey:key=>prefix+key}} : {})
  };
  const context = vm.createContext({window,console,CustomEvent:class {constructor(type,options){this.type=type;this.detail=options?.detail;}}});
  vm.runInContext(fs.readFileSync('assets/js/core/account-storage.js','utf8'),context);
  const api=window.Doke.accountStorage;
  api.registerDomain({domain:'drafts',dataClass:api.dataClasses.ACCOUNT_PRIVATE,retention:api.retention.UNTIL_LOGOUT});
  return {api,storage:shared,window,prefix};
}
const options={accountId:'account01',domain:'drafts',key:'draft',version:1};
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('legacy keys and parsing remain compatible outside Preview E2E',()=>{
  const e=environment(),key=e.api.makeKey(options);
  assert.equal(key,'doke:account01:drafts:draft:v1');
  const parsed=e.api.parseKey(key);assert.equal(parsed.scopeId,'account01');assert.equal(parsed.domain,'drafts');assert.equal(parsed.key,'draft');assert.equal(parsed.version,1);
  e.api.write({...options,value:{text:'legacy'}});assert.equal(e.api.read(options).text,'legacy');
  assert.equal(e.api.clearScope('account01').removedCount,1);assert.equal(e.storage.getItem(key),null);
});
test('Preview E2E valid keys retain all original capture groups',()=>{
  const e=environment('context_a'),key=e.api.makeKey(options),parsed=e.api.parseKey(key);
  assert.equal(key,e.prefix+'account:account01:drafts:draft:v1');
  assert.equal(parsed.scopeId,'account01');assert.equal(parsed.domain,'drafts');assert.equal(parsed.key,'draft');assert.equal(parsed.version,1);
});
test('wrong prefix and regex lookalikes are rejected',()=>{
  const e=environment('context_a'),key=e.api.makeKey(options);
  assert.equal(e.api.parseKey('doke:account01:drafts:draft:v1'),null);
  assert.equal(e.api.parseKey(key.replace('doke.preview','dokeXpreview')),null);
  assert.equal(e.api.parseKey(key.replace('context_a','context_b')),null);
  assert.throws(()=>e.api.read('doke:account01:drafts:draft:v1'),/Malformed/);
});
test('accounts and E2E contexts do not read each other storage',()=>{
  const shared=new MemoryStorage(),a=environment('context_a',shared),b=environment('context_b',shared);
  a.api.write({...options,value:{text:'a'}});assert.equal(a.api.read(options).text,'a');assert.equal(b.api.read(options),null);
  b.api.write({...options,value:{text:'b'}});assert.equal(a.api.read(options).text,'a');assert.equal(b.api.read(options).text,'b');
  assert.equal(a.api.read({...options,accountId:'account02'}),null);
  assert.notEqual(a.api.makeKey(options),b.api.makeKey(options));
});
test('E2E legacy migration leaves the public namespace untouched',()=>{
  const e=environment('context_a'),legacy='doke:account01:drafts:draft:v1';e.storage.setItem(legacy,'{"text":"public"}');
  const result=e.api.migrateLegacy({...options,legacyKeys:[legacy]});
  assert.equal(result.migrated,false);assert.equal(result.reason,'e2e-isolated');assert.equal(e.storage.getItem(legacy),'{"text":"public"}');
});
test('E2E cleanup removes only current account/context data and preserves public keys',()=>{
  const shared=new MemoryStorage(),a=environment('context_a',shared),b=environment('context_b',shared),legacy='doke:account01:drafts:draft:v1';
  a.storage.setItem(legacy,'{"text":"public"}');a.api.write({...options,value:{text:'a'}});b.api.write({...options,value:{text:'b'}});
  a.api.clearScope('account01');
  assert.equal(a.storage.getItem(legacy),'{"text":"public"}','public storage must survive E2E cleanup');
  assert.equal(a.storage.getItem(a.api.makeKey(options)),null,'current E2E private data must be cleared');
  assert.equal(b.api.read(options).text,'b','other E2E context must survive cleanup');
});
console.log('PREVIEW-E2E-STORAGE: '+passed+' tests passed.');
