# SEC-001 — relatório do candidato de CI

Data da retomada: 23 de julho de 2026.

## Autoridade e proveniência

- Repositório: `Ezyrus07/doke-web`.
- Base imutável usada: `origin/MAIN` em `470cd1b10b949289db8ac0a9f19804c72df83741`.
- Branch do candidato: `codex/sec-001-ci-candidate`.
- O candidato é formado somente pela árvore Git do branch.
- Nenhum ZIP, payload textual, base64, fragmento de workflow ou artefato externo foi usado para reconstruir fonte.

O PR #5 foi inspecionado antes das alterações. Ele está fechado, não foi mesclado e apontava para o SHA histórico `7bf947df`. Seu conteúdo transportava payloads e workflows temporários, portanto não foi tratado como fonte. As branches remotas temporárias observadas apontavam novamente para `origin/MAIN`.

## Causa raiz

Não existia um candidato-fonte atual e autocontido no Git. A branch principal possuía três grupos de problemas:

1. o workflow de qualidade não separava uma lane E2E determinística da suíte ampla e instável;
2. a validação visual misturava comparação pixel a pixel com o gate estrutural pedido e não materializava identidades válidas para páginas protegidas;
3. a matriz de domínios referenciava migrations, testes e uma Edge Function atribuídos ao SEC-001 que não existem em nenhum commit Git alcançável ou inalcançável inspecionado.

Além disso, uma corrida de lifecycle permitia que uma hidratação antiga publicasse estado global depois de uma navegação interna. A autoridade corrigida foi `assets/js/core/page-hydration.js`, impedindo que uma raiz desconectada altere o estado do documento atual.

## Contrato de CI implementado

- `quality.yml` valida diretamente o checkout do SHA.
- A lane bloqueante contém três specs determinísticos e falha fechada.
- A lane diagnóstica é independente, registra o exit code real e publica artefatos sem bloquear o gate principal.
- `audit:e2e-lanes` exige que todo spec ativo pertença exatamente a uma lane.
- O gate visual estrutural executa 15 páginas por 7 viewports, totalizando 105 casos.
- A comparação pixel a pixel continua disponível separadamente em `npm run test:visual`; o gate estrutural não atualiza snapshots.

## Evidência local

| Validação | Resultado |
| --- | --- |
| Auditoria da partição E2E | 14 specs ativos; 3 bloqueantes; 11 diagnósticos; 0 excluídos |
| Lane E2E bloqueante | 23/23 aprovados |
| Guard visual estrutural | 105/105 aprovados em 7 viewports |
| Lane E2E diagnóstica | 47 aprovados; 65 falharam; exit code real 1; não bloqueante |
| Auditorias estáticas e de governança | aprovadas |
| `git diff --check` | aprovado |

O relatório local da lane diagnóstica é gerado em `reports/generated/e2e-diagnostic-lane-summary.json`. O workflow publica esse JSON, o relatório Playwright, screenshots e traces como artefatos do SHA.

## Estado observado do SEC-001

O snapshot read-only de staging registrou:

- 45 tabelas públicas;
- 0 tabelas públicas sem RLS;
- 0 tabelas com RLS sem policy;
- 134 funções `SECURITY DEFINER`;
- 0 funções `SECURITY DEFINER` efetivamente executáveis por `anon`;
- 7 funções `SECURITY DEFINER` efetivamente executáveis por `authenticated`;
- 1 tabela no Realtime;
- 8 Edge Functions ativas;
- 5 crons ativos.

SEC-001 permanece bloqueado e não deve ser promovido para concluído:

- `SEC-B08` crítico: staging contém efeitos atribuídos às migrations 110–127, mas as fontes, testes e `service-moderation-operations` não existem no histórico Git inspecionado;
- `SEC-B05` alto: proteção contra senhas vazadas está desativada no Supabase Auth;
- `SEC-B07` médio: ACLs padrão pertencentes à plataforma exigem auditoria pós-migration;
- CSP, CORS, rate limits, abuso e evidência HTTP autenticada ainda precisam de fechamento.

## Próximo lote seguro

Continuar dentro de SEC-001. Recuperar a linhagem autoritativa das migrations 110–127 e da Edge Function por um commit Git revisado, sem reconstrução a partir de ZIPs ou payloads de CI. Depois, repetir os canários negativos por persona e o snapshot de staging. Não avançar para AUTH-001 enquanto esse bloqueador crítico permanecer.

## Rollback

Reverter o commit do candidato restaura em conjunto workflows, partição E2E, harness visual, auditorias e correção de lifecycle. Não restaurar os workflows temporários ou payloads do PR #5.

## Complemento de recuperação de linhagem

A entrega local subsequente recuperou, com verificação SHA-256 contra a evidência histórica, as migrations `110–134`, os testes associados e `service-moderation-operations`. O detalhe está em `docs/validation/SEC-001-LINEAGE-RECOVERY.md`. Os contratos específicos passaram 10/10, a lane E2E bloqueante passou 23/23 e os guards estruturais passaram 105/105. O bloqueador `SEC-B08` só pode ser encerrado após commit Git revisado e repetição dos gates no SHA resultante; nenhuma alteração foi aplicada ao staging nesta recuperação.
## Reconciliação read-only subsequente

A reconciliação executada em 23 de julho de 2026 confirmou no staging todos os nomes correspondentes às migrations locais `110–144`, `service-moderation-operations` ativo na versão 2 com JWT obrigatório e o gate de ACL atual com 45 tabelas públicas, zero sem RLS/policies, zero objetos públicos pertencentes a `supabase_admin` e zero grants de sequência para browser. Com isso, `SEC-B08` foi encerrado e `SEC-B07` passou a ser um controle operacional versionado em `supabase/tests/013_platform_default_acl_validation.sql`.

A mesma inspeção encontrou dois módulos de `quote-template-ai` presentes no deployment e ausentes do Git (`shared.ts` e `recommendations.ts`). Eles foram recuperados da versão remota ativa e cobertos por `audit:edge-function-source-closure`. O relatório completo está em `docs/validation/SEC-001-STAGING-RECONCILIATION.md`.

Permanecem abertos `SEC-B05` e `SEC-B09`; não avançar para `AUTH-001`.

