# UX-NOTIF-003 — Canonical toast manager

## Objetivo

Implementar o handoff `NOTIF-H03` sem alterar transporte, persistência, unread/badge ou o contrato de eventos.

## Autoridades

- `Doke.notificationEvent`: identidade, classificação e `channelPolicy`.
- `Doke.notificationCenter`: snapshot de apresentação, unread e badge.
- `Doke.notificationToast`: elegibilidade canônica de toast, dedupe transitório, account fence e lifecycle/render de toast.
- `DokeInAppNotifications`: adapter de publish/cross-tab, preferences/DND/digest e quick actions.

## Fase 1

A nova authority aplica fail-closed antes das preferências locais:

1. evento com `eventAccepted === false` não gera toast;
2. `channelPolicy.toast` diferente de `allowed` não gera toast;
3. PAYMENTS/DISPUTES/SECURITY exigem `eventAccepted === true` e `CANONICAL_LOCAL|CANONICAL_REMOTE`;
4. dedupe usa `dedupeKey`, depois `eventId`, `eventKey` e somente então `id` legado;
5. troca de conta limpa `seen` e registros DOM transitórios;
6. manager não acessa repository, localStorage, notification center ou badge.

Preferences, DND, digest e quick-action behavior permanecem no adapter por design nesta fase. O harness legado do UX-NOTIF-001 passa a carregar `notification-toast.js` antes do adapter, refletindo a nova dependência de runtime sem alterar o comportamento coberto.

## Fora de escopo

Sem backend, Supabase, migrations, staging, produção, browser notifications, redesign visual, migração de preferences/DND, analytics, ready-for-review ou merge.
