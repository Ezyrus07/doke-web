# CSS Cleanup Stage 48 — remoção de CSS remanescente não ativo

## Objetivo

Remover da árvore `assets/css` os arquivos CSS que ainda continham `!important`, mas que não estavam na cascata ativa de nenhum HTML normal do projeto.

## Critério usado

Foram analisados os HTMLs da raiz e `auth/*.html`, seguindo links diretos de CSS e imports transitivos. Arquivos fora dessa cascata e ainda com `!important` foram classificados como remanescentes/legados não ativos.

## Resultado

- Arquivos CSS removidos: **37**
- Ocorrências de `!important` removidas do CSS-fonte: **10629**
- `!important` restante em `assets/css`: **0**
- Arquivos CSS restantes em `assets/css`: **334**
- CSS com chaves desbalanceadas: **0**
- `!important` ativo na cascata dos HTMLs normais: **0**

## Risco

Baixo a médio para as páginas normais já saneadas, porque os arquivos removidos não estavam no grafo ativo de CSS dos HTMLs principais. O risco existe se algum JS, ferramenta interna ou HTML fora do escopo carregar esses arquivos dinamicamente.

## Arquivos removidos

- `assets/css/components/cards/mobile-card-contract.css` — 99 `!important`, 279 linhas
- `assets/css/components/cards/shared-index-card-contract.css` — 96 `!important`, 425 linhas
- `assets/css/components/domain/doke-domain-cards.css` — 260 `!important`, 885 linhas
- `assets/css/components/layout/index-compact-card-contract.css` — 129 `!important`, 434 linhas
- `assets/css/components/layout/professional-responsive-layout.css` — 67 `!important`, 258 linhas
- `assets/css/components/layout/responsive-page-contract.css` — 230 `!important`, 598 linhas
- `assets/css/components/layout/responsive-priority-cards.css` — 170 `!important`, 131 linhas
- `assets/css/components/layout/responsive-priority-contract.css` — 477 `!important`, 808 linhas
- `assets/css/components/navigation/app-mobile-header-contract.css` — 700 `!important`, 1167 linhas
- `assets/css/components/navigation/app-mobile-search.css` — 146 `!important`, 202 linhas
- `assets/css/components/navigation/app-mobile-topbar.css` — 214 `!important`, 409 linhas
- `assets/css/components/navigation/home-mobile-drawer.css` — 187 `!important`, 303 linhas
- `assets/css/components/navigation/mobile-chrome-lock.css` — 277 `!important`, 462 linhas
- `assets/css/components/navigation/mobile-page-rhythm-contract.css` — 236 `!important`, 469 linhas
- `assets/css/components/navigation/mobile-search-header-shared.css` — 348 `!important`, 591 linhas
- `assets/css/components/profile/profile-content-rail.css` — 74 `!important`, 668 linhas
- `assets/css/components/shell/app-header-canonical-contract.css` — 304 `!important`, 548 linhas
- `assets/css/components/shell/app-header.css` — 583 `!important`, 1137 linhas
- `assets/css/components/shell/doke-shell-contract.css` — 2545 `!important`, 5924 linhas
- `assets/css/components/shell/ipad-safari-scroll.css` — 65 `!important`, 132 linhas
- `assets/css/components/shell/mobile-app-shell.css` — 406 `!important`, 1014 linhas
- `assets/css/components/shell/mobile-base-stability.css` — 40 `!important`, 152 linhas
- `assets/css/components/shell/page-container-contract.css` — 11 `!important`, 132 linhas
- `assets/css/components/shell/responsive-boundary.css` — 15 `!important`, 109 linhas
- `assets/css/components/shell/tablet-internal-rail-contract.css` — 428 `!important`, 722 linhas
- `assets/css/pages/app-shell-polish.css` — 32 `!important`, 389 linhas
- `assets/css/pages/home/chrome.css` — 317 `!important`, 1530 linhas
- `assets/css/pages/home/footer.css` — 7 `!important`, 177 linhas
- `assets/css/pages/home/sections.css` — 290 `!important`, 1166 linhas
- `assets/css/pages/perfil/mobile-public-profile.css` — 771 `!important`, 3274 linhas
- `assets/css/pages/perfil-budget-modal/select-layering.css` — 31 `!important`, 259 linhas
- `assets/css/pages/search-results/mobile-card-contract.css` — 1 `!important`, 18 linhas
- `assets/css/pages/search-results/mobile-density.css` — 25 `!important`, 107 linhas
- `assets/css/pages/search-results/mobile-layout-contract.css` — 51 `!important`, 312 linhas
- `assets/css/pages/shell-normalize.css` — 80 `!important`, 444 linhas
- `assets/css/patterns/community-room-layout.css` — 13 `!important`, 521 linhas
- `assets/css/patterns/marketplace-responsive-stack.css` — 904 `!important`, 2721 linhas
