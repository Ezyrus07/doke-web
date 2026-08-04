# UX-FOUNDATION-004 — estados parciais dos rails da Home

## Status

- fase: `DISCOVERY_AND_SPECIFICATION`;
- branch: `ux/ux-foundation-001`;
- base lógica originalmente inspecionada: `26608c8acd8153daec8ed09540c59a5ecd1e9cc4`;
- head lógico estável mais recente verificado: `fd488e66f3c664af74e1b5e28b07a736ffc6da08`;
- deriva entre os dois heads: somente PAY-A14, matriz e documentação financeira;
- alterações em Home, rails, busca, HTML ou CSS entre os dois heads: zero;
- alteração de runtime neste sublote: zero;
- staging e produção: não acessados;
- merge e auto-merge: não autorizados.

Este documento define o contrato de produto, UX, acessibilidade e QA para os rails e coleções da Home. Ele não autoriza implementação. O objetivo é impedir que falha remota, vazio legítimo, conteúdo editorial, conteúdo personalizado e hidratação global sejam tratados como o mesmo estado.

---

## 1. Escopo

Incluído:

1. categorias;
2. Destaques para você;
3. Vídeos de profissionais;
4. Publicações em destaque;
5. Mais anúncios;
6. Profissionais em destaque;
7. Seus favoritos;
8. contratos legados de `recommended-services`;
9. skeleton global da Home;
10. estados localizados de cada coleção;
11. scroll horizontal e setas;
12. progressive reveal de Mais anúncios;
13. carregamento de mídia;
14. retry localizado;
15. comportamento offline;
16. navegação direta versus stable-shell router;
17. refresh/revalidação de dados;
18. critérios de foco, teclado e leitores de tela.

Fora do escopo:

1. alterar ranking ou catálogo;
2. criar autoridade remota para workers, publicações ou profissionais;
3. substituir fixtures por dados reais;
4. alterar RLS, migrations, Edge Functions ou Supabase;
5. redesenhar cards;
6. implementar filtros da Home;
7. alterar favoritos;
8. modificar o baseline visual aprovado;
9. adicionar telemetria;
10. acessar staging ou produção.

---

## 2. Princípio central

A Home não é uma única lista. Ela é uma composição de superfícies com autoridades diferentes.

```text
HomeExperience
├── navegação estática
├── catálogo canônico
├── conteúdo editorial local
├── conteúdo personalizado autenticado
└── fixtures de demonstração
```

Consequentemente:

- a falha de um rail não deve derrubar todos os outros;
- um vazio remoto não deve apagar conteúdo editorial válido;
- fixtures não devem ser apresentadas como catálogo canônico;
- uma seção oculta por regra de produto não é igual a uma seção vazia;
- um erro não pode ser convertido silenciosamente em “nenhum conteúdo”;
- o skeleton global não pode ser a única representação de loading para todas as atualizações futuras.

---

## 3. Autoridades observadas

| Superfície | Conteúdo atual | Autoridade observada | Natureza |
|---|---|---|---|
| Categorias | links estáticos | `index.html` | navegação editorial estática |
| Destaques | primeiros 6 serviços ativos | `home/public-services.js` + catálogo canônico | remoto canônico |
| Workers | 6 cards e previews locais | `index.html` + `home/workers.js` | demonstração editorial local |
| Publicações | cards e previews locais | `index.html` + `home/before-after.js` | demonstração editorial local |
| Mais anúncios | serviços após os 6 primeiros | `home/public-services.js` | remoto canônico |
| Profissionais | 4 cards estáticos | `index.html` | demonstração editorial local |
| Favoritos | favoritos do usuário cruzados com catálogo | `home/favorites-surface.js` | personalizado autenticado + remoto |
| Estado geral da Home | orquestração de services/workers/publications | `index-data-controller.js` | coordenação estrutural |
| Estado de lista | hide/show de list/loading/empty/error | `core/list-state.js` | componente de estado |
| Setas e scroll | `scrollBy` por clique | `home.js` | interação local |
| Progressive reveal | 6 iniciais + 3 por clique | `home.js` | paginação visual local |

### 3.1 Regra de honestidade

A interface deve declarar internamente, e refletir visualmente quando necessário, qual tipo de autoridade sustenta cada rail:

```text
CANONICAL_REMOTE
EDITORIAL_LOCAL
PERSONALIZED_REMOTE
STATIC_NAVIGATION
DEMO_FIXTURE
```

Nenhum rail `DEMO_FIXTURE` pode usar linguagem que implique:

- cobertura total da plataforma;
- atualização em tempo real;
- métricas canônicas;
- disponibilidade real;
- personalização baseada no usuário;
- ranking oficial.

