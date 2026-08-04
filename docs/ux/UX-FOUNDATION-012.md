# UX-FOUNDATION-012 — Performance percebida, prioridade de recursos e estabilidade de hidratação

## Status

- Frente: `UX-FOUNDATION`
- Sublote: `012`
- Natureza: especificação de Produto, UX, performance percebida, arquitetura frontend e QA
- Branch: `ux/ux-foundation-001`
- Escopo desta entrega: documentação somente
- Runtime alterado: não
- HTML alterado: não
- CSS alterado: não
- JavaScript alterado: não
- Migrations alteradas: não
- Workflows alterados: não
- Staging acessado: não
- Produção acessada: não
- Merge autorizado: não
- Head lógico principal inspecionado: `09c7f60c3d3acac79d70d1ed1f330b1eb703db4e`
- Head UX anterior: `e23857d55744d96699096683697fc6508e88295c`
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-011`

---

## 1. Objetivo

Definir o contrato transversal de performance percebida da Doke para que o produto:

- apresente conteúdo útil o mais cedo possível;
- não use preloaders para esconder uma cadeia crítica excessiva;
- reserve geometria antes de carregar mídia e dados;
- priorize apenas os recursos que participam do primeiro viewport;
- não carregue módulos de outras rotas durante a Home sem necessidade demonstrada;
- não execute múltiplas autoridades de prefetch para a mesma intenção;
- respeite `saveData`, redes lentas e dispositivos com menor capacidade;
- mantenha shell, controles e conteúdo conhecido disponíveis durante revalidação;
- não converta inicialização JavaScript em skeleton de página;
- não mantenha o usuário em loading por dependências opcionais;
- trate timeout de hidratação sem produzir estado terminal incorreto;
- diferencie dado crítico, dado complementar e enriquecimento editorial;
- preserve o mesmo resultado entre carregamento direto, F5 e navegação interna;
- meça LCP, INP, CLS, long tasks, hidratação e transições de rota;
- possua budgets verificáveis, e não apenas limites que congelam a dívida atual;
- permita redução controlada de scripts, CSS e terceiros sem quebrar fluxos.

Este documento não implementa otimizações.

Ele define:

```text
qual recurso é crítico
quando deve ser carregado
quem pode aquecer uma rota
quando uma superfície pode ser revelada
como um timeout deve ser reconciliado
quais métricas bloqueiam regressões
```

---

## 2. Superfícies auditadas

A auditoria documental considerou principalmente:

- `index.html`;
- `resultados.html`;
- `mensagens.html`;
- `assets/js/core/document-preloader.js`;
- `assets/css/components/feedback/document-preloader.css`;
- `assets/js/core/page-hydration.js`;
- `assets/js/core/stable-shell-router.js`;
- `assets/js/core/navigation-prefetch.js`;
- `assets/js/pages/index-data-controller.js`;
- `assets/js/pages/home.js`;
- `assets/js/pages/home/workers.js`;
- `assets/js/components/public-service-card.js`;
- `assets/css/components/cards/ad-card.css`;
- `docs/LOADING-NAVIGATION-BASELINE.md`;
- `scripts/test-critical-media-first-paint-contract.js`;
- `scripts/audit-product-script-budget.js`;
- `package.json`;
- contratos anteriores de busca, cards, navegação, formulários, conteúdo, notificações, responsividade e acessibilidade.

A especificação se aplica também a:

- Detalhe do anúncio;
- Pedidos;
- Notificações;
- Comunidades;
- Carteira;
- Pagamento;
- Perfil;
- Configurações;
- onboarding;
- autenticação;
- áreas administrativas;
- drawers;
- modais;
- mídia curta;
- aplicativo futuro.

---

## 3. Estado positivo já existente

A Doke já possui decisões importantes que devem ser preservadas.

### 3.1 Baseline de loading reconhece categorias diferentes

`docs/LOADING-NAVIGATION-BASELINE.md` diferencia:

```text
document boot
route transition
guard pending
hard-load data miss
refresh/revalidation
mutation
empty/error
```

Essa separação é correta.

Regra preservada:

```text
JavaScript inicializando
≠
skeleton obrigatório
```

### 3.2 Preloader não possui duração mínima artificial

O preloader documental observado utiliza duração mínima igual a zero.

Isso evita manter uma tela artificialmente visível apenas para parecer consistente.

### 3.3 Navegação interna tenta preservar o shell

O stable-shell router:

- mantém o shell;
- busca o próximo documento;
- prepara estilos;
- carrega scripts faltantes;
- usa skeleton em rotas compatíveis;
- evita reproduzir o preloader documental;
- registra estados de transição;
- possui warmup por intenção.

A direção arquitetural é válida.

### 3.4 Existe contrato central de hidratação

`DokePageHydration` já separa:

- pending;
- skeleton;
- ready;
- empty;
- error;
- hard load;
- navegação interna;
- watchdog;
- revalidação.

Essa autoridade deve ser evoluída, não substituída por loaders locais.

### 3.5 Skeletons tentam preservar anatomia

Existem contratos específicos para:

- Home;
- Resultados;
- Pedidos;
- Mensagens;
- Pagamento;
- Carteira;
- Perfis;
- Detalhe.

A geometria de mídia do card canônico também é reservada por CSS.

### 3.6 Mídia abaixo da dobra já pode usar lazy loading

O renderer canônico de anúncios marca imagens e avatares com:

```text
loading="lazy"
```

A intenção está correta para recursos realmente abaixo da dobra.

### 3.7 Fontes possuem conexão antecipada

A Home já declara `preconnect` para:

```text
fonts.googleapis.com
fonts.gstatic.com
```

A URL observada também solicita `display=swap`.

### 3.8 Há redução de movimento em alguns componentes

Skeletons e preloaders possuem tratamento parcial de:

```text
prefers-reduced-motion: reduce
```

### 3.9 Existe inventário estático de scripts

O repositório já possui auditorias para:

- inventário;
- ownership;
- dependências;
- budgets;
- redução segura;
- versionamento.

Esses ativos devem alimentar o gate de performance real.

---

## 4. Causa raiz

A causa raiz não é uma imagem isolada ou uma página lenta.

A causa raiz é a ausência de uma autoridade única que coordene:

```text
critical path
+
route manifest
+
third-party gate
+
prefetch policy
+
media priority
+
hydration settlement
+
performance telemetry
+
regression budgets
```

Hoje o produto combina:

```text
preloader documental
+
skeleton de página
+
watchdog de hidratação
+
route settlement timeout
+
duas autoridades de prefetch
+
muitos scripts por página
+
terceiros carregados antecipadamente
+
cache e fresh fetch concorrentes
+
otimização de imagem depois do load
```

Isso pode produzir uma interface aparentemente protegida contra flashes, mas com custo real alto antes de o usuário receber conteúdo útil.

O problema central pode ser resumido assim:

```text
a Doke possui várias proteções contra loading ruim,
mas ainda não possui uma autoridade para reduzir o trabalho necessário antes do ready
```

---

## 5. Inventário observado na Home

### 5.1 Volume de scripts

O `index.html` observado contém:

```text
68 referências externas de script
```

Dentro desse conjunto, aproximadamente:

```text
23 scripts externos são carregados sem defer ou async
```

Também existem:

- scripts inline;
- um SDK Supabase criado dinamicamente;
- Lucide remoto;
- módulos que pertencem a outras rotas;
- múltiplas autoridades de shell e interação mobile.

O fato de os scripts síncronos estarem no fim do `body` reduz bloqueio do HTML acima deles, mas não elimina:

- serialização de downloads;
- parse e compilação;
- execução no main thread;
- atraso de `DOMContentLoaded`;
- atraso da hidratação;
- atraso dos listeners essenciais;
- competição por rede com mídia e dados.

### 5.2 Módulo de Resultados carregado na Home

A Home carrega diretamente:

```text
assets/js/pages/search-results.js
```

Mesmo que o arquivo possua guards internos, o navegador ainda pode:

- baixar;
- analisar;
- compilar;
- executar bootstrap parcial.

Regra futura:

```text
módulo específico de rota
→ carregado apenas pela rota proprietária
```

Exceções exigirão justificativa documentada no route manifest.

### 5.3 Lucide remoto e não fixado

A Home inclui:

```text
https://unpkg.com/lucide@latest
```

Problemas:

- terceiro parser-blocking;
- versão mutável;
- cache e payload imprevisíveis;
- indisponibilidade externa afetando boot;
- risco de mudança sem revisão do repositório;
- chamada imediata de `createIcons()`.

Contrato futuro:

- usar bundle local ou versão exata;
- carregar de forma não bloqueante;
- limitar ícones ao conjunto utilizado;
- não depender de `@latest` em runtime operacional.

### 5.4 Supabase carregado antecipadamente

A Home cria o script de Supabase dinamicamente e imediatamente.

O carregamento ocorre antes de a necessidade real da rota ser resolvida.

Contrato futuro:

```text
configuração desabilitada
→ não requisitar SDK

