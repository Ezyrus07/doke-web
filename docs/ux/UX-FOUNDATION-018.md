# UX-FOUNDATION-018 — Rollout, priorização, dependências, gates de implementação e Definition of Done global

## Status

- Frente: `UX-FOUNDATION`;
- Sublote: `018`;
- Natureza: consolidação arquitetural, programa de implementação, governança de rollout, qualidade e aceite;
- Branch: `ux/ux-foundation-001`;
- Escopo desta entrega: documentação somente;
- Runtime alterado: não;
- HTML alterado: não;
- CSS alterado: não;
- JavaScript alterado: não;
- Migrations alteradas: não;
- Workflows alterados: não;
- Staging acessado: não;
- Produção acessada: não;
- Merge autorizado: não;
- Ready for review autorizado: não;
- Head lógico PAY observado: `5a893bc80040db45390213e39cab24f1f62b928c`;
- Head UX anterior: `db9f751ffa1e69e50edc1ddc2ca02b7883c7275e`;
- Dependências documentais: `UX-FOUNDATION-001` até `UX-FOUNDATION-017`.

---

## 1. Objetivo

Transformar os contratos UX-FOUNDATION-001 a UX-FOUNDATION-017 em um programa executável de implementação, sem criar um mega-PR, sem misturar autoridades e sem introduzir mudanças visuais ou funcionais nesta entrega.

O documento consolida:

- ordem de implementação;
- dependências entre autoridades;
- classificação P0/P1/P2/P3;
- workstreams paralelos;
- fronteiras de PR;
- critérios de entrada;
- critérios de saída;
- gates de merge;
- matriz de testes;
- rollout progressivo;
- observabilidade;
- rollback;
- kill switches;
- ownership;
- waivers;
- Definition of Done global;
- condições para encerrar a fase de fundação e iniciar a implementação.

O objetivo não é implementar tudo de uma vez.

O objetivo é garantir que cada alteração futura:

```text
tenha uma autoridade definida
→ respeite dependências
→ seja pequena o suficiente para revisar
→ possua testes proporcionais ao risco
→ seja liberada de forma reversível
→ não declare sucesso acima da autoridade real
```

---

## 2. Estado consolidado da fundação

A frente UX produziu 18 contratos documentais:

```text
UX-FOUNDATION-001 — governança e inventário
UX-FOUNDATION-002 — busca e latest-wins
UX-FOUNDATION-003 — filtros desktop/mobile
UX-FOUNDATION-004 — rails da Home
UX-FOUNDATION-005 — cards canônicos
UX-FOUNDATION-006 — navegação e overlays
UX-FOUNDATION-007 — formulários e confirmações
UX-FOUNDATION-008 — conteúdo e linguagem operacional
UX-FOUNDATION-009 — notificações
UX-FOUNDATION-010 — responsividade
UX-FOUNDATION-011 — acessibilidade
UX-FOUNDATION-012 — performance percebida
UX-FOUNDATION-013 — privacidade
UX-FOUNDATION-014 — Trust & Safety
UX-FOUNDATION-015 — continuidade e recovery
UX-FOUNDATION-016 — analytics e experimentação
UX-FOUNDATION-017 — onboarding e ativação
UX-FOUNDATION-018 — rollout e Definition of Done global
```

A fase documental não concede autoridade de runtime.

```text
documento aprovado
≠ implementação concluída

implementação local
≠ staging validado

staging validado
≠ produção autorizada

flag disponível
≠ rollout iniciado

rollout iniciado
≠ rollout concluído
```

---

## 3. Resultado arquitetural final

As autoridades propostas formam o seguinte sistema:

```text
Doke UX Authority Layer
├── Doke.contentCatalog
├── Doke.formExperience
├── Doke.formMutationManager
├── Doke.formValidation
├── Doke.formErrorSummary
├── Doke.unsavedChangesManager
├── Doke.actionConfirmation
├── Doke.overlayManager
├── Doke.routeFocusManager
├── Doke.routeAnnouncer
├── Doke.notificationCenter
├── Doke.responsiveExperience
├── Doke.accessibilityExperience
├── Doke.performanceExperience
├── Doke.privacyExperience
├── Doke.trustSafetyExperience
├── Doke.continuityExperience
├── Doke.analyticsExperience
├── Doke.activationExperience
└── Doke.publicServiceCard.create
```

Subautoridades de analytics:

```text
Doke.analyticsRegistry
Doke.analyticsClient
Doke.analyticsIdentity
Doke.analyticsConsent
Doke.analyticsQuality
Doke.experimentation
Doke.rum
Doke.errorTelemetry
```

A implementação deve evitar criar uma nova autoridade para cada página.

Páginas consomem contratos.

Elas não duplicam contratos.

---

## 4. Princípios globais de implementação

### 4.1 Uma autoridade por decisão

```text
uma decisão lógica
→ uma autoridade
→ uma fonte de verdade
→ uma apresentação derivada
```

### 4.2 Uma intenção por efeito

```text
uma intenção lógica
→ no máximo um comando
→ no máximo um receipt
→ no máximo um efeito confirmado
```

### 4.3 Sucesso somente após autoridade

```text
click
≠ accepted

accepted
≠ confirmed

confirmed
≠ reconciled
```

### 4.4 Falha ambígua não vira retry automático

```text
timeout crítico
→ UNKNOWN_OUTCOME
→ reconciliação
→ retry somente se seguro
```

### 4.5 Local storage nunca é autoridade

`localStorage`, `sessionStorage`, IndexedDB e memória podem:

- melhorar UX;
- preservar draft;
- manter cache;
- restaurar contexto.

Não podem:

- promover papel;
- aprovar KYC;
- confirmar pedido;
- confirmar pagamento;
- confirmar publicação;
- confirmar sanção;
- confirmar milestone de ativação.

### 4.6 Desktop e mobile são o mesmo produto

Não existem dois contratos de negócio.

Pode existir adaptação de layout.

Não pode existir divergência de:

- estado;
- ação disponível;
- conteúdo crítico;
- autoridade;
- resultado.

### 4.7 Acessibilidade é gate, não polimento

Nenhum fluxo crítico será considerado concluído quando:

- não funcionar por teclado;
- perder foco;
- esconder foco;
- anunciar estados duplicados;
- depender somente de cor;
- impedir zoom;
- quebrar leitor de tela.

### 4.8 Performance percebida é parte da correção

Uma interface que:

- mantém preloader indefinidamente;
- mostra skeleton incorreto;
- bloqueia interação;
- troca conteúdo fora de ordem;
- salta layout;

não está funcionalmente concluída.

### 4.9 Privacidade é fail-closed

Na dúvida:

