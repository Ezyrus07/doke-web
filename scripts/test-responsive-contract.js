#!/usr/bin/env node
/**
 * Playwright responsive regression contract for Doke.
 *
 * The test uses index.html as the live canonical baseline at each breakpoint and fails when
 * equivalent pages drift beyond the tolerated contract. The persisted JSON baseline is still
 * required as the governance artifact created by the baseline workflow.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const rootDir = path.resolve(__dirname, '..');
const baselineFile = path.join(rootDir, 'reports/responsive-index-baseline.json');
const reportsDir = path.join(rootDir, 'reports');
const outJson = path.join(reportsDir, 'responsive-contract-test-report.json');
const outCsv = path.join(reportsDir, 'responsive-contract-test-report.csv');
const outMd = path.join(reportsDir, 'responsive-contract-test-report.md');

const TOLERANCE_PX = 2;
const TOLERANCE_RATIO = 0.03;
const MAX_ELEMENTS_PER_COMPONENT = 6;

const breakpoints = [
  { name: '390x844', width: 390, height: 844 },
  { name: '608x926', width: 608, height: 926 },
  { name: '810x1080', width: 810, height: 1080 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
];

const targetPages = [
  'detalhe-anuncio.html',
  'perfil.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'notificacoes.html',
  'comunidade.html',
  'carteira.html',
];

const bodyOverflowPages = ['index.html', ...targetPages];

const contracts = [
  {
    key: 'app-header',
    baselineSelector: '.app-header',
    pageSelector: '.app-header',
    pages: targetPages,
    metrics: ['box.x', 'box.y', 'box.width', 'box.height'],
    requirement: 'header de páginas equivalentes não pode divergir mais que 2px do index',
  },
  {
    key: 'app-header__inner',
    baselineSelector: '.app-header__inner',
    pageSelector: '.app-header__inner',
    pages: targetPages,
    metrics: ['box.x', 'box.y', 'box.width', 'box.height'],
    requirement: 'rail interno do header deve seguir o index',
  },
  {
    key: 'search/back equivalent button',
    baselineSelector: '.home-side-meta__search',
    pageSelector: '.home-side-meta__search, .app-header__back, .header-back, .back-button, [aria-label*="Voltar"], [aria-label*="voltar"]',
    pages: targetPages,
    metrics: ['box.x', 'box.y', 'box.width', 'box.height', 'visual.borderRadius', 'spacing.padding.left', 'spacing.padding.right'],
    requirement: 'botão de busca/voltar equivalente deve manter tamanho, posição e forma',
  },
  {
    key: 'home-side-meta__location',
    baselineSelector: '.home-side-meta__location',
    pageSelector: '.home-side-meta__location',
    pages: targetPages,
    metrics: ['box.x', 'box.y', 'box.width', 'box.height', 'visual.borderRadius', 'spacing.padding.left', 'spacing.padding.right'],
    requirement: 'location pill não pode mudar forma entre páginas equivalentes',
  },
  {
    key: 'home-side-meta__profile',
    baselineSelector: '.home-side-meta__profile',
    pageSelector: '.home-side-meta__profile',
    pages: targetPages,
    metrics: ['box.x', 'box.y', 'box.width', 'box.height', 'visual.borderRadius', 'spacing.padding.left', 'spacing.padding.right'],
    requirement: 'profile pill não pode mudar forma entre páginas equivalentes',
  },
  {
    key: 'avatar',
    baselineSelector: '.home-side-meta__profile img, .home-side-meta__profile .doke-avatar, .home-side-meta__profile .avatar',
    pageSelector: '.home-side-meta__profile img, .home-side-meta__profile .doke-avatar, .home-side-meta__profile .avatar',
    pages: targetPages,
    metrics: ['box.width', 'box.height', 'visual.borderRadius'],
    requirement: 'avatar do header deve manter tamanho e forma do index',
  },
  {
    key: 'doke-ad-card',
    baselineSelector: 'article.doke-ad-card, .doke-ad-card',
    pageSelector: 'article.doke-ad-card, .doke-ad-card',
    pages: targetPages,
    metrics: ['box.width', 'box.height', 'media.height'],
    requirement: 'cards compartilhados devem manter width/height/media height do index',
  },
  {
    key: 'publication-card',
    baselineSelector: '.publication-card',
    pageSelector: '.publication-card',
    pages: ['detalhe-anuncio.html', 'perfil.html'],
    metrics: ['box.width', 'box.height', 'media.height'],
    requirement: 'publication-card não pode mudar anatomia entre index, detalhe-anuncio e perfil',
  },
  {
    key: 'video-card / worker-card',
    baselineSelector: '.video-card, .video-card[data-worker-trigger], .doke-worker-card, .worker-card, [class*="worker-card"]',
    pageSelector: '.video-card, .video-card[data-worker-trigger], .doke-worker-card, .worker-card, [class*="worker-card"]',
    pages: ['detalhe-anuncio.html', 'perfil.html'],
    metrics: ['box.width', 'box.height', 'media.height', 'media.aspectRatio', 'sizing.aspectRatio'],
    requirement: 'worker/video-card não pode mudar proporção entre index, detalhe-anuncio e perfil',
  },
  {
    key: 'service-card',
    baselineSelector: 'article.doke-ad-card, .doke-ad-card',
    pageSelector: '.service-card, [class*="service-card"]',
    pages: targetPages,
    metrics: ['box.width', 'box.height', 'media.height'],
    requirement: 'service-card deve herdar anatomia visual de marketplace card do index',
  },
  {
    key: 'review-card',
    baselineSelector: '.publication-card',
    pageSelector: '.doke-review-card, article.review-card, article.rating-card, article.testimonial-card, article.avaliacao-card',
    pages: targetPages,
    metrics: ['box.width', 'box.height'],
    requirement: 'review cards compartilhados não podem sair da anatomia de card compartilhado',
  },
];

function round(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Math.round(Number(value) * 100) / 100;
}

function parsePx(value) {
  if (!value || value === 'normal' || value === 'auto') return value || null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? round(n) : value;
}

function get(object, dottedPath) {
  return dottedPath.split('.').reduce((acc, key) => (acc == null ? null : acc[key]), object);
}

function normalize(value) {
  if (value === undefined) return null;
  if (typeof value === 'number') return round(value);
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ');
  return value;
}

function numeric(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function diff(expected, actual, metric) {
  const exp = normalize(expected);
  const act = normalize(actual);
  if (exp == null && act == null) return null;
  const a = numeric(exp);
  const b = numeric(act);
  if (metric.includes('aspectRatio')) {
    if (a == null || b == null) return exp === act ? null : { differs: true, difference: null };
    const delta = round(b - a);
    return Math.abs(delta) > TOLERANCE_RATIO ? { differs: true, difference: delta } : null;
  }
  if (a != null && b != null) {
    const delta = round(b - a);
    return Math.abs(delta) > TOLERANCE_PX ? { differs: true, difference: delta } : null;
  }
  return exp !== act ? { differs: true, difference: null } : null;
}

function csv(value) {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function loadHtml(pageFile) {
  let html = fs.readFileSync(path.join(rootDir, pageFile), 'utf8');
  html = html.replace(/<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi, (tag) => {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return tag;
    const href = hrefMatch[1].split('?')[0];
    if (/^(https?:)?\/\//i.test(href)) return `<!-- external stylesheet skipped: ${hrefMatch[1]} -->`;
    const cssPath = path.join(rootDir, href);
    if (!fs.existsSync(cssPath)) return `<!-- missing stylesheet skipped: ${hrefMatch[1]} -->`;
    return `<style data-source-css="${href}">\n${fs.readFileSync(cssPath, 'utf8')}\n</style>`;
  });
  html = html.replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi, '<!-- script disabled for responsive contract test -->');
  const base = `file://${rootDir.replace(/\\/g, '/')}/`;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}">`)
    : `<base href="${base}">${html}`;
}

async function setLocalPage(page, pageFile) {
  await page.setContent(loadHtml(pageFile), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(120);
}

async function measureSelector(page, key, selector) {
  return page.evaluate(({ key, selector }) => {
    const round = (value) => (value == null || Number.isNaN(Number(value)) ? null : Math.round(Number(value) * 100) / 100);
    const parsePx = (value) => {
      if (!value || value === 'normal' || value === 'auto') return value || null;
      const n = Number.parseFloat(value);
      return Number.isFinite(n) ? round(n) : value;
    };
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0';
    };
    const mediaOf = (element) => {
      const media = element.matches('img,picture,video,canvas,[class*="__media"],[class*="media"]')
        ? element
        : element.querySelector('img,picture,video,canvas,.doke-ad-card__media,.publication-card__media,.video-card__media,.service-card__media,[class*="__media"],[class*="media"]');
      if (!media || !isVisible(media)) return null;
      const rect = media.getBoundingClientRect();
      const styles = getComputedStyle(media);
      return {
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        aspectRatio: rect.height ? round(rect.width / rect.height) : null,
        borderRadius: styles.borderRadius,
        objectFit: styles.objectFit,
      };
    };
    return Array.from(document.querySelectorAll(selector))
      .filter(isVisible)
      .slice(0, 12)
      .map((element, index) => {
        const rect = element.getBoundingClientRect();
        const styles = getComputedStyle(element);
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
            left: round(rect.left),
            right: round(rect.right),
            top: round(rect.top),
            bottom: round(rect.bottom),
          },
          spacing: {
            padding: {
              top: parsePx(styles.paddingTop),
              right: parsePx(styles.paddingRight),
              bottom: parsePx(styles.paddingBottom),
              left: parsePx(styles.paddingLeft),
            },
          },
          visual: {
            borderRadius: styles.borderRadius,
            boxShadow: styles.boxShadow,
          },
          typography: {
            fontSize: parsePx(styles.fontSize),
            lineHeight: parsePx(styles.lineHeight),
          },
          sizing: {
            aspectRatio: rect.height ? round(rect.width / rect.height) : null,
          },
          media: mediaOf(element),
          scroll: {
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            hasHorizontalOverflowInside: element.scrollWidth > element.clientWidth + 1,
          },
        };
      });
  }, { key, selector });
}

async function pageOverflow(page) {
  return page.evaluate(() => {
    const maxScroll = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    return {
      viewportWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      maxScrollWidth: maxScroll,
      hasOverflow: maxScroll > window.innerWidth + 1,
      difference: maxScroll - window.innerWidth,
    };
  });
}

async function sectionRailFailures(page, pageFile, breakpointName) {
  return page.evaluate(({ pageFile, breakpointName, tolerance }) => {
    const round = (value) => (value == null || Number.isNaN(Number(value)) ? null : Math.round(Number(value) * 100) / 100);
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden';
    };
    const headers = Array.from(document.querySelectorAll('.home-section-header, .section-heading, .section-header, [class*="section-header"], [class*="section-heading"]')).filter(isVisible);
    const failures = [];
    for (const header of headers) {
      const headerRect = header.getBoundingClientRect();
      const rail = header.closest('.shell-home__workspace, .page__content-inner, .ad-detail-shell, .profile-shell-content, .section-container, .content-section, main') || header.parentElement;
      if (!rail || !isVisible(rail)) continue;
      const railRect = rail.getBoundingClientRect();
      if (headerRect.left < railRect.left - tolerance || headerRect.right > railRect.right + tolerance) {
        failures.push({
          page: pageFile,
          breakpoint: breakpointName,
          component: 'section header',
          selector: header.className ? `.${String(header.className).trim().split(/\s+/).join('.')}` : header.tagName.toLowerCase(),
          property: 'fora do rail',
          expected: `left>=${round(railRect.left)}; right<=${round(railRect.right)}`,
          actual: `left=${round(headerRect.left)}; right=${round(headerRect.right)}`,
          difference: round(Math.max(railRect.left - headerRect.left, headerRect.right - railRect.right)),
          requirement: 'section header não pode sair do rail/container da seção',
        });
      }
    }
    return failures;
  }, { pageFile, breakpointName, tolerance: TOLERANCE_PX });
}

function compareElements({ contract, baselineElements, pageFile, breakpointName, actualElements, failures }) {
  if (!baselineElements.length || !actualElements.length) return;
  const comparableActual = actualElements.slice(0, MAX_ELEMENTS_PER_COMPONENT);
  comparableActual.forEach((actual, index) => {
    const expected = baselineElements[index] || baselineElements[0];
    contract.metrics.forEach((metric) => {
      const result = diff(get(expected, metric), get(actual, metric), metric);
      if (!result) return;
      failures.push({
        page: pageFile,
        breakpoint: breakpointName,
        component: contract.key,
        selector: actual.className ? `.${actual.className.split(/\s+/).join('.')}` : contract.pageSelector,
        property: metric,
        expected: normalize(get(expected, metric)),
        actual: normalize(get(actual, metric)),
        difference: result.difference,
        requirement: contract.requirement,
      });
    });
  });
}

function writeReports(report) {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2) + '\n');
  const rows = report.failures.map((failure) => [
    'FAIL', failure.page, failure.breakpoint, failure.component, failure.selector,
    failure.property, failure.expected, failure.actual, failure.difference, failure.requirement,
  ]);
  fs.writeFileSync(outCsv, [
    ['status', 'página', 'breakpoint', 'componente', 'seletor', 'propriedade', 'esperado', 'atual', 'diferença', 'regra'],
    ...rows,
  ].map((row) => row.map(csv).join(',')).join('\n') + '\n');
  const byPage = Object.entries(report.summary.failuresByPage).sort((a, b) => b[1] - a[1]);
  const byComponent = Object.entries(report.summary.failuresByComponent).sort((a, b) => b[1] - a[1]);
  const md = [
    '# Responsive contract regression test',
    '',
    `Gerado em: ${report.generatedAt}`,
    `Status: **${report.status}**`,
    `Baseline visual: \`index.html\` medido em runtime por Playwright`,
    `Baseline governança: \`${report.persistedBaseline}\``,
    `Tolerância: ${TOLERANCE_PX}px para medidas lineares; ${TOLERANCE_RATIO} para aspect-ratio.`,
    '',
    '## Resumo',
    '',
    `- Páginas avaliadas contra baseline: ${report.summary.pagesCompared}`,
    `- Breakpoints: ${report.breakpoints.join(', ')}`,
    `- Checks executados: ${report.summary.checks}`,
    `- Falhas: ${report.summary.failures}`,
    `- Skips informativos: ${report.summary.skips}`,
    '',
    '## Falhas por página',
    '',
    ...(byPage.length ? byPage.map(([page, count]) => `- ${page}: ${count}`) : ['- Nenhuma falha.']),
    '',
    '## Falhas por componente',
    '',
    ...(byComponent.length ? byComponent.map(([component, count]) => `- ${component}: ${count}`) : ['- Nenhuma falha.']),
    '',
    '## Primeiras falhas',
    '',
    '| página | breakpoint | componente | seletor | propriedade | esperado | atual | diferença | regra |',
    '|---|---:|---|---|---|---:|---:|---:|---|',
    ...report.failures.slice(0, 350).map((failure) => `| ${failure.page} | ${failure.breakpoint} | ${failure.component} | ${String(failure.selector || '').replace(/\|/g, '\\|')} | ${failure.property} | ${String(failure.expected ?? '').replace(/\|/g, '\\|')} | ${String(failure.actual ?? '').replace(/\|/g, '\\|')} | ${failure.difference ?? ''} | ${String(failure.requirement || '').replace(/\|/g, '\\|')} |`),
  ];
  fs.writeFileSync(outMd, md.join('\n') + '\n');
}

(async () => {
  if (!fs.existsSync(baselineFile)) {
    throw new Error('Baseline de governança ausente: reports/responsive-index-baseline.json. Rode npm run baseline:responsive-index antes deste teste.');
  }
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-gl=swiftshader'],
  });
  const failures = [];
  const skips = [];
  let checks = 0;
  const runtimeBaseline = {};

  try {
    for (const breakpoint of breakpoints) {
      const context = await browser.newContext({ viewport: { width: breakpoint.width, height: breakpoint.height }, deviceScaleFactor: 1, javaScriptEnabled: false });
      const page = await context.newPage();
      await setLocalPage(page, 'index.html');
      runtimeBaseline[breakpoint.name] = {};
      for (const contract of contracts) {
        runtimeBaseline[breakpoint.name][contract.key] = await measureSelector(page, contract.key, contract.baselineSelector);
      }
      await context.close();
    }

    for (const pageFile of bodyOverflowPages) {
      if (!fs.existsSync(path.join(rootDir, pageFile))) {
        skips.push({ page: pageFile, reason: 'arquivo HTML não encontrado' });
        continue;
      }
      for (const breakpoint of breakpoints) {
        const context = await browser.newContext({ viewport: { width: breakpoint.width, height: breakpoint.height }, deviceScaleFactor: 1, javaScriptEnabled: false });
        const page = await context.newPage();
        await setLocalPage(page, pageFile);

        const overflow = await pageOverflow(page);
        checks += 1;
        if (overflow.hasOverflow) {
          failures.push({
            page: pageFile,
            breakpoint: breakpoint.name,
            component: 'body/page',
            selector: 'body, html',
            property: 'horizontal overflow',
            expected: overflow.viewportWidth,
            actual: overflow.maxScrollWidth,
            difference: round(overflow.difference),
            requirement: 'body não pode ter overflow horizontal',
          });
        }

        const railFailures = await sectionRailFailures(page, pageFile, breakpoint.name);
        checks += 1;
        failures.push(...railFailures);

        if (pageFile !== 'index.html') {
          for (const contract of contracts) {
            if (!contract.pages.includes(pageFile)) continue;
            const baselineElements = runtimeBaseline[breakpoint.name][contract.key] || [];
            const actualElements = await measureSelector(page, contract.key, contract.pageSelector);
            if (!baselineElements.length || !actualElements.length) {
              skips.push({
                page: pageFile,
                breakpoint: breakpoint.name,
                component: contract.key,
                reason: !baselineElements.length ? 'baseline runtime ausente no index' : 'componente ausente nesta página',
              });
              continue;
            }
            checks += Math.min(actualElements.length, MAX_ELEMENTS_PER_COMPONENT) * contract.metrics.length;
            compareElements({ contract, baselineElements, pageFile, breakpointName: breakpoint.name, actualElements, failures });
          }
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const failuresByPage = {};
  const failuresByComponent = {};
  for (const failure of failures) {
    failuresByPage[failure.page] = (failuresByPage[failure.page] || 0) + 1;
    failuresByComponent[failure.component] = (failuresByComponent[failure.component] || 0) + 1;
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: failures.length ? 'FAIL' : 'PASS',
    persistedBaseline: path.relative(rootDir, baselineFile),
    runtimeBaseline: 'index.html',
    tolerance: { px: TOLERANCE_PX, aspectRatio: TOLERANCE_RATIO },
    pagesCompared: targetPages,
    bodyOverflowPages,
    breakpoints: breakpoints.map((breakpoint) => breakpoint.name),
    summary: {
      pagesCompared: targetPages.length,
      checks,
      failures: failures.length,
      skips: skips.length,
      failuresByPage,
      failuresByComponent,
    },
    failures,
    skips,
  };
  writeReports(report);
  console.log(`Responsive contract test: ${report.status}`);
  console.log(`Checks: ${checks}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Skips: ${skips.length}`);
  console.log(`Report: ${path.relative(rootDir, outMd)}`);
  if (failures.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
