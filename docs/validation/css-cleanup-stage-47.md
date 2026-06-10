# CSS Cleanup Stage 47 — Auth Flow Isolation

## Scope

Pages:

- `auth/login.html`
- `auth/cadastro.html`
- `auth/esqueci-senha.html`

## Goal

Isolate authentication pages from app-shell/navigation/card/panel CSS that they do not use. Auth pages should be a small, standalone flow: tokens + base + auth page CSS.

## Changes

Removed direct CSS dependencies from all auth pages:

- `assets/css/components/forms-actions/form-action-contract.css`
- `assets/css/core/responsive-runtime.css`
- `assets/css/components/navigation/header-desktop.css`
- `assets/css/components/navigation/header-mobile.css`
- `assets/css/components/actions/action-button.css`
- `assets/css/components/panels/mobile-panel.css`
- `assets/css/components/cards/card-system.css`
- `assets/css/core/responsive-audit.css`
- `assets/css/components/identity/avatar.css`

Kept only:

- `assets/css/core/tokens.css`
- `assets/css/core/base.css`
- `assets/css/pages/auth.css`

## Metrics

Before each auth page:

- Direct CSS: 12
- Transitive CSS: 12
- Active `!important`: 0

After each auth page:

- Direct CSS: 3
- Transitive CSS: 3
- Active `!important`: 0

Global `!important` count in `assets/css` is unchanged because this stage removed page dependencies, not declarations from source files.

## Validation

- CSS brace balance: 0 invalid files
- Auth pages keep all `auth-*` class contracts inside `assets/css/pages/auth.css`
- No new CSS file was created
- No `!important` was added

## Risk

Medium visual risk for auth pages:

- Social buttons may lose global icon/button styling if they depended on unrelated component files.
- Any accidental dependency on global card/panel/action styles has been removed intentionally.
- `auth.css` is now the explicit authority for auth UI.
