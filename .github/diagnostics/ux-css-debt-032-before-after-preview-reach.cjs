const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { chromium } = require('@playwright/test');

const TARGET = 'assets/css/pages/home-overlays/before-after-preview.css';
const IMPORTER = 'assets/css/pages/home-overlays.css';
const RUNTIME_PAGE = 'assets/css/pages/home-runtime-page.css';
const RUNTIME = 'assets/css/pages/home-runtime.css';
const PAGE_MANIFEST = 'assets/css/pages/home.css';
const PAGE = 'index.html';
const TARGET_SHA = process.env.TARGET_SHA;
const TARGET_BLOB = process.env.TARGET_BLOB;
const viewports = [360, 379, 380, 381, 559, 560, 561, 679, 680, 681, 760, 979, 980, 981, 1280, 1440];

function sh(cmd, opts = {}) {
  return cp.execSync(cmd, { encoding: 'utf8', stdio: opts.stdio || ['ignore', 'pipe', 'pipe'] }).trim();
}
function assert(ok, msg) { if (!ok) throw new Error(msg); }

function parse(src) {
  const lines = src.split(/\r?\n/); let depth = 0, sp = [], ap = [], sel = null;
  const ds = [], stack = [], re = /^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/;
  const header = p => p.join(' ').replace(/\{\s*$/, '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], t = line.trim();
    const o = (line.match(/\{/g) || []).length, c = (line.match(/\}/g) || []).length;
    if (!sel) {
      if (ap.length) { if (t) ap.push(t); if (line.includes('{')) { stack.push({ type:'at', header:header(ap), depthBefore:depth }); ap=[]; } }
      else if (t.startsWith('@') && !t.includes(';')) { if (line.includes('{')) stack.push({type:'at',header:header([t]),depthBefore:depth}); else ap=[t]; }
      else if (sp.length) { if (t) sp.push(t); if (line.includes('{')) { sel=header(sp); sp=[]; stack.push({type:'rule',selector:sel,depthBefore:depth}); } }
      else if (t && !t.startsWith('/*') && !t.startsWith('*') && t !== '*/' && t !== '}' && !t.startsWith('@') && !line.includes(';')) {
        sp=[t]; if (line.includes('{')) { sel=header(sp); sp=[]; stack.push({type:'rule',selector:sel,depthBefore:depth}); }
      }
    }
    if (sel) {
      const m = line.match(re);
      if (m) {
        const raw=m[2].trim(), important=/\s*!important\s*$/i.test(raw);
        const context=stack.filter(x=>x.type==='at').map(x=>x.header).join(' || ');
        ds.push({line:i+1,selector:sel,property:m[1].toLowerCase(),value:raw,important,context});
      }
    }
    depth += o-c;
    while (stack.length && depth <= stack[stack.length-1].depthBefore) { const p=stack.pop(); if (p.type==='rule') sel=null; }
  }
  const last=new Map(), dead=[];
  for (let i=ds.length-1;i>=0;i--) {
    const d=ds[i], k=`${d.context} >>> ${d.selector} >>> ${d.property}`, l=last.get(k);
    if (l && (!d.important || l.important)) dead.push({...d,winnerLine:l.line,winnerValue:l.value,winnerImportant:l.important});
    if (!l || d.important || !l.important) last.set(k,d);
  }
  return {declarations:ds, dead:dead.sort((a,b)=>a.line-b.line)};
}

const expected = [
  ['<global>','.before-after-preview','z-index','85','560'],
  ['<global>','.before-after-preview__dialog','width','min(1140px, calc(100vw - 56px))','min(1320px, calc(100vw - 48px))'],
  ['<global>','.before-after-preview__dialog','max-height','calc(100vh - 56px)','calc(100vh - 48px)'],
  ['<global>','.before-after-preview__dialog','border-radius','var(--radius-exact-34)','var(--radius-exact-32)'],
  ['<global>','.before-after-preview__dialog','background','linear-gradient(180deg, #f6f9fc 0%, #eef4fa 100%)','#f7fbff'],
  ['<global>','.before-after-preview__stage','grid-template-columns','minmax(0, 1.08fr) minmax(320px, 0.92fr)','minmax(0, 1.02fr) minmax(320px, 420px)'],
  ['<global>','.before-after-preview__stage','min-height','min(760px, calc(100vh - 56px))','min(760px, calc(100vh - 48px))'],
  ['<global>','.before-after-preview__media-shell','padding','32px','30px'],
  ['<global>','.before-after-preview__media-card','grid-template-rows','minmax(0, 1fr) auto','minmax(0, 1fr) auto'],
  ['<global>','.before-after-preview__media-card','padding','22px','18px'],
  ['<global>','.before-after-preview__media-card','border-radius','var(--radius-2xl)','var(--radius-2xl)'],
  ['<global>','.before-after-preview__media-card','background','rgba(255, 255, 255, 0.72)','rgba(255, 255, 255, 0.72)'],
  ['<global>','.before-after-preview__media','min-height','420px','520px'],
  ['<global>','.before-after-preview__stats','gap','12px','10px'],
  ['<global>','.before-after-preview__stat','padding','14px 16px','13px 14px'],
  ['<global>','.before-after-preview__stat','border-radius','var(--radius-exact-20)','var(--radius-md)'],
  ['<global>','.before-after-preview__panel','padding','34px 30px 30px','34px 28px 28px']
];

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
  const directImporters=sh("git grep -l -F 'before-after-preview.css?v=' -- assets/css || true").split(/\r?\n/).filter(Boolean).sort();
  assert(JSON.stringify(directImporters)===JSON.stringify([IMPORTER]), `target importer drift ${JSON.stringify(directImporters)}`);
  assert(importsFor(IMPORTER,tracked).includes(TARGET), 'home-overlays missing target import');
  assert(importsFor(RUNTIME_PAGE,tracked).includes(IMPORTER), 'home-runtime-page missing home-overlays import');
  assert(importsFor(RUNTIME,tracked).includes(RUNTIME_PAGE), 'home-runtime missing runtime-page import');
  assert(importsFor(PAGE_MANIFEST,tracked).includes(RUNTIME), 'home.css missing home-runtime import');
  const html=fs.readFileSync(PAGE,'utf8');
  assert((html.match(/assets\/css\/pages\/home\.css\?v=/g)||[]).length===1, 'index home.css link drift');
  assert((html.match(/data-before-after-preview\b/g)||[]).length>=1, 'before-after overlay markup missing');
  const pages=[];
  for (const page of report.pageAssets) {
    const seen=new Set(), stack=[...(page.css||[]).filter(f=>tracked.has(f))]; let hit=false;
    while(stack.length){const f=stack.pop();if(seen.has(f)||!tracked.has(f))continue;seen.add(f);if(f===TARGET){hit=true;break;}for(const n of importsFor(f,tracked))stack.push(n);}
    if(hit) pages.push(page.page);
  }
  assert(JSON.stringify(pages.sort())===JSON.stringify([PAGE]), `active reach drift ${JSON.stringify(pages)}`);
  console.log(`STATIC REACH PASS|chain=${PAGE}->${PAGE_MANIFEST}->${RUNTIME}->${RUNTIME_PAGE}->${IMPORTER}->${TARGET}|pages=1`);
}

