#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'reports');
const BREAKPOINTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '608x926', width: 608, height: 926 },
  { name: '810x1080', width: 810, height: 1080 },
  { name: '1280x800', width: 1280, height: 800 },
];
const TARGETS = ['resultados.html','detalhe-anuncio.html','perfil.html','comunidade.html'];
const NEW_CSS = 'assets/css/components/layout/marketplace-index-parity-contract.css';
const TOL = 2;

fs.mkdirSync(REPORTS, { recursive: true });
const outJson = path.join(REPORTS, 'marketplace-index-parity-before-after.json');
const outCsv = path.join(REPORTS, 'marketplace-index-parity-before-after.csv');
const outMd = path.join(REPORTS, 'marketplace-index-parity-before-after.md');

function round(n){ return Number.isFinite(Number(n)) ? Math.round(Number(n)*100)/100 : null; }
function csv(v){ const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
function stripQuery(s){ return String(s).split('?')[0]; }

const cssCache = new Map();
function resolveAsset(asset, baseDir=ROOT){
  const clean = stripQuery(asset).replace(/^\.\//,'');
  if (/^(https?:)?\/\//i.test(clean)) return null;
  const candidates = [
    path.resolve(baseDir, clean),
    path.resolve(ROOT, clean),
    path.resolve(ROOT, clean.replace(/^\.\.\//,'')),
    path.resolve(ROOT, 'assets/css', clean),
  ];
  return candidates.find(fs.existsSync) || null;
}
function inlineCssFile(file){
  if (!file || !fs.existsSync(file)) return '';
  if (cssCache.has(file)) return cssCache.get(file);
  // Keep direct page CSS only. This avoids overloading the deterministic audit with the full legacy import graph.
  let css = fs.readFileSync(file, 'utf8');
  css = css.replace(/@import\s+url\([^)]+\)\s*;/g, '');
  cssCache.set(file, css);
  return css;
}
function loadHtml(file, mode){
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  html = html.replace(/<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi, (tag) => {
    const m = tag.match(/href=["']([^"']+)["']/i);
    if (!m) return tag;
    const href = stripQuery(m[1]);
    if (mode === 'before' && href === NEW_CSS) return '<!-- marketplace parity disabled for before audit -->';
    const p = resolveAsset(href, ROOT);
    if (!p) return '';
    let css = inlineCssFile(p);
    if (mode === 'before') css = css.replace(/@import\s+url\(["']?\.\.\/components\/layout\/marketplace-index-parity-contract\.css[^;]+;/g, '');
    return `<style data-source-css="${href}">\n${css}\n</style>`;
  });
  html = html.replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi, '<!-- scripts disabled for deterministic CSS audit -->');
  html = html.replace(/<head([^>]*)>/i, `<head$1><base href="file://${ROOT.replace(/\\/g,'/')}/">`);
  if (mode === 'after' && !html.includes('marketplace-index-parity-inline')) {
    html = html.replace(/<\/head>/i, `<style data-source-css="marketplace-index-parity-inline">${inlineCssFile(path.join(ROOT, NEW_CSS))}</style></head>`);
  }
  return html;
}
async function setPage(page,file,mode){
  await page.setContent(loadHtml(file,mode), { waitUntil:'domcontentloaded', timeout:30000 });
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(()=>{});
  await page.waitForTimeout(120);
}
async function cloneFixtures(indexPage){
  return indexPage.evaluate(() => ({
    ad: document.querySelector('#featured-services-track .doke-ad-card')?.outerHTML || '',
    pub: document.querySelector('#home-publications-track .publication-card')?.outerHTML || '',
    worker: document.querySelector('.short-videos .video-card')?.outerHTML || '',
    filter: document.querySelector('.more-services__tabs-track .mini-tab')?.outerHTML || '',
  }));
}
async function injectFixtures(page, file, fixtures){
  await page.evaluate(({file,fixtures}) => {
    const forceShow = (el) => { if (!el) return; el.hidden = false; el.removeAttribute('hidden'); el.style.display = ''; };
    if (file === 'resultados.html') {
      const layout = document.querySelector('[data-results-layout]');
      if (layout) layout.setAttribute('data-results-mode','services');
      const grid = document.querySelector('[data-results-grid]');
      forceShow(grid);
      if (grid && !grid.querySelector('.doke-ad-card')) grid.innerHTML = fixtures.ad.repeat(3);
      const vsec = document.querySelector('[data-results-videos]');
      const vgrid = document.querySelector('[data-results-videos-grid]');
      forceShow(vsec); forceShow(vgrid);
      if (vgrid && !vgrid.querySelector('.video-card')) vgrid.innerHTML = fixtures.worker.repeat(3);
      const psec = document.querySelector('[data-results-before-after]');
      const pgrid = document.querySelector('[data-results-before-after-grid]');
      forceShow(psec); forceShow(pgrid);
      if (pgrid && !pgrid.querySelector('.publication-card')) pgrid.innerHTML = fixtures.pub.repeat(3);
    }
    if (file === 'perfil.html') {
      let host = document.querySelector('.profile-shell-content') || document.querySelector('.page__content-inner');
      if (host && !document.querySelector('[data-profile-services-grid]')) {
        host.insertAdjacentHTML('beforeend', `<section class="doke-page-section"><div class="profile-section-heading"><h2>Serviços</h2><a href="#">Ver todos</a></div><div class="profile-services-grid doke-grid" data-profile-services-grid>${fixtures.ad.repeat(3)}</div></section><section class="doke-page-section"><div class="profile-section-heading"><h2>Workers</h2><a href="#">Ver mais</a></div><div class="profile-workers-grid doke-grid" data-profile-workers-grid>${fixtures.worker.repeat(3)}</div></section><section class="doke-page-section"><div class="profile-section-heading"><h2>Publicações</h2><a href="#">Ver todas</a></div><div class="profile-publications-grid doke-grid" data-profile-posts-grid>${fixtures.pub.repeat(3)}</div></section>`);
      }
    }
  }, {file, fixtures});
  await page.waitForTimeout(80);
}
function getProp(obj, prop){ return prop.split('.').reduce((a,k)=> a == null ? null : a[k], obj); }
async function measure(page, selector){
  return page.evaluate((selector) => {
    const R = n => Number.isFinite(Number(n)) ? Math.round(Number(n)*100)/100 : null;
    const px = v => { const n = parseFloat(v); return Number.isFinite(n) ? R(n) : null; };
    const visible = el => { const r=el.getBoundingClientRect(), cs=getComputedStyle(el); return r.width>0 && r.height>0 && cs.display!=='none' && cs.visibility!=='hidden' && cs.opacity!=='0'; };
    const media = el => {
      const m = el.querySelector(':scope > .doke-ad-card__media, :scope > .service-card__media, :scope > .publication-card__media, :scope > .publication-card__comparison, img, video, .video-card__poster');
      if (!m || !visible(m)) return null;
      const r=m.getBoundingClientRect(); return { width:R(r.width), height:R(r.height), aspectRatio:r.height?R(r.width/r.height):null };
    };
    const clippedText = el => Array.from(el.querySelectorAll('h1,h2,h3,p,span,a,button,strong,em')).some(n => n.scrollWidth > n.clientWidth + 2 || n.scrollHeight > n.clientHeight + 2);
    return Array.from(document.querySelectorAll(selector)).filter(visible).slice(0,5).map((el,index)=>{
      const r=el.getBoundingClientRect(), cs=getComputedStyle(el);
      return { index, text:(el.innerText||'').trim().replace(/\s+/g,' ').slice(0,70), box:{x:R(r.x),y:R(r.y),width:R(r.width),height:R(r.height)}, gap:px(cs.gap)||px(cs.columnGap)||0, padding:{top:px(cs.paddingTop)||0,right:px(cs.paddingRight)||0,bottom:px(cs.paddingBottom)||0,left:px(cs.paddingLeft)||0}, radius:px(cs.borderTopLeftRadius)||0, fontSize:px(cs.fontSize)||0, lineHeight:px(cs.lineHeight)||0, media:media(el), overflow:{selfX:R(el.scrollWidth-el.clientWidth), textClipped:clippedText(el)} };
    });
  }, selector);
}
const groups = [
  {key:'doke-ad-card', base:'#featured-services-track .doke-ad-card', target:{'resultados.html':'.results-grid > .doke-ad-card','detalhe-anuncio.html':'[data-similar-ads-grid] > .doke-ad-card','perfil.html':'[data-profile-services-grid] > .doke-ad-card'}, metrics:['box.width','box.height','media.height','media.aspectRatio','gap','padding.top','padding.right','padding.bottom','padding.left','radius','fontSize','lineHeight']},
  {key:'publication-card', base:'#home-publications-track .publication-card', target:{'resultados.html':'.results-before-after-grid > .publication-card','detalhe-anuncio.html':'[data-related-publications-list] > .publication-card','perfil.html':'[data-profile-posts-grid] > .publication-card'}, metrics:['box.width','box.height','media.height','media.aspectRatio','gap','padding.top','padding.right','padding.bottom','padding.left','radius','fontSize','lineHeight']},
  {key:'worker/video-card', base:'.short-videos .video-card', target:{'resultados.html':'.results-videos-grid > .video-card','detalhe-anuncio.html':'[data-related-workers-list] > .video-card','perfil.html':'[data-profile-workers-grid] > .video-card'}, metrics:['box.width','box.height','media.height','media.aspectRatio','gap','padding.top','padding.right','padding.bottom','padding.left','radius','fontSize','lineHeight']},
  {key:'filter-pills', base:'.more-services__tabs-track .mini-tab', target:{'resultados.html':'.search-scope__option span, .search-scope__filter-toggle','comunidade.html':'.communities-filter'}, metrics:['box.height','padding.left','padding.right','radius','fontSize','lineHeight','gap']},
  {key:'section-headers', base:'.featured-services > .section-heading', target:{'resultados.html':'.results-related__header','detalhe-anuncio.html':'.detail-section__header','perfil.html':'.profile-section-heading','comunidade.html':'.communities-v2-section__heading'}, metrics:['box.width','box.height','gap','padding.left','padding.right','fontSize','lineHeight']},
  {key:'rails/containers', base:'.shell-home__workspace', target:{'resultados.html':'.search-results-workspace','detalhe-anuncio.html':'.ad-detail-shell','perfil.html':'.profile-shell-content','comunidade.html':'.communities-v2-shell'}, metrics:['box.x','box.width','padding.left','padding.right']},
];
function compare(b,a,metrics){
  const rows=[]; if(!b.length || !a.length) return rows;
  const exp=b[0];
  a.slice(0, Math.min(a.length,3)).forEach((act,i)=>{
    for(const m of metrics){
      const ev=getProp(exp,m), av=getProp(act,m); if(ev==null || av==null) continue;
      const diff=round(Number(av)-Number(ev));
      if(Number.isFinite(diff) && Math.abs(diff)>TOL) rows.push({itemIndex:i, property:m, expected:ev, actual:av, difference:diff});
    }
    if (act.overflow?.selfX > 2) rows.push({itemIndex:i, property:'overflow.selfX', expected:0, actual:act.overflow.selfX, difference:act.overflow.selfX});
    if (act.overflow?.textClipped) rows.push({itemIndex:i, property:'textClipped', expected:false, actual:true, difference:'clipped'});
  });
  return rows;
}
function summarize(rows){ const byPage={}, byComp={}, byBp={}; for(const r of rows){ byPage[r.page]=(byPage[r.page]||0)+1; byComp[r.component]=(byComp[r.component]||0)+1; byBp[r.breakpoint]=(byBp[r.breakpoint]||0)+1; } return {total:rows.length, byPage, byComp, byBp}; }
async function runMode(browser, mode){
  const deviations=[], measurements=[];
  for (const bp of BREAKPOINTS) {
    const context = await browser.newContext({ viewport:{width:bp.width,height:bp.height} });
    const indexPage = await context.newPage(); await setPage(indexPage,'index.html', mode); const fixtures = await cloneFixtures(indexPage);
    const base = new Map(); for(const g of groups){ base.set(g.key, await measure(indexPage,g.base)); }
    for (const file of TARGETS) {
      const page = await context.newPage(); await setPage(page,file,mode); await injectFixtures(page,file,fixtures);
      for (const g of groups) {
        const sel = g.target[file]; if(!sel) continue;
        const actual = await measure(page,sel); const baseline = base.get(g.key)||[];
        measurements.push({mode,page:file,breakpoint:bp.name,component:g.key,count:actual.length,first:actual[0]||null});
        compare(baseline, actual, g.metrics).forEach(row => deviations.push({mode,page:file,breakpoint:bp.name,component:g.key,selector:sel, ...row, probableCss: NEW_CSS}));
      }
      const bodyOverflow = await page.evaluate(() => Math.round((document.documentElement.scrollWidth - document.documentElement.clientWidth) * 100)/100);
      if (bodyOverflow > 2) deviations.push({mode,page:file,breakpoint:bp.name,component:'body/page',selector:'documentElement',itemIndex:0,property:'overflowX',expected:0,actual:bodyOverflow,difference:bodyOverflow,probableCss:NEW_CSS});
      await page.close();
    }
    await indexPage.close(); await context.close();
  }
  return {deviations, measurements};
}
(async()=>{
  const browser = await chromium.launch({ headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox'] });
  const before = await runMode(browser,'before');
  const after = await runMode(browser,'after');
  await browser.close();
  const key = r => [r.page,r.breakpoint,r.component,r.selector,r.itemIndex,r.property].join('|');
  const afterMap = new Map(after.deviations.map(r => [key(r), r]));
  const rows = before.deviations.map(b => { const a=afterMap.get(key(b)); return {page:b.page,breakpoint:b.breakpoint,component:b.component,selector:b.selector,property:b.property,expected:b.expected,before:b.actual,after:a?a.actual:b.expected,beforeDiff:b.difference,afterDiff:a?a.difference:0,status:a?'remaining':'fixed',probableCss:b.probableCss}; });
  for(const a of after.deviations){ if(!rows.find(r => [r.page,r.breakpoint,r.component,r.selector,r.property].join('|') === [a.page,a.breakpoint,a.component,a.selector,a.property].join('|') && r.after === a.actual)) rows.push({page:a.page,breakpoint:a.breakpoint,component:a.component,selector:a.selector,property:a.property,expected:a.expected,before:'',after:a.actual,beforeDiff:'',afterDiff:a.difference,status:'remaining-new',probableCss:a.probableCss}); }
  const report = {generatedAt:new Date().toISOString(), tolerancePx:TOL, pages:TARGETS, breakpoints:BREAKPOINTS, before:summarize(before.deviations), after:summarize(after.deviations), rows, measurements:{before:before.measurements, after:after.measurements}};
  fs.writeFileSync(outJson, JSON.stringify(report,null,2));
  fs.writeFileSync(outCsv, ['page,breakpoint,component,selector,property,expected,before,after,beforeDiff,afterDiff,status,probableCss', ...rows.map(r=>[r.page,r.breakpoint,r.component,r.selector,r.property,r.expected,r.before,r.after,r.beforeDiff,r.afterDiff,r.status,r.probableCss].map(csv).join(','))].join('\n'));
  const byPage = TARGETS.map(p => `| ${p} | ${report.before.byPage[p]||0} | ${report.after.byPage[p]||0} |`).join('\n');
  const byComp = Object.keys({...report.before.byComp,...report.after.byComp}).sort().map(c=>`| ${c} | ${report.before.byComp[c]||0} | ${report.after.byComp[c]||0} |`).join('\n');
  const sample = rows.slice(0,80).map(r=>`| ${r.page} | ${r.breakpoint} | ${r.component} | ${r.property} | ${r.expected} | ${r.before} | ${r.after} | ${r.status} |`).join('\n');
  fs.writeFileSync(outMd, `# Marketplace index parity audit\n\nGerado em: ${report.generatedAt}\n\nTolerância: ${TOL}px. Scripts de página desativados; cards dinâmicos de resultados/perfil são fixtures HTML equivalentes aos cards reais do index para medir CSS/anatomia sem alterar JS ou dados.\n\n## Resumo\n\n| Métrica | Antes | Depois | Diferença |\n|---|---:|---:|---:|\n| Divergências | ${report.before.total} | ${report.after.total} | ${report.after.total-report.before.total} |\n\n## Por página\n\n| Página | Antes | Depois |\n|---|---:|---:|\n${byPage}\n\n## Por componente\n\n| Componente | Antes | Depois |\n|---|---:|---:|\n${byComp}\n\n## Amostra antes/depois\n\n| página | breakpoint | componente | propriedade | esperado | antes | depois | status |\n|---|---|---|---|---:|---:|---:|---|\n${sample}\n`);
  console.log(`Marketplace index parity audit: before=${report.before.total} after=${report.after.total}`);
  console.log(`Reports: ${path.relative(ROOT,outMd)}, ${path.relative(ROOT,outCsv)}, ${path.relative(ROOT,outJson)}`);
  process.exit(0);
})().catch(err=>{ console.error(err); process.exit(1); });
