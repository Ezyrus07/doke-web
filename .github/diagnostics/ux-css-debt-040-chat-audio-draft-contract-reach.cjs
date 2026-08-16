const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const { chromium }=require('@playwright/test');

const TARGET='assets/css/pages/chat-audio-draft-contract.css';
const TARGET_SHA=process.env.TARGET_SHA;
const TARGET_BLOB=process.env.TARGET_BLOB;
const PAGES=[
  {
    page:'mensagens.html',
    bodyPage:'mensagens',
    foundation:'assets/css/pages/messaging-foundation.css',
    runtime:'assets/css/pages/messaging-runtime-chat.css',
    composer:'.messages-composer',
    audio:'.messages-audio-draft',
    attachment:'.messages-image-draft'
  },
  {
    page:'comunidade-interna.html',
    bodyPage:'comunidade-interna',
    foundation:'assets/css/pages/comunidade-interna-foundation.css',
    runtime:'assets/css/pages/comunidade-interna-runtime-chat.css',
    composer:'.community-room-composer',
    audio:'.community-audio-draft',
    attachment:'.community-room-attachment-draft'
  }
];
const VIEWPORTS=[359,390,430,759,760,761,1024,1280];
const STATES=['base','audio','attachment'];

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
  const direct=[];for(const f of tracked)if(importsFor(f,tracked).includes(TARGET))direct.push(f);direct.sort();
  const expected=PAGES.map(p=>p.runtime).sort();
  assert(JSON.stringify(direct)===JSON.stringify(expected),`target importer drift ${JSON.stringify(direct)}`);
  for(const p of PAGES){
    assert(importsFor(p.foundation,tracked).includes(p.runtime),`${p.page} foundation->runtime drift`);
    const html=fs.readFileSync(p.page,'utf8');
    const basename=path.posix.basename(p.foundation).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re=new RegExp(`assets/css/pages/${basename}\\?v=`,'g');
    assert((html.match(re)||[]).length===1,`${p.page} foundation link drift`);
  }
  const pages=[];
  for(const p of report.pageAssets){const seen=new Set(),stack=[...(p.css||[]).filter(f=>tracked.has(f))];let hit=false;while(stack.length){const f=stack.pop();if(seen.has(f)||!tracked.has(f))continue;seen.add(f);if(f===TARGET){hit=true;break;}for(const n of importsFor(f,tracked))stack.push(n);}if(hit)pages.push(p.page);}
  const expectedPages=PAGES.map(p=>p.page).sort();
  assert(JSON.stringify(pages.sort())===JSON.stringify(expectedPages),`active reach drift ${JSON.stringify(pages)}`);
  console.log(`STATIC REACH PASS|pages=${expectedPages.join(',')}|importers=${expected.join(',')}|target=${TARGET}`);
}

function verifyDead(parsed){
  assert(parsed.declarations.length===455,`declarations drift ${parsed.declarations.length}`);
  assert(parsed.dead.length===1,`dead drift ${parsed.dead.length}`);
  const d=parsed.dead[0];
  const expectedSelector='body:is([data-page="mensagens"], [data-page="comunidade-interna"]) :is(.messages-composer, .community-room-composer)';
  assert(d.selector===expectedSelector,`selector drift ${d.selector}`);
  assert(d.property==='row-gap',`property drift ${d.property}`);
  assert(d.value==='10px'&&!d.important,`source value drift ${d.value}/${d.important}`);
  assert((d.context||'')==='',`context drift ${d.context}`);
  assert(d.winnerValue==='0'&&!d.winnerImportant,`winner drift ${d.winnerValue}/${d.winnerImportant}`);
  assert(d.winnerLine>d.line,'winner order drift');
  console.log(`DEAD ROW PASS|decl=455|dead=1|line=${d.line}|selector=${d.selector}|property=row-gap|value=10px|winnerLine=${d.winnerLine}|winnerValue=0|context=global`);
}

function removeDead(parsed){
  const src=fs.readFileSync(TARGET,'utf8'),finalNewline=/\r?\n$/.test(src);const lines=src.split(/\r?\n/);if(finalNewline&&lines.at(-1)==='')lines.pop();
  const d=parsed.dead[0],line=lines[d.line-1];assert(line&&line.trim()==='row-gap: 10px;',`line mismatch ${d.line}: ${line}`);lines.splice(d.line-1,1);
  fs.writeFileSync(TARGET,lines.join('\n')+(finalNewline?'\n':''));
  const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);assert(stat[0]==='0'&&stat[1]==='1'&&stat[2]===TARGET,`unexpected diff ${stat.join(' ')}`);
  const after=parse(fs.readFileSync(TARGET,'utf8'));assert(after.declarations.length===454,`after declarations ${after.declarations.length}`);assert(after.dead.length===0,`after dead ${after.dead.length}`);
  console.log('EPHEMERAL DELTA PASS|file=chat-audio-draft-contract.css|additions=0|deletions=1|decl=455->454|dead=1->0');
}

