# Auditoria de overflow/text clipping — after

Total de ocorrências: **240**

## Por tipo

| Tipo | Ocorrências |
|---|---:|
| element-horizontal-overflow | 114 |
| badge-or-action-clipped | 48 |
| button-label-wrap | 40 |
| card-content-leak | 27 |
| text-or-content-clipping | 10 |
| body-horizontal-overflow | 1 |

## Por página

| Página | Ocorrências |
|---|---:|
| index.html | 157 |
| detalhe-anuncio.html | 36 |
| perfil.html | 13 |
| comunidade.html | 11 |
| mensagens.html | 9 |
| pedidos.html | 6 |
| notificacoes.html | 6 |
| resultados.html | 2 |

## Ocorrências

| Página | Breakpoint | Tipo | Seletor | Propriedade | Esperado | Atual | Diferença | CSS provável |
|---|---|---|---|---|---|---|---:|---|
| index.html | 390x844 | text-or-content-clipping | `form.home-search-hero__form.home-search-hero__form--restored.doke-search-pill` | scrollHeight | <= 60 | 146 | 88 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `strong.doke-ad-card__price` | scrollWidth | <= 28 | 42 | 16 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `strong.doke-ad-card__price` | scrollWidth | <= 28 | 37 | 11 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `strong.doke-ad-card__price` | scrollWidth | <= 28 | 42 | 16 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.publication-card.publication-card--photo.doke-card` | scrollWidth | <= 354 | 372 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.publication-card.publication-card--video.doke-card` | scrollWidth | <= 354 | 372 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.publication-card.publication-card--before-after.doke-card` | scrollWidth | <= 354 | 372 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 53 | 38 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--handyman` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.34px | 28.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.34px | 46.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 53 | 21 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 52 | 37 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--tech` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.34px | 28.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.34px | 46.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 52 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 66 | 51 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--class` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.34px | 28.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.34px | 46.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 66 | 34 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 52 | 37 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--beauty` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.34px | 28.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.34px | 46.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 52 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 52 | 37 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--gardening` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 52 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 55 | 40 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--plumber` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 55 | 23 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 61 | 46 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--photo` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 61 | 29 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 52 | 37 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--pet` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 52 | 20 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 58 | 43 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--ac` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 58 | 26 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 112 | 97 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--carpentry` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 112 | 80 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 61 | 46 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--deep-cleaning` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 61 | 29 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 17 | 53 | 38 | não identificado |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--delivery` | scrollWidth | <= 17 | 44 | 29 | não identificado |
| index.html | 390x844 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 28.33px | 28.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 46.33px | 46.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 53 | 21 | não identificado |
| index.html | 390x844 | card-content-leak | `div.publication-card__media.publication-card__media--kitchen` | bounds | filho dentro do card | vazamento 9px | 9 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.publication-card__media.publication-card__media--living` | bounds | filho dentro do card | vazamento 9px | 9 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.publication-card__media.publication-card__comparison` | bounds | filho dentro do card | vazamento 9px | 9 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.34px | 16.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.34px | 16.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.34px | 16.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.34px | 16.34 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 390x844 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 16.33px | 16.33 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| detalhe-anuncio.html | 390x844 | element-horizontal-overflow | `div.detail-related-grid.detail-related-grid--ads.service-grid.service-grid--compact` | scrollWidth | <= 356 | 868 | 514 | não identificado |
| index.html | 608x926 | body-horizontal-overflow | `html.` | scrollWidth | <= 610 | 626 | 18 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 53 | 45 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--handyman` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.59px | 34.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.59px | 52.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 53 | 21 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 52 | 44 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--tech` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.59px | 34.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.59px | 52.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 52 | 20 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 66 | 58 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--class` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.59px | 34.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.59px | 52.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 66 | 34 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 52 | 44 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--beauty` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.59px | 34.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.59px | 52.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 52 | 20 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 52 | 44 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--gardening` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 52 | 20 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 55 | 47 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--plumber` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 55 | 23 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 61 | 53 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--photo` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 61 | 29 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 52 | 44 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--pet` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 52 | 20 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 58 | 50 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--ac` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 58 | 26 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 112 | 104 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--carpentry` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 112 | 80 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 61 | 53 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--deep-cleaning` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 61 | 29 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `article.doke-ad-card` | scrollWidth | <= 10 | 53 | 45 | não identificado |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__media.doke-ad-card__media--delivery` | scrollWidth | <= 10 | 44 | 36 | não identificado |
| index.html | 608x926 | badge-or-action-clipped | `span.doke-ad-card__badge` | bounds | dentro do card | vazamento 34.58px | 34.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | badge-or-action-clipped | `button.doke-ad-card__favorite` | bounds | dentro do card | vazamento 52.58px | 52.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | element-horizontal-overflow | `div.doke-ad-card__body` | scrollWidth | <= 34 | 53 | 21 | não identificado |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.59px | 22.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.59px | 22.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.59px | 22.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.59px | 22.59 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| index.html | 608x926 | card-content-leak | `div.doke-ad-card__body` | bounds | filho dentro do card | vazamento 22.58px | 22.58 | assets/css/pages/detalhe-anuncio.css; assets/css/components/layout/overflow-text-clipping-contract.css |
| detalhe-anuncio.html | 608x926 | element-horizontal-overflow | `div.ad-gallery__stage` | scrollWidth | <= 572 | 573 | 3 | não identificado |
| detalhe-anuncio.html | 608x926 | button-label-wrap | `div.doke-reviews-filter-row` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| detalhe-anuncio.html | 608x926 | element-horizontal-overflow | `div.detail-related-grid.detail-related-grid--ads.service-grid.service-grid--compact` | scrollWidth | <= 574 | 868 | 296 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `header.app-header.app-header--detail.home-side-meta` | scrollWidth | <= 532 | 786 | 256 | não identificado |
| detalhe-anuncio.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
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
| detalhe-anuncio.html | 810x1080 | text-or-content-clipping | `div.doke-ad-card__tags` | scrollHeight | <= 30 | 56 | 28 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `strong.doke-ad-card__price` | scrollWidth | <= 32 | 70 | 40 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `strong.doke-ad-card__price` | scrollWidth | <= 32 | 67 | 37 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `strong.doke-ad-card__price` | scrollWidth | <= 32 | 70 | 40 | não identificado |
| detalhe-anuncio.html | 810x1080 | text-or-content-clipping | `div.doke-ad-card__tags` | scrollHeight | <= 30 | 56 | 28 | não identificado |
| detalhe-anuncio.html | 810x1080 | element-horizontal-overflow | `strong.doke-ad-card__price` | scrollWidth | <= 32 | 70 | 40 | não identificado |
| perfil.html | 810x1080 | button-label-wrap | `header.app-header.app-header--profile.home-side-meta` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 810x1080 | element-horizontal-overflow | `span.` | scrollWidth | <= 65 | 68 | 5 | não identificado |
| pedidos.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| pedidos.html | 810x1080 | element-horizontal-overflow | `span.` | scrollWidth | <= 65 | 68 | 5 | não identificado |
| mensagens.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 810x1080 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 810x1080 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 810x1080 | element-horizontal-overflow | `span.` | scrollWidth | <= 65 | 68 | 5 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| comunidade.html | 810x1080 | element-horizontal-overflow | `span.` | scrollWidth | <= 65 | 68 | 5 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.community-card-v2__button.doke-btn.doke-btn--primary.community-card-v2__button--green` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.community-card-v2__button.doke-btn.community-card-v2__button--blue` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.community-card-v2__button.community-card-v2__button--orange.doke-btn` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.doke-btn.communities-empty-v2__button` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| comunidade.html | 810x1080 | button-label-wrap | `button.doke-btn.communities-empty-v2__button.communities-empty-v2__button--create` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| detalhe-anuncio.html | 1024x768 | element-horizontal-overflow | `header.app-header.app-header--detail.home-side-meta` | scrollWidth | <= 746 | 786 | 42 | não identificado |
| detalhe-anuncio.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1024x768 | element-horizontal-overflow | `div.ad-gallery__stage` | scrollWidth | <= 683 | 684 | 3 | não identificado |
| detalhe-anuncio.html | 1024x768 | text-or-content-clipping | `div.ad-gallery__stage` | scrollHeight | <= 502 | 542 | 42 | não identificado |
| detalhe-anuncio.html | 1024x768 | button-label-wrap | `div.doke-reviews-filter-row` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1024x768 | button-label-wrap | `div.doke-reviews-filters` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| perfil.html | 1024x768 | button-label-wrap | `header.app-header.app-header--profile.home-side-meta` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 1024x768 | element-horizontal-overflow | `span.` | scrollWidth | <= 65 | 68 | 5 | não identificado |
| perfil.html | 1024x768 | element-horizontal-overflow | `div.worker-preview__stage` | scrollWidth | <= 1014 | 1024 | 12 | não identificado |
| perfil.html | 1024x768 | text-or-content-clipping | `div.worker-preview__stage` | scrollHeight | <= 746 | 768 | 24 | não identificado |
| resultados.html | 1024x768 | text-or-content-clipping | `div.worker-preview__stage` | scrollHeight | <= 738 | 768 | 32 | não identificado |
| pedidos.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| pedidos.html | 1024x768 | element-horizontal-overflow | `span.` | scrollWidth | <= 65 | 68 | 5 | não identificado |
| mensagens.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 1024x768 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 1024x768 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 1024x768 | element-horizontal-overflow | `span.` | scrollWidth | <= 65 | 68 | 5 | não identificado |
| comunidade.html | 1024x768 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| comunidade.html | 1024x768 | element-horizontal-overflow | `span.` | scrollWidth | <= 65 | 68 | 5 | não identificado |
| index.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| index.html | 1280x800 | element-horizontal-overflow | `span.` | scrollWidth | <= 66 | 68 | 4 | não identificado |
| detalhe-anuncio.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `span.` | scrollWidth | <= 65 | 68 | 5 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `div.ad-gallery__stage` | scrollWidth | <= 566 | 567 | 3 | não identificado |
| detalhe-anuncio.html | 1280x800 | text-or-content-clipping | `div.ad-gallery__stage` | scrollHeight | <= 437 | 477 | 42 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `span.doke-review-metric__copy` | scrollWidth | <= 68 | 79 | 13 | não identificado |
| detalhe-anuncio.html | 1280x800 | element-horizontal-overflow | `span.doke-review-metric__copy` | scrollWidth | <= 68 | 80 | 14 | não identificado |
| detalhe-anuncio.html | 1280x800 | button-label-wrap | `div.doke-reviews-filter-row` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| detalhe-anuncio.html | 1280x800 | button-label-wrap | `div.doke-reviews-filters` | line-count | 1 linha | 2 linhas | 1 | não identificado |
| perfil.html | 1280x800 | button-label-wrap | `header.app-header.app-header--profile.home-side-meta` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| perfil.html | 1280x800 | element-horizontal-overflow | `span.` | scrollWidth | <= 66 | 68 | 4 | não identificado |
| perfil.html | 1280x800 | element-horizontal-overflow | `div.worker-preview__stage` | scrollWidth | <= 1270 | 1280 | 12 | não identificado |
| perfil.html | 1280x800 | text-or-content-clipping | `div.worker-preview__stage` | scrollHeight | <= 778 | 800 | 24 | não identificado |
| resultados.html | 1280x800 | text-or-content-clipping | `div.worker-preview__stage` | scrollHeight | <= 770 | 800 | 32 | não identificado |
| pedidos.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| pedidos.html | 1280x800 | element-horizontal-overflow | `span.` | scrollWidth | <= 66 | 68 | 4 | não identificado |
| mensagens.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 1280x800 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| mensagens.html | 1280x800 | button-label-wrap | `button.message-item.doke-message-card.doke-card` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| notificacoes.html | 1280x800 | element-horizontal-overflow | `span.` | scrollWidth | <= 66 | 68 | 4 | não identificado |
| comunidade.html | 1280x800 | button-label-wrap | `div.home-side-meta__profile-wrap` | line-count | 1 linha | 3 linhas | 2 | não identificado |
| comunidade.html | 1280x800 | element-horizontal-overflow | `span.` | scrollWidth | <= 66 | 68 | 4 | não identificado |