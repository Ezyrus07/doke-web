const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const { chromium } = require('@playwright/test');

const TARGET = 'assets/css/pages/pedidos/orders-chat.css';
const TARGET_SHA = process.env.TARGET_SHA;
const TARGET_BLOB = process.env.TARGET_BLOB;
const viewports = [390, 430, 759, 760, 761, 820, 1280];

function sh(cmd, opts = {}) {
  return cp.execSync(cmd, { encoding: 'utf8', stdio: opts.stdio || ['ignore', 'pipe', 'pipe'] }).trim();
}
function assert(ok, msg) { if (!ok) throw new Error(msg); }
function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

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
  ['<global>','body.orders-page-shell .orders-chat-panel','background','var(--orders-chat-surface)','#eef7fd'],
  ['<global>','body.orders-page-shell .orders-chat-panel__body','gap','13px','16px'],
  ['<global>','body.orders-page-shell .orders-chat-panel__body','padding','16px 18px 18px','18px 28px 22px'],
  ['<global>','body.orders-page-shell .orders-chat-row','max-width','min(700px, 82%)','min(620px, 86%)'],
  ['<global>','body.orders-page-shell .orders-chat-row--me','max-width','min(700px, 78%)','min(620px, 78%)'],
  ['<global>','body.orders-page-shell .orders-chat-message','border-radius','var(--radius-exact-20) var(--radius-exact-20) var(--radius-exact-20) var(--radius-exact-7)','var(--radius-exact-20) var(--radius-exact-20) var(--radius-exact-20) var(--radius-2xs)'],
  ['<global>','body.orders-page-shell .orders-chat-message','box-shadow','var(--doke-elevation-surface)','var(--doke-elevation-surface)'],
  ['<global>','body.orders-page-shell .orders-chat-message--me','border-radius','var(--radius-exact-20) var(--radius-exact-20) var(--radius-exact-7) var(--radius-exact-20)','var(--radius-exact-20) var(--radius-exact-20) var(--radius-2xs) var(--radius-exact-20)'],
  ['<global>','body.orders-page-shell .orders-chat-message--me','background','linear-gradient(135deg, #25b4a6 0%, var(--orders-chat-success) 100%)','linear-gradient(135deg, #28b9a9 0%, #159e8e 100%)'],
  ['@media (max-width: 760px)','body.orders-page-shell .orders-chat-panel','width','min(100%, 430px)','min(100%, 430px)'],
  ['@media (max-width: 760px)','body.orders-page-shell .orders-chat-panel__body','gap','10px','12px'],
  ['@media (max-width: 760px)','body.orders-page-shell .orders-chat-panel__body','padding','12px','12px']
];

function verifyDead(parsed) {
  assert(parsed.declarations.length === 428, `declarations drift ${parsed.declarations.length}`);
  assert(parsed.dead.length === 12, `dead drift ${parsed.dead.length}`);
  const got=parsed.dead.map(d=>[d.context||'<global>',d.selector,d.property,d.value,d.winnerValue]);
  assert(JSON.stringify(got)===JSON.stringify(expected), `dead rows drift\n${JSON.stringify(got,null,2)}`);
  console.log('DEAD ROWS PASS|decl=428|dead=12|identical=3|changed=9');
}

function writeRouteFixture() {
  fs.writeFileSync('.diag-orders-chat-route.html', `<!doctype html><html><body class="orders-page-shell">
  <article class="order-card"><button data-order-open="chat">Chat</button></article>
  <script>
    window.__nav='';
    window.DokeNavigate=(href)=>{window.__nav=href;};
    window.DokeOrders={
      data:{readOrderCard:()=>({id:'ORDER-029'})},
      intelligence:{classifyOrder:(x)=>({id:x.id,title:'Pedido teste',company:'Doke'})}
    };
  </script>
  <script src="assets/js/pages/pedidos/orders-chat.js"></script>
  </body></html>`);
}
function writeCssFixture() {
  fs.writeFileSync('.diag-orders-chat-css.html', `<!doctype html><html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>:root{--radius-exact-20:20px;--radius-exact-7:7px;--radius-2xs:6px;--radius-md:16px;--radius-lg:24px;--doke-elevation-surface:0 2px 6px rgba(0,0,0,.12);--orders-chat-line:rgba(24,75,118,.1)}</style>
  <link rel="stylesheet" href="assets/css/pages/pedidos/orders-chat.css">
  </head><body class="orders-page-shell">
  <aside class="orders-chat-layer is-open"><section class="orders-chat-panel">
    <header class="orders-chat-panel__header"><div class="orders-chat-panel__top">Header</div></header>
    <div class="orders-chat-panel__body">
      <article class="orders-chat-row"><span class="orders-chat-row__avatar"></span><div class="orders-chat-message"><strong>Outro</strong><p>Mensagem de teste para geometria.</p></div></article>
      <article class="orders-chat-row orders-chat-row--me"><div class="orders-chat-message orders-chat-message--me"><strong>Você</strong><p>Minha mensagem de teste.</p></div></article>
    </div>
    <div class="orders-chat-ai-suggestion">IA</div><form class="orders-chat-panel__composer">Composer</form>
  </section></aside></body></html>`);
}

async function withBrowser(fn) {
  const browser=await chromium.launch({headless:true});
  try { return await fn(browser); } finally { await browser.close(); }
}

