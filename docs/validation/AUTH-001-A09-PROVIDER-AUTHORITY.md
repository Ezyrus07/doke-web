# AUTH-001 A09 — Provider Authority

## Status

DONE — implemented and validated on the canonical branch head.

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
## Final validation

Canonical validation head: `8ff0fedb57a4ec945b4ab4906193f2d195a31271`.

- Doke Quality Gates #442: success;
- static architecture and partition audits: success;
- canonical auth/session runtime and AUTH-A09 provider-authority runtime: success;
- blocking deterministic E2E lane: success;
- 105 visual structural guards: success;
- deterministic domain matrix, governance, asset and lane audits: success;
- Doke Staging Edge HTTP Canary #216: success;
- `git diff --check`: success.

Doke Diagnostic E2E #237 was still running at mandatory closure and is explicitly non-blocking; no success claim is made for it.
