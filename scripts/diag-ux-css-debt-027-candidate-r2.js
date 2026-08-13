const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const { chromium } = require('playwright');

const TARGET = 'assets/css/pages/pagamento-profissional.css';
const TARGET_SHA = '820896977bfbba4f499b67f1707298f5bd7339be';
const TARGET_BLOB = '4411ec3c8fe73a925963b59602b2fefad2e5a264';
const SHARED = 'assets/css/components/overlays/modal-visual-contract.css';
const SHARED_BLOB = '2fd0b2fc22c9437052e00442848c0ed93966021a';
const FOUNDATION = 'assets/css/pages/pagamento-profissional-foundation.css';
const FOUNDATION_BLOB = 'e9a65fb9c44c42e58f6b52cf8b3af5c89322108c';
const HTML = 'pagamento-profissional.html';
const HTML_BLOB = 'b9f9e504f9d521100b8bbc0c67a08bf361aacd91';
const PROPS = ['align-items', 'gap', 'padding', 'border-radius', 'background', 'font-size'];
const VIEWPORTS = [[390,844],[430,900],[560,900],[600,900],[760,900],[761,900],[820,1180],[1366,900]];

function sh(command, options = {}) {
  return cp.execSync(command, { cwd: process.cwd(), encoding: 'utf8', stdio: options.capture ? ['ignore','pipe','pipe'] : 'inherit', shell: '/bin/bash' });
}
function gitBlob(file) { return cp.execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim(); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function parseCss(src) {
  const lines = src.split(/\r?\n/); let depth=0, sp=[], ap=[], sel=null, ds=[], stack=[];
  const re=/^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/, norm=p=>p.join(' ').replace(/\{\s*$/,'').replace(/\s+/g,' ').trim();
  for (const line of lines) {
    const t=line.trim(), o=(line.match(/\{/g)||[]).length, c=(line.match(/\}/g)||[]).length;
    if (!sel) {
      if (ap.length) { if(t) ap.push(t); if(line.includes('{')) { stack.push({type:'at',header:norm(ap),depthBefore:depth}); ap=[]; } }
      else if (t.startsWith('@') && !t.includes(';')) { if(line.includes('{')) stack.push({type:'at',header:norm([t]),depthBefore:depth}); else ap=[t]; }
      else if (sp.length) { if(t) sp.push(t); if(line.includes('{')) { sel=norm(sp); sp=[]; stack.push({type:'rule',selector:sel,depthBefore:depth}); } }
      else if (t && !t.startsWith('/*') && !t.startsWith('*') && t!=='*/' && t!=='}' && !t.startsWith('@') && !line.includes(';')) { sp=[t]; if(line.includes('{')) { sel=norm(sp); sp=[]; stack.push({type:'rule',selector:sel,depthBefore:depth}); } }
    }
    if (sel) { const m=line.match(re); if(m) { const raw=m[2].trim(); ds.push({sel,prop:m[1].toLowerCase(),imp:/\s*!important\s*$/i.test(raw),ctx:stack.filter(x=>x.type==='at').map(x=>x.header).join(' || ')}); } }
    depth += o-c;
    while(stack.length && depth<=stack[stack.length-1].depthBefore) { const p=stack.pop(); if(p.type==='rule') sel=null; }
  }
  const last=new Map(); let dead=0;
  for(let i=ds.length-1;i>=0;i--) { const d=ds[i], k=`${d.ctx}>${d.sel}>${d.prop}`, l=last.get(k); if(l && (!d.imp || l.imp)) dead++; if(!l || d.imp || !l.imp) last.set(k,d); }
  return { decl: ds.length, dead };
}

async function capture(mode) {
  const server = cp.spawn(process.execPath, ['scripts/serve-static-site.js','--host=127.0.0.1','--port=5500'], { stdio:'ignore', env:{...process.env,DOKE_E2E_DISABLE_REMOTE_SERVICES:'1'} });
  try {
    await sleep(600);
    const browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-dev-shm-usage'] });
    const result = {};
    for (const [width,height] of VIEWPORTS) {
      const context = await browser.newContext({ viewport:{width,height}, reducedMotion:'reduce' });
      const page = await context.newPage();
      await page.route('**/*', route => {
        const url = new URL(route.request().url()); const local = url.origin === 'http://127.0.0.1:5500';
        if (local && url.pathname.endsWith('.js')) return route.abort();
        if (local || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
        return route.abort();
      });
      await page.goto('http://127.0.0.1:5500/pagamento-profissional.html', { waitUntil:'load', timeout:15000 });
      await page.waitForFunction(() => {
        const seen = new Set();
        function walk(sheet) {
          if (!sheet || seen.has(sheet)) return false; seen.add(sheet);
          if ((sheet.href || '').includes('/assets/css/pages/pagamento-profissional.css')) return true;
          let rules; try { rules = sheet.cssRules; } catch { return false; }
          for (const rule of rules || []) if (rule.styleSheet && walk(rule.styleSheet)) return true;
          return false;
        }
        return [...document.styleSheets].some(walk);
      }, null, { timeout:7500 });
      await page.addStyleTag({ content:'html,body{visibility:visible!important;opacity:1!important}.doke-document-preloader,.doke-page-hydration-skeleton{display:none!important}' });
      const state = await page.evaluate(({props}) => {
        const target=document.querySelector('.payment-finish-check'), modal=document.querySelector('[data-finish-order-modal]');
        if(!target || !modal) throw new Error('canonical DOM missing');
        modal.hidden=false; modal.setAttribute('aria-hidden','false');
        const pageVals=Object.fromEntries(props.map(p=>[p,[]])); let pageRules=0, sharedRules=0;
        const seen=new Set();
        function walk(sheet) {
          if(!sheet || seen.has(sheet)) return; seen.add(sheet);
          let rules; try { rules=sheet.cssRules; } catch { return; }
          const href=sheet.href || '';
          for(const rule of rules || []) {
            if(rule.styleSheet) { walk(rule.styleSheet); continue; }
            if(rule.cssRules) { try { for(const nested of rule.cssRules) inspect(nested, href); } catch {} continue; }
            inspect(rule, href);
          }
        }
        function inspect(rule, href) {
          if(rule.cssRules) { for(const nested of rule.cssRules) inspect(nested, href); return; }
          if(!rule.selectorText) return;
          const owner=rule.parentStyleSheet?.href || href || '';
          if(owner.includes('/assets/css/pages/pagamento-profissional.css') && rule.selectorText==='.payment-finish-check') {
            pageRules++;
            for(const p of props) { const v=rule.style.getPropertyValue(p).trim(); if(v) pageVals[p].push({value:v,priority:rule.style.getPropertyPriority(p)}); }
          }
          if(owner.includes('/assets/css/components/overlays/modal-visual-contract.css') && rule.selectorText.includes('.doke-modal-check')) sharedRules++;
        }
        for(const sheet of document.styleSheets) walk(sheet);
        const cs=getComputedStyle(target), root=getComputedStyle(document.documentElement), rect=target.getBoundingClientRect();
        return { dom:document.querySelectorAll('.payment-finish-check').length, pageRules, sharedRules, pageVals,
          computed:{display:cs.display,align:cs.alignItems,gap:cs.gap,padding:[cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft],fontSize:cs.fontSize,background:cs.backgroundColor,radius:cs.borderTopLeftRadius,color:cs.color,fontWeight:cs.fontWeight,cursor:cs.cursor},
          rect:[+rect.x.toFixed(3),+rect.y.toFixed(3),+rect.width.toFixed(3),+rect.height.toFixed(3)],
          doc:[document.documentElement.scrollWidth,document.documentElement.clientWidth,document.body.scrollWidth,document.body.clientWidth], rootFont:root.fontSize };
      }, { props:PROPS });
      assert(state.dom===1, `DOM ${mode} ${width}=${state.dom}`);
      const expected = mode==='parent' ? 2 : 1;
      for(const p of PROPS) { assert(state.pageVals[p].length===expected, `CSSOM ${mode} ${width} ${p}=${state.pageVals[p].length}`); assert(!state.pageVals[p].some(x=>x.priority), `priority ${mode} ${width} ${p}`); }
      assert(state.sharedRules>=1, `shared authority ${mode} ${width}`);
      assert(state.computed.display==='flex' && state.computed.align==='center' && state.computed.gap==='12px', `computed core ${mode} ${width}`);
      assert(JSON.stringify(state.computed.padding)===JSON.stringify(['0px','14px','0px','14px']), `computed padding ${mode} ${width}: ${state.computed.padding}`);
      assert(Math.abs(parseFloat(state.computed.fontSize)-parseFloat(state.rootFont)*0.9)<0.05, `font ${mode} ${width}`);
      assert(state.rect[2]>0 && state.rect[3]>0 && state.rect[0]>=-1 && state.rect[0]+state.rect[2]<=width+1, `rect ${mode} ${width}`);
      assert(state.doc[0]<=state.doc[1]+1 && state.doc[2]<=state.doc[3]+1, `overflow ${mode} ${width}`);
      result[width]=state; await context.close();
    }
    await browser.close();
    console.log(`CAPTURE PASS|mode=${mode}|viewports=8|pageCSSOM=${mode==='parent'?'2x6':'1x6'}|sharedAuthority=1|computed=center+12px+0x14+0.9rem|overflow=0`);
    return result;
  } finally { server.kill('SIGTERM'); }
}

function buildCandidate() {
  const src=fs.readFileSync(TARGET,'utf8'), lines=src.split(/\r?\n/), starts=[];
  lines.forEach((line,i)=>{ if(line.trim()==='.payment-finish-check {') starts.push(i); });
  assert(starts.length===2, `selector count ${starts.length}`);
  const start=starts[0]; let end=-1; for(let i=start+1;i<lines.length;i++) if(lines[i].trim()==='}') { end=i; break; }
  assert(end>start, 'first block end missing');
  const exact=['align-items: flex-start;','gap: 11px;','padding: 14px;','border-radius: var(--form-control-surface-radius, var(--radius-sm));','background: #f8fbfe;','font-size: 0.8rem;'];
  const del=new Set();
  for(const value of exact) { const hits=[]; for(let i=start+1;i<end;i++) if(lines[i].trim()===value) hits.push(i); assert(hits.length===1, `row drift ${value} hits=${hits.length}`); del.add(hits[0]); }
  const second=lines.slice(starts[1],starts[1]+12).join('\n');
  for(const value of ['align-items: center;','gap: 12px;','padding: 12px 14px;','border-radius: var(--radius-base);','background: rgba(248, 252, 255, 0.88);','font-size: 0.9rem;']) assert(second.includes(value), `winner drift ${value}`);
  const out=lines.filter((_line,i)=>!del.has(i)).join('\n'); fs.writeFileSync(TARGET,out);
  const hash=crypto.createHash('sha256').update(out).digest('hex');
  const diff=cp.execFileSync('git',['diff','--numstat','--',TARGET],{encoding:'utf8'}).trim().split(/\s+/);
  assert(diff[0]==='0' && diff[1]==='6', `delta ${diff.join('/')}`);
  assert(cp.execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim()===TARGET,'product file delta drift');
  console.log(`CANDIDATE BUILD PASS|hash=${hash}|bytes=${Buffer.byteLength(src)}->${Buffer.byteLength(out)}|files=1|additions=0|deletions=6`);
  return { hash, parentBytes:Buffer.byteLength(src), candidateBytes:Buffer.byteLength(out) };
}

function canonicalResidual() {
  const report=JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json','utf8'));
  const files=cp.execFileSync('git',['ls-files','-z','assets/css'],{encoding:'utf8'}).split('\0').filter(f=>f.endsWith('.css'));
  const ir=/@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;
  const norm=(v,from)=>{v=v.replace(/\?.*$/,'').replace(/^\.\//,'');if(v.startsWith('/'))return v.replace(/^\/+/, '');if(v.startsWith('assets/'))return v;return path.posix.normalize(path.posix.join(path.posix.dirname(from),v));};
  const meta=new Map();
  for(const f of files){const text=fs.readFileSync(f,'utf8'),imports=[];let m;ir.lastIndex=0;while((m=ir.exec(text)))imports.push(norm(m[1],f));meta.set(f,{text,imports,size:Buffer.byteLength(text),important:(text.match(/!important/gi)||[]).length});}
  const active=new Set(),todo=[...new Set(report.pageAssets.flatMap(p=>p.css))].filter(f=>meta.has(f)); while(todo.length){const f=todo.pop();if(active.has(f)||!meta.has(f))continue;active.add(f);for(const n of meta.get(f).imports)if(meta.has(n))todo.push(n);}
  const high=[...active].filter(f=>{const x=meta.get(f);return x.size>=50000||x.important>=100||x.imports.length>=10;});
  assert(active.size===401 && high.length===37, `estate ${active.size}/${high.length}`);
  const rows=[...active].map(f=>({f,...parseCss(meta.get(f).text)})).filter(r=>r.dead), total=rows.reduce((n,r)=>n+r.dead,0), highDead=rows.filter(r=>high.includes(r.f)).length, target=parseCss(meta.get(TARGET).text);
  assert(rows.length===47 && total===1280 && highDead===0 && target.dead===0, `residual ${rows.length}/${total}/${highDead}/${target.decl}/${target.dead}`);
  console.log(`CANDIDATE RESIDUAL PASS|active=401|high=37|files=47|dead=1280|highDead=0|target=${target.decl}/dead0`);
  return target;
}

async function main() {
  assert(cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===TARGET_SHA,'parent SHA drift');
  assert(gitBlob(TARGET)===TARGET_BLOB,'target blob drift'); assert(gitBlob(SHARED)===SHARED_BLOB,'shared blob drift'); assert(gitBlob(FOUNDATION)===FOUNDATION_BLOB,'foundation blob drift'); assert(gitBlob(HTML)===HTML_BLOB,'html blob drift');
  fs.copyFileSync(TARGET,'/tmp/parent-027.css');
  sh('node scripts/generate-responsive-index-baseline.js'); fs.copyFileSync('reports/responsive-index-baseline.json','/tmp/parent-responsive-027.json');
  const parentCapture=await capture('parent');
  const parentParsed=parseCss(fs.readFileSync('/tmp/parent-027.css','utf8')); assert(parentParsed.dead===6,`parent target dead ${parentParsed.dead}`);
  const build=buildCandidate(); const candidateParsed=parseCss(fs.readFileSync(TARGET,'utf8')); assert(candidateParsed.dead===0 && candidateParsed.decl===parentParsed.decl-6,`parser ${parentParsed.decl}/${parentParsed.dead}->${candidateParsed.decl}/${candidateParsed.dead}`); console.log(`PARSER PASS|decl=${parentParsed.decl}->${candidateParsed.decl}|dead=6->0`);
  const candidateCapture=await capture('candidate');
  for(const width of Object.keys(parentCapture)) { const a=structuredClone(parentCapture[width]),b=structuredClone(candidateCapture[width]); delete a.pageRules;delete a.pageVals;delete b.pageRules;delete b.pageVals; assert(JSON.stringify(a)===JSON.stringify(b),`runtime mismatch ${width}`); }
  console.log('RUNTIME PARITY PASS|computed+rect+document/body=0-diffs|pageCSSOM=2x6->1x6|sharedAuthority=preserved');
  fs.copyFileSync('/tmp/parent-responsive-027.json','reports/responsive-index-baseline.json');
  const responsive=sh('node scripts/test-responsive-contract.js',{capture:true}); process.stdout.write(responsive); assert(responsive.includes('Checks: 893')&&responsive.includes('Failures: 0')&&responsive.includes('Skips: 277'),'responsive drift');
  const conflicts=sh('node scripts/audit-css-responsive-conflicts.js',{capture:true}); process.stdout.write(conflicts); assert(conflicts.includes('Conflicting class/property pairs: 339'),'conflicts drift');
  sh('npm run audit:agent-governance'); sh('npm run audit:shared-app-header-contract'); sh('npm run audit:mobile-shell-location-contract'); sh('npm run audit:responsive-boundaries'); sh('npm run audit:duplicate-assets');
  const domain=sh('npm run audit:domain-completion-matrix',{capture:true}); process.stdout.write(domain); for(const marker of ['Domains: 23','Critical flows: 15','Average maturity: 2.91/6','Critical blockers: 12']) assert(domain.includes(marker),`domain drift ${marker}`);
  sh('npm run audit:active-legacy-structures'); const targetResidual=canonicalResidual();
  sh('git diff --check');
  console.log(`CANDIDATE FINAL PASS|hash=${build.hash}|files=1|additions=0|deletions=6|decl=${parentParsed.decl}->${candidateParsed.decl}|dead=6->0|residual=47/1280/0|conflicts=339|responsive=893/0/277`);
}

main().catch(error=>{console.error(error);process.exit(1)});
