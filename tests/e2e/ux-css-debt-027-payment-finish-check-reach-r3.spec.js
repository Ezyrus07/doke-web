const { test, expect } = require('@playwright/test');
const fs = require('fs');
const cp = require('child_process');

const blobs = {
  'assets/css/pages/pagamento-profissional.css': '4411ec3c8fe73a925963b59602b2fefad2e5a264',
  'assets/css/pages/pagamento-profissional-foundation.css': 'e9a65fb9c44c42e58f6b52cf8b3af5c89322108c',
  'pagamento-profissional.html': 'b9f9e504f9d521100b8bbc0c67a08bf361aacd91',
};
const sizes = [[390,844],[430,900],[560,900],[600,900],[760,900],[761,900],[820,1180],[1366,900]];
const props = ['align-items','gap','padding','border-radius','background','font-size'];

function sourceProp(block, name) {
  return block.match(new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*([^;]+);`, 'm'))?.[1]?.trim() || '';
}

test('static authority exact', () => {
  for (const [file, sha] of Object.entries(blobs)) {
    expect(cp.execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim()).toBe(sha);
  }
  const css = fs.readFileSync('assets/css/pages/pagamento-profissional.css', 'utf8');
  const html = fs.readFileSync('pagamento-profissional.html', 'utf8');
  const foundation = fs.readFileSync('assets/css/pages/pagamento-profissional-foundation.css', 'utf8');
  const blocks = [...css.matchAll(/\.payment-finish-check\s*\{([\s\S]*?)\}/g)].map(m => m[1]);
  expect(blocks).toHaveLength(2);
  expect((html.match(/class="payment-finish-check\b/g) || [])).toHaveLength(1);
  expect(foundation).toContain('@import url("pagamento-profissional.css');
  expect(blocks.map(b => sourceProp(b,'align-items'))).toEqual(['flex-start','center']);
  expect(blocks.map(b => sourceProp(b,'gap'))).toEqual(['11px','12px']);
  expect(blocks.map(b => sourceProp(b,'padding'))).toEqual(['14px','12px 14px']);
  expect(blocks.map(b => sourceProp(b,'border-radius'))).toEqual(['var(--form-control-surface-radius, var(--radius-sm))','var(--radius-base)']);
  expect(blocks.map(b => sourceProp(b,'background'))).toEqual(['#f8fbfe','rgba(248, 252, 255, 0.88)']);
  expect(blocks.map(b => sourceProp(b,'font-size'))).toEqual(['0.8rem','0.9rem']);
  console.log('STATIC PASS|productBlobsExact=3|dom=1|blocks=2|properties=6');
});

test('later winner reaches real modal checkbox', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType:'text/css', body:'' }));
  await page.addInitScript(() => localStorage.setItem('doke.auth.session.v1', JSON.stringify({provider:'mock',sessionStatus:'active',accountStatus:'active',user:{id:'reach-client',role:'client',accountStatus:'active'}})));
  await page.goto('/pagamento-profissional.html');
  await expect.poll(() => page.locator('.payment-finish-check').count()).toBe(1);
  expect(await page.locator('[data-finish-order-modal]').evaluate(el => el.hidden)).toBe(true);
  await page.locator('[data-finish-order-modal]').evaluate(el => { el.hidden=false; el.setAttribute('aria-hidden','false'); });

  for (const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    const state = await page.evaluate(({props}) => {
      const el=document.querySelector('.payment-finish-check');
      const values=Object.fromEntries(props.map(p=>[p,[]])); let count=0;
      const walk=sheet=>{let rules;try{rules=sheet.cssRules}catch{return}for(const rule of rules||[]){if(rule.type===CSSRule.IMPORT_RULE&&rule.styleSheet){walk(rule.styleSheet);continue}if(rule.type!==CSSRule.STYLE_RULE)continue;const href=rule.parentStyleSheet?.href||sheet.href||'';if(!href.includes('/assets/css/pages/pagamento-profissional.css')||rule.selectorText!=='.payment-finish-check')continue;count++;for(const p of props){const v=rule.style.getPropertyValue(p).trim();if(v)values[p].push(v)}}};
      for(const sheet of document.styleSheets)walk(sheet);
      const cs=getComputedStyle(el),root=getComputedStyle(document.documentElement),r=el.getBoundingClientRect();
      return {count,values,display:cs.display,align:cs.alignItems,gap:cs.gap,pad:[cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft],font:parseFloat(cs.fontSize),rootFont:parseFloat(root.fontSize),bg:cs.backgroundColor,radius:cs.borderTopLeftRadius,radiusBase:cs.getPropertyValue('--radius-base').trim()||root.getPropertyValue('--radius-base').trim(),rect:{left:r.left,right:r.right,width:r.width,height:r.height},vw:innerWidth,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth};
    }, {props});
    expect(state.count).toBe(2); for(const p of props)expect(state.values[p]).toHaveLength(2);
    expect(state.values['align-items'].at(-1)).toBe('center'); expect(state.values.gap.at(-1)).toBe('12px'); expect(state.values.padding.at(-1)).toBe('12px 14px'); expect(state.values['border-radius'].at(-1)).toBe('var(--radius-base)'); expect(state.values['font-size'].at(-1)).toBe('0.9rem');
    expect(state.display).toBe('flex'); expect(state.align).toBe('center'); expect(state.gap).toBe('12px'); expect(state.pad).toEqual(['12px','14px','12px','14px']); expect(Math.abs(state.font-state.rootFont*0.9)).toBeLessThan(0.05); expect(state.bg).toContain('248, 252, 255'); if(state.radiusBase)expect(state.radius).toBe(state.radiusBase);
    expect(state.rect.width).toBeGreaterThan(0); expect(state.rect.height).toBeGreaterThan(0); expect(state.rect.left).toBeGreaterThanOrEqual(-1); expect(state.rect.right).toBeLessThanOrEqual(state.vw+1); expect(state.sw).toBeLessThanOrEqual(state.cw+1);
    console.log(`REACH WIDTH PASS|w=${width}|rules=2|rect=${state.rect.width.toFixed(2)}x${state.rect.height.toFixed(2)}|overflow=0`);
  }
  console.log('REACH PASS|viewports=8|dom=1|naturalHidden=1|controlledVisible=1|cssom=2x6|winner=center+12px+12x14+radiusBase+rgba+0.9rem|overflow=0');
});
