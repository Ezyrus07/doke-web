const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const { chromium }=require('@playwright/test');

const TARGET='assets/css/pages/comunidade/entry-create-modals.css';
const FOUNDATION='assets/css/pages/comunidade-foundation.css';
const MANIFEST='assets/css/pages/comunidade.css';
const PAGE='comunidade.html';
const TARGET_SHA=process.env.TARGET_SHA;
const TARGET_BLOB=process.env.TARGET_BLOB;
const VIEWPORTS=[359,390,430,639,640,641,719,720,721,760,1024,1280,1440];
const STATES=['hidden','details','details-cover','members','review','code-open'];

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
  assert(JSON.stringify(direct)===JSON.stringify([MANIFEST]),`target importer drift ${JSON.stringify(direct)}`);
  assert(importsFor(FOUNDATION,tracked).includes(MANIFEST),'foundation manifest import drift');
  const html=fs.readFileSync(PAGE,'utf8');
  assert((html.match(/assets\/css\/pages\/comunidade-foundation\.css\?v=/g)||[]).length===1,'foundation link drift');
  const pages=[];
  for(const p of report.pageAssets){const seen=new Set(),stack=[...(p.css||[]).filter(f=>tracked.has(f))];let hit=false;while(stack.length){const f=stack.pop();if(seen.has(f)||!tracked.has(f))continue;seen.add(f);if(f===TARGET){hit=true;break;}for(const n of importsFor(f,tracked))stack.push(n);}if(hit)pages.push(p.page);}
  assert(JSON.stringify(pages.sort())===JSON.stringify([PAGE]),`active reach drift ${JSON.stringify(pages)}`);
  console.log(`STATIC REACH PASS|chain=${PAGE}->${FOUNDATION}->${MANIFEST}->${TARGET}|pages=1`);
}

function verifyDead(parsed){
  assert(parsed.declarations.length===912,`declarations drift ${parsed.declarations.length}`);
  assert(parsed.dead.length===192,`dead drift ${parsed.dead.length}`);
  const selectors=[...new Set(parsed.dead.map(d=>d.selector))];
  const identical=parsed.dead.filter(d=>d.value===d.winnerValue&&d.important===d.winnerImportant).length;
  const changed=parsed.dead.length-identical;
  assert(selectors.length===46,`selector drift ${selectors.length}`);
  assert(identical===48&&changed===144,`identity drift ${identical}/${changed}`);
  assert(parsed.dead.every(d=>!d.important&&!d.winnerImportant),'important drift in dead rows');
  assert(parsed.dead.every(d=>d.winnerLine>d.line),'winner order drift');
  const contexts=[...new Set(parsed.dead.map(d=>d.context||'<global>'))].sort();
  const counts=new Map();for(const d of parsed.dead){const k=d.context||'<global>';counts.set(k,(counts.get(k)||0)+1);}
  console.log(`DEAD ROWS PASS|decl=912|dead=192|selectors=46|identical=48|changed=144|contexts=${contexts.map(k=>`${k}:${counts.get(k)}`).join(' <OR> ')}`);
}

function selectorProps(parsed){const m=new Map();for(const d of parsed.dead){if(!m.has(d.selector))m.set(d.selector,new Set());m.get(d.selector).add(d.property);}return[...m].map(([selector,props])=>({selector,props:[...props].sort()}));}

function removeDeadRows(parsed){
  const src=fs.readFileSync(TARGET,'utf8'),finalNewline=/\r?\n$/.test(src);const lines=src.split(/\r?\n/);if(finalNewline&&lines.at(-1)==='')lines.pop();
  for(const d of [...parsed.dead].sort((a,b)=>b.line-a.line)){const line=lines[d.line-1];assert(line&&line.trim().startsWith(`${d.property}:`),`line mismatch ${d.line}: ${line}`);lines.splice(d.line-1,1);}
  fs.writeFileSync(TARGET,lines.join('\n')+(finalNewline?'\n':''));
  const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);assert(stat[0]==='0'&&stat[1]==='192'&&stat[2]===TARGET,`unexpected diff ${stat.join(' ')}`);
  const after=parse(fs.readFileSync(TARGET,'utf8'));assert(after.declarations.length===720,`after declarations ${after.declarations.length}`);assert(after.dead.length===0,`after dead ${after.dead.length}`);
  console.log('EPHEMERAL DELTA PASS|file=entry-create-modals.css|additions=0|deletions=192|decl=912->720|dead=192->0');
}