rota sem capacidade remota necessária
→ não requisitar SDK

capacidade necessária
→ carregar uma vez com Promise compartilhada
```

### 5.5 Cadeias síncronas no fim do documento

Foram observados grupos síncronos para:

- repositories;
- services;
- favoritos;
- cards;
- Home;
- filtros;
- busca;
- Workers;
- Resultados;
- guards responsivos;
- drawers;
- overlays mobile.

A implementação futura deverá classificar cada módulo como:

```text
BOOT_CRITICAL
ROUTE_CRITICAL
INTERACTION_DEFERRED
IDLE_OPTIONAL
THIRD_PARTY_ON_DEMAND
```

---

## 6. Preloader documental

### 6.1 Comportamento observado

O preloader:

- cobre todo o viewport;
- bloqueia pointer events;
- espera estilos pendentes;
- espera `document.fonts.ready` com timeout;
- espera duas animações de frame;
- inicia saída de 180 ms;
- possui fallback JavaScript de 2.200 ms;
- possui failsafe CSS de 4.000 ms.

### 6.2 Problema de autoridade dupla

Existem dois limites diferentes:

```text
JavaScript → 2.200 ms
CSS        → 4.000 ms
```

Eles podem divergir quando:

- o JavaScript falha;
- o script é atrasado;
- o CSS chega antes do runtime;
- uma rota inclui versões diferentes do asset;
- uma classe de operação remove a animação CSS.

### 6.3 Espera ampla demais

O preloader espera todos os links `rel="stylesheet"` que ainda não possuam `sheet`.

Isso inclui potencialmente:

- CSS crítico;
- CSS de componente abaixo da dobra;
- CSS de overlay ainda fechado;
- CSS de rota não necessário ao primeiro viewport;
- folhas remotas de fonte.

Regra futura:

```text
preloader documental
→ nunca esperar todo o CSS da página
```

Ele só poderá depender do shell crítico explicitamente marcado.

### 6.4 Espera por todas as fontes

O preloader aguarda `document.fonts.ready` até 480 ms.

Isso pode atrasar conteúdo útil mesmo quando:

- a fonte de sistema já permitiria leitura;
- `font-display: swap` estiver ativo;
- uma família abaixo da dobra ainda estiver pendente.

Contrato:

```text
fonte não pode bloquear a revelação do shell
```

### 6.5 Preloader pode se tornar o maior elemento pintado

Uma superfície central grande com logo pode competir como candidato de LCP.

Mesmo quando a métrica final muda depois, o usuário percebe:

```text
marca
→ fade
→ skeleton
→ conteúdo
```

Isso cria múltiplos estágios visuais antes do valor real.

### 6.6 Contrato futuro do document boot

O boot deverá revelar no primeiro paint possível:

- background do produto;
- shell estável;
- heading da rota;
- busca ou ação principal;
- skeleton apenas nas regiões remotas.

O preloader integral deverá ser reservado a situações em que:

- o shell não possa ser pintado com segurança;
- exista guard de segurança pré-paint;
- o período esperado seja curto;
- não haja conteúdo estático útil que possa aparecer.

### 6.7 Regra de encerramento

O preloader deverá encerrar por uma única autoridade:

```text
CRITICAL_SHELL_PAINTED
```

Não por:

```text
todas as fontes prontas
+
todos os estilos prontos
+
todos os dados prontos
```

---

## 7. Hidratação e corrida de timeout

### 7.1 Watchdogs observados

`DokePageHydration` possui:

```text
DEFAULT_MAX_DURATION = 8.000 ms
```

A Home configura:

```text
maxDuration = 9.000 ms
```

O stable-shell router também possui:

```text
ROUTE_SETTLEMENT_TIMEOUT_MS = 9.000 ms
```

### 7.2 Caminho autoritativo da Home

A Home pode executar:

```text
esperar SDK Supabase → até 5.200 ms
consultar catálogo   → até 5.200 ms adicionais
```

Esse caminho é sequencial.

Limite teórico observado:

```text
até aproximadamente 10.400 ms
```

antes de considerar o trabalho restante.

### 7.3 Corrida material

O watchdog da página pode publicar erro em 9 segundos enquanto a Promise do catálogo ainda está pendente.

Depois, a resposta tardia pode:

- renderizar cards;
- publicar `doke:index-data-ready`;
- tentar chamar `pageHydration.ready()`;
- encontrar a hidratação já terminal em `error`.

Resultado possível:

```text
conteúdo válido no DOM
+
estado de erro ainda ativo
```

ou:

```text
erro visual
→ troca tardia não determinística
```

### 7.4 Contrato de timeout

Timeout de hidratação não será automaticamente terminal.

Estados futuros:

```text
HYDRATING
SLOW
DEGRADED_READY
ERROR_CONFIRMED
READY
EMPTY
```

Regra:

```text
timeout local
≠
falha confirmada da fonte
```

### 7.5 Settlement token

Cada ciclo deverá possuir:

```text
hydrationId
routeEntryKey
dataFingerprint
startedAt
latestAllowedCommit
```

Resposta tardia só poderá alterar a superfície quando ainda pertencer ao ciclo atual.

### 7.6 Uma única autoridade de ready

Nenhuma página poderá possuir simultaneamente:

- ready do controller;
- ready do orchestrator;
- ready do skeleton;
- ready do preloader;
- ready do stable shell;

sem uma composição central.

O estado público deverá ser derivado por:

```text
Doke.performanceExperience.settleRoute()
```

---

## 8. Duplicidade de carga de dados na Home

### 8.1 Dois caminhos de catálogo

A Home solicita dados por:

```text
pageDataOrchestrator.getPageData()
```

E, em paralelo, por:

```text
loadAuthoritativeServices()
```

Depois, os serviços autoritativos sobrescrevem os serviços do orchestrator.

### 8.2 Cache invalidado antes da consulta

O caminho autoritativo chama:

```text
repository.clearCache()
```

E solicita:

```text
fresh: true
```

Isso reduz o benefício de:

- cache local;
- stale-while-revalidate;
- carregamento instantâneo com conteúdo conhecido;
- deduplicação do orchestrator.

### 8.3 Cache detectado, mas não usado como first render explícito

O controller verifica `peekPageData()` para escolher entre:

```text
loading
refreshing
```

Porém, o payload em cache não é renderizado explicitamente nessa etapa pelo controller auditado.

### 8.4 Contrato de dados

A Home deverá possuir um único pipeline:

```text
cache válido
→ render imediato
→ revalidação em background

