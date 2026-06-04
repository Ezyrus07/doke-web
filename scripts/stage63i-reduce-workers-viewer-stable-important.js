const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetRel = 'assets/css/components/before-after-workers-preview/workers-viewer-stable-contract.css';
const target = path.join(root, targetRel);
const backupDir = path.join(root, 'reports/generated/stage63i-workers-viewer-stable-backup');
const reportPath = path.join(root, 'reports/generated/stage63i-workers-viewer-stable-important-report.md');

function fail(message) {
  console.error(`ERRO: ${message}`);
  process.exitCode = 1;
}

function countImportant(content) {
  return (content.match(/!important\b/g) || []).length;
}

if (!fs.existsSync(path.join(root, 'package.json'))) {
  fail('execute este script na raiz do projeto Doke, onde existe package.json.');
  return;
}

if (!fs.existsSync(target)) {
  fail(`arquivo alvo nao encontrado: ${targetRel}`);
  return;
}

fs.mkdirSync(backupDir, { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const original = fs.readFileSync(target, 'utf8');
const before = countImportant(original);
const backupPath = path.join(backupDir, 'workers-viewer-stable-contract.css');
const metaPath = path.join(backupDir, 'stage63i-backup-meta.json');

if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, original, 'utf8');
}

const updated = original.replace(/\s*!important\b/g, '');
const after = countImportant(updated);

fs.writeFileSync(target, updated, 'utf8');
fs.writeFileSync(metaPath, JSON.stringify({
  stage: '63I',
  target: targetRel,
  backup: path.relative(root, backupPath).replace(/\\/g, '/'),
  beforeImportant: before,
  afterImportant: after,
  generatedAt: new Date().toISOString()
}, null, 2), 'utf8');

const report = `# Stage 63I — Workers Viewer Stable Important Reduction\n\n` +
  `## Alvo\n\n- \`${targetRel}\`\n\n` +
  `## Resultado\n\n` +
  `- !important antes: ${before}\n` +
  `- !important depois: ${after}\n` +
  `- backup: \`${path.relative(root, backupPath).replace(/\\/g, '/')}\`\n\n` +
  `## Observacao\n\nEsta etapa remove apenas marcadores \`!important\` por edicao interna. Nao remove arquivo, nao altera HTML e nao toca em shell/router/header/sidebar.\n`;

fs.writeFileSync(reportPath, report, 'utf8');

console.log(`[Stage 63I] ${targetRel}`);
console.log(`!important: ${before} -> ${after}`);
console.log(`Backup: ${path.relative(root, backupPath)}`);
console.log(`Relatorio: ${path.relative(root, reportPath)}`);
