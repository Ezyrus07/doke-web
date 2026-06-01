# More services load button alignment

Base: dokee-web(158).zip

## Cause
The `Carregar mais` host was nested inside `.content-rail.more-services__cards-rail`, which is the card rail responsibility. On tablet/iPad, that rail can be governed by card/scroll geometry, so the load CTA could align with the cards instead of the section rail.

## Change
Moved `.more-services__load[data-more-services-load-host]` outside the card rail and kept it as a direct child of `section.more-services`.

## Architectural reason
The load action is a section control, not part of the cards track. It should align to the section rail, while `.more-services__cards-rail` remains responsible only for card layout/scroll.

## Files changed
- index.html

## CSS/JS
No CSS file was added. No `!important` was added. No JavaScript was changed.
