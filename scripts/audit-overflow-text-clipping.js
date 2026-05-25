#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'reports');
fs.mkdirSync(REPORTS, { recursive: true });
const LABEL = (process.argv.find(a => a.startsWith('--label=')) || '--label=current').split('=')[1];
const PAGES = ['index.html','detalhe-anuncio.html','perfil.html','resultados.html','pedidos.html','mensagens.html','notificacoes.html','comunidade.html'];
const VIEWPORTS = [{name:'390x844',width:390,height:844},{name:'608x926',width:608,height:926},{name:'810x1080',width:810,height:1080},{name:'1024x768',width:1024,height:768},{name:'1280x800',width:1280,height:800}];
function readCssRecursive(relPath, seen=new Set()){
  const abs = path.normalize(path.join(ROOT, relPath));
  if(!abs.startsWith(ROOT) || seen.has(abs) || !fs.existsSync(abs)) return '';
  seen.add(abs);
  let css = fs.readFileSync(abs,'utf8');
  const dir = path.dirname(relPath);
  css = css.replace(/@import\s+url\(["']?([^"')]+)["']?\)\s*;/g, (_, href) => readCssRecursive(path.normalize(path.join(dir, href.split('?')[0])).replace(/\\/g,'/'), seen));
  css = css.replace(/url\(["']?([^"')]+)["']?\)/g, (m, href) => /^(data:|https?:|#)/.test(href) ? m : `url("file://${path.normalize(path.join(path.dirname(abs), href.split('?')[0])).replace(/\\/g,'/')}")`);
  return css;
}
function inlineHtml(file){
  let html = fs.readFileSync(path.join(ROOT,file),'utf8');
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<script\b[^>]*\s*>/gi,'');
  html = html.replace(/<link\b([^>]*rel=["']stylesheet["'][^>]*)>/gi, (tag, attrs)=>{
    const m = attrs.match(/href=["']([^"']+)["']/i); if(!m) return '';
    const relPath = path.normalize(path.join(path.dirname(file), m[1].split('?')[0])).replace(/\\/g,'/');
    return `<style>${readCssRecursive(relPath)}</style>`;
  });
  html = html.replace(/<head[^>]*>/i, m => `${m}<base href="file://${ROOT.replace(/\\/g,'/')}/">`);
  return html;
}
function rel(p){ return path.relative(ROOT,p).replace(/\\/g,'/'); }
const CSS_FILES = (()=>{ const roots=['assets/css/pages','assets/css/patterns','assets/css/components','assets/css/core']; const files=[]; for(const dir of roots){ const abs=path.join(ROOT,dir); if(!fs.existsSync(abs)) continue; const stack=[abs]; while(stack.length){ const cur=stack.pop(); for(const ent of fs.readdirSync(cur,{withFileTypes:true})){ const p=path.join(cur,ent.name); if(ent.isDirectory()) stack.push(p); else if(ent.isFile()&&ent.name.endsWith('.css')) files.push({file:rel(p),text:fs.readFileSync(p,'utf8')}); } } } return files; })();
const ownerCache = new Map();
function cssOwner(selector, prop){ const key=selector+'|'+prop; if(ownerCache.has(key)) return ownerCache.get(key); const parts=selector.split(/[\s>:+~.#\[\]="]+/).filter(Boolean).filter(s=>s.length>2).slice(0,4); const hits=[]; for(const f of CSS_FILES){ if(parts.some(p=>f.text.includes(p)) && (!prop || f.text.includes(prop))){ hits.push(f.file); if(hits.length>=3) break; } } const out=hits.join('; ') || 'não identificado'; ownerCache.set(key,out); return out; }
const evaluateAudit = () => {
  const round=n=>Math.round((Number(n)||0)*100)/100; const out=[];
  const visible=el=>{ const cs=getComputedStyle(el), r=el.getBoundingClientRect(); return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>1&&r.height>1; };
  const sel=el=>{ const cls=typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).filter(Boolean).slice(0,4).join('.') : ''; return `${el.tagName.toLowerCase()}${el.id?'#'+el.id:''}${cls}`; };
  const emit=(type,el,property,expected,actual,difference,detail)=>{ const r=el.getBoundingClientRect(); out.push({type,selector:sel(el),property,expected,actual,difference:round(difference),detail,x:round(r.x),y:round(r.y),width:round(r.width),height:round(r.height)}); };
  const doc=document.documentElement, body=document.body; const sw=Math.max(doc.scrollWidth, body?body.scrollWidth:0), ov=sw-doc.clientWidth; if(ov>2) emit('body-horizontal-overflow',doc,'scrollWidth',`<= ${doc.clientWidth+2}`,sw,ov,'body/page gera scroll horizontal');
  const query=['.app-header','.app-header *','.home-side-meta__tablet-menu','.home-side-meta__search','.home-side-meta__location','.home-side-meta__profile','.home-side-meta__identity-text','button','a[class*="btn"]','a[class*="button"]','[class*="pill"]','[class*="badge"]','[class*="chip"]','[class*="tag"]','.section-header','.section-header *','.section-heading','.section-heading *','.doke-section-header','.doke-section-header *','.doke-ad-card','.doke-ad-card *','.publication-card','.publication-card *','.video-card','.video-card *','.service-card','.service-card *','.doke-review-card','.doke-review-card *','.doke-reviews-panel','.doke-reviews-panel *','.review-card','.review-card *','[class*="rail"]','[class*="track"]','[class*="grid"]','[class*="carousel"]'].join(',');
  const seen=new Set();
  for(const el of Array.from(document.querySelectorAll(query)).filter(visible)){
    if(seen.has(el)) continue; seen.add(el); const cs=getComputedStyle(el), name=sel(el);
    const intended=/(rail|track|carousel|tabs|scroller|scroll)/i.test(name)&&/(auto|scroll)/.test(cs.overflowX);
    const ell=cs.textOverflow==='ellipsis'&&(cs.overflow!=='visible'||cs.overflowX!=='visible');
    if(el.scrollWidth>el.clientWidth+2 && !intended && !ell) emit('element-horizontal-overflow',el,'scrollWidth',`<= ${el.clientWidth+2}`,el.scrollWidth,el.scrollWidth-el.clientWidth,'scrollWidth maior que clientWidth sem overflow controlado');
    const relevant=/(button|pill|badge|chip|tag|title|label|meta|identity|location|profile|cta|action|card|header)/i.test(name);
    if(relevant && el.scrollHeight>el.clientHeight+2){ const clamp=cs.webkitLineClamp&&cs.webkitLineClamp!=='none'; const cy=clamp||((cs.overflow!=='visible'||cs.overflowY!=='visible')&&cs.textOverflow==='ellipsis'); if(!cy) emit('text-or-content-clipping',el,'scrollHeight',`<= ${el.clientHeight+2}`,el.scrollHeight,el.scrollHeight-el.clientHeight,'texto/conteúdo cortado sem clamp/ellipsis controlado'); }
    const txt=(el.textContent||'').trim().replace(/\s+/g,' ');
    if(txt && txt.length<=90 && /(button|btn|pill|badge|chip|filter|cta|action|location|profile|tablet-menu|search)/i.test(name)){
      const tops=[]; const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); while(walker.nextNode()){ const node=walker.currentNode; if(!(node.textContent||'').trim()) continue; const range=document.createRange(); range.selectNodeContents(node); for(const rect of Array.from(range.getClientRects()).filter(r=>r.width>1&&r.height>1)){ const top=Math.round(rect.top/3)*3; if(!tops.some(t=>Math.abs(t-top)<=3)) tops.push(top); } range.detach(); }
      if(tops.length>1 && cs.whiteSpace!=='nowrap') emit('button-label-wrap',el,'line-count','1 linha',`${tops.length} linhas`,tops.length-1,'label quebra indevidamente');
    }
    if(/(badge|chip|tag|favorite|heart|save)/i.test(name)){ const card=el.closest('.doke-ad-card,.publication-card,.video-card,.service-card,.doke-review-card,.review-card,.doke-reviews-panel'); if(card){ const r=el.getBoundingClientRect(), cr=card.getBoundingClientRect(); const leak=Math.max(cr.left-r.left,cr.top-r.top,r.right-cr.right,r.bottom-cr.bottom,0); if(leak>2) emit('badge-or-action-clipped',el,'bounds','dentro do card',`vazamento ${round(leak)}px`,leak,'badge/action vazando ou cortado'); const topGap=r.top-cr.top; if(topGap>=0&&topGap<4) emit('badge-too-close-top',el,'top-gap','>= 4px',`${round(topGap)}px`,4-topGap,'badge/action colado no topo'); } }
  }
  for(const card of Array.from(document.querySelectorAll('.doke-ad-card,.publication-card,.video-card,.service-card,.doke-review-card,.review-card,.doke-reviews-panel')).filter(visible)){ const cr=card.getBoundingClientRect(); for(const child of Array.from(card.children).filter(visible)){ const rr=child.getBoundingClientRect(); const leak=Math.max(cr.left-rr.left,cr.top-rr.top,rr.right-cr.right,rr.bottom-cr.bottom,0); if(leak>3) emit('card-content-leak',child,'bounds','filho dentro do card',`vazamento ${round(leak)}px`,leak,`filho direto vaza do card ${sel(card)}`); } }
  return out;
};
(async()=>{
  const htmlCache=new Map(PAGES.map(f=>[f,inlineHtml(f)])); const rows=[];
  for(const vp of VIEWPORTS){
    const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=swiftshader']});
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1,javaScriptEnabled:false});
    let page=await context.newPage(); page.setDefaultTimeout(15000);
    for(const file of PAGES){ try{ await page.setContent(htmlCache.get(file),{waitUntil:'domcontentloaded',timeout:30000}); await page.waitForTimeout(80); const data=await page.evaluate(evaluateAudit); for(const r of data) rows.push({page:file,breakpoint:vp.name,...r,probableCss:cssOwner(r.selector,r.property)}); process.stdout.write('.'); }catch(e){ rows.push({page:file,breakpoint:vp.name,type:'render-error',selector:'page',property:'render',expected:'renderizar',actual:e.message,difference:'',detail:'falha ao renderizar',probableCss:'n/a'}); process.stdout.write('E'); try{await page.close()}catch{}; page=await context.newPage(); } }
    await context.close().catch(()=>{}); await browser.close().catch(()=>{});
  }
  process.stdout.write('\n');
  const byType=rows.reduce((a,r)=>(a[r.type]=(a[r.type]||0)+1,a),{}), byPage=rows.reduce((a,r)=>(a[r.page]=(a[r.page]||0)+1,a),{}), byBreakpoint=rows.reduce((a,r)=>(a[r.breakpoint]=(a[r.breakpoint]||0)+1,a),{});
  const result={label:LABEL,generatedAt:new Date().toISOString(),pages:PAGES,viewports:VIEWPORTS,total:rows.length,byType,byPage,byBreakpoint,rows}; const base=`overflow-text-clipping-audit-${LABEL}`; fs.writeFileSync(path.join(REPORTS,`${base}.json`),JSON.stringify(result,null,2));
  const csv=['page,breakpoint,type,selector,property,expected,actual,difference,width,height,detail,probableCss']; rows.forEach(r=>csv.push([r.page,r.breakpoint,r.type,r.selector,r.property,r.expected,r.actual,r.difference,r.width,r.height,r.detail,r.probableCss].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))); fs.writeFileSync(path.join(REPORTS,`${base}.csv`),csv.join('\n'));
  const md=[`# Auditoria de overflow/text clipping — ${LABEL}`,'',`Total de ocorrências: **${rows.length}**`,'','## Por tipo','','| Tipo | Ocorrências |','|---|---:|',...Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`| ${k} | ${v} |`),'','## Por página','','| Página | Ocorrências |','|---|---:|',...Object.entries(byPage).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`| ${k} | ${v} |`),'','## Ocorrências','','| Página | Breakpoint | Tipo | Seletor | Propriedade | Esperado | Atual | Diferença | CSS provável |','|---|---|---|---|---|---|---|---:|---|',...rows.slice(0,600).map(r=>`| ${r.page} | ${r.breakpoint} | ${r.type} | \`${r.selector}\` | ${r.property} | ${r.expected} | ${String(r.actual).replace(/\|/g,'/')} | ${r.difference??''} | ${r.probableCss} |`)].join('\n'); fs.writeFileSync(path.join(REPORTS,`${base}.md`),md);
  if(LABEL==='current'){ fs.writeFileSync(path.join(REPORTS,'overflow-text-clipping-audit.json'),JSON.stringify(result,null,2)); fs.writeFileSync(path.join(REPORTS,'overflow-text-clipping-audit.csv'),csv.join('\n')); fs.writeFileSync(path.join(REPORTS,'overflow-text-clipping-audit.md'),md); }
  console.log(JSON.stringify({label:LABEL,total:rows.length,byType,byPage,byBreakpoint},null,2));
})();
