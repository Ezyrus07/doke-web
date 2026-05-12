#!/usr/bin/env node
/*
 * Maps suspicious/legacy CSS files without changing the UI.
 * This is intentionally diagnostic: no file should be deleted from this report alone.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CSS_ROOT = path.join(ROOT, 'assets', 'css');
const DOCS_DIR = path.join(ROOT, 'docs');
const VALIDATION_DIR = path.join(DOCS_DIR, 'validation');

const FLAGS = [
  { key: 'stage', re: /(^|[-_/])stage\d*($|[-_.])/i, severity: 'high', reason: 'stage/build-step naming suggests temporary migration artifact' },
  { key: 'hotfix', re: /hotfix/i, severity: 'high', reason: 'hotfix naming suggests emergency override' },
  { key: 'fix', re: /(^|[-_/])fix(es)?($|[-_.])/i, severity: 'high', reason: 'fix naming suggests local corrective layer' },
  { key: 'final', re: /(^|[-_/])final($|[-_.])/i, severity: 'medium', reason: 'final naming often indicates accumulated last-pass CSS' },
  { key: 'refinement', re: /refinement/i, severity: 'medium', reason: 'refinement naming often indicates polishing layer over previous CSS' },
  { key: 'parity', re: /parity/i, severity: 'medium', reason: 'parity naming suggests compatibility layer between divergent pages' },
  { key: 'normalization', re: /normalization|standardization/i, severity: 'medium', reason: 'normalization/standardization naming may hide page-specific overrides' },
  { key: 'redesign', re: /redesign/i, severity: 'medium', reason: 'redesign naming may indicate competing visual contract' },
  { key: 'reference', re: /reference/i, severity: 'medium', reason: 'reference naming may indicate frozen baseline or duplicated visual layer' },
  { key: 'compact', re: /compact/i, severity: 'low', reason: 'compact naming may be valid, but can indicate variant-specific overrides' },
  { key: 'legacy', re: /legacy/i, severity: 'high', reason: 'legacy naming explicitly marks old compatibility layer' },
  { key: 'override', re: /override|overrides/i, severity: 'high', reason: 'override naming suggests cascade conflict' },
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function extractCssImports(cssText) {
  const imports = [];
  const re = /@import\s+(?:url\()?['"]([^'")]+)['"]\)?/g;
  let m;
  while ((m = re.exec(cssText))) imports.push(m[1]);
  return imports;
}

function extractHtmlCssLinks(htmlText) {
  const links = [];
  const tagRe = /<link\b[^>]*>/gi;
  const hrefRe = /href=["']([^"']+)["']/i;
  const relRe = /rel=["']([^"']+)["']/i;
  let m;
  while ((m = tagRe.exec(htmlText))) {
    const tag = m[0];
    const href = tag.match(hrefRe)?.[1];
    const relAttr = tag.match(relRe)?.[1] || '';
    if (href && /stylesheet/i.test(relAttr) && href.endsWith('.css')) links.push(href);
  }
  return links;
}

function resolveAsset(fromFile, href) {
  const clean = href.split('#')[0].split('?')[0];
  if (clean.startsWith('http') || clean.startsWith('//')) return null;
  return path.normalize(path.join(path.dirname(fromFile), clean));
}

const cssFiles = walk(CSS_ROOT).filter((f) => f.endsWith('.css'));
const htmlFiles = walk(ROOT).filter((f) => f.endsWith('.html') && !f.includes(`${path.sep}node_modules${path.sep}`));

const cssMeta = new Map();
for (const file of cssFiles) {
  const text = read(file);
  const relative = rel(file);
  const basename = path.basename(file);
  const matched = FLAGS.filter((flag) => flag.re.test(relative));
  cssMeta.set(relative, {
    path: relative,
    sizeBytes: Buffer.byteLength(text, 'utf8'),
    importantCount: (text.match(/!important/g) || []).length,
    importCount: extractCssImports(text).length,
    lineCount: text.split(/\r?\n/).length,
    flags: matched.map((f) => ({ key: f.key, severity: f.severity, reason: f.reason })),
  });
}

const htmlUsage = {};
const cssUsage = new Map();
const missingLinks = [];
for (const htmlFile of htmlFiles) {
  const htmlRel = rel(htmlFile);
  const links = extractHtmlCssLinks(read(htmlFile));
  htmlUsage[htmlRel] = links;
  for (const link of links) {
    const resolved = resolveAsset(htmlFile, link);
    if (!resolved) continue;
    const resolvedRel = rel(resolved);
    if (fs.existsSync(resolved)) {
      if (!cssUsage.has(resolvedRel)) cssUsage.set(resolvedRel, []);
      cssUsage.get(resolvedRel).push(htmlRel);
    } else {
      missingLinks.push({ html: htmlRel, href: link, resolved: resolvedRel });
    }
  }
}

// Also track @import usage between CSS files.
const cssImportUsage = new Map();
for (const file of cssFiles) {
  const fromRel = rel(file);
  const imports = extractCssImports(read(file));
  for (const imp of imports) {
    const resolved = resolveAsset(file, imp);
    if (!resolved) continue;
    const resolvedRel = rel(resolved);
    if (!cssImportUsage.has(resolvedRel)) cssImportUsage.set(resolvedRel, []);
    cssImportUsage.get(resolvedRel).push(fromRel);
  }
}

const flagged = [...cssMeta.values()]
  .filter((item) => item.flags.length)
  .map((item) => ({
    ...item,
    htmlImportedBy: cssUsage.get(item.path) || [],
    cssImportedBy: cssImportUsage.get(item.path) || [],
    directUsageCount: (cssUsage.get(item.path) || []).length,
    cssUsageCount: (cssImportUsage.get(item.path) || []).length,
    score: item.flags.reduce((sum, f) => sum + (f.severity === 'high' ? 3 : f.severity === 'medium' ? 2 : 1), 0) + Math.min(5, item.importantCount / 200) + Math.min(3, item.sizeBytes / 100000),
  }))
  .sort((a, b) => b.score - a.score || b.importantCount - a.importantCount || b.sizeBytes - a.sizeBytes);

const byFlag = {};
for (const item of flagged) {
  for (const flag of item.flags) {
    byFlag[flag.key] = (byFlag[flag.key] || 0) + 1;
  }
}

const topHeavyFlagged = flagged.slice(0, 30).map((item) => ({
  path: item.path,
  flags: item.flags.map((f) => f.key),
  importantCount: item.importantCount,
  sizeKB: Math.round(item.sizeBytes / 1024),
  directUsageCount: item.directUsageCount,
  cssUsageCount: item.cssUsageCount,
}));

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    cssFiles: cssFiles.length,
    htmlFiles: htmlFiles.length,
    flaggedCssFiles: flagged.length,
    missingCssLinks: missingLinks.length,
    totalImportantInFlagged: flagged.reduce((sum, item) => sum + item.importantCount, 0),
  },
  byFlag,
  topHeavyFlagged,
  flagged,
  missingLinks,
};

fs.mkdirSync(VALIDATION_DIR, { recursive: true });
fs.writeFileSync(path.join(VALIDATION_DIR, 'global-cycle-46-legacy-css-map.json'), JSON.stringify(report, null, 2));

function mdTable(rows, headers) {
  const escape = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${headers.map((h) => escape(row[h])).join(' | ')} |`).join('\n');
  return [head, sep, body].join('\n');
}

const topRows = topHeavyFlagged.slice(0, 20).map((item) => ({
  Arquivo: item.path,
  Flags: item.flags.join(', '),
  Important: item.importantCount,
  KB: item.sizeKB,
  HTMLs: item.directUsageCount,
  ImportsCSS: item.cssUsageCount,
}));

const flagRows = Object.entries(byFlag)
  .sort((a, b) => b[1] - a[1])
  .map(([flag, count]) => ({ Flag: flag, Arquivos: count }));

const md = `# Ciclo Global 46 — Mapa de CSS legado/suspeito\n\n` +
`Este relatório é diagnóstico. Nenhum CSS deve ser removido apenas por aparecer aqui. A intenção é identificar camadas com nomes de risco como \`stage\`, \`final\`, \`hotfix\`, \`refinement\`, \`parity\`, \`reference\`, \`override\` e similares.\n\n` +
`## Resumo\n\n` +
`- CSS analisados: **${report.totals.cssFiles}**\n` +
`- HTMLs analisados: **${report.totals.htmlFiles}**\n` +
`- CSS com nome suspeito: **${report.totals.flaggedCssFiles}**\n` +
`- \`!important\` dentro dos CSS suspeitos: **${report.totals.totalImportantInFlagged}**\n` +
`- Links CSS quebrados em HTML: **${report.totals.missingCssLinks}**\n\n` +
`## Flags encontradas\n\n` +
`${mdTable(flagRows, ['Flag', 'Arquivos'])}\n\n` +
`## Top arquivos para revisar primeiro\n\n` +
`${mdTable(topRows, ['Arquivo', 'Flags', 'Important', 'KB', 'HTMLs', 'ImportsCSS'])}\n\n` +
`## Como usar este mapa\n\n` +
`1. **Não apagar em massa.** Primeiro descobrir se o arquivo ainda é importado diretamente por HTML ou por manifesto CSS.\n` +
`2. **Congelar baseline visual** da página que usa o arquivo.\n` +
`3. **Classificar responsabilidade:** core, component, pattern ou page.\n` +
`4. **Migrar regra útil para o lugar correto** antes de remover o arquivo legado.\n` +
`5. **Remover um import por vez**, validando desktop/mobile.\n\n` +
`## Próxima ação recomendada\n\n` +
`Começar pelos arquivos suspeitos que têm muitas ocorrências de \`!important\` e uso concentrado em uma página. Evitar mexer primeiro em arquivos que afetam \`perfil.html\`, \`mensagens.html\` e \`comunidade-interna.html\` sem baseline visual.\n\n` +
`O próximo ciclo recomendado é **Ciclo Global 47 — classificação dos CSS suspeitos por risco de remoção**, separando: remover agora, migrar antes, manter por compatibilidade e bloquear até baseline visual.\n`;

fs.writeFileSync(path.join(DOCS_DIR, 'GLOBAL-CYCLE-46-LEGACY-CSS-MAP.md'), md);

console.log(`Legacy CSS map generated: ${flagged.length} suspicious CSS files, ${missingLinks.length} missing links.`);
