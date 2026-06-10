# CSS Cleanup Stage 44 — avaliacao.html

## Scope

- `avaliacao.html`

## Objective

Remove old shell/header/tablet/mobile contracts from the post-service evaluation page and remove active `!important` usage from its cascade.

## Main changes

- Removed direct links to legacy shell, rail, tablet, mobile and responsive contracts.
- Added the cleaner `assets/css/layout/header.css` authority.
- Removed active `!important` from the remaining files participating in `avaliacao.html`.

## Before/after

```json
{
  "before": {
    "avaliacao.html": {
      "direct_css": 32,
      "active_css": 32,
      "important_total": 4544,
      "important_files": [
        {
          "file": "assets/css/patterns/remaining-pages.css",
          "important": 33
        },
        {
          "file": "assets/css/components/navigation/bottom-nav.css",
          "important": 70
        },
        {
          "file": "assets/css/components/shell/page-container-contract.css",
          "important": 11
        },
        {
          "file": "assets/css/components/navigation/header-mobile.css",
          "important": 97
        },
        {
          "file": "assets/css/components/navigation/app-mobile-header-contract.css",
          "important": 700
        },
        {
          "file": "assets/css/components/navigation/mobile-page-rhythm-contract.css",
          "important": 236
        },
        {
          "file": "assets/css/components/layout/responsive-page-contract.css",
          "important": 230
        },
        {
          "file": "assets/css/components/shell/doke-shell-contract.css",
          "important": 2545
        },
        {
          "file": "assets/css/components/layout/index-compact-card-contract.css",
          "important": 129
        },
        {
          "file": "assets/css/components/shell/tablet-internal-rail-contract.css",
          "important": 428
        },
        {
          "file": "assets/css/components/shell/ipad-safari-scroll.css",
          "important": 65
        }
      ]
    }
  },
  "after": {
    "avaliacao.html": {
      "direct_css": 23,
      "active_css": 23,
      "important_total": 0,
      "important_files": []
    }
  },
  "total_css_important": 10691,
  "unbalanced_css": []
}
```

## Risk

High visual risk in the evaluation flow. This stage favors a smaller and predictable cascade over exact visual preservation.
