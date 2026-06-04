const fs = require('fs');
const path = require('path');

const root = process.cwd();
const reportsDir = path.join(root, 'reports', 'generated');
const target = path.join(root, 'assets', 'css', 'components', 'before-after-workers-preview', 'mobile-comment-sheets.css');
const logPath = path.join(root, 'stage63c-workers-comment-sheets-rollback-log.txt');

function log(line) {
  fs.appendFileSync(logPath, `${line}\n`, 'utf8');
  console.log(line);
}

function fail(message) {
  log(`ERRO: ${message}`);
  process.exitCode = 1;
}

try {
  if (fs.existsSync(logPath)) fs.rmSync(logPath, { force: true });
  log('[Doke Stage 63C] Rollback mobile-comment-sheets.css');

  if (!fs.existsSync(path.join(root, 'package.json'))) {
    fail('package.json nao encontrado. Rode este script na raiz do projeto.');
    return;
  }

  if (!fs.existsSync(reportsDir)) {
    fail('reports/generated nao encontrado. Nao ha backup local da Stage 63C.');
    return;
  }

  const backups = fs.readdirSync(reportsDir)
    .filter((name) => name.startsWith('stage63c-workers-comment-sheets-backup-'))
    .map((name) => path.join(reportsDir, name))
    .filter((dir) => fs.statSync(dir).isDirectory())
    .sort();

  if (!backups.length) {
    fail('Nenhum backup stage63c-workers-comment-sheets-backup-* encontrado.');
    return;
  }

  const latest = backups[backups.length - 1];
  const source = path.join(latest, 'mobile-comment-sheets.css');
  if (!fs.existsSync(source)) {
    fail(`Backup invalido: ${path.relative(root, source)} nao existe.`);
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  log(`Restaurado de: ${path.relative(root, source)}`);
  log(`Restaurado para: ${path.relative(root, target)}`);
  log('Rollback concluido.');
} catch (error) {
  fail(error && error.stack ? error.stack : String(error));
}
