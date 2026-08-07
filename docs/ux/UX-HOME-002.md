# UX-HOME-002 — More services intent filters and progressive reveal

## Status

- issue: #85;
- branch: `ux/ux-home-002-more-services-filters`;
- base: `ux/ux-home-001-rail-states`;
- base SHA: `47cd16434beb2f63c10adce3ebe8d15052e1f52c`;
- PR: pending opening;
- merge: not authorized;
- staging/production: not accessed.

## Root cause

The `Mais anúncios` surface already renders the canonical `services.slice(6)` collection and owns progressive reveal controls, but its intent controls are not yet connected to data authority:

1. `.mini-tab` handling in `home.js` only toggles `is-active` and `aria-pressed`;
2. the filters panel opens/closes, but `Aplicar filtros` does not commit a filter snapshot or change the rendered collection;
3. progressive reveal snapshots the cards currently in the DOM and therefore has no explicit relationship with an applied intent/filter generation;
4. service normalization preserves metadata-backed fields such as category, location, rating, guarantee, emergency, online, availability and timestamps;
5. no canonical following relationship authority was located for the Home surface, so `Seguindo` must not infer results from favorites, history or provider IDs.

## Architectural boundary

UX-HOME-002 will introduce a presentation authority for the `more-services` rail only. It must not replace:

- `Doke.homeRailState`;
- `Doke.publicServiceCard`;
- `Doke.services.services` / services repository;
- UX-FILTERS-001 applied/draft authority on `resultados.html`;
- SEARCH-UX02 ranking/search authority.

The Home contract owns only:

```text
source collection
+ selected intent
+ draft filters
+ applied filters
+ filtered collection
+ visibleCount
+ generation
+ sanitized presentation receipt
```

## Intent contract

| Intent | Authority | Rule |
|---|---|---|
| Para você | canonical received order | preserve order; no invented ranking |
| Seguindo | unresolved | fail closed / unavailable until a following authority exists |
| Bem avaliados | canonical item metadata | require real numeric rating and deterministic descending sort |
| Com garantia | canonical item metadata | `guaranteed === true` |
| Disponíveis hoje | canonical item metadata | `availableToday === true` |
| Novos | canonical timestamps | deterministic `createdAt`/`updatedAt` ordering with no fabricated recency |

## Filter contract

Supported only when backed by canonical item fields/metadata:

- category;
- state;
- city;
- neighborhood;
- minimum rating;
- guaranteed;
- emergency;
- online;
- available today.

Draft edits never mutate cards, rail state or progressive reveal until explicit `Aplicar filtros`.

Closing/cancelling the panel restores the UI to the applied snapshot.

## Progressive reveal contract

- applied intent/filter changes reset `visibleCount` to the configured initial limit;
- `Carregar mais` reveals only items from the current filtered collection;
- no hidden item outside the applied collection may become visible;
- 0 items -> rail `empty`/unavailable state according to authority;
- 1..6 items -> all rendered, load control hidden;
- 7+ items -> initial slice + deterministic step reveal;
- route re-init must not retain stale reveal state.

## Accessibility

- tabs use explicit stable intent identifiers;
- selected tab exposes `aria-selected`/`aria-pressed` consistently;
- unsupported `Seguindo` exposes unavailable semantics without pretending success;
- filter apply/cancel remain keyboard operable;
- result-count feedback is announced without leaking user or item IDs.

## Events

Events may contain only:

```text
intent
activeFilterCount
resultCount
visibleCount
generation
availability state
```

Do not expose raw service IDs, provider IDs, user IDs, private query/history or technical error messages.

## Tests required

- all six tab intents;
- unsupported `Seguindo` fail-closed behavior;
- draft != applied;
- cancel preserves applied state;
- combined filters;
- reset;
- progressive reveal 0/1/6/7+;
- intent/filter change resets reveal;
- route re-init/latest generation;
- canonical card reuse;
- sanitized events;
- inherited UX-HOME-001, SEARCH-UX02 and UX-SEARCH-DEBT gates.

## Out of scope

- rail arrows / scroll synchronization;
- following backend/repository/RPC;
- search ranking changes;
- migrations or Supabase changes;
- redesign/reordering;
- card anatomy;
- staging, production or merge.

## Rollback

The implementation must remain additive at the Home presentation layer. Removing the UX-HOME-002 module must restore the previous `Mais anúncios` behavior without data migration or persistent-state repair.
