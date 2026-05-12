# Native Navigation Perception Contract

## Purpose

The Doke shell currently uses full-document navigation between HTML pages by default. This preserves first-load layout stability and prevents partial route swaps from rendering pages with incomplete CSS/JS.

This contract improves perceived navigation speed without re-enabling the old shell swap router.

## Active rule

- `instantShellNavigation` remains disabled by default.
- Internal navigation uses native browser document loading.
- Native navigation may use lightweight visual feedback.
- Native navigation may use safe `<link rel="prefetch" as="document">` hints.
- The app must not fetch and swap `.page` content while `instantShellNavigation` is disabled.

## Allowed behavior

- Add `body.is-native-navigating` during a native internal navigation click.
- Add `html[data-doke-navigation-state="native-leaving"]` while the current document is leaving.
- Prefetch internal HTML documents with browser-native prefetch hints.
- Respect `prefers-reduced-motion`.

## Disallowed behavior

- Re-enable partial shell swapping as the default.
- Replace `.page` content through JS while the native navigation mode is active.
- Use inline styles to create navigation feedback.
- Add layout-affecting transitions to shell/sidebar/header/body wrappers.
- Block navigation waiting for animation completion.

## Follow-up

If native page changes still feel slow after this contract, optimize heavy page assets and reduce per-page CSS/JS volume. Do not re-enable partial routing until every page has a stable lifecycle contract.
