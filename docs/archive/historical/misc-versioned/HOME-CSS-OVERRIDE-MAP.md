# HOME CSS Override Map

Auditoria do manifesto `assets/css/pages/home.css` para orientar limpeza incremental sem apagar CSS em massa.

## Resumo

- CSS direto da home: 227.1 KB
- `!important` em `home.css`: 2802
- imports diretos dentro de `home.css`: 61
- CSS carregados via manifesto da home: 109
- `!important` totais carregados via manifesto da home: 12757
- imports ausentes dentro da home: 0
- imports diretos duplicados no `index.html`: 0

## Imports diretos duplicados no index

Nenhum após este ciclo.

## Arquivos com mais !important carregados pela home

-  2802 — assets/css/pages/home.css (227.1 KB)
-  1042 — assets/css/pages/home/mobile/sections.css (61.3 KB)
-   962 — assets/css/pages/home/index-final-refinement.css (61.1 KB)
-   672 — assets/css/components/before-after-workers-preview.css (41.8 KB)
-   490 — assets/css/pages/home/mobile/search.css (23.5 KB)
-   451 — assets/css/components/domain/doke-domain-cards.css (31.2 KB)
-   429 — assets/css/pages/home-search-chrome.css (43.4 KB)
-   377 — assets/css/pages/home-sections.css (82.9 KB)
-   363 — assets/css/components/shell/mobile-app-shell.css (26.7 KB)
-   308 — assets/css/components/before-after-workers-preview/mobile-comment-sheets.css (17.5 KB)
-   296 — assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css (16.7 KB)
-   287 — assets/css/pages/home-refresh/mobile-index-pass.css (37.1 KB)

## Seletores repetidos em home.css

- 17x — `html.home-index-root body.home-index-shell`
- 11x — `body.home-index-shell`
- 9x — `html.home-index-root body.home-index-shell section.home-publications > .content-rail > .publication-grid`
- 8x — `html.home-index-root body.home-index-shell section.short-videos > .content-rail > .short-videos__track`
- 8x — `html.home-index-root body.home-index-shell section.more-services .more-services__tabs-track`
- 6x — `html.home-index-root body.home-index-shell section:is(.featured-services, .short-videos, .home-publications, .featured-pros)`
- 6x — `html.home-index-root body.home-index-shell section:is(.featured-services, .short-videos, .home-publications, .featured-pros) > .content-rail`
- 6x — `html.home-index-root body.home-index-shell section:is(.featured-services, .short-videos, .home-publications, .featured-pros) > .content-rail > .content-rail__arrow`
- 6x — `html.home-index-root body.home-index-shell section.more-services .more-services__tabs-track > .filter-toggle`
- 6x — `html.home-index-root body.home-index-shell section.home-publications .publication-card__content`
- 5x — `body.home-index-shell .short-videos .short-videos__track`
- 5x — `html.home-index-root body.home-index-shell section:is(.featured-services, .short-videos, .home-publications, .featured-pros) > .content-rail > .content-rail__arrow--prev`
- 5x — `html.home-index-root body.home-index-shell section:is(.featured-services, .short-videos, .home-publications, .featured-pros) > .content-rail > .content-rail__arrow--next`
- 5x — `html.home-index-root body.home-index-shell section.featured-services > .content-rail > .service-grid, html.home-index-root body.home-index-shell section.home-publications > .content-rail > .publication-grid, html.home-index-root body.home-index-shell section.featured-pros > .content-rail > .featured-pros__grid`
- 5x — `html.home-index-root body.home-index-shell section.more-services .service-grid[data-more-services-grid]`
- 5x — `html.home-index-root body.home-index-shell section.more-services .more-services__cards-rail`
- 5x — `html.home-index-root body.home-index-shell section.home-publications .publication-card`
- 5x — `html.home-index-root body.home-index-shell section.home-publications .publication-card__title`
- 5x — `html.home-index-root body.home-index-shell section.home-publications .publication-card__actions`
- 4x — `html.home-index-root body.home-index-shell section.featured-pros .pro-card`

## Próxima limpeza segura

1. Não remover blocos de `home.css` ainda.
2. Primeiro extrair/validar ownership de service cards, workers e publicações em componentes/patterns.
3. Depois reduzir `!important` por bloco com screenshot antes/depois.
4. Manter `index.html` com imports mínimos: core, shell e manifesto da home.
