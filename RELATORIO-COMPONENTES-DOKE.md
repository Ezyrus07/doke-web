# Relatório de Componentes — Doke

Auditoria gerada a partir do ZIP atual do projeto enviado nesta conversa. Este relatório é o **Ciclo 2A**: diagnóstico de componentes e plano de migração. Não altera arquivos do site.

## Sumário executivo

| Métrica | Total |
|---|---:|
| HTMLs analisados | 21 |
| CSS analisados | 356 |
| JS analisados | 108 |
| Ocorrências de `!important` | 33794 |

### Diagnóstico direto

O projeto já tem uma organização aparente em `core`, `components`, `patterns` e `pages`, mas os contratos de componente ainda estão fragmentados. Existem arquivos bons que podem virar base oficial, porém há muitas camadas antigas de `contract`, `parity`, `final`, `stage`, `redesign` e arquivos de página fazendo papel de componente.

O problema principal não é falta de UI. É falta de **fonte única de verdade** para botões, cards, chips, workers, publicações, avaliações, avatar/rating e shell. Enquanto isso não for consolidado, cada HTML continuará carregando regras próprias e acumulando código antigo.

---

## Severidade por HTML pelo volume de dependências

| HTML | CSS carregados | JS carregados | Severidade técnica |
|---|---:|---:|---|
| `comunidade-interna.html` | 46 | 31 | Crítica |
| `pedidos.html` | 44 | 47 | Crítica |
| `perfil.html` | 44 | 38 | Crítica |
| `mensagens.html` | 41 | 33 | Crítica |
| `comunidade.html` | 38 | 32 | Alta |
| `notificacoes.html` | 37 | 32 | Alta |
| `carteira.html` | 34 | 31 | Alta |
| `configuracoes.html` | 34 | 33 | Alta |
| `avaliacao.html` | 25 | 4 | Média |
| `finalizar-pedido.html` | 25 | 4 | Média |
| `pagamento.html` | 25 | 4 | Média |
| `adicionar-cartao.html` | 21 | 4 | Média |
| `auth/cadastro.html` | 12 | 5 | Baixa |
| `auth/esqueci-senha.html` | 12 | 5 | Baixa |
| `auth/login.html` | 12 | 5 | Baixa |
| `resultados.html` | 9 | 37 | Crítica |
| `index.html` | 8 | 44 | Crítica |
| `detalhe-anuncio.html` | 6 | 3 | Baixa |
| `docs/ui-kit.html` | 4 | 0 | Baixa |
| `teste.html` | 0 | 0 | Baixa |
| `tools/responsive-stage13-dashboard.html` | 0 | 0 | Baixa |

### Interpretação

- `perfil.html`, `pedidos.html`, `mensagens.html` e `comunidade-interna.html` são os mais sensíveis. Não devem ser os primeiros a receber limpeza estrutural pesada.
- `detalhe-anuncio.html` é bom candidato para testar contratos novos porque é recente e tem baixa quantidade de imports.
- `index.html` tem poucos CSS, mas muitos JS. Precisa de cautela porque é página central do marketplace.

---

# 1. Botões e ações

Arquivos com maior concentração de termos relacionados a botões/ações:

| Arquivo | Score | `!important` | Tamanho | Classes únicas |
|---|---:|---:|---:|---:|
| `assets/css/components/before-after-workers-preview.css` | 330 | 672 | 41.8 KB | 32 |
| `assets/css/components/internal/filter-select-standard.css` | 156 | 0 | 25.7 KB | 59 |
| `assets/css/components/internal/selection-panel-standard.css` | 121 | 0 | 11.6 KB | 9 |
| `assets/css/core/ui/global-components.css` | 118 | 1 | 19.5 KB | 125 |
| `assets/css/components/forms-actions/form-action-contract.css` | 99 | 1 | 7.1 KB | 38 |
| `assets/css/components/actions/action-button.css` | 98 | 0 | 5.4 KB | 10 |
| `assets/css/pages/pedidos/orders-command-center.css` | 86 | 4 | 70.6 KB | 84 |
| `assets/css/components/navigation/app-mobile-header-contract.css` | 86 | 700 | 42.9 KB | 79 |
| `assets/css/pages/carteira.css` | 83 | 61 | 31.5 KB | 107 |
| `assets/css/core/responsive-audit.css` | 71 | 0 | 18.6 KB | 147 |
| `assets/css/pages/home-search-chrome.css` | 69 | 429 | 43.4 KB | 76 |
| `assets/css/components/ui/doke-ui-system.css` | 68 | 0 | 16.0 KB | 108 |

