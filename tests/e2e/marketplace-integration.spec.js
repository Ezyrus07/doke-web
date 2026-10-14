const {test,expect}=require('@playwright/test');
const {setup,professional,candidate,client}=require('../fixtures/professional-demo.cjs');
const transportDiagnostics=new WeakMap();
test.beforeEach(async({page},info)=>{
 if(info.title!=='integrated registration to notifications 390')return;
 const events=[];transportDiagnostics.set(page,events);
 const pathname=url=>new URL(url).pathname;
 const record=(type,request,extra={})=>events.push({type,time:Date.now(),path:pathname(request.url()),...extra});
 const relevant=request=>request.resourceType()==='document'||pathname(request.url()).endsWith('/core/supabase-config.js');
 page.on('request',request=>{if(relevant(request))record('request',request);});
 page.on('response',response=>{if(relevant(response.request()))record('response',response.request(),{status:response.status()});});
 page.on('requestfinished',request=>{if(relevant(request))record('requestfinished',request,{timing:request.timing()});});
 page.on('requestfailed',request=>{if(relevant(request))record('requestfailed',request,{failure:request.failure()});});
 page.on('framenavigated',frame=>{if(frame===page.mainFrame()&&frame.url().startsWith('http://127.0.0.1'))events.push({type:'document-navigation',time:Date.now(),path:pathname(frame.url())});});
});
test.afterEach(async({page},info)=>{
 const events=transportDiagnostics.get(page);if(!events)return;
 const start=Date.now();
 const health=await page.request.get('http://127.0.0.1:5621/index.html').then(response=>({status:response.status(),elapsedMs:Date.now()-start})).catch(error=>({connectionReset:error.message.includes('ECONNRESET'),elapsedMs:Date.now()-start}));
 await info.attach('local-transport-diagnosis',{body:Buffer.from(JSON.stringify({events,postTestServerHealth:health},null,2)),contentType:'application/json'});
});
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const image={name:'demonstracao.png',mimeType:'image/png',buffer:pixel};
async function healthy(page){expect(await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);}
async function next(page){await page.locator('[data-step-next]').click();}
async function createAd(page,title){
 await page.goto('/anunciar-servico.html');
 await page.locator('[name="adTitle"]').fill(title);
 await page.locator('[name="category"]').selectOption('Limpeza',{force:true});
 await page.locator('[name="specialty"]').fill('Limpeza residencial');
 await page.locator('[name="shortDescription"]').fill('Limpeza fictícia para testar o marketplace local.');
 await page.locator('[name="fullDescription"]').fill('Serviço fictício de limpeza residencial, com produtos e atendimento combinados por orçamento.');
 await next(page);
 await page.locator('[name="initialPrice"]').fill('150,00');
 await page.locator('[name="billingUnit"]').selectOption('Por serviço',{force:true});
 await page.locator('[name="serviceRegion"]').fill('Belo Horizonte, MG');
 await page.locator('[name="serviceMode"]').selectOption({label:'Presencial'},{force:true});
 await page.locator('[data-availability-day][value="monday"]').check();
 await next(page);
 await page.locator('[name="includedItems"]').fill('Mão de obra e limpeza básica ao final.');
 await next(page);
 await expect(page.locator('[data-post-service-page]')).toHaveAttribute('data-current-step','3');
 await page.locator('[name="mainImage"]').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('synthetic')});
 await next(page);
 await expect(page.locator('[name="mainImage"]')).toHaveAttribute('aria-invalid','true');
 await page.locator('[name="mainImage"]').setInputFiles(image);
 await expect(page.locator('[name="mainImage"]')).not.toHaveAttribute('aria-invalid','true');
 await next(page); await next(page);
 for(const button of await page.locator('.post-service-confirm [data-post-check]').all())if(await button.getAttribute('aria-pressed')!=='true')await button.click();
}
for (const viewport of [{width:1366,height:768},{width:820,height:1180},{width:390,height:844}]) {
 test(`integrated registration to notifications ${viewport.width}`,async({page},info)=>{
  test.setTimeout(240000);await page.setViewportSize(viewport);const errors=[];page.on('pageerror',e=>errors.push(e.message));const events=transportDiagnostics.get(page);const demo=await setup(page,{onboarding:true,observeTransport:events?event=>events.push(event):undefined});
  await page.goto('/index.html');
  const signup=await page.evaluate(async actor=>{
   const config=window.DOKE_SUPABASE_CONFIG,provider=window.DokeSupabase;let request;
   window.DOKE_SUPABASE_CONFIG={enabled:true,url:'https://synthetic.invalid',anonKey:'synthetic-anon'};
   window.DokeSupabase={...provider,getClient:()=>({auth:{signUp:async payload=>{request=payload;return{data:{user:{id:actor.id,email:actor.email,user_metadata:payload.options.data,app_metadata:{role:'client'}},session:null},error:null};}}})};
   try {const user=await DokeAuth.service.register({name:actor.name,email:actor.email,password:'Synthetic-test-123!',handle:'professional.synthetic'});return {id:user.id,pending:user.pendingConfirmation,requestRole:request.options.data.role||null};}
   finally {window.DOKE_SUPABASE_CONFIG=config;window.DokeSupabase=provider;}
  },candidate);
  expect(signup).toEqual({id:candidate.id,pending:true,requestRole:null});
  // Confirmation, verification and moderation are explicit synthetic backend steps.
  await demo.switchActor(candidate,'/tornar-profissional.html');
  await page.locator('[name="mainCategory"]').selectOption('Limpeza',{force:true});await page.locator('[name="experienceYears"]').selectOption('3 a 5 anos',{force:true});await page.locator('[name="specialties"]').fill('Limpeza residencial');await page.locator('[name="shortBio"]').fill('Perfil sintético de integração do marketplace completo.');await page.locator('[name="serviceRegion"]').fill('Belo Horizonte, MG');await next(page);
  await page.locator('[name="truthConfirmed"]').check();await page.locator('[name="termsAccepted"]').check();await next(page);
  await expect.poll(()=>page.evaluate(async()=> (await Doke.repositories.professionalProfiles.getByUserId(Doke.session.getCurrentUser().id))?.status)).toBe('pending_verification');
  expect(await page.evaluate(async()=>Doke.permissions.evaluateProfessionalAccess('publish_service',{user:Doke.session.getCurrentUser(),professionalProfile:await Doke.repositories.professionalProfiles.getByUserId(Doke.session.getCurrentUser().id)}).allowed)).toBe(false);
  await demo.approveProfile();await demo.switchActor(professional,'/perfil-profissional.html');
  const title='Integração P3 limpeza '+viewport.width;await createAd(page,title);await next(page);await expect(page.locator('[data-submit-state]')).toHaveAttribute('data-phase','success');
  const saved=demo.catalog().find(s=>s.title===title);expect(saved.moderationStatus).toBe('pending_review');
  await demo.switchActor(client,'/resultados.html?q='+encodeURIComponent(title));await expect(page.locator('[data-results-grid] a[href*="'+saved.id+'"]')).toHaveCount(0);
  await demo.switchActor(professional,'/perfil-profissional.html');await demo.approveService(saved.id);await demo.switchActor(client,'/resultados.html?q='+encodeURIComponent(title));
  await page.locator('[data-results-grid] a[href*="'+saved.id+'"]').first().click();await healthy(page);await page.locator('a[href*="orcamento"]:visible').first().click();await page.locator('[data-details-input]').fill('Pedido integrado sintético para o anúncio moderado nesta execução.');await next(page);await next(page);await page.locator('[data-step-submit]').click();await expect(page.locator('[data-budget-success]')).toBeVisible();const orderId=new URL(page.url()).searchParams.get('order');
  await demo.switchActor(professional,'/pedidos.html');await page.locator('[data-order-accept="'+orderId+'"]').click();const composer=page.locator('[data-messages-composer-input]');await expect(composer).toBeEnabled();await composer.fill('Mensagem integrada P3 '+viewport.width);await page.getByRole('button',{name:'Enviar mensagem',exact:true}).click();await expect(page.getByText('Mensagem integrada P3 '+viewport.width,{exact:true}).last()).toBeVisible();
  await demo.switchActor(client,'/mensagens.html?order='+orderId);await expect(page.getByText('Mensagem integrada P3 '+viewport.width,{exact:true}).last()).toBeVisible();await page.reload();await expect(page.getByText('Mensagem integrada P3 '+viewport.width,{exact:true}).last()).toBeVisible();await healthy(page);
  await page.goto('/notificacoes.html');const note=await page.evaluate(async id=>(await Doke.services.notifications.list({})).find(n=>n.orderId===id),orderId);expect(note?.userId).toBe(client.id);await expect(page.locator('[data-notification-id="'+note.id+'"]').first()).toBeVisible();await healthy(page);await page.screenshot({path:info.outputPath('notifications-'+viewport.width+'.png')});
  for(const route of ['/perfil.html','/comunidade.html','/ajuda.html','/index.html']){await page.goto(route);await page.locator('body').waitFor();await healthy(page);await page.screenshot({path:info.outputPath(route.slice(1,-5)+'-'+viewport.width+'.png')});}
  expect(errors).toEqual([]);
 });
}
