# CSS Cleanup Stage 40 — notificacoes.html

## Objetivo

Remover a página `notificacoes.html` da dependência direta de contratos antigos de shell/header/rail/responsivo e deixar a cascata ativa sem `!important`.

## Arquivos alterados

- `notificacoes.html`

## Ação executada

Foram removidos links diretos para contratos antigos como `doke-shell-contract.css`, `app-header.css`, `app-header-canonical-contract.css`, `responsive-page-contract.css`, `responsive-priority-contract.css`, `responsive-priority-cards.css`, `desktop-shell.css`, `desktop-sidebar.css`, `desktop-topbar.css`, `mobile-app-shell.css`, `tablet-internal-rail-contract.css`, `ipad-safari-scroll.css`, `doke-domain-cards.css`, `doke-layout-system.css`, `mobile-base-stability.css`, `page-container-contract.css` e afins.

A página passa a usar `assets/css/layout/header.css` como contrato limpo de header/layout, mantendo os CSS específicos de notificações e superfícies internas.

## Resultado medido

- CSS direto em `notificacoes.html`: 50 -> 25
- CSS transitivo ativo em `notificacoes.html`: 107 -> 86
- `!important` ativo na cascata de `notificacoes.html`: 5730 -> 0
- `!important` total em `assets/css`: 11468
- CSS com chaves desbalanceadas: 0

## Risco

Alto risco visual em `notificacoes.html`, especialmente header interno, filtros, cards/lista, estados de ação e responsivo mobile/tablet. O objetivo desta etapa é saneamento estrutural, não acabamento visual.
