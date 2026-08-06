# UX-SEARCH-DEBT-001 — Sonar findings and executable coverage

## Status

First implementation increment on top of UX-RESULTS-001.

## Base

```text
ux/ux-results-001-canonical-composition
295024777706b48e7b3770dc69c233b7bef3459b
```

Tracking issue: `#67`.

## Confirmed findings from PR #66

The original Sonar check contained six maintainability findings, all in `scripts/test-ux-search-001-search-experience.js`:

- CommonJS core imports without the `node:` protocol for `fs`, `path` and `assert`;
- three boolean guards that can be represented by optional chaining.

The findings are corrected directly. No issue is accepted, suppressed or excluded.

## Executable coverage

Node 22 runs the deterministic UX-SEARCH-001 and SEARCH-UX02 harnesses under its native test coverage engine and emits LCOV for:

```text
assets/js/pages/search/server-results-surface.js
```

That static bundle publishes and executes both:

- `Doke.searchExperience`;
- `Doke.searchResultsServerSurface`.

The SEARCH-UX02 runtime harness now loads the canonical production module through Node `require` under controlled globals that are restored after execution. This preserves source attribution without dynamic code execution.

The gate requires:

- both harnesses to remain executable through their legacy direct `node` invocation;
- LCOV to exist and reference the canonical production source;
- at least one executable source line to be hit;
- the Resultados, filter, search and transversal UX stack to remain green.

## Sonar import boundary

The current project uses SonarQube Cloud automatic analysis. Automatic analysis does not import coverage and cannot run concurrently with a CI-based SonarScanner.

Therefore this increment produces a deterministic LCOV artifact and reports readiness, but does not fabricate Sonar coverage. Final completion requires:

1. disabling automatic analysis for the SonarQube Cloud project;
2. configuring the repository secret `SONAR_TOKEN`;
3. adding and executing the CI-based scanner against this LCOV report;
4. confirming coverage is displayed by Sonar with zero new findings and zero security hotspots.

## Preserved boundaries

This increment does not change ranking, repository, search service, RPCs, Edge Functions, database, staging, production, card anatomy or Resultados behavior.

## Rollback

Revert the UX-SEARCH-DEBT-001 commits. No remote data or schema rollback is required.
