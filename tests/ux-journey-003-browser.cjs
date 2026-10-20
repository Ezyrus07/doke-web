/* UX-JOURNEY-003: synthetic browser acceptance for truthful order detail context.
 * Never contacts hosted backend or performs real order commands. */
'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const path = require('node:path');
const { chromium } = require(require.resolve('@playwright/test', { paths: [path.resolve(__dirname, '..'), path.resolve(__dirname, '..', '..', 'marketplace-search-p31-integration')] }));
const ROOT = path.resolve(__dirname, '..');
const PORT = 5651;
const BASE = 'http://127.0.0.1:' + PORT;
const sizes = [{ width:390,height:844 }, {width:820,height:1180},{width:1366,height:768}];
const fixture = [{
  id:'ux003-conv-accepted', name:'Profissional de teste', peerName:'Profissional de teste',
  clientId:'ux003-client', professionalId:'ux003-prof',
  participants:['ux003-client','ux003-prof'], group:'orders',
  status:'accepted', orderId:'ux003-order-accepted', updatedAt:'2026-10-20T13:00:00.000Z',
  order:{ id:'ux003-order-accepted',clientId:'ux003-client',professionalId:'ux003-prof',
    providerId:'ux003-prof',status:'accepted', statusLabel:'Pedido aceito',
    title:'Pintura residencial sintética', budget:'R$ 450,00',description:'Pintura de um cômodo' },
  messages:[]
}];
const results=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function check(name,fn){try{await fn();console.log('PASS '+name);results.push({name,status:'PASS'});}
 catch(e){console.log('FAIL '+name+' '+String(e.message||e).slice(0,300));results.push({name,status:'FAIL',reason:String(e.message||e).slice(0,700)});}}
async function main(){
 let server,browser;
 try{
  server=cp.spawn(process.execPath,['scripts/serve-static-site.js','--host=127.0.0.1','--port='+PORT],{
   cwd:ROOT, env:{...process.env,DOKE_E2E_DISABLE_REMOTE_SERVICES:'1',DOKE_PLAYWRIGHT_LIVE_SEARCH:'0'},
   windowsHide:true,stdio:'ignore'
  });
  for(let i=0;i<38;i++){
    try {if((await fetch(BASE+'/index.html',{signal:AbortSignal.timeout(950)})).ok)break;} catch{}
    await pause(180);
  }
  browser=await chromium.launch({channel:'msedge',headless:true,timeout:20000,args:['--disable-background-networking']});
  for(const size of sizes){
   if(process.env.UX003_MOBILE_ONLY==='1'&&size.width!==390)continue;
   const context=await browser.newContext({viewport:size,reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(16000);
   await page.route('**/*',route=>{
     if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();
     return route.abort();
   });
   await page.addInitScript(()=>{
     const user={id:'ux003-client',name:'Cliente de teste',role:'client',type:'client',accountStatus:'active'};
     localStorage.setItem('doke.dataProvider','mock');
     localStorage.setItem('doke.auth.session.v1',JSON.stringify({provider:'mock',sessionStatus:'active',accountStatus:'active',user}));
   });
   try{
    await page.goto(BASE+'/mensagens.html?order=ux003-order-accepted&dokeDataProvider=mock',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-messages-page]')?.dataset.messagesReady==='true');
    assert.equal(await page.evaluate(items=>{
      window.Doke.repositories.messages.writeLocal(items);
      document.dispatchEvent(new CustomEvent('doke:auth-session-change',{detail:{source:'ux003-browser'}}));
      return window.Doke.repositories.messages.readLocal().length;
    },fixture),1);
    await page.waitForFunction(()=>document.querySelector('.message-item[data-message-id="ux003-conv-accepted"].is-active'));
    await check(size.width+' order details opens with truthful status',async()=>{
      const button=page.locator('[data-messages-order-context] [data-messages-open-order-detail]');
      await button.waitFor({state:'visible'});
      await button.click();
      const layer=page.locator('[data-messages-order-detail-layer]');
      await layer.waitFor({state:'visible'});
      const state=await page.evaluate(()=>({
        title:document.querySelector('[data-detail-title]')?.textContent,
        label:document.querySelector('[data-messages-order-detail-layer] [aria-label="Orientação sobre a etapa do pedido"] .orders-detail-section__eyebrow')?.textContent,
        pills:[...document.querySelectorAll('[data-detail-statusbar] .orders-detail-pill')].map(e=>e.textContent.trim()),
        dialogRole:document.querySelector('[data-messages-order-detail-layer] [role="dialog"]')?.getAttribute('aria-modal'),
        mainFocused:document.activeElement?.classList.contains('orders-detail-drawer'),
        overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth
      }));
      assert.match(state.title||'',/Pintura residencial sintética/);
      assert.equal(state.label,'Orientação da etapa');
      assert.equal(state.dialogRole,'true');
      assert.equal(state.mainFocused,true);
      assert.equal(state.pills.length,2);
      assert.equal(state.pills[0],'Pedido aceito');
      assert.ok(state.pills.every(x=>!/^Risco\s/i.test(x)));
      assert.ok(state.overflow<=1,'horizontal overflow '+state.overflow);
    });
    await check(size.width+' escape closes and restores control focus',async()=>{
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>document.querySelector('[data-messages-order-detail-layer]')?.hidden===true);
      await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-messages-open-order-detail')===true);
      assert.equal(await page.locator('[data-messages-order-detail-layer]').isHidden(),true);
    });
    await check(size.width+' order action remains unchanged',async()=>{
      const state=await page.evaluate(()=>({
        thread:document.querySelector('[data-thread-name]')?.textContent?.trim(),
        orderContext:!!document.querySelector('[data-messages-order-context]'),
        composer:document.querySelector('[data-messages-composer-input]')?.disabled
      }));
      assert.equal(state.thread,'Profissional de teste');
      assert.equal(state.orderContext,true);
      assert.equal(state.composer,false);
    });
   }finally{await context.close();}
  }
 }finally{
  if(browser)await browser.close().catch(()=>{});
  if(server&&server.exitCode===null)server.kill();
 }
 const summary={total:results.length,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length};
 console.log('RESULTS '+JSON.stringify(summary));console.log('DETAILS '+JSON.stringify(results));
 if(summary.failed)process.exitCode=1;
}
main().catch(e=>{console.error('RUNNER_ERROR '+e.stack);process.exitCode=2;});
