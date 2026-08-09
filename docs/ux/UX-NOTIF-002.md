# UX-NOTIF-002 — Canonical notification event schema and fail-closed classification

## Status

- Epic: `EPIC-11 — notificações, badges e reengajamento`;
- Tracking: issue `#93`;
- Base: `ux/ux-notif-001-center-badge-authority`;
- Base SHA certificado: `eab8836702e672494a69c244d481d32156e94d3e`;
- Branch: `ux/ux-notif-002-event-schema`;
- Fase 1: autoridade pura de evento + testes/CI certificada;
- Fase 2A: repository adapter + dependência explícita nas rotas consumidoras certificada;
- Fase 2B: producer envelopes nativos implementados; certificação depende dos gates do mesmo SHA;
- Merge autorizado: não;
- Ready for review autorizado: não;
- Staging/produção: não acessados.

## Causa raiz

O `UX-NOTIF-001` consolidou a autoridade de apresentação/unread/badge em `Doke.notificationCenter`, mas os envelopes de entrada continuam heterogêneos.

A base ainda possui produtores/adapters que podem:

1. derivar `eventKey` de combinações legadas de tipo e entidade;
2. classificar categoria por heurística textual;
3. usar `social` como fallback genérico;
4. representar o mesmo evento com identidades distintas entre repository, realtime, polling e cross-tab;
5. aceitar claims operacionais críticos sem uma fonte canônica explicitada no envelope.

Isso impede deduplicação transversal forte e permite que eventos de Pedido, Pagamento, Contestação ou Segurança sejam classificados com semântica inadequada antes de chegarem ao center.

## Fonte canônica

Este sublote implementa o handoff `NOTIF-H01 — canonical event schema` e fecha a fundação para `NOTIF-P0-03` e `NOTIF-P0-04` do `UX-FOUNDATION-009`.

A ordem é deliberada:

```text
event identity/classification
→ producers/adapters
→ toast consolidation
→ badge/attention refinements
→ digest/browser/quick actions
```

Sem identidade de evento estável, consolidar canais primeiro apenas moveria a duplicação para outra camada.

## Decisão arquitetural

A autoridade pura é:

```text
Doke.notificationEvent
```

Contrato:

```text
notification-event-v1
```

Responsabilidades:

- normalizar identidade lógica de evento;
- preferir `eventId` como identidade pública canônica;
- produzir `dedupeKey` determinística;
- classificar domínio/categoria explicitamente;
- normalizar prioridade e atenção;
- normalizar privacidade e política de canais;
- aplicar fail-closed a categoria operacional desconhecida;
- exigir source authority canônica para eventos operacionais críticos;
- produzir diagnóstico sanitizado de contrato.

Não é responsabilidade desta autoridade:

- consultar repository/service/Supabase;
- persistir eventos ou notificações;
- executar mutations;
- renderizar inbox/toast/badge;
- decidir copy final;
- acessar identidade de conta;
- disparar browser notification;
- produzir analytics de conteúdo.

## Schema da Fase 1

O snapshot normalizado expõe:

```text
contract
eventId
eventType
eventVersion
sourceDomain
sourceAuthority
dedupeKey
aggregationKey
category
priority
attentionState
actionRequired
privacyLevel
channelPolicy
accepted
rejectionReason
identitySource
criticalOperational
```

### Categorias

```text
MESSAGES
ORDERS
PROPOSALS
PAYMENTS
DISPUTES
ACCOUNT
SECURITY
COMMUNITIES
SOCIAL
PRODUCT
UNKNOWN_OPERATIONAL
```

`UNKNOWN_OPERATIONAL` é um estado fail-closed. Evento desconhecido não é rebaixado silenciosamente para `SOCIAL`.

### Prioridade

```text
LOW
NORMAL
HIGH
CRITICAL
```

### Atenção

```text
INFORMATIONAL
ACTION_REQUIRED
URGENT_ACTION_REQUIRED
RESOLVED
```

### Privacidade

```text
PUBLIC_PREVIEW
PRIVATE_GENERIC
PRIVATE_AUTHENTICATED
SENSITIVE_NO_OS_PREVIEW
```

### Source authority

```text
CANONICAL_REMOTE
CANONICAL_LOCAL
DEMO
DERIVED_INFORMATIONAL
```

