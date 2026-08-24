#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const cp = require('child_process');
const postcss = require('postcss');
const { chromium } = require('@playwright/test');

const ROOT=process.cwd();
const TARGET='assets/css/components/shell/mobile-app-shell.css';
const RESULT='.diagnostics/ux-css-important-036-delta-isolation-r3b.json';
const PARENT='483d49d5f59c2eb24be0169f3d7ed6aec9703679';
const PARENT_BLOB='af6fd982517f2bc821435e633d70237e95ee11a8';
const R2C_BLOB='296e2618c43caaa9bef93203840d2ac86bce5b6f';
const R3_FAIL_BLOB='d048bcd685ac260a0d642303e1d22530751b1d50';
const CAND_SHA='6f06c534cebd4a90b8734475b41eeee12241364c8cb472cc56d1a5b27575333e';
const CAND_BLOB='5108d74f666baa7899bdc831dc36ec7002a83128';
const PAGES=['index.html','resultados.html','detalhe-anuncio.html','comunidade.html','ajuda.html'];
const WIDTHS=[390,560];
const original=fs.readFileSync(TARGET,'utf8');
const candidate=original.replace(/\s*!important\b/g,'');
const countImp=s=>(s.match(/!important\b/g)||[]).length;
const sha256=s=>crypto.createHash('sha256').update(s).digest('hex');
const gitBlob=s=>cp.execFileSync('git',['hash-object','--stdin'],{input:s,encoding:'utf8'}).trim();
const assert=(c,m)=>{if(!c)throw new Error(m);};

assert(countImp(original)===314,'parent important drift');
assert(gitBlob(original)===PARENT_BLOB,'parent blob drift');
assert(countImp(candidate)===0,'candidate important drift');
assert(sha256(candidate)===CAND_SHA,'candidate sha drift');
assert(gitBlob(candidate)===CAND_BLOB,'candidate blob drift');

const parsed=postcss.parse(original,{from:TARGET});
const importantDecls=[];
parsed.walkDecls(decl=>{
  if(!decl.important) return;
  const rule=decl.parent;
  if(!rule || rule.type!=='rule') return;
  const media=[];
  let p=rule.parent;
  while(p && p.type!=='root'){
    if(p.type==='atrule' && p.name==='media') media.unshift(p.params);
    p=p.parent;
  }
  importantDecls.push({
    index:importantDecls.length,
    selector:rule.selector,
    property:decl.prop,
    value:decl.value,
    media,
    line:decl.source && decl.source.start ? decl.source.start.line : null
  });
});
assert(importantDecls.length===314,`postcss inventory ${importantDecls.length} != 314`);

const mime=p=>p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.css')?'text/css; charset=utf-8':p.endsWith('.js')?'application/javascript; charset=utf-8':p.endsWith('.json')?'application/json; charset=utf-8':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.png')?'image/png':p.endsWith('.jpg')||p.endsWith('.jpeg')?'image/jpeg':'application/octet-stream';
const server=http.createServer((req,res)=>{
  try{
    const u=new URL(req.url,'http://127.0.0.1:4173');
    let rel=decodeURIComponent(u.pathname).replace(/^\/+/, ''); if(!rel)rel='index.html';
    const full=path.resolve(ROOT,rel);
    if(!full.startsWith(ROOT+path.sep)&&full!==ROOT){res.writeHead(403);return res.end('forbidden');}
    if(!fs.existsSync(full)||fs.statSync(full).isDirectory()){res.writeHead(404);return res.end('not found');}
    res.writeHead(200,{'content-type':mime(full),'cache-control':'no-store'}); fs.createReadStream(full).pipe(res);
  }catch(e){res.writeHead(500);res.end(String(e));}
});
const listen=()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4173,'127.0.0.1',resolve);});
const close=()=>new Promise(resolve=>server.close(()=>resolve()));

