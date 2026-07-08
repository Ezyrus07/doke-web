# CSS dormant debt policy

Gerado em: 2026-07-08T01:37:35.860Z

## Resumo

- CSS no pacote ativo de assets: 425
- CSS carregado pelo grafo dos HTMLs raiz: 303
- Dívida ativa registrada: 1145 uso(s) em 10 arquivo(s)
- Dívida dormente registrada: 10747 uso(s) em 28 arquivo(s)
- CSS depreciado reativado: 0
- Arquivos registrados ausentes: 0
- CSS ativo com !important fora do registro: 0

## Política aplicada

- Dívida dormente continua no pacote, mas não pode voltar a ser carregada por HTML ou manifesto sem decisão explícita.
- CSS de chrome mobile depreciado permanece bloqueado como autoridade visual ativa.
- Arquivos dormentes de alto risco não devem ser removidos fisicamente sem validação visual e busca por referências em scripts/testes/docs.
- A remoção física de CSS dormente deve acontecer em lote próprio, com rollback documentado.

## Dívida ativa registrada

| Arquivo | Grupo | Uso(s) | Páginas |
|---|---|---:|---|
| `assets/css/components/shell/mobile-app-shell.css` | responsive-shell | 321 | admin.html, ajuda.html, anunciar-servico.html, avaliacao-profissional.html, carteira.html, comunidade-interna.html, comunidade.html, configuracoes.html, detalhe-anuncio.html, index.html, mensagens.html, meu-perfil.html, notificacoes.html, novidades.html, orcamento.html, pagamento-profissional.html, pedidos.html, perfil-cliente.html, perfil-profissional.html, perfil.html, resultados.html, tornar-profissional.html |
| `assets/css/pages/home/mobile-hero-feed.css` | page-responsive-contract | 269 | index.html |
| `assets/css/components/domain/doke-domain-cards.css` | card-contract | 225 | index.html |
| `assets/css/components/cards/mobile-card-contract.css` | card-contract | 85 | index.html |
| `assets/css/components/cards/service-card-home-hero-feed.css` | card-contract | 65 | index.html |
| `assets/css/pages/home/mobile-layout.css` | page-responsive-contract | 42 | index.html |
| `assets/css/pages/home/mobile-composition.css` | page-responsive-contract | 39 | index.html |
| `assets/css/pages/home/mobile-interactions.css` | page-responsive-contract | 39 | index.html |
| `assets/css/components/shell/mobile-base-stability.css` | responsive-shell | 31 | admin.html, carteira.html, comunidade.html, configuracoes.html, index.html, mensagens.html, meu-perfil.html, notificacoes.html, pedidos.html, perfil-cliente.html, perfil-profissional.html, perfil.html |
| `assets/css/pages/home/mobile-alignment.css` | page-responsive-contract | 29 | index.html |

## Quarentena dormente registrada

| Arquivo | Grupo | Uso(s) | Risco | Documentado em DEPRECATED-CSS |
|---|---|---:|---|---|
| `assets/css/components/shell/doke-shell-contract.css` | responsive-shell | 2554 | high | sim |
| `assets/css/pages/home-tablet-v2.css` | responsive-shell | 1266 | high | sim |
| `assets/css/components/navigation/app-mobile-header-contract.css` | responsive-shell | 700 | high | sim |
| `assets/css/components/shell/app-header.css` | responsive-shell | 581 | high | sim |
| `assets/css/components/layout/responsive-priority-contract.css` | responsive-shell | 477 | high | sim |
| `assets/css/patterns/marketplace-responsive-stack.css` | card-contract | 468 | high | sim |
| `assets/css/components/cards/marketplace-responsive-card-stack.css` | card-contract | 436 | high | sim |
| `assets/css/components/shell/tablet-internal-rail-contract.css` | responsive-shell | 428 | high | sim |
| `assets/css/components/navigation/mobile-search-header-shared.css` | responsive-shell | 348 | high | sim |
| `assets/css/pages/home/tablet-safari-layout.css` | page-responsive-contract | 341 | medium | sim |
| `assets/css/pages/home/chrome.css` | page-responsive-contract | 317 | medium | sim |
| `assets/css/components/shell/app-header-canonical-contract.css` | responsive-shell | 304 | high | sim |
| `assets/css/pages/home/sections.css` | page-responsive-contract | 290 | medium | sim |
| `assets/css/components/navigation/mobile-chrome-lock.css` | responsive-shell | 277 | high | sim |
| `assets/css/components/navigation/mobile-page-rhythm-contract.css` | responsive-shell | 236 | high | sim |
| `assets/css/components/layout/responsive-page-contract.css` | responsive-shell | 230 | high | sim |
| `assets/css/components/navigation/app-mobile-topbar.css` | responsive-shell | 214 | high | sim |
| `assets/css/components/shell/tablet-shell-contract.css` | responsive-shell | 186 | high | sim |
| `assets/css/components/layout/responsive-priority-cards.css` | responsive-shell | 170 | high | sim |
| `assets/css/pages/home/tablet-shell-rail.css` | page-responsive-contract | 154 | medium | sim |
| `assets/css/components/navigation/app-mobile-search.css` | responsive-shell | 146 | high | sim |
| `assets/css/components/layout/index-compact-card-contract.css` | responsive-shell | 129 | high | sim |
| `assets/css/components/shell/marketplace-page-contract.css` | responsive-shell | 104 | high | sim |
| `assets/css/components/cards/shared-index-card-contract.css` | card-contract | 96 | high | sim |
| `assets/css/components/shell/header-rail-alignment-contract.css` | responsive-shell | 83 | high | sim |
| `assets/css/pages/shell-normalize.css` | responsive-shell | 80 | high | sim |
| `assets/css/components/layout/professional-responsive-layout.css` | responsive-shell | 67 | high | sim |
| `assets/css/components/shell/ipad-safari-scroll.css` | responsive-shell | 65 | high | sim |

## Violações

Nenhuma violação encontrada.

## Observação sobre dormentes de alto risco não documentados

Nenhum item dormente de alto risco ficou sem documentação mínima neste relatório.
