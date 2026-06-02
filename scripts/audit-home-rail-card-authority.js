#!/usr/bin/env node
/*
 * Doke home rail/card authority audit.
 *
 * Read-only governance audit for index.html. It maps which active home CSS files
 * define rail/card dimensions, overflow, aspect ratio, and responsive behavior.
 * The output is meant to be used before moving CSS or reducing !important so a
 * cleanup can remove conflicts instead of adding a new override layer.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const generatedReportsDir = path.join(root, 'reports', 'generated');
const reportPath = path.join(generatedReportsDir, 'home-rail-card-authority-report.json');
const markdownPath = path.join(root, 'docs', 'HOME-RAIL-CARD-AUTHORITY-AUDIT.md');
const indexPath = path.join(root, 'index.html');

const htmlLinkRe = /<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;
const importRe = /@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;

const railTokens = [
  'rail',
  'track',
  'grid',
  'carousel',
  'slider',
  'feed',
  'short-videos',
  'home-section',
  'before-after',
  'services',
  'offers',
  'publication',
  'marketplace'
];

const cardTokens = [
  'card',
  'video-card',
  'worker-card',
  'doke-worker-card',
  'service-card',
  'offer-card',
  'publication',
  'marketplace',
  'professional',
  'worker'
];

const propertyGroups = {
  layout: ['display', 'position', 'place-items', 'align-items', 'justify-content'],
  columns: ['grid-template-columns', 'grid-auto-columns', 'grid-auto-flow', 'flex', 'flex-basis'],
  dimensions: ['width', 'min-width', 'max-width', 'height', 'min-height', 'max-height', 'aspect-ratio'],
  spacing: ['gap', 'row-gap', 'column-gap', 'padding', 'padding-inline', 'padding-left', 'padding-right', 'margin', 'margin-inline'],
  overflow: ['overflow', 'overflow-x', 'overflow-y', 'scroll-snap-type', 'scroll-snap-align', '-webkit-overflow-scrolling'],
  visual: ['border-radius', 'box-shadow', 'background', 'background-color', 'object-fit']
};

const propertiesOfInterest = new Set(Object.values(propertyGroups).flat());
const ownership = {
  railLayout: 'assets/css/pages/home.css or assets/css/pages/home/mobile-index-feed-contract.css for phone-only rails',
  cardAnatomy: 'assets/css/components/cards/worker-card.css and assets/css/components/cards/marketplace-card-contract.css',
  sharedCardBridge: 'assets/css/components/cards/shared-index-card-contract.css only for shared index bridge; not final page layout',
  tabletSafari: 'assets/css/pages/home/tablet-safari-layout.css only for tablet/Safari exceptions; not phone authority',
  shell: 'assets/css/components/shell/* only for shell/header/rail variables, not card dimensions'
};

function rel(full) {
  return path.relative(root, full).replace(/\\/g, '/');
}

function stripQuery(value) {
  return value.replace(/\?.*$/, '').replace(/^\.\//, '');
}

function normalizeAsset(value, fromAsset = '') {
  const clean = stripQuery(value);
  if (clean.startsWith('/')) return clean.replace(/^\/+/, '');
  if (clean.startsWith('assets/')) return clean;
  if (!fromAsset) return clean;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromAsset), clean));
}

function findAll(regex, text) {
  const out = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(text))) out.push(stripQuery(match[1]));
  return out;
}

function readAsset(asset) {
  const full = path.join(root, asset);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf8');
}

function directCssFromIndex() {
  const html = fs.readFileSync(indexPath, 'utf8');
  return findAll(htmlLinkRe, html).map((href) => normalizeAsset(href));
}

function importedCssChain(asset, seen = new Set()) {
  const css = readAsset(asset);
  if (!css) return [];
  const imports = findAll(importRe, css).map((item) => normalizeAsset(item, asset));
  const out = [];
  for (const imported of imports) {
    if (seen.has(imported)) continue;
    seen.add(imported);
    out.push(imported);
    out.push(...importedCssChain(imported, seen));
  }
  return out;
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseDeclarations(body) {
  const declarations = [];
  for (const raw of body.split(';')) {
    const idx = raw.indexOf(':');
    if (idx === -1) continue;
    const property = raw.slice(0, idx).trim().toLowerCase();
    const value = raw.slice(idx + 1).trim().replace(/\s+/g, ' ');
    if (!property || !value) continue;
    if (!propertiesOfInterest.has(property)) continue;
    declarations.push({
      property,
      value,
      important: /!important\b/.test(value)
    });
  }
  return declarations;
}

function parseCssRules(css) {
  const clean = stripComments(css)
    .replace(/@keyframes[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
    .replace(/@font-face\s*\{[^{}]*\}/g, '');
  const rules = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = ruleRe.exec(clean))) {
    const selector = match[1].trim().replace(/\s+/g, ' ');
    if (!selector || selector.startsWith('@')) continue;
    const declarations = parseDeclarations(match[2]);
    if (!declarations.length) continue;
    rules.push({ selector, declarations });
  }
  return rules;
}

function selectorMatches(selector, tokens) {
  const value = selector.toLowerCase();
  return tokens.some((token) => value.includes(token));
}

function targetForSelector(selector) {
  const value = selector.toLowerCase();
  if (value.includes('short-videos__track') || value.includes('worker') && (value.includes('track') || value.includes('rail') || value.includes('grid'))) return 'workers-rail';
  if (value.includes('video-card') || value.includes('worker-card') || value.includes('doke-worker-card')) return 'worker-card';
  if (value.includes('before-after') && (value.includes('grid') || value.includes('rail') || value.includes('track'))) return 'featured-rail';
  if (value.includes('before-after') || value.includes('publication-card')) return 'featured-card';
  if (value.includes('offer') && (value.includes('grid') || value.includes('rail') || value.includes('track'))) return 'publications-rail';
  if (value.includes('offer-card')) return 'publication-card';
  if (value.includes('service') && (value.includes('grid') || value.includes('rail') || value.includes('track'))) return 'services-rail';
  if (value.includes('service-card') || value.includes('marketplace-card')) return 'marketplace-card';
  if (value.includes('home-section') || value.includes('mobile-index') || value.includes('feed')) return 'home-feed-rail';
  if (selectorMatches(selector, railTokens)) return 'generic-rail';
  if (selectorMatches(selector, cardTokens)) return 'generic-card';
  return 'other';
}

function likelyLayer(asset) {
  if (asset.includes('/components/cards/')) return 'component-card';
  if (asset.includes('/components/shell/')) return 'component-shell';
  if (asset.includes('/patterns/')) return 'pattern';
  if (asset.includes('/pages/home/')) return 'page-home-module';
  if (asset.includes('/pages/home.css')) return 'page-home-root';
  if (asset.includes('/pages/')) return 'page';
  if (asset.includes('/core/')) return 'core';
  return 'other';
}

function normalizeSelector(selector) {
  return selector
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, '$1')
    .trim();
}

function declarationGroup(property) {
  for (const [group, properties] of Object.entries(propertyGroups)) {
    if (properties.includes(property)) return group;
  }
  return 'other';
}

function buildReport() {
  const directCss = directCssFromIndex();
  const allCss = [];
  const seen = new Set();
  for (const asset of directCss) {
    if (!seen.has(asset)) {
      seen.add(asset);
      allCss.push({ asset, source: 'direct' });
    }
    for (const imported of importedCssChain(asset)) {
      if (seen.has(imported)) continue;
      seen.add(imported);
      allCss.push({ asset: imported, source: 'import' });
    }
  }

  const records = [];
  for (const item of allCss) {
    const full = path.join(root, item.asset);
    if (!fs.existsSync(full)) continue;
    const css = fs.readFileSync(full, 'utf8');
    const rules = parseCssRules(css);
    for (const rule of rules) {
      const target = targetForSelector(rule.selector);
      if (target === 'other') continue;
      const selectorType = selectorMatches(rule.selector, railTokens) ? 'rail' : selectorMatches(rule.selector, cardTokens) ? 'card' : 'unknown';
      for (const declaration of rule.declarations) {
        records.push({
          asset: item.asset,
          source: item.source,
          layer: likelyLayer(item.asset),
          selector: rule.selector,
          normalizedSelector: normalizeSelector(rule.selector),
          selectorType,
          target,
          property: declaration.property,
          propertyGroup: declarationGroup(declaration.property),
          value: declaration.value,
          important: declaration.important
        });
      }
    }
  }

  const byTargetProperty = new Map();
  for (const record of records) {
    const key = `${record.target}::${record.property}`;
    if (!byTargetProperty.has(key)) byTargetProperty.set(key, []);
    byTargetProperty.get(key).push(record);
  }

  const collisions = [];
  for (const [key, items] of byTargetProperty.entries()) {
    const assets = [...new Set(items.map((item) => item.asset))];
    const values = [...new Set(items.map((item) => item.value))];
    const layers = [...new Set(items.map((item) => item.layer))];
    if (assets.length < 2) continue;
    const [target, property] = key.split('::');
    collisions.push({
      target,
      property,
      propertyGroup: declarationGroup(property),
      assetCount: assets.length,
      declarationCount: items.length,
      importantCount: items.filter((item) => item.important).length,
      layers,
      assets,
      distinctValues: values.slice(0, 12),
      severity: (items.filter((item) => item.important).length ? 2 : 0) + Math.min(assets.length, 5) + (layers.length > 1 ? 2 : 0),
      examples: items.slice(0, 8)
    });
  }
  collisions.sort((a, b) => b.severity - a.severity || b.assetCount - a.assetCount || a.target.localeCompare(b.target));

  const assetsSummary = allCss.map((item, order) => {
    const matching = records.filter((record) => record.asset === item.asset);
    return {
      order: order + 1,
      asset: item.asset,
      source: item.source,
      layer: likelyLayer(item.asset),
      railCardDeclarationCount: matching.length,
      importantCount: matching.filter((record) => record.important).length,
      targets: [...new Set(matching.map((record) => record.target))].sort(),
      properties: [...new Set(matching.map((record) => record.property))].sort()
    };
  }).filter((item) => item.railCardDeclarationCount > 0);

  const targetSummary = {};
  for (const record of records) {
    if (!targetSummary[record.target]) {
      targetSummary[record.target] = {
        declarations: 0,
        important: 0,
        assets: new Set(),
        layers: new Set(),
        properties: new Set()
      };
    }
    targetSummary[record.target].declarations += 1;
    if (record.important) targetSummary[record.target].important += 1;
    targetSummary[record.target].assets.add(record.asset);
    targetSummary[record.target].layers.add(record.layer);
    targetSummary[record.target].properties.add(record.property);
  }
  const targets = Object.fromEntries(Object.entries(targetSummary).map(([target, item]) => [target, {
    declarations: item.declarations,
    important: item.important,
    assetCount: item.assets.size,
    assets: [...item.assets].sort(),
    layers: [...item.layers].sort(),
    properties: [...item.properties].sort()
  }]));

  const report = {
    generatedAt: new Date().toISOString(),
    page: 'index.html',
    directCssCount: directCss.length,
    activeCssCount: allCss.length,
    railCardDeclarations: records.length,
    railCardImportantDeclarations: records.filter((record) => record.important).length,
    collisionCount: collisions.length,
    highSeverityCollisionCount: collisions.filter((item) => item.severity >= 8).length,
    ownership,
    directCss,
    assetsSummary,
    targets,
    collisions,
    records
  };
  return report;
}

function mdEscape(value) {
  return String(value).replace(/\|/g, '\\|');
}

function writeMarkdown(report) {
  const topAssets = report.assetsSummary
    .sort((a, b) => b.railCardDeclarationCount - a.railCardDeclarationCount)
    .slice(0, 20);
  const topCollisions = report.collisions.slice(0, 20);
  const targetRows = Object.entries(report.targets)
    .sort((a, b) => b[1].declarations - a[1].declarations)
    .map(([target, item]) => `| ${target} | ${item.declarations} | ${item.important} | ${item.assetCount} | ${mdEscape(item.layers.join(', '))} |`)
    .join('\n');
  const assetRows = topAssets
    .map((item) => `| ${item.asset} | ${item.source} | ${item.layer} | ${item.railCardDeclarationCount} | ${item.importantCount} | ${mdEscape(item.targets.join(', '))} |`)
    .join('\n');
  const collisionRows = topCollisions
    .map((item) => `| ${item.target} | ${item.property} | ${item.assetCount} | ${item.importantCount} | ${mdEscape(item.layers.join(', '))} | ${mdEscape(item.assets.slice(0, 4).join('<br>'))}${item.assets.length > 4 ? '<br>...' : ''} |`)
    .join('\n');

  return `# Home rail/card authority audit\n\nGenerated by \`npm run audit:home-rail-card-authority\`. This is a read-only map for \`index.html\`; it does not approve visual changes by itself.\n\n## Summary\n\n- Direct CSS links: ${report.directCssCount}\n- Active CSS in direct/import chain: ${report.activeCssCount}\n- Rail/card declarations found: ${report.railCardDeclarations}\n- Rail/card declarations using \`!important\`: ${report.railCardImportantDeclarations}\n- Target/property collisions: ${report.collisionCount}\n- High-severity collisions: ${report.highSeverityCollisionCount}\n\n## Ownership rule for the next cleanup\n\n- Rail layout belongs to: \`${ownership.railLayout}\`.\n- Card anatomy belongs to: \`${ownership.cardAnatomy}\`.\n- Shared bridge files can bridge legacy markup, but they must not become final page layout.\n- Tablet/Safari files must not override phone rails after hydration.\n- Shell files must not define card dimensions.\n\n## Target summary\n\n| target | declarations | important | assets | layers |\n| --- | ---: | ---: | ---: | --- |\n${targetRows}\n\n## Top active files touching home rails/cards\n\n| asset | source | layer | declarations | important | targets |\n| --- | --- | --- | ---: | ---: | --- |\n${assetRows}\n\n## Top target/property collisions\n\n| target | property | assets | important | layers | first assets |\n| --- | --- | ---: | ---: | --- | --- |\n${collisionRows}\n\n## Architectural reading\n\n1. The next phase must not add a new override file. It must remove duplicate authority from existing files.\n2. The riskiest cleanup area is not naming anymore; it is target/property ownership for rails and cards.\n3. Any move from page CSS to component CSS must preserve the approved desktop/tablet/mobile visuals.\n4. Before removing a declaration, compare direct URL and \`DokeNavigate('/index.html')\` behavior.\n5. A valid cleanup reduces collision count or \`!important\` count without changing the approved layout.\n`;
}

fs.mkdirSync(generatedReportsDir, { recursive: true });
const report = buildReport();
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(markdownPath, writeMarkdown(report));
console.log(`Home rail/card authority report written to ${rel(reportPath)}`);
console.log(`Home rail/card authority markdown written to ${rel(markdownPath)}`);
console.log(`Rail/card declarations: ${report.railCardDeclarations}`);
console.log(`Collisions: ${report.collisionCount}`);
