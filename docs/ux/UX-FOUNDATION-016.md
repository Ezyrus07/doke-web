# UX-FOUNDATION-016 — Analytics de produto, métricas de UX, experimentação e observabilidade

## Status

- Frente: `UX-FOUNDATION`;
- Sublote: `016`;
- Natureza: especificação de Produto, UX, analytics, experimentação, observabilidade e QA;
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
- Head lógico principal inspecionado no início: `60258b9a33887018c4159d93dbf6ca6aea5be74c`;
- Head lógico principal após deriva PAY-B03A: `aeb45d94afd3d803bd0cc3c245f7a9b412270a2e`;
- Head UX anterior: `892c220b495e2162da4e9166495f19d5d7893176`;
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-015`.

---

## 1. Objetivo

Definir a arquitetura de medição da Doke para que decisões de Produto, UX, Growth, Trust & Safety, operação e engenharia possam ser tomadas com dados:

- semanticamente estáveis;
- vinculados à autoridade correta;
- resistentes a duplicação;
- resistentes a manipulação;
- privacy-safe;
- compatíveis com consentimento;
- versionados;
- reconciliáveis;
- observáveis;
- auditáveis;
- comparáveis ao longo do tempo;
- separados de logs financeiros, segurança e operação;
- incapazes de fabricar causalidade;
- incapazes de transformar clique em resultado confirmado;
- incapazes de transformar simulação local em KPI real.

O contrato cobre:

- taxonomia de eventos;
- métricas de produto;
- métricas de UX;
- funis de marketplace;
- ativação de clientes e profissionais;
- liquidez;
- retenção;
- qualidade e confiança;
- métricas financeiras com autoridade fail-closed;
- métricas para donos de anúncios;
- instrumentação de formulários;
- Real User Monitoring;
- erros de frontend;
- correlação entre frontend e backend;
- experimentos controlados;
- feature flags;
- exposição a variantes;
- qualidade dos dados;
- anti-gaming;
- dashboards;
- alertas;
- QA de analytics.

---

## 2. Princípio central

```text
uma decisão de produto
→ uma pergunta explícita
→ uma definição de métrica
→ uma fonte autoritativa
→ um evento versionado
→ uma população elegível
→ um denominador estável
→ uma janela temporal
→ guardrails
→ interpretação com limites
```

Nunca:

```text
interface possui um número
→ número vira KPI
→ KPI vira decisão
```

Também nunca:

```text
clique no CTA
→ “conversão”
```

quando a autoridade real ainda exige:

```text
comando aceito
→ entidade criada
→ estado confirmado
→ reconciliação concluída
```

A medição faz parte da correção do produto.

Um evento incorreto pode ser mais perigoso que evento ausente, porque produz confiança falsa.

---

## 3. Invariantes obrigatórios

```text
evento ≠ fato de negócio

clique ≠ conversão

request enviada ≠ request aceita

Promise resolvida ≠ autoridade confirmada

page view ≠ conteúdo útil

feature flag ≠ experimento

variante disponível ≠ exposição

correlação ≠ causalidade

média ≠ experiência típica

contagem ≠ qualidade

analytics ≠ ledger financeiro

analytics ≠ audit log de segurança

analytics ≠ observabilidade operacional

analytics ≠ suporte diagnóstico

visitor key ≠ identidade legal

localStorage ≠ autoridade de atribuição

mock ≠ dado real

zero ≠ ausência de problema

