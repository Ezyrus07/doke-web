# Contrato global de layout

Este contrato protege shell, sidebar, header, rail, largura e scroll. Essas áreas são sensíveis porque afetam várias páginas ao mesmo tempo.

## Autoridades

### Shell global

Responsável por:

- `.app-shell`
- `.sidebar`
- `.page`
- `.page__content`
- estrutura desktop/tablet/mobile compartilhada
- comportamento de scroll global

Arquivos típicos:

```txt
assets/css/components/shell/
assets/css/pages/app-shell.css
assets/js/core/stable-shell-router.js
```

### Header/topbar

Responsável por:

- alinhamento entre header e conteúdo;
- altura e respiro do topo;
- ações globais;
- search/header quando compartilhados.

Não resolver problema de uma página alterando header global sem provar impacto em todas as páginas principais.

### Rail/conteúdo

Variáveis preferenciais:

```txt
--doke-shared-page-width
--doke-desktop-page-available
--doke-current-page-rail
--doke-desktop-page-max
```

Não criar nova variável de largura se uma dessas resolve.

## Proibições

- Não duplicar contrato de largura em CSS de página.
- Não corrigir scroll com JS quando a causa é CSS.
- Não alterar shell para resolver card local.
- Não substituir `body` inteiro no roteador.
- Não usar reload completo para esconder bug de navegação interna.

## Critério de aceite

Toda alteração nessa área exige teste em:

```txt
index.html
perfil.html
pedidos.html
mensagens.html
notificacoes.html
comunidade.html
resultados.html
detalhe-anuncio.html
ajuda.html
```

Viewports mínimos:

```txt
1366x768
820x1180
390x844
```

## Reforma responsiva controlada

A primeira responsabilidade antes de consolidar largura/header/rail é manter o gate de validação alinhado ao protocolo ativo. Nenhuma consolidação global de `.app-shell`, `.page`, `.page__content`, `.page__content-inner`, `.app-header` ou `.app-header__inner` deve avançar sem validar os viewports 1366x768, 1280x802, 820x1180, 608x926 e 390x844 nas páginas prioritárias.

Autoridade primária para largura/eixo das páginas internas:

```txt
assets/css/components/shell/desktop-page-rail-authority.css
assets/css/components/shell/shared-page-width-contract.css
assets/css/components/shell/app-header-canonical-contract.css
```

Arquivos de página só podem consumir esse contrato ou fazer exceções escopadas por `body[data-page="..."]`, sem redefinir anatomia de cards, header global ou sidebar.

## Responsive reform Stage 02 — rail alias bridge

`assets/css/components/shell/desktop-page-rail-authority.css` is the active authority for internal desktop/tablet page rails. Stage 02 keeps older shell/header aliases (`--doke-app-shell-max`, `--doke-internal-page-rail`, `--doke-shared-internal-rail`) pointed at the canonical rail tokens instead of letting those older variables keep an independent width contract.

This does not change card anatomy, sidebar visuals, router behavior, or page-specific composition. It only makes existing consumers resolve to the same page rail.

## Responsive reform Stage 03 — header/content rail consumption

`assets/css/components/shell/app-header.css`, `assets/css/components/shell/app-header-canonical-contract.css` and `assets/css/components/shell/doke-shell-contract.css` must consume the canonical rail tokens instead of recalculating their own independent header/content width.

The canonical source remains:

```txt
--doke-header-rail
--doke-current-page-rail
--doke-page-rail
```

Older local formulas are kept only as fallbacks for pages that have not fully loaded the shared rail contract yet. The header outer element owns vertical flow; `.app-header__inner` owns horizontal alignment and must resolve to the same rail used by `.page__content-inner`.
## Responsive reform notes

### Stage 04 — tablet portrait header rail

- `assets/css/components/shell/tablet-internal-rail-contract.css` no longer defines the 768–899px portrait header rail with an isolated hard-coded calculation.
- The tablet internal header now consumes `--doke-current-page-rail` / `--doke-page-rail` and keeps the old `min(calc(100vw - 48px), 760px)` only as fallback.
- Authority remains split correctly: `desktop-page-rail-authority.css` defines the rail tokens; `tablet-internal-rail-contract.css` composes tablet header behavior from those tokens.
### Stage 05 — tablet rail aliases consume the canonical page rail

`assets/css/components/shell/doke-shell-contract.css` still contained several tablet-only `--doke-tablet-rail` definitions with local calculations. Those definitions now consume `--doke-current-page-rail` / `--doke-page-rail` first and keep the old calculation only as fallback. This reduces tablet rail/header/content divergence without changing card anatomy or page-specific composition.
### Stage 06 — large-mobile internal rail fallback

`assets/css/components/shell/tablet-internal-rail-contract.css` still had a 561–760px internal-page rail formula that could bypass the shared page width token. That block now consumes `--doke-shared-page-width` first and keeps the old `min(calc(100vw - gutter), max)` formula only as fallback. This keeps large mobile/compact tablet internal pages aligned with the canonical page rail without changing card anatomy, header markup, sidebar behavior or page-specific layouts.


### Stage 07 — default page containers consume canonical rail

`assets/css/components/shell/page-container-contract.css` no longer lets the default `--doke-page-max-default` container width stand as an independent `1220px` contract when a canonical page rail is already available. The default page/container helper now resolves through `--doke-current-page-rail` / `--doke-page-rail` first and keeps the old shell default only as fallback. Width variants such as `narrow`, `wide` and `fluid` remain explicit opt-ins.


## Stage 08 — Active responsive-page contract consumes canonical rail

`assets/css/components/layout/responsive-page-contract.css` still contained active desktop formulas for `.page__content-inner` and `.app-header__inner` based directly on `--doke-app-shell-gutter` / `--doke-app-shell-max`. Stage 08 keeps those formulas only as fallback and makes the active contract consume `--doke-current-page-rail` and `--doke-page-rail` first, so header and content converge to the same rail authority.


## Stage 09 — Header rail alignment consumes canonical rail

`assets/css/components/shell/header-rail-alignment-contract.css` still had active high-specificity header rules with hard-coded desktop formulas such as `min(calc(100vw - 280px), 1000px)`. Stage 09 keeps those formulas only as fallback and makes the outer header rail consume `--doke-header-rail`, `--doke-current-page-rail` and `--doke-page-rail` first. Header inner rules now resolve through the same canonical page rail before falling back to the older shared width calculation. No new selectors, files, `!important`, card anatomy, JS or HTML changes were introduced.