- não persistir;
- não transferir;
- não mostrar em preview;
- não incluir em analytics;
- não reutilizar entre contas.

### 4.10 Métrica não governa comportamento sozinha

Uma melhoria de conversão não aprova uma mudança se piorar:

- erro;
- denúncia;
- abandono involuntário;
- acessibilidade;
- privacidade;
- performance;
- suporte;
- segurança.

---

## 5. Classificação de prioridade

### 5.1 P0 — bloqueador de autoridade, segurança ou integridade

Um item é P0 quando pode causar:

- ação crítica duplicada;
- sucesso falso;
- perda de dados;
- mistura entre contas;
- exposição de PII;
- promoção indevida de papel;
- pagamento ou claim acima da autoridade;
- perda de evidência;
- impossibilidade de usar o fluxo por teclado;
- navegação sem retorno de foco;
- resultado antigo aplicado sobre intenção nova;
- retry perigoso;
- sanção ou bloqueio apenas local;
- KYC enganoso;
- dead end em fluxo crítico;
- telemetria que vaza dados sensíveis;
- métrica financeira sem provenance.

Regra:

```text
P0 aberto
→ rollout do fluxo bloqueado
```

### 5.2 P1 — requisito de qualidade de lançamento

Um item é P1 quando:

- não altera autoridade crítica;
- não cria risco imediato de segurança;
- mas degrada significativamente usabilidade, clareza, acessibilidade, performance ou recovery.

Exemplos:

- empty state genérico;
- skeleton divergente;
- filtro difícil de cancelar;
- copy inconsistente;
- densidade tablet inadequada;
- ausência de next best action em uma superfície não crítica;
- ausência de otimização de mídia abaixo da dobra.

Regra:

```text
P1 aberto
→ lançamento amplo bloqueado
→ piloto restrito pode ser permitido com waiver explícito
```

### 5.3 P2 — otimização pós-estabilidade

Exemplos:

- microinterações;
- refinamento editorial;
- personalização não crítica;
- melhoria incremental de relevância;
- atalhos adicionais;
- animação não essencial;
- organização visual secundária.

Regra:

```text
P2 aberto
→ não bloqueia lançamento
→ deve possuir owner e backlog
```

### 5.4 P3 — exploração

Inclui:

- hipóteses;
- experimentos futuros;
- IA não validada;
- novos formatos;
- gamificação;
- personalização avançada.

P3 não entra no critical path do lançamento.

---

## 6. Critérios de severidade

### 6.1 Impacto

```text
CRITICAL — perda financeira, segurança, privacidade, autoridade ou acesso amplo
HIGH     — fluxo crítico quebrado ou comportamento enganoso
MEDIUM   — fricção relevante com recovery disponível
LOW      — polimento ou melhoria localizada
```

### 6.2 Alcance

```text
GLOBAL
MULTI_ROUTE
SINGLE_ROUTE
COMPONENT
EDGE_CASE
```

### 6.3 Detectabilidade

```text
SILENT
DELAYED
VISIBLE
SELF_RECOVERING
```

### 6.4 Prioridade derivada

```text
impacto alto + alcance global + falha silenciosa
→ P0
```

---

## 7. Condições antes de qualquer implementação

### ENTRY-01 — base lógica estável

Antes do primeiro PR de runtime UX:

- identificar head lógico final da base;
- verificar PRs paralelos;
- comparar merge-base;
- confirmar ausência de overlap não resolvido;
- normalizar branch sem force push destrutivo;
- preservar histórico auditável.

Enquanto PAY ou outra base crítica continuar em movimento, não executar rebase repetitivo por sublote.

### ENTRY-02 — ownership definido

Cada epic precisa de:

- owner técnico;
- owner de produto;
- reviewer de UX;
- reviewer de acessibilidade quando aplicável;
- reviewer de segurança/privacidade quando aplicável;
- reviewer de domínio quando houver pedidos, mensagens ou pagamentos.

### ENTRY-03 — autoridade remota conhecida

Antes de modificar uma superfície crítica, documentar:

- fonte de verdade;
- comando;
- read model;
- receipt;
- estados de erro;
- idempotency key;
- recovery;
- limitações de ambiente.

### ENTRY-04 — baseline testável

Antes de alterar uma rota:

- teste de smoke atual;
- screenshot ou descrição de referência;
- viewport matrix;
- estado de sessão;
- fixture controlada;
- erros conhecidos;
- performance baseline;
- a11y baseline.

### ENTRY-05 — rollback possível

Nenhuma mudança transversal começa sem:

- flag ou separação de módulo;
- fallback conhecido;
- compatibilidade temporária;
- plano para reverter;
- preservação de dados.

---

## 8. Dependências estruturais

### 8.1 Grafo principal

```text
branch normalization
→ content catalog
→ form and mutation contracts
→ continuity and generation fences
→ privacy and account-scoped storage
→ overlay, route focus and announcements
→ accessibility and responsive shell
→ performance lifecycle
→ canonical cards and renderers
→ search and filters
→ Home rails
→ notifications and Trust & Safety
→ onboarding and activation
→ analytics quality and experiments
→ rollout amplo
```

### 8.2 Dependências fortes

#### Busca

```text
search state machine
requires
continuity fences
+ canonical content
+ route lifecycle
+ analytics registry
```

#### Filtros

```text
filter UI
requires
applied/draft state
+ URL contract
+ overlay manager
+ responsive contract
```

#### Cards

```text
canonical cards
requires
content catalog
+ identity authority
+ favorite mutation contract
+ media readiness
```

#### Notificações

```text
notification center
requires
event schema
+ account namespace
+ privacy preview policy
+ route mapping
+ action authority
```

#### Onboarding

```text
activation experience
requires
auth intent preservation
+ continuity
+ privacy
+ form mutation
+ route lifecycle
+ analytics registry
```

#### Trust & Safety

```text
reporting
requires
canonical identity
+ evidence snapshot
+ receipt
+ case authority
+ notification policy
```

#### Experimentação

```text
experiment rollout
requires
stable feature
+ analytics quality
+ consent
+ exposure logging
+ guardrails
+ kill switch
```

---

## 9. Programa de implementação

O programa deve ser dividido em epics e PRs pequenos.

Não criar um único PR chamado “implementar UX”.

---

## 10. EPIC-00 — normalização e preparação

### Objetivo

Preparar a base sem modificar comportamento.

### Entregas

- normalizar branch UX sobre head lógico final;
- criar mapa de workstreams;
- criar issue/board de handoffs;
- vincular cada item ao contrato UX correspondente;
- identificar arquivos compartilhados de alto conflito;
- congelar baseline visual da Home;
- registrar owners;
- definir estratégia de flags;
- definir naming de eventos;
- definir ambiente de QA.