## Diagnóstico

Há pelo menos três núcleos concorrendo para botões/ações:

1. `assets/css/components/actions/action-button.css`
2. `assets/css/components/forms-actions/form-action-contract.css`
3. `assets/css/core/ui/global-components.css`

Além disso, páginas como `home-search-chrome.css`, `pedidos/orders-command-center.css` e `carteira.css` também contêm regras relevantes de botão. Isso indica que a aparência de botões provavelmente está sendo replicada em páginas específicas.

## Recomendação

Definir um contrato oficial:

```txt
assets/css/components/actions/action-button.css
```

Como fonte principal para:

```txt
.btn
.btn--primary
.btn--secondary
.btn--ghost
.btn--soft
.btn--danger
.btn--sm
.btn--md
.btn--lg
.icon-button
```

O `form-action-contract.css` deve ficar restrito a ações específicas de formulário, não a botões gerais do sistema.

## Não fazer

- Não criar `button-final.css`.
- Não resolver padding de botão em páginas isoladas.
- Não usar `!important` para alinhar altura de botão.

---

# 2. Cards e superfícies

Arquivos com maior concentração de termos relacionados a cards/superfícies:

| Arquivo | Score | `!important` | Tamanho | Classes únicas |
|---|---:|---:|---:|---:|
| `assets/css/components/domain/doke-domain-cards.css` | 411 | 451 | 31.2 KB | 87 |
| `assets/css/components/cards/card-system.css` | 340 | 0 | 14.3 KB | 95 |
| `assets/css/pages/home/layout.css` | 291 | 8 | 59.0 KB | 150 |
| `assets/css/pages/home-sections.css` | 275 | 377 | 82.9 KB | 168 |
| `assets/css/pages/pedidos/orders-command-center.css` | 275 | 4 | 70.6 KB | 84 |
| `assets/css/pages/pedidos.css` | 262 | 45 | 69.4 KB | 185 |
| `assets/css/pages/home/mobile/sections.css` | 262 | 1042 | 61.3 KB | 71 |
| `assets/css/pages/home/sections.css` | 247 | 267 | 62.4 KB | 142 |
| `assets/css/components/cards/service-card.css` | 206 | 57 | 20.8 KB | 54 |
| `assets/css/components/cards/mobile-card-contract.css` | 132 | 126 | 10.6 KB | 39 |
| `assets/css/pages/perfil.css` | 124 | 8 | 57.3 KB | 121 |
| `assets/css/components/internal/selection-panel-standard.css` | 124 | 0 | 11.6 KB | 9 |

## Diagnóstico

Cards estão espalhados em muitos lugares. Existem arquivos candidatos a contrato:

```txt
assets/css/components/cards/card-system.css
assets/css/components/domain/doke-domain-cards.css
assets/css/components/cards/service-card.css
assets/css/components/cards/ad-card.css
assets/css/components/cards/worker-card.css
assets/css/components/cards/publication-card.css
```

O arquivo `doke-domain-cards.css` tem alta concentração de regras de card e muitos `!important`, então não deve virar contrato oficial sem limpeza. O melhor candidato para base é `card-system.css`, desde que ele esteja visualmente alinhado ao Doke atual.

## Recomendação

Contrato base:

```txt
assets/css/components/cards/card-system.css
```

Responsável por:

```txt
.doke-card
.doke-card__header
.doke-card__body
.doke-card__footer
.doke-card--interactive
.doke-card--compact
```

Contratos de domínio devem depender da base:

```txt
service-card.css
ad-card.css
worker-card.css
publication-card.css
review-card.css
```

## Risco atual

`pages/home-sections.css`, `pages/home/mobile/sections.css`, `pages/pedidos.css` e `pages/perfil.css` provavelmente possuem estilos de cards que deveriam estar em `components/cards` ou `patterns`.

---

# 3. Chips, badges e status

