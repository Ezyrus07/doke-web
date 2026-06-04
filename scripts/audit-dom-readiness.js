#!/usr/bin/env node
/*
 * Stage 61C — DOM Readiness Audit
 * Read-only audit: does not edit HTML, CSS or runtime JS.
 */
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

const pages = [
  { file: 'notificacoes.html', risk: 'low', order: 1 },
  { file: 'pedidos.html', risk: 'low', order: 2 },
  { file: 'carteira.html', risk: 'medium', order: 3 },
  { file: 'comunidade.html', risk: 'medium', order: 4 },
  { file: 'resultados.html', risk: 'medium', order: 5 },
  { file: 'anunciar-servico.html', risk: 'medium', order: 6 },
  { file: 'detalhe-anuncio.html', risk: 'high', order: 7 },
  { file: 'perfil.html', risk: 'high', order: 8 },
  { file: 'mensagens.html', risk: 'high', order: 9 },
  { file: 'index.html', risk: 'high', order: 10 },
];

const sensitiveScriptPatterns = [
  /stable-shell-router\.js/,
  /shell/i,
  /sidebar/i,
  /router/i,
  /navigation/i,
];

const surfacePatterns = [
  /class="[^"]*(?:card|list|grid|rail|section|feed|items|results|notifications|orders|messages|wallet|community)[^"]*"/gi,
  /id="[^"]*(?:card|list|grid|rail|section|feed|items|results|notifications|orders|messages|wallet|community)[^"]*"/gi,
  /data-[a-z0-9-]+=/gi,
];

function countMatches(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function getBodyDataPage(content) {
  const bodyMatch = content.match(/<body\b[^>]*>/i);
  if (!bodyMatch) return null;
  const valueMatch = bodyMatch[0].match(/data-page=["']([^"']+)["']/i);
  return valueMatch ? valueMatch[1] : null;
}

function classify({ exists, dataPage, mainCount, surfaceCount, dataHookCount, risk }) {
  if (!exists) return 'missing';
  if (risk === 'high') return 'sensitive-page';
  if (dataPage && mainCount > 0 && surfaceCount >= 6 && dataHookCount >= 1) return 'ready-candidate';
  return 'needs-dom-hooks';
}

function inspectPage(page) {
  const filePath = path.join(rootDir, page.file);
  const exists = fs.existsSync(filePath);

  if (!exists) {
    return {
      ...page,
      exists,
      status: 'missing',
      dataPage: null,
      mainCount: 0,
      surfaceCount: 0,
      dataHookCount: 0,
      inlineStyleCount: 0,
      sensitiveScriptCount: 0,
      notes: ['Arquivo nao encontrado.'],
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const dataPage = getBodyDataPage(content);
  const mainCount = countMatches(content, /<main\b/gi);
  const dataHookCount = countMatches(content, /data-[a-z0-9-]+=/gi);
  const inlineStyleCount = countMatches(content, /\sstyle=["']/gi);
  const sensitiveScriptCount = sensitiveScriptPatterns.reduce(
    (total, pattern) => total + countMatches(content, pattern),
    0
  );
  const surfaceCount = surfacePatterns.reduce(
    (total, pattern) => total + countMatches(content, pattern),
    0
  );

  const notes = [];
  if (!dataPage) notes.push('Sem body[data-page]; recomendavel antes de controller por pagina.');
  if (mainCount === 0) notes.push('Sem <main>; confirmar raiz semantica antes de renderer.');
  if (dataHookCount === 0) notes.push('Sem hooks data-* suficientes; preferir hooks estaveis antes de renderizacao dinamica.');
  if (inlineStyleCount > 0) notes.push('Inline style encontrado no HTML existente; nao corrigido nesta stage.');
  if (page.risk === 'high') notes.push('Pagina sensivel; nao usar como primeira integracao backend.');

  return {
    ...page,
    exists,
    status: classify({ exists, dataPage, mainCount, surfaceCount, dataHookCount, risk: page.risk }),
    dataPage,
    mainCount,
    surfaceCount,
    dataHookCount,
    inlineStyleCount,
    sensitiveScriptCount,
    notes,
  };
}

function assertStageFiles() {
  const required = [
    'docs/DOM_READINESS_STAGE61C.md',
    'scripts/audit-dom-readiness.js',
    '__PATCH_MANIFEST_STAGE61C.md',
    'RODAR_STAGE61C_AUDIT_DOM_READINESS.cmd',
  ];

  return required.filter((relativePath) => !fs.existsSync(path.join(rootDir, relativePath)));
}

function main() {
  const missingStageFiles = assertStageFiles();
  const results = pages.map(inspectPage);
  const missingPages = results.filter((item) => item.status === 'missing');

  console.log('Stage 61C DOM Readiness Audit');
  console.log('='.repeat(34));

  for (const item of results) {
    console.log(`\n[${item.order}] ${item.file}`);
    console.log(`status: ${item.status}`);
    console.log(`risk: ${item.risk}`);
    console.log(`data-page: ${item.dataPage || 'missing'}`);
    console.log(`main: ${item.mainCount}`);
    console.log(`candidate surfaces: ${item.surfaceCount}`);
    console.log(`data hooks: ${item.dataHookCount}`);
    console.log(`inline styles: ${item.inlineStyleCount}`);
    console.log(`sensitive script references: ${item.sensitiveScriptCount}`);
    if (item.notes.length) {
      console.log(`notes: ${item.notes.join(' | ')}`);
    }
  }

  const summary = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  console.log('\nSummary');
  console.log('-'.repeat(34));
  console.log(JSON.stringify(summary, null, 2));

  if (missingStageFiles.length) {
    console.error('\nStage 61C audit: FAILED');
    console.error(`Arquivos da stage ausentes: ${missingStageFiles.join(', ')}`);
    process.exit(1);
  }

  if (missingPages.length) {
    console.error('\nStage 61C audit: FAILED');
    console.error(`Paginas esperadas ausentes: ${missingPages.map((item) => item.file).join(', ')}`);
    process.exit(1);
  }

  console.log('\nStage 61C audit: PASSED');
  console.log(`Paginas verificadas: ${results.length}`);
  console.log('Observacao: este audit e read-only e nao substitui validacao visual Playwright.');
}

main();
