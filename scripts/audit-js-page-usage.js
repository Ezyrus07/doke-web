#!/usr/bin/env node
/*
 * Doke - Global Cycle 43
 * JS per-page usage inventory.
 *
 * Purpose:
 * - Map scripts loaded by each HTML page.
 * - Detect exact duplicate script imports inside a page.
 * - Flag likely over-coupled page/domain scripts.
 * - Produce a cleanup queue without changing runtime behavior.
 *
 * This audit does not mutate source files.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const validationDir = path.join(root, 'docs', 'validation');
const reportPath = path.join(validationDir, 'global-cycle-43-js-page-usage-report.json');
const markdownPath = path.join(root, 'docs', 'GLOBAL-CYCLE-43-JS-PAGE-USAGE.md');

const PAGE_STATUS = {
  'index.html': 'stable-reference',
  'resultados.html': 'marketplace-evolving',
  'perfil.html': 'critical-stable-baseline',
  'detalhe-anuncio.html': 'evolving',
  'pedidos.html': 'operational',
  'mensagens.html': 'critical-communication',
  'comunidade.html': 'community',
  'comunidade-interna.html': 'critical-community-room',
  'notificacoes.html': 'operational',
  'carteira.html': 'evolving-operational',
  'configuracoes.html': 'evolving-operational',
  'pagamento-profissional.html': 'evolving-flow',
  'avaliacao.html': 'evolving-flow',
};

const EXPECTED_PAGE_SLUGS = {
  'index.html': ['home', 'index'],
  'resultados.html': ['result', 'resultados', 'search'],
  'perfil.html': ['perfil', 'profile'],
  'detalhe-anuncio.html': ['detalhe-anuncio', 'detail', 'ad'],
  'pedidos.html': ['pedidos', 'orders'],
  'mensagens.html': ['mensagens', 'messages', 'chat'],
  'comunidade.html': ['comunidade', 'community'],
  'comunidade-interna.html': ['comunidade-interna', 'community', 'channel'],
  'notificacoes.html': ['notificacoes', 'notification'],
  'carteira.html': ['carteira', 'wallet'],
  'configuracoes.html': ['configuracoes', 'settings'],
  'pagamento-profissional.html': ['pagamento', 'payment'],
  'avaliacao.html': ['avaliacao', 'review'],
};

const GLOBAL_ALLOWED_SEGMENTS = [
  '/core/',
  '/ui/',
  '/components/',
  '/services/',
  '/controllers/',
  '/renderers/',
  '/data/',
  '/lib/',
  '/firebase',
  '/supabase',
  '/shared',
];

function walk(dir, predicate, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
      walk(full, predicate, files);
    } else if (predicate(full)) {
      files.push(full);
    }
  }
  return files;
}

function normalizeSrc(src) {
  return src.replace(/^\.\//, '').replace(/^[\/]+/, '').split('?')[0].split('#')[0];
}

function extractScripts(html) {
  const scripts = [];
  const re = /<script\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(html))) {
    const attrs = match[1] || '';
    const srcMatch = attrs.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    if (srcMatch) scripts.push(normalizeSrc(srcMatch[1] || srcMatch[2] || srcMatch[3]));
  }
  return scripts;
}

function categorize(src) {
  if (!src.startsWith('assets/js/')) return 'external-or-relative';
  if (src.includes('/pages/')) return 'page';
  if (src.includes('/core/')) return 'core';
  if (src.includes('/components/')) return 'component';
  if (src.includes('/services/')) return 'service';
  if (src.includes('/controllers/')) return 'controller';
  if (src.includes('/ui/')) return 'ui';
  if (src.includes('/data/')) return 'data';
  if (src.includes('/renderers/')) return 'renderer';
  return 'other-js';
}

function isLikelyPageSpecific(src) {
  return src.startsWith('assets/js/pages/') || src.includes('/pages/');
}

function pageSpecificMismatch(page, src) {
  if (!isLikelyPageSpecific(src)) return false;
  const file = path.basename(src).toLowerCase();
  const allowed = EXPECTED_PAGE_SLUGS[page] || [page.replace('.html', '')];
  return !allowed.some((slug) => file.includes(slug.toLowerCase()));
}

function existsInternal(src) {
  if (/^(https?:)?\/\//.test(src)) return true;
  return fs.existsSync(path.join(root, src));
}

function countBy(items, fn) {
  return items.reduce((acc, item) => {
    const key = fn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function unique(arr) {
  return [...new Set(arr)];
}

function formatList(arr) {
  if (!arr.length) return '- nenhum';
  return arr.map((item) => `- ${item}`).join('\n');
}

fs.mkdirSync(validationDir, { recursive: true });

const htmlFiles = walk(root, (file) => file.endsWith('.html'))
  .map((file) => path.relative(root, file).replace(/\\/g, '/'))
  .filter((file) => !file.startsWith('node_modules/'))
  .sort();

const pages = [];
const globalScriptFrequency = new Map();

for (const htmlPath of htmlFiles) {
  const html = fs.readFileSync(path.join(root, htmlPath), 'utf8');
  const scripts = extractScripts(html);
  const exactCounts = countBy(scripts, (s) => s);
  const duplicates = Object.entries(exactCounts)
    .filter(([, count]) => count > 1)
    .map(([src, count]) => ({ src, count }));

  const missing = scripts.filter((src) => !existsInternal(src));
  const categories = countBy(scripts, categorize);
  const pageSpecificMismatches = scripts.filter((src) => pageSpecificMismatch(path.basename(htmlPath), src));
  const pageScripts = scripts.filter(isLikelyPageSpecific);
  const dataScripts = scripts.filter((src) => src.includes('data') || src.includes('repository') || src.includes('orchestrator'));

  for (const src of unique(scripts)) {
    globalScriptFrequency.set(src, (globalScriptFrequency.get(src) || 0) + 1);
  }

  const findings = [];
  if (duplicates.length) findings.push({ severity: 'high', message: 'script importado mais de uma vez na mesma página', details: duplicates });
  if (missing.length) findings.push({ severity: 'high', message: 'script referenciado não existe', details: missing });
  if (pageSpecificMismatches.length) findings.push({ severity: 'medium', message: 'script de página aparentemente cruzado com outro domínio', details: pageSpecificMismatches });
  if (scripts.length >= 35) findings.push({ severity: 'medium', message: 'página carrega muitos scripts; revisar ownership e lazy loading', details: { count: scripts.length } });
  if (pageScripts.length >= 6) findings.push({ severity: 'medium', message: 'muitos scripts de página; avaliar controller único e módulos internos', details: pageScripts });

  pages.push({
    html: htmlPath,
    status: PAGE_STATUS[path.basename(htmlPath)] || 'unclassified',
    scriptCount: scripts.length,
    uniqueScriptCount: unique(scripts).length,
    categories,
    scripts,
    duplicates,
    missing,
    pageSpecificMismatches,
    dataScripts,
    findings,
  });
}

const mostLoadedScripts = [...globalScriptFrequency.entries()]
  .map(([src, pageCount]) => ({ src, pageCount }))
  .sort((a, b) => b.pageCount - a.pageCount || a.src.localeCompare(b.src));

const criticalPages = pages
  .filter((page) => page.findings.length)
  .sort((a, b) => b.scriptCount - a.scriptCount || a.html.localeCompare(b.html));

const cleanupQueue = criticalPages.map((page) => ({
  html: page.html,
  status: page.status,
  scriptCount: page.scriptCount,
  priority: page.missing.length || page.duplicates.length ? 'alta' : page.scriptCount >= 35 ? 'média' : 'baixa',
  actions: [
    ...(page.missing.length ? ['corrigir scripts inexistentes'] : []),
    ...(page.duplicates.length ? ['remover imports duplicados exatos'] : []),
    ...(page.pageSpecificMismatches.length ? ['avaliar scripts de página cruzados'] : []),
    ...(page.scriptCount >= 35 ? ['mapear scripts não usados antes de remover'] : []),
  ],
}));

const summary = {
  htmlCount: pages.length,
  totalScriptRefs: pages.reduce((sum, page) => sum + page.scriptCount, 0),
  uniqueScriptsLoadedByHtml: mostLoadedScripts.length,
  pagesWithFindings: criticalPages.length,
  duplicateImportPages: pages.filter((p) => p.duplicates.length).length,
  missingImportPages: pages.filter((p) => p.missing.length).length,
  heavyPages: pages.filter((p) => p.scriptCount >= 35).map((p) => ({ html: p.html, scriptCount: p.scriptCount })),
};

const report = {
  generatedAt: new Date().toISOString(),
  cycle: 'Global Cycle 43 - JS page usage map',
  summary,
  pages,
  mostLoadedScripts,
  cleanupQueue,
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const md = `# Ciclo Global 43 — Mapa de JS por página\n\n` +
`Este ciclo é somente diagnóstico. Ele não altera visual, HTML ou CSS.\n\n` +
`## Sumário\n\n` +
`- HTMLs auditados: ${summary.htmlCount}\n` +
`- Referências de script em HTML: ${summary.totalScriptRefs}\n` +
`- Scripts únicos carregados por HTML: ${summary.uniqueScriptsLoadedByHtml}\n` +
`- Páginas com achados: ${summary.pagesWithFindings}\n` +
`- Páginas com imports duplicados exatos: ${summary.duplicateImportPages}\n` +
`- Páginas com scripts ausentes: ${summary.missingImportPages}\n\n` +
`## Páginas mais pesadas\n\n` +
`${summary.heavyPages.length ? summary.heavyPages.map((p) => `- \`${p.html}\`: ${p.scriptCount} scripts`).join('\n') : '- nenhuma página com 35+ scripts'}\n\n` +
`## Scripts mais carregados\n\n` +
`${mostLoadedScripts.slice(0, 20).map((item) => `- \`${item.src}\` — ${item.pageCount} páginas`).join('\n')}\n\n` +
`## Fila de limpeza sugerida\n\n` +
`${cleanupQueue.length ? cleanupQueue.map((item) => `### \`${item.html}\`\n\n- Status: ${item.status}\n- Scripts: ${item.scriptCount}\n- Prioridade: ${item.priority}\n- Ações:\n${formatList(item.actions)}`).join('\n\n') : 'Nenhuma ação imediata.'}\n\n` +
`## Critérios para próximos ciclos\n\n` +
`1. Não remover scripts sem validar comportamento.\n` +
`2. Começar por duplicações exatas e scripts ausentes, se houver.\n` +
`3. Em páginas pesadas, mapear ownership antes de cortar.\n` +
`4. Manter controllers por página e utilitários em \`core/services/components\`.\n` +
`5. Não consolidar visual provisório enquanto limpamos scripts.\n\n`;

fs.writeFileSync(markdownPath, md);

console.log('JS page usage audit completed.');
console.log(`Pages: ${summary.htmlCount}`);
console.log(`Script refs: ${summary.totalScriptRefs}`);
console.log(`Pages with findings: ${summary.pagesWithFindings}`);
if (summary.missingImportPages > 0) {
  console.log(`Missing scripts were found in ${summary.missingImportPages} page(s); see docs/validation/global-cycle-43-js-page-usage-report.json.`);
}
