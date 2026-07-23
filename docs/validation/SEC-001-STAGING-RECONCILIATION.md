# SEC-001 — reconciliação read-only de staging

**Data:** 23 de julho de 2026  
**Projeto:** `doke-web-staging` (`zwkczgewzbsorbrjuzpb`)  
**Autoridade Git inspecionada:** `codex/sec-001-ci-candidate@d0ae26570a6292c4195117e06be79efa6a622a49`

## Objetivo

Reconciliar o candidato versionado com o estado remoto sem aplicar migrations, realizar deploys ou executar mutações. O escopo cobre a linhagem recuperada, ACLs atuais, RLS, funções privilegiadas, Edge Functions e advisors de segurança.

## Resultado da linhagem

O registro remoto de migrations utiliza versões timestamp, mas contém todos os nomes correspondentes à sequência local `110–144`, incluindo:

- `notification_authority` até `transaction_attachment_folder_depth_fix`;
- `self_service_operation_dispatcher` e `self_service_direct_rpc_lockdown`;
- a fundação financeira de staging até `staging_finance_sandbox_release_notification_fix`.

A Edge Function `service-moderation-operations` está ativa na versão 2 e exige JWT. Com a recuperação checksum-verificada, o commit `d0ae2657…`, os gates remotos verdes e esta reconciliação, o bloqueador `SEC-B08` pode ser encerrado.

## Resultado de RLS e ACLs atuais

- 45 tabelas no schema `public`;
- nenhuma tabela sem RLS;
- nenhuma tabela com RLS sem policy;
- nenhuma tabela pública pertencente a `supabase_admin`;
- nenhuma sequência pública com grants para `anon` ou `authenticated`;
- 134 funções `SECURITY DEFINER` fora dos schemas de sistema;
- nenhuma execução efetiva por `anon`;
- sete helpers efetivamente executáveis por `authenticated` no schema privado, necessários a políticas internas e fora da superfície pública do Data API.

Os defaults do papel de aplicação `postgres` estão fail-closed para tabelas, sequências e funções. Os defaults de `supabase_admin` permanecem amplos porque pertencem à plataforma e não podem ser alterados pela role de migration. O estado atual não contém objeto público pertencente a `supabase_admin`; portanto, `SEC-B07` deixa de representar exposição existente e passa a ser um controle operacional obrigatório após qualquer criação de objeto pela plataforma.

## Nova lacuna de fonte encontrada

A função remota `quote-template-ai` versão 6 contém cinco arquivos, mas o Git possuía somente `index.ts`, `openai.ts` e `deno.json`. Os módulos importados abaixo estavam ausentes:

- `supabase/functions/quote-template-ai/shared.ts`;
- `supabase/functions/quote-template-ai/recommendations.ts`.

Os dois arquivos foram recuperados diretamente da versão implantada, sem alteração funcional. Foi adicionado `audit:edge-function-source-closure`, que falha quando uma Edge Function possui import relativo ausente ou escapando do próprio diretório. Os contratos `test:quote-template-ai-supervision` e `test:quote-template-ai-provider-fallback` passaram após a recuperação.

## Bloqueadores restantes

### SEC-B05 — proteção contra senhas vazadas

O Security Advisor continua reportando apenas `auth_leaked_password_protection`. A ativação não pode ser feita por migration SQL e exige configuração autorizada do Supabase Auth. A documentação oficial informa que o recurso fica em **Authentication → Providers → Email / Auth settings** e está disponível no plano Pro ou superior.

### CORS, limites e abuso

Sete das oito Edge Functions locais usam `Access-Control-Allow-Origin: *`. Apenas `quote-template-ai` possui rate limit e limite explícito de corpo na aplicação. Nenhuma função foi modificada ou implantada neste lote. O próximo lote deve definir allowlist de origens, contrato de preflight, limites por ação/persona e comportamento de fallback antes de alterar código.

### Evidência HTTP autenticada

Ainda faltam canários browser/HTTP por persona para `self-service-operations`, moderação e ciclo de Storage assinado. Eles não devem ser substituídos por testes estáticos.

## Alterações remotas

Nenhuma. Foram executadas apenas consultas read-only, leitura de advisors e leitura das fontes das Edge Functions.

## Próxima decisão

1. publicar a recuperação de fonte de `quote-template-ai` e o gate de closure no PR #6;
2. validar CI no novo SHA;
3. ativar leaked-password protection com confirmação explícita no Dashboard;
4. executar o lote CORS/rate-limit/abuso;
5. executar canários HTTP autenticados;
6. somente então reavaliar o gate final do SEC-001.
