# Doke Web — Profile Route Contract

Status: active decision record.

## Purpose

This document locks the current separation of the Doke profile surfaces after the profile reset/rebuild.

The goal is to prevent future regressions where public profile anatomy, owner editing affordances, client profile surfaces, and legacy profile contracts become mixed again.

## Canonical profile routes

| File | Surface | Responsibility |
| --- | --- | --- |
| `perfil.html` | Professional public profile | Profile seen by clients and other users when viewing a professional. |
| `perfil-profissional.html` | Professional owner/editable profile | Same visual anatomy as the professional public profile, with owner-only editing and management controls. |
| `perfil-cliente.html` | Client public profile | Lightweight profile for a normal client account. It should stay simple: identity, basic trust signals, achievements, and about. |
| `meu-perfil.html` | Client owner/editable profile | Same visual anatomy as the client public profile, with owner-only editing controls. |

## CSS ownership

| File | Responsibility |
| --- | --- |
| `assets/css/pages/profile-foundation.css` | Shared clean profile anatomy, rails, hero, tabs, content switching, and reusable profile area layout. |
| `assets/css/pages/professional-profile-editor.css` | Owner/editing affordances for `perfil-profissional.html` only. Must not redefine the base profile anatomy. |
| `assets/css/pages/client-profile.css` | Client-specific profile differences for `perfil-cliente.html` and `meu-perfil.html`. Must keep the client profile intentionally simple. |

## Route rules

- Public professional profile links should point to `perfil.html`.
- Professional owner profile / dashboard entry points should point to `perfil-profissional.html`.
- Public client profile links should point to `perfil-cliente.html`.
- Client owner profile entry points should point to `meu-perfil.html`.
- `perfil-profissional.html` may link to `perfil.html` for public preview.
- `meu-perfil.html` may link to `perfil-cliente.html` for public preview.

## Prohibited regressions

Do not reintroduce any of the removed legacy profile contracts:

- `profile-v2`
- `profile-v3`
- `profile-card__content`
- `profile-hero-shell`
- `data-profile-root`
- imports from `assets/css/pages/perfil/`
- manual `mobile-bottom-nav` markup inside profile HTMLs

Do not add:

- inline `style=` attributes
- `!important`
- JavaScript-driven layout fixes for visual profile layout
- profile-specific shell/header/sidebar overrides

## Visual rules

- All profile surfaces must align to the same global rail used by the shared header.
- Public and editable versions should share the same visual anatomy whenever they represent the same account type.
- Editable versions should add owner controls without turning the screen into a separate dashboard.
- The normal client profile must stay lightweight; do not add professional-only areas such as ads, workers, certificates, or service reviews unless the product role changes.

## Validation checklist

Before closing future profile changes, verify:

- `perfil.html`, `perfil-profissional.html`, `perfil-cliente.html`, and `meu-perfil.html` parse without HTML errors.
- All tab `href="#..."` values have matching IDs.
- No prohibited legacy profile contracts are present in profile HTML/CSS.
- No manual mobile bottom nav exists in profile HTMLs.
- Header and content align in mobile, tablet, and desktop.
- Public-preview links point to the correct public counterpart.
