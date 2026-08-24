#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const cp = require('child_process');
const { chromium } = require('@playwright/test');

const ROOT = process.cwd();
const TARGET = 'assets/css/components/shell/mobile-app-shell.css';
const RESULT = '.diagnostics/ux-css-important-036-delta-isolation-r3.json';
const PARENT = '483d49d5f59c2eb24be0169f3d7ed6aec9703679';
const PARENT_BLOB = 'af6fd982517f2bc821435e633d70237e95ee11a8';
const R2C_BLOB = '296e2618c43caaa9bef93203840d2ac86bce5b6f';
const EXPECTED_CANDIDATE_SHA256 = '6f06c534cebd4a90b8734475b41eeee12241364c8cb472cc56d1a5b27575333e';
const EXPECTED_CANDIDATE_BLOB = '5108d74f666baa7899bdc831dc36ec7002a83128';
const PAGES = ['index.html','resultados.html','detalhe-anuncio.html','comunidade.html','ajuda.html'];
const WIDTHS = [390,560];
const original = fs.readFileSync(TARGET,'utf8');
const candidate = original.replace(/\s*!important\b/g,'');
const countImp = s => (s.match(/!important\b/g)||[]).length;
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const gitBlob = s => cp.execFileSync('git',['hash-object','--stdin'],{input:s,encoding:'utf8'}).trim();
const assert = (c,m) => { if(!c) throw new Error(m); };

assert(cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim() !== PARENT, 'R3 must execute on diagnostic branch, not certified product HEAD');
assert(countImp(original)===314,'parent important count drift');
assert(gitBlob(original)===PARENT_BLOB,'parent target blob drift');
assert(countImp(candidate)===0,'candidate important count mismatch');
assert(sha256(candidate)===EXPECTED_CANDIDATE_SHA256,'candidate sha256 drift');
assert(gitBlob(candidate)===EXPECTED_CANDIDATE_BLOB,'candidate git blob drift');

const mime = p => p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.css')?'text/css; charset=utf-8':p.endsWith('.js')?'application/javascript; charset=utf-8':p.endsWith('.json')?'application/json; charset=utf-8':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.jpg')||p.endsWith('.jpeg')?'image/jpeg':'application/octet-stream';
const server = http.createServer((req,res)=>{
  try {
    const u = new URL(req.url,'http://127.0.0.1:4173');
    let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    if(!rel) rel='index.html';
    const full = path.resolve(ROOT,rel);
    if(!full.startsWith(ROOT+path.sep) && full!==ROOT){ res.writeHead(403); return res.end('forbidden'); }
    if(!fs.existsSync(full) || fs.statSync(full).isDirectory()){ res.writeHead(404); return res.end('not found'); }
    res.writeHead(200,{'content-type':mime(full),'cache-control':'no-store'});
    fs.createReadStream(full).pipe(res);
  } catch(e){ res.writeHead(500); res.end(String(e)); }
});

function listen(){ return new Promise((resolve,reject)=>{ server.once('error',reject); server.listen(4173,'127.0.0.1',resolve); }); }
function close(){ return new Promise(resolve=>server.close(()=>resolve())); }

