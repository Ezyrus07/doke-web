# SCHED-001 B04C — Authenticated ORD/SCHED Composition Canary Readiness

## Objetivo

Congelar o canário remoto que provará, em staging, que `SCHED-001` e `ORD-001` operam como uma única composição transacional sem permitir autoridade paralela no navegador ou em comandos genéricos de pedidos.

Este sublote é somente de readiness. Ele não executa SQL remoto, não ativa runtime, não aplica migration e não conecta o frontend.

## Autoridade canônica

A integração preserva três projeções inseparáveis:

- `orders.schedule_reservation_id`: referência canônica da reserva;
- `orders.scheduled_at`: projeção temporal de `schedule_reservations.starts_at`;
- `orders.status = scheduled`: projeção de uma reserva `confirmed`.

Uma data isolada, uma referência isolada ou o estado `scheduled` sem reserva confirmada devem falhar fechado.

## Fixture sintético

O canário autorizado deverá criar, dentro da própria transação:

- cliente sintético;
- profissional sintético;
- suporte sintético;
- administrador sintético;
- serviço e versão aprovados sintéticos;
- pedido sintético;
- disponibilidade e reservas sintéticas.

Dados reais de usuários são proibidos. Nenhuma linha sintética poderá persistir após o rollback.

## Personas e provas

### Cliente

- preferência de horário permanece `client_intent`;
- pode criar hold para o próprio pedido;
- não pode colocar o pedido manualmente em `scheduled`;
- não pode confirmar nem reagendar a reserva.

### Profissional

- pode aceitar o pedido;
- não pode colocar o pedido manualmente em `scheduled`;
- não pode confirmar a reserva;
- não pode iniciar atendimento sem reserva confirmada e correspondente;
- pode iniciar somente quando a autoridade server-side comprovar a reserva.

### Suporte

- pode confirmar uma reserva dentro das fronteiras do contrato;
- confirmação deve projetar referência, horário e estado na mesma transação;
- reagendamento preserva o mesmo `schedule_reservation_id`;
- cancelamento da reserva limpa a projeção e devolve o pedido a `accepted`;
- cancelamento genérico do pedido com reserva ativa permanece proibido.

### Administrador

- possui a mesma fronteira operacional autorizada para confirmação;
- não pode substituir silenciosamente uma reserva diferente já projetada;
- projeções incompletas falham fechado;
- comandos genéricos não podem fabricar o estado `scheduled`.

## Sequência mínima do canário

1. Executar preflight somente leitura e confirmar PR, head, staging ref e gates fail-closed.
2. Abrir uma transação PostgreSQL `SERIALIZABLE`.
3. Criar todas as identidades e entidades sintéticas dentro da transação.
4. Criar pedido com preferência temporal e provar `p_scheduled_at = null`.
5. Aceitar o pedido pelo profissional.
6. Criar hold pelo cliente e provar que o pedido continua sem autoridade canônica.
7. Confirmar pelo suporte e provar a projeção atômica.
8. Validar replay idempotente e rejeição de payload divergente.
9. Reagendar e provar preservação da referência.
10. Provar que início do atendimento exige a reserva confirmada correspondente.
11. Cancelar a reserva e provar limpeza da projeção e retorno a `accepted`.
12. Injetar uma falha parcial e provar rollback da composição.
13. Encerrar a transação principal com `ROLLBACK`.
14. Abrir verificação independente e confirmar zero resíduos e contagens de autoridade inalteradas.

## Transação e idempotência

- uma transação externa `SERIALIZABLE`;
- savepoint por comando cruzado;
- `correlationId` compartilhado entre ORD e SCHED;
- chaves idempotentes independentes por domínio;
- mesmo payload e chave retornam o mesmo resultado;
- payload diferente com a mesma chave é rejeitado;
- `COMMIT` é proibido;
- a instrução final obrigatória é `ROLLBACK`.

## Resíduos obrigatoriamente zerados

A verificação pós-rollback deverá cobrir identidades sintéticas, perfis, serviços, versões, pedidos, histórico de status, disponibilidade, reservas, idempotência e eventos de agenda.

As contagens globais de autoridade observadas antes e depois do canário devem permanecer iguais.

## Autorização independente

A execução remota exigirá exatamente:

```text
I_EXPLICITLY_AUTHORIZE_SCHED_B04C_AUTHENTICATED_ORD_SCHED_COMPOSITION_CANARIES_ON_DOKE_STAGING
```

`Próximo`, consentimento genérico ou autorizações anteriores não cobrem esta execução.

## Fora de escopo

- produção;
- migrations;
- deploy;
- conexão do frontend;
- Cron ou workers;
- billing ou infraestrutura;
- dados reais;
- persistência de dados canary;
- merge ou auto-merge.

## Estado deste sublote

Neste readiness:

- staging reads: 0;
- staging mutations: 0;
- runtime activations: 0;
- canários remotos: 0;
- deploys: 0;
- produção: intacta.

`SCHED-B04` e `ORD-B04` permanecem abertos até a evidência remota autenticada.
