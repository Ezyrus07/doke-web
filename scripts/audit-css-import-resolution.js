#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DOC_PATH = path.join(ROOT, 'docs', 'validation', 'css-import-resolution.md');
const REPORT_PATH = path.join(ROOT, 'reports', 'generated', 'css-import-resolution-report.json');

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function stripQuery(url) {
  return url.split('?')[0].split('#')[0];
}

function isLocalStylesheet(url) {
  return url && !/^(?:https?:)?\/\//i.test(url) && !url.startsWith('data:');
}

function resolveReference(fromFile, url) {
  const clean = stripQuery(url.trim().replace(/^['"]|['"]$/g, ''));
  if (!isLocalStylesheet(clean)) return null;
  if (clean.startsWith('/')) return path.join(ROOT, clean.slice(1));
  return path.resolve(path.dirname(fromFile), clean);
}

function rootHtmlFiles() {
  return fs.readdirSync(ROOT)
    .filter(name => name.endsWith('.html'))
    .map(name => path.join(ROOT, name));
}

function stylesheetLinks(htmlFile) {
  const source = fs.readFileSync(htmlFile, 'utf8');
  const linkRegex = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const links = [];
  let match;
  while ((match = linkRegex.exec(source))) {
    const target = resolveReference(htmlFile, match[1]);
    if (target) links.push({ source: rel(htmlFile), target: rel(target), absoluteTarget: target, type: 'html-stylesheet' });
  }
  return links;
}

function cssImports(cssFile) {
  const source = fs.readFileSync(cssFile, 'utf8');
  const importRegex = /@import\s+url\(([^)]+)\)/g;
  const imports = [];
  let match;
  while ((match = importRegex.exec(source))) {
    const target = resolveReference(cssFile, match[1]);
    if (target) imports.push({ source: rel(cssFile), target: rel(target), absoluteTarget: target, type: 'css-import' });
  }
  return imports;
}

const failures = [];
const checked = [];
const visitedCss = new Set();
const queue = [];

for (const htmlFile of rootHtmlFiles()) {
  for (const link of stylesheetLinks(htmlFile)) {
    checked.push({ source: link.source, target: link.target, type: link.type });
    if (!fs.existsSync(link.absoluteTarget)) failures.push({ source: link.source, target: link.target, type: link.type });
    else queue.push(link.absoluteTarget);
  }
}

while (queue.length) {
  const cssFile = queue.shift();
  const key = path.resolve(cssFile);
  if (visitedCss.has(key)) continue;
  visitedCss.add(key);

  for (const item of cssImports(cssFile)) {
    checked.push({ source: item.source, target: item.target, type: item.type });
    if (!fs.existsSync(item.absoluteTarget)) failures.push({ source: item.source, target: item.target, type: item.type });
    else queue.push(item.absoluteTarget);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  rootHtmlCount: rootHtmlFiles().length,
  activeCssCount: visitedCss.size,
  checkedCount: checked.length,
  failureCount: failures.length,
  failures,
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
const lines = [
  '# CSS import resolution',
  '',
  `Gerado em: ${report.generatedAt}`,
  '',
  '## Resumo',
  '',
  `- HTMLs raiz avaliados: ${report.rootHtmlCount}`,
  `- CSS ativo/importado visitado: ${report.activeCssCount}`,
  `- Referências CSS verificadas: ${report.checkedCount}`,
  `- Referências ausentes: ${report.failureCount}`,
  '',
  '## Política',
  '',
  '- Todo `<link rel="stylesheet">` local em HTML raiz deve resolver para arquivo existente.',
  '- Todo `@import url(...)` local alcançável a partir dos HTMLs raiz deve resolver para arquivo existente.',
  '- Querystrings de cache busting são ignoradas durante a resolução.',
  '- Arquivos em `reports/generated/` não são tratados como fonte ativa de runtime.',
  '',
  '## Violações',
  '',
];

if (failures.length === 0) {
  lines.push('Nenhuma violação encontrada.');
} else {
  lines.push('| Tipo | Origem | Destino ausente |', '|---|---|---|');
  for (const failure of failures) lines.push(`| ${failure.type} | \`${failure.source}\` | \`${failure.target}\` |`);
}
fs.writeFileSync(DOC_PATH, `${lines.join('\n')}\n`);

if (failures.length > 0) {
  console.error('[audit:css-import-resolution] missing active stylesheet references');
  for (const failure of failures) console.error(`- ${failure.source} -> ${failure.target}`);
  process.exit(1);
}

console.log('[audit:css-import-resolution] ok');
console.log(`- active CSS: ${visitedCss.size}`);
console.log(`- checked: ${checked.length}`);
console.log(`- report: ${rel(REPORT_PATH)}`);
console.log(`- docs: ${rel(DOC_PATH)}`);
