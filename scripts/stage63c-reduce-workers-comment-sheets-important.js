const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'assets', 'css', 'components', 'before-after-workers-preview', 'mobile-comment-sheets.css');
const reportsDir = path.join(root, 'reports', 'generated');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(reportsDir, `stage63c-workers-comment-sheets-backup-${stamp}`);
const reportPath = path.join(reportsDir, 'stage63c-workers-comment-sheets-important-reduction.md');
const logPath = path.join(root, 'stage63c-workers-comment-sheets-log.txt');

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
  log('[Doke Stage 63C] Reducao interna de !important em mobile-comment-sheets.css');

  if (!fs.existsSync(path.join(root, 'package.json'))) {
    fail('package.json nao encontrado. Rode este script na raiz do projeto.');
    return;
  }

  if (!fs.existsSync(target)) {
    fail(`Arquivo alvo nao encontrado: ${path.relative(root, target)}`);
    return;
  }

  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  const backupTarget = path.join(backupDir, 'mobile-comment-sheets.css');
  fs.copyFileSync(target, backupTarget);
  log(`Backup criado: ${path.relative(root, backupTarget)}`);

  const before = fs.readFileSync(target, 'utf8');
  const beforeCount = (before.match(/!important\b/g) || []).length;

  if (beforeCount === 0) {
    log('Nenhum !important encontrado. Nenhuma alteracao necessaria.');
    fs.writeFileSync(reportPath, `# Stage 63C — Workers comment sheets important reduction\n\nNenhum \`!important\` encontrado em \`assets/css/components/before-after-workers-preview/mobile-comment-sheets.css\`.\n`, 'utf8');
    return;
  }

  const after = before.replace(/\s*!important\b/g, '');
  const afterCount = (after.match(/!important\b/g) || []).length;

  fs.writeFileSync(target, after, 'utf8');

  const report = [
    '# Stage 63C — Workers comment sheets important reduction',
    '',
    'Edicao interna conservadora. Esta etapa nao remove arquivo e nao altera HTML.',
    '',
    '## Arquivo alterado',
    '',
    '- `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css`',
    '',
    '## Resultado',
    '',
    `- !important antes: ${beforeCount}`,
    `- !important depois: ${afterCount}`,
    `- reducao: ${beforeCount - afterCount}`,
    '',
    '## Backup local',
    '',
    `- \`${path.relative(root, backupTarget).replace(/\\/g, '/')}\``,
    '',
    '## Validacao recomendada',
    '',
    '- Conferir modal/sheet de comentarios em publicacoes/workers no mobile.',
    '- Rodar `npm.cmd run audit:frontend`.',
    '- Rodar `npm.cmd run audit:important-reduction-plan`.',
    ''
  ].join('\n');

  fs.writeFileSync(reportPath, report, 'utf8');
  log(`!important antes: ${beforeCount}`);
  log(`!important depois: ${afterCount}`);
  log(`Relatorio: ${path.relative(root, reportPath)}`);
  log('Concluido.');
} catch (error) {
  fail(error && error.stack ? error.stack : String(error));
}
