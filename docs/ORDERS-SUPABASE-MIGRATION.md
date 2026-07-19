# Pedidos compartilhados no Supabase

Aplique `supabase/migrations/010_orders_shared_runtime.sql` depois da migration 009.

## Ativação

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Ou execute o SQL integralmente no SQL Editor.

## Contrato

- Cliente cria o pedido com `client_id = auth.uid()`.
- Cliente e profissional vinculados podem ler e atualizar o pedido.
- Terceiros não conseguem consultar o registro.
- O snapshot do anúncio e dados transacionais complementares ficam em `metadata`.
- Sem migration, o frontend mantém fallback local e marca o pedido como `pending` para sincronização posterior.

## Verificação manual

1. Publique um anúncio com conta profissional Supabase.
2. Em outra conta cliente Supabase, solicite orçamento.
3. Confira `document.documentElement.dataset.dokeOrdersProvider === "supabase"`.
4. Abra outro navegador com a conta profissional e confirme o pedido.
5. Aceite e atualize o status; volte ao cliente e recarregue.
