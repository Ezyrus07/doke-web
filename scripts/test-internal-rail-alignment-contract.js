#!/usr/bin/env node
/*
 * Internal rail alignment contract.
 *
 * Validates the first meaningful visual rail against the global app header on
 * internal pages that previously created a second inset inside the canonical
 * page rail. This is intentionally geometry-only: JS is disabled and images are
 * blocked so page controllers/card renderers are not part of this contract.
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.DOKE_RAIL_TEST_PORT || 4199);
const tolerance = 2;

const pages = [
  'perfil.html',
  'configuracoes.html',
  'comunidade.html',
  'ajuda.html',
  'novidades.html',
  'avaliacao.html',
];

const viewports = [
  [1366, 768],
];

const prefixes = [''];

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function createServer() {
  const server = http.createServer((request, response) => {
    let pathname = decodeURIComponent((request.url || '/').split('?')[0]);
    if (pathname === '/') pathname = '/index.html';
    if (pathname.startsWith('/doke-web/')) pathname = pathname.slice('/doke-web'.length);
    const filePath = path.normalize(path.join(root, pathname));
    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      response.writeHead(200, { 'content-type': mime[path.extname(filePath)] || 'application/octet-stream' });
      response.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

const auditExpression = `() => {
  const normalize = (rect) => rect ? ({
    left: Number(rect.left.toFixed(2)),
    right: Number(rect.right.toFixed(2)),
    width: Number(rect.width.toFixed(2)),
    top: Number(rect.top.toFixed(2)),
    height: Number(rect.height.toFixed(2)),
  }) : null;

  const isVisible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && rect.width > 2
      && rect.height > 2;
  };

  const pick = (selectors) => {
    for (const selector of selectors) {
      const element = Array.from(document.querySelectorAll(selector)).find(isVisible);
      if (element) {
        const style = getComputedStyle(element);
        return {
          selector,
          className: String(element.className || ''),
          rect: normalize(element.getBoundingClientRect()),
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
          width: style.width,
          maxWidth: style.maxWidth,
        };
      }
    }
    return null;
  };

  const header = pick(['.app-header__inner', '[data-header-inner]', '.app-header']);
  const visual = pick([
    '.profile-shell-content',
    '.settings-main',
    '.orders-shell-content',
    '.help-center',
    '.news-page',
    '.post-service-layout',
    '.page__content-inner > *',
  ]);

  const delta = header && visual ? {
    left: Number((visual.rect.left - header.rect.left).toFixed(2)),
    right: Number((header.rect.right - visual.rect.right).toFixed(2)),
  } : null;

  return {
    page: document.body.dataset.page || '',
    viewport: String(window.innerWidth) + 'x' + String(window.innerHeight),
    header,
    visual,
    delta,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}`;

async function runAudits() {
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-gl=disabled', '--ozone-platform=headless'],
  };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }

  const browser = await chromium.launch(launchOptions);
  const samples = [];
  try {
    for (const [width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, javaScriptEnabled: false });
      await context.route('**/*', async (route) => {
        const request = route.request();
        const url = request.url();
        if (!url.startsWith(`http://127.0.0.1:${port}`)) {
          await route.abort();
          return;
        }
        if (['image', 'media', 'font'].includes(request.resourceType())) {
          await route.abort();
          return;
        }
        await route.continue();
      });

      const page = await context.newPage();
      for (const prefix of prefixes) {
        for (const file of pages) {
          const pathname = `${prefix}/${file}`.replace(/\/\/+/, '/');
          await page.goto(`http://127.0.0.1:${port}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 12000 });
          await page.waitForFunction(() => {
            const header = document.querySelector('.app-header__inner, [data-header-inner], .app-header');
            if (!header) return false;
            const rect = header.getBoundingClientRect();
            return rect.left > 20 && rect.width < window.innerWidth - 40;
          }, null, { timeout: 4500 }).catch(() => {});
          const audit = await page.evaluate(`(${auditExpression})()`);
          samples.push({ file, prefix: prefix || '/', ...audit });
        }
      }
      await page.close();
      await context.close();
    }
  } finally {
    await browser.close().catch(() => {});
  }
  return samples;
}

(async () => {
  const server = await createServer();
  const failures = [];
  const samples = [];

  try {
    samples.push(...await runAudits());
    for (const audit of samples) {
      if (!audit.header || !audit.visual || !audit.delta) {
        failures.push(`${audit.file} ${audit.viewport} ${audit.prefix}: missing header or visual rail`);
        continue;
      }
      if (Math.abs(audit.delta.left) > tolerance || Math.abs(audit.delta.right) > tolerance) {
        failures.push(`${audit.file} ${audit.viewport} ${audit.prefix}: left=${audit.delta.left}, right=${audit.delta.right}`);
      }
      if (audit.overflow > tolerance) {
        failures.push(`${audit.file} ${audit.viewport} ${audit.prefix}: horizontal overflow=${audit.overflow}`);
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  const reportPath = path.join(root, 'reports', 'generated', 'internal-rail-alignment-contract.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ tolerance, pages, viewports, samples, failures }, null, 2));

  if (failures.length) {
    console.error('[internal-rail-alignment-contract] failed');
    for (const failure of failures) console.error(`- ${failure}`);
    console.error(`Report: ${path.relative(root, reportPath)}`);
    process.exit(1);
  }

  console.log('[internal-rail-alignment-contract] passed');
  console.log(`Samples: ${samples.length}`);
  console.log(`Report: ${path.relative(root, reportPath)}`);
  process.exit(0);
})();
