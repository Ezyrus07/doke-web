const { test, expect } = require('@playwright/test');
const fs = require('fs');
const cp = require('child_process');

const blobs = {
  'assets/css/pages/pagamento-profissional.css': '4411ec3c8fe73a925963b59602b2fefad2e5a264',
  'assets/css/pages/pagamento-profissional-foundation.css': 'e9a65fb9c44c42e58f6b52cf8b3af5c89322108c',
  'assets/css/components/overlays/modal-visual-contract.css': '2fd0b2fc22c9437052e00442848c0ed93966021a',
  'pagamento-profissional.html': 'b9f9e504f9d521100b8bbc0c67a08bf361aacd91',
};
const sizes=[[390,844],[430,900],[560,900],[600,900],[760,900],[761,900],[820,1180],[1366,900]];
const pageProps=['align-items','gap','padding','border-radius','background','font-size'];

function val(block,name){return block.match(new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*([^;]+);`,'m'))?.[1]?.trim()||''}

test('cross-file authority is exact',()=>{
  for(const [file,sha] of Object.entries(blobs))expect(cp.execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim()).toBe(sha);
  const pageCss=fs.readFileSync('assets/css/pages/pagamento-profissional.css','utf8');
  const shared=fs.readFileSync('assets/css/components/overlays/modal-visual-contract.css','utf8');
  const html=fs.readFileSync('pagamento-profissional.html','utf8');
  const blocks=[...pageCss.matchAll(/\.payment-finish-check\s*\{([\s\S]*?)\}/g)].map(m=>m[1]);
  expect(blocks).toHaveLength(2); expect((html.match(/class="payment-finish-check\b/g)||[])).toHaveLength(1);
  expect(blocks.map(b=>val(b,'align-items'))).toEqual(['flex-start','center']);
  expect(blocks.map(b=>val(b,'gap'))).toEqual(['11px','12px']);
  expect(blocks.map(b=>val(b,'padding'))).toEqual(['14px','12px 14px']);
  expect(blocks.map(b=>val(b,'border-radius'))).toEqual(['var(--form-control-surface-radius, var(--radius-sm))','var(--radius-base)']);
  expect(blocks.map(b=>val(b,'background'))).toEqual(['#f8fbfe','rgba(248, 252, 255, 0.88)']);
  expect(blocks.map(b=>val(b,'font-size'))).toEqual(['0.8rem','0.9rem']);
  expect(shared).toMatch(/\.doke-modal-check,[\s\S]*?padding:\s*0 14px;[\s\S]*?border-radius:\s*var\(--doke-modal-visual-control-radius\);[\s\S]*?background:\s*var\(--doke-modal-visual-soft\);/);
  console.log('STATIC PASS|productBlobsExact=4|pageRules=2|sharedModalCheck=1|dom=1|pageProps=6');
});

test('real modal cascade reaches page winner then shared authority',async({page})=>{
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
  await page.addInitScript(()=>localStorage.setItem('doke.auth.session.v1',JSON.stringify({provider:'mock',sessionStatus:'active',accountStatus:'active',user:{id:'reach-client',role:'client',accountStatus:'active'}})));
  await page.goto('/pagamento-profissional.html');
  await expect.poll(()=>page.locator('.payment-finish-check').count()).toBe(1);
  expect(await page.locator('[data-finish-order-modal]').evaluate(el=>el.hidden)).toBe(true);
  await page.locator('[data-finish-order-modal]').evaluate(el=>{el.hidden=false;el.setAttribute('aria-hidden','false')});
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});
    const s=await page.evaluate(({pageProps})=>{
      const el=document.querySelector('.payment-finish-check'), pageVals=Object.fromEntries(pageProps.map(p=>[p,[]])); let pageRules=0,sharedRules=0;
      const walk=sheet=>{let rules;try{rules=sheet.cssRules}catch{return}for(const rule of rules||[]){if(rule.type===CSSRule.IMPORT_RULE&&rule.styleSheet){walk(rule.styleSheet);continue}if(rule.type!==CSSRule.STYLE_RULE)continue;const href=rule.parentStyleSheet?.href||sheet.href||'';if(href.includes('/assets/css/pages/pagamento-profissional.css')&&rule.selectorText==='.payment-finish-check'){pageRules++;for(const p of pageProps){const v=rule.style.getPropertyValue(p).trim();if(v)pageVals[p].push(v)}}if(href.includes('/assets/css/components/overlays/modal-visual-contract.css')&&rule.selectorText?.includes('.doke-modal-check'))sharedRules++}};
      for(const sheet of document.styleSheets)walk(sheet);
      const cs=getComputedStyle(el),root=getComputedStyle(document.documentElement),r=el.getBoundingClientRect();
      return{pageRules,sharedRules,pageVals,display:cs.display,align:cs.alignItems,gap:cs.gap,pad:[cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft],font:parseFloat(cs.fontSize),rootFont:parseFloat(root.fontSize),bg:cs.backgroundColor,radius:cs.borderTopLeftRadius,rect:{left:r.left,right:r.right,width:r.width,height:r.height},vw:innerWidth,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth};
    },{pageProps});
    expect(s.pageRules).toBe(2); expect(s.sharedRules).toBeGreaterThanOrEqual(1); for(const p of pageProps)expect(s.pageVals[p]).toHaveLength(2);
    expect(s.pageVals['align-items'].at(-1)).toBe('center'); expect(s.pageVals.gap.at(-1)).toBe('12px'); expect(s.pageVals.padding.at(-1)).toBe('12px 14px'); expect(s.pageVals['border-radius'].at(-1)).toBe('var(--radius-base)'); expect(s.pageVals['font-size'].at(-1)).toBe('0.9rem');
    expect(s.display).toBe('flex'); expect(s.align).toBe('center'); expect(s.gap).toBe('12px'); expect(s.pad).toEqual(['0px','14px','0px','14px']); expect(Math.abs(s.font-s.rootFont*0.9)).toBeLessThan(0.05); expect(s.bg).not.toBe('rgba(0, 0, 0, 0)'); expect(s.radius).not.toBe('0px');
    expect(s.rect.width).toBeGreaterThan(0); expect(s.rect.height).toBeGreaterThan(0); expect(s.rect.left).toBeGreaterThanOrEqual(-1); expect(s.rect.right).toBeLessThanOrEqual(s.vw+1); expect(s.sw).toBeLessThanOrEqual(s.cw+1);
    console.log(`REACH WIDTH PASS|w=${width}|pageRules=2|sharedRules=${s.sharedRules}|pad=0x14|rect=${s.rect.width.toFixed(2)}x${s.rect.height.toFixed(2)}|overflow=0`);
  }
  console.log('REACH PASS|viewports=8|dom=1|naturalHidden=1|controlledVisible=1|pageCSSOM=2x6|sharedModalAuthority=1|computed=center+12px+0x14+0.9rem|overflow=0');
});