cache ausente
→ skeleton regional
→ uma requisição canônica

fonte complementar
→ enriquecer região própria
```

### 8.5 Serviços, Workers e Publicações são dependências diferentes

O ready da Home não deverá depender de todas as coleções.

Proposta:

```text
HOME_CORE_READY
- shell
- busca
- categorias
- primeiro rail de serviços

HOME_ENRICHED_READY
- Workers
- Publicações
- profissionais
- favoritos
```

Uma falha de Workers não poderá atrasar anúncios úteis.

---

## 9. Prefetch concorrente

### 9.1 Autoridade 1 — navigation-prefetch

`navigation-prefetch.js`:

- usa `<link rel="prefetch" as="document">`;
- aquece por pointer, foco e touch;
- aquece até três rotas em idle;
- limita doze rotas totais;
- respeita `saveData`;
- evita redes `slow-2g` e `2g`.

### 9.2 Autoridade 2 — stable-shell router

O stable-shell router:

- faz `fetch()` do documento;
- cria preload de CSS;
- cria preload de scripts;
- aquece por pointerover, focusin e touchstart;
- agenda até oito rotas prioritárias;
- começa o warmup cerca de 350 ms após init;
- não demonstrou o mesmo gate de `saveData` na superfície auditada.

### 9.3 Duplicidade de intenção

Uma única interação pode disparar:

```text
link prefetch do documento
+
fetch do documento
+
preload de CSS
+
preload de scripts
```

### 9.4 Competição com LCP

Warmup iniciado cedo pode competir por:

- conexões;
- banda;
- cache;
- main thread;
- memória;
- prioridade de rede.

Isso é especialmente crítico antes de:

- LCP estabilizar;
- primeiro rail renderizar;
- sessão ser resolvida;
- SDK essencial concluir.

### 9.5 Autoridade única proposta

Somente:

```text
Doke.performanceExperience.routeWarmup
```

poderá aquecer rotas.

### 9.6 Política de rede

```text
saveData = true
→ nenhum warmup automático

slow-2g ou 2g
→ nenhum warmup automático

3g
→ apenas intenção forte

