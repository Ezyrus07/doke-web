# CSS Authority Map — Doke Web
**Data:** 2026-06-10  
**Escopo:** auditoria estática do zip `dokee-web(232).zip`; sem alteração visual.
## Resultado executivo
- HTMLs analisados: **44**.
- CSS ativos em `assets/css`: **384**.
- CSS referenciados por HTMLs: **114**.
- Ocorrências de `!important` em CSS ativos: **27423**.
- Arquivos CSS com `!important`: **140**.
- Ocorrências de `!important` em CSS carregados por pelo menos um HTML: **14258**.

## Diagnóstico técnico
O problema principal não é a existência isolada de `!important`; é a existência de **múltiplas autoridades simultâneas** para largura, rail, header, cards, carrosséis e responsivo. Isso explica bugs como `loading` diferente do estado carregado: o primeiro paint usa um conjunto de regras, e scripts/estados/classes posteriores ativam outro contrato visual.

## Arquivos CSS mais perigosos por `!important`
| # | Arquivo | !important | Linhas | @media | Risco |
|---:|---|---:|---:|---:|---:|
| 1 | `assets/css/components/shell/doke-shell-contract.css` | 2545 | 5925 | 62 | 16 |
| 2 | `assets/css/components/shell/ipad-safari-scroll-rescue.css` | 1311 | 2352 | 9 | 19 |
| 3 | `assets/css/pages/home-tablet-v2.css` | 1275 | 3075 | 27 | 16 |
| 4 | `assets/css/pages/perfil/responsive.css` | 1005 | 5429 | 49 | 17 |
| 5 | `assets/css/pages/home-runtime.css` | 921 | 4857 | 111 | 19 |
| 6 | `assets/css/patterns/marketplace-responsive-stack.css` | 904 | 2722 | 60 | 19 |
| 7 | `assets/css/pages/detalhe-anuncio.css` | 872 | 8323 | 96 | 17 |
| 8 | `assets/css/pages/perfil/mobile-public-profile.css` | 771 | 3275 | 34 | 17 |
| 9 | `assets/css/components/navigation/app-mobile-header-contract.css` | 700 | 1168 | 12 | 12 |
| 10 | `assets/css/components/internal/chat-workspace-contract.css` | 650 | 2871 | 28 | 16 |
| 11 | `assets/css/pages/carteira.css` | 631 | 7933 | 74 | 14 |
| 12 | `assets/css/components/shell/app-header.css` | 583 | 1138 | 19 | 12 |
| 13 | `assets/css/pages/home/tablet-responsive-layout.css` | 547 | 2378 | 27 | 16 |
| 14 | `assets/css/components/before-after-workers-preview.css` | 515 | 1271 | 7 | 9 |
| 15 | `assets/css/core/layout/responsive-shell.css` | 479 | 1107 | 16 | 12 |
| 16 | `assets/css/components/layout/responsive-priority-contract.css` | 477 | 809 | 23 | 17 |
| 17 | `assets/css/pages/search-results-runtime.css` | 447 | 2292 | 36 | 16 |
| 18 | `assets/css/components/shell/tablet-internal-rail-contract.css` | 428 | 723 | 4 | 14 |
| 19 | `assets/css/pages/pedidos/orders-command-center.css` | 415 | 4218 | 65 | 12 |
| 20 | `assets/css/components/overlays/financial-modal-system.css` | 411 | 1367 | 4 | 9 |
| 21 | `assets/css/components/shell/mobile-app-shell.css` | 406 | 1015 | 12 | 9 |
| 22 | `assets/css/pages/home/mobile-hero-feed.css` | 399 | 1747 | 15 | 12 |
| 23 | `assets/css/components/navigation/mobile-search-header-shared.css` | 348 | 592 | 2 | 7 |
| 24 | `assets/css/pages/home/tablet-safari-layout.css` | 341 | 2703 | 20 | 19 |
| 25 | `assets/css/pages/perfil/tablet-portrait-contract.css` | 320 | 573 | 1 | 16 |

