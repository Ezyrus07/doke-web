# Doke CSS Cleanup — Patch v7

## Status do site após esta etapa

- Organização estrutural: 68 / 100
- Risco de regressão visual: médio-baixo
- Risco de CSS duplicado/morto: médio
- Risco de acoplamento entre páginas: médio-baixo

## Correção de transição em pedidos.html

Problema observado: ao entrar em `pedidos.html`, os painéis laterais/modalizados de detalhes e chat podiam aparecer por milésimos de segundo antes da hidratação do JavaScript.

Causa provável: regras autorais como `.orders-sidepanel { display: grid; }` podiam vencer o comportamento esperado de elementos com atributo `hidden` durante o primeiro paint.

Correção aplicada em `assets/css/pages/pedidos.css`:

- adicionada uma trava anti-flash para `[hidden]`;
- protegidos `orders-sidepanel`, `orders-panel-scrim`, empty state, controles de header, popovers e select panels;
- uso de `display: none !important`, `visibility: hidden`, `opacity: 0` e `pointer-events: none`.

## Refatoração de perfil.css

O arquivo `perfil.css` estava misturando duas responsabilidades grandes:

1. layout e componentes da página de perfil;
2. fluxo do modal de orçamento/cotação.

Nesta etapa, o bloco de regras do modal de orçamento foi movido para:

`assets/css/pages/perfil-budget-modal.css`

## Redução

- `perfil.css`: ~147.2 KB -> ~98.3 KB
- `perfil-budget-modal.css`: ~1.5 KB -> ~50.7 KB

A redução não é uma exclusão cega: as regras foram movidas para o arquivo semanticamente correto.

## Próximo alvo recomendado

Continuar em `perfil.css`, separando blocos de:

- publicações / mídia;
- reviews;
- cards de Antes x Depois / Workers;
- responsividade específica do perfil.

Depois disso, o próximo arquivo grande deve ser `home-refresh.css`.
