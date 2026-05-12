# GLOBAL CYCLE 47 — Classificação de CSS legado/suspeito

## Objetivo

Classificar CSS com nomes de risco (`stage`, `final`, `hotfix`, `fix`, `refinement`, `parity`, `normalization`, `redesign`, `reference`, `legacy`, `override`) antes de qualquer remoção. Este ciclo **não remove CSS** e não altera visual.

## Resultado

- CSS analisados: **356**
- HTMLs analisados: **21**
- CSS suspeitos classificados: **25**
- Bloquear até baseline visual: **11**
- Migrar antes de remover: **6**
- Manter por compatibilidade agora: **1**
- Revisar antes de alterar: **3**
- Candidato a remoção com validação simples: **4**

## Classificação

### Bloquear até baseline visual

| Arquivo | !important | Tamanho | Uso direto em HTML | Motivo |
|---|---:|---:|---|---|
| `assets/css/pages/perfil-reference-hero.css` | 4522 | 301323 B | — | Large or high-specificity CSS with many !important declarations; high regression risk. |
| `assets/css/pages/mensagens/desktop-redesign.css` | 1945 | 115233 B | — | Large or high-specificity CSS with many !important declarations; high regression risk. |
| `assets/css/pages/comunidade-interna/channel-message-parity.css` | 1016 | 70551 B | — | Large or high-specificity CSS with many !important declarations; high regression risk. |
| `assets/css/pages/home/index-final-refinement.css` | 962 | 62587 B | — | Large or high-specificity CSS with many !important declarations; high regression risk. |
| `assets/css/pages/perfil-mobile-reference-hotfix.css` | 245 | 16701 B | — | Touches high-risk page/contract; needs screenshot baseline before removal or merge. |
| `assets/css/pages/mensagens/community-parity.css` | 192 | 14148 B | — | Touches high-risk page/contract; needs screenshot baseline before removal or merge. |
| `assets/css/pages/comunidade-interna/compact-final-adjustments.css` | 71 | 12829 B | — | Touches high-risk page/contract; needs screenshot baseline before removal or merge. |
| `assets/css/pages/mensagens/final-standardization.css` | 29 | 2661 B | — | Touches high-risk page/contract; needs screenshot baseline before removal or merge. |
| `assets/css/pages/perfil-budget-modal/final-polish-success.css` | 22 | 9495 B | — | Touches high-risk page/contract; needs screenshot baseline before removal or merge. |
| `assets/css/pages/comunidade-interna/internal-modal-legacy.css` | 13 | 11791 B | — | Touches high-risk page/contract; needs screenshot baseline before removal or merge. |
| `assets/css/pages/comunidade-interna/final-room-layout.css` | 2 | 1963 B | — | Touches high-risk page/contract; needs screenshot baseline before removal or merge. |

### Migrar antes de remover

| Arquivo | !important | Tamanho | Uso direto em HTML | Motivo |
|---|---:|---:|---|---|
| `assets/css/pages/pedidos/mobile-longterm-normalization.css` | 207 | 16282 B | — | Likely contains active rules for page/component; migrate responsibilities before removing. |
| `assets/css/pages/search-results/preview-parity.css` | 76 | 5886 B | — | Likely contains active rules for page/component; migrate responsibilities before removing. |
| `assets/css/pages/search-results/final-parity.css` | 57 | 6512 B | — | Likely contains active rules for page/component; migrate responsibilities before removing. |
| `assets/css/pages/search-results/workers-index-parity.css` | 55 | 5973 B | — | Likely contains active rules for page/component; migrate responsibilities before removing. |
| `assets/css/pages/search-results/final-normalization.css` | 34 | 3031 B | — | Likely contains active rules for page/component; migrate responsibilities before removing. |
| `assets/css/pages/search-results/index-parity.css` | 7 | 2967 B | — | Likely contains active rules for page/component; migrate responsibilities before removing. |

### Manter por compatibilidade agora

| Arquivo | !important | Tamanho | Uso direto em HTML | Motivo |
|---|---:|---:|---|---|
| `assets/css/pages/configuracoes/final-responsive-pass.css` | 1 | 4185 B | — | Appears to be compatibility/contract layer; keep until callers are migrated. |

### Revisar antes de alterar

| Arquivo | !important | Tamanho | Uso direto em HTML | Motivo |
|---|---:|---:|---|---|
| `assets/css/pages/detalhe-anuncio/detail-legacy.css` | 11 | 32322 B | — | Suspect name; needs inspection before removal. |
| `assets/css/pages/notificacoes/selection-parity.css` | 3 | 611 B | — | Suspect name; needs inspection before removal. |
| `assets/css/pages/comunidade/image-cover-redesign.css` | 1 | 10310 B | — | Suspect name; needs inspection before removal. |

### Candidato a remoção com validação simples

| Arquivo | !important | Tamanho | Uso direto em HTML | Motivo |
|---|---:|---:|---|---|
| `assets/css/pages/notificacoes/pedidos-parity.css` | 0 | 2289 B | — | Not directly linked by HTML, no !important, small file; validate dependency/import graph before removal. |
| `assets/css/components/ui/doke-legacy-bridge.css` | 0 | 1940 B | — | Not directly linked by HTML, no !important, small file; validate dependency/import graph before removal. |
| `assets/css/pages/comunidade/internal-modal-legacy.css` | 0 | 973 B | — | Not directly linked by HTML, no !important, small file; validate dependency/import graph before removal. |
| `assets/css/components/surface-contract-final.css` | 0 | 298 B | — | Not directly linked by HTML, no !important, small file; validate dependency/import graph before removal. |

## Decisão técnica

- Não remover arquivos `block-until-visual-baseline` sem screenshots antes/depois das páginas afetadas.
- Arquivos `migrate-before-removal` devem ter suas responsabilidades movidas para `components`, `patterns` ou `pages` corretos antes de qualquer remoção.
- Arquivos `candidate-simple-validation` podem ser testados em ciclo separado, com auditoria de imports e validação visual rápida.
- Não criar CSS `fix/hotfix/stage/final` para compensar remoções.

## Próximo ciclo recomendado

Ciclo Global 48 — executar remoção/isolamento apenas dos candidatos de baixo risco, ou começar migração de um arquivo `migrate-before-removal` pequeno.
