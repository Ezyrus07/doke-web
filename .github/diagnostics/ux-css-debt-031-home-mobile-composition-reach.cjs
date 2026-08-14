const fs = require('fs');
const cp = require('child_process');
const { chromium } = require('@playwright/test');

const TARGET = 'assets/css/pages/home/mobile-composition.css';
const IMPORTER = 'assets/css/pages/home-runtime-components.css';
const PAGE = 'index.html';
const TARGET_SHA = process.env.TARGET_SHA;
const TARGET_BLOB = process.env.TARGET_BLOB;
const viewports = [360, 379, 380, 381, 389, 390, 391, 420, 430, 559, 560, 561, 760, 1280];

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
  ['@media (max-width: 560px)','body.home-index-shell','--index-mobile-gutter','var(--doke-mobile-shell-edge, var(--doke-mobile-page-gutter, var(--doke-mobile-page-edge, 18px)))','var(--doke-mobile-shell-edge, var(--doke-mobile-page-gutter, var(--doke-mobile-page-edge, 18px)))'],
  ['@media (max-width: 560px)','body.home-index-shell','--index-mobile-card-width','min(78vw, 296px)','min(78vw, 296px)'],
  ['@media (max-width: 560px)','body.home-index-shell .doke-search-panel__form','min-height','var(--control-height-lg)','56px'],
  ['@media (max-width: 560px)','body.home-index-shell .doke-search-panel__form','height','var(--control-height-lg)','56px'],
  ['@media (max-width: 560px)','body.home-index-shell .home-search-hero__field','min-height','var(--control-height-lg)','100%'],
  ['@media (max-width: 560px)','body.home-index-shell .home-search-hero__field','height','var(--control-height-lg)','100%'],
  ['@media (max-width: 560px)','body.home-index-shell .home-search-hero__field','padding','6px 78px 6px 42px','0'],
  ['@media (max-width: 560px)','body.home-index-shell .home-search-hero__field','border-radius','var(--radius-exact-17)','0'],
  ['@media (max-width: 560px)','body.home-index-shell .doke-search-panel__input','height','100%','100%'],
  ['@media (max-width: 560px)','body.home-index-shell .doke-search-panel__input','min-height','0','0'],
  ['@media (max-width: 560px)','body.home-index-shell .doke-search-panel__input','font-size','15px','14px'],
  ['@media (max-width: 560px)','body.home-index-shell .home-search-hero__mobile-submit','left','12px','14px'],
  ['@media (max-width: 560px)','body.home-index-shell .home-search-hero__audio-button','right','50px','56px'],
  ['@media (max-width: 560px)','body.home-index-shell .home-search-hero__filter-button','width','42px','46px'],
  ['@media (max-width: 560px)','body.home-index-shell .home-search-hero__filter-button','height','var(--control-height-md)','var(--control-height-lg)'],
  ['@media (max-width: 560px)','body.home-index-shell .home-search-hero__filter-button','right','2px','5px'],
  ['@media (max-width: 560px)','body.home-index-shell .home-search-hero__filter-button','border-radius','var(--radius-exact-15)','var(--radius-exact-15)']
];

function verifyReach() {
  const importer=fs.readFileSync(IMPORTER,'utf8');
  const report=JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json','utf8'));
  assert((importer.match(/home\/mobile-composition\.css\?/g)||[]).length===1, 'importer target cardinality drift');
  const importers=sh(`git grep -l -F 'mobile-composition.css?v=' -- assets/css || true`).split(/\r?\n/).filter(Boolean).sort();
  assert(JSON.stringify(importers)===JSON.stringify([IMPORTER]), `target importer drift ${JSON.stringify(importers)}`);
  const pages=[];
  for (const p of report.pageAssets) if ((p.css||[]).includes(TARGET)) pages.push(p.page);
  assert(JSON.stringify(pages.sort())===JSON.stringify([PAGE]), `active reach drift ${JSON.stringify(pages)}`);
  console.log(`STATIC REACH PASS|page=${PAGE}|importer=${IMPORTER}|target=${TARGET}|pages=1`);
}

function verifyDead(parsed) {
  assert(parsed.declarations.length === 183, `declarations drift ${parsed.declarations.length}`);
  assert(parsed.dead.length === 17, `dead drift ${parsed.dead.length}`);
  const got=parsed.dead.map(d=>[d.context||'<global>',d.selector,d.property,d.value,d.winnerValue]);
  assert(JSON.stringify(got)===JSON.stringify(expected), `dead rows drift\n${JSON.stringify(got,null,2)}`);
  const selectors=new Set(parsed.dead.map(d=>d.selector));
  const identical=parsed.dead.filter(d=>d.value===d.winnerValue && d.important===d.winnerImportant).length;
  assert(selectors.size===7, `selector drift ${selectors.size}`);
  assert(identical===5, `identical drift ${identical}`);
  console.log('DEAD ROWS PASS|decl=183|dead=17|selectors=7|identical=5|changed=12');
}

