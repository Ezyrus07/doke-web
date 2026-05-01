#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
const bridgePath = path.join(root, 'assets/css/components/ui/doke-legacy-bridge.css');

const bridgeExists = fs.existsSync(bridgePath);
const pagesWithBridge = htmlFiles.filter((file) => {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  return html.includes('doke-legacy-bridge.css');
});

const css = bridgeExists ? fs.readFileSync(bridgePath, 'utf8').trim() : '';
const violations = [];

if (bridgeExists && css.length > 0) {
  violations.push('assets/css/components/ui/doke-legacy-bridge.css ainda existe com conteúdo.');
}

for (const file of pagesWithBridge) {
  violations.push(`${file} ainda carrega doke-legacy-bridge.css.`);
}

const report = [
  '# Auditoria de remoção da legacy bridge',
  '',
  `Gerado em: ${new Date().toISOString()}`,
  '',
  'Regra Stage 16: `doke-legacy-bridge.css` não deve mais existir com conteúdo nem ser carregado por HTML principal.',
  '',
  `Violações: ${violations.length}`,
  '',
  ...violations.map((v) => `- ${v}`),
  violations.length ? '' : 'Nenhuma violação encontrada. A bridge foi removida do fluxo principal.'
].join('\n');

fs.mkdirSync(path.join(root, 'docs/validation'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/validation/legacy-bridge-scope-audit-report.md'), `${report}\n`);
console.log(report);

if (violations.length > 0) process.exit(1);
