#!/usr/bin/env node
/*
 * Stage 03 — Rail/Header contract audit
 * Safe diagnostic only: does not change runtime files.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_PAGES = [
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

const OUT_DIR = path.join(ROOT, 'reports/generated/stage03-rail-header-contract');
const REPORT_MD = path.join(OUT_DIR, 'report.md');
const REPORT_JSON = path.join(OUT_DIR, 'summary.json');

const HEADER_PATTERNS = [
  /\.app-header\b/g,
  /\.app-header__inner\b/g,
  /\.home-side-meta\b/g,
  /mobile-app-shell/g,
  /app-header-canonical/g,
  /topbar/g,
  /header-actions/g,
];

const RAIL_PATTERNS = [
  /--doke-shared-page-width/g,
  /--doke-desktop-page-available/g,
  /--doke-current-page-rail/g,
  /--doke-desktop-page-max/g,
  /--doke-mobile-shell-edge/g,
  /shared-page-width/g,
  /desktop-page-rail/g,
  /page-rail/g,
  /content-rail/g,
];

const RISK_PATTERNS = [
  /!important/g,
  /\.app-shell\b/g,
  /\.sidebar\b/g,
  /body\[[^\]]*data-page/g,
  /body\./g,
  /html\./g,
  /min-width\s*:/g,
  /max-width\s*:/g,
  /width\s*:/g,
  /margin-inline/g,
  /padding-inline/g,
];

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function normalizeAsset(url) {
  if (!url) return null;
  const clean = url.split('?')[0].split('#')[0];
  if (!clean || clean.startsWith('http') || clean.startsWith('//')) return null;
  return clean.replace(/^\.\//, '');
}

function extractLinkedCss(htmlText) {
  const out = [];
  const re = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(htmlText))) {
    const asset = normalizeAsset(m[1]);
    if (asset) out.push(asset);
  }
  return out;
}

function extractImports(cssText, fromFile) {
  const fromDir = path.dirname(fromFile);
  const out = [];
  const re = /@import\s+(?:url\()?['"]([^'")]+)['"]\)?/gi;
  let m;
  while ((m = re.exec(cssText))) {
    const raw = normalizeAsset(m[1]);
    if (!raw) continue;
    const resolved = raw.startsWith('assets/') ? raw : path.normalize(path.join(fromDir, raw)).replace(/\\/g, '/');
    out.push(resolved);
  }
  return out;
}

function collectCssGraph(entryFiles) {
  const visited = new Set();
  const stack = [...entryFiles];
  while (stack.length) {
    const file = stack.pop();
    if (!file || visited.has(file) || !exists(file)) continue;
    visited.add(file);
    if (!file.endsWith('.css')) continue;
    const text = read(file);
    for (const imp of extractImports(text, file)) stack.push(imp);
  }
  return [...visited].sort();
}

function countMatches(text, patterns) {
  return patterns.reduce((sum, pattern) => {
    const matches = text.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
}

function classifyOwner(file) {
  if (file.includes('/core/')) return 'core';
  if (file.includes('/components/')) return 'components';
  if (file.includes('/patterns/')) return 'patterns';
  if (file.includes('/pages/')) return 'pages';
  return 'other';
}

function scanCssFile(file) {
  const text = read(file);
  return {
    file,
    owner: classifyOwner(file),
    bytes: Buffer.byteLength(text),
    headerHits: countMatches(text, HEADER_PATTERNS),
    railHits: countMatches(text, RAIL_PATTERNS),
    riskHits: countMatches(text, RISK_PATTERNS),
    important: (text.match(/!important/g) || []).length,
  };
}

function scorePage(page) {
  const htmlText = read(page);
  const linkedCss = extractLinkedCss(htmlText);
  const cssGraph = collectCssGraph(linkedCss);
  const cssScans = cssGraph.map(scanCssFile);
  const totals = cssScans.reduce((acc, item) => {
    acc.bytes += item.bytes;
    acc.headerHits += item.headerHits;
    acc.railHits += item.railHits;
    acc.riskHits += item.riskHits;
    acc.important += item.important;
    acc.pageAuthorityHits += item.owner === 'pages' ? item.headerHits + item.railHits : 0;
    return acc;
  }, { bytes: 0, headerHits: 0, railHits: 0, riskHits: 0, important: 0, pageAuthorityHits: 0 });
  const topRiskFiles = cssScans
    .filter(item => item.headerHits || item.railHits || item.important)
    .sort((a, b) => (b.important + b.headerHits * 10 + b.railHits * 10) - (a.important + a.headerHits * 10 + a.railHits * 10))
    .slice(0, 10);
  const pageLevelAuthority = cssScans
    .filter(item => item.owner === 'pages' && (item.headerHits || item.railHits))
    .sort((a, b) => (b.headerHits + b.railHits) - (a.headerHits + a.railHits))
    .slice(0, 12);
  return {
    page,
    directCss: linkedCss.length,
    loadedCss: cssGraph.length,
    totals,
    topRiskFiles,
    pageLevelAuthority,
  };
}

function makeMarkdown(summary) {
  const lines = [];
  lines.push('# Stage 03 — Rail/Header contract audit');
  lines.push('');
  lines.push('Esta etapa é diagnóstica e segura: não altera arquivos runtime de layout. O objetivo é preparar o Passo 3 antes de mexer em rail, largura, header, topbar ou shell.');
  lines.push('');
  lines.push('## Resumo por página alvo');
  lines.push('');
  lines.push('| Página | CSS direto | CSS carregado | Peso CSS | Hits header | Hits rail | Hits de risco | !important | Autoridade page sobre header/rail |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const item of summary.pages) {
    lines.push(`| \`${item.page}\` | ${item.directCss} | ${item.loadedCss} | ${(item.totals.bytes / 1024).toFixed(1)} KB | ${item.totals.headerHits} | ${item.totals.railHits} | ${item.totals.riskHits} | ${item.totals.important} | ${item.totals.pageAuthorityHits} |`);
  }
  lines.push('');
  lines.push('## Leitura técnica');
  lines.push('');
  lines.push('- O próximo passo não deve ser um patch visual amplo. Rail/header precisam de contrato único antes de correções de alinhamento isoladas.');
  lines.push('- Arquivos em `pages` podem posicionar blocos da própria página, mas não devem redefinir shell, sidebar, header global ou tokens de largura sem escopo e justificativa.');
  lines.push('- Páginas com alto número de hits de `header/rail` em CSS de page devem ser tratadas antes de consolidar cards, porque cards dependem de um rail previsível.');
  lines.push('- `!important` em arquivos de shell/header/rail é risco direto para diferenças entre URL direta, navegação interna e estado loading/ready.');
  lines.push('');
  lines.push('## Ordem recomendada para o Passo 3');
  lines.push('');
  lines.push('1. Congelar contrato desktop de rail/header sem alterar cards.');
  lines.push('2. Auditar `body[data-page]` e classes de shell que entram tarde via JS.');
  lines.push('3. Escolher uma página com sintoma recente (`resultados.html` ou `pedidos.html`) e corrigir apenas rail/header.');
  lines.push('4. Só depois replicar o contrato para páginas internas críticas.');
  lines.push('5. Não consolidar cards enquanto rail/header ainda estiverem instáveis.');
  lines.push('');
  for (const item of summary.pages) {
    lines.push(`## ${item.page}`);
    lines.push('');
    lines.push('### Arquivos mais arriscados carregados');
    lines.push('');
    if (!item.topRiskFiles.length) {
      lines.push('Nenhum arquivo de alto risco encontrado pelos padrões desta auditoria.');
    } else {
      lines.push('| Asset | Owner | Peso | Hits header | Hits rail | !important |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: |');
      for (const asset of item.topRiskFiles) {
        lines.push(`| \`${asset.file}\` | ${asset.owner} | ${(asset.bytes / 1024).toFixed(1)} KB | ${asset.headerHits} | ${asset.railHits} | ${asset.important} |`);
      }
    }
    lines.push('');
    lines.push('### CSS de page tocando header/rail');
    lines.push('');
    if (!item.pageLevelAuthority.length) {
      lines.push('Nenhum CSS de page com hits relevantes de header/rail foi encontrado.');
    } else {
      lines.push('| Asset | Hits header | Hits rail | !important |');
      lines.push('| --- | ---: | ---: | ---: |');
      for (const asset of item.pageLevelAuthority) {
        lines.push(`| \`${asset.file}\` | ${asset.headerHits} | ${asset.railHits} | ${asset.important} |`);
      }
    }
    lines.push('');
  }
  lines.push('## Critério para o próximo patch runtime');
  lines.push('');
  lines.push('- Alterar no máximo 1 página alvo por patch.');
  lines.push('- Não mexer em cards no mesmo patch de rail/header.');
  lines.push('- Não adicionar `!important`.');
  lines.push('- Não criar arquivo novo de remendo.');
  lines.push('- Validar URL direta e navegação interna.');
  lines.push('- Validar pelo menos 390x844, 820x1180 e 1366x768 quando houver mudança visual.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const existingPages = TARGET_PAGES.filter(exists);
  const pages = existingPages.map(scorePage);
  const summary = {
    generatedAt: new Date().toISOString(),
    targetPages: existingPages,
    pages,
  };
  fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2));
  fs.writeFileSync(REPORT_MD, makeMarkdown(summary));
  console.log('Stage 03 rail/header contract audit generated.');
  console.log(`Report: ${path.relative(ROOT, REPORT_MD)}`);
  console.log(`Data: ${path.relative(ROOT, REPORT_JSON)}`);
}

main();
