# Frontend structural gates

This gate protects the Doke frontend architecture before the refactoring lots modify CSS or runtime behavior.

## Policy

- The gate is baseline-aware: historical debt is listed explicitly in `config/frontend-structural-gates.json`.
- Existing debt may remain temporarily, but new violations fail CI.
- Removing a baseline entry is preferred; adding one requires evidence and a debt record.
- The gate does not reorder CSS, change the visual baseline, alter runtime behavior, access Supabase, or modify production.

## Checks

1. **Recursive CSS graph** — resolves direct HTML stylesheets and nested `@import` statements, detecting missing files, cycles, multiple paths to the same normalized asset, and query-string divergence.
2. **Manifest purity** — files that declare themselves import-only or manifest-only may contain comments and `@import`, but no selectors or visual declarations.
3. **Storage ownership** — `localStorage` and `sessionStorage` must stay inside approved services, repositories, adapters, or explicit historical debt.
4. **Route registry ownership** — `navigation-registry.js` is the owner of route metadata; additional route collections are reported.
5. **Global API ownership** — the same `window.*` or `globalThis.*` API may not be exposed by multiple files without an explicit baseline.
6. **Breakpoint parity** — structural JavaScript must use the canonical mobile/tablet/desktop/wide boundaries or a documented historical exception.
7. **Existing contract reuse** — the orchestrator also executes the navigation registry and responsive-boundary audits already present in the repository.

## Local execution

```bash
node scripts/audit-frontend-structural-gates.js --strict
```

The deterministic report is written to:

```text
reports/generated/frontend-structural-gates-report.json
```

## Baseline changes

A baseline entry must include all of the following in the pull request:

- exact file, asset, global name, or breakpoint;
- reason the debt cannot be removed in the same change;
- linked Doke HQ debt record;
- planned removal lot;
- proof that the candidate does not increase the historical count.

FE-G01 is complete only when the workflow runs on the draft PR, the report is uploaded even on failure, and all detected historical violations are classified without suppressing future regressions.