missing event ≠ zero event
```

Além disso:

1. todo evento deve ter owner;
2. todo evento deve ter propósito declarado;
3. todo evento deve possuir versão de schema;
4. todo evento deve declarar sua fonte de autoridade;
5. toda métrica deve declarar numerador e denominador;
6. toda métrica deve declarar população elegível;
7. toda métrica deve declarar exclusões;
8. toda métrica deve declarar janela temporal;
9. toda métrica deve declarar freshness;
10. toda métrica deve declarar limitações;
11. todo experimento deve registrar exposição real;
12. nenhuma variante pode depender apenas de query string ou localStorage em produção;
13. nenhuma métrica financeira pode superar a autoridade do ledger;
14. nenhuma análise pode usar conteúdo livre sem aprovação de privacidade;
15. nenhum dashboard pode ocultar origem, atraso ou tamanho da amostra;
16. nenhum evento crítico pode ser gerado somente pelo cliente quando existir autoridade server-side;
17. nenhum erro pode enviar PII por stack, breadcrumb, URL ou payload;
18. nenhum sistema de analytics pode bloquear a jornada principal.

---

## 4. Escopo auditado

### 4.1 Instrumentação de produto encontrada

- `assets/js/repositories/services-repository.js`;
- `assets/js/pages/detalhe-anuncio.js`;
- `assets/js/repositories/quote-template-metrics-repository.js`;
- `assets/js/services/quote-template-metrics-service.js`;
- `assets/js/pages/service-quote-template-builder.js`;
- `assets/js/pages/orcamento.js`;
- `assets/js/pages/profile/profile-quote-template-metrics.js`;
- migrations de métricas de templates;
- views agregadas de conversão e abandono.

### 4.2 Métricas financeiras e operacionais encontradas

- `assets/js/pages/carteira.js`;
- `assets/js/services/wallet-service.js`;
- `assets/js/repositories/wallet-repository.js`;
- painéis mensais da Carteira;
- métricas de pedidos;
- métricas de incidentes;
- runbooks e contratos operacionais.

### 4.3 Flags e configuração

- `assets/js/core/runtime-config.js`;
- `assets/js/core/feature-flags.js`;
- query overrides;
- localStorage overrides;
- canários de pedidos;
- canário de beta launch;
- safe mode.

### 4.4 Segurança, diagnóstico e privacidade

- `assets/js/core/permissions.js`;
- `configuracoes.html`;
- audit log local;
- opção de diagnóstico de suporte;
- sessionStorage de visitor keys;
- actor IDs em eventos;
- labels de perguntas em funis.

### 4.5 Observabilidade de frontend

Buscas por:

- `performance.mark`;
- `PerformanceObserver`;
- Web Vitals;
- `sendBeacon`;
- `window.onerror`;
- `unhandledrejection`;
- `dataLayer`;
- `gtag`;
- `trackEvent`;
- `captureEvent`;
- `logEvent`.

Não foi encontrada uma autoridade transversal correspondente.

### 4.6 Fora deste sublote

- seleção de fornecedor de analytics;
- contratação de ferramenta externa;
- deploy de collector;
- criação de tabelas remotas;
- ativação de cookies;
- definição jurídica final de bases legais;
- configuração de status page;
- implantação de source maps em produção;
- implementação de experimentos reais;
- alteração de políticas PAY-B03;
- ativação de pagamentos reais.

Este documento define o contrato que deverá preceder essas decisões.

---

## 5. Inventário positivo existente

A base não parte do zero.

Existem subsistemas úteis que devem ser preservados e integrados, não descartados.

### 5.1 Métricas de anúncios

O repositório de serviços possui:

- tabela de eventos `service_metric_events`;
- view agregada `service_metric_totals`;
- eventos `view`, `budget` e `message`;
- `visitor_key`;
- data UTC;
- deduplicação por serviço, tipo, visitante e dia;
- leitura de totais para o dono do anúncio.

A página de detalhe:

- registra visualização somente para visitante;
- exclui a relação owner na camada de interface;
- registra intenção de orçamento;
- registra intenção de mensagem;
- tenta persistir a métrica antes da navegação;
- possui timeout de contenção para não bloquear indefinidamente a jornada.

Essa fundação é válida como telemetria de interação, desde que não seja chamada de conversão confirmada.

### 5.2 Funil de templates de orçamento

O sistema de templates é a implementação mais madura encontrada.

Ele possui:

- tabela de aplicações;
- tabela de eventos de funil;
- eventos `started`, `progress`, `completed` e `submitted`;
- event key único;
- RLS;
- canonicalização server-side;
- exclusão explícita do dono;
- vínculo do `submitted` a pedido real;
- views de conversão;
- view de drop-off;
- janela de abandono;
- índices de chaves estrangeiras;
- ausência de respostas textuais no schema;
- painel para profissional;
- orientação para amostras pequenas;
- copy que evita afirmar causalidade da pergunta sobre abandono.

Essa implementação deve servir como referência de qualidade, mas não como registry global.

### 5.3 Métricas derivadas da Carteira

A Carteira calcula e apresenta:

- receita bruta;
- receita líquida;
- taxas;
- ticket médio;
- pedidos pagos;
- saques;
- saldo disponível;
- saldo em garantia;
- saques em processamento;
- maior movimentação;
- histórico mensal;
- comparações;
- gráficos.

O serviço já consegue consumir dashboard remoto quando a API está ativa e gerar dashboard local quando usa repository local/mock.

Essa capacidade é útil, mas precisa expor origem e autoridade.

### 5.4 Eventos de domínio

A base possui eventos internos como:

- pedido criado;
- pedido atualizado;
- mensagem enviada;
- pagamento confirmado;
- pagamento liberado;
- disputa aberta;
- disputa resolvida;
- serviço criado;
- serviço atualizado;
- avaliação criada;
- sessão alterada.

Esses eventos podem alimentar analytics, desde que:

- não sejam consumidos diretamente sem schema;
- sejam deduplicados;
- tenham versão;
- possuam origem;
- sejam reconciliados com a autoridade.

### 5.5 Audit log de segurança

A camada de permissões registra eventos com:

- tipo;
- ação;
- resultado;
- recurso;
- resource ID;
- ator;
- papel;
- motivo;
- metadata;
- timestamp.

Isso demonstra preocupação com auditabilidade.

O registro atual é local e deve permanecer separado de analytics de produto.

### 5.6 Feature flags

A base possui:

- defaults;
- aliases;
- query overrides;
- localStorage overrides;
- safe mode;
- snapshot de flags;
- flags de shell;
- flags de controllers;
- flags de network;
- canários de escrita;
- canários de beta.

Essas flags são úteis para desenvolvimento, contenção e ativação controlada.

Elas não constituem plataforma de experimentação.

---

## 6. Causa raiz

A causa raiz não é ausência completa de números.

É a ausência de uma autoridade transversal que responda:

```text
qual pergunta este evento responde?
quem é o owner?
qual schema foi usado?
qual versão está ativa?
qual é a fonte autoritativa?
qual consentimento existia na coleta?
qual população era elegível?
qual unidade foi randomizada?
a variante foi realmente exibida?
o evento foi confirmado no servidor?
o evento é duplicado?
o evento chegou atrasado?
o evento pertence a staging, fixture, bot ou produção?
o dado é local, remoto, estimado ou reconciliado?
o KPI usa ledger ou clique?
qual retenção é permitida?
qual cardinalidade é aceitável?
qual dashboard consome o evento?
qual decisão pode ser tomada?
qual decisão não pode ser tomada?
```

Hoje, a instrumentação é dividida entre:

- métricas de anúncio;
- métricas de templates;
- dashboard da Carteira;
- eventos de domínio;
- audit log de segurança;
- console;
- estados de experiência;
- feature flags;
- workflows e relatórios operacionais.

A soma desses mecanismos não forma analytics de produto canônico.

---

## 7. Achados P0

### ANALYTICS-P0-01 — ausência de registry global de eventos

Não existe um catálogo canônico que defina:

- event name;
- event version;
- owner;
- descrição;
- trigger;
- fonte;
- propriedades permitidas;
- propriedades proibidas;
- classificação de dados;
- consentimento;
- dedupe key;
- retenção;
- consumidores;
- status de depreciação.

Consequências:

- nomes podem divergir;
- eventos iguais podem significar coisas diferentes;
- propriedades podem crescer sem controle;
- dados sensíveis podem entrar silenciosamente;
- dashboards podem depender de eventos obsoletos;
- mudanças quebram séries históricas.

### ANALYTICS-P0-02 — intenção é confundida com resultado

As métricas de anúncio registram `budget` e `message` quando a pessoa aciona links.

Isso mede:

```text
intenção de navegar
```

Não mede necessariamente:

```text
orçamento iniciado
orçamento enviado
mensagem criada
conversa criada
pedido criado
```

A Doke deve separar:

```text
service.budget_cta.clicked
quote.form.started
quote.form.completed
quote.request.submitted
order.request.confirmed
```

E:

```text
service.message_cta.clicked
message.composer.opened
message.send.attempted
message.send.confirmed
conversation.created
```

### ANALYTICS-P0-03 — métricas de anúncio possuem autoridade excessiva no browser

O browser gera `visitor_key` e escreve diretamente eventos de serviço.

A deduplicação diária reduz duplicação acidental, mas não impede:

- reset de sessionStorage;
- múltiplas sessões artificiais;
- automação;
- chamada direta ao repository;
- múltiplos navegadores;
- manipulação pelo próprio dono em outra sessão;
- bots;
- headless traffic;
- replay intencional com visitor keys novas.

Essas métricas não podem ser usadas para:

- cobrança;
- ranking;
- verificação;
- benefício financeiro;
- punição;
- distribuição de tráfego;
- claims comerciais definitivos.

sem anti-gaming e confirmação server-side.

### ANALYTICS-P0-04 — ausência de consent snapshot no evento

Os eventos atuais não transportam uma fotografia canônica de:

- analytics consent;
- personalization consent;
- support diagnostics consent;
- consent version;
- timestamp;
- region/policy profile;
- collection purpose.

Sem isso, não é possível provar por que um evento foi coletado ou limitar consumidores posteriores.

### ANALYTICS-P0-05 — diagnóstico de suporte inicia marcado

A configuração “Anexar diagnóstico local” aparece marcada no HTML.

Esse padrão deve ser revertido.

Diagnóstico de suporte deve ser:

- opt-in;
- contextual ao envio de suporte;
- granular;
- previewable;
- revogável antes do envio;
- separado de analytics;
- sem coleta contínua;
- sem PII desnecessária.

### ANALYTICS-P0-06 — ausência de RUM

Não foi encontrada autoridade para:

- LCP;
- INP;
- CLS;
- FCP;
- TTFB;
- route transition;
- hydration duration;
- skeleton duration;
- time to useful content;
- interaction to feedback;
- recovery time;
- long tasks;
- resource failures.

A Doke possui contratos de performance percebida, mas ainda não consegue observar a experiência real em produção.

### ANALYTICS-P0-07 — ausência de captura global de erro

Não foi encontrada autoridade transversal para:

- `window.error`;
- `unhandledrejection`;
- resource load errors;
- route swap failures;
- hydration timeout;
- component boundary failure;
- unknown outcome;
- offline/reconnect failure.

Consequência:

- erros podem existir somente no console;
- regressões podem ser invisíveis;
- falhas por navegador não são agrupadas;
- não há taxa de sessões sem erro;
- não há correlação com jornada.

### ANALYTICS-P0-08 — feature flags podem ser alteradas por URL e localStorage

A infraestrutura atual permite overrides por:

- query string;
- localStorage;
- window config.

Isso é aceitável para desenvolvimento, debug e canários explícitos.

É inadequado como assignment de experimento porque:

- a pessoa pode escolher a variante;
- links podem contaminar cohorts;
- a atribuição pode mudar entre rotas;
- não existe unidade de randomização;
- não existe exposure event;
- não existe sticky assignment server-side;
- não existe sample ratio monitoring.

### ANALYTICS-P0-09 — não existe plataforma de experimentação

Não foram encontrados contratos para:

- experiment ID;
- hypothesis;
- primary metric;
- guardrail metrics;
- eligibility;
- unit of randomization;
- allocation;
- layers;
- mutual exclusion;
- holdout;
- assignment version;
- exposure;
- start/end;
- stop rule;
- sample size;
- SRM;
- analysis plan;
- rollback.

### ANALYTICS-P0-10 — ausência de exposure logging

Uma pessoa só pode contar no experimento depois que:

- foi elegível;
- recebeu assignment válido;
- a variante foi renderizada;
- a superfície estava visível;
- o componente estava funcional.

Flag habilitada não prova exposição.

### ANALYTICS-P0-11 — ausência de correlação ponta a ponta

Não existe envelope transversal conectando:

```text
route
→ session
→ journey
→ intent
→ request
→ server command
→ domain event
→ notification
→ outcome
```

Sem correlation ID e intent ID:

- cliques não fecham com comandos;
- erros não fecham com pedidos;
- unknown outcomes não fecham com reconciliação;
- latência frontend não fecha com latência backend;
- funis podem contar entidades diferentes.

### ANALYTICS-P0-12 — dashboards não expõem provenance consistentemente

A Carteira pode consumir:

- dashboard remoto;
- repository local;
- mock;
- fallback calculado.

A interface não possui contrato transversal obrigatório para mostrar:

- source;
- authority;
- updatedAt;
- staleAt;
- reconciledAt;
- simulated;
- incomplete;
- timezone;
- currency;
- sample size.

Métricas financeiras locais podem parecer reais.

### ANALYTICS-P0-13 — audit log local contém identidade e metadata

O audit log de segurança local inclui:

- actorId;
- actorRole;
- actorName;
- resourceId;
- reason;
- metadata.

E persiste até 120 registros em localStorage.

Riscos:

- PII residual após logout;
- leitura por scripts do mesmo origin;
- metadata não controlada;
- mistura com diagnóstico;
- falsa sensação de audit trail server-side;
- exposição em suporte.

Audit log local deve ser tratado como debug de UX, não como auditoria canônica.

### ANALYTICS-P0-14 — funil de templates é isolado

O subsistema de templates possui boas garantias, mas:

- não usa registry global;
- não carrega consent snapshot;
- não compartilha correlation ID;
- não compartilha nomenclatura com os demais funis;
- não possui política transversal de retenção;
- não possui collector transversal;
- não possui quality dashboard comum.

### ANALYTICS-P0-15 — labels de pergunta podem carregar conteúdo sensível

O funil não envia respostas, o que é positivo.

Porém, envia:

- `last_question_id`;
- `last_question_label`.

Templates customizados podem conter perguntas relacionadas a:

- saúde;
- endereço;
- situação financeira;
- documentos;
- segurança;
- dados familiares;
- conteúdo livre criado pelo profissional.

A preferência deve ser:

```text
questionSchemaId
questionPosition
questionSemanticCategory
```

E não label livre.

### ANALYTICS-P0-16 — ausência de fila de entrega e política de falha

Não existe contrato global para:

- batching;
- retry;
- offline queue;
- unload delivery;
- backpressure;
- rate limit;
- drop policy;
- event priority;
- max payload;
- max age;
- dedupe local;
- dedupe de ingestão.

Analytics nunca pode bloquear a jornada.

Eventos não essenciais podem ser descartados sob pressão.

Eventos autoritativos devem vir do domínio, não depender do unload do browser.

### ANALYTICS-P0-17 — ausência de quality gates

Não existem gates transversais para:

- schema violations;
- unknown events;
- unknown properties;
- cardinality explosion;
- duplicate rate;
- late arrival;
- clock skew;
- missing required events;
- broken funnels;
- bot rate;
- internal traffic;
- fixture contamination;
- staging contamination;
- sample ratio mismatch;
- consent mismatch.

### ANALYTICS-P0-18 — ausência de métrica canônica de marketplace

A Doke possui contagens locais, mas não uma metric tree consolidada para:

- demanda;
- oferta;
- liquidez;
- qualidade do match;
- tempo de resposta;
- aceite;
- agendamento;
- conclusão;
- confiança;
- retenção;
- recorrência;
- recontratação;
- disputa;
- cancelamento;
- cobertura geográfica.

### ANALYTICS-P0-19 — métricas financeiras dependem de PAY-B03

PAY-B03A adicionou contratos comerciais repository-only, mas PAY-B03 permanece sem autoridade material completa.

Até a aprovação canônica de:

- take rate;
- fee;
- escrow;
- refund;
- dispute;
- chargeback;
- payout;
- reconhecimento de receita;
- tratamento fiscal;

analytics não pode declarar definitivamente:

- GMV;
- receita líquida;
- receita reconhecida;
- margem;
- taxa de refund;
- saldo em escrow;
- payout concluído;
- chargeback rate.

A fonte definitiva deverá ser o ledger financeiro, nunca eventos de clique.

### ANALYTICS-P0-20 — risco de Goodhart e métricas manipuláveis

Quando uma métrica passa a influenciar:

- ranking;
- destaque;
- remuneração;
- badges;
- verificação;
- penalidade;
- distribuição de leads;

participantes passam a otimizá-la.

Visualizações e contatos client-side são particularmente vulneráveis.

Toda métrica com incentivo deve possuir:

- anti-gaming;
- eligibility;
- dedupe server-side;
- anomaly detection;
- review;
- appeal quando afetar direitos ou distribuição material.

### ANALYTICS-P0-21 — ausência de confiança e amostra em painéis genéricos

O painel de templates já contém guidance para amostras pequenas.

Essa proteção não é transversal.

Todo painel deve informar:

- sample size;
- janela;
- freshness;
- confidence;
- incomplete data;
- comparação válida;
- ausência de causalidade.

### ANALYTICS-P0-22 — médias podem ocultar cauda ruim

Métricas de tempo não devem usar apenas média.

Exigir:

- mediana;
- p75;
- p90;
- p95 para operação;
- distribuição;
- taxa acima do limite;
- segmentação por rota e modo de navegação.

### ANALYTICS-P0-23 — eventos internos podem ser disparados por múltiplas camadas

A base publica eventos de domínio em document e window, e alguns módulos possuem listeners duplicados ou fallback listeners.

Sem dedupe key e source authority, um mesmo fato pode gerar múltiplos analytics events.

### ANALYTICS-P0-24 — ausência de contrato para identidade guest → conta

A Doke precisa definir quando e como:

- anonymous session;
- guest journey;
- authenticated account;
- profile;
- professional profile;

podem ser vinculados.

O vínculo não pode:

- misturar pessoas em dispositivo compartilhado;
- reidentificar além do consentido;
- carregar histórico privado de outra conta;
- duplicar eventos;
- alterar cohorts retroativamente sem versão.

---

## 8. Autoridade canônica proposta

```text
Doke.analyticsExperience
```

A autoridade é um umbrella contract.

Subautoridades propostas:

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

### 8.1 Responsabilidades de `Doke.analyticsRegistry`

- registrar eventos permitidos;
- validar nome e versão;
- validar propriedades;
- rejeitar propriedades desconhecidas em desenvolvimento;
- aplicar classificação;
- declarar owner;
- declarar retenção;
- declarar source authority;
- declarar consent requirement;
- controlar depreciação.

### 8.2 Responsabilidades de `Doke.analyticsClient`

- receber eventos permitidos;
- anexar envelope comum;
- aplicar consentimento;
- remover PII;
- aplicar sampling;
- aplicar dedupe;
- batch;
- entregar sem bloquear;
- expor resultado de entrega apenas para debug;
- nunca alterar o resultado funcional.

### 8.3 Responsabilidades de `Doke.analyticsIdentity`

- anonymous ID rotacionável;
- session ID;
- account hash quando permitido;
- guest session isolation;
- login transition;
- logout purge;
- multi-account isolation;
- experiment unit;
- prevenção de stitching indevido.

### 8.4 Responsabilidades de `Doke.analyticsConsent`

- ler consent snapshot;
- determinar purpose;
- permitir ou bloquear coleta;
- limitar propriedades;
- registrar versão;
- reagir à revogação;
- impedir retroactive enrichment indevido.

### 8.5 Responsabilidades de `Doke.analyticsQuality`

- schema compliance;
- cardinality;
- duplicates;
- late events;
- missingness;
- environment isolation;
- bot/internal traffic;
- reconciliation;
- freshness;
- SRM;
- quality alerts.

### 8.6 Responsabilidades de `Doke.experimentation`

- eligibility;
- assignment;
- sticky allocation;
- layer;
- mutual exclusion;
- holdout;
- exposure;
- guardrails;
- kill switch;
- analysis metadata.

### 8.7 Responsabilidades de `Doke.rum`

- Web Vitals;
- route timings;
- hydration timings;
- interaction feedback;
- long tasks;
- resource errors;
- sample control;
- privacy-safe dimensions.

### 8.8 Responsabilidades de `Doke.errorTelemetry`

- global errors;
- unhandled rejections;
- component failures;
- route failures;
- sanitized stack;
- release fingerprint;
- dedupe;
- severity;
- user impact;
- incident correlation.

---

## 9. Envelope canônico de evento

```text
AnalyticsEventEnvelope
├── eventId
├── eventName
├── eventVersion
├── occurredAt
├── emittedAt
├── receivedAt
├── environment
├── releaseId
├── buildId
├── source
├── sourceAuthority
├── routeKey
├── navigationType
├── sessionId
├── anonymousId
├── accountIdHash
├── accountGeneration
├── role
├── journeyId
├── intentId
├── correlationId
├── traceId
├── entityType
├── entityIdHash
├── entityRevision
├── dedupeKey
├── consentSnapshot
├── experimentExposures
├── dataClassification
├── sampleRate
└── properties
```

### 9.1 Regras

- `eventId` único;
- `eventName` registrado;
- `eventVersion` obrigatório;
- timestamps ISO UTC;
- `receivedAt` definido na ingestão;
- `environment` obrigatório;
- `sourceAuthority` explícita;
- IDs sensíveis reduzidos ou hashed quando possível;
- query string removida;
- propriedades livres proibidas;
- payload com tamanho limitado;
- event envelope imutável após ingestão;
- backfill usa flag e versão próprias.

---

## 10. Nomenclatura canônica

Formato:

```text
<domain>.<object>.<action>
```

Exemplos:

```text
navigation.route.viewed
marketplace.search.submitted
marketplace.search.results_rendered
marketplace.search.zero_results
service.card.impression
service.card.opened
service.detail.viewed
service.budget_cta.clicked
quote.form.started
quote.form.progressed
quote.form.completed
quote.request.submitted
order.request.confirmed
order.status.changed
message.send.attempted
message.send.confirmed
payment.intent.started
payment.intent.unknown_outcome
payment.hold.confirmed
wallet.dashboard.viewed
report.form.submitted
report.case.receipt_confirmed
continuity.intent.reconciled
experiment.exposure.recorded
rum.web_vital.observed
frontend.error.observed
```

### 10.1 Verbos reservados

- `viewed`: superfície realmente apresentada;
- `impression`: item elegível e visível conforme threshold;
- `clicked`: interação local;
- `started`: início real de jornada;
- `attempted`: comando foi tentado;
- `accepted`: autoridade aceitou para processamento;
- `confirmed`: fato confirmado;
- `completed`: processo atingiu estado terminal esperado;
- `failed`: falha definitiva;
- `unknown_outcome`: resultado ambíguo;
- `reconciled`: estado recuperado por consulta autoritativa;
- `cancelled`: cancelamento confirmado;
- `dismissed`: pessoa dispensou superfície;
- `exposed`: variante realmente renderizada.

---

## 11. Registry de eventos

Cada entrada deve possuir:

```text
name
version
status
owner
businessQuestion
trigger
sourceAuthority
schema
requiredProperties
optionalProperties
forbiddenProperties
dataClassification
consentPurpose
dedupeStrategy
retention
sampling
eligibleEnvironments
consumers
qualitySLO
deprecationPlan
```

### 11.1 Status

```text
DRAFT
REVIEW
ACTIVE
DEPRECATED
BLOCKED
```

### 11.2 Mudanças de schema

Mudança compatível:

- adicionar propriedade opcional;
- ampliar enum apenas com consumidores preparados;
- ajustar documentação.

Mudança incompatível:

- renomear propriedade;
- alterar significado;
- alterar unidade;
- alterar fonte;
- alterar dedupe;
- alterar população.

Mudança incompatível exige nova versão.

---

## 12. Separação de planos de dados

### 12.1 Product analytics

Responde:

- como o produto é usado;
- onde jornadas falham;
- onde existe valor;
- como cohorts evoluem.

### 12.2 UX analytics

Responde:

- tarefa foi concluída?
- quanto demorou?
- onde houve erro?
- houve retry?
- houve abandono?
- houve recovery?

### 12.3 RUM

Responde:

- conteúdo carregou?
- interação respondeu?
- layout foi estável?
- rota foi útil?

### 12.4 Operational telemetry

Responde:

- serviço está saudável?
- fila está atrasada?
- latência está alta?
- error rate subiu?

### 12.5 Security audit

Responde:

- quem tentou qual ação?
- qual policy permitiu ou negou?
- qual recurso foi afetado?

### 12.6 Financial ledger

Responde:

- qual valor foi autorizado?
- qual valor foi capturado?
- qual valor está em hold?
- qual valor foi liberado?
- qual refund ou chargeback ocorreu?

### 12.7 Support diagnostics

Responde:

- qual configuração técnica acompanhou um chamado específico?

Nenhum plano pode substituir outro.

---

## 13. Consentimento e classificação

### 13.1 Purposes propostos

```text
ESSENTIAL_OPERATIONAL
SECURITY
PRODUCT_ANALYTICS
PERSONALIZATION
EXPERIMENTATION
SUPPORT_DIAGNOSTICS
MARKETING
```

### 13.2 Classificações

```text
PUBLIC
INTERNAL
PSEUDONYMOUS
PERSONAL
SENSITIVE
FINANCIAL
SECURITY
FREE_TEXT
```

### 13.3 Regras

- eventos essenciais devem ser mínimos;
- analytics opcional respeita consentimento;
- experimentação não herda consentimento automaticamente;
- marketing permanece separado;
- support diagnostics somente por ação explícita;
- revogação impede novos eventos;
- retenção é purpose-specific;
- raw free text é proibido por padrão;
- financial e security data não entram em product analytics.

### 13.4 Propriedades proibidas por padrão

- nome;
- e-mail;
- telefone;
- endereço completo;
- CEP completo;
- latitude/longitude precisas;
- texto de busca;
- texto de mensagem;
- respostas de orçamento;
- descrição de denúncia;
- dados bancários;
- dados de cartão;
- chave Pix;
- URLs privadas;
- media URLs;
- tokens;
- stack com payload do usuário;
- user agent completo quando gerar fingerprint.

---

## 14. Identidade e sessão

### 14.1 Anonymous ID

- first-party;
- rotacionável;
- não fingerprinting;
- não compartilhado entre contas após logout;
- namespace por browser profile;
- lifetime documentado.

### 14.2 Session ID

Uma sessão encerra por:

- timeout de inatividade;
- logout;
- troca de conta;
- política explícita;
- reset de privacidade.

### 14.3 Account ID

Preferir:

```text
accountIdHash
```

com salt controlado no collector.

O browser não deve possuir segredo de hashing autoritativo.

### 14.4 Guest → authenticated

O stitching deve exigir:

- mesma sessão ativa;
- transição explícita de login;
- policy permitida;
- evento de alias controlado;
- dedupe;
- nenhuma conta anterior no dispositivo.

### 14.5 Multi-account

Troca de conta deve:

- encerrar session analytics;
- limpar buffers;
- resetar experiment assignments account-scoped;
- impedir flush de eventos da conta anterior;
- criar nova account generation.

---

## 15. Metric tree do marketplace

### 15.1 North-star proposta para fase inicial

```text
serviços concluídos com qualidade e autoridade dentro da Doke
```

A north-star não deve ser apenas:

- page views;
- cadastros;
- mensagens;
- GMV;
- downloads.

Ela exige conclusão e qualidade.

### 15.2 Demand activation

Candidato:

```text
cliente elegível que envia a primeira solicitação válida
```

Definir:

- população: novas contas client elegíveis;
- janela: X dias após cadastro;
- numerador: primeira request confirmada;
- denominador: contas elegíveis;
- exclusões: fixtures, staff, fraude, testes;
- fonte: order authority.

### 15.3 Supply activation

Candidato:

```text
profissional elegível com perfil aprovado e primeiro serviço publicado
```

Não contar:

- draft;
- publicação local;
- serviço rejeitado;
- serviço sem autoridade remota;
- fixture.

### 15.4 Liquidez

Métricas:

- buscas com resultado elegível;
- cobertura por categoria e região;
- requests com ao menos um profissional elegível;
- tempo até primeira resposta;
- response rate;
- quote rate;
- acceptance rate;
- schedule rate;
- completion rate.

### 15.5 Qualidade

- cancellation rate;
- dispute rate;
- refund rate quando autorizado;
- report rate;
- block rate;
- completion with review;
- rating distribution;
- repeat hire;
- unresolved issue rate;
- safety incident rate.

### 15.6 Retenção

Separar:

- client retention;
- professional retention;
- marketplace retention;
- repeat transaction;
- repeat category;
- same-professional rehire;
- cross-category expansion.

### 15.7 Guardrails

- acessibilidade;
- error rate;
- performance;
- reports;
- disputes;
- cancellations;
- support contacts;
- professional concentration;
- geographic inequity;
- response burden;
- notification fatigue.

---

## 16. Funil canônico principal

```text
search_executed
→ results_rendered
→ service_impression
→ service_detail_viewed
→ quote_started
→ quote_completed
→ request_submitted
→ request_confirmed
→ professional_response_confirmed
→ proposal_confirmed
→ order_accepted
→ schedule_confirmed
→ payment_hold_confirmed
→ service_started
→ completion_confirmed
→ review_submitted
→ rehire_confirmed
```

### 16.1 Regras

- cada estágio possui autoridade;
- etapas podem ser opcionais por modelo de serviço;
- funil deve registrar branch;
- denominador de uma etapa é a população elegível da etapa anterior;
- não misturar usuários e eventos no mesmo cálculo;
- não misturar primeira jornada e recorrência;
- não misturar local/mock e remoto;
- não misturar client e professional perspectives.

---

## 17. Métricas de busca

Eventos:

```text
marketplace.search.submitted
marketplace.search.results_rendered
marketplace.search.zero_results
marketplace.search.failed
marketplace.search.filter_applied
marketplace.search.result_opened
```

Propriedades permitidas:

- query token count;
- normalized intent category;
- result count bucket;
- location granularity ampla;
- filters count;
- latency;
- source surface;
- correction applied;
- fallback used.

Proibido:

- query raw;
- CEP completo;
- endereço;
- coordenada precisa;
- nomes próprios extraídos;
- free text.

Métricas:

- zero-result rate;
- reformulation rate;
- result-open rate;
- time to first useful result;
- filter effectiveness;
- search-to-request conversion;
- partial term recovery;
- fallback reliance.

---

## 18. Impressões de cards

Uma impressão exige:

- item renderizado;
- item elegível;
- visibilidade mínima;
- duração mínima;
- tab visível;
- não skeleton;
- não hidden rail;
- não prefetch invisível.

Envelope:

```text
service.card.impression
```

Propriedades:

- serviceIdHash;
- position;
- rail;
- rankingVersion;
- queryContextId;
- category;
- experimentExposure;
- visibilityRatio bucket.

Não registrar impression em toda renderização virtual sem dedupe.

---

## 19. Métricas de anúncio para profissionais

### 19.1 Contagens permitidas

- visualizações qualificadas;
- abertura de detalhe;
- clique em orçamento;
- orçamento iniciado;
- orçamento enviado;
- clique em mensagem;
- mensagem confirmada;
- pedido confirmado;
- taxa de resposta;
- tempo de resposta;
- conclusão.

### 19.2 Apresentação

Cada métrica deve mostrar:

- nome exato;
- tooltip;
- janela;
- source;
- freshness;
- sample size;
- bot filtering status;
- diferença entre clique e resultado.

### 19.3 Métricas proibidas sem autoridade

- “clientes interessados” baseado em views;
- “leads” baseado em cliques;
- “conversão” baseada somente em navegação;
- ranking baseado em tráfego client-side;
- renda estimada sem política autorizada.

---

## 20. Quote-template analytics

### 20.1 Preservar

- RLS;
- idempotência;
- owner exclusion;
- submitted vinculado a order;
- answer content exclusion;
- small sample guidance;
- non-causal copy;
- security-invoker views.

### 20.2 Evoluir

- registrar no registry global;
- anexar consent snapshot;
- substituir labels livres por semantic IDs;
- anexar correlation ID;
- anexar environment e release;
- quality metrics;
- retention policy;
- bot/internal exclusion;
- exposure aos guidance variants;
- versionar modelos e schema.

### 20.3 Métricas

- application count;
- form start;
- completion;
- submission;
- abandonment;
- completion time;
- submission time;
- drop-off position;
- question count;
- category benchmark.

Nenhuma recomendação pode afirmar causalidade sem experimento.

---

## 21. Métricas de Pedidos

Eventos autoritativos devem nascer do domínio:

```text
order.request.confirmed
order.accepted
order.declined
order.proposal.confirmed
order.charge.confirmed
order.schedule.confirmed
order.started
order.completion_requested
order.completed
order.cancelled
order.dispute_opened
order.dispute_resolved
```

Métricas:

- request confirmation rate;
- first response time;
- response rate;
- proposal rate;
- acceptance rate;
- schedule confirmation rate;
- time to start;
- completion rate;
- cancellation rate por estágio;
- dispute rate;
- unknown outcome rate;
- recovery rate;
- duplicate command prevented.

---

## 22. Métricas de Mensagens

Separar:

```text
composer_opened
send_attempted
server_accepted
send_confirmed
delivered
read
failed
unknown_outcome
retried
```

Não coletar:

- conteúdo;
- attachment name raw;
- URL;
- contact info;
- scam keywords raw.

Propriedades seguras:

- message type;
- attachment category;
- size bucket;
- latency;
- retry count;
- conversation age bucket;
- linked order state;
- safety intervention code.

---

## 23. Métricas de Pagamento e Carteira

### 23.1 Fonte

Somente ledger/server authority pode confirmar:

- payment hold;
- release;
- refund;
- chargeback;
- dispute;
- payout;
- fee;
- revenue.

### 23.2 Eventos de UX

O frontend pode registrar:

```text
payment.screen.viewed
payment.method.selected
payment.confirm.clicked
payment.confirm.unknown_outcome
payment.status.reconciled
wallet.dashboard.viewed
wallet.statement.filtered
wallet.withdraw.started
```

Esses eventos não substituem fatos financeiros.

### 23.3 Provenance banner

Dashboards devem expor:

```text
REMOTE_LEDGER
REMOTE_AGGREGATE
LOCAL_FIXTURE
LOCAL_SIMULATION
STALE_CACHE
INCOMPLETE
```

### 23.4 Valores

Analytics pode receber:

- amount bucket;
- currency;
- policy version;
- event state.

Evitar valores exatos no product analytics quando desnecessário.

---

## 24. Trust & Safety analytics

Eventos:

```text
report.form.opened
report.form.submitted
report.receipt.confirmed
block.confirmed
mute.confirmed
case.status.changed
appeal.submitted
appeal.resolved
safety_warning.shown
safety_warning.acted
```

Não coletar em analytics:

- descrição da denúncia;
- evidence content;
- mensagem reportada;
- identidade do acusado além de hash/role permitido;
- anexos;
- localização precisa.

Métricas:

- report submission completion;
- receipt confirmation;
- time to acknowledgement;
- time to resolution;
- appeal rate;
- overturned sanction rate;
- repeat harm rate;
- warning effectiveness;
- false positive indicators.

Essas métricas não autorizam automação punitiva isolada.

---

## 25. Métricas de continuidade

Eventos:

```text
continuity.intent.persisted
continuity.intent.resumed
continuity.intent.unknown_outcome
continuity.intent.reconciled
continuity.draft.restored
continuity.draft.conflict
continuity.cross_tab_conflict_prevented
continuity.stale_data.shown
continuity.reconnect.started
continuity.reconnect.completed
```

Métricas:

- resume success rate;
- unknown outcome rate;
- reconciliation latency;
- duplicate prevented;
- draft recovery rate;
- draft conflict rate;
- stale duration;
- reconnect success;
- reload completion rate.

---

## 26. Real User Monitoring

### 26.1 Web Vitals

Coletar por rota:

- LCP;
- INP;
- CLS;
- FCP;
- TTFB.

### 26.2 Milestones Doke

```text
document_start
shell_visible
primary_heading_visible
critical_css_ready
route_controller_ready
first_skeleton_visible
first_useful_content
primary_action_ready
hydration_settled
background_refresh_settled
```

### 26.3 Navegação

Separar:

- direct load;
- reload;
- back_forward;
- stable shell navigation;
- deep link;
- restored BFCache.

### 26.4 Métricas percebidas

- blank time;
- skeleton time;
- time to first useful card;
- time to search readiness;
- time to composer readiness;
- time to payment context;
- click to visible feedback;
- error to recovery;
- keyboard obstruction duration.

### 26.5 Agregação

Usar:

- p50;
- p75;
- p90;
- p95;
- good/needs-improvement/poor buckets;
- error rate;
- sample size.

### 26.6 Privacidade

Dimensões permitidas:

- route key;
- layout mode;
- input mode;
- connection bucket;
- memory bucket quando disponível e seguro;
- navigation type;
- release;
- browser family ampla;
- OS family ampla.

Proibido fingerprint detalhado.

---

## 27. Error telemetry

### 27.1 Fontes

- global error;
- unhandled rejection;
- resource error;
- route swap;
- hydration timeout;
- controller init;
- API classification;
- storage failure;
- permission failure;
- unknown outcome;
- schema failure.

### 27.2 Envelope

```text
ErrorEnvelope
├── errorId
├── fingerprint
├── name
├── safeMessage
├── stackHash
├── releaseId
├── routeKey
├── component
├── operation
├── severity
├── recoverable
├── userImpact
├── correlationId
├── journeyId
├── intentId
├── networkClass
├── consentSnapshot
└── breadcrumbsAllowlisted
```

### 27.3 Scrubbing

Remover:

- query params;
- tokens;
- messages;
- search terms;
- free text;
- names;
- email;
- phone;
- financial data;
- attachment names;
- raw payloads.

### 27.4 Severidade

```text
DEBUG
INFO
WARNING
ERROR
CRITICAL
```

CRITICAL exige impacto material, não apenas exception.

### 27.5 Sessão sem erro

Métrica:

```text
error-free sessions
```

segmentada por:

- release;
- route;
- browser family;
- navigation mode;
- account role.

---

## 28. Feature flags versus experimentos

### 28.1 Feature flag

Serve para:

- release control;
- kill switch;
- canary;
- entitlement;
- staged rollout;
- operational containment.

### 28.2 Experimento

Serve para testar hipótese com:

- população;
- assignment;
- exposição;
- métrica;
- guardrail;
- análise.

Uma flag pode entregar variante, mas não define o experimento sozinha.

### 28.3 Overrides locais

Query/localStorage:

- permitidos em local/staging;
- permitidos para debug explícito;
- devem marcar sessão como internal/test;
- devem excluir analytics principal;
- devem gerar debug exposure separado;
- proibidos para assignment de produção.

---

## 29. Contrato de experimento

```text
ExperimentDefinition
├── experimentId
├── version
├── name
├── hypothesis
├── owner
├── status
├── startAt
├── endAt
├── eligibility
├── unit
├── layer
├── allocation
├── variants
├── primaryMetric
├── secondaryMetrics
├── guardrails
├── minimumSample
├── minimumDuration
├── stopRule
├── exclusionRules
├── consentPurpose
├── rollbackPlan
└── analysisPlan
```

### 29.1 Status

```text
DRAFT
APPROVED
RUNNING
PAUSED
STOPPED
ANALYZING
CONCLUDED
INVALID
```

### 29.2 Unidade de randomização

Escolher explicitamente:

- anonymous device;
- account;
- professional profile;
- service;
- order;
- conversation;
- geographic market.

Não trocar unidade no meio do teste.

### 29.3 Sticky assignment

Assignment deve permanecer estável por:

- versão;
- unidade;
- layer;
- período.

### 29.4 Layers

Experimentos que afetam a mesma superfície ou métrica devem usar mutual exclusion.

### 29.5 Holdout

Manter holdout quando necessário para medir efeito acumulado de múltiplas mudanças.

---

## 30. Exposure event

```text
experiment.exposure.recorded
```

Campos:

- experimentId;
- experimentVersion;
- variantId;
- assignmentId;
- unitType;
- unitIdHash;
- surface;
- component;
- route;
- renderedAt;
- visible;
- eligibilitySnapshot;
- consentSnapshot.

### 30.1 Regras

- no máximo uma exposição por unidade/surface/version conforme contrato;
- não registrar apenas por flag evaluation;
- não registrar para prefetch;
- não registrar se componente falhou;
- não registrar se hidden;
- registrar exposição antes do outcome;
- outcome deve carregar exposure IDs.

---

## 31. Guardrails de experimentação

Obrigatórios:

- error-free sessions;
- LCP/INP/CLS;
- accessibility violations;
- cancellation rate;
- report rate;
- dispute rate;
- support contacts;
- notification opt-out;
- unknown outcome;
- professional response burden;
- concentration/fairness.

Experimentos não podem degradar guardrails materiais para melhorar métrica primária.

---

## 32. Experimentos proibidos ou restritos

Sem revisão específica, não experimentar:

- consentimento;
- privacidade;
- segurança;
- claims de verificação;
- preço oculto;
- taxa financeira;
- refund rights;
- denúncia;
- blocking;
- acessibilidade crítica;
- confirmação destrutiva;
- mensagens de risco;
- dark patterns;
- urgência falsa;
- escassez falsa;
- ordenação discriminatória.

---

## 33. Análise de experimento

### 33.1 Pré-registro

Antes do início:

- hipótese;
- primary metric;
- denominator;
- guardrails;
- sample;
- duration;
- segmentation;
- exclusions;
- stop rule.

### 33.2 Sample ratio mismatch

Monitorar assignment versus exposição.

SRM material invalida interpretação até investigação.

### 33.3 Peeking

Não encerrar apenas porque p-value cruzou threshold em uma leitura intermediária não planejada.

### 33.4 Multiple comparisons

Corrigir ou limitar métricas/segmentos explorados.

### 33.5 Practical significance

Efeito estatístico sem impacto prático não justifica rollout.

### 33.6 Novelty

Resultados iniciais podem refletir novidade.

### 33.7 Heterogeneous effects

Segmentação deve ser pré-especificada quando material.

---

## 34. Data quality

### 34.1 Schema validation

- client em desenvolvimento;
- collector em todas as ingestões;
- warehouse em testes;
- unknown event bloqueado ou quarantined.

### 34.2 Duplicação

Medir:

- duplicate rate;
- dedupe reason;
- retries;
- replay;
- duplicate source.

### 34.3 Late events

Registrar:

- occurredAt;
- receivedAt;
- lateness bucket;
- max accepted age.

### 34.4 Clock skew

Não confiar apenas no relógio do browser.

### 34.5 Cardinalidade

Proibir propriedades de alta cardinalidade não aprovadas:

- raw IDs;
- URLs;
- text;
- timestamps em property;
- random values;
- stack completa como dimension.

### 34.6 Ambiente

Obrigatório:

```text
local
staging
preview
production
synthetic
fixture
internal
```

Dashboards de produção excluem todos os demais por padrão.

### 34.7 Bots

Classificar e excluir quando a métrica exigir comportamento humano.

### 34.8 Reconciliation

Comparar analytics com:

- orders table;
- messages authority;
- payment ledger;
- reports cases;
- services authority.

---

## 35. Anti-gaming

### 35.1 Visualizações

- dedupe server-side;
- bot detection;
- owner exclusion;
- internal exclusion;
- visibility threshold;
- rate limits;
- anomaly detection;
- session reset resistance.

### 35.2 Contatos

Preferir confirmação de:

- quote started;
- quote submitted;
- message confirmed;
- conversation created.

Clique permanece métrica intermediária.

### 35.3 Rankings

Nunca usar contagem bruta isolada.

Considerar:

- eligible impressions;
- Bayesian smoothing;
- sample minimum;
- freshness;
- category normalization;
- fraud signals;
- fairness;
- appeal.

### 35.4 Incentivos

Métrica usada para benefício material deve ser documentada e monitorada contra abuso.

---

## 36. Dashboards

Todo dashboard deve mostrar:

- título preciso;
- definição;
- fonte;
- authority;
- período;
- timezone;
- freshness;
- sample size;
- filters;
- exclusions;
- last updated;
- incomplete state;
- confidence;
- owner;
- link para metric dictionary.

### 36.1 Estados

```text
LOADING
READY
STALE
INCOMPLETE
EMPTY
ERROR
UNAUTHORIZED
SIMULATED
```

### 36.2 Zero

Zero pode significar:

- nenhum evento;
- evento não coletado;
- collector quebrado;
- filtro excessivo;
- falta de autoridade;
- dado atrasado.

A interface deve diferenciar.

### 36.3 Comparação

Comparações devem alinhar:

- duração;
- timezone;
- população;
- definição;
- version;
- completeness.

---

## 37. Metric dictionary

Cada métrica deve conter:

```text
metricId
name
status
owner
description
businessQuestion
formula
numerator
denominator
unit
population
window
timezone
attribution
sourceTables
sourceEvents
sourceAuthority
exclusions
freshness
qualityChecks
knownLimitations
segmentsAllowed
privacyClassification
changeHistory
```

### 37.1 Exemplo

```text
metricId: marketplace.request_confirmation_rate.v1
numerator: unique eligible journeys with order.request.confirmed
 denominator: unique eligible quote journeys with quote.request.submitted