function verifyDead(parsed) {
  assert(parsed.declarations.length===436, `declarations drift ${parsed.declarations.length}`);
  assert(parsed.dead.length===17, `dead drift ${parsed.dead.length}`);
  const got=parsed.dead.map(d=>[d.context||'<global>',d.selector,d.property,d.value,d.winnerValue]);
  assert(JSON.stringify(got)===JSON.stringify(expected), `dead rows drift\n${JSON.stringify(got,null,2)}`);
  const selectors=new Set(parsed.dead.map(d=>d.selector));
  const identical=parsed.dead.filter(d=>d.value===d.winnerValue && d.important===d.winnerImportant).length;
  assert(selectors.size===9, `selector drift ${selectors.size}`);
  assert(identical===3, `identical drift ${identical}`);
  console.log('DEAD ROWS PASS|decl=436|dead=17|selectors=9|identical=3|changed=14');
}

function removeDeadRows(parsed) {
  const src=fs.readFileSync(TARGET,'utf8');
  const hadFinalNewline=/\r?\n$/.test(src);
  const lines=src.split(/\r?\n/); if(hadFinalNewline && lines[lines.length-1]==='') lines.pop();
  for(const d of [...parsed.dead].sort((a,b)=>b.line-a.line)){
    const line=lines[d.line-1];
    assert(line && line.trim().startsWith(`${d.property}:`), `line mismatch at ${d.line}: ${line}`);
    lines.splice(d.line-1,1);
  }
  fs.writeFileSync(TARGET,lines.join('\n')+(hadFinalNewline?'\n':''));
  const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);
  assert(stat[0]==='0' && stat[1]==='17' && stat[2]===TARGET, `unexpected diff ${stat.join(' ')}`);
  const after=parse(fs.readFileSync(TARGET,'utf8'));
  assert(after.declarations.length===419, `after declarations ${after.declarations.length}`);
  assert(after.dead.length===0, `after dead ${after.dead.length}`);
  console.log('EPHEMERAL DELTA PASS|file=home-overlays/before-after-preview.css|additions=0|deletions=17|decl=436->419|dead=17->0');
}

async function withBrowser(fn){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{return await fn(browser);}finally{await browser.close();}
}