### Bloqueadores

- base ainda em movimento;
- PRs paralelos alterando os mesmos arquivos;
- autoridade remota indefinida;
- ausência de owner.

### Saída

```text
implementation_ready = true
```

não significa produção pronta.

---

## 11. EPIC-01 — kernel de conteúdo e estados

### Contratos

- UX-007;
- UX-008;
- UX-015.

### Entregas

- `Doke.contentCatalog`;
- status labels separados de ações;
- error mapping seguro;
- estados canônicos de view;
- `UNKNOWN_OUTCOME`;
- `RECONCILING`;
- `STALE`;
- `DEGRADED`;
- `CONFLICT`;
- codes em vez de copy espalhada;
- zero vs unknown;
- source provenance.

### P0

- remover sucesso falso;
- remover claim financeiro acima da autoridade;
- impedir heurística chamada de IA;
- separar cobrança, proposta e pagamento;
- distinguir fixture de dado real.

### Gate de saída

- nenhum fluxo crítico usa string livre como estado;
- nenhuma copy definitiva é emitida sem autoridade;
- todos os erros críticos possuem code estável.

---

## 12. EPIC-02 — formulários, comandos e idempotência

### Contratos

- UX-007;
- UX-015;
- UX-017.

### Entregas

- `Doke.formExperience`;
- `Doke.formMutationManager`;
- `Doke.formValidation`;
- `Doke.formErrorSummary`;
- `Doke.unsavedChangesManager`;
- `Doke.actionConfirmation`;
- single-flight;
- payload fingerprint;
- idempotency key;
- command receipt;
- draft version;
- save status;
- reconciliação.

### P0

- action modal que simula sucesso;
- checkbox crítico pré-marcado;
- card tratado como validado sem PSP;
- retry crítico antes de reconciliação;
- autosave antigo vencendo novo.

### Gate de saída

```text
critical mutation
→ accepted
→ receipt
→ confirmed/reconciled
```

Nenhuma mutation crítica depende apenas de timeout local.

---

## 13. EPIC-03 — identidade local, privacidade e namespace de conta

### Contratos

- UX-013;
- UX-015;
- UX-016.

### Entregas

- `Doke.privacyExperience`;
- account generation;
- guest generation;
- storage registry;
- account-scoped keys;
- logout cleanup;
- session snapshot mínimo;
- consent snapshot;
- media sanitization;
- safe notification previews;
- support diagnostics opt-in;
- export/delete entrypoints.

### P0

- dados da conta A aparecendo na conta B;
- logout deixando favoritos, buscas, notificações ou drafts;
- CEP enviado durante digitação;
- documentos em storage local;
- PII em analytics;
- guest namespace compartilhado.

### Gate de saída

- todo storage possui owner, scope, TTL e cleanup;
- logout compartilhado deixa zero resíduo privado;
- troca de conta invalida caches e tasks.

---

## 14. EPIC-04 — continuidade, concorrência e recovery

### Contratos

- UX-002;
- UX-007;
- UX-015;
- UX-017.

### Entregas

- `Doke.continuityExperience`;
- route generation;
- account generation;
- data revision;
- intent envelope;
- cross-tab coordination;
- draft conflicts;
- stale-while-revalidate controlado;
- BFCache recovery;
- pageshow handling;
- unknown outcome recovery;
- incident modes.

### P0

- request antigo vencendo intenção nova;
- pending task sobrevivendo a logout;
- reload perdendo comando;
- retry criando comando duplicado;
- last-write-wins silencioso;
- `navigator.onLine` como autoridade.

### Gate de saída

- toda resposta assíncrona crítica é cercada por generations;
- todo draft crítico possui revision;
- toda mutation crítica possui recovery.

---

## 15. EPIC-05 — navegação, overlays e foco

### Contratos

- UX-006;
- UX-010;
- UX-011.

### Entregas

- `Doke.overlayManager`;
- `Doke.routeFocusManager`;
- `Doke.routeAnnouncer`;
- overlay stack;
- focus trap;
- inert background;
- return focus;
- promise settlement;
- route-ready lifecycle;
- title/h1 update;
- scroll restoration;
- deep-link state.

### P0

- modal fecha sem resolver Promise;
- drawer sem trap;
- background interativo;
- foco perdido;
- overlay aberto durante route swap;
- preview sem history/deep link;
- múltiplos locks de scroll.

### Gate de saída

```text
overlay open
→ focus moved
→ trap active
→ close settled
→ focus restored
```

---

## 16. EPIC-06 — acessibilidade e shell responsivo

### Contratos

- UX-010;
- UX-011.

### Entregas

- skip link;
- landmarks;
- h1 por rota;
- focus ring global;
- forced colors;
- touch targets;
- input font-size;
- responsive modes;
- visual viewport;
- virtual keyboard;
- safe areas;
- zoom e text resize;
- reduced motion;
- composite widgets.

### P0

- focus outline removido;
- busca sem combobox;
- cards clicáveis sem teclado;
- mensagens com múltiplos `tabindex=0`;
- drawer sem foco;
- conteúdo crítico truncado;
- shell CSS/JS divergente;
- tablet sem autoridade.

### Gate de saída

- fluxos principais executáveis por teclado;
- zoom 400% sem perda de função;
- leitor de tela entende rota, erro e modal;
- targets mínimos respeitados.

---

## 17. EPIC-07 — performance, boot e hidratação

### Contrato

- UX-012.

### Entregas

- `Doke.performanceExperience`;
- route asset manifest;
- prepaint lifecycle;
- stable shell;
- skeleton geometry;
- route-ready milestone;
- deferred enhancement;
- LCP priority;
- responsive images;
- font strategy;
- listener cleanup;
- observer cleanup;
- long task tracking;
- RUM marks.

### P0

- preloader bloqueando conteúdo pronto;
- watchdog vencendo catálogo;
- init duplicado;
- LCP com lazy loading;
- skeleton divergente;
- full `innerHTML` destruindo foco;
- observers e listeners acumulados.

### Targets contratuais

```text
LCP <= 2.5s p75
INP <= 200ms p75
CLS <= 0.1 p75
```

Esses targets não afirmam que o produto atual já os atende.

### Gate de saída

- shell aparece antes de dados complementares;
- nenhum preloader espera recurso não crítico;
- rota não inicializa duas vezes;
- budgets medidos e versionados.

---

## 18. EPIC-08 — cards, identidade e mídia

### Contratos

- UX-005;
- UX-008;
- UX-011;
- UX-012;
- UX-013.

### Entregas

- `Doke.publicServiceCard.create`;
- schema por tipo;
- preço;
- avaliação;
- verified state;
- favorito;
- mídia;
- skeleton;
- link e ações separados;
- CSS ownership;
- responsive geometry.

