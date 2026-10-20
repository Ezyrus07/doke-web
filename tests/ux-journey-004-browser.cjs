/* UX-JOURNEY-004 browser acceptance: synthetic quote, no hosted writes. */
'use strict';
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const path=require('node:path');
const { chromium }=require(require.resolve('@playwright/test', { paths: [path.resolve(__dirname, '..'), path.resolve(__dirname, '..', '..', 'marketplace-search-p31-integration')] }));
const ROOT=path.resolve(__dirname,'..');
const PORT=5655,BASE='http://127.0.0.1:'+PORT;
const viewports=[{width:390,height:844},{width:820,height:1180},{width:1366,height:768}];
const mock=[{id:'ux004-conversation',name:'Profissional de teste',peerName:'Profissional de teste',
 clientId:'ux004-client',professionalId:'ux004-professional',
 participants:['ux004-client','ux004-professional'], group:'orders',status:'quoted',orderId:'ux004-order',
 order:{id:'ux004-order',clientId:'ux004-client',professionalId:'ux004-professional',providerId:'ux004-professional',
  title:'Pintura sintética',serviceTitle:'Pintura sintética',status:'quoted',statusLabel:'Proposta enviada',proposalAmount:'R$ 850,00'},
 messages:[{id:'ux004-proposal',type:'proposal',financialKind:'proposal',senderId:'ux004-professional',
  author:'Profissional de teste',amount:'R$ 850,00',installments:'À vista',
  text:'Proposta para pintar um cômodo',createdAt:'2026-10-20T12:30:00.000Z',time:'12:30'}],
 createdAt:'2026-10-20T12:00:00.000Z',updatedAt:'2026-10-20T12:30:00.000Z'}];
