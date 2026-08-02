# MSG-001 A04 — Realtime Publication and Subscription Contract

## Resultado

O lote congela, em modo **repository-only e desativado por padrão**, o contrato de Realtime para conversas e mensagens.

Nenhuma migration foi aplicada. Nenhuma tabela foi adicionada à publicação do staging. Nenhum canal foi ativado para usuários reais.

## Autoridade

- `public.conversations`: somente cliente ou profissional participante pode ler.
- `public.messages`: somente participantes da conversa podem ler.
- A autorização dos eventos Postgres Changes deriva das políticas RLS de `SELECT`.
- O browser não recebe `service_role` e não executa DML por este módulo.

## Publicação preparada

A migration local prepara:

- `public.conversations` na publicação `supabase_realtime`;
- `public.messages` na publicação `supabase_realtime`;
- políticas participant-scoped;
- índices para filtros e verificações RLS.

A aplicação exige autorização explícita nova e canário autenticado de isolamento.

## Assinaturas

Para `conversations`, o canal registra `INSERT` e `UPDATE` com dois filtros:

- `client_id=eq.<auth.uid>`;
- `professional_id=eq.<auth.uid>`.

Para `messages`, registra `INSERT` e `UPDATE`. A entrega é limitada pelas políticas RLS que validam participação na conversa.

## Por que DELETE não é assinado

Supabase Postgres Changes não permite filtrar eventos `DELETE`, e RLS não é aplicada ao registro já removido. O contrato não consome `DELETE`.

Após um comando server-owned de remoção, a reconciliação deve ocorrer por nova leitura canônica.

## Payload não é autoridade

O payload Realtime serve apenas como sinal de invalidação. Ao receber um evento:

1. o cache do repositório é limpo;
2. uma leitura `remote-only` com `fresh: true` é executada;
3. a UI recebe o evento `doke:messages-realtime-synced` com o snapshot revalidado.

Isso evita confiar diretamente em payload parcial, duplicado ou fora de ordem.

## Feature flag

`messagesRealtimeEnabled` permanece `false`.

A flag só pode ser habilitada depois de:

1. aplicar a migration em staging com autorização explícita;
2. confirmar publicação das duas tabelas;
3. provar isolamento entre participante e não participante;
4. provar reconexão e recuperação após perda do canal.

## Fora do escopo

Presença e digitação ainda usam o mecanismo local legado e não são promovidas a autoridade cross-device neste lote.

## Segurança operacional

- staging reads: 0;
- staging mutations: 0;
- migrations aplicadas: 0;
- alterações reais na publicação: 0;
- subscriptions ativas por padrão: 0;
- deploys: 0;
- produção: intocada;
- mensagens reais alteradas: 0;
- merge: 0.
