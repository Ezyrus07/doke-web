# UX-NOTIF-004 — Canonical badge snapshot and attention counters

## Objetivo

Implementar `NOTIF-H04` sobre a autoridade existente de `Doke.notificationCenter`, sem criar um segundo writer global e sem redesenhar o shell.

## Decisões da Fase 1

- `unreadTotal` continua contando itens ativos não lidos e preserva o alias legado `unreadCount`.
- `actionRequiredTotal` conta entidades distintas, não notificações, e exige `eventAccepted === true` + `ACTION_REQUIRED|URGENT_ACTION_REQUIRED`.
- `urgentTotal` é derivado somente de `URGENT_ACTION_REQUIRED`; prioridade ou copy não geram urgência.
- `unreadMessages` conta conversas distintas com notificações canônicas `MESSAGES` não lidas, alinhado ao modelo de conversa do domínio Mensagens.
- `byCategory` usa somente `eventCategory` canônico; ausência de classificação cai em `UNKNOWN_OPERATIONAL`, nunca em `SOCIAL` por heurística.
- identidade de atenção prefere `aggregationKey`/`primaryEntityId` e depois a entidade explícita do domínio; o event identity é fallback.
- freshness é metadata explícita (`UNKNOWN|FRESH|STALE|DEGRADED`) e não é inferida do browser.
- o source padrão do snapshot é `DERIVED_PRESENTATION`; `CANONICAL_REMOTE`, `CANONICAL_LOCAL` e `DEMO` só entram quando declarados por um boundary chamador.
- marcar como lida/dispensar é mutação de apresentação e portanto não preserva claim de source remoto no snapshot derivado.
- marcar o snapshot como `STALE` não apaga os últimos contadores conhecidos.

## Shell integration

A única escrita permanece em `Doke.notificationCenter.syncBadges()`.

Seletores suportados:

```text
[data-notifications-unread-count]
[data-notifications-action-required-count]
[data-notifications-urgent-count]
[data-notifications-messages-count]
```

Nenhum novo nó visual é criado nesta fase. Consumers existentes continuam usando o selector unread atual; novos counters são preenchidos apenas onde um shell futuro/atual já expuser o respectivo contrato.

Valores acima de 99 são apresentados como `99+`, enquanto `data-notification-badge-count` preserva o valor numérico real.

## Compatibilidade

- `getSnapshot().unreadCount` continua disponível.
- `syncBadges()` continua retornando `unreadTotal` como número.
- `notification-center-v1` permanece o contrato do center.
- o snapshot de badge possui contrato próprio `notification-badge-snapshot-v1`.

## Fora de escopo

- H05 reconciliation/offline mutations;
- H06 matrix ampla de category/priority;
- H07 digest/DND;
- H08 browser notifications;
- H09 quick actions;
- backend, Supabase, migrations, staging ou produção;
- redesign visual de badges.
