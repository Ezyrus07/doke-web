# FE-C01 — Import and manifest baseline

## Scope

This document records the FE-C01 lot on top of `frontend/fe-j01-navigation-registry`.

The lot is structural only. It reduces duplicate CSS reachability, query-string divergence and impure entrypoints without intentional visual changes.

## Starting baseline

The inherited FE-G01 configuration listed:

- 23 CSS assets as duplicate-path debt;
- 22 CSS assets as divergent-version debt;
- 8 files as impure manifest/orchestration debt;
- zero missing CSS assets;
- zero CSS import cycles.

The live recursive graph confirmed that the duplicate-path and divergent-version lists were already stale: both categories had zero current findings. FE-C01 removed those obsolete baseline entries instead of changing working CSS unnecessarily.

## Completed structural changes

- `home.css` is import-only; onboarding presentation moved to `home/account-onboarding.css`.
- `comunidade-foundation.css` is import-only; boot and hydration presentation moved to `comunidade/hydration-contract.css`.
- `messaging-runtime-chat.css` is import-only; attachment presentation moved to `chat-attachment-presentation.css`.
- `comunidade.css` is import-only; membership visibility moved to `comunidade/membership-visibility.css`.
- `notificacoes.css` is import-only; its legacy tail moved intact to `notificacoes/legacy-tail.css`.
- `search-results.css` is import-only; page-owned composition moved to `results/page-composition.css`.
- `mensagens.css` and `profile-page.css` were correctly classified as page composition stylesheets rather than manifests.
- Active Home desktop rail and category-density rules moved from the mixed `stable-desktop-rail.css` file to `home/desktop-rail.css`.
- The Profile rule formerly stored in `stable-desktop-rail.css` was unreachable because Profile never imported that file; FE-C01 removed the dead fragment rather than activating an unvalidated visual change.

## Compatibility decisions

- Extracted rules retain their original relative cascade position through explicit imports.
- The Notifications legacy tail preserves the existing late `visual-hierarchy.css` reference after the media rule, so FE-C01 does not activate CSS that was previously inactive.
- The Home rail owner changed path only; all active selectors and declaration values remain unchanged.
- No selector, declaration value, business rule, Supabase behavior or production configuration was intentionally changed.

## Current structural result

- duplicate CSS paths: **0**;
- divergent CSS version/query keys: **0**;
- impure manifests: **0**;
- missing CSS assets: **0**;
- CSS import cycles: **0**;
- structural gate: **passed**;
- canonical token authority gate: **passed**;
- governed repository audits after the Home rail ownership split: **passed**.

## Acceptance criteria

1. No new missing assets or import cycles.
2. Duplicate-path and version-divergence baselines are empty.
3. Every file retained as a manifest is import-only.
4. Extracted visual rules keep their original cascade position.
5. Home and Profile do not share a mixed page-level rail owner.
6. `index.html` remains the visual baseline.
7. Static audits, governed repository audits, blocking E2E and 105 visual structural guards must remain green before the lot is counted as complete.

## Operational limits

- No Supabase or production changes.
- No AUTH-001 changes.
- No business-rule changes.
- No merge without explicit authorization.
