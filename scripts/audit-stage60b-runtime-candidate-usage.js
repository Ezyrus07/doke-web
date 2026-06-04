#!/usr/bin/env node
/*
 * Stage 60B — Runtime candidate usage audit
 *
 * Objetivo: reauditar os candidatos medios sem contaminar o resultado com
 * scripts/relatorios/archives. Este arquivo evita literais de caminho completo
 * dos candidatos para nao mascarar audit:unused-asset-candidates.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'reports', 'generated');
fs.mkdirSync(outDir, { recursive: true });

const c = (...parts) => ({
  path: parts.join('/'),
  win: parts.join('\\\\'),
  basename: parts[parts.length - 1],
});

const candidates = [
  { ...c('assets', 'css', 'pages', 'orders-hero.css'), domain: 'pedidos/carteira', kind: 'css-page', pages: ['pedidos.html', 'carteira.html'] },
  { ...c('assets', 'css', 'pages', 'resultados.css'), domain: 'resultados/search', kind: 'css-page', pages: ['resultados.html', 'resultado/resultados.html'] },
  { ...c('assets', 'css', 'patterns', 'ad-process-steps.css'), domain: 'detalhe-anuncio/ad-pattern', kind: 'css-pattern', pages: ['detalhe-anuncio.html'] },
  { ...c('assets', 'js', 'controllers', 'login-controller.js'), domain: 'auth/login', kind: 'js-controller', pages: ['auth/login.html', 'login.html'] },
  { ...c('assets', 'js', 'pages', 'pedidos', 'orders-header.js'), domain: 'pedidos', kind: 'js-page', pages: ['pedidos.html'] },
  { ...c('assets', 'js', 'pages', 'perfil-base.js'), domain: 'perfil', kind: 'js-page', pages: ['perfil.html'] },
];

const ignoredTop = new Set(['.git', 'node_modules', 'archive', 'docs', 'reports', 'test-results', 'coverage', '.codex']);
const ignoredFiles = new Set([
  'scripts/audit-stage60a-medium-candidates.js',
  'scripts/audit-stage60b-runtime-candidate-usage.js',
]);
const runtimeExt = new Set(['.html', '.css', '.js', '.mjs', '.json']);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const top = rel.split('/')[0];
    if (ignoredTop.has(top)) continue;
    if (ignoredFiles.has(rel)) continue;
    if (entry.isDirectory()) {
      walk(abs, acc);
    } else if (runtimeExt.has(path.extname(entry.name))) {
      acc.push({ abs, rel });
    }
  }
  return acc;
}

function read(file) {
  try { return fs.readFileSync(file.abs, 'utf8'); } catch { return ''; }
}

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function extractCssSignals(content) {
  const signals = new Set();
  for (const m of content.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]{2,})/g)) signals.add(m[1]);
  for (const m of content.matchAll(/#([a-zA-Z_][a-zA-Z0-9_-]{2,})/g)) signals.add(`#${m[1]}`);
  return [...signals].filter(s => !/^\d/.test(s)).slice(0, 80);
}

function extractJsSignals(content) {
  const signals = new Set();
  const patterns = [
    /window\.([A-Za-z_$][\w$]+)/g,
    /document\.querySelector\(['\"`]([^'\"`]+)['\"`]\)/g,
    /document\.querySelectorAll\(['\"`]([^'\"`]+)['\"`]\)/g,
    /getElementById\(['\"`]([^'\"`]+)['\"`]\)/g,
    /data-[a-zA-Z0-9_-]+/g,
  ];
  for (const re of patterns) {
    for (const m of content.matchAll(re)) signals.add(m[1] || m[0]);
  }
  return [...signals].filter(Boolean).slice(0, 80);
}

const files = walk(root);
const fileCache = new Map(files.map(f => [f.rel, { ...f, text: read(f) }]));

function findDirectRefs(candidate) {
  const needles = [candidate.path, candidate.win, candidate.basename].filter(Boolean);
  const refs = [];
  for (const file of fileCache.values()) {
    if (file.rel === candidate.path) continue;
    for (const needle of needles) {
      let from = 0;
      while (true) {
        const index = file.text.indexOf(needle, from);
        if (index === -1) break;
        const line = lineOf(file.text, index);
        const snippet = file.text.split(/\r?\n/)[line - 1]?.trim().slice(0, 180) || '';
        refs.push({ file: file.rel, line, needle, snippet });
        from = index + needle.length;
      }
    }
  }
  return refs.slice(0, 30);
}

function findSignalRefs(candidate, content) {
  const signals = candidate.kind.startsWith('css') ? extractCssSignals(content) : extractJsSignals(content);
  const refs = [];
  for (const signal of signals) {
    const needle = signal.startsWith('#') ? signal.slice(1) : signal;
    if (!needle || needle.length < 4) continue;
    let count = 0;
    const examples = [];
    for (const file of fileCache.values()) {
      if (file.rel === candidate.path) continue;
      if (file.text.includes(needle)) {
        count += (file.text.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (examples.length < 4) examples.push(file.rel);
      }
    }
    if (count > 0) refs.push({ signal, count, examples });
  }
  return refs.sort((a, b) => b.count - a.count).slice(0, 20);
}

const results = candidates.map(candidate => {
  const abs = path.join(root, candidate.path);
  const exists = fs.existsSync(abs);
  const content = exists ? fs.readFileSync(abs, 'utf8') : '';
  const directRefs = exists ? findDirectRefs(candidate) : [];
  const signalRefs = exists ? findSignalRefs(candidate, content) : [];
  let status = 'missing';
  let decision = 'sem-acao';
  if (exists && directRefs.length > 0) {
    status = 'runtime-referenced';
    decision = 'manter-investigar-referencia-runtime';
  } else if (exists && signalRefs.length > 0) {
    status = 'signals-found';
    decision = 'manter-ate-validacao-visual-ou-consolidacao';
  } else if (exists) {
    status = 'no-runtime-evidence';
    decision = 'pode-virar-micro-remocao-travada-por-dominio';
  }
  return { ...candidate, exists, status, decision, directRefs, signalRefs };
});

const totals = results.reduce((acc, item) => {
  acc.total += 1;
  acc[item.status] = (acc[item.status] || 0) + 1;
  return acc;
}, { total: 0 });

const md = [];
md.push('# Stage 60B — Runtime candidate usage audit');
md.push('');
md.push('Auditoria estatica em arquivos de runtime. Exclui `scripts/`, `docs/`, `reports/`, `archive/` e artefatos gerados para evitar auto-referencia. Esta etapa **nao deleta arquivos**.');
md.push('');
md.push(`Gerado em: ${new Date().toISOString()}`);
md.push('');
md.push('## Totais');
md.push('');
for (const [key, value] of Object.entries(totals)) md.push(`- ${key}: ${value}`);
md.push('');
md.push('## Decisao tecnica');
md.push('');
md.push('- `runtime-referenced`: manter; ha referencia direta em HTML/CSS/JS de runtime.');
md.push('- `signals-found`: nao deletar ainda; ha classes/hooks usados fora do arquivo. Candidato a consolidacao, nao remocao cega.');
md.push('- `no-runtime-evidence`: pode virar microetapa de remocao travada por dominio e com conferencia visual.');
md.push('- `missing`: ja ausente no projeto local.');
md.push('');
md.push('## Candidatos');
md.push('');
for (const item of results) {
  md.push(`### \`${item.path}\``);
  md.push('');
  md.push(`- dominio: ${item.domain}`);
  md.push(`- tipo: ${item.kind}`);
  md.push(`- existe: ${item.exists ? 'sim' : 'nao'}`);
  md.push(`- status: ${item.status}`);
  md.push(`- decisao: ${item.decision}`);
  md.push(`- paginas para conferencia: ${item.pages.join(', ')}`);
  md.push('');
  if (item.directRefs.length) {
    md.push('Referencias diretas de runtime encontradas:');
    for (const ref of item.directRefs) md.push(`- ${ref.file}:${ref.line} — ${ref.snippet}`);
  } else {
    md.push('Referencias diretas de runtime: nenhuma.');
  }
  md.push('');
  if (item.signalRefs.length) {
    md.push('Sinais encontrados fora do arquivo:');
    for (const ref of item.signalRefs) md.push(`- \`${ref.signal}\` — ${ref.count} ocorrencia(s); exemplos: ${ref.examples.join(', ')}`);
  } else {
    md.push('Sinais externos relevantes: nenhum.');
  }
  md.push('');
}
md.push('## Proxima acao recomendada');
md.push('');
md.push('Se houver candidatos `no-runtime-evidence`, preparar Stage 60C com delecao separada por dominio. Se restarem apenas `signals-found`/`runtime-referenced`, parar delecoes e passar para consolidacao visual/arquitetural com Playwright.');

fs.writeFileSync(path.join(outDir, 'stage60b-runtime-candidate-usage-audit.md'), md.join('\n'));
fs.writeFileSync(path.join(outDir, 'stage60b-runtime-candidate-usage-audit.json'), JSON.stringify({ generatedAt: new Date().toISOString(), totals, results }, null, 2));
console.log('Stage 60B runtime candidate usage audit complete.');
console.log(`Report: ${path.relative(root, path.join(outDir, 'stage60b-runtime-candidate-usage-audit.md')).replace(/\\/g, '/')}`);
