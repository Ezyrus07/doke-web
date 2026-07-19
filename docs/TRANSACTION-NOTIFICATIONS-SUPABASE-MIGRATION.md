# Notificações transacionais compartilhadas — migration 013

## Objetivo

A migration `013_transaction_notifications_shared_runtime.sql` transforma `public.notifications` na autoridade compartilhada das notificações do ciclo de serviço:

- novo pedido;
- aceite ou recusa;
- proposta;
- cobrança e pagamento;
- conclusão e disputa;
- avaliação;
- nova mensagem.

As notificações ficam disponíveis entre contas, navegadores e dispositivos autenticados no mesmo projeto Supabase.

## Ordem de aplicação

Aplique as migrations nesta ordem:

1. `009_service_catalog_shared_runtime.sql`;
2. `010_orders_shared_runtime.sql`;
3. `011_messages_shared_runtime.sql`;
4. `012_transaction_attachments_storage.sql`;
5. `013_transaction_notifications_shared_runtime.sql`.

## Aplicação pelo CLI

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

## Aplicação pelo SQL Editor

Execute integralmente:

```text
supabase/migrations/013_transaction_notifications_shared_runtime.sql
```

## Segurança

A tabela não possui INSERT direto pelo navegador. Notificações entre usuários são criadas pela RPC `create_transaction_notification`, que valida:

- usuário autenticado;
- destinatário válido;
- participação do ator e do destinatário no pedido ou conversa;
- correspondência entre conversa e pedido, quando ambos são enviados;
- deduplicação por destinatário e `event_key`.

Sem pedido ou conversa, somente uma notificação para o próprio usuário é permitida.

A leitura e a atualização de `read_at`/`dismissed_at` são limitadas ao destinatário por RLS.

## Realtime

A migration adiciona `public.notifications` à publicação `supabase_realtime`. O frontend assina alterações filtradas por:

```text
user_id=eq.<auth.uid()>
```

Assim, uma notificação nova pode atualizar o badge e aparecer em tempo real sem expor notificações de terceiros.

## Verificação no navegador

Abra uma página do marketplace autenticado e execute:

```js
document.documentElement.getAttribute('data-doke-notifications-provider')
```

Resultado esperado:

```text
supabase
```

Outros estados possíveis:

- `local`: SDK/configuração/sessão indisponível;
- `local-fallback`: falha remota; o registro local foi preservado para sincronização posterior.

## Teste funcional mínimo

1. Cliente cria um pedido.
2. Profissional recebe `Novo pedido recebido` em outro navegador.
3. Profissional aceita.
4. Cliente recebe `Pedido aceito` em tempo real.
5. Profissional envia uma mensagem.
6. Cliente recebe `Nova mensagem`.
7. Cliente marca a notificação como lida.
8. Após F5, ela continua lida.
9. Cliente dispensa a notificação.
10. Após F5, ela continua dispensada.
11. Uma terceira conta não consegue consultar nenhuma dessas notificações.
