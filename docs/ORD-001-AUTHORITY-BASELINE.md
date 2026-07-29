# ORD-001 — Baseline de autoridade

## Estado congelado

O domínio de pedidos possui uma base server-side avançada em staging, mas o produto ainda não opera com uma única autoridade de ponta a ponta.

- **Máquina de estados:** canônica no banco e no backend.
- **Eventos transacionais:** canônicos, duráveis e projetados por trigger.
- **Worker e operação:** ativos em staging.
- **Leitura e escrita do navegador:** híbridas, com Supabase direto, `localStorage`, mocks e fallback silencioso.
- **Produção:** bloqueada.

A evidência estruturada desta captura está em `docs/validation/ORD-001-A01-BASELINE.json`.

## Autoridades identificadas

### Banco e backend

`public.orders` é protegido por RLS e por triggers responsáveis por:

- validar a máquina de estados;
- impedir mutação indevida da identidade do pedido;
- materializar o snapshot aprovado do serviço;
- emitir eventos duráveis para o outbox;
- atualizar métricas derivadas do cliente.

A transição oficial é `public.transition_order_status`, com verificação de estado esperado para concorrência otimista.

`public.budgets` já possui RLS ativa em staging e políticas de leitura por participante e inserção pelo profissional responsável. A afirmação histórica de que `budgets` está sem RLS não representa mais o estado atual.

### Eventos e operação

- `private.order_domain_events` mantém o outbox.
- `private.order_event_delivery_attempts` registra tentativas.
- `order-event-worker` processa eventos com autenticação customizada por token.
- `order-event-operations` expõe operações internas autenticadas por JWT.
- cinco crons de worker, alertas, incidentes, proteção de mudanças e relatório SLO estão ativos.

### Navegador

O navegador ainda possui três autoridades concorrentes:

1. `assets/js/services/order-service.js`, mock-only;
2. `assets/js/services/orders-service.js`, regras de negócio e canário de API;
3. `assets/js/repositories/orders-repository.js`, Supabase direto com persistência e fallback local.

O repositório de pedidos:

- grava em duas chaves de `localStorage`;
- carrega `mock-orders.json`;
- executa DML direto em `public.orders`;
- mantém pedidos pendentes para sincronização posterior;
- cai para o armazenamento local quando a leitura ou escrita remota falha.

Esse comportamento é útil para desenvolvimento, mas não pode ser a autoridade final de um ciclo transacional multi-dispositivo.

## Divergência da matriz

O bloqueador histórico `ORD-B01` precisa ser dividido:

- **parte resolvida:** RLS e políticas de `budgets` já existem em staging;
- **parte ainda aberta:** grants, políticas e mutações de `orders` precisam de revalidação completa por persona e por transição.

Nenhuma maturidade ou gate deve ser promovido apenas por esta constatação. ORD-001 permanece em maturidade 4, segurança parcial e produção bloqueada.

## Bloqueadores reais do baseline

### Autoridade dividida

O frontend pode criar ou atualizar estado local mesmo quando a operação remota falha. Dois dispositivos podem divergir.

### DML direto no navegador

Participantes autenticados ainda possuem caminhos diretos de `INSERT`, `UPDATE` e `DELETE` em `orders`. Os triggers reduzem o risco de transições inválidas, mas não eliminam a duplicação da autoridade de escrita.

### Grants de rotinas operacionais

Algumas rotinas privadas `SECURITY DEFINER` do domínio ainda reportam execução concedida a `PUBLIC`. ORD-A02 deve classificá-las entre trigger-only, cron-only e operação interna, removendo grants residuais quando aplicável.

### Worker sem JWT

`order-event-worker` usa `verify_jwt: false` por desenho e autentica por `x-doke-worker-token`. A segurança depende de uma validação específica de rotação, replay, origem do cron e negação sem token.

### Dependências externas

- PAY-001 continua necessário para um ciclo financeiro real baseado em webhook de PSP.
- SCHED-001 continua necessário para disponibilidade e prevenção de reserva duplicada.
- MSG-001 continuará recebendo eventos, mas não deve virar autoridade de estado do pedido.

## Próximo sublote

`ORD-A02 — permissões, grants e personas`

Antes de ativar o fluxo real no navegador:

1. revalidar cliente, profissional, terceiro, suporte, admin, anon e service role;
2. provar operações permitidas e negadas em `orders`, `budgets` e histórico;
3. classificar e fechar grants de rotinas operacionais;
4. validar autenticação customizada do worker;
5. atualizar a matriz somente com evidência reproduzível.

## Restrições preservadas

- nenhuma linha real foi criada, alterada ou removida;
- staging foi consultado apenas em leitura;
- produção não foi acessada;
- nenhum PSP, SMS, OAuth ou serviço pago foi ativado;
- nenhum PR foi mesclado ou marcado como pronto para revisão.
