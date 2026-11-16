# UX-NOTIF-009 — Notification quick-action command authority

## Status

Repository/frontend contract implementation for `NOTIF-H09 — quick actions`.

This document does **not** prove staging, production, browser-vendor E2E, backend migration, provider activation or multi-surface rollout.

## Certified parent

- Parent handoff: `NOTIF-H08 / UX-NOTIF-008`.
- Parent SHA: `e4cb70fddb7e05f9bfc116724224a139b9ccf066`.
- Parent PR #106 remains OPEN / DRAFT / UNMERGED.

## Root cause

Before H09, quick actions were behavior embedded in `in-app-notifications.js` and consumed by `notification-toast.js` without a canonical command authority. The legacy path could accept payload-provided `eventName`, wrote action commands to a global `localStorage` key, held pending state only in process memory and coupled action result with notification read state.

That design could not prove command allowlisting, account-scoped idempotency receipts, expiry-before-send, unknown-outcome blocking or server-owned success acknowledgement.

## Canonical authority

```text
Doke.notificationAction
contract: notification-action-v1
```

Responsibilities:

- semantic command allowlist;
- schema validation for mutable actions, including direct `execute()` calls;
- account-scoped receipt persistence through `Doke.accountStorage`;
- lifecycle `AVAILABLE | PENDING | SUCCEEDED | FAILED | EXPIRED | UNKNOWN_OUTCOME`;
- expiry before side effect;
- idempotency/replay fencing;
- fail-closed behavior when receipt storage is unavailable;
- permission gate before delegation;
- domain executor delegation;
- unknown-outcome retry blocking;
- reconciliation boundary when the domain exposes trusted evidence.

It does **not** own inbox/read/badge state, toast lifecycle, message transport, order authority, DND/digest or browser notification previews.

## H09 allowlist

H09 intentionally enables only:

```text
quick-reply -> MESSAGE_REPLY -> INLINE_REPLY
```

Required mutable-action fields:

- `actionId`;
- `commandType`;
- `entityId`;
- `expectedState`;
- `expiresAt`;
- `idempotencyKey`;
- `permissionRequirement`;
- `confirmationPolicy`.

Payload-provided `eventName`, endpoint, function handler or arbitrary command type is rejected both during action resolution and again at the execution boundary.

`ORDER_ACCEPT` is deliberately **not** enabled in H09. The current order service has idempotency support, but this handoff does not have sufficient server-owned acknowledgement evidence to classify a toast action as `SUCCEEDED` without ambiguity.

## Quick reply executor

`MESSAGE_REPLY` delegates to `Doke.services.messages.sendMessage` with the same `idempotencyKey` as both `commandId` and `clientMutationId`.

The browser executor first requires `Doke.services.messages.getServerCommandBoundaryStatus()` to report both `required === true` and `ready === true`. This prevents the H09 browser path from treating fixture/local message persistence as a successful mutable quick action.

The message service remains the owner of message command semantics. For server-owned actors, its `sendMessage` path delegates to `executeMessagesServerCommand('sendMessage', ...)`, which delegates to `Doke.messageCommandExecutor`. That executor rejects unless the server acknowledgement has the same command ID and status `accepted` or `replayed`.

H09 therefore treats a resolved `sendMessage` call as a trusted domain-owned success only after that message boundary has internally validated the server acknowledgement. H09 does not require the message service to leak the raw acknowledgement through its public return value and does not manufacture a synthetic acknowledgement.

`DOKE_MESSAGES_COMMAND_ACK_INVALID`, network ambiguity and equivalent uncertain command outcomes become `UNKNOWN_OUTCOME`; they are not converted into local success.

The reply body is bounded to 2000 characters and is not persisted in the action receipt.

## Toast integration

`notification-toast.js` is a renderer/consumer only. It no longer executes payload `eventName`, direct mutation URL, legacy quick-action callback or action-result/read coupling.

For inline reply:

- draft stays in the DOM while the result is unresolved;
- `PENDING` blocks duplicate submit;
- `SUCCEEDED` closes only after the domain-owned command boundary resolves successfully;
- `FAILED` keeps draft and allows retry;
- `EXPIRED` sends no command and leaves the notification unresolved;
- `UNKNOWN_OUTCOME` blocks retry and directs the user to open the conversation before another attempt.

Action success never marks notification `read` automatically.

## Activation boundary

H09 activates the authority only on the canonical notification surface:

```text
notificacoes.html
  notification-action.js
  -> notification-toast.js
  -> in-app-notifications.js
```

`mensagens.html` and `comunidade-interna.html` remain fail-closed: their toast module ignores the legacy quick-action callbacks, and without `Doke.notificationAction` loaded no mutable action is rendered.

Multi-surface rollout/migration belongs to `NOTIF-H10 — QA/migration`.

## Persistence and account fence

