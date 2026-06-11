# Stage 64 — Second Dormant CSS Controlled Removal

## Objetivo
Remover fisicamente o segundo lote pequeno de CSS dormente aprovado no Stage 63, com gate antes/depois e sem tocar em visual, HTML produtivo ou JS produtivo.

## Arquivos CSS removidos
- `assets/css/pages/home/chrome.css`
- `assets/css/pages/home/footer.css`
- `assets/css/pages/home/mobile-feed-rails.css`
- `assets/css/pages/home/mobile-interactions.css`
- `assets/css/pages/home/mobile-layout.css`
- `assets/css/pages/home/tablet-shell-rail.css`
- `assets/css/pages/search-results/mobile-density.css`
- `assets/css/pages/shell-normalize.css`
- `assets/css/patterns/community-room-layout.css`

## Critério de remoção
- Fora da cascata ativa dos HTMLs analisados.
- Sem link CSS ativo em HTML.
- Sem `@import` ativo em CSS alcançável.
- Sem referência produtiva em JS runtime, `config/` ou `scripts/` ativos.
- Referências históricas em `docs/`, `reports/` e inventários antigos não foram tratadas como bloqueio de runtime.

## Resultado mensurável
| Métrica | Antes | Depois |
|---|---:|---:|
| CSS físico em `assets/css` | 399 | 390 |
| CSS alcançável pela cascata ativa | 277 | 277 |
| CSS dormente/não alcançável | 122 | 113 |
| Arquivos CSS com `!important` dormente | 39 | 30 |
| Ocorrências dormentes de `!important` | 13068 | 12325 |

## Gate pós-remoção
| Validação | Resultado |
|---|---:|
| Links CSS quebrados em HTML ativo | 0 |
| Imports CSS quebrados | 0 |
| CSS com chaves desbalanceadas | 0 |
| `!important` alcançável pela cascata ativa | 0 |
| Arquivos removidos que ainda existem | 0 |

## Observação de risco
As menções históricas em documentação, relatórios e inventários antigos foram preservadas. Isso mantém rastreabilidade, mas significa que buscas textuais amplas ainda podem encontrar nomes de arquivos removidos. O gate de runtime/HTML/CSS ativo permanece limpo.

## Decisão
Remoção física executada: **sim**. Próximo stage recomendado: **Stage 65 — Final Post-Removal Audit / Responsibility Report**.
