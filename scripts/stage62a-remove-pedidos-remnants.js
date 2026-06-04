#!/usr/bin/env node
/*
 * Stage 62A — Pedidos remnant removal.
 * Removes only runtime-unreferenced Pedidos residue files after a conservative
 * direct-reference scan. This script intentionally ignores docs/reports/scripts
 * as runtime references so historical manifests do not keep dead assets alive.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'archive', 'docs', 'reports', 'scripts']);
const RUNTIME_TEXT_EXTENSIONS = new Set(['.html', '.css', '.js']);

const cssTargets = [
  'assets/css/pages/pedidos/mobile-longterm-normalization.css',
  'assets/css/pages/pedidos/selection-cleanup.css',
];

const maintenanceTargets = [
  'scripts/maintenance/apply-phase35-pedidos-remnant-cleanup.js',
  'scripts/maintenance/apply-phase36-pedidos-command-cleanup.js',
  'scripts/maintenance/apply-phase37-pedidos-mobile-layout-cleanup.js',
  'scripts/maintenance/apply-phase38-pedidos-active-cleanup.js',
];

function rel(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

const runtimeFiles = walk(ROOT).filter((file) => RUNTIME_TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));

function hasRuntimeReference(target) {
  const targetAbs = path.join(ROOT, target);
  const basename = path.basename(target);
  const normalized = target.replace(/\\/g, '/');
  const withoutAssets = normalized.replace(/^assets\//, '');
  const referenceHits = [];

  for (const file of runtimeFiles) {
    const fileRel = rel(file);
    if (fileRel === normalized) continue;
    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const direct = content.includes(normalized) || content.includes(`./${withoutAssets}`) || content.includes(`../${withoutAssets}`);
    const importLike = content.includes(basename) && /(?:href\s*=|src\s*=|@import|url\(|import\s+|import\()/m.test(content);

    if (direct || importLike) {
      referenceHits.push(fileRel);
    }
  }

  return { targetAbs, referenceHits };
}

const result = {
  deleted: [],
  missing: [],
  blocked: [],
};

for (const target of cssTargets) {
  const { targetAbs, referenceHits } = hasRuntimeReference(target);
  if (!fs.existsSync(targetAbs)) {
    result.missing.push(target);
    continue;
  }
  if (referenceHits.length) {
    result.blocked.push({ target, referenceHits });
    continue;
  }
  fs.unlinkSync(targetAbs);
  result.deleted.push(target);
}

if (result.blocked.length) {
  console.error('[Stage 62A] BLOQUEADO: referencia runtime encontrada. Nenhum script de manutencao foi removido para manter rastreabilidade.');
  for (const item of result.blocked) {
    console.error(`- ${item.target}`);
    for (const hit of item.referenceHits.slice(0, 20)) console.error(`  referencia: ${hit}`);
  }
  process.exit(1);
}

for (const target of maintenanceTargets) {
  const abs = path.join(ROOT, target);
  if (!fs.existsSync(abs)) {
    result.missing.push(target);
    continue;
  }
  fs.unlinkSync(abs);
  result.deleted.push(target);
}

console.log('[Stage 62A] Remocao controlada concluida.');
console.log(`Deletados: ${result.deleted.length}`);
for (const item of result.deleted) console.log(`- ${item}`);
if (result.missing.length) {
  console.log(`Ja ausentes: ${result.missing.length}`);
  for (const item of result.missing) console.log(`- ${item}`);
}