Eventos classificados como `PAYMENTS`, `DISPUTES` ou `SECURITY` exigem fonte canônica (`CANONICAL_REMOTE` ou `CANONICAL_LOCAL`) nesta fase. Snapshot meramente derivado/informacional não pode produzir claim operacional crítico aceito.

## Identidade e deduplicação

Ordem de autoridade:

```text
1. eventId
2. dedupeKey/eventKey explícita
3. fallback legado controlado
4. rejeição
```

Fallback legado só existe quando o envelope fornece simultaneamente:

```text
eventType
+ primaryEntityId
+ domainSequence/fingerprint/revision
```

Forma:

```text
legacy:<eventType>:<primaryEntityId>:<fingerprint>
```

Somente `type + timestamp`, título, body ou URL não são identidade suficiente.

## Classificação explícita

A Fase 1 possui mapeamento determinístico por prefixo semântico do `eventType` para consumidores legados conhecidos.

Exemplos:

```text
message.*       → MESSAGES
order.*         → ORDERS
proposal.*      → PROPOSALS
payment.*       → PAYMENTS
dispute.*       → DISPUTES
security.*      → SECURITY
community.*     → COMMUNITIES
reaction.*      → SOCIAL
product.*       → PRODUCT
```

Prefixo desconhecido:

```text
→ UNKNOWN_OPERATIONAL
→ accepted = false
→ rejectionReason = unknown-operational-category
```

A integração futura deverá substituir gradualmente essa compatibilidade por adapters de producers com `eventType/sourceDomain/sourceAuthority` explícitos.

## Channel policy

O contrato normaliza:

```text
inbox: required | optional | forbidden
toast: allowed | silent | forbidden
browser: allowed | generic_only | forbidden
sound: allowed | forbidden
digest: allowed | forbidden
```

`SENSITIVE_NO_OS_PREVIEW` força browser notification a `forbidden` por default.

`SECURITY` e `DISPUTES` não entram no digest por default nesta Fase 1.

## Diagnóstico e privacidade

`Doke.notificationEvent.diagnostic()` publica apenas metadata de contrato:

```text
contract
version
accepted
category
priority
attentionState
identitySource
criticalOperational
reason
```

Não inclui:

- `eventId`;
- `dedupeKey`;
- account/user ID;
- entity IDs;
- título/body;
- payload;
- URL;
- conteúdo de mensagem/pedido/pagamento/disputa.

## Fase 1 — arquivos

```text
assets/js/core/notification-event.js
scripts/test-ux-notif-002-notification-event.js
docs/ux/UX-NOTIF-002.md
.github/workflows/ux-notif-002-event-schema.yml
```

Nenhum arquivo de runtime consumidor é alterado nesta fase.

## Testes determinísticos

A suíte dedicada cobre:

- publicação e congelamento da API;
- mensagens;
- pedidos;
- propostas;
- pagamentos;
- disputas;
- segurança;
- comunidades;
- social;
- produto;
- `UNKNOWN_OPERATIONAL` fail-closed;
- source authority para evento crítico;
- `eventId` como identidade preferencial;
- explicit dedupe legado;
- fallback legado com fingerprint;
- rejeição de fallback insuficiente;
- browser policy para conteúdo sensível;
- allowlist do diagnóstico sanitizado.

## Gate da Fase 1

O workflow permanente deve provar no mesmo SHA:

1. sintaxe do módulo/teste;
2. Domain Completion Matrix;
3. agent governance;
4. suíte `UX-NOTIF-002`;
5. regressões essenciais de `UX-NOTIF-001` e notification authority/API/privacy;
6. LCOV executável de `notification-event.js`;
7. Sonar Quality Gate sem New Issues, Accepted Issues ou Security Hotspots;
8. `git diff --check`.

A Fase 1 só poderá ser chamada de concluída após esses gates no mesmo head.

## Próxima fase prevista

Depois da certificação da autoridade pura:

```text
notifications-repository / producer adapters
→ normalize via Doke.notificationEvent
→ repository/realtime/polling entregam identidade coerente
→ Doke.notificationCenter recebe dedupeKey/eventId estabilizados
```

Essa integração será separada da definição do contrato e não autoriza backend ou staging.


## Fase 2A — repository adapter e runtime dependency

O primeiro passo de integração remove a autoridade paralela do repository sem alterar ainda a semântica dos producers existentes.

Decisões:

