# ORD-001 — Personas, grants e fronteiras operacionais

## Resultado do ORD-A02

O sublote validou as permissões reais de `orders`, `budgets` e `order_status_history` em staging usando fixtures sintéticas dentro de uma subtransação revertida. Nenhuma conta, serviço, pedido, orçamento ou histórico de teste permaneceu no banco.

A evidência estruturada está em `docs/validation/ORD-001-A02-PERSONAS.json`.

## Matriz de personas

### Anônimo

- não possui leitura em `public.orders`;
- não executa `public.transition_order_status`;
- não acessa as tabelas privadas do outbox.

### Cliente participante

- lê o próprio pedido, orçamento e histórico;
- cria pedido solicitado em seu nome;
- atualiza campos de um pedido do qual participa;
- não cria orçamento.

### Profissional participante

- lê pedido, orçamento e histórico dos quais participa;
- envia orçamento próprio para pedido elegível;
- atualiza campos de um pedido do qual participa;
- também cria pedido atuando como cliente ao contratar outro profissional.

Esse último comportamento deve ser tratado como capacidade dupla da conta, e não como papéis mutuamente exclusivos.

### Terceiro autenticado

- não lê pedido, orçamento ou histórico alheio;
- atualização de pedido alheio afeta zero linhas;
- inserção com outro `client_id` é negada pela RLS.

### Suporte e administrador

Suporte e admin não veem linhas por meio da RLS pública de participantes. O caminho operacional permanece restrito à Edge Function protegida e às rotinas internas de serviço.

A política `budgets_participants_select` menciona suporte/admin, mas sua consulta depende de `orders`, cuja RLS é participant-only. Na prática, o ramo administrativo retorna zero e deve ser simplificado em sublote posterior.

### Service role

- possui o acesso necessário ao worker e às operações internas;
- não depende das políticas de participante;
- não é autoridade disponível ao navegador.

## Inconsistência do ciclo de rascunho

`orders` possui status padrão `draft`, política de exclusão de rascunho pelo cliente e código frontend que mantém rascunhos locais.

Entretanto, `private.project_order_domain_event` rejeita inserção com status `draft`, pois não existe um tipo de evento correspondente. O banco retorna `DOKE_ORDER_EVENT_TYPE_INVALID`.

O ORD-A03 deverá escolher uma autoridade única:

1. rascunhos permanecem estritamente locais e nunca aparecem como sincronizados; ou
2. o backend passa a aceitar e projetar rascunhos explicitamente.

Falha remota não pode continuar sendo convertida em sucesso local silencioso.

## Grants trigger-only fechados

Três funções `SECURITY DEFINER` herdavam execução de `PUBLIC`:

- `private.prepare_order_operational_incident()`;
- `private.audit_order_operational_incident_lifecycle()`;
- `private.materialize_order_operational_postmortem()`.

As três retornam `trigger` e são usadas somente por triggers de `private.order_operational_alerts`. A migration `20260729190500_ord_a02_trigger_only_grants.sql` revoga execução de `PUBLIC`, `anon`, `authenticated` e `service_role`.

Os triggers permanecem habilitados e operacionais.

## Worker customizado

`order-event-worker` versão 9 continua com `verify_jwt: false` por desenho e usa autenticação customizada server-side.

Foi comprovado que:

- somente `POST` é aceito;
- credencial ausente ou inválida é rejeitada;
- a função de verificação não é executável por `anon` ou `authenticated`;
- somente `service_role` executa a verificação;
- o cron lê as credenciais do Vault e invoca o worker a cada minuto.

Ainda não existe prova de frescor por requisição, como nonce ou janela temporal. A idempotência reduz duplicações, mas a proteção contra repetição de invocação permanece incompleta.

## Decisão de maturidade

Nenhum gate foi promovido:

- maturidade: `4`;
- autoridade visível: `hybrid`;
- autoridade server-side: `canonical`;
- staging: `staging_operational`;
- segurança: `partial`;
- produção: `blocked`.

## Próximo sublote

`ORD-A03 — command boundary canônico e remoção do fallback silencioso de escrita local`

Objetivos:

1. criar uma fronteira server-side única para criação e comandos de pedido;
2. retirar DML direto do navegador;
3. tornar falhas remotas visíveis;
4. decidir formalmente o destino dos rascunhos;
5. preservar concorrência otimista e eventos duráveis;
6. manter produção bloqueada e rollout sob canário.
