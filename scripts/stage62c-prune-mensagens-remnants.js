#!/usr/bin/env node
/**
 * Stage 62C — aggressive controlled pruning for mensagens page CSS remnants.
 * Removes legacy/page-contract CSS files with high !important density and removes direct runtime links/imports.
 * Does not touch shell/navigation/router/sidebar/header global files.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const generatedDir = path.join(root, 'reports', 'generated');
fs.mkdirSync(generatedDir, { recursive: true });

const targets = [
];

const editableExtensions = new Set(['.html', '.css', '.js']);
const ignoredDirs = new Set(['.git', 'node_modules', 'archive', 'docs', 'reports']);
const protectedRuntimePrefixes = [
  'assets/css/components/shell/',
  'assets/css/components/navigation/',
  'assets/js/core/',
  'assets/js/ui/header-controls.js',
];

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (editableExtensions.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeRuntimeReferences(file, target) {
  const basename = path.basename(target);
  const variants = [
    target,
    target.replaceAll('/', '\\\\'),
    basename,
  ];
  const original = fs.readFileSync(file, 'utf8');
  const lines = original.split(/\r?\n/);
  const kept = [];
  const removed = [];

  for (const line of lines) {
    const normalizedLine = line.replaceAll('\\\\', '/');
    const hasFullPath = normalizedLine.includes(target);
    const hasHrefOrImportBasename = (
      normalizedLine.includes(basename) &&
      (normalizedLine.includes('<link') || normalizedLine.includes('@import') || normalizedLine.includes(target.split('/').slice(-2).join('/')))
    );
    const hasAppRegistryPath = normalizedLine.includes(`"${target}"`) || normalizedLine.includes(`'${target}'`);

    if (hasFullPath || hasHrefOrImportBasename || hasAppRegistryPath) {
      removed.push(line);
      continue;
    }
    kept.push(line);
  }

  if (removed.length) {
    fs.writeFileSync(file, kept.join('\n'), 'utf8');
  }
  return removed;
}

const report = [];
const changedFiles = new Map();
const deleted = [];
const missing = [];
const skippedProtected = [];

for (const target of targets) {
  if (protectedRuntimePrefixes.some((prefix) => target.startsWith(prefix))) {
    skippedProtected.push(target);
    continue;
  }

  const files = walk(root);
  for (const file of files) {
    const rel = toPosix(path.relative(root, file));
    if (rel === target) continue;
    const removedLines = removeRuntimeReferences(file, target);
    if (removedLines.length) {
      if (!changedFiles.has(rel)) changedFiles.set(rel, []);
      changedFiles.get(rel).push({ target, removedLines });
    }
  }

  const targetPath = path.join(root, ...target.split('/'));
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
    deleted.push(target);
  } else {
    missing.push(target);
  }
}

report.push('# Stage 62C — Mensagens remnants important reduction');
report.push('');
report.push('Remocao agressiva controlada de CSS historico/remanescente do dominio `mensagens`.');
report.push('');
report.push('## Arquivos alvo');
report.push('');
for (const target of targets) report.push(`- \`${target}\``);
report.push('');
report.push('## Arquivos deletados');
report.push('');
if (deleted.length) deleted.forEach((item) => report.push(`- \`${item}\``));
else report.push('- nenhum');
report.push('');
report.push('## Arquivos ja ausentes');
report.push('');
if (missing.length) missing.forEach((item) => report.push(`- \`${item}\``));
else report.push('- nenhum');
report.push('');
report.push('## Referencias runtime removidas');
report.push('');
if (changedFiles.size) {
  for (const [file, entries] of changedFiles.entries()) {
    report.push(`### \`${file}\``);
    for (const entry of entries) {
      report.push(`- alvo: \`${entry.target}\``);
      for (const line of entry.removedLines) report.push(`  - removido: \`${line.trim().replace(/`/g, '\\`')}\``);
    }
    report.push('');
  }
} else {
  report.push('- nenhuma referencia runtime encontrada');
}
report.push('## Protecoes');
report.push('');
report.push('- Nao toca shell/navigation/router/sidebar/header global.');
report.push('- Remove apenas arquivos dentro de `assets/css/pages/mensagens/`.');
report.push('- Ignora docs/reports/archive/scripts/node_modules para nao reagir a auditorias antigas.');
report.push('');
report.push('## Validacao obrigatoria apos rodar');
report.push('');
report.push('```bat');
report.push('npm.cmd run audit:frontend');
report.push('npm.cmd run audit:important-reduction-plan');
report.push('npm.cmd run audit:duplicate-assets');
report.push('npm.cmd run audit:unused-asset-candidates');
report.push('npm.cmd run audit:docs-report-hygiene');
report.push('```');
report.push('');
report.push('Conferir visualmente `mensagens.html` e `comunidade-interna.html`, principalmente desktop, mobile e comportamento de abertura de conversa.');

fs.writeFileSync(path.join(generatedDir, 'stage62c-mensagens-remnants-important-reduction.md'), report.join('\n'), 'utf8');
console.log('[Stage 62C] concluido.');
console.log(`Arquivos deletados: ${deleted.length}`);
console.log(`Referencias runtime removidas em arquivos: ${changedFiles.size}`);
console.log('Relatorio: reports/generated/stage62c-mensagens-remnants-important-reduction.md');
