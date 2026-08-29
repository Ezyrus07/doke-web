'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config/domain-completion-matrix.json');
const SNAPSHOT_PATH = path.join(ROOT, 'docs/validation/domain-completion-staging-snapshot.json');
const REPORT_PATH = path.join(ROOT, 'reports/generated/domain-completion-matrix-report.json');
const DOC_PATH = path.join(ROOT, 'docs/DOMAIN-COMPLETION-MATRIX.md');
const WRITE = process.argv.includes('--write');
const normalizeLineEndings = (value) => String(value ?? '').replace(/\r\n?/g, '\n');
const PLAYWRIGHT_ROUTE_FETCH_SIGNAL = /\broute\s*\.\s*fetch\s*\(/g;
const PLAYWRIGHT_TEST_IMPORT = /(?:require\s*\(\s*['\"]@playwright\/test['\"]\s*\)|from\s+['\"]@playwright\/test['\"])/;

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'playwright-report',
  'test-results',
  'reports',
  'coverage',
  'dist',
  'build',
  'archive',
]);
const GENERATED_SCAN_PATHS = new Set([
  'docs/DOMAIN-COMPLETION-MATRIX.md',
  'docs/HOME-AUTHORITY-CLASSIFICATION.md',
  'docs/PAGE-ASSET-AUTHORITY-MATRIX.md',
]);
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.html', '.css', '.sql', '.json', '.md']);
const SIGNALS = Object.freeze({
  localStorage: /\blocalStorage\b/g,
  sessionStorage: /\bsessionStorage\b/g,
  mock: /\bmock(?:Data|Repository|Provider|\b)|useMockData|mock-data/gi,
  network: /\bfetch\s*\(|\bcreateClient\s*\(|\.from\s*\(|\.rpc\s*\(|\.invoke\s*\(/g,
  directSupabase: /\bcreateClient\s*\(|\.from\s*\(|\.rpc\s*\(/g,
  todo: /\bTODO\b|notImplementedHandler|NOT_IMPLEMENTED|not implemented/gi
});

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeRel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function isIgnored(file) {
  const relative = normalizeRel(file);
  return relative.split('/').some((segment) => IGNORE_DIRS.has(segment))
    || relative === 'docs/validation'
    || relative.startsWith('docs/validation/')
    || GENERATED_SCAN_PATHS.has(relative);
}

function resolveScanRoot(value) {
  const exact = path.join(ROOT, value);
  if (fs.existsSync(exact)) return [exact];
  const dir = path.dirname(exact);
  const prefix = path.basename(exact);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.startsWith(prefix))
    .map((name) => path.join(dir, name));
}

function walk(entry, result) {
  if (!fs.existsSync(entry) || isIgnored(entry)) return;
  const stat = fs.statSync(entry);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(entry)) walk(path.join(entry, name), result);
    return;
  }
  if (!TEXT_EXTENSIONS.has(path.extname(entry).toLowerCase())) return;
  if (stat.size > 2_000_000) return;
  result.add(entry);
}

function scanFiles(scanRoots) {
  const files = new Set();
  for (const root of scanRoots || []) {
    for (const resolved of resolveScanRoot(root)) walk(resolved, files);
  }
  return Array.from(files).sort();
}

function signalCount(text, regex) {
  regex.lastIndex = 0;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function networkSignalCount(text, file) {
  const total = signalCount(text, SIGNALS.network);
  if (!total) return 0;
  const relative = normalizeRel(file);
  if (!relative.startsWith('tests/e2e/') || !PLAYWRIGHT_TEST_IMPORT.test(text)) return total;
  return Math.max(0, total - signalCount(text, PLAYWRIGHT_ROUTE_FETCH_SIGNAL));
}

function scanSignals(files) {
  const totals = Object.fromEntries(Object.keys(SIGNALS).map((key) => [key, 0]));
  const fileIndex = Object.fromEntries(Object.keys(SIGNALS).map((key) => [key, []]));
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const [key, regex] of Object.entries(SIGNALS)) {
      const count = key === 'network' ? networkSignalCount(text, file) : signalCount(text, regex);
      if (!count) continue;
      totals[key] += count;
      fileIndex[key].push({ file: normalizeRel(file), count });
    }
  }
  return { totals, files: fileIndex };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key];
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function listRootHtml() {
  const output = [];
  const visit = (dir, depth) => {
    if (depth > 2 || !fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      if (IGNORE_DIRS.has(name) || name === 'docs' || name === 'labs' || name === 'tools') continue;
      const file = path.join(dir, name);
      const stat = fs.statSync(file);
      if (stat.isDirectory()) visit(file, depth + 1);
      else if (name.endsWith('.html')) output.push(normalizeRel(file));
    }
  };
  visit(ROOT, 0);
  return output.sort();
}

function markdownList(items, empty = 'Nenhum.') {
  if (!items || !items.length) return empty;
  return items.map((item) => `- \`${item}\``).join('\n');
}

function blockerLabel(blocker) {
  return `- **${blocker.id} · ${blocker.severity.toUpperCase()} · ${blocker.category}:** ${blocker.description} _(${blocker.targetPhase})_`;
}

function formatStatus(value) {
  return String(value || '').replaceAll('_', ' ');
}

function generateMarkdown(matrix, snapshot, report) {
  const maturityCounts = countBy(matrix.domains, 'maturity');
  const statusCounts = countBy(matrix.domains, 'productionGate');
  const allBlockers = matrix.domains.flatMap((domain) => domain.blockers || []);
  const criticalCount = allBlockers.filter((item) => item.severity === 'critical').length;
  const average = report.summary.averageMaturity.toFixed(2);
  const lines = [];

  lines.push('# Doke — Matriz de Conclusão dos Domínios');
  lines.push('');
  lines.push('Este é o mapa operacional obrigatório para concluir a lógica da Doke. Ele cruza o código ativo, os contratos/testes existentes e um snapshot do Supabase de staging. Não substitui os contratos de cada domínio; determina **ordem, maturidade, autoridade, bloqueadores e gate de saída**.');
  lines.push('');
  lines.push('## Resumo executivo');
  lines.push('');
  lines.push(`- Domínios/programas mapeados: **${matrix.domains.length}**.`);
  lines.push(`- Fluxos críticos mapeados: **${matrix.criticalFlows.length}**.`);
  lines.push(`- Maturidade média atual: **${average}/6**.`);
  lines.push(`- Bloqueadores críticos explícitos: **${criticalCount}**.`);
  lines.push(`- Domínios prontos para produção: **${statusCounts.ready || 0}**.`);
  lines.push(`- Runtime padrão: dados **${matrix.runtimeBaseline.dataProvider}**, auth **${matrix.runtimeBaseline.authProvider}**, rede **${matrix.runtimeBaseline.enableNetworkRequests ? 'ativa' : 'desativada'}**.`);
  lines.push('');
  lines.push('A leitura correta é: a Doke possui fundações e canários avançados, especialmente em pedidos e operação, mas o produto público ainda é **híbrido/mock por padrão** e a superfície de segurança bloqueia promoção para produção.');
  lines.push('');
  lines.push('## Snapshot real do staging');
  lines.push('');
  lines.push(`Observado em \`${snapshot.observedAt}\` no projeto \`${snapshot.projectRef}\`.`);
  lines.push('');
  lines.push('| Indicador | Valor |');
  lines.push('| --- | ---: |');
  lines.push(`| Tabelas públicas | ${snapshot.tableSummary.publicTotal} |`);
  lines.push(`| Tabelas públicas sem RLS | ${snapshot.tableSummary.publicRlsDisabled} |`);
  lines.push(`| Tabelas com RLS sem policies | ${snapshot.tableSummary.publicRlsNoPolicies} |`);
  lines.push(`| Funções SECURITY DEFINER | ${snapshot.securityDefinerSummary.total} |`);
  lines.push(`| SECURITY DEFINER executáveis por anon | ${snapshot.securityDefinerSummary.anonExecutable} |`);
  lines.push(`| SECURITY DEFINER executáveis por authenticated | ${snapshot.securityDefinerSummary.authenticatedExecutable} |`);
  lines.push(`| Tabelas no Realtime | ${snapshot.realtimeTables.length} |`);
  lines.push(`| Edge Functions ativas | ${snapshot.edgeFunctions.length} |`);
  lines.push(`| Crons operacionais ativos | ${snapshot.cronJobs.filter((job) => job.active).length} |`);
  lines.push('');
  lines.push('### Dívida de RLS que bloqueia produção');
  lines.push('');
  lines.push(snapshot.rlsDisabledTables.map((item) => `\`${item}\``).join(', ') + '.');
  lines.push('');
  lines.push('RLS habilitado, mas sem policy: ' + snapshot.rlsEnabledNoPolicies.map((item) => `\`${item}\``).join(', ') + '.');
  lines.push('');
  lines.push('## Escala de maturidade');
  lines.push('');
  lines.push('| Nível | Significado | Quantidade |');
  lines.push('| ---: | --- | ---: |');
  for (const [level, label] of Object.entries(matrix.maturityScale)) {
    lines.push(`| ${level} | ${formatStatus(label)} | ${maturityCounts[level] || 0} |`);
  }
  lines.push('');
  lines.push('## Visão geral dos domínios');
  lines.push('');
  lines.push('| Ordem | ID | Domínio | Maturidade | UI atual | Autoridade server-side | Evidência | Segurança | Produção |');
  lines.push('| ---: | --- | --- | ---: | --- | --- | --- | --- | --- |');
  for (const domain of matrix.domains.slice().sort((a, b) => a.priority - b.priority)) {
    lines.push(`| ${domain.priority} | ${domain.id} | ${domain.name} | ${domain.maturity}/6 | ${formatStatus(domain.userFacingAuthority)} | ${formatStatus(domain.serverAuthority)} | ${formatStatus(domain.stagingEvidence)} | ${formatStatus(domain.securityGate)} | ${formatStatus(domain.productionGate)} |`);
  }
  lines.push('');
  lines.push('## Ordem técnica obrigatória');
  lines.push('');
  lines.push(matrix.mandatorySequence.map((id, index) => `${index + 1}. **${id}** — ${matrix.domains.find((domain) => domain.id === id)?.name || 'fase dependente'}.`).join('\n'));
  lines.push('');
  lines.push('A ordem pode receber sublotes internos, mas nenhum domínio pode ser promovido ignorando suas dependências ou seu gate de saída.');
  lines.push('');
  lines.push('## Fluxos críticos ponta a ponta');
  lines.push('');
  lines.push('| ID | Fluxo | Estado | Owner | Etapas | Bloqueadores |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const flow of matrix.criticalFlows) {
    lines.push(`| ${flow.id} | ${flow.name} | ${formatStatus(flow.status)} | ${flow.owner} | ${flow.steps.join(' → ')} | ${flow.blockers.join(', ')} |`);
  }
  lines.push('');
  lines.push('## Detalhamento por domínio');
  lines.push('');
  for (const domain of matrix.domains.slice().sort((a, b) => a.priority - b.priority)) {
    const observed = report.domains.find((item) => item.id === domain.id);
    lines.push(`### ${domain.id} — ${domain.name}`);
    lines.push('');
    lines.push(`**Objetivo:** ${domain.objective}`);
    lines.push('');
    lines.push(`**Estado:** maturidade ${domain.maturity}/6; UI ${formatStatus(domain.userFacingAuthority)}; servidor ${formatStatus(domain.serverAuthority)}; staging ${formatStatus(domain.stagingEvidence)}; segurança ${formatStatus(domain.securityGate)}; produção ${formatStatus(domain.productionGate)}.`);
    lines.push('');
    lines.push(`**Evidência estática observada:** ${observed.filesMatched} arquivos no escopo; ${observed.signals.localStorage} referências a localStorage; ${observed.signals.sessionStorage} a sessionStorage; ${observed.signals.mock} referências mock; ${observed.signals.network} referências de rede/Supabase; ${observed.signals.todo} marcadores de implementação pendente.`);
    lines.push('');
    if (domain.pages.length) {
      lines.push('**Páginas:** ' + domain.pages.map((item) => `\`${item}\``).join(', ') + '.');
      lines.push('');
    }
    if (domain.tables.length) {
      lines.push('**Tabelas/autoridades de dados:** ' + domain.tables.map((item) => `\`${item}\``).join(', ') + '.');
      lines.push('');
    }
    if (domain.edgeFunctions.length || domain.crons.length) {
      if (domain.edgeFunctions.length) lines.push('**Edge Functions:** ' + domain.edgeFunctions.map((item) => `\`${item}\``).join(', ') + '.');
      if (domain.crons.length) lines.push('**Crons:** ' + domain.crons.map((item) => `\`${item}\``).join(', ') + '.');
      lines.push('');
    }
    lines.push('**Evidências:**');
    lines.push(domain.evidence.map((item) => `- ${item}`).join('\n') || '- Nenhuma evidência registrada.');
    lines.push('');
    lines.push('**Bloqueadores:**');
    lines.push(domain.blockers.map(blockerLabel).join('\n') || '- Nenhum.');
    lines.push('');
    lines.push('**Próximas ações:**');
    lines.push(domain.nextActions.map((item) => `- ${item}`).join('\n') || '- Nenhuma.');
    lines.push('');
    lines.push('**Gate de saída:**');
    lines.push(domain.exitCriteria.map((item) => `- ${item}`).join('\n') || '- Não definido.');
    lines.push('');
  }
  lines.push('## Regras de atualização');
  lines.push('');
  lines.push('1. Atualizar primeiro `config/domain-completion-matrix.json`.');
  lines.push('2. Regenerar com `npm run write:domain-completion-matrix`.');
  lines.push('3. Validar com `npm run audit:domain-completion-matrix`.');
  lines.push('4. Um domínio só sobe de maturidade quando o gate de saída tiver evidência vinculada.');
  lines.push('5. Snapshot de staging deve ser regenerado após migrations, grants, realtime, storage ou Edge Functions relevantes.');
  lines.push('6. Relatórios históricos não podem promover maturidade sozinhos; o runtime e o staging atuais vencem.');
  lines.push('');
  lines.push('## Próximo lote obrigatório');
  lines.push('');
  lines.push('**SEC-001 — Segurança, RLS, grants e autoridade dos dados.** A execução deve começar por inventário e hardening em lotes pequenos, com testes negativos por persona e sem ativar mais escrita real antes do fechamento da superfície exposta.');
  lines.push('');
  lines.push(`_Documento gerado de forma determinística a partir de \`config/domain-completion-matrix.json\`. Baseline: ${matrix.updatedAt}._`);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const failures = [];
  if (!fs.existsSync(CONFIG_PATH)) failures.push('config/domain-completion-matrix.json is missing');
  if (!fs.existsSync(SNAPSHOT_PATH)) failures.push('docs/validation/domain-completion-staging-snapshot.json is missing');
  if (failures.length) throw new Error(failures.join('\n'));

  const matrix = readJson(CONFIG_PATH);
  const snapshot = readJson(SNAPSHOT_PATH);
  const packageJson = readJson(path.join(ROOT, 'package.json'));
  const scripts = packageJson.scripts || {};
  const allowed = matrix.allowed || {};
  const ids = new Set();
  const blockerIds = new Set();

  for (const domain of matrix.domains || []) {
    if (!domain.id || ids.has(domain.id)) failures.push(`invalid or duplicate domain id: ${domain.id}`);
    ids.add(domain.id);
    if (!Number.isInteger(domain.maturity) || domain.maturity < 0 || domain.maturity > 6) failures.push(`${domain.id}: maturity must be 0..6`);
    for (const field of ['userFacingAuthority', 'serverAuthority', 'stagingEvidence', 'securityGate', 'productionGate']) {
      if (!(allowed[field] || []).includes(domain[field])) failures.push(`${domain.id}: invalid ${field}=${domain[field]}`);
    }
    for (const blocker of domain.blockers || []) {
      if (!blocker.id || blockerIds.has(blocker.id)) failures.push(`invalid or duplicate blocker id: ${blocker.id}`);
      blockerIds.add(blocker.id);
      if (!(allowed.severity || []).includes(blocker.severity)) failures.push(`${blocker.id}: invalid severity`);
    }
    for (const requiredPath of domain.requiredPaths || []) {
      if (!fs.existsSync(path.join(ROOT, requiredPath))) failures.push(`${domain.id}: required path missing: ${requiredPath}`);
    }
    for (const test of domain.tests || []) {
      if (!scripts[test]) failures.push(`${domain.id}: package script missing: ${test}`);
    }
    for (const dependency of domain.dependencies || []) {
      if (!(matrix.domains || []).some((candidate) => candidate.id === dependency)) failures.push(`${domain.id}: unknown dependency ${dependency}`);
    }
  }

  for (const id of matrix.mandatorySequence || []) {
    if (!ids.has(id)) failures.push(`mandatorySequence references unknown domain ${id}`);
  }
  for (const flow of matrix.criticalFlows || []) {
    if (!ids.has(flow.owner)) failures.push(`${flow.id}: unknown owner ${flow.owner}`);
    for (const blocker of flow.blockers || []) if (!blockerIds.has(blocker)) failures.push(`${flow.id}: unknown blocker ${blocker}`);
  }

  const domains = (matrix.domains || []).map((domain) => {
    const files = scanFiles(domain.scanRoots || []);
    const signal = scanSignals(files);
    return {
      id: domain.id,
      name: domain.name,
      maturity: domain.maturity,
      filesMatched: files.length,
      sampleFiles: files.slice(0, 25).map(normalizeRel),
      missingRequiredPaths: (domain.requiredPaths || []).filter((item) => !fs.existsSync(path.join(ROOT, item))),
      signals: signal.totals,
      signalFiles: signal.files,
      blockers: domain.blockers || [],
      tests: domain.tests || []
    };
  });

  const allBlockers = matrix.domains.flatMap((domain) => domain.blockers || []);
  const report = {
    name: 'domain-completion-matrix',
    version: matrix.version,
    generatedAt: matrix.updatedAt,
    status: failures.length ? 'failed' : 'passed',
    summary: {
      domains: matrix.domains.length,
      criticalFlows: matrix.criticalFlows.length,
      averageMaturity: matrix.domains.reduce((sum, domain) => sum + domain.maturity, 0) / Math.max(1, matrix.domains.length),
      maturityCounts: countBy(matrix.domains, 'maturity'),
      productionGateCounts: countBy(matrix.domains, 'productionGate'),
      securityGateCounts: countBy(matrix.domains, 'securityGate'),
      blockerCounts: countBy(allBlockers, 'severity'),
      activeHtmlPages: listRootHtml().length,
      repositories: fs.readdirSync(path.join(ROOT, 'assets/js/repositories')).filter((name) => name.endsWith('.js')).length,
      backendModules: fs.readdirSync(path.join(ROOT, 'backend/modules')).filter((name) => fs.statSync(path.join(ROOT, 'backend/modules', name)).isDirectory()).length,
      migrations: fs.readdirSync(path.join(ROOT, 'supabase/migrations')).filter((name) => name.endsWith('.sql')).length,
      packageScripts: Object.keys(scripts).length,
      staging: snapshot.tableSummary
    },
    runtimeBaseline: matrix.runtimeBaseline,
    stagingSnapshot: snapshot,
    domains,
    criticalFlows: matrix.criticalFlows,
    failures
  };

  const markdown = generateMarkdown(matrix, snapshot, report);
  const reportJson = JSON.stringify(report, null, 2) + '\n';

  if (WRITE) {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, reportJson);
    fs.writeFileSync(DOC_PATH, markdown);
  } else {
    if (!fs.existsSync(DOC_PATH) || normalizeLineEndings(fs.readFileSync(DOC_PATH, 'utf8')) !== normalizeLineEndings(markdown)) failures.push('docs/DOMAIN-COMPLETION-MATRIX.md is stale; run npm run write:domain-completion-matrix');
  }

  if (failures.length) {
    console.error('Domain completion matrix audit failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log('Domain completion matrix audit passed.');
  console.log(`Domains: ${matrix.domains.length}`);
  console.log(`Critical flows: ${matrix.criticalFlows.length}`);
  console.log(`Average maturity: ${report.summary.averageMaturity.toFixed(2)}/6`);
  console.log(`Critical blockers: ${report.summary.blockerCounts.critical || 0}`);
}

main();
