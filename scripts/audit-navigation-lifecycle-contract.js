#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const CONTRACT_PATH = path.join(ROOT, 'config/navigation-lifecycle-contract.json');
const REPORT_DIR = path.join(ROOT, 'reports/generated');
const JSON_REPORT = path.join(REPORT_DIR, 'navigation-lifecycle-audit-stage-02.json');
const CSV_REPORT = path.join(REPORT_DIR, 'navigation-lifecycle-navigation-inventory.csv');
const MD_REPORT = path.join(REPORT_DIR, 'navigation-lifecycle-audit-stage-02.md');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function csv(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeRelative(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function walk(directory, predicate, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, predicate, output);
    else if (predicate(absolute)) output.push(absolute);
  }
  return output;
}

function scriptSources(html) {
  return Array.from(html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi), (match) => match[1]);
}

function firstAttribute(html, name) {
  const match = html.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
  return match ? match[1] : '';
}

function navigationRecommendation(method, destination, file) {
  const internalHtml = destination && !/^(?:https?:|mailto:|tel:|#)/i.test(destination) && /\.html(?:[?#]|$)/i.test(destination);
  const isGuardOwner = /(?:route-guard|professional-access|admin-access|auth-service)/i.test(file);
  if (method === 'history.back') return 'Use a canonical back helper with deterministic fallback and scroll restoration.';
  if (method === 'history.pushState' || method === 'history.replaceState') return 'Keep history mutation inside the canonical navigation authority.';
  if (method === 'location.replace') return isGuardOwner
    ? 'Delegate to canonical navigation with replace:true and an explicit guard reason.'
    : 'Use replace only for mandatory redirects; otherwise delegate to canonical internal navigation.';
  if (method === 'location.href' || method === 'location.assign') return internalHtml
    ? 'Delegate relative app routes to canonical internal navigation; reserve document navigation for external exits.'
    : 'Document navigation is acceptable only when the destination is external or shell preservation is impossible.';
  if (method === 'DokeNavigate') return 'Retain temporarily as compatibility adapter; migrate implementation to the canonical navigation facade.';
  if (method === 'local.navigate') return 'Classify the local helper and make it delegate to the canonical navigation facade.';
  return 'Classify ownership and delegate to the canonical navigation authority.';
}

function classifyNavigation(method, destination, file, snippet) {
  if (method.startsWith('history.')) return method === 'history.back' ? 'browser-history' : 'history-mutation';
  if (/guard|permission|professional-access|admin-access|auth-service/i.test(`${file} ${snippet}`) || method === 'location.replace') return 'guard-or-mandatory';
  if (destination && /^(?:https?:|mailto:|tel:)/i.test(destination)) return 'external-document';
  if (destination && /\.html(?:[?#]|$)/i.test(destination)) return 'internal-route';
  if (method === 'DokeNavigate') return 'internal-route-adapter';
  if (method === 'local.navigate') return 'local-navigation-helper';
  return 'unclassified';
}

if (!fs.existsSync(CONTRACT_PATH)) {
  console.error('[audit:navigation-lifecycle-contract] config/navigation-lifecycle-contract.json não encontrado.');
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
const excluded = new Set(contract.excludedRuntimeSurfaces || []);
const sourceFiles = [
  ...walk(ROOT, (file) => path.dirname(file) === ROOT && file.endsWith('.html')),
  ...walk(path.join(ROOT, 'auth'), (file) => file.endsWith('.html')),
  ...walk(path.join(ROOT, 'assets/js'), (file) => file.endsWith('.js'))
].filter((file) => !excluded.has(normalizeRelative(file)));

const navigationPatterns = [
  { method: 'location.href', regex: /(?:window\.)?location\.href\s*=\s*([^;\n]+)/g },
  { method: 'location.assign', regex: /(?:window\.)?location\.assign\s*\(\s*([^\n)]*)/g },
  { method: 'location.replace', regex: /(?:window\.)?location\.replace\s*\(\s*([^\n)]*)/g },
  { method: 'history.pushState', regex: /(?:window\.)?history\.pushState\s*\(/g },
  { method: 'history.replaceState', regex: /(?:window\.)?history\.replaceState\s*\(/g },
  { method: 'history.back', regex: /(?:window\.)?history\.back\s*\(/g },
  { method: 'DokeNavigate', regex: /\bDokeNavigate\s*\(\s*([^\n)]*)/g },
  { method: 'local.navigate', regex: /\bnavigate\s*\(\s*([^\n)]*)/g }
]

const navigationInventory = [];
for (const filePath of sourceFiles) {
  const file = normalizeRelative(filePath);
  const source = fs.readFileSync(filePath, 'utf8');
  for (const pattern of navigationPatterns) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(source))) {
      const line = lineNumberAt(source, match.index);
      const sourceLine = source.split(/\r?\n/)[line - 1] || '';
      const rawArgument = pattern.method.startsWith('history.') ? '' : String(match[1] || '').trim();
      const literalMatch = rawArgument.match(/^(["'`])([^"'`]*)\1/);
      const destination = literalMatch ? literalMatch[2] : rawArgument.replace(/[,;].*$/, '').trim();
      if (pattern.method === 'local.navigate' && /function\s+navigate|(?:const|let|var)\s+navigate/.test(sourceLine)) continue;
      navigationInventory.push({
        file,
        line,
        method: pattern.method,
        destination,
        type: classifyNavigation(pattern.method, destination, file, sourceLine),
        snippet: sourceLine.trim().slice(0, 240),
        recommendation: navigationRecommendation(pattern.method, destination, file)
      });
      if (match[0].length === 0) pattern.regex.lastIndex += 1;
    }
  }
}

const methodCounts = navigationInventory.reduce((acc, item) => {
  acc[item.method] = (acc[item.method] || 0) + 1;
  return acc;
}, {});

const priorityPages = (contract.priorityPages || []).map((page) => {
  const absolute = path.join(ROOT, page);
  if (!fs.existsSync(absolute)) return { page, exists: false };
  const html = fs.readFileSync(absolute, 'utf8');
  const scripts = scriptSources(html);
  const preloaderTag = html.match(/<[^>]+data-doke-document-preloader[^>]*>/i)?.[0] || '';
  const boundaryTag = html.match(/<[^>]+data-state-boundary=["'][^"']+["'][^>]*>/i)?.[0] || '';
  return {
    page,
    exists: true,
    hasNavigationLifecycle: scripts.some((src) => src.includes('assets/js/core/navigation-lifecycle.js')),
    hasDocumentPreloader: /data-doke-document-preloader/i.test(html),
    documentPreloaderMode: firstAttribute(preloaderTag, 'data-doke-document-preloader-mode') || 'document',
    hasPageHydrationScript: scripts.some((src) => src.includes('assets/js/core/page-hydration.js')),
    hasStableShellRouter: scripts.some((src) => src.includes('assets/js/core/stable-shell-router.js')),
    hasStructuralSkeleton: /data-[\w-]*(?:hydration|guard|access|review)-skeleton/i.test(html),
    hasHydrationReadySurface: /data-[\w-]*hydration-ready/i.test(html),
    boundaryState: firstAttribute(boundaryTag, 'data-view-state') || 'undeclared',
    boundaryAriaBusy: firstAttribute(boundaryTag, 'aria-busy') || 'undeclared',
    scriptCount: scripts.length
  };
});

const findings = [];
function finding(severity, code, message, files) {
  findings.push({ severity, code, message, files: files || [] });
}

const announceCss = fs.existsSync(path.join(ROOT, 'assets/css/pages/anunciar-servico.css'))
  ? read('assets/css/pages/anunciar-servico.css')
  : '';
const announcePage = priorityPages.find((item) => item.page === 'anunciar-servico.html');
if (/professional-access-state[^}]+visibility:\s*hidden/is.test(announceCss) && announcePage && !announcePage.hasStructuralSkeleton) {
  finding('P0', 'GUARD_ZERO_SURFACE', 'anunciar-servico oculta a superfície protegida enquanto o guard resolve, mas não possui skeleton/pending estrutural próprio.', [
    'anunciar-servico.html',
    'assets/css/pages/anunciar-servico.css',
    'assets/js/services/professional-access-service.js'
  ]);
}

const adminHtml = fs.existsSync(path.join(ROOT, 'admin.html')) ? read('admin.html') : '';
const adminJs = fs.existsSync(path.join(ROOT, 'assets/js/pages/admin.js')) ? read('assets/js/pages/admin.js') : '';
const adminReviewHtml = fs.existsSync(path.join(ROOT, 'admin-verificacao.html')) ? read('admin-verificacao.html') : '';
const adminReviewJs = fs.existsSync(path.join(ROOT, 'assets/js/pages/admin-verificacao.js')) ? read('assets/js/pages/admin-verificacao.js') : '';
const adminAccessSource = fs.existsSync(path.join(ROOT, 'assets/js/services/admin-access-service.js'))
  ? read('assets/js/services/admin-access-service.js')
  : '';

if (!/data-admin-access-skeleton/.test(adminHtml)
  || !/data-admin-dashboard[^>]*hidden/.test(adminHtml)
  || !/adminAccessService\(\)/.test(adminJs)
  || !/access\.guardPage/.test(adminJs)) {
  finding('P0', 'ADMIN_DASHBOARD_GUARD_SURFACE_MISSING', 'admin.html deve manter skeleton visível e dashboard oculto até o guard administrativo canônico autorizar.', [
    'admin.html',
    'assets/js/pages/admin.js',
    'assets/js/services/admin-access-service.js'
  ]);
}

if (!/data-admin-review-skeleton/.test(adminReviewHtml)
  || !/data-admin-review-content[^>]*hidden/.test(adminReviewHtml)
  || !/access\.guardPage/.test(adminReviewJs)) {
  finding('P0', 'ADMIN_REVIEW_GUARD_SURFACE_MISSING', 'admin-verificacao.html deve iniciar com skeleton estrutural, conteúdo sensível oculto e guard canônico antes da hidratação.', [
    'admin-verificacao.html',
    'assets/js/pages/admin-verificacao.js',
    'assets/js/services/admin-access-service.js'
  ]);
}

if (!/guard\.begin/.test(adminAccessSource)
  || !/guard\.allow/.test(adminAccessSource)
  || !/guard\.redirect/.test(adminAccessSource)
  || !/replace:\s*true/.test(adminAccessSource)
  || !/forceDocument:\s*true/.test(adminAccessSource)) {
  finding('P0', 'ADMIN_GUARD_NOT_CANONICAL', 'O guard administrativo deve publicar pending/allowed/redirecting e usar replace com navegação de documento para negações obrigatórias.', [
    'assets/js/services/admin-access-service.js'
  ]);
}

const adminReviewScripts = scriptSources(adminReviewHtml);
const duplicatedAdminReviewScripts = adminReviewScripts.filter((src, index) => adminReviewScripts.indexOf(src) !== index);
if (duplicatedAdminReviewScripts.length) {
  finding('P1', 'ADMIN_REVIEW_DUPLICATE_SCRIPTS', 'admin-verificacao.html carrega scripts duplicados, permitindo boot e listeners concorrentes.', [
    'admin-verificacao.html'
  ]);
}

const preloaderSource = read('assets/js/core/document-preloader.js');
const hydrationSource = read('assets/js/core/page-hydration.js');
if (/MIN_VISIBLE_MS\s*=\s*\d+/.test(preloaderSource) && /minDuration/.test(hydrationSource)) {
  finding('P1', 'STACKED_MIN_DURATION', 'Boot de documento e hidratação possuem controles independentes de duração mínima, permitindo latência percebida acumulada.', [
    'assets/js/core/document-preloader.js',
    'assets/js/core/page-hydration.js'
  ]);
}

const lifecycleFacadePath = 'assets/js/core/navigation-lifecycle.js';
const lifecycleFacadeExists = fs.existsSync(path.join(ROOT, lifecycleFacadePath));
const lifecycleFacadeSource = lifecycleFacadeExists ? read(lifecycleFacadePath) : '';
const entryModeDelegated = /lifecycle\.entry/.test(preloaderSource) && /lifecycle\?\.entry/.test(hydrationSource);
if (!entryModeDelegated && /hasRecentInternalNavigation/.test(preloaderSource) && /hasRecentInternalNavigation/.test(hydrationSource)) {
  finding('P1', 'DUPLICATE_ENTRY_MODE_DETECTION', 'Boot e hydration detectam hard/internal separadamente sem delegar primeiro para a fachada canônica.', [
    'assets/js/core/document-preloader.js',
    'assets/js/core/page-hydration.js'
  ]);
}

const routerCandidates = ['assets/js/core/app.js', 'assets/js/core/stable-shell-router.js', 'assets/js/core/social-page-router.js']
  .filter((file) => fs.existsSync(path.join(ROOT, file)));
const appSource = fs.existsSync(path.join(ROOT, 'assets/js/core/app.js')) ? read('assets/js/core/app.js') : '';
const stableRouterSource = fs.existsSync(path.join(ROOT, 'assets/js/core/stable-shell-router.js')) ? read('assets/js/core/stable-shell-router.js') : '';
const adaptersCentralized = lifecycleFacadeExists
  && /registerAdapter\('legacy-shell'/.test(appSource)
  && /registerAdapter\('stable-shell'/.test(stableRouterSource)
  && /window\.DokeNavigate\s*=\s*go/.test(lifecycleFacadeSource);
if (routerCandidates.length > 1 && !adaptersCentralized) {
  finding('P1', 'MULTIPLE_NAVIGATION_OWNERS', 'Há múltiplos módulos com mutação de rota/histórico e fallback de documento sem precedência centralizada.', routerCandidates);
}
if (!lifecycleFacadeExists) {
  finding('P0', 'MISSING_LIFECYCLE_FACADE', 'A fachada core canônica de navegação/lifecycle não existe.', [lifecycleFacadePath]);
}

for (const page of priorityPages) {
  if (!page.exists) {
    finding('P0', 'MISSING_PRIORITY_PAGE', `Página prioritária ausente: ${page.page}.`, [page.page]);
    continue;
  }
  if (!page.hasNavigationLifecycle) {
    finding('P1', 'PRIORITY_PAGE_WITHOUT_LIFECYCLE_FACADE', `${page.page} não carrega a fachada canônica antes dos adapters.`, [page.page]);
  }
  if (page.hasDocumentPreloader && !page.hasStructuralSkeleton && page.boundaryState === 'loading') {
    finding('P1', 'LOADING_WITHOUT_STRUCTURAL_SKELETON', `${page.page} declara loading, mas não possui skeleton estrutural canônico.`, [page.page]);
  }
  if (page.hasPageHydrationScript && page.boundaryState === 'ready' && page.hasHydrationReadySurface) {
    finding('P1', 'READY_BOUNDARY_WITH_HIDDEN_HYDRATION_CONTENT', `${page.page} declara boundary ready enquanto superfícies de hydration começam ocultas.`, [page.page]);
  }
}

const directInternalMutations = navigationInventory.filter((item) =>
  item.type === 'internal-route' && ['location.href', 'location.assign', 'location.replace'].includes(item.method)
);
if (directInternalMutations.length) {
  finding('P1', 'DIRECT_INTERNAL_LOCATION_MUTATIONS', `${directInternalMutations.length} navegações internas ainda ignoram a fachada compartilhada.`,
    Array.from(new Set(directInternalMutations.map((item) => item.file))).sort());
}

const severityOrder = { P0: 0, P1: 1, P2: 2 };
findings.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9) || a.code.localeCompare(b.code));

const report = {
  status: findings.some((item) => item.severity === 'P0') ? 'blocked-by-p0-findings' : findings.length ? 'findings' : 'pass',
  strict: STRICT,
  generatedAt: new Date().toISOString(),
  contract: {
    name: contract.contract,
    version: contract.version,
    stage: contract.stage,
    sourceOfTruth: contract.sourceOfTruth
  },
  scope: {
    sourceFilesScanned: sourceFiles.length,
    excludedRuntimeSurfaces: Array.from(excluded),
    priorityPages: priorityPages.length
  },
  coreFacade: {
    exists: lifecycleFacadeExists,
    entryModeDelegated,
    adaptersCentralized,
    priorityCoverage: priorityPages.filter((page) => page.hasNavigationLifecycle).length
  },
  navigation: {
    totalOccurrences: navigationInventory.length,
    filesWithOccurrences: new Set(navigationInventory.map((item) => item.file)).size,
    methodCounts,
    directInternalMutations: directInternalMutations.length,
    inventory: navigationInventory
  },
  priorityPages,
  findings,
  nextStage: 'Continuar a Etapa 7 com as páginas públicas e de descoberta restantes, antes da remoção de legado e auditoria final.'
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(JSON_REPORT, JSON.stringify(report, null, 2) + '\n');

const csvRows = [
  ['file', 'line', 'method', 'destination', 'type', 'snippet', 'recommendation'],
  ...navigationInventory.map((item) => [item.file, item.line, item.method, item.destination, item.type, item.snippet, item.recommendation])
];
fs.writeFileSync(CSV_REPORT, csvRows.map((row) => row.map(csv).join(',')).join('\n') + '\n');

const pageTable = priorityPages.map((page) =>
  `| \`${page.page}\` | ${page.hasNavigationLifecycle ? 'sim' : 'não'} | ${page.hasDocumentPreloader ? page.documentPreloaderMode : 'não'} | ${page.hasPageHydrationScript ? 'sim' : 'não'} | ${page.hasStructuralSkeleton ? 'sim' : 'não'} | ${page.boundaryState} |`
).join('\n');
const findingList = findings.map((item) =>
  `- **${item.severity} ${item.code}** — ${item.message}${item.files.length ? ` (${item.files.map((file) => `\`${file}\``).join(', ')})` : ''}`
).join('\n');
const methodSummary = Object.entries(methodCounts).sort((a, b) => b[1] - a[1]).map(([method, count]) => `- ${method}: ${count}`).join('\n');

fs.writeFileSync(MD_REPORT, `# Relatório gerado — navegação e lifecycle\n\nStatus: **${report.status}**  \nArquivos-fonte analisados: ${report.scope.sourceFilesScanned}  \nOcorrências de navegação: ${report.navigation.totalOccurrences} em ${report.navigation.filesWithOccurrences} arquivos.\n\n## Métodos encontrados\n\n${methodSummary || '- nenhum'}\n\n## Páginas prioritárias\n\n| Página | Facade | Preloader | Hydration | Skeleton | Boundary |\n|---|---:|---|---:|---:|---|\n${pageTable}\n\n## Findings\n\n${findingList || '- Nenhum finding.'}\n\n## Próxima etapa\n\n${report.nextStage}\n`);

console.log('[audit:navigation-lifecycle-contract] concluído');
console.log(`- status: ${report.status}`);
console.log(`- navegações: ${report.navigation.totalOccurrences} em ${report.navigation.filesWithOccurrences} arquivos`);
console.log(`- findings: ${findings.length} (${findings.filter((item) => item.severity === 'P0').length} P0)`);
console.log(`- report: ${path.relative(ROOT, JSON_REPORT)}`);

if (STRICT && findings.some((item) => item.severity === 'P0')) process.exit(1);
