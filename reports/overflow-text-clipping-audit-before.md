# Auditoria de overflow/text clipping — before

Total de ocorrências: **316**

## Por tipo

| Tipo | Ocorrências |
|---|---:|
| element-horizontal-overflow | 162 |
| button-label-wrap | 65 |
| badge-or-action-clipped | 48 |
| card-content-leak | 27 |
| text-or-content-clipping | 13 |
| body-horizontal-overflow | 1 |

## Por página

| Página | Ocorrências |
|---|---:|
| index.html | 190 |
| detalhe-anuncio.html | 62 |
| perfil.html | 15 |
| pedidos.html | 14 |
| comunidade.html | 13 |
| mensagens.html | 12 |
| notificacoes.html | 8 |
| resultados.html | 2 |

## Ocorrências

| Página | Breakpoint | Tipo | Seletor | Propriedade | Esperado | Atual | Diferença | CSS provável |
|---|---|---|---|---|---|---|---:|---|
| index.html | 390x844 | text-or-content-clipping | `form.home-search-hero__form.home-search-hero__form--restored.doke-search-pill` | scrollHeight | <= 60 | 146 | 88 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card.doke-ad-card--featured` | scrollWidth | <= 108 | 113 | 7 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 108 | 113 | 7 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__footer` | scrollWidth | <= 76 | 97 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card.doke-ad-card--featured` | scrollWidth | <= 108 | 110 | 4 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 108 | 110 | 4 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__footer` | scrollWidth | <= 76 | 94 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 27 | 45 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card.doke-ad-card--featured` | scrollWidth | <= 108 | 113 | 7 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 108 | 113 | 7 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__footer` | scrollWidth | <= 76 | 97 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.publication-card.publication-card--photo.doke-card` | scrollWidth | <= 354 | 372 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.publication-card.publication-card--video.doke-card` | scrollWidth | <= 354 | 372 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.publication-card.publication-card--before-after.doke-card` | scrollWidth | <= 354 | 372 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 107 | 92 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--handyman` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.34px | 28.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.34px | 46.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 107 | 75 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 106 | 91 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--tech` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.34px | 28.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.34px | 46.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 106 | 74 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 121 | 106 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--class` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.34px | 28.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.34px | 46.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 121 | 89 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 106 | 91 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--beauty` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.34px | 28.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.34px | 46.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 106 | 74 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 107 | 92 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--gardening` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 107 | 75 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 110 | 95 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--plumber` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 110 | 78 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 115 | 100 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--photo` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 115 | 83 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 107 | 92 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--pet` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 107 | 75 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 113 | 98 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--ac` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 113 | 81 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 166 | 151 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--carpentry` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 166 | 134 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 115 | 100 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--deep-cleaning` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 115 | 83 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 107 | 92 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--delivery` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 107 | 75 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 390x844 | card-content-leak | `div.publication-card__media.publication-card__media--kitchen` | bounds | filho dentro do card | vazamento 9px | 9 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.publication-card__media.publication-card__media--living` | bounds | filho dentro do card | vazamento 9px | 9 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.publication-card__media.publication-card__comparison` | bounds | filho dentro do card | vazamento 9px | 9 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.34px | 16.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.34px | 16.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.34px | 16.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.34px | 16.34 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css |
| detalhe-anuncio.html | 390x844 | element-horizontal-overflow | `div.detail-related-grid.detail-related-grid--ads.service-grid.service-grid--compact` | scrollWidth | <= 356 | 544 | 190 | não identificado |
| detalhe-anuncio.html | 390x844 | text-or-content-clipping | `div.doke-ad-card__tags` | scrollHeight | <= 30 | 50 | 22 | não identificado |
| detalhe-anuncio.html | 390x844 | text-or-content-clipping | `div.doke-ad-card__tags` | scrollHeight | <= 30 | 50 | 22 | não identificado |
| detalhe-anuncio.html | 390x844 | text-or-content-clipping | `div.doke-ad-card__tags` | scrollHeight | <= 30 | 50 | 22 | não identificado |
| index.html | 608x926 | body-horizontal-overflow | `html.` | scrollWidth | <= 610 | 626 | 18 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 107 | 99 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--handyman` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.59px | 34.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.59px | 52.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 107 | 75 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 106 | 98 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--tech` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.59px | 34.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.59px | 52.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 106 | 74 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 121 | 113 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--class` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.59px | 34.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.59px | 52.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 121 | 89 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 106 | 98 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--beauty` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.59px | 34.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.59px | 52.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 106 | 74 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 107 | 99 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--gardening` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 107 | 75 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 110 | 102 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--plumber` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 110 | 78 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 115 | 107 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--photo` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 115 | 83 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 107 | 99 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--pet` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 107 | 75 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 113 | 105 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--ac` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 113 | 81 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 166 | 158 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--carpentry` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 166 | 134 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 115 | 107 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--deep-cleaning` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 115 | 83 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 107 | 99 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--delivery` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 107 | 75 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `a.doke-ad-card__cta` | scrollWidth | <= 22 | 43 | 23 | não identificado |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.59px | 22.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.59px | 22.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.59px | 22.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.59px | 22.59 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css |
| detalhe-anuncio.html | 608x926 | element-horizontal-overflow | `div.ad-gallery__stage` | scrollWidth | <= 572 | 573 | 3 | não identificado |
| detalhe-anuncio.html | 608x926 | button-label-wrap | `div.doke-reviews-filter-row` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| detalhe-anuncio.html | 608x926 | element-horizontal-overflow | `div.detail-related-grid.detail-related-grid--ads.service-grid.service-grid--compact` | scrollWidth | <= 574 | 868 | 296 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `header.app-header.app-header--detail.home-side-meta` | scrollWidth | <= 532 | 786 | 256 | não identificado |
| detalhe-anuncio.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 810x1080 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.ad-gallery__stage` | scrollWidth | <= 481 | 482 | 3 | não identificado |
| detalhe-anuncio.html | 810x1080 | text-or-content-clipping | `div.ad-gallery__stage` | scrollHeight | <= 472 | 512 | 42 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-reviews-metrics` | scrollWidth | <= 437 | 443 | 8 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `span.doke-review-metric__copy` | scrollWidth | <= 74 | 79 | 7 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-review-metric` | scrollWidth | <= 146 | 152 | 8 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `span.doke-review-metric__copy` | scrollWidth | <= 60 | 79 | 21 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-review-metric` | scrollWidth | <= 146 | 153 | 9 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `span.doke-review-metric__copy` | scrollWidth | <= 60 | 80 | 22 | não identificado |
| detalhe-anuncio.html | 810x1080 | button-label-wrap | `div.doke-reviews-filter-row` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 810x1080 | button-label-wrap | `div.doke-reviews-filters` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `article.doke-ad-card.doke-ad-card--similar` | scrollWidth | <= 222 | 240 | 20 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 222 | 240 | 20 | não identificado |
| detalhe-anuncio.html | 810x1080 | text-or-content-clipping | `div.doke-ad-card__tags` | scrollHeight | <= 30 | 56 | 28 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--carlos` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-ad-card__footer` | scrollWidth | <= 182 | 220 | 40 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `article.doke-ad-card.doke-ad-card--similar` | scrollWidth | <= 222 | 237 | 17 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 222 | 237 | 17 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--elaine` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-ad-card__footer` | scrollWidth | <= 182 | 217 | 37 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `article.doke-ad-card.doke-ad-card--similar` | scrollWidth | <= 222 | 240 | 20 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 222 | 240 | 20 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--marcos` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-ad-card__footer` | scrollWidth | <= 182 | 220 | 40 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `article.doke-ad-card.doke-ad-card--similar` | scrollWidth | <= 222 | 240 | 20 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 222 | 240 | 20 | não identificado |
| detalhe-anuncio.html | 810x1080 | text-or-content-clipping | `div.doke-ad-card__tags` | scrollHeight | <= 30 | 56 | 28 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--carlos` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `div.doke-ad-card__footer` | scrollWidth | <= 182 | 220 | 40 | não identificado |
| perfil.html | 810x1080 | button-label-wrap | `header.app-header.app-header--profile.home-side-meta` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 810x1080 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 810x1080 | element-horizontal-overflow | `span.home-side-meta__identity` | scrollWidth | <= 65 | 66 | 3 | não identificado |
| pedidos.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| pedidos.html | 810x1080 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| pedidos.html | 810x1080 | element-horizontal-overflow | `span.home-side-meta__identity` | scrollWidth | <= 65 | 66 | 3 | não identificado |
| mensagens.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 810x1080 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 810x1080 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 810x1080 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 810x1080 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 810x1080 | element-horizontal-overflow | `span.home-side-meta__identity` | scrollWidth | <= 65 | 66 | 3 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| comunidade.html | 810x1080 | element-horizontal-overflow | `span.home-side-meta__identity` | scrollWidth | <= 65 | 66 | 3 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.community-card-v2__button.doke-btn.doke-btn--primary.community-card-v2__button--green` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.community-card-v2__button.doke-btn.community-card-v2__button--blue` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.community-card-v2__button.community-card-v2__button--orange.doke-btn` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.doke-btn.communities-empty-v2__button` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.doke-btn.communities-empty-v2__button.communities-empty-v2__button--create` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| detalhe-anuncio.html | 1024x768 | element-horizontal-overflow | `header.app-header.app-header--detail.home-side-meta` | scrollWidth | <= 746 | 786 | 42 | não identificado |
| detalhe-anuncio.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1024x768 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1024x768 | element-horizontal-overflow | `div.ad-gallery__stage` | scrollWidth | <= 683 | 684 | 3 | não identificado |
| detalhe-anuncio.html | 1024x768 | text-or-content-clipping | `div.ad-gallery__stage` | scrollHeight | <= 502 | 542 | 42 | não identificado |
| detalhe-anuncio.html | 1024x768 | button-label-wrap | `div.doke-reviews-filter-row` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1024x768 | button-label-wrap | `div.doke-reviews-filters` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| detalhe-anuncio.html | 1024x768 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--carlos` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| detalhe-anuncio.html | 1024x768 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--elaine` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| detalhe-anuncio.html | 1024x768 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--marcos` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| detalhe-anuncio.html | 1024x768 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--carlos` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| perfil.html | 1024x768 | button-label-wrap | `header.app-header.app-header--profile.home-side-meta` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 1024x768 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 1024x768 | element-horizontal-overflow | `span.home-side-meta__identity` | scrollWidth | <= 65 | 66 | 3 | não identificado |
| perfil.html | 1024x768 | element-horizontal-overflow | `div.worker-preview__stage` | scrollWidth | <= 1002 | 1024 | 24 | não identificado |
| perfil.html | 1024x768 | text-or-content-clipping | `div.worker-preview__stage` | scrollHeight | <= 746 | 768 | 24 | não identificado |
| resultados.html | 1024x768 | text-or-content-clipping | `div.worker-preview__stage` | scrollHeight | <= 738 | 768 | 32 | não identificado |
| pedidos.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| pedidos.html | 1024x768 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| pedidos.html | 1024x768 | element-horizontal-overflow | `span.home-side-meta__identity` | scrollWidth | <= 65 | 66 | 3 | não identificado |
| mensagens.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 1024x768 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 1024x768 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 1024x768 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 1024x768 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 1024x768 | element-horizontal-overflow | `span.home-side-meta__identity` | scrollWidth | <= 65 | 66 | 3 | não identificado |
| comunidade.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| comunidade.html | 1024x768 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| comunidade.html | 1024x768 | element-horizontal-overflow | `span.home-side-meta__identity` | scrollWidth | <= 65 | 66 | 3 | não identificado |
| index.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| index.html | 1280x800 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1280x800 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `span.home-side-meta__identity` | scrollWidth | <= 65 | 66 | 3 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `div.ad-gallery__stage` | scrollWidth | <= 776 | 778 | 4 | não identificado |
| detalhe-anuncio.html | 1280x800 | text-or-content-clipping | `div.ad-gallery__stage` | scrollHeight | <= 437 | 477 | 42 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `span.doke-review-metric__copy` | scrollWidth | <= 68 | 79 | 13 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `span.doke-review-metric__copy` | scrollWidth | <= 68 | 80 | 14 | não identificado |
| detalhe-anuncio.html | 1280x800 | button-label-wrap | `div.doke-reviews-filter-row` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1280x800 | button-label-wrap | `div.doke-reviews-filters` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--carlos` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--elaine` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--marcos` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `span.doke-ad-card__avatar.doke-ad-card__avatar--carlos` | scrollWidth | <= 22 | 27 | 7 | não identificado |
| perfil.html | 1280x800 | button-label-wrap | `header.app-header.app-header--profile.home-side-meta` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 1280x800 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 1280x800 | element-horizontal-overflow | `div.worker-preview__stage` | scrollWidth | <= 1258 | 1280 | 24 | não identificado |
| perfil.html | 1280x800 | text-or-content-clipping | `div.worker-preview__stage` | scrollHeight | <= 778 | 800 | 24 | não identificado |
| resultados.html | 1280x800 | text-or-content-clipping | `div.worker-preview__stage` | scrollHeight | <= 770 | 800 | 32 | não identificado |
| pedidos.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| pedidos.html | 1280x800 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| pedidos.html | 1280x800 | button-label-wrap | `button.order-card__button.order-card__button--primary.doke-btn.doke-btn--primary` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| pedidos.html | 1280x800 | button-label-wrap | `button.order-card__button.order-card__button--secondary.doke-btn.doke-btn--ghost` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| pedidos.html | 1280x800 | button-label-wrap | `button.order-card__button.order-card__button--primary.doke-btn.doke-btn--primary` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| pedidos.html | 1280x800 | button-label-wrap | `button.order-card__button.order-card__button--secondary.doke-btn.doke-btn--ghost` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| pedidos.html | 1280x800 | button-label-wrap | `button.order-card__button.order-card__button--primary.doke-btn.doke-btn--primary` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| pedidos.html | 1280x800 | button-label-wrap | `button.order-card__button.order-card__button--secondary.doke-btn.doke-btn--ghost` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| mensagens.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 1280x800 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 1280x800 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 1280x800 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 1280x800 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| comunidade.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| comunidade.html | 1280x800 | button-label-wrap | `button.home-side-meta__profile` | line-count | 1 linha | 3 linhas | 2 | não identificado |