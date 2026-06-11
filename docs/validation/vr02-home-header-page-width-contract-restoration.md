# VR02 — Home Header + Page Width Contract Restoration

## Base e referência

- Base real aplicada: `dokee-web-MAIN.zip`.
- Referência visual: `dokee-web-Antes.zip`, usada apenas para orientação de largura/densidade.
- Não houve cópia direta de CSS legado.

## Diagnóstico

A home já tinha recebido o hero visual no VR01, mas ainda estava com sensação de produto esticado: header e conteúdo não estavam suficientemente compactos, o hero estava largo/alto demais e a densidade vertical do topo ainda não lembrava o estado aprovado. As categorias atuais foram preservadas porque estavam visualmente melhores/aceitáveis.

## Responsabilidade aplicada

- `assets/css/layout/page-rail-authority.css`: dono do rail/largura padrão.
- `assets/css/layout/header.css`: dono da geometria do header.
- `assets/css/pages/home-search-chrome.css`: dono da composição do hero/search da home.
- `assets/css/pages/home*.css`: apenas cache-busting/manifesto da home.

## Alterações

1. Home desktop recebeu rail visual compacto de `1040px`, sem reativar `shared-page-width-contract.css` ou `desktop-page-rail-authority.css`.
2. Header da home foi compactado para `68px`, com controles de `46px` e alinhamento direto ao `--doke-header-rail`.
3. O form de busca rápida do header fica fora do fluxo quando inativo, evitando consumo invisível de espaço.
4. Hero/search ficou mais contido: form de até `900px`, CTAs até `640px`, menor altura e menor espaçamento vertical.
5. Categorias, cards, workers, publicações e páginas internas ficaram congelados.

## Métricas

- Links CSS quebrados em HTML ativo: 0
- Imports CSS quebrados: 0
- CSS com chaves desbalanceadas: 0
- CSS alcançável pela cascata ativa: 272
- `!important` ativo: 0
- Arquivos CSS com `!important` total/dormente: 51

## Testes executados

- `npm run audit:css-import-map` — passed
- `npm run audit:essential-asset-imports` — passed-with-follow-up
- `npm run test:desktop-zoomout-contract` — passed
- `node --check assets/js/core/app.js` — passed
- `node --check scripts/test-desktop-zoomout-contract.js` — passed

## Testes não executados

Validação visual por Playwright não foi executada porque `@playwright/test` não está instalado no runtime extraído. Requer validação manual no Live Server.

## Próximo alvo recomendado

VR03 deve focar em `Destaques para você` e cards da home, mantendo categorias congeladas enquanto não houver necessidade real de mexer nelas.