Arquivos com maior concentração de termos relacionados a chips/badges/status:

| Arquivo | Score | `!important` | Tamanho | Classes únicas |
|---|---:|---:|---:|---:|
| `assets/css/components/search/search-bar.css` | 94 | 92 | 7.7 KB | 18 |
| `assets/css/components/internal/filter-select-standard.css` | 81 | 0 | 25.7 KB | 59 |
| `assets/css/pages/search-results.css` | 59 | 813 | 69.7 KB | 72 |
| `assets/css/pages/pedidos/orders-command-center.css` | 44 | 4 | 70.6 KB | 84 |
| `assets/css/components/internal/action-surfaces.css` | 40 | 3 | 10.5 KB | 31 |
| `assets/css/patterns/internal-pages.css` | 36 | 12 | 12.3 KB | 62 |
| `assets/css/components/forms-actions/form-action-contract.css` | 32 | 1 | 7.1 KB | 38 |
| `assets/css/pages/home/layout.css` | 28 | 8 | 59.0 KB | 150 |
| `assets/css/components/navigation/app-mobile-header-contract.css` | 22 | 700 | 42.9 KB | 79 |
| `assets/css/pages/home.css` | 21 | 2802 | 227.1 KB | 153 |
| `assets/css/pages/pedidos.css` | 20 | 45 | 69.4 KB | 185 |
| `assets/css/core/ui/global-components.css` | 19 | 1 | 19.5 KB | 125 |

## Diagnóstico

Não aparece um contrato claro e único para chips/badges. Há regras em search, filtros, pedidos, home, action-surfaces e internal-pages.

Isso explica diferenças pequenas de badge/chip entre páginas.

## Recomendação

Criar ou consolidar em um arquivo oficial, preferencialmente:

```txt
assets/css/components/chips.css
```

ou, se já houver padrão equivalente no projeto, mover para:

```txt
assets/css/components/ui/doke-ui-system.css
```

Contrato sugerido:

```txt
.chip
.chip--success
.chip--info
.chip--warning
.chip--muted
.chip--verified
.badge
.badge--count
.badge--status
```

## Regra

Página não deve definir visual de chip. Página só escolhe variação.

---

# 4. Workers

Arquivos com maior concentração de regras relacionadas a Workers:

| Arquivo | Score | `!important` | Tamanho | Classes únicas |
|---|---:|---:|---:|---:|
| `assets/css/components/before-after-workers-preview.css` | 570 | 672 | 41.8 KB | 32 |
| `assets/css/components/before-after-workers-preview/workers-viewer-integrated.css` | 296 | 273 | 16.7 KB | 30 |
| `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css` | 182 | 296 | 16.7 KB | 25 |
| `assets/css/components/cards/worker-card.css` | 152 | 65 | 9.2 KB | 21 |
| `assets/css/components/before-after-workers-preview/workers-viewer-stable-contract.css` | 151 | 242 | 12.6 KB | 31 |
| `assets/css/pages/home-overlays/workers-feed-polish.css` | 149 | 250 | 17.9 KB | 26 |
| `assets/css/components/profile/profile-content-rail.css` | 128 | 115 | 17.2 KB | 50 |
| `assets/css/pages/home/workers-preview.css` | 126 | 53 | 5.0 KB | 9 |
| `assets/css/pages/home-sections.css` | 122 | 377 | 82.9 KB | 168 |
| `assets/css/pages/home-overlays/workers-feed-base.css` | 112 | 0 | 13.5 KB | 37 |
| `assets/css/pages/search-results/workers-index-parity.css` | 103 | 55 | 5.8 KB | 12 |
| `assets/css/components/before-after-workers-preview/workers-modal.css` | 95 | 1 | 11.9 KB | 33 |
| `assets/css/pages/home/mobile/sections.css` | 94 | 1042 | 61.3 KB | 71 |
| `assets/css/pages/home/sections.css` | 70 | 267 | 62.4 KB | 142 |

## Diagnóstico

Workers é um dos sistemas mais fragmentados. Há regras em:

```txt
components/cards/worker-card.css
components/before-after-workers-preview.css
components/before-after-workers-preview/*
pages/home-overlays/workers-feed-*.css
pages/home/workers-preview.css
pages/search-results/workers-index-parity.css
```

