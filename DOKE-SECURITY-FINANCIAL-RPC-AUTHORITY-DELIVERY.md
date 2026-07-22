# Doke — SEC-001 Financial RPC and Table Authority Delivery

## Status

**Concluído no staging em 22 de julho de 2026.**

Este lote fechou a autoridade das tabelas financeiras, RPCs de autosserviço, operações administrativas, materialização monetária legada e idempotência. Nenhum HTML ou CSS foi alterado.

## Causa raiz

A exposição não era um único grant incorreto. Quatro problemas se combinavam:

1. funções `SECURITY DEFINER` recriadas depois de revogações antigas voltavam a herdar `EXECUTE` de `PUBLIC`;
2. ações legítimas do usuário, decisões de suporte e comandos internos de dinheiro dividiam a mesma superfície pública;
3. `anon` e `authenticated` conservavam grants estruturais amplos em tabelas financeiras, inclusive `TRUNCATE`, que não é limitado por RLS;
4. RPCs de pagamento, recebível, liberação e idempotência eram alcançáveis sem PSP, webhook assinado ou autoridade server-side explícita.

A correção correta exigiu tratar **grants de tabela, RLS, RPCs, default privileges, repository boundary e Edge Function** como um contrato único.

## Arquitetura final

### Navegador anônimo

- nenhum grant nas 11 tabelas financeiras auditadas;
- nenhuma RPC financeira executável;
- leitura e mutação reais negadas em canário runtime.

### Usuário autenticado

Possui somente `SELECT` nas projeções compatíveis com RLS. Não possui DML direto.

Quatro RPCs de autosserviço permanecem acessíveis:

- `save_wallet_bank_account`: somente profissional ativo;
- `request_wallet_withdrawal`: somente profissional ativo, saldo validado e replay idempotente;
- `open_wallet_dispute`: somente cliente ativo vinculado ao pedido/pagamento/transação;
- `respond_wallet_dispute`: somente profissional ativo vinculado à contestação.

Todas consultam papel e status em `public.users`; metadata JWT forjada não concede autoridade.

### Support/admin

Decisões financeiras passam pela Edge Function `financial-operations`, com:

- versão 1;
- estado `ACTIVE`;
- `verify_jwt: true`;
- validação do usuário no Auth;
- papel e status canônicos em `public.users`;
- chamada, via `service_role`, apenas das RPCs internas permitidas.

RPCs internas:

- `resolve_wallet_withdrawal_internal`;
- `resolve_wallet_dispute_internal`.

Um admin autenticado não consegue chamá-las diretamente pelo Data API.

### Autoridade server-side

`service_role` possui apenas CRUD nas tabelas auditadas. Foram removidos `TRUNCATE`, `REFERENCES` e `TRIGGER`.

As RPCs legadas abaixo ficaram owner-only e fora da API:

- `claim_idempotency_key`;
- `complete_idempotency_key`;
- `fail_idempotency_key`;
- `finance_resolve_order`;
- `record_order_payment`;
- `register_order_receivable`;
- `release_order_receivable`;
- `resolve_wallet_withdrawal`;
- `resolve_wallet_dispute`.

O backend já persiste idempotência com `service_role` diretamente; não havia consumidor legítimo dessas três RPCs públicas.

### Fail-closed para dinheiro real

O repository remoto não simula mais materialização de pagamento, recebível ou liberação pelo navegador. Essas ações agora retornam `DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED` até existir:

- PSP contratado;
- webhook assinado e validado;
- reconciliação;
- política de estorno, retenção e liquidação.

O fallback local continua exclusivamente não produtivo.

## Migrations aplicadas

| Versão remota | Migration | Arquivo local |
|---|---|---|
| `20260722152314` | `financial_table_permission_authority` | `106_financial_table_permission_authority.sql` |
| `20260722152446` | `financial_rpc_authority` | `107_financial_rpc_authority.sql` |
| `20260722152744` | `financial_operator_authority` | `108_financial_operator_authority.sql` |
| `20260722152801` | `financial_final_permissions` | `109_financial_final_permissions.sql` |

