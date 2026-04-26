const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'artifacts', 'screenshots', 'surface-contract');
fs.mkdirSync(OUT_DIR, { recursive: true });

const flows = [
  { name: 'solicitar-transferencia', url: 'carteira.html', opener: async (page) => page.locator('[data-wallet-withdraw-modal]').evaluate(el => { el.hidden = false; }) , surface: '.wallet-modal__card' },
  { name: 'solicitar-orcamento', url: 'detalhe-anuncio.html', opener: async (page) => page.locator('[data-budget-modal]').evaluate(el => { el.hidden = false; }) , surface: '.detail-modal__card' },
  { name: 'adicionar-endereco', url: 'index.html', opener: async (page) => page.locator('[data-home-address-modal]').evaluate(el => { if (!el.open) el.showModal(); }) , surface: '.home-address-modal__dialog' },
  { name: 'enderecos-salvos-localizacao', url: 'index.html', opener: async (page) => page.locator('[data-ui-modal]').evaluate(el => { el.hidden = false; }) , surface: '.ui-modal__dialog' },
  { name: 'nova-cobranca', url: 'mensagens.html', opener: async (page) => page.locator('[data-charge-modal]').evaluate(el => { if (!el.open) el.showModal(); }) , surface: '.charge-modal__surface' },
  { name: 'criar-comunidade', url: 'comunidade.html', opener: async (page) => page.locator('[data-community-create-modal]').evaluate(el => { el.hidden = false; el.removeAttribute('aria-hidden'); }) , surface: '[data-community-create-modal] .community-action-modal__dialog' },
  { name: 'entrar-por-codigo', url: 'comunidade.html', opener: async (page) => page.locator('[data-community-code-modal]').evaluate(el => { el.hidden = false; el.removeAttribute('aria-hidden'); }) , surface: '[data-community-code-modal] .community-action-modal__dialog' },
  { name: 'resumo-pedido', url: 'pedidos.html', opener: async (page) => page.locator('[data-orders-panel="details"]').evaluate(el => { el.hidden = false; }) , surface: '[data-orders-panel="details"]', sidepanel: true },
  { name: 'filtros-resultados', url: 'resultados.html', opener: async (page) => page.evaluate(() => document.body.classList.add('results-filters-open')) , surface: '.results-filters .results-panel', mobileOnly: true },
  { name: 'card-antes-depois', url: 'index.html', opener: async (page) => page.locator('[data-before-after-preview]').evaluate(el => { el.hidden = false; el.removeAttribute('aria-hidden'); }) , surface: '.before-after-preview__dialog' },
  { name: 'card-workers-video', url: 'index.html', opener: async (page) => page.locator('[data-worker-preview]').evaluate(el => { el.hidden = false; el.removeAttribute('aria-hidden'); }) , surface: '.worker-preview__stage' }
];

const viewports = [
  { label: 'desktop', width: 1440, height: 960, isMobile: false },
  { label: 'mobile', width: 390, height: 844, isMobile: true }
];

function round(n) { return Math.round(n * 100) / 100; }

function inlineLocalCss(html) {
  return html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, (tag) => {
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    if (!href || /^https?:/i.test(href)) return '';
    const clean = href.split('?')[0];
    const cssPath = path.join(ROOT, clean);
    if (!fs.existsSync(cssPath)) return '';
    return `<style data-inlined-css="${clean}">\n${fs.readFileSync(cssPath, 'utf8')}\n</style>`;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-web-security','--allow-file-access-from-files','--disable-dev-shm-usage','--disable-gpu','--single-process','--no-zygote','--headless=new'] });
  const results = [];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile });
    for (const flow of flows) {
      if (flow.mobileOnly && !vp.isMobile) continue;
      const page = await context.newPage();
      const html = inlineLocalCss(fs.readFileSync(path.join(ROOT, flow.url), 'utf8'));
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await flow.opener(page);
      await page.waitForTimeout(250);
      const locator = page.locator(flow.surface).first();
      await locator.waitFor({ state: 'visible', timeout: 3000 });
      const metrics = await page.evaluate(({ selector, sidepanel }) => {
        const el = document.querySelector(selector);
        const rect = el.getBoundingClientRect();
        const doc = document.documentElement;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const centerDelta = sidepanel ? null : Math.abs((rect.left + rect.width / 2) - vw / 2);
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
          viewportWidth: vw,
          viewportHeight: vh,
          centerDelta,
          overflowX: doc.scrollWidth - vw,
          outsideX: Math.max(0, -rect.left) + Math.max(0, rect.right - vw),
          outsideY: Math.max(0, -rect.top) + Math.max(0, rect.bottom - vh),
        };
      }, { selector: flow.surface, sidepanel: !!flow.sidepanel });

      const pass = metrics.overflowX <= 1 && metrics.outsideX <= 1 && metrics.outsideY <= 1 && (flow.sidepanel || metrics.centerDelta <= 2);
      const screenshot = path.join(OUT_DIR, `${vp.label}-${flow.name}.png`);
      let screenshotStatus = path.relative(ROOT, screenshot);
      try {
        await page.screenshot({ path: screenshot, fullPage: false, timeout: 2500 });
      } catch (error) {
        screenshotStatus = `screenshot skipped: ${error.message.split('\n')[0]}`;
      }
      results.push({ viewport: vp.label, flow: flow.name, pass, screenshot: screenshotStatus, ...Object.fromEntries(Object.entries(metrics).map(([k,v]) => [k, typeof v === 'number' ? round(v) : v])) });
      await page.close();
    }
    await context.close();
  }

  await browser.close();

  const reportPath = path.join(ROOT, 'docs', 'validation', 'surface-contract-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  const markdown = ['# Surface Contract Validation', '', '| viewport | flow | pass | width | centerDelta | overflowX | outsideX | outsideY | screenshot |', '|---|---:|---:|---:|---:|---:|---:|---:|---|'];
  for (const r of results) {
    markdown.push(`| ${r.viewport} | ${r.flow} | ${r.pass ? '✅' : '❌'} | ${r.width} | ${r.centerDelta ?? 'n/a'} | ${r.overflowX} | ${r.outsideX} | ${r.outsideY} | ${r.screenshot} |`);
  }
  fs.writeFileSync(path.join(ROOT, 'docs', 'validation', 'surface-contract-report.md'), markdown.join('\n'));
  console.table(results.map(({viewport, flow, pass, width, centerDelta, overflowX, outsideX, outsideY}) => ({viewport, flow, pass, width, centerDelta, overflowX, outsideX, outsideY})));
  if (results.some(r => !r.pass)) process.exit(1);
})();