---

## 4. Inventário detalhado

### 4.1 Categorias

Estado atual observado:

- conteúdo estático presente no HTML;
- links navegam para Resultados;
- track horizontal possui botões anterior/próximo;
- controller apenas executa `scrollBy(...)`;
- não existe sincronização observada de `disabled`, `hidden` ou estado de borda.

Autoridade:

- `index.html` para itens;
- `home.js` para scroll.

Estados necessários:

- `READY_FITS` — todos os itens cabem;
- `READY_OVERFLOW_START` — existe conteúdo à direita;
- `READY_OVERFLOW_MIDDLE` — existe conteúdo dos dois lados;
- `READY_OVERFLOW_END` — existe conteúdo à esquerda;
- `MEDIA_PENDING` — ícones ainda não materializados;
- `MEDIA_DEGRADED` — ícones falharam, labels continuam utilizáveis.

Categorias não devem entrar em `EMPTY` por falha do catálogo remoto.

### 4.2 Destaques para você

Estado atual observado:

- recebe `services.slice(0, 6)`;
- a lista é limpa e reconstruída a cada render;
- um empty customizado existe;
- o estado geral usa `data.services.length` para decidir ready/empty;
- não existe estado de erro localizado no markup observado;
- a falha da consulta pode chegar como array vazio.

Autoridade:

- catálogo remoto canônico.

Estados necessários:

- `INITIAL_LOADING`;
- `READY`;
- `EMPTY_CATALOG`;
- `ERROR`;
- `REFRESHING_WITH_CONTENT`;
- `STALE_WITH_WARNING`;
- `RETRYING`.

### 4.3 Vídeos de profissionais

Estado atual observado:

- seis cards existem estaticamente no HTML;
- posters, vídeos e preview são hidratados por `home/workers.js`;
- o conteúdo não depende do array remoto `data.workers` para existir;
- `index-data-controller.js`, contudo, define o estado do rail a partir de `data.workers.length`;
- `list-state.js` oculta a lista quando recebe `empty`.

Autoridade:

- cards e metadados: editorial local/demo;
- mídia: assets locais e posters externos;
- array `data.workers`: não é a autoridade dos cards atuais.

Estados necessários:

- `EDITORIAL_READY`;
- `MEDIA_LOADING` por card;
- `MEDIA_READY` por card;
- `MEDIA_ERROR` por card;
- `PREVIEW_UNAVAILABLE` com card ainda navegável;
- `OVERLAY_ERROR` localizado;
- `REMOTE_ENRICHMENT_UNAVAILABLE`, sem esconder fixtures.

### 4.4 Publicações em destaque

Estado atual observado:

- cards existem estaticamente no HTML;
- previews e estados de interação são locais;
- likes, comentários e saves são fixtures/localStorage;
- `index-data-controller.js` usa `data.publications.length` para definir ready/empty;
- `list-state.js` pode ocultar a lista ao receber `empty`.

Autoridade:

- editorial local/demo.

Estados necessários:

- `EDITORIAL_READY`;
- `MEDIA_LOADING` por card;
- `MEDIA_ERROR` por card;
- `PREVIEW_READY`;
- `PREVIEW_ERROR`;
- `LOCAL_STATE_UNAVAILABLE` sem quebrar abertura;
- `REMOTE_ENRICHMENT_UNAVAILABLE` sem esconder cards.

### 4.5 Mais anúncios

Estado atual observado:

- recebe `services.slice(6)`;
- a seção inteira é ocultada quando há 6 serviços ou menos;
- `index-data-controller.js` define seu estado com base em `data.services.length`, não no tamanho da própria fatia;
- o progressive reveal mostra 6 cards e acrescenta 3 por clique;
- todo rerender reinicia `visibleCount` no limite inicial;
- o botão “Carregar mais” é paginação visual de itens já carregados, não consulta remota;
- mini-tabs mudam somente classes/`aria-pressed`;
- filtros da Home mudam estado visual;
- o botão “Aplicar filtros” apenas fecha o painel.

Autoridade:

- catálogo remoto para cards;
- controller local para reveal;
- tabs/filtros atuais não possuem autoridade sobre a coleção.

Estados necessários:

- `HIDDEN_INSUFFICIENT_ITEMS` quando `services.length <= 6`;
- `READY_PARTIAL` quando existem cards ocultos pelo reveal;
- `READY_COMPLETE` quando todos foram revelados;
- `EMPTY_SLICE` quando a coleção existe, mas não há itens após os destaques;
- `ERROR` para falha do catálogo;
- `REFRESHING_WITH_CONTENT`;
- `FILTER_UNAVAILABLE` enquanto filtros não alterarem dados;
- `TAB_UNAVAILABLE` enquanto tabs não alterarem dados.