window: 7-day attribution
sourceAuthority: orders server authority
exclusions: fixtures, internal, duplicate, fraud-blocked
```

---

## 38. Attribution

A Doke deve declarar:

- first touch;
- last touch;
- causal experiment;
- direct;
- organic;
- notification;
- search;
- recommendation;
- profile;
- rehire.

Não misturar modelos no mesmo dashboard.

Atribuição não prova causalidade.

---

## 39. Retenção e cohort

### 39.1 Cohort anchor

Exemplos:

- cadastro;
- primeira request;
- primeiro serviço publicado;
- primeira conclusão;
- primeiro recebimento.

### 39.2 Retenção client

- voltou;
- buscou;
- solicitou;
- concluiu;
- recontratou.

### 39.3 Retenção professional

- manteve serviço ativo;
- respondeu;
- aceitou;
- concluiu;
- publicou novo serviço;
- permaneceu disponível.

### 39.4 Retenção de valor

Retorno sem ação de valor não deve ser a única retenção.

---

## 40. Observabilidade por jornada

### 40.1 Busca

- submit latency;
- result latency;
- zero results;
- error;
- retry;
- stale shown;
- result open.

### 40.2 Pedido

- command latency;
- accepted;
- unknown outcome;
- reconcile latency;
- state propagation latency;
- duplicate prevented.

### 40.3 Mensagem

- composer readiness;
- send latency;
- delivery latency;
- realtime reconnect;
- attachment failure;
- unread reconciliation.

### 40.4 Pagamento

- context load;
- confirm attempt;
- authority acknowledgement;
- unknown outcome;
- reconciliation;
- hold confirmation;
- ledger projection delay.

### 40.5 Trust & Safety

- form completion;
- receipt latency;
- evidence upload failure;
- case acknowledgement;
- status visibility.

---

## 41. SLOs de experiência

SLOs devem ser definidos após baseline real.

Categorias:

- route availability;
- first useful content;
- interaction feedback;
- command confirmation;
- error-free session;
- recovery;
- reconciliation;
- accessibility;
- data freshness.

Não congelar thresholds arbitrários antes de medir distribuição real.

---

## 42. Alertas

Alertas devem depender de:

- impacto;
- duração;
- volume;
- baseline;
- segmentação;
- release correlation.

Evitar alertas em contagens absolutas sem denominador.

Exemplos:

- request confirmation rate cai;
- unknown outcome sobe;
- error-free sessions cai;
- LCP p75 degrada;
- message confirmation latency sobe;
- report receipt falha;
- service metric ingestion quebra;
- experiment SRM detectado.

---

## 43. Release health

Cada release deve possuir:

- release ID;
- deploy timestamp;
- commit SHA;
- environment;
- feature flags snapshot;
- experiment versions;
- error rate;
- RUM comparison;
- key funnel comparison;
- rollback marker.

### 43.1 Canary

Canary traffic deve ser marcado e excluído da métrica de negócio principal.

### 43.2 Rollback

Eventos após rollback devem manter release ID correto.

---

## 44. Internal e synthetic traffic

Marcar:

- developers;
- QA;
- support;
- admin;
- automated tests;
- canaries;
- synthetic monitors;
- fixtures.

Excluir por padrão de:

- conversion;
- retention;
- ranking;
- marketplace liquidity;
- experiments.

Manter em dashboards técnicos separados.

---

## 45. Amostragem

### 45.1 Nunca amostrar cegamente

Eventos raros e críticos:

- payment unknown outcome;
- report receipt failure;
- security denial;
- fatal frontend error;
- order command duplicate;

podem exigir cobertura integral sob contrato de privacidade.

### 45.2 RUM

Pode usar sampling estável por session.

### 45.3 Sampling rate

O evento deve carregar `sampleRate`.

Dashboards devem ponderar quando necessário.

---

## 46. Entrega de eventos

Pipeline proposto:

```text
registered event
→ consent gate
→ schema validation
→ privacy scrub
→ identity envelope
→ local dedupe
→ priority queue
→ batch
→ collector
→ ingestion validation
→ server timestamp
→ dedupe
→ quarantine or accept
→ modeled tables
→ quality checks
→ dashboard
```

### 46.1 Prioridades

```text
P0_DOMAIN_CONFIRMATION
P1_ERROR_AND_RECOVERY
P2_PRODUCT_FUNNEL
P3_RUM
P4_DIAGNOSTIC
```

Eventos domain-authoritative devem preferir emissão server-side.

---

## 47. Analytics SDK de frontend

API proposta:

```text
Doke.analyticsExperience.track(name, properties, options)
Doke.analyticsExperience.expose(experimentId, context)
Doke.analyticsExperience.measure(name, value, options)
Doke.analyticsExperience.captureError(error, context)
Doke.analyticsExperience.flush(reason)
Doke.analyticsExperience.getDebugSnapshot()
```

### 47.1 Regras

- retorna rapidamente;
- não lança em produção para evento opcional;
- não bloqueia navegação;
- valida em desenvolvimento;
- não aceita evento não registrado;
- não aceita propriedades arbitrárias;
- aplica consentimento;
- aplica sampling;
- não expõe IDs sensíveis no debug.

---

## 48. Server-side events

Preferir emissão server-side para:

- order confirmed;
- proposal confirmed;
- schedule confirmed;
- payment hold;
- release;
- refund;
- payout;
- report receipt;
- sanction;
- appeal resolution;
- notification creation;
- webhook processing.

O frontend pode registrar intenção, mas o outcome vem do domínio.

---

## 49. Event reconciliation

Exemplo:

```text
payment.confirm.clicked
→ payment.intent.accepted
→ payment.hold.confirmed
```

Se existir clique sem accepted:

- abandono;
- client validation;
- network failure;
- collector issue.

Se accepted sem hold:

- processamento;
- unknown outcome;
- domain failure.

Se hold sem click:

- outra superfície;
- retry server-side;
- webhook;
- missing frontend event.

Cada discrepância possui diagnóstico diferente.

---

## 50. QA de analytics

### 50.1 Contract tests

- evento registrado;
- schema correto;
- versão correta;
- propriedade proibida rejeitada;
- consentimento aplicado;
- dedupe;
- environment;
- no PII.

### 50.2 Journey tests

Validar funis end-to-end com fixtures sintéticas.

### 50.3 Negative tests

- duplicate click;
- reload;
- two tabs;
- offline;
- unknown outcome;
- account switch;
- stale route;
- event after logout;
- invalid consent;
- oversized payload;
- raw text;
- query leak.

### 50.4 Experiment tests

- deterministic assignment;
- sticky assignment;
- layer exclusion;
- exposure only after render;
- no exposure on hidden;
- SRM detector;
- kill switch;
- internal exclusion.

### 50.5 RUM tests

- direct load;
- shell navigation;
- reload;
- BFCache;
- slow network;
- long task;
- resource failure;
- reduced motion;
- mobile keyboard.

---

## 51. Privacy QA

Automatizar busca por:

- email patterns;
- phone patterns;
- CEP;
- coordinates;
- tokens;
- message content;
- query strings;
- bank data;
- card data;
- attachment names;
- free text properties.

Eventos reprovados devem ser bloqueados ou quarantined.

---

## 52. Data QA

Checks diários:

- event volume;
- unique sessions;
- duplicates;
- unknown schema;
- missing required;
- cardinality;
- latency;
- environment mix;
- bot mix;
- consent mix;
- funnel continuity;
- authoritative reconciliation;
- dashboard freshness.

---

## 53. Critérios de aceite

### 53.1 Registry

- todos os eventos ativos registrados;
- owner definido;
- schemas versionados;
- propriedades proibidas testadas;
- depreciação documentada.

### 53.2 Consentimento

- nenhum evento opcional antes de consent;
- revogação efetiva;
- support diagnostics opt-in;
- snapshot anexado;
- logout limpa buffer.

### 53.3 Métricas

- numerador e denominador documentados;
- authority definida;
- source visível;
- mock separado;
- zero versus missing separado.

### 53.4 Experimentos

- assignment autoritativo;
- exposure real;
- guardrails;
- SRM;
- kill switch;
- análise pré-registrada.

### 53.5 Observabilidade

- global errors;
- unhandled rejections;
- RUM;
- release correlation;
- privacy scrub;
- alertas de impacto.

### 53.6 QA

- tests de contrato;
- tests de jornada;
- tests de privacidade;
- tests de experimentação;
- data quality gates.

---

## 54. Handoffs

### ANALYTICS-H01 — registry e governance

Criar:

- event registry;
- metric dictionary;
- owners;
- versioning;
- deprecation;
- review workflow.

### ANALYTICS-H02 — consentimento e identidade

Criar:

- purposes;
- consent snapshot;
- anonymous/session IDs;
- account transition;
- logout purge;
- multi-account isolation.

### ANALYTICS-H03 — analytics client

Criar:

- API canônica;
- schema validation;
- privacy scrub;
- queue;
- batching;
- sampling;
- delivery policy.

### ANALYTICS-H04 — funil de marketplace

Instrumentar:

- busca;
- impressions;
- detalhe;
- orçamento;
- pedido;
- aceite;
- agenda;
- conclusão;
- review;
- rehire.

### ANALYTICS-H05 — pedidos, mensagens e pagamentos

Conectar:

- intent;
- accepted;
- confirmed;
- unknown outcome;
- reconciled;
- domain authority.

### ANALYTICS-H06 — métricas de anúncios e templates

Endurecer:

- anti-gaming;
- source labels;
- click versus outcome;
- consent;
- semantic question IDs;
- sample guidance.

### ANALYTICS-H07 — RUM

Implementar:

- Web Vitals;
- route milestones;
- hydration;
- skeleton;
- interaction feedback;
- navigation segmentation.

### ANALYTICS-H08 — error telemetry

Implementar:

- global errors;
- unhandled rejection;
- resource errors;
- fingerprint;
- release;
- privacy scrub;
- user impact.

### ANALYTICS-H09 — experimentation

Implementar:

- experiment registry;
- assignment;
- layers;
- exposure;
- guardrails;
- SRM;
- kill switch;
- analysis metadata.

### ANALYTICS-H10 — data quality e anti-gaming

Implementar:

- dedupe;
- bots;
- internal traffic;
- cardinality;
- reconciliation;
- anomaly detection;
- fixture isolation.

### ANALYTICS-H11 — dashboards

Criar:

- marketplace health;
- activation;
- liquidity;
- quality;
- retention;
- release health;
- owner metrics;
- data quality.

### ANALYTICS-H12 — automated QA

Criar:

- schema tests;
- privacy tests;
- funnel tests;
- experiment tests;
- RUM tests;
- release gates.

---

## 55. Sequência de implementação

```text
registry e metric dictionary
→ consentimento e identidade
→ analytics client
→ server correlation IDs
→ marketplace funnel
→ pedidos/mensagens/pagamentos
→ endurecimento de métricas existentes
→ RUM
→ error telemetry
→ experimentation
→ data quality
→ dashboards
→ automated QA
```

Não iniciar experimentos antes de:

- exposure logging;
- metric definitions;
- consent;
- quality checks;
- guardrails.

---

## 56. Impacto esperado quando implementado

### Para clientes

- menos jornadas invisivelmente quebradas;
- melhorias baseadas em tarefa real;
- menos experimentos prejudiciais;
- privacidade mais clara;
- performance monitorada;
- erros detectados antes de se tornarem recorrentes.

### Para profissionais

- métricas de anúncio mais confiáveis;
- diferença clara entre views, cliques, pedidos e conversão;
- insights com amostra e contexto;
- menos incentivo a métricas manipuláveis;
- recomendações sem causalidade falsa.

### Para Produto

- funis confiáveis;
- cohorts;
- ativação;
- liquidez;
- retenção;
- experimentos válidos;
- guardrails;
- comparação de releases.

### Para Engenharia

- correlação ponta a ponta;
- error telemetry;
- RUM;
- data quality;
- regressões detectáveis;
- schemas estáveis.

### Para Trust & Safety

- métricas sem conteúdo sensível;
- receipts observáveis;
- tempos de resolução;
- false positive indicators;
- separação entre analytics e evidence.

### Para Finanças

- KPIs vinculados ao ledger;
- simulação separada de realidade;
- políticas PAY-B03 respeitadas;
- ausência de GMV fabricado por client events.

---

## 57. O que este sublote não fez

- não adicionou analytics vendor;
- não adicionou cookies;
- não adicionou tracking;
- não adicionou eventos;
- não adicionou tabelas;
- não adicionou migrations;
- não alterou consentimento;
- não ativou diagnósticos;
- não criou experimentos;
- não alterou feature flags;
- não alterou dashboards;
- não acessou staging;
- não acessou produção;
- não alterou PAY-B03;
- não mesclou PR.

---

## 58. Checklist de implementação futura

### Registry

- [ ] eventos registrados;
- [ ] schemas versionados;
- [ ] owner por evento;
- [ ] retention definida;
- [ ] forbidden properties;
- [ ] deprecation path.

### Consentimento

- [ ] purposes separados;
- [ ] analytics opt-in conforme política;
- [ ] diagnostics opt-in contextual;
- [ ] consent snapshot;
- [ ] revogação;
- [ ] logout purge.

### Identidade

- [ ] anonymous ID;
- [ ] session ID;
- [ ] account hash;
- [ ] guest isolation;
- [ ] account generation;
- [ ] stitching controlado.

### Produto

- [ ] search funnel;
- [ ] impressions;
- [ ] quote funnel;
- [ ] order funnel;
- [ ] message funnel;
- [ ] payment funnel;
- [ ] report funnel;
- [ ] rehire.

### RUM

- [ ] Web Vitals;
- [ ] route timing;
- [ ] hydration timing;
- [ ] skeleton timing;
- [ ] interaction feedback;
- [ ] recovery timing.

### Erros

- [ ] global error;
- [ ] unhandled rejection;
- [ ] resource error;
- [ ] fingerprint;
- [ ] release;
- [ ] scrub;
- [ ] alerts.

### Experimentos

- [ ] registry;
- [ ] assignment;
- [ ] exposure;
- [ ] layers;
- [ ] guardrails;
- [ ] SRM;
- [ ] kill switch;
- [ ] analysis plan.

### Qualidade

- [ ] duplicates;
- [ ] late events;
- [ ] clock skew;
- [ ] cardinality;
- [ ] bots;
- [ ] internal traffic;
- [ ] fixture isolation;
- [ ] reconciliation.

---

## 59. Decisão de produto

A Doke não deve perseguir volume de tracking.

Deve perseguir:

```text
menos eventos
+ semântica forte
+ autoridade correta
+ privacidade
+ qualidade
+ capacidade de decisão
```

Um evento só deve existir quando houver:

- pergunta;
- owner;
- decisão possível;
- schema;
- purpose;
- retention;
- quality plan.

---

## 60. Próximo sublote recomendado

```text
UX-FOUNDATION-017 — onboarding, ativação, primeiros resultados e progressão por papel
```

O próximo lote deverá definir:

- onboarding client;
- onboarding professional;
- progressive disclosure;
- primeiro valor;
- checklist de ativação;
- educação contextual;
- empty states orientados a ação;
- retomada;
- progressão de perfil;
- métricas de ativação consumindo o contrato UX-016;
- prevenção de onboarding coercitivo;
- acessibilidade e mobile.

---

## 61. Estado final do UX-016

```text
status: SPECIFIED
runtime_change: 0
html_change: 0
css_change: 0
javascript_change: 0
migration_change: 0
workflow_change: 0
staging_access: 0
production_access: 0
merge: 0
auto_merge: 0
ready_for_review: 0
```

O PR deve permanecer draft e não deve ser mesclado sem autorização explícita.