Esse é um sinal claro de evolução por camadas. Workers aparece como card, preview, feed, modal, fullscreen mobile e overlay. Isso não é errado, mas precisa de contrato.

## Recomendação

Separar responsabilidades:

```txt
components/cards/worker-card.css          = card compacto/reutilizável
patterns/workers-feed.css                 = lista/feed de workers
patterns/workers-viewer.css               = modal/viewer/fullscreen
pages/home/workers-preview.css            = layout específico da home, se inevitável
```

## Não fazer

- Não ajustar Workers dentro de `detalhe-anuncio.css` copiando CSS da home.
- Não criar outro card vertical específico para detalhe do anúncio.
- Não deixar `workers-index-parity.css` virar dependência permanente de outras páginas.

---

# 5. Publicações / antes e depois

Arquivos com maior concentração de regras relacionadas a publicações:

| Arquivo | Score | `!important` | Tamanho | Classes únicas |
|---|---:|---:|---:|---:|
| `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` | 191 | 308 | 17.5 KB | 46 |
| `assets/css/pages/home-overlays/before-after-preview.css` | 145 | 1 | 18.3 KB | 59 |
| `assets/css/components/before-after-workers-preview/before-after-sidebar.css` | 136 | 1 | 8.6 KB | 31 |
| `assets/css/components/cards/publication-card.css` | 110 | 0 | 10.2 KB | 30 |
| `assets/css/components/before-after-workers-preview/before-after-comments-v5.css` | 110 | 2 | 6.4 KB | 24 |
| `assets/css/pages/home/mobile/sections.css` | 106 | 1042 | 61.3 KB | 71 |
| `assets/css/pages/perfil-publications.css` | 106 | 198 | 39.6 KB | 76 |
| `assets/css/pages/perfil-reference-hero.css` | 104 | 4522 | 294.3 KB | 163 |
| `assets/css/components/before-after-workers-preview/before-after-single-media.css` | 102 | 22 | 3.9 KB | 3 |
| `assets/css/components/before-after-workers-preview/shared-publication-polish.css` | 94 | 156 | 9.9 KB | 42 |
| `assets/css/components/before-after-workers-preview/before-after-media.css` | 94 | 38 | 6.2 KB | 15 |
| `assets/css/pages/home/layout.css` | 90 | 8 | 59.0 KB | 150 |
| `assets/css/components/profile/profile-services-grid.css` | 65 | 23 | 10.5 KB | 40 |
| `assets/css/components/before-after-workers-preview/publication-light-modal.css` | 58 | 30 | 4.7 KB | 14 |

## Diagnóstico

Existe um candidato bom:

```txt
assets/css/components/cards/publication-card.css
```

Mas há várias regras de publicação em `before-after-workers-preview` e em páginas de perfil/home. O risco é o card visualmente parecer igual, mas cada página estar montando uma variação própria.

## Recomendação

Fonte oficial:

```txt
assets/css/components/cards/publication-card.css
```

Com variações controladas:

```txt
.publication-card
.publication-card--photo
.publication-card--video
.publication-card--before-after
.publication-card--compact
```

Patterns como preview/modal devem consumir esse card ou uma variante, não redefinir tudo.

---

# 6. Avaliações / reviews / rating

Arquivos com maior concentração de regras relacionadas a avaliações e rating:

| Arquivo | Score | `!important` | Tamanho | Classes únicas |
|---|---:|---:|---:|---:|
| `assets/css/components/before-after-workers-preview.css` | 396 | 672 | 41.8 KB | 32 |
| `assets/css/components/profile/profile-reviews.css` | 181 | 0 | 16.7 KB | 46 |
| `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css` | 167 | 296 | 16.7 KB | 25 |
| `assets/css/components/before-after-workers-preview/workers-viewer-integrated.css` | 138 | 273 | 16.7 KB | 30 |
| `assets/css/pages/profile-reviews.css` | 126 | 0 | 11.0 KB | 34 |
| `assets/css/components/before-after-workers-preview/workers-viewer-stable-contract.css` | 125 | 242 | 12.6 KB | 31 |
| `assets/css/pages/home-overlays/before-after-preview.css` | 121 | 1 | 18.3 KB | 59 |
| `assets/css/pages/perfil-reviews-page.css` | 113 | 34 | 15.6 KB | 35 |
| `assets/css/pages/home-overlays/workers-feed-polish.css` | 109 | 250 | 17.9 KB | 26 |
| `assets/css/pages/post-service.css` | 100 | 2 | 13.7 KB | 39 |
| `assets/css/pages/home-overlays/workers-feed-base.css` | 94 | 0 | 13.5 KB | 37 |
| `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` | 89 | 308 | 17.5 KB | 46 |

