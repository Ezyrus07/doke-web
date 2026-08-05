# UX-PERF-001 — Loading lifecycle, hydration budgets e progressive rendering

## Status

- Frente: `UX-IMPLEMENTATION`;
- Sublote: `UX-PERF-001`;
- Branch: `ux/ux-perf-001-loading-budgets`;
- Base: `ux/ux-resp-001-viewport-overflow`;
- Base head: `d00590a29d429f438ae5e248763af5fde7a60bb5`;
- Issue: `#58`;
- Fonte normativa: `UX-FOUNDATION-012`, `UX-FOUNDATION-015` e `UX-FOUNDATION-018`;
- Piloto: `novidades.html`;
- HTML, CSS, backend e migrations alterados: não;
- Staging ou produção acessados: não;
- Merge e ready-for-review autorizados: não.

---

## 1. Objetivo

Criar uma autoridade transversal para determinar quando uma experiência possui:

```text
shell utilizável
→ primeiro conteúdo útil
→ controles interativos
→ tarefas críticas concluídas
→ settlement
```

O contrato também separa:

```text
tarefa crítica
≠ tarefa importante
≠ enriquecimento opcional
≠ trabalho adiado
```

A meta não é manter loaders visíveis até todo JavaScript terminar. A meta é impedir que trabalho não essencial bloqueie valor observável.

---

## 2. Autoridades preservadas

Este sublote não substitui:

```text
DokePageHydration
DokeDocumentPreloader
DokeNavigationLifecycle
Doke.responsiveExperience
```

| Autoridade | Responsabilidade preservada |
|---|---|
| `DokePageHydration` | pending, skeleton, ready, empty, error e watchdog de páginas orientadas a dados |
| `DokeDocumentPreloader` | boot visual de documento completo e saída do splash |
| `DokeNavigationLifecycle` | transições de rota e shell estável |
| `Doke.responsiveExperience` | viewport, layout modes e overflow |

A nova autoridade apenas coordena primeiro valor, prioridade de trabalho, budgets e telemetry local.

---

## 3. Causa raiz

A base já possuía loaders e skeletons, mas não possuía uma resposta canônica para:

- qual tarefa realmente bloqueia o primeiro valor;
- quando conteúdo estático já permite liberar o preloader;
- se um enriquecimento deve esperar idle time;
- se `saveData` deve impedir trabalho opcional;
- quantas long tasks ocorreram antes do conteúdo útil;
- se a experiência excedeu budget;
- quando uma falha opcional deve degradar ou bloquear a jornada.

Sem isso, inicialização de módulo podia ser confundida com indisponibilidade da página.

---

## 4. Autoridade criada

```text
Doke.performanceExperience
```

Versão:

```text
20260804-ux-perf-001-v1
```

API:

```text
startJourney()
getJourney()
scheduleOptional()
subscribe()
getSnapshot()
markShellReady()
markContentReady()
markInteractive()
settle()
```

A API, os estados, as prioridades, os estados de tarefa e os budgets padrão são congelados.

---

## 5. Estados do journey

```text
BOOTING
SHELL_READY
CONTENT_READY
INTERACTIVE
SETTLED
DEGRADED
```

### BOOTING

A autoridade iniciou, mas o shell ainda não foi confirmado.

### SHELL_READY

A estrutura mínima pode pintar. Isso não significa que todos os dados estejam prontos.

### CONTENT_READY

Existe primeiro conteúdo útil e verdadeiro, como cache confirmado, conteúdo editorial estático, estado vazio autoritativo ou dado reconciliado.

### INTERACTIVE

Os controles necessários para o primeiro objetivo estão ligados.

### SETTLED

Requisitos:

```text
CONTENT_READY
+
INTERACTIVE
+
zero tarefas críticas pendentes
```

### DEGRADED

Uma tarefa crítica falhou ou o journey excedeu o watchdog sem settlement. Conteúdo já útil não é escondido para mascarar o problema.

---

## 6. Prioridades e estados de tarefa

Prioridades:

```text
CRITICAL
IMPORTANT
OPTIONAL
DEFERRED
```

Estados:

```text
PENDING
RUNNING
COMPLETE
FAILED
CANCELLED
SKIPPED
```

Regras:

- `CRITICAL` bloqueia settlement;
- falha crítica move o journey para `DEGRADED`;
- `OPTIONAL` nunca bloqueia first value;
- `DEFERRED` deve aguardar interação ou fase posterior;
- tarefas opcionais respeitam `saveData` e documento oculto por padrão.

---

## 7. Budgets iniciais

```text
shellReadyMs: 1800
firstUsefulContentMs: 2500
interactiveMs: 3200
settleMs: 4500
longTaskMs: 50
maxLongTasksBeforeContent: 3
maxCumulativeLayoutShift: 0.10
```

Budgets são diagnóstico e gate de regressão. Eles não autorizam esconder conteúdo, atrasar artificialmente a interface ou reclassificar tarefa crítica como opcional.

Datasets:

```text
data-doke-performance-state
="booting|shell_ready|content_ready|interactive|settled|degraded"
```

```text
data-doke-performance-budget
="pending|within|exceeded"
```

---

## 8. Métricas observadas

Quando suportado pelo navegador:

```text
first-paint
first-contentful-paint
largest-contentful-paint
layout-shift
longtask
```

O snapshot contém apenas métricas numéricas agregadas:

```text
firstPaint
firstContentfulPaint
largestContentfulPaint
cumulativeLayoutShift
longTasks
longTaskDuration
```

Não são observados resource timing entries. A autoridade não coleta URLs de scripts, imagens, endpoints, query strings, conteúdo LCP, texto do DOM ou dados de conta.