async function capturePhase(browser,label,cssText){
  fs.writeFileSync(TARGET,cssText);
  const out = {};
  for(const pageName of PAGES){
    for(const width of WIDTHS){
      const context = await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e)));
      await page.addInitScript(() => {
        const fixed = 1787572800000;
        const OriginalDate = Date;
        class FixedDate extends OriginalDate { constructor(...args){ super(...(args.length?args:[fixed])); } static now(){ return fixed; } }
        window.Date = FixedDate;
        let seed = 0.314159;
        Math.random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      });
      await page.route('**/*', route => {
        const url = route.request().url();
        if(url.startsWith('http://127.0.0.1:4173/')) return route.continue();
        return route.abort();
      });
      await page.goto(`http://127.0.0.1:4173/${pageName}`,{waitUntil:'commit',timeout:15000});
      await page.waitForFunction(()=>!!document.body,{timeout:10000});
      await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;} html{scroll-behavior:auto!important;}'});
      await page.waitForTimeout(700);
      const snap = await page.evaluate(() => {
        const targetNeedle = '/assets/css/components/shell/mobile-app-shell.css';
        const rules=[];
        function walkRules(ruleList,inTarget,media){
          for(const rule of Array.from(ruleList||[])){
            try {
              if(rule.type===CSSRule.IMPORT_RULE){
                const sheet=rule.styleSheet;
                const href=(sheet&&sheet.href)||rule.href||'';
                walkRules(sheet&&sheet.cssRules, inTarget || href.includes(targetNeedle), media);
              } else if(rule.type===CSSRule.MEDIA_RULE){
                walkRules(rule.cssRules,inTarget,[...media,rule.conditionText]);
              } else if(rule.type===CSSRule.SUPPORTS_RULE){
                walkRules(rule.cssRules,inTarget,[...media,`@supports ${rule.conditionText}`]);
              } else if(rule.type===CSSRule.STYLE_RULE && inTarget){
                const decls=[];
                for(const prop of Array.from(rule.style)){
                  if(rule.style.getPropertyPriority(prop)==='important') decls.push({property:prop,value:rule.style.getPropertyValue(prop).trim()});
                }
                if(decls.length) rules.push({selector:rule.selectorText,media,decls});
              }
            } catch(_){}
          }
        }
        for(const sheet of Array.from(document.styleSheets)){
          try { walkRules(sheet.cssRules,(sheet.href||'').includes(targetNeedle),[]); } catch(_){}
        }
        const keyOf = el => {
          if(el.id) return `#${el.id}`;
          const parts=[]; let cur=el;
          while(cur && cur.nodeType===1 && parts.length<8){
            let p=cur.tagName.toLowerCase();
            if(cur.classList.length) p += '.'+Array.from(cur.classList).slice(0,3).map(x=>CSS.escape(x)).join('.');
            const par=cur.parentElement;
            if(par){ const sib=Array.from(par.children).filter(x=>x.tagName===cur.tagName); if(sib.length>1) p += `:nth-of-type(${sib.indexOf(cur)+1})`; }
            parts.unshift(p); if(cur===document.body) break; cur=par;
          }
          return parts.join('>');
        };
        function baseSelector(sel,pseudo){
          if(!pseudo) return sel;
          return sel.replace(new RegExp(`::${pseudo}\\b`,'g'),'');
        }
        const records={};
        for(const el of Array.from(document.querySelectorAll('*'))){
          for(const pseudo of [null,'before','after']){
            const matched=[];
            for(const r of rules){
              const hasPseudo = pseudo ? r.selector.includes(`::${pseudo}`) : !/::(?:before|after)\b/.test(r.selector);
              if(!hasPseudo) continue;
              const sel = baseSelector(r.selector,pseudo);
              try { if(el.matches(sel)) matched.push(r); } catch(_){}
            }
            if(!matched.length) continue;
            const props=[...new Set(matched.flatMap(r=>r.decls.map(d=>d.property)))].sort();
            const cs=getComputedStyle(el,pseudo?`::${pseudo}`:null);
            const values={}; for(const p of props) values[p]=cs.getPropertyValue(p);
            const rect=!pseudo?(()=>{const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};})():null;
            const k=keyOf(el)+(pseudo?`::${pseudo}`:'');
            records[k]={values,rect,matched};
          }
        }
        return {href:location.pathname,ruleCount:rules.length,records};
      });
      out[`${pageName}@${width}`]={...snap,pageErrors:errors};
      await context.close();
    }
  }
  return out;
}

