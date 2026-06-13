#!/usr/bin/env node
/*
 * Doke index CSS structure audit.
 *
 * Read-only governance audit for index.html. It maps the active CSS import graph,
 * ownership layers, selector overlap, visual-declaration pressure, and safe next
 * candidates before any home CSS consolidation. The script intentionally does not
 * mutate production CSS or HTML.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const outDir = path.join(root, 'reports', 'generated');
const jsonPath = path.join(outDir, 'index-css-structure-audit.json');
const mdPath = path.join(outDir, 'index-css-structure-audit.md');

const htmlLinkRe = /<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;
const importRe = /@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?\s*([^;]*);?/gi;
const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
const classRe = /\.(-?[_a-zA-Z\u00A0-\uFFFF]+[_a-zA-Z0-9\u00A0-\uFFFF-]*)/g;

const forbiddenNameTokens = [
  'fix', 'hotfix', 'match', 'parity', 'final', 'rescue', 'adjustment', 'cleanup',
  'polish', 'normalization', 'legacy', 'redesign', 'standardization', 'repair'
];

const visualProperties = new Set([
  'background', 'background-color', 'border', 'border-color', 'border-radius',
  'box-shadow', 'color', 'font', 'font-size', 'font-weight', 'letter-spacing',
  'line-height', 'outline', 'text-shadow', 'transition'
]);
const dimensionProperties = new Set([
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
  'aspect-ratio'
]);
const spacingProperties = new Set([
  'padding', 'padding-block', 'padding-inline', 'padding-top', 'padding-right',
  'padding-bottom', 'padding-left', 'margin', 'margin-block', 'margin-inline',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'gap', 'row-gap',
  'column-gap'
]);
const layoutProperties = new Set([
  'display', 'position', 'top', 'right', 'bottom', 'left', 'grid',
  'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'grid-auto-columns',
  'place-items', 'align-items', 'justify-content', 'overflow', 'overflow-x', 'overflow-y',
  'z-index', 'flex', 'flex-basis', 'flex-direction', 'flex-wrap'
]);
const componentSelectorTokens = [
  'doke-', 'app-header', 'sidebar', 'card', 'btn', 'button', 'pill', 'tab', 'avatar',
  'modal', 'drawer', 'rail', 'carousel', 'search', 'input', 'field', 'workers',
  'publication', 'marketplace', 'professional'
];

function posix(value) {
  return value.replace(/\\/g, '/');
}

function rel(file) {
  return posix(path.relative(root, file));
}

function stripQuery(value) {
  return value.replace(/\?.*$/, '').replace(/^\.\//, '');
}

function normalizeAsset(value, fromAsset = '') {
  const clean = stripQuery(value.trim());
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.startsWith('/')) return clean.replace(/^\/+/, '');
  if (clean.startsWith('assets/')) return clean;
  if (!fromAsset) return clean;
  return posix(path.posix.normalize(path.posix.join(path.posix.dirname(fromAsset), clean)));
}

function readText(asset) {
  const full = path.join(root, asset);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function findCssLinks() {
  const html = fs.readFileSync(indexPath, 'utf8');
  const out = [];
  let match;
  htmlLinkRe.lastIndex = 0;
  while ((match = htmlLinkRe.exec(html))) out.push(normalizeAsset(match[1]));
  return out;
}

function findImports(css, fromAsset) {
  const out = [];
  let match;
  importRe.lastIndex = 0;
  while ((match = importRe.exec(css))) {
    out.push({
      asset: normalizeAsset(match[1], fromAsset),
      media: (match[2] || '').trim()
    });
  }
  return out;
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function extractClasses(text) {
  const classes = new Set();
  let match;
  classRe.lastIndex = 0;
  while ((match = classRe.exec(text))) classes.add(match[1]);
  return [...classes].sort();
}

function parseDeclarations(body) {
  const declarations = [];
  for (const rawDecl of body.split(';')) {
    const idx = rawDecl.indexOf(':');
    if (idx === -1) continue;
    const property = rawDecl.slice(0, idx).trim().toLowerCase();
    const value = rawDecl.slice(idx + 1).trim();
    if (!property || !value) continue;
    declarations.push({ property, value, important: /!important\b/.test(value) });
  }
  return declarations;
}

function parseRules(css) {
  const clean = stripComments(css)
    .replace(/@keyframes[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
    .replace(/@font-face\s*\{[^{}]*\}/g, '');
  const rules = [];
  let match;
  ruleRe.lastIndex = 0;
  while ((match = ruleRe.exec(clean))) {
    const selector = match[1].trim().replace(/\s+/g, ' ');
    if (!selector || selector.startsWith('@')) continue;
    const declarations = parseDeclarations(match[2]);
    if (!declarations.length) continue;
    rules.push({ selector, declarations });
  }
  return rules;
}

function classifyAuthority(asset) {
  if (asset.startsWith('assets/css/core/')) return 'core';
  if (asset.startsWith('assets/css/layout/')) return 'layout';
  if (asset.startsWith('assets/css/components/')) {
    if (asset.includes('/cards/')) return 'component:cards';
    if (asset.includes('/search/')) return 'component:search';
    if (asset.includes('/navigation/')) return 'component:navigation';
    if (asset.includes('/shell/')) return 'component:shell';
    if (asset.includes('/ui/')) return 'component:ui';
    return 'component';
  }
  if (asset.startsWith('assets/css/patterns/')) return 'pattern';
  if (asset.startsWith('assets/css/pages/home')) return 'page:home';
  if (asset.startsWith('assets/css/pages/search-results/')) return 'page:search-results';
  if (asset.startsWith('assets/css/pages/')) return 'page';
  return 'other';
}

function selectorScope(selector) {
  const value = selector.toLowerCase();
  if (value.includes('home-search') || value.includes('home-hero') || value.includes('search-pill')) return 'search';
  if (value.includes('app-header') || value.includes('home-side-meta')) return 'header';
  if (value.includes('sidebar') || value.includes('app-shell') || value.includes('page__content')) return 'shell/rail';
  if (value.includes('card') || value.includes('worker') || value.includes('publication') || value.includes('marketplace') || value.includes('professional')) return 'cards/feed';
  if (value.includes('rail') || value.includes('carousel') || value.includes('track')) return 'rail';
  if (value.includes('modal') || value.includes('drawer') || value.includes('overlay') || value.includes('popover')) return 'overlay';
  if (value.includes('btn') || value.includes('button') || value.includes('pill') || value.includes('tab')) return 'actions';
  return 'other';
}

function declarationBucket(property) {
  if (visualProperties.has(property)) return 'visual';
  if (dimensionProperties.has(property)) return 'dimensions';
  if (spacingProperties.has(property)) return 'spacing';
  if (layoutProperties.has(property)) return 'layout';
  if (property.startsWith('--')) return 'tokens';
  return 'other';
}

function hasForbiddenName(asset) {
  const base = path.basename(asset).toLowerCase();
  return forbiddenNameTokens.filter((token) => base.includes(token));
}

function normalizeSelector(selector) {
  return selector
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, '$1')
    .trim();
}

function buildGraph(directAssets) {
  const graph = new Map();
  const seen = new Set();
  const missingImports = [];
  const importEdges = [];
  const ordered = [];

  function visit(asset, source, depth, stack = []) {
    const css = readText(asset);
    const entry = { asset, source, depth };
    if (!css) {
      missingImports.push({ from: stack[stack.length - 1] || null, asset });
      return;
    }
    if (seen.has(asset)) return;
    seen.add(asset);
    ordered.push(entry);
    const imports = findImports(css, asset);
    graph.set(asset, imports);
    for (const imp of imports) {
      importEdges.push({ from: asset, to: imp.asset, media: imp.media });
      visit(imp.asset, 'import', depth + 1, [...stack, asset]);
    }
  }

  for (const asset of directAssets) visit(asset, 'direct', 0, []);
  return { ordered, graph, missingImports, importEdges };
}

function buildReport() {
  const html = fs.readFileSync(indexPath, 'utf8');
  const directCss = findCssLinks();
  const { ordered, missingImports, importEdges } = buildGraph(directCss);

  const htmlClasses = extractClasses(html);
  const selectorOwners = new Map();
  const records = [];
  const authorityCounts = new Map();
  const scopeCounts = new Map();
  const riskRows = [];

  for (const [order, item] of ordered.entries()) {
    const css = readText(item.asset) || '';
    const rules = parseRules(css);
    const imports = findImports(css, item.asset);
    const authority = classifyAuthority(item.asset);
    authorityCounts.set(authority, (authorityCounts.get(authority) || 0) + 1);

    const buckets = { visual: 0, dimensions: 0, spacing: 0, layout: 0, tokens: 0, other: 0 };
    const scopes = new Map();
    let important = 0;
    let pageComponentVisualPressure = 0;
    let sharedComponentSelectors = 0;

    for (const rule of rules) {
      const scope = selectorScope(rule.selector);
      scopes.set(scope, (scopes.get(scope) || 0) + 1);
      scopeCounts.set(scope, (scopeCounts.get(scope) || 0) + 1);
      const normalizedSelector = normalizeSelector(rule.selector);
      if (!selectorOwners.has(normalizedSelector)) selectorOwners.set(normalizedSelector, []);
      selectorOwners.get(normalizedSelector).push(item.asset);

      const lowerSelector = rule.selector.toLowerCase();
      const targetsSharedComponent = componentSelectorTokens.some((token) => lowerSelector.includes(token));
      if (targetsSharedComponent) sharedComponentSelectors += 1;
      for (const decl of rule.declarations) {
        const bucket = declarationBucket(decl.property);
        buckets[bucket] += 1;
        if (decl.important) important += 1;
        if (authority.startsWith('page') && targetsSharedComponent && ['visual', 'dimensions', 'spacing'].includes(bucket)) {
          pageComponentVisualPressure += 1;
        }
      }
    }

    const forbiddenNameMatches = hasForbiddenName(item.asset);
    const lineCount = css.split(/\r?\n/).length;
    const record = {
      order,
      asset: item.asset,
      source: item.source,
      depth: item.depth,
      authority,
      mediaImports: imports.filter((imp) => imp.media).length,
      imports: imports.length,
      lineCount,
      rules: rules.length,
      important,
      buckets,
      scopes: Object.fromEntries([...scopes.entries()].sort()),
      forbiddenNameMatches,
      sharedComponentSelectors,
      pageComponentVisualPressure,
      riskScore: important * 5 + forbiddenNameMatches.length * 8 + pageComponentVisualPressure * 2 + Math.max(0, lineCount - 500) / 50
    };
    records.push(record);
    if (record.riskScore >= 25 || pageComponentVisualPressure >= 15 || forbiddenNameMatches.length) {
      riskRows.push(record);
    }
  }

  const duplicateSelectors = [...selectorOwners.entries()]
    .map(([selector, assets]) => ({ selector, assets: [...new Set(assets)].sort(), count: new Set(assets).size }))
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count || a.selector.localeCompare(b.selector));

  const totalImportant = records.reduce((sum, rec) => sum + rec.important, 0);
  const totalRules = records.reduce((sum, rec) => sum + rec.rules, 0);
  const totalLines = records.reduce((sum, rec) => sum + rec.lineCount, 0);
  const pageOwnedVisualPressure = records.reduce((sum, rec) => sum + rec.pageComponentVisualPressure, 0);
  const forbiddenProductionFiles = records.filter((rec) => rec.forbiddenNameMatches.length);

  const topRiskFiles = [...records]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 20)
    .map((rec) => ({
      asset: rec.asset,
      authority: rec.authority,
      rules: rec.rules,
      important: rec.important,
      pageComponentVisualPressure: rec.pageComponentVisualPressure,
      riskScore: Number(rec.riskScore.toFixed(2))
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    page: 'index.html',
    directCss,
    totals: {
      cssFiles: records.length,
      importedCssFiles: records.length - directCss.length,
      importEdges: importEdges.length,
      rules: totalRules,
      lines: totalLines,
      important: totalImportant,
      htmlClasses: htmlClasses.length,
      duplicateSelectors: duplicateSelectors.length,
      missingImports: missingImports.length,
      pageOwnedVisualPressure,
      forbiddenProductionFiles: forbiddenProductionFiles.length
    },
    authorityCounts: Object.fromEntries([...authorityCounts.entries()].sort()),
    scopeCounts: Object.fromEntries([...scopeCounts.entries()].sort()),
    missingImports,
    forbiddenProductionFiles: forbiddenProductionFiles.map((rec) => ({ asset: rec.asset, matches: rec.forbiddenNameMatches })),
    topRiskFiles,
    duplicateSelectors: duplicateSelectors.slice(0, 80),
    records,
    nextSteps: [
      'Do not remove imported CSS from index.html without browser/viewport validation.',
      'First target page-owned visual pressure where page/home CSS redraws shared buttons, search, cards, rails, or shell internals.',
      'Keep index.html visually frozen; any home changes must migrate responsibility to existing components/patterns or remove a proven conflict.',
      'Use the report to pick one owner family per patch: search, buttons, cards, rails, overlays, or mobile shell.'
    ]
  };

  return report;
}

function renderMarkdown(report) {
  const topRisk = report.topRiskFiles.map((rec) => (
    `| ${rec.asset} | ${rec.authority} | ${rec.rules} | ${rec.important} | ${rec.pageComponentVisualPressure} | ${rec.riskScore} |`
  )).join('\n');

  const authority = Object.entries(report.authorityCounts)
    .map(([name, count]) => `| ${name} | ${count} |`).join('\n');

  const scopes = Object.entries(report.scopeCounts)
    .map(([name, count]) => `| ${name} | ${count} |`).join('\n');

  const duplicates = report.duplicateSelectors.slice(0, 25).map((entry) => (
    `| \`${entry.selector.replace(/\|/g, '\\|')}\` | ${entry.count} | ${entry.assets.slice(0, 4).join('<br>')}${entry.assets.length > 4 ? '<br>…' : ''} |`
  )).join('\n') || '| none | 0 | |';

  const forbidden = report.forbiddenProductionFiles.map((entry) => (
    `| ${entry.asset} | ${entry.matches.join(', ')} |`
  )).join('\n') || '| none | none |';

  const missing = report.missingImports.map((entry) => (
    `| ${entry.from || 'index.html'} | ${entry.asset} |`
  )).join('\n') || '| none | none |';

  return `# Index CSS structure audit\n\n` +
    `Read-only map for the CSS actually reachable from \`index.html\`. This report is an entry gate for structural cleanup; it does not approve visual changes by itself.\n\n` +
    `## Summary\n\n` +
    `| metric | value |\n|---|---:|\n` +
    `| Direct CSS links | ${report.directCss.length} |\n` +
    `| Reachable CSS files | ${report.totals.cssFiles} |\n` +
    `| Import edges | ${report.totals.importEdges} |\n` +
    `| CSS rules parsed | ${report.totals.rules} |\n` +
    `| CSS lines reachable | ${report.totals.lines} |\n` +
    `| \`!important\` declarations | ${report.totals.important} |\n` +
    `| Duplicate selectors across files | ${report.totals.duplicateSelectors} |\n` +
    `| Page-owned shared-component visual pressure | ${report.totals.pageOwnedVisualPressure} |\n` +
    `| Missing imports | ${report.totals.missingImports} |\n` +
    `| Forbidden/remediation production filenames reachable | ${report.totals.forbiddenProductionFiles} |\n\n` +
    `## Direct CSS\n\n${report.directCss.map((asset, i) => `${i + 1}. \`${asset}\``).join('\n')}\n\n` +
    `## Authority distribution\n\n| authority | files |\n|---|---:|\n${authority}\n\n` +
    `## Selector scope distribution\n\n| scope | rules |\n|---|---:|\n${scopes}\n\n` +
    `## Highest-risk reachable files\n\nRisk score combines \`!important\`, forbidden/remediation filenames, page-owned visual declarations that target shared component families, and very large files.\n\n` +
    `| asset | authority | rules | !important | page visual pressure | score |\n|---|---|---:|---:|---:|---:|\n${topRisk}\n\n` +
    `## Reachable forbidden/remediation filenames\n\n| asset | matched tokens |\n|---|---|\n${forbidden}\n\n` +
    `## Missing imports\n\n| from | missing asset |\n|---|---|\n${missing}\n\n` +
    `## Duplicate selectors, top 25\n\nDuplicate selectors are consolidation candidates only. Do not delete the later owner without viewport validation.\n\n` +
    `| selector | owners | sample assets |\n|---|---:|---|\n${duplicates}\n\n` +
    `## Safe interpretation\n\n` +
    `- \`index.html\` remains visually frozen. This audit is for reducing future regression risk, not redesign.\n` +
    `- First cleanup candidates are page-owned rules that redraw shared components: search, buttons, cards, rails, overlays, and shell internals.\n` +
    `- Each production change should move one family to its existing authority, then validate desktop/tablet/mobile before removing old rules.\n` +
    `- Do not remove large imported files solely because they are large or duplicated; the import graph only shows where risk is located.\n\n` +
    `Machine-readable report: \`reports/generated/index-css-structure-audit.json\`.\n`;
}

const report = buildReport();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(mdPath, renderMarkdown(report));

console.log('Index CSS structure audit complete.');
console.log(`Reachable CSS files: ${report.totals.cssFiles}`);
console.log(`Important declarations: ${report.totals.important}`);
console.log(`Page-owned shared-component visual pressure: ${report.totals.pageOwnedVisualPressure}`);
console.log(`Report: ${rel(mdPath)}`);
