# ORD-001 — Command boundary canônico

## Escopo

O ORD-A03 elimina a autoridade concorrente de escrita de pedidos no navegador. A partir deste sublote, um pedido submetido é criado e alterado somente por comandos server-side. O navegador pode conservar rascunhos e fixtures mockados, mas esses dados nunca são promovidos implicitamente para `public.orders`.

## Contrato de persistência

| Estado | Autoridade | Persistência |
| --- | --- | --- |
| Rascunho não enviado | Navegador | `localStorage`, identificado como `local-draft` |
| Fixture de desenvolvimento | Navegador | método explícito `saveMock` |
| Pedido enviado | Servidor | `public.create_order_command` |
| Transição de status | Servidor | `public.transition_order_status` |
| Envio de orçamento | Servidor | `public.submit_order_quote_command` |

O primeiro estado persistido no banco é `requested`. O valor `draft` não representa mais um pedido canônico incompleto no servidor.

## Fronteira de comandos

### Criação

`public.create_order_command`:

- exige sessão autenticada;
- permite capacidade de cliente para contas `client` e `professional`;
- resolve UUID ou `external_id` do serviço;
- exige serviço publicado, moderado e com versão aprovada;
- impede contratação do próprio serviço;
- deriva o profissional do serviço canônico;
- remove campos de autoridade enviados pelo cliente;
- usa `external_id` como chave de idempotência;
- materializa o pedido diretamente em `requested`.

### Transição

`public.transition_order_status`:

- bloqueia a linha com `FOR UPDATE`;
- determina `client` ou `professional` pelo vínculo no pedido;
- compara `p_expected_status` antes de alterar;
- rejeita conflitos com SQLSTATE `40001`;
- valida o grafo canônico;
- publica contexto transacional para triggers e outbox.

A capacidade não é inferida apenas pelo papel principal da conta. Uma conta profissional que contratou outro profissional age como cliente naquele pedido.

### Orçamento

`public.submit_order_quote_command`:

- exige que o ator seja o profissional vinculado;
- valida valor positivo e estado esperado;
- insere `public.budgets`;
- transiciona o pedido para `quoted` na mesma transação;
- projeta histórico, eventos, métricas e notificações de forma atômica.

## Grants e RLS

`authenticated` mantém `SELECT` participante em `orders` e `budgets`, mas não possui `INSERT`, `UPDATE` ou `DELETE` direto nessas tabelas. Os comandos públicos são `SECURITY DEFINER`, possuem `search_path` fechado e execução concedida somente a `authenticated` e `service_role`.

`anon` não executa os comandos.

## Navegador

`assets/js/repositories/orders-repository.js` passou a ter três comportamentos explícitos:

- `save`: somente rascunhos `draft`;
- `saveMock`: somente ambiente mock intencional;
- leitura remota: espelho participante, sem DML.

Snapshots antigos com `syncStatus: pending` não são reenviados automaticamente. Uma falha remota não se transforma mais em sucesso local silencioso.

Quando o provider solicitado é `api`, mas o servidor não está disponível, `orders-service.js` emite `doke:order-command-failed` e rejeita a operação com `DOKE_ORDER_COMMAND_BOUNDARY_UNAVAILABLE`.

## Backend HTTP

A API existente continua sendo a única fronteira pública para o navegador:

- criação chama `create_order_command`;
- orçamento chama `submit_order_quote_command`;
- transições chamam `transition_order_status`;
- listagem de participantes confia na RLS em vez de filtrar pelo papel principal da conta;
- validação de acesso considera `client_id` e `professional_id`.

Não foi criada uma segunda API.

## Compatibilidade de eventos

Durante a primeira prova de staging, uma definição histórica do trigger de eventos referenciou colunas antigas de notificações. A transação foi abortada e nenhuma fixture permaneceu. O trigger foi reconciliado com o schema atual de `public.notifications`, preservando:

- chave idempotente por destinatário;
- vínculo com pedido, conversa e serviço;
- outbox e métricas;
- notificações aos participantes, excluindo o ator.

## Evidência de staging

A prova transacional descartada confirmou:

- criação em `requested`;
- repetição idempotente retornando o mesmo pedido;
- orçamento atômico em `quoted`;
- conflito por estado esperado obsoleto;
- dois eventos e duas entradas de histórico;
- uma linha de orçamento;
- duas notificações;
- zero pedidos, orçamentos ou eventos sintéticos remanescentes.

## Limites restantes

O ORD-A03 não fecha todo o domínio:

- leituras e superfícies ainda possuem caminhos mock legados;
- há dois serviços frontend históricos (`order-service.js` e `orders-service.js`);
- o worker customizado ainda precisa de frescor/replay hardening;
- pagamentos reais pertencem ao PAY-001;
- exclusão de conflito de agenda pertence ao SCHED-001.

A matriz permanece em maturidade 4, autoridade visível híbrida, segurança parcial e produção bloqueada.
