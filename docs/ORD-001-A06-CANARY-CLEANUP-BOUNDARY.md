# ORD-001 / ORD-A06 — Fronteira de limpeza do canário visual

## Objetivo

Permitir que uma execução visual controlada em staging remova somente o pedido criado pelo próprio canário `ORD-A06`, junto com suas projeções do domínio de pedidos, sem alcançar registros reais ou domínios excluídos.

## Autoridade

A operação canônica é:

```sql
public.cleanup_order_canary_run(p_run_id text)
```

Características obrigatórias:

- `SECURITY DEFINER`;
- execução concedida somente a `service_role`;
- `public`, `anon` e `authenticated` sem `EXECUTE`;
- claim JWT explícita sempre prevalece sobre fallback administrativo;
- fallback para sessão administrativa existe somente quando nenhuma claim de request foi fornecida.

## Escopo por dupla marcação

Um pedido só é elegível quando todos os critérios coincidem:

- `metadata.canaryRunId = runId`;
- `metadata.canaryDomain = ORD-001`;
- `metadata.canarySublot = ORD-A06`;
- `metadata.canaryScope = visual-settlement`;
- `external_id` começa com `runId:`;
- o `runId` corresponde a `^ord-a06-[a-z0-9][a-z0-9-]{5,80}$`.

Marcador parcial é tratado como conflito de escopo e bloqueia a operação.

## Estados permitidos

A limpeza é restrita aos estados exercitados pelo canário visual:

- `requested`;
- `accepted`;
- `quoted`.

Qualquer estado posterior ou paralelo bloqueia a operação.

## Dependências que bloqueiam a limpeza

A função aborta se o pedido possuir qualquer vínculo com domínios fora do escopo do canário:

- conversas;
- pagamentos;
- disputas de pagamento;
- transações;
- recibos;
- recebíveis de carteira;
- avaliações;
- eventos ou sessões do funil de templates;
- ações operacionais manuais sobre eventos.

A função não tenta limpar esses domínios e não converte o bloqueio em exclusão ampliada.

## Projeções removidas

Somente após todas as validações, a função remove as projeções pertencentes ao pedido canário:

- `private.order_event_delivery_attempts`;
- `private.order_metric_events`;
- `private.order_domain_events`;
- `public.budgets`;
- `public.order_status_history`;
- `public.notifications` vinculadas ao pedido;
- `public.api_idempotency_keys` com prefixo exato do `runId` e `entity_type = order`;
- o único registro em `public.orders`.

Uma verificação final rejeita qualquer resíduo.

## Validação em staging

A validação foi executada dentro de transação e revertida integralmente. O cenário criou identidades, serviço e pedidos sintéticos apenas durante a transação e comprovou:

1. `authenticated` não executa a limpeza;
2. claim explícita `authenticated` não é substituída por uma sessão administrativa;
3. o pedido-alvo percorre `requested → accepted → quoted`;
4. orçamento, histórico, eventos e métricas do alvo são removidos;
5. um pedido-controle permanece intocado;
6. uma segunda chamada retorna `already_clean`;
7. marcador parcial é rejeitado;
8. o rollback deixa zero resíduo.

Durante a primeira tentativa, o teste detectou que o fallback de `session_user` poderia prevalecer sobre uma claim explícita. A migration `ord_a06_cleanup_explicit_role_precedence` corrigiu a ordem de decisão antes da validação final.

## Limite atual

A fronteira de limpeza está pronta e aplicada em staging. A execução visual real continua bloqueada até existirem duas contas de teste explicitamente autorizadas e URLs de staging/preview aprovadas.

Nenhuma conta real foi criada, modificada ou utilizada nesta etapa.
