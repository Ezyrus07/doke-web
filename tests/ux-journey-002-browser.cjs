/* UX-JOURNEY-002: local synthetic acceptance of route -> conversation mapping.
   Only loopback static server; external requests blocked; no backend writes. */
'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const path = require('node:path');
const { chromium } = require(require.resolve('@playwright/test', { paths: [path.resolve(__dirname, '..'), path.resolve(__dirname, '..', '..', 'marketplace-search-p31-integration')] }));

const ROOT = path.resolve(__dirname, '..');
const PORT = 5643;
const BASE = 'http://127.0.0.1:' + PORT;
const widths = [390, 820, 1366];
const fixtures = [
  {
    id:'ux002-first', name:'Profissional Alfa', peerName:'Profissional Alfa',
    clientId:'ux002-client', professionalId:'ux002-pro', participants:['ux002-client','ux002-pro'],
    group:'orders', orderId:'ux002-order-a', status:'accepted', updatedAt:'2026-10-19T16:00:00.000Z',
    order:{id:'ux002-order-a', clientId:'ux002-client', professionalId:'ux002-pro', providerId:'ux002-pro', status:'accepted', title:'Pintura sintética'}, messages:[]
  },
  {
    id:'ux002-second', name:'Profissional Beta', peerName:'Profissional Beta',
    clientId:'ux002-client', professionalId:'ux002-pro', participants:['ux002-client','ux002-pro'],
    group:'orders', orderId:'ux002-order-b', status:'accepted', updatedAt:'2026-10-20T08:00:00.000Z',
    order:{id:'ux002-order-b', clientId:'ux002-client', professionalId:'ux002-pro', providerId:'ux002-pro', status:'accepted', title:'Limpeza sintética'}, messages:[]
  }
];
const results = [];
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const readyServer = async () => {
  for(let i=0;i<40;i++) {
    try {const response=await fetch(BASE+'/index.html',{signal:AbortSignal.timeout(1000)});if(response.ok)return;}
    catch{}
    await wait(180);
  }
  throw new Error('Local server unavailable');
};
async function check(label, task) {
  try {await task();results.push({label,status:'PASS'});console.log('PASS',label);}
  catch(e){results.push({label,status:'FAIL',error:String(e.message||e).slice(0,500)});console.log('FAIL',label,String(e.message||e).slice(0,500));}
}
async function run() {
  let server, browser;
  try {
    server=cp.spawn(process.execPath,['scripts/serve-static-site.js','--host=127.0.0.1','--port='+PORT],
      {cwd:ROOT,env:{...process.env,DOKE_E2E_DISABLE_REMOTE_SERVICES:'1',DOKE_PLAYWRIGHT_LIVE_SEARCH:'0'},stdio:'ignore',windowsHide:true});
    await readyServer();
    browser=await chromium.launch({channel:'msedge',headless:true,timeout:20000,args:['--disable-background-networking']});
    for(const width of widths) {
      if(process.env.UX002_MOBILE_SMOKE==='1'&&width!==390) continue;
      const context=await browser.newContext({viewport:{width,height:width===390?844:width===820?1180:768}});
      const page=await context.newPage();
      page.setDefaultTimeout(15000);
      await page.route('**/*', route=>{
        if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();
        return route.abort();
      });
      await page.addInitScript(() => {
        const user={id:'ux002-client',name:'Cliente sintético',role:'client',type:'client',accountStatus:'active'};
        localStorage.setItem('doke.dataProvider','mock');
        localStorage.setItem('doke.auth.session.v1',JSON.stringify({
          provider:'mock',sessionStatus:'active',accountStatus:'active',user
        }));
      });
      async function openWithSeed(url) {
        await page.goto(BASE+url,{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>document.querySelector('[data-messages-page]')?.dataset.messagesReady==='true',null,{timeout:20000});
        const seeded=await page.evaluate((items)=>{
          const repo=window.Doke?.repositories?.messages;
          if(!repo?.writeLocal) throw new Error('No synthetic message repository');
          repo.writeLocal(items);
          document.dispatchEvent(new CustomEvent('doke:auth-session-change',{detail:{source:'ux-journey-002-fixture'}}));
          return repo.readLocal().length;
        },fixtures);
        assert.equal(seeded,2);
        await page.waitForFunction(()=>{
          const ids=[...document.querySelectorAll('.message-item[data-message-id]')].map(x=>x.dataset.messageId);
          return ids.includes('ux002-first')&&ids.includes('ux002-second');
        },null,{timeout:12000});
        await wait(160);
      }
      const snapshot=()=>page.evaluate(()=>({
        active:[...document.querySelectorAll('.message-item.is-active[data-message-id]')].map(x=>x.dataset.messageId),
        thread:document.querySelector('[data-thread-name]')?.textContent?.trim(),
        empty:!document.querySelector('[data-messages-thread-empty]')?.hidden,
        notice:document.querySelector('[data-messages-route-feedback]')?.textContent?.trim()||'',
        noticeVisible:!!document.querySelector('[data-messages-route-feedback]')?.getClientRects().length,
        disabled:!!document.querySelector('[data-messages-composer-input]')?.disabled,
        audience:document.querySelector('[data-messages-page]')?.dataset.messagesReady,
        overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth
      }));
      await check(width+' missing direct order has no unrelated selected',async()=>{
        await openWithSeed('/mensagens.html?order=ux002-nonexistent&dokeDataProvider=mock');
        const data=await snapshot();
        assert.deepEqual(data.active,[]);
        assert.equal(data.disabled,true);
        assert.ok(data.empty,'thread is not empty');
        assert.ok(data.notice.includes('não está disponível'),'no missing conversation feedback: '+JSON.stringify(data));
        assert.equal(data.noticeVisible,true,'missing conversation feedback is not visible');
        assert.ok(data.overflow<=1,'horizontal overflow: '+data.overflow);
      });
      await check(width+' user can manually open a conversation after invalid link',async()=>{
        await page.locator('.message-item[data-message-id="ux002-second"]').click();
        await page.waitForFunction(()=>!!document.querySelector('.message-item[data-message-id="ux002-second"].is-active'));
        const data=await snapshot();
        assert.deepEqual(data.active,['ux002-second']);
        assert.equal(data.notice,'');
        assert.equal(data.thread,'Profissional Beta');
      });
      await check(width+' direct matching order opens correct conversation',async()=>{
        await openWithSeed('/mensagens.html?order=ux002-order-b&dokeDataProvider=mock');
        const data=await snapshot();
        assert.deepEqual(data.active,['ux002-second']);
        assert.equal(data.thread,'Profissional Beta');
        assert.equal(data.notice,'');
      });
      await check(width+' missing conversation ID does not fall back',async()=>{
        await openWithSeed('/mensagens.html?conversation=ux002-absent&dokeDataProvider=mock');
        const data=await snapshot();
        assert.deepEqual(data.active,[]);
        assert.equal(data.disabled,true);
        assert.ok(data.notice.includes('não está disponível'));
      });
      await check(width+' ordinary Inbox still chooses existing conversation',async()=>{
        await openWithSeed('/mensagens.html?dokeDataProvider=mock');
        const data=await snapshot();
        assert.equal(data.active.length,1,'normal inbox should remain usable: '+JSON.stringify(data));
        assert.ok(['ux002-first','ux002-second'].includes(data.active[0]));
        assert.equal(data.notice,'');
      });
      await context.close();
    }
  } finally {
    if(browser)await browser.close().catch(()=>{});
    if(server&&server.exitCode===null)server.kill();
  }
  const summary={total:results.length,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length};
  console.log('RESULTS',JSON.stringify(summary));
  console.log('DETAILS',JSON.stringify(results));
  if(summary.failed) process.exitCode=1;
}
run().catch(e=>{console.error('RUNNER_BLOCKED',e.stack||e);process.exitCode=2;});