async function capture(browser,tag){
  const out={};
  for(const width of viewports){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    await page.route('**/*',route=>{
      const u=new URL(route.request().url());
      const local=u.origin==='http://127.0.0.1:4173';
      if(local && u.pathname.endsWith('.js')) return route.abort();
      if(local || u.protocol==='data:' || u.protocol==='blob:') return route.continue();
      return route.abort();
    });
    await page.goto(`http://127.0.0.1:4173/index.html?${tag}-${width}-${Date.now()}`,{waitUntil:'networkidle',timeout:20000});
    await page.evaluate(()=>{
      document.querySelector('[data-doke-document-preloader]')?.remove();
      document.body.classList.add('before-after-preview-open');
      const overlay=document.querySelector('[data-before-after-preview]');
      if(!overlay) throw new Error('missing before-after overlay');
      overlay.hidden=false; overlay.setAttribute('aria-hidden','false');
      const set=(sel,text)=>{const n=document.querySelector(sel);if(n)n.textContent=text;};
      set('[data-before-after-preview-title]','Reforma completa de ambiente');
      set('[data-before-after-preview-provider]','Profissional Doke');
      set('[data-before-after-preview-meta]','São Paulo · Projeto concluído');
      set('[data-before-after-preview-description]','Comparação visual do projeto antes e depois da execução.');
      set('[data-before-after-preview-timeline]','12 dias');
      set('[data-before-after-preview-gain]','+42%');
      set('[data-before-after-preview-impact]','Alto');
    });
    await page.waitForTimeout(250);
    out[width]=await page.evaluate(()=>{
      const pick=(sel,props)=>{const el=document.querySelector(sel);if(!el)throw new Error('missing '+sel);const cs=getComputedStyle(el),r=el.getBoundingClientRect(),o={};for(const p of props)o[p]=cs[p];o.rect=[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000);return o;};
      return {
        overlay:pick('.before-after-preview',['display','position','zIndex','paddingTop','paddingRight','paddingBottom','paddingLeft']),
        dialog:pick('.before-after-preview__dialog',['display','width','maxHeight','borderRadius','backgroundColor','backgroundImage','overflow']),
        stage:pick('.before-after-preview__stage',['display','gridTemplateColumns','gridTemplateRows','minHeight']),
        mediaShell:pick('.before-after-preview__media-shell',['display','paddingTop','paddingRight','paddingBottom','paddingLeft']),
        mediaCard:pick('.before-after-preview__media-card',['display','gridTemplateRows','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','backgroundColor']),
        media:pick('.before-after-preview__media',['display','minHeight','height']),
        stats:pick('.before-after-preview__stats',['display','gridTemplateColumns','rowGap','columnGap']),
        stat:pick('.before-after-preview__stat',['paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius']),
        panel:pick('.before-after-preview__panel',['display','paddingTop','paddingRight','paddingBottom','paddingLeft','overflow']),
        mediaQueries:{max560:matchMedia('(max-width:560px)').matches,max680:matchMedia('(max-width:680px)').matches,max980:matchMedia('(max-width:980px)').matches},
        doc:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyClientWidth:document.body.clientWidth,bodyScrollWidth:document.body.scrollWidth}
      };
    });
    assert(out[width].doc.scrollWidth<=out[width].doc.clientWidth,`overflow ${tag} width=${width} ${JSON.stringify(out[width].doc)}`);
    await context.close();
  }
  return out;
}

(async()=>{
  assert(sh('git rev-parse HEAD')===TARGET_SHA,'wrong HEAD');
  assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'target blob drift');
  verifyReach();
  const parsed=parse(fs.readFileSync(TARGET,'utf8'));
  verifyDead(parsed);
  const server=cp.spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
  try{
    await new Promise(r=>setTimeout(r,700));
    const before=await withBrowser(browser=>capture(browser,'before'));
    removeDeadRows(parsed);
    const after=await withBrowser(browser=>capture(browser,'after'));
    assert(JSON.stringify(before)===JSON.stringify(after),`runtime parity mismatch\nBEFORE=${JSON.stringify(before,null,2)}\nAFTER=${JSON.stringify(after,null,2)}`);
    console.log(`CASCADE RUNTIME PARITY PASS|viewports=${viewports.join(',')}|runtimeDiffs=0|overflow=0|boundaries=560/680/980`);
  }finally{
    server.kill('SIGTERM');
    try{sh(`git reset --hard ${TARGET_SHA}`);sh('git clean -fdx');}catch(e){console.error(e.message);}
  }
  assert(sh('git rev-parse HEAD')===TARGET_SHA,'restore SHA failed');
  assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'restore blob failed');
  assert(sh('git status --porcelain')==='','worktree dirty after restore');
  console.log(`CHECKPOINT PASS|sha=${TARGET_SHA}|productMutation=0`);
})().catch(err=>{console.error(err.stack||err);try{cp.execSync(`git reset --hard ${TARGET_SHA} && git clean -fdx`,{stdio:'inherit'});}catch{}process.exit(1);});