### 4.6 Profissionais em destaque

Estado atual observado:

- quatro cards estáticos no HTML;
- existe skeleton correspondente;
- a seção possui `data-home-hydration-ready`;
- não está incluída na matriz de estados do `index-data-controller.js`;
- não possui autoridade remota observada.

Autoridade:

- editorial local/demo.

Estados necessários:

- `EDITORIAL_READY`;
- `MEDIA_LOADING` por avatar;
- `MEDIA_ERROR` por avatar;
- `HIDDEN_BY_PRODUCT_DECISION` se a seção for removida futuramente.

A seção não deve depender da disponibilidade do catálogo de serviços para aparecer.

### 4.7 Seus favoritos

Estado atual observado:

- a seção é criada dinamicamente;
- permanece oculta para usuário anônimo;
- consulta favoritos e catálogo em paralelo;
- mostra até 6 cards;
- quando não existem favoritos, oculta a seção;
- quando ocorre erro, também oculta a seção;
- erro é emitido por evento, sem feedback visível localizado;
- não existe skeleton localizado observado;
- `renderPromise` é compartilhada entre renders.

Autoridade:

- sessão atual;
- controller canônico de favoritos;
- catálogo canônico de serviços.

Estados necessários:

- `ANONYMOUS_HIDDEN`;
- `AUTH_LOADING`;
- `READY`;
- `EMPTY_PERSONAL`;
- `ERROR_FAVORITES`;
- `ERROR_CATALOG`;
- `REFRESHING_WITH_CONTENT`;
- `STALE_WITH_WARNING`;
- `RETRYING`.

### 4.8 `recommended-services`

Estado atual observado:

- o audit histórico exige região e lista com esse nome;
- o controller inclui `recommended-services` na matriz de estados;
- `home/public-services.js` renderiza apenas `featured-services` e `more-services`;
- a autoridade visual atual da seção não foi comprovada durante esta inspeção.

Classificação:

- contrato legado ou superfície órfã pendente de decisão.

Decisão futura obrigatória:

1. confirmar que a seção ainda existe e definir renderer; ou
2. remover o contrato de audit/controller de maneira coordenada.

Não é aceitável manter uma superfície apenas para satisfazer tokens de auditoria.

---

## 5. Causas raiz encontradas

### 5.1 P0 — falha técnica convertida em vazio

O controller possui dois caminhos que capturam falhas e retornam arrays vazios:

1. falha/timeout do orquestrador → `{ services: [], workers: [], publications: [] }`;
2. falha do catálogo canônico → `[]`.

Como `Promise.all(...)` recebe valores resolvidos, o caminho final de `catch` não é acionado. A página pode concluir:

```text
falha de rede
→ arrays vazios
→ root empty
→ rails empty
→ usuário vê ausência de conteúdo
```

Isso elimina a diferença entre:

- catálogo legitimamente vazio;
- Supabase indisponível;
- timeout;
- dependência não carregada;
- erro de autorização;
- erro de transporte.

Contrato obrigatório futuro:

```text
Result<T> = { status, data, error, source, stale }
```

Nenhuma falha deve ser representada apenas por `[]`.

### 5.2 P0 — estado remoto pode esconder fixtures locais

Workers e Publicações possuem cards estáticos. Entretanto, o controller deriva seus estados de arrays remotos/orquestrados.

Quando `data.workers` ou `data.publications` é vazio:

```text
setRegionState(..., 'empty')
→ list-state esconde [data-list]
→ cards editoriais podem desaparecer
```

A autoridade de estado não corresponde à autoridade do conteúdo.

Contrato obrigatório futuro:

- conteúdo editorial local possui estado próprio;
- enriquecimento remoto possui estado secundário;
- falha do enriquecimento não esconde conteúdo local válido.

### 5.3 P0 — falsa affordance em Mais anúncios

As mini-tabs:

- alteram `is-active`;
- atualizam `aria-pressed`;
- não filtram, ordenam ou recarregam cards.

O painel de filtros:

- permite selecionar chips e selects;
- o botão Aplicar apenas fecha o painel;
- a coleção permanece a mesma.

A interface comunica uma ação de descoberta que não ocorre.

Contrato obrigatório futuro, escolher uma opção:

1. implementar autoridade real e resultado observável; ou
2. remover/desabilitar os controles com explicação; ou
3. transformar em atalhos explícitos para Resultados com URL canônica.

É proibido manter controles selecionáveis sem efeito de produto.

### 5.4 P0 — estado de Mais anúncios usa o total errado

A existência do rail depende de:

```text
moreItems = services.slice(6)
```

Mas o controller usa:

```text
services.length ? ready : empty
```

Com 1 a 6 serviços:

- Destaques possui itens;
- Mais anúncios possui zero itens;
- renderer oculta a seção;
- controller registra a região como ready.

Contrato obrigatório futuro:

```text
featuredCount = min(serviceCount, 6)
moreCount = max(serviceCount - 6, 0)
```

Cada rail deve receber estado derivado da coleção que realmente renderiza.

### 5.5 P0 — favoritos confundem vazio e erro

Em favoritos:

- zero favoritos → seção escondida;
- falha do controller → seção escondida;
- falha do catálogo → seção escondida.

Para o usuário autenticado, os três resultados são visualmente idêntnticos.

Contrato obrigatório futuro:

- vazio pessoal pode ocultar ou mostrar onboarding leve conforme decisão de produto;
- erro deve preservar o título/slot ou mostrar feedback localizado;
- refresh não deve remover cards existentes antes de confirmar nova resposta;
- retry deve existir quando seguro.

### 5.6 P1 — setas não representam capacidade real de scroll

O binder observado apenas executa `scrollBy(...)` no clique. Não há sincronização observada com:

- `scrollLeft`;
- `scrollWidth`;
- `clientWidth`;
- início/fim;
- resize;
- conteúdo inserido após render;
- mudança de fonte ou imagem;
- alteração de breakpoint.

Resultado possível:

- seta anterior acionável no início;
- seta próxima acionável no fim;
- setas visíveis quando tudo cabe;
- estado incorreto após hidratação.

### 5.7 P1 — progressive reveal reinicia após rerender

Toda execução de `initMoreServicesProgressiveReveal()`:

- aborta o controller anterior;
- captura novamente os cards;
- redefine `visibleCount` para 6.

Após revalidação/favorito/evento de serviço, o usuário pode perder o estado de expansão.

Contrato futuro:

- preservar visible count por fingerprint da coleção quando razoável;
- não reduzir abruptamente cards já revelados;
- resetar somente quando query/filtro/coleção semanticamente mudar;
- preservar posição de scroll.

### 5.8 P1 — Carregar mais não comunica atualização

O botão apenas revela nós já existentes.

Faltam critérios explícitos para:

- foco após revelar;
- `aria-live` com quantidade adicionada;
- estado final;
- ocultação do host;
- comportamento com 0, 1 ou 2 itens adicionais;
- viewport e scroll;
- redução de movimento.

### 5.9 P1 — skeleton global não substitui estados locais

A Home possui skeleton de página inteira. Ele é adequado para a primeira montagem, porém não para:

- refresh de um único rail;
- favoritos após autenticação;
- retry localizado;
- revalidação em segundo plano;
- falha de mídia;
- progressive reveal.

Contrato futuro:

- primeira carga pode usar skeleton global;
- atualizações posteriores usam estado local;
- conteúdo existente permanece durante refresh;
- skeleton local não deve substituir conteúdo stale utilizável.

### 5.10 P1 — resultado registra contagem antes de calculá-la

No controller, o objeto `result` é criado usando `renderedServiceCount` antes da atribuição que executa o renderer.

Por hoisting de `var`, o campo pode ficar `undefined` mesmo quando serviços foram renderizados.

Impacto:

- evidência/eventos podem transportar contagem incorreta;
- consumidores futuros podem decidir estado com dado inválido.

Contrato futuro:

1. renderizar;
2. capturar contagem;
3. criar payload;
4. emitir evento.

### 5.11 P1 — profissionais não participam do estado estrutural

A seção possui skeleton e `data-home-hydration-ready`, mas não aparece na matriz de `updateListHooks` ou de estados do controller.

Isso cria uma superfície com:

- markup de lista;
- skeleton;
- conteúdo estático;
- nenhuma autoridade de estado formal.

A decisão futura deve declarar profissionais como editorial local ou adicionar autoridade real.

---

## 6. Modelo de estado composto

Cada rail deve possuir estado independente.

```text
HomeRailState
├── identity
├── authority
├── dataState
├── mediaState
├── interactionState
├── visibilityState
└── freshnessState
```

### 6.1 `dataState`

Valores permitidos:

- `idle`;
- `loading`;
- `ready`;
- `empty`;
- `error`;
- `retrying`.

### 6.2 `mediaState`

- `not-applicable`;
- `pending`;
- `ready`;
- `partial-error`;
- `error`.

### 6.3 `interactionState`

- `disabled`;
- `ready`;
- `busy`;
- `degraded`.

### 6.4 `visibilityState`

- `visible`;
- `hidden-anonymous`;
- `hidden-insufficient-items`;
- `hidden-product-rule`;
- `collapsed`.

