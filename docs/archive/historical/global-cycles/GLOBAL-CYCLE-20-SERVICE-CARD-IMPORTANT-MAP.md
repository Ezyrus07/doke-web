# Ciclo Global 20 — Mapa dos `!important` restantes no service-card

Este ciclo não removeu CSS. O objetivo foi mapear os próximos riscos antes de mexer novamente no card de serviço.

## Resultado

- Arquivo auditado: `assets/css/components/cards/service-card.css`
- `!important` restantes: **47**

## Distribuição por bucket

- unclassified: 3
- avatar-lock: 8
- layout-grid: 4
- media-sizing: 23
- body-footer-rhythm: 9

## Distribuição por risco

- medium: 11
- high: 27
- medium-high: 9

## Decisão técnica

Não é seguro remover em massa os próximos `!important` do `service-card.css` sem validação visual. A maior parte restante protege:

- travas de avatar;
- altura/largura da mídia;
- grid desktop/mobile;
- ritmo do body/footer.

## Próximo passo recomendado

1. Migrar sizing de avatar para o contrato global `.doke-avatar`, ou validar que `avatar.css` legado não compete mais.
2. Depois, remover um pequeno grupo de `!important` de micro-layout com screenshot antes/depois.
3. Não mexer ainda nos grids desktop/mobile do service-card sem validação de `index`, `resultados` e `perfil`.

## Itens mapeados

| Linha | Propriedade | Bucket | Risco | Seletor |
|---:|---|---|---|---|
| 543 | `overflow` | unclassified | medium | `:is(.service-card, .service-card--feed, .service-card--result)` |
| 547 | `width` | avatar-lock | medium | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__avatar` |
| 548 | `height` | avatar-lock | medium | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__avatar` |
| 549 | `min-width` | avatar-lock | medium | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__avatar` |
| 550 | `min-height` | avatar-lock | medium | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__avatar` |
| 551 | `max-width` | avatar-lock | medium | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__avatar` |
| 552 | `max-height` | avatar-lock | medium | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__avatar` |
| 553 | `border-radius` | avatar-lock | medium | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__avatar` |
| 554 | `clip-path` | avatar-lock | medium | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__avatar` |
| 575 | `display` | unclassified | medium | `:is(.service-card, .service-card--feed, .service-card--result)` |
| 576 | `grid-template-rows` | layout-grid | high | `:is(.service-card, .service-card--feed, .service-card--result)` |
| 577 | `min-height` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result)` |
| 578 | `height` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result)` |
| 579 | `border-radius` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result)` |
| 583 | `min-height` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 584 | `width` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 585 | `height` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 586 | `padding` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 587 | `border-radius` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 588 | `background-size` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 589 | `background-position` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 593 | `min-height` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 594 | `height` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 595 | `grid-template-columns` | layout-grid | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 599 | `unknown` | body-footer-rhythm | medium-high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 600 | `align-content` | body-footer-rhythm | medium-high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 601 | `gap` | body-footer-rhythm | medium-high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 602 | `padding` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 609 | `margin` | body-footer-rhythm | medium-high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__footer` |
| 613 | `min-height` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__footer` |
| 614 | `padding-top` | body-footer-rhythm | medium-high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__footer` |
| 615 | `align-items` | body-footer-rhythm | medium-high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__footer` |
| 621 | `display` | unclassified | medium | `:is(.service-card, .service-card--feed, .service-card--result)` |
| 622 | `grid-template-columns` | layout-grid | high | `:is(.service-card, .service-card--feed, .service-card--result)` |
| 623 | `min-height` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result)` |
| 624 | `border-radius` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result)` |
| 628 | `min-height` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 629 | `height` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 630 | `padding` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 631 | `border-radius` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 632 | `background-size` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 633 | `background-position` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__media` |
| 637 | `grid-template-columns` | layout-grid | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 642 | `unknown` | body-footer-rhythm | medium-high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 643 | `align-content` | body-footer-rhythm | medium-high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 644 | `gap` | body-footer-rhythm | medium-high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
| 645 | `padding` | media-sizing | high | `:is(.service-card, .service-card--feed, .service-card--result) .service-card__body` |
