#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const validationDir = path.join(docsDir, 'validation');

const ACTIVE_EXACT = new Set([
  'README.md',
  'DOCS-REGISTRY.md',
  'GLOBAL-ORGANIZATION-PLAN.md',
  'GLOBAL-LAYOUT-CONTRACT.md',
  'GLOBAL-COMPONENTS-BASE-CONTRACT.md',
  'DATA-READY-CONTRACTS.md',
  'MOCK-DATA-BOUNDARIES.md',
  'PAGE-DATA-ORCHESTRATION-MAP.md',
  'ACTIVE-FILES.md',
  'API-CONTRACTS.md',
  'ARCHITECTURE-DECISIONS.md',
  'DATA-BACKEND-CONTRACTS.md',
  'DATA-MODEL-DRAFT.md',
  'DESIGN-SYSTEM-GUIDE.md',
  'FILES-ORGANIZATION.md',
  'FRONTEND-CHANGE-CHECKLIST.md',
  'FRONTEND-GOVERNANCE.md',
  'FRONTEND_COMPONENT_CONTRACTS.md',
  'PERFIL-DATA-READINESS-MAP.md',
  'COMMUNICATION-DATA-READINESS-MAP.md'
]);

const ACTIVE_PATTERNS = [
  /CONTRACTS?\.md$/,
  /CONTRACT\.md$/,
  /GUIDE\.md$/,
  /GOVERNANCE\.md$/,
  /CHECKLIST\.md$/,
  /ORGANIZATION\.md$/,
  /ARCHITECTURE/i,
  /DATA-READY/i,
  /DATA-READINESS/i,
  /ORCHESTRATION/i,
  /BOUNDARIES/i,
  /DESIGN-SYSTEM/i,
  /FRONTEND/i
];

const HISTORICAL_PATTERNS = [
  /^GLOBAL-CYCLE-\d+-.+\.md$/,
  /STAGE\d*/i,
  /PROMPT-?\d*/i,
  /FIX/i,
  /HOTFIX/i,
  /FINAL/i,
  /REFINEMENT/i,
  /PARITY/i,
  /NORMALIZATION/i,
  /REDESIGN/i,
  /LEGACY/i,
  /REBUILD/i,
  /REMOVAL/i,
  /MIGRATION/i,
  /AUDIT/i,
  /REPORT/i,
  /SUMMARY/i,
  /COMPLETE/i,
  /COMPLETION/i
];

const VALIDATION_PATTERNS = [/report\.json$/i, /audit\.json$/i, /\.md$/i];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function scoreDoc(relativePath) {
  const base = path.basename(relativePath);
  const lower = relativePath.toLowerCase();

  if (lower.startsWith('docs/validation/')) {
    return { bucket: 'validation', reason: 'Arquivo gerado de validação/auditoria. Deve permanecer em docs/validation ou ser limpo por política de retenção.' };
  }
  if (lower.startsWith('docs/removals/')) {
    return { bucket: 'removal-log', reason: 'Registro de remoção controlada. Deve permanecer em docs/removals.' };
  }
  if (lower.startsWith('docs/reports/')) {
    return { bucket: 'report', reason: 'Relatório gerado. Deve permanecer em docs/reports ou ser arquivado por retenção.' };
  }
  if (lower.startsWith('docs/archive/')) {
    return { bucket: 'archived', reason: 'Já está em docs/archive.' };
  }

  if (ACTIVE_EXACT.has(base)) {
    return { bucket: 'active-contract', reason: 'Documento ativo conhecido: contrato, mapa ou governança atual.' };
  }

  if (HISTORICAL_PATTERNS.some((pattern) => pattern.test(base))) {
    return { bucket: 'archive-candidate', reason: 'Nome indica ciclo histórico, correção, prompt, stage, fix, parity, final, audit ou legado.' };
  }

  if (ACTIVE_PATTERNS.some((pattern) => pattern.test(base))) {
    return { bucket: 'active-review', reason: 'Parece contrato/guia ativo, mas precisa revisão humana antes de virar fonte oficial.' };
  }

  return { bucket: 'needs-review', reason: 'Documento sem sinal claro de ativo ou histórico. Revisar antes de mover.' };
}

