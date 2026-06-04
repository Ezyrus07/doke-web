#!/usr/bin/env node
/*
 * Stage 60D — Remaining unused candidates domain inventory
 * Read-only audit. Does not delete or modify runtime assets.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'reports', 'generated');
const SUMMARY = path.join(OUT_DIR, 'unused-asset-candidates-summary.json');
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'scripts', 'docs', 'reports', 'archive']);
const RUNTIME_EXTS = new Set(['.html', '.css', '.js', '.mjs']);

function toPosix(p) { return p.replace(/\\/g, '/'); }
function exists(p) { try { return fs.existsSync(path.join(ROOT, p)); } catch { return false; } }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function readText(abs) { try { return fs.readFileSync(abs, 'utf8'); } catch { return ''; } }
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function walk(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (RUNTIME_EXTS.has(path.extname(entry.name).toLowerCase())) out.push(abs);
  }
  return out;
}

function extractCandidateStrings(value, set = new Set()) {
  if (typeof value === 'string') {
    const normalized = toPosix(value.trim());
    const matches = normalized.match(/assets\/[A-Za-z0-9_./-]+\.(css|js|mjs)/g);
    if (matches) matches.forEach((m) => set.add(m));
  } else if (Array.isArray(value)) {
    value.forEach((v) => extractCandidateStrings(v, set));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => extractCandidateStrings(v, set));
  }
  return set;
}

function loadCandidates() {
  if (!fs.existsSync(SUMMARY)) {
    console.error(`Missing ${toPosix(path.relative(ROOT, SUMMARY))}. Run npm.cmd run audit:unused-asset-candidates first.`);
    process.exit(1);
  }
  const json = JSON.parse(readText(SUMMARY));
  const candidates = [...extractCandidateStrings(json)].filter((p) => /\.(css|js|mjs)$/.test(p));
  return [...new Set(candidates)].sort();
}

function classifyDomain(asset) {
  const p = asset.toLowerCase();
  if (p.includes('/shell/') || p.includes('shell-') || p.includes('app-shell')) return 'shell/global';
  if (p.includes('/navigation/') || p.includes('header') || p.includes('/ui/header')) return 'navigation/header';
  if (p.includes('/core/')) return 'core-js/runtime';
  if (p.includes('/home/') || p.includes('home-')) return 'home/workers';
  if (p.includes('/mensagens/') || p.includes('chat-workspace')) return 'mensagens/chat';
  if (p.includes('detalhe-anuncio') || p.includes('/ad-') || p.includes('/detail-')) return 'detalhe-anuncio';
  if (p.includes('/perfil') || p.includes('profile')) return 'perfil';
  if (p.includes('orders') || p.includes('pedidos') || p.includes('wallet') || p.includes('carteira')) return 'pedidos/carteira';
  if (p.includes('login') || p.includes('auth')) return 'auth';
  if (p.includes('before-after') || p.includes('workers') || p.includes('publication')) return 'workers/publicacoes';
  if (p.includes('/patterns/')) return 'patterns';
  return 'outros';
}

function domainRisk(domain, asset) {
  if (['shell/global', 'navigation/header', 'core-js/runtime', 'home/workers', 'mensagens/chat', 'detalhe-anuncio', 'perfil', 'workers/publicacoes'].includes(domain)) return 'alto';
  if (['pedidos/carteira', 'auth', 'patterns'].includes(domain)) return 'medio';
  if (/polish|parity|hotfix|rescue|repair|cleanup|final|adjustment|normalization/i.test(asset)) return 'medio-baixo';
  return 'medio';
}

function extractCssSignals(abs) {
  const text = readText(abs);
  const signals = new Set();
  for (const match of text.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]{3,})/g)) signals.add(match[1]);
  for (const match of text.matchAll(/#([A-Za-z_][A-Za-z0-9_-]{3,})/g)) signals.add(`#${match[1]}`);
  for (const match of text.matchAll(/--([A-Za-z_][A-Za-z0-9_-]{3,})/g)) signals.add(`--${match[1]}`);
  return [...signals].slice(0, 80);
}

function extractJsSignals(abs) {
  const text = readText(abs);
  const signals = new Set();
  for (const match of text.matchAll(/querySelector(?:All)?\(['"`]([^'"`]+)['"`]\)/g)) signals.add(match[1]);
  for (const match of text.matchAll(/getElementById\(['"`]([^'"`]+)['"`]\)/g)) signals.add(`#${match[1]}`);
  for (const match of text.matchAll(/classList\.(?:add|remove|toggle|contains)\(['"`]([^'"`]+)['"`]\)/g)) signals.add(match[1]);
  for (const match of text.matchAll(/dataset\.([A-Za-z0-9_]+)/g)) signals.add(`data-${match[1].replace(/[A-Z]/g, m => '-' + m.toLowerCase())}`);
  return [...signals].slice(0, 80);
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  return (haystack.match(new RegExp(escapeRegex(needle), 'g')) || []).length;
}

function analyzeCandidate(asset, runtimeFiles) {
  const abs = path.join(ROOT, asset);
  const basename = path.basename(asset);
  const domain = classifyDomain(asset);
  const directRefs = [];
  const signalRefs = [];
  const signals = asset.endsWith('.css') ? extractCssSignals(abs) : extractJsSignals(abs);

  for (const file of runtimeFiles) {
    const rel = toPosix(path.relative(ROOT, file));
    if (rel === asset) continue;
    const text = readText(file);
    const directNeedles = [asset, asset.replace(/\//g, '\\\\'), basename];
    const directCount = directNeedles.reduce((sum, n) => sum + countOccurrences(text, n), 0);
    if (directCount > 0) directRefs.push({ file: rel, count: directCount });
    for (const signal of signals) {
      if (!signal || signal.length < 4) continue;
      const needle = signal.startsWith('#') || signal.startsWith('--') || signal.startsWith('[') ? signal.replace(/^#/, '') : signal;
      const c = countOccurrences(text, needle);
      if (c > 0) signalRefs.push({ signal, file: rel, count: c });
    }
  }

  const uniqueSignalRefs = [];
  const seen = new Set();
  for (const ref of signalRefs.sort((a, b) => b.count - a.count)) {
    const key = `${ref.signal}|${ref.file}`;
    if (!seen.has(key)) { uniqueSignalRefs.push(ref); seen.add(key); }
    if (uniqueSignalRefs.length >= 20) break;
  }

  let status = 'no-runtime-evidence';
  let decision = 'candidato-a-remocao-apenas-com-validacao-visual';
  if (directRefs.length) {
    status = 'runtime-referenced';
    decision = 'manter-investigar-referencia-direta';
  } else if (uniqueSignalRefs.length) {
    status = 'signals-found';
    decision = 'nao-deletar-consolidar-ou-validar-visual';
  }
  const risk = domainRisk(domain, asset);
  if (risk === 'alto') decision = 'bloqueado-por-dominio-sensivel';

  return {
    asset,
    exists: fs.existsSync(abs),
    domain,
    risk,
    status,
    decision,
    directRefs: directRefs.slice(0, 20),
    signalRefs: uniqueSignalRefs,
  };
}

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const k = item[key];
    acc[k] = acc[k] || [];
    acc[k].push(item);
    return acc;
  }, {});
}

function main() {
  ensureDir(OUT_DIR);
  const candidates = loadCandidates();
  const runtimeFiles = walk(ROOT);
  const analyzed = candidates.map((asset) => analyzeCandidate(asset, runtimeFiles));
  const byDomain = groupBy(analyzed, 'domain');
  const byRisk = groupBy(analyzed, 'risk');
  const byStatus = groupBy(analyzed, 'status');

  const md = [];
  md.push('# Stage 60D — Remaining unused candidates domain inventory');
  md.push('');
  md.push('Auditoria estática somente leitura. Exclui `scripts/`, `docs/`, `reports/` e `archive/` das buscas runtime.');
  md.push('');
  md.push(`Gerado em: ${new Date().toISOString()}`);
  md.push('');
  md.push('## Totais');
  md.push('');
  md.push(`- total: ${analyzed.length}`);
  for (const [risk, items] of Object.entries(byRisk).sort()) md.push(`- risco ${risk}: ${items.length}`);
  for (const [status, items] of Object.entries(byStatus).sort()) md.push(`- ${status}: ${items.length}`);
  md.push('');
  md.push('## Por domínio');
  md.push('');
  for (const [domain, items] of Object.entries(byDomain).sort()) {
    md.push(`### ${domain} (${items.length})`);
    md.push('');
    for (const item of items.sort((a, b) => a.asset.localeCompare(b.asset))) {
      md.push(`- \`${item.asset}\` — risco: **${item.risk}**; status: **${item.status}**; decisão: ${item.decision}`);
      if (item.directRefs.length) md.push(`  - refs diretas: ${item.directRefs.slice(0, 3).map(r => `${r.file} (${r.count})`).join('; ')}`);
      if (item.signalRefs.length) md.push(`  - sinais: ${item.signalRefs.slice(0, 3).map(r => `${r.signal} em ${r.file} (${r.count})`).join('; ')}`);
    }
    md.push('');
  }
  md.push('## Próxima ação recomendada');
  md.push('');
  md.push('- Não deletar itens de risco alto sem Playwright/screenshot ou revisão manual de runtime.');
  md.push('- Para `signals-found`, preferir consolidação no arquivo de autoridade antes de remoção.');
  md.push('- Para `no-runtime-evidence` fora de domínio sensível, preparar microetapa com trava por caminho exato.');

  const jsonOut = { generatedAt: new Date().toISOString(), totals: { total: analyzed.length }, byRisk: Object.fromEntries(Object.entries(byRisk).map(([k,v]) => [k, v.length])), byStatus: Object.fromEntries(Object.entries(byStatus).map(([k,v]) => [k, v.length])), candidates: analyzed };
  fs.writeFileSync(path.join(OUT_DIR, 'stage60d-remaining-candidates-domain-inventory.md'), md.join('\n'), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'stage60d-remaining-candidates-domain-inventory.json'), JSON.stringify(jsonOut, null, 2), 'utf8');
  console.log('[Stage 60D] Inventory generated.');
  console.log(`Total candidates: ${analyzed.length}`);
  console.log(`Report: reports/generated/stage60d-remaining-candidates-domain-inventory.md`);
}

main();
