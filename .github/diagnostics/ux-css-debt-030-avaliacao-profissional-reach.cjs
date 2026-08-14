const fs = require('fs');
const cp = require('child_process');
const { chromium } = require('@playwright/test');

const TARGET = 'assets/css/pages/avaliacao-profissional.css';
const FOUNDATION = 'assets/css/pages/avaliacao-profissional-foundation.css';
const PAGE = 'avaliacao-profissional.html';
const TARGET_SHA = process.env.TARGET_SHA;
const TARGET_BLOB = process.env.TARGET_BLOB;
const viewports = [390, 420, 430, 639, 640, 641, 760, 820, 1080, 1081, 1280];

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
  ['<global>','.pro-review-success__card','width','min(560px, 100%)','min(520px, 100%)'],
  ['<global>','.pro-review-success__card','padding','clamp(24px, 4vw, 34px)','clamp(26px, 4vw, 34px) clamp(22px, 4vw, 34px) 28px'],
  ['<global>','.pro-review-success__card','text-align','center','center'],
  ['<global>','.pro-review-success__icon','width','64px','52px'],
  ['<global>','.pro-review-success__icon','height','64px','52px'],
  ['<global>','.pro-review-success__icon','border-radius','50%','var(--radius-md)'],
  ['<global>','.pro-review-success__icon svg','width','34px','26px'],
  ['<global>','.pro-review-success__icon svg','height','34px','26px'],
  ['<global>','.pro-review-success__card h2','margin','16px 0 8px','0'],
  ['<global>','.pro-review-success__card h2','font-size','1.7rem','clamp(1.45rem, 3vw, 1.85rem)'],
  ['<global>','.pro-review-success__card p','line-height','1.56','1.55'],
  ['<global>','.pro-review-success__badges','display','flex','none'],
  ['<global>','.pro-review-success__actions','display','flex','grid'],
  ['<global>','.pro-review-success__actions','gap','12px','14px'],
  ['<global>','.pro-review-success__actions','margin-top','18px','22px']
];

function verifyReach() {
  const foundation=fs.readFileSync(FOUNDATION,'utf8');
  const html=fs.readFileSync(PAGE,'utf8');
  const report=JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json','utf8'));
  assert((foundation.match(/avaliacao-profissional\.css\?/g)||[]).length===1, 'foundation target import cardinality drift');
  assert((html.match(/avaliacao-profissional-foundation\.css\?/g)||[]).length===1, 'page foundation link cardinality drift');
  assert(!/<link[^>]+avaliacao-profissional\.css\?/i.test(html), 'target became a direct page stylesheet');
  const pages=[];
  for (const p of report.pageAssets) if ((p.css||[]).includes(TARGET)) pages.push(p.page);
  assert(JSON.stringify(pages.sort())===JSON.stringify([PAGE]), `active reach drift ${JSON.stringify(pages)}`);
  console.log(`STATIC REACH PASS|page=${PAGE}|foundation=${FOUNDATION}|target=${TARGET}|pages=1`);
}

function verifyDead(parsed) {
  assert(parsed.declarations.length === 391, `declarations drift ${parsed.declarations.length}`);
  assert(parsed.dead.length === 15, `dead drift ${parsed.dead.length}`);
  const got=parsed.dead.map(d=>[d.context||'<global>',d.selector,d.property,d.value,d.winnerValue]);
  assert(JSON.stringify(got)===JSON.stringify(expected), `dead rows drift\n${JSON.stringify(got,null,2)}`);
  const identical=parsed.dead.filter(d=>d.value===d.winnerValue && d.important===d.winnerImportant).length;
  assert(identical===1, `identical drift ${identical}`);
  console.log('DEAD ROWS PASS|decl=391|dead=15|selectors=7|identical=1|changed=14');
}

