#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const VALIDATION_DIR = path.join(DOCS_DIR, 'validation');
fs.mkdirSync(VALIDATION_DIR, { recursive: true });

const HTML_EXCLUDE_DIRS = new Set(['node_modules', '.git', 'test-results', 'archive']);
const SUSPICIOUS_RE = /(hotfix|fix|final|stage|novo|ajuste|redesign|refinement|parity|contract|legacy|backup)/i;
const CRITICAL_HTML = new Set([
  'index.html',
  'resultados.html',
  'perfil.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade-interna.html',
]);
const EVOLVING_HTML = new Set([
  'carteira.html',
  'detalhe-anuncio.html',
  'resultados.html',
  'finalizar-pedido.html',
  'pagamento.html',
  'configuracoes.html',
  'comunidade-interna.html',
  'avaliacao.html',
  'adicionar-cartao.html',
]);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const absolute = path.join(dir, entry.name);
    const rel = path.relative(ROOT, absolute).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (HTML_EXCLUDE_DIRS.has(entry.name)) continue;
      walk(absolute, acc);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      acc.push(rel);
    }
  }
  return acc.sort();
}

function isExternalAsset(asset) {
  return /^(https?:)?\/\//i.test(asset) || asset.startsWith('data:') || asset.startsWith('mailto:');
}

