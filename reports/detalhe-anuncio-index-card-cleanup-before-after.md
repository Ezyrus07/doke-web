# detalhe-anuncio.html — limpeza objetiva de anatomia de cards contra index.html

Escopo: somente `detalhe-anuncio.html` comparado com `index.html`.

Breakpoints validados: `608x926` e `810x1080`.

Alteração feita: neutralização das regras antigas do detalhe que criavam inset/radius próprios em `.publication-card` de `Publicações desse anúncio`.

## Antes/depois

| Página | Breakpoint | Componente | Propriedade | Esperado index | Antes detalhe | Depois detalhe | Status | CSS corrigido |
|---|---|---|---|---:|---:|---:|---|---|
| detalhe-anuncio.html | 608x926 | publication-card | width | 272px | 272px | 272px | OK | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 608x926 | publication-card | height | 308px | 308px | 308px | OK | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 608x926 | publication-card | border-radius | 18px | 16px | 18px | Corrigido | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 608x926 | publication-card media | height | 164px | 164px | 164px | OK | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 608x926 | publication-card media | width | 272px | 250px | 270px | Corrigido para tolerância ≤ 2px | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 608x926 | publication-card media | margin | 0px | 10px 10px 0px | 0px | Corrigido | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 608x926 | doke-ad-card | width/height/media/radius | 278px / 262.88px / 104px / 24px | igual ao index | igual ao index | OK | sem mudança nova |
| detalhe-anuncio.html | 608x926 | worker/video-card | width/height/radius | 572px / 775.55px / 16px | igual ao index | igual ao index | OK | sem mudança nova |
| detalhe-anuncio.html | 810x1080 | publication-card | width | 348.3px | 348.3px | 348.3px | OK | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 810x1080 | publication-card | height | 308px | 308px | 308px | OK | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 810x1080 | publication-card | border-radius | 22px | 24px | 22px | Corrigido | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 810x1080 | publication-card media | height | 164px | 164px | 164px | OK | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 810x1080 | publication-card media | width | 346.3px | 326.3px | 346.3px | Corrigido | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 810x1080 | publication-card media | margin | 0px | 10px 10px 0px | 0px | Corrigido | `focused-index-parity-contract.css` |
| detalhe-anuncio.html | 810x1080 | doke-ad-card | width/height/media/radius | 230.78px / 536.3px / 137.69px / 24px | igual ao index | igual ao index | OK | sem mudança nova |
| detalhe-anuncio.html | 810x1080 | worker/video-card | width/height/radius | 106.84px / 189.97px / 24px | igual ao index | igual ao index | OK | sem mudança nova |

## Validação Playwright

`npm run audit:focused-index-parity`

Resultado após a limpeza: `after=0` divergências acima de 2px para `detalhe-anuncio.html` e `perfil.html` nos breakpoints focados.

## Observação técnica

A causa era page-specific antiga: regras do `detalhe-anuncio` aplicavam margem interna na mídia das publicações relacionadas e radius diferente do card usado no index. A correção não redesenhou o card; apenas removeu a anatomia privada do detalhe para ele voltar a herdar o padrão compartilhado.
