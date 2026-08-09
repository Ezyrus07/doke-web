# UX-NOTIF-006 — Canonical category, priority and attention policy matrix

## Status

- Epic: `EPIC-11 — notificações, badges e reengajamento`;
- Tracking: issue `#101`;
- Base: `ux/ux-notif-005-inbox-reconciliation`;
- Base SHA certificado: `817d78df387c285b0a48a1b5a6d0a5453cb62c54`;
- Branch: `ux/ux-notif-006-event-policy-matrix`;
- Handoff: `NOTIF-H06 — category/priority matrix`;
- Fase 1: candidato permanente com Matrix sincronizada; certificação final em execução;
- Merge autorizado: não;
- Ready for review autorizado: não;
- Backend/staging/produção: não acessados.

## Causa raiz

`UX-NOTIF-002` criou o schema canônico com `category`, `priority`, `attentionState` e `actionRequired`, porém esses campos ainda eram em grande parte normalizações do que o producer fornecia.

Antes do H06:

- `priority` ausente caía genericamente em `NORMAL`;
- `attentionState` ausente caía em `INFORMATIONAL`, salvo `actionRequired=true` explícito;
- os producers atuais declaravam `eventType` e `eventCategory`, mas não uma semântica consistente de prioridade/atenção;
- eventos diferentes do mesmo domínio podiam chegar ao H04 com a mesma semântica genérica;
- H04 possuía contadores corretos, mas não uma fonte ampla e determinística para decidir quais eventos exigem ação ou urgência.

Isso é uma lacuna de policy, não de badge, toast, repository ou producer transport.

## Decisão arquitetural

A autoridade continua sendo única:

```text
Doke.notificationEvent
```

Contrato de evento permanece:

```text
notification-event-v1
```

A extensão H06 publica:

```text
notification-event-policy-matrix-v1
```

Não é criada store paralela. A policy é imutável, indexada por `eventType` canônico e consultável somente por `getPolicy(eventType)`.

## Regras de autoridade

Para `eventType` matriculado:

1. `eventType` é a chave semântica;
2. `category`, `priority`, `attentionState` e `actionRequired` vêm da matriz;
3. `eventCategory`/`canonicalCategory` explícito e contraditório falha fechado com `event-policy-category-mismatch`;
4. `category` legado de UI não compete com `eventCategory` canônico;
5. copy (`title`, `body`, URL, texto) nunca eleva categoria, prioridade ou atenção;
6. producer não pode elevar ou reduzir prioridade/atenção de um tipo matriculado por metadata ad hoc;
7. source-authority fences de PAYMENTS/DISPUTES/SECURITY continuam independentes e obrigatórias;
8. evento não matriculado conserva o fallback de compatibilidade H01 e continua fail-closed se a categoria operacional não puder ser classificada.

`CRITICAL` e `URGENT_ACTION_REQUIRED` são decisões independentes. A matriz declara ambas explicitamente.

## Matriz canônica — Fase 1

| eventType | category | priority | attentionState | actionRequired | Semântica |
|---|---|---|---|---:|---|
| `message_received` | MESSAGES | NORMAL | INFORMATIONAL | false | unread/messages já representa atenção de leitura |
| `order_created` | ORDERS | HIGH | ACTION_REQUIRED | true | profissional deve aceitar/recusar |
| `order_status_changed` | ORDERS | NORMAL | INFORMATIONAL | false | atualização genérica |
| `order_accepted` | ORDERS | NORMAL | INFORMATIONAL | false | confirmação de aceite |
| `order_in_progress` | ORDERS | NORMAL | INFORMATIONAL | false | andamento confirmado |
| `order_completed` | ORDERS | NORMAL | RESOLVED | false | fluxo encerrado |
| `order_cancelled` | ORDERS | NORMAL | RESOLVED | false | fluxo encerrado |
| `order_reviewed` | ORDERS | LOW | INFORMATIONAL | false | feedback recebido |
| `order_completion_requested` | ORDERS | HIGH | ACTION_REQUIRED | true | cliente deve confirmar ou relatar problema |
| `proposal_sent` | PROPOSALS | HIGH | ACTION_REQUIRED | true | cliente deve avaliar proposta |
| `proposal_approved` | PROPOSALS | HIGH | INFORMATIONAL | false | aprovação comunicada ao profissional |
| `proposal_rejected` | PROPOSALS | NORMAL | RESOLVED | false | proposta encerrada |
| `payment_held` | PAYMENTS | HIGH | INFORMATIONAL | false | pagamento em garantia confirmado |
| `wallet_receivable_available` | PAYMENTS | NORMAL | INFORMATIONAL | false | saldo liberado |
| `wallet_withdraw_requested` | PAYMENTS | NORMAL | INFORMATIONAL | false | solicitação registrada |
| `wallet_withdraw_completed` | PAYMENTS | NORMAL | RESOLVED | false | saque encerrado |
| `wallet_withdraw_declined` | PAYMENTS | HIGH | ACTION_REQUIRED | true | usuário deve corrigir dados/repetir saque |
| `dispute_opened` | DISPUTES | CRITICAL | URGENT_ACTION_REQUIRED | true | profissional deve responder contestação |
| `dispute_reported` | DISPUTES | HIGH | INFORMATIONAL | false | confirmação ao cliente |
| `dispute_responded` | DISPUTES | HIGH | INFORMATIONAL | false | resposta registrada; análise segue |
| `dispute_resolved` | DISPUTES | HIGH | RESOLVED | false | contestação encerrada |

