# PROPOSAL-APPROVAL-SERVER-001 — Contrato canônico de aprovação (proposta)

**Classificação:** proposta técnica de contrato, somente leitura/planejamento. **Não implementado.**
**Status:** `DESIGN_READY_FOR_REVIEW / HOSTED_APPROVAL_HOLD`.
**Base observada:** `c0530f01273b1596570fe312af52c68297c3e6d3` (`codex/proposal-consistency-001-local`), derivada do UX seletivo `41a663bb` sobre o PR #470.
**Contexto:** P31-021 `LOCAL_CERTIFIED`, adoção pendente; P31-022 e staging sob `HOLD`. Este documento não autoriza writes, migrations, deploys, PRs ou merges.

## 1. Problema comprovado e limites da mitigação local

Revisão independente reproduziu: UI mostrava R$ 850,00 enquanto o pedido canônico possuía R$ 1.200,00; a aprovação podia prosseguir. A correção local `c0530f01` passou 27/27 cenários sintéticos de navegador (390/820/1366 px) e consulta os dados do serviço antes da confirmação; também passa `expectedProposal` ao serviço local. **Isso não é garantia de concorrência em servidor.** Para `expectedProposal` com API/canário hospedado, o frontend atual falha fechado com `DOKE_PROPOSAL_SERVER_EXPECTATION_REQUIRED`. Chamadas legadas sem esse campo requerem avaliação separada.

A operação hospedada exige comparação do que o cliente aceitou com o dado canônico **na mesma transação que grava a aprovação**; um GET seguido de POST sem compare-and-swap não é suficiente.

## 2. Evidência da arquitetura existente (não modificar por inferência)

| Evidência de leitura | Implicação |
|---|---|
| `backend/shared/http/route-registry.js` | Existem `orders.quote` (`POST /orders/:id/quote`) e `orders.start` (`POST /orders/:id/start`, papel `professional`); **não há `orders.approveProposal`** no registry observado |
| `backend/modules/orders/route-handlers.js` e `orders-service.js` | `startOrder` autoriza profissional, verifica agenda, transiciona para `in_progress`. É ação distinta da aceitação de proposta **pelo cliente** |
| `backend/modules/orders/orders-service.js` | `getOrder` devolve `budget` aninhado; `normalizeBudget` devolve `id`, `amountCents`, `currency`, `status`, `validUntil`, `updatedAt`. Não há contrato canônico completo de parcelamento na projeção atual |
| `supabase/migrations/002_marketplace_core.sql` | `public.budgets`: `id`, `order_id`, `amount_cents`, `currency`, `description`, `status`, `valid_until`, `created_at`, `updated_at`; não contém coluna `installments` |
| `supabase/migrations/20260729201000_ord_a03_order_command_boundary.sql` | `submit_order_quote_command` bloqueia `orders` com `FOR UPDATE`, insere nova budget e chama a transição; `transition_order_status` só compara status esperado, não ID/valor/versão da proposta |
| `supabase/migrations/20260729223000_ord_a05_explicit_persona_precedence.sql` | A RPC mais recente lida nessa linha reforça precedência da identidade JWT versus sessão administrativa. Preservar esta propriedade |
| `assets/js/services/orders-service.js` | Mapeia `in_progress` para `start`; uma aprovação de cliente não pode ser apresentada ao backend como `orders.start`. A correção local usa `expectedProposal` e bloqueia essa rota para hospedagem |
| PR #546 (HEAD observado `b5d157f1`, Draft, “Fail closed on staging frontend authority”) | Mudanças de ativação de frontend e transporte exigem reconciliação antes de alterar qualquer runtime |

**Cuidado:** evidência de arquivos locais e do PR não prova qual schema, RLS ou migration está efetivamente aplicado em staging/produção. Exige inventário certificado, sem presumir deploy.

## 3. Decisão proposta: endpoint próprio, aprovação sem pagamento

Nome lógico sugerido: `orders.approveProposal`. Rota a revisar: `POST /orders/:id/approve-proposal`.

- **Permissão:** `order_client`, determinada por `auth.uid() = orders.client_id` na transação e pelo relacionamento real. Não depender exclusivamente do papel principal de conta; um usuário profissional pode ser cliente de outro serviço. No registry, avaliar `allowedRoles: ['client','professional']`, com verificação obrigatória do escopo no handler/RPC.
- **Autenticação:** Bearer válido; idempotency key persistente, freshness e nonce conforme `create-action-handler` e contratos de fronteira existentes. Nunca confiar em `actorId`, `actorRole`, preço ou status vindos do cliente.
- **Separação:** aprovar proposta não equivale a iniciar execução pelo profissional, confirmar pagamento, criar escrow, liberar recebível ou agendar serviço. Qualquer projeção para `in_progress` exige decisão de produto/estado e contrato de permissão coerente, sem reutilizar `/start`.
- **Autoridade da proposta:** a linha canônica selecionada em `public.budgets`, vinculada ao pedido e ao profissional, com moeda BRL, validade e status permitido. A forma de identificar a **proposta ativa** deve ser única/determinística (por exemplo, ID explícito aprovado/referenciado pelo pedido); não confiar em última mensagem local.

