const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const { chromium }=require('@playwright/test');

const TARGET='assets/css/pages/chat-sidebar-controls.css';
const TARGET_SHA=process.env.TARGET_SHA;
const TARGET_BLOB=process.env.TARGET_BLOB;
const SINGLE='assets/css/pages/chat-sidebar-single-list.css';
const PAGES=[
  {page:'mensagens.html',bodyPage:'mensagens',foundation:'assets/css/pages/messaging-foundation.css',runtime:'assets/css/pages/messaging-runtime-chat.css',states:['normal','empty']},
  {page:'comunidade-interna.html',bodyPage:'comunidade-interna',foundation:'assets/css/pages/comunidade-interna-foundation.css',runtime:'assets/css/pages/comunidade-interna-runtime-chat.css',states:['normal','empty']}
];
const VIEWPORTS=[1023,1024,1025,1280,1440];
const sh=(cmd)=>cp.execSync(cmd,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

function parse(src){
  const lines=src.split(/\r?\n/);let depth=0,sp=[],ap=[],sel=null;const ds=[],stack=[];
  const re=/^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/;
  const norm=p=>p.join(' ').replace(/\{\s*$/,'').replace(/\s+/g,' ').trim();
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

function importsFor(file,tracked){
  const src=fs.readFileSync(file,'utf8'),out=[];const re=/@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;let m;
  while((m=re.exec(src))){let v=m[1].replace(/\?.*$/,'').replace(/^\.\//,'');if(v.startsWith('/'))v=v.replace(/^\/+/, '');else if(!v.startsWith('assets/'))v=path.posix.normalize(path.posix.join(path.posix.dirname(file),v));if(tracked.has(v))out.push(v);}
  return out;
}

function verifyReach(){
  const report=JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json','utf8'));
  const tracked=new Set(sh('git ls-files -z assets/css').split('\0').filter(f=>f.endsWith('.css')));
  const direct=[...tracked].filter(f=>importsFor(f,tracked).includes(TARGET)).sort();
  const expected=PAGES.map(p=>p.runtime).sort();
  assert(JSON.stringify(direct)===JSON.stringify(expected),`target importer drift ${JSON.stringify(direct)}`);
  for(const p of PAGES){
    const imports=importsFor(p.runtime,tracked);const ti=imports.indexOf(TARGET),si=imports.indexOf(SINGLE);
    assert(ti>=0&&si>ti,`${p.page} target/single-list import order drift ${ti}/${si}`);
    assert(importsFor(p.foundation,tracked).includes(p.runtime),`${p.page} foundation->runtime drift`);
    const html=fs.readFileSync(p.page,'utf8');const basename=path.posix.basename(p.foundation).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    assert((html.match(new RegExp(`assets/css/pages/${basename}\\?v=`,'g'))||[]).length===1,`${p.page} foundation link drift`);
    assert(html.includes('chat-sidebar-scroll-region'),`${p.page} target selector root missing`);
  }
  const reached=[];for(const p of report.pageAssets){const seen=new Set(),stack=[...(p.css||[]).filter(f=>tracked.has(f))];let hit=false;while(stack.length){const f=stack.pop();if(seen.has(f)||!tracked.has(f))continue;seen.add(f);if(f===TARGET){hit=true;break;}for(const n of importsFor(f,tracked))stack.push(n);}if(hit)reached.push(p.page);}
  assert(JSON.stringify(reached.sort())===JSON.stringify(PAGES.map(p=>p.page).sort()),`active reach drift ${JSON.stringify(reached)}`);
  const single=fs.readFileSync(SINGLE,'utf8');assert(single.includes('grid-template-rows: minmax(0, 1fr);'),'single-list final row authority drift');
  console.log(`STATIC REACH PASS|pages=${reached.sort().join(',')}|importers=${expected.join(',')}|targetBeforeSingleList=1|singleListAuthority=minmax(0,1fr)`);
}

function verifyDead(parsed){
  assert(parsed.declarations.length===134,`declaration drift ${parsed.declarations.length}`);assert(parsed.dead.length===2,`dead drift ${parsed.dead.length}`);
  const expected=[
    {selector:'body[data-page="mensagens"] .chat-sidebar-scroll-region',value:'minmax(0, 1fr) minmax(0, 0.72fr)',winner:'minmax(252px, 1fr) minmax(236px, 0.96fr)'},
    {selector:'body[data-page="comunidade-interna"] .chat-sidebar-scroll-region',value:'minmax(0, 1fr) minmax(104px, 0.38fr)',winner:'minmax(300px, 1fr) minmax(224px, 0.8fr)'}
  ];
  for(let i=0;i<2;i++){const d=parsed.dead[i],e=expected[i];assert(d.selector===e.selector,`selector ${i} drift ${d.selector}`);assert(d.property==='grid-template-rows',`property ${i} drift`);assert(d.value===e.value&&!d.important,`value ${i} drift ${d.value}`);assert(d.context==='@media (min-width: 1024px)',`context ${i} drift ${d.context}`);assert(d.winnerValue===e.winner&&!d.winnerImportant,`winner ${i} drift ${d.winnerValue}`);assert(d.winnerLine>d.line,`winner order ${i}`);}
  console.log(`DEAD ROWS PASS|decl=134|dead=2|families=2|context=min-width:1024|identical=0|changed=2|lines=${parsed.dead.map(d=>d.line).join(',')}|winnerLines=${parsed.dead.map(d=>d.winnerLine).join(',')}`);
}

function removeDead(parsed){
  const src=fs.readFileSync(TARGET,'utf8'),finalNewline=/\r?\n$/.test(src);const lines=src.split(/\r?\n/);if(finalNewline&&lines.at(-1)==='')lines.pop();
  for(const d of [...parsed.dead].sort((a,b)=>b.line-a.line)){const line=lines[d.line-1];assert(line&&line.trim().startsWith('grid-template-rows:'),`line mismatch ${d.line}: ${line}`);lines.splice(d.line-1,1);}
  fs.writeFileSync(TARGET,lines.join('\n')+(finalNewline?'\n':''));
  const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);assert(stat[0]==='0'&&stat[1]==='2'&&stat[2]===TARGET,`unexpected diff ${stat.join(' ')}`);
  const after=parse(fs.readFileSync(TARGET,'utf8'));assert(after.declarations.length===132,`after declarations ${after.declarations.length}`);assert(after.dead.length===0,`after dead ${after.dead.length}`);
  console.log('EPHEMERAL DELTA PASS|file=chat-sidebar-controls.css|additions=0|deletions=2|decl=134->132|dead=2->0');
}

async function prepareState(page,spec,state){
  await page.evaluate(({spec,state})=>{
    document.querySelector('[data-doke-document-preloader]')?.remove();document.documentElement.classList.remove('doke-mobile-shell-pending');document.body.dataset.page=spec.bodyPage;
    if(spec.bodyPage==='mensagens'){
      const root=document.querySelector('[data-messages-page]');if(!root)throw new Error('messages root missing');root.removeAttribute('aria-busy');root.dataset.viewState='ready';
      const skeleton=document.querySelector('[data-messages-hydration-skeleton]');if(skeleton)skeleton.hidden=true;
      document.querySelectorAll('[data-messages-hydration-ready]').forEach(el=>el.hidden=false);
      const sidebar=document.querySelector('.messages-sidebar');if(!sidebar)throw new Error('messages sidebar missing');sidebar.hidden=false;
      const empty=document.querySelector('.messages-empty');if(!empty)throw new Error('messages empty missing');
      root.classList.toggle('messages-app--empty-results',state==='empty');empty.hidden=state!=='empty';
    } else {
      const pending=document.querySelector('[data-community-room-pending]');if(pending)pending.hidden=true;
      const root=document.querySelector('[data-community-room]');if(!root)throw new Error('community root missing');root.hidden=false;
      const empty=document.querySelector('.community-room-empty');if(!empty)throw new Error('community empty missing');empty.hidden=state!=='empty';
      const list=document.querySelector('.community-room-channel-list');if(!list)throw new Error('community list missing');
      [...list.children].forEach(el=>el.hidden=state==='empty');
    }
    const region=document.querySelector('.chat-sidebar-scroll-region');if(!region)throw new Error('sidebar scroll region missing');
  },{spec,state});
}

async function capture(browser,tag){
  const out={};let samples=0;
  for(const spec of PAGES){for(const state of spec.states){for(const width of VIEWPORTS){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();
    await page.route('**/*',route=>{const u=new URL(route.request().url());const local=u.origin==='http://127.0.0.1:4173';if(local&&u.pathname.endsWith('.js'))return route.abort();if(local||u.protocol==='data:'||u.protocol==='blob:')return route.continue();return route.abort();});
    await page.goto(`http://127.0.0.1:4173/${spec.page}?ux041-${tag}-${state}-${width}`,{waitUntil:'domcontentloaded',timeout:20000});await prepareState(page,spec,state);await page.waitForTimeout(30);
    const snap=await page.evaluate(({spec,state})=>{
      const round=n=>Math.round(n*1000)/1000,region=document.querySelector('.chat-sidebar-scroll-region');if(!region)throw new Error('region missing');
      const cs=getComputedStyle(region),r=region.getBoundingClientRect();const childSelectors=spec.bodyPage==='mensagens'?['.messages-block--orders','.messages-block--contacts','.messages-empty']:['.community-room-channel-list','.community-room-empty'];
      const children=childSelectors.map(selector=>{const el=document.querySelector(selector);if(!el)return{selector,missing:true};const s=getComputedStyle(el),x=el.getBoundingClientRect();return{selector,hidden:el.hidden,display:s.display,overflowY:s.overflowY,rect:[round(x.x),round(x.y),round(x.width),round(x.height)]};});
      return{page:spec.page,state,props:{display:cs.display,gridTemplateRows:cs.gridTemplateRows,gridAutoRows:cs.gridAutoRows,gap:cs.gap,rowGap:cs.rowGap,alignContent:cs.alignContent,overflow:cs.overflow},rect:[round(r.x),round(r.y),round(r.width),round(r.height)],children,doc:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth}};
    },{spec,state});
    assert(snap.doc.scrollWidth<=snap.doc.clientWidth+1,`horizontal overflow ${tag} ${spec.page} ${state} ${width} ${JSON.stringify(snap.doc)}`);
    out[`${spec.page}:${state}:${width}`]=snap;samples++;await context.close();
  }}}
  console.log(`RUNTIME CAPTURE|tag=${tag}|states=4|viewports=${VIEWPORTS.join(',')}|samples=${samples}|overflow=0`);return out;
}

(async()=>{
  assert(TARGET_SHA&&TARGET_BLOB,'missing env');assert(sh('git rev-parse HEAD')===TARGET_SHA,'wrong HEAD');assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'target blob drift');
  verifyReach();const parsed=parse(fs.readFileSync(TARGET,'utf8'));verifyDead(parsed);
  const server=cp.spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
  try{await new Promise(r=>setTimeout(r,700));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    try{const before=await capture(browser,'before');removeDead(parsed);const after=await capture(browser,'after');assert(JSON.stringify(before)===JSON.stringify(after),'runtime parity mismatch');console.log(`CASCADE RUNTIME PARITY PASS|runtimeDiffs=0|overflow=0|families=2/2|pages=2|states=4|viewports=${VIEWPORTS.length}|samples=${Object.keys(before).length}|boundary=1023/1024/1025|staticCascadeRows=2|laterSingleListAuthority=covered`);}finally{await browser.close();}
  }finally{server.kill('SIGTERM');}
  sh(`git reset --hard ${TARGET_SHA}`);sh('git clean -fdx');assert(sh('git rev-parse HEAD')===TARGET_SHA,'restore HEAD drift');assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'restore blob drift');assert(sh('git status --porcelain')==='','restore dirty');console.log(`CHECKPOINT PASS|sha=${TARGET_SHA}|productMutation=0|issueCreated=0|prCreated=0`);
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
