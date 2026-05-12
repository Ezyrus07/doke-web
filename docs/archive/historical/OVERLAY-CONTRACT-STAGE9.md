# Etapa 9 — Overlay Contract

## Objetivo
Padronizar a geometria, backdrop, scroll interno, ações, botões de fechar e comportamento responsivo de elementos que aparecem por cima da interface.

## Arquivo criado

```txt
assets/css/components/overlays/overlay-contract-stage9.css
```

## Escopo coberto

- `.ui-modal`
- `dialog.detail-budget-modal`
- `dialog.address-modal`
- `.profile-edit-modal`
- `.profile-followers-modal`
- `.wallet-modal`
- `.media-lightbox`
- `.before-after-preview`
- `.worker-preview`
- `.profile-dropdown`
- `.orders-filters-popover`
- `.orders-filters-panel`
- `.home-mobile-drawer`

## Decisões técnicas

1. O contrato foi carregado por último nos HTMLs principais para neutralizar variações antigas sem alterar JavaScript.
2. Modais e dialogs passam a respeitar largura máxima, safe area, scroll interno e altura máxima de viewport.
3. No mobile, overlays de formulário viram superfícies próximas de bottom-sheet; overlays de mídia ocupam tela cheia.
4. Botões de fechar passam a ter alvo mínimo de 44px.
5. Dropdowns e popovers recebem sombra, borda, raio e camada consistentes.
6. Drawer mobile recebe painel lateral com largura e scroll controlados.

## O que não foi feito nesta etapa

- Não foi alterado JavaScript.
- Não foi removido CSS legado ainda.
- Não foram redesenhados fluxos específicos de orçamento, comunidade ou publicação.

## Próxima etapa recomendada

Etapa 10 — Button/Form Action Contract: consolidar botões, inputs, selects, textareas, chips e badges em um único padrão reutilizável.