const allDocs = walk(docsDir).filter((file) => /\.(md|json)$/i.test(file));
const classified = allDocs.map((file) => {
  const relativePath = rel(file);
  const stat = fs.statSync(file);
  const { bucket, reason } = scoreDoc(relativePath);
  return { path: relativePath, bucket, reason, sizeBytes: stat.size };
}).sort((a, b) => a.path.localeCompare(b.path));

const groups = classified.reduce((acc, item) => {
  acc[item.bucket] ||= [];
  acc[item.bucket].push(item);
  return acc;
}, {});

const bucketOrder = [
  'active-contract',
  'active-review',
  'archive-candidate',
  'needs-review',
  'validation',
  'report',
  'removal-log',
  'archived'
];

const reportLines = [];
reportLines.push('# Classificação de documentação ativa x histórica — Doke');
reportLines.push('');
reportLines.push('Este relatório classifica a documentação existente sem mover ou apagar arquivos. Ele serve como base para uma migração controlada futura para `docs/archive/`, `docs/reports/`, `docs/validation/` e `docs/removals/`.');
reportLines.push('');
reportLines.push('## Resumo');
reportLines.push('');
reportLines.push(`- Arquivos analisados: **${classified.length}**`);
for (const bucket of bucketOrder) {
  const count = groups[bucket]?.length || 0;
  reportLines.push(`- ${bucket}: **${count}**`);
}
reportLines.push('');
reportLines.push('## Regra de decisão');
reportLines.push('');
reportLines.push('- **active-contract**: fonte atual de arquitetura, contratos, governança ou data-readiness.');
reportLines.push('- **active-review**: parece ativo, mas precisa revisão humana antes de virar fonte oficial.');
reportLines.push('- **archive-candidate**: documento histórico/ciclo/fix/stage/final/prompt/audit que não deve guiar decisões novas.');
reportLines.push('- **needs-review**: documento ambíguo. Não mover automaticamente.');
reportLines.push('- **validation/report/removal-log/archived**: arquivos já classificados por pasta.');
reportLines.push('');

for (const bucket of bucketOrder) {
  const items = groups[bucket] || [];
  reportLines.push(`## ${bucket} (${items.length})`);
  reportLines.push('');
  if (!items.length) {
    reportLines.push('_Nenhum arquivo._');
    reportLines.push('');
    continue;
  }
  for (const item of items.slice(0, 80)) {
    reportLines.push(`- \`${item.path}\` — ${item.reason}`);
  }
  if (items.length > 80) {
    reportLines.push(`- ... mais ${items.length - 80} arquivo(s). Veja JSON de validação para lista completa.`);
  }
  reportLines.push('');
}

reportLines.push('## Próxima ação recomendada');
reportLines.push('');
reportLines.push('1. Revisar manualmente os itens `active-review`.');
reportLines.push('2. Mover somente os `archive-candidate` óbvios para `docs/archive/` em ciclo separado, com script de cleanup e auditoria.');
reportLines.push('3. Não mover documentos `needs-review` sem confirmar se ainda são usados como referência.');
reportLines.push('4. Manter `docs/validation/` e `docs/removals/` como histórico de auditorias e remoções controladas.');
reportLines.push('');

const docsOut = path.join(docsDir, 'DOCS-ACTIVE-HISTORICAL-CLASSIFICATION.md');
fs.writeFileSync(docsOut, reportLines.join('\n'));

const validationOut = path.join(validationDir, 'global-cycle-59-docs-classification.json');
fs.mkdirSync(validationDir, { recursive: true });
fs.writeFileSync(validationOut, JSON.stringify({
  generatedAt: new Date().toISOString(),
  total: classified.length,
  counts: Object.fromEntries(bucketOrder.map((bucket) => [bucket, groups[bucket]?.length || 0])),
  items: classified
}, null, 2));

console.log(`Docs classified: ${classified.length}`);
for (const bucket of bucketOrder) {
  console.log(`${bucket}: ${groups[bucket]?.length || 0}`);
}
console.log(`Report: ${rel(docsOut)}`);
console.log(`Validation: ${rel(validationOut)}`);
