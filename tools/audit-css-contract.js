const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CSS_ROOT = path.join(ROOT, 'assets/css');
const DOCS_DIR = path.join(ROOT, 'docs/validation');
const stripQuery = value => value.split('?')[0];
const normalize = value => value.replace(/\\/g, '/').replace(/^\.\//, '');

function walk(dir, predicate = () => true, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const rel = normalize(path.relative(ROOT, p));
    if (rel.startsWith('archive/')) continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, predicate, out);
    else if (predicate(p, rel)) out.push(p);
  }
  return out;
}

const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
const cssFiles = walk(CSS_ROOT, p => p.endsWith('.css')).map(p => normalize(path.relative(ROOT, p))).sort();
const cssSet = new Set(cssFiles);

function readRel(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function extractHtmlLinks(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/gi)]
    .map(m => stripQuery(m[1]))
    .map(normalize);
}

function extractCssImports(cssRel) {
  const css = readRel(cssRel);
  const dir = path.dirname(cssRel);
  return [...css.matchAll(/@import\s+(?:url\()?['"]?([^'"\)]+\.css(?:\?[^'"\)]*)?)['"]?\)?\s*;/gi)]
    .map(m => stripQuery(m[1]))
    .map(href => normalize(path.normalize(path.join(dir, href))))
    .filter(rel => cssSet.has(rel));
}

const cssLinkMap = Object.fromEntries(htmlFiles.map(file => [file, extractHtmlLinks(file)]));
const importMap = Object.fromEntries(cssFiles.map(file => [file, extractCssImports(file)]));

const reachable = new Set();
const stack = [];
for (const links of Object.values(cssLinkMap)) {
  for (const rel of links) if (cssSet.has(rel)) stack.push(rel);
}
while (stack.length) {
  const rel = stack.pop();
  if (reachable.has(rel)) continue;
  reachable.add(rel);
  for (const dep of importMap[rel] || []) stack.push(dep);
}

const deprecatedCss = [
  'assets/css/components/ui.css',
  'assets/css/core/surfaces.css',
  'assets/css/core/surface-normalize.css',
  'assets/css/core/border-consolidation.css',
  'assets/css/core/shell-home.css',
];
const bridgeCss = [
  'assets/css/core/layout-shell.css',
  'assets/css/core/layout-topbar.css',
  'assets/css/core/layout-responsive.css',
  'assets/css/core/patterns.css',
  'assets/css/core/primitives.css',
];

const deprecatedHtmlRefs = [];
for (const [html, links] of Object.entries(cssLinkMap)) {
  for (const dep of deprecatedCss) if (links.includes(dep)) deprecatedHtmlRefs.push({ html, file: dep });
}
const nonPedidosOrdersCssRefs = Object.entries(cssLinkMap)
  .filter(([html]) => html !== 'pedidos.html')
  .flatMap(([html, links]) => links.includes('assets/css/pages/pedidos.css') ? [{ html, file: 'assets/css/pages/pedidos.css' }] : []);

const activeDeprecatedRefs = [];
for (const file of [...htmlFiles, ...cssFiles]) {
  if (file.startsWith('docs/') || file.startsWith('archive/')) continue;
  const text = readRel(file);
  for (const dep of deprecatedCss) {
    const name = path.basename(dep);
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const preciseName = new RegExp(`(^|[^\\w-])${escaped}($|[^\\w-])`);
    if (preciseName.test(text) && file !== dep) activeDeprecatedRefs.push({ file, reference: name });
  }
}

const requiredSurfaceModules = [
  'assets/css/components/ui-surface/tokens.css',
  'assets/css/components/ui-surface/overlay-root.css',
  'assets/css/components/ui-surface/surface-contract.css',
  'assets/css/components/ui-surface/dropdowns-menus.css',
  'assets/css/components/ui-surface/buttons-close.css',
  'assets/css/components/ui-surface/forms-controls.css',
  'assets/css/components/ui-surface/cards-media.css',
  'assets/css/components/ui-surface/responsive.css',
];
const requiredPublicationModules = [
  'assets/css/components/before-after-workers-preview/before-after-shell.css',
  'assets/css/components/before-after-workers-preview/before-after-media.css',
  'assets/css/components/before-after-workers-preview/before-after-sidebar.css',
  'assets/css/components/before-after-workers-preview/workers-modal.css',
];

const conflictTerms = /(modal|popover|drawer|dropdown|card|btn|button|close|input|select|textarea|filter|lightbox)/i;
const hotFiles = cssFiles.map(file => {
  const text = readRel(file);
  const lines = text.split(/\r?\n/);
  return { file, matches: lines.filter(l => conflictTerms.test(l)).length, lines: lines.length, reachable: reachable.has(file) };
}).filter(x => x.matches).sort((a, b) => b.matches - a.matches || b.lines - a.lines);

const inactiveCss = cssFiles.filter(file => !reachable.has(file) && !deprecatedCss.includes(file) && !bridgeCss.includes(file));
const checks = {
  noDeprecatedHtmlRefs: deprecatedHtmlRefs.length === 0,
  noPedidosCssOutsidePedidos: nonPedidosOrdersCssRefs.length === 0,
  uiSurfaceManifestReachable: reachable.has('assets/css/components/ui-surface-system.css'),
  uiSurfaceModulesPresent: requiredSurfaceModules.every(file => cssSet.has(file)),
  publicationModulesPresent: requiredPublicationModules.every(file => cssSet.has(file)),
  deprecatedFilesAreNotReachable: deprecatedCss.every(file => !reachable.has(file)),
  activeDeprecatedReferenceCount: activeDeprecatedRefs.length,
  reachableCssCount: reachable.size,
  totalCssCount: cssFiles.length,
  inactiveCssCandidateCount: inactiveCss.length,
};

fs.mkdirSync(DOCS_DIR, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  cssLinkMap,
  importMap,
  checks,
  deprecatedHtmlRefs,
  nonPedidosOrdersCssRefs,
  activeDeprecatedRefs,
  deprecatedCss,
  bridgeCss,
  inactiveCssCandidates: inactiveCss.sort(),
  hotFiles: hotFiles.slice(0, 50),
};
fs.writeFileSync(path.join(DOCS_DIR, 'css-contract-static-report.json'), JSON.stringify(report, null, 2));

const md = `# CSS contract static audit — v18\n\n` +
`## Checks\n\n` +
Object.entries(checks).map(([key, value]) => `- ${key}: ${value}`).join('\n') +
`\n\n## Deprecated direct references\n\n` +
(deprecatedHtmlRefs.length ? deprecatedHtmlRefs.map(x => `- ${x.html} -> ${x.file}`).join('\n') : '- None found in HTML links.') +
`\n\n## pedidos.css outside pedidos.html\n\n` +
(nonPedidosOrdersCssRefs.length ? nonPedidosOrdersCssRefs.map(x => `- ${x.html} -> ${x.file}`).join('\n') : '- None found.') +
`\n\n## Inactive CSS candidates, not automatically safe to delete\n\n` +
(inactiveCss.length ? inactiveCss.slice(0, 80).map(x => `- ${x}`).join('\n') : '- None found.') +
`\n\n## Highest-risk CSS files still worth auditing\n\n` +
hotFiles.slice(0, 20).map(x => `- ${x.file} — ${x.matches} matched lines / ${x.lines} lines / reachable=${x.reachable}`).join('\n') +
`\n`;
fs.writeFileSync(path.join(DOCS_DIR, 'surface-contract-report.md'), md);

console.log(JSON.stringify(checks, null, 2));
console.log('\nTop conflict files:');
for (const x of hotFiles.slice(0, 15)) console.log(`${x.matches}\t${x.lines}\t${x.reachable ? 'active' : 'inactive'}\t${x.file}`);

const hardFail = !checks.noDeprecatedHtmlRefs || !checks.noPedidosCssOutsidePedidos || !checks.uiSurfaceModulesPresent || !checks.publicationModulesPresent;
process.exit(hardFail ? 1 : 0);
