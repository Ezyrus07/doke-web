# Relatório antes/depois — contrato global de cards

## Escopo

- Implementação feita em `assets/css/components/cards/marketplace-card-contract.css`.
- CSS de páginas continua responsável por posição externa, margem de seção e composição.
- O contrato compartilhado neutraliza anatomia interna de cards equivalentes: mídia, radius, sombra, padding, badge, favorito, tipografia, action row e aspect-ratio de workers.

## Resultado do comparador

- Antes: 1993 divergências.
- Depois: 1790 divergências.
- Redução total: 203 divergências.

### Por componente

| componente | antes | depois | diferença |
|---|---:|---:|---:|
| doke-ad-card | 198 | 144 | -54 |
| publication-card | 145 | 94 | -51 |
| video-card / worker card | 317 | 224 | -93 |
| review cards | 188 | 188 | 0 |
| containers/rails | 378 | 376 | -2 |
| headers | 365 | 363 | -2 |
| header inner | 138 | 137 | -1 |
| section headers | 228 | 228 | 0 |
| page | 36 | 36 | 0 |

### Por página

| página | antes | depois | diferença |
|---|---:|---:|---:|
| detalhe-anuncio.html | 1031 | 841 | -190 |
| perfil.html | 265 | 252 | -13 |
| resultados.html | 237 | 237 | 0 |
| pedidos.html | 76 | 76 | 0 |
| mensagens.html | 62 | 62 | 0 |
| notificacoes.html | 77 | 77 | 0 |
| comunidade.html | 78 | 78 | 0 |
| configuracoes.html | 92 | 92 | 0 |
| carteira.html | 75 | 75 | 0 |

## Breakpoints validados

- 390x844
- 608x926
- 810x1080
- 1024x768
- 1280x800

## Divergências restantes

- O comparador ainda mede `x/y` absoluto e posição de seção. Essas diferenças permanecem porque a regra arquitetural permite que páginas controlem posicionamento externo.
- `headers`, `header inner`, `section headers` e parte de `containers/rails` continuam fora do escopo deste contrato de cards.
- `review cards` ainda aparecem porque algumas avaliações, como `detail-mobile-review-card`, não usam uma classe compartilhada consistente de review card; elas precisam de decisão posterior: migrar para componente compartilhado ou manter como bloco local.
- Ainda há divergências de largura/altura efetiva em rails legados de `detalhe-anuncio.html`; o contrato já neutraliza anatomia interna, mas a composição externa desses rails precisa de ciclo específico se a decisão for torná-los idênticos ao index em distribuição.
