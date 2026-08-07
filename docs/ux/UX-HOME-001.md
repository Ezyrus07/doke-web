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

Concluída no controller:

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
- sete findings de Reliability do Sonar corrigidos sem suppressão.

Evidência intermediária:

- commit de correção: `761efc2f3ad036366db6fd6bbe934c1930475e2b`;
- cleanup operacional: `df07f8656b4dad935ea492672414e4afb062ef25`;
- gate de PR após cleanup: sintaxe, testes, Playwright, LCOV e whitespace aprovados.

### Fase 3 — Favoritos

Pendente neste PR:

- integrar `favorites-surface.js` ao rail-state;
- separar falha de ledger e catálogo;
- retry localizado;
- account/route generation;
- preservar cards em refresh;
- sanitizar eventos.

## Fora deste PR

- tabs/filtros de Mais anúncios;
- setas e scroll synchronization;
- redesign/reordenação;
- alteração de ranking ou backend;
- troca de fixtures por dados remotos.

## Rollback

O módulo é aditivo. A integração do controller pode ser revertida isoladamente, retirando o carregamento de `home/rail-state.js` e restaurando o controller anterior, sem alterar dados persistidos. A fase de Favoritos permanecerá separada para preservar rollback localizado.
