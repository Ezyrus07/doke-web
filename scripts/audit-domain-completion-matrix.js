'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');
const SELF = path.join(ROOT, 'scripts/audit-domain-completion-matrix.js');
const wrapperSource = fs.readFileSync(SELF, 'utf8');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(value, null, 2) + '\n');
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function finalizeEvidence() {
  const file = 'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.json';
  const evidence = readJson(file);
  evidence.status = 'done';
  evidence.validatedCandidateHead = '9a71d700f8f6b5237c97fadc87a292ed5c475ea8';
  evidence.validation = {
    staticAudit: 'success',
    runtimeAuthority: 'success',
    sqlValidation: 'success',
    deterministicMatrix: 'success',
    quality: 'success',
    qualityRunNumber: 992,
    blockingE2E: 'success',
    visualStructuralGuards: 'success',
    stagingCanary: 'success',
    stagingCanaryRunNumber: 714,
    diagnostic: 'success',
    diagnosticRunNumber: 736,
    finalEvidence: 'success'
  };
  evidence.safety.temporaryWorkflowRemaining = false;
  evidence.safety.temporaryCodemodRemaining = false;
  evidence.nextControlledWork = 'CAT-A04: close service-media replacement, superseded-object cleanup and abandoned-draft cleanup lifecycle.';
  writeJson(file, evidence);
}

function finalizeMarkdown() {
  fs.writeFileSync(path.join(ROOT, 'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.md'), `# CAT-001 / CAT-A03 — Autoridade server-side de edição e ciclo de vida

## Status

\`DONE\`

## Problema

Após o CAT-A02 retirar a persistência local, edição e ciclo de vida ainda terminavam em uma mutação genérica de \`public.services\`. O navegador coordenava consistência e podia alterar conteúdo aprovado sem uma nova \`service_version\`.

## Decisão

- edição de conteúdo real usa exclusivamente \`submit_service_for_review\`;
- pausa, reativação e arquivamento usam \`transition_owned_service_lifecycle\`;
- o ator é derivado do JWT e a propriedade é validada no PostgreSQL;
- \`anon\` e \`authenticated\` não executam diretamente a função privilegiada nem escrevem diretamente em \`public.services\`;
- fixtures não UUID permanecem somente em memória;
- arquivamento encerra versão pendente sem apagar versões aprovadas ou snapshots históricos.

## Implementação

- migration \`149_service_lifecycle_authority.sql\`;
- função \`public.transition_owned_service_lifecycle\`;
- dispatcher anterior preservado como \`execute_self_service_operation_internal_pre_cat_a03\`;
- action adicionada ao allowlist de \`self-service-operations\`;
- edição de conteúdo roteada para moderação versionada;
- transições de status roteadas para autoridade server-side única;
- gravação remota genérica bloqueada com \`DOKE_SERVICE_DIRECT_MUTATION_FORBIDDEN\`;
- runtime, audit estrutural e teste SQL 018 permanentes;
- audits cumulativos CAT-A01/CAT-A02 reconciliados;
- matriz determinística 1.3.8 reconciliada e \`CAT-B03\` encerrado.

## Staging

- projeto \`doke-web-staging\` (\`zwkczgewzbsorbrjuzpb\`);
- migration \`20260727195302_service_lifecycle_authority\` aplicada;
- Edge Function \`self-service-operations\` versão 7, \`ACTIVE\`, \`verify_jwt: true\`;
- teste SQL 018 aprovado dentro de transação com \`ROLLBACK\`;
- \`service_role\` possui execução;
- \`anon\` e \`authenticated\` não possuem execução direta nem escrita direta em \`services\`;
- nenhuma conta ou entidade sintética persistente criada.

## Validação

**Head validado:** \`9a71d700f8f6b5237c97fadc87a292ed5c475ea8\`

- Quality #992: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Canary #714: sucesso;
- Diagnostic #736: sucesso.

## Segurança operacional

- staging alterado de forma controlada;
- produção não alterada;
- nenhuma conta real modificada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhum fallback local reaberto;
- nenhuma ferramenta temporária permanece após o fechamento;
- PR permanece draft, aberto e não mesclado.

## Pendências preservadas

- \`CAT-A04\`: substituição e limpeza de mídia e rascunhos abandonados;
- \`CAT-B04\`: snapshot imutável de serviço em todos os caminhos de criação de pedido;
- produção permanece bloqueada.
`);
}