### 6.5 `freshnessState`

- `fresh`;
- `stale`;
- `refreshing`;
- `unknown`.

Uma string genérica `data-state="ready"` não substitui essas dimensões quando elas divergem.

---

## 7. Política de criticidade

### 7.1 Superfícies críticas para primeira revelação

- shell;
- busca principal;
- categorias;
- pelo menos uma superfície principal utilizável.

### 7.2 Superfícies não críticas

- favoritos;
- previews de workers;
- previews de publicações;
- avatares de profissionais;
- progressive reveal;
- controles de scroll.

Falha de superfície não crítica:

- não bloqueia a Home inteira;
- não mantém skeleton global indefinidamente;
- não transforma root em error;
- recebe fallback localizado.

### 7.3 Regra de revelação

A Home pode ser revelada quando:

```text
shellReady && searchReady && navigationReady && criticalContentSettled
```

`criticalContentSettled` aceita:

- conteúdo;
- vazio legítimo;
- erro localizado explícito.

Não aceita timeout silenciosamente convertido em vazio.

---

## 8. Contrato por estado

### 8.1 Loading inicial

- skeleton preserva geometria aproximada;
- títulos não piscam entre skeleton e conteúdo;
- shell e busca permanecem estáveis;
- região usa `aria-busy="true"`;
- skeleton é `aria-hidden="true"`;
- mensagem de loading não é repetida por cada card.

### 8.2 Ready

- lista visível;
- loading/empty/error ocultos;
- `aria-busy="false"`;
- controles de scroll sincronizados;
- mídia pode continuar carregando por card;
- contagem reflete itens realmente renderizados.

### 8.3 Empty legítimo

Um rail só pode entrar em empty quando a autoridade respondeu com sucesso e a coleção derivada possui zero itens.

Exemplos:

- catálogo retornou zero serviços ativos;
- usuário autenticado possui zero favoritos;
- fatia após os seis destaques possui zero itens.

Empty não pode representar:

- timeout;
- SDK ausente;
- erro de rede;
- erro de autorização;
- renderer ausente;
- fixture local não consultada.

### 8.4 Error

- mensagem localizada;
- rail não derruba a página;
- retry específico quando seguro;
- conteúdo stale é preservado quando disponível;
- erro não é comunicado apenas por cor;
- CTA principal do restante da Home continua funcional.

### 8.5 Refreshing

- cards existentes permanecem;
- `aria-busy="true"` no rail;
- indicador discreto, sem skeleton completo;
- nova resposta só substitui conteúdo se for aceita;
- falha mantém stale e mostra aviso localizado.

### 8.6 Hidden por regra

Usar `hidden-*` quando ausência da seção é decisão de produto, por exemplo:

- favoritos para anônimo;
- Mais anúncios com até 6 serviços.

Não usar `empty` para esses casos.

---

## 9. Contrato de scroll rail

### 9.1 Fonte de verdade

```text
canScrollPrevious = scrollLeft > epsilon
canScrollNext = scrollLeft + clientWidth < scrollWidth - epsilon
hasOverflow = scrollWidth > clientWidth + epsilon
```

`epsilon` deve tolerar arredondamento subpixel.

### 9.2 Estado das setas

Quando não há overflow:

- ocultar ambas ou removê-las da tab order;
- não manter botão sem efeito.

No início:

- anterior desabilitada/oculta;
- próxima habilitada quando há overflow.

No meio:

- ambas habilitadas.

No fim:

- próxima desabilitada/oculta;
- anterior habilitada.

### 9.3 Eventos que exigem ressincronização

- `scroll`;
- `resize`;
- `ResizeObserver` no track;
- inserção/remoção de cards;
- carregamento de imagem que altera largura;
- mudança de breakpoint;
- mudança de fonte;
- route swap;
- hidratação;
- revalidação.

### 9.4 Movimento

- distância baseada em card completo + gap, não apenas percentual arbitrário;
- respeitar `prefers-reduced-motion`;
- evitar deixar card cortado quando snap for esperado;
- toque/trackpad continuam nativos;
- setas não devem sequestrar scroll vertical.

### 9.5 Acessibilidade

- labels específicos por rail;
- `disabled` real quando indisponível;
- foco visível;
- track com nome acessível quando necessário;
- não implementar roving tabindex nos cards sem necessidade;
- links e botões internos continuam navegáveis.

---

## 10. Contrato de mídia por card

### 10.1 Imagem

- reservar dimensão;
- `object-fit` canônico;
- alt coerente com função;
- imagem decorativa usa alt vazio;
- falha usa fallback visual sem remover título/CTA;
- card permanece utilizável.