## Diagnóstico

Há dois núcleos relevantes:

```txt
assets/css/components/profile/profile-reviews.css
assets/css/pages/profile-reviews.css
```

Isso já indica conflito de responsabilidade: uma parte está em `components`, outra em `pages`. Avaliações não pertencem exclusivamente ao perfil, porque também aparecem em detalhe do anúncio, finalização de pedido e possivelmente cards de profissional.

## Recomendação

Criar/consolidar contrato:

```txt
assets/css/components/reviews.css
assets/css/components/rating.css
```

Responsáveis por:

```txt
.rating
.rating__star
.rating-summary
.review-card
.review-card__author
.review-card__body
.review-metric
```

Depois, `profile-reviews.css` deve ficar só com layout específico da página de perfil.

---

# 7. Avatars

Arquivos com maior concentração de avatar/perfil visual:

| Arquivo | Score | `!important` | Tamanho | Classes únicas |
|---|---:|---:|---:|---:|
| `assets/css/components/avatar.css` | 168 | 20 | 7.2 KB | 26 |
| `assets/css/components/navigation/app-mobile-header-contract.css` | 52 | 700 | 42.9 KB | 79 |
| `assets/css/pages/mensagens/desktop-redesign.css` | 45 | 1945 | 112.5 KB | 93 |
| `assets/css/components/navigation/header-mobile.css` | 41 | 97 | 12.1 KB | 52 |
| `assets/css/pages/perfil-reference-hero.css` | 25 | 4522 | 294.3 KB | 163 |
| `assets/css/pages/perfil.css` | 22 | 8 | 57.3 KB | 121 |
| `assets/css/pages/pedidos/mobile-longterm-normalization.css` | 17 | 207 | 15.9 KB | 39 |
| `assets/css/components/ui/doke-legacy-bridge.css` | 12 | 0 | 1.9 KB | 18 |
| `assets/css/pages/pedidos/orders-command-center.css` | 11 | 4 | 70.6 KB | 84 |
| `assets/css/components/navigation/mobile-page-rhythm-contract.css` | 11 | 227 | 13.5 KB | 74 |

## Diagnóstico

Há um bom candidato:

```txt
assets/css/components/avatar.css
```

Mas avatars também aparecem em header mobile, mensagens, perfil, pedidos e publicações.

## Recomendação

Manter `avatar.css` como fonte única para:

```txt
.avatar
.avatar--sm
.avatar--md
.avatar--lg
.avatar--initials
.avatar--verified
```

Páginas não devem redefinir tamanho/base de avatar; apenas contexto e layout.

---

# 8. Shell, sidebar, header e topbar

Arquivos com maior concentração de shell/header/sidebar:

| Arquivo | Score | `!important` | Tamanho | Classes únicas |
|---|---:|---:|---:|---:|
| `assets/css/components/shell/doke-shell-contract.css` | 821 | 831 | 75.1 KB | 84 |
| `assets/css/components/shell/app-shell.css` | 548 | 180 | 32.2 KB | 95 |
| `assets/css/components/navigation/app-mobile-header-contract.css` | 542 | 700 | 42.9 KB | 79 |
| `assets/css/pages/home-search-chrome.css` | 521 | 429 | 43.4 KB | 76 |
| `assets/css/pages/home/chrome.css` | 446 | 771 | 51.0 KB | 102 |
| `assets/css/components/internal/chat-workspace-contract.css` | 424 | 1440 | 87.9 KB | 99 |
| `assets/css/pages/home.css` | 418 | 2802 | 227.1 KB | 153 |
| `assets/css/pages/pedidos/orders-command-center.css` | 369 | 4 | 70.6 KB | 84 |
| `assets/css/pages/mensagens/desktop-redesign.css` | 353 | 1945 | 112.5 KB | 93 |
| `assets/css/components/shell/mobile-app-shell.css` | 351 | 363 | 26.7 KB | 51 |
| `assets/css/pages/comunidade-interna/channel-message-parity.css` | 330 | 1016 | 68.9 KB | 45 |
| `assets/css/pages/perfil-reference-hero.css` | 303 | 4522 | 294.3 KB | 163 |