### P0

- três renderers de serviço;
- botão favorito dentro de link;
- username/avatar/badge inventados;
- preço divergente;
- rating divergente;
- claim de verificação sem evidência;
- mídia com GPS/EXIF sem sanitização.

### Gate de saída

- mesma entidade renderiza de forma semanticamente consistente em Home, Resultados e Perfil;
- ações são nativas e acessíveis;
- nenhum card fabrica atributo.

---

## 19. EPIC-09 — busca, filtros e Resultados

### Contratos

- UX-002;
- UX-003;
- UX-005;
- UX-011;
- UX-015;
- UX-016;
- UX-017.

### Entregas

- latest-wins;
- request fingerprint;
- single-flight;
- canonical URL;
- combobox;
- applied/draft filters;
- apply authority;
- cancel/discard;
- CEP explícito;
- location granularity;
- zero taxonomy;
- fallback rotulado;
- first relevant result;
- analytics correlation.

### P0

- request antigo vence;
- filtro autoexecuta;
- Apply não governa;
- reset reconstrói URL antiga;
- replaceState elimina histórico;
- CEP dispara rede automaticamente;
- resultado editorial parece match;
- busca sem semântica de combobox.

### Gate de saída

- URL reproduz estado aplicado;
- draft não modifica resultados;
- escape/cancel restaura estado;
- primeiro resultado só conta quando ready e elegível.

---

## 20. EPIC-10 — Home e favoritos

### Contratos

- UX-004;
- UX-005;
- UX-012;
- UX-013;
- UX-017.

### Regra especial

A Home é baseline visual congelada.

Alterações devem:

- preservar composição;
- corrigir comportamento;
- substituir autoridades internas;
- evitar redesign não solicitado;
- manter ordem de conteúdo aprovada.

### Entregas

- states por rail;
- skeleton geometry;
- erro separado de vazio;
- retry;
- refreshing/stale;
- favorite mutation;
- favorites rail;
- progressive reveal;
- setas;
- count authority;
- cleanup.

### P0

- erro colapsa para vazio;
- remoto esconde editorial;
- favorito não persiste;
- favorito pisca;
- favorite state cruza contas;
- tabs parecem interativas sem ação;
- controller duplicado.

### Gate de saída

- cada rail possui state machine completa;
- favorito converge entre card, Home e Perfil;
- falha de um rail não derruba toda a Home.

---

## 21. EPIC-11 — notificações, badges e reengajamento

### Contratos

- UX-009;
- UX-013;
- UX-014;
- UX-015;
- UX-017.

### Entregas

- `Doke.notificationCenter`;
- event schema;
- delivery/read/attention/action/freshness separados;
- account store;
- dedupe;
- badge writer único;
- grouping;
- DND;
- channel preferences;
- safe preview;
- reengagement eligibility;
- suppression after completion.

### P0

- múltiplas stores;
- múltiplos badge writers;
- unread = atenção;
- read divergence;
- dismiss = delete;
- quick action sem autoridade;
- conteúdo sensível em browser preview;
- lembrete depois da conclusão.

### Gate de saída

- um evento gera uma projeção canônica;
- um badge possui um writer;
- ação rápida produz receipt;
- preferências são account-scoped.

---

## 22. EPIC-12 — Trust & Safety

### Contrato

- UX-014.

### Entregas

- `Doke.trustSafetyExperience`;
- report schema;
- receipt;
- evidence snapshot;
- block/mute/restrict/ban/sanction separados;
- appeal;
- case linkage;
- anti-scam;
- safety guidance;
- moderator authority;
- privacy-safe notices.

### P0

- denúncia sem receipt;
- conteúdo removido sem snapshot;
- ban apenas local;
- block sem autoridade transversal;
- sanção sem appeal state;
- identidade sensível exposta;
- dispute misturada com denúncia.

### Gate de saída

- toda denúncia crítica possui protocolo;
- remoção preserva evidência;
- ação moderatória tem autoridade e audit trail;
- bloqueio aplica-se às superfícies relevantes.

---

## 23. EPIC-13 — onboarding e ativação

### Contrato

- UX-017.

### Entregas

- `Doke.activationExperience`;
- intent capture;
- auth resume;
- progressive onboarding;
- next best action;
- milestone registry;
- first relevant result;
- first request;
- professional preflight;
- KYC file states;
- first listing;
- first lead;
- reengagement.

### P0

- intenção perdida no auth;
- Home bloqueada antes de valor;
- CEP automático;
- erro fecha onboarding silenciosamente;
- setup chamado de ativação;
- upload metadata parece salvo;
- KYC metadata-only parece ready;
- profissional ativo sem próximo passo;
- anúncio publicado sem ativação de supply;
- lead sem orientação.

### Gate de saída

- registro continua client-first;
- intenção OFFER encaminha para jornada dedicada;
- nenhum papel é promovido no navegador;
- milestone exige receipt canônico;
- uma ação principal por superfície.

---

## 24. EPIC-14 — analytics, RUM e experimentação

### Contrato

- UX-016.

### Entregas de fundação

- `Doke.analyticsRegistry`;
- event schemas;
- metric dictionary;
- consent snapshot;
- guest/account identity;
- environment;
- source authority;
- batching;
- sampling;
- retry/drop;
- data quality;
- fixture/bot isolation;
- RUM;
- error telemetry.

### Entregas posteriores

- feature flag service;
- assignment;
- exposure;
- layers;
- holdout;
- SRM;
- experiment analysis;
- kill switch.

### Regra

Instrumentação básica deve acompanhar implementação.

Experimentação ampla deve vir depois de estabilidade.

### P0

- click chamado de conversão;
- evento sem consent snapshot;
- PII em payload;
- mock misturado a real;
- métrica financeira sem ledger;
- flag em URL/localStorage chamada de experimento;
- ausência de exposure logging;
- zero usado para missing.

### Gate de saída

- eventos validam schema;
- outcome vem da autoridade;
- métricas possuem denominador;
- financial KPIs permanecem bloqueados até autoridade PAY.

---

## 25. Sequência de ondas

### Wave 0 — preparação

```text
EPIC-00
```

Nenhuma alteração de comportamento.

### Wave 1 — safety kernel

```text
EPIC-01
EPIC-02
EPIC-03
EPIC-04
```

Objetivo:

- estados corretos;
- mutations seguras;
- isolamento de conta;
- recovery.

### Wave 2 — shell e acessibilidade

```text
EPIC-05
EPIC-06
EPIC-07
```

Objetivo:

- navegação;
- overlays;
- foco;
- responsividade;
- performance lifecycle.

### Wave 3 — componentes e descoberta

