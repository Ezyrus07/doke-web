#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'assets', 'css', 'pages', 'comunidade', 'mobile-layout-contract.css');
const REPORT_DIR = path.join(ROOT, 'reports', 'generated');
const LOG = path.join(ROOT, 'stage63b-comunidade-mobile-important-v2-log.txt');
const BACKUP_PREFIX = 'stage63b-comunidade-mobile-important-backup-';

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
function log(line) {
  fs.appendFileSync(LOG, line + '\n', 'utf8');
  console.log(line);
}
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function latestBackup() {
  if (!fs.existsSync(REPORT_DIR)) return null;
  return fs.readdirSync(REPORT_DIR)
    .filter((name) => name.startsWith(BACKUP_PREFIX) && name.endsWith('.css'))
    .sort()
    .pop() || null;
}
function assertProjectRoot() {
  if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
    throw new Error('package.json nao encontrado. Rode este script na raiz do projeto Doke.');
  }
}
function countImportant(text) {
  return (text.match(/!important\b/g) || []).length;
}
function runApply() {
  fs.writeFileSync(LOG, '', 'utf8');
  assertProjectRoot();
  ensureDir(REPORT_DIR);
  if (!fs.existsSync(TARGET)) {
    log(`[Stage 63B V2] ALVO AUSENTE: ${path.relative(ROOT, TARGET)}`);
    process.exitCode = 0;
    return;
  }
  const original = fs.readFileSync(TARGET, 'utf8');
  const before = countImportant(original);
  const backupName = `${BACKUP_PREFIX}${nowStamp()}.css`;
  const backupPath = path.join(REPORT_DIR, backupName);
  fs.writeFileSync(backupPath, original, 'utf8');
  const next = original.replace(/\s*!important\b/g, '');
  const after = countImportant(next);
  fs.writeFileSync(TARGET, next, 'utf8');
  const report = [
    '# Stage 63B V2 — Comunidade mobile important reduction',
    '',
    'Esta etapa removeu `!important` internamente sem deletar arquivo.',
    '',
    `- arquivo: \`${path.relative(ROOT, TARGET).replace(/\\/g, '/')}\``,
    `- before: ${before}`,
    `- after: ${after}`,
    `- delta: ${before - after}`,
    `- backup: \`${path.relative(ROOT, backupPath).replace(/\\/g, '/')}\``,
    '',
    'Valide `comunidade.html` em mobile/tablet antes de continuar.',
  ].join('\n');
  fs.writeFileSync(path.join(REPORT_DIR, 'stage63b-comunidade-mobile-important-v2.md'), report, 'utf8');
  log(`[Stage 63B V2] Arquivo: ${path.relative(ROOT, TARGET)}`);
  log(`[Stage 63B V2] !important: ${before} -> ${after} (delta ${before - after})`);
  log(`[Stage 63B V2] Backup: ${path.relative(ROOT, backupPath)}`);
  log('[Stage 63B V2] Concluido. Rode os audits de sanidade.');
}
function runRollback() {
  fs.writeFileSync(LOG, '', 'utf8');
  assertProjectRoot();
  ensureDir(REPORT_DIR);
  const backup = latestBackup();
  if (!backup) {
    log('[Stage 63B V2] Nenhum backup local encontrado para rollback.');
    process.exitCode = 1;
    return;
  }
  const backupPath = path.join(REPORT_DIR, backup);
  fs.copyFileSync(backupPath, TARGET);
  log(`[Stage 63B V2] Rollback aplicado de: ${path.relative(ROOT, backupPath)}`);
  log(`[Stage 63B V2] Restaurado: ${path.relative(ROOT, TARGET)}`);
}

try {
  if (process.argv.includes('--rollback')) runRollback();
  else runApply();
} catch (err) {
  log(`[Stage 63B V2] ERRO: ${err.message}`);
  process.exitCode = 1;
}
