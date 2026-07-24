# AUTH-001 / AUTH-A03 — Route guards and access states

## Status

`COMPLETED`

## Objective

Make `assets/js/core/route-guard.js` the only runtime component allowed to publish the final authorization decision for a route, while preserving a pre-paint fail-closed surface for private HTML.

## Implemented boundary

- private routes default to `enforce`;
- `perfil-profissional.html` is a private owner route;
- admin routes require authenticated canonical admin access;
- anonymous private navigation redirects to the same-origin login route with a preserved `next` path;
- expired, revoked, suspended, disabled and forbidden contexts never reveal private content;
- denied states render a controlled and accessible access surface;
- `page-bootstrap.js` loads the route map and guard on every active page in canonical order;
- community discovery remains public;
- `comunidade-interna.html` enters the protected pre-paint state before body parsing;
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

The final decision is published through `html[data-auth-route-decision]`. Early session surfaces cannot reveal protected content without the canonical `authorized` decision.

## Final validation

Final runtime head: `2b99d686257dab0aa83ecb8e68391d656408b31f`.

- Doke Quality Gates #272: success;
- Doke Diagnostic E2E #67: success;
- Doke Staging Edge HTTP Canary #46: success;
- static architecture, ACL, governed matrix and patch checks: success;
- blocking deterministic E2E lane: success;
- 105 visual structural guards: success.

## Safety boundary

- no Supabase project or Auth setting changed;
- no database object or Edge Function changed;
- no production environment changed;
- registration, username authority, recovery and optional providers remain outside AUTH-A03;
- PR remains draft.

## Next sublot

`AUTH-A04 — real registration and username authority`.
