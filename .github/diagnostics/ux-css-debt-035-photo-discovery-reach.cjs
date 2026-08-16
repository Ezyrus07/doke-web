const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { chromium } = require('@playwright/test');

const TARGET = 'assets/css/pages/comunidade/photo-discovery.css';
const COMMUNITY_MANIFEST = 'assets/css/pages/comunidade.css';
const FOUNDATION = 'assets/css/pages/comunidade-foundation.css';
const PAGE = 'comunidade.html';
const TARGET_SHA = process.env.TARGET_SHA;
const TARGET_BLOB = process.env.TARGET_BLOB;

function sh(cmd, opts = {}) {
  return cp.execSync(cmd, { encoding: 'utf8', stdio: opts.stdio || ['ignore', 'pipe', 'pipe'] }).trim();
}
function assert(ok, msg) { if (!ok) throw new Error(msg); }

function parse(src) {
  const lines = src.split(/\r?\n/);
  let depth = 0, sp = [], ap = [], sel = null;
  const ds = [], stack = [], re = /^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/;
  const header = p => p.join(' ').replace(/\{\s*$/, '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], t = line.trim();
    const o = (line.match(/\{/g) || []).length, c = (line.match(/\}/g) || []).length;
    if (!sel) {
      if (ap.length) {
        if (t) ap.push(t);
        if (line.includes('{')) { stack.push({ type:'at', header:header(ap), depthBefore:depth }); ap=[]; }
      } else if (t.startsWith('@') && !t.includes(';')) {
        if (line.includes('{')) stack.push({ type:'at', header:header([t]), depthBefore:depth }); else ap=[t];
      } else if (sp.length) {
        if (t) sp.push(t);
        if (line.includes('{')) { sel=header(sp); sp=[]; stack.push({ type:'rule', selector:sel, depthBefore:depth }); }
      } else if (t && !t.startsWith('/*') && !t.startsWith('*') && t !== '*/' && t !== '}' && !t.startsWith('@') && !line.includes(';')) {
        sp=[t];
        if (line.includes('{')) { sel=header(sp); sp=[]; stack.push({ type:'rule', selector:sel, depthBefore:depth }); }
      }
    }
    if (sel) {
      const m = line.match(re);
      if (m) {
        const raw=m[2].trim(), important=/\s*!important\s*$/i.test(raw);
        const context=stack.filter(x=>x.type==='at').map(x=>x.header).join(' || ');
        ds.push({ line:i+1, selector:sel, property:m[1].toLowerCase(), value:raw, important, context });
      }
    }
    depth += o-c;
    while (stack.length && depth <= stack[stack.length-1].depthBefore) {
      const p=stack.pop(); if (p.type==='rule') sel=null;
    }
  }
  const last=new Map(), dead=[];
  for (let i=ds.length-1;i>=0;i--) {
    const d=ds[i], k=`${d.context} >>> ${d.selector} >>> ${d.property}`, l=last.get(k);
    if (l && (!d.important || l.important)) dead.push({ ...d, winnerLine:l.line, winnerValue:l.value, winnerImportant:l.important });
    if (!l || d.important || !l.important) last.set(k,d);
  }
  return { declarations:ds, dead:dead.sort((a,b)=>a.line-b.line) };
}

function importsFor(file, tracked) {
  const src=fs.readFileSync(file,'utf8'), out=[];
  const re=/@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;
  let m;
  while ((m=re.exec(src))) {
    let v=m[1].replace(/\?.*$/,'').replace(/^\.\//,'');
    if (v.startsWith('/')) v=v.replace(/^\/+/, '');
    else if (!v.startsWith('assets/')) v=path.posix.normalize(path.posix.join(path.posix.dirname(file),v));
    if (tracked.has(v)) out.push(v);
  }
  return out;
}

function verifyReach() {
  const report=JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json','utf8'));
  const tracked=new Set(sh("git ls-files -z assets/css").split('\0').filter(f=>f.endsWith('.css')));
  const directImporters=[];
  for(const f of tracked) if(importsFor(f,tracked).includes(TARGET)) directImporters.push(f);
  directImporters.sort();
  assert(JSON.stringify(directImporters)===JSON.stringify([COMMUNITY_MANIFEST]), `target importer drift ${JSON.stringify(directImporters)}`);
  const manifestImporters=[];
  for(const f of tracked) if(importsFor(f,tracked).includes(COMMUNITY_MANIFEST)) manifestImporters.push(f);
  manifestImporters.sort();
  assert(JSON.stringify(manifestImporters)===JSON.stringify([FOUNDATION]), `manifest importer drift ${JSON.stringify(manifestImporters)}`);
  const html=fs.readFileSync(PAGE,'utf8');
  assert((html.match(/assets\/css\/pages\/comunidade-foundation\.css\?v=/g)||[]).length===1, 'comunidade foundation link drift');
  const pages=[];
  for (const p of report.pageAssets) {
    const seen=new Set(), stack=[...(p.css||[]).filter(f=>tracked.has(f))]; let hit=false;
    while(stack.length){
      const f=stack.pop(); if(seen.has(f)||!tracked.has(f)) continue; seen.add(f);
      if(f===TARGET){hit=true;break;}
      for(const n of importsFor(f,tracked)) stack.push(n);
    }
    if(hit) pages.push(p.page);
  }
  assert(JSON.stringify(pages.sort())===JSON.stringify([PAGE]), `active reach drift ${JSON.stringify(pages)}`);
  console.log(`STATIC REACH PASS|chain=${PAGE}->${FOUNDATION}->${COMMUNITY_MANIFEST}->${TARGET}|pages=1`);
}

function verifyDead(parsed) {
  assert(parsed.declarations.length===545, `declarations drift ${parsed.declarations.length}`);
  assert(parsed.dead.length===54, `dead drift ${parsed.dead.length}`);
  const selectors=[...new Set(parsed.dead.map(d=>d.selector))];
  const identical=parsed.dead.filter(d=>d.value===d.winnerValue && d.important===d.winnerImportant).length;
  const changed=parsed.dead.length-identical;
  assert(selectors.length===13, `selector drift ${selectors.length}`);
  assert(identical===20 && changed===34, `identity drift ${identical}/${changed}`);
  assert(parsed.dead.every(d=>!d.important&&!d.winnerImportant), 'important drift in dead rows');
  const contextCounts=new Map();
  for(const d of parsed.dead) contextCounts.set(d.context,(contextCounts.get(d.context)||0)+1);
  assert(contextCounts.size===2,`context count drift ${JSON.stringify([...contextCounts])}`);
  assert(contextCounts.get('')===52,`global dead rows drift ${contextCounts.get('')}`);
  assert(contextCounts.get('@media (max-width: 640px)')===2,`max640 dead rows drift ${contextCounts.get('@media (max-width: 640px)')}`);
  for(const d of parsed.dead) assert(Number.isInteger(d.winnerLine) && d.winnerLine>d.line, `static winner drift line=${d.line}`);
  console.log('DEAD ROWS PASS|decl=545|dead=54|selectors=13|identical=20|changed=34|contexts=2|global=52|max640=2|staticCascadeRows=54');
}

function selectorProps(parsed) {
  const m=new Map();
  for(const d of parsed.dead){
    if(!m.has(d.selector)) m.set(d.selector,new Set());
    m.get(d.selector).add(d.property);
  }
  return [...m].map(([selector,props])=>({selector,props:[...props].sort()}));
}

function removeDeadRows(parsed) {
  const src=fs.readFileSync(TARGET,'utf8');
  const finalNewline=/\r?\n$/.test(src);
  const lines=src.split(/\r?\n/); if(finalNewline && lines[lines.length-1]==='') lines.pop();
  for(const d of [...parsed.dead].sort((a,b)=>b.line-a.line)) {
    const line=lines[d.line-1];
    assert(line && line.trim().startsWith(`${d.property}:`), `line mismatch ${d.line}: ${line}`);
    lines.splice(d.line-1,1);
  }
  fs.writeFileSync(TARGET,lines.join('\n')+(finalNewline?'\n':''));
  const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);
  assert(stat[0]==='0' && stat[1]==='54' && stat[2]===TARGET, `unexpected diff ${stat.join(' ')}`);
  const after=parse(fs.readFileSync(TARGET,'utf8'));
  assert(after.declarations.length===491, `after declarations ${after.declarations.length}`);
  assert(after.dead.length===0, `after dead ${after.dead.length}`);
  console.log('EPHEMERAL DELTA PASS|file=photo-discovery.css|additions=0|deletions=54|decl=545->491|dead=54->0');
}

function mediaPlan(src) {
  const boundaries=new Set();
  const re=/@media\s*\((?:min|max)-width\s*:\s*(\d+)px\)/gi;
  let m;
  while((m=re.exec(src))) boundaries.add(Number(m[1]));
  assert(boundaries.has(640),'640px media boundary missing');
  const widths=new Set([360,390,430,1024,1280,1440]);
  for(const b of boundaries){for(const x of [b-1,b,b+1]) if(x>=320&&x<=1600) widths.add(x);}
  const viewports=[...widths].sort((a,b)=>a-b);
  const sortedBoundaries=[...boundaries].sort((a,b)=>a-b);
  console.log(`MEDIA PLAN|boundaries=${sortedBoundaries.join(',')}|viewports=${viewports.join(',')}`);
  return {boundaries:sortedBoundaries,viewports};
}

function splitSelectorList(selector){
  const out=[]; let cur='', paren=0, bracket=0, quote='';
  for(let i=0;i<selector.length;i++){
    const ch=selector[i];
    if(quote){cur+=ch;if(ch===quote&&selector[i-1]!=='\\')quote='';continue;}
    if(ch==='"'||ch==="'"){quote=ch;cur+=ch;continue;}
    if(ch==='(')paren++; else if(ch===')')paren=Math.max(0,paren-1);
    else if(ch==='[')bracket++; else if(ch===']')bracket=Math.max(0,bracket-1);
    if(ch===','&&paren===0&&bracket===0){out.push(cur.trim());cur='';continue;}
    cur+=ch;
  }
  if(cur.trim())out.push(cur.trim());
  return out;
}

function queryBranches(selector){
  return splitSelectorList(selector).map(branch=>{
    const m=branch.match(/(::before|::after)\s*$/i);
    return {branch,base:m?branch.slice(0,m.index).trim():branch,pseudo:m?m[1].toLowerCase():null};
  });
}

async function withBrowser(fn){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{return await fn(browser);}finally{await browser.close();}
}

async function capture(browser, tag, specs, viewports, boundaries) {
  const out={};
  const seenCounts=new Map(specs.map(s=>[s.selector,0]));
  for(const width of viewports){
    const context=await browser.newContext({viewport:{width,height:1200},reducedMotion:'reduce'});
    const page=await context.newPage();
    await page.route('**/*', route=>{
      const u=new URL(route.request().url());
      const local=u.origin==='http://127.0.0.1:4173';
      if(local && u.pathname.endsWith('.js')) return route.abort();
      if(local || u.protocol==='data:' || u.protocol==='blob:') return route.continue();
      return route.abort();
    });
    await page.goto(`http://127.0.0.1:4173/${PAGE}?${tag}-${width}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:20000});
    await page.evaluate(()=>{
      document.querySelector('[data-doke-document-preloader]')?.remove();
      document.documentElement.removeAttribute('data-auth-guard');
      document.documentElement.classList.remove('doke-mobile-shell-pending','doke-community-document-reload');
      const body=document.body;
      body.setAttribute('data-data-state','hydrated');
      body.removeAttribute('data-community-skeleton-visible');
      const root=document.querySelector('[data-state-boundary="comunidade"]');
      if(root){root.setAttribute('data-view-state','ready');root.setAttribute('data-state','ready');root.setAttribute('aria-busy','false');}
      document.querySelectorAll('[data-community-hydration-content]').forEach(el=>{el.hidden=false;el.removeAttribute('aria-hidden');});
      document.querySelectorAll('[data-community-hydration-skeleton],[data-state-loading]').forEach(el=>{el.hidden=true;el.setAttribute('aria-hidden','true');});
    });
    await page.waitForTimeout(120);
    const snap=await page.evaluate(({specs,boundaries})=>{
      const round=n=>Math.round(n*1000)/1000;
      const split=(selector)=>{
        const out=[];let cur='',paren=0,bracket=0,quote='';
        for(let i=0;i<selector.length;i++){
          const ch=selector[i];
          if(quote){cur+=ch;if(ch===quote&&selector[i-1]!=='\\')quote='';continue;}
          if(ch==='"'||ch==="'"){quote=ch;cur+=ch;continue;}
          if(ch==='(')paren++;else if(ch===')')paren=Math.max(0,paren-1);else if(ch==='[')bracket++;else if(ch===']')bracket=Math.max(0,bracket-1);
          if(ch===','&&paren===0&&bracket===0){out.push(cur.trim());cur='';continue;}cur+=ch;
        }
        if(cur.trim())out.push(cur.trim());return out;
      };
      const rows={};
      for(const spec of specs){
        const entries=[];let total=0;
        for(const branch of split(spec.selector)){
          const m=branch.match(/(::before|::after)\s*$/i), pseudo=m?m[1].toLowerCase():null, base=m?branch.slice(0,m.index).trim():branch;
          const nodes=[...document.querySelectorAll(base)];total+=nodes.length;
          entries.push({branch,count:nodes.length,nodes:nodes.slice(0,8).map((el,index)=>{
            const cs=getComputedStyle(el,pseudo),r=el.getBoundingClientRect(),props={};
            for(const p of spec.props)props[p]=cs.getPropertyValue(p).trim();
            return{index,tag:el.tagName,className:String(el.className||''),pseudo,props,rect:[round(r.x),round(r.y),round(r.width),round(r.height)]};
          })});
        }
        rows[spec.selector]=entries;rows[spec.selector+'::__count']=total;
      }
      const media={};for(const b of boundaries){media[`max${b}`]=matchMedia(`(max-width: ${b}px)`).matches;media[`min${b}`]=matchMedia(`(min-width: ${b}px)`).matches;}
      return{rows,media,doc:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyClientWidth:document.body.clientWidth,bodyScrollWidth:document.body.scrollWidth,scrollHeight:document.documentElement.scrollHeight}};
    },{specs,boundaries});
    for(const spec of specs){const n=snap.rows[spec.selector+'::__count'];seenCounts.set(spec.selector,seenCounts.get(spec.selector)+n);}
    assert(snap.doc.scrollWidth<=snap.doc.clientWidth,`horizontal overflow ${tag} width=${width} ${JSON.stringify(snap.doc)}`);
    out[width]=snap;
    await context.close();
  }
  const absent=[...seenCounts].filter(([,count])=>count===0).map(([sel])=>sel);
  const present=seenCounts.size-absent.length;
  assert(present>0,'no affected selector is present in canonical DOM');
  console.log(`REAL DOM COVERAGE|tag=${tag}|presentSelectors=${present}|absentSelectors=${absent.length}|absent=${absent.join(' <OR> ')||'-'}`);
  return {snapshots:out,coverage:{present,absent}};
}

(async()=>{
  assert(TARGET_SHA && TARGET_BLOB,'missing env');
  assert(sh('git rev-parse HEAD')===TARGET_SHA,'wrong HEAD');
  assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'target blob drift');
  verifyReach();
  const src=fs.readFileSync(TARGET,'utf8');
  const parsed=parse(src);
  verifyDead(parsed);
  const specs=selectorProps(parsed);
  const {boundaries,viewports}=mediaPlan(src);
  const server=cp.spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
  try{
    await new Promise(r=>setTimeout(r,700));
    const before=await withBrowser(browser=>capture(browser,'before',specs,viewports,boundaries));
    removeDeadRows(parsed);
    const after=await withBrowser(browser=>capture(browser,'after',specs,viewports,boundaries));
    assert(JSON.stringify(before.snapshots)===JSON.stringify(after.snapshots),'runtime parity mismatch');
    assert(before.coverage.present===after.coverage.present,'DOM present coverage drift');
    assert(JSON.stringify(before.coverage.absent)===JSON.stringify(after.coverage.absent),'DOM absent coverage drift');
    console.log(`CASCADE RUNTIME PARITY PASS|viewports=${viewports.join(',')}|runtimeDiffs=0|overflow=0|boundaries=${boundaries.join('/')}|selectors=${specs.length}|domPresent=${before.coverage.present}|domAbsent=${before.coverage.absent.length}|staticCascadeRows=54`);
  } finally {
    server.kill('SIGTERM');
  }
  sh(`git reset --hard ${TARGET_SHA}`);
  sh('git clean -fdx');
  assert(sh('git rev-parse HEAD')===TARGET_SHA,'restore HEAD drift');
  assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'restore blob drift');
  assert(sh('git status --porcelain')==='','restore dirty');
  console.log(`CHECKPOINT PASS|sha=${TARGET_SHA}|productMutation=0`);
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
