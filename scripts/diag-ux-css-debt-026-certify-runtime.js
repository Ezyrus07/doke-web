const fs = require('fs');
const cp = require('child_process');
const { chromium } = require(process.cwd() + '/node_modules/playwright');

const widths = [390, 559, 560, 561, 760, 761, 820, 1366];
const fileNeedle = '/assets/css/pages/pedidos/tablet-rail-contract.css';
const selector = 'body.orders-page-shell .orders-command-summary, body.orders-page-shell .orders-planner, body.orders-page-shell .orders-command-insights, body.orders-page-shell .orders-list, body.orders-page-shell .orders-empty';
const props = ['inline-size', 'width', 'max-inline-size', 'max-width', 'margin-inline'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const canon = s => (s || '').replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s*,\s*/g, ',').trim();

async function capture(out, mode) {
  const server = cp.spawn(process.execPath, ['scripts/serve-static-site.js', '--host=127.0.0.1', '--port=5500'], {
    stdio: 'ignore',
    env: { ...process.env, DOKE_E2E_DISABLE_REMOTE_SERVICES: '1' },
  });
  try {
    await sleep(500);
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const result = {};
    let active = 0;
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        const local = url.origin === 'http://127.0.0.1:5500';
        if (local && url.pathname.endsWith('.js')) return route.abort();
        if (local || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
        return route.abort();
      });
      await page.goto('http://127.0.0.1:5500/pedidos.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}.doke-document-preloader,.doke-page-hydration-skeleton{display:none!important}html,body{visibility:visible!important;opacity:1!important}' });
      const snapshot = await page.evaluate(({ selector, fileNeedle, props }) => {
        const canon = s => (s || '').replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s*,\s*/g, ',').trim();
        const hits = [];
        function walk(rules, contexts, href) {
          for (const rule of [...rules]) {
            const name = rule.constructor?.name || '';
            if (name === 'CSSImportRule' && rule.styleSheet) {
              try { walk(rule.styleSheet.cssRules, contexts, rule.styleSheet.href || href); } catch {}
            } else if (name === 'CSSMediaRule') {
              walk(rule.cssRules, [...contexts, `@media ${rule.conditionText}`], href);
            } else if (rule.selectorText) {
              for (const prop of props) {
                const value = rule.style?.getPropertyValue(prop);
                if (value) hits.push({ selector: canon(rule.selectorText), prop, value: value.trim(), priority: rule.style.getPropertyPriority(prop), ctx: contexts.join(' || '), href });
              }
            } else if (rule.cssRules) {
              walk(rule.cssRules, contexts, href);
            }
          }
        }
        for (const sheet of [...document.styleSheets]) {
          try { walk(sheet.cssRules, [], sheet.href || 'inline'); } catch {}
        }
        const nodes = [...document.querySelectorAll(selector)];
        const visible = nodes.filter(node => {
          const style = getComputedStyle(node), rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });
        const details = visible.map(node => {
          const style = getComputedStyle(node), rect = node.getBoundingClientRect();
          return {
            className: node.className,
            rect: [+rect.x.toFixed(3), +rect.y.toFixed(3), +rect.width.toFixed(3), +rect.height.toFixed(3)],
            inlineSize: style.inlineSize,
            width: style.width,
            maxInlineSize: style.maxInlineSize,
            maxWidth: style.maxWidth,
            marginLeft: style.marginLeft,
            marginRight: style.marginRight,
          };
        });
        const de = document.documentElement, body = document.body;
        return {
          total: nodes.length,
          visible: visible.length,
          details,
          media: matchMedia('(max-width: 560px)').matches,
          hits: hits.filter(hit => String(hit.href).includes(fileNeedle) && hit.ctx === '@media (max-width: 560px)' && hit.selector === canon(selector)),
          document: {
            html: [de.scrollWidth, de.clientWidth, de.scrollHeight, de.clientHeight],
            body: [body.scrollWidth, body.clientWidth, body.scrollHeight, body.clientHeight],
          },
        };
      }, { selector, fileNeedle, props });
      if (snapshot.total !== 8 || snapshot.visible < 1) throw new Error(`DOM ${mode} ${width} ${snapshot.total}/${snapshot.visible}`);
      if (snapshot.media) active += 1;
      const expectedCount = mode === 'parent' ? 2 : 1;
      for (const prop of props) {
        const matching = snapshot.hits.filter(hit => hit.prop === prop);
        if (matching.length !== expectedCount) throw new Error(`CSSOM ${mode} ${width} ${prop}=${matching.length}`);
        if (matching.some(hit => hit.priority !== '')) throw new Error(`priority ${mode} ${width} ${prop}`);
      }
      for (const detail of snapshot.details) {
        if (detail.rect.some(value => !Number.isFinite(value)) || detail.rect[2] <= 0 || detail.rect[3] <= 0) throw new Error(`geometry ${mode} ${width}`);
      }
      if (snapshot.document.html[0] > snapshot.document.html[1] + 1 || snapshot.document.body[0] > snapshot.document.body[1] + 1) throw new Error(`overflow ${mode} ${width}`);
      delete snapshot.hits;
      result[width] = snapshot;
      await context.close();
    }
    await browser.close();
    if (active !== 3) throw new Error(`boundary ${mode}=${active}`);
    fs.writeFileSync(out, JSON.stringify(result));
    console.log(`CAPTURE PASS|mode=${mode}|viewports=8|activeMax560=3|cssom=${mode === 'parent' ? '2+2+2+2+2' : '1+1+1+1+1'}`);
  } finally {
    server.kill('SIGTERM');
  }
}

capture(process.argv[2], process.argv[3]).catch(error => { console.error(error); process.exit(1); });