A Fase 1 cobre os `eventType` canônicos atualmente emitidos por `notification-service`, `wallet-service` e os side-effects locais de disputa do `wallet-repository` dentro dos domínios Mensagens, Pedidos, Propostas, Pagamentos/Wallet e Disputas.

## Integração com H04

H04 continua derivando badge somente do snapshot do `notificationCenter`.

H06 fornece semântica consistente para:

- `actionRequiredTotal`;
- `urgentTotal`;
- `byCategory.*.actionRequired`;
- `byCategory.*.urgent`.

Read state permanece independente:

```text
read = true
```

não resolve automaticamente:

```text
attentionState = ACTION_REQUIRED | URGENT_ACTION_REQUIRED
```

Somente um evento semanticamente resolvido ou nova projeção de domínio pode encerrar atenção.

## Compatibilidade H01/H02

Os eventos legados não matriculados, como formas antigas com ponto (`order.created`, `message.received`), continuam usando a normalização H01 por prefixo/metadata.

Isso preserva compatibilidade durante a migração sem permitir que um `eventType` canônico já matriculado seja reclassificado por um producer.

`category` legado de apresentação permanece disponível no repository para filtros atuais; a policy H06 atua sobre `eventCategory` canônico.

## Testes dedicados

### `test-ux-notif-006-event-policy-matrix.js`

Valida:

- todas as 21 policies da Fase 1;
- imutabilidade;
- authority de category/priority/attention/actionRequired;
- conflito de `eventCategory` fail-closed;
- `category` legado não concorrente;
- copy incapaz de elevar semântica;
- unknown operational fail-closed;
- critical source fence preservada;
- fallback legado não matriculado preservado.

### `test-ux-notif-006-badge-policy-integration.js`

Valida que a policy alimenta H04 sem acoplar read e attention:

- mensagens afetam unreadMessages, não action-required;
- order/proposal actions entram em actionRequired;
- dispute opened entra em urgent;
- payment held permanece informativo;
- withdrawal declined exige ação;
- estados RESOLVED removem atenção;
- marcar como lida não resolve atenção de domínio.

### `test-ux-notif-006-producer-policy-coverage.js`

Faz fence do inventário atual de producers e impede que um novo `eventType` canônico dos domínios em escopo seja introduzido sem policy H06.

## Evidência pré-certificação

O executor temporário de Matrix validou, antes de qualquer publicação de evidência:

- os três testes H06;
- regressões UX-NOTIF-001/002/003/004/005;
- geração e auditoria da Domain Completion Matrix;
- agent governance;
- delta final restrito a Matrix + remoção do próprio executor.

O executor temporário não pertence à árvore permanente.

## Fora de escopo

- H07 digest/DND;
- H08 browser notifications;
- H09 quick actions;
- alteração ampla de channel policy;
- backend novo;
- Supabase migrations/RPCs;
- staging/produção;
- redesign visual;
- novas mutations de negócio;
- ready-for-review ou merge.

## Definition of Done

A Fase 1 só pode ser chamada de tecnicamente concluída quando, no mesmo SHA permanente:

1. árvore sem executores/patchers temporários;
2. sintaxe JavaScript;
3. três testes H06;
4. regressões UX-NOTIF-001/002/003/004/005;
5. notification repository/Supabase/API authority;
6. account/auth contracts;
7. Domain Completion Matrix;
8. agent governance;
9. LCOV executável de `notification-event.js`;
10. Sonar Quality Gate com zero New Issues/Accepted Issues/Hotspots e coverage mínima do projeto;
11. `git diff --check`;
12. PR próprio OPEN / DRAFT / UNMERGED.

## Limite da certificação

Esse lote prova contrato frontend/repository por testes determinísticos. Não prova entrega real de notificações em dois browsers, backend/realtime em staging ou comportamento de canais H07-H09.
