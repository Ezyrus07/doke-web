#!/usr/bin/env node
/**
 * Global Cycle 70 — Product page readiness audit.
 *
 * Purpose:
 * - Inspect real product pages that are still pending data-ready/controller work.
 * - Map CSS/JS imports, inline-style debt, data-* hooks, forms, lists and script loading.
 * - Generate a stable JSON report for the next implementation cycle without changing UI.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'docs/validation/global-cycle-70-product-page-readiness-report.json');
const TARGET_PAGES = [
  'mensagens.html',
  'comunidade-interna.html',
  'finalizar-pedido.html',
  'pagamento.html',
  'avaliacao.html',
  'adicionar-cartao.html',
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function matchAll(source, regex, group = 1) {
  return Array.from(source.matchAll(regex), match => match[group]).filter(Boolean);
}

function count(source, regex) {
  return Array.from(source.matchAll(regex)).length;
}

function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g)) {
    const key = match[1];
    if (key === tag.split(/\s+/)[0].replace(/^</, '')) continue;
    const raw = match[2];
    out[key] = raw ? raw.replace(/^['"]|['"]$/g, '') : true;
  }
  return out;
}

function basenameNoQuery(value) {
  return String(value || '').split('?')[0].split('#')[0];
}

function resolveAsset(pageFile, assetPath) {
  if (!assetPath || /^(https?:)?\/\//.test(assetPath)) return null;
  const base = path.dirname(pageFile);
  return path.normalize(path.join(base, assetPath)).replace(/\\/g, '/').replace(/^\.\//, '');
}

function inferPageRole(pageFile) {
  const map = {
    'mensagens.html': 'communication-inbox',
    'comunidade-interna.html': 'community-room',
    'finalizar-pedido.html': 'checkout-finalization',
    'pagamento.html': 'payment-flow',
    'avaliacao.html': 'review-flow',
    'adicionar-cartao.html': 'payment-method-form',
  };
  return map[pageFile] || 'product-page';
}

function classifyHookNeed(pageFile, html) {
  const lower = html.toLowerCase();
  const needs = [];
  const rules = [
    ['lists', /<(ul|ol)\b|class=["'][^"']*(list|grid|cards|messages|feed|items)[^"']*["']/i],
    ['forms', /<form\b|<(input|select|textarea)\b/i],
    ['actions', /<button\b|data-action=|href=["']#|onclick=/i],
    ['modals-overlays', /modal|overlay|dialog|drawer/i],
    ['tabs-filters', /tab|filter|filtro|categoria|segment/i],
    ['dynamic-empty-loading-error-states', /empty|loading|skeleton|erro|error|vazio|sem\s+/i],
  ];
  for (const [name, regex] of rules) {
    if (regex.test(lower)) needs.push(name);
  }
  if (/pagamento|cart[aã]o|checkout|pedido|avaliacao|avaliação/.test(pageFile)) {
    needs.push('transactional-state-contract');
  }
  return unique(needs);
}

function auditPage(pageFile) {
  const html = read(pageFile);
  const linkTags = matchAll(html, /<link\b[^>]*>/gi, 0);
  const scriptTags = matchAll(html, /<script\b[^>]*>[\s\S]*?<\/script>/gi, 0);
  const cssImports = linkTags
    .map(tag => attrs(tag))
    .filter(a => String(a.rel || '').toLowerCase() === 'stylesheet')
    .map(a => a.href)
    .filter(Boolean);
  const jsImports = scriptTags
    .map(tag => attrs(tag))
    .map(a => a.src)
    .filter(Boolean);
  const inlineScripts = scriptTags.filter(tag => !attrs(tag).src);
  const inlineScriptBlocks = inlineScripts.length;
  const intentionalInlineShellGuards = inlineScripts.filter(tag => /document\.documentElement\.classList\.add\(["']doke-mobile-shell-pending["']\)/.test(tag)).length;
  const inlineProductScriptBlocks = inlineScriptBlocks - intentionalInlineShellGuards;
  const inlineStyleAttributes = count(html, /\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi);
  const dataHooks = unique(matchAll(html, /\s(data-[a-zA-Z0-9_-]+)(?:=|\s|>)/g, 1));
  const ids = unique(matchAll(html, /\sid\s*=\s*["']([^"']+)["']/gi, 1));
  const classes = matchAll(html, /\sclass\s*=\s*["']([^"']+)["']/gi, 1)
    .flatMap(value => value.split(/\s+/).filter(Boolean));
  const duplicateCss = cssImports.filter((item, index) => cssImports.indexOf(item) !== index);
  const duplicateJs = jsImports.filter((item, index) => jsImports.indexOf(item) !== index);
  const missingCssFiles = cssImports
    .map(asset => ({ asset, resolved: resolveAsset(pageFile, basenameNoQuery(asset)) }))
    .filter(item => item.resolved && !fs.existsSync(path.join(ROOT, item.resolved)));
  const missingJsFiles = jsImports
    .map(asset => ({ asset, resolved: resolveAsset(pageFile, basenameNoQuery(asset)) }))
    .filter(item => item.resolved && !fs.existsSync(path.join(ROOT, item.resolved)));
  const pageSpecificCss = cssImports.filter(asset => /assets\/css\/pages\//.test(asset));
  const pageSpecificJs = jsImports.filter(asset => /assets\/js\/pages\//.test(asset));
  const controllers = jsImports.filter(asset => /(controller|controllers|data|repository|render)/i.test(asset));
  const globalScripts = jsImports.filter(asset => /assets\/js\/(core|shared|components)\//.test(asset));
  const hasModuleScripts = scriptTags.some(tag => /\stype\s*=\s*["']module["']/i.test(tag));
  const hasDeferScripts = scriptTags
    .filter(tag => attrs(tag).src)
    .every(tag => /\sdefer(\s|>|=)|\stype\s*=\s*["']module["']/i.test(tag));
  const forms = count(html, /<form\b/gi);
  const inputs = count(html, /<(input|select|textarea)\b/gi);
  const buttons = count(html, /<button\b/gi);
  const lists = count(html, /<(ul|ol)\b/gi);
  const images = count(html, /<img\b/gi);
  const imagesWithoutAlt = count(html, /<img\b(?![^>]*\salt\s*=)[^>]*>/gi);
  const onclickHandlers = count(html, /\son[a-z]+\s*=/gi);

  const risks = [];
  if (inlineStyleAttributes > 0) risks.push('inline-style-debt');
  if (inlineProductScriptBlocks > 0) risks.push('inline-product-script-blocks');
  if (onclickHandlers > 0) risks.push('inline-event-handlers');
  if (!hasDeferScripts && jsImports.length > 0) risks.push('blocking-or-non-deferred-scripts');
  if (duplicateCss.length > 0) risks.push('duplicate-css-imports');
  if (duplicateJs.length > 0) risks.push('duplicate-js-imports');
  if (missingCssFiles.length > 0) risks.push('missing-css-imports');
  if (missingJsFiles.length > 0) risks.push('missing-js-imports');
  if (imagesWithoutAlt > 0) risks.push('image-alt-debt');
  if (dataHooks.length < 3) risks.push('weak-data-hook-surface');
  if (controllers.length === 0) risks.push('no-explicit-data-controller');

  return {
    page: pageFile,
    role: inferPageRole(pageFile),
    metrics: {
      cssImportCount: cssImports.length,
      jsImportCount: jsImports.length,
      inlineScriptBlocks,
      intentionalInlineShellGuards,
      inlineProductScriptBlocks,
      inlineStyleAttributes,
      dataHookCount: dataHooks.length,
      idCount: ids.length,
      classTokenCount: classes.length,
      formCount: forms,
      inputControlCount: inputs,
      buttonCount: buttons,
      listCount: lists,
      imageCount: images,
      imagesWithoutAlt,
      inlineEventHandlerCount: onclickHandlers,
    },
    imports: {
      css: cssImports,
      js: jsImports,
      pageSpecificCss,
      pageSpecificJs,
      globalScripts,
      controllers,
      duplicateCss: unique(duplicateCss),
      duplicateJs: unique(duplicateJs),
      missingCssFiles,
      missingJsFiles,
      hasModuleScripts,
      allExternalScriptsDeferredOrModule: hasDeferScripts,
    },
    dataReady: {
      existingHooks: dataHooks,
      inferredHookNeeds: classifyHookNeed(pageFile, html),
      recommendedNextStep: controllers.length === 0
        ? 'Map and introduce a page-specific controller contract before wiring real backend data.'
        : 'Review existing controller/data imports and formalize render/state boundaries.',
    },
    risks,
  };
}

function summarize(pages) {
  const totals = pages.reduce((acc, page) => {
    for (const [key, value] of Object.entries(page.metrics)) {
      acc[key] = (acc[key] || 0) + value;
    }
    return acc;
  }, {});
  const riskCounts = {};
  for (const page of pages) {
    for (const risk of page.risks) riskCounts[risk] = (riskCounts[risk] || 0) + 1;
  }
  return {
    targetPageCount: pages.length,
    totals,
    riskCounts,
    priorityOrder: pages
      .map(page => ({ page: page.page, riskScore: page.risks.length, risks: page.risks }))
      .sort((a, b) => b.riskScore - a.riskScore || a.page.localeCompare(b.page)),
  };
}

function main() {
  const missingPages = TARGET_PAGES.filter(file => !fs.existsSync(path.join(ROOT, file)));
  if (missingPages.length) {
    console.error('[cycle-70] Missing target pages:', missingPages.join(', '));
    process.exitCode = 1;
    return;
  }

  const pages = TARGET_PAGES.map(auditPage);
  const report = {
    cycle: 'Global Cycle 70',
    name: 'Product page readiness audit',
    generatedAt: new Date().toISOString(),
    scope: {
      type: 'read-only product audit',
      visualProductFilesChanged: false,
      targetPages: TARGET_PAGES,
    },
    summary: summarize(pages),
    pages,
    nextRecommendedCycle: {
      cycle: 'Global Cycle 71',
      name: 'Implement first product data-ready hardening pass',
      recommendation: 'Start with the highest-risk page from priorityOrder and add minimal hooks/controller boundaries without visual redesign.',
    },
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log('[cycle-70] Product page readiness audit generated.');
  console.log(`[cycle-70] Target pages: ${pages.length}`);
  console.log(`[cycle-70] Output: ${path.relative(ROOT, OUTPUT)}`);
  console.log('[cycle-70] Priority order:');
  for (const item of report.summary.priorityOrder) {
    console.log(`- ${item.page}: ${item.riskScore} risks (${item.risks.join(', ') || 'none'})`);
  }
}

main();