---

## 9. Privacidade

IDs técnicos são normalizados, limitados e sanitizados.

Proibido em eventos:

```text
location.href
resource entry URLs
payloads
texto do DOM
identificador bruto de conta
mensagem privada
termo de busca
PII
```

A telemetry permanece local em snapshots e eventos internos. Nenhum endpoint remoto foi criado.

---

## 10. Trabalho opcional

API:

```text
scheduleOptional({
  id,
  journeyId,
  timeout,
  allowSaveData,
  requireVisible,
  run
})
```

Política:

```text
requestIdleCallback disponível
→ executar em idle com timeout

requestIdleCallback indisponível
→ fallback curto com setTimeout
```

Por padrão:

```text
saveData = true
→ SKIPPED

document.hidden = true
→ SKIPPED
```

---

## 11. Bootstrap

`page-bootstrap.js` inicia a carga da autoridade em paralelo com a cadeia de autenticação:

```text
performanceTask começa
+
auth/session continua
+
overlay/a11y/responsive continuam
→ bootstrap publica readiness consolidada
```

Novos campos:

```text
performanceExperienceReady
performancePilotReady
```

Novas funções:

```text
Doke.pageBootstrap.ensurePerformanceExperience()
Doke.pageBootstrap.ensurePerformancePilot()
```

O piloto é carregado somente em `novidades`.

---

## 12. Piloto — Novidades

Autoridade:

```text
Doke.newsPerformancePilot
```

Journey:

```text
news-first-useful-content
```

Primeiro valor:

```text
h1 presente
+
news feature ou news card presente
```

Como o conteúdo editorial já existe no documento, ele não precisa esperar preferências locais, auditoria responsiva ou enriquecimentos.

Quando o conteúdo útil é confirmado:

```text
CONTENT_READY
→ DokeDocumentPreloader.release("news-first-useful-content")
```

A liberação usa a autoridade existente do preloader e continua idempotente.

---

## 13. Interatividade e pós-paint

A página é considerada interativa quando o boundary registra `data-ready="true"` ou quando o inicializador de Novidades já está disponível.

Um `MutationObserver` acompanha somente o boundary piloto e é desconectado após o journey ficar terminal.

A auditoria de overflow é agendada como tarefa opcional:

```text
news.post-paint-audit
```

Ela reutiliza `Doke.responsiveExperience.auditOverflow()`, não bloqueia primeiro conteúdo útil e respeita `saveData`.

---

## 14. Integração com hidratação e preloader

Eventos observados:

```text
doke:document-preloader-release
doke:page-bootstrap-ready
doke:page-hydration-state
```

Mapeamento:

```text
preloader release
→ SHELL_READY

hydration ready ou empty
→ CONTENT_READY

hydration error
→ DEGRADED
```

Selectors, skeletons, timeouts e estados internos de `DokePageHydration` e `DokeDocumentPreloader` não foram alterados.

---

## 15. Falhas

```text
performance authority indisponível
→ bootstrap continua
→ loading legado permanece ativo
```

```text
piloto indisponível
→ Novidades mantém comportamento anterior
```

```text
tarefa opcional falha
→ task FAILED
→ journey não degrada automaticamente
```

```text
tarefa crítica falha
→ journey DEGRADED
→ nenhum sucesso fabricado
```

---

## 16. Validação

O gate executa:

- sintaxe JavaScript;
- API e enums congelados;
- journey completo;
- tarefa crítica bloqueando settlement;
- conclusão crítica liberando settlement;
- falha crítica produzindo `DEGRADED`;
- trabalho opcional em idle;
- skip por `saveData`;
- budgets de first value;
- observers de LCP, CLS e long task;
- ausência de resource timing e URL completa;
- piloto de Novidades;
- carga paralela no bootstrap;
- escopo exclusivo para Novidades;
- loading navigation baseline;
- regressões UX-RESP-001, UX-A11Y-001, UX-NAV-001, UX-PRIV-001, UX-CONT-001, UX-CORE-002 e UX-CORE-001;
- auditores de navegação e auth/session;
- `git diff --check`.

---

## 17. Rollback

1. remover `assets/js/core/performance-experience.js`;
2. remover `assets/js/pages/news-performance-pilot.js`;
3. restaurar `assets/js/core/page-bootstrap.js` ao head do UX-RESP-001;
4. remover teste, workflow e documento.

Não há schema, migration, storage persistente novo, endpoint ou flag remota para reverter.

---

## 18. Fora do escopo

- reduzir todos os scripts da Home;
- reescrever stable-shell router;
- alterar preload global de fontes;
- modificar imagens e CDN;
- criar RUM remoto;
- mudar cache HTTP;
- migrar todas as rotas;
- alterar fluxos financeiros;
- declarar budgets definitivos de produção.

---

## 19. Resultado

Antes:

```text
loader/skeleton existe
→ primeiro valor não possui autoridade transversal
→ trabalho opcional pode competir com interatividade
→ budgets não são avaliados por journey
```

Depois:

```text
journey inicia
→ shell é marcado
→ primeiro conteúdo útil é confirmado
→ interatividade é confirmada
→ tarefas críticas são reconciliadas
→ settlement é publicado
→ budgets são avaliados
→ trabalho opcional usa idle e saveData policy
```

---

## 20. Próximo sublote

```text
UX-CARDS-001
— card authority, identity provenance e media geometry
```

O próximo sublote deverá usar progressive rendering para impedir que imagens, badges ou enriquecimentos opcionais atrasem a anatomia útil dos cards.
