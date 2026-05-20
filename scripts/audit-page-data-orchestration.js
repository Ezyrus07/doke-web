#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ORCHESTRATOR = 'assets/js/services/page-data-orchestrator.js';
const REPORT_JSON = 'docs/validation/global-cycle-31-page-data-orchestration-report.json';
const REPORT_MD = 'docs/PAGE-DATA-ORCHESTRATION-MAP.md';

const requiredPages = [
  'index',
  'resultados',
  'perfil',
  'detalhe-anuncio',
  'pedidos',
  'carteira',
  'notificacoes',
  'configuracoes',
  'comunidade',
  'mensagens',
  'pagamento',
  'finalizar-pedido',
  'avaliacao',
  'adicionar-cartao'
];

const evolvingPages = new Set([
  'carteira',
  'detalhe-anuncio',
  'resultados',
  'finalizar-pedido',
  'pagamento',
  'configuracoes',
  'avaliacao',
  'adicionar-cartao'
]);

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function normalizeHtmlName(file) {
  return path.basename(file).replace(/\.html$/i, '');
}

function listHtmlFiles() {
  const files = [];
  for (const entry of fs.readdirSync(ROOT)) {
    if (entry.endsWith('.html')) files.push(entry);
  }
  const authDir = path.join(ROOT, 'auth');
  if (fs.existsSync(authDir)) {
    for (const entry of fs.readdirSync(authDir)) {
      if (entry.endsWith('.html')) files.push(path.join('auth', entry).replace(/\\/g, '/'));
    }
  }
  return files.sort();
}

function getScriptSrcs(html) {
  const matches = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
  return matches.map(match => match[1]).filter(src => !/^https?:/i.test(src));
}

function grepFile(file, tokens) {
  if (!exists(file)) return [];
  const content = read(file);
  return tokens.filter(token => content.includes(token));
}

const report = {
  cycle: 'global-cycle-31-page-data-orchestration',
  requiredFiles: [],
  pages: [],
  issues: [],
  notes: []
};

for (const file of [
  ORCHESTRATOR,
  'assets/js/services/repository-boundary.js',
  'assets/js/services/mock-repository-provider.js',
  'docs/DATA-READY-CONTRACTS.md'
]) {
  const ok = exists(file);
  report.requiredFiles.push({ file, exists: ok });
  if (!ok) report.issues.push({ file, type: 'missing-required-file' });
}

let orchestrator = '';
if (exists(ORCHESTRATOR)) {
  orchestrator = read(ORCHESTRATOR);

  for (const page of requiredPages) {
    if (!orchestrator.includes(`${page}: Object.freeze`) && !orchestrator.includes(`'${page}': Object.freeze`)) {
      report.issues.push({ file: ORCHESTRATOR, type: 'missing-page-plan', page });
    }
  }

  for (const token of ['Doke.pageDataOrchestrator', 'getPagePlan', 'getPageResources', 'getPageData', 'Doke.repositoryBoundary.getPageData']) {
    if (!orchestrator.includes(token)) {
      report.issues.push({ file: ORCHESTRATOR, type: 'missing-token', token });
    }
  }

  const forbidden = ['document.', 'querySelector', 'localStorage', 'sessionStorage', 'fetch(', 'supabase', 'firebase'];
  for (const token of forbidden) {
    if (orchestrator.toLowerCase().includes(token.toLowerCase())) {
      report.issues.push({ file: ORCHESTRATOR, type: 'forbidden-runtime-coupling', token });
    }
  }
}

