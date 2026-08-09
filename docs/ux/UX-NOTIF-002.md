# UX-NOTIF-002 — Canonical notification event schema and fail-closed classification

## Status

- Epic: `EPIC-11 — notificações, badges e reengajamento`;
- Tracking: issue `#93`;
- Base: `ux/ux-notif-001-center-badge-authority`;
- Base SHA certificado: `eab8836702e672494a69c244d481d32156e94d3e`;
- Branch: `ux/ux-notif-002-event-schema`;
- Fase 1: autoridade pura de evento + testes/CI;
- Integração com producers/repository: não iniciada nesta fase;
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
