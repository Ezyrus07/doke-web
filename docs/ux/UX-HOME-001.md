# UX-HOME-001 — Independent rail states and localized recovery

## Status

- issue: #83;
- branch: `ux/ux-home-001-rail-states`;
- base: `ux/ux-perf-debt-001-profile-hydration`;
- base SHA: `fecf67c1a79df8ac3431982d8d004e253c5d4304`;
- PR: #84, aberto e draft;
- merge: não autorizado;
- staging/produção: não acessados.

## Problema

A Home combina navegação estática, catálogo remoto canônico, conteúdo editorial local e conteúdo personalizado. O controller anterior reduzia falhas remotas a arrays vazios e publicava um estado geral sobre coleções com autoridades distintas.

Consequências confirmadas:

- timeout/erro podia aparecer como vazio legítimo;
- Workers e Publicações editoriais podiam ser escondidos por arrays remotos vazios;
- Mais anúncios recebia estado pelo total, não pela fatia após os seis destaques;
- Favoritos ocultava vazio e erro da mesma forma;
- refresh não possuía snapshot local independente por rail;
- receipt de serviços podia publicar contagem antes do cálculo;
- eventos de Favoritos expunham IDs brutos e mensagens técnicas.

## Fronteira arquitetural

`Doke.homeRailState` é um adaptador de apresentação. Ele não substitui:

- `Doke.viewState`;
- `Doke.listState`;
- `DokePageHydration`;
- `Doke.continuityExperience`;
- repositories ou services;
- `Doke.serviceFavoritesController`.

Ele governa somente a composição imutável de estado de cada rail:

```text
rail identity
+ authority
+ generation
+ dataState
+ freshnessState
+ visibilityState
+ itemCount
+ preserveContent
+ sanitized errorCode
```

## Autoridades registradas

| Rail | Autoridade |
|---|---|
| Categorias | `static-navigation` |
| Destaques | `canonical-remote` |
| Recommended legado | `legacy-unresolved` |
| Workers | `editorial-local` |
| Publicações | `editorial-local` |
| Mais anúncios | `canonical-remote` |
| Profissionais | `editorial-local` |
| Favoritos | `personalized-remote` |

## Invariantes

1. erro técnico não pode ser publicado como `empty`;
2. `empty` exige resposta aceita e contagem zero;
3. contagem maior que zero não pode coexistir com `empty`;
4. receipt antigo não pode vencer generation atual;
5. refresh preserva conteúdo aceito quando disponível;
6. falha durante refresh publica conteúdo stale, não lista zerada;
7. Favoritos anônimo usa `hidden-anonymous`, não `empty`;
8. eventos contêm somente rail, estados, contagem, generation e código sanitizado;
9. IDs de favoritos, query, usuário, localização e mensagem técnica não entram em eventos;
10. Featured e More derivam de coleções distintas.

## Coleções de serviços

```text
all = services
featured = services.slice(0, 6)
more = services.slice(6)
featuredCount = min(total, 6)
moreCount = max(total - 6, 0)
```

## Implementação

### Fase 1 — contrato puro

Concluída:

- registry imutável;
- controller de generations;
- stale preservation;
- DOM adapter mínimo;
- testes determinísticos.

### Fase 2 — Home remota/editorial

Concluída:

- `index-data-controller.js` integrado ao rail-state;
- respostas remotas representadas por envelopes explícitos;
- erro, offline, stale e vazio separados;
- Featured e More derivados de coleções independentes;
- rails editoriais preservados;
- recovery localizado;
- root state resolvido por conteúdo aceito e autoridade remota;
- contagens calculadas antes dos eventos;
- retry single-flight e route fence validados;
- LCOV atribuído ao código canônico;
- finding final de optional chaining corrigido sem suppressão.

Evidência final da Fase 2:

- trusted run `31142083063`, head `3ced7d74bbf69d6ffe99b4229fcc2a9bb4430eef`: success;
- Sonar Quality Gate: passed;
- 0 new issues, 0 accepted issues, 0 Security Hotspots e 0 Sonar annotations;
- 87,2% Coverage on New Code;
- nenhum finding foi aceito, suprimido ou excluído para obter aprovação.

