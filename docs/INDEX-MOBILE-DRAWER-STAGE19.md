# Stage 19 — Drawer mobile padrão

Padroniza o drawer mobile do Stage 18 em todos os HTMLs principais sem alterar desktop.

## Arquivos criados
- `assets/css/components/navigation/mobile-drawer-standard-stage19.css`
- `assets/js/ui/mobile-drawer-standard-stage19.js`

## Decisão técnica
O Stage 18 estava visualmente correto, mas preso ao `body.home-index-shell`. O Stage 19 remove essa dependência, mantém o escopo em mobile/tablet e adiciona um runtime resiliente que injeta/normaliza o drawer quando uma página ainda não possui markup próprio.

## Garantias
- Não altera desktop.
- Não mexe em cards, topbars, grids ou formulários.
- Sincroniza o item ativo pela rota atual.
- Suporta triggers existentes: `data-mobile-home-menu-open`, `data-sidebar-open`, `.mobile-toggle` e botões de perfil mobile.
