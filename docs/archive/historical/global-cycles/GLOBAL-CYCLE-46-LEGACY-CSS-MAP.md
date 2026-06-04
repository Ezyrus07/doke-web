# Ciclo Global 46 — Mapa de CSS legado/suspeito

Este relatório é diagnóstico. Nenhum CSS deve ser removido apenas por aparecer aqui. A intenção é identificar camadas com nomes de risco como `stage`, `final`, `hotfix`, `refinement`, `parity`, `reference`, `override` e similares.

## Resumo

- CSS analisados: **356**
- HTMLs analisados: **21**
- CSS com nome suspeito: **28**
- `!important` dentro dos CSS suspeitos: **9583**
- Links CSS quebrados em HTML: **0**

## Flags encontradas

| Flag | Arquivos |
| --- | --- |
| final | 9 |
| parity | 8 |
| compact | 4 |
| legacy | 4 |
| normalization | 3 |
| reference | 2 |
| redesign | 2 |
| refinement | 1 |
| hotfix | 1 |

## Top arquivos para revisar primeiro

| Arquivo | Flags | Important | KB | HTMLs | ImportsCSS |
| --- | --- | --- | --- | --- | --- |
| assets/css/pages/perfil-reference-hero.css | reference | 4522 | 294 | 0 | 0 |
| assets/css/pages/home/index-final-refinement.css | final, refinement | 962 | 61 | 0 | 1 |
| assets/css/pages/mensagens/desktop-redesign.css | redesign | 1945 | 113 | 0 | 0 |
| assets/css/pages/comunidade-interna/channel-message-parity.css | parity | 1016 | 69 | 0 | 0 |
| assets/css/pages/perfil-mobile-reference-hotfix.css | hotfix, reference | 245 | 16 | 0 | 0 |
| assets/css/pages/search-results/final-parity.css | final, parity | 57 | 6 | 0 | 1 |
| assets/css/pages/search-results/final-normalization.css | final, normalization | 34 | 3 | 0 | 1 |
| assets/css/pages/mensagens/final-standardization.css | final, normalization | 29 | 3 | 0 | 0 |
| assets/css/pages/comunidade-interna/compact-final-adjustments.css | final, compact | 71 | 13 | 0 | 1 |
| assets/css/pages/detalhe-anuncio/detail-legacy.css | legacy | 11 | 32 | 0 | 0 |
| assets/css/pages/pedidos/mobile-longterm-normalization.css | normalization | 207 | 16 | 0 | 0 |
| assets/css/pages/comunidade-interna/internal-modal-legacy.css | legacy | 13 | 12 | 0 | 1 |
| assets/css/pages/mensagens/community-parity.css | parity | 192 | 14 | 0 | 0 |
| assets/css/components/ui/doke-legacy-bridge.css | legacy | 0 | 2 | 0 | 0 |
| assets/css/pages/comunidade/internal-modal-legacy.css | legacy | 0 | 1 | 0 | 1 |
| assets/css/pages/search-results/preview-parity.css | parity | 76 | 6 | 0 | 1 |
| assets/css/pages/search-results/workers-index-parity.css | parity | 55 | 6 | 0 | 1 |
| assets/css/pages/perfil-budget-modal/final-polish-success.css | final | 22 | 9 | 0 | 1 |
| assets/css/pages/comunidade/image-cover-redesign.css | redesign | 1 | 10 | 0 | 0 |
| assets/css/pages/search-results/index-parity.css | parity | 7 | 3 | 0 | 1 |

## Como usar este mapa

1. **Não apagar em massa.** Primeiro descobrir se o arquivo ainda é importado diretamente por HTML ou por manifesto CSS.
2. **Congelar baseline visual** da página que usa o arquivo.
3. **Classificar responsabilidade:** core, component, pattern ou page.
4. **Migrar regra útil para o lugar correto** antes de remover o arquivo legado.
5. **Remover um import por vez**, validando desktop/mobile.

## Próxima ação recomendada

Começar pelos arquivos suspeitos que têm muitas ocorrências de `!important` e uso concentrado em uma página. Evitar mexer primeiro em arquivos que afetam `perfil.html`, `mensagens.html` e `comunidade-interna.html` sem baseline visual.

O próximo ciclo recomendado é **Ciclo Global 47 — classificação dos CSS suspeitos por risco de remoção**, separando: remover agora, migrar antes, manter por compatibilidade e bloquear até baseline visual.
