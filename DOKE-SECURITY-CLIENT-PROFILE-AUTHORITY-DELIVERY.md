# Entrega técnica — SEC-001 autoridade de `client_profiles`

## Resultado executivo

O lote foi concluído sobre o ZIP anexado, sem alteração visual. `public.client_profiles` agora é uma autoridade privada de métricas server-owned; o usuário autenticado lê somente a própria linha, nenhum navegador altera contadores ou avaliações, e a reputação pública usa `public.client_profile_public_summaries`, contendo apenas agregados.

A migration remota aplicada neste lote foi `20260722144947 client_profile_consistency_hardening`. Quatorze canários por persona passaram dentro de transação com `ROLLBACK`.

## Causa raiz

1. O ZIP oficial terminava na migration local `101`, mas o staging já continha três migrations substantivas e cinco marcadores no domínio de cliente. Reaplicar essas migrations teria criado drift de histórico.
2. `client_profiles` contém métricas internas (`orders_count`, `average_rating`, `reviews_count`), não dados pessoais editáveis. O backend de identidade a consultava diretamente, portanto a tabela precisava manter leitura do proprietário sem aceitar DML do navegador.
3. A implementação remota preexistente ainda permitia leitura transversal a support/moderator/admin, mantinha `TRUNCATE`, `REFERENCES` e `TRIGGER` no `service_role`, e deixava uma projeção pública obsoleta quando a linha privada era excluída.

## Arquitetura final

- **Privado:** `client_profiles`, RLS owner-only, `authenticated` somente `SELECT`, `service_role` somente CRUD.
- **Público:** `client_profile_public_summaries`, somente `user_id`, pedidos concluídos, média, quantidade de avaliações e timestamp.
- **Mutações:** derivadas de pedidos concluídos e avaliações publicadas por funções privadas; reconciliação pública executável somente por `service_role`.
- **Operação:** support/admin não recebem leitura transversal via Data API. Uma futura necessidade operacional deve usar RPC/Edge Function restrita e auditável.
- **Consistência:** suspensão, inelegibilidade ou exclusão da linha privada removem a projeção pública.

## Migrations locais e remotas

| Local | Remoto | Situação |
|---|---|---|
| `102_client_profile_table_authority.sql` | `20260722140955 client_profile_table_authority` | reconstruída do histórico remoto; não reaplicada |
| `103_client_profile_metrics_authority.sql` | `20260722141058 client_profile_metrics_authority` | reconstruída do histórico remoto; não reaplicada |
| `104_client_profile_permission_contract.sql` | `20260722141132 client_profile_final_permissions` | reconstruída do histórico remoto; não reaplicada |
| `105_client_profile_consistency_hardening.sql` | `20260722144947 client_profile_consistency_hardening` | aplicada e validada |

Os cinco registros remotos entre `14:13:42` e `14:14:43` executam apenas `select 1`; foram documentados como marcadores remotos e não convertidos em arquivos locais sem valor operacional.

## Arquivos de produto impactados

- `backend/modules/auth/identity-service.js`: inclui `reviews_count` na leitura owner-safe e normaliza a métrica.
- `package.json`: registra os dois testes do lote.
- Não houve alteração em HTML, CSS, Comunidade, pagamentos, carteira ou pedidos.

## Validação

Passaram: contratos e runtime de cliente; identidade/RLS; autoridade de papel; KYC; auth/sessão; contrato de permissões; readiness Supabase; fundação JS; auditoria da matriz; checklist e varredura literal de secrets.

Evidências de integridade:

- 184/184 caminhos de Comunidade idênticos byte a byte;
- nenhum HTML ou CSS alterado;
- `package-lock.json` inalterado;
- `!important` em CSS de produção: 11.724 antes e depois;
- 968 arquivos JS passaram em `node --check`;
- 2.879 arquivos foram examinados na varredura de secrets; nenhum secret literal foi encontrado. A chave `anon` legada do frontend foi classificada corretamente como publishable, não como `service_role`.

Três testes antigos de perfil continuam falhando e reproduziram exatamente a mesma falha na extração original: `test:profile-family-contract`, `test:profile-write-contract` e `test:professional-profile-setup-contract`. Eles não foram “corrigidos” neste lote porque isso exigiria alterar produto visual/textual fora do escopo.

## Advisors e riscos restantes

Não existe finding de advisor específico de `client_profiles`. Permanecem 11 tabelas públicas sem RLS, 18 funções `SECURITY DEFINER` executáveis por `anon`, 33 por `authenticated`, listagem ampla do bucket `service-media`, proteção contra senhas vazadas desativada e dívidas globais de índices/policies.

## Limitações reais

- Não foi criado usuário falso persistente. A materialização de nova conta foi validada pela função canônica e pelas três linhas existentes; o canário destrutivo completo permaneceu transacional.
- Não foi executada suíte visual/Playwright, pois nenhuma superfície visual, rota ou shell mudou. A preservação foi provada por comparação byte a byte.
- `force RLS` permanece `false`; a autoridade depende de RLS para papéis da Data API e de grants mínimos, enquanto `postgres`/papéis bypass continuam operacionais por desenho.

## Próximo lote recomendado

Fechar primeiro as RPCs privilegiadas financeiras e de idempotência executáveis por `anon`, começando por mutações monetárias. O risco é superior ao de conveniência operacional porque essas funções são `SECURITY DEFINER` e podem produzir efeitos financeiros. Em seguida, fechar `audit_logs` com RLS, projeções auditáveis e índices diretamente relacionados.
