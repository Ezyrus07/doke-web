# UX-CARDS-DEBT-001 — Semantic public catalog contract

## Status

Implementation on top of UX-SEARCH-DEBT-001.

## Base

```text
ux/ux-search-debt-001-coverage
9a3fc34a9fad2b96c6468a5c784ea2f26ff61a23
```

Tracking issue: `#64`.
Pull request: `#81`.

## Root cause

The legacy public catalog test treated cache-busting query strings as architectural contracts. It required specific July 2026 version suffixes for:

- `services-repository.js`;
- `services-service.js`;
- `public-service-card.js`.

Those suffixes are delivery metadata and legitimately change when unrelated contracts evolve. The stale assertions failed even when the same canonical repository, service and renderer remained wired correctly.

## Semantic contract

The refreshed test extracts external script sources from `index.html` and `resultados.html`, removes only a leading `./`, query string and fragment, and then requires:

1. the canonical services repository exactly once;
2. the canonical services service exactly once;
3. the canonical public service card renderer exactly once;
4. dependency order `repository -> service -> card`.

A deterministic synthetic fixture proves that different cache keys and fragments do not alter the contract.

## Preserved contracts

The test continues to require:

- empty static service mock catalogs;
- an empty local search service pool;
- no static demonstration ads on Home or service detail;
- hidden similar-services state until real data exists;
- no merge of mock services inside the repository;
- page-data delegation of `services` to the domain repository;
- active services visible across accounts and inactive services removed from public discovery;
- no legacy hard-coded demonstration service fallback.

## Validation

The dedicated read-only workflow runs:

- JavaScript syntax validation;
- the refreshed public catalog contract;
- UX-CARDS-001;
- UX-RESULTS-001 presentation and DOM contracts;
- UX-SEARCH-001 and SEARCH-UX02;
- executable LCOV generation required by the CI-based Sonar configuration;
- SonarQube Cloud Quality Gate on the trusted branch push;
- patch whitespace validation.

## Boundaries

This increment does not modify Home, Resultados, the repository, services service, card renderer, ranking, favorites runtime, backend, Supabase, staging or production.

## Rollback

Revert the UX-CARDS-DEBT-001 commits. No data, schema or environment rollback is required.
