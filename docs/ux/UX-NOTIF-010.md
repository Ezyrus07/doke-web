# UX-NOTIF-010 — Multi-surface quick-action migration and QA

## Status

Repository/frontend QA and migration handoff for `NOTIF-H10`.

This handoff migrates the H09 quick-action authority across the three current notification/toast surfaces without creating a second command authority. It does **not** prove staging, production, provider delivery, browser-vendor E2E or backend migration.

## Certified parent

- Parent: `NOTIF-H09 / UX-NOTIF-009`.
- Parent branch: `ux/ux-notif-009-quick-actions`.
- Parent certified SHA: `e97d244671b7f672fbcd9735d2b15319414e5f67`.
- Parent PR #108 must remain OPEN / DRAFT / UNMERGED.

## Root cause

H09 intentionally activated `Doke.notificationAction` only on `notificacoes.html`. `mensagens.html` and `comunidade-interna.html` still loaded `notification-toast.js` without the H09 action authority, so mutable quick actions failed closed on those surfaces.

A naive H10 migration that only inserted the script would be incomplete: `comunidade-interna.html` does not load the messages command service/executor stack. The H09 browser executor wrapper existed even when the real domain dependency was absent, so an action could otherwise be resolved for rendering and fail only after the user clicked it.

H10 therefore migrates both **load order** and **capability readiness**.

## Canonical ownership

No authority changes ownership:

```text
Doke.notificationAction   -> semantic mutable-action authority
Doke.notificationToast    -> render/lifecycle authority
Doke.services.messages    -> message command/domain authority
Doke.notificationDelivery -> DND/digest/delivery policy
Doke.notificationCenter   -> inbox/read/badge presentation state
```

The action contract remains:

```text
notification-action-v1
```

The toast contract/version remains H03:

```text
20260809-ux-notif-003-v1
```

## Executor capability gate

`notification-action.js` now treats executor availability as part of action validation.

An executor is usable only when:

1. it exposes `execute()`; and
2. when it exposes `isAvailable()`, that probe returns exactly `true`.

Probe errors fail closed.

For browser `MESSAGE_REPLY`, `isAvailable()` dynamically requires:

- `Doke.services.messages.sendMessage`;
- `Doke.services.messages.getServerCommandBoundaryStatus`;
- boundary status `required === true`;
- boundary status `ready === true`.

The probe is dynamic rather than frozen during module bootstrap. This matters because the message service is loaded with `defer` on current pages while `notification-action.js` is a synchronous late script. The authority may therefore exist before the deferred message service has executed; it exposes zero mutable actions until the domain becomes ready, then observes that readiness without reinitialization.

The same validation is used by `resolveActions()`, direct `execute()` and `reconcile()`.

## Surface migration

All three current notification/toast surfaces load exactly one action authority before exactly one toast authority:

```text
notificacoes.html
mensagens.html
comunidade-interna.html

notification-action.js
-> notification-toast.js
-> in-app-notifications.js
```

### mensagens.html

The page already owns the messages runtime dependencies, including repository boundary/provider setup, `message-command-executor.js` and `message-service.js`.

When that server-owned boundary becomes `required + ready`, H10 can resolve `quick-reply -> MESSAGE_REPLY` on this surface.

### comunidade-interna.html

H10 intentionally does **not** copy the messages service or command executor into the community page merely to make a notification button work.

The page loads `Doke.notificationAction` so there is one consistent authority, but because the message command capability is absent, `quick-reply` is not resolved/rendered. This is fail-closed migration, not a broken button.

A future domain decision may intentionally provide the messages command dependency to the community surface; the same authority will observe it dynamically.

## Allowed action

H10 does not expand the H09 allowlist:

```text
quick-reply -> MESSAGE_REPLY -> INLINE_REPLY
```

`ORDER_ACCEPT`, arbitrary event names, endpoints and function handlers remain rejected.

## H09 regression evolution

The H09 test previously asserted that `mensagens.html` and `comunidade-interna.html` must not load `notification-action.js`. That assertion represented the H09 rollout fence, not a permanent architecture invariant.

On the H10 branch only, that transient expectation is replaced with the permanent migration invariant:

- action authority exists on all three surfaces;
- action authority precedes toast authority;
- unavailable browser executor prevents action resolution before render.

All remaining H09 lifecycle, storage, permission, idempotency, expiry, acknowledgement and unknown-outcome expectations remain intact.

## Responsive QA and inherited debt

H10 touches two root HTML files, so responsive governance was evaluated rather than assumed.

The repository-wide Playwright responsive contract was first executed on H10 with the canonical Chromium preparation and generated `index.html` baseline. It reported:

```text
Checks: 865
Failures: 170
Skips: 285
```

A controlled diagnostic branch created directly from the **certified H09 parent SHA** executed the exact same Chromium preparation, baseline generation and responsive contract. Diagnostic run `31384442487` reproduced exactly:

```text
Checks: 865
Failures: 170
Skips: 285
```

Therefore those 170 failures are inherited repository-wide responsive debt and are not attributable to the H10 delta.

H10 must not hide or relabel that debt as resolved. Its blocking responsive gate is instead scoped to what H10 can regress:

1. the canonical `audit:responsive-boundaries` must remain green; and
2. the diff from certified H09 to H10 for `mensagens.html` and `comunidade-interna.html` must be exactly one added `notification-action.js` script tag per page, with zero deletions or other markup/CSS changes.

This is a fail-closed delta gate: any additional structural change to either migrated HTML breaks H10 CI. The global 170-failure responsive debt remains separately observable and unresolved.

## Definition of Done

H10 must prove on the same permanent SHA:

1. all three surfaces load exactly one `notification-action.js` before exactly one `notification-toast.js`;
2. a missing/unready executor resolves zero mutable actions;
3. capability-probe errors fail closed;
4. authority bootstrapped before deferred message service observes later readiness dynamically;
5. readiness loss removes the action before rendering;
6. fixture/local message mode (`required !== true`) cannot become command authority;
7. `mensagens.html` retains its existing message command dependencies;
8. `comunidade-interna.html` does not duplicate the messages command stack;
9. `notification-action-v1` and H03 toast ownership/version remain unchanged;
10. H01-H09 and MSG-A07 regressions remain green through the H10 cumulative gate;
11. Domain Completion Matrix and agent governance remain valid;
12. scoped responsive delta gate remains green while inherited global responsive debt stays documented;
13. executable LCOV and Sonar Quality Gate pass;
14. the final PR remains OPEN / DRAFT / UNMERGED.

## Preserved blockers

H10 does not close, downgrade or relabel:

- `NTF-B01` — notification RPC grants;
- `NTF-B02` — push/e-mail provider integration;
- `NTF-B03` — local/remote notification store divergence.

`NTF-001` remains **3/6 / blocked**.

## Non-evidence / out of scope

This handoff does not implement or prove:

- backend, migrations or RPC changes;
- staging or production runtime activation;
- Service Worker, PushManager, VAPID, Web Push or transactional e-mail provider;
- real two-device/browser-vendor E2E;
- provider delivery receipts/retry/dead-letter;
- closure of NTF-B01/B02/B03;
- repair of the inherited repository-wide 170 responsive-contract failures;
- `ORDER_ACCEPT` quick action;
- merge or ready-for-review.

## Rollback

Rollback is repository-local: revert the H10 commits. Removing the action script from the two migrated surfaces restores the H09 behavior, where mutable quick actions fail closed outside the notification center. No backend, staging or production rollback is required because H10 changes none of those layers.
