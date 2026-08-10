# UX-NOTIF-008 — Canonical browser notification boundary

## Status

- Epic: `EPIC-11 — notificações, badges e reengajamento`;
- Handoff: `NOTIF-H08 — browser notifications`;
- Tracking issue: `#105`;
- Base: `ux/ux-notif-007-digest-dnd-policy`;
- Base SHA certificado H07: `daf274d16024babaf555fb20af0e7a54eb2ae9e9`;
- Branch: `ux/ux-notif-008-browser-notifications`;
- Backend/staging/produção: fora de escopo;
- H09 quick actions: fora de escopo;
- Push remoto/Service Worker/PushManager/VAPID/provider: fora de escopo.

## Objetivo

Transformar o bridge legado de Web Notifications num boundary único, privacy-safe e account-fenced para eventos canônicos que o app já recebeu. Este lote não equivale a push remoto e não fecha `NTF-B02`.

## Causa raiz

O bridge legado mantinha `doke.browser-notifications.v1` global, consumia o bus in-app diretamente, usava `title/body` completos no preview do sistema operacional e navegava para `targetUrl` sem account fence ou allowlist. A Web Notifications API estava portanto operando como uma segunda policy de apresentação, em paralelo às authorities H01-H07.

A solicitação real de `Notification.requestPermission()` já ocorria após clique em “Ativar”; o problema não era uma chamada automática da permissão do navegador, e sim o ownership global da preferência, a ausência de redaction/policy canônica e a falta de fences no canal.

## Authority H08

```text
Doke.notificationBrowser
contract: notification-browser-v1
```

Responsabilidades:

- separar `Notification.permission` da preferência Doke;
- manter opt-in/dismissal Doke em `Doke.accountStorage`;
- remover a chave global legada sem atribuir ownership incerto a uma conta;
- aceitar somente evento normalizado por `Doke.notificationEvent`;
- reutilizar `Doke.notificationDelivery.decide()` para DND/mute/threshold, sem duplicar H07;
- aplicar `channelPolicy.browser` e `privacyLevel` antes de construir preview;
- deduplicar apresentação browser de forma transitória e account-fenced;
- validar clique, leitura e deep link sem assumir autoridade de domínio.

Fora da authority:

- schema/classificação/privacy metadata → `Doke.notificationEvent`;
- DND/mute/priority/digest → `Doke.notificationDelivery`;
- inbox/read/badge/reconciliation → `Doke.notificationCenter` + adapter H05;
- toast → `Doke.notificationToast`;
- persistência/transporte → service/repository;
- push remoto → não implementado neste lote.

## Persistência

Domínio `notification_browser` em `Doke.accountStorage`:

- `ACCOUNT_PRIVATE`;
- `UNTIL_LOGOUT`;
- `clearOnLogout=true`;
- `crossTab=metadata`;
- payload mínimo: `enabled`, `promptDismissed`.

A antiga chave global `doke.browser-notifications.v1` é removida e não é migrada para uma conta específica.

## Consentimento

Estados independentes:

```text
browserPermission = Notification.permission
Doke channel opt-in = notification_browser/preferences.enabled
```

O carregamento do módulo e o `DOMContentLoaded` podem exibir o CTA interno já existente, mas nunca chamam `Notification.requestPermission()` automaticamente. A chamada ao navegador ocorre somente via `requestPermission()/enable()`, acionada pelo botão do usuário ou por uma futura superfície explícita de preferências.

## Policy de preview

| privacy/channel | Resultado |
| --- | --- |
| `SENSITIVE_NO_OS_PREVIEW` | suprimir |
| `browser=forbidden` | suprimir |
| `PRIVATE_GENERIC` | preview genérico |
| `PRIVATE_AUTHENTICATED` | preview genérico |
| `browser=generic_only` | preview genérico |
| `PUBLIC_PREVIEW + browser=allowed` | título/body sanitizados |

Preview genérico não contém título, body, entity ID ou event ID originais.

## Delivery e DND

H08 não cria outra regra de DND. Antes de apresentar no browser, o boundary chama `Doke.notificationDelivery.decide()` com metadata H06 normalizada. Apenas `ALLOW_TOAST` é interpretado como entrega imediata elegível; `QUEUE_DIGEST` e `SUPPRESS` não geram Web Notification.

Isso preserva mute, threshold, DND, digest e urgent bypass na authority H07.

## Dedupe e account fence

Identidade:

```text
dedupeKey -> eventId -> eventKey -> id
```

O raw ID não é usado no `Notification.tag`; um fingerprint determinístico local é usado para evitar vazamento de identidade no payload do OS.

O dedupe transitório é limitado a 200 identidades e limpo na troca de scope. Uma notificação criada sob a conta A não pode marcar leitura nem navegar para entidade específica após o navegador estar na conta B.

## Clique e deep link

No clique:

1. fecha a Web Notification;
2. foca a janela;
3. compara o account fence capturado;
4. se o scope ainda for o mesmo, delega `markAsRead` ao adapter H05;
5. aceita somente rotas same-origin allowlisted;
6. remove query params não allowlisted;
7. em mismatch/target inválido, cai em `notificacoes.html`.

Não existem quick actions H09 neste lote.

## Superfícies

O bridge já é carregado por `mensagens.html` e `notificacoes.html` após as authorities necessárias. H08 não amplia o load order para outras páginas nesta fase para evitar espalhar o canal antes da certificação do boundary.

## Testes dedicados

`scripts/test-ux-notif-008-browser-notifications.js` cobre:

- ausência de requestPermission automático;
- remoção da preferência global legada;
- domain registration account-scoped;
- opt-in separado de browser permission;
- PUBLIC vs PRIVATE vs SENSITIVE preview;
- enforcement de delivery H07;
- dedupe;
- documento visível;
- safe target/param allowlist;
- mark-read somente no mesmo account fence;
- troca de conta sem herdar opt-in.

## Não-evidências

H08 não prova:

- push com app fechado;
- Service Worker;
- PushManager;
- VAPID;
- FCM/APNs/Web Push provider;
- delivery receipts remotos;
- e-mail transacional;
- staging/produção;
- H09 quick actions.

A Domain Completion Matrix deve continuar classificando `NTF-001` sem promoção artificial e preservar `NTF-B02` até integração real de canal remoto.