async function capture(browser,label,cssText){
  fs.writeFileSync(TARGET,cssText);
  const states={};
  for(const pageName of PAGES){
    for(const width of WIDTHS){
      const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
      const page=await context.newPage();
      const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
      await page.addInitScript(()=>{
        const fixed=1787572800000; const OD=Date;
        class FD extends OD{constructor(...a){super(...(a.length?a:[fixed]));}static now(){return fixed;}}
        window.Date=FD; let seed=.314159; Math.random=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
      });
      await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4173/')?route.continue():route.abort());
      await page.goto(`http://127.0.0.1:4173/${pageName}`,{waitUntil:'commit',timeout:15000});
      await page.waitForFunction(()=>!!document.body,{timeout:10000});
      await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;}html{scroll-behavior:auto!important;}'});
      await page.waitForTimeout(700);
      const snap=await page.evaluate((decls)=>{
        function splitTopLevelSelectors(s){
          const out=[];let cur='',p=0,b=0,q=null;
          for(let i=0;i<s.length;i++){
            const c=s[i];
            if(q){cur+=c;if(c===q&&s[i-1]!=='\\')q=null;continue;}
            if(c==='"'||c==="'"){q=c;cur+=c;continue;}
            if(c==='(')p++;else if(c===')')p--;else if(c==='[')b++;else if(c===']')b--;
            if(c===','&&p===0&&b===0){if(cur.trim())out.push(cur.trim());cur='';}else cur+=c;
          }
          if(cur.trim())out.push(cur.trim());return out;
        }
        function selectorInfo(selector){
          const items=[];
          for(const part of splitTopLevelSelectors(selector)){
            const m=part.match(/::(before|after)\b/);
            const pseudo=m?m[1]:null;
            const base=m?part.replace(/::(?:before|after)\b/g,''):part;
            items.push({base,pseudo,original:part});
          }
          return items;
        }
        function mediaActive(list){return (list||[]).every(x=>{try{return matchMedia(x).matches;}catch(_){return false;}});}
        function keyOf(el){
          if(el.id)return `#${el.id}`;
          const parts=[];let cur=el;
          while(cur&&cur.nodeType===1&&parts.length<9){
            let s=cur.tagName.toLowerCase();
            if(cur.classList.length)s+='.'+Array.from(cur.classList).slice(0,4).map(x=>CSS.escape(x)).join('.');
            const par=cur.parentElement;
            if(par){const sib=Array.from(par.children).filter(x=>x.tagName===cur.tagName);if(sib.length>1)s+=`:nth-of-type(${sib.indexOf(cur)+1})`;}
            parts.unshift(s);if(cur===document.body)break;cur=par;
          }
          return parts.join('>');
        }
        const records={};
        for(const d of decls){
          if(!mediaActive(d.media))continue;
          for(const si of selectorInfo(d.selector)){
            let nodes=[];try{nodes=Array.from(document.querySelectorAll(si.base));}catch(_){continue;}
            for(const el of nodes){
              const pseudo=si.pseudo?`::${si.pseudo}`:null;
              const k=keyOf(el)+(pseudo||'');
              if(!records[k])records[k]={values:{},sources:{},rect:null};
              if(!records[k].sources[d.property])records[k].sources[d.property]=[];
              records[k].sources[d.property].push({index:d.index,selector:d.selector,property:d.property,value:d.value,media:d.media,line:d.line});
              const cs=getComputedStyle(el,pseudo);
              records[k].values[d.property]=cs.getPropertyValue(d.property);
              if(!pseudo&&!records[k].rect){const r=el.getBoundingClientRect();records[k].rect={x:r.x,y:r.y,width:r.width,height:r.height};}
            }
          }
        }
        return {href:location.pathname,records};
      },importantDecls);
      states[`${pageName}@${width}`]={...snap,pageErrors:errors};
      await context.close();
    }
  }
  return states;
}