function writeFixture() {
  fs.writeFileSync('.diag-home-mobile-composition.html', `<!doctype html><html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="${IMPORTER}">
  </head><body class="home-index-shell">
    <main class="home-search-hero">
      <section class="home-search-hero__panel"><div class="home-search-hero__card">
        <form class="doke-search-panel__form">
          <div class="home-search-hero__field">
            <input class="doke-search-panel__input" placeholder="Buscar serviços">
            <button class="home-search-hero__mobile-submit" type="button">S</button>
            <button class="home-search-hero__audio-button" type="button">A</button>
            <button class="home-search-hero__filter-button" type="button">F</button>
          </div>
        </form>
      </div></section>
    </main>
  </body></html>`);
}

async function withBrowser(fn) {
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try { return await fn(browser); } finally { await browser.close(); }
}

async function capture(browser, tag) {
  const out={};
  for (const width of viewports) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    await page.goto(`http://127.0.0.1:4173/.diag-home-mobile-composition.html?${tag}-${width}-${Date.now()}`, {waitUntil:'networkidle'});
    out[width]=await page.evaluate(()=>{
      const pick=(sel,props)=>{const el=document.querySelector(sel); if(!el) throw new Error('missing '+sel); const cs=getComputedStyle(el),r=el.getBoundingClientRect(); const o={}; for(const p of props)o[p]=cs[p]; o.rect=[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000); return o;};
      const body=getComputedStyle(document.body);
      return {
        vars:{gutter:body.getPropertyValue('--index-mobile-gutter').trim(),cardWidth:body.getPropertyValue('--index-mobile-card-width').trim()},
        form:pick('.doke-search-panel__form',['display','position','width','height','minHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','overflow']),
        field:pick('.home-search-hero__field',['display','position','width','height','minHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','overflow']),
        input:pick('.doke-search-panel__input',['display','width','height','minHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','fontSize','lineHeight']),
        submit:pick('.home-search-hero__mobile-submit',['position','left','right','width','height']),
        audio:pick('.home-search-hero__audio-button',['position','left','right','width','height']),
        filter:pick('.home-search-hero__filter-button',['position','left','right','width','height','borderRadius']),
        media:{max380:matchMedia('(max-width:380px)').matches,max390:matchMedia('(max-width:390px)').matches,max560:matchMedia('(max-width:560px)').matches},
        doc:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyClientWidth:document.body.clientWidth,bodyScrollWidth:document.body.scrollWidth}
      };
    });
    assert(out[width].doc.scrollWidth<=out[width].doc.clientWidth, `overflow ${tag} width=${width}`);
    await context.close();
  }
  return out;
}

function removeDeadRows(parsed) {
  const src=fs.readFileSync(TARGET,'utf8');
  const hadFinalNewline=/\r?\n$/.test(src);
  const lines=src.split(/\r?\n/);
  if (hadFinalNewline && lines[lines.length-1]==='') lines.pop();
  for (const d of [...parsed.dead].sort((a,b)=>b.line-a.line)) {
    const line=lines[d.line-1];
    assert(line && line.trim().startsWith(`${d.property}:`), `line mismatch at ${d.line}: ${line}`);
    lines.splice(d.line-1,1);
  }
  fs.writeFileSync(TARGET, lines.join('\n') + (hadFinalNewline?'\n':''));
  const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);
  assert(stat[0]==='0' && stat[1]==='17' && stat[2]===TARGET, `unexpected diff ${stat.join(' ')}`);
  const after=parse(fs.readFileSync(TARGET,'utf8'));
  assert(after.declarations.length===166, `after declarations ${after.declarations.length}`);
  assert(after.dead.length===0, `after dead ${after.dead.length}`);
  console.log('EPHEMERAL DELTA PASS|file=home/mobile-composition.css|additions=0|deletions=17|decl=183->166|dead=17->0');
}

(async()=>{
  assert(sh('git rev-parse HEAD')===TARGET_SHA, 'wrong HEAD');
  assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB, 'target blob drift');
  verifyReach();
  const parsed=parse(fs.readFileSync(TARGET,'utf8'));
  verifyDead(parsed);
  writeFixture();
  const server=cp.spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
  try {
    await new Promise(r=>setTimeout(r,700));
    const before=await withBrowser(browser=>capture(browser,'before'));
    removeDeadRows(parsed);
    const after=await withBrowser(browser=>capture(browser,'after'));
    assert(JSON.stringify(before)===JSON.stringify(after), `runtime parity mismatch\nBEFORE=${JSON.stringify(before,null,2)}\nAFTER=${JSON.stringify(after,null,2)}`);
    console.log(`CASCADE RUNTIME PARITY PASS|viewports=${viewports.join(',')}|runtimeDiffs=0|overflow=0|boundaries=380/390/560`);
  } finally {
    server.kill('SIGTERM');
    try { sh(`git reset --hard ${TARGET_SHA}`); sh('git clean -fdx'); } catch(e) { console.error(e.message); }
  }
  assert(sh('git rev-parse HEAD')===TARGET_SHA, 'restore SHA failed');
  assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB, 'restore blob failed');
  assert(sh('git status --porcelain')==='', 'worktree dirty after restore');
  console.log(`CHECKPOINT PASS|sha=${TARGET_SHA}|productMutation=0`);
})().catch(err=>{console.error(err.stack||err); try{cp.execSync(`git reset --hard ${TARGET_SHA} && git clean -fdx`,{stdio:'inherit'});}catch{} process.exit(1);});
