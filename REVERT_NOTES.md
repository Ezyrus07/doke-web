# Revert Notes — SEC-001 Public Data, Community, Storage and Operator Authority

Não remova migrations já registradas. Qualquer reversão deve ser uma migration compensatória, preservando histórico e negação por padrão.

## Regras obrigatórias

1. preserve RLS em todas as tabelas públicas;
2. não restaure `TRUNCATE`, `TRIGGER` ou `REFERENCES` para `anon`, `authenticated` ou `service_role`;
3. mantenha grants do navegador alinhados a uma policy correspondente;
4. preserve a leitura pública de `service_quote_templates` e `service_quote_questions`, sem restaurar DML anônimo;
5. mantenha moderação administrativa atrás de `service-moderation-operations` e wrappers internos;
6. preserve `communities.owner_id` como autoridade e a membership owner canônica;
7. nunca remova a checagem de papel profissional e posse do serviço em templates;
8. preserve `transaction-attachments` como bucket privado;
9. no Storage transacional, leitura exige participação ativa; insert exige pasta do próprio usuário; update/delete exigem `owner_id`, pasta do uploader e participação;
10. não mova `private.can_access_transaction_attachment` para o schema `public`;
11. toda RPC `SECURITY DEFINER` autenticada deve manter `search_path=pg_catalog`;
12. execute os SQLs 010–012 e a suíte local antes de aplicar compensações.

A migration remota `self_service_function_search_path_hardening` foi registrada duas vezes de forma idempotente. Não tente apagar um registro do histórico; apenas preserve o estado final.

O bloqueio de default ACL de `supabase_admin` é de plataforma. Não tente contorná-lo introduzindo credenciais privilegiadas no repositório.

---

# Revert Notes — Self-Service Edge Authority

1. não restaure execução das quatorze RPCs para `authenticated` antes de publicar um cliente compatível;
2. preserve `self-service-operations` com `verify_jwt=true`;
3. o actor deve continuar derivado de `auth.getUser()`, nunca do corpo;
4. preserve o dispatcher como `service_role` only e `search_path=pg_catalog`;
5. rollback deve usar migration compensatória e deploy coordenado da Edge Function + frontend;
6. não duplique regras de domínio no Edge: as implementações transacionais existentes continuam canônicas.

## E2E staging finance sandbox

A reversão funcional deve preservar o ledger real e remover somente a autoridade de staging:

1. definir `financeSandboxEnabled: false` em `assets/js/core/supabase-config.js`;
2. remover ou desativar a Edge Function `staging-finance-sandbox`;
3. revogar `service_role` de `public.execute_staging_finance_sandbox_internal(uuid,text,jsonb)`;
4. remover o dispatcher e as funções privadas `finance_sandbox_*` somente depois de confirmar que não há sessão de teste em execução;
5. não executar o cleanup genérico sobre dados reais; `014_staging_finance_sandbox_runtime_cleanup.sql` é restrito ao namespace `finance_runtime_*`.

A reversão não deve reabrir `record_order_payment`, `register_order_receivable` ou `release_order_receivable` ao navegador.
