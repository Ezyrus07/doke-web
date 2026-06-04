# Doke CSS Architecture Status

## Current score

```txt
Organization: 95 / 100
Regression risk: low-medium
CSS duplication/dead-code risk: low-medium
Cross-page coupling risk: low
```

## Current state

The project has moved from monolithic page CSS and cross-page dependencies toward a modular structure with clearer ownership:

- `core/` owns tokens, layout, UI primitives and mobile foundations.
- `components/` owns reusable surfaces, cards, media/lightbox and internal shared components.
- `pages/` owns page-specific layout and feature flows.
- Large CSS files such as profile, home overlays, home refresh, search results, community, configuration, messages and notifications have been split into responsibility-based modules.

## Latest change: v22

Added a final shared modal alignment layer:

```txt
assets/css/components/ui-surface/modal-alignment.css
```

This layer fixes the address modal clipping and standardizes the alignment behavior of the main surfaces that open above the page.

## Remaining recommendation

Do not continue broad CSS refactoring without visual regression testing. Future work should be specific:

- validate desktop/mobile modals;
- remove aliases/bridges only after testing;
- avoid creating new page-local modal/card/button patterns;
- keep shared surface fixes inside `components/ui-surface/`.


## v23 — Modal density pass

A camada `assets/css/components/ui-surface/modal-alignment.css` agora também corrige densidade e scroll dos modais desktop. O objetivo é manter o contrato global de surface sem gerar scroll quando o conteúdo cabe naturalmente.


## v24
- Ajuste de fit desktop para modais de endereço e comunidade.


## v25
- Ajuste UX dos popovers da home: autocomplete full-width e filtros em popover compacto.


## v26
- UX: filtros da home redirecionam para resultados com painel aberto.
- Component: contraste do coração dos cards de anúncio ajustado no contrato de service-card.
- Pedidos: respiro vertical do bloco de agenda isolado em `assets/css/pages/pedidos/agenda-spacing.css`.
