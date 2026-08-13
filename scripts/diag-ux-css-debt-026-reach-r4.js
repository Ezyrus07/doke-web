const cp=require('child_process');
const {chromium}=require(process.cwd()+'/node_modules/playwright');
const widths=[390,559,560,561,760,761,820,1366];
const needle='/assets/css/pages/pedidos/tablet-rail-contract.css';
const sel='body.orders-page-shell .orders-command-summary, body.orders-page-shell .orders-planner, body.orders-page-shell .orders-command-insights, body.orders-page-shell .orders-list, body.orders-page-shell .orders-empty';
const sleep=m=>new Promise(r=>setTimeout(r,m));
const zero=v=>/^0(?:px)?(?:\s+0(?:px)?)?$/.test(v.trim());
const auto=v=>/^auto(?:\s+auto)?$/.test(v.trim());
(async()=>{
 const srv=cp.spawn(process.execPath,['scripts/serve-static-site.js','--host=127.0.0.1','--port=5500'],{stdio:'ignore',env:{...process.env,DOKE_E2E_DISABLE_REMOTE_SERVICES:'1'}});
 try{
  await sleep(500); const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}); let active=0;
  for(const w of widths){
   const ctx=await browser.newContext({viewport:{width:w,height:900},reducedMotion:'reduce'}),page=await ctx.newPage();
   await page.route('**/*',route=>{const u=new URL(route.request().url()),local=u.origin==='http://127.0.0.1:5500';if(local&&u.pathname.endsWith('.js'))return route.abort();if(local||u.protocol==='data:'||u.protocol==='blob:')return route.continue();return route.abort();});
   await page.goto('http://127.0.0.1:5500/pedidos.html',{waitUntil:'domcontentloaded',timeout:15000});
   await page.addStyleTag({content:'html,body{visibility:visible!important;opacity:1!important}.doke-document-preloader,.doke-page-hydration-skeleton{display:none!important}'});
   const x=await page.evaluate(({sel,needle})=>{
    const canon=s=>(s||'').replace(/\s+/g,' ').replace(/\(\s+/g,'(').replace(/\s+\)/g,')').replace(/\s*,\s*/g,',').trim(),hits=[];
    function walk(rules,ctx,href){for(const r of [...rules]){const n=r.constructor?.name||'';if(n==='CSSImportRule'&&r.styleSheet){try{walk(r.styleSheet.cssRules,ctx,r.styleSheet.href||href)}catch{}}else if(n==='CSSMediaRule')walk(r.cssRules,[...ctx,`@media ${r.conditionText}`],href);else if(r.selectorText){for(const p of ['inline-size','width','max-inline-size','max-width','margin-inline']){const v=r.style.getPropertyValue(p);if(v)hits.push({selector:canon(r.selectorText),prop:p,value:v.trim(),priority:r.style.getPropertyPriority(p),ctx:ctx.join(' || '),href});}}}}
    for(const sh of [...document.styleSheets])try{walk(sh.cssRules,[],sh.href||'')}catch{}
    const nodes=[...document.querySelectorAll(sel)],visible=nodes.filter(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;});
    const details=visible.map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return{w:r.width,h:r.height,inlineSize:s.inlineSize,width:s.width,ml:s.marginLeft,mr:s.marginRight}});
    return{total:nodes.length,visible:visible.length,details,media:matchMedia('(max-width: 560px)').matches,hits:hits.filter(z=>String(z.href).includes(needle)&&z.ctx==='@media (max-width: 560px)'&&z.selector===canon(sel)),doc:[document.documentElement.scrollWidth,document.documentElement.clientWidth,document.body.scrollWidth,document.body.clientWidth]};
   },{sel,needle});
   if(x.total!==8||x.visible<1)throw new Error(`DOM ${w} ${x.total}/${x.visible}`);
   for(const p of ['inline-size','width','max-inline-size','max-width']){const a=x.hits.filter(z=>z.prop===p).map(z=>z.value);if(a.length!==2||a[0]!=='100%'||a[1]!=='var(--doke-orders-phone-surface-rail)')throw new Error(`CSSOM ${w} ${p} ${JSON.stringify(a)}`);}
   const m=x.hits.filter(z=>z.prop==='margin-inline').map(z=>z.value);if(m.length!==2||!zero(m[0])||!auto(m[1]))throw new Error(`MARGIN ${w} ${JSON.stringify(m)}`);
   if(x.hits.some(z=>z.priority!==''))throw new Error(`priority ${w}`);
   if(x.media){active++;for(const d of x.details){if(!(d.w>0&&d.h>0))throw new Error(`geometry ${w}`);const ml=parseFloat(d.ml),mr=parseFloat(d.mr);if(!Number.isFinite(ml)||!Number.isFinite(mr)||Math.abs(ml-mr)>1.1)throw new Error(`center ${w} ${d.ml}/${d.mr}`);}}
   if(x.doc[0]>x.doc[1]+1||x.doc[2]>x.doc[3]+1)throw new Error(`overflow ${w} ${x.doc}`);
   console.log(`VIEWPORT PASS|w=${w}|active=${x.media}|total=${x.total}|visible=${x.visible}|margin=${m.join('>')}`); await ctx.close();
  }
  await browser.close(); if(active!==3)throw new Error(`boundary ${active}`); console.log('RUNTIME REACH PASS|viewports=8|boundary=560/561|total=8|cssom=2+2+2+2+2|geometry=valid|overflow=0');
 } finally {srv.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exit(1)});
