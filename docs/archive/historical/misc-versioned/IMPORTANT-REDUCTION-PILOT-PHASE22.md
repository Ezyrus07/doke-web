# Important reduction pilot — Phase 22

## Goal
Start reducing `!important` without touching the approved home/card/mobile baseline or high-risk shell/page contracts.

## Scope
This phase only removes `!important` from files classified as `low-review-candidate` by the existing `global-cycle-117` audit.

Excluded from removal:

- service-card baseline contracts;
- shell/header/sidebar/core/layout contracts;
- medium and high baseline-required files;
- the current home mobile hydrated rail fix;
- marketplace/card authority files that still need visual coverage.

## Result

- 31 files reviewed.
- 31 files modified.
- 51 `!important` declarations removed.

The removal manifest is stored in:

```txt

docs/PHASE22-IMPORTANT-REDUCTION-PILOT-MANIFEST.json
```

## Report hygiene
The important audit scripts now write generated JSON reports to:

```txt
reports/generated/css-important/
```

instead of `docs/validation/`, keeping permanent docs cleaner.

## Validation required before broad expansion
This phase is a pilot. Before removing declarations from medium/high risk files, capture visual baselines for the affected page/component.