Receipts are registered under the `notification_action` domain in `Doke.accountStorage` as account-private, until-logout, clear-on-logout, cross-tab metadata.

### Canonical storage integration — 2026-10-08

The browser adapter uses the actual `registerDomain({ ... })`, `resolveScope`, `read` and `write` contract. The previous adapter called nonexistent `getJson/setJson` methods; a ready message executor therefore still returned `receipt-storage-unavailable` without dispatching. The H09/H10 fixtures previously simulated those nonexistent methods and used expired wall-clock dates.

Each new receipt has its own canonical storage entry, using a bounded `receipt.<fnv64>` locator and an envelope containing the exact command key and receipt. The locator is not an authorization or cryptographic identity: a full-key mismatch fails closed. Case, punctuation and Unicode are preserved without violating the canonical 96-character storage-key limit. The canonical 65,536 serialized-character limit applies per entry; browser quota applies to total storage. Account-only policy, logout cleanup and metadata-only cross-tab events remain unchanged. Full or invalid storage blocks dispatch; receipts are never evicted to permit retry.

The prior `receipts` array remains a read-only fallback for commands without a new entry. Existing success, unknown and pending receipts retain their meaning. New writes never replace that shared array, eliminating its read/modify/write lost-update race for distinct command locators. Same-command concurrent dispatch remains subject to server-owned idempotency; this patch does not introduce a cross-tab transaction coordinator.

A persisted `PENDING` receipt without a matching local in-flight promise is exposed as `UNKNOWN_OUTCOME` and blocks dispatch. This also covers successful sending followed by failure to persist both `SUCCEEDED` and `UNKNOWN_OUTCOME`, including after reload. Expiry cannot overwrite that durable sentinel. Only the existing trusted executor reconciliation interface may settle it; no status endpoint or client-side success is invented. Browser quick replies remain blocked when their domain offers no reconciliation evidence.

On all three H10 surfaces, account storage, notification actions, toast and the in-app consumer execute in deferred document order. The action URL uses `v=20261008-notification-receipts-v2` on every surface. Unchanged storage/toast source needs no cache-key bump; `defer` is a document attribute. Existing open tabs need a document reload to consume the corrected execution order.

Pending actions are scoped to the account. The account is rechecked before dispatch and before asynchronous completion/reconciliation writes, so an account switch cannot write an old receipt into the new account. This consumes the existing account authority; it does not change authentication or backend authorization.

H09/H10 now load the real account-storage module with synthetic identities and a fixed test clock. Regression coverage includes reload replay, exact command keys, logout cleanup, account changes, corruption, storage failures and capacity exhaustion. The dedicated `Notification receipt storage` workflow runs those tests plus privacy, toast and repository governance checks. Local/CI evidence does not certify remote messaging or promote NTF maturity.

The recovery regression suite forces the original lost-update interleaving in two independent module contexts. The Chromium suite uses the complete page HTML and original script attributes, real storage/action/toast/in-app modules, and isolated unrelated scripts/network dependencies; the browser determines execution order. It covers all three pages at 1366x768, 820x1180 and 390x844, two same-origin tabs writing 60 distinct receipts, and real localStorage completion failures followed by reload. This is focused integration evidence, not full visual or authenticated remote journey certification.

If receipt read/write authority is unavailable, H09 returns `UNKNOWN_OUTCOME` with retry blocked **before any new side effect is dispatched**.

## Definition-of-done tests

H09 must prove:

1. arbitrary `eventName`/endpoint/handler is rejected during resolution and direct execution;
2. incomplete or unknown command type is not rendered or executed;
3. expired action invokes zero domain executors and becomes `EXPIRED`;
4. same idempotency key cannot execute twice after success;
5. unknown outcome blocks blind retry;
6. receipt-storage failure fails closed before side effect;
7. permission denial invokes zero executors;
8. browser quick reply requires the server-owned message command boundary to be required and ready;
9. message command reliability rejects invalid or divergent acknowledgement;
10. toast does not call legacy quick-action/result callbacks;
11. central notification page loads action authority before toast;
12. H10 surfaces are not silently migrated;
13. H01-H08 contracts remain green;
14. Domain Completion Matrix and agent governance remain valid;
15. LCOV + Sonar Quality Gate pass on the final permanent SHA.

## Preserved blockers

H09 does not close or downgrade:

- `NTF-B01` RPC grants;
- `NTF-B02` push/e-mail provider integration;
- `NTF-B03` local/remote store divergence.

`NTF-001` must not be promoted merely because H09 is repository/frontend-green.

## Rollback

Rollback is branch-local: revert the H09 commits or remove `notification-action.js` from `notificacoes.html`. The toast then renders no mutable quick action and all domain mutation remains inaccessible from the H09 path. No backend/staging/prod rollback is required because H09 changes none of them.