async function proveRoute(browser) {
  const page=await browser.newPage({viewport:{width:820,height:900}});
  await page.goto('http://127.0.0.1:4173/.diag-orders-chat-route.html?route=1', {waitUntil:'load'});
  await page.click('[data-order-open="chat"]');
  await page.waitForTimeout(50);
  const result=await page.evaluate(()=>({nav:window.__nav,layer:!!document.querySelector('[data-orders-chat-layer]'),api:!!window.DokeOrders?.chat?.openFromCard}));
  assert(result.api, 'orders chat API not bound');
  assert(result.nav==='mensagens.html?order=ORDER-029', `unexpected navigation ${result.nav}`);
  assert(result.layer===false, 'drawer layer was created on current route');
  console.log(`LIVE ROUTE PASS|nav=${result.nav}|drawerCreated=0|api=1`);
  await page.close();
}

async function capture(browser, tag) {
  const out={};
  for (const width of viewports) {
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage();
    await page.goto(`http://127.0.0.1:4173/.diag-orders-chat-css.html?${tag}-${width}-${Date.now()}`, {waitUntil:'networkidle'});
    out[width]=await page.evaluate(()=>{
      const pick=(sel,props)=>{const el=document.querySelector(sel); if(!el) throw new Error('missing '+sel); const cs=getComputedStyle(el),r=el.getBoundingClientRect(); const o={}; for(const p of props)o[p]=cs[p]; o.rect=[r.x,r.y,r.width,r.height].map(n=>Math.round(n*1000)/1000); return o;};
      return {
        panel:pick('.orders-chat-panel',['display','width','height','maxHeight','backgroundColor','borderRadius','transform','opacity']),
        body:pick('.orders-chat-panel__body',['display','gap','paddingTop','paddingRight','paddingBottom','paddingLeft','overflowX','overflowY']),
        row:pick('.orders-chat-row',['display','maxWidth','width']),
        rowMe:pick('.orders-chat-row--me',['display','maxWidth','width']),
        msg:pick('.orders-chat-message',['borderRadius','boxShadow','backgroundColor','backgroundImage']),
        msgMe:pick('.orders-chat-message--me',['borderRadius','boxShadow','backgroundColor','backgroundImage']),
        doc:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,bodyClientWidth:document.body.clientWidth,bodyScrollWidth:document.body.scrollWidth}
      };
    });
    assert(out[width].doc.scrollWidth<=out[width].doc.clientWidth, `overflow ${tag} width=${width}`);
    await context.close();
  }
  return out;
}

function removeDeadRows(parsed) {
  const lines=fs.readFileSync(TARGET,'utf8').split(/\r?\n/);
  for (const d of [...parsed.dead].sort((a,b)=>b.line-a.line)) {
    const line=lines[d.line-1];
    assert(line && line.trim().startsWith(`${d.property}:`), `line mismatch at ${d.line}: ${line}`);
    lines.splice(d.line-1,1);
  }
  fs.writeFileSync(TARGET, lines.join('\n'));
  const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);
  assert(stat[0]==='0' && stat[1]==='12' && stat[2]===TARGET, `unexpected diff ${stat.join(' ')}`);
  const after=parse(fs.readFileSync(TARGET,'utf8'));
  assert(after.declarations.length===416, `after declarations ${after.declarations.length}`);
  assert(after.dead.length===0, `after dead ${after.dead.length}`);
  console.log('EPHEMERAL DELTA PASS|file=orders-chat.css|additions=0|deletions=12|decl=428->416|dead=12->0');
}

(async()=>{
  assert(sh('git rev-parse HEAD')===TARGET_SHA, 'wrong HEAD');
  assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB, 'target blob drift');
  const js=fs.readFileSync('assets/js/pages/pedidos/orders-chat.js','utf8');
  assert((js.match(/\bcreateLayer\s*\(/g)||[]).length===1, 'createLayer has a runtime caller; reach assumption invalid');
  assert(js.includes('return navigateToConversation(order);'), 'openFromCard route changed');
  assert(js.includes('event.target.closest(\'[data-order-open="chat"]\')'), 'chat trigger binding changed');
  console.log('STATIC REACH PASS|createLayerLexicalRefs=1|openFromCard=navigateToConversation');

  const parsed=parse(fs.readFileSync(TARGET,'utf8'));
  verifyDead(parsed);
  writeRouteFixture(); writeCssFixture();
  const server=cp.spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
  try {
    await new Promise(r=>setTimeout(r,700));
    const before=await withBrowser(async browser=>{await proveRoute(browser); return capture(browser,'before');});
    removeDeadRows(parsed);
    const after=await withBrowser(async browser=>capture(browser,'after'));
    assert(JSON.stringify(before)===JSON.stringify(after), `runtime parity mismatch\nBEFORE=${JSON.stringify(before,null,2)}\nAFTER=${JSON.stringify(after,null,2)}`);
    console.log(`CASCADE RUNTIME PARITY PASS|viewports=${viewports.join(',')}|runtimeDiffs=0|overflow=0|boundary=760/761`);
  } finally {
    server.kill('SIGTERM');
    try { sh(`git reset --hard ${TARGET_SHA}`); sh('git clean -fdx'); } catch(e) { console.error(e.message); }
  }
  assert(sh('git rev-parse HEAD')===TARGET_SHA, 'restore SHA failed');
  assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB, 'restore blob failed');
  assert(sh('git status --porcelain')==='', 'worktree dirty after restore');
  console.log(`CHECKPOINT PASS|sha=${TARGET_SHA}|productMutation=0`);
})().catch(err=>{console.error(err.stack||err); try{cp.execSync(`git reset --hard ${TARGET_SHA} && git clean -fdx`,{stdio:'inherit'});}catch{} process.exit(1);});