## Diagnóstico

Essa área é sensível. Existe um contrato forte:

```txt
assets/css/components/shell/doke-shell-contract.css
assets/css/components/shell/app-shell.css
assets/css/components/shell/mobile-app-shell.css
```

Mas há sinais de páginas interferindo no shell, especialmente home, pedidos, mensagens, comunidade interna e perfil.

## Recomendação

Não mexer agora no shell visualmente. Primeiro mapear dependências e congelar baseline. Shell só deve ser alterado quando o problema for realmente global.

Contrato oficial provável:

```txt
components/shell/app-shell.css
components/shell/doke-shell-contract.css
components/navigation/*
```

## Regra permanente

Problema de página não se resolve alterando shell/sidebar/header/body.

---

# 9. Arquivos suspeitos por nome

Arquivos com nomes que indicam camada histórica, paridade, contrato temporário, finalização ou hotfix:

- `assets/css/components/surface-contract-final.css`
- `assets/css/pages/perfil-mobile-reference-hotfix.css`
- `assets/css/pages/perfil-page-adjustments.css`
- `assets/css/pages/comunidade/image-cover-redesign.css`
- `assets/css/pages/comunidade/mobile-interaction-contract.css`
- `assets/css/pages/comunidade/mobile-layout-contract.css`
- `assets/css/pages/comunidade-interna/channel-message-parity.css`
- `assets/css/pages/comunidade-interna/compact-final-adjustments.css`
- `assets/css/pages/comunidade-interna/final-room-layout.css`
- `assets/css/pages/comunidade-interna/mobile-interaction-contract.css`
- `assets/css/pages/configuracoes/final-responsive-pass.css`
- `assets/css/pages/home/index-final-refinement.css`
- `assets/css/pages/mensagens/community-parity.css`
- `assets/css/pages/mensagens/desktop-redesign.css`
- `assets/css/pages/mensagens/final-standardization.css`
- `assets/css/pages/mensagens/mobile-interaction-contract.css`
- `assets/css/pages/notificacoes/mobile-interaction-contract.css`
- `assets/css/pages/notificacoes/pedidos-parity.css`
- `assets/css/pages/notificacoes/selection-parity.css`
- `assets/css/pages/perfil-budget-modal/final-polish-success.css`
- `assets/css/pages/search-results/final-normalization.css`
- `assets/css/pages/search-results/final-parity.css`
- `assets/css/pages/search-results/index-parity.css`
- `assets/css/pages/search-results/layout-density-contract.css`
- `assets/css/pages/search-results/mobile-card-contract.css`
- `assets/css/pages/search-results/preview-parity.css`
- `assets/css/pages/search-results/results-density-preview-contract.css`
- `assets/css/pages/search-results/structure-contract-v2.css`
- `assets/css/pages/search-results/workers-index-parity.css`
- `assets/css/components/before-after-workers-preview/mobile-interaction-contract.css`
- `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css`
- `assets/css/components/before-after-workers-preview/workers-viewer-stable-contract.css`
- `assets/css/components/cards/card-grid-contract.css`
- `assets/css/components/cards/mobile-card-contract.css`
- `assets/css/components/forms-actions/form-action-contract.css`
- `assets/css/components/internal/chat-workspace-contract.css`
- `assets/css/components/internal/surface-contract.css`
- `assets/css/components/layout/responsive-page-contract.css`
- `assets/css/components/navigation/app-mobile-header-contract.css`
- `assets/css/components/navigation/mobile-page-rhythm-contract.css`
- `assets/css/components/overlays/mobile-action-surface-contract.css`
- `assets/css/components/overlays/overlay-contract.css`
- `assets/css/components/search/search-filter-contract.css`
- `assets/css/components/shell/doke-shell-contract.css`
- `assets/css/components/shell/page-container-contract.css`
- `assets/css/components/ui-surface/surface-contract.css`