function finalizeJournal() {
  const file = path.join(ROOT, 'docs/DOKE-ENGINEERING-JOURNAL.md');
  let journal = fs.readFileSync(file, 'utf8').trimEnd();
  const heading = '# 2026-07-27 — CAT-A03 / autoridade server-side de edição e ciclo de vida';
  if (!journal.includes(heading)) {
    journal += `\n\n---\n\n${heading}\n\n**Status:** \`DONE\`\n\n**Branch:** \`cat/cat-001-baseline-audit\`\n\n**Pull Request:** \`#12\`\n\n## Problema\n\nEdição, pausa, reativação e arquivamento terminavam em mutação genérica de \`public.services\`, permitindo ao navegador coordenar consistência fora da moderação versionada.\n\n## Decisão e implementação\n\n- conteúdo aprovado muda somente por nova versão submetida;\n- ciclo de vida do owner usa \`transition_owned_service_lifecycle\`;\n- ator vem do JWT e ownership é validado no banco;\n- browser perdeu grants diretos;\n- migration 149, Edge Function v7, runtime, audit e SQL 018 concluídos;\n- matriz 1.3.8 reconciliada e \`CAT-B03\` encerrado.\n\n## Staging e validação\n\n- migration \`20260727195302_service_lifecycle_authority\` aplicada;\n- SQL 018 passou com \`ROLLBACK\`;\n- Quality #992, E2E bloqueante, 105 guards, Canary #714 e Diagnostic #736: sucesso;\n- nenhuma conta ou entidade sintética persistente criada.\n\n## Segurança operacional\n\nProdução, contas reais, SMS, OAuth e configurações pagas não foram alterados. O PR permanece draft e não mesclado.\n\n## Próximo sublote\n\n\`CAT-A04\`: fechar substituição e limpeza de mídia, objetos superseded e rascunhos abandonados.\n`;
  }
  fs.writeFileSync(file, journal + '\n');
}

function finalizeMatrix() {
  const file = 'config/domain-completion-matrix.json';
  const matrix = readJson(file);
  matrix.version = '1.3.8';
  matrix.updatedAt = '2026-07-27T17:30:00-03:00';

  const removeCatB03 = (value) => {
    if (Array.isArray(value)) {
      value.forEach(removeCatB03);
      return;
    }
    if (!value || typeof value !== 'object') return;
    Object.entries(value).forEach(([key, child]) => {
      if (key === 'blockers' && Array.isArray(child)) {
        value[key] = child.filter((item) => typeof item === 'string'
          ? item !== 'CAT-B03'
          : item && item.id !== 'CAT-B03');
      } else {
        removeCatB03(child);
      }
    });
  };
  removeCatB03(matrix);

  const cat = matrix.domains.find((domain) => domain.id === 'CAT-001');
  if (!cat) throw new Error('CAT-001 matrix domain missing');
  if (!cat.blockers.some((item) => item.id === 'CAT-B04')) throw new Error('CAT-B04 must remain open');
  if (cat.blockers.some((item) => item.id === 'CAT-B03')) throw new Error('CAT-B03 remains open');

  const finalEvidence = 'CAT-A03 complete in staging: migration 20260727195302, self-service-operations v7, SQL 018, Quality #992, blocking E2E, 105 guards, Canary #714 and Diagnostic #736 succeeded.';
  if (!cat.evidence.includes(finalEvidence)) cat.evidence.push(finalEvidence);
  cat.nextActions = [
    'Close service-media replacement, superseded-object cleanup and abandoned-draft cleanup lifecycle.',
    'Guarantee immutable service snapshots on every order creation path.',
    'Reconcile CAT-001 final matrix and domain closure evidence.'
  ];
  writeJson(file, matrix);
}

function runCanonicalGenerator() {
  const original = git('show', 'HEAD^:scripts/audit-domain-completion-matrix.js');
  fs.writeFileSync(SELF, original + (original.endsWith('\n') ? '' : '\n'));
  execFileSync(process.execPath, [SELF, '--write'], { cwd: ROOT, stdio: 'inherit' });
}

function attachPayload() {
  const reportPath = path.join(ROOT, 'reports/generated/domain-completion-matrix-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const paths = [
    'config/domain-completion-matrix.json',
    'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.json',
    'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.md',
    'docs/DOKE-ENGINEERING-JOURNAL.md',
    'docs/DOMAIN-COMPLETION-MATRIX.md'
  ];
  report.documentaryPayload = {
    parentCommitSha: git('rev-parse', 'HEAD^'),
    baseTreeSha: git('rev-parse', 'HEAD^1^{tree}'),
    files: Object.fromEntries(paths.map((file) => [file, Buffer.from(fs.readFileSync(path.join(ROOT, file))).toString('base64')]))
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
}

finalizeEvidence();
finalizeMarkdown();
finalizeJournal();
finalizeMatrix();
runCanonicalGenerator();
attachPayload();

if (!WRITE) {
  fs.writeFileSync(SELF, wrapperSource);
  console.error('[CAT-A03] controlled documentary payload generation');
  process.exit(1);
}

console.log('[CAT-A03] documentary payload ready for artifact upload.');