### 10.2 Vídeo

- poster primeiro;
- vídeo só carrega quando necessário;
- autoplay nunca com som;
- falha de playback não abre erro global;
- card ainda abre preview ou destino alternativo;
- tempo salvo não é requisito para mostrar o card.

### 10.3 Avatar

- fallback para iniciais;
- erro não colapsa layout;
- dimensões reservadas;
- nome continua disponível em texto.

---

## 11. Contrato de Mais anúncios

### 11.1 Coleção

```text
allServices
featuredServices = first 6
moreServices = remaining
visibleMoreServices = first visibleCount of moreServices
```

### 11.2 Progressive reveal

- limite inicial: decisão de viewport/produto;
- passo: quantidade consistente com grid;
- botão informa ação e quantidade quando possível;
- após revelar, anunciar “mais N anúncios exibidos” em região polite;
- foco permanece no botão, salvo decisão específica;
- botão some no fim;
- host não mantém espaço vazio;
- estado expandido preservado em refresh compatível.

### 11.3 Tabs

Cada tab precisa de uma destas implementações:

- filtro real;
- ordenação real;
- navegação para Resultados;
- disabled com explicação.

Não pode apenas mudar estilo.

### 11.4 Filtros

Aplicar deve produzir resultado observável:

- atualizar coleção local com contrato canônico; ou
- navegar para Resultados com parâmetros; ou
- executar nova consulta remota autorizada.

Fechar painel sem efeito não constitui aplicação.

### 11.5 Loading e erro

- não usar progressive reveal durante loading;
- erro do catálogo mostra estado localizado;
- refresh preserva cards;
- filter submit possui busy e prevenção de duplicidade;
- resposta obsoleta não altera cards.

---

## 12. Contrato de favoritos

### 12.1 Anônimo

Decisão atual aceitável:

- seção oculta.

Alternativa futura:

- bloco leve convidando a entrar, somente se aprovado pelo produto.

### 12.2 Autenticado loading

- slot pode aparecer com skeleton localizado;
- não mostrar contagem 0 como estado final durante loading;
- não remover cards anteriores em refresh.

### 12.3 Autenticado vazio

Opções permitidas:

1. ocultar seção; ou
2. estado educativo “Salve anúncios para encontrar depois”.

A escolha deve ser consistente entre Home e Meu Perfil.

### 12.4 Erro

- não confundir com vazio;
- mostrar retry localizado ou preservar stale;
- evento técnico sozinho não é feedback suficiente;
- falha do catálogo e falha do ledger podem ter códigos distintos.

### 12.5 Route swap

- render em andamento precisa validar que o surface atual ainda pertence à rota ativa;
- promise antiga não pode impedir boot da nova superfície;
- nós da rota anterior não podem receber cards após cleanup.

---

## 13. Offline

### Primeira carga offline sem cache

- categorias e conteúdo editorial local permanecem;
- catálogo canônico mostra erro/offline localizado;
- favoritos mostra offline localizado se usuário autenticado;
- Home não deve ficar totalmente vazia.

### Offline com cache/stale

- exibir conteúdo stale;
- sinal discreto de atualização indisponível;
- retry ao voltar online;
- não zerar coleções existentes.

### Retorno online

- revalidar rails remotos;
- manter scroll;
- evitar skeleton global;
- não duplicar cards;
- preservar expansão de Mais anúncios quando fingerprint compatível.

---

## 14. Acessibilidade

### Regiões

- cada seção com heading único;
- `aria-labelledby` aponta para heading existente;
- loading/empty/error não competem em `aria-live`;
- refresh usa `aria-busy` sem anúncio excessivo.

### Cards

- card inteiro não deve virar botão quando já contém links incompatíveis;
- previews com `role="button"` precisam de Enter e Space;
- foco visível;
- mídia decorativa não duplica nome acessível;
- ações internas possuem labels específicos.

### Empty/error

- mensagem textual;
- ação clara;
- retry com nome do rail;
- foco não salta automaticamente;
- esconder uma seção não move foco de elemento ativo.

### Scroll

- setas desabilitadas corretamente;
- rail continua navegável sem setas;
- teclado não fica preso;
- ordem DOM acompanha ordem visual.

---

## 15. Matriz de QA

### 15.1 Primeira carga

1. documento direto com rede normal;
2. F5;
3. navegação por stable-shell router;
4. cache quente;
5. cache frio;
6. Supabase lento;
7. SDK indisponível;
8. timeout do catálogo;
9. offline sem cache;
10. offline com cache.

### 15.2 Catálogo