### Fase 3 — Favoritos

Concluída na implementação e nos contratos:

- `favorites-surface.js` integrado ao rail `favorites` de `Doke.homeRailState`;
- `Doke.serviceFavoritesController` continua sendo a única autoridade de ownership;
- sessão resolvida pela autoridade canônica `Doke.session`, com fallback compatível para `DokeAuth.service`;
- usuário anônimo publica `hidden-anonymous`, nunca `empty`;
- resposta aceita com zero favoritos publica `empty` + `hidden-insufficient-items`;
- falha de ledger e falha de catálogo possuem códigos públicos distintos;
- recovery é localizado no rail, com `Tentar novamente`;
- refresh da mesma conta preserva cards aceitos e degrada para `stale` em falha;
- troca de conta limpa a superfície antes do novo carregamento;
- account, route, section e generation fences descartam respostas antigas;
- preview continua limitado a seis cards e posicionado antes do showcase profissional;
- cards continuam usando `Doke.publicServiceCard` e são reconciliados pelo controller canônico;
- eventos da Home expõem somente estado sanitizado, sem IDs de favoritos, identidade, usuário, itens ou mensagens técnicas;
- `favorites-surface.js` participa do LCOV executável.

Contrato determinístico `scripts/test-ux-home-001-favorites-surface.js` valida:

- anônimo;
- vazio legítimo;
- ready com cards canônicos;
- erro de ledger;
- erro de catálogo;
- stale refresh;
- troca de conta com latest-wins;
- troca de root/rota;
- retry localizado;
- sanitização de eventos.

## Evidência da Fase 3

- trusted run `31142950599`, head `0706619e3eb5dee1f87f1c6bdc6ebbd08467badc`: success;
- Sonar Quality Gate: passed;
- 0 new issues, 0 accepted issues, 0 Security Hotspots e 0 Sonar annotations;
- 83,9% Coverage on New Code;
- Home Favorites behavior, Playwright, LCOV e whitespace: success.

### Compatibilidade com contratos herdados

SEARCH-UX02 encontrou duas assertions textuais presas à implementação antiga (`services.slice(0, 6)` e contagem por `services.length`), embora o comportamento novo estivesse correto. Elas foram atualizadas para as autoridades atuais `buildPreviewNodes(items)` e `updateCount(ui, count)`.

No head `c75c583c56acf7de2bcf8309acd712bb18a608f0`, SEARCH-UX02, UX-SEARCH-DEBT e UX-HOME voltaram a passar. A análise confiável seguinte (`5deeaf55e0a4e34a3250242032a82d9164ee3cd2`) manteve Quality Gate verde e 83,9% Coverage on New Code, porém apontou duas ocorrências exclusivamente nas assertions recém-alteradas: ambas eram assertions compostas com diagnóstico pouco granular.

As duas ocorrências foram corrigidas em `eab98f99ec0877d302e94c4b9d1473903c8f55ca`, separando cada requisito em uma assertion independente: boundary, anchor, preview builder, limite de seis, posição, count element, count authority, pluralização e `aria-label`. Nesse head, SEARCH-UX02, UX-SEARCH-DEBT e UX-HOME passaram novamente.

Este checkpoint dispara a análise confiável final. A issue #83 só pode ser encerrada se o novo SHA repetir Quality Gate verde com 0 new issues, 0 accepted issues e 0 Security Hotspots, mantendo os contratos herdados aprovados.

## Fora deste PR

- tabs/filtros de Mais anúncios;
- setas e scroll synchronization;
- redesign/reordenação;
- alteração de ranking ou backend;
- troca de fixtures por dados remotos.

## Rollback

A integração é reversível por camada:

- Fase 2: retirar `home/rail-state.js` do carregamento e restaurar o controller anterior;
- Fase 3: reverter somente `favorites-surface.js` e seu teste comportamental;
- nenhuma reversão exige migration, mudança de backend ou alteração de dados persistidos.