```text
EPIC-08
EPIC-09
EPIC-10
```

Objetivo:

- cards;
- busca;
- filtros;
- Resultados;
- Home;
- favoritos.

### Wave 4 — comunicação e segurança

```text
EPIC-11
EPIC-12
```

Objetivo:

- notificações;
- badges;
- reports;
- blocking;
- evidence.

### Wave 5 — ativação e progressão

```text
EPIC-13
```

Objetivo:

- auth resume;
- onboarding;
- profissional;
- first value.

### Wave 6 — observabilidade e experimentação

```text
EPIC-14
```

A fundação de eventos começa antes.

A experimentação plena só é liberada nesta onda.

### Wave 7 — otimizações P1/P2

- densidade;
- editorial;
- mídia;
- personalização;
- microinterações;
- relevância;
- performance incremental.

---

## 26. Paralelização permitida

### Workstream A — Core UX runtime

- content;
- forms;
- continuity;
- privacy;
- analytics registry.

### Workstream B — Shell

- navigation;
- overlay;
- responsive;
- accessibility;
- performance.

### Workstream C — Discovery

- cards;
- search;
- filters;
- Results;
- Home.

### Workstream D — Account and activation

- auth intent;
- onboarding;
- profiles;
- professional conversion;
- KYC experience.

### Workstream E — Communication

- notifications;
- messages integration;
- reengagement;
- badges.

### Workstream F — Trust

- reports;
- evidence;
- blocking;
- sanctions;
- appeals.

### Workstream G — Quality and observability

- test harness;
- RUM;
- error telemetry;
- analytics quality;
- dashboards.

### Regra de paralelização

Dois workstreams podem avançar quando:

- não alteram a mesma autoridade;
- não modificam o mesmo arquivo compartilhado sem coordenação;
- usam contratos estáveis;
- possuem integration point versionado;
- não criam implementação temporária divergente.

---

## 27. Arquivos de alto conflito

Devem ter owner temporário durante cada onda:

- `assets/js/core/app.js`;
- `assets/js/core/navigation-registry.js`;
- `assets/js/core/session.js`;
- `assets/js/pages/home.js`;
- `assets/js/pages/mensagens.js`;
- `assets/css/core/index.css`;
- `assets/css/pages/app-shell.css`;
- `assets/css/pages/home.css`;
- headers e shells compartilhados;
- package scripts;
- domain matrix;
- global runtime registries.

Regra:

```text
arquivo de alto conflito
→ um owner por janela de integração
```

---

## 28. Fronteiras de pull request

### 28.1 PR por autoridade ou slice vertical

Exemplos válidos:

```text
UX-CORE-001 — state and content registry
UX-CONT-001 — generation fences
UX-NAV-001 — overlay stack
UX-A11Y-001 — landmarks and focus ring
UX-SEARCH-001 — latest-wins controller
UX-CARD-001 — canonical service card
UX-HOME-001 — rail state machine
UX-ACT-001 — intent preservation
```

### 28.2 Mega-PR proibido

Não misturar no mesmo PR:

- busca;
- onboarding;
- notificações;
- mensagens;
- carteira;
- KYC;
- redesign global.

### 28.3 Tamanho

Não definir limite somente por linhas.

Um PR é pequeno quando:

- possui uma hipótese;
- possui uma autoridade principal;
- possui rollback claro;
- pode ser testado isoladamente;
- pode ser revisado sem depender de código futuro.

### 28.4 Compatibilidade

Quando uma autoridade substituir legado:

```text
nova implementação
→ adapter temporário
→ métricas de uso
→ migração de consumers
→ remoção do legado
```

Não manter duas autoridades indefinidamente.

---

## 29. Checklist obrigatório de PR

Todo PR de runtime deve declarar:

```text
scope
authority
affected routes
affected roles
data sources
commands
receipts
states
P-level
feature flag
fallback
rollback
analytics events
privacy class
accessibility impact
performance impact
test matrix
known limitations
```

Também deve declarar explicitamente:

```text
produção alterada: sim/não
staging requerido: sim/não
migration requerida: sim/não
provider requerido: sim/não
approval externa requerida: sim/não
```

---

## 30. Gates de merge

### GATE-00 — escopo

Falhar se:

- PR mistura epics sem necessidade;
- arquivos fora do escopo foram alterados;
- visual baseline congelada foi redesenhada incidentalmente;
- código temporário não foi removido.

### GATE-01 — autoridade

Falhar se:

- browser assume autoridade remota;
- localStorage confirma estado crítico;
- role é promovido client-side;
- sucesso aparece antes do receipt;
- status é derivado de copy ou DOM.

### GATE-02 — concorrência

Falhar se:

- resposta antiga pode vencer;
- mutation não possui idempotência quando necessária;
- retry pode duplicar comando;
- autosave não possui revision;
- logout não cancela tasks.

### GATE-03 — privacidade

Falhar se:

- PII entra em analytics;
- storage não possui namespace;
- logout deixa resíduo;
- CEP é transferido automaticamente;
- documento é persistido localmente;
- preview expõe conteúdo sensível.

### GATE-04 — segurança

Falhar se:

- denúncia não gera receipt;
- evidência pode ser apagada;
- bloqueio é apenas visual;
- ação moderatória não possui authority/audit;
- conteúdo inseguro é incentivado.

### GATE-05 — acessibilidade

Falhar se:

- teclado não conclui o fluxo;
- foco some;
- modal não prende foco;
- heading/landmark está ausente;
- erro não é associado ao campo;
- contraste crítico falha;
- zoom remove funcionalidade.

### GATE-06 — responsividade

Falhar se:

- shell CSS/JS diverge;
- conteúdo é cortado;
- touch target é insuficiente;
- teclado virtual cobre ação;
- safe area não é respeitada;
- tablet cai em layout inválido.

### GATE-07 — performance

Falhar se:

- preloader bloqueia shell pronto;
- LCP regressa acima do budget aprovado;
- CLS excede budget;
- listener/observer vaza;
- route init duplica;
- recurso abaixo da dobra vira high priority.

### GATE-08 — conteúdo

Falhar se:

- claim é definitivo sem evidência;
- termos do domínio divergem;
- status e ação são misturados;
- copy técnica vaza internals;
- zero é tratado como free sem autoridade.

### GATE-09 — analytics

Falhar se:

- evento não está registrado;
- schema inválido;
- consent snapshot ausente;
- ambiente ausente;
- fixture misturada;
- click chamado de conversão;
- métrica financeira sem provenance.

### GATE-10 — testes

Falhar se:

- happy path é o único cenário;
- offline/timeout/reload não foram testados quando relevantes;
- conta trocada não foi testada;
- mobile não foi testado;
- keyboard não foi testado;
- direct load e internal route divergem.