async function applyState(page,state){
  await page.evaluate((state)=>{
    document.querySelector('[data-doke-document-preloader]')?.remove();
    document.documentElement.classList.remove('doke-mobile-shell-pending');
    const root=document.querySelector('[data-communities-page]')||document.body;
    const view=document.querySelector('[data-community-create-view]');
    const form=document.querySelector('[data-community-create-form]');
    const code=document.querySelector('[data-community-code-modal]');
    if(code){code.hidden=true;code.setAttribute('aria-hidden','true');}
    if(view){view.hidden=true;view.classList.remove('is-active');}
    document.body.classList.remove('community-modal-open','doke-action-modal-open');
    if(form){
      form.dataset.communityCreateCurrentStep='details';
      form.querySelectorAll('[data-community-create-step]').forEach(el=>{const active=el.dataset.communityCreateStep==='details';el.hidden=!active;el.classList.toggle('is-active',active);});
      form.querySelectorAll('[data-community-create-progress]').forEach(el=>{el.classList.toggle('is-active',el.dataset.communityCreateProgress==='details');el.classList.remove('is-complete');});
      form.querySelectorAll('[data-community-create-prev],[data-community-create-submit]').forEach(el=>el.hidden=true);
      form.querySelectorAll('[data-community-create-cancel],[data-community-create-next]').forEach(el=>el.hidden=false);
    }
    const ensureDynamic=()=>{
      if(!form)return;
      if(!form.querySelector('[data-community-cover-field]')){
        const details=form.querySelector('[data-community-create-step="details"]');
        const field=document.createElement('div');field.className='community-create-cover-upload doke-action-modal__field doke-modal-field';field.dataset.communityCoverField='';field.innerHTML='<div class="community-create-cover-preview" data-community-cover-preview><span>Sem capa anexada</span></div>';
        details?.appendChild(field);
      }
      const list=form.querySelector('[data-community-member-list]');
      if(list&&!list.children.length)list.innerHTML='<label class="community-create-member"><input type="checkbox"><span class="community-create-member__avatar">GA</span><span class="community-create-member__copy"><strong>Gabriel</strong><small>Contato recente</small></span></label><label class="community-create-member"><input type="checkbox"><span class="community-create-member__avatar">DK</span><span class="community-create-member__copy"><strong>Doke</strong><small>Contato recente</small></span></label>';
      const review=form.querySelector('.community-action-cover > div');if(review)review.dataset.communityReviewCover='';
    };
    ensureDynamic();
    const setStep=(key)=>{
      if(!form)return;form.dataset.communityCreateCurrentStep=key;
      const order=['details','members','review'],idx=order.indexOf(key);
      form.querySelectorAll('[data-community-create-step]').forEach(el=>{const active=el.dataset.communityCreateStep===key;el.hidden=!active;el.classList.toggle('is-active',active);});
      form.querySelectorAll('[data-community-create-progress]').forEach(el=>{const n=order.indexOf(el.dataset.communityCreateProgress);el.classList.toggle('is-active',n===idx);el.classList.toggle('is-complete',n<idx);});
      form.querySelectorAll('[data-community-create-cancel]').forEach(el=>el.hidden=idx!==0);
      form.querySelector('[data-community-create-prev]')?.toggleAttribute('hidden',idx===0);
      form.querySelector('[data-community-create-next]')?.toggleAttribute('hidden',idx===2);
      form.querySelector('[data-community-create-submit]')?.toggleAttribute('hidden',idx!==2);
    };
    if(state==='code-open'){
      if(code){code.hidden=false;code.setAttribute('aria-hidden','false');}
      document.body.classList.add('community-modal-open','doke-action-modal-open');
      return;
    }
    if(state!=='hidden'&&view){view.hidden=false;view.classList.add('is-active');root.dataset.communityMode='create';}
    if(state==='details'||state==='details-cover')setStep('details');
    if(state==='members')setStep('members');
    if(state==='review')setStep('review');
    if(state==='details-cover'){
      const preview=form?.querySelector('[data-community-cover-preview]');if(preview){preview.classList.add('has-cover');preview.innerHTML='<img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />';}
      const review=form?.querySelector('[data-community-review-cover]');if(review){review.classList.add('has-cover');review.innerHTML='<img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />';}
    }
  },state);
}

