const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetRel = 'assets/css/components/before-after-workers-preview/workers-viewer-integrated.css';
const target = path.join(root, targetRel);
const backupPath = path.join(root, 'reports/generated/stage63j-workers-viewer-integrated-backup/workers-viewer-integrated.css');

function fail(message) {
  console.error(`ERRO: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(path.join(root, 'package.json'))) {
  fail('execute este script na raiz do projeto Doke, onde existe package.json.');
  return;
}

if (!fs.existsSync(backupPath)) {
  fail('backup local da Stage 63J nao encontrado.');
  return;
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(backupPath, target);
console.log(`[Stage 63J Rollback] Restaurado: ${targetRel}`);
