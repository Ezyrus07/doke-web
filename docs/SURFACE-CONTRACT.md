# Surface Contract

## Objective
Centralize the accepted visual language for operational white surfaces without applying a global blanket rule across the whole product.

## Current source of truth
The reference surface is the internal white card/panel language already approved in `pedidos.html`.

## Token ownership
- `assets/css/core/tokens.css` owns the raw surface variables
- `assets/css/components/internal/surface-contract.css` owns reusable surface classes and intent
- page CSS may consume the tokens, but should not redefine the contract values unless there is a justified variant

## Applies to
- internal page toolbars
- internal summary panels
- internal white cards
- internal search/profile controls that intentionally share the same surface language

## Does not apply to
- generic section wrappers
- page backgrounds
- public hero sections by default
- buttons with explicit brand variants

## Rollout guidance
1. adopt tokens first
2. swap hard-coded literals for tokens in internal pages
3. only then promote repeated structures to component classes
4. validate page-by-page before expanding to public pages

## First-wave files
- `assets/css/components/internal/list-page-toolbar.css`
- `assets/css/pages/pedidos.css`
- `assets/css/pages/notificacoes.css`
- `assets/css/pages/carteira.css`
- `assets/css/pages/orders-hero.css`
