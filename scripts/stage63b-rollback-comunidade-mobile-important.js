const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORTS = path.join(ROOT, 'reports', 'generated');
const TARGET = path.join(ROOT, 'assets', 'css', 'pages', 'comunidade', 'mobile-layout-contract.css');
const LOG = path.join(ROOT, 'stage63b-comunidade-mobile-rollback-log.txt');

function log(line) {
  fs.appendFileSync(LOG, line + '\n', 'utf8');
  console.log(line);
}

try {
  fs.writeFileSync(LOG, `[Stage 63B Rollback] Started: ${new Date().toISOString()}\n`, 'utf8');

  if (!fs.existsSync(REPORTS)) {
    throw new Error('reports/generated nao encontrado; nao achei backup local.');
  }

  const candidates = fs.readdirSync(REPORTS)
    .filter((name) => name.startsWith('stage63b-comunidade-mobile-important-backup-'))
    .map((name) => path.join(REPORTS, name))
    .filter((p) => fs.statSync(p).isDirectory())
    .sort()
    .reverse();

  if (!candidates.length) {
    throw new Error('Nenhum backup Stage 63B encontrado.');
  }

  const backupFile = path.join(candidates[0], 'assets', 'css', 'pages', 'comunidade', 'mobile-layout-contract.css');
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup encontrado, mas arquivo ausente: ${backupFile}`);
  }

  fs.copyFileSync(backupFile, TARGET);
  log(`Restaurado de: ${path.relative(ROOT, backupFile)}`);
  log(`Para: ${path.relative(ROOT, TARGET)}`);
  log('Concluido.');
} catch (err) {
  log(`ERRO: ${err.message}`);
  process.exitCode = 1;
}
