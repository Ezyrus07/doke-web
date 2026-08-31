#!/usr/bin/env node
/*
 * Results page header/content rail contract.
 * Validates that resultados.html visible result surfaces use the same desktop/tablet
 * x-axis as the global app header after direct load and /doke-web/ subdirectory load.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const routes = ['/resultados.html?q=sSAS', '/doke-web/resultados.html?q=sSAS'];
const viewports = [
  [390, 844],
  [760, 1024],
  [820, 1180],
  [1024, 1180],
  [1366, 768],
  [1760, 900],
];
const tolerance = 1.25;

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function nearlyEqual(actual, expected, message) {
  assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${actual} ≈ ${expected}`);
}

function createStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      let urlPath = decodeURIComponent((request.url || '').split('?')[0]);
      if (urlPath.startsWith('/doke-web/')) urlPath = urlPath.slice('/doke-web'.length);
      if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

      const filePath = path.normalize(path.join(root, urlPath));
      if (!filePath.startsWith(root)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      fs.stat(filePath, (error, stat) => {
        if (error || !stat.isFile()) {
          response.writeHead(404);
          response.end(`Not found: ${urlPath}`);
          return;
        }

        response.writeHead(200, {
          'content-type': mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
        });
        fs.createReadStream(filePath).pipe(response);
      });
    });

    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function installNetworkMocks(context) {
  await context.route('**/assets/js/repositories/search-repository.js*', async (route) => {
    const response = await route.fetch();
    const originalBody = await response.text();
    const harness = `
;(function () {
  var Doke = window.Doke || (window.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var original = repositories.search;
  if (!original || original.__qaResultsHeaderRailHarness === true) return;
  var item = Object.freeze({
    id: 'qa-service-008e-c1',
    remoteId: 'qa-service-008e-c1',
    serviceId: 'qa-service-008e-c1',
    title: 'QA deterministic sSAS service',
    description: 'Synthetic browser-only Resultados header-rail contract fixture.',
    category: 'qa-contract',
    providerName: 'QA Provider',
    providerHandle: '@qa-provider',
    city: 'Sao Paulo',
    state: 'SP',
    location: 'Sao Paulo, SP',
    rating: 5,
    reviews: '1 avaliação',
    reviewsCount: 1,
    tags: ['qa', 'contract', 'sSAS'],
    priceValue: 100,
    price: 100,
    updatedAt: '2026-08-31T00:00:00.000Z'
  });
  function responseFor(request, items) {
    var contract = original.getContract();
    return {
      authority: contract.expectedAuthority,
      contractVersion: contract.version,
      request: Object.assign({}, request || {}),
      items: items.slice(),
      page: {
        pageSize: Number(request && request.pageSize || 12),
        hasNext: false,
        nextCursor: null
      }
    };
  }
  repositories.search = Object.freeze({
    __qaResultsHeaderRailHarness: true,
    queryPage: function (request) {
      request = request || {};
      if (request.query === 'sSAS') {
        return Promise.resolve(responseFor(request, [item]));
      }
      return original.queryPage(request);
    },
    normalizeRequest: function (request) { return original.normalizeRequest(request); },
    getLastError: function () { return original.getLastError(); },
    getContract: function () { return original.getContract(); }
  });
}());`;
    await route.fulfill({ response, body: `${originalBody}\n${harness}` });
  });
  await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, body: '' }));
  await context.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await context.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript; charset=utf-8',
    body: '',
  }));
  await context.route('https://unpkg.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript; charset=utf-8',
    body: 'window.lucide={createIcons(){}};',
  }));
}

async function collectLayout(page) {
  return page.evaluate(() => {
    const rectFor = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        left: Number(rect.left.toFixed(2)),
        right: Number(rect.right.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        display: style.display,
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
      };
    };

    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyPage: document.body.dataset.page,
      appHeader: rectFor('.app-header'),
      appHeaderInner: rectFor('.app-header__inner'),
      pageInner: rectFor('.page__content-inner'),
      resultsSearchbar: rectFor('.results-searchbar'),
      resultsLayout: rectFor('.results-layout'),
      resultsMain: rectFor('.results-main'),
    };
  });
}

async function main() {
  const server = await createStaticServer();
  const port = server.address().port;
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const report = [];

  try {
    for (const route of routes) {
      for (const [width, height] of viewports) {
        const viewportLabel = `${route} ${width}x${height}`;
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
        await installNetworkMocks(context);
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(650);

        const layout = await collectLayout(page);
        assert(layout.bodyPage === 'resultados', `${viewportLabel}: body[data-page] should be resultados`);
        assert(layout.scrollWidth - layout.clientWidth <= tolerance, `${viewportLabel}: involuntary horizontal overflow`);

        if (width >= 761) {
          assert(layout.appHeaderInner?.visible, `${viewportLabel}: app header inner is not visible`);
          assert(layout.resultsSearchbar?.visible, `${viewportLabel}: results searchbar is not visible`);
          assert(layout.resultsLayout?.visible, `${viewportLabel}: results layout is not visible`);

          nearlyEqual(layout.resultsSearchbar.left, layout.appHeaderInner.left, `${viewportLabel}: searchbar left rail must match header`);
          nearlyEqual(layout.resultsSearchbar.right, layout.appHeaderInner.right, `${viewportLabel}: searchbar right rail must match header`);
          nearlyEqual(layout.resultsLayout.left, layout.appHeaderInner.left, `${viewportLabel}: results layout left rail must match header`);
          nearlyEqual(layout.resultsLayout.right, layout.appHeaderInner.right, `${viewportLabel}: results layout right rail must match header`);
          assert(layout.pageInner.paddingLeft === '0px' && layout.pageInner.paddingRight === '0px', `${viewportLabel}: results workspace must not keep nested page padding`);
        }

        report.push({ route, viewport: `${width}x${height}`, layout });
        await page.close();
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(JSON.stringify({ ok: true, report }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
