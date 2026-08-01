# SCHED-001 B04 — ORD Canonical Wiring Readiness

## Objetivo

Congelar a integração entre `SCHED-001` e `ORD-001` antes de qualquer alteração de runtime, staging, frontend ou deploy.

A agenda é a autoridade sobre reservas. Pedidos apenas armazenam a referência canônica e uma projeção temporal:

- autoridade: `orders.schedule_reservation_id`;
- projeção: `orders.scheduled_at`;
- `scheduled_at` isolado nunca prova que existe uma reserva válida.

## Diagnóstico do estado atual

### Leitura incompleta do pedido

`backend/modules/orders/orders-service.js` seleciona `scheduled_at`, mas não seleciona `schedule_reservation_id`. O normalizador também expõe somente `scheduledAt`.

Consequência: o consumidor não consegue distinguir uma projeção vinculada a uma reserva de um horário legado ou informado diretamente.

### Escrita direta de horário na criação

`createOrder` encaminha `body.scheduledAt` ou `body.scheduled_at` para `create_order_command`.

Após o wiring, intenção de horário poderá permanecer em metadata de solicitação, mas não poderá escrever a projeção canônica. A projeção só nasce de um comando de agenda executado no servidor confiável.

### Estado `scheduled` sem prova de reserva

A máquina de estados de pedidos permite transições para `scheduled` a partir de `accepted` e `quoted`. O wiring deverá impedir essa transição por comandos genéricos. Apenas a confirmação de uma reserva canônica poderá projetar o pedido como `scheduled`.

### Adapter de agenda já possui a fronteira correta

`backend/modules/scheduling/scheduling-postgres-repository.js` já implementa `projectOrderSchedule` e `clearOrderSchedule`. Essa fronteira deve permanecer como único escritor de `schedule_reservation_id` e `scheduled_at`.

## Contrato de integração

### Criação do pedido

- não cria reserva;
- não escreve `schedule_reservation_id`;
- não escreve `scheduled_at` canônico;
- pode guardar preferência de data apenas como intenção não autoritativa em metadata.

### Hold

- pertence a `SCHED-001`;
- exige participante válido do pedido;
- não torna o pedido `scheduled`;
- não deve produzir escrita compensatória no frontend.

### Confirmação

A confirmação da reserva deve, na mesma composição transacional:

1. confirmar a reserva;
2. manter `orders.schedule_reservation_id` apontando para ela;
3. projetar `orders.scheduled_at` a partir de `starts_at`;
4. transicionar o pedido para `scheduled` somente quando a reserva estiver `confirmed`;
5. falhar integralmente se qualquer projeção falhar.

### Reagendamento

- mantém o mesmo `schedule_reservation_id`;
- incrementa a versão da reserva;
- atualiza `scheduled_at` a partir da reserva;
- mantém o pedido em `scheduled`;
- replay não duplica eventos.

### Cancelamento da reserva

- limpa a referência e a projeção;
- não cancela implicitamente o pedido;
- a decisão sobre o próximo estado do pedido pertence ao contrato de ORD;
- cancelamento do pedido com reserva ativa deve cancelar a reserva na mesma composição.

### Início do atendimento

Quando houver `schedule_reservation_id`, iniciar o pedido exige uma reserva confirmada. Comparar apenas `scheduled_at` é proibido.

## Transação e idempotência

- execução somente em servidor confiável;
- isolamento `SERIALIZABLE`;
- rollback em falha de projeção;
- chaves idempotentes independentes por domínio;
- `correlationId` compartilhado entre comandos;
- nenhuma compensação conduzida pelo navegador.

## Estado deste sublote

Este é apenas o readiness `SCHED-B04A`.

Não foram realizados:

- alterações no runtime de pedidos;
- mutações em staging;
- migrations;
- deploy;
- conexão do frontend;
- ativação de Cron ou workers;
- acesso à produção;
- merge.

## Próximo gate

`SCHED-B04B — repository implementation and local contract tests`.

Esse gate deverá alterar o read model e criar a composição canônica local, ainda sem staging. Uma autorização separada será exigida antes de qualquer canário remoto ou mutação de staging.
