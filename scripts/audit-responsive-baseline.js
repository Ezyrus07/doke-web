#!/usr/bin/env node
/* Compara páginas prioritárias contra reports/responsive-index-baseline.json. Não altera UI. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const rootDir = path.resolve(__dirname, '..');
const baselinePath = path.join(rootDir, 'reports/responsive-index-baseline.json');
const outJson = path.join(rootDir, 'reports/responsive-baseline-audit.json');
const outCsv = path.join(rootDir, 'reports/responsive-baseline-audit.csv');
const outMd = path.join(rootDir, 'reports/responsive-baseline-audit.md');
const TOL = 2;
const pages = ['detalhe-anuncio.html','perfil.html','resultados.html','pedidos.html','mensagens.html','notificacoes.html','comunidade.html','configuracoes.html','carteira.html'];
const components = [
  { key:'headers', baselineKey:'app-header', selector:'.app-header, header.app-header, .mobile-header, .topbar, .app-topbar, header[role="banner"]' },
  { key:'header inner', baselineKey:'app-header__inner', selector:'.app-header__inner, .topbar__inner, .mobile-header__inner, .header-inner' },
  { key:'containers/rails', baselineKey:'rails horizontais', selector:'.doke-scroll-rail, .content-rail, [data-rail-track], .home-media-rail, .more-services__cards-rail, .more-services__tabs-rail, .cards-rail, .rail, [class*="rail"], [class*="track"]' },
  { key:'section headers', baselineKey:'section headers', selector:'.home-section-header, .section-heading, .section-header, [class*="section-header"], [class*="section-heading"]' },
  { key:'doke-ad-card', baselineKey:'doke-ad-card', selector:'article.doke-ad-card, .doke-ad-card' },
  { key:'publication-card', baselineKey:'publication-card', selector:'.publication-card' },
  { key:'video-card / worker card', baselineKey:'video-card / worker card', selector:'.video-card, .doke-worker-card, .worker-card, [class*="worker-card"]' },
  { key:'service-card', baselineKey:'service-card', fallbackBaselineKey:'doke-ad-card', selector:'.service-card, [class*="service-card"]' },
  { key:'review cards', baselineKey:'publication-card', selector:'.review-card, .doke-review-card, .rating-card, .testimonial-card, .avaliacao-card, .review-item, [class*="review-card"], [class*="avaliacao-card"]' },
];
const metrics = [
  ['x',['box','x'],'px'], ['y',['box','y'],'px'], ['width',['box','width'],'px'], ['height',['box','height'],'px'],
  ['padding.top',['spacing','padding','top'],'px'], ['padding.right',['spacing','padding','right'],'px'], ['padding.bottom',['spacing','padding','bottom'],'px'], ['padding.left',['spacing','padding','left'],'px'],
  ['border-radius',['visual','borderRadius'],'str'], ['box-shadow',['visual','boxShadow'],'str'], ['font-size',['typography','fontSize'],'px'], ['line-height',['typography','lineHeight'],'px-token'],
  ['aspect-ratio',['sizing','aspectRatio'],'ratio'], ['css-aspect-ratio',['sizing','cssAspectRatio'],'str'], ['gap',['layout','gap'],'px-token'], ['row-gap',['layout','rowGap'],'px-token'], ['column-gap',['layout','columnGap'],'px-token'],
  ['measured-child-gap-x',['layout','measuredChildGap','x'],'px'], ['measured-child-gap-y',['layout','measuredChildGap','y'],'px'], ['media.height',['media','height'],'px'], ['media.aspect-ratio',['media','aspectRatio'],'ratio'], ['media.border-radius',['media','borderRadius'],'str'],
];
function r(v){ if(v==null||Number.isNaN(Number(v))) return null; return Math.round(Number(v)*100)/100; }
function px(v){ if(!v||v==='normal'||v==='auto') return v||null; const n=parseFloat(v); return Number.isFinite(n)?r(n):v; }
function get(o,p){ return p.reduce((a,k)=>a==null?null:a[k],o); }
function norm(v){ if(v===undefined) return null; if(typeof v==='number') return r(v); if(typeof v==='string') return v.trim().replace(/\s+/g,' '); return v; }
function num(v){ if(typeof v==='number') return v; if(typeof v==='string'){ const n=parseFloat(v); return Number.isFinite(n)?n:null; } return null; }
function diff(exp,act,type){ exp=norm(exp); act=norm(act); if(exp==null&&act==null) return null; if(type==='px'||type==='ratio'){ const a=num(exp), b=num(act); if(a==null&&b==null) return null; if(a==null||b==null) return {differs:true,diff:null}; const tol=type==='ratio'?0.03:TOL; return {differs:Math.abs(b-a)>tol,diff:r(b-a)}; } if(type==='px-token'){ const a=num(exp), b=num(act); if(a!=null&&b!=null) return {differs:Math.abs(b-a)>TOL,diff:r(b-a)}; return {differs:exp!==act,diff:null}; } return {differs:exp!==act,diff:null}; }
function esc(v){ const s=v==null?'':String(v); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
function cssFilesFromHtml(pageFile){ const html=fs.readFileSync(path.join(rootDir,pageFile),'utf8'); const out=[]; html.replace(/<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi,(tag)=>{ const m=tag.match(/href=["']([^"']+)["']/i); if(m&&!/^(https?:)?\/\//i.test(m[1])) out.push(m[1].split('?')[0]); return tag;}); return out; }
function loadHtml(pageFile){ let html=fs.readFileSync(path.join(rootDir,pageFile),'utf8'); html=html.replace(/<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi,(tag)=>{ const m=tag.match(/href=["']([^"']+)["']/i); if(!m) return tag; const href=m[1].split('?')[0]; if(/^(https?:)?\/\//i.test(href)) return `<!-- external css skipped ${m[1]} -->`; const p=path.join(rootDir,href); if(!fs.existsSync(p)) return `<!-- missing css ${m[1]} -->`; return `<style data-source-css="${href}">\n${fs.readFileSync(p,'utf8')}\n</style>`; }); html=html.replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi,'<!-- script disabled responsive audit -->'); const base=`file://${rootDir.replace(/\\/g,'/')}/`; return /<head[^>]*>/i.test(html)?html.replace(/<head([^>]*)>/i,`<head$1><base href="${base}">`):`<base href="${base}">${html}`; }
const cssCache=new Map();
function probableCss(pageFile, className, prop){ const cssFiles=cssFilesFromHtml(pageFile); const tokens=String(className||'').split(/\s+/).filter(Boolean).slice(0,6); const hits=[]; for(const f of cssFiles){ const p=path.join(rootDir,f); if(!fs.existsSync(p)) continue; let txt=cssCache.get(p); if(!txt){ txt=fs.readFileSync(p,'utf8'); cssCache.set(p,txt); } for(const t of tokens){ if(txt.includes(`.${t}`)){ hits.push(`${f} :: .${t}`); break; } } } if(!hits.length) return 'não identificado por busca de classe nos CSS importados pela página'; return [...new Set(hits)].slice(-8).join(' | '); }
async function measure(page, comp){ return page.evaluate(({key,selector})=>{
 const round=v=>v==null||Number.isNaN(Number(v))?null:Math.round(Number(v)*100)/100;
 const parsePx=v=>{ if(!v||v==='normal'||v==='auto') return v||null; const n=parseFloat(v); return Number.isFinite(n)?round(n):v; };
 const visibleChildren=el=>Array.from(el.children).filter(ch=>{const r=ch.getBoundingClientRect(),s=getComputedStyle(ch); return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';});
 const childGap=el=>{ const c=visibleChildren(el).slice(0,2); if(c.length<2) return null; const a=c[0].getBoundingClientRect(),b=c[1].getBoundingClientRect(); return {x:b.left>=a.right?round(b.left-a.right):null,y:b.top>=a.bottom?round(b.top-a.bottom):null}; };
 const mediaOf=el=>{ const m=el.matches('img,picture,video,canvas,[class*="__media"],[class*="media"]')?el:el.querySelector('img,picture,video,canvas,.doke-ad-card__media,.publication-card__media,.video-card__media,.service-card__media,[class*="__media"],[class*="media"]'); if(!m) return null; const r=m.getBoundingClientRect(),s=getComputedStyle(m); return {selectorHint:m.className?String(m.className).trim():m.tagName.toLowerCase(),x:round(r.x),y:round(r.y),width:round(r.width),height:round(r.height),aspectRatio:r.height?round(r.width/r.height):null,cssAspectRatio:s.aspectRatio,objectFit:s.objectFit,borderRadius:s.borderRadius}; };
 const clipped=el=>Array.from(el.querySelectorAll('h1,h2,h3,h4,p,a,span,button,strong,small')).some(n=>{const s=getComputedStyle(n); if(s.display==='none'||s.visibility==='hidden') return false; return n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1;});
 return Array.from(document.querySelectorAll(selector)).map((el,index)=>{ const rect=el.getBoundingClientRect(),s=getComputedStyle(el),ch=visibleChildren(el),a=ch[0]?.getBoundingClientRect(),b=ch[1]?.getBoundingClientRect(); return {key,selector,index,tagName:el.tagName.toLowerCase(),id:el.id||null,className:el.className?String(el.className).trim():null,textSample:(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,90)||null,box:{x:round(rect.x),y:round(rect.y),width:round(rect.width),height:round(rect.height),top:round(rect.top),right:round(rect.right),bottom:round(rect.bottom),left:round(rect.left)},layout:{display:s.display,position:s.position,flexDirection:s.flexDirection,gridTemplateColumns:s.gridTemplateColumns,gap:s.gap,rowGap:s.rowGap,columnGap:s.columnGap,measuredChildGap:childGap(el),firstChildBox:a?{x:round(a.x),y:round(a.y),width:round(a.width),height:round(a.height)}:null,secondChildBox:b?{x:round(b.x),y:round(b.y),width:round(b.width),height:round(b.height)}:null},spacing:{padding:{top:parsePx(s.paddingTop),right:parsePx(s.paddingRight),bottom:parsePx(s.paddingBottom),left:parsePx(s.paddingLeft)},margin:{top:parsePx(s.marginTop),right:parsePx(s.marginRight),bottom:parsePx(s.marginBottom),left:parsePx(s.marginLeft)}},visual:{borderRadius:s.borderRadius,boxShadow:s.boxShadow,backgroundColor:s.backgroundColor,border:s.border},typography:{fontSize:parsePx(s.fontSize),lineHeight:parsePx(s.lineHeight),fontWeight:s.fontWeight,letterSpacing:s.letterSpacing},sizing:{minWidth:s.minWidth,maxWidth:s.maxWidth,minHeight:s.minHeight,maxHeight:s.maxHeight,aspectRatio:rect.height?round(rect.width/rect.height):null,cssAspectRatio:s.aspectRatio},media:mediaOf(el),scroll:{clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,overflowX:s.overflowX,overflowY:s.overflowY,hasHorizontalOverflowInside:el.scrollWidth>el.clientWidth+1,hasVerticalOverflowInside:el.scrollHeight>el.clientHeight+1},text:{hasClippedText:clipped(el)}}; });
 }, comp); }
function baselineEls(baseline,bp,comp){ const c=baseline.measurements?.[bp]?.components||{}; const a=c[comp.baselineKey]||[]; if(a.length) return {key:comp.baselineKey,elements:a}; const f=comp.fallbackBaselineKey?(c[comp.fallbackBaselineKey]||[]):[]; return {key:f.length?comp.fallbackBaselineKey:comp.baselineKey,elements:f}; }
(async()=>{
 if(!fs.existsSync(baselinePath)) throw new Error('Baseline não encontrado. Rode npm run baseline:responsive-index.');
 const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
 const browser=await chromium.launch({headless:true,executablePath,args:['--disable-dev-shm-usage','--no-sandbox']});
 const measurements={}, deviations=[];
 try{
  for(const pageFile of pages.filter(p=>fs.existsSync(path.join(rootDir,p)))){
   measurements[pageFile]={}; const html=loadHtml(pageFile);
   for(const bp of baseline.breakpoints){
    const ctx=await browser.newContext({viewport:{width:bp.width,height:bp.height},deviceScaleFactor:1,javaScriptEnabled:false}); const pg=await ctx.newPage(); pg.setDefaultTimeout(30000); await pg.setContent(html,{waitUntil:'domcontentloaded',timeout:30000}); await pg.evaluate(()=>document.fonts&&document.fonts.ready).catch(()=>{}); await pg.waitForTimeout(120);
    const pageMetrics=await pg.evaluate(()=>({bodyScrollWidth:document.body.scrollWidth,documentScrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,viewportHeight:innerHeight,hasPageHorizontalOverflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)>innerWidth+1}));
    measurements[pageFile][bp.name]={page:pageMetrics,components:{}};
    for(const comp of components){
     const cur=await measure(pg,comp); measurements[pageFile][bp.name].components[comp.key]=cur; const {key,elements:expected}=baselineEls(baseline,bp.name,comp);
     if(!cur.length) continue;
     if(!expected.length){ deviations.push({page:pageFile,breakpoint:bp.name,component:comp.key,selector:comp.selector,property:'baseline',expected:`baseline ausente para ${comp.baselineKey}`,actual:`${cur.length} ocorrência(s)`,difference:null,probableCssResponsible:'baseline do index.html não contém componente equivalente'}); continue; }
     cur.forEach((act,i)=>{ const exp=expected[i]||expected[0]; for(const [label,pathSpec,type] of metrics){ const d=diff(get(exp,pathSpec),get(act,pathSpec),type); if(d?.differs) deviations.push({page:pageFile,breakpoint:bp.name,component:comp.key,baselineComponent:key,selector:act.className?'.'+act.className.split(/\s+/).join('.'):comp.selector,elementIndex:i,property:label,expected:norm(get(exp,pathSpec)),actual:norm(get(act,pathSpec)),difference:d.diff,probableCssResponsible:probableCss(pageFile,act.className,label)}); }
      if(act.text?.hasClippedText) deviations.push({page:pageFile,breakpoint:bp.name,component:comp.key,baselineComponent:key,selector:act.className?'.'+act.className.split(/\s+/).join('.'):comp.selector,elementIndex:i,property:'texto cortado',expected:false,actual:true,difference:null,probableCssResponsible:probableCss(pageFile,act.className,'width')});
      if(act.scroll?.hasHorizontalOverflowInside) deviations.push({page:pageFile,breakpoint:bp.name,component:comp.key,baselineComponent:key,selector:act.className?'.'+act.className.split(/\s+/).join('.'):comp.selector,elementIndex:i,property:'overflow horizontal interno',expected:false,actual:true,difference:r(act.scroll.scrollWidth-act.scroll.clientWidth),probableCssResponsible:probableCss(pageFile,act.className,'width')});
     });
    }
    if(pageMetrics.hasPageHorizontalOverflow) deviations.push({page:pageFile,breakpoint:bp.name,component:'page',baselineComponent:'viewport',selector:'document',elementIndex:null,property:'overflow horizontal da página',expected:bp.width,actual:Math.max(pageMetrics.bodyScrollWidth,pageMetrics.documentScrollWidth),difference:r(Math.max(pageMetrics.bodyScrollWidth,pageMetrics.documentScrollWidth)-bp.width),probableCssResponsible:'verificar containers com largura fixa, rails sem overflow controlado ou cards com min-width excessivo'});
    await ctx.close();
   }
  }
 } finally { await browser.close(); }
 const summary={measuredPages:Object.keys(measurements).length,breakpoints:baseline.breakpoints.map(b=>b.name),deviations:deviations.length,deviationsByPage:{},deviationsByComponent:{}}; deviations.forEach(d=>{summary.deviationsByPage[d.page]=(summary.deviationsByPage[d.page]||0)+1; summary.deviationsByComponent[d.component]=(summary.deviationsByComponent[d.component]||0)+1;});
 const report={schemaVersion:1,generatedAt:new Date().toISOString(),baseline:path.relative(rootDir,baselinePath),tolerance:{boxPx:TOL,ratio:0.03},pages:Object.keys(measurements),components,summary,deviations,measurements};
 fs.writeFileSync(outJson,JSON.stringify(report,null,2)+'\n');
 const header=['página','breakpoint','componente','seletor','propriedade divergente','esperado','atual','diferença','CSS provável responsável']; const rows=deviations.map(d=>[d.page,d.breakpoint,d.component,d.selector,d.property,d.expected,d.actual,d.difference,d.probableCssResponsible]); fs.writeFileSync(outCsv,[header,...rows].map(row=>row.map(esc).join(',')).join('\n')+'\n');
 const top=deviations.slice(0,300); const md=['# Auditoria responsiva contra baseline do index.html','',`Gerado em: ${report.generatedAt}`,`Baseline: ${report.baseline}`,`Tolerância: ${TOL}px para x/y/width/height e métricas em px; 0.03 para aspect-ratio.`,'','## Resumo','',`- Páginas medidas: ${summary.measuredPages}`,`- Breakpoints: ${summary.breakpoints.join(', ')}`,`- Divergências encontradas: ${summary.deviations}`,'','### Divergências por página','',...Object.entries(summary.deviationsByPage).sort((a,b)=>b[1]-a[1]).map(([p,c])=>`- ${p}: ${c}`),'','### Divergências por componente','',...Object.entries(summary.deviationsByComponent).sort((a,b)=>b[1]-a[1]).map(([p,c])=>`- ${p}: ${c}`),'','## Tabela de divergências','', '| página | breakpoint | componente | seletor | propriedade divergente | esperado | atual | diferença | CSS provável responsável |','|---|---:|---|---|---|---:|---:|---:|---|',...top.map(d=>`| ${d.page} | ${d.breakpoint} | ${d.component} | ${String(d.selector||'').replace(/\|/g,'\\|')} | ${d.property} | ${String(d.expected??'').replace(/\|/g,'\\|')} | ${String(d.actual??'').replace(/\|/g,'\\|')} | ${d.difference??''} | ${String(d.probableCssResponsible||'').replace(/\|/g,'\\|').slice(0,280)} |`)]; fs.writeFileSync(outMd,md.join('\n')+'\n');
 console.log(`Responsive baseline audit written to ${path.relative(rootDir,outJson)}`); console.log(`CSV written to ${path.relative(rootDir,outCsv)}`); console.log(`Markdown written to ${path.relative(rootDir,outMd)}`); console.log(`Divergências: ${deviations.length}`);
})().catch(e=>{ console.error(e); process.exitCode=1; });
