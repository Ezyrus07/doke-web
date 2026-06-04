#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'generated', 'stage51-page-asset-budget');
const STRICT = process.argv.includes('--strict');

const HTML_EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'reports', 'test-results', 'archive']);
const CRITICAL_PAGES = [
  'index.html',
  'perfil.html',
  'pedidos.html',
  'mensagens.html',
  'notificacoes.html',
  'comunidade.html',
  'resultados.html',
  'detalhe-anuncio.html',
  'ajuda.html',
];

const BUDGETS = {
  critical: {
    cssBytes: 650 * 1024,
    jsBytes: 450 * 1024,
    cssCount: 36,
    jsCount: 34,
    important: 3000,
  },
  default: {
    cssBytes: 720 * 1024,
    jsBytes: 500 * 1024,
    cssCount: 42,
    jsCount: 40,
    important: 3500,
  },
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalize(value) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').split('?')[0].split('#')[0];
}

function isExternal(value) {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('mailto:');
}

function walkHtml(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    if (HTML_EXCLUDE_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    const rel = normalize(path.relative(ROOT, absolute));
    if (entry.isDirectory()) walkHtml(absolute, acc);
    if (entry.isFile() && entry.name.endsWith('.html')) acc.push(rel);
  }
  return acc.sort();
}

function attr(tag, name) {
  const pattern = new RegExp(`\\b${name}=["']([^"']+)["']`, 'i');
  const match = tag.match(pattern);
  return match ? match[1] : null;
}

function resolveFromPage(page, asset) {
  if (!asset || isExternal(asset)) return null;
  return normalize(path.join(path.dirname(page), asset));
}

function collectCssImports(assetPath, seen = new Set()) {
  const normalized = normalize(assetPath);
  if (seen.has(normalized)) return [];
  seen.add(normalized);

  const absolute = path.join(ROOT, normalized);
  const result = [normalized];
  if (!fs.existsSync(absolute)) return result;

  const source = fs.readFileSync(absolute, 'utf8');
  const importPattern = /@import\s+(?:url\()?['"]?([^'")\s]+)['"]?\)?/g;
  let match;
  while ((match = importPattern.exec(source))) {
    const imported = match[1];
    if (isExternal(imported)) continue;
    const resolved = normalize(path.join(path.dirname(normalized), imported));
    result.push(...collectCssImports(resolved, seen));
  }
  return result;
}

function collectHtmlAssets(html, page) {
  const directCss = [];
  const css = [];
  const js = [];

  const linkPattern = /<link\b[^>]*>/gi;
  let link;
  while ((link = linkPattern.exec(html))) {
    const tag = link[0];
    const rel = attr(tag, 'rel');
    const href = attr(tag, 'href');
    if (!rel || !href) continue;
    if (!rel.toLowerCase().split(/\s+/).includes('stylesheet')) continue;
    const resolved = resolveFromPage(page, href);
    if (!resolved) continue;
    directCss.push(resolved);
    css.push(...collectCssImports(resolved));
  }

  const scriptPattern = /<script\b[^>]*>/gi;
  let script;
  while ((script = scriptPattern.exec(html))) {
    const src = attr(script[0], 'src');
    const resolved = resolveFromPage(page, src);
    if (resolved) js.push(resolved);
  }

  return {
    directCss: [...new Set(directCss)],
    css: [...new Set(css)],
    js: [...new Set(js)],
  };
}

