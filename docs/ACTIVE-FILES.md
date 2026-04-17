# Mapa de arquivos ativos

## HTMLs ativos
- `index.html`
- `resultados.html`
- `detalhe-anuncio.html`
- `pedidos.html`
- `mensagens.html`
- `notificacoes.html`
- `pagamento.html`
- `perfil.html`
- `perfil-cliente.html`
- `perfil-profissional.html`
- `comunidade.html`
- `avaliacao.html`
- `finalizar-pedido.html`
- `mais.html`
- `ui-kit.html`
- `auth/login.html`
- `auth/cadastro.html`
- `auth/esqueci-senha.html`

## Base compartilhada prioritária
- `assets/css/core/*`
- `assets/css/components/cards/service-card.css`
- `assets/css/components/profile/profile-layout.css`
- `assets/js/core/app.js`
- `assets/js/features/profile/*`
- `assets/data/mocks/profile-data.js`

## Fora da base ativa
- `archive/*`
- `assets/js/supabase-config.example.js`

## Regra de manutenção
- resolver shell, sidebar, cards e perfis primeiro na base compartilhada
- evitar criar nova versão local de componente já existente
- antes de editar um card de serviço, validar se a mudança pertence ao owner `assets/css/components/cards/service-card.css`


## Home runtime ownership
- `assets/css/pages/home.css`
- `assets/css/pages/home-shell.css`
- `assets/css/pages/home-search-chrome.css`
- `assets/css/pages/home-sections.css`
- `assets/css/pages/home-refresh.css`
- `assets/css/pages/home-overlays.css`
- `assets/css/pages/home/mobile/*`
- `assets/js/pages/home.js`
- `assets/js/pages/home/drawer.js`
- `assets/js/pages/home/filters.js`
- `assets/js/pages/home/search.js`
- `assets/js/pages/search-data.js`
- `assets/js/pages/results/index.js`

## Home archived parallels
- `archive/legacy-home-css/*`

## Home CSS cleanup status
- `home-refresh.css` = hero/chrome/search composition
- `home-overlays.css` = overlays, popovers, modals and split-screen filter surfaces

- `home-search-chrome.css` now owns the top block of hero/search chrome that previously lived at the top of `home-refresh.css`.

- commit6: desktop search control fixes now live in `home-search-chrome.css`; final section normalization now lives in `home-sections.css`

- commit7: reordered `home.css` so `home-search-chrome.css` loads after `home-refresh.css` and stripped force-based overrides from the search/chrome owner

- commit8: stripped desktop `!important` overrides from `home-refresh.css` after owner/import cleanup

- commit9: restored the desktop white search card in `home-search-chrome.css` after the search/chrome cleanup removed too much visual structure

- commit10: restored the approved desktop search-card pattern in `home-search-chrome.css` and removed the unintended desktop mic/filter action layout

- commit11: fixed the desktop search submit button drift in `home-search-chrome.css` and stabilized the field/button containment

- commit12: bypassed shell-swap navigation for any transition that enters or leaves `index.html`, avoiding the janky cross-page swap between home and internal pages

- commit13: restored shell-swap for `index.html` transitions and added style/script/document prefetching to reduce the lag when moving between home and internal pages

- commit14: hardened shell navigation so internal initializer errors no longer force a full reload; page initializers now fail in isolation instead of breaking index navigation

- commit15: refined home mobile featured cards and bottom nav for iPhone SE density; increased bottom spacing and reduced nav/card interference

- commit16: reduced the visual weight of mobile section headings (`Categorias`, `Anúncios em destaque`) and softened their color on the home

- commit17: removed visible mobile section titles on home and recalibrated featured ad card dimensions for a cleaner app-like flow

- commit18: compacted featured ad cards further on mobile by reducing media height, inner padding, chip height and CTA size

- commit19: removed the forced min-height and auto-push footer behavior that was creating the blank vertical gap inside mobile featured cards

- commit20: turned mobile featured ads into a horizontal carousel and brought desktop-derived home sections (workers, antes e depois, mais anúncios, profissionais) into mobile with compact horizontal rails

- commit21: turned Workers into a 2x2 reels-style grid without arrows, restored mobile visibility of Mais anúncios controls, and reduced the height of Profissionais em destaque cards

- commit22: removed workers arrows in HTML, widened before/after cards, matched 'Mais anúncios' cards to the top featured card pattern, and rebuilt featured pros cards to be lower and cleaner on mobile

- commit23: aligned the mobile 'Mais anúncios' heading and changed the ads below it from a horizontal rail to a vertical stacked feed

- commit24: forced the mobile 'Mais anúncios' heading into a true left-aligned block and reinforced the ads below it as a vertical stacked feed

- commit25: fixed mobile 'Mais anúncios' by keeping the cards host visible while only hiding the filter panel, and forced the heading/title block to align left

- commit26: normalized mobile 'Mais anúncios' cards to the same visual contract as the top featured cards (media, body, chips, footer, price and CTA)

- commit27: refined desktop home categories to match the approved square-card reference more closely and increased the spacing between the search field and the desktop CTAs

- commit28: reduced oversized desktop home categories back to a more balanced square-card scale

- commit29: stabilized Workers across small phones, removed right clipping from mobile 'Mais anúncios' cards, and restored/expanded the mobile footer area with enough safe-space below the bottom nav

- commit32: equalized desktop featured ad cards so extra chips/content no longer make one card taller than the others

- commit33: propagated desktop card equalization to Mais anúncios as well, reduced desktop category scale again, and strengthened controlled hover feedback across home cards, categories, tabs and arrows

- commit34: compacted desktop ad cards in both featured areas, made mobile ad CTAs green like desktop, hardened Mais anúncios mobile cards against right-edge clipping, and locked Workers into a consistent 2x2 card grid across larger phones

- commit35: applied hard-stop mobile fixes so Workers uses a uniform fixed 2x2 card grid and Mais anúncios cards/footer cannot exceed container width or clip the CTA on the right edge

- commit36: added deterministic mobile rules that force Workers card heights through CSS variables and switched Mais anúncios footer to a hard flex split with fixed price width plus flexible CTA width

- commit37: stopped treating Mais anúncios as a separate mobile card variant and forced it to reuse the exact same visual contract as the top featured cards

- commit38: stopped forcing Mais anúncios into a different mobile layout and switched it to the same horizontal rail/card contract used by the top featured section

- commit39: restored proper mobile margins and top spacing for Mais anúncios, then centered the section again as a vertical card flow instead of a lateral rail

- commit40: replaced the conflicting Mais anúncios mobile footer/layout rules with a terminal vertical-feed reset and simplified the Workers grid to one fixed card rhythm across phones

- commit41: added stronger desktop hover feedback on index cards, categories, arrows, tabs, links, search shell, CTAs and submit control

- commit42: implemented a compact title-only mobile header for pedidos.html with back button, search action and a dropdown menu on the menu button

- commit43: profile now opens the full orçamento flow in-page via modal, reusing the quote form, and the address modal no longer closes by backdrop click so selecting fields on mobile is safer

- commit44: stage-1 cleanup extracted the compact pedidos mobile header into a shared component stylesheet and archived obvious orphan/rest CSS files from assets/css/pages

- commit45: stage-2 cleanup propagated the shared compact internal mobile header to mensagens.html and notificacoes.html, including shared dropdown behavior

- commit46: removed the legacy pedidos mobile hero/header block entirely on small screens so only the compact title header remains
