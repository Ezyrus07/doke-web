#!/usr/bin/env node
/*
 * Doke Stage 59G — current unused candidates risk map.
 * Classification only. This script does not delete files.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const summaryPath = path.join(root, 'reports', 'generated', 'unused-asset-candidates-summary.json');
const outJsonPath = path.join(root, 'reports', 'generated', 'stage59g-current-unused-risk-map.json');
const outMdPath = path.join(root, 'reports', 'generated', 'stage59g-current-unused-risk-map.md');

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo nao encontrado: ${rel(filePath)}. Rode npm.cmd run audit:unused-asset-candidates antes.`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const protectedRules = [
  ['shell-global', /^assets\/css\/components\/shell\//],
  ['navigation-global', /^assets\/css\/components\/navigation\//],
  ['router-or-core-js', /^assets\/js\/core\//],
  ['ui-header-controls', /^assets\/js\/ui\/header-controls\.js$/],
  ['home-surface', /^assets\/(css|js)\/pages\/home\//],
  ['home-page-css', /^assets\/css\/pages\/home-/],
  ['messages-surface', /^assets\/css\/pages\/mensagens\//],
  ['ad-detail-surface', /^assets\/css\/pages\/detalhe-anuncio\//],
  ['ad-detail-page-css', /^assets\/css\/pages\/detalhe-anuncio-/],
  ['profile-surface', /^assets\/(css|js)\/pages\/perfil\//],
  ['profile-page-css', /^assets\/css\/pages\/perfil-/],
  ['profile-features', /^assets\/js\/features\/profile\//],
  ['internal-chat', /^assets\/css\/components\/internal\/chat-workspace\.css$/],
  ['workers-publication-viewer', /^assets\/css\/components\/before-after-workers-preview\//],
  ['page-shell-css', /^assets\/css\/pages\/(app-shell|shell|sidebar|stable-desktop-rail)/],
  ['community-room-runtime', /^assets\/css\/patterns\/community-room-layout\.css$/],
  ['page-responsive-contract', /^assets\/css\/patterns\/page-responsive-contract\.css$/],
];

const mediumRules = [
  ['results-search-area', /^assets\/css\/pages\/(resultados\.css|search-results\/)/],
  ['community-page', /^assets\/css\/pages\/comunidade\//],
  ['notifications-page', /^assets\/css\/pages\/notificacoes\//],
  ['wallet-or-orders-page', /^assets\/css\/pages\/(wallet|orders|carteira|pedidos)/],
  ['config-page', /^assets\/css\/pages\/configuracoes\//],
  ['page-specific-js', /^assets\/js\/pages\//],
  ['domain-controller-js', /^assets\/js\/controllers\//],
  ['domain-pattern', /^assets\/css\/patterns\//],
];

const remnantName = /(?:cleanup|polish|final|parity|rescue|repair|normalization|adjustment|redesign|standardization|trim)/i;

function firstRule(asset, rules) {
  for (const [name, regex] of rules) {
    if (regex.test(asset)) return name;
  }
  return null;
}

function classify(asset) {
  const protectedReason = firstRule(asset, protectedRules);
  if (protectedReason) {
    return {
      risk: 'alto',
      reason: protectedReason,
      action: 'nao remover agora; exige validacao visual e/ou revisao de carregamento dinamico',
    };
  }

  if (remnantName.test(asset)) {
    return {
      risk: 'baixo-controlado',
      reason: 'nome de remanescente e fora das areas protegidas',
      action: 'candidato para proxima microetapa de remocao',
    };
  }

  const mediumReason = firstRule(asset, mediumRules);
  if (mediumReason) {
    return {
      risk: 'medio',
      reason: mediumReason,
      action: 'remover apenas em lote por dominio com conferencia visual da pagina',
    };
  }

  return {
    risk: 'medio-baixo',
    reason: 'asset isolado sem regra sensivel conhecida',
    action: 'pode virar candidato de remocao apos busca direta de referencia',
  };
}

const summary = readJson(summaryPath);
const candidates = Array.isArray(summary.candidateSamples) ? summary.candidateSamples : [];

const entries = candidates.map((asset) => ({ asset, ...classify(asset) }));
const grouped = entries.reduce((acc, entry) => {
  acc[entry.risk] = acc[entry.risk] || [];
  acc[entry.risk].push(entry);
  return acc;
}, {});

const order = ['baixo-controlado', 'medio-baixo', 'medio', 'alto'];
const totals = order.reduce((acc, key) => {
  acc[key] = (grouped[key] || []).length;
  return acc;
}, {});

totals.total = entries.length;

fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });
fs.writeFileSync(outJsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), totals, entries }, null, 2)}\n`);

const lines = [];
lines.push('# Stage 59G — Current unused candidates risk map');
lines.push('');
lines.push('Classificacao estatica. Este relatorio nao autoriza delecao cega.');
lines.push('');
lines.push('## Totais');
lines.push('');
for (const key of order) lines.push(`- ${key}: ${totals[key] || 0}`);
lines.push(`- total: ${totals.total}`);
lines.push('');
for (const key of order) {
  lines.push(`## ${key}`);
  lines.push('');
  const list = grouped[key] || [];
  if (!list.length) {
    lines.push('_Nenhum candidato._');
    lines.push('');
    continue;
  }
  for (const item of list) {
    lines.push(`- \`${item.asset}\` — ${item.reason}; ${item.action}`);
  }
  lines.push('');
}

fs.writeFileSync(outMdPath, `${lines.join('\n')}\n`);

console.log('[Stage 59G] Classificacao concluida.');
console.log(`Total: ${totals.total}`);
for (const key of order) console.log(`${key}: ${totals[key] || 0}`);
console.log(`Relatorio: ${rel(outMdPath)}`);
console.log(`JSON: ${rel(outJsonPath)}`);