async function prepareState(page,spec,state){
  await page.evaluate(({spec,state})=>{
    document.querySelector('[data-doke-document-preloader]')?.remove();
    document.documentElement.classList.remove('doke-mobile-shell-pending');
    document.documentElement.classList.remove('chat-room-mobile-open');
    const body=document.body;body.dataset.page=spec.bodyPage;
    const composer=document.querySelector(spec.composer);if(!composer)throw new Error(`composer missing ${spec.composer}`);
    composer.querySelectorAll('[data-ux040-injected]').forEach(el=>el.remove());
    const hideSelectors=[spec.audio,spec.attachment,'.messages-reply-preview','.community-room-attachment-preview'];
    for(const s of hideSelectors){for(const el of document.querySelectorAll(s)){el.hidden=true;}}
    if(state==='audio'){
      let el=composer.querySelector(spec.audio);if(!el){el=document.createElement('div');el.className=spec.audio.slice(1);el.dataset.ux040Injected='';composer.prepend(el);}el.hidden=false;
    }
    if(state==='attachment'){
      let el=composer.querySelector(spec.attachment);if(!el){el=document.createElement('div');el.className=spec.attachment.slice(1);el.dataset.ux040Injected='';composer.prepend(el);}el.hidden=false;
    }
  },{spec,state});
}

async function capture(browser,tag){
  const out={};let samples=0;
  for(const spec of PAGES){for(const width of VIEWPORTS){for(const state of STATES){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();
    await page.route('**/*',route=>{const u=new URL(route.request().url());const local=u.origin==='http://127.0.0.1:4173';if(local&&u.pathname.endsWith('.js'))return route.abort();if(local||u.protocol==='data:'||u.protocol==='blob:')return route.continue();return route.abort();});
    await page.goto(`http://127.0.0.1:4173/${spec.page}?ux040-${tag}-${state}-${width}`,{waitUntil:'domcontentloaded',timeout:20000});
    await prepareState(page,spec,state);await page.waitForTimeout(30);
    const snap=await page.evaluate(({spec,state})=>{
      const round=n=>Math.round(n*1000)/1000,composer=document.querySelector(spec.composer);if(!composer)throw new Error('composer missing at capture');
      const cs=getComputedStyle(composer),r=composer.getBoundingClientRect();
      const visibleDrafts=[...composer.querySelectorAll(`${spec.audio},${spec.attachment},.messages-reply-preview,.community-room-attachment-preview`)].filter(el=>!el.hidden&&getComputedStyle(el).display!=='none');
      return{
        page:spec.page,state,
        props:{display:cs.display,rowGap:cs.rowGap,columnGap:cs.columnGap,gridTemplateAreas:cs.gridTemplateAreas,gridTemplateRows:cs.gridTemplateRows,gridTemplateColumns:cs.gridTemplateColumns,overflow:cs.overflow},
        rect:[round(r.x),round(r.y),round(r.width),round(r.height)],
        visibleDrafts:visibleDrafts.map(el=>({className:String(el.className||''),rect:(()=>{const x=el.getBoundingClientRect();return[round(x.x),round(x.y),round(x.width),round(x.height)];})()})),
        doc:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth}
      };
    },{spec,state});
    assert(snap.doc.scrollWidth<=snap.doc.clientWidth+1,`horizontal overflow ${tag} ${spec.page} state=${state} width=${width} ${JSON.stringify(snap.doc)}`);
    out[`${spec.page}:${width}:${state}`]=snap;samples++;await context.close();
  }}}
  console.log(`RUNTIME CAPTURE|tag=${tag}|pages=${PAGES.length}|viewports=${VIEWPORTS.join(',')}|states=${STATES.join(',')}|samples=${samples}|overflow=0`);
  return out;
}

(async()=>{
  assert(TARGET_SHA&&TARGET_BLOB,'missing env');assert(sh('git rev-parse HEAD')===TARGET_SHA,'wrong HEAD');assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'target blob drift');
  verifyReach();const parsed=parse(fs.readFileSync(TARGET,'utf8'));verifyDead(parsed);
  const server=cp.spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
  try{
    await new Promise(r=>setTimeout(r,700));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    try{const before=await capture(browser,'before');removeDead(parsed);const after=await capture(browser,'after');assert(JSON.stringify(before)===JSON.stringify(after),'runtime parity mismatch');console.log(`CASCADE RUNTIME PARITY PASS|runtimeDiffs=0|overflow=0|pages=2|states=3|viewports=${VIEWPORTS.length}|samples=${PAGES.length*STATES.length*VIEWPORTS.length}|boundary=759/760/761|staticCascadeRows=1`);}finally{await browser.close();}
  }finally{server.kill('SIGTERM');}
  sh(`git reset --hard ${TARGET_SHA}`);sh('git clean -fdx');assert(sh('git rev-parse HEAD')===TARGET_SHA,'restore HEAD drift');assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'restore blob drift');assert(sh('git status --porcelain')==='','restore dirty');console.log(`CHECKPOINT PASS|sha=${TARGET_SHA}|productMutation=0|issueCreated=0|prCreated=0`);
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
