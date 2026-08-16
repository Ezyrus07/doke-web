const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const {chromium}=require('@playwright/test');

const TARGET='assets/css/pages/pedidos/orders-details.css';
const TARGET_SHA=process.env.TARGET_SHA;
const TARGET_BLOB=process.env.TARGET_BLOB;
const PAGES=[
  {page:'pedidos.html',foundation:'assets/css/pages/pedidos-foundation.css',runtime:'assets/css/pages/pedidos-runtime-operations.css',script:'assets/js/pages/pedidos/orders-details.js',kind:'orders',dataAttr:'data-orders-detail-layer'},
  {page:'mensagens.html',foundation:'assets/css/pages/messaging-foundation.css',runtime:'assets/css/pages/messaging-runtime-chat.css',script:'assets/js/pages/mensagens.js',kind:'messages',dataAttr:'data-messages-order-detail-layer'}
];
const DIRECT_IMPORTERS=['assets/css/pages/messaging-runtime-chat.css','assets/css/pages/pedidos-runtime-operations.css'];
const VIEWPORTS=[359,430,759,760,761,1024,1280,1440];
const STATES=['closed','open'];
const EXPECTED_FAMILIES=new Set([
  'body:is(.orders-page-shell, .messages-page-shell) .orders-detail-actions',
  'body:is(.orders-page-shell, .messages-page-shell) .orders-detail-actions__button',
  'body:is(.orders-page-shell, .messages-page-shell) .orders-detail-drawer__body',
  'body:is(.orders-page-shell, .messages-page-shell) .orders-detail-drawer__title',
  'body:is(.orders-page-shell, .messages-page-shell) .orders-detail-drawer__header',
  'body:is(.orders-page-shell, .messages-page-shell) .orders-detail-drawer',
  'body:is(.orders-page-shell, .messages-page-shell) .orders-detail-layer',
  'body:is(.orders-page-shell, .messages-page-shell) .orders-detail-row',
  'body:is(.orders-page-shell, .messages-page-shell) .orders-detail-list'
]);
const sh=cmd=>cp.execSync(cmd,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

function parse(src){
  const lines=src.split(/\r?\n/);let depth=0,sp=[],ap=[],sel=null;const ds=[],stack=[],re=/^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/,norm=p=>p.join(' ').replace(/\{\s*$/,'').replace(/\s+/g,' ').trim();
  for(let i=0;i<lines.length;i++){
    const line=lines[i],t=line.trim(),o=(line.match(/\{/g)||[]).length,c=(line.match(/\}/g)||[]).length;
    if(!sel){
      if(ap.length){if(t)ap.push(t);if(line.includes('{')){stack.push({type:'at',header:norm(ap),depthBefore:depth});ap=[];}}
      else if(t.startsWith('@')&&!t.includes(';')){if(line.includes('{'))stack.push({type:'at',header:norm([t]),depthBefore:depth});else ap=[t];}
      else if(sp.length){if(t)sp.push(t);if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}
      else if(t&&!t.startsWith('/*')&&!t.startsWith('*')&&t!=='*/'&&t!=='}'&&!t.startsWith('@')&&!line.includes(';')){sp=[t];if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}
    }
    if(sel){const m=line.match(re);if(m){const raw=m[2].trim(),important=/\s*!important\s*$/i.test(raw),context=stack.filter(x=>x.type==='at').map(x=>x.header).join(' || ');ds.push({line:i+1,selector:sel,property:m[1].toLowerCase(),value:raw,important,context});}}
    depth+=o-c;while(stack.length&&depth<=stack[stack.length-1].depthBefore){const p=stack.pop();if(p.type==='rule')sel=null;}
  }
  const last=new Map(),dead=[];
  for(let i=ds.length-1;i>=0;i--){const d=ds[i],k=`${d.context} >>> ${d.selector} >>> ${d.property}`,l=last.get(k);if(l&&(!d.important||l.important))dead.push({...d,winnerLine:l.line,winnerValue:l.value,winnerImportant:l.important});if(!l||d.important||!l.important)last.set(k,d);}
  return{declarations:ds,dead:dead.sort((a,b)=>a.line-b.line)};
}
function importsFor(file,tracked){const src=fs.readFileSync(file,'utf8'),out=[],re=/@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;let m;while((m=re.exec(src))){let v=m[1].replace(/\?.*$/,'').replace(/^\.\//,'');if(v.startsWith('/'))v=v.replace(/^\/+/, '');else if(!v.startsWith('assets/'))v=path.posix.normalize(path.posix.join(path.posix.dirname(file),v));if(tracked.has(v))out.push(v);}return out;}
function verifyReach(){
  const report=JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json','utf8'));
  const tracked=new Set(sh('git ls-files -z assets/css').split('\0').filter(f=>f.endsWith('.css')));
  const direct=[...tracked].filter(f=>importsFor(f,tracked).includes(TARGET)).sort();
  assert(JSON.stringify(direct)===JSON.stringify([...DIRECT_IMPORTERS].sort()),`direct importer drift ${JSON.stringify(direct)}`);
  for(const p of PAGES){
    assert(importsFor(p.foundation,tracked).includes(p.runtime),`${p.page} foundation runtime drift`);
    assert(importsFor(p.runtime,tracked).includes(TARGET),`${p.page} runtime target drift`);
    const html=fs.readFileSync(p.page,'utf8');
    const foundationBase=path.posix.basename(p.foundation).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    assert((html.match(new RegExp(`assets/css/pages/${foundationBase}\\?v=`,'g'))||[]).length===1,`${p.page} foundation link drift`);
    const scriptBase=p.script.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    assert((html.match(new RegExp(scriptBase.replace('assets\\/','assets/'),'g'))||[]).length===1,`${p.page} script link drift`);
    const js=fs.readFileSync(p.script,'utf8');
    const authorityTokens=['orders-detail-layer','orders-detail-drawer','orders-detail-drawer__header','orders-detail-drawer__title','orders-detail-drawer__body','orders-detail-list','orders-detail-row','orders-detail-actions','orders-detail-actions__button'];
    for(const token of authorityTokens)assert(js.includes(token),`${p.page} JS authority missing ${token}`);
    assert(js.includes(p.dataAttr),`${p.page} JS data authority missing ${p.dataAttr}`);
  }
  const reached=[];
  for(const p of report.pageAssets){const seen=new Set(),stack=[...(p.css||[]).filter(f=>tracked.has(f))];let hit=false;while(stack.length){const f=stack.pop();if(seen.has(f)||!tracked.has(f))continue;seen.add(f);if(f===TARGET){hit=true;break;}for(const n of importsFor(f,tracked))stack.push(n);}if(hit)reached.push(p.page);}
  assert(JSON.stringify(reached.sort())===JSON.stringify(PAGES.map(p=>p.page).sort()),`active reach drift ${JSON.stringify(reached)}`);
  console.log(`STATIC REACH PASS|pages=${reached.sort().join(',')}|directImporters=${direct.join(',')}|runtimes=${PAGES.map(p=>p.runtime).join(',')}|target=${TARGET}|runtimeAuthorities=2`);
}
function verifyDead(parsed){
  assert(parsed.declarations.length===665,`declaration drift ${parsed.declarations.length}`);
  assert(parsed.dead.length===33,`dead drift ${parsed.dead.length}`);
  const families=new Set(parsed.dead.map(d=>d.selector));assert(families.size===9,`family drift ${families.size}`);for(const f of EXPECTED_FAMILIES)assert(families.has(f),`missing family ${f}`);
  const contexts={global:0,max760:0};for(const d of parsed.dead){if(d.context==='')contexts.global++;else if(d.context==='@media (max-width: 760px)')contexts.max760++;else throw new Error(`unexpected context ${d.context}`);assert(d.winnerLine>d.line,`winner order ${d.line}`);assert(!d.important&&!d.winnerImportant,`important drift ${d.line}`);}
  assert(contexts.global===15&&contexts.max760===18,`context counts ${JSON.stringify(contexts)}`);
  const identical=parsed.dead.filter(d=>d.value===d.winnerValue&&d.important===d.winnerImportant).length;assert(identical===6,`identical drift ${identical}`);assert(parsed.dead.length-identical===27,`changed drift ${parsed.dead.length-identical}`);
  console.log(`DEAD ROWS PASS|decl=665|dead=33|families=9|identical=6|changed=27|contexts=global15,max760=18|lines=${parsed.dead.map(d=>d.line).join(',')}`);
}
function removeDead(parsed){
  const src=fs.readFileSync(TARGET,'utf8'),finalNewline=/\r?\n$/.test(src);const lines=src.split(/\r?\n/);if(finalNewline&&lines.at(-1)==='')lines.pop();
  for(const d of [...parsed.dead].sort((a,b)=>b.line-a.line)){const line=lines[d.line-1];assert(line&&line.trim().startsWith(`${d.property}:`),`line mismatch ${d.line}: ${line}`);lines.splice(d.line-1,1);}
  fs.writeFileSync(TARGET,lines.join('\n')+(finalNewline?'\n':''));
  const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);assert(stat[0]==='0'&&stat[1]==='33'&&stat[2]===TARGET,`unexpected diff ${stat.join(' ')}`);
  const after=parse(fs.readFileSync(TARGET,'utf8'));assert(after.declarations.length===632,`after declarations ${after.declarations.length}`);assert(after.dead.length===0,`after dead ${after.dead.length}`);
  console.log('EPHEMERAL DELTA PASS|file=orders-details.css|additions=0|deletions=33|decl=665->632|dead=33->0');
}
function drawerMarkup(spec){
  const data=spec.kind==='orders'?'data-orders-detail-layer="true"':'data-messages-order-detail-layer="true"';
  return `<aside class="orders-detail-layer" ${data} aria-hidden="false"><button class="orders-detail-backdrop" type="button"></button><section class="orders-detail-drawer" role="dialog" tabindex="-1"><header class="orders-detail-drawer__header"><div class="orders-detail-drawer__header-top"><span class="orders-detail-drawer__eyebrow">Detalhes do pedido</span><button type="button">×</button></div><div><h2 class="orders-detail-drawer__title">Limpeza residencial completa</h2><p class="orders-detail-drawer__subtitle">Profissional Doke • Centro</p></div><div class="orders-detail-statusbar"><span class="orders-detail-pill">Em andamento</span></div></header><div class="orders-detail-drawer__body"><section class="orders-detail-section"><span class="orders-detail-section__eyebrow">Visão geral</span><dl class="orders-detail-list"><div class="orders-detail-row"><dt>Profissional</dt><dd>Maria Silva</dd></div><div class="orders-detail-row"><dt>Local</dt><dd>Rua Exemplo, 123</dd></div><div class="orders-detail-row"><dt>Orçamento</dt><dd>R$ 480,00</dd></div></dl></section></div><footer class="orders-detail-actions"><button class="orders-detail-actions__button doke-btn doke-btn--primary" type="button">Abrir conversa</button><button class="orders-detail-actions__button doke-btn doke-btn--ghost" type="button">Fechar</button></footer></section></aside>`;
}
async function prepare(page,spec,state){
  await page.evaluate(({kind,state,html})=>{
    document.querySelector('[data-doke-document-preloader]')?.remove();document.documentElement.removeAttribute('data-auth-guard');document.documentElement.classList.remove('doke-mobile-shell-pending');document.body.removeAttribute('aria-busy');
    document.querySelectorAll('[data-orders-detail-layer],[data-messages-order-detail-layer]').forEach(el=>el.remove());document.body.insertAdjacentHTML('beforeend',html);
    const layer=document.querySelector(kind==='orders'?'[data-orders-detail-layer]':'[data-messages-order-detail-layer]');layer.hidden=false;layer.classList.toggle('is-open',state==='open');document.body.classList.toggle('orders-detail-open',state==='open');
    const style=document.createElement('style');style.dataset.ux045Proof='true';style.textContent='*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}';document.head.appendChild(style);
  },{kind:spec.kind,state,html:drawerMarkup(spec)});
}
async function captureOne(page,spec,state){return page.evaluate(({kind,state})=>{const round=n=>Math.round(n*1000)/1000;const pick=sel=>{const el=document.querySelector(sel);if(!el)return null;const s=getComputedStyle(el),r=el.getBoundingClientRect();return{display:s.display,position:s.position,pointerEvents:s.pointerEvents,justifyItems:s.justifyItems,alignItems:s.alignItems,width:s.width,minWidth:s.minWidth,maxWidth:s.maxWidth,height:s.height,minHeight:s.minHeight,maxHeight:s.maxHeight,gridTemplateColumns:s.gridTemplateColumns,gap:s.gap,padding:s.padding,overflow:s.overflow,overflowX:s.overflowX,overflowY:s.overflowY,border:s.border,borderRadius:s.borderRadius,backgroundImage:s.backgroundImage,backgroundColor:s.backgroundColor,boxShadow:s.boxShadow,transform:s.transform,opacity:s.opacity,fontSize:s.fontSize,rect:[round(r.x),round(r.y),round(r.width),round(r.height)]};};const layerSel=kind==='orders'?'[data-orders-detail-layer]':'[data-messages-order-detail-layer]';const body=getComputedStyle(document.body);return{page:kind==='orders'?'pedidos.html':'mensagens.html',state,bodyOpen:document.body.classList.contains('orders-detail-open'),panelWidth:body.getPropertyValue('--orders-panel-width').trim(),layer:pick(layerSel),drawer:pick(`${layerSel} .orders-detail-drawer`),header:pick(`${layerSel} .orders-detail-drawer__header`),title:pick(`${layerSel} .orders-detail-drawer__title`),body:pick(`${layerSel} .orders-detail-drawer__body`),list:pick(`${layerSel} .orders-detail-list`),row:pick(`${layerSel} .orders-detail-row`),actions:pick(`${layerSel} .orders-detail-actions`),button:pick(`${layerSel} .orders-detail-actions__button`),doc:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth}};},{kind:spec.kind,state});}
async function capture(browser,tag){const out={};let samples=0;for(const spec of PAGES){for(const state of STATES){for(const width of VIEWPORTS){const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();await page.route('**/*',route=>{const u=new URL(route.request().url());const local=u.origin==='http://127.0.0.1:4173';if(local&&u.pathname.endsWith('.js'))return route.abort();if(local||u.protocol==='data:'||u.protocol==='blob:')return route.continue();return route.abort();});await page.goto(`http://127.0.0.1:4173/${spec.page}?ux045-${tag}-${state}-${width}`,{waitUntil:'domcontentloaded',timeout:20000});await prepare(page,spec,state);await page.waitForTimeout(25);const snap=await captureOne(page,spec,state);assert(snap.layer&&snap.drawer&&snap.header&&snap.title&&snap.body&&snap.list&&snap.row&&snap.actions&&snap.button,`missing family runtime ${tag} ${spec.page} ${state} ${width}`);assert(snap.doc.scrollWidth<=snap.doc.clientWidth+1,`horizontal overflow ${tag} ${spec.page} ${state} ${width} ${JSON.stringify(snap.doc)}`);out[`${spec.page}:${state}:${width}`]=snap;samples++;await context.close();}}}console.log(`RUNTIME CAPTURE|tag=${tag}|pages=2|states=${STATES.length}|viewports=${VIEWPORTS.join(',')}|samples=${samples}|overflow=0`);return out;}

(async()=>{
  assert(TARGET_SHA&&TARGET_BLOB,'missing env');assert(sh('git rev-parse HEAD')===TARGET_SHA,'wrong HEAD');assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'target blob drift');verifyReach();const parsed=parse(fs.readFileSync(TARGET,'utf8'));verifyDead(parsed);
  const server=cp.spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
  try{await new Promise(r=>setTimeout(r,700));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{const before=await capture(browser,'before');removeDead(parsed);const after=await capture(browser,'after');assert(JSON.stringify(before)===JSON.stringify(after),'runtime parity mismatch');console.log(`CASCADE RUNTIME PARITY PASS|runtimeDiffs=0|overflow=0|families=9/9|reachPages=2|states=2|viewports=${VIEWPORTS.length}|samples=${Object.keys(before).length}|boundary=759/760/761|staticCascadeRows=33|identicalWinners=6|changedWinners=27`);}finally{await browser.close();}}
  finally{server.kill('SIGTERM');}
  sh(`git reset --hard ${TARGET_SHA}`);sh('git clean -fdx');assert(sh('git rev-parse HEAD')===TARGET_SHA,'restore HEAD drift');assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'restore blob drift');assert(sh('git status --porcelain')==='','restore dirty');console.log(`CHECKPOINT PASS|sha=${TARGET_SHA}|productMutation=0|issueCreated=0|prCreated=0`);
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