## Arquivos CSS mais perigosos por autoridade concorrente
| # | Arquivo | Risco | !important | Motivos |
|---:|---|---:|---:|---|
| 1 | `assets/css/components/shell/ipad-safari-scroll-rescue.css` | 19 | 1311 | muitos !important, controla largura/header/rail, controla cards, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 2 | `assets/css/pages/home-runtime.css` | 19 | 921 | muitos !important, controla largura/header/rail, controla cards, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 3 | `assets/css/patterns/marketplace-responsive-stack.css` | 19 | 904 | muitos !important, controla largura/header/rail, controla cards, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 4 | `assets/css/pages/home/tablet-safari-layout.css` | 19 | 341 | muitos !important, controla largura/header/rail, controla cards, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 5 | `assets/css/pages/perfil/responsive.css` | 17 | 1005 | muitos !important, controla largura/header/rail, controla cards, controla rail/carrossel, depende de estado runtime, responsivo amplo |
| 6 | `assets/css/pages/detalhe-anuncio.css` | 17 | 872 | muitos !important, controla largura/header/rail, controla cards, controla rail/carrossel, depende de estado runtime, responsivo amplo |
| 7 | `assets/css/pages/perfil/mobile-public-profile.css` | 17 | 771 | muitos !important, controla largura/header/rail, controla cards, controla rail/carrossel, depende de estado runtime, responsivo amplo |
| 8 | `assets/css/components/layout/responsive-priority-contract.css` | 17 | 477 | muitos !important, controla largura/header/rail, controla cards, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 9 | `assets/css/components/layout/responsive-page-contract.css` | 17 | 230 | muitos !important, controla largura/header/rail, controla cards, controla rail/carrossel, responsivo amplo, nome indica override/contrato/remendo |
| 10 | `assets/css/pages/home.css` | 17 | 131 | muitos !important, controla largura/header/rail, controla cards, controla rail/carrossel, depende de estado runtime, responsivo amplo |
| 11 | `assets/css/components/shell/doke-shell-contract.css` | 16 | 2545 | muitos !important, controla largura/header/rail, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 12 | `assets/css/pages/home-tablet-v2.css` | 16 | 1275 | muitos !important, controla largura/header/rail, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 13 | `assets/css/components/internal/chat-workspace-contract.css` | 16 | 650 | muitos !important, controla largura/header/rail, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 14 | `assets/css/pages/home/tablet-responsive-layout.css` | 16 | 547 | muitos !important, controla largura/header/rail, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 15 | `assets/css/pages/search-results-runtime.css` | 16 | 447 | muitos !important, controla largura/header/rail, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 16 | `assets/css/pages/perfil/tablet-portrait-contract.css` | 16 | 320 | muitos !important, controla cards, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 17 | `assets/css/pages/home/mobile-index-feed-contract.css` | 16 | 229 | muitos !important, controla largura/header/rail, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 18 | `assets/css/pages/mensagens/tablet-shell-alignment.css` | 16 | 202 | muitos !important, controla largura/header/rail, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 19 | `assets/css/components/layout/marketplace-index-layout-contract.css` | 16 | 200 | muitos !important, controla cards, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 20 | `assets/css/pages/home/tablet-shell-rail.css` | 16 | 154 | muitos !important, controla largura/header/rail, controla rail/carrossel, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 21 | `assets/css/pages/carteira.css` | 14 | 631 | muitos !important, controla largura/header/rail, controla rail/carrossel, depende de estado runtime, responsivo amplo |
| 22 | `assets/css/components/shell/tablet-internal-rail-contract.css` | 14 | 428 | muitos !important, controla largura/header/rail, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 23 | `assets/css/components/shell/app-header-canonical-contract.css` | 14 | 304 | muitos !important, controla largura/header/rail, depende de estado runtime, responsivo amplo, nome indica override/contrato/remendo |
| 24 | `assets/css/components/cards/mobile-card-distribution-contract.css` | 14 | 211 | muitos !important, controla cards, controla rail/carrossel, responsivo amplo, nome indica override/contrato/remendo |
| 25 | `assets/css/components/shell/app-shell.css` | 14 | 205 | muitos !important, controla largura/header/rail, controla rail/carrossel, depende de estado runtime, responsivo amplo |

## HTMLs com maior carga de CSS problemático
| Página | CSS carregados | !important carregados | Arquivos high-risk carregados |
|---|---:|---:|---:|
| `perfil.html` | 45 | 7688 | 12 |
| `mensagens.html` | 50 | 7659 | 17 |
| `carteira.html` | 48 | 7523 | 18 |
| `pedidos.html` | 50 | 6695 | 14 |
| `notificacoes.html` | 50 | 6648 | 18 |
| `detalhe-anuncio.html` | 30 | 6275 | 14 |
| `comunidade.html` | 46 | 6261 | 13 |
| `configuracoes.html` | 44 | 5547 | 14 |
| `comunidade-interna.html` | 41 | 5321 | 10 |
| `ajuda.html` | 26 | 5183 | 10 |
| `avaliacao.html` | 32 | 4967 | 9 |
| `anunciar-servico.html` | 25 | 4879 | 9 |
| `avaliacao-profissional.html` | 25 | 4879 | 9 |
| `novidades.html` | 25 | 4879 | 9 |
| `pagamento-profissional.html` | 25 | 4879 | 9 |

## Autoridades recomendadas
- `core`: tokens, reset, tipografia, breakpoints, largura base e viewport.
- `components/shell`: sidebar, app shell, header e navegação global.
- `components/cards`: anatomia de cards reutilizáveis; páginas não devem redefinir `width`, `height`, `aspect-ratio`, padding interno ou media de card compartilhado.
- `patterns`: rails horizontais, carrosséis, grids reutilizáveis e contratos responsivos compartilhados.
- `pages`: somente espaçamento/contexto específico de página, sem dominar componente compartilhado.

## Próxima ação segura
Não recomendo remover `!important` globalmente agora. O próximo passo deve ser um **corte controlado no index**: mapear a troca entre DOM estático e estado hidratado, consolidar `featured-services` em uma única autoridade e impedir que JS/renderers troquem a anatomia do card sem contrato visual equivalente.
