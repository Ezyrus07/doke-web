#!/usr/bin/env node
/*
 * Generates the canonical responsive measurement baseline for index.html.
 * This script does not mutate application UI files. It only writes reports/responsive-index-baseline.json.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'reports', 'responsive-index-baseline.json');

const breakpoints = [
  { name: '390x844', width: 390, height: 844 },
  { name: '608x926', width: 608, height: 926 },
  { name: '810x1080', width: 810, height: 1080 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
];

const components = [
  { key: 'app-header', selector: '.app-header' },
  { key: 'app-header__inner', selector: '.app-header__inner' },
  { key: 'home-side-meta__tablet-menu', selector: '.home-side-meta__tablet-menu' },
  { key: 'home-side-meta__search', selector: '.home-side-meta__search' },
  { key: 'home-side-meta__location', selector: '.home-side-meta__location' },
  { key: 'home-side-meta__profile', selector: '.home-side-meta__profile' },
  { key: 'home-search-hero', selector: '.home-search-hero' },
  { key: 'section headers', selector: '.home-section-header, .section-heading' },
  { key: 'doke-ad-card', selector: 'article.doke-ad-card, .doke-ad-card' },
  { key: 'publication-card', selector: '.publication-card' },
  { key: 'video-card / worker card', selector: '.video-card, .doke-worker-card' },
  { key: 'service-card', selector: '.service-card' },
  {
    key: 'rails horizontais',
    selector: '.doke-scroll-rail, .content-rail, [data-rail-track], .home-media-rail, .more-services__cards-rail, .more-services__tabs-rail, .home-catégories__rail, .home-catégories__track, #featured-services-track, #home-publications-track, #short-videos-track',
  },
];

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function round(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Math.round(Number(value) * 100) / 100;
}

function parsePx(value) {
  if (!value || value === 'normal' || value === 'auto') return value || null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? round(parsed) : value;
}


function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function loadHtmlWithInlineCss() {
  const indexPath = path.join(rootDir, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  html = html.replace(/<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi, (tag) => {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return tag;

    const cleanHref = hrefMatch[1].split('?')[0];
    if (/^(https?:)?\/\//i.test(cleanHref)) return `<!-- External stylesheet disabled for deterministic responsive baseline: ${hrefMatch[1]} -->`;

    const cssPath = path.join(rootDir, cleanHref);
    if (!fs.existsSync(cssPath)) {
      return `<!-- Missing stylesheet skipped by baseline generator: ${hrefMatch[1]} -->`;
    }

    const css = fs.readFileSync(cssPath, 'utf8');
    return `<style data-baseline-inline-css="${cleanHref}">\n${css}\n</style>`;
  });

  html = html.replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi, (tag) => {
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    return `<!-- External script disabled for deterministic responsive baseline: ${srcMatch ? srcMatch[1] : 'unknown'} -->`;
  });

  const baseHref = `file://${rootDir.replace(/\\/g, '/')}/`;
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
  } else {
    html = `<base href="${baseHref}">${html}`;
  }

  return html;
}


async function measurePage(page, component) {
  return page.evaluate(({ key, selector }) => {
    const round = (value) => {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
      return Math.round(Number(value) * 100) / 100;
    };

    const parsePx = (value) => {
      if (!value || value === 'normal' || value === 'auto') return value || null;
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? round(parsed) : value;
    };

    const visibleChildren = (element) => Array.from(element.children).filter((child) => {
      const rect = child.getBoundingClientRect();
      const style = window.getComputedStyle(child);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });

    const getMeasuredChildGap = (element) => {
      const children = visibleChildren(element).slice(0, 2);
      if (children.length < 2) return null;
      const a = children[0].getBoundingClientRect();
      const b = children[1].getBoundingClientRect();
      const horizontalGap = b.left >= a.right ? b.left - a.right : null;
      const verticalGap = b.top >= a.bottom ? b.top - a.bottom : null;
      return {
        x: horizontalGap === null ? null : round(horizontalGap),
        y: verticalGap === null ? null : round(verticalGap),
      };
    };

    const getMedia = (element) => {
      const media = element.matches('img, picture, video, canvas, [class*="__media"], [class*="media"]')
        ? element
        : element.querySelector('img, picture, video, canvas, .doke-ad-card__media, .publication-card__media, .video-card__media, .service-card__media, [class*="__media"], [class*="media"]');

      if (!media) return null;
      const rect = media.getBoundingClientRect();
      const style = window.getComputedStyle(media);
      return {
        selectorHint: media.className ? String(media.className).trim() : media.tagName.toLowerCase(),
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        aspectRatio: rect.height ? round(rect.width / rect.height) : null,
        cssAspectRatio: style.aspectRatio,
        objectFit: style.objectFit,
        borderRadius: style.borderRadius,
      };
    };

    const hasClippedText = (element) => Array.from(element.querySelectorAll('h1,h2,h3,h4,p,a,span,button,strong,small')).some((node) => {
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1;
    });

    return Array.from(document.querySelectorAll(selector)).map((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const children = visibleChildren(element);
      const firstChildRect = children[0]?.getBoundingClientRect();
      const secondChildRect = children[1]?.getBoundingClientRect();

      return {
        key,
        selector,
        index,
        tagName: element.tagName.toLowerCase(),
        id: element.id || null,
        className: element.className ? String(element.className).trim() : null,
        textSample: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 90) || null,
        box: {
          x: round(rect.x),
          y: round(rect.y),
          width: round(rect.width),
          height: round(rect.height),
          top: round(rect.top),
          right: round(rect.right),
          bottom: round(rect.bottom),
          left: round(rect.left),
        },
        layout: {
          display: style.display,
          position: style.position,
          flexDirection: style.flexDirection,
          gridTemplateColumns: style.gridTemplateColumns,
          gap: style.gap,
          rowGap: style.rowGap,
          columnGap: style.columnGap,
          measuredChildGap: getMeasuredChildGap(element),
          firstChildBox: firstChildRect ? {
            x: round(firstChildRect.x),
            y: round(firstChildRect.y),
            width: round(firstChildRect.width),
            height: round(firstChildRect.height),
          } : null,
          secondChildBox: secondChildRect ? {
            x: round(secondChildRect.x),
            y: round(secondChildRect.y),
            width: round(secondChildRect.width),
            height: round(secondChildRect.height),
          } : null,
        },
        spacing: {
          padding: {
            top: parsePx(style.paddingTop),
            right: parsePx(style.paddingRight),
            bottom: parsePx(style.paddingBottom),
            left: parsePx(style.paddingLeft),
          },
          margin: {
            top: parsePx(style.marginTop),
            right: parsePx(style.marginRight),
            bottom: parsePx(style.marginBottom),
            left: parsePx(style.marginLeft),
          },
        },
        visual: {
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          backgroundColor: style.backgroundColor,
          border: style.border,
        },
        typography: {
          fontSize: parsePx(style.fontSize),
          lineHeight: parsePx(style.lineHeight),
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
        },
        sizing: {
          minWidth: style.minWidth,
          maxWidth: style.maxWidth,
          minHeight: style.minHeight,
          maxHeight: style.maxHeight,
          aspectRatio: rect.height ? round(rect.width / rect.height) : null,
          cssAspectRatio: style.aspectRatio,
        },
        media: getMedia(element),
        scroll: {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          hasHorizontalOverflowInside: element.scrollWidth > element.clientWidth + 1,
          hasVerticalOverflowInside: element.scrollHeight > element.clientHeight + 1,
        },
        text: {
          hasClippedText: hasClippedText(element),
        },
      };
    });
  }, component);
}

async function main() {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const measurementHtml = loadHtmlWithInlineCss();
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });

  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      page: 'index.html',
      rootDir,
      url: 'inline:index.html',
    },
    purpose: 'Canonical responsive baseline for Doke index.html. Pages may compose sections externally, but shared cards/rails should match these measured contracts.',
    breakpoints,
    components: components.map(({ key, selector }) => ({ key, selector })),
    measurements: {},
  };

  try {
    for (const breakpoint of breakpoints) {
      const context = await browser.newContext({ viewport: { width: breakpoint.width, height: breakpoint.height }, deviceScaleFactor: 1, javaScriptEnabled: false });
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      await page.setContent(measurementHtml, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      await page.waitForTimeout(250);

      const viewportMetrics = await page.evaluate(() => ({
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        hasPageHorizontalOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) > window.innerWidth + 1,
      }));

      result.measurements[breakpoint.name] = {
        viewport: breakpoint,
        page: viewportMetrics,
        components: {},
      };

      for (const component of components) {
        result.measurements[breakpoint.name].components[component.key] = await measurePage(page, component);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Responsive index baseline written to ${path.relative(rootDir, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