function statsFor(asset) {
  const absolute = path.join(ROOT, asset);
  if (!fs.existsSync(absolute)) {
    return { asset, exists: false, bytes: 0, important: 0 };
  }
  const source = fs.readFileSync(absolute, 'utf8');
  return {
    asset,
    exists: true,
    bytes: Buffer.byteLength(source, 'utf8'),
    important: (source.match(/!important/g) || []).length,
  };
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function classifyOwnership(asset) {
  if (asset.startsWith('assets/css/core/')) return 'core';
  if (asset.startsWith('assets/css/components/')) return 'components';
  if (asset.startsWith('assets/css/patterns/')) return 'patterns';
  if (asset.startsWith('assets/css/pages/')) return 'pages';
  if (asset.startsWith('assets/js/core/')) return 'js-core';
  if (asset.startsWith('assets/js/services/')) return 'services';
  if (asset.startsWith('assets/js/controllers/')) return 'controllers';
  if (asset.startsWith('assets/js/renderers/')) return 'renderers';
  if (asset.startsWith('assets/js/pages/')) return 'js-pages';
  if (asset.startsWith('assets/js/components/')) return 'js-components';
  return 'other';
}

function evaluate(page) {
  const budget = CRITICAL_PAGES.includes(page.html) ? BUDGETS.critical : BUDGETS.default;
  const issues = [];
  if (page.cssBytes > budget.cssBytes) issues.push(`CSS acima do orçamento (${formatKb(page.cssBytes)} > ${formatKb(budget.cssBytes)})`);
  if (page.jsBytes > budget.jsBytes) issues.push(`JS acima do orçamento (${formatKb(page.jsBytes)} > ${formatKb(budget.jsBytes)})`);
  if (page.cssCount > budget.cssCount) issues.push(`CSS demais (${page.cssCount} > ${budget.cssCount})`);
  if (page.jsCount > budget.jsCount) issues.push(`JS demais (${page.jsCount} > ${budget.jsCount})`);
  if (page.importantTotal > budget.important) issues.push(`!important carregado alto (${page.importantTotal} > ${budget.important})`);
  if (page.missing.length) issues.push(`${page.missing.length} asset(s) ausente(s)`);
  return issues;
}

function topItems(items, key, amount = 10) {
  return [...items].sort((a, b) => b[key] - a[key]).slice(0, amount);
}

ensureDir(REPORT_DIR);

const pages = walkHtml(ROOT).map((htmlPath) => {
  const html = fs.readFileSync(path.join(ROOT, htmlPath), 'utf8');
  const assets = collectHtmlAssets(html, htmlPath);
  const cssStats = assets.css.map(statsFor);
  const jsStats = assets.js.map(statsFor);
  const missing = [...cssStats, ...jsStats].filter((asset) => !asset.exists).map((asset) => asset.asset);
  const cssBytes = cssStats.reduce((sum, item) => sum + item.bytes, 0);
  const jsBytes = jsStats.reduce((sum, item) => sum + item.bytes, 0);
  const importantTotal = cssStats.reduce((sum, item) => sum + item.important, 0);
  const page = {
    html: htmlPath,
    critical: CRITICAL_PAGES.includes(htmlPath),
    directCss: assets.directCss,
    cssCount: cssStats.length,
    jsCount: jsStats.length,
    cssBytes,
    jsBytes,
    importantTotal,
    missing,
    cssByOwnership: cssStats.reduce((acc, item) => {
      const group = classifyOwnership(item.asset);
      acc[group] = acc[group] || { count: 0, bytes: 0, important: 0 };
      acc[group].count += 1;
      acc[group].bytes += item.bytes;
      acc[group].important += item.important;
      return acc;
    }, {}),
    topCssBySize: topItems(cssStats, 'bytes', 12),
    topCssByImportant: topItems(cssStats, 'important', 12),
    topJsBySize: topItems(jsStats, 'bytes', 12),
  };
  page.issues = evaluate(page);
  page.status = page.issues.length ? 'attention' : 'ok';
  return page;
});

const allCss = new Map();
const allJs = new Map();
for (const page of pages) {
  for (const item of [...page.topCssBySize, ...page.topCssByImportant]) {
    const current = allCss.get(item.asset) || { ...item, pages: new Set() };
    current.pages.add(page.html);
    allCss.set(item.asset, current);
  }
  for (const item of page.topJsBySize) {
    const current = allJs.get(item.asset) || { ...item, pages: new Set() };
    current.pages.add(page.html);
    allJs.set(item.asset, current);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  strict: STRICT,
  htmlCount: pages.length,
  criticalPageCount: pages.filter((page) => page.critical).length,
  pagesOverBudget: pages.filter((page) => page.issues.length).length,
  missingAssetCount: pages.reduce((sum, page) => sum + page.missing.length, 0),
  loadedCssBytesTotal: pages.reduce((sum, page) => sum + page.cssBytes, 0),
  loadedJsBytesTotal: pages.reduce((sum, page) => sum + page.jsBytes, 0),
  loadedImportantTotal: pages.reduce((sum, page) => sum + page.importantTotal, 0),
  pages: pages.sort((a, b) => b.issues.length - a.issues.length || b.importantTotal - a.importantTotal || b.cssBytes - a.cssBytes),
};

fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

const lines = [];
lines.push('# Stage 51 — Page Asset Budget');
lines.push('');
lines.push('Este relatório é diagnóstico. Ele não remove CSS/JS e não altera visual. Use para escolher a próxima redução com menor risco.');
lines.push('');
lines.push('## Resumo');
lines.push('');
lines.push(`- HTMLs auditados: **${summary.htmlCount}**`);
lines.push(`- Páginas críticas auditadas: **${summary.criticalPageCount}**`);
lines.push(`- Páginas acima do orçamento: **${summary.pagesOverBudget}**`);
lines.push(`- Assets ausentes: **${summary.missingAssetCount}**`);
lines.push(`- CSS carregado acumulado: **${formatKb(summary.loadedCssBytesTotal)}**`);
lines.push(`- JS carregado acumulado: **${formatKb(summary.loadedJsBytesTotal)}**`);
lines.push(`- \`!important\` carregado acumulado: **${summary.loadedImportantTotal}**`);
lines.push('');
lines.push('## Orçamentos');
lines.push('');
lines.push('| Tipo | CSS | JS | CSS count | JS count | !important |');
lines.push('|---|---:|---:|---:|---:|---:|');
lines.push(`| Páginas críticas | ${formatKb(BUDGETS.critical.cssBytes)} | ${formatKb(BUDGETS.critical.jsBytes)} | ${BUDGETS.critical.cssCount} | ${BUDGETS.critical.jsCount} | ${BUDGETS.critical.important} |`);
lines.push(`| Demais páginas | ${formatKb(BUDGETS.default.cssBytes)} | ${formatKb(BUDGETS.default.jsBytes)} | ${BUDGETS.default.cssCount} | ${BUDGETS.default.jsCount} | ${BUDGETS.default.important} |`);
lines.push('');
lines.push('## Páginas com atenção');
lines.push('');
lines.push('| Página | CSS | JS | !important | Status | Motivos |');
lines.push('|---|---:|---:|---:|---|---|');
for (const page of summary.pages) {
  lines.push(`| \`${page.html}\` | ${formatKb(page.cssBytes)} / ${page.cssCount} | ${formatKb(page.jsBytes)} / ${page.jsCount} | ${page.importantTotal} | ${page.status} | ${page.issues.join('; ') || '—'} |`);
}
lines.push('');
lines.push('## Próximos alvos por página');
for (const page of summary.pages.slice(0, 14)) {
  lines.push('');
  lines.push(`### \`${page.html}\``);
  lines.push('');
  lines.push(`- CSS direto no HTML: ${page.directCss.map((asset) => `\`${asset}\``).join(', ') || '—'}`);
  lines.push(`- CSS carregado total: **${formatKb(page.cssBytes)}** em **${page.cssCount}** arquivos`);
  lines.push(`- JS carregado total: **${formatKb(page.jsBytes)}** em **${page.jsCount}** arquivos`);
  lines.push(`- \`!important\` carregado: **${page.importantTotal}**`);
  if (page.missing.length) {
    lines.push('- Assets ausentes:');
    for (const asset of page.missing) lines.push(`  - \`${asset}\``);
  }
  lines.push('- CSS com mais `!important`:');
  for (const asset of page.topCssByImportant.filter((item) => item.important > 0).slice(0, 8)) {
    lines.push(`  - \`${asset.asset}\` — ${asset.important}, ${formatKb(asset.bytes)}`);
  }
  lines.push('- CSS mais pesados:');
  for (const asset of page.topCssBySize.slice(0, 8)) {
    lines.push(`  - \`${asset.asset}\` — ${formatKb(asset.bytes)}, ${asset.important} !important`);
  }
  lines.push('- JS mais pesados:');
  for (const asset of page.topJsBySize.slice(0, 6)) {
    lines.push(`  - \`${asset.asset}\` — ${formatKb(asset.bytes)}`);
  }
}
lines.push('');
lines.push('## Decisão técnica');
lines.push('');
lines.push('1. Não remover runtime visual apenas por peso.');
lines.push('2. Primeiro reduzir `!important` em CSS carregado por muitas páginas ou por páginas críticas.');
lines.push('3. Depois consolidar imports locais que já estejam cobertos por manifestos de página.');
lines.push('4. Qualquer remoção de CSS/JS deve ter validação visual ou ficar em patch separado.');

fs.writeFileSync(path.join(REPORT_DIR, 'report.md'), lines.join('\n'));

console.log(`Stage 51 page asset budget completed: ${summary.pagesOverBudget} page(s) need attention.`);
console.log(`Report: reports/generated/stage51-page-asset-budget/report.md`);
console.log(`Data: reports/generated/stage51-page-asset-budget/summary.json`);

if (STRICT && (summary.pagesOverBudget > 0 || summary.missingAssetCount > 0)) {
  process.exit(1);
}
