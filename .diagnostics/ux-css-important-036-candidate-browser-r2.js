#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { chromium } = require('@playwright/test');

const ROOT = process.cwd();
const TARGET = 'assets/css/components/shell/mobile-app-shell.css';
const RESULT = '.diagnostics/ux-css-important-036-candidate-browser-r2.json';
const CERTIFIED_HEAD = '483d49d5f59c2eb24be0169f3d7ed6aec9703679';
const EXPECTED_BLOB = 'af6fd982517f2bc821435e633d70237e95ee11a8';
const PAGES = [
  'index.html','resultados.html','detalhe-anuncio.html','comunidade.html','perfil-profissional.html',
  'ajuda.html','mensagens.html','pedidos.html','notificacoes.html','configuracoes.html'
];
const WIDTHS = [390,560,760,761,1024,1025];
const targetPath = path.join(ROOT, TARGET);
const original = fs.readFileSync(targetPath, 'utf8');
const countImportant = (s) => (s.match(/!important\b/g) || []).length;
const sha256 = (s) => crypto.createHash('sha256').update(Buffer.from(s)).digest('hex');
const gitBlob = (s) => {
  const b = Buffer.from(s);
  return crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
};
const candidate = original.replace(/\s*!important\b/g, '');
const classTokens = [...new Set([...original.matchAll(/\.([_a-zA-Z]+[_a-zA-Z0-9-]*)/g)].map(m => m[1]))].sort();

function assert(cond, msg) { if (!cond) throw new Error(msg); }
assert(countImportant(original) === 314, `expected 314 parent markers, got ${countImportant(original)}`);
assert(countImportant(candidate) === 0, `candidate markers not zero: ${countImportant(candidate)}`);
assert(candidate === original.replace(/\s*!important\b/g, ''), 'candidate is not exact marker-only transform');

const out = {
  boundary: 'UX-CSS-IMPORTANT-036', proof: 'candidate-browser-r2', certified035Head: CERTIFIED_HEAD,
  target: TARGET, parentBlobExpected: EXPECTED_BLOB,
  parentImportant: countImportant(original), candidateImportant: countImportant(candidate),
  candidateSha256: sha256(candidate), candidateGitBlob: gitBlob(candidate), candidateBytes: Buffer.byteLength(candidate),
  selectorClassTokenCount: classTokens.length, pages: PAGES, widths: WIDTHS,
  statesPerPhase: PAGES.length * WIDTHS.length, criteriaRelaxed: false,
  syntheticDom: false, credentialsUsed: false, externalNetworkBlocked: true,
  parent: null, candidate: null, diffs: null, status: 'RUNNING'
};

function stableHash(v) { return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex'); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function startServer() {
  const p = spawn('python3', ['-m','http.server','4173','--bind','127.0.0.1'], {cwd:ROOT, stdio:['ignore','ignore','pipe']});
  await sleep(800);
  if (p.exitCode !== null) throw new Error('local http server failed to start');
  return p;
}