4g/Wi-Fi
→ intenção forte + idle limitado
```

### 9.7 Intenção forte

Considerar intenção forte:

- pointer permaneceu sobre link por limiar mínimo;
- foco chegou por teclado;
- touchstart em link navegável;
- rota é próxima etapa confirmada de um fluxo.

### 9.8 Limites

Por documento:

```text
máximo 1 rota em warmup por intenção
máximo 2 rotas em idle
máximo 1 warmup concorrente de assets
```

### 9.9 Cancelamento

Warmups deverão usar `AbortController` quando:

- intenção mudar;
- navegação começar para outra rota;
- documento ficar oculto;
- conexão mudar para save-data;
- budget de rede for excedido.

---

## 10. Cache e memória do router

### 10.1 Maps persistentes

O stable-shell router mantém:

```text
routeCache
routeWarmCache
loadedScripts
```

### 10.2 Risco de crescimento

URLs com diferentes query strings podem criar novas entradas.

Exemplos:

```text
/resultados.html?q=pintura
/resultados.html?q=limpeza
/resultados.html?q=eletricista
```

Sem LRU e limite explícito, documentos parseados e Promises podem permanecer em memória durante toda a sessão.

### 10.3 Preload links persistentes

Os links com:

```text
data-doke-route-preload
```

são adicionados ao `head`.

Na superfície auditada, não foi observada uma política clara de remoção por:

- expiração;
- rota inválida;
- asset já consumido;
- budget máximo.

### 10.4 Contrato de cache

```text
HTML route cache → LRU limitado
warm cache       → TTL curto
preload hint     → remover depois de load/error/timeout
parsed document  → liberar após commit quando não reutilizável
```

Budgets iniciais propostos:

```text
máximo 6 documentos HTML
máximo 2 warmups pendentes
TTL de warmup: 30 s
máximo 20 hints transitórios
```

Os números deverão ser validados por memória real.

---

## 11. Política de imagens

### 11.1 Todas as imagens de cards dinâmicos são lazy

O renderer canônico define `loading="lazy"` para:

- imagem principal;
- avatar remoto.

Isso é correto para cards fora do primeiro viewport.

Porém, o primeiro card visível pode se tornar o LCP.

### 11.2 Contrato contextual

O renderer deverá aceitar:

```text
mediaPriority: critical | normal | deferred
```

Mapeamento:

```text
critical
→ loading="eager"
→ fetchpriority="high"
→ decoding="async"

normal
→ loading="lazy"
→ fetchpriority="auto"

deferred
→ criação somente próxima ao viewport
```

### 11.3 Apenas um candidato principal

Cada rota deverá selecionar no máximo:

```text
1 imagem LCP com prioridade alta
```

Não marcar todos os cards above-the-fold como high.

### 11.4 Geometria

Mesmo com altura CSS reservada, imagens deverão preferir:

- `width` e `height` conhecidos;
- `aspect-ratio` canônico;
- `object-fit`;
- placeholder de mesma geometria;
- `srcset`;
- `sizes`.

### 11.5 Otimização pós-load é tardia

`navigation-prefetch.js` tenta adicionar `loading="lazy"` a imagens depois do evento `load`.

Nesse momento, muitas imagens sem atributo já terão sido descobertas e solicitadas pelo preload scanner.

Regra:

```text
prioridade de imagem
→ definida na criação ou no HTML inicial
```

Nunca como correção principal depois de `load`.

### 11.6 Background images

O CSS de cards contém várias URLs remotas em `background-image`.

Backgrounds:

- não usam `loading="lazy"`;
- não possuem `fetchpriority` declarativo;
- podem ser solicitados quando a regra e o elemento participam do layout;
- são menos observáveis que `<img>`.

Contrato:

```text
mídia de conteúdo
→ <img> ou <picture>

