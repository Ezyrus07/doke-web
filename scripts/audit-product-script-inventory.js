#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_PAGES = [
  'mensagens.html',
  'comunidade-interna.html',
  'finalizar-pedido.html',
  'pagamento-profissional.html',
  'adicionar-cartao.html',
  'avaliacao.html'
];

const OUTPUT = 'docs/validation/global-cycle-76-product-script-inventory-report.json';

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function stripQuery(src) {
  return String(src || '').split('?')[0];
}

function classify(src) {
  const clean = stripQuery(src);
  if (clean.includes('/core/')) return 'core';
  if (clean.includes('/ui/')) return 'ui';
  if (clean.includes('/services/')) return 'service';
  if (clean.includes('/controllers/')) return 'controller';
  if (clean.includes('/components/')) return 'component';
  if (clean.includes('/pages/')) return 'page';
  if (clean.includes('/features/')) return 'feature';
  if (clean.includes('/patterns/')) return 'pattern';
  return 'other';
}

function scriptTags(html) {
  const regex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const tags = [];
  let match;
  while ((match = regex.exec(html))) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    const typeMatch = attrs.match(/\btype=["']([^"']+)["']/i);
    tags.push({
      src: srcMatch ? srcMatch[1] : '',
      cleanSrc: srcMatch ? stripQuery(srcMatch[1]) : '',
      type: typeMatch ? typeMatch[1] : '',
      defer: /\bdefer\b/i.test(attrs),
      async: /\basync\b/i.test(attrs),
      inline: !srcMatch,
      inlineLength: body.trim().length,
      category: srcMatch ? classify(srcMatch[1]) : 'inline'
    });
  }
  return tags;
}

function exists(src) {
  return fs.existsSync(path.join(ROOT, stripQuery(src)));
}

function pageReport(page) {
  const html = read(page);
  const tags = scriptTags(html);
  const external = tags.filter((tag) => !tag.inline);
  const categoryCounts = external.reduce((acc, tag) => {
    acc[tag.category] = (acc[tag.category] || 0) + 1;
    return acc;
  }, {});
  const missing = external.filter((tag) => !exists(tag.cleanSrc)).map((tag) => tag.cleanSrc);
  const duplicated = external
    .map((tag) => tag.cleanSrc)
    .filter((src, index, list) => list.indexOf(src) !== index)
    .filter((src, index, list) => list.indexOf(src) === index);
  const legacyQueryMarkers = external
    .filter((tag) => {
      const query = String(tag.src || '').includes('?') ? String(tag.src || '').split('?').slice(1).join('?') : '';
      return /stage|legacy|hotfix|fix|final|novo|ajuste|redesign/i.test(query);
    })
    .map((tag) => tag.src);

  return {
    page,
    externalScriptCount: external.length,
    inlineScriptCount: tags.filter((tag) => tag.inline).length,
    categoryCounts,
    scripts: external.map((tag, index) => ({
      order: index + 1,
      src: tag.src,
      cleanSrc: tag.cleanSrc,
      category: tag.category,
      loading: tag.type === 'module' ? 'module' : (tag.defer ? 'defer' : (tag.async ? 'async' : 'blocking')),
      exists: exists(tag.cleanSrc)
    })),
    missing,
    duplicated,
    legacyQueryMarkers,
    candidatesForReview: external
      .filter((tag) => ['service', 'component', 'ui', 'page'].includes(tag.category))
      .map((tag) => ({ src: tag.cleanSrc, category: tag.category, reason: 'loaded-on-page-review-before-removal' }))
  };
}

const pages = TARGET_PAGES.map(pageReport);
const allScripts = pages.flatMap((page) => page.scripts.map((script) => script.cleanSrc));
const uniqueScripts = Array.from(new Set(allScripts)).sort();
const sharedScripts = uniqueScripts
  .map((src) => ({ src, pages: pages.filter((page) => page.scripts.some((script) => script.cleanSrc === src)).map((page) => page.page) }))
  .filter((entry) => entry.pages.length > 1);

const report = {
  cycle: 76,
  name: 'product-script-inventory',
  generatedAt: new Date().toISOString(),
  targetPages: TARGET_PAGES,
  summary: {
    pageCount: pages.length,
    totalExternalScriptReferences: allScripts.length,
    uniqueExternalScripts: uniqueScripts.length,
    sharedExternalScripts: sharedScripts.length,
    totalMissingScripts: pages.reduce((sum, page) => sum + page.missing.length, 0),
    totalDuplicateScriptsWithinPage: pages.reduce((sum, page) => sum + page.duplicated.length, 0),
    legacyQueryMarkerCount: pages.reduce((sum, page) => sum + page.legacyQueryMarkers.length, 0)
  },
  pages,
  sharedScripts
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), JSON.stringify(report, null, 2) + '\n');

console.log('[cycle-76] Product script inventory generated.');
console.log(`[cycle-76] Target pages: ${pages.length}`);
console.log(`[cycle-76] Unique external scripts: ${uniqueScripts.length}`);
console.log(`[cycle-76] Missing scripts: ${report.summary.totalMissingScripts}`);
console.log(`[cycle-76] Output: ${OUTPUT}`);

if (report.summary.totalMissingScripts > 0 || report.summary.totalDuplicateScriptsWithinPage > 0) {
  process.exitCode = 1;
}
