#!/usr/bin/env node
/*
 * Home index visual contract smoke test.
 * Validates the real rendered rail, section-header alignment and existing search dropdown.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const viewports = [
  [390, 844],
  [608, 926],
  [760, 1024],
  [820, 1180],
  [1024, 1180],
  [1366, 768],
  [1760, 900],
];
const routes = ['/index.html', '/doke-web/index.html'];
const tolerance = 1.25;
const shouldWriteScreenshots = process.argv.includes('--screenshots');
const screenshotDir = path.join(root, 'reports', 'generated', 'home-index-contract');

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
  if (!condition) {
    throw new Error(message);
  }
}

function nearlyEqual(a, b, message) {
  assert(Math.abs(a - b) <= tolerance, `${message}: expected ${a} ≈ ${b}`);
}

function createStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      let urlPath = decodeURIComponent((request.url || '').split('?')[0]);
      if (urlPath.startsWith('/doke-web/')) {
        urlPath = urlPath.slice('/doke-web'.length);
      }
      if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
      }

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
  await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, body: '' }));
  await context.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await context.route('https://unpkg.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript; charset=utf-8',
    body: 'window.lucide={createIcons(){}};',
  }));
  await context.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript; charset=utf-8',
    body: 'window.supabase={createClient(){return {}}};',
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
        height: Number(rect.height.toFixed(2)),
        display: style.display,
        visibility: style.visibility,
        textAlign: style.textAlign,
        fontSize: style.fontSize,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
      };
    };

    return {
      innerWidth: window.innerWidth,
      dpr: window.devicePixelRatio,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      appHeader: rectFor('.app-header'),
      headerPrimary: rectFor('.app-header__group--primary'),
      pageContent: rectFor('.page__content'),
      pageInner: rectFor('.page__content-inner'),
      searchHero: rectFor('.home-search-hero'),
      searchCard: rectFor('.home-search-hero__card'),
      sectionHeaders: Array.from(document.querySelectorAll('.home-section-header')).map((header) => {
        const rect = header.getBoundingClientRect();
        const style = window.getComputedStyle(header);
        const title = header.querySelector('.home-section-title');
        const action = header.querySelector('.section-heading__link');
        const titleRect = title?.getBoundingClientRect();
        const actionRect = action?.getBoundingClientRect();
        return {
          text: title?.textContent.trim() || '',
          left: Number(rect.left.toFixed(2)),
          right: Number(rect.right.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
          display: style.display,
          textAlign: style.textAlign,
          titleLeft: titleRect ? Number(titleRect.left.toFixed(2)) : null,
          titleAlign: title ? window.getComputedStyle(title).textAlign : null,
          titleFontSize: title ? window.getComputedStyle(title).fontSize : null,
          actionRight: actionRect ? Number(actionRect.right.toFixed(2)) : null,
        };
      }),
      tracks: [
        '#featured-services-track',
        '#short-videos-track',
        '#home-publications-track',
        '[data-more-services-grid]',
        '#professional-showcase-track',
      ].map((selector) => ({ selector, rect: rectFor(selector) })).filter((entry) => entry.rect),
      searchInput: rectFor('[data-search-input]'),
    };
  });
}

async function validateSearchDropdown(page, viewportLabel) {
  const input = page.locator('[data-search-input]');
  const visible = await input.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });

  if (!visible) return { skipped: true, reason: 'main search input is not visible in this mobile shell viewport' };

  await input.click();
  await input.fill('pin');
  await page.waitForTimeout(100);
  const opened = await page.evaluate(() => {
    const dropdown = document.querySelector('[data-search-dropdown]');
    const inputElement = document.querySelector('[data-search-input]');
    const form = document.querySelector('[data-searchbox]');
    const rect = dropdown.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    return {
      hidden: dropdown.hidden,
      expanded: inputElement.getAttribute('aria-expanded'),
      state: dropdown.getAttribute('data-search-state'),
      left: Number(rect.left.toFixed(2)),
      right: Number(rect.right.toFixed(2)),
      width: Number(rect.width.toFixed(2)),
      formLeft: Number(formRect.left.toFixed(2)),
      formRight: Number(formRect.right.toFixed(2)),
      suggestions: Array.from(dropdown.querySelectorAll('.search-suggestion__label')).map((node) => node.textContent.trim()),
    };
  });

  assert(!opened.hidden, `${viewportLabel}: search dropdown did not open`);
  assert(opened.expanded === 'true', `${viewportLabel}: search aria-expanded was not true`);
  assert(opened.state === 'results', `${viewportLabel}: search state should be results`);
  assert(opened.suggestions.length > 0, `${viewportLabel}: search dropdown has no suggestions`);
  assert(opened.left >= 0 && opened.right <= await page.evaluate(() => window.innerWidth), `${viewportLabel}: search dropdown overflows viewport`);
  nearlyEqual(opened.left, opened.formLeft, `${viewportLabel}: search dropdown must start on the search form rail`);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => ({
    hidden: document.querySelector('[data-search-dropdown]').hidden,
    expanded: document.querySelector('[data-search-input]').getAttribute('aria-expanded'),
    state: document.querySelector('[data-search-dropdown]').getAttribute('data-search-state'),
  }));
  assert(closed.hidden, `${viewportLabel}: Escape did not close the dropdown`);
  assert(closed.expanded === 'false', `${viewportLabel}: search aria-expanded was not false after Escape`);
  assert(closed.state === 'closed', `${viewportLabel}: search state was not closed after Escape`);
  return { skipped: false, opened };
}

async function main() {
  if (shouldWriteScreenshots) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

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
        assert(layout.scrollWidth - layout.clientWidth <= tolerance, `${viewportLabel}: involuntary horizontal overflow`);
        assert(!layout.sectionHeaders.some((item) => item.text === 'Workers'), `${viewportLabel}: visible English label "Workers" found`);

        const visibleHeaders = layout.sectionHeaders.filter((item) => item.width > 0);
        assert(visibleHeaders.length >= 5, `${viewportLabel}: expected all home section headers to be visible`);

        const titleFontSize = visibleHeaders[0].titleFontSize;
        for (const header of visibleHeaders) {
          assert(header.titleAlign !== 'center', `${viewportLabel}: title "${header.text}" is centered`);
          nearlyEqual(header.left, visibleHeaders[0].left, `${viewportLabel}: section header "${header.text}" left rail mismatch`);
          nearlyEqual(header.right, visibleHeaders[0].right, `${viewportLabel}: section header "${header.text}" right rail mismatch`);
          assert(header.titleFontSize === titleFontSize, `${viewportLabel}: section title "${header.text}" has a divergent font size`);
          if (header.actionRight !== null) {
            nearlyEqual(header.actionRight, header.right, `${viewportLabel}: section action in "${header.text}" is not right aligned`);
          }
        }

        for (const track of layout.tracks) {
          nearlyEqual(track.rect.left, visibleHeaders[0].left, `${viewportLabel}: track ${track.selector} does not start on the section rail`);
        }

        if (layout.searchHero?.visible && layout.headerPrimary?.visible) {
          nearlyEqual(layout.searchHero.left, layout.headerPrimary.left, `${viewportLabel}: search hero must align to header primary controls`);
        }

        const dropdown = await validateSearchDropdown(page, viewportLabel);

        if (shouldWriteScreenshots) {
          const safeRoute = route.replace(/[^a-z0-9]/gi, '_');
          await page.screenshot({ path: path.join(screenshotDir, `${safeRoute}_${width}x${height}.png`), fullPage: true });
        }

        report.push({ route, viewport: `${width}x${height}`, rail: visibleHeaders[0], overflow: layout.scrollWidth - layout.clientWidth, dropdown });
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
