# AUTH-001 / AUTH-A03 — Route guards and access states

## Status

`IMPLEMENTED_PENDING_FINAL_CI`

## Objective

Make `assets/js/core/route-guard.js` the only runtime component allowed to publish the final authorization decision for a route, while preserving a pre-paint fail-closed surface for private HTML.

## Implemented boundary

- private routes default to `enforce`;
- `perfil-profissional.html` is classified as a private owner route;
- admin routes require an authenticated context with canonical admin access;
- anonymous private navigation redirects to the same-origin login route with a preserved `next` path;
- expired, revoked, suspended, disabled and forbidden contexts never reveal private content;
- denied states render a controlled, accessible access surface;
- `page-bootstrap.js` loads the route map and guard on every active page in canonical order;
- Community discovery and internal room pages enter the protected pre-paint state before body parsing;
- public routes remain available;
- auth-only routes redirect already-authenticated users to the app.

## Runtime states

- `pending`
- `redirecting`
- `authorized`
- `expired`
- `revoked`
- `suspended`
- `disabled`
- `forbidden`
- `error`

The final decision is published through `html[data-auth-route-decision]`. Legacy early header logic may observe or provisionally mark session presence, but it cannot reveal protected content without the canonical `authorized` decision.

## Validation

- `scripts/audit-auth-session-contracts.js`
- `scripts/test-auth-route-guard-runtime.js`
- mandatory `audit:auth-session` Quality Gate
- blocking deterministic E2E lane
- visual structural guards

## Safety boundary

- no Supabase project or Auth setting changed;
- no database object or Edge Function changed;
- no account or credential mutated;
- no production environment changed;
- registration, username authority, recovery and optional providers remain outside AUTH-A03;
- PR remains draft.

## Next sublot

`AUTH-A04 — real registration and username authority`.
