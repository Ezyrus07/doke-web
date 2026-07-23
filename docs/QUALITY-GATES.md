# Doke Quality Gates

Este documento define o mínimo para aceitar mudanças sem regredir arquitetura, contratos funcionais ou o baseline visual aprovado.

## Regra central

O commit do Pull Request é a única entrada do CI. Workflows não podem transportar ou reconstruir o candidato por ZIP, base64, payload textual, fragmentos manuais ou armazenamento externo.

## Gates bloqueantes

Execute:

```bash
npm run audit:all
npm run audit:quality-pipeline
npm run audit:domain-completion-matrix
npm run audit:agent-governance
npm run audit:unused-asset-candidates
npm run audit:duplicate-assets
npm run audit:edge-function-source-closure
npm run audit:e2e-lanes
npm run test:e2e:blocking
npm run test:visual:structural
git diff --check
```

A lane bloqueante contém apenas specs determinísticos, reproduzíveis no runner e independentes de staging ou contas reais. Falha nessa lane bloqueia o candidato.

O guard visual estrutural executa a matriz versionada de 15 páginas por 7 viewports, totalizando 105 casos. Ele valida shell, overflow, scroll, erros de console/rede e captura uma evidência por caso; os baselines obrigatórios precisam existir. A comparação pixel a pixel dos snapshots existentes continua disponível separadamente em `npm run test:visual`.

## Lane diagnóstica

Execute:

```bash
npm run test:e2e:diagnostic
```

No CI, `npm run test:e2e:diagnostic:ci` sempre publica o resultado real e o relatório, mas não bloqueia a lane principal. Cada spec deve registrar owner, motivo e critério de promoção em `config/e2e-lanes.json`.

## Partição E2E

`npm run audit:e2e-lanes` garante que:

- todo spec ativo pertence exatamente a uma lane;
- nenhum spec pertence às duas lanes;
- exclusões têm justificativa, owner e critério de retorno;
- a classificação é versionada e aparece no diff.

## Closure de fontes das Edge Functions

`npm run audit:edge-function-source-closure` percorre todas as fontes em `supabase/functions`, exige `index.ts` em cada função e falha quando um import relativo não existe ou escapa do diretório da própria função. Esse gate evita deployments que não podem ser reproduzidos pela árvore Git.

Para mudanças de migrations, grants ou recursos da plataforma, execute também:

```bash
npm run test:platform-default-acl-contract
```

A validação remota correspondente está em `supabase/tests/013_platform_default_acl_validation.sql` e deve ser repetida após qualquer criação de objeto público.

## Evidência e aceite

O aceite exige o mesmo SHA no PR e nos workflows, artefatos de execução e resultado explícito de cada lane. Alterações visuais globais também exigem validação responsiva conforme `AGENTS.md`.