### GATE-11 — rollback

Falhar se:

- mudança não pode ser desativada;
- rollback perde dados;
- schema não é backward compatible sem plano;
- adapter legado foi removido cedo demais.

### GATE-12 — documentação

Falhar se:

- contrato mudou e docs não foram atualizadas;
- limitations não foram declaradas;
- matriz de rotas não foi atualizada;
- owner não está registrado.

---

## 31. Waivers

### 31.1 Regra

Waiver não apaga dívida.

### 31.2 Conteúdo mínimo

```text
waiverId
issue
severity
reason
scope
owner
approver
expiresAt
mitigation
monitoring
rollbackTrigger
followUp
```

### 31.3 P0

P0 só pode receber waiver quando:

- risco é compreendido;
- exposição é limitada;
- mitigação está ativa;
- rollout é restrito;
- approver possui autoridade;
- prazo de expiração é curto;
- não envolve autorização ilegal ou inexistente.

### 31.4 Waiver proibido

Não aceitar waiver para:

- promoção client-side de papel;
- pagamento sem autoridade;
- exposição de documento;
- cross-account data leak;
- ausência total de keyboard em fluxo crítico;
- retry financeiro duplicável;
- claim de proteção inexistente.

---

## 32. Estratégia de feature flags

### 32.1 Separação

```text
feature flag
≠ experiment assignment
```

### 32.2 Autoridade

Flags de rollout devem ser:

- server-controlled ou build-controlled;
- versionadas;
- auditáveis;
- environment-scoped;
- role-scoped quando necessário;
- reversíveis.

### 32.3 Proibido

- URL como autoridade;
- localStorage como rollout real;
- query parameter em produção;
- flag sem default fail-closed;
- flag sem kill switch.

### 32.4 Estados

```text
DISABLED
INTERNAL
PILOT
RAMPING
ENABLED
PAUSED
ROLLED_BACK
```

---

## 33. Rollout progressivo

### 33.1 Etapa 0 — disabled

- código integrado;
- flag off;
- testes automatizados;
- nenhum usuário recebe.

### 33.2 Etapa 1 — internal

- contas internas identificadas;
- fixtures isoladas;
- logs e RUM verificados;
- nenhum KPI externo contaminado.

### 33.3 Etapa 2 — pilot

- grupo pequeno e elegível;
- support preparado;
- monitoramento ativo;
- rollback imediato possível.

### 33.4 Etapa 3 — ramping

Rampas sugeridas, sujeitas ao volume real:

```text
1%
5%
25%
50%
100%
```

Percentuais não substituem critérios de qualidade.

### 33.5 Etapa 4 — enabled

- P0 zero;
- P1 aceitos ou fechados;
- métricas estáveis;
- quality gates verdes;
- rollback preservado por janela definida.

### 33.6 Etapa 5 — cleanup

- remover adapter legado;
- remover flag obsoleta;
- atualizar docs;
- atualizar testes;
- consolidar métricas;
- confirmar que não há consumer antigo.

---

## 34. Critérios de avanço de rollout

Avançar somente quando:

- nenhum P0 novo;
- erro não aumentou materialmente;
- a11y não regrediu;
- performance dentro de budget;
- support volume aceitável;
- analytics quality válida;
- no cross-account anomaly;
- no duplicate command anomaly;
- no privacy incident;
- no safety incident;
- target flow conclui em desktop e mobile.

Não avançar somente porque:

- conversão subiu;
- page views subiram;
- usuários clicaram mais;
- não houve reclamação explícita.

---

## 35. Triggers de pausa

Pausar rollout quando ocorrer:

- aumento de erro crítico;
- duplicação de comando;
- unknown outcome sem reconciliação;
- perda de draft;
- data leak;
- PII em telemetry;
- foco preso ou perdido em fluxo crítico;
- regressão severa de LCP/INP/CLS;
- crash loop;
- notification spam;
- report sem receipt;
- role inconsistente;
- publicação indevida;
- claim financeiro incorreto.

---

## 36. Rollback

### 36.1 Princípio

```text
rollback de interface
não pode
reverter silenciosamente estado de negócio confirmado
```

### 36.2 Tipos

#### UI rollback

- desabilitar nova apresentação;
- preservar dados canônicos;
- voltar para renderer anterior.

#### Runtime rollback

- desabilitar nova authority adapter;
- manter leitura backward compatible;
- impedir novos comandos;
- reconciliar pendentes.

#### Data rollback

Somente com plano específico de domínio.

Não usar rollback de banco genérico para apagar comandos já aceitos.

### 36.3 Pós-rollback

- registrar incidente;
- preservar receipts;
- informar suporte;
- reclassificar unknown outcomes;
- bloquear retry inseguro;
- publicar limitação interna;
- abrir root cause.

---

## 37. Kill switches

Devem existir para:

- mutation crítica nova;
- notification quick actions;
- onboarding automático;
- KYC upload;
- report flow novo;
- experiment assignment;
- autoplay/media pesada;
- prefetch agressivo;
- realtime experimental;
- feature que depende de provider externo.

Kill switch deve:

- ser remoto ou build-controlled;
- ser fail-closed;
- não apagar dados;
- não deixar UI prometendo ação indisponível;
- possuir copy degradada.

---

## 38. Matriz mínima de dispositivos

### Compact

```text
360x800
390x844
430x932
```

### Medium

```text
768x1024
820x1180
1024x768
```

### Wide

```text
1280x720
1366x768
1440x900
1920x1080
```

### Modificadores

- zoom 200%;
- zoom 400%;
- text resize 200%;
- portrait;
- landscape;
- virtual keyboard open;
- safe area;
- reduced motion;
- forced colors.

---

## 39. Matriz mínima de navegadores

- Chrome desktop;
- Firefox desktop;
- Safari macOS;
- Edge desktop;
- Safari iOS;
- Chrome Android;
- WebView somente quando houver produto que o utilize.

Não criar hacks por user-agent como primeira solução.

---

## 40. Matriz mínima de entrada

Para cada rota alterada:

```text
direct load
F5/reload
internal navigation
back
forward
BFCache
new tab
cross-tab update
logged out
logged in
account switch
expired session
offline
reconnect
slow network
server error
stale cache
empty
large dataset
```

---

## 41. Rotas críticas

Tier 0:

- `auth/login.html`;
- `auth/cadastro.html`;
- `index.html`;
- `resultados.html`;
- `detalhe-anuncio.html`;
- `orcamento.html`;
- `pedidos.html`;
- `mensagens.html`;
- `meu-perfil.html`;
- `tornar-profissional.html`;
- `verificacao-profissional.html`;
- `anunciar-servico.html`;
- `pagamento-profissional.html`.