- `notifications-repository.js` deixa de possuir `getCategory()` e `getEventKey()` heurísticos;
- `Doke.notificationEvent` normaliza identidade/classificação no boundary do repository;
- `eventKey` permanece como alias transitório de `dedupeKey`;
- `category` legado permanece para filtros/UI enquanto `eventCategory` expõe a categoria canônica;
- o repository acrescenta metadata canônica de identidade, domínio, source authority, prioridade, atenção, privacidade e channel policy;
- origem remota usa `CANONICAL_REMOTE`, estado local usa `CANONICAL_LOCAL` e fixture/demo usa `DEMO`;
- a ausência de `notification-event-v1` falha fechada em `UNKNOWN_OPERATIONAL`, sem recriar inferência paralela;
- todas as páginas raiz consumidoras carregam `notification-event.js` antes do repository.

Compatibilidade transitória:

```text
category       = contrato legado de UI/filtro
eventCategory  = categoria canônica UX-NOTIF-002
eventKey       = alias transitório de dedupeKey
dedupeKey      = identidade canônica de deduplicação
```

O repository não inventa `eventId`. Enquanto producers legados enviarem apenas `eventKey`, a identidade permanece `explicit-dedupe`. A Fase 2B migrará producers para `eventId/eventType/sourceDomain` nativos e corrigirá eventos de pagamento/disputa que ainda carregam semântica legada.

### Gate da Fase 2A

- dependency order canônica nas 16 rotas consumidoras;
- nenhuma heurística `getCategory()`/`getEventKey()` no repository;
- metadata canônica sem quebrar `category` legado;
- desconhecido operacional fail-closed;
- source authority coerente com a origem;
- testes herdados, Matrix, governança, LCOV, Sonar e `git diff --check` no mesmo SHA.

## Fora de escopo

- migrations, RPCs, Supabase ou backend;
- staging/produção;
- convergência visual de cards;
- `NOTIF-H03` toast consolidation;
- digest/DND;
- browser notifications;
- quick actions;
- analytics/experimentos;
- Trust & Safety;
- merge ou ready-for-review.

## Rollback

Remover os quatro artefatos da Fase 1. Nenhum schema, storage, dado remoto ou consumidor precisa ser revertido porque a autoridade ainda não está conectada às superfícies.

## Definition of Done da Fase 1

- `Doke.notificationEvent` versionado e congelado;
- categorias operacionais não dependem de fallback `social`;
- `eventId` é identidade preferencial;
- fallback legado é determinístico e restrito;
- eventos críticos exigem source authority canônica;
- diagnósticos não expõem conteúdo/identidade;
- regressões herdadas verdes;
- LCOV e Sonar aprovados;
- PR aberto, draft, reversível e não mesclado.

## Fase 2B — producer envelopes nativos

`notification-service.js` passa a emitir identidade e classificação canônicas no producer boundary, antes do repository, preservando `type/category` legados apenas como compatibilidade transitória de UI. `notification-event.js` passa a priorizar `eventCategory/canonicalCategory` como input canônico antes do `category` legado.

- producers emitem `eventId`, `eventType` e `eventCategory`;
- o producer boundary completa `eventVersion`, `sourceDomain`, `dedupeKey` e o alias transitório `eventKey`;
- ausência de proveniência explícita usa `DERIVED_INFORMATIONAL`, nunca infere autoridade pelo provider de persistência da notificação;
- pagamentos e disputas só são aceitos pelo contrato quando recebem `sourceAuthority=CANONICAL_LOCAL|CANONICAL_REMOTE` de sua origem de negócio;
- notification API ativa não eleva automaticamente um claim crítico;
- `completion_requested` ganha `eventType=order_completion_requested`;
- contestações usam `eventType=dispute_*` / `eventCategory=DISPUTES`, embora o `type/category` legado continue intacto;
- estados de pedido que apenas refletem pagamento permanecem ORDERS; somente o producer financeiro definitivo usa PAYMENTS;
- `Doke.notificationsRepository` continua autoridade de persistência/mutation e `Doke.notificationCenter` continua autoridade de apresentação/unread/badge.

A API genérica `services.notifications.create(payload)` continua aceitando envelopes legados; apenas producers migrados recebem metadata canônica nativa nesta fase. Nenhuma mudança de backend, Supabase, migration, staging, produção, toast, digest ou browser notification faz parte deste sublote.
