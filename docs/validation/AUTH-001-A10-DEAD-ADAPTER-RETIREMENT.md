# AUTH-001 A10 — Dead browser adapter retirement

## Status

Implemented; pending canonical CI validation.

## Root cause

After AUTH-A09 fixed Supabase as the only browser authority, `auth-service.js` still contained unreachable `/auth/*` request code, API token helpers, provider status facades and a no-op `refreshApiSession` compatibility path.

## Decision

Delete the unreachable browser adapter rather than preserve dormant authority-shaped code. Keep only the standalone CLI diagnostic and the public methods that still have valid page consumers.

## Implementation

- removed browser endpoint constants and API request/session/token helpers;
- removed dead provider and canary status facades;
- removed `refreshApiSession` and `refreshCurrentIdentity` exports;
- migrated owner profile identity confirmation to `refreshSession`;
- preserved `getActiveAuthProvider` as a constant Supabase compatibility surface;
- preserved CLI-only Auth/Identity diagnostics;
- added deterministic source and runtime regression coverage;
- corrected active contracts that still described the retired browser canary.

## Boundaries

- no production or Supabase configuration changed;
- no account, credential, session, contact, profile or role changed;
- no SMTP, SMS or OAuth provider enabled;
- generic domain repository providers remain outside this sublot;
- PR #9 remains draft.
