#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const stablePages = ['index.html', 'resultados.html', 'perfil.html'];
const cssPath = 'assets/css/components/cards/service-card.css';
const reportPath = 'docs/validation/global-cycle-25-service-card-baseline-report.json';

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function hrefsFromHtml(html) {
  const hrefs = [];
  const linkRe = /<link\b[^>]*>/gi;
  const hrefRe = /href=["']([^"']+)["']/i;
  const relRe = /rel=["']([^"']+)["']/i;
  for (const match of html.matchAll(linkRe)) {
    const tag = match[0];
    const rel = tag.match(relRe)?.[1] || '';
    const href = tag.match(hrefRe)?.[1];
    if (href && /stylesheet/i.test(rel)) hrefs.push(href.replace(/^\.\//, ''));
  }
  return hrefs;
}

function scriptSrcsFromHtml(html) {
  const srcs = [];
  const scriptRe = /<script\b[^>]*>/gi;
  const srcRe = /src=["']([^"']+)["']/i;
  for (const match of html.matchAll(scriptRe)) {
    const src = match[0].match(srcRe)?.[1];
    if (src) srcs.push(src.replace(/^\.\//, ''));
  }
  return srcs;
}

function count(re, str) {
  return (str.match(re) || []).length;
}

function hasAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

const errors = [];
const warnings = [];
const pages = {};

for (const page of stablePages) {
  if (!exists(page)) {
    errors.push(`${page} ausente.`);
    continue;
  }
  const html = read(page);
  const hrefs = hrefsFromHtml(html);
  const scripts = scriptSrcsFromHtml(html);
  const pageReport = {
    cssImports: hrefs.length,
    jsImports: scripts.length,
    serviceCardClassOccurrences: count(/\bservice-card\b/g, html),
    serviceCardElementOccurrences: count(/class=["'][^"']*\bservice-card\b[^"']*["']/g, html),
    serviceCardGridOccurrences: count(/\b(?:service-cards-grid|service-grid)\b/g, html),
    favoriteActionOccurrences: count(/\b(?:service-card__favorite|doke-favorite-button|favorite-button|heart-button)\b/g, html),
    dataReadyHooks: count(/\bdata-(?:service|card|favorite|list|loading|empty|error)[\w-]*/g, html),
    importsServiceCardManifestOrDirect: hasAny(hrefs.join('\n'), [
      'service-card.css',
      'home.css',
      'search-results.css',
      'perfil.css',
      'search-results.css'
    ]),
    importsGridManifestOrDirect: hasAny(hrefs.join('\n'), [
      'service-card-grid.css',
      'home.css',
      'search-results.css',
      'perfil.css',
      'search-results.css'
    ]),
    importsFavoriteManifestOrDirect: hasAny(hrefs.join('\n'), [
      'favorite-action.css',
      'home.css',
      'search-results.css',
      'perfil.css',
      'search-results.css'
    ])
  };

  if (pageReport.serviceCardElementOccurrences > 0 && !pageReport.importsServiceCardManifestOrDirect) {
    errors.push(`${page} usa .service-card, mas não parece carregar service-card.css via manifesto/import direto.`);
  }
  if (pageReport.serviceCardGridOccurrences > 0 && !pageReport.importsGridManifestOrDirect) {
    errors.push(`${page} usa grid de service-card, mas não parece carregar service-card-grid.css via manifesto/import direto.`);
  }
  if (pageReport.favoriteActionOccurrences > 0 && !pageReport.importsFavoriteManifestOrDirect) {
    errors.push(`${page} usa favorite/action, mas não parece carregar favorite-action.css via manifesto/import direto.`);
  }
  if (pageReport.serviceCardElementOccurrences > 0 && pageReport.dataReadyHooks === 0) {
    warnings.push(`${page} usa service-card sem hooks data-ready aparentes; migrar progressivamente quando a página virar dinâmica.`);
  }
  pages[page] = pageReport;
}

if (!exists(cssPath)) {
  errors.push(`${cssPath} ausente.`);
} else {
  const css = read(cssPath);
  const importantLines = css.split(/\r?\n/).map((line, index) => ({ line: index + 1, text: line.trim() })).filter((item) => item.text.includes('!important'));
  const sensitiveGroups = {
    desktopCardLayout: importantLines.filter((item) => item.line >= 560 && item.line <= 584).length,
    desktopMediaSizing: importantLines.filter((item) => item.line >= 585 && item.line <= 594).length,
    desktopBodyLayout: importantLines.filter((item) => item.line >= 595 && item.line <= 608).length,
    mobileCardLayout: importantLines.filter((item) => item.line >= 620 && item.line <= 629).length,
    mobileMediaSizing: importantLines.filter((item) => item.line >= 630 && item.line <= 638).length,
    mobileBodyLayout: importantLines.filter((item) => item.line >= 639 && item.line <= 650).length,
  };
  pages[cssPath] = {
    importantCount: importantLines.length,
    sensitiveGroups,
    decision: 'Não remover mídia/grid/layout sem baseline visual real em index, resultados e perfil.'
  };
}

const report = {
  cycle: 25,
  name: 'service-card baseline gate',
  stablePages,
  generatedAt: new Date().toISOString(),
  errors,
  warnings,
  pages,
  nextSafeAction: 'Parar a remoção de !important sensível até obter baseline visual real; avançar para outro contrato global ou preparar data-ready hooks.'
};

fs.writeFileSync(path.join(root, reportPath), JSON.stringify(report, null, 2));

if (errors.length) {
  console.error('Service-card baseline audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  console.error(`Report: ${reportPath}`);
  process.exit(1);
}

console.log('Service-card baseline audit passed.');
if (warnings.length) {
  console.log('Warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}
console.log(`Report: ${reportPath}`);
