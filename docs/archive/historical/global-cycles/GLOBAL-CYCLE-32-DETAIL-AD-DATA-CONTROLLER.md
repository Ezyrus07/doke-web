# Ciclo Global 32 — Detail ad data controller

## Objetivo

Preparar `detalhe-anuncio.html` para consumir dados por meio da fronteira global de repositories sem alterar visual, CSS ou marcação estrutural da página.

## Alterações

- Criado `assets/js/pages/detalhe-anuncio-data-controller.js`.
- `detalhe-anuncio.html` passa a carregar a cadeia data-ready mínima:
  - `mock-data-boundary.js`
  - `repository-boundary.js`
  - `mock-repository-provider.js`
  - `page-data-orchestrator.js`
  - `list-state.js`
  - `detalhe-anuncio-data-controller.js`
- `mock-data-boundary.js` agora expõe `Doke.mockData` como alias compatível com `mock-repository-provider.js`.
- Criada auditoria `npm run audit:detail-ad-data-controller`.

## Decisão técnica

O controller não renderiza visual nem substitui conteúdo estático. Ele apenas:

1. identifica o `serviceId` por query string, `data-service-id` ou fallback;
2. chama `Doke.pageDataOrchestrator.getPageData('detalhe-anuncio')`;
3. marca estado em `data-data-state` no root da página;
4. dispara eventos `doke:detail-ad-data-ready` ou `doke:detail-ad-data-error`.

Essa abordagem prepara a página para dados reais sem congelar o visual atual, já que `detalhe-anuncio.html` ainda está em evolução.

## Critérios de aceite

- Nenhuma alteração visual intencional.
- Nenhum `!important` novo.
- Nenhum `style=""` novo.
- Nenhum arquivo `fix`, `hotfix`, `stage`, `final`, `novo` ou `ajuste` criado.
- Controller não usa `fetch`, Supabase, Firebase, storage ou manipulação direta de HTML.
