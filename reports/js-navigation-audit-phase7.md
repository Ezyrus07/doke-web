# Fase 7 — Auditoria JavaScript de navegação entre HTMLs

Base usada: `dokee-web(151).zip`.

## Escopo auditado

Arquivos principais:

- `assets/js/core/stable-shell-router.js`
- `assets/js/components/mobile-app-shell.js`
- scripts de páginas obrigatórias carregados por `index.html`, `perfil.html`, `pedidos.html`, `mensagens.html`, `notificacoes.html`, `comunidade.html`, `resultados.html`, `detalhe-anuncio.html` e `ajuda.html`

## Diagnóstico

### 1. O roteador já sincroniza parte importante do contrato

`stable-shell-router.js` já faz corretamente:

- validação de rotas seguras por `SAFE_ROUTES`;
- interceptação de links internos;
- `pushState`/`replaceState` sem reload completo quando a flag `stableShellNavigation` está ativa;
- troca do `.app-shell`;
- sincronização de atributos/classes do `html` e `body`;
- recarregamento de CSS ausente da rota destino;
- carregamento de scripts ausentes da rota destino;
- chamada de inicializadores por `ROUTE_INIT`;
- refresh do `DokeMobileAppShell` após a rota.

### 2. Havia lacuna de inicialização para `detalhe-anuncio.html` e `ajuda.html`

As duas rotas estavam em `SAFE_ROUTES`, mas não tinham inicializadores registrados em `ROUTE_INIT`.

Impacto provável:

- ao navegar via `DokeNavigate`, a página poderia trocar o HTML sem reinicializar handlers específicos;
- se o script da página já tivesse sido carregado antes, ele não seria executado novamente;
- se o script fosse carregado antes do `replaceShell`, a execução imediata poderia mirar o DOM da rota anterior.

Correção aplicada:

- `stable-shell-router.js` agora registra:
  - `/detalhe-anuncio.html` -> `DokeInitDetailAd`
  - `/ajuda.html` -> `DokeInitHelpCenter`
- `detalhe-anuncio.js` agora expõe `window.DokeInitDetailAd` e mantém execução no carregamento direto.
- `detalhe-anuncio.js` recebeu guarda idempotente em `data-detail-ad-ready="true"` para evitar duplicação de listeners.

### 3. `mobile-app-shell.js` é aceitável como refresh pós-rota, mas ainda precisa de higiene de estado na Fase 8

O arquivo remove e recria o shell mobile em cada `doke:route-ready`, o que é bom.

Pontos positivos:

- `render()` remove shell/nav anteriores antes de recriar;
- em viewport não-mobile, `teardownForNonMobileViewport()` remove shell mobile e atributos `data-shell-*`;
- escuta `doke:route-ready`, `resize` e `orientationchange`.

Risco remanescente:

- classes de overlay abertas por ações diretas podem sobreviver se a navegação acontecer enquanto drawer/filtros/modal estão abertos;
- o roteador remove algumas classes (`sidebar-open`, `mobile-search-active`, `home-search-overlay-active`), mas não remove todas as classes de overlay conhecidas do projeto.

Classes candidatas para higiene na Fase 8:

- `home-filter-sheet-open`
- `home-inline-filters-open`
- `doke-mobile-drawer-open`
- `mobile-home-drawer-open`
- `results-filters-open`
- `orders-overlay-open`
- `worker-modal-open`
- `is-messages-header-search-open`

### 4. O fallback de reload ainda existe, mas está corretamente condicionado ao pré-commit

Em `navigate()`, se a navegação falhar antes do commit, o roteador ainda cai para `window.location.href`/`replace`.

Isso é aceitável como fallback pré-commit.

O que deve ser evitado na Fase 8:

- usar reload completo para resolver scroll travado depois de uma navegação já commitada;
- esconder bug de sincronização de `html/body/classes/overflow` com F5.

### 5. Risco arquitetural identificado: scripts da rota destino são carregados antes de `replaceShell()`

Ordem atual:

1. `fetchDocument()`
2. `ensureStyles()`
3. `ensureScripts()`
4. `replaceShell()`
5. `runInitializers()`

Risco:

- scripts que executam imediatamente podem procurar elementos no DOM antigo;
- scripts que não têm inicializador global/idempotente ficam dependentes do primeiro carregamento;
- isso explica parte das diferenças entre carregamento direto por URL e navegação interna.

Não alterei essa ordem nesta fase porque é uma mudança de risco médio/alto. A Fase 7 foi limitada a auditoria e hardening pequeno de rotas sem inicializador.

Recomendação para Fase 8:

- avaliar mover `ensureScripts(nextDoc)` para depois de `replaceShell(nextDoc, path)`;
- manter `ensureStyles(nextDoc)` antes da troca para evitar flash visual;
- garantir que scripts com execução imediata tenham inicializador idempotente ou sejam compatíveis com rota já trocada.

## Alterações feitas nesta fase

### `assets/js/core/stable-shell-router.js`

Adicionados inicializadores:

```js
'/detalhe-anuncio.html': ['DokeInitDetailAd'],
'/ajuda.html': ['DokeInitHelpCenter'],
```

### `assets/js/pages/detalhe-anuncio.js`

Transformado em inicializador público e idempotente:

```js
window.DokeInitDetailAd = initDetailAd;
```

Com guarda:

```js
if (!root || root.dataset.detailAdReady === 'true') return;
root.dataset.detailAdReady = 'true';
```

## Itens deixados propositalmente para a Fase 8

- correção do scroll travado após `DokeNavigate`;
- teste Playwright comparando carregamento direto vs navegação interna;
- limpeza completa de classes temporárias/overlays no momento da troca de rota;
- investigação de `overflow`, `height`, `position` em `html`, `body`, `.app-shell`, `.page` e `.page__content` após navegação interna;
- possível alteração da ordem `replaceShell()`/`ensureScripts()`.

## Critérios de aceite para esta fase

- `stable-shell-router.js` continua sintaticamente válido.
- `detalhe-anuncio.js` continua sintaticamente válido.
- `ajuda.html` e `detalhe-anuncio.html` passam a ter inicializadores chamados depois de `DokeNavigate`.
- Não há reload completo adicionado.
- Não há alteração em CSS, layout, shell/header/sidebar ou HTML.
