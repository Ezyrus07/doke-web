const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const {chromium}=require('@playwright/test');
const TARGET='assets/css/components/chat-composer.css';
const MANIFEST='assets/css/pages/chat-workspace-foundation.css';
const SHA=process.env.TARGET_SHA,BLOB=process.env.TARGET_BLOB;
const PAGES=[
  {page:'mensagens.html',foundation:'assets/css/pages/messaging-foundation.css',runtime:'assets/css/pages/messaging-runtime-chat.css',kind:'messages'},
  {page:'comunidade-interna.html',foundation:'assets/css/pages/comunidade-interna-foundation.css',runtime:'assets/css/pages/comunidade-interna-runtime-chat.css',kind:'community'}
];
const VIEWPORTS=[359,430,759,760,761,1024,1280,1440],STATES=['idle','focus'];
const sh=c=>cp.execSync(c,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const assert=(x,m)=>{if(!x)throw new Error(m)};
function parse(src){
  const lines=src.split(/\r?\n/);let depth=0,sp=[],ap=[],sel=null;const ds=[],stack=[];
  const re=/^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/,norm=p=>p.join(' ').replace(/\{\s*$/,'').replace(/\s+/g,' ').trim();
  for(let i=0;i<lines.length;i++){
    const line=lines[i],t=line.trim(),o=(line.match(/\{/g)||[]).length,c=(line.match(/\}/g)||[]).length;
    if(!sel){
      if(ap.length){if(t)ap.push(t);if(line.includes('{')){stack.push({type:'at',header:norm(ap),depthBefore:depth});ap=[];}}
      else if(t.startsWith('@')&&!t.includes(';')){if(line.includes('{'))stack.push({type:'at',header:norm([t]),depthBefore:depth});else ap=[t];}
      else if(sp.length){if(t)sp.push(t);if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}
      else if(t&&!t.startsWith('/*')&&!t.startsWith('*')&&t!=='*/'&&t!=='}'&&!t.startsWith('@')&&!line.includes(';')){sp=[t];if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}
    }
    if(sel){const m=line.match(re);if(m){const raw=m[2].trim(),important=/\s*!important\s*$/i.test(raw),context=stack.filter(x=>x.type==='at').map(x=>x.header).join(' || ');ds.push({line:i+1,selector:sel,property:m[1].toLowerCase(),value:raw,important,context});}}
    depth+=o-c;while(stack.length&&depth<=stack.at(-1).depthBefore){const p=stack.pop();if(p.type==='rule')sel=null;}
  }
  const last=new Map(),dead=[];
  for(let i=ds.length-1;i>=0;i--){const d=ds[i],k=`${d.context} >>> ${d.selector} >>> ${d.property}`,l=last.get(k);if(l&&(!d.important||l.important))dead.push({...d,winnerLine:l.line,winnerValue:l.value,winnerImportant:l.important});if(!l||d.important||!l.important)last.set(k,d);}
  return{declarations:ds,dead:dead.sort((a,b)=>a.line-b.line)};
}
function importsFor(file,tracked){const src=fs.readFileSync(file,'utf8'),out=[],re=/@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;let m;while((m=re.exec(src))){let v=m[1].replace(/\?.*$/,'').replace(/^\.\//,'');if(v.startsWith('/'))v=v.replace(/^\/+/, '');else if(!v.startsWith('assets/'))v=path.posix.normalize(path.posix.join(path.posix.dirname(file),v));if(tracked.has(v))out.push(v)}return out;}
function verifyReach(){
  const report=JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json','utf8'));
  const tracked=new Set(sh('git ls-files -z assets/css').split('\0').filter(f=>f.endsWith('.css')));
  const direct=[...tracked].filter(f=>importsFor(f,tracked).includes(TARGET)).sort();
  assert(JSON.stringify(direct)===JSON.stringify([MANIFEST]),`direct importer drift ${JSON.stringify(direct)}`);
  for(const p of PAGES){assert(importsFor(p.foundation,tracked).includes(p.runtime),`${p.page} foundation runtime drift`);assert(importsFor(p.runtime,tracked).includes(MANIFEST),`${p.page} runtime manifest drift`);assert(importsFor(MANIFEST,tracked).includes(TARGET),'manifest target missing');}
  const reached=[];for(const p of report.pageAssets){const seen=new Set(),todo=[...(p.css||[]).filter(f=>tracked.has(f))];let hit=false;while(todo.length){const f=todo.pop();if(seen.has(f)||!tracked.has(f))continue;seen.add(f);if(f===TARGET){hit=true;break;}for(const n of importsFor(f,tracked))todo.push(n);}if(hit)reached.push(p.page);}
  assert(JSON.stringify(reached.sort())===JSON.stringify(PAGES.map(x=>x.page).sort()),`active reach drift ${JSON.stringify(reached)}`);
  for(const p of PAGES){const html=fs.readFileSync(p.page,'utf8');for(const token of ['doke-chat-composer','doke-chat-composer__tools','doke-chat-composer__tool','doke-chat-composer__field','doke-chat-composer__send'])assert(html.includes(token),`${p.page} real DOM token missing ${token}`);}
  console.log(`STATIC REACH PASS|pages=${reached.sort().join(',')}|directImporter=${MANIFEST}|realDomPages=2|families=5`);
}
function verifyDead(p){
  const expected=[
    [8,'align-items','end',184,'center',''],[9,'gap','12px',182,'10px',''],[10,'padding','12px 22px calc(env(safe-area-inset-bottom, 0px) + 6px)',183,'8px 18px calc(env(safe-area-inset-bottom, 0px) + 6px)',''],
    [19,'gap','10px',189,'8px',''],[49,'width','20px',237,'18px',''],[50,'height','20px',238,'18px',''],[64,'min-height','56px',205,'44px',''],[66,'border-radius','var(--radius-surface)',206,'var(--radius-md)',''],
    [127,'gap','10px',248,'8px','@media (max-width: 760px)'],[128,'padding','10px 12px calc(env(safe-area-inset-bottom, 0px) + 8px)',249,'8px 10px calc(env(safe-area-inset-bottom, 0px) + 6px)','@media (max-width: 760px)'],
    [140,'width','50px',256,'40px','@media (max-width: 760px)'],[141,'height','var(--control-height-xl)',257,'40px','@media (max-width: 760px)'],[142,'min-width','50px',258,'40px','@media (max-width: 760px)'],[143,'min-height','var(--control-height-xl)',259,'40px','@media (max-width: 760px)'],[144,'border-radius','var(--radius-base)',260,'var(--radius-exact-13)','@media (max-width: 760px)']
  ];
  assert(p.declarations.length===140&&p.dead.length===15,`parse drift ${p.declarations.length}/${p.dead.length}`);
  assert(new Set(p.dead.map(d=>d.selector)).size===5,`family drift ${new Set(p.dead.map(d=>d.selector)).size}`);
  for(const e of expected){const d=p.dead.find(x=>x.line===e[0]);assert(d,`missing row ${e[0]}`);assert(d.property===e[1]&&d.value===e[2]&&d.winnerLine===e[3]&&d.winnerValue===e[4]&&d.context===e[5]&&!d.important&&!d.winnerImportant,`cascade drift ${e[0]} ${JSON.stringify(d)}`);}
  assert(p.dead.every(d=>d.value!==d.winnerValue),'unexpected identical winner');
  console.log('DEAD ROWS PASS|decl=140|dead=15|families=5|identical=0|changed=15|contexts=global8,max760=7');
}
function removeDead(p){
  const src=fs.readFileSync(TARGET,'utf8'),nl=/\r?\n$/.test(src),lines=src.split(/\r?\n/);if(nl&&lines.at(-1)==='')lines.pop();
  for(const d of [...p.dead].sort((a,b)=>b.line-a.line)){assert(lines[d.line-1]?.trim().startsWith(`${d.property}:`),`line mismatch ${d.line}`);lines.splice(d.line-1,1);}
  const out=lines.join('\n')+(nl?'\n':'');fs.writeFileSync(TARGET,out);
  const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/),after=parse(out);assert(stat[0]==='0'&&stat[1]==='15'&&stat[2]===TARGET,`diff drift ${stat.join(' ')}`);assert(after.declarations.length===125&&after.dead.length===0,`after drift ${after.declarations.length}/${after.dead.length}`);
  const hash=crypto.createHash('sha256').update(out).digest('hex'),bytes=Buffer.byteLength(out);
  console.log(`EPHEMERAL IDENTITY|sha256=${hash}|bytes=${bytes}`);console.log('EPHEMERAL DELTA PASS|file=chat-composer.css|additions=0|deletions=15|decl=140->125|dead=15->0');
}
async function prepare(page,spec,state){
  await page.evaluate(({kind,state})=>{
    document.querySelector('[data-doke-document-preloader]')?.remove();document.documentElement.classList.remove('doke-mobile-shell-pending');
    if(kind==='messages'){
      const root=document.querySelector('[data-messages-page]');if(root){root.removeAttribute('aria-busy');root.dataset.viewState='ready';root.hidden=false;}
      const sk=document.querySelector('[data-messages-hydration-skeleton]');if(sk)sk.hidden=true;
      document.querySelectorAll('[data-messages-hydration-ready]').forEach(el=>el.hidden=false);
      const form=document.querySelector('[data-messages-composer]');if(form)form.hidden=false;
    }else{
      const pending=document.querySelector('[data-community-room-pending]');if(pending)pending.hidden=true;
      const root=document.querySelector('[data-community-room]');if(root)root.hidden=false;
    }
    const input=document.querySelector('.doke-chat-composer__input');if(input){input.value=state==='focus'?'Mensagem de prova':'';if(state==='focus')input.focus();else input.blur();}
  },{kind:spec.kind,state});
}
async function captureOne(page,spec,state){return page.evaluate(({kind,state})=>{
  const round=n=>Math.round(n*1000)/1000,pick=sel=>{const el=document.querySelector(sel);if(!el)return null;const s=getComputedStyle(el),r=el.getBoundingClientRect();return{display:s.display,alignItems:s.alignItems,gap:s.gap,padding:s.padding,width:s.width,height:s.height,minWidth:s.minWidth,minHeight:s.minHeight,borderRadius:s.borderRadius,fontSize:s.fontSize,lineHeight:s.lineHeight,overflow:s.overflow,rect:[round(r.x),round(r.y),round(r.width),round(r.height)]};};
  const form=document.querySelector('.doke-chat-composer');const matches={form:Boolean(form),tools:Boolean(document.querySelector('.doke-chat-composer__tools')),tool:Boolean(document.querySelector('.doke-chat-composer__tool')),field:Boolean(document.querySelector('.doke-chat-composer__field')),send:Boolean(document.querySelector('.doke-chat-composer__send')),svg:Boolean(document.querySelector('.doke-chat-composer__tool svg, .doke-chat-composer__send svg'))};
  return{page:kind==='messages'?'mensagens.html':'comunidade-interna.html',state,matches,composer:pick('.doke-chat-composer'),tools:pick('.doke-chat-composer__tools'),tool:pick('.doke-chat-composer__tool'),send:pick('.doke-chat-composer__send'),field:pick('.doke-chat-composer__field'),svg:pick('.doke-chat-composer__tool svg, .doke-chat-composer__send svg'),input:pick('.doke-chat-composer__input'),doc:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth}};
},{kind:spec.kind,state});}
function verifyCoverage(snaps){const vals=Object.values(snaps);for(const s of vals){assert(s.matches&&Object.values(s.matches).every(Boolean),`real DOM family missing ${s.page}/${s.state} ${JSON.stringify(s.matches)}`);for(const k of ['composer','tools','tool','send','field','svg','input'])assert(s[k]!==null,`capture missing ${k} ${s.page}/${s.state}`);}console.log('RUNTIME FAMILY COVERAGE PASS|families=5/5|pages=2|source=real-static-dom');}
async function capture(browser,tag){const out={};let n=0;for(const spec of PAGES)for(const state of STATES)for(const width of VIEWPORTS){const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await ctx.newPage();await page.route('**/*',route=>{const u=new URL(route.request().url()),local=u.origin==='http://127.0.0.1:4173';if(local&&u.pathname.endsWith('.js'))return route.abort();if(local||u.protocol==='data:'||u.protocol==='blob:')return route.continue();return route.abort();});await page.goto(`http://127.0.0.1:4173/${spec.page}?ux057-${tag}-${state}-${width}`,{waitUntil:'domcontentloaded',timeout:20000});await prepare(page,spec,state);await page.waitForTimeout(40);const snap=await captureOne(page,spec,state);assert(snap.doc.scrollWidth<=snap.doc.clientWidth+1,`overflow ${tag} ${spec.page} ${state} ${width} ${JSON.stringify(snap.doc)}`);out[`${spec.page}:${state}:${width}`]=snap;n++;await ctx.close();}verifyCoverage(out);console.log(`RUNTIME CAPTURE|tag=${tag}|pages=2|states=2|viewports=${VIEWPORTS.join(',')}|samples=${n}|overflow=0`);return out;}
(async()=>{
  assert(SHA&&BLOB,'missing env');assert(sh('git rev-parse HEAD')===SHA,'wrong HEAD');assert(sh(`git hash-object ${TARGET}`)===BLOB,'blob drift');verifyReach();const parsed=parse(fs.readFileSync(TARGET,'utf8'));verifyDead(parsed);
  const server=cp.spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
  try{await new Promise(r=>setTimeout(r,700));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{const before=await capture(browser,'before');removeDead(parsed);const after=await capture(browser,'after');assert(JSON.stringify(before)===JSON.stringify(after),'runtime parity mismatch');console.log(`CASCADE RUNTIME PARITY PASS|runtimeDiffs=0|overflow=0|families=5/5|reachPages=2|states=2|viewports=${VIEWPORTS.length}|beforeSamples=${Object.keys(before).length}|afterSamples=${Object.keys(after).length}|boundary=759/760/761|staticCascadeRows=15|identicalWinners=0|changedWinners=15|r2Required=0`);}finally{await browser.close();}}
  finally{server.kill('SIGTERM');}
  sh(`git reset --hard ${SHA}`);sh('git clean -fdx');assert(sh('git rev-parse HEAD')===SHA&&sh(`git hash-object ${TARGET}`)===BLOB&&sh('git status --porcelain')==='','restore drift');console.log(`CHECKPOINT PASS|sha=${SHA}|productMutation=0|issueCreated=0|prCreated=0`);
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
