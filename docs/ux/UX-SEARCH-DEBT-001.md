# UX-SEARCH-DEBT-001 — Sonar findings and executable coverage

## Status

CI-based SonarQube Cloud analysis is configured on top of UX-RESULTS-001. The pull request remains draft and unmerged.

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

The SEARCH-UX02 runtime harness loads the canonical production module through Node `require` under controlled globals that are restored after execution. This preserves source attribution without dynamic code execution.

The gate requires:

- both harnesses to remain executable through their legacy direct `node` invocation;
- LCOV to exist and reference the canonical production source;
- at least one executable source line to be hit;
- the Resultados, filter, search and transversal UX stack to remain green.

Current executable baseline:

```text
lines: 911/1134 — 80.34%
branches: 56.09%
functions: 77.08%
```

## CI-based Sonar analysis

Automatic analysis is disabled and the repository secret is supplied to the trusted branch workflow. The CI scanner:

- imports `coverage/ux-search-debt-001/lcov.info`;
- analyzes pull request `#75` against `ux/ux-results-001-canonical-composition`;
- waits for the SonarQube Cloud Quality Gate;
- fails closed when the credential, report or Quality Gate is unavailable.

`sonar-project.properties` separates main code from `scripts/` and `tests/`, so test harnesses are analyzed as test code and do not create artificial production coverage debt. Binary evidence and generated outputs are excluded from source analysis, while product code, Supabase assets and GitHub workflows remain in scope.

All GitHub Actions dependencies used by this workflow are pinned to immutable commit SHAs. No Sonar issue is accepted, suppressed or excluded.

## Preserved boundaries

This increment does not change ranking, repository, search service, RPCs, Edge Functions, database, staging, production, card anatomy or Resultados behavior.

## Rollback

Revert the UX-SEARCH-DEBT-001 commits. No remote data or schema rollback is required.
