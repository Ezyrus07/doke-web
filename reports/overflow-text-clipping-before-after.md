# Overflow/text clipping — antes/depois

Total antes: **316**
Total depois: **240**
Diferença: **-76**

## Por tipo

| Tipo | Antes | Depois | Diferença |
|---|---:|---:|---:|
| element-horizontal-overflow | 162 | 114 | -48 |
| button-label-wrap | 65 | 40 | -25 |
| badge-or-action-clipped | 48 | 48 | 0 |
| card-content-leak | 27 | 27 | 0 |
| text-or-content-clipping | 13 | 10 | -3 |
| body-horizontal-overflow | 1 | 1 | 0 |

## Por página

| Página | Antes | Depois | Diferença |
|---|---:|---:|---:|
| index.html | 190 | 157 | -33 |
| detalhe-anuncio.html | 62 | 36 | -26 |
| perfil.html | 15 | 13 | -2 |
| pedidos.html | 14 | 6 | -8 |
| comunidade.html | 13 | 11 | -2 |
| mensagens.html | 12 | 9 | -3 |
| notificacoes.html | 8 | 6 | -2 |
| resultados.html | 2 | 2 | 0 |

## Por breakpoint

| Breakpoint | Antes | Depois | Diferença |
|---|---:|---:|---:|
| 1024x768 | 31 | 21 | -10 |
| 1280x800 | 37 | 25 | -12 |
| 390x844 | 107 | 83 | -24 |
| 608x926 | 88 | 76 | -12 |
| 810x1080 | 53 | 35 | -18 |

## Correção aplicada

- Criado contrato objetivo `assets/css/components/layout/overflow-text-clipping-contract.css`.
- Adicionados `min-width: 0`, `max-width: 100%`, `white-space: nowrap`, `text-overflow: ellipsis`, overflow controlado em rails e contenção de mídia/cards.
- Ajustados apenas pontos matemáticos de clipping: botões/pills/badges, mídia dentro de cards, rails horizontais e grids compactos que colapsavam cards.
- Não houve redesign subjetivo de layout.

## Divergências restantes

As ocorrências restantes estão em `reports/overflow-text-clipping-audit-after.*`. A maioria restante fica em cards muito compactados do próprio `index.html` e áreas com estrutura antiga; zerar completamente exigiria migrar a composição desses rails, não apenas overflow guard.