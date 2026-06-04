#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGETS = [
  'assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css',
];
const STAGE = 'stage63h-workers-mobile-fullscreen-important';
const GENERATED = path.join(ROOT, 'reports', 'generated');
const backupDir = path.join(GENERATED, `${STAGE}-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const reportPath = path.join(GENERATED, `${STAGE}.md`);
const logPath = path.join(ROOT, `${STAGE}-log.txt`);

const logLines = [];
function log(message) {
  logLines.push(message);
  console.log(message);
}

function ensureProjectRoot() {
  const packagePath = path.join(ROOT, 'package.json');
  if (!fs.existsSync(packagePath)) {
    throw new Error('package.json nao encontrado. Rode este script na raiz do projeto dokee-web.');
  }
}

function countImportant(content) {
  return (content.match(/!important\b/g) || []).length;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFilePreserve(sourceAbs, destAbs) {
  ensureDir(path.dirname(destAbs));
  fs.copyFileSync(sourceAbs, destAbs);
}

function main() {
  ensureProjectRoot();
  ensureDir(GENERATED);
  ensureDir(backupDir);

  log('# Stage 63H — Workers mobile fullscreen important reduction');
  log('Estrategia: edicao interna; nao deleta arquivo; backup local antes de alterar.');
  log(`Backup: ${path.relative(ROOT, backupDir)}`);
  log('');

  const summary = [];

  for (const rel of TARGETS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      log(`AUSENTE: ${rel}`);
      summary.push({ file: rel, status: 'missing', before: 0, after: 0 });
      continue;
    }

    const before = fs.readFileSync(abs, 'utf8');
    const beforeCount = countImportant(before);
    const backupAbs = path.join(backupDir, rel);
    copyFilePreserve(abs, backupAbs);

    const after = before.replace(/\s*!important\b/g, '');
    const afterCount = countImportant(after);

    if (after !== before) {
      fs.writeFileSync(abs, after, 'utf8');
      log(`ALTERADO: ${rel} (${beforeCount} -> ${afterCount} !important)`);
      summary.push({ file: rel, status: 'changed', before: beforeCount, after: afterCount });
    } else {
      log(`SEM ALTERACAO: ${rel} (${beforeCount} !important)`);
      summary.push({ file: rel, status: 'unchanged', before: beforeCount, after: afterCount });
    }
  }

  const md = [
    '# Stage 63H — Workers mobile fullscreen important reduction',
    '',
    'Esta etapa remove `!important` internamente de CSS especifico de workers mobile fullscreen.',
    '',
    'Nao remove arquivos, nao altera HTML, nao toca em shell/header/sidebar/router/home/search-results.',
    '',
    `Backup local: \`${path.relative(ROOT, backupDir).replace(/\\/g, '/')}\``,
    '',
    '## Resultado',
    '',
    ...summary.map(item => `- \`${item.file}\`: ${item.status}; ${item.before} -> ${item.after} !important`),
    '',
    '## Validacao recomendada',
    '',
    'Rodar:',
    '',
    '```bat',
    'npm.cmd run audit:frontend',
    'npm.cmd run audit:important-reduction-plan',
    'npm.cmd run audit:duplicate-assets',
    'npm.cmd run audit:unused-asset-candidates',
    'npm.cmd run audit:docs-report-hygiene',
    '```',
    '',
    'Conferencia visual recomendada: abrir workers/publicacoes em mobile, especialmente fullscreen de worker.',
    '',
  ].join('\n');

  fs.writeFileSync(reportPath, md, 'utf8');
  fs.writeFileSync(logPath, logLines.join('\n') + '\n', 'utf8');
  log('');
  log(`Relatorio: ${path.relative(ROOT, reportPath)}`);
  log(`Log: ${path.relative(ROOT, logPath)}`);
}

try {
  main();
} catch (error) {
  console.error(`ERRO: ${error.message}`);
  try {
    fs.writeFileSync(logPath, [`ERRO: ${error.message}`].join('\n') + '\n', 'utf8');
  } catch (_) {}
  process.exit(1);
}
