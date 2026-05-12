#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const homeCssPath = path.join(root, 'assets/css/pages/home.css');
const outJson = path.join(root, 'docs/validation/home-css-overrides-audit.json');
const outMd = path.join(root, 'docs/HOME-CSS-OVERRIDE-MAP.md');

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}
function stripQuery(href) {
  return href.split('?')[0];
}
function resolveImport(fromFile, href) {
  const clean = stripQuery(href);
  return path.normalize(path.resolve(path.dirname(fromFile), clean));
}
function rel(abs) {
  return path.relative(root, abs).replace(/\\/g, '/');
}
function extractImports(cssText, fromFile) {
  const imports = [];
  const re = /@import\s+(?:url\()?['"]?([^'"\)\s]+)['"]?\)?[^;]*;/g;
  let m;
  while ((m = re.exec(cssText))) {
    const abs = resolveImport(fromFile, m[1]);
    imports.push({ href: m[1], resolved: abs, exists: fs.existsSync(abs) });
  }
  return imports;
}
function collectCss(file, seen = new Set(), ordered = []) {
  const abs = path.resolve(file);
  if (seen.has(abs) || !fs.existsSync(abs)) return { seen, ordered };
  seen.add(abs);
  ordered.push(abs);
  const css = read(abs);
  for (const imp of extractImports(css, abs)) {
    if (imp.exists) collectCss(imp.resolved, seen, ordered);
  }
  return { seen, ordered };
}
function countImportant(css) {
  return (css.match(/!important/g) || []).length;
}
function selectorCounts(css) {
  const cleaned = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@media[^{]+\{/g, '')
    .replace(/@supports[^{]+\{/g, '');
  const re = /([^{}@]+)\{/g;
  const counts = new Map();
  let m;
  while ((m = re.exec(cleaned))) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    if (!selector || selector.includes(';')) continue;
    counts.set(selector, (counts.get(selector) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([selector, count]) => ({ selector, count }));
}

if (!fs.existsSync(homeCssPath)) {
  console.error('Missing assets/css/pages/home.css');
  process.exit(1);
}

const homeCss = read(homeCssPath);
const imports = extractImports(homeCss, homeCssPath);
const missingImports = imports.filter((i) => !i.exists).map((i) => i.href);
const collected = collectCss(homeCssPath).ordered;
const files = collected.map((file) => {
  const css = read(file);
  return {
    file: rel(file),
    bytes: Buffer.byteLength(css),
    important: countImportant(css),
    imports: extractImports(css, file).length,
  };
}).sort((a,b) => b.important - a.important || b.bytes - a.bytes);

const directIndexCss = (() => {
  const indexPath = path.join(root, 'index.html');
  const html = read(indexPath);
  const re = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>|<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;
  const list = [];
  let m;
  while ((m = re.exec(html))) list.push(m[1] || m[2]);
  return list;
})();

const directDuplicates = directIndexCss.filter((href) => {
  const base = stripQuery(href);
  return imports.some((imp) => rel(imp.resolved) === base);
});

const report = {
  generatedAt: new Date().toISOString(),
  homeCss: 'assets/css/pages/home.css',
  homeCssBytes: Buffer.byteLength(homeCss),
  homeCssImportant: countImportant(homeCss),
  directImportsInHomeCss: imports.length,
  missingImports,
  cssFilesLoadedViaHomeCss: collected.length,
  totalImportantViaHomeCss: files.reduce((sum, f) => sum + f.important, 0),
  directDuplicateIndexImports: directDuplicates,
  topImportantFiles: files.slice(0, 20),
  repeatedSelectorsInHomeCss: selectorCounts(homeCss),
};

fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
const md = `# HOME CSS Override Map\n\n` +
`Auditoria do manifesto \`assets/css/pages/home.css\` para orientar limpeza incremental sem apagar CSS em massa.\n\n` +
`## Resumo\n\n` +
`- CSS direto da home: ${(report.homeCssBytes/1024).toFixed(1)} KB\n` +
`- \`!important\` em \`home.css\`: ${report.homeCssImportant}\n` +
`- imports diretos dentro de \`home.css\`: ${report.directImportsInHomeCss}\n` +
`- CSS carregados via manifesto da home: ${report.cssFilesLoadedViaHomeCss}\n` +
`- \`!important\` totais carregados via manifesto da home: ${report.totalImportantViaHomeCss}\n` +
`- imports ausentes dentro da home: ${report.missingImports.length}\n` +
`- imports diretos duplicados no \`index.html\`: ${report.directDuplicateIndexImports.length}\n\n` +
`## Imports diretos duplicados no index\n\n` +
(report.directDuplicateIndexImports.length ? report.directDuplicateIndexImports.map((x) => `- ${x}`).join('\n') : 'Nenhum após este ciclo.') +
`\n\n## Arquivos com mais !important carregados pela home\n\n` +
report.topImportantFiles.slice(0, 12).map((f) => `- ${f.important.toString().padStart(5)} — ${f.file} (${(f.bytes/1024).toFixed(1)} KB)`).join('\n') +
`\n\n## Seletores repetidos em home.css\n\n` +
(report.repeatedSelectorsInHomeCss.length ? report.repeatedSelectorsInHomeCss.slice(0, 20).map((s) => `- ${s.count}x — \`${s.selector}\``).join('\n') : 'Nenhum seletor repetido relevante detectado.') +
`\n\n## Próxima limpeza segura\n\n` +
`1. Não remover blocos de \`home.css\` ainda.\n` +
`2. Primeiro extrair/validar ownership de service cards, workers e publicações em componentes/patterns.\n` +
`3. Depois reduzir \`!important\` por bloco com screenshot antes/depois.\n` +
`4. Manter \`index.html\` com imports mínimos: core, shell e manifesto da home.\n`;
fs.writeFileSync(outMd, md);

if (missingImports.length) {
  console.error(`Home CSS audit found ${missingImports.length} missing imports.`);
  process.exit(1);
}
console.log(`Home CSS override audit passed. ${collected.length} CSS files via home.css, ${report.totalImportantViaHomeCss} !important.`);
