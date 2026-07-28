#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);
const readJson = (file) => JSON.parse(read(file));
const writeJson = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
const unique = (items) => Array.from(new Set(items));

const validatedHead = 'dc51bba8c575102c39f27a711b7ea59d3a5d7387';
const completedAt = '2026-07-28T08:50:00-03:00';
const runs = {
  quality: {
    status: 'success',
    head: validatedHead,
    runId: 30355144463,
    runNumber: 1222,
    jobId: 90261483729,
    url: 'https://github.com/Ezyrus07/doke-web/actions/runs/30355144463'
  },
  blockingE2e: {
    status: 'success',
    head: validatedHead,
    runId: 30355144463,
    runNumber: 1222,
    jobId: 90261660045,
    url: 'https://github.com/Ezyrus07/doke-web/actions/runs/30355144463'
  },
  visualStructuralGuards: {
    status: 'success',
    head: validatedHead,
    runId: 30355144463,
    runNumber: 1222,
    jobId: 90261659999,
    url: 'https://github.com/Ezyrus07/doke-web/actions/runs/30355144463'
  },
  canary: {
    status: 'success',
    head: validatedHead,
    runId: 30355144420,
    runNumber: 792,
    url: 'https://github.com/Ezyrus07/doke-web/actions/runs/30355144420'
  },
  diagnostic: {
    status: 'success',
    head: validatedHead,
    runId: 30355144667,
    runNumber: 886,
    url: 'https://github.com/Ezyrus07/doke-web/actions/runs/30355144667'
  }
};

