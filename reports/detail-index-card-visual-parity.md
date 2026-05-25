# Detalhe anúncio × Index — card/header visual parity

Escopo: correção objetiva das diferenças visíveis apontadas entre `detalhe-anuncio.html` e `index.html`, com foco no breakpoint `810x1080` e proteção complementar para `608x926`.

## Problemas medidos

| Página | Componente | Propriedade | Esperado | Antes | Depois | Breakpoint |
|---|---|---:|---:|---:|---:|---|
| detalhe-anuncio.html | section header semelhante | font-size | 13px | 16px | 13px | 810x1080 |
| detalhe-anuncio.html | section header semelhante | line-height | 14.95px | 18.56px | 14.95px | 810x1080 |
| detalhe-anuncio.html | doke-ad-card similar | height | 266px | 536.3px | 266px | 810x1080 |
| detalhe-anuncio.html | doke-ad-card similar | border-radius | 24px | 24px/17px inconsistente | 24px | 810x1080 |
| detalhe-anuncio.html | doke-ad-card title | font-size | 15.36px | 21.6px | 15.36px | 810x1080 |
| detalhe-anuncio.html | doke-ad-card title | line-height | 15.36px | 22.03px | 15.36px | 810x1080 |
| detalhe-anuncio.html | grid anúncios semelhantes | columns | 3 colunas compactas | 2 colunas/tall cards em tela real | 3 colunas compactas | 810x1080 |
| index.html | doke-ad-card title | font-size | compacto | 21.6px | 15.36px | 810x1080 |
| index.html | section header | font-size | 13px | 13px | 13px | 810x1080 |
| index.html/detalhe | body overflow horizontal | scrollWidth = clientWidth | 810px | variável | 810px | 810x1080 |

## Arquivo canônico criado

- `assets/css/components/layout/index-compact-card-contract.css`

Responsabilidade do arquivo:

- impedir que cards compartilhados fiquem altos demais em tablet;
- reduzir títulos de cards que estavam herdando escala desktop exagerada;
- igualar os section headers do detalhe ao ritmo do index;
- garantir que os anúncios semelhantes do detalhe usem grid compacto de 3 colunas no tablet;
- manter a página dona da composição externa, mas sem redefinir anatomia interna de card.

## Arquivos HTML atualizados

Foi adicionado o link do contrato no fim do `<head>` dos HTMLs principais para a camada carregar após os contratos antigos.

## Pendência

A próxima limpeza estrutural correta é remover os blocos vencidos de `responsive-priority-cards.css` que ainda carregam números de bbox antigos. Eles não vencem mais a nova camada, mas continuam sendo dívida técnica.