function normalizeAsset(asset) {
  return asset.replace(/\\/g, '/').replace(/^\.\//, '').split('?')[0].split('#')[0];
}

function resolvePageAsset(pageHtmlPath, asset) {
  if (!asset || isExternalAsset(asset)) return null;
  const pageDir = path.dirname(pageHtmlPath);
  return normalizeAsset(path.normalize(path.join(pageDir, asset)));
}

function collectCssImportsFromAsset(assetPath, seen = new Set()) {
  const normalized = normalizeAsset(assetPath);
  if (seen.has(normalized)) return [];
  seen.add(normalized);

  const absolute = path.join(ROOT, normalized);
  if (!fs.existsSync(absolute)) return [normalized];

  const source = fs.readFileSync(absolute, 'utf8');
  const imports = [];
  const importPattern = /@import\s+(?:url\()?['"]?([^'")\s]+)['"]?\)?/g;
  let match;

  while ((match = importPattern.exec(source))) {
    const importedRaw = match[1];
    if (isExternalAsset(importedRaw)) continue;
    const imported = normalizeAsset(path.join(path.dirname(normalized), importedRaw));
    imports.push(...collectCssImportsFromAsset(imported, seen));
  }

  return [normalized, ...imports];
}

function getCssAssets(html, pageHtmlPath) {
  const assets = [];
  const linkPattern = /<link\b[^>]*>/gi;
  let match;

  while ((match = linkPattern.exec(html))) {
    const tag = match[0];
    const relMatch = tag.match(/\brel=["']([^"']+)["']/i);
    const hrefMatch = tag.match(/\bhref=["']([^"']+)["']/i);
    if (!relMatch || !hrefMatch) continue;

    const relValues = relMatch[1].toLowerCase().split(/\s+/).filter(Boolean);
    if (!relValues.includes('stylesheet')) continue;

    const resolved = resolvePageAsset(pageHtmlPath, hrefMatch[1]);
    if (!resolved) continue;
    assets.push(...collectCssImportsFromAsset(resolved));
  }

  return assets;
}

function getScripts(html, pageHtmlPath) {
  const scripts = [];
  const scriptPattern = /<script\b[^>]*>/gi;
  let match;
  while ((match = scriptPattern.exec(html))) {
    const tag = match[0];
    const src = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (!src) continue;
    const resolved = resolvePageAsset(pageHtmlPath, src[1]);
    if (resolved) scripts.push(resolved);
  }
  return scripts;
}

function getInlineStyleCount(html) {
  const matches = html.match(/\bstyle\s*=/gi);
  return matches ? matches.length : 0;
}

function fileStats(asset) {
  const absolute = path.join(ROOT, asset);
  if (!fs.existsSync(absolute)) return { exists: false, bytes: 0, important: 0 };
  const source = fs.readFileSync(absolute, 'utf8');
  return {
    exists: true,
    bytes: Buffer.byteLength(source, 'utf8'),
    important: (source.match(/!important/g) || []).length,
  };
}

function severityFor(page) {
  const cssCount = page.css.length;
  const jsCount = page.js.length;
  const important = page.importantTotal;
  const broken = page.missingAssets.length;
  const suspicious = page.suspiciousCss.length;
  if (broken || cssCount >= 40 || jsCount >= 40 || important >= 2500) return 'Crítica';
  if (cssCount >= 25 || jsCount >= 25 || important >= 800 || suspicious >= 5) return 'Alta';
  if (cssCount >= 12 || jsCount >= 12 || important >= 150 || suspicious >= 2 || page.inlineStyleCount) return 'Média';
  return 'Baixa';
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const htmlFiles = walk(ROOT);
const pages = htmlFiles.map((htmlPath) => {
  const absolute = path.join(ROOT, htmlPath);
  const html = fs.readFileSync(absolute, 'utf8');
  const css = [...new Set(getCssAssets(html, htmlPath).map(normalizeAsset))];
  const js = [...new Set(getScripts(html, htmlPath))];
  const cssStats = css.map((asset) => ({ asset, ...fileStats(asset) }));
  const jsStats = js.map((asset) => ({ asset, ...fileStats(asset) }));
  const missingAssets = [...cssStats, ...jsStats].filter((item) => !item.exists).map((item) => item.asset);
  const suspiciousCss = css.filter((asset) => SUSPICIOUS_RE.test(asset));
  const importantTotal = cssStats.reduce((sum, item) => sum + item.important, 0);
  const cssBytes = cssStats.reduce((sum, item) => sum + item.bytes, 0);
  const jsBytes = jsStats.reduce((sum, item) => sum + item.bytes, 0);
  const inlineStyleCount = getInlineStyleCount(html);
  const page = {
    html: htmlPath,
    css,
    js,
    cssCount: css.length,
    jsCount: js.length,
    cssBytes,
    jsBytes,
    importantTotal,
    inlineStyleCount,
    missingAssets,
    suspiciousCss,
    cssStats: cssStats.sort((a, b) => b.important - a.important || b.bytes - a.bytes),
    jsStats: jsStats.sort((a, b) => b.bytes - a.bytes),
    isCriticalSurface: CRITICAL_HTML.has(htmlPath),
    isEvolvingSurface: EVOLVING_HTML.has(htmlPath),
  };
  page.severity = severityFor(page);
  return page;
});

const allCss = new Map();
const allJs = new Map();
for (const page of pages) {
  for (const css of page.cssStats) {
    const curr = allCss.get(css.asset) || { asset: css.asset, pages: [], bytes: css.bytes, important: css.important, exists: css.exists };
    curr.pages.push(page.html);
    allCss.set(css.asset, curr);
  }
  for (const js of page.jsStats) {
    const curr = allJs.get(js.asset) || { asset: js.asset, pages: [], bytes: js.bytes, exists: js.exists };
    curr.pages.push(page.html);
    allJs.set(js.asset, curr);
  }
}

const cssShared = [...allCss.values()].filter((item) => item.pages.length >= 3).sort((a, b) => b.pages.length - a.pages.length || b.important - a.important).slice(0, 40);
const cssHeavyImportant = [...allCss.values()].sort((a, b) => b.important - a.important).slice(0, 30);
const cssHeavySize = [...allCss.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 30);
const pagesBySeverity = [...pages].sort((a, b) => {
  const order = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };
  return order[a.severity] - order[b.severity] || b.cssCount - a.cssCount || b.importantTotal - a.importantTotal;
});

const summary = {
  generatedAt: new Date().toISOString(),
  htmlCount: pages.length,
  uniqueCssCount: allCss.size,
  uniqueJsCount: allJs.size,
  brokenAssetCount: pages.reduce((sum, page) => sum + page.missingAssets.length, 0),
  inlineStyleCount: pages.reduce((sum, page) => sum + page.inlineStyleCount, 0),
  loadedImportantTotal: pages.reduce((sum, page) => sum + page.importantTotal, 0),
  cssFileImportantTotal: [...allCss.values()].reduce((sum, item) => sum + item.important, 0),
  severityCount: pages.reduce((acc, page) => {
    acc[page.severity] = (acc[page.severity] || 0) + 1;
    return acc;
  }, {}),
  pages,
  cssShared,
  cssHeavyImportant,
  cssHeavySize,
};

fs.writeFileSync(path.join(VALIDATION_DIR, 'global-cycle-4-page-css-inventory.json'), JSON.stringify(summary, null, 2));

const lines = [];
lines.push('# Global Cycle 4 — Inventário de CSS/JS por HTML');
lines.push('');
lines.push('Este relatório mapeia imports por página antes de qualquer remoção de CSS antigo. Ele é diagnóstico: não muda visual e não decide remoção automática.');
lines.push('');
lines.push('## Resumo');
lines.push('');
lines.push(`- HTMLs auditados: **${summary.htmlCount}**`);
lines.push(`- CSS únicos carregados por HTML: **${summary.uniqueCssCount}**`);
lines.push(`- JS únicos carregados por HTML: **${summary.uniqueJsCount}**`);
lines.push(`- Imports internos quebrados encontrados: **${summary.brokenAssetCount}**`);
lines.push(`- Ocorrências de \`style=\"\"\` em HTMLs: **${summary.inlineStyleCount}**`);
lines.push(`- Soma de \`!important\` nos CSS carregados pelas páginas: **${summary.loadedImportantTotal}**`);
lines.push('');
lines.push('## Severidade por página');
lines.push('');
lines.push('| HTML | Severidade | CSS | JS | !important carregado | Inline style | Observação |');
lines.push('|---|---:|---:|---:|---:|---:|---|');
for (const page of pagesBySeverity) {
  const flags = [];
  if (page.isCriticalSurface) flags.push('superfície crítica');
  if (page.isEvolvingSurface) flags.push('em evolução');
  if (page.missingAssets.length) flags.push(`${page.missingAssets.length} asset(s) quebrado(s)`);
  if (page.suspiciousCss.length) flags.push(`${page.suspiciousCss.length} CSS suspeito(s)`);
  lines.push(`| \`${page.html}\` | ${page.severity} | ${page.cssCount} | ${page.jsCount} | ${page.importantTotal} | ${page.inlineStyleCount} | ${flags.join('; ') || '—'} |`);
}
lines.push('');
lines.push('## CSS mais compartilhados');
lines.push('');
lines.push('| CSS | Páginas | !important | Tamanho |');
lines.push('|---|---:|---:|---:|');
for (const item of cssShared.slice(0, 25)) {
  lines.push(`| \`${item.asset}\` | ${item.pages.length} | ${item.important} | ${formatKb(item.bytes)} |`);
}
lines.push('');
lines.push('## CSS carregados com mais `!important`');
lines.push('');
lines.push('| CSS | !important | Páginas | Tamanho |');
lines.push('|---|---:|---:|---:|');
for (const item of cssHeavyImportant.slice(0, 25)) {
  lines.push(`| \`${item.asset}\` | ${item.important} | ${item.pages.length} | ${formatKb(item.bytes)} |`);
}
lines.push('');
lines.push('## CSS carregados mais pesados');
lines.push('');
lines.push('| CSS | Tamanho | !important | Páginas |');
lines.push('|---|---:|---:|---:|');
for (const item of cssHeavySize.slice(0, 25)) {
  lines.push(`| \`${item.asset}\` | ${formatKb(item.bytes)} | ${item.important} | ${item.pages.length} |`);
}
lines.push('');
lines.push('## Diagnóstico por HTML');
lines.push('');
for (const page of pagesBySeverity) {
  lines.push(`### \`${page.html}\``);
  lines.push('');
  lines.push(`- Severidade: **${page.severity}**`);
  lines.push(`- CSS carregados: **${page.cssCount}** (${formatKb(page.cssBytes)})`);
  lines.push(`- JS carregados: **${page.jsCount}** (${formatKb(page.jsBytes)})`);
  lines.push(`- \`!important\` carregado: **${page.importantTotal}**`);
  lines.push(`- Inline styles: **${page.inlineStyleCount}**`);
  if (page.isEvolvingSurface) lines.push('- Status: **HTML em evolução** — não consolidar visual provisório como contrato global.');
  if (page.isCriticalSurface) lines.push('- Status: **superfície crítica** — exige baseline visual antes de limpeza.');
  if (page.missingAssets.length) {
    lines.push('- Imports quebrados:');
    for (const asset of page.missingAssets) lines.push(`  - \`${asset}\``);
  }
  if (page.suspiciousCss.length) {
    lines.push('- CSS suspeitos/legados carregados:');
    for (const asset of page.suspiciousCss.slice(0, 12)) lines.push(`  - \`${asset}\``);
    if (page.suspiciousCss.length > 12) lines.push(`  - ...mais ${page.suspiciousCss.length - 12}`);
  }
  lines.push('- CSS com maior peso técnico nesta página:');
  for (const css of page.cssStats.slice(0, 8)) {
    lines.push(`  - \`${css.asset}\` — ${formatKb(css.bytes)}, ${css.important} !important`);
  }
  lines.push('- Ação recomendada:');
  if (page.severity === 'Crítica') {
    lines.push('  - Congelar screenshot/baseline antes de mexer. Reduzir por blocos pequenos, começando por imports suspeitos e componentes duplicados.');
  } else if (page.severity === 'Alta') {
    lines.push('  - Mapear imports por responsabilidade e remover legado apenas após validar tela desktop/mobile.');
  } else if (page.isEvolvingSurface) {
    lines.push('  - Preparar estrutura, mas manter visual flexível porque a página ainda será redesenhada.');
  } else {
    lines.push('  - Manter monitorada e evitar novos imports locais desnecessários.');
  }
  lines.push('');
}
lines.push('## Próxima ação recomendada');
lines.push('');
lines.push('1. Não remover CSS em massa.');
lines.push('2. Usar este inventário para escolher o primeiro grupo de limpeza.');
lines.push('3. Começar pelo contrato global de componentes compartilhados e pelo shell/container, não por redesign de páginas provisórias.');
lines.push('4. Para páginas críticas, exigir baseline visual antes/depois.');
lines.push('5. Para páginas em evolução, limpar estrutura e imports, mas não cristalizar visual provisório como contrato global.');

fs.writeFileSync(path.join(DOCS_DIR, 'GLOBAL-PAGE-ASSET-INVENTORY.md'), lines.join('\n'));

if (summary.brokenAssetCount > 0) {
  console.warn(`Page asset inventory completed with ${summary.brokenAssetCount} missing asset reference(s).`);
} else {
  console.log('Page asset inventory completed with 0 missing asset references.');
}
console.log(`Report: docs/GLOBAL-PAGE-ASSET-INVENTORY.md`);
console.log(`Data: docs/validation/global-cycle-4-page-css-inventory.json`);
