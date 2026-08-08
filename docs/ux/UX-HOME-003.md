# UX-HOME-003 — Rail arrows, scroll boundaries and responsive synchronization

Issue: #91
PR: #92

## Base

```text
base: ux/ux-home-002-more-services-filters
base SHA: 85b5d2dc1d2c337a7e98c2174d13d027b74a5d33
branch: ux/ux-home-003-rail-scroll
```

## Causa raiz

A Home delegava as setas dos rails a um `bindScrollRail()` dentro de `assets/js/pages/home.js`. O helper apenas calculava um delta no clique e chamava `scrollBy()`. Não havia autoridade explícita para boundaries, disabled/ARIA, scroll manual/touch, resize, alteração de conteúdo ou cleanup/rebind do stable-shell.

## Arquitetura final

### `assets/js/pages/home/rail-scroll-state.js`

Autoridade pura e independente de DOM:

- normaliza `scrollLeft`, `clientWidth` e `scrollWidth`;
- calcula `maxScroll`;
- usa tolerância determinística para offsets subpixel;
- deriva `overflow`, `atStart`, `atEnd`, `canPrevious` e `canNext`;
- calcula passo proporcional ao viewport com mínimo de 220 px;
- resolve targets previous/next sempre dentro de `[0, maxScroll]`.

### `assets/js/pages/home/rail-scroll-surface.js`

Autoridade de apresentação dos rails:

- descobre o rail de categorias por `[data-catégory-track]` + `[data-catégory-arrow]`;
- suporta os rails genéricos existentes por `[data-rail-arrow]` + `data-rail-target`;
- mantém `disabled` e `aria-disabled` sincronizados com o boundary real;
- publica estado observável no próprio track (`data-rail-scroll-state`, overflow e direções disponíveis);
- navega com `scrollTo({ behavior: 'smooth' })` usando targets calculados pela autoridade pura;
- sincroniza após scroll manual/touch/trackpad;
- recalcula após `ResizeObserver` e `MutationObserver`;
- possui cleanup de listeners e observers;
- suporta rebind seguro quando a Home é recriada pelo stable-shell;
- o `AbortSignal` da rota destrói integralmente o binding ativo.

### Integração da Home

`index.html` carrega os módulos na ordem:

```text
rail-scroll-state.js
→ rail-scroll-surface.js
→ home.js
```

`DokeInitHome` liga a autoridade ao lifecycle já existente:

```text
window.Doke?.homeRailScrollSurface?.bind?.({ signal });
```

A autoridade antiga `bindScrollRail()` e as referências locais de arrows/tracks foram removidas de `home.js`.

## Contratos permanentes

- `scripts/test-ux-home-003-rail-scroll-state.js`: zero overflow, início, meio, fim, tolerância, step e clamp;
- `scripts/test-ux-home-003-rail-scroll-surface.js`: disabled/ARIA, click, scroll manual, resize, mutation, rebind e route cleanup em DOM controlado;
- `scripts/test-ux-home-003-integration-contract.js`: ordem de scripts, binding por signal e ausência da autoridade legada;
- `scripts/test-ux-home-003-browser-contract.js`: Chromium real cobrindo boundaries, navegação, scroll manual, resize, mutation e stable-shell cleanup.

O workflow permanente também repete os contratos herdados de UX-HOME-001, UX-HOME-002 e SEARCH antes de aceitar a entrega.

## Invariantes finais

- sem overflow: previous e next indisponíveis;
- início: previous indisponível e next disponível quando houver overflow;
- meio: ambas as direções disponíveis;
- fim: next indisponível;
- scroll manual/touch atualiza o estado sem exigir clique;
- resize e mudanças de conteúdo recalculam boundaries;
- rebind não deixa double-listeners ou observers órfãos;
- targets nunca escapam de `[0, maxScroll]`;
- o markup e a anatomia dos rails não foram redesenhados;
- tabs/filtros de `Mais anúncios` permanecem sob UX-HOME-002;
- nenhum backend, Supabase, migration, ranking, staging ou produção é alterado.

## Validação

A entrega exige no mesmo head final:

- contrato puro + surface + integração + browser em verde;
- regressões UX-HOME-001/002 e SEARCH em verde;
- LCOV contendo `rail-scroll-state.js` e `rail-scroll-surface.js`;
- SonarQube Cloud Quality Gate aprovado;
- zero novos issues, accepted issues e security hotspots.

O PR deve permanecer aberto, draft e não mesclado até autorização explícita.