### Requisição conceitual (NÃO endpoint disponível)

```json
{
  "expectedProposal": {
    "budgetId": "uuid-da-proposta-canonica",
    "amountCents": 85000,
    "currency": "BRL",
    "termsVersion": "versao-canonica-de-termos",
    "version": "versao-canonica-da-proposta"
  }
}
```

A rota deve exigir `Idempotency-Key` e os headers de freshness já estabelecidos. `budgetId`, `termsVersion` e `version` são **campos propostos**, não afirmados como disponíveis hoje. O desenho de `termsVersion` depende da decisão do item 4. O valor monetário é inteiro de centavos: R$ 850,00 → `85000`. Não enviar valor formatado como critério de igualdade.

### Resposta conceitual de sucesso

```json
{
  "order": {
    "id": "uuid-do-pedido",
    "status": "in_progress",
    "approvedBudgetId": "uuid-da-proposta-canonica"
  },
  "approval": {
    "budgetId": "uuid-da-proposta-canonica",
    "approvedAmountCents": 85000,
    "currency": "BRL",
    "approvedTermsVersion": "versao-canonica-de-termos",
    "approvedAt": "ISO-8601-do-servidor",
    "approvedBy": "uuid-cliente-autenticado"
  }
}
```

**A forma do resultado e o status pós-aprovação são propostos.** Sua implementação depende de como o domínio distinguirá aprovação, início de atendimento, agenda e pagamento. Os campos auditáveis devem vir do servidor.

## 4. Decisões obrigatórias antes de implementar

1. **Termos/parcelamento:** `budgets` não contém `installments`. Definir armazenamento canônico, versionamento e atomicidade de alterações (preferir campos estruturados ou snapshot imutável vinculado à budget). Não tratar `messages.installments` como fonte de verdade.
2. **Proposta ativa e revisões:** múltiplos orçamentos podem existir no mesmo pedido; fixar `active_budget_id` ou derivação unívoca comprovada. Edições/reenvios devem produzir versão distinta. `valid_until` e `status` da budget são condições de aprovação.
3. **Status do pedido:** distinguir explicitamente `quoted → approved/accepted` de `approved → in_progress` (ou justificar a transição direta) e preservar restrições de agenda; não contornar `assertStartScheduleAuthority` usando uma rota de aprovação indevida.
4. **Bypass:** impedir que `transition_order_status`, `orders.start`, `orders.updateStatus` ou qualquer outro caminho faça transição equivalente à aprovação do cliente sem a mesma expectativa canônica. O novo endpoint, sozinho, **não** fecha a brecha se outros caminhos permanecerem permissivos.
5. **Autoridade e deploy:** confirmar migrações aplicadas, RLS, grants e branch base do PR #546 antes de planejar mudança em servidor. Qualquer migration somente sob autorização específica posterior.

## 5. Algoritmo transacional exigido (pseudocódigo; não executável)

```text
BEGIN;
  resolved_order := lookup canonical order by UUID/external ID;
  SELECT canonical orders row FOR UPDATE;
  require auth.uid = orders.client_id;
  require order in explicitly approvable state;
  quote := lookup and lock active canonical budget/terms for this order;
  require quote belongs to order and assigned professional;
  require quote status == active/sent and valid_until not expired;
  require expected budgetId, amountCents, currency, version AND termsVersion
          equal the current locked canonical quote;
  require the transition is valid under the agreed order-state contract;
  atomically persist approval snapshot (budget ID, amount, currency, terms,
          actor, timestamp) + state transition + order history/audit reference;
  do not mark payment confirmed or touch wallet/escrow;
COMMIT;
return the committed authoritative state;
```

Lock ordering matters: quote submission already locks order before inserting budget; approval must lock **order first, then quote**, and ensure no budget update path bypasses this ordering. A budget UPDATE that does not lock the order requires additional database constraints/trigger or immutable-version semantics. Do not use only `updated_at` as a loose client-side check.

**Idempotência:** same actor + endpoint + idempotency key + identical body returns the original committed result; same key with different expectations must fail. Concurrent distinct keys on the same quote must serialize, not double-book approval/history. A retry after success cannot treat a *new changed quote* as the earlier approval.

## 6. Respostas de erro recomendadas