function appendOnce(file, marker, content) {
  const current = read(file);
  if (current.includes(marker)) return;
  write(file, current.replace(/\s*$/, '') + '\n\n' + content.trim() + '\n');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const a04Path = 'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.json';
const b04Path = 'docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.json';
const a05Path = 'docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.json';
const manifestPath = 'docs/validation/CAT-001-A05-FINAL-TRANSITION-MANIFEST.json';
const matrixPath = 'config/domain-completion-matrix.json';

const a04 = readJson(a04Path);
const b04 = readJson(b04Path);
const a05 = readJson(a05Path);
const manifest = readJson(manifestPath);
const matrix = readJson(matrixPath);
const cat = (matrix.domains || []).find((domain) => domain && domain.id === 'CAT-001');

assert(cat, 'CAT-001 matrix entry is missing.');
assert((cat.blockers || []).some((blocker) => blocker.id === 'CAT-B04'), 'CAT-B04 source blocker is missing before finalization.');
assert(a04.status === 'TECHNICALLY_COMPLETE_CI_PENDING', 'CAT-A04 source status is not pending.');
assert(b04.status === 'CANDIDATE_VALIDATED_CI_PENDING', 'CAT-B04 source status is not pending.');
assert(a05.status === 'RECONCILIATION_CANDIDATE_CI_PENDING', 'CAT-A05 source status is not pending.');
assert(manifest.status === 'PREPARED_CI_GATED_NOT_EXECUTED', 'CAT-A05 transition manifest is not prepared.');

Object.assign(a04, {
  status: 'COMPLETE',
  completedAt,
  validatedHead,
  validation: Object.assign({}, a04.validation, {
    structuralAuditRegisteredInQuality: true,
    runtimeRegisteredInQuality: true,
    sql019: 'passed_with_rollback',
    sql020: 'passed_with_rollback',
    stagingReadOnlyRecheck: 'passed',
    quality: 'success',
    blockingE2e: 'success',
    visualStructuralGuards: 'success',
    canary: 'success',
    diagnostic: 'success',
    runs
  }),
  remainingRisks: [
    'The historical repository helper remains physically present but is unreachable from the business service and all remote mutation boundaries fail closed.',
    'Production remains blocked by global launch and security gates outside CAT-001.'
  ],
  nextControlledStep: 'Proceed with SEARCH-001 while keeping all CAT authority gates cumulative.'
});
writeJson(a04Path, a04);

Object.assign(b04, {
  status: 'COMPLETE',
  completedAt,
  validatedHead,
  validation: Object.assign({}, b04.validation, {
    fullCi: 'success',
    runs
  }),
  remaining: [
    'Keep the immutable approved-service snapshot authority cumulative while ORD-001 evolves.',
    'Production remains blocked by global launch and security gates outside CAT-001.'
  ]
});
writeJson(b04Path, b04);

Object.assign(a05, {
  status: 'COMPLETE',
  completedAt,
  validatedHead,
  ci: runs,
  matrixContract: Object.assign({}, a05.matrixContract, {
    catB04BlockerMustRemain: false,
    removalCondition: 'Satisfied by five successful canonical lanes on validatedHead.'
  }),
  remaining: [
    'Proceed with SEARCH-001 as the next mandatory engineering domain.',
    'Keep CAT-001 maturity at staging_operational and productionGate blocked until global launch gates pass.'
  ],
  nextControlledStep: 'Begin SEARCH-001 without marking PR 12 ready or merging the stacked pull requests.'
});
writeJson(a05Path, a05);

Object.assign(manifest, {
  status: 'EXECUTED_CI_VALIDATED',
  executedAt: completedAt,
  execution: {
    validatedHead,
    runs,
    removedBlockerIds: ['CAT-B04'],
    preserved: manifest.permittedTransition.matrix.preserve,
    productionUnblocked: false,
    prMerged: false,
    prReadyForReview: false
  }
});
writeJson(manifestPath, manifest);

matrix.version = '1.3.9';
matrix.updatedAt = completedAt;
cat.blockers = (cat.blockers || []).filter((blocker) => blocker.id !== 'CAT-B04');
cat.requiredPaths = unique([...(cat.requiredPaths || []),
  'assets/js/services/service-media-upload-service.js',
  'backend/modules/orders/orders-service.js',
  'scripts/audit-service-media-lifecycle-baseline.js',
  'scripts/audit-service-media-upload-authority.js',
  'scripts/test-service-media-upload-authority-runtime.js',
  'scripts/audit-service-media-cleanup-authority.js',
  'scripts/test-service-media-cleanup-authority-runtime.js',
  'scripts/audit-order-service-snapshot-authority.js',
  'scripts/test-order-service-snapshot-authority-runtime.js',
  'scripts/audit-cat-domain-closure-candidate.js',
  'scripts/audit-cat-final-transition-manifest.js',
  'scripts/audit-stacked-ci-trigger-coverage.js',
  'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.json',
  'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.md',
  'docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.json',
  'docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.md',
  'docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.json',
  'docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.md',
  'docs/validation/CAT-001-A05-FINAL-TRANSITION-MANIFEST.json',
  'docs/validation/CAT-001-A05-STACKED-CI-TRIGGER-COVERAGE.json',
  'docs/validation/CAT-001-A05-STACKED-CI-TRIGGER-COVERAGE.md',
  'supabase/migrations/150_service_media_upload_authority.sql',
  'supabase/migrations/151_service_media_legacy_submit_lockdown.sql',
  'supabase/migrations/152_service_media_upload_intent_expiry_consistency_fix.sql',
  'supabase/migrations/153_service_media_upload_items_order_integrity.sql',
  'supabase/migrations/154_service_media_upload_intent_status_index_hardening.sql',
  'supabase/migrations/155_service_media_reference_safe_cleanup_authority.sql',
  'supabase/migrations/156_order_service_snapshot_authority.sql',
  'supabase/migrations/157_order_service_snapshot_coalesce_fix.sql',
  'supabase/tests/019_service_media_upload_authority_validation.sql',
  'supabase/tests/020_service_media_reference_safe_cleanup_validation.sql',
  'supabase/tests/021_order_service_snapshot_authority_validation.sql'
]);
cat.evidence = unique([...(cat.evidence || []),
  `CAT-A04 complete on ${validatedHead}: immutable signed upload intents, one-time consumption and reference-safe Storage cleanup passed Quality #1222, Canary #792 and Diagnostic #886.`,
  `CAT-B04 complete on ${validatedHead}: PostgreSQL freezes the approved service version, canonical professional identity and immutable order snapshot across remote creation paths.`,
  'CAT-A05 reconciled the final evidence, removed CAT-B04 only, preserved maturity 4, partial security and blocked production, and handed the mandatory sequence to SEARCH-001.'
]);
cat.nextActions = [
  'Proceed with SEARCH-001 as the next mandatory engineering domain.',
  'Keep CAT-A01 through CAT-A05 authority, lifecycle, snapshot and CI trigger gates cumulative.',
  'Keep production blocked until the global security and launch gates are satisfied.'
];
cat.completionDisposition = 'core_done_global_blocked';
writeJson(matrixPath, matrix);

appendOnce(
  'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.md',
  '## Final CI closure',
  `## Final CI closure\n\n**Status:** \`COMPLETE\`\n\nValidated head: \`${validatedHead}\`.\n\n- Quality #1222: success;\n- blocking E2E job \`90261660045\`: success;\n- 105 visual structural guards job \`90261659999\`: success;\n- Canary #792: success;\n- Diagnostic #886: success.\n\nThe historical repository helper remains unreachable; signed upload intents and reference-safe server cleanup remain canonical. Production was not changed or unblocked.`
);
appendOnce(
  'docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.md',
  '## Final CI closure',
  `## Final CI closure\n\n**Status:** \`COMPLETE\`\n\nValidated head: \`${validatedHead}\`.\n\nQuality #1222, blocking E2E, 105 visual structural guards, Canary #792 and Diagnostic #886 succeeded on the same head. The \`CAT-B04\` blocker may therefore be removed while production remains blocked.`
);
appendOnce(
  'docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.md',
  '## Executed transition',
  `## Executed transition\n\n**Status:** \`COMPLETE\`\n\nThe five canonical lanes succeeded on \`${validatedHead}\`. CAT-A05 removed only \`CAT-B04\`, preserved maturity 4, remote/canonical authority, staging-operational evidence, partial security and blocked production, and handed the mandatory sequence to \`SEARCH-001\`.`
);

const journalEntry = `
---

# 2026-07-28 — CAT-A04 / fechamento do ciclo de mídia

**Status:** \`DONE\`

**Branch:** \`cat/cat-001-baseline-audit\`  
**Pull Request:** \`#12\`

## Resultado

- uploads reais usam reserva imutável e token assinado;
- o navegador não escolhe caminhos canônicos nem usa \`upsert\`;
- intents são consumidos uma única vez;
- mídia substituída ou abandonada entra em limpeza reference-safe;
- remoção do Storage ocorre pela autoridade server-side com retry e \`SKIP LOCKED\`;
- a rota legada do repositório permanece inalcançável pela camada de negócio.

## Validação final

**Head validado:** \`${validatedHead}\`

- Quality #1222: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Canary #792: sucesso;
- Diagnostic #886: sucesso;
- SQL 019 e SQL 020: sucesso com \`ROLLBACK\`.

## Segurança operacional

Produção, contas reais, pedidos reais, SMS, OAuth e configurações pagas não foram alterados. O PR permanece draft e não mesclado.

---

# 2026-07-28 — CAT-B04 / snapshot imutável de serviço em pedidos

**Status:** \`DONE\`

**Branch:** \`cat/cat-001-baseline-audit\`  
**Pull Request:** \`#12\`

## Resultado

- cada pedido remoto congela \`service_version_id\` e \`service_snapshot\` da versão aprovada;
- o PostgreSQL substitui profissional e snapshot enviados pelo navegador pelos valores canônicos;
- alterações futuras do anúncio não reescrevem o pedido histórico;
- adulteração das projeções dedicada e compatível é bloqueada;
- pedidos do profissional para o próprio serviço são rejeitados.

## Validação final

**Head validado:** \`${validatedHead}\`

- Quality #1222: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Canary #792: sucesso;
- Diagnostic #886: sucesso;
- SQL 021: sucesso com \`ROLLBACK\`.

## Segurança operacional

Nenhum pedido ou usuário sintético persistiu após os testes. Produção permaneceu inalterada.

---

# 2026-07-28 — CAT-A05 / reconciliação final do CAT-001

**Status:** \`DONE\`

**Branch:** \`cat/cat-001-baseline-audit\`  
**Pull Request:** \`#12\`

## Resultado

- cinco lanes canônicas convergiram no mesmo head;
- \`CAT-B04\` foi removido como único blocker encerrado;
- maturidade permaneceu 4;
- autoridade permaneceu \`remote/canonical\`;
- segurança permaneceu \`partial\`;
- \`productionGate\` permaneceu \`blocked\`;
- a sequência obrigatória foi entregue a \`SEARCH-001\`;
- nenhum workflow ou reconciliador temporário permaneceu.

## Evidência de CI

- Quality #1222 / run \`30355144463\`;
- E2E bloqueante / job \`90261660045\`;
- 105 guards visuais / job \`90261659999\`;
- Canary #792 / run \`30355144420\`;
- Diagnostic #886 / run \`30355144667\`;
- head validado: \`${validatedHead}\`.

## Segurança operacional

O PR #12 e o PR pai #11 permanecem abertos, draft e não mesclados. Produção e configurações pagas permaneceram inalteradas.
`;
appendOnce('docs/DOKE-ENGINEERING-JOURNAL.md', '# 2026-07-28 — CAT-A05 / reconciliação final do CAT-001', journalEntry);

console.log('[CAT-A05-FINALIZE] Evidence transitioned to COMPLETE.');
console.log('[CAT-A05-FINALIZE] CAT-B04 removed; maturity and production gate preserved.');
console.log('[CAT-A05-FINALIZE] Engineering journal entries appended.');
