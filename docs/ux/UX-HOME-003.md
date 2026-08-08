# UX-HOME-003 — Rail arrows, scroll boundaries and responsive synchronization

Issue: #91

## Base

```text
base: ux/ux-home-002-more-services-filters
base SHA: 85b5d2dc1d2c337a7e98c2174d13d027b74a5d33
branch: ux/ux-home-003-rail-scroll
```

## Causa raiz

A Home ainda delega setas de categorias e rails a `bindScrollRail()` dentro de `assets/js/pages/home.js`. O helper calcula um delta no clique e chama `scrollBy()`, mas não mantém uma representação explícita de boundaries e não sincroniza as setas quando o usuário rola manualmente, quando o viewport muda ou quando o conteúdo do track muda.

## Fase 1 — fundação pura

`assets/js/pages/home/rail-scroll-state.js` introduz uma autoridade de cálculo sem DOM:

- normalização de `scrollLeft`, `clientWidth` e `scrollWidth`;
- `maxScroll` determinístico;
- tolerância de boundary para offsets subpixel;
- `overflow`, `atStart`, `atEnd`, `canPrevious` e `canNext`;
- passo proporcional ao viewport com mínimo de 220 px;
- alvo de scroll clamped entre `0` e `maxScroll`.

O módulo ainda não substitui `home.js` nesta fase.

## Invariantes

- ausência de overflow => início e fim simultâneos, ambas as direções indisponíveis;
- início => previous indisponível, next disponível quando houver overflow;
- meio => ambas disponíveis;
- fim dentro da tolerância => next indisponível;
- métricas negativas/NaN não escapam da faixa válida;
- target nunca ultrapassa `[0, maxScroll]`;
- nenhuma mudança de backend, cards, ranking, Home layout ou filtros.

## Próxima fase

Criar `rail-scroll-surface.js`, integrar categorias + `[data-rail-arrow]`, sincronizar disabled/ARIA em scroll/resize/mutation e remover a autoridade antiga de `home.js` com cleanup seguro por stable-shell.
