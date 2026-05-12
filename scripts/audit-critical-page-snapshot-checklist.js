#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const validationDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(validationDir, { recursive: true });

const baselinePath = path.join(validationDir, 'global-cycle-52-critical-page-baseline-report.json');
if (!fs.existsSync(baselinePath)) {
  console.error('Missing baseline report. Run npm run audit:critical-page-baseline first.');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

const viewportMatrix = [
  { key: 'desktop-wide', width: 1440, height: 1100, required: true },
  { key: 'desktop-standard', width: 1280, height: 900, required: true },
  { key: 'tablet', width: 834, height: 1112, required: true },
  { key: 'mobile', width: 390, height: 844, required: true },
];

const pageSpecificChecks = {
  'index.html': [
    'sidebar/topbar alinhados com o container principal',
    'hero/search sem deslocamento lateral',
    'cards de anúncio com largura, mídia e CTA preservados',
    'Workers rail com cards e setas no eixo correto',
    'Publicações com grid/rail sem quebra de altura',
    'Mais anúncios mantendo ritmo e espaçamento',
    'mobile sem overflow horizontal e com cards no padrão aprovado',
  ],
  'resultados.html': [
    'topbar/search/filtros no mesmo eixo do index',
    'input de busca igual ao padrão visual aprovado',
    'cards de resultado preservando service-card',
    'favoritar/ações com tamanho e posição corretos',
    'grid/lista sem mudança de largura entre seções',
    'mobile com filtros e cards sem cortes laterais',
    'estado empty/loading sem quebrar altura da página',
  ],
  'perfil.html': [
    'hero/capa/avatar preservados por modo owner/visitor/client',
    'tabs com ordem e largura corretas',
    'seções Serviços/Workers/Publicações/Avaliações sem desalinhamento',
    'cards reaproveitando padrão sem regressão visual',
    'botões principais sem mudança de padding/altura',
    'mobile preservando baseline aprovado do perfil',
    'sem reaparecimento de fundos/títulos já removidos em versões anteriores',
  ],
};

function pageRoute(page) {
  return `/${page}`;
}

const checklist = baseline.pages.map(page => {
  const sensitiveTop = page.topSensitiveCss.slice(0, 8).map(css => css.file);
  return {
    page: page.page,
    route: pageRoute(page.page),
    requiredViewports: viewportMatrix,
    protectedAreas: page.protectedAreas,
    pageSpecificChecks: pageSpecificChecks[page.page] || [],
    topSensitiveCss: sensitiveTop,
    blockingRules: [
      'Não aceitar diferença de largura entre header/topbar e conteúdo principal.',
      'Não aceitar overflow horizontal em tablet/mobile.',
      'Não aceitar mudança visual de cards, botões, chips ou shell sem justificativa explícita.',
      'Não aceitar remoção de CSS sensível sem screenshots antes/depois.',
      'Não aceitar novo !important/style=""/arquivo fix-hotfix-stage-final.',
    ],
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  purpose: 'Checklist de snapshot visual antes/depois para index/resultados/perfil.',
  sourceBaseline: 'docs/validation/global-cycle-52-critical-page-baseline-report.json',
  summary: {
    pages: checklist.length,
    viewportsPerPage: viewportMatrix.length,
    totalRequiredSnapshotsPerPass: checklist.length * viewportMatrix.length,
    passesRequired: ['before', 'after'],
    totalSnapshotsForChange: checklist.length * viewportMatrix.length * 2,
  },
  checklist,
};

fs.writeFileSync(path.join(validationDir, 'global-cycle-53-critical-page-snapshot-checklist.json'), JSON.stringify(report, null, 2));

const md = `# Ciclo Global 53 — Checklist de snapshot visual das páginas críticas\n\nEste checklist deve ser usado antes de remover CSS sensível, reduzir \`!important\` em blocos de layout ou alterar cards/shell/header/topbar nas páginas críticas.\n\n## Escopo\n\n- Fonte: \`docs/validation/global-cycle-52-critical-page-baseline-report.json\`\n- Páginas: **${report.summary.pages}**\n- Viewports obrigatórios por página: **${report.summary.viewportsPerPage}**\n- Snapshots por rodada: **${report.summary.totalRequiredSnapshotsPerPass}**\n- Snapshots antes/depois por mudança sensível: **${report.summary.totalSnapshotsForChange}**\n\n## Viewports obrigatórios\n\n| Nome | Largura | Altura | Obrigatório |\n|---|---:|---:|---|\n${viewportMatrix.map(v => `| ${v.key} | ${v.width}px | ${v.height}px | ${v.required ? 'sim' : 'não'} |`).join('\n')}\n\n${checklist.map(page => `## ${page.page}\n\nRota sugerida: \`${page.route}\`\n\n### Áreas protegidas\n\n${page.protectedAreas.map(item => `- ${item}`).join('\n')}\n\n### Checklist específico\n\n${page.pageSpecificChecks.map(item => `- [ ] ${item}`).join('\n')}\n\n### CSS sensíveis que exigem cuidado\n\n${page.topSensitiveCss.map(item => `- \`${item}\``).join('\n') || '- Nenhum CSS sensível listado.'}\n`).join('\n')}\n\n## Regras bloqueantes\n\n- [ ] Header/topbar e conteúdo principal continuam no mesmo eixo visual.\n- [ ] Sidebar/shell não foi alterado para resolver problema local.\n- [ ] Não existe overflow horizontal em tablet/mobile.\n- [ ] Cards, botões, chips, avatars e ratings preservam tamanho/posição.\n- [ ] Nenhum \`!important\` novo foi adicionado.\n- [ ] Nenhum \`style=""\` novo foi adicionado.\n- [ ] Nenhum arquivo \`fix/hotfix/stage/final/novo/ajuste\` foi criado.\n- [ ] A alteração foi validada antes/depois em desktop, tablet e mobile.\n\n## Decisão técnica\n\nA partir deste ciclo, qualquer remoção de CSS sensível em \`index.html\`, \`resultados.html\` ou \`perfil.html\` deve passar por este checklist. Se não houver snapshot antes/depois, a alteração deve ficar bloqueada ou restrita a auditoria/documentação.\n`;

fs.writeFileSync(path.join(docsDir, 'GLOBAL-CYCLE-53-CRITICAL-PAGE-SNAPSHOT-CHECKLIST.md'), md);
fs.writeFileSync(path.join(docsDir, 'CRITICAL-PAGE-SNAPSHOT-CHECKLIST.md'), md);

console.log(`Critical page snapshot checklist complete: ${checklist.length} pages.`);
console.log(`Required before/after snapshots per sensitive change: ${report.summary.totalSnapshotsForChange}.`);