1. 0 serviços;
2. 1 serviço;
3. 6 serviços;
4. 7 serviços;
5. 12 serviços;
6. 18 serviços;
7. serviço inativo misturado;
8. IDs duplicados;
9. card com mídia ausente;
10. card com texto extremo.

### 15.3 Destaques e Mais anúncios

1. contagens derivadas corretas;
2. Mais anúncios hidden com até 6;
3. progressive reveal com 7;
4. reveal com 8;
5. reveal com 9+;
6. refresh após revelar;
7. erro durante refresh;
8. evento service-created;
9. evento service-updated;
10. route swap após expansão.

### 15.4 Workers

1. fixtures visíveis com `data.workers=[]`;
2. poster carregado;
3. poster falha;
4. vídeo falha;
5. hover preview;
6. foco preview;
7. touch sem hover;
8. overlay abre;
9. overlay falha;
10. retorno de foco.

### 15.5 Publicações

1. fixtures visíveis com `data.publications=[]`;
2. imagem falha;
3. vídeo falha;
4. localStorage indisponível;
5. localStorage corrompido;
6. preview abre;
7. comentários locais;
8. route swap;
9. Escape;
10. retorno de foco.

### 15.6 Favoritos

1. anônimo;
2. autenticado com 0;
3. autenticado com 1;
4. autenticado com 6;
5. autenticado com mais de 6;
6. ledger falha;
7. catálogo falha;
8. ambos falham;
9. favorito alterado durante render;
10. logout durante render;
11. login após Home pronta;
12. retorno online.

### 15.7 Scroll rails

1. tudo cabe;
2. overflow pequeno;
3. início;
4. meio;
5. fim;
6. resize desktop→tablet;
7. tablet→mobile;
8. conteúdo inserido depois;
9. fonte carregada depois;
10. imagens alteram geometria;
11. reduced motion;
12. trackpad;
13. toque;
14. teclado.

### 15.8 Estados

Para cada rail:

1. loading;
2. ready;
3. empty legítimo;
4. error;
5. retrying;
6. refreshing com conteúdo;
7. stale;
8. hidden por regra;
9. media partial error;
10. route leaving.

### 15.9 Viewports

- 360 × 800;
- 390 × 844;
- 430 × 932;
- 768 × 1024;
- 960 × 900;
- 1024 × 768;
- 1180 × 820;
- 1440 × 900;
- 1920 × 1080.

---

## 16. Evidência mínima futura

Cada implementação deve produzir:

1. teste determinístico da máquina de estado;
2. teste de falha não convertida em empty;
3. teste de fixtures preservadas;
4. teste de contagem featured/more;
5. teste de scroll controls;
6. teste de retry localizado;
7. teste de stable-shell route swap;
8. screenshot antes/depois nos viewports críticos;
9. evidência de zero overflow horizontal;
10. `git diff --check`;
11. lista de arquivos tocados;
12. rollback documentado.

---

## 17. Handoffs recomendados

### HOME-UX-H01 — taxonomia de resultado do controller

Problema:

- falha é convertida em array vazio.

Autoridade provável:

- `assets/js/pages/index-data-controller.js`;
- `page-data-orchestrator` somente se necessário.

Critérios:

- success/empty/error distintos;
- timeout preserva erro;
- stale preservado;
- root não entra em empty por falha;
- testes de transporte invertido.

### HOME-UX-H02 — autoridade por rail

Problema:

- estado de workers/publications deriva de arrays que não sustentam os cards atuais.

Critérios:

- editorial local separado de enriquecimento remoto;
- fixtures não escondidas por array vazio;
- profissionais recebe ownership explícito;
- `recommended-services` resolvido ou removido.

### HOME-UX-H03 — estados localizados

Problema:

- markup não expõe loading/empty/error/retry consistente por rail.

Autoridade provável:

- componente compartilhado de estados;
- composição em Home.

Critérios:

- nós de estado por rail;
- mensagens específicas;
- retry seguro;
- stale preservado;
- sem duplicação de CSS.

### HOME-UX-H04 — scroll rail controller

Problema:

- setas não sincronizam overflow e bordas.

Critérios:

- `ResizeObserver`;
- scroll sync;
- disabled/hidden;
- reduced motion;
- card-step matemático;
- testes por breakpoint.

### HOME-UX-H05 — verdade funcional de tabs e filtros

Problema:

- controles mudam visual, mas não coleção.

Decisão necessária:

- implementar;
- navegar;
- ou remover/desabilitar.

Critérios:

- resultado observável;
- URL/estado canônicos;
- loading/error;
- nenhuma falsa seleção.

### HOME-UX-H06 — favoritos localizados

Problema:

- vazio e erro são indistinguíveis.

Critérios:

- estados separados;
- skeleton localizado;
- stale preservado;
- retry;
- route-generation guard;
- consistência com perfil.

### HOME-UX-H07 — progressive reveal acessível

Problema:

- expansão reinicia e não comunica novos itens.

Critérios:

- preservar expansão compatível;
- anunciar quantidade;
- host final oculto;
- foco/scroll preservados;
- testes 7/8/9/18 itens.

### HOME-UX-H08 — payload e contagens

Problema:

- `renderedServiceCount` pode ser emitido antes de calculado;
- estado de Mais anúncios usa total geral.

Critérios:

- ordem corrigida;
- contagens por fatia;
- payload de evento validado;
- testes de limites 0/1/6/7.

---

## 18. Arquivos permitidos em futuras branches

Somente após definição da causa raiz e em branch própria:

- `assets/js/pages/index-data-controller.js`;
- `assets/js/core/list-state.js` quando o contrato for realmente compartilhado;
- `assets/js/pages/home/public-services.js`;
- `assets/js/pages/home/favorites-surface.js`;
- `assets/js/pages/home.js`;
- `assets/js/pages/home/workers.js`;
- `assets/js/pages/home/before-after.js`;
- componente compartilhado de rail existente;
- componente compartilhado de state existente;
- testes e audits específicos;
- documentação/evidência.

---

## 19. Arquivos e estratégias proibidos como remendo

- esconder seção por CSS para mascarar erro;
- converter erro em `[]`;
- usar localStorage como autoridade de catálogo;
- duplicar cards;
- criar novo design system;
- adicionar `!important`;
- adicionar inline style como correção estrutural;
- reativar catálogo mock como fallback silencioso;
- misturar correção de rail com pagamentos, pedidos ou mensagens;
- alterar ranking;
- adicionar métricas falsas;
- apresentar fixtures como dados reais;
- mudar baseline visual sem aprovação.

---

## 20. Riscos de regressão

- skeleton global reaparecer em refresh parcial;
- Home permanecer hidden após route swap;
- cards editoriais desaparecerem;
- setas piscarem durante hidratação;
- ResizeObserver gerar loop;
- scroll resetar após render;
- favorite render antigo escrever na nova rota;
- load more reduzir itens após refresh;
- empty e error serem anunciados simultaneamente;
- tab visual continuar sem efeito;
- retry duplicar requisições;
- contagem divergir do DOM;
- mídia falhar e colapsar card;
- controles saírem da tab order incorretamente;
- conteúdo stale ser apagado antes da resposta.

---

## 21. Validação deste sublote

Executado:

- inspeção do head lógico final PAY-A14;
- comparação entre o head inicial e o head PAY-A14;
- confirmação de zero mudanças em Home/rails durante a deriva;
- inspeção de `index.html` relevante aos rails;
- inspeção de `assets/js/pages/home.js`;
- inspeção de `assets/js/pages/home/public-services.js`;
- inspeção de `assets/js/pages/home/favorites-surface.js`;
- inspeção de `assets/js/pages/home/workers.js`;
- inspeção de `assets/js/pages/home/before-after.js`;
- inspeção de `assets/js/pages/home/filters.js`;
- inspeção de `assets/js/pages/home/filter-route.js`;
- inspeção de `assets/js/pages/index-data-controller.js`;
- inspeção de `assets/js/core/list-state.js`;
- inspeção do audit do controller da Home;
- modelagem de estados e handoffs.

Não executado:

- alteração de runtime;
- servidor local;
- Playwright;
- screenshots;
- leitor de tela;
- validação em navegador;
- staging;
- produção.

Justificativa: este sublote é exclusivamente documental.

---

## 22. Resultado

`UX-FOUNDATION-004` estabelece seis decisões centrais:

1. cada rail possui estado independente;
2. erro não pode ser convertido em vazio;
3. conteúdo editorial local não depende de arrays remotos que não o alimentam;
4. tabs e filtros sem efeito são falsas affordances e devem ser implementados, redirecionados ou removidos;
5. setas precisam refletir capacidade real de scroll;
6. skeleton global atende somente a primeira montagem, não refreshs localizados.

---

## 23. Próximo sublote recomendado

`UX-FOUNDATION-005 — matriz canônica de cards e variantes permitidas`.

O próximo documento deverá definir:

- anatomia obrigatória por família;
- variantes de serviço, profissional, worker e publicação;
- preço fixo, orçamento e ausência de preço;
- mídia ausente;
- textos longos;
- badges permitidos;
- identidade e verificação;
- favorito e estados de ação;
- densidade Home versus Resultados;
- skeleton equivalente;
- CTAs;
- ownership CSS/JS;
- testes de regressão visual.