function writeFixture() {
  fs.writeFileSync('.diag-avaliacao-profissional-success.html', `<!doctype html><html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="${FOUNDATION}">
  </head><body class="pro-review-page-shell">
  <div class="pro-review-success doke-overlay doke-overlay--feedback" data-review-modal aria-hidden="false">
    <div class="pro-review-success__backdrop doke-overlay__backdrop"></div>
    <section class="pro-review-success__card doke-overlay__surface doke-modal-surface doke-modal-surface--feedback" role="dialog" aria-modal="true">
      <button class="pro-review-success__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button">×</button>
      <span class="pro-review-success__icon"><svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-9"></path></svg></span>
      <h2 class="doke-modal-title">Avaliação enviada</h2>
      <p>Sua avaliação foi enviada e poderá ajudar outros clientes a escolherem com mais segurança.</p>
      <div class="pro-review-success__badges"><span class="pro-review-badge pro-review-badge--success">Avaliação publicada</span><span class="pro-review-badge pro-review-badge--success">Pedido concluído</span></div>
      <div class="pro-review-success__actions doke-overlay__actions doke-modal-actions"><a class="doke-btn doke-btn--ghost">Voltar</a><a class="doke-btn doke-btn--primary">Ver perfil</a></div>
    </section>
  </div></body></html>`);
}

async function withBrowser(fn) {
  const browser=await chromium.launch({headless:true});
  try { return await fn(browser); } finally { await browser.close(); }
}

async function capture(browser, tag) {
  const out={};
  for (const width of viewports) {
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage();
    await page.goto(`http://127.0.0.1:4173/.diag-avaliacao-profissional-success.html?${tag}-${width}-${Date.now()}`, {waitUntil:'networkidle'});
    out[width]=await page.evaluate(()=>{
      const pick=(sel,props)=>{const el=document.querySelector(sel); if(!el) throw new Error('missing '+sel); const cs=getComputedStyle(el),r=el.getBoundingClientRect(); const o={}; for(const p of props)o[p]=cs[p]; o.rect=[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000); return o;};
      return {
        card:pick('.pro-review-success__card',['display','justifyItems','alignContent','width','minHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','overflow','textAlign','borderRadius','backgroundColor']),
        icon:pick('.pro-review-success__icon',['display','width','height','marginTop','marginRight','marginBottom','marginLeft','borderRadius','backgroundColor']),
        iconSvg:pick('.pro-review-success__icon svg',['width','height','strokeWidth']),
        title:pick('.pro-review-success__card h2',['marginTop','marginRight','marginBottom','marginLeft','maxWidth','fontSize','lineHeight']),
        copy:pick('.pro-review-success__card p',['marginTop','maxWidth','fontSize','lineHeight']),
        badges:pick('.pro-review-success__badges',['display','gap','marginTop']),
        actions:pick('.pro-review-success__actions',['display','gridTemplateColumns','gap','width','marginTop','paddingTop','borderTopWidth']),
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
  assert(stat[0]==='0' && stat[1]==='15' && stat[2]===TARGET, `unexpected diff ${stat.join(' ')}`);
  const after=parse(fs.readFileSync(TARGET,'utf8'));
  assert(after.declarations.length===376, `after declarations ${after.declarations.length}`);
  assert(after.dead.length===0, `after dead ${after.dead.length}`);
  console.log('EPHEMERAL DELTA PASS|file=avaliacao-profissional.css|additions=0|deletions=15|decl=391->376|dead=15->0');
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
    console.log(`CASCADE RUNTIME PARITY PASS|viewports=${viewports.join(',')}|runtimeDiffs=0|overflow=0|boundary=640/641`);
  } finally {
    server.kill('SIGTERM');
    try { sh(`git reset --hard ${TARGET_SHA}`); sh('git clean -fdx'); } catch(e) { console.error(e.message); }
  }
  assert(sh('git rev-parse HEAD')===TARGET_SHA, 'restore SHA failed');
  assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB, 'restore blob failed');
  assert(sh('git status --porcelain')==='', 'worktree dirty after restore');
  console.log(`CHECKPOINT PASS|sha=${TARGET_SHA}|productMutation=0`);
})().catch(err=>{console.error(err.stack||err); try{cp.execSync(`git reset --hard ${TARGET_SHA} && git clean -fdx`,{stdio:'inherit'});}catch{} process.exit(1);});