Tier 1:

- `notificacoes.html`;
- `perfil-cliente.html`;
- `perfil-profissional.html`;
- `carteira.html`;
- `comunidade.html`;
- `comunidade-interna.html`;
- `configuracoes.html`;
- `ajuda.html`.

Tier 2:

- superfícies editoriais;
- páginas institucionais;
- admin específico;
- ferramentas internas.

---

## 42. Smoke tests por rota crítica

### Auth

- login;
- cadastro;
- confirmação;
- erro;
- retorno seguro;
- logout.

### Home

- shell;
- busca;
- rails;
- favorito;
- onboarding;
- drawer;
- responsive.

### Resultados

- query;
- filters;
- pagination;
- zero;
- retry;
- card;
- back/forward.

### Detalhe

- entidade;
- favorite;
- mensagem;
- orçamento;
- auth resume.

### Pedidos

- list;
- filter;
- detail;
- action;
- receipt;
- unknown outcome.

### Mensagens

- list;
- open;
- compose;
- attachment;
- action context;
- offline;
- blocking.

### Perfil

- load;
- edit;
- media;
- professional next step;
- account isolation.

### Profissional

- preflight;
- draft;
- save/exit;
- verification;
- file state;
- status;
- first listing.

---

## 43. Testes automatizados

### Unit

- normalization;
- reducers;
- state machines;
- priority resolution;
- content mapping;
- analytics schema;
- idempotency;
- intent expiry.

### Contract

- authority response;
- receipt;
- role;
- account scope;
- storage cleanup;
- event schema;
- report schema;
- file states.

### Integration

- route lifecycle;
- overlay lifecycle;
- form mutation;
- search request order;
- cross-tab;
- logout;
- onboarding resume.

### E2E

- first search;
- first request;
- first response;
- professional setup;
- KYC submit;
- first listing;
- report/block;
- unknown outcome recovery.

### Visual regression

- Home baseline;
- card variants;
- filters;
- overlays;
- responsive modes;
- error/empty/loading.

### A11y automation

- landmarks;
- labels;
- roles;
- contrast where detectable;
- invalid ARIA;
- focusable hidden elements.

Automação não substitui teste manual com tecnologia assistiva.

---

## 44. Observabilidade mínima

### RUM

- route start;
- shell visible;
- skeleton visible;
- data ready;
- route ready;
- LCP;
- INP;
- CLS;
- long tasks;
- errors.

### Product

- intent;
- action started;
- command accepted;
- outcome confirmed;
- outcome reconciled;
- recovery;
- abandonment only when definível.

### Quality

- schema rejection;
- duplicate event;
- queue drop;
- high cardinality;
- missing consent;
- wrong environment;
- fixture leak;
- bot/internal leak.

### Safety

- report receipt failure;
- block failure;
- evidence failure;
- sanction inconsistency.

### Privacy

- cross-account anomaly;
- storage cleanup failure;
- preview policy violation;
- PII detector alert.

---

## 45. Dashboards

Dashboards mínimos:

- release health;
- route performance;
- client errors;
- mutation outcomes;
- unknown outcomes;
- account isolation anomalies;
- notification delivery/read/action;
- activation funnel;
- Trust & Safety operations;
- analytics quality.

Dashboards financeiros permanecem limitados até autoridade PAY apropriada.

---

## 46. Ownership operacional

Cada autoridade deve possuir:

```text
technicalOwner
productOwner
onCallOrResponseOwner
dataOwner
privacyReviewer
securityReviewer
lastReviewedAt
version
```

Não deixar ownership em nomes de arquivos ou memória de chat.

---

## 47. Release notes internas

Cada rollout deve documentar:

- o que mudou;
- quem recebe;
- o que não mudou;
- limitações;
- como desativar;
- como identificar incidentes;
- eventos esperados;
- alertas;
- suporte;
- rollback.

---

## 48. Support readiness

Antes de piloto:

- mensagens de erro conhecidas;
- códigos de protocolo;
- passos de recovery;
- privacidade de diagnóstico;
- redaction;
- escalonamento;
- limites de autoridade do suporte;
- ausência de promessa financeira indevida.

---

## 49. Security and privacy review triggers

Revisão obrigatória quando o PR:

- altera sessão;
- altera role;
- altera storage;
- usa localização;
- usa câmera/microfone;
- envia arquivo;
- usa documento;
- cria report;
- bloqueia pessoa;
- modifica notificação;
- registra conteúdo livre;
- adiciona analytics;
- envolve pagamento.

---

## 50. Domain review triggers

### AUTH

- login;
- cadastro;
- recovery;
- session;
- role.

### PROF

- perfil profissional;
- verificação;
- anúncio;
- disponibilidade.

### SEARCH

- query;
- ranking;
- filters;
- fallback.

### ORD/SCHED

- orçamento;
- pedido;
- agenda;
- status;
- action.

### MSG

- conversa;
- mensagem;
- attachment;
- realtime.

### PAY

- cobrança;
- pagamento;
- refund;
- dispute;
- payout;
- wallet.

Nenhuma revisão UX substitui authority review de domínio.

---

## 51. Definition of Done por componente

Um componente está concluído quando:

- possui schema;
- possui estados;
- possui keyboard behavior;
- possui responsive behavior;
- possui loading/empty/error;
- possui tests;
- possui analytics quando necessário;
- possui privacy classification;
- não duplica autoridade;
- possui owner;
- possui documentação.

---

## 52. Definition of Done por rota

Uma rota está concluída quando:

- direct load e internal navigation convergem;
- title e h1 corretos;
- route focus correto;
- skeleton geometria correta;
- ready state autoritativo;
- error/empty/offline definidos;
- keyboard completo;
- mobile/tablet/desktop equivalentes;
- performance dentro de budget;
- no cross-account residue;
- analytics quality válida;
- rollback testado.

---

## 53. Definition of Done por mutation

Uma mutation está concluída quando:

```text
intent
→ validation
→ confirmation quando necessária
→ idempotency key
→ command
→ accepted state
→ receipt
→ confirmed ou UNKNOWN_OUTCOME
→ reconciliation
→ final presentation
```

E também:

- retry seguro;
- duplicate prevention;
- account fence;
- route fence;
- revision fence;
- offline policy;
- error mapping;
- analytics correlation;
- support protocol.

---

## 54. Definition of Done por overlay

- trigger registrado;
- stack;
- `aria-modal` quando apropriado;
- fundo inert;
- foco inicial;
- trap;
- Escape;
- close action;
- Promise settle;
- foco retornado;
- scroll restaurado;
- route swap seguro;
- mobile safe area;
- zoom testado.

---

