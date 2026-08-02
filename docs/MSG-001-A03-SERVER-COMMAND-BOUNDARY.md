# MSG-001 A03 — Server-Owned Command Boundary

## Result

Authenticated UUID sessions now execute message commands through the registered API provider even when the global data provider remains mock. The browser repository is read-only for real sessions and rejects direct Supabase DML.

## Commands

- create conversation for order;
- update order context;
- send message;
- remove message;
- mark conversation read.

A missing or disabled API boundary rejects with `DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE`. Any authenticated repository mutation attempt rejects with `DOKE_MESSAGES_DIRECT_BROWSER_DML_BLOCKED`. Fixtures remain memory-only.

## Scope exclusions

Realtime publication, subscription, attachment lifecycle, staging application and deployment are unchanged.

## Operational effects

- staging reads: 0
- staging mutations: 0
- migrations: 0
- deploys: 0
- production changes: 0
- real messages changed: 0
- merges: 0

The authenticated command authority is server-owned.
