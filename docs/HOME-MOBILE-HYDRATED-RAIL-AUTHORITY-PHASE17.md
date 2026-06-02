# Home mobile hydrated rail authority — Phase 17

## Root cause
On iOS/mobile, the first frame used the readable horizontal card rail, but after `mobile-app-shell` hydration the mounted rail contract in `mobile-index-feed-contract.css` changed the feed/card grids into a contained grid/row layout. That made `Destaques para você` and `Mais anúncios` collapse into narrow vertical strips.

## Change
Replaced the mounted rail block with a single hydrated/unhydrated mobile rail authority for:

- `section.featured-services #featured-services-track`
- `section.more-services [data-more-services-grid]`
- `section.home-publications #home-publications-track`

The contract keeps both initial and hydrated states on the same horizontal rail behavior.

## Architectural boundary
- `mobile-index-feed-contract.css` owns home mobile rail containment.
- `marketplace-card-contract.css` still owns card anatomy.
- No shell/sidebar/header/router changes.

## Visual intent
Preserve readable mobile cards and remove the post-load strip/collapse effect.
