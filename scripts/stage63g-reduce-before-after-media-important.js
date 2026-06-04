const fs = require('fs');
const path = require('path');

const root = process.cwd();
const logLines = [];
const reportDir = path.join(root, 'reports', 'generated');
const backupDir = path.join(reportDir, `stage63g-before-after-media-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const targets = [
  'assets/css/components/before-after-workers-preview/before-after-media.css',
  'assets/css/components/before-after-workers-preview/before-after-single-media.css',
];

function log(message) {
  logLines.push(message);
  console.log(message);
}

function ensureProjectRoot() {
  if (!fs.existsSync(path.join(root, 'package.json'))) {
    throw new Error('package.json nao encontrado. Rode este script na raiz do projeto Doke.');
  }
}

function countImportant(content) {
  return (content.match(/!important/g) || []).length;
}

function writeFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function main() {
  ensureProjectRoot();
  fs.mkdirSync(reportDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const results = [];
  let totalBefore = 0;
  let totalAfter = 0;

  for (const rel of targets) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      log(`[missing] ${rel}`);
      results.push({ file: rel, status: 'missing', before: 0, after: 0 });
      continue;
    }

    const beforeContent = fs.readFileSync(abs, 'utf8');
    const before = countImportant(beforeContent);
    const backupPath = path.join(backupDir, rel);
    writeFileEnsured(backupPath, beforeContent);

    const afterContent = beforeContent.replace(/\s*!important\b/g, '');
    const after = countImportant(afterContent);
    fs.writeFileSync(abs, afterContent, 'utf8');

    totalBefore += before;
    totalAfter += after;
    log(`[updated] ${rel}: ${before} -> ${after} !important`);
    results.push({ file: rel, status: 'updated', before, after });
  }

  const report = [
    '# Stage 63G — Before/After media important reduction',
    '',
    'Reducao interna de `!important` em arquivos especificos de midia before/after. Nao remove arquivos e nao altera HTML.',
    '',
    `Backup local: \`${path.relative(root, backupDir).replace(/\\/g, '/')}\``,
    '',
    '## Resultado',
    '',
    `- total antes: ${totalBefore}`,
    `- total depois: ${totalAfter}`,
    `- reducao: ${totalBefore - totalAfter}`,
    '',
    '## Arquivos',
    '',
    ...results.map((item) => `- \`${item.file}\` — ${item.status}; ${item.before} -> ${item.after}`),
    '',
    '## Validacao recomendada',
    '',
    '- Conferir modais/preview de before-after/workers no mobile e desktop.',
    '- Rodar `npm.cmd run audit:frontend` e `npm.cmd run audit:important-reduction-plan`.',
  ].join('\n');

  writeFileEnsured(path.join(reportDir, 'stage63g-before-after-media-important-reduction.md'), report);
  writeFileEnsured(path.join(reportDir, 'stage63g-before-after-media-important-reduction.json'), JSON.stringify({ backupDir: path.relative(root, backupDir), results, totalBefore, totalAfter }, null, 2));
  writeFileEnsured(path.join(root, 'stage63g-before-after-media-important-reduction-log.txt'), logLines.join('\n') + '\n');
}

try {
  main();
} catch (error) {
  console.error(`ERRO: ${error.message}`);
  try {
    writeFileEnsured(path.join(process.cwd(), 'stage63g-before-after-media-important-reduction-log.txt'), logLines.concat([`ERRO: ${error.message}`]).join('\n') + '\n');
  } catch (_) {}
  process.exit(1);
}
