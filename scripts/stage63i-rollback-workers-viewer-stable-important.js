const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targetRel = 'assets/css/components/before-after-workers-preview/workers-viewer-stable-contract.css';
const target = path.join(root, targetRel);
const backupPath = path.join(root, 'reports/generated/stage63i-workers-viewer-stable-backup/workers-viewer-stable-contract.css');

function fail(message) {
  console.error(`ERRO: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(path.join(root, 'package.json'))) {
  fail('execute este script na raiz do projeto Doke, onde existe package.json.');
  return;
}

if (!fs.existsSync(backupPath)) {
  fail('backup local da Stage 63I nao encontrado.');
  return;
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(backupPath, target);
console.log(`[Stage 63I Rollback] Restaurado: ${targetRel}`);
