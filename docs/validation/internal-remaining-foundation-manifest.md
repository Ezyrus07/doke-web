# Stage 57 — Internal Remaining Foundation Manifest Consolidation

## Scope

Conservative consolidation of remaining internal page CSS entrypoints. This stage does not perform visual recovery and does not delete physical CSS files.

## Pages changed

| Page | Before local CSS links | After local CSS links | New manifest |
|---|---:|---:|---|
| `avaliacao.html` | 4 | 1 | `assets/css/pages/avaliacao-foundation.css` |
| `carteira.html` | 4 | 1 | `assets/css/pages/carteira-foundation.css` |
| `configuracoes.html` | 3 | 1 | `assets/css/pages/configuracoes-foundation.css` |
| `comunidade-interna.html` | 6 | 1 | `assets/css/pages/comunidade-interna-foundation.css` |

## Guardrails

- No `!important` added.
- No inline styles added.
- No global shell/sidebar/header ownership changed.
- No physical CSS deletion.
- Existing import order preserved inside each manifest.

## Risk

Low to moderate. These pages previously depended on multiple direct CSS links, including legacy page-specific files. The stage only encapsulates those links into page manifests, but visual verification is still deferred until Visual Recovery.
