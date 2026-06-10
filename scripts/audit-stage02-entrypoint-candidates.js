#!/usr/bin/env node
/*
 * Stage 02 — Entry point reduction candidates.
 * Diagnostic-only: does not edit HTML/CSS/JS and does not assert that a candidate
 * is removable without visual validation. It classifies redundant direct assets
 * and risky active asset groups so the next runtime patch can be small.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'generated', 'stage02-entrypoint-reduction');
const CRITICAL_PAGES = [
  'index.html',
  'pedidos.html',
  'perfil.html',
  'mensagens.html',
  'notificacoes.html',
  'comunidade.html',
  'resultados.html',
  'detalhe-anuncio.html',
  'ajuda.html',
];
const TARGET_PAGES = [
  'resultados.html',
  'pedidos.html',
  'perfil.html',
  'mensagens.html',
  'index.html',
];

const CSS_IMPORT_RE = /@import\s+(?:url\()?\s*["']?([^"')\s;]+)["']?\s*\)?/g;
const LINK_RE = /<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi;
const HREF_RE = /href=["']([^"']+)["']/i;
const SCRIPT_RE = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

function stripQuery(asset) {
  return String(asset || '').split('?')[0];
}

function isExternal(asset) {
  return /^https?:\/\//i.test(asset) || /^\/\//.test(asset);
}

function normalizeAsset(asset, fromDir = '') {
  const clean = stripQuery(asset).trim();
  if (!clean || isExternal(clean) || clean.startsWith('data:')) return clean;
  const joined = clean.startsWith('/') ? clean.slice(1) : path.posix.normalize(path.posix.join(fromDir.replace(/\\/g, '/'), clean));
  return joined.replace(/^\.\//, '');
}

function readText(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf8');
}

function fileBytes(rel) {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.statSync(full).size : 0;
}

function importantCount(rel) {
  const text = readText(rel);
  return (text.match(/!important/g) || []).length;
}

function directCss(htmlRel) {
  const text = readText(htmlRel);
  const out = [];
  let m;
  while ((m = LINK_RE.exec(text))) {
    const tag = m[0];
    const href = tag.match(HREF_RE)?.[1];
    if (!href || isExternal(href)) continue;
    out.push(normalizeAsset(href));
  }
  return out;
}

function directJs(htmlRel) {
  const text = readText(htmlRel);
  const out = [];
  let m;
  while ((m = SCRIPT_RE.exec(text))) {
    const src = m[1];
    if (!src || isExternal(src)) continue;
    out.push(normalizeAsset(src));
  }
  return out;
}

const importCache = new Map();
function cssImports(cssRel, seen = new Set()) {
  if (importCache.has(cssRel)) return importCache.get(cssRel);
  if (seen.has(cssRel)) return [];
  seen.add(cssRel);
  const text = readText(cssRel);
  const baseDir = path.posix.dirname(cssRel);
  const imports = [];
  let m;
  while ((m = CSS_IMPORT_RE.exec(text))) {
    const imported = normalizeAsset(m[1], baseDir);
    if (!imported || isExternal(imported)) continue;
    imports.push(imported);
    imports.push(...cssImports(imported, seen));
  }
  const unique = [...new Set(imports)];
  importCache.set(cssRel, unique);
  return unique;
}

function ownership(asset) {
  if (asset.startsWith('assets/css/core/')) return 'core';
  if (asset.startsWith('assets/css/components/')) return 'components';
  if (asset.startsWith('assets/css/patterns/')) return 'patterns';
  if (asset.startsWith('assets/css/pages/')) return 'pages';
  if (asset.startsWith('assets/js/core/')) return 'js-core';
  if (asset.startsWith('assets/js/components/')) return 'js-components';
  if (asset.startsWith('assets/js/ui/')) return 'js-ui';
  if (asset.startsWith('assets/js/pages/')) return 'js-pages';
  if (asset.startsWith('assets/js/services/')) return 'js-services';
  if (asset.startsWith('assets/data/')) return 'data';
  return 'other';
}

function loadedCssGraph(htmlRel) {
  const loaded = [];
  for (const css of directCss(htmlRel)) {
    loaded.push({ asset: css, source: 'direct' });
    for (const imported of cssImports(css)) loaded.push({ asset: imported, source: `imported by ${css}` });
  }
  return loaded;
}

function directCssRedundancy(htmlRel) {
  const loadedBefore = new Map();
  const candidates = [];
  for (const css of directCss(htmlRel)) {
    if (loadedBefore.has(css)) {
      candidates.push({
        asset: css,
        importedOrLoadedBeforeBy: loadedBefore.get(css),
        bytes: fileBytes(css),
        important: importantCount(css),
        risk: 'medium',
        reason: 'Direct stylesheet was already loaded/imported earlier. Removing the late direct link may change cascade order, so visual validation is required.',
      });
    }
    if (!loadedBefore.has(css)) loadedBefore.set(css, 'direct link earlier in the same HTML');
    for (const imported of cssImports(css)) {
      if (!loadedBefore.has(imported)) loadedBefore.set(imported, css);
    }
  }
  return candidates;
}

function countBy(list, keyFn) {
  const result = {};
  for (const item of list) {
    const key = keyFn(item);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function summarizePage(htmlRel) {
  const directCssList = directCss(htmlRel);
  const directJsList = directJs(htmlRel);
  const cssGraph = loadedCssGraph(htmlRel);
  const uniqueCss = [...new Map(cssGraph.map((x) => [x.asset, x])).values()];
  const cssBytes = uniqueCss.reduce((n, x) => n + fileBytes(x.asset), 0);
  const cssImportant = uniqueCss.reduce((n, x) => n + importantCount(x.asset), 0);
  const jsBytes = directJsList.reduce((n, x) => n + fileBytes(x), 0);
  const redundantDirectCss = directCssRedundancy(htmlRel);
  const topCssByWeight = uniqueCss
    .map((x) => ({ asset: x.asset, bytes: fileBytes(x.asset), important: importantCount(x.asset), ownership: ownership(x.asset), source: x.source }))
    .sort((a, b) => b.bytes + b.important * 250 - (a.bytes + a.important * 250))
    .slice(0, 12);
  return {
    html: htmlRel,
    critical: CRITICAL_PAGES.includes(htmlRel),
    directCssCount: directCssList.length,
    loadedCssCount: uniqueCss.length,
    directJsCount: directJsList.length,
    cssBytes,
    jsBytes,
    important: cssImportant,
    cssOwnershipCount: countBy(uniqueCss, (x) => ownership(x.asset)),
    jsOwnershipCount: countBy(directJsList, (x) => ownership(x)),
    redundantDirectCss,
    topCssByWeight,
    directCss: directCssList,
    directJs: directJsList,
  };
}

function mdTable(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, '<br>')).join(' | ')} |`).join('\n');
  return `${head}\n${sep}\n${body}`;
}

function main() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const pages = TARGET_PAGES.map(summarizePage);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'diagnostic-only',
    targetPages: TARGET_PAGES,
    pages,
    nextRuntimePatchRecommendation: 'Start with one page only. Prefer resultados.html for CSS rail/card entrypoint analysis or pedidos.html for header transition, but do not remove redundant direct CSS without screenshot parity.',
  };
  fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify(report, null, 2));

  const summaryRows = pages.map((p) => [
    `\`${p.html}\``,
    p.directCssCount,
    p.loadedCssCount,
    `${(p.cssBytes / 1024).toFixed(1)} KB`,
    p.directJsCount,
    `${(p.jsBytes / 1024).toFixed(1)} KB`,
    p.important,
    p.redundantDirectCss.length,
  ]);

  let md = '# Stage 02 — Entry point reduction candidates\n\n';
  md += 'Esta etapa é diagnóstica e segura: não remove CSS/JS ativo e não altera visual. O objetivo é identificar reduções com menor risco antes de qualquer patch runtime.\n\n';
  md += '## Resumo por página alvo\n\n';
  md += mdTable(['Página', 'CSS direto', 'CSS carregado', 'Peso CSS', 'JS direto', 'Peso JS', '!important carregado', 'CSS direto redundante'], summaryRows);
  md += '\n\n## Candidatos de menor risco\n\n';
  for (const page of pages) {
    md += `### \`${page.html}\`\n\n`;
    if (!page.redundantDirectCss.length) {
      md += 'Nenhum CSS direto redundante detectado pela cadeia de imports atual.\n\n';
    } else {
      md += mdTable(['Asset', 'Já carregado/importado por', 'Peso', '!important', 'Risco'], page.redundantDirectCss.map((c) => [
        `\`${c.asset}\``,
        `\`${c.importedOrLoadedBeforeBy}\``,
        `${(c.bytes / 1024).toFixed(1)} KB`,
        c.important,
        c.risk,
      ]));
      md += '\n\n';
    }
    md += 'CSS mais pesados/arriscados carregados nesta página:\n\n';
    md += mdTable(['Asset', 'Owner', 'Fonte', 'Peso', '!important'], page.topCssByWeight.slice(0, 8).map((c) => [
      `\`${c.asset}\``,
      c.ownership,
      c.source === 'direct' ? 'direct' : 'import',
      `${(c.bytes / 1024).toFixed(1)} KB`,
      c.important,
    ]));
    md += '\n\n';
  }
  md += '## Decisão técnica\n\n';
  md += '- Não remover CSS redundante automaticamente nesta etapa, porque muitas duplicidades podem estar funcionando como override tardio acidental.\n';
  md += '- O próximo patch runtime deve escolher uma única página e remover no máximo um grupo coeso de redundâncias, com screenshots antes/depois.\n';
  md += '- A redução real precisa preservar ordem de cascata ou substituir a duplicidade por uma autoridade correta no componente/pattern.\n';
  md += '- Proibido resolver redução de entrypoint criando um CSS `fix/hotfix/final/stage`.\n\n';
  md += '## Próxima ação recomendada\n\n';
  md += 'Executar um patch controlado em `pedidos.html` ou `mensagens.html` para remover apenas duplicidades de componentes já importados por `core/components.css`, validando URL direta e navegação interna. Se não houver validação visual disponível, manter como plano e não alterar runtime.\n';

  fs.writeFileSync(path.join(REPORT_DIR, 'report.md'), md);
  console.log('Stage 02 entrypoint reduction candidates generated.');
  console.log(`Report: ${path.relative(ROOT, path.join(REPORT_DIR, 'report.md'))}`);
  console.log(`Data: ${path.relative(ROOT, path.join(REPORT_DIR, 'summary.json'))}`);
}

main();