async function capturePhase(label, cssText) {
  fs.writeFileSync(targetPath, cssText);
  const browser = await chromium.launch({headless:true});
  const states = [];
  try {
    for (const pageName of PAGES) {
      for (const width of WIDTHS) {
        const context = await browser.newContext({viewport:{width,height:900}, deviceScaleFactor:1});
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', e => pageErrors.push(String(e.message || e)));
        await page.route('**/*', route => {
          const u = route.request().url();
          if (u.startsWith('http://127.0.0.1:4173/') || u.startsWith('data:') || u.startsWith('blob:')) route.continue();
          else route.abort();
        });
        await page.addInitScript(() => {
          let seed = 123456789;
          Math.random = () => ((seed = (1103515245 * seed + 12345) >>> 0) / 4294967296);
        });
        const url = `http://127.0.0.1:4173/${pageName}`;
        await page.goto(url, {waitUntil:'domcontentloaded', timeout:30000});
        await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}'});
        await page.waitForTimeout(450);
        const meta = await page.evaluate((tokens) => {
          const targetNeedle = '/assets/css/components/shell/mobile-app-shell.css';
          const sheetHrefs = Array.from(document.styleSheets).map(s=>s.href||'').filter(Boolean);
          const loaded = sheetHrefs.some(h=>h.includes(targetNeedle));
          const tokenSet = new Set(tokens);
          const els = Array.from(document.querySelectorAll('*')).filter(el => Array.from(el.classList || []).some(c=>tokenSet.has(c)));
          const nodePath = (el) => {
            const parts=[]; let n=el;
            while(n && n.nodeType===1 && n!==document.documentElement){
              let i=1, s=n; while((s=s.previousElementSibling)) i++;
              parts.push(`${n.tagName.toLowerCase()}:nth-child(${i})`); n=n.parentElement;
            }
            return parts.reverse().join('>');
          };
          const nodes = els.map(el => {
            const cs = getComputedStyle(el);
            const props = Array.from(cs).sort();
            const style = props.map(p=>`${p}:${cs.getPropertyValue(p)}`).join(';');
            const r = el.getBoundingClientRect();
            return {path:nodePath(el), classes:Array.from(el.classList).sort(), rect:[r.x,r.y,r.width,r.height].map(x=>Math.round(x*1000)/1000), style};
          }).sort((a,b)=>a.path.localeCompare(b.path));
          return {
            href: location.pathname, bodyClasses:Array.from(document.body.classList).sort(), loaded,
            nodeCount:nodes.length, nodes,
            scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
            viewport:[innerWidth,innerHeight]
          };
        }, classTokens);
        const normalizedNodes = meta.nodes.map(n=>({path:n.path,classes:n.classes,rect:n.rect,styleHash:stableHash(n.style)}));
        const normalized = {...meta, nodes:normalizedNodes};
        const shot1 = await page.screenshot({fullPage:true, animations:'disabled'});
        await page.waitForTimeout(120);
        const shot2 = await page.screenshot({fullPage:true, animations:'disabled'});
        const h1 = crypto.createHash('sha256').update(shot1).digest('hex');
        const h2 = crypto.createHash('sha256').update(shot2).digest('hex');
        states.push({page:pageName,width,metadataHash:stableHash(normalized),screenshotHash:h2,screenshotStable:h1===h2,targetLoaded:meta.loaded,nodeCount:meta.nodeCount,pageErrors,href:meta.href});
        await context.close();
      }
    }
  } finally { await browser.close(); }
  return {label, states, stableScreenshots:states.filter(s=>s.screenshotStable).length, targetLoadedStates:states.filter(s=>s.targetLoaded).length, pageErrorCount:states.reduce((n,s)=>n+s.pageErrors.length,0)};
}

(async()=>{
  const server = await startServer();
  try {
    out.parent = await capturePhase('parent', original);
    out.candidate = await capturePhase('candidate', candidate);
    const pMap = new Map(out.parent.states.map(s=>[`${s.page}@${s.width}`,s]));
    const diffs=[];
    for (const c of out.candidate.states) {
      const key=`${c.page}@${c.width}`; const p=pMap.get(key);
      if (!p) { diffs.push({key,type:'missing-parent'}); continue; }
      if (p.metadataHash!==c.metadataHash) diffs.push({key,type:'metadata'});
      if (p.screenshotHash!==c.screenshotHash) diffs.push({key,type:'screenshot'});
      if (p.href!==c.href) diffs.push({key,type:'route'});
      if (p.targetLoaded!==c.targetLoaded) diffs.push({key,type:'target-load'});
    }
    out.diffs = {
      total:diffs.length, metadata:diffs.filter(d=>d.type==='metadata').length,
      screenshot:diffs.filter(d=>d.type==='screenshot').length, route:diffs.filter(d=>d.type==='route').length,
      targetLoad:diffs.filter(d=>d.type==='target-load').length, sample:diffs.slice(0,40)
    };
    const total = out.statesPerPhase;
    assert(out.parent.states.length===total && out.candidate.states.length===total, 'state coverage incomplete');
    assert(out.parent.stableScreenshots===total && out.candidate.stableScreenshots===total, 'screenshot instability detected');
    assert(out.parent.pageErrorCount===0 && out.candidate.pageErrorCount===0, 'page errors detected');
    assert(out.diffs.total===0, `A/B differences detected: ${JSON.stringify(out.diffs)}`);
    out.status='BROWSER_PASS';
  } catch (e) {
    out.status='FAIL'; out.error=String(e && e.stack || e);
    process.exitCode=1;
  } finally {
    fs.writeFileSync(targetPath, original);
    try { server.kill('SIGTERM'); } catch {}
    fs.mkdirSync(path.dirname(RESULT),{recursive:true});
    fs.writeFileSync(RESULT, JSON.stringify(out,null,2)+'\n');
  }
})();
