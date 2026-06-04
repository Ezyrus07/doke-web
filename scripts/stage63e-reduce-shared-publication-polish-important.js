const fs = require('fs');
const path = require('path');

const STAGE = '63E';
const TARGET = path.join('assets', 'css', 'components', 'before-after-workers-preview', 'shared-publication-card.css');
const REPORT_DIR = path.join('reports', 'generated');
const BACKUP_ROOT = path.join(REPORT_DIR, 'stage63e-shared-publication-polish-backup');
const LOG_FILE = 'stage63e-shared-publication-polish-important-log.txt';
const REPORT_FILE = path.join(REPORT_DIR, 'stage63e-shared-publication-polish-important-report.md');

function log(line) {
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  console.log(line);
}

function ensureRoot() {
  if (!fs.existsSync('package.json')) {
    throw new Error('Execute este script na raiz do projeto Doke, onde existe package.json.');
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function countImportant(content) {
  return (content.match(/!important\b/g) || []).length;
}

function copyFilePreservingDirs(src, rootDest) {
  const dest = path.join(rootDest, src);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function run() {
  fs.writeFileSync(LOG_FILE, `[Doke Stage ${STAGE}] Reducao interna de !important — shared-publication-card.css\n`, 'utf8');
  ensureRoot();
  ensureDir(REPORT_DIR);

  if (!fs.existsSync(TARGET)) {
    log(`AUSENTE: ${TARGET}`);
    fs.writeFileSync(REPORT_FILE, `# Stage ${STAGE} — Shared publication polish important reduction\n\nArquivo ausente: \`${TARGET}\`.\n`, 'utf8');
    return;
  }

  const before = fs.readFileSync(TARGET, 'utf8');
  const beforeCount = countImportant(before);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `${BACKUP_ROOT}-${timestamp}`;
  ensureDir(backupDir);
  copyFilePreservingDirs(TARGET, backupDir);
  fs.writeFileSync(path.join(REPORT_DIR, 'stage63e-latest-backup-dir.txt'), backupDir, 'utf8');

  const after = before.replace(/\s*!important\b/g, '');
  const afterCount = countImportant(after);

  if (after === before) {
    log(`SEM ALTERACAO: ${TARGET} ja nao tinha !important.`);
  } else {
    fs.writeFileSync(TARGET, after, 'utf8');
    log(`ALTERADO: ${TARGET}`);
    log(`!important: ${beforeCount} -> ${afterCount}`);
    log(`Backup: ${backupDir}`);
  }

  const report = [
    `# Stage ${STAGE} — Shared publication polish important reduction`,
    '',
    'Edição interna conservadora. Esta etapa não remove arquivo e não altera HTML.',
    '',
    `- arquivo: \`${TARGET.replace(/\\/g, '/')}\``,
    `- !important antes: ${beforeCount}`,
    `- !important depois: ${afterCount}`,
    `- backup: \`${backupDir.replace(/\\/g, '/')}\``,
    '',
    '## Critérios de aceite',
    '',
    '- `audit:frontend` deve continuar com 0 críticos.',
    '- `audit:important-reduction-plan` deve continuar passando.',
    '- Cards/modais/publicações/workers devem ser conferidos visualmente, principalmente no mobile.',
    '',
  ].join('\n');

  fs.writeFileSync(REPORT_FILE, report, 'utf8');
}

try {
  run();
} catch (error) {
  log(`ERRO: ${error.message}`);
  process.exitCode = 1;
}
