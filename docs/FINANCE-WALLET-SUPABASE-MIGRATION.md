# Doke — pagamentos e carteira compartilhados no Supabase

## Escopo

A migration `014_finance_wallet_shared_runtime.sql` transforma o domínio financeiro local em uma autoridade compartilhada para:

- intenção de pagamento;
- valor em garantia;
- taxa da Doke;
- recebível pendente e disponível;
- saldo da carteira;
- conta de recebimento;
- saque;
- contestação;
- liberação ou reembolso;
- auditoria operacional.

> Esta camada é o ledger transacional da aplicação. Ela não movimenta dinheiro real por conta própria e não substitui um PSP/adquirente homologado.

## Ordem de aplicação

Aplique, nesta ordem:

1. `009_service_catalog_shared_runtime.sql`
2. `010_orders_shared_runtime.sql`
3. `011_messages_shared_runtime.sql`
4. `012_transaction_attachments_storage.sql`
5. `013_transaction_notifications_shared_runtime.sql`
6. `014_finance_wallet_shared_runtime.sql`

## Aplicação

### Supabase CLI

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

### SQL Editor

Execute integralmente:

```text
supabase/migrations/014_finance_wallet_shared_runtime.sql
```

## Autoridade e fallback

Com sessão Supabase válida e migration aplicada:

```text
payments / wallets / transactions / disputes / withdrawals
→ Supabase
```

Sem sessão, sem SDK ou sem migration:

```text
→ simulação local
→ nenhuma operação local é promovida automaticamente ao ledger remoto
```

Essa decisão evita que um pagamento ou saque simulado offline seja transformado posteriormente em uma movimentação financeira real.

## Segurança

- tabelas financeiras são somente leitura para o navegador;
- mutações passam por RPCs `security definer` com validação de participante e estado;
- somente o cliente do pedido inicia pagamento e garantia;
- somente o cliente ou suporte libera garantia;
- somente o dono solicita saque;
- somente suporte/admin conclui ou recusa saque;
- somente cliente abre contestação;
- somente profissional vinculado responde;
- somente suporte/admin resolve contestação;
- event keys e external IDs garantem idempotência.

## Indicadores no navegador

```js
document.documentElement.getAttribute('data-doke-finance-provider');
document.documentElement.getAttribute('data-doke-wallet-provider');
document.documentElement.getAttribute('data-doke-payments-provider');
```

Resultado esperado:

```text
supabase
```

Fallbacks possíveis:

```text
local
local-fallback
```

## Teste manual mínimo

1. cliente aprova proposta e paga a cobrança;
2. profissional abre `carteira.html` em outro navegador;
3. valor aparece em garantia;
4. cliente confirma conclusão;
5. valor sai de pendente e entra em disponível;
6. profissional solicita saque;
7. suporte aprova ou recusa;
8. saldo e histórico permanecem corretos após F5;
9. abra contestação em outro pedido e confirme que o valor não pode ser liberado;
10. resolva para cliente e confirme reembolso; repita em outro pedido resolvendo para o profissional.

## Limite de produção

Antes de cobrar dinheiro real, ainda é obrigatório integrar um processador de pagamentos e validar webhooks assinados no backend. O navegador não deve ser a fonte de verdade para confirmação de captura, estorno ou transferência bancária.
