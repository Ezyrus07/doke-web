# AUTH-001 A10 — Dead browser adapter retirement

## Status

DONE — implemented and validated on the canonical branch head.

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

## Final validation

Canonical validation head: `b72d3fa414cf91563c13ef73e9f9d241c0b4ce77`.

- Doke Quality Gates #464: success;
- static architecture and partition audits: success;
- canonical auth/session runtime and AUTH-A10 dead-adapter runtime: success;
- blocking deterministic E2E lane: success;
- 105 visual structural guards: success;
- deterministic domain matrix, governance, asset and E2E-lane audits: success;
- Doke Staging Edge HTTP Canary #238: success;
- `git diff --check`: success.

Doke Diagnostic E2E #259 was still running at mandatory closure and is explicitly non-blocking; no success claim is made for it.
