# Marketplace index parity audit

Gerado em: 2026-05-26T00:19:36.414Z

Tolerância: 2px. Scripts de página desativados; cards dinâmicos de resultados/perfil são fixtures HTML equivalentes aos cards reais do index para medir CSS/anatomia sem alterar JS ou dados.

## Resumo

| Métrica | Antes | Depois | Diferença |
|---|---:|---:|---:|
| Divergências | 413 | 285 | -128 |

## Por página

| Página | Antes | Depois |
|---|---:|---:|
| resultados.html | 191 | 126 |
| detalhe-anuncio.html | 77 | 68 |
| perfil.html | 65 | 65 |
| comunidade.html | 80 | 26 |

## Por componente

| Componente | Antes | Depois |
|---|---:|---:|
| doke-ad-card | 102 | 66 |
| filter-pills | 126 | 24 |
| publication-card | 84 | 72 |
| rails/containers | 19 | 23 |
| section-headers | 46 | 46 |
| worker/video-card | 36 | 54 |

## Amostra antes/depois

| página | breakpoint | componente | propriedade | esperado | antes | depois | status |
|---|---|---|---|---:|---:|---:|---|
| resultados.html | 390x844 | doke-ad-card | box.width | 319.8 | 354 | 319.8 | fixed |
| resultados.html | 390x844 | doke-ad-card | box.height | 262.88 | 637.47 | 262.88 | fixed |
| resultados.html | 390x844 | doke-ad-card | media.height | 104 | 148 | 104 | fixed |
| resultados.html | 390x844 | doke-ad-card | radius | 16 | 26 | 16 | fixed |
| resultados.html | 390x844 | doke-ad-card | overflow.selfX | 0 | 164 | 0 | fixed |
| resultados.html | 390x844 | doke-ad-card | box.width | 319.8 | 354 | 319.8 | fixed |
| resultados.html | 390x844 | doke-ad-card | box.height | 262.88 | 637.47 | 262.88 | fixed |
| resultados.html | 390x844 | doke-ad-card | media.height | 104 | 148 | 104 | fixed |
| resultados.html | 390x844 | doke-ad-card | radius | 16 | 26 | 16 | fixed |
| resultados.html | 390x844 | doke-ad-card | overflow.selfX | 0 | 164 | 0 | fixed |
| resultados.html | 390x844 | doke-ad-card | box.width | 319.8 | 354 | 319.8 | fixed |
| resultados.html | 390x844 | doke-ad-card | box.height | 262.88 | 637.47 | 262.88 | fixed |
| resultados.html | 390x844 | doke-ad-card | media.height | 104 | 148 | 104 | fixed |
| resultados.html | 390x844 | doke-ad-card | radius | 16 | 26 | 16 | fixed |
| resultados.html | 390x844 | doke-ad-card | overflow.selfX | 0 | 164 | 0 | fixed |
| resultados.html | 390x844 | publication-card | box.width | 362 | 354 | 319.8 | remaining |
| resultados.html | 390x844 | publication-card | box.height | 283.3 | 1321.55 | 283.3 | fixed |
| resultados.html | 390x844 | publication-card | radius | 18 | 24 | 18 | fixed |
| resultados.html | 390x844 | publication-card | overflow.selfX | 0 | 24 | 24 | remaining |
| resultados.html | 390x844 | publication-card | box.width | 362 | 354 | 319.8 | remaining |
| resultados.html | 390x844 | publication-card | box.height | 283.3 | 1321.55 | 283.3 | fixed |
| resultados.html | 390x844 | publication-card | radius | 18 | 24 | 18 | fixed |
| resultados.html | 390x844 | publication-card | overflow.selfX | 0 | 24 | 24 | remaining |
| resultados.html | 390x844 | publication-card | box.width | 362 | 354 | 319.8 | remaining |
| resultados.html | 390x844 | publication-card | box.height | 283.3 | 1321.55 | 283.3 | fixed |
| resultados.html | 390x844 | publication-card | radius | 18 | 24 | 18 | fixed |
| resultados.html | 390x844 | publication-card | overflow.selfX | 0 | 24 | 24 | remaining |
| resultados.html | 390x844 | worker/video-card | radius | 16 | 24 | 16 | fixed |
| resultados.html | 390x844 | worker/video-card | radius | 16 | 24 | 16 | fixed |
| resultados.html | 390x844 | worker/video-card | radius | 16 | 24 | 16 | fixed |
| resultados.html | 390x844 | filter-pills | box.height | 21.31 | 17 | 15 | remaining |
| resultados.html | 390x844 | filter-pills | padding.left | 6 | 0 | 6 | fixed |
| resultados.html | 390x844 | filter-pills | padding.right | 6 | 0 | 6 | fixed |
| resultados.html | 390x844 | filter-pills | fontSize | 13.33 | 16 | 13.33 | fixed |
| resultados.html | 390x844 | filter-pills | lineHeight | 15.33 | 0 | 15.33 | fixed |
| resultados.html | 390x844 | filter-pills | box.height | 21.31 | 17 | 15 | remaining |
| resultados.html | 390x844 | filter-pills | padding.left | 6 | 0 | 6 | fixed |
| resultados.html | 390x844 | filter-pills | padding.right | 6 | 0 | 6 | fixed |
| resultados.html | 390x844 | filter-pills | fontSize | 13.33 | 16 | 13.33 | fixed |
| resultados.html | 390x844 | filter-pills | lineHeight | 15.33 | 0 | 15.33 | fixed |
| resultados.html | 390x844 | filter-pills | box.height | 21.31 | 17 | 15 | remaining |
| resultados.html | 390x844 | filter-pills | padding.left | 6 | 0 | 6 | fixed |
| resultados.html | 390x844 | filter-pills | padding.right | 6 | 0 | 6 | fixed |
| resultados.html | 390x844 | filter-pills | fontSize | 13.33 | 16 | 13.33 | fixed |
| resultados.html | 390x844 | filter-pills | lineHeight | 15.33 | 0 | 15.33 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | box.width | 319.8 | 108 | 319.8 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | box.height | 262.88 | 425.83 | 262.88 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | media.height | 104 | 148 | 104 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | media.aspectRatio | 3.06 | 0.72 | 3.06 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | textClipped | false | true | true | remaining |
| detalhe-anuncio.html | 390x844 | doke-ad-card | box.width | 319.8 | 108 | 319.8 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | box.height | 262.88 | 425.83 | 262.88 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | media.height | 104 | 148 | 104 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | media.aspectRatio | 3.06 | 0.72 | 3.06 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | textClipped | false | true | true | remaining |
| detalhe-anuncio.html | 390x844 | doke-ad-card | box.width | 319.8 | 108 | 319.8 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | box.height | 262.88 | 425.83 | 262.88 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | media.height | 104 | 148 | 104 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | media.aspectRatio | 3.06 | 0.72 | 3.06 | fixed |
| detalhe-anuncio.html | 390x844 | doke-ad-card | textClipped | false | true | true | remaining |
| detalhe-anuncio.html | 390x844 | publication-card | box.width | 362 | 354 | 319.8 | remaining |
| detalhe-anuncio.html | 390x844 | publication-card | box.height | 283.3 | 330 | 330 | remaining |
| detalhe-anuncio.html | 390x844 | publication-card | box.width | 362 | 354 | 319.8 | remaining |
| detalhe-anuncio.html | 390x844 | publication-card | box.height | 283.3 | 330 | 330 | remaining |
| detalhe-anuncio.html | 390x844 | publication-card | box.width | 362 | 354 | 319.8 | remaining |
| detalhe-anuncio.html | 390x844 | publication-card | box.height | 283.3 | 330 | 330 | remaining |
| detalhe-anuncio.html | 390x844 | rails/containers | textClipped | false | true | true | remaining |
| perfil.html | 390x844 | rails/containers | box.x | 18 | 10.5 | 10.5 | remaining |
| comunidade.html | 390x844 | filter-pills | box.height | 21.31 | 36 | 21.31 | fixed |
| comunidade.html | 390x844 | filter-pills | padding.left | 6 | 13 | 6 | fixed |
| comunidade.html | 390x844 | filter-pills | padding.right | 6 | 13 | 6 | fixed |
| comunidade.html | 390x844 | filter-pills | radius | 0 | 999 | 0 | fixed |
| comunidade.html | 390x844 | filter-pills | lineHeight | 15.33 | 0 | 15.33 | fixed |
| comunidade.html | 390x844 | filter-pills | gap | 0 | 8 | 8 | remaining |
| comunidade.html | 390x844 | filter-pills | box.height | 21.31 | 36 | 21.31 | fixed |
| comunidade.html | 390x844 | filter-pills | padding.left | 6 | 13 | 6 | fixed |
| comunidade.html | 390x844 | filter-pills | padding.right | 6 | 13 | 6 | fixed |
| comunidade.html | 390x844 | filter-pills | radius | 0 | 999 | 0 | fixed |
| comunidade.html | 390x844 | filter-pills | lineHeight | 15.33 | 0 | 15.33 | fixed |
| comunidade.html | 390x844 | filter-pills | gap | 0 | 8 | 8 | remaining |