function compare(a,b){
  const stateDiffs=[];const blockerMap=new Map();
  for(const state of Object.keys(a)){
    const ar=a[state],br=b[state];const diffs=[];
    const keys=new Set([...Object.keys(ar.records),...Object.keys(br.records)]);
    for(const key of keys){
      const x=ar.records[key],y=br.records[key];
      if(!x||!y){diffs.push({node:key,type:'presence',parent:!!x,candidate:!!y});continue;}
      const props=new Set([...Object.keys(x.values),...Object.keys(y.values)]);
      for(const prop of props){
        const xv=x.values[prop]??'',yv=y.values[prop]??'';
        if(xv===yv)continue;
        const sources=(x.sources[prop]||[]);
        diffs.push({node:key,type:'computed',property:prop,parent:xv,candidate:yv,sources});
        for(const s of sources){
          const id=String(s.index);const z=blockerMap.get(id)||{...s,states:new Set(),nodes:new Set(),observations:0};
          z.states.add(state);z.nodes.add(key);z.observations++;blockerMap.set(id,z);
        }
      }
      if(x.rect&&y.rect){for(const p of ['x','y','width','height'])if(Math.abs(x.rect[p]-y.rect[p])>.01)diffs.push({node:key,type:'geometry',property:p,parent:x.rect[p],candidate:y.rect[p]});}
    }
    stateDiffs.push({state,diffCount:diffs.length,diffs:diffs.slice(0,500),pageErrors:[...ar.pageErrors,...br.pageErrors]});
  }
  const blockers=[...blockerMap.values()].map(z=>({...z,states:[...z.states].sort(),nodes:[...z.nodes].sort()})).sort((x,y)=>y.observations-x.observations||x.index-y.index);
  return {stateDiffs,blockers};
}

(async()=>{
  const receipt={boundary:'UX-CSS-IMPORTANT-036',proof:'delta-isolation-r3b',certified035Head:PARENT,target:TARGET,parentBlob:PARENT_BLOB,parentImportant:314,candidateImportant:0,candidateSha256:CAND_SHA,candidateGitBlob:CAND_BLOB,r2cReceiptBlob:R2C_BLOB,r3HistoricalFailBlob:R3_FAIL_BLOB,importantInventoryCount:importantDecls.length,pages:PAGES,widths:WIDTHS,status:'FAIL'};
  let browser;
  try{
    await listen();browser=await chromium.launch({headless:true});
    const parent=await capture(browser,'parent',original);const cand=await capture(browser,'candidate',candidate);
    const cmp=compare(parent,cand);const differing=cmp.stateDiffs.filter(x=>x.diffCount>0);const errors=cmp.stateDiffs.flatMap(x=>x.pageErrors);
    assert(errors.length===0,`page errors ${JSON.stringify(errors.slice(0,5))}`);
    assert(differing.length>0,'expected semantic diffs but found none');
    assert(cmp.blockers.length>0,'no important declarations mapped to semantic diffs');
    receipt.differingStateCount=differing.length;receipt.differingStates=differing.map(x=>x.state);receipt.totalDiffObservations=differing.reduce((n,x)=>n+x.diffCount,0);receipt.stateDiffs=differing;
    receipt.blockerDeclarationCount=cmp.blockers.length;receipt.blockers=cmp.blockers;
    const blockerIndexes=new Set(cmp.blockers.map(x=>x.index));
    receipt.nonBlockingDeclarationCount=314-blockerIndexes.size;
    receipt.nonBlockingDeclarationIndexes=importantDecls.filter(x=>!blockerIndexes.has(x.index)).map(x=>x.index);
    receipt.decision='BUILD_NARROW_CANDIDATE_REMOVE_ONLY_NONBLOCKING_MARKERS';receipt.mutationAuthorityGranted=false;receipt.status='PASS';
  }catch(e){receipt.error=String(e&&e.stack||e);}finally{
    try{fs.writeFileSync(TARGET,original);}catch(_){}if(browser)try{await browser.close();}catch(_){}try{await close();}catch(_){}
    fs.writeFileSync(RESULT,JSON.stringify(receipt,null,2)+'\n');
  }
  if(receipt.status!=='PASS')process.exit(1);
})();
