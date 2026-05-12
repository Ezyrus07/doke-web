#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssPath = path.join(root, 'assets/css/components/cards/service-card.css');
const validationDir = path.join(root, 'docs/validation');
const reportJsonPath = path.join(validationDir, 'global-cycle-24-service-card-important-risk-report.json');
const reportMdPath = path.join(root, 'docs/GLOBAL-CYCLE-24-SERVICE-CARD-IMPORTANT-RISK.md');

if (!fs.existsSync(cssPath)) {
  console.error('Missing service-card.css');
  process.exit(1);
}

const css = fs.readFileSync(cssPath, 'utf8');
const lines = css.split(/\r?\n/);

const groups = {
  'desktop-card-layout': [],
  'desktop-media-sizing': [],
  'desktop-body-layout': [],
  'mobile-card-layout': [],
  'mobile-media-sizing': [],
  'mobile-body-layout': [],
  'unknown': []
};

function currentContext(lineNumber) {
  if (lineNumber >= 577 && lineNumber <= 583) return 'desktop-card-layout';
  if (lineNumber >= 585 && lineNumber <= 593) return 'desktop-media-sizing';
  if (lineNumber >= 595 && lineNumber <= 606) return 'desktop-body-layout';
  if (lineNumber >= 623 && lineNumber <= 628) return 'mobile-card-layout';
  if (lineNumber >= 630 && lineNumber <= 637) return 'mobile-media-sizing';
  if (lineNumber >= 639 && lineNumber <= 649) return 'mobile-body-layout';
  return 'unknown';
}

lines.forEach((line, idx) => {
  if (!line.includes('!important')) return;
  const lineNumber = idx + 1;
  const group = currentContext(lineNumber);
  groups[group].push({ line: lineNumber, declaration: line.trim() });
});

const total = Object.values(groups).reduce((sum, entries) => sum + entries.length, 0);

const riskAssessment = {
  totalImportant: total,
  status: 'mapped-only',
  decision: 'Do not remove the remaining service-card !important rules without visual screenshots for index.html, resultados.html, and perfil.html.',
  rationale: [
    'The remaining rules control desktop/mobile grid, media sizing, body layout, and responsive card geometry.',
    'These rules are likely defending against old page-level overrides and can regress approved marketplace cards if removed blindly.',
    'The safe path is to create a visual QA baseline before continuing this component cleanup.'
  ],
  nextRecommendedCycle: 'Ciclo Global 25 — visual QA baseline for service-card on index/resultados/perfil before removing media/grid !important rules.',
  groups
};

fs.mkdirSync(validationDir, { recursive: true });
fs.writeFileSync(reportJsonPath, JSON.stringify(riskAssessment, null, 2));

const md = `# Ciclo Global 24 — Service Card Important Risk Map\n\n## Objetivo\n\nMapear os \`!important\` restantes em \`assets/css/components/cards/service-card.css\` antes de remover regras sensíveis.\n\n## Resultado\n\n- Total restante: **${total}** ocorrências de \`!important\`.\n- Decisão: **não remover mais neste ciclo**.\n\n## Motivo\n\nAs regras restantes controlam geometria sensível do card:\n\n- layout desktop do card;\n- sizing da mídia desktop;\n- grid/body desktop;\n- layout mobile do card;\n- sizing da mídia mobile;\n- grid/body mobile.\n\nRemover isso sem screenshot antes/depois pode quebrar \`index.html\`, \`resultados.html\` e \`perfil.html\`.\n\n## Distribuição\n\n${Object.entries(groups).map(([group, entries]) => `- ${group}: ${entries.length}`).join('\n')}\n\n## Próximo passo recomendado\n\n**Ciclo Global 25 — baseline visual do service-card** em:\n\n1. \`index.html\`\n2. \`resultados.html\`\n3. \`perfil.html\`\n\nDepois disso, remover os próximos \`!important\` por grupo pequeno, começando por desktop card layout ou mobile body layout, somente se a comparação visual confirmar equivalência.\n\n## Critérios de aceite para o próximo ciclo\n\n- Não alterar HTML provisório.\n- Não mexer em shell/sidebar/header/body.\n- Gerar screenshots ou checklist visual antes/depois.\n- Não remover mídia/grid sem validação visual.\n- Manter card preparado para dados reais, sem acoplar CSS a conteúdo mockado.\n`;

fs.writeFileSync(reportMdPath, md);

console.log('Service-card important risk audit passed.');
console.log(`Remaining !important: ${total}`);
console.log(`Report: ${path.relative(root, reportJsonPath)}`);
