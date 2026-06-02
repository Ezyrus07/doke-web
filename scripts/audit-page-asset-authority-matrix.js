#!/usr/bin/env node
/*
 * Doke page asset authority matrix.
 *
 * This is a read-only governance audit. It maps each HTML page to its direct
 * CSS/JS assets, imported CSS chains, naming-risk tokens, and likely authority
 * groups. It does not rewrite files and must stay safe to run before/after
 * structural CSS, shell, router, header, rail, or card work.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const validationDir = path.join(root, 'docs', 'validation');
const reportPath = path.join(validationDir, 'page-asset-authority-matrix.json');
const markdownPath = path.join(root, 'docs', 'PAGE-ASSET-AUTHORITY-MATRIX.md');
const homePath = path.join(root, 'docs', 'HOME-AUTHORITY-CLASSIFICATION.md');

const forbiddenNameTokens = [
  'fix',
  'hotfix',
  'match',
  'parity',
  'final',
  'rescue',
  'adjustment',
  'cleanup',
  'polish',
  'normalization',
  'legacy',
  'redesign',
  'standardization',
  'repair'
];

const authorityGroups = {
  core: ['tokens', 'reset', 'typography', 'base', 'utilities', 'core'],
  shell: ['shell', 'app-shell', 'mobile-app-shell', 'sidebar', 'layout'],
  header: ['header', 'topbar', 'app-header', 'nav'],
  rail: ['rail', 'width', 'page-width', 'container'],
  scroll: ['scroll', 'safari', 'overflow'],
  cards: ['card', 'cards', 'marketplace', 'worker', 'publication', 'service'],
  patterns: ['pattern', 'patterns', 'feed', 'rails', 'list'],
  page: ['pages/', '/home', '/perfil', '/pedidos', '/mensagens', '/search-results', '/detalhe-anuncio'],
  mobile: ['mobile', 'tablet', 'ipad', 'responsive'],
  router: ['router', 'route', 'navigation'],
  data: ['controller', 'data', 'mock', 'repository', 'service']
};

const htmlLinkRe = /<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;
const scriptRe = /<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi;
const importRe = /@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;

function walk(dir, predicate, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
      walk(full, predicate, output);
    } else if (predicate(full)) {
      output.push(full);
    }
  }
  return output;
}

function rel(full) {
  return path.relative(root, full).replace(/\\/g, '/');
}

function stripQuery(value) {
  return value.replace(/\?.*$/, '').replace(/^\.\//, '');
}

function normalizeCssImport(imported, fromAsset) {
  const clean = stripQuery(imported);
  if (clean.startsWith('/')) return clean.replace(/^\/+/, '');
  if (clean.startsWith('assets/')) return clean;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromAsset), clean));
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function findAll(regex, text) {
  const out = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(text))) out.push(stripQuery(match[1]));
  return out;
}

function tokenMatches(filePath) {
  const base = path.basename(filePath).toLowerCase();
  return forbiddenNameTokens.filter((token) => new RegExp(`(^|[-_.])${token}($|[-_.])`).test(base));
}

function classify(filePath) {
  const value = filePath.toLowerCase();
  return Object.fromEntries(
    Object.entries(authorityGroups).map(([group, tokens]) => [
      group,
      tokens.some((token) => value.includes(token))
    ])
  );
}

function activeAuthorityList(authority) {
  return Object.keys(authority).filter((key) => authority[key]);
}

function cssImportsFor(cssPath, cssByPath, stack = [], seen = new Set()) {
  const item = cssByPath.get(cssPath);
  if (!item) return [];
  const out = [];
  for (const imported of item.imports) {
    if (seen.has(imported)) continue;
    seen.add(imported);
    const child = cssByPath.get(imported);
    out.push({
      asset: imported,
      depth: stack.length + 1,
      exists: Boolean(child),
      importedBy: cssPath,
      forbiddenTokens: tokenMatches(imported),
      authority: classify(imported)
    });
    if (child) out.push(...cssImportsFor(imported, cssByPath, [...stack, cssPath], seen));
  }
  return out;
}

const htmlFiles = walk(root, (file) => file.endsWith('.html')).sort();
const cssFiles = walk(path.join(root, 'assets', 'css'), (file) => file.endsWith('.css')).sort();
const jsFiles = walk(path.join(root, 'assets', 'js'), (file) => file.endsWith('.js')).sort();

const cssByPath = new Map(cssFiles.map((file) => {
  const asset = rel(file);
  const text = readText(file);
  return [asset, {
    asset,
    sizeBytes: fs.statSync(file).size,
    importantCount: (text.match(/!important/g) || []).length,
    importCount: findAll(importRe, text).length,
    imports: findAll(importRe, text).map((imported) => normalizeCssImport(imported, asset)),
    forbiddenTokens: tokenMatches(asset),
    authority: classify(asset)
  }];
}));

const jsByPath = new Map(jsFiles.map((file) => {
  const asset = rel(file);
  return [asset, {
    asset,
    sizeBytes: fs.statSync(file).size,
    forbiddenTokens: tokenMatches(asset),
    authority: classify(asset)
  }];
}));

const pages = htmlFiles.map((file) => {
  const page = rel(file);
  const text = readText(file);
  const css = findAll(htmlLinkRe, text);
  const js = findAll(scriptRe, text);
  const cssDirect = css.map((asset, order) => {
    const known = cssByPath.get(asset);
    const imports = known ? cssImportsFor(asset, cssByPath) : [];
    return {
      order: order + 1,
      asset,
      exists: Boolean(known),
      sizeBytes: known?.sizeBytes || 0,
      importantCount: known?.importantCount || 0,
      importCount: known?.importCount || 0,
      importedCssCount: imports.length,
      forbiddenTokens: tokenMatches(asset),
      authority: classify(asset),
      importedCss: imports
    };
  });
  const jsDirect = js.map((asset, order) => {
    const known = jsByPath.get(asset);
    return {
      order: order + 1,
      asset,
      exists: Boolean(known),
      sizeBytes: known?.sizeBytes || 0,
      forbiddenTokens: tokenMatches(asset),
      authority: classify(asset)
    };
  });
  const allCssAuthorityCounts = {};
  for (const direct of cssDirect) {
    for (const group of activeAuthorityList(direct.authority)) {
      allCssAuthorityCounts[group] = (allCssAuthorityCounts[group] || 0) + 1;
    }
    for (const imported of direct.importedCss) {
      for (const group of activeAuthorityList(imported.authority)) {
        allCssAuthorityCounts[group] = (allCssAuthorityCounts[group] || 0) + 1;
      }
    }
  }
  const directForbiddenCss = cssDirect.filter((item) => item.forbiddenTokens.length);
  const importedForbiddenCss = cssDirect.flatMap((item) => item.importedCss).filter((item) => item.forbiddenTokens.length);
  return {
    page,
    directCssCount: cssDirect.length,
    directJsCount: jsDirect.length,
    importedCssCount: cssDirect.reduce((sum, item) => sum + item.importedCssCount, 0),
    totalDirectCssBytes: cssDirect.reduce((sum, item) => sum + item.sizeBytes, 0),
    totalDirectImportant: cssDirect.reduce((sum, item) => sum + item.importantCount, 0),
    directForbiddenCssCount: directForbiddenCss.length,
    importedForbiddenCssCount: importedForbiddenCss.length,
    authorityCounts: allCssAuthorityCounts,
    cssDirect,
    jsDirect,
    riskFlags: [
      cssDirect.length >= 40 ? '40+ direct CSS links' : null,
      cssDirect.reduce((sum, item) => sum + item.importantCount, 0) >= 500 ? '500+ direct !important' : null,
      directForbiddenCss.length || importedForbiddenCss.length ? 'active legacy/remediation naming' : null,
      Object.values(allCssAuthorityCounts).some((count) => count >= 6) ? 'many files claim one authority group' : null
    ].filter(Boolean)
  };
});

const homePage = pages.find((page) => page.page === 'index.html') || null;
const highestRiskPages = [...pages].sort((a, b) => {
  const riskA = a.riskFlags.length * 1000 + a.directCssCount * 10 + a.totalDirectImportant;
  const riskB = b.riskFlags.length * 1000 + b.directCssCount * 10 + b.totalDirectImportant;
  return riskB - riskA;
}).slice(0, 12).map(({ cssDirect, jsDirect, ...summary }) => summary);

const report = {
  ok: true,
  status: 'asset-authority-matrix-generated',
  checkedAt: new Date().toISOString(),
  totals: {
    pages: pages.length,
    cssFiles: cssFiles.length,
    jsFiles: jsFiles.length
  },
  authorityGroups,
  forbiddenNameTokens,
  highestRiskPages,
  homeSummary: homePage ? {
    page: homePage.page,
    directCssCount: homePage.directCssCount,
    directJsCount: homePage.directJsCount,
    importedCssCount: homePage.importedCssCount,
    totalDirectCssBytes: homePage.totalDirectCssBytes,
    totalDirectImportant: homePage.totalDirectImportant,
    directForbiddenCssCount: homePage.directForbiddenCssCount,
    importedForbiddenCssCount: homePage.importedForbiddenCssCount,
    authorityCounts: homePage.authorityCounts,
    riskFlags: homePage.riskFlags,
    directCss: homePage.cssDirect.map(({ importedCss, ...item }) => item),
    directJs: homePage.jsDirect
  } : null,
  pages
};

function markdownTable(rows, headers) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${headers.map((header) => String(row[header] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [head, sep, ...body].join('\n');
}

const pageRows = highestRiskPages.map((page) => ({
  page: page.page,
  css: page.directCssCount,
  js: page.directJsCount,
  imports: page.importedCssCount,
  important: page.totalDirectImportant,
  legacy: page.directForbiddenCssCount + page.importedForbiddenCssCount,
  flags: page.riskFlags.join(', ')
}));

const md = `# Page asset authority matrix\n\nThis document is generated by \`npm run audit:page-asset-authority-matrix\`. It is a read-only map used before CSS, shell, header, rail, card, router, or mobile first-paint changes.\n\n## Highest-risk pages\n\n${markdownTable(pageRows, ['page', 'css', 'js', 'imports', 'important', 'legacy', 'flags'])}\n\n## Rules for using this matrix\n\n- Do not delete CSS only because its filename is bad. First prove whether it is directly linked, imported by active CSS, or safely replaced.\n- Treat multiple files claiming the same authority group as a consolidation candidate, not as permission to add a later override.\n- Start with \`index.html\`/home when addressing mobile first paint, rails, workers, or route transition perception.\n- For shell/router/header work, run the required viewport checks from \`AGENTS.md\`.\n\nFull machine-readable report: \`docs/validation/page-asset-authority-matrix.json\`.\n`;

const homeCssRows = homePage ? homePage.cssDirect.map((item) => ({
  order: item.order,
  asset: item.asset,
  imports: item.importedCssCount,
  important: item.importantCount,
  authority: activeAuthorityList(item.authority).join(', '),
  legacy: item.forbiddenTokens.join(', ')
})) : [];

const homeMd = `# Home authority classification\n\nGenerated by \`npm run audit:page-asset-authority-matrix\`. This is the current map for \`index.html\`; it is not a cleanup approval by itself.\n\n## Summary\n\n- Direct CSS links: ${homePage?.directCssCount ?? 0}\n- Direct JS scripts: ${homePage?.directJsCount ?? 0}\n- Imported CSS reachable from direct home CSS: ${homePage?.importedCssCount ?? 0}\n- Direct CSS \`!important\` count: ${homePage?.totalDirectImportant ?? 0}\n- Direct/imported legacy-remediation CSS names: ${(homePage?.directForbiddenCssCount ?? 0) + (homePage?.importedForbiddenCssCount ?? 0)}\n- Risk flags: ${(homePage?.riskFlags ?? []).join(', ') || 'none'}\n\n## Direct CSS order\n\n${markdownTable(homeCssRows, ['order', 'asset', 'imports', 'important', 'authority', 'legacy'])}\n\n## Architectural reading\n\n- Home page layout must stay in the home page layer.\n- Worker/card anatomy must stay in card components.\n- Mobile first paint must be consistent between pending and mounted shell states.\n- Tablet/Safari contracts must not override phone rails after hydration.\n- This file only identifies authority collisions; any removal/fusion still needs visual validation.\n`;

fs.mkdirSync(validationDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(markdownPath, md);
fs.writeFileSync(homePath, homeMd);

console.log(`[page-asset-authority-matrix] ${report.status}`);
console.log(`- pages: ${report.totals.pages}`);
console.log(`- css files: ${report.totals.cssFiles}`);
console.log(`- js files: ${report.totals.jsFiles}`);
console.log(`- home direct css: ${homePage?.directCssCount ?? 0}`);
console.log(`- report: ${path.relative(root, reportPath).replace(/\\/g, '/')}`);
console.log(`- docs: ${path.relative(root, markdownPath).replace(/\\/g, '/')}, ${path.relative(root, homePath).replace(/\\/g, '/')}`);
