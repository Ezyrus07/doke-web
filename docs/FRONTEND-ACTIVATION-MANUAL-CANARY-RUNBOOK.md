# Frontend Activation Manual Canary Runbook

## Objective
Provide a manual, operator-only path to test frontend API activation through canary flags without changing the default behavior for regular users.

This runbook does not enable API globally, does not change HTML/CSS/UI, does not run backend mutations by itself and must not be used with real user accounts.

## Safe default state
The default frontend state must remain:

- `dataProvider=mock`
- `authProvider=mock`
- `ordersProvider=mock`
- `enableNetworkRequests=false`
- `orderWriteActivation=false`

If any of these defaults are changed for regular users, stop and rollback before continuing.

## Explicit prohibitions
Do not use global `dokeDataProvider=api` in this phase. It is too broad and can affect messages, notifications, wallet, admin and other domains beyond the Orders canary.

Do not:

- enable the canary for regular users;
- persist canary configuration outside the operator's canary browser session;
- use production-like API targets;
- test with real customer/professional accounts;
- mix this work with visual/HTML/CSS/UI changes;
- continue after the first real error.

## Required gates
Run these non-mutating/local gates before and after any manual browser canary session:

```bash
npm.cmd run validate:orders-write-frontend-activation:planning-gate
npm.cmd run validate:orders-write-frontend-activation:runtime
npm.cmd run validate:orders-write-frontend-rollback:gate
```

The runtime gate uses simulated network/mutation through a local `fetchStub`; it does not prove real network behavior.

## Manual canary activation options
Use only a staging/local-safe API target, for example `http://127.0.0.1:8787`.

### Query-string activation
Open the target page with canary query params in an operator-only browser session:

```text
pedidos.html?dokeOrdersWriteCanary=true&dokeOrdersProvider=api-write-canary-frontend-activation&dokeOrderWriteActivation=true&dokeOrdersWriteApiBaseUrl=http%3A%2F%2F127.0.0.1%3A8787&dokeOrdersWriteCanaryMarker=staging&dokeEnableNetwork=true
```

Do not add `dokeDataProvider=api`. If the browser has an old global API override in localStorage, remove it before continuing:

```js
if (localStorage.getItem('doke.dataProvider') === 'api') {
  localStorage.removeItem('doke.dataProvider');
}
```

### LocalStorage activation
Use only in the operator's canary browser session:

```js
localStorage.setItem('doke.canary.ordersWrite.enabled', 'true');
localStorage.setItem('doke.ordersProvider', 'api-write-canary-frontend-activation');
localStorage.setItem('doke.orderWriteActivation', 'true');
localStorage.setItem('doke.dataProvider', 'mock');
localStorage.setItem('doke.canary.ordersWrite.apiBaseUrl', 'http://127.0.0.1:8787');
localStorage.setItem('doke.apiBaseUrl', 'http://127.0.0.1:8787');
localStorage.setItem('doke.canary.ordersWrite.targetMarker', 'staging');
localStorage.setItem('doke.flag.enableNetworkRequests', 'true');
location.reload();
```

Keep `doke.dataProvider` unset or `mock`; never carry over `doke.dataProvider=api` from an older localStorage session.

## Pre-test checks
Before any browser action that can write, inspect:

```js
Doke.runtimeConfig
Doke.services?.orders?.getOrdersWriteCanaryStatus?.()
DokeAuth?.service?.getAuthIdentityCanaryStatus?.()
```

Confirm:

- `Doke.runtimeConfig.dataProvider === 'mock'`;
- `Doke.services.orders.getOrdersWriteCanaryStatus().dataProvider === 'mock'`;
- Orders provider is restricted to `api-write-canary-frontend-activation`;
- `orderWriteActivation === true` only inside the canary session;
- `enableNetworkRequests === true` only inside the canary session;
- API target is staging/local-safe and not production-like;
- `DokeAuth.service.getAuthIdentityCanaryStatus()` is a useful auxiliary check when the test involves auth/session, but it is not a universal prerequisite for every Orders Write canary test.

## Test rules
Use only canary accounts.

Recommended sequence:

1. Open the canary session and confirm status objects.
2. Verify read-only page behavior first.
3. Only execute write actions when the request includes an `idempotencyKey`.
4. Stop on the first real error.
5. Record any visible `requestId`.
6. Do not continue with another write step if an earlier step failed.
7. Do not use real users, real orders or production targets.

## Rollback
Remove query params and clear canary keys:

```js
[
  'doke.canary.ordersWrite.enabled',
  'doke.canary.ordersWrite.backup.v1',
  'doke.ordersProvider',
  'doke.orderWriteActivation',
  'doke.dataProvider',
  'doke.canary.ordersWrite.apiBaseUrl',
  'doke.apiBaseUrl',
  'doke.canary.ordersWrite.targetMarker',
  'doke.flag.enableNetworkRequests'
].forEach((key) => localStorage.removeItem(key));
location.href = location.pathname;
```

After reload, confirm:

```js
Doke.runtimeConfig.dataProvider
Doke.runtimeConfig.ordersProvider
Doke.runtimeConfig.orderWriteActivation
Doke.services?.orders?.getOrdersWriteCanaryStatus?.()
```

Expected rollback state:

- `dataProvider=mock`
- `ordersProvider=mock`
- `orderWriteActivation=false`
- Orders write canary inactive
- no Orders API fetch after rollback

## Known risks
- `dokeDataProvider=api` global is too broad for this phase.
- `enableNetworkRequests=true` must stay scoped to the operator canary session.
- Runtime validation reports use simulated network/mutation through `fetchStub`, not real network.
- The working tree currently contains unrelated visual/frontend changes; do not stage or commit them with this runbook.
- Browser localStorage is persistent per origin; always rollback at the end of the canary session.

## Next safe step
After this runbook is reviewed, prepare a separate documentation commit only for this file. Do not activate frontend API globally.