As default privileges de novas funções no schema `public` foram alteradas para fail-closed: `PUBLIC`, `anon` e `authenticated` não recebem `EXECUTE` automaticamente.

## Validação remota

Foram executados **26 canários**, com fixtures financeiras reais dentro de uma transação finalizada por `ROLLBACK`.

Comprovações principais:

- `anon` não lê tabela nem executa RPC;
- `authenticated` possui somente leitura nas tabelas projetadas;
- DML direto em conta bancária é negado;
- cliente com metadata forjada não se torna profissional;
- profissional salva apenas a própria conta bancária;
- saque reduz saldo uma única vez e replay idempotente não duplica débito;
- conflito de idempotência é rejeitado;
- cliente não solicita saque profissional;
- somente cliente vinculado abre disputa;
- somente profissional vinculado responde;
- admin autenticado não chama RPC interna diretamente;
- `service_role` só resolve com ator canônico support/admin;
- resolução de disputa atualiza disputa, pagamento, transação e carteira de forma consistente;
- RPC legada de materialização de pagamento é negada;
- RLS impede leitura transversal entre cliente e profissional.

Resultado: **26/26 passaram**. Após o rollback, as tabelas de carteira, pagamentos, transações, saques e disputas continuaram com zero linhas; nenhuma fixture persistiu.

## Validação local

- 19 grupos relevantes: **19 passaram, 0 falharam**;
- contrato da autoridade financeira: passou;
- helpers da Edge Function: passaram;
- contrato do repository Supabase: passou;
- identidade, papéis, KYC e client authority: passaram;
- autenticação e sessão: passaram;
- auditoria de secrets: passou;
- 1.018 arquivos `.js`/`.mjs`: sintaxe válida;
- 184/184 caminhos de Comunidade: idênticos byte a byte;
- HTML alterado: 0;
- CSS alterado: 0;
- `package-lock.json`: inalterado;
- `!important` em CSS de produção: 11.724 antes e depois.

Seis testes antigos de pedidos/pagamento continuam falhando pelas mesmas causas na base original. Eles foram executados nos dois diretórios e documentados; não houve alteração indevida fora do lote para fazê-los passar.

## Advisors finais

O lote eliminou todos os avisos de função financeira executável por `anon` e todos os avisos `auth_rls_initplan` nas políticas financeiras alteradas.

Restam fora do lote:

- duas RPCs públicas `SECURITY DEFINER` executáveis por `anon`: notificações;
- 11 tabelas públicas sem RLS;
- listagem ampla do bucket `service-media`;
- proteção contra senhas vazadas desativada;
- FKs antigas sem índice e outros avisos de performance.

`api_idempotency_keys` aparece como “RLS enabled, no policy”. Isso é intencional: a tabela é server-only, não possui grants de navegador e não deve ter policy pública.

## Matriz de conclusão

- domínios: 23;
- fluxos críticos: 15;
- maturidade média: 2,43/6;
- bloqueadores críticos: 27 → 24;
- removidos: `PAY-B02`, `WAL-B01`, `DSP-B02`.

O domínio Pagamentos continua corretamente bloqueado por PSP, webhook, reconciliação e política jurídica. Fechar grants não equivale a declarar prontidão monetária de produção.

## Limitações reais

A chamada HTTP direta da Edge Function não pôde ser executada porque o ambiente de container não resolveu o DNS do endpoint Supabase. Não houve tentativa de contornar essa limitação. Foram confirmados remotamente estado `ACTIVE`, versão 1 e `verify_jwt: true`; os helpers/runtime passaram localmente e as RPCs internas passaram nos canários do banco.

Nenhum PSP, webhook ou segredo de produção foi criado. Dados bancários ainda exigem criptografia, mascaramento e política de retenção antes do beta financeiro.

## Próximo lote recomendado

**Fechar a autoridade de notificações**, começando por `create_transaction_notification` e `update_own_notification_state`, as duas RPCs públicas `SECURITY DEFINER` ainda executáveis por `anon` segundo o advisor. Depois disso, prosseguir para `audit_logs` e trilhas de auditoria.
