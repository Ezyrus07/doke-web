# CSS Cleanup Stage 43 — professional flow pages

## Scope

Target pages:

- `pagamento-profissional.html`
- `avaliacao-profissional.html`
- `tornar-profissional.html`

## Objective

Remove direct dependencies on old shell/header/tablet/mobile contracts from the professional/payment flow pages and attach the cleaner `assets/css/layout/header.css` authority.

## Removed legacy direct links

The stage removed direct references to old contracts such as:

- `doke-shell-contract.css`
- `app-header.css`
- `responsive-page-contract.css`
- `mobile-app-shell.css`
- `desktop-shell.css` / `desktop-sidebar.css` / `desktop-topbar.css` / `desktop-search.css`
- `shared-page-width-contract.css`
- `desktop-page-rail-authority.css`
- `tablet-internal-rail-contract.css`
- `ipad-safari-scroll.css`
- `doke-domain-cards.css`
- `doke-layout-system.css`
- `mobile-base-stability.css`

## Before/after

```json
{
  "before": {
    "pagamento-profissional.html": {
      "direct_css": 25,
      "active_css": 25,
      "important_total": 4701,
      "important_files": [
        {
          "file": "assets/css/components/shell/app-header.css",
          "important": 583
        },
        {
          "file": "assets/css/components/layout/responsive-page-contract.css",
          "important": 230
        },
        {
          "file": "assets/css/components/shell/mobile-app-shell.css",
          "important": 406
        },
        {
          "file": "assets/css/components/domain/doke-domain-cards.css",
          "important": 260
        },
        {
          "file": "assets/css/components/shell/responsive-boundary.css",
          "important": 15
        },
        {
          "file": "assets/css/components/shell/mobile-base-stability.css",
          "important": 40
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
    },
    "avaliacao-profissional.html": {
      "direct_css": 25,
      "active_css": 25,
      "important_total": 4701,
      "important_files": [
        {
          "file": "assets/css/components/shell/app-header.css",
          "important": 583
        },
        {
          "file": "assets/css/components/layout/responsive-page-contract.css",
          "important": 230
        },
        {
          "file": "assets/css/components/shell/mobile-app-shell.css",
          "important": 406
        },
        {
          "file": "assets/css/components/domain/doke-domain-cards.css",
          "important": 260
        },
        {
          "file": "assets/css/components/shell/responsive-boundary.css",
          "important": 15
        },
        {
          "file": "assets/css/components/shell/mobile-base-stability.css",
          "important": 40
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
    },
    "tornar-profissional.html": {
      "direct_css": 25,
      "active_css": 25,
      "important_total": 4701,
      "important_files": [
        {
          "file": "assets/css/components/shell/app-header.css",
          "important": 583
        },
        {
          "file": "assets/css/components/layout/responsive-page-contract.css",
          "important": 230
        },
        {
          "file": "assets/css/components/shell/mobile-app-shell.css",
          "important": 406
        },
        {
          "file": "assets/css/components/domain/doke-domain-cards.css",
          "important": 260
        },
        {
          "file": "assets/css/components/shell/responsive-boundary.css",
          "important": 15
        },
        {
          "file": "assets/css/components/shell/mobile-base-stability.css",
          "important": 40
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
    "pagamento-profissional.html": {
      "direct_css": 8,
      "active_css": 8,
      "important_total": 0,
      "important_files": []
    },
    "avaliacao-profissional.html": {
      "direct_css": 8,
      "active_css": 8,
      "important_total": 0,
      "important_files": []
    },
    "tornar-profissional.html": {
      "direct_css": 8,
      "active_css": 8,
      "important_total": 0,
      "important_files": []
    }
  },
  "total_css_important": 10891,
  "unbalanced_css": []
}
```

## Notes

No new visual patch file was created. This stage intentionally favors a smaller and more predictable cascade over preserving exact visual parity.
