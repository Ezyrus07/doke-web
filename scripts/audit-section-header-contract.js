#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const BREAKPOINTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '608x926', width: 608, height: 926 },
  { name: '810x1080', width: 810, height: 1080 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 }
];
const PAGES = ['index.html','detalhe-anuncio.html','perfil.html','resultados.html','comunidade.html','configuracoes.html'];
const SELECTORS = [
  { selector: '.featured-services .section-heading', component: 'Destaques para você', baseline: 'featured' },
  { selector: '.short-videos .section-heading', component: 'Workers', baseline: 'featured' },
  { selector: '.home-publications .section-heading', component: 'Publicações em destaque', baseline: 'featured' },
  { selector: '.more-services > .section-heading', component: 'Mais anúncios', baseline: 'featured' },
  { selector: '.detail-section--ad-workers > .detail-section__header', component: 'Workers relacionados', baseline: 'featured' },
  { selector: '.detail-section--ad-publications > .detail-section__header', component: 'Publicações desse anúncio', baseline: 'featured' },
  { selector: '.detail-section--similar-ads > .detail-section__header', component: 'Compare antes de contratar', baseline: 'featured' },
  { selector: '.results-related__header', component: 'Resultados relacionados', baseline: 'featured' },
  { selector: '.communities-v2-section__heading', component: 'Comunidade / seções', baseline: 'featured' },
  { selector: '.settings-section-heading', component: 'Configurações / seções', baseline: 'featured' },
  { selector: '.doke-reviews-title', component: 'Avaliações', baseline: 'featured', titleOnly: true }
];
const BASELINES = {
  featured: '.featured-services .section-heading',
  workers: '.short-videos .section-heading',
  publications: '.home-publications .section-heading',
  more: '.more-services > .section-heading'
};
const BASE_CSS = `
*{box-sizing:border-box} body{font-family:Poppins,Arial,sans-serif;margin:0;color:#18314f}.page{padding:24px}.doke-page-section{margin-block:28px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:18px;margin:0 0 18px}.section-heading__title{margin:0;font-size:clamp(1.3rem,2vw,1.9rem);line-height:1.1;font-weight:800;color:#18314f}.section-heading__link{font-size:.94rem;font-weight:700;color:#2a5c92;text-decoration:none}.detail-section__header,.results-related__header,.communities-v2-section__heading,.settings-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:0 0 20px}.detail-section__header h2,.results-related__header h3,.communities-v2-section__heading h2,.settings-section-heading h2,.doke-reviews-title{margin:0;font-size:1.3rem;line-height:1.18;font-weight:800}.detail-section__header a{font-size:.9rem;font-weight:700;color:#2a5c92;text-decoration:none}@media(max-width:560px){.section-heading__title{font-size:.92rem;line-height:1.16;letter-spacing:.11em;text-transform:uppercase}.section-heading__link{font-size:.78rem}.section-heading{gap:10px;margin-bottom:12px}}
`;
function stripHtml(file, withContract) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script\b[^>]*src=["'][^"']+["'][^>]*><\/script>/gi, '');
  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
  html = html.replace(/<link\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>/gi, '');
  const contractPath = path.join(ROOT,'assets/css/components/sections/section-header-canonical-contract.css');
  const contractCss = withContract && fs.existsSync(contractPath) ? fs.readFileSync(contractPath,'utf8') : '';
  const baseStyle = `<style>${BASE_CSS}</style>`;
  const contractStyle = contractCss ? `<style>${contractCss}</style>` : '';
  html = html.replace(/<head([^>]*)>/i, `<head$1>${baseStyle}`);
  return html.replace(/<\/head>/i, `${contractStyle}</head>`);
}
function round(n){return Number.isFinite(n)?Math.round(n*100)/100:null}
function px(v){const n=parseFloat(v);return Number.isFinite(n)?n:null}
async function get(page, selector, titleOnly=false){
  return await page.$$eval(selector, (els,titleOnly)=>els.map((el,i)=>{
    const title = titleOnly ? el : (el.querySelector('h1,h2,h3,.section-heading__title,.home-section-title,.doke-reviews-title')||el);
    const action = titleOnly ? null : el.querySelector(':scope > a,:scope > button,.section-heading__link');
    const cs=getComputedStyle(el), r=el.getBoundingClientRect();
    const ts=title?getComputedStyle(title):null, tr=title?title.getBoundingClientRect():null;
    const as=action?getComputedStyle(action):null, ar=action?action.getBoundingClientRect():null;
    return {index:i,text:(title?.textContent||'').trim().replace(/\s+/g,' ').slice(0,80),header:{width:r.width,height:r.height,display:cs.display,flexDirection:cs.flexDirection,alignItems:cs.alignItems,justifyContent:cs.justifyContent,gap:cs.gap,marginBottom:cs.marginBottom,paddingTop:cs.paddingTop,paddingRight:cs.paddingRight,paddingBottom:cs.paddingBottom,paddingLeft:cs.paddingLeft},title:title?{fontSize:ts.fontSize,lineHeight:ts.lineHeight,fontWeight:ts.fontWeight,letterSpacing:ts.letterSpacing,textTransform:ts.textTransform,marginTop:ts.marginTop,marginBottom:ts.marginBottom,height:tr.height}:null,action:action?{height:ar.height,fontSize:as.fontSize,lineHeight:as.lineHeight,fontWeight:as.fontWeight,paddingLeft:as.paddingLeft,paddingRight:as.paddingRight,borderRadius:as.borderRadius,whiteSpace:as.whiteSpace}:null};
  }).filter(item => item.header.width > 0 && item.header.height > 0), titleOnly);
}
function val(o,p){return p.split('.').reduce((a,k)=>a&&a[k],o)}
const PROPS=['header.height','header.display','header.flexDirection','header.alignItems','header.justifyContent','header.gap','header.marginBottom','header.paddingTop','header.paddingRight','header.paddingBottom','header.paddingLeft','title.fontSize','title.lineHeight','title.fontWeight','title.letterSpacing','title.textTransform','title.marginTop','title.marginBottom','action.height','action.fontSize','action.lineHeight','action.fontWeight','action.paddingLeft','action.paddingRight','action.borderRadius','action.whiteSpace'];
function diff(exp,act){if(exp==null||act==null)return null; const en=px(String(exp)), an=px(String(act)); if(en!=null&&an!=null){const d=round(an-en); return Math.abs(d)>2?d:null;} return String(exp)===String(act)?null:'style';}
function probable(selector){
  const roots=['assets/css/pages','assets/css/patterns','assets/css/components/shell','assets/css/components/sections'];
  const classes=[...selector.matchAll(/\.([\w-]+)/g)].map(m=>m[1]); const hits=[];
  function walk(d){const full=path.join(ROOT,d); if(!fs.existsSync(full))return; for(const it of fs.readdirSync(full)){const p=path.join(full,it); const st=fs.statSync(p); if(st.isDirectory()) walk(path.relative(ROOT,p)); else if(p.endsWith('.css')){const s=fs.readFileSync(p,'utf8'); if(classes.some(c=>s.includes('.'+c))) hits.push(path.relative(ROOT,p));}}}
  roots.forEach(walk); return hits.slice(0,4).join('; ')||'assets/css/components/sections/section-header-canonical-contract.css';
}
async function run(label, withContract){
  const browser=await chromium.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox']});
  const report={label,generatedAt:new Date().toISOString(),summary:{},rows:[],deviations:[]};
  for(const bp of BREAKPOINTS){
    const page=await browser.newPage({viewport:{width:bp.width,height:bp.height}});
    await page.setContent(stripHtml('index.html',withContract),{waitUntil:'domcontentloaded'});
    const baseline={};
    for(const [k,s] of Object.entries(BASELINES)){baseline[k]=(await get(page,s))[0]||null;}
    await page.close();
    for(const file of PAGES){
      const p=await browser.newPage({viewport:{width:bp.width,height:bp.height}});
      await p.setContent(stripHtml(file,withContract),{waitUntil:'domcontentloaded'});
      for(const spec of SELECTORS){
        const arr=await get(p,spec.selector,!!spec.titleOnly);
        for(const actual of arr){
          const expected=baseline[spec.baseline]; if(!expected)continue;
          report.rows.push({page:file,breakpoint:bp.name,component:spec.component,selector:spec.selector,text:actual.text});
          for(const prop of PROPS){if(spec.titleOnly&&!prop.startsWith('title.'))continue; const e=val(expected,prop), a=val(actual,prop); const d=diff(e,a); if(d!==null) report.deviations.push({page:file,breakpoint:bp.name,component:spec.component,selector:spec.selector,property:prop,expected:e,actual:a,difference:d,probableCss:probable(spec.selector)});}
        }
      }
      await p.close();
    }
  }
  await browser.close();
  const byPage={},byComponent={}; for(const d of report.deviations){byPage[d.page]=(byPage[d.page]||0)+1; byComponent[d.component]=(byComponent[d.component]||0)+1;}
  report.summary={totalMeasurements:report.rows.length,totalDeviations:report.deviations.length,byPage,byComponent}; return report;
}
function csv(rows){const h=['page','breakpoint','component','selector','property','expected','actual','difference','probableCss']; const e=v=>`"${String(v??'').replace(/"/g,'""')}"`; return [h.join(','),...rows.map(r=>h.map(k=>e(r[k])).join(','))].join('\n')}
function md(before,after){const lines=[]; lines.push('# Relatório do contrato visual de headers de seção',''); lines.push('| Métrica | Antes | Depois | Diferença |','|---|---:|---:|---:|',`| Medições | ${before.summary.totalMeasurements} | ${after.summary.totalMeasurements} | ${after.summary.totalMeasurements-before.summary.totalMeasurements} |`,`| Divergências | ${before.summary.totalDeviations} | ${after.summary.totalDeviations} | ${after.summary.totalDeviations-before.summary.totalDeviations} |`,''); lines.push('## Breakpoints validados','',...BREAKPOINTS.map(b=>`- ${b.name}`),''); lines.push('## Divergências restantes por componente','','| Componente | Total |','|---|---:|'); Object.entries(after.summary.byComponent).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>lines.push(`| ${k} | ${v} |`)); lines.push('','## Divergências restantes por página','','| Página | Total |','|---|---:|'); Object.entries(after.summary.byPage).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>lines.push(`| ${k} | ${v} |`)); lines.push('','## Amostra das divergências restantes','','| Página | Breakpoint | Componente | Propriedade | Esperado | Atual | CSS provável |','|---|---|---|---|---:|---:|---|'); after.deviations.slice(0,80).forEach(d=>lines.push(`| ${d.page} | ${d.breakpoint} | ${d.component} | ${d.property} | ${d.expected??''} | ${d.actual??''} | ${d.probableCss} |`)); return lines.join('\n');}
(async()=>{fs.mkdirSync(path.join(ROOT,'reports'),{recursive:true}); const before=await run('before-section-header-contract',false); const after=await run('after-section-header-contract',true); fs.writeFileSync('reports/section-header-contract-before.json',JSON.stringify(before,null,2)); fs.writeFileSync('reports/section-header-contract-after.json',JSON.stringify(after,null,2)); fs.writeFileSync('reports/section-header-contract-after.csv',csv(after.deviations)); fs.writeFileSync('reports/section-header-contract-before-after.md',md(before,after)); console.log(`Section header contract audit: before=${before.summary.totalDeviations}, after=${after.summary.totalDeviations}`);})().catch(e=>{console.error(e);process.exit(1)});
