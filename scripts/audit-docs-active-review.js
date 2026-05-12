#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const reportPath = path.join(docsDir, 'DOCS-ACTIVE-REVIEW-DECISION-MAP.md');
const validationPath = path.join(docsDir, 'validation', 'global-cycle-61-docs-active-review.json');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

const activePatterns = [
  /ARCHITECTURE/i,
  /FRONTEND-GOVERNANCE/i,
  /GLOBAL-(ORGANIZATION|LAYOUT|COMPONENTS)/i,
  /DATA-(READY|BACKEND)|MOCK-DATA|REPOSITORY-BOUNDARY|PAGE-DATA/i,
  /DESIGN-SYSTEM|PROJECT-STRUCTURE|FILES-ORGANIZATION/i,
  /QUALITY-GATES|SECURITY-CHECKLIST|PERFORMANCE-SEO/i,
  /API-CONTRACTS|PRODUCT-MODULES|PAGE-ROUTE-MAP|PAGES-MAP/i,
  /COMMUNICATION-DATA-READINESS|PERFIL-DATA-READINESS/i,
];

const archivePatterns = [
  /GLOBAL-CYCLE-\d+/i,
  /STAGE\d+|STAGE[-_ ]?\d+/i,
  /PROMPT/i,
  /FIX|HOTFIX|FINAL|REBUILD|RECOVERY|PARITY|NORMALIZATION|REFINEMENT|REDESIGN/i,
  /css-cleanup-report/i,
  /RELATORIO|relatorio/i,
  /MOBILE-LOCK|mobile-header-v|profile-mobile-v/i,
];

const reviewPatterns = [
  /HOME|INDEX|PROFILE|PERFIL|MESSAGES|MENSAGENS|COMUNIDADE|PEDIDOS|RESULTADOS/i,
  /RESPONSIVE|MOBILE|CSS|BORDER|HEADER|AVATAR|BOTTOM-NAV/i,
];

const files = walk(docsDir).filter((file) => !rel(file).startsWith('docs/archive/') && !rel(file).startsWith('docs/validation/') && !rel(file).startsWith('docs/removals/'));

const buckets = {
  promoteToActiveContract: [],
  keepActiveReview: [],
  archiveCandidate: [],
  generatedReport: [],
};

for (const file of files) {
  const r = rel(file);
  const name = path.basename(file);
  if (/DOCS-|README/i.test(name) || r.startsWith('docs/reports/')) {
    buckets.generatedReport.push(r);
  } else if (activePatterns.some((rx) => rx.test(name))) {
    buckets.promoteToActiveContract.push(r);
  } else if (archivePatterns.some((rx) => rx.test(name))) {
    buckets.archiveCandidate.push(r);
  } else if (reviewPatterns.some((rx) => rx.test(name))) {
    buckets.keepActiveReview.push(r);
  } else {
    buckets.keepActiveReview.push(r);
  }
}

for (const key of Object.keys(buckets)) buckets[key].sort();

const activeNext = buckets.promoteToActiveContract.slice(0, 40);
const reviewNext = buckets.keepActiveReview.slice(0, 40);
const archiveNext = buckets.archiveCandidate.slice(0, 40);

const md = `# Ciclo Global 61 — decisão de documentação active-review\n\n` +
`Este relatório classifica a documentação atual sem mover nem apagar arquivos. O objetivo é decidir o que deve virar contrato ativo, o que continua em revisão e o que pode ir para arquivo histórico em ciclo posterior.\n\n` +
`## Resumo\n\n` +
`| Grupo | Quantidade | Ação recomendada |\n|---|---:|---|\n` +
`| Promover para contrato ativo | ${buckets.promoteToActiveContract.length} | Manter em \`docs/\` e consolidar no índice ativo |\n` +
`| Manter em revisão | ${buckets.keepActiveReview.length} | Revisar antes de mover; pode conter contexto útil de páginas ainda em evolução |\n` +
`| Candidato a arquivo histórico | ${buckets.archiveCandidate.length} | Mover em lote controlado para \`docs/archive/\` depois de validação |\n` +
`| Relatórios/índices gerados | ${buckets.generatedReport.length} | Manter como evidência ou mover para \`docs/reports/\` futuramente |\n\n` +
`## Contratos ativos recomendados\n\n` +
(activeNext.length ? activeNext.map((x) => `- \`${x}\``).join('\n') : '- Nenhum') +
`\n\n## Documentos que continuam em revisão\n\n` +
(reviewNext.length ? reviewNext.map((x) => `- \`${x}\``).join('\n') : '- Nenhum') +
`\n\n## Candidatos a arquivo histórico\n\n` +
(archiveNext.length ? archiveNext.map((x) => `- \`${x}\``).join('\n') : '- Nenhum') +
`\n\n## Decisão técnica\n\n` +
`Não mover documentação neste ciclo. A próxima etapa segura é consolidar um índice de contratos ativos e só depois arquivar os candidatos históricos por lote.\n\n` +
`## Critérios de aceite\n\n` +
`- Nenhum arquivo de produto alterado.\n` +
`- Nenhum documento removido.\n` +
`- Contratos ativos identificados antes da migração para arquivo.\n` +
`- Documentos ambíguos permanecem em revisão.\n`;

fs.writeFileSync(reportPath, md, 'utf8');
const result = {
  cycle: 61,
  name: 'docs-active-review',
  generatedAt: new Date().toISOString(),
  totals: {
    markdownScanned: files.length,
    promoteToActiveContract: buckets.promoteToActiveContract.length,
    keepActiveReview: buckets.keepActiveReview.length,
    archiveCandidate: buckets.archiveCandidate.length,
    generatedReport: buckets.generatedReport.length,
  },
  buckets,
};
fs.writeFileSync(validationPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log('Docs active-review audit passed.');
console.log(JSON.stringify(result.totals, null, 2));
