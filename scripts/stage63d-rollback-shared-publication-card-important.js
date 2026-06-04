const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'generated');
const TARGET = path.join(ROOT, 'assets', 'css', 'components', 'before-after-workers-preview', 'shared-publication-card.css');
const LOG = path.join(ROOT, 'stage63d-shared-publication-card-rollback-log.txt');

function log(line) {
  fs.appendFileSync(LOG, `${line}\n`, 'utf8');
  console.log(line);
}

fs.writeFileSync(LOG, `[Stage 63D Rollback] Shared publication card\n`, 'utf8');

if (!fs.existsSync(REPORT_DIR)) {
  log('ERRO: reports/generated nao existe. Nao encontrei backup.');
  process.exit(1);
}

const backups = fs.readdirSync(REPORT_DIR)
  .filter((name) => name.startsWith('stage63d-shared-publication-card-backup-'))
  .map((name) => path.join(REPORT_DIR, name))
  .filter((dir) => fs.statSync(dir).isDirectory())
  .sort();

if (!backups.length) {
  log('ERRO: nenhum backup Stage 63D encontrado.');
  process.exit(1);
}

const latest = backups[backups.length - 1];
const source = path.join(latest, 'shared-publication-card.css');
if (!fs.existsSync(source)) {
  log(`ERRO: backup incompleto: ${path.relative(ROOT, source)}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(TARGET), { recursive: true });
fs.copyFileSync(source, TARGET);
log(`Restaurado de: ${path.relative(ROOT, source).replace(/\\/g, '/')}`);
log(`Destino: ${path.relative(ROOT, TARGET).replace(/\\/g, '/')}`);