const htmlFiles = listHtmlFiles();
for (const htmlFile of htmlFiles) {
  const page = normalizeHtmlName(htmlFile);
  const html = read(htmlFile);
  const scripts = getScriptSrcs(html);
  const pageScriptCandidates = scripts.filter(src => src.includes('/pages/') || src.includes('/controllers/'));
  const dataHooks = (html.match(/data-[a-z0-9-]+/gi) || []).length;
  const controllerFile = `assets/js/controllers/${page}-controller.js`;
  const pageFile = `assets/js/pages/${page}.js`;
  const loadedRepositoryScripts = scripts.filter(src => src.includes('repository-boundary') || src.includes('mock-repository-provider') || src.includes('page-data-orchestrator'));
  const repositoryTokens = grepFile(controllerFile, ['repositoryBoundary', 'pageDataOrchestrator', 'getPageData']);
    
  report.pages.push({
    html: htmlFile,
    page,
    status: evolvingPages.has(page) ? 'evolving' : 'stable-or-operational',
    scriptCount: scripts.length,
    pageScripts: pageScriptCandidates,
    hasControllerFile: exists(controllerFile),
    hasPageFile: exists(pageFile),
    loadedRepositoryScripts,
    controllerRepositoryTokens: repositoryTokens,
    dataHookCount: dataHooks,
    recommendation: evolvingPages.has(page)
      ? 'prepare structure/data hooks, but do not freeze provisional visual as a global contract'
      : 'prefer controller/page orchestration through repository boundary before adding new static mock blocks'
  });
}

const outDir = path.join(ROOT, 'docs/validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(ROOT, REPORT_JSON), JSON.stringify(report, null, 2) + '\n');

const stableCount = report.pages.filter(p => p.status === 'stable-or-operational').length;
const evolvingCount = report.pages.filter(p => p.status === 'evolving').length;
const controllerCount = report.pages.filter(p => p.hasControllerFile).length;
const pageFileCount = report.pages.filter(p => p.hasPageFile).length;

const lines = [];
lines.push('# Page Data Orchestration Map — Doke');
lines.push('');
lines.push('## Objetivo');
lines.push('');
lines.push('Mapear como cada HTML deve evoluir de conteúdo estático/mockado para dados reais, sem acoplar cards, listas, galerias e estados visuais diretamente ao backend.');
lines.push('');
lines.push('## Resumo');
lines.push('');
lines.push(`- HTMLs mapeados: ${report.pages.length}`);
lines.push(`- Páginas estáveis/operacionais: ${stableCount}`);
lines.push(`- Páginas em evolução: ${evolvingCount}`);
lines.push(`- Páginas com controller dedicado: ${controllerCount}`);
lines.push(`- Páginas com JS em assets/js/pages: ${pageFileCount}`);
lines.push('');
lines.push('## Contrato criado');
lines.push('');
lines.push('- `assets/js/services/page-data-orchestrator.js` centraliza o plano de dados por página.');
lines.push('- Ele usa `Doke.repositoryBoundary.getPageData()` quando a página estiver pronta para consumir dados.');
lines.push('- Ele não manipula DOM, não busca dados diretamente e não conhece Supabase/Firebase.');
lines.push('');
lines.push('## Mapa por HTML');
lines.push('');
lines.push('| HTML | Status | Scripts | Controller | Page JS | Data hooks | Recomendação |');
lines.push('|---|---:|---:|---:|---:|---:|---|');
for (const page of report.pages) {
  lines.push(`| \`${page.html}\` | ${page.status} | ${page.scriptCount} | ${page.hasControllerFile ? 'sim' : 'não'} | ${page.hasPageFile ? 'sim' : 'não'} | ${page.dataHookCount} | ${page.recommendation} |`);
}
lines.push('');
lines.push('## Próxima regra');
lines.push('');
lines.push('Ao mexer em qualquer página daqui para frente, identificar primeiro se o bloco será dinâmico. Se for lista/card/galeria/avaliação, usar `data-*` hooks previsíveis e preparar estado `loading`, `empty`, `error` e `ready`.');
lines.push('');
lines.push('## Próximos passos recomendados');
lines.push('');
lines.push('1. Conectar primeiro uma página de baixo risco ao boundary de dados, sem mudar visual.');
lines.push('2. Priorizar listas de marketplace: serviços, workers, publicações e avaliações.');
lines.push('3. Não congelar visual provisório de páginas em evolução como contrato global.');

fs.writeFileSync(path.join(ROOT, REPORT_MD), lines.join('\n') + '\n');

if (report.issues.length) {
  console.error('Page data orchestration audit failed.');
  console.error(JSON.stringify(report.issues, null, 2));
  process.exit(1);
}

console.log('Page data orchestration audit passed.');
console.log(`Mapped pages: ${report.pages.length}`);
