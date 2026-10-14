'use strict';
// Local demonstration only. Synthetic identities, no remote requests or writes.
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { setup, candidate, client, professional } = require('../tests/fixtures/professional-demo.cjs');
const root=path.resolve(__dirname,'..');
const origin='http://127.0.0.1:5612';
const smoke=process.argv.includes('--smoke');
const controls=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kontrat — demonstração local</title>
<style>body{font:18px system-ui;max-width:680px;margin:60px auto;padding:24px;color:#143e37;background:#f4f8f6}button{font:inherit;padding:15px;margin:8px;cursor:pointer}p{line-height:1.6}</style>
<h1>Kontrat · demonstração local</h1><p>Contas, anúncios, pedidos e mensagens fictícios. Nenhuma contratação ou pagamento real. As conversas são mantidas pelo executor de demonstração até fechar o navegador.</p>
<ol><li>Cadastre o perfil e volte aqui para simular sua verificação, sem documentos reais.</li><li>Crie um anúncio usando uma imagem sintética. Envie para análise e volte aqui para simular sua aprovação.</li><li>Pesquise como cliente, solicite orçamento e alterne para o profissional aceitar e conversar. Gerencie edição, desativação e arquivamento em Meu perfil.</li></ol>
<button data-action="onboarding">Cadastrar perfil</button><button data-action="verify">Simular verificação</button><button data-action="profile">Profissional · perfil e anúncios</button><button data-action="ad">Novo anúncio</button><button data-action="approve">Simular aprovação do último anúncio</button>
<button data-action="client">Cliente · pesquisar</button><button data-action="professional">Profissional · pedidos</button><button data-action="messages">Cliente · mensagens</button>
<p><button onclick="const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d');ctx.fillStyle='#eaf4f2';ctx.fillRect(0,0,640,360);ctx.fillStyle='#143e37';ctx.font='bold 32px sans-serif';ctx.fillText('DEMONSTRAÇÃO',36,150);ctx.font='22px sans-serif';ctx.fillText('Serviço fictício · sem contratação real',36,205);const link=document.createElement('a');link.download='servico-demonstracao.png';link.href=canvas.toDataURL('image/png');link.click();">Baixar imagem sintética para o anúncio</button></p>
<p role="status" id="feedback"></p><script>document.addEventListener('click',async e=>{const button=e.target.closest('[data-action]');if(!button)return;button.disabled=true;try{await demoSelect(button.dataset.action);document.querySelector('#feedback').textContent='Pronto. Confira a aba da aplicação.';}catch(error){document.querySelector('#feedback').textContent=error.message;}finally{button.disabled=false;}});</script>
<p>Mantenha esta aba aberta para alternar as personas. Fechar o navegador encerra a demonstração.</p></html>`;
(async()=>{
  let browser;
  const server=spawn(process.execPath,['scripts/serve-static-site.js','--host=127.0.0.1','--port=5612'],{cwd:root,env:{...process.env,DOKE_E2E_DISABLE_REMOTE_SERVICES:'1'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  try {
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Servidor de demonstração não iniciou.')),10000);
      server.once('error',reject);server.once('exit',code=>{clearTimeout(timer);reject(new Error('Servidor encerrou: '+code));});
      server.stderr.on('data',chunk=>process.stderr.write(chunk));
      server.stdout.once('data',()=>{clearTimeout(timer);resolve();});
    });
    browser=await chromium.launch({headless:smoke});
    const context=await browser.newContext({viewport:{width:1366,height:768}});
    const app=await context.newPage();const demo=await setup(app,{onboarding:true});
    await app.goto(origin+'/resultados.html?q=limpeza&type=services');
    const panel=await context.newPage();
    await panel.route('**/*',route=>route.fulfill({contentType:'text/html',body:controls}));
    await panel.exposeFunction('demoSelect',async role=>{
      if(role==='verify'){
        await demo.switchActor(candidate,origin+'/tornar-profissional.html');
        await demo.approveProfile();await demo.switchActor(professional,origin+'/perfil-profissional.html');
      }else if(role==='approve'){
        const pending=demo.catalog().filter(s=>s.professionalId===professional.id&&['pending_review','changes_pending_review'].includes(s.moderationStatus)).at(-1);
        if(!pending)throw new Error('Envie um anúncio para análise primeiro.');
        await demo.switchActor(professional,origin+'/perfil-profissional.html');await demo.approveService(pending.id);await app.reload();
      }else{
        const destinations={onboarding:'/tornar-profissional.html',profile:'/perfil-profissional.html',ad:'/anunciar-servico.html',professional:'/pedidos.html',messages:'/mensagens.html',client:'/resultados.html?q=limpeza&type=services'};
        const user=['client','messages'].includes(role)?client:role==='onboarding'?candidate:professional;
        await demo.switchActor(user,origin+destinations[role]);
      }
      await app.bringToFront();
    });
    await panel.goto(origin+'/__demo.html');
    console.log('Kontrat demo: '+origin+' · synthetic only · remote requests blocked');
    if(smoke){
      await panel.getByRole('button',{name:'Cadastrar perfil',exact:true}).click();
      await app.locator('[name="mainCategory"]').waitFor({state:'attached'});
      await panel.getByRole('button',{name:'Cliente · pesquisar'}).click();
      await app.locator('[data-results-grid] a[href*="demo_limpeza"]').first().waitFor();
      console.log('PASS: demo controls, persona switch and synthetic catalog');
      await browser.close();
    } else await new Promise(resolve=>browser.on('disconnected',resolve));
  } finally { if(browser?.isConnected())await browser.close();server.kill(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
