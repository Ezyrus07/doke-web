# Mapa de autoridade CSS

Este documento define onde cada responsabilidade deve viver. Ele substitui decisões espalhadas em documentos de fase quando houver conflito.

## Core

Responsável por:

- tokens;
- reset;
- tipografia;
- layout base;
- utilitários genéricos.

Não deve conter regras específicas de `index`, `perfil`, `mensagens`, `pedidos` ou cards específicos.

## Shell / rail / header

Responsável por:

- `.app-shell`, `.sidebar`, `.page`, `.page__content`;
- largura compartilhada;
- alinhamento entre header e conteúdo;
- scroll global;
- mobile shell e topbar.

Variáveis preferenciais:

```txt
--doke-shared-page-width
--doke-desktop-page-available
--doke-current-page-rail
--doke-desktop-page-max
```

## Components

Responsável por anatomia e estados internos de:

- cards;
- botões;
- inputs;
- modais;
- dropdowns;
- tabs;
- avatars.

Exemplo: `marketplace-card-contract.css` controla a anatomia do card; a página apenas define contexto/tokens.

## Patterns

Responsável por composições reutilizáveis:

- horizontal rails;
- feeds;
- listas;
- seções reutilizáveis.

## Pages

Responsável por:

- ordem das seções;
- espaçamento específico;
- quantidade visível por rail;
- contexto mobile/tablet/desktop da página;
- exceções escopadas por `body[data-page="..."]` quando necessárias.

## Regra para `!important`

`!important` é dívida técnica tolerada apenas onde já existe conflito legado. Novos usos exigem justificativa explícita e plano de remoção.

## Phase 31 — notifications important cleanup

`assets/css/pages/notificacoes` now keeps only the `[hidden]` state guard as an intentional `!important`. The previous mobile/header/selection display overrides were reduced to normal cascade rules after the mobile scope fixes. Future notification changes must not reintroduce `!important` for spacing, color, typography, borders, or normal display states.

## Reforma responsiva — primeira autoridade a consolidar

Para mudanças de responsividade global, a primeira consolidação deve começar pelo eixo compartilhado entre header e conteúdo, não por cards. A autoridade primária é shell/rail/header, com prioridade para:

```txt
assets/css/components/shell/desktop-page-rail-authority.css
assets/css/components/shell/shared-page-width-contract.css
assets/css/components/shell/app-header-canonical-contract.css
```

CSS de páginas (`assets/css/pages/`) não deve redefinir largura de `.app-header__inner`, `.page__content-inner`, `.app-shell`, `.sidebar` ou wrappers globais. Se uma página precisar de exceção temporária, a exceção deve ser escopada por `body[data-page="..."]` e documentada perto da regra.

## Reforma responsiva — Stage 02

`desktop-page-rail-authority.css` agora também faz a ponte dos aliases antigos de largura (`--doke-app-shell-max`, `--doke-internal-page-rail`, `--doke-shared-internal-rail`) para o rail canônico atual. Isso reduz concorrência entre `app-header.css`, `doke-shell-contract.css` e o contrato de rail sem introduzir nova camada de override nem alterar anatomia de componentes.

## Reforma responsiva — Stage 03

`app-header.css`, `app-header-canonical-contract.css` and the final internal rail block in `doke-shell-contract.css` now consume `--doke-header-rail`, `--doke-current-page-rail` and `--doke-page-rail` before falling back to legacy width calculations. This removes another duplicate width source between header and content without changing card anatomy, sidebar geometry, router behavior or page-specific layout.
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


## Stage 08 note

The active cross-page responsive composition file `assets/css/components/layout/responsive-page-contract.css` no longer owns an independent desktop width formula for internal workspaces/header inner. It now delegates to the canonical rail tokens first and preserves the old calculation only as fallback.


## Stage 09 — Header rail alignment consumes canonical rail

`assets/css/components/shell/header-rail-alignment-contract.css` still had active high-specificity header rules with hard-coded desktop formulas such as `min(calc(100vw - 280px), 1000px)`. Stage 09 keeps those formulas only as fallback and makes the outer header rail consume `--doke-header-rail`, `--doke-current-page-rail` and `--doke-page-rail` first. Header inner rules now resolve through the same canonical page rail before falling back to the older shared width calculation. No new selectors, files, `!important`, card anatomy, JS or HTML changes were introduced.
