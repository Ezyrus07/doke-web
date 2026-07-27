#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jsonPath = path.join(root, 'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.json');
const markdownPath = path.join(root, 'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.md');
const journalPath = path.join(root, 'docs/DOKE-ENGINEERING-JOURNAL.md');
const validatedCandidateHead = '0bf9c9971ebd70336cd7b5b3f05fe57ccec8b92f';
const matrixReconciliationHead = '2a70125fe44fd007a7ba863c09dcf8c3972103b5';
const journalHeading = '# 2026-07-27 — CAT-A02 / retirada da autoridade persistente de serviços';

const evidence = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
evidence.status = 'done';
evidence.validatedCandidateHead = validatedCandidateHead;
evidence.matrixReconciliationHead = matrixReconciliationHead;
evidence.validation = {
  staticAudit: 'success',
  runtimeRetirement: 'success',
  cumulativeCatA01: 'success',
  repositoryContract: 'success',
  detailRouteContract: 'success',
  deterministicMatrix: 'success',
  quality: 'success',
  qualityRunNumber: 938,
  blockingE2E: 'success',
  visualStructuralGuards: 'success',
  stagingCanary: 'success',
  stagingCanaryRunNumber: 676,
  diagnostic: 'success',
  diagnosticRunNumber: 696,
  finalEvidence: 'success'
};
evidence.safety = Object.assign({}, evidence.safety, {
  temporaryWorkflowRemaining: false,
  temporaryCodemodRemaining: false,
  prMerged: false
});
evidence.nextControlledWork = 'CAT-A03: move owner edit, pause, reactivate and archive to explicit server operations without bypassing versioned moderation.';
fs.writeFileSync(jsonPath, JSON.stringify(evidence, null, 2) + '\n');

let markdown = fs.readFileSync(markdownPath, 'utf8');
markdown = markdown.replace('`IMPLEMENTED — VALIDATION PENDING`', '`DONE`');
if (!markdown.includes('## Validação concluída')) {
  markdown += `\n\n## Validação concluída\n\n**Head validado:** \`${validatedCandidateHead}\`\n\n- audit CAT-A01 cumulativo: sucesso;\n- audit CAT-A02: sucesso;\n- runtime CAT-A02: sucesso;\n- contrato Supabase do repositório: sucesso;\n- contrato canônico da rota de detalhe: sucesso;\n- matriz determinística 1.3.6: sucesso;\n- Doke Quality Gates #938: sucesso;\n- E2E bloqueante: sucesso;\n- 105 guards visuais: sucesso;\n- Doke Staging Edge HTTP Canary #676: sucesso;\n- Doke Diagnostic E2E #696: sucesso.\n\n## Próximo sublote\n\n\`CAT-A03\`: mover edição, pausa, reativação e arquivamento do owner para operações server-side explícitas, sem contornar a moderação versionada.\n`;
}
fs.writeFileSync(markdownPath, markdown.replace(/\s+$/, '') + '\n');

let journal = fs.readFileSync(journalPath, 'utf8');
if (!journal.includes(journalHeading)) {
  journal = journal.replace(/\s+$/, '') + `\n\n---\n\n${journalHeading}\n\n**Status:** \`DONE\`\n\n**Branch:** \`cat/cat-001-baseline-audit\`\n\n**Pull Request:** \`#12\`\n\n## Problema\n\nO catálogo público e a moderação versionada já possuíam autoridade remota, mas \`services-repository.js\` ainda mantinha uma segunda autoridade persistente em \`doke.services.local.v1\`. O browser gravava antes da mutação remota, devolvia cópias pendentes após falhas e tentava sincronizá-las posteriormente. Edição, pausa, reativação e arquivamento herdavam essa fronteira híbrida.\n\n## Decisão\n\n- \`services\`, \`service_media\` e \`service_versions\` permanecem as autoridades reais do catálogo;\n- sessões Supabase e sujeitos UUID devem falhar fechado quando a autoridade remota estiver indisponível;\n- fixtures não UUID podem existir somente em memória durante o runtime atual;\n- nenhuma fixture pode mascarar uma leitura remota configurada;\n- CAT-A03 permanece separado para operações explícitas de edição e ciclo de vida.\n\n## Implementação\n\n- removidos \`localStorage\`, \`doke.services.local.v1\` e a sincronização posterior de pendências;\n- criada autoridade \`supabase-or-fixture-memory\`;\n- fixtures não UUID passaram para memória volátil;\n- criado erro \`DOKE_SERVICE_AUTHORITY_UNAVAILABLE\`;\n- leituras e gravações reais passaram a falhar fechado;\n- submissão para análise devolve o snapshot canônico sem persistência no navegador;\n- contratos do repositório e da rota de detalhe foram reconciliados;\n- criados audit e runtime permanentes CAT-A02;\n- CAT-A01 passou a funcionar como gate cumulativo;\n- matriz determinística 1.3.6 reconciliada sem remover CAT-B03 ou CAT-B04;\n- Quality canônico passou a executar audit e runtime CAT-A02;\n- workflows, codemods e relatórios temporários foram removidos.\n\n## Validação\n\n**Head validado:** \`${validatedCandidateHead}\`\n\n- audit CAT-A01 cumulativo: sucesso;\n- audit CAT-A02 e runtime CAT-A02: sucesso;\n- contratos de repositório e detalhe: sucesso;\n- matriz determinística: sucesso;\n- Doke Quality Gates #938: sucesso;\n- E2E bloqueante: sucesso;\n- 105 guards visuais: sucesso;\n- Doke Staging Edge HTTP Canary #676: sucesso;\n- Doke Diagnostic E2E #696: sucesso.\n\n## Segurança operacional\n\n- nenhuma migration aplicada;\n- nenhuma Edge Function implantada;\n- staging não alterado;\n- produção não alterada;\n- nenhuma conta real ou sintética persistente modificada;\n- nenhum SMS, OAuth ou recurso pago habilitado;\n- nenhuma autoridade local aposentada foi reaberta;\n- nenhuma ferramenta temporária permanece;\n- PR permanece draft, aberto e não mesclado.\n\n## Pendências preservadas\n\n- \`CAT-A03\`: operações server-side explícitas para edição, pausa, reativação e arquivamento;\n- \`CAT-A04\`: ciclo de limpeza de mídia e rascunhos abandonados;\n- \`CAT-B04\`: snapshots imutáveis de serviço em todos os caminhos de criação de pedidos;\n- produção permanece bloqueada.\n`;
}
fs.writeFileSync(journalPath, journal.replace(/\s+$/, '') + '\n');

console.log('CAT-A02 evidence and engineering journal finalized.');
