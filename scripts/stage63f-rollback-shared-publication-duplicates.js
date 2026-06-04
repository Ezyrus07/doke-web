#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'generated');
const POINTER = path.join(REPORT_DIR, 'stage63f-last-backup-dir.txt');
const LOG = path.join(ROOT, 'stage63f-shared-publication-duplicates-rollback-log.txt');

function log(line) {
  fs.appendFileSync(LOG, `${line}\n`, 'utf8');
  console.log(line);
}

function fail(message) {
  log(`ERRO: ${message}`);
  process.exit(1);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function main() {
  fs.writeFileSync(LOG, '', 'utf8');
  if (!fs.existsSync(path.join(ROOT, 'package.json'))) fail('Execute na raiz do projeto Doke.');
  if (!fs.existsSync(POINTER)) fail('Ponteiro de backup nao encontrado: reports/generated/stage63f-last-backup-dir.txt');
  const backupDir = fs.readFileSync(POINTER, 'utf8').trim();
  if (!backupDir || !fs.existsSync(backupDir)) fail(`Backup nao encontrado: ${backupDir}`);

  const files = walk(backupDir);
  for (const src of files) {
    const relative = path.relative(backupDir, src);
    const dest = path.join(ROOT, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    log(`Restaurado: ${relative.replace(/\\/g, '/')}`);
  }
  log('Rollback Stage 63F concluido. Rode os audits.');
}

main();