decoração real
→ background-image
```

### 11.7 Terceiros de imagem

Foram observadas origens como:

- Pexels;
- Unsplash.

A política futura deverá definir:

- proxy/CDN próprio;
- formatos AVIF/WebP;
- tamanhos exatos;
- cache longo;
- fallback local;
- privacidade e disponibilidade.

---

## 12. Fontes

### 12.1 Política de first paint

Texto útil deverá aparecer com fallback de sistema caso Poppins ainda não esteja pronta.

### 12.2 Preloader não espera fontes

A fonte não poderá controlar o encerramento do boot.

### 12.3 Subsets

Solicitar apenas:

- pesos realmente usados;
- caracteres necessários;
- famílias necessárias à rota.

### 12.4 Métricas compatíveis

Usar fallback com métricas próximas e, quando necessário:

```text
size-adjust
ascent-override
descent-override
line-gap-override
```

para reduzir mudança de layout.

### 12.5 Auto-hospedagem

Avaliar fonte local versionada para:

- previsibilidade;
- privacidade;
- cache;
- disponibilidade;
- eliminação de cadeia CSS remota.

---

## 13. CSS crítico

### 13.1 Import dentro do CSS do preloader

`document-preloader.css` começa com `@import` de outro arquivo.

Isso cria uma cadeia adicional de descoberta.

Regra futura:

```text
CSS de first paint
→ sem @import
```

### 13.2 Route CSS

Cada rota deverá declarar:

```text
shellCriticalCss
routeCriticalCss
componentDeferredCss
```

### 13.3 Estilos de overlays fechados

CSS de overlays que começam fechados poderá ser carregado depois do conteúdo crítico, desde que:

- o primeiro acionamento aguarde preparação;
- não haja flash sem estilo;
- a ação possua resposta imediata.

### 13.4 CSS inativo do stable shell

O router desativa stylesheets anteriores com:

```text
media="not all"
```

A estratégia preserva cache, mas pode acumular folhas no documento.

Contrato:

- limitar folhas inativas;
- remover CSS não reutilizado após threshold;
- não reativar folha incompatível por chave ambígua;
- medir custo de style recalculation.

---

## 14. Scripts e main thread

### 14.1 Classificação obrigatória

Todo script ativo deverá constar no route manifest com uma classe:

```text
BOOT_CRITICAL
ROUTE_CRITICAL
INTERACTION_DEFERRED
IDLE_OPTIONAL
THIRD_PARTY_ON_DEMAND
```

### 14.2 BOOT_CRITICAL

Permitido somente para:

- prepaint guard realmente necessário;
- runtime config mínima;
- feature gate mínimo;
- shell state que previne layout incorreto.

### 14.3 ROUTE_CRITICAL

Necessário para:

- primeiro conteúdo útil;
- primeira ação principal;
- hidratação da rota.

### 14.4 INTERACTION_DEFERRED

Exemplos:

- comments sheet;
- share dialog;
- media lightbox;
- formulário secundário;
- menu avançado;
- upload;
- editor.

Carregar ao:

- idle seguro;
- aproximação do viewport;
- primeira intenção.

### 14.5 THIRD_PARTY_ON_DEMAND

Exemplos:

- SDK remoto;
- mapas;
- analytics;
- geração de ícones externa;
- upload provider.

### 14.6 Parse e execução

Budget não será medido apenas por quantidade de arquivos.

Métricas:

- bytes transferidos;
- bytes descompactados;
- parse;
- compile;
- execution;
- long tasks;
- listeners registrados;
- heap retido.

### 14.7 Módulos por rota

O stable-shell router poderá carregar módulos faltantes da rota, mas a página inicial não deve pré-carregar todas as rotas por segurança genérica.

---

## 15. Terceiros

### 15.1 Manifest obrigatório

Cada terceiro deverá declarar:

```text
provider
capability
owner
route
trigger
version
privacyClass
failureMode
fallback
budget
```

### 15.2 Fail-soft

Falha de terceiro não crítico não poderá impedir:

- shell;
- navegação;
- leitura;
- busca local;
- conteúdo já disponível.

### 15.3 Versão fixa

Proibido em runtime operacional:

```text
@latest
major-only sem lock
URL mutável sem integrity/version review
```

### 15.4 Consentimento e privacidade

Terceiros não essenciais serão carregados apenas depois de:

- necessidade funcional;
- consentimento, quando aplicável;
- autenticação, quando aplicável.

---

## 16. Modelo canônico de performance

Autoridade proposta:

```text
Doke.performanceExperience
```

### 16.1 Responsabilidades

```text
registerRouteManifest()
getRouteManifest()
mark()
measure()
observeVitals()
getNetworkPolicy()
scheduleCritical()
scheduleInteraction()
scheduleIdle()
selectCriticalMedia()
warmRoute()
cancelWarmup()
beginHydration()
settleHydration()
reportLongTask()
reportResourceBudget()
getSnapshot()
subscribe()
```

### 16.2 Snapshot

```js
{
  routeEntryKey,
  route,
  navigationMode,
  network: {
    effectiveType,
    saveData,
    downlink,
    rtt
  },
  milestones: {
    shellPaint,
    routeCommit,
    coreReady,
    enrichedReady,
    interactiveReady
  },
  vitals: {
    lcp,
    inp,
    cls,
    fcp,
    ttfb
  },
  resources: {
    criticalCount,
    deferredCount,
    thirdPartyCount,
    transferBytes
  },
  hydration: {
    id,
    state,
    duration,
    source,
    degraded
  }
}
```

### 16.3 Não controlar domínio

A autoridade de performance não decide:

- se pagamento foi confirmado;
- se pedido está concluído;
- se usuário possui permissão;
- se resultado está vazio;
- se dado remoto é canônico.

Ela coordena entrega e observabilidade.

---

## 17. Route manifest

Exemplo conceitual:

```js
{
  route: '/index.html',
  shellCritical: [
    'tokens.css',
    'app-shell.css',
    'home-critical.css'
  ],
  routeCritical: [
    'home-core.js',
    'public-service-card.js'
  ],
  interactionDeferred: [
    'workers-preview.js',
    'before-after-preview.js',
    'account-onboarding.js'
  ],
  idleOptional: [
    'navigation-warmup'
  ],
  thirdPartyOnDemand: [
    'supabase-sdk',
    'lucide-runtime'
  ],
  criticalData: [
    'services:first-page'
  ],
  enrichedData: [
    'workers',
    'publications',
    'favorites'
  ],
  criticalMediaSelector: '[data-home-primary-service] img'
}
```

### 17.1 Ownership

Cada asset deverá possuir um owner.

### 17.2 Ausência no manifest

Asset não registrado em uma rota será:

```text
bloqueado pelo gate
ou
classificado explicitamente como shared
```

### 17.3 Duplicidade

A mesma capacidade não poderá ser carregada por dois arquivos ativos sem contrato de compatibilidade temporário.

---

## 18. Milestones públicos

### 18.1 SHELL_PAINTED

Critérios:

- shell visível;
- heading visível;
- layout principal reservado;
- sem overlay de boot bloqueante.

### 18.2 CORE_READY

Critérios:

- ação principal disponível;
- primeira coleção útil pronta ou empty confirmado;
- erros críticos mapeados;
- foco e live region estáveis.

### 18.3 ENRICHED_READY

Critérios:

- regiões complementares resolvidas;
- favoritos reconciliados;
- conteúdo editorial carregado;
- mídia abaixo da dobra preparada.

### 18.4 INTERACTIVE_READY

Critérios:

- handlers essenciais ativos;
- nenhuma long task bloqueando interação;
- overlays principais carregáveis;
- route focus concluído.

### 18.5 Um único ready não é suficiente

A interface poderá estar útil antes de todas as regiões concluírem.

---

## 19. Budgets do projeto

Os valores abaixo são budgets de produto propostos.

Eles não constituem medição atual.

### 19.1 Field budgets p75

```text
LCP ≤ 2.500 ms
INP ≤ 200 ms
CLS ≤ 0,10
```

### 19.2 Lab budgets iniciais

```text
FCP ≤ 1.800 ms
TBT ≤ 200 ms
Speed Index ≤ 3.400 ms
```

### 19.3 Navegação interna

```text
resposta visual ao clique ≤ 100 ms
shell preservado sem flash
rota comum warm ≤ 500 ms
rota comum cold ≤ 1.200 ms
```

### 19.4 Hidratação

```text
CORE_READY hard load ≤ 2.500 ms em perfil de referência
CORE_READY internal warm ≤ 700 ms
região complementar não bloqueia core
```

### 19.5 Long tasks

```text
nenhuma task > 200 ms no boot comum
soma de tasks > 50 ms antes do core dentro do budget da rota
```

### 19.6 Scripts

Budgets serão por rota e por classe.

Exemplo inicial para Home:

```text
BOOT_CRITICAL external scripts ≤ 5
ROUTE_CRITICAL external scripts ≤ 12
THIRD_PARTY antes de CORE_READY ≤ 0, salvo exceção aprovada
```

Esses valores exigem plano de redução; não são descrição do estado atual.

### 19.7 CSS

```text
folhas críticas bloqueantes ≤ 3 agregações lógicas
sem @import no critical path
```

### 19.8 Mídia

```text
1 imagem high priority por rota
0 vídeos baixados antes de intenção/viewport
```

---

## 20. Budgets atuais não são metas de performance

`audit-product-script-budget.js` possui limites como:

```text
Mensagens: 54 scripts
Comunidade: 42 scripts
Pagamento: 45 scripts
```

O próprio arquivo declara que esses tetos são:

```text
regression guards da baseline atual
```

Logo:

```text
within-budget
≠
performático
```

O novo sistema deverá manter dois conceitos:

```text
DEBT_FREEZE_BUDGET
TARGET_PERFORMANCE_BUDGET
```

### 20.1 Debt freeze

Impede piorar a baseline atual.

### 20.2 Target budget

Define a redução necessária para a arquitetura desejada.

---

## 21. Instrumentação

### 21.1 Ausência observada

A busca documental não encontrou uma autoridade runtime baseada em:

```text
PerformanceObserver
```

para Core Web Vitals e long tasks.

### 21.2 Observadores necessários

```text
largest-contentful-paint
layout-shift
event
longtask
navigation
resource
paint
```

### 21.3 Privacidade

Telemetria não deverá incluir:

- texto de mensagem;
- query completa sensível;
- valor de pagamento ligado a identidade;
- conteúdo de contestação;
- CEP completo;
- nome;
- e-mail;
- IDs diretos desnecessários.

### 21.4 Amostragem

RUM deverá possuir:

- sampling configurável;
- buffer local limitado;
- envio assíncrono;
- fail-silent;
- opt-out/consentimento quando aplicável.

### 21.5 Correlação

Usar identificadores técnicos efêmeros:

```text
routeEntryKey
performanceSessionId
buildId
layoutMode
networkClass
```

---

## 22. CLS e estabilidade visual

### 22.1 Reservar geometria

Obrigatório para:

- imagens;
- avatares;
- cards;
- rails;
- banners;
- estados de erro;
- badges;
- botões com loading;
- fontes.

### 22.2 Não remover skeleton antes do conteúdo estar montado

Sequência correta:

```text
montar conteúdo fora do fluxo ou em fragment
→ medir/validar
→ commit atômico
→ ocultar skeleton
```

### 22.3 Não mostrar skeleton e conteúdo simultaneamente

O contrato existente permanece.

### 22.4 Botões

Loading não poderá mudar largura do CTA de forma relevante.

Usar:

- min-inline-size;
- label loading equivalente;
- spinner sem remover texto acessível;
- altura estável.

### 22.5 Status e badges

Reservar espaço quando o badge for esperado, mas não inventar valor.

---

## 23. INP e interação

### 23.1 Listeners globais

A arquitetura deverá reduzir:

- múltiplos listeners de click para a mesma superfície;
- listeners globais duplicados de resize;
- observers não desconectados;
- handlers por card quando delegação for segura.

### 23.2 Trabalho pesado

Parse, normalização e templates grandes deverão ser:

- divididos;
- adiados;
- executados por lote;
- movidos para worker quando materialmente útil.

### 23.3 Feedback imediato

Toda ação deve responder visualmente em até um frame razoável, sem afirmar sucesso prematuro.

Exemplo:

```text
clique
→ pending local imediato
→ comando
→ resultado da autoridade
```

### 23.4 Animações

Animações deverão usar propriedades compostáveis quando possível e respeitar reduced motion.

---

## 24. Skeletons e percepção

### 24.1 Skeleton só quando layout é conhecido

Não usar skeleton genérico para conteúdo de anatomia desconhecida.

### 24.2 Skeleton não pode durar indefinidamente

Após limiar de lentidão:

```text
skeleton
→ estado slow com mensagem regional
```

Sem converter automaticamente em erro.

### 24.3 Refresh mantém conteúdo

Durante SWR:

- manter cards;
- preservar scroll;
- preservar foco;
- não zerar contagem;
- não reabrir preloader;
- usar indicador regional discreto quando necessário.

### 24.4 Dados complementares

Workers e Publicações podem possuir seus próprios skeletons/estados sem bloquear anúncios.

---

## 25. Direct load, F5 e stable shell

Todos os modos deverão convergir para:

```text
mesmo conteúdo
mesma ordem
mesmo status
mesma prioridade de mídia
mesma semântica
```

Diferenças permitidas:

```text
hard load
→ shell critical + skeleton regional

