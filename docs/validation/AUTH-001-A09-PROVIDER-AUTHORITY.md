# AUTH-001 A09 — Provider Authority

## Status

Implemented; pending canonical CI validation.

## Root cause

The canonical login and registration paths already used Supabase, but runtime configuration and the auth facade still accepted auth-provider selection from query strings and localStorage. Those controls could divert bootstrap, refresh and token resolution to the historical /auth/* adapter.

## Decision

Supabase Auth is the only active browser authentication authority. Historical API smoke remains CLI-only and cannot mutate browser provider state.

## Implementation

- runtime-config fixes authProvider, requestedAuthProvider and defaultAuthProvider to supabase;
- doke.authProvider, dokeAuthProvider and dokeAuthIdentityCanary are retired;
- auth-service refresh, token resolution, logout and bootstrap use Supabase;
- browser canary configuration and rollback APIs are removed;
- legacy API helpers remain private and unreachable pending a dedicated deletion audit;
- deterministic runtime coverage proves malicious browser overrides cannot change authority.

## Boundaries

- no production environment or Supabase configuration changed;
- no account, credential, contact, profile or role changed;
- no SMTP, SMS or OAuth provider was enabled;
- operational data-provider flags remain outside this sublot;
- PR #9 remains draft.

## Gates

- tests/auth/test-auth-provider-authority-runtime.js;
- scripts/test-auth-canonical-session-runtime.js;
- scripts/audit-auth-real-contract.js;
- scripts/audit-auth-identity-canary-contract.js;
- blocking E2E and visual structural guards;
- deterministic domain matrix and git diff check.
