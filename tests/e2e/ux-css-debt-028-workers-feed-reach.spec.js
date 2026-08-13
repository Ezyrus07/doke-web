const { test, expect } = require('@playwright/test');
const cp=require('child_process');
const TARGET='e648173f3f98966e3f5bf15413bec3c08f97aab1';
const sizes=[[390,844],[560,900],[639,900],[640,900],[641,900],[760,900],[820,1180],[1366,900]];
const wanted=[['.worker-preview__profile','gap',['12px','14px']],['.worker-preview__avatar','width',['82px','76px']],['.worker-preview__avatar','height',['82px','76px']],['.worker-preview__name','font-size',['1.2rem','1.16rem']],['.worker-preview__caption','padding',['0 12px','0 16px']],['.worker-preview__caption','font-size',['0.92rem','0.92rem']]];
const norm=v=>String(v||'').trim().replace(/\b0px\b/g,'0').replace(/\s+/g,' ');

test('production workers feed reaches canonical max-640 winners',async({page})=>{
  expect(cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()).toBe(TARGET);
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.route('https://images.pexels.com/**',r=>r.fulfill({status:204,body:''}));
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.locator('[data-worker-preview]').count()).toBe(1);
  await expect.poll(()=>page.locator('[data-worker-preview-feed]').count()).toBe(1);
  await expect.poll(()=>page.evaluate(()=>Boolean(window.DokeHomeWorkers?.create))).toBe(true);
  const natural=await page.evaluate(()=>({hidden:document.querySelector('[data-worker-preview]').hidden,items:document.querySelectorAll('[data-worker-feed-item]').length,triggers:document.querySelectorAll('[data-worker-trigger]').length}));
  expect(natural.hidden).toBe(true); expect(natural.triggers).toBeGreaterThan(0);
  if(!natural.items) await page.evaluate(()=>{window.__diagWorkersAbort=new AbortController();window.DokeHomeWorkers.create({signal:window.__diagWorkersAbort.signal});});
  await expect.poll(()=>page.locator('[data-worker-feed-item]').count()).toBeGreaterThan(0);
  await expect.poll(()=>page.evaluate(()=>typeof window.DokeOpenWorkerPreview)).toBe('function');
  await page.evaluate(()=>{const t=document.querySelector('[data-worker-trigger]');window.DokeOpenWorkerPreview(t?.dataset.workerId||'vid-pintura',t||null);});
  await expect.poll(()=>page.locator('[data-worker-preview]').evaluate(el=>el.hidden)).toBe(false);
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});
    const r=await page.evaluate(({wanted})=>{
      const norm=v=>String(v||'').trim().replace(/\b0px\b/g,'0').replace(/\s+/g,' '),q='(max-width: 640px)',target='/assets/css/pages/home-overlays/workers-feed-base.css';
      const defs=Object.fromEntries(wanted.map(([s,p])=>[`${s}|${p}`,[]]));
      const walk=(rules,href,media='')=>{for(const rule of rules||[]){if(rule.type===CSSRule.IMPORT_RULE&&rule.styleSheet){let rs;try{rs=rule.styleSheet.cssRules}catch{}if(rs)walk(rs,rule.styleSheet.href||href,media);continue}if(rule.type===CSSRule.MEDIA_RULE){walk(rule.cssRules,href,rule.conditionText||'');continue}if(rule.type!==CSSRule.STYLE_RULE||!String(href||'').includes(target)||norm(media)!==norm(q))continue;for(const [s,p] of wanted)if(rule.selectorText===s){const v=rule.style.getPropertyValue(p);if(v)defs[`${s}|${p}`].push(norm(v));}}};
      for(const sh of document.styleSheets){let rs;try{rs=sh.cssRules}catch{}if(rs)walk(rs,sh.href||'');}
      const el=s=>document.querySelector(s),profile=el('.worker-preview__profile'),avatar=el('.worker-preview__avatar'),name=el('.worker-preview__name'),caption=el('.worker-preview__caption');
      const a=getComputedStyle(profile),b=getComputedStyle(avatar),c=getComputedStyle(name),d=getComputedStyle(caption),root=getComputedStyle(document.documentElement);
      const rects=[profile,avatar,name,caption].map(x=>{const z=x.getBoundingClientRect();return [z.width,z.height]});
      return{defs,media:matchMedia(q).matches,gap:a.gap,aw:b.width,ah:b.height,nf:parseFloat(c.fontSize),pad:[d.paddingTop,d.paddingRight,d.paddingBottom,d.paddingLeft],cf:parseFloat(d.fontSize),rf:parseFloat(root.fontSize),rects,items:document.querySelectorAll('[data-worker-feed-item]').length,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,bsw:document.body.scrollWidth,vw:innerWidth};
    },{wanted});
    for(const [s,p,v] of wanted) expect(r.defs[`${s}|${p}`]).toEqual(v.map(norm));
    expect(r.media).toBe(width<=640); expect(r.items).toBeGreaterThan(0); for(const [w,h] of r.rects){expect(w).toBeGreaterThan(0);expect(h).toBeGreaterThan(0)}
    expect(r.sw).toBeLessThanOrEqual(r.cw+1); expect(r.bsw).toBeLessThanOrEqual(r.vw+1);
    if(width<=640){expect(r.gap).toBe('14px');expect(r.aw).toBe('76px');expect(r.ah).toBe('76px');expect(Math.abs(r.nf-r.rf*1.16)).toBeLessThan(.08);expect(r.pad).toEqual(['0px','16px','0px','16px']);expect(Math.abs(r.cf-r.rf*.92)).toBeLessThan(.08);}
    console.log(`REACH WIDTH PASS|w=${width}|media=${r.media?1:0}|cssom=2x6|items=${r.items}|overflow=0`);
  }
  console.log('REACH PASS|viewports=8|boundary=639/640/641|naturalHidden=1|productionFeed=1|productionOpen=1|cssom=2x6|overflow=0');
});