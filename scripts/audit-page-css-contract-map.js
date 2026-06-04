#!/usr/bin/env node
/*
  Stage 48 helper: maps page CSS ownership before changing HTML links.
  This script is read-only: it does not edit HTML/CSS and does not remove assets.
*/

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = {
  'index.html': {
    manifest: 'assets/css/pages/home.css',
    expectedDirect: [
      'assets/css/core/index.css',
      'assets/css/pages/app-shell.css',
      'assets/css/pages/home.css',
    ],
  },
  'resultados.html': {
    manifest: 'assets/css/pages/search-results.css',
    expectedDirect: [
      'assets/css/core/index.css',
      'assets/css/pages/app-shell.css',
      'assets/css/pages/search-results.css',
    ],
  },
  'perfil.html': {
    manifest: 'assets/css/pages/perfil.css',
    expectedRuntime: [
      'assets/css/components/shell/mobile-app-shell.css',
      'assets/js/components/mobile-app-shell.js',
    ],
    deprecatedCss: [
      'assets/css/components/navigation/bottom-nav.css',
    ],
  },
};

function normalizeAsset(asset) {
  return String(asset || '')
    .trim()
    .split('?')[0]
    .replace(/^\.\//, '')
    .replace(/\\/g, '/');
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function directCssLinks(html) {
  const links = [];
  const re = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(html))) {
    const href = normalizeAsset(match[1]);
    if (!href.startsWith('http')) links.push(href);
  }
  return links;
}

function directScriptLinks(html) {
  const scripts = [];
  const re = /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(html))) {
    const src = normalizeAsset(match[1]);
    if (!src.startsWith('http')) scripts.push(src);
  }
  return scripts;
}

function resolveImport(fromFile, importPath) {
  const clean = normalizeAsset(importPath.replace(/^url\((.*)\)$/i, '$1').replace(/^['"]|['"]$/g, ''));
  if (!clean || clean.startsWith('http')) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean));
}

function importedCssTree(entry, seen = new Set()) {
  const out = new Set();
  const file = normalizeAsset(entry);
  if (!file || seen.has(file) || !exists(file)) return out;
  seen.add(file);
  const css = read(file);
  const re = /@import\s+(?:url\()?['"]?([^'";)]+)['"]?\)?[^;]*;/gi;
  let match;
  while ((match = re.exec(css))) {
    const imported = resolveImport(file, match[1]);
    if (!imported) continue;
    out.add(imported);
    for (const nested of importedCssTree(imported, seen)) out.add(nested);
  }
  return out;
}

function classifyPage(page, config) {
  if (!exists(page)) {
    return { page, missing: true };
  }

  const html = read(page);
  const cssLinks = directCssLinks(html);
  const scripts = directScriptLinks(html);
  const expectedDirect = config.expectedDirect || [];
  const directExtra = expectedDirect.length
    ? cssLinks.filter((href) => !expectedDirect.includes(href))
    : [];
  const missingExpected = expectedDirect.filter((href) => !cssLinks.includes(href));
  const manifestImports = config.manifest ? Array.from(importedCssTree(config.manifest)).sort() : [];
  const coveredByManifest = directExtra.filter((href) => manifestImports.includes(href));
  const directOnly = directExtra.filter((href) => !manifestImports.includes(href));
  const missingRuntime = (config.expectedRuntime || []).filter((asset) => {
    if (asset.endsWith('.css')) return !cssLinks.includes(asset) && !manifestImports.includes(asset);
    if (asset.endsWith('.js')) return !scripts.includes(asset);
    return !html.includes(asset);
  });
  const deprecatedLoaded = (config.deprecatedCss || []).filter((asset) => cssLinks.includes(asset) || manifestImports.includes(asset));

  return {
    page,
    cssLinks,
    expectedDirect,
    missingExpected,
    directExtra,
    coveredByManifest,
    directOnly,
    manifest: config.manifest || null,
    manifestImportCount: manifestImports.length,
    missingRuntime,
    deprecatedLoaded,
    safeNextAction: buildAction({ page, directExtra, coveredByManifest, directOnly, missingRuntime, deprecatedLoaded }),
  };
}

function buildAction(result) {
  if (result.missingRuntime.length || result.deprecatedLoaded.length) {
    return 'Corrigir runtime/deprecated com patch pequeno e validar visualmente.';
  }
  if (result.directOnly.length) {
    return 'Não remover links diretos ainda; primeiro mover ownership para manifesto ou provar cobertura visual.';
  }
  if (result.coveredByManifest.length) {
    return 'Candidato a remover links diretos cobertos pelo manifesto, após screenshot baseline.';
  }
  return 'Contrato sem ação imediata.';
}

const results = Object.entries(pages).map(([page, config]) => classifyPage(page, config));
const outputDir = path.join(root, 'reports/generated/stage48-css-contract-map');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'css-contract-map.json'), JSON.stringify(results, null, 2));

const lines = [];
lines.push('# Stage 48 CSS contract map');
lines.push('');
lines.push(`Generated at: ${new Date().toISOString()}`);
lines.push('');
for (const item of results) {
  lines.push(`## ${item.page}`);
  if (item.missing) {
    lines.push('- Page not found.');
    lines.push('');
    continue;
  }
  lines.push(`- Direct CSS links: ${item.cssLinks.length}`);
  if (item.expectedDirect?.length) lines.push(`- Expected direct CSS links: ${item.expectedDirect.join(', ')}`);
  if (item.missingExpected?.length) lines.push(`- Missing expected links: ${item.missingExpected.join(', ')}`);
  if (item.directExtra?.length) lines.push(`- Extra direct CSS links: ${item.directExtra.length}`);
  if (item.coveredByManifest?.length) lines.push(`- Extra links already covered by manifest: ${item.coveredByManifest.length}`);
  if (item.directOnly?.length) {
    lines.push('- Direct-only links requiring ownership decision:');
    for (const asset of item.directOnly) lines.push(`  - ${asset}`);
  }
  if (item.missingRuntime?.length) lines.push(`- Missing runtime: ${item.missingRuntime.join(', ')}`);
  if (item.deprecatedLoaded?.length) lines.push(`- Deprecated CSS loaded: ${item.deprecatedLoaded.join(', ')}`);
  lines.push(`- Next action: ${item.safeNextAction}`);
  lines.push('');
}

fs.writeFileSync(path.join(outputDir, 'css-contract-map.md'), lines.join('\n'));
console.log(lines.join('\n'));
