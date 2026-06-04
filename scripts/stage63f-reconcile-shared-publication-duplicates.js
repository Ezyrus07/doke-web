#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const LOG = path.join(ROOT, 'stage63f-shared-publication-duplicates-log.txt');
const REPORT_DIR = path.join(ROOT, 'reports', 'generated');
const TARGET_DIR = path.join(ROOT, 'assets', 'css', 'components', 'before-after-workers-preview');
const CANONICAL = path.join(TARGET_DIR, 'shared-publication-card.css');
const DUPLICATE = path.join(TARGET_DIR, 'shared-publication-card.css');
const CANONICAL_REL = 'assets/css/components/before-after-workers-preview/shared-publication-card.css';
const DUPLICATE_REL = 'assets/css/components/before-after-workers-preview/shared-publication-card.css';
const STAGE = 'stage63f-shared-publication-duplicates';

function log(line) {
  fs.appendFileSync(LOG, `${line}\n`, 'utf8');
  console.log(line);
}

function fail(message, code = 1) {
  log(`ERRO: ${message}`);
  process.exit(code);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function ensureRoot() {
  if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
    fail('Execute este script na raiz do projeto Doke. package.json nao encontrado.');
  }
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const skipDirs = new Set(['node_modules', '.git', 'archive', 'docs', 'reports']);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function shouldScan(file) {
  return /\.(html|css|js)$/i.test(file);
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function makeBackup(files) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(REPORT_DIR, `${STAGE}-backup-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const dest = path.join(backupDir, rel(file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
  fs.writeFileSync(path.join(REPORT_DIR, 'stage63f-last-backup-dir.txt'), backupDir, 'utf8');
  return backupDir;
}

function writeReport(data) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const md = [
    '# Stage 63F — Shared publication duplicate reconciliation',
    '',
    'Esta etapa reconcilia duplicidade gerada apos reducao de `!important` nos arquivos de publicacao/workers.',
    '',
    '## Decisao tecnica',
    '',
    `- Canonico mantido: \`${CANONICAL_REL}\``,
    `- Duplicado removido: \`${DUPLICATE_REL}\``,
    '- Motivo: `shared-publication-card.css` descreve responsabilidade de componente; `shared-publication-card.css` tem nome de remendo visual e virou duplicado.',
    '',
    '## Resultado',
    '',
    `- Backup: \`${data.backupDir.replace(/\\/g, '/')}\``,
    `- Hash canonico: \`${data.canonicalHash}\``,
    `- Hash duplicado: \`${data.duplicateHash}\``,
    `- Referencias atualizadas: ${data.rewrites.length}`,
    `- Arquivo duplicado removido: ${data.removed ? 'sim' : 'nao'}`,
    '',
    '## Arquivos com referencias atualizadas',
    '',
    ...(data.rewrites.length ? data.rewrites.map(item => `- \`${item.file}\` (${item.count} ocorrencia(s))`) : ['- Nenhum.']),
    '',
    '## Validacao recomendada',
    '',
    '```bat',
    'npm.cmd run audit:duplicate-assets',
    'npm.cmd run audit:frontend',
    'npm.cmd run audit:important-reduction-plan',
    'npm.cmd run audit:unused-asset-candidates',
    'npm.cmd run audit:docs-report-hygiene',
    '```',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(REPORT_DIR, 'stage63f-shared-publication-duplicates.md'), md, 'utf8');
  fs.writeFileSync(path.join(REPORT_DIR, 'stage63f-shared-publication-duplicates.json'), JSON.stringify(data, null, 2), 'utf8');
}

function main() {
  fs.writeFileSync(LOG, '', 'utf8');
  log('[Doke Stage 63F] Reconciliando duplicado shared-publication-card/shared-publication-polish...');
  ensureRoot();

  if (!fs.existsSync(CANONICAL)) fail(`Arquivo canonico nao encontrado: ${CANONICAL_REL}`);
  if (!fs.existsSync(DUPLICATE)) {
    log('Duplicado ja ausente. Nada a remover.');
    writeReport({
      backupDir: '', canonicalHash: sha256(fs.readFileSync(CANONICAL, 'utf8')), duplicateHash: null,
      rewrites: [], removed: false, alreadyMissing: true
    });
    return;
  }

  const canonicalText = fs.readFileSync(CANONICAL, 'utf8');
  const duplicateText = fs.readFileSync(DUPLICATE, 'utf8');
  const canonicalHash = sha256(canonicalText.replace(/\r\n/g, '\n'));
  const duplicateHash = sha256(duplicateText.replace(/\r\n/g, '\n'));

  if (canonicalHash !== duplicateHash) {
    fail('Os arquivos nao sao identicos apos normalizacao de quebra de linha. Nao vou remover automaticamente.');
  }

  const backupDir = makeBackup([CANONICAL, DUPLICATE]);
  log(`Backup criado: ${backupDir}`);

  const files = walk(ROOT).filter(shouldScan);
  const rewrites = [];
  const duplicateNames = [
    DUPLICATE_REL,
    DUPLICATE_REL.replace(/\//g, '\\\\'),
    'shared-publication-card.css'
  ];
  const canonicalName = 'shared-publication-card.css';

  for (const file of files) {
    const fileRel = rel(file);
    if (fileRel === DUPLICATE_REL) continue;
    let text = fs.readFileSync(file, 'utf8');
    let next = text;
    let count = 0;

    for (const needle of duplicateNames) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'g');
      const matches = next.match(rx);
      if (matches) {
        count += matches.length;
        if (needle.endsWith('shared-publication-card.css') && needle.includes('/')) {
          next = next.replace(rx, CANONICAL_REL);
        } else if (needle.endsWith('shared-publication-card.css') && needle.includes('\\\\')) {
          next = next.replace(rx, CANONICAL_REL.replace(/\//g, '\\\\'));
        } else {
          next = next.replace(rx, canonicalName);
        }
      }
    }

    if (next !== text) {
      fs.writeFileSync(file, next, 'utf8');
      rewrites.push({ file: fileRel, count });
      log(`Referencia atualizada: ${fileRel} (${count})`);
    }
  }

  fs.unlinkSync(DUPLICATE);
  log(`Removido duplicado: ${DUPLICATE_REL}`);

  writeReport({ backupDir, canonicalHash, duplicateHash, rewrites, removed: true, alreadyMissing: false });
  log('Concluido. Rode os audits recomendados.');
}

main();