internal warm
→ commit direto ou skeleton muito curto
```

Diferenças proibidas:

- F5 mostra fixture e navegação mostra remoto;
- rota interna omite CSS;
- preloader reaparece internamente;
- imagem crítica é lazy em um modo e high em outro sem justificativa;
- cache antigo vence intenção nova;
- resposta tardia de rota anterior altera rota atual.

---

## 26. Estados de rede

### 26.1 Online rápido

- critical path normal;
- warmup limitado;
- mídia high selecionada.

### 26.2 Online lento

- sem idle warmup;
- shell e conteúdo textual primeiro;
- mídia abaixo da dobra adiada;
- timeout vira slow, não erro imediato.

### 26.3 Offline com cache

- shell local;
- conteúdo stale explicitamente identificado;
- ações remotas fail-closed;
- retry quando conexão voltar.

### 26.4 Offline sem cache

- empty não deve ser usado;
- apresentar estado offline;
- manter navegação local possível.

### 26.5 Save Data

- sem autoplay;
- sem warmup automático;
- imagens reduzidas;
- Workers carregados por intenção;
- terceiros opcionais bloqueados.

---

## 27. Mídia curta e Workers

### 27.1 Estado positivo

Vídeos de preview são carregados apenas ao hover, pointer ou foco na implementação observada.

### 27.2 Ajuste necessário

O contrato de acessibilidade já proibiu autoplay disparado apenas por foco.

Performance e acessibilidade convergem:

```text
hover com pointer fino
→ pode preparar metadata

foco de teclado
→ não iniciar download pesado automaticamente

