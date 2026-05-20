#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_PAGES = [
  'mensagens.html',
  'comunidade.html',
  'pagamento-profissional.html',
  'avaliacao.html'
];
const OUTPUT = 'docs/validation/global-cycle-77-product-script-version-hygiene-report.json';
const LEGACY_MARKER = /stage|legacy|hotfix|fix|final|novo|ajuste|redesign/i;

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function scriptSrcs(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi), match => match[1]);
}

function queryOf(src) {
  const index = String(src || '').indexOf('?');
  return index === -1 ? '' : String(src).slice(index + 1);
}

function cleanSrc(src) {
  return String(src || '').split('?')[0].split('#')[0];
}

const pages = TARGET_PAGES.map((page) => {
  const html = read(page);
  const scripts = scriptSrcs(html);
  const legacyQueryMarkers = scripts
    .filter((src) => LEGACY_MARKER.test(queryOf(src)))
    .map((src) => ({ src, cleanSrc: cleanSrc(src), query: queryOf(src) }));
  const versionedScripts = scripts.filter((src) => queryOf(src));
  return {
    page,
    externalScriptCount: scripts.length,
    versionedScriptCount: versionedScripts.length,
    unversionedScriptCount: scripts.length - versionedScripts.length,
    legacyQueryMarkers
  };
});

const report = {
  cycle: 77,
  name: 'product-script-version-hygiene',
  generatedAt: new Date().toISOString(),
  scope: {
    targetPages: TARGET_PAGES,
    visualProductFilesChanged: false,
    scriptOrderChanged: false,
    importsRemoved: false
  },
  summary: {
    pageCount: pages.length,
    externalScriptCount: pages.reduce((sum, page) => sum + page.externalScriptCount, 0),
    versionedScriptCount: pages.reduce((sum, page) => sum + page.versionedScriptCount, 0),
    unversionedScriptCount: pages.reduce((sum, page) => sum + page.unversionedScriptCount, 0),
    legacyQueryMarkerCount: pages.reduce((sum, page) => sum + page.legacyQueryMarkers.length, 0)
  },
  pages
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), JSON.stringify(report, null, 2) + '\n');

console.log('[cycle-77] Product script version hygiene generated.');
console.log(`[cycle-77] Legacy query markers: ${report.summary.legacyQueryMarkerCount}`);
console.log(`[cycle-77] Output: ${OUTPUT}`);

if (report.summary.legacyQueryMarkerCount > 0) {
  process.exitCode = 1;
}