const outcomes=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function check(name,fn){try{await fn();outcomes.push({name,status:'PASS'});console.log('PASS',name);}
catch(err){outcomes.push({name,status:'FAIL',error:String(err.message||err).slice(0,900)});console.log('FAIL',name,String(err.message||err).slice(0,550));}}
async function main(){
 let server,browser;
 try{
  server=cp.spawn(process.execPath,['scripts/serve-static-site.js','--host=127.0.0.1','--port='+PORT],
   {cwd:ROOT,env:{...process.env,DOKE_E2E_DISABLE_REMOTE_SERVICES:'1',DOKE_PLAYWRIGHT_LIVE_SEARCH:'0'},stdio:'ignore',windowsHide:true});
  for(let n=0;n<40;n++){try{if((await fetch(BASE+'/index.html',{signal:AbortSignal.timeout(800)})).ok)break;}catch{}await sleep(170);}
  browser=await chromium.launch({channel:'msedge',headless:true,timeout:18000,args:['--disable-background-networking']});
  for(const size of viewports){
   if(process.env.UX004_MOBILE_ONLY==='1'&&size.width!==390)continue;
   const context=await browser.newContext({viewport:size,reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(12000);
   await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
   await page.addInitScript(()=>{
    const user={id:'ux004-client',name:'Cliente sintético',role:'client',type:'client',accountStatus:'active'};
    localStorage.setItem('doke.dataProvider','mock');
    localStorage.setItem('doke.auth.session.v1',JSON.stringify({provider:'mock',sessionStatus:'active',accountStatus:'active',user}));
   });
   const orderState=()=>page.evaluate(()=>{
     const order=window.Doke.repositories.orders.readLocal().find(x=>x.id==='ux004-order');
     return {status:order?.status,approvedBy:order?.proposalApprovedBy||'',approvalSource:order?.approvalSource||'',approvedAt:order?.proposalApprovedAt||'',events:window.__ux004OrderEvents||[]};
   });
   const open=async()=>{
    await page.goto(BASE+'/mensagens.html?order=ux004-order&dokeDataProvider=mock',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-messages-page]')?.dataset.messagesReady==='true');
    await page.evaluate(items=>{
      window.Doke.repositories.messages.writeLocal(items);
      window.Doke.repositories.orders.writeLocal([{
        id:'ux004-order',clientId:'ux004-client',professionalId:'ux004-professional',providerId:'ux004-professional',
        title:'Pintura sintética',serviceTitle:'Pintura sintética',status:'quoted',statusLabel:'Proposta enviada',
        proposalAmount:'R$ 850,00',budget:'R$ 850,00',proposalInstallments:'À vista',syncStatus:'mock'
      }]);
      window.__ux004OrderEvents=[];
      document.addEventListener('doke:order-status-changed',e=>{
        window.__ux004OrderEvents.push({status:e.detail?.status||'',id:e.detail?.order?.id||''});
      });
      document.dispatchEvent(new CustomEvent('doke:auth-session-change',{detail:{source:'ux004-e2e'}}));
    },mock);
    await page.waitForFunction(()=>document.querySelector('.message-item[data-message-id="ux004-conversation"].is-active'));
    await page.waitForFunction(()=>document.querySelector('[data-messages-approve-proposal]')?.offsetParent !== null);
    assert.equal((await orderState()).status,'quoted','synthetic order did not seed as quoted');
   };
   const prompt=()=>page.locator('[data-messages-proposal-review]');
   try{
    await open();
    await check(size.width+' review gate before approving from order card',async()=>{
      await page.locator('[data-messages-approve-proposal]').click();
      await prompt().waitFor({state:'visible'});
      assert.equal((await orderState()).status,'quoted','approval executed before review');
      const summary=await page.evaluate(()=>({
        title:document.querySelector('[data-messages-proposal-review] [data-proposal-review-title]')?.textContent||'',
        amount:document.querySelector('[data-messages-proposal-review] [data-proposal-review-amount]')?.textContent||'',
        installment:document.querySelector('[data-messages-proposal-review] [data-proposal-review-installments]')?.textContent||'',
        disclaimer:document.querySelector('[data-messages-proposal-review] [data-proposal-review-disclaimer]')?.textContent||'',
        focus:document.activeElement?.hasAttribute('data-proposal-review-confirm')||false,
        overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth
      }));
      assert.match(summary.title,/Pintura sintética/);
      assert.match(summary.amount,/850,00/);
      assert.match(summary.installment,/À vista/);
      assert.match(summary.disclaimer,/não (é|confirma) (um )?pagamento/i);
      assert.equal(summary.focus,true);
      assert.ok(summary.overflow<=1,'horizontal overflow '+summary.overflow);
    });
    await check(size.width+' cancel keeps proposal and does not approve',async()=>{
      await page.locator('[data-proposal-review-cancel]').last().click();
      await prompt().waitFor({state:'hidden'});
      assert.equal((await orderState()).status,'quoted');
      assert.equal(await page.locator('[data-messages-approve-proposal]').count(),1);
    });
    await check(size.width+' confirm applies authorized local order transition',async()=>{
      await page.locator('[data-messages-approve-proposal]').click();
      await prompt().waitFor({state:'visible'});
      await page.locator('[data-proposal-review-confirm]').click();
      await page.waitForFunction(()=>window.Doke.repositories.orders.readLocal()
        .some(x=>x.id==='ux004-order'&&x.status==='in_progress'),null,{timeout:10000});
      const next=await orderState();
      assert.equal(next.status,'in_progress');
      assert.equal(next.approvedBy,'ux004-client');
      assert.equal(next.approvalSource,'messages-proposal');
      assert.ok(next.approvedAt,'missing canonical approval timestamp');
    });
    await open();
    await check(size.width+' proposal message entrypoint opens same review',async()=>{
      const btn=page.locator('[data-message-approve-proposal]').first();
      await page.locator('[data-browser-notification-prompt]').evaluateAll(nodes=>nodes.forEach(node=>node.remove()));
      await btn.waitFor({state:'visible'});
      await btn.click();
      await prompt().waitFor({state:'visible'});
      assert.equal((await orderState()).status,'quoted');
      await page.keyboard.press('Escape');
      await prompt().waitFor({state:'hidden'});
      assert.equal((await orderState()).status,'quoted');
    });
   }finally{await context.close();}
  }
 }finally{if(browser)await browser.close().catch(()=>{});if(server&&server.exitCode===null)server.kill();}
 const summary={total:outcomes.length,passed:outcomes.filter(x=>x.status==='PASS').length,failed:outcomes.filter(x=>x.status==='FAIL').length};
 console.log('RESULTS '+JSON.stringify(summary));console.log('DETAILS '+JSON.stringify(outcomes));
 if(summary.failed)process.exitCode=1;
}
main().catch(e=>{console.error('RUNNER_ERROR '+(e.stack||e));process.exitCode=2;});