clique em reproduzir
→ carregar e tocar
```

### 27.3 Posters

Posters deverão:

- possuir tamanho adequado;
- usar CDN controlado;
- ser lazy fora do viewport;
- não baixar vídeo junto;
- preservar aspect ratio.

### 27.4 Feed completo

Abrir Worker não deverá criar todos os vídeos com `src` ativo.

Somente:

- item atual;
- próximo item, quando rede permitir.

---

## 28. Acessibilidade e performance

Performance não poderá ser melhorada por:

- remover labels;
- esconder headings;
- bloquear zoom;
- reduzir fonte abaixo do contrato;
- eliminar focus ring;
- não anunciar estado slow/error;
- retirar captions;
- desmontar conteúdo focado.

### 28.1 Live regions

Não anunciar cada etapa técnica.

Anunciar apenas:

- loading relevante prolongado;
- resultado disponível;
- erro confirmado;
- conteúdo atualizado quando material.

### 28.2 Focus

Commit atômico de rota deverá preservar ou mover foco conforme UX-006 e UX-011.

### 28.3 Reduced motion

Reduzir animação não deve manter preloader por quatro segundos.

---

## 29. Segurança e integridade

Performance não poderá:

- usar cache stale para conceder autoridade;
- pré-carregar dados protegidos antes de guard;
- expor conteúdo administrativo no HTML de warmup;
- transformar timeout em sucesso;
- executar ação em background sem intenção;
- carregar PSP antes de fluxo financeiro autorizado.

### 29.1 Prefetch de rota protegida

Somente depois de:

- sessão resolvida;
- permissão conhecida;
- rota permitida;
- política de privacidade aprovada.

### 29.2 Cache de documentos

Não reter HTML protegido depois de logout ou troca de conta.

---

## 30. QA de performance

### 30.1 Perfis mínimos

```text
Desktop rápido
Desktop CPU 4× slow
Mobile médio
Mobile CPU 6× slow
Fast 3G
Slow 3G
Offline
Save Data
```

### 30.2 Rotas

- Home;
- Resultados;
- Detalhe;
- Pedidos;
- Mensagens;
- Notificações;
- Carteira;
- Pagamento;
- Perfil;
- Comunidade.

### 30.3 Cenários

```text
hard load cache vazio
hard load cache quente
F5
navegação interna cold
navegação interna warm
Back
Forward
troca rápida de rota
abrir/fechar modal
scroll até mídia
login/logout
troca de conta
rede cai durante hidratação
resposta chega depois do watchdog
```

### 30.4 Evidências

- trace;
- filmstrip;
- waterfall;
- coverage JS/CSS;
- heap snapshot quando necessário;
- long tasks;
- Web Vitals;
- screenshots de milestones;
- lista de requests por origem.

### 30.5 Sem staging nesta etapa

Este documento não executou browser, Lighthouse, Playwright ou staging.

---

## 31. Gates automáticos

### 31.1 Static route manifest gate

Falhar quando:

- rota carrega script não registrado;
- terceiro usa versão mutável;
- script de outra rota entra no critical path;
- `@import` aparece no CSS crítico;
- mais de uma autoridade de prefetch está ativa.

### 31.2 Runtime budget gate

Falhar quando:

- LCP excede budget;
- CLS excede budget;
- INP/TBT excedem budget;
- request count crítico cresce;
- bytes críticos crescem sem aprovação;
- long task crítica aparece;
- warmup ocorre com saveData.

### 31.3 Hydration race gate

Teste obrigatório:

```text
watchdog dispara
→ resposta tardia chega
→ superfície não entra em estado contraditório
```

### 31.4 Route race gate

```text
rota A inicia
→ rota B vence
→ assets/dados de A não alteram B
```

### 31.5 Media gate

- apenas um `fetchpriority="high"` por rota;
- imagem LCP não pode ser lazy;
- imagens abaixo da dobra devem ser lazy;
- mídia precisa reservar geometria;
- vídeo não pode baixar antes do trigger permitido.

---

## 32. Achados classificados

### PERF-P0-01 — Cadeia de scripts excessiva na Home

A Home observada contém 68 scripts externos e aproximadamente 23 síncronos.

Risco:

- boot longo;
- main thread ocupado;
- hidratação atrasada;
- manutenção difícil.

### PERF-P0-02 — Corrida entre watchdog e catálogo autoritativo

O caminho pode ultrapassar o watchdog de 9 s.

Risco:

- erro terminal com resposta válida tardia;
- estado contraditório;
- conteúdo renderizado sob erro.

### PERF-P0-03 — Duplicidade de catálogo

Orchestrator e consulta autoritativa executam em paralelo, com override posterior.

Risco:

- requests duplicados;
- cache desperdiçado;
- ready atrasado.

### PERF-P0-04 — Duas autoridades de prefetch

Risco:

- download duplicado;
- competição com LCP;
- uso excessivo de dados;
- head poluído.

### PERF-P0-05 — Preloader espera recursos não críticos

Risco:

- conteúdo útil oculto;
- boot mascarado;
- LCP distorcido.

### PERF-P0-06 — Imagem LCP pode ser lazy

Renderer não recebe contexto de prioridade.

Risco:

- descoberta tardia da principal mídia.

### PERF-P1-01 — Lucide remoto `@latest`

Risco de performance, disponibilidade e reprodutibilidade.

### PERF-P1-02 — Supabase carregado imediatamente

Risco de terceiro antecipado mesmo sem necessidade.

### PERF-P1-03 — Otimização de imagens após `load`

A mutação pode ocorrer depois de os requests já terem iniciado.

### PERF-P1-04 — Route cache sem LRU explícito

Risco de crescimento de memória.

### PERF-P1-05 — Preload hints sem lifecycle claro

Risco de acúmulo no `head`.

### PERF-P1-06 — CSS crítico usa `@import`

Risco de cadeia adicional.

### PERF-P1-07 — Ausência de RUM canônico

Não existe evidência contínua de LCP, INP, CLS e long tasks.

### PERF-P1-08 — Budget atual congela dívida

Tetos altos impedem regressão, mas não impõem redução.

### PERF-P1-09 — Conteúdo complementar bloqueia ready agregado

Workers/Publicações podem atrasar valor central.

### PERF-P2-01 — Backgrounds remotos

Migrar conteúdo para `<picture>`/CDN.

### PERF-P2-02 — Fontes remotas

Avaliar auto-hospedagem e metric overrides.

### PERF-P2-03 — Granularidade de módulos

Separar overlays e features raras.

---

## 33. Handoffs de implementação

### PERF-H01 — Route asset manifest

Criar registro canônico por rota.

Entregáveis:

- classes de asset;
- owners;
- terceiro;
- dados críticos;
- mídia crítica;
- budgets.

### PERF-H02 — Redução do boot da Home

Objetivos:

- remover módulos de outras rotas;
- converter scripts adequados para defer/module;
- dividir features secundárias;
- reduzir execução antes do CORE_READY.

### PERF-H03 — Catálogo único e SWR real

Objetivos:

- uma autoridade de request;
- cache renderizado imediatamente;
- revalidação deduplicada;
- sem `clearCache()` no boot normal;
- regiões independentes.

### PERF-H04 — Hidratação sem corrida terminal

Objetivos:

- settlement token;
- estado `SLOW`;
- resposta tardia reconciliável;
- cancelamento de ciclos antigos;
- uma autoridade de ready.

### PERF-H05 — Preloader shell-first

Objetivos:

- não esperar fontes;
- não esperar CSS não crítico;
- remover timeout duplicado;
- revelar shell antes de dados;
- preservar guards de segurança.

### PERF-H06 — Prefetch único e connection-aware

Objetivos:

- remover autoridade concorrente;
- respeitar saveData;
- limitar concorrência;
- abortar intenção antiga;
- LRU/TTL.

### PERF-H07 — Política de mídia

Objetivos:

- um candidato LCP;
- `picture/srcset/sizes`;
- priority contextual;
- lazy real abaixo da dobra;
- vídeos on-demand.

### PERF-H08 — Terceiros e versões

Objetivos:

- Lucide local/pinned;
- Supabase on-demand;
- manifest de terceiros;
- fallback fail-soft.

### PERF-H09 — CSS critical path

Objetivos:

- remover `@import` crítico;
- agrupar shell critical;
- adiar overlay CSS;
- lifecycle de folhas do stable shell.

### PERF-H10 — RUM e observabilidade

Objetivos:

- PerformanceObserver;
- Web Vitals;
- long tasks;
- route milestones;
- privacidade;
- sampling.

### PERF-H11 — Budgets e CI

Objetivos:

- debt freeze + target;
- budgets por rota;
- trace automatizado;
- gate de imagens;
- gate de terceiros;
- gate de hidratação.

### PERF-H12 — QA adversarial

Cobrir:

- rede lenta;
- CPU lenta;
- saveData;
- offline;
- timeout;
- resposta tardia;
- route race;
- troca de conta;
- memória longa.

---

## 34. Ordem recomendada

```text
PERF-H01 route manifest
→ PERF-H03 catálogo único
→ PERF-H04 hidratação
→ PERF-H05 preloader
→ PERF-H02 scripts da Home
→ PERF-H06 prefetch
→ PERF-H07 mídia
→ PERF-H08 terceiros
→ PERF-H09 CSS
→ PERF-H10 observabilidade
→ PERF-H11 budgets
→ PERF-H12 QA
```

Justificativa:

- manifest evita otimização sem ownership;
- dados e hidratação removem blockers de correção;
- preloader deixa de mascarar problemas;
- redução de scripts passa a ser mensurável;
- prefetch e mídia são ajustados após critical path definido;
- observabilidade valida o resultado;
- CI impede regressão.

---

## 35. Critérios de aceite

### 35.1 Home hard load

- shell aparece sem esperar catálogo completo;
- busca e categorias ficam disponíveis imediatamente;
- primeiro rail usa cache ou skeleton fiel;
- apenas uma requisição canônica de serviços;
- Worker/Publicação não bloqueia core;
- uma mídia recebe high priority;
- nenhuma rota é aquecida antes do limiar seguro.

### 35.2 Navegação interna

- preloader documental não aparece;
- shell não pisca;
- clique recebe resposta imediata;
- assets da rota são deduplicados;
- rota anterior não comita depois;
- foco chega ao destino.

### 35.3 Rede lenta

- estado slow substitui silêncio prolongado;
- conteúdo stale permanece quando seguro;
- mídia secundária não compete;
- saveData desliga warmup.

### 35.4 Timeout

- não produzir empty;
- não produzir sucesso;
- não tornar erro terminal antes de confirmar fonte;
- resposta tardia é aceita apenas no ciclo correto.

### 35.5 Long session

- route cache dentro do limite;
- hints removidos;
- observers desconectados;
- heap sem crescimento contínuo por navegação.

### 35.6 Acessibilidade

- loading anunciado uma vez;
- skeleton não entra na árvore sem necessidade;
- foco não é perdido no commit;
- reduced motion respeitado;
- texto não depende da fonte remota.

---

## 36. Matriz de teste

| Superfície | Hard cold | Hard warm | Internal cold | Internal warm | Slow 3G | Save Data | Offline | Route race |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Home | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório |
| Resultados | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório |
| Detalhe | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório |
| Pedidos | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório |
| Mensagens | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório |
| Notificações | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório |
| Carteira | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório |
| Pagamento | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório | obrigatório |

---

## 37. Não objetivos desta entrega

Este sublote não:

- removeu scripts;
- alterou imports;
- mudou CDN;
- modificou Supabase;
- alterou imagens;
- adicionou PerformanceObserver;
- executou Lighthouse;
- executou Playwright;
- abriu navegador;
- mediu Web Vitals reais;
- acessou staging;
- acessou produção;
- aplicou migrations;
- alterou workflows;
- fez rebase;
- fez merge.

---

## 38. Impacto futuro no produto

Após implementação, a Doke deverá apresentar:

- shell útil antes;
- menos etapas visuais artificiais;
- Home sem carregar lógica de outras rotas;
- catálogo sem requisição duplicada;
- cache realmente aproveitado;
- timeout sem erro falso;
- imagem principal descoberta cedo;
- mídia abaixo da dobra adiada;
- prefetch sem desperdício;
- terceiros somente quando necessários;
- navegação interna mais previsível;
- menos long tasks;
- menor crescimento de memória;
- budgets reais por rota;
- evidência de performance em vez de percepção subjetiva.

---

## 39. Efeito atual no site

Nenhum comportamento do site foi alterado.

A entrega é exclusivamente documental.

Arquivos de runtime permanecem intactos.

---

## 40. Próximo sublote recomendado

```text
UX-FOUNDATION-013 — privacidade, consentimento, permissões e dados sensíveis
```

O próximo sublote deverá definir:

- consentimento contextual;
- permissões de câmera, microfone, localização e notificações;
- minimização de dados;
- previews sensíveis;
- armazenamento local por conta;
- logout e limpeza de sessão;
- upload e metadata;
- retenção;
- transparência;
- controles do usuário;
- dark patterns proibidos;
- UX de falhas e revogação.

O PR deve permanecer draft e não deve ser mesclado sem autorização explícita.
