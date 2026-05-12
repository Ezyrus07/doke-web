#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
const legacyBridgeFile = ['doke', 'legacy', 'bridge'].join('-') + '.css';
const legacyBridgeRel = path.join('assets', 'css', 'components', 'ui', legacyBridgeFile).replace(/\\/g, '/');
const bridgePath = path.join(root, 'assets', 'css', 'components', 'ui', legacyBridgeFile);

const bridgeExists = fs.existsSync(bridgePath);
const pagesWithBridge = htmlFiles.filter((file) => {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  return html.includes(legacyBridgeFile) || html.includes(legacyBridgeRel);
});

const css = bridgeExists ? fs.readFileSync(bridgePath, 'utf8').trim() : '';
const violations = [];

if (bridgeExists && css.length > 0) {
  violations.push(`${legacyBridgeRel} ainda existe com conteúdo.`);
}

for (const file of pagesWithBridge) {
  violations.push(`${file} ainda carrega ${legacyBridgeFile}.`);
}

const report = [
  '# Auditoria de remoção da legacy bridge',
  '',
  `Gerado em: ${new Date().toISOString()}`,
  '',
  'Regra: a bridge legada não deve existir com conteúdo nem ser carregada por HTML principal.',
  '',
  `Violações: ${violations.length}`,
  '',
  ...violations.map((v) => `- ${v}`),
  violations.length ? '' : 'Nenhuma violação encontrada. A bridge legada foi removida do fluxo principal.'
].join('\n');

fs.mkdirSync(path.join(root, 'docs/validation'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/validation/legacy-bridge-scope-audit-report.md'), `${report}\n`);
console.log(report);

if (violations.length > 0) process.exit(1);
