# Stage 5 — Auditoria de dívida CSS controlada

## Objetivo

Mapear dívida CSS sem apagar arquivos às cegas. Este stage prioriza rastreabilidade: `!important`, imports, CSS possivelmente órfão, literais de radius e arquivos que tocam shell/global.

## Resultado executivo

- CSS total auditado: **309 arquivos**.
- HTML total auditado: **20 arquivos**.
- `!important` total encontrado: **16928**.
- Arquivos com `!important`: **192**.
- Arquivos com `border-radius` literal: **220**.
- Candidatos a CSS órfão: **58**.
- Imports CSS inválidos após regra runtime: **0**.
- Arquivos CSS com nome proibido de remendo: **0**.

## Decisão técnica

Não removi CSS nesta etapa. A quantidade de CSS potencialmente órfão ainda exige verificação contra JS, telas futuras e histórico visual. Remover agora seria alto risco de regressão.

A limpeza segura começa pelos contratos com maior impacto e menor risco: reduzir `!important` dentro dos contratos ativos, consolidar radius com tokens e isolar regras de shell que estejam dentro de arquivos de página.

## Top 15 — `!important`

| Qtde | Arquivo |
|---:|---|
| 1042 | `assets/css/pages/home/mobile/sections.css` |
| 962 | `assets/css/pages/home/index-final-refinement.css` |
| 867 | `assets/css/components/internal/chat-workspace-contract.css` |
| 771 | `assets/css/pages/home/chrome.css` |
| 722 | `assets/css/components/shell/doke-shell-contract.css` |
| 700 | `assets/css/components/navigation/app-mobile-header-contract.css` |
| 484 | `assets/css/pages/home/mobile/search.css` |
| 479 | `assets/css/core/layout/responsive-shell.css` |
| 429 | `assets/css/pages/home-search-chrome.css` |
| 400 | `assets/css/pages/home.css` |
| 348 | `assets/css/components/navigation/mobile-search-header-shared.css` |
| 308 | `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css` |
| 287 | `assets/css/pages/home-refresh/mobile-index-pass.css` |
| 277 | `assets/css/components/navigation/mobile-chrome-lock.css` |
| 268 | `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css` |

## Top 15 — `border-radius` literal

| Qtde | Arquivo |
|---:|---|
| 73 | `assets/css/pages/pedidos.css` |
| 70 | `assets/css/pages/home/layout.css` |
| 66 | `assets/css/pages/home-sections.css` |
| 50 | `assets/css/pages/home/sections.css` |
| 46 | `assets/css/pages/home/index-final-refinement.css` |
| 45 | `assets/css/pages/detalhe-anuncio.css` |
| 44 | `assets/css/pages/mensagens/base-layout.css` |
| 41 | `assets/css/pages/carteira.css` |
| 39 | `assets/css/pages/perfil.css` |
| 38 | `assets/css/pages/home/mobile/sections.css` |
| 37 | `assets/css/components/internal/chat-workspace-contract.css` |
| 36 | `assets/css/pages/home/chrome.css` |
| 34 | `assets/css/pages/pagamento.css` |
| 32 | `assets/css/pages/perfil-publications.css` |
| 32 | `assets/css/core/ui/global-components.css` |

## Top 15 — arquivos que tocam shell/global

Este mapa não significa erro automático. Ele indica onde há maior risco arquitetural ao alterar CSS.

| Hits | Arquivo |
|---:|---|
| 607 | `assets/css/pages/home/index-final-refinement.css` |
| 502 | `assets/css/components/shell/doke-shell-contract.css` |
| 336 | `assets/css/components/shell/app-shell.css` |
| 335 | `assets/css/components/internal/chat-workspace-contract.css` |
| 331 | `assets/css/pages/home/mobile/sections.css` |
| 328 | `assets/css/pages/home/layout.css` |
| 318 | `assets/css/pages/home/chrome.css` |
| 271 | `assets/css/pages/mensagens/base-layout.css` |
| 264 | `assets/css/pages/shell-normalize.css` |
| 252 | `assets/css/pages/home-refresh/mobile-index-pass.css` |
| 251 | `assets/css/pages/home-search-chrome.css` |
| 246 | `assets/css/components/navigation/app-mobile-header-contract.css` |
| 242 | `assets/css/pages/home.css` |
| 196 | `assets/css/pages/home-shell.css` |
| 179 | `assets/css/components/navigation/mobile-search-header-shared.css` |

## Imports

- Imports inválidos após regra runtime: **0**.
- Nenhum import runtime inválido foi detectado pelo auditor, considerando comentários como conteúdo neutro.

## Candidatos a CSS órfão

Foram detectados **58** candidatos. Eles estão em `docs/reports/frontend-stage5-orphan-css-candidates.txt`.

Critério: arquivo CSS não aparece diretamente em HTML e não é importado por outro CSS. Isso não prova que é lixo; apenas indica que precisa de validação antes de arquivar/remover.

## Arquivos gerados

- `docs/reports/frontend-stage5-important-map.csv`
- `docs/reports/frontend-stage5-radius-literals.csv`
- `docs/reports/frontend-stage5-shell-touch-map.csv`
- `docs/reports/frontend-stage5-orphan-css-candidates.txt`
- `docs/reports/frontend-stage5-import-graph.txt`
- `docs/reports/frontend-stage5-manifest.txt`

## Próximo corte seguro recomendado

1. Atacar `assets/css/components/internal/chat-workspace-contract.css` em bloco pequeno, porque ele está ativo e com muitos `!important`.
2. Substituir radius literais por tokens em componentes reutilizáveis, não em arquivos antigos órfãos.
3. Separar regras de shell/global que estejam em CSS de página apenas quando o escopo for comprovadamente global.
4. Arquivar CSS órfão somente após validação visual das páginas e busca por uso em JS.

## Critério de aceite

- Nenhum arquivo runtime foi apagado.
- Nenhum CSS temporário/remendo foi criado.
- A auditoria é reproduzível via `tools/audit-css-debt.py`.
- O próximo stage pode cortar dívida com base em evidência, não em suposição.