| HTTP | Código sugerido | Semântica |
|---|---|---|
| 400/422 | `DOKE_PROPOSAL_EXPECTATION_REQUIRED` | Campos obrigatórios ausentes/inválidos; sem write |
| 401 | `DOKE_UNAUTHORIZED` | Sessão inválida |
| 403 | `DOKE_ORDER_CLIENT_REQUIRED` | Usuário não é o cliente vinculado; inclusive profissional responsável |
| 404 | `DOKE_ORDER_NOT_FOUND` | Pedido ou proposta inexistente/fora de escopo; não vazar dados |
| 409 | `DOKE_PROPOSAL_REVIEW_STALE` | ID, valor, moeda, versão ou termos mudaram; exigir nova revisão |
| 409 | `DOKE_ORDER_CONFLICT` | Status/transição concorrente ou idempotency payload incompatível |
| 409/422 | `DOKE_PROPOSAL_EXPIRED` | Orçamento expirado/retirado; sem write |
| 503 | `DOKE_PROPOSAL_APPROVAL_UNAVAILABLE` | Runtime/migration/autoridade não certificados; falhar fechado |

Os códigos são sugestões a reconciliar com o catálogo existente. O cliente recebe mensagem segura sem divulgar dados de outra conta.

## 7. Matriz de aceitação para execução futura (apenas fixtures sintéticas)

| Caso | Pré-condição | Resultado obrigatório |
|---|---|---|
| A01 | Quote 85000 BRL, versão V1, cliente certo, termos T1 | Aprova V1 exatamente uma vez |
| A02 | UI viu 85000; servidor passou a 120000 | 409 stale; pedido e histórico inalterados |
| A03 | Valor igual, `termsVersion` mudou | 409 stale |
| A04 | Valor igual, nova budget ID/versão V2 | 409 stale |
| A05 | Moeda alterada | 409 stale |
| A06 | Proposta expirada, retirada ou cancelada | 409/422; sem write |
| A07 | Profissional tenta aprovar sua própria proposta | 403 |
| A08 | Outro cliente tenta adivinhar UUID/ID | 403/404, sem vazamento |
| A09 | Profissional (papel principal) é cliente vinculado de outro pedido | A autorização segue `orders.client_id`, sem negação indevida |
| A10 | Duas aprovações simultâneas com chaves distintas | Um estado canônico consistente; sem dupla notificação/histórico |
| A11 | Retry com a mesma chave + mesmo payload | Replay idempotente, sem nova mutação |
| A12 | Reutilização de chave com payload diferente | Conflito, sem write |
| A13 | Reenvio de orçamento ocorre durante confirmação | Uma das transações vence; outra detecta conflito |
| A14 | Falha de RPC, timeout, ausência de versão/termos | Fail closed; nenhum sucesso otimista |
| A15 | Aprovação concluída | `paymentStatus` continua não pago; sem escrow, wallet ou cobrança confirmada |
| A16 | Endpoint `/start` ou transição genérica tenta simular aprovação | Não pode contornar a expectativa/aprovação do cliente |
| A17 | Sessão trocada, usuário desconectado, nonce/headers inválidos | Bloqueio antes de write |
| A18 | PR #546 e transporte de API/canário reconciliados | Mesmo contrato em todas as rotas permitidas; staging ainda requer certificação |

**Gates de qualidade futuros:** testes unitários de DTO e comparação; testes de handler/permission/idempotency; testes SQL em transações de rollback; corrida de duas sessões; testes de gateway com Bearer/freshness; integração frontend com 409 → reabrir revisão; regressões UX-001 a UX-004; revisão de RLS/grants/migrations; auditoria `AGENTS.md` e Control Center; autorização explícita antes de qualquer write hospedado.

## 8. Escopo de trabalho sugerido ao Codex quando retornar

**Fase de revisão (somente leitura):** verificar contra o PR #546 e os contratos atuais o endpoint proposto, escolha do campo de termos, bypass da transição genérica, locks, idempotência e garantia de auditabilidade. Entregar `READY_FOR_IMPLEMENTATION / NEEDS_DESIGN_DECISIONS / HOLD`, com evidências por arquivo. **Não implementar automaticamente**.

**Fase posterior, se autorizada:** implementar em branch separada somente após fechar as decisões 1–5 e os bloqueios de governança; adicionar testes de banco/API reversíveis em ambiente autorizado. Nenhum deploy/migration/push decorre deste documento.

## 9. Estado e limites desta especificação

- Este texto é uma **proposta de contrato**, não um relatório de execução do backend.
- Não foi feita auditoria do schema realmente aplicado em ambiente hospedado.
- Não foi criada rota, handler, RPC, migration, grant, política RLS nem nova permissão.
- O PR #546 permanece independente; nenhuma alteração nele.
- `LOCAL_VALIDATED / HOSTED_APPROVAL_HOLD / STAGING_NOT_CERTIFIED`.
