#!/usr/bin/env node
/**
 * Global Cycle 75 — Product script loading audit.
 *
 * Purpose:
 * - Validate the audited product pages no longer load external scripts without defer/module.
 * - Preserve legacy execution order by only requiring loading attributes, not reordering imports.
 * - Keep intentional inline shell guards visible instead of normalizing them as product scripts.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'docs/validation/global-cycle-75-product-script-loading-report.json');
const TARGET_PAGES = [
  'mensagens.html',
  'comunidade.html',
  'pagamento-profissional.html',
  'avaliacao.html',
  ];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g)) {
    const key = match[1];
    if (key.toLowerCase() === 'script') continue;
    const raw = match[2];
    out[key.toLowerCase()] = raw ? raw.replace(/^['"]|['"]$/g, '') : true;
  }
  return out;
}

function stripQuery(value) {
  return String(value || '').split('?')[0].split('#')[0];
}

function isExternalScriptNormalized(tag) {
  const a = attrs(tag);
  return Boolean(a.defer || String(a.type || '').toLowerCase() === 'module');
}

function classifyInlineScript(tag) {
  const body = tag.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
  if (/^document\.documentElement\.classList\.add\(["']doke-mobile-shell-pending["']\);?$/.test(body)) {
    return 'intentional-mobile-shell-pending-guard';
  }
  return 'inline-product-script';
}

function auditPage(page) {
  const html = read(page);
  const scriptBlocks = Array.from(html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi), match => match[0]);
  const externalScripts = scriptBlocks
    .map((tag, index) => ({ index: index + 1, tag, attrs: attrs(tag) }))
    .filter(item => item.attrs.src);

  const inlineScripts = scriptBlocks
    .map((tag, index) => ({ index: index + 1, tag }))
    .filter(item => !attrs(item.tag).src)
    .map(item => ({ index: item.index, classification: classifyInlineScript(item.tag) }));

  const nonNormalizedExternalScripts = externalScripts
    .filter(item => !isExternalScriptNormalized(item.tag))
    .map(item => ({
      index: item.index,
      src: item.attrs.src,
      asset: stripQuery(item.attrs.src),
    }));

  const normalizedExternalScripts = externalScripts.map(item => ({
    index: item.index,
    src: item.attrs.src,
    loading: attrs(item.tag).defer ? 'defer' : String(attrs(item.tag).type || '').toLowerCase() === 'module' ? 'module' : 'blocking',
  }));

  const risks = [];
  if (nonNormalizedExternalScripts.length) risks.push('external-script-without-defer-or-module');
  if (inlineScripts.some(item => item.classification === 'inline-product-script')) risks.push('inline-product-script-block');

  return {
    page,
    metrics: {
      externalScriptCount: externalScripts.length,
      nonNormalizedExternalScriptCount: nonNormalizedExternalScripts.length,
      inlineScriptCount: inlineScripts.length,
      intentionalInlineShellGuardCount: inlineScripts.filter(item => item.classification === 'intentional-mobile-shell-pending-guard').length,
      inlineProductScriptCount: inlineScripts.filter(item => item.classification === 'inline-product-script').length,
    },
    normalizedExternalScripts,
    nonNormalizedExternalScripts,
    inlineScripts,
    risks,
  };
}

function main() {
  const missing = TARGET_PAGES.filter(file => !fs.existsSync(path.join(ROOT, file)));
  if (missing.length) {
    console.error('[cycle-75] Missing target pages:', missing.join(', '));
    process.exit(1);
  }

  const pages = TARGET_PAGES.map(auditPage);
  const totals = pages.reduce((acc, page) => {
    for (const [key, value] of Object.entries(page.metrics)) {
      acc[key] = (acc[key] || 0) + value;
    }
    return acc;
  }, {});

  const report = {
    cycle: 'Global Cycle 75',
    name: 'Product script loading normalization audit',
    generatedAt: new Date().toISOString(),
    scope: {
      type: 'product JS loading audit',
      visualProductFilesChanged: false,
      cssFilesChanged: false,
      targetPages: TARGET_PAGES,
      policy: 'All external scripts in target pages must use defer or type="module". Intentional inline mobile-shell guards remain allowed and visible.',
    },
    summary: {
      targetPageCount: pages.length,
      totals,
      pagesWithNonNormalizedExternalScripts: pages.filter(page => page.metrics.nonNormalizedExternalScriptCount > 0).map(page => page.page),
      pagesWithInlineProductScripts: pages.filter(page => page.metrics.inlineProductScriptCount > 0).map(page => page.page),
    },
    pages,
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log('[cycle-75] Product script loading audit generated.');
  console.log(`[cycle-75] Target pages: ${pages.length}`);
  console.log(`[cycle-75] External scripts: ${totals.externalScriptCount || 0}`);
  console.log(`[cycle-75] External scripts without defer/module: ${totals.nonNormalizedExternalScriptCount || 0}`);
  console.log(`[cycle-75] Output: ${path.relative(ROOT, OUTPUT)}`);

  if ((totals.nonNormalizedExternalScriptCount || 0) > 0 || (totals.inlineProductScriptCount || 0) > 0) {
    console.error('[cycle-75] Script loading audit failed.');
    process.exit(1);
  }
}

main();
