const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'assets', 'css', 'components', 'before-after-workers-preview', 'shared-publication-card.css');
const REPORT_DIR = path.join(ROOT, 'reports', 'generated');
const LOG = path.join(ROOT, 'stage63d-shared-publication-card-important-log.txt');
const BACKUP_DIR = path.join(REPORT_DIR, `stage63d-shared-publication-card-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const REPORT = path.join(REPORT_DIR, 'stage63d-shared-publication-card-important-report.md');

function log(line) {
  fs.appendFileSync(LOG, `${line}\n`, 'utf8');
  console.log(line);
}

function fail(message) {
  log(`ERRO: ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

fs.writeFileSync(LOG, `[Stage 63D] Shared publication card important reduction\n`, 'utf8');

try {
  if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
    fail('package.json nao encontrado. Rode este comando na raiz do projeto.');
  }

  if (!fs.existsSync(TARGET)) {
    fail(`Arquivo alvo nao encontrado: ${path.relative(ROOT, TARGET)}`);
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const relTarget = path.relative(ROOT, TARGET).replace(/\\/g, '/');
  const original = fs.readFileSync(TARGET, 'utf8');
  const before = (original.match(/!important/g) || []).length;

  if (before === 0) {
    log(`${relTarget}: ja estava sem !important. Nenhuma alteracao aplicada.`);
  } else {
    fs.copyFileSync(TARGET, path.join(BACKUP_DIR, 'shared-publication-card.css'));
    const next = original.replace(/\s*!important\b/g, '');
    fs.writeFileSync(TARGET, next, 'utf8');
    const after = (next.match(/!important/g) || []).length;
    log(`${relTarget}: ${before} -> ${after} !important`);
    log(`Backup local: ${path.relative(ROOT, BACKUP_DIR).replace(/\\/g, '/')}`);
  }

  const finalContent = fs.readFileSync(TARGET, 'utf8');
  const after = (finalContent.match(/!important/g) || []).length;
  fs.writeFileSync(REPORT, `# Stage 63D — Shared publication card important reduction\n\n` +
    `Arquivo alvo: \`${relTarget}\`\n\n` +
    `- Antes: ${before}\n` +
    `- Depois: ${after}\n` +
    `- Backup: \`${path.relative(ROOT, BACKUP_DIR).replace(/\\/g, '/')}\`\n\n` +
    `Esta etapa remove apenas \`!important\` internamente do arquivo alvo. Nao remove arquivos e nao altera HTML.\n`, 'utf8');

  log('Concluido. Rode os audits de sanidade.');
} catch (error) {
  if (!process.exitCode) process.exitCode = 1;
}
