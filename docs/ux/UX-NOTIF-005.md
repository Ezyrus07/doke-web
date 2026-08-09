# UX-NOTIF-005 — Canonical inbox reconciliation and offline read/dismiss recovery

## Objetivo

Implementar `NOTIF-H05` da `UX-FOUNDATION-009` sem criar uma segunda store de notification center e sem mover persistência para a camada de apresentação.

## Fase 1

- `eventId` é a identidade primária de reconciliation; `dedupeKey`, `eventKey` e `id` são fallbacks legados explícitos.
- `Doke.notificationCenter.reconcile()` é a única regra de merge entre snapshot persistente e presentation state.
- read/dismiss podem entrar em `PENDING_SYNC` de forma otimista.
- snapshot remoto stale não desfaz mutation ainda pendente.
- confirmação remota equivalente encerra o pending state.
- o adapter in-app chama o notification service depois do commit otimista; sucesso ou falha retornam ao center via `resolveMutation()`.
- o repository persiste `pendingStatePatch` para read/dismiss quando a mutation remota falha e a reaplica em `syncPending()`.
- eventos `doke:notifications-synced` carregam account id, freshness, source authority e semântica de snapshot completo.
- sync tardio de outra conta é ignorado pelo adapter e fences antigas são rejeitadas pelo center.
- hydration/reconciliation não produz replay de toast.

## Freshness

- lista local canônica: `FRESH / CANONICAL_LOCAL`;
- lista remota reconciliada: `FRESH / DERIVED_PRESENTATION`;
- mutation local aguardando remoto: `STALE / DERIVED_PRESENTATION`;
- fallback/falha remota: `DEGRADED / DERIVED_PRESENTATION`.

`sourceAuthority` do snapshot não transforma transporte em autoridade do evento de domínio.

## Fora de escopo

- H06+;
- novas migrations/RPCs;
- staging/produção;
- redesign visual;
- ações operacionais críticas offline;
- merge ou ready-for-review.
