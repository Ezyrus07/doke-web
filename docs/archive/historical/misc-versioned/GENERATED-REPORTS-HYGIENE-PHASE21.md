# Generated reports hygiene — Phase 21

## Goal
Remove generated reports and historical report artifacts from the active project tree without touching runtime HTML/CSS/JS behavior.

## Scope
This phase removes generated evidence artifacts, not source code. It does not alter shell, router, cards, home layout, mobile contracts, backend, services, controllers, or runtime CSS.

## Removed

- Files removed: `139`
- Approx bytes removed: `95886159`

Main affected areas:

```txt
component_audit_data.json: 1
reports/detalhe-anuncio-index-card-cleanup-before-after.json: 1
reports/detalhe-anuncio-index-card-cleanup-before-after.csv: 1
reports/responsive-baseline-audit-before-card-contract.json: 1
reports/detalhe-anuncio-index-card-cleanup-before-after.md: 1
reports/responsive-baseline-audit-before-card-contract.csv: 1
reports/css-responsive-conflicts-cleanup-before-after.csv: 1
reports/responsive-baseline-audit-before-card-contract.md: 1
reports/css-responsive-conflicts-cleanup-before-after.md: 1
reports/professional-responsive-polish-before-after.md: 1
reports/index-category-desktop-boundary-correction.md: 1
reports/responsive-rails-containers-before-after.json: 1
reports/css-responsive-conflicts-before-cleanup.json: 1
reports/responsive-rails-containers-before-after.csv: 1
reports/css-organization-phase6-delete-manifest.txt: 1
reports/css-responsive-conflicts-after-cleanup.json: 1
reports/responsive-rails-containers-before-after.md: 1
reports/css-responsive-conflicts-cleanup-files.csv: 1
reports/hardening-css-js-architecture-phase9-14.md: 1
reports/header-responsive-parity-before-after.json: 1
reports/marketplace-index-parity-before-after.json: 1
reports/header-responsive-parity-before-after.csv: 1
reports/index-category-rail-canonical-boundary.md: 1
reports/marketplace-index-parity-before-after.csv: 1
reports/overflow-text-clipping-audit-current.json: 1
reports/professional-responsive-polish-audit.json: 1
reports/responsive-priority-fix-before-after.json: 1
reports/detail-index-visual-parity-followup.json: 1
reports/header-responsive-parity-before-after.md: 1
reports/marketplace-index-parity-before-after.md: 1
reports/overflow-text-clipping-audit-before.json: 1
reports/overflow-text-clipping-audit-current.csv: 1
reports/overflow-text-clipping-before-after.json: 1
reports/responsive-card-contract-before-after.md: 1
reports/responsive-priority-fix-before-after.csv: 1
reports/detail-index-visual-parity-followup.csv: 1
reports/featured-professionals-card-redesign.md: 1
reports/hardening-delete-manifest-phase9-14.txt: 1
reports/home-workers-ipad-mini-608-scrolled.png: 1
reports/index-publications-rail-small-tablet.md: 1
reports/overflow-text-clipping-audit-after.json: 1
reports/overflow-text-clipping-audit-before.csv: 1
reports/overflow-text-clipping-audit-current.md: 1
reports/overflow-text-clipping-before-after.csv: 1
reports/professional-responsive-polish-audit.md: 1
reports/responsive-priority-fix-before-after.md: 1
reports/responsive-rails-containers-before.json: 1
reports/router-css-lifecycle-messages-scroll.md: 1
reports/section-header-contract-before-after.md: 1
reports/detail-index-visual-parity-followup.md: 1
reports/focused-index-parity-before-after.json: 1
reports/header-rail-alignment-before-after.csv: 1
reports/more-services-load-button-alignment.md: 1
reports/overflow-text-clipping-audit-after.csv: 1
reports/overflow-text-clipping-audit-before.md: 1
reports/overflow-text-clipping-before-after.md: 1
reports/playwright-layout-validation-phase5.md: 1
reports/responsive-rails-containers-after.json: 1
reports/focused-index-parity-before-after.csv: 1
reports/header-rail-alignment-before-after.md: 1
reports/index-category-narrow-desktop-rail.md: 1
reports/index-horizontal-rails-tablet-820.png: 1
reports/overflow-text-clipping-audit-after.md: 1
reports/css-responsive-conflicts-report.json: 1
reports/focused-index-parity-before-after.md: 1
reports/responsive-contract-test-report.json: 1
reports/router-scroll-correction-20260601.md: 1
reports/css-responsive-conflicts-report.csv: 1
reports/detail-index-card-visual-parity.csv: 1
reports/mobile-ios-ad-card-rail-collapse.md: 1
reports/responsive-contract-test-report.csv: 1
reports/section-header-contract-before.json: 1
reports/css-responsive-conflicts-report.md: 1
reports/detail-index-card-visual-parity.md: 1
reports/messages-mobile-thread-open-fix.md: 1
reports/messages-scroll-leak-correction.md: 1
reports/responsive-contract-test-report.md: 1
reports/section-header-contract-after.json: 1
reports/index-tablet-publications-rail.md: 1
reports/mobile-card-distribution-fix.json: 1
reports/overflow-text-clipping-audit.json: 1
reports/section-header-contract-after.csv: 1
reports/card-anatomy-boundary-audit.json: 1
reports/index-category-zoom-arrow-fix.md: 1
reports/mobile-card-distribution-fix.csv: 1
reports/overflow-text-clipping-audit.csv: 1
reports/sidebar-width-standardization.md: 1
reports/card-anatomy-boundary-audit.csv: 1
reports/mobile-card-distribution-fix.md: 1
reports/overflow-text-clipping-audit.md: 1
reports/card-anatomy-boundary-audit.md: 1
reports/home-workers-ipad-mini-608.png: 1
reports/responsive-baseline-audit.json: 1
reports/responsive-index-baseline.json: 1
reports/ad-card-cta-ipad-mini-608.png: 1
reports/index-tablet-category-peek.md: 1
reports/js-navigation-audit-phase7.md: 1
reports/messages-route-scroll-exit.md: 1
reports/responsive-baseline-audit.csv: 1
reports/ad-card-cta-desktop-1366.png: 1
reports/mobile-workers-four-items.md: 1
reports/responsive-baseline-audit.md: 1
reports/home-workers-tablet-820.png: 1
reports/ad-card-cta-mobile-390.png: 1
reports/ad-card-cta-tablet-820.png: 1
reports/css-organization-phase6.md: 1
reports/index-tablet-header-gap.md: 1
reports/css-load-audit-phase4.md: 1
reports/router-scroll-phase8.md: 1
docs/reports: 30
```

Detailed machine-readable manifest:

```txt
docs/PHASE21-GENERATED-REPORTS-REMOVAL-MANIFEST.json
```

## Rule going forward
Generated evidence must go to:

```txt
reports/generated/
```

Permanent decisions must be consolidated into the living documentation, especially:

- `docs/ARCHITECTURE.md`
- `docs/CSS_AUTHORITY_MAP.md`
- `docs/VALIDATION.md`
- `docs/DOCUMENTATION_INDEX.md`

## Runtime impact
None expected. This phase only removes generated/historical report artifacts.


## Unused CSS follow-up

After generated reports were moved out of the active tree, `npm run audit:unused-asset-candidates` exposed `43` conservative unused CSS candidates. They were removed in the same phase and recorded in:

```txt
docs/PHASE21-UNUSED-CSS-REMOVAL-MANIFEST.json
```