function compare(parent,cand){
  const stateDiffs=[];
  const blockerMap=new Map();
  for(const state of Object.keys(parent)){
    const a=parent[state], b=cand[state];
    const diffs=[];
    const keys=new Set([...Object.keys(a.records),...Object.keys(b.records)]);
    for(const key of keys){
      const ar=a.records[key], br=b.records[key];
      if(!ar||!br){ diffs.push({node:key,type:'presence',parent:!!ar,candidate:!!br}); continue; }
      const props=new Set([...Object.keys(ar.values),...Object.keys(br.values)]);
      for(const prop of props){
        const av=ar.values[prop]??'', bv=br.values[prop]??'';
        if(av!==bv){
          const sources=[];
          for(const m of ar.matched){
            for(const d of m.decls){ if(d.property===prop) sources.push({selector:m.selector,media:m.media,value:d.value}); }
          }
          diffs.push({node:key,type:'computed',property:prop,parent:av,candidate:bv,sources});
          for(const s of sources){
            const bk=JSON.stringify([s.selector,s.media,prop,s.value]);
            const rec=blockerMap.get(bk)||{selector:s.selector,media:s.media,property:prop,value:s.value,states:new Set(),nodes:new Set(),count:0};
            rec.states.add(state); rec.nodes.add(key); rec.count++; blockerMap.set(bk,rec);
          }
        }
      }
      if(ar.rect && br.rect){
        for(const p of ['x','y','width','height']) if(Math.abs(ar.rect[p]-br.rect[p])>0.01) diffs.push({node:key,type:'geometry',property:p,parent:ar.rect[p],candidate:br.rect[p]});
      }
    }
    stateDiffs.push({state,diffCount:diffs.length,diffs:diffs.slice(0,300),pageErrors:[...a.pageErrors,...b.pageErrors]});
  }
  const blockers=[...blockerMap.values()].map(x=>({...x,states:[...x.states].sort(),nodes:[...x.nodes].sort()})).sort((a,b)=>b.count-a.count || a.selector.localeCompare(b.selector));
  return {stateDiffs,blockers};
}

(async()=>{
  const receipt={boundary:'UX-CSS-IMPORTANT-036',proof:'delta-isolation-r3',certified035Head:PARENT,target:TARGET,parentBlob:PARENT_BLOB,parentImportant:314,candidateImportant:0,candidateSha256:EXPECTED_CANDIDATE_SHA256,candidateGitBlob:EXPECTED_CANDIDATE_BLOB,r2cReceiptBlob:R2C_BLOB,pages:PAGES,widths:WIDTHS,status:'FAIL'};
  let browser;
  try {
    await listen();
    browser=await chromium.launch({headless:true});
    const parent=await capturePhase(browser,'parent',original);
    const cand=await capturePhase(browser,'candidate',candidate);
    const cmp=compare(parent,cand);
    const differing=cmp.stateDiffs.filter(x=>x.diffCount>0);
    const pageErrors=cmp.stateDiffs.flatMap(x=>x.pageErrors);
    assert(pageErrors.length===0,`page errors: ${JSON.stringify(pageErrors.slice(0,10))}`);
    assert(differing.length>0,'expected semantic differences from canonical R2C but found none');
    assert(cmp.blockers.length>0,'semantic differences could not be mapped to target important declarations');
    receipt.parentRuleCounts=Object.fromEntries(Object.entries(parent).map(([k,v])=>[k,v.ruleCount]));
    receipt.differingStateCount=differing.length;
    receipt.differingStates=differing.map(x=>x.state);
    receipt.totalPropertyAndGeometryDiffs=differing.reduce((n,x)=>n+x.diffCount,0);
    receipt.stateDiffs=differing;
    receipt.blockerDeclarationCount=cmp.blockers.length;
    receipt.blockers=cmp.blockers;
    receipt.decision='BLOCKING_IMPORTANT_DECLARATIONS_ISOLATED_BUILD_NARROW_CANDIDATE';
    receipt.mutationAuthorityGranted=false;
    receipt.status='PASS';
  } catch(e){ receipt.error=String(e&&e.stack||e); }
  finally {
    try { fs.writeFileSync(TARGET,original); } catch(_){}
    if(browser) try{ await browser.close(); }catch(_){}
    try{ await close(); }catch(_){}
    fs.writeFileSync(RESULT,JSON.stringify(receipt,null,2)+'\n');
  }
  if(receipt.status!=='PASS') process.exit(1);
})();
