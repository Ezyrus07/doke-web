# FE-C01 — Import and manifest baseline

## Scope

This document freezes the starting state of the FE-C01 lot on top of `frontend/fe-j01-navigation-registry`.

The lot is structural only. It must reduce duplicate CSS reachability, query-string divergence and impure manifests without intentional visual changes.

## Inherited baseline

The FE-G01 structural configuration currently records:

- 23 CSS assets reachable through duplicate paths;
- 22 CSS assets reached with divergent version/query strings;
- 8 files marked as manifests or orchestration layers that still contain visual declarations;
- zero missing CSS assets;
- zero CSS import cycles.

## Confirmed high-impact paths

- `assets/css/core/index.css` imports the global rail authority.
- `assets/css/pages/internal-foundation.css` imports the same rail authority again with another version key and also repeats shared component contracts already reachable from the core graph.
- `assets/css/pages/home.css` imports rail and header authorities directly while also containing page implementation, despite declaring itself a manifest.
- `assets/css/pages/comunidade-foundation.css` and `assets/css/pages/messaging-runtime-chat.css` mix orchestration imports with visual declarations.

## Acceptance criteria

1. No new missing assets or import cycles.
2. Duplicate-path and version-divergence baselines only decrease.
3. Every file retained as a manifest is import-only.
4. Extracted visual rules keep their original cascade position through an explicit imported implementation file.
5. `index.html` remains the visual baseline.
6. Static audits, governed repository audits, blocking E2E and 105 visual structural guards remain green.

## Operational limits

- No Supabase or production changes.
- No AUTH-001 changes.
- No business-rule changes.
- No merge without explicit authorization.
