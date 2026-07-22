# Doke — Financial RPC Authority

## Decisão

O navegador pode ler apenas projeções financeiras limitadas por participante/RLS. Ele executa diretamente somente quatro operações de proprietário:

- `save_wallet_bank_account` — profissional ativo;
- `request_wallet_withdrawal` — profissional ativo, saldo validado e idempotência;
- `open_wallet_dispute` — cliente ativo vinculado ao pedido e escrow;
- `respond_wallet_dispute` — profissional ativo vinculado à disputa.

Support/admin decide saques e disputas pela Edge Function JWT `financial-operations`. A função consulta `public.users.role/status` e chama RPCs internas exclusivas de `service_role`.

## Contrato de tabelas

- `anon`: nenhum grant financeiro;
- `authenticated`: somente `SELECT` nas dez projeções necessárias; sem acesso a `api_idempotency_keys`;
- `service_role`: CRUD, sem `TRUNCATE`, `REFERENCES` ou `TRIGGER`;
- RLS: participante/proprietário ou operador canônico;
- `api_idempotency_keys`: server-only, RLS sem policy pública por desenho.

## RPCs

### Autosserviço autenticado

- `save_wallet_bank_account`;
- `request_wallet_withdrawal`;
- `open_wallet_dispute`;
- `respond_wallet_dispute`.

### Operação interna via Edge Function

- `resolve_wallet_withdrawal_internal`;
- `resolve_wallet_dispute_internal`.

### Legadas bloqueadas

Idempotência pública, materialização de pagamento, registro/liberação de recebível, lookup financeiro e resoluções diretas antigas são owner-only.

## Fail-closed

Pagamento, recebível e escrow não podem se tornar remotos/autoridade de produção pelo navegador. O repository retorna `DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED` até existir PSP, webhook assinado, conciliação e política jurídica.

## Evidências

- migrations remotas: `20260722152314`, `20260722152446`, `20260722152744`, `20260722152801`;
- Edge Function `financial-operations`: ACTIVE, versão 1, `verify_jwt: true`;
- canários remotos: 26/26, com rollback;
- funções financeiras executáveis por `anon`: 0;
- HTML/CSS alterados: 0;
- Comunidade: 184/184 caminhos idênticos.

## Riscos restantes

- criptografia e mascaramento de dados bancários;
- PSP, webhook e conciliação;
- política legal de estorno, retenção e liquidação;
- notificações ainda possuem duas RPCs públicas `SECURITY DEFINER` executáveis por `anon`;
- runtime geral permanece mock por padrão até o gate de staging ser concluído.