## Diagnóstico

Nem todo arquivo da lista é ruim. Alguns `contract` podem ter sido criados com boa intenção. O problema é que muitos desses arquivos convivem com versões antigas e arquivos de página. Isso aumenta conflito de cascata.

## Recomendação

Não apagar em massa. Classificar cada arquivo em:

```txt
manter como contrato oficial
migrar para components/patterns
fundir em arquivo existente
remover após validação visual
não tocar por enquanto
```

---

# 10. Candidatos a fonte oficial por componente

| Componente | Fonte oficial recomendada | Observação |
|---|---|---|
| Botões | `assets/css/components/actions/action-button.css` | `form-action-contract.css` deve ficar restrito a formulários |
| Icon buttons | `assets/css/components/actions/action-button.css` ou criar seção nele | Não duplicar em páginas |
| Cards base | `assets/css/components/cards/card-system.css` | Precisa ser validado visualmente antes de migrar |
| Cards de anúncio/serviço | `assets/css/components/cards/service-card.css` + `ad-card.css` | Definir diferença entre anúncio e serviço |
| Workers card | `assets/css/components/cards/worker-card.css` | Feed/viewer devem ir para patterns |
| Publicações | `assets/css/components/cards/publication-card.css` | Antes/depois deve ser variação |
| Reviews | `assets/css/components/reviews.css` ou consolidar a partir de `profile/profile-reviews.css` | Hoje está acoplado a perfil |
| Rating | `assets/css/components/rating.css` | Hoje aparece espalhado junto de reviews |
| Avatar | `assets/css/components/avatar.css` | Bom candidato já existente |
| Chips/badges | `assets/css/components/chips.css` ou `components/ui/doke-ui-system.css` | Falta contrato claro |
| Shell | `assets/css/components/shell/app-shell.css` + `doke-shell-contract.css` | Não mexer por página |

---

# 11. Plano de migração seguro

## Ciclo 2B — Botões, chips e cards base

Objetivo: consolidar componentes base sem redesenhar o site.

Ordem:

```txt
1. Validar `action-button.css` como contrato oficial.
2. Validar `card-system.css` como contrato oficial de card base.
3. Criar/consolidar contrato de chips/badges.
4. Aplicar primeiro em `detalhe-anuncio.html`.
5. Conferir visual desktop/mobile.
```

Critérios de aceite:

```txt
- nenhum `!important` novo
- nenhum arquivo final/hotfix/stage/fix
- página preserva visual Doke
- CSS de page continua cuidando apenas de layout
```

## Ciclo 2C — Marketplace cards

Depois dos componentes base:

```txt
1. service-card/ad-card
2. worker-card
3. publication-card
4. review-card/rating
```

Aplicar em páginas de menor risco antes de `perfil.html`.

## Ciclo 3 — Páginas centrais do marketplace

```txt
1. detalhe-anuncio.html
2. resultados.html
3. index.html
4. perfil.html
```

O `perfil.html` fica por último dentro deste grupo porque tem maior risco de regressão.

---

# 12. Próxima ação recomendada

A próxima alteração real no site deve ser **Ciclo 2B.1**:

```txt
Validar e consolidar botões + cards base + chips/badges no detalhe-anuncio.html, sem mexer em páginas críticas.
```

Arquivos prováveis:

```txt
assets/css/components/actions/action-button.css
assets/css/components/cards/card-system.css
assets/css/components/chips.css
assets/css/pages/detalhe-anuncio.css
detalhe-anuncio.html
```

Se `chips.css` não existir, ele pode ser criado como contrato real, não como hotfix.

---

# 13. Critérios globais para qualquer próxima mudança

```txt
1. Diagnosticar antes de alterar.
2. Usar componente existente antes de criar novo.
3. Criar pattern apenas se a composição for recorrente.
4. CSS de page não pode redefinir botão/card/chip global.
5. Não mexer em shell/header/sidebar/body para resolver página local.
6. Nenhum `!important` novo.
7. Nenhum inline style novo.
8. Entregar só arquivos alterados com árvore real preservada.
```