## 55. Definition of Done por fluxo crítico

Um fluxo crítico está concluído quando:

- happy path;
- validation failure;
- server rejection;
- timeout;
- unknown outcome;
- reload;
- offline;
- reconnect;
- duplicate action;
- account switch;
- cross-tab;
- mobile;
- keyboard;
- screen reader;
- support recovery;
- analytics;
- rollback.

---

## 56. Definition of Done global

A Doke só poderá declarar a fundação UX implementada quando:

### Arquitetura

- autoridades propostas possuem implementação ou decisão explícita de consolidação;
- não existem autoridades legadas concorrentes nos fluxos críticos;
- consumers usam contracts estáveis;
- adapters temporários possuem plano de remoção.

### Autoridade

- nenhum estado crítico é confirmado no browser;
- mutations críticas produzem receipts;
- unknown outcomes são reconciliados;
- roles são server-owned;
- claims seguem evidência.

### Busca e descoberta

- latest-wins;
- filtros aplicados/draft separados;
- URL reproduz estado;
- cards canônicos;
- first relevant result;
- zero taxonomy;
- fallback rotulado.

### Home

- baseline visual preservada;
- rails independentes;
- error ≠ empty;
- favoritos convergem;
- skeletons corretos;
- nenhuma seção trava a página inteira.

### Navegação

- overlay stack único;
- route focus;
- route announcement;
- deep links;
- back/forward;
- scroll restoration;
- Promise dialogs resolvidas.

### Formulários

- validação consistente;
- error summary;
- idempotência;
- drafts versionados;
- save status;
- dirty state;
- confirmações corretas;
- sem checkbox crítico pré-marcado.

### Conteúdo

- glossário aplicado;
- status e ação separados;
- claims financeiros fail-closed;
- heurística não chamada de IA;
- mock rotulado;
- erros técnicos mapeados.

### Notificações

- um event schema;
- uma store canônica;
- um badge writer;
- unread/attention/action separados;
- account scope;
- privacy-safe preview;
- quick action autoritativa.

### Responsividade

- COMPACT/MEDIUM/WIDE consistentes;
- tablet real;
- virtual keyboard;
- safe areas;
- targets;
- zoom;
- text resize;
- sem hidden overflow mascarando bug.

### Acessibilidade

- WCAG 2.2 AA como baseline contratual;
- landmarks;
- headings;
- skip link;
- focus visible;
- combobox;
- modal;
- live regions;
- contrast;
- media controls;
- screen reader QA.

### Performance

- shell útil rápido;
- preloader limitado;
- LCP prioritizado;
- images responsivas;
- fonts controladas;
- no duplicate init;
- cleanup;
- budgets;
- RUM.

### Privacidade

- data registry;
- account namespace;
- logout cleanup;
- consent;
- location explicit;
- media sanitization;
- notification privacy;
- export/delete path;
- no PII em analytics.

### Trust & Safety

- report receipt;
- evidence snapshot;
- block authority;
- sanction states;
- appeal;
- case linkage;
- anti-scam;
- safe support flow.

### Continuidade

- durable intents;
- account/route/revision fences;
- cross-tab;
- drafts;
- BFCache;
- offline/degraded;
- incident modes;
- retry seguro.

### Analytics

- registry;
- schemas;
- metric dictionary;
- consent snapshot;
- guest/account transition;
- source authority;
- RUM;
- errors;
- quality gates;
- experiments corretos;
- financial provenance.

### Ativação

- auth preserva intenção;
- onboarding progressivo;
- client-first preservado;
- next best action;
- milestones autoritativos;
- professional journey dedicada;
- KYC file states corretos;
- first listing;
- first lead;
- reengagement governado.

### QA

- automated tests;
- manual QA;
- a11y QA;
- privacy QA;
- performance QA;
- cross-browser;
- responsive;
- rollback;
- support readiness.

### Release

- P0 zero;
- P1 fechados ou waivers válidos;
- flags;
- kill switches;
- monitoring;
- rollout progressivo;
- no incident open;
- docs atualizadas.

---

## 57. Critérios para encerrar a fase documental

A fase UX-FOUNDATION termina quando:

- UX-018 está publicado;
- PR permanece draft;
- todos os contratos estão versionados;
- rollout order está definido;
- handoffs estão mapeados;
- Definition of Done global existe;
- próximo passo de implementação está claro;
- nenhuma mudança de runtime foi feita nesta branch documental.

---

## 58. O que não deve acontecer após o UX-018

Não iniciar implementação por preferência visual aleatória.

Não começar por:

- animações;
- redesign;
- carrosséis;
- novas cores;
- microinterações;
- IA;
- personalização;
- experimentos.

Enquanto existirem P0 de:

- autoridade;
- concorrência;
- privacidade;
- acessibilidade;
- continuidade;
- sucesso falso.

---

## 59. Próxima fronteira material

Após estabilização da base lógica:

```text
UX-IMPLEMENTATION-000
— normalização da base, backlog executável, owners e primeira onda do safety kernel
```

A primeira implementação recomendada é:

```text
UX-CORE-001
— state/content registry e separação entre success, error, stale, degraded e UNKNOWN_OUTCOME
```

Depois:

```text
UX-CORE-002
— mutation manager, idempotency e receipts

UX-CONT-001
— account/route/revision fences

UX-PRIV-001
— account-scoped storage e logout cleanup
```

Somente então iniciar busca, Home, onboarding e superfícies de alto tráfego.

---

## 60. Impacto esperado no site

Quando este programa for implementado, a Doke passará a ter:

- estados coerentes;
- menos sucesso falso;
- menos race conditions;
- menos perda de contexto;
- navegação acessível;
- overlays previsíveis;
- busca reproduzível;
- favoritos consistentes;
- onboarding menos invasivo;
- progressão profissional clara;
- notificações menos confusas;
- reports rastreáveis;
- storage isolado por conta;
- melhor recovery;
- performance mensurável;
- analytics confiável;
- rollout reversível.

---

## 61. Impacto desta entrega documental

Nesta entrega:

- nenhuma tela mudou;
- nenhum botão mudou;
- nenhuma rota mudou;
- nenhum componente mudou;
- nenhum banco mudou;
- nenhuma migration foi aplicada;
- nenhum workflow foi alterado;
- nenhum ambiente remoto foi acessado;
- nenhum rollout foi iniciado;
- nenhum merge foi realizado.

O efeito é exclusivamente contratual e de governança.

---

## 62. Regra final

```text
qualidade não é uma etapa depois da implementação

qualidade é a forma de implementar
```

E:

```text
rollout seguro
=
pequena mudança
+ autoridade clara
+ observabilidade
+ reversibilidade
+ gate proporcional ao risco
```