async function capture(browser,tag,specs){
  const out={},seen=new Map(specs.map(s=>[s.selector,0]));
  for(const width of VIEWPORTS){for(const state of STATES){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});const page=await context.newPage();
    await page.route('**/*',route=>{const u=new URL(route.request().url());const local=u.origin==='http://127.0.0.1:4173';if(local&&u.pathname.endsWith('.js'))return route.abort();if(local||u.protocol==='data:'||u.protocol==='blob:')return route.continue();return route.abort();});
    await page.goto(`http://127.0.0.1:4173/${PAGE}?${tag}-${state}-${width}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:20000});
    await applyState(page,state);await page.waitForTimeout(40);
    const snap=await page.evaluate((specs)=>{const round=n=>Math.round(n*1000)/1000,rows={};for(const spec of specs){const nodes=[...document.querySelectorAll(spec.selector)];rows[spec.selector]=nodes.slice(0,10).map((el,index)=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect(),props={};for(const p of spec.props)props[p]=cs.getPropertyValue(p).trim();return{index,tag:el.tagName,className:String(el.className||''),hidden:el.hidden===true,display:cs.display,props,rect:[round(r.x),round(r.y),round(r.width),round(r.height)]};});rows[spec.selector+'::__count']=nodes.length;}return{rows,doc:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth}};},specs);
    for(const spec of specs)seen.set(spec.selector,seen.get(spec.selector)+snap.rows[spec.selector+'::__count']);
    assert(snap.doc.scrollWidth<=snap.doc.clientWidth+1,`horizontal overflow ${tag} state=${state} width=${width} ${JSON.stringify(snap.doc)}`);
    out[`${width}:${state}`]=snap;await context.close();
  }}
  const absent=[...seen].filter(([,n])=>n===0).map(([s])=>s),present=seen.size-absent.length;
  console.log(`DOM COVERAGE|tag=${tag}|states=${STATES.join(',')}|viewports=${VIEWPORTS.join(',')}|presentSelectors=${present}|absentSelectors=${absent.length}|absent=${absent.join(' <OR> ')||'-'}`);
  return{snapshots:out,coverage:{present,absent}};
}

(async()=>{
  assert(TARGET_SHA&&TARGET_BLOB,'missing env');assert(sh('git rev-parse HEAD')===TARGET_SHA,'wrong HEAD');assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'target blob drift');
  verifyReach();const parsed=parse(fs.readFileSync(TARGET,'utf8'));verifyDead(parsed);const specs=selectorProps(parsed);
  const server=cp.spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
  try{await new Promise(r=>setTimeout(r,700));const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{const before=await capture(browser,'before',specs);removeDeadRows(parsed);const after=await capture(browser,'after',specs);assert(JSON.stringify(before.snapshots)===JSON.stringify(after.snapshots),'runtime parity mismatch');assert(JSON.stringify(before.coverage)===JSON.stringify(after.coverage),'coverage drift');console.log(`CASCADE RUNTIME PARITY PASS|runtimeDiffs=0|overflow=0|selectors=${specs.length}|domPresent=${before.coverage.present}|domAbsent=${before.coverage.absent.length}|staticCascadeRows=192|states=${STATES.length}|viewports=${VIEWPORTS.length}|boundaries=639/640/641/719/720/721|page=${PAGE}`);}finally{await browser.close();}}finally{server.kill('SIGTERM');}
  sh(`git reset --hard ${TARGET_SHA}`);sh('git clean -fdx');assert(sh('git rev-parse HEAD')===TARGET_SHA,'restore HEAD drift');assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'restore blob drift');assert(sh('git status --porcelain')==='','restore dirty');console.log(`CHECKPOINT PASS|sha=${TARGET_SHA}|productMutation=0|issueCreated=0|prCreated=0`);
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
