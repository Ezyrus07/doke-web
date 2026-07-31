# SCHED-001-B02 — Trusted Scheduling Composition Root Readiness

## Escopo

Este sublote implementa somente a camada de composição server-side que conecta o serviço de agenda existente ao adapter PostgreSQL existente.

Nenhum runtime foi ativado em staging ou produção. Nenhum deploy, Cron, worker, frontend authority switch, wiring com ORD-001 ou merge foi executado.

## Arquitetura

O composition root canônico está em:

```text
backend/modules/scheduling/scheduling-composition-root.js
```

Ele compõe:

```text
scheduling-postgres-repository.js
        ↓
scheduling-service.js
        ↓
scheduling-composition-root.js
```

O composition root não cria conexões por conta própria, não interpreta connection strings e não manipula `service_role` ou secret keys. Um servidor confiável deve injetar explicitamente um PostgreSQL pool com `connect()`.

## Gate fail-closed

A ativação só é considerada válida quando todas as condições abaixo forem verdadeiras simultaneamente:

```text
DOKE_SCHEDULING_RUNTIME_ENABLED=true
DOKE_RUNTIME_ENVIRONMENT=staging
SUPABASE_PROJECT_REF=zwkczgewzbsorbrjuzpb
```

Além disso, `NODE_ENV=production` ou `DOKE_RUNTIME_ENVIRONMENT=production` bloqueiam a composição.

A flag é intencionalmente estrita: apenas o texto exato `true` habilita o gate. Valores como `TRUE`, `1`, `yes` ou ausência da flag mantêm o runtime desativado.

Quando desativado:

- o pool não é exigido;
- o repository não é criado;
- o service não é criado;
- qualquer comando retorna `DOKE_SCHEDULE_RUNTIME_DISABLED`;
- nenhuma consulta ou mutação pode ocorrer.

Quando habilitado corretamente:

- o pool injetado é entregue ao adapter PostgreSQL;
- o isolamento padrão permanece `serializable`;
- o serviço de agenda existente continua responsável por autorização de atores, idempotência, conflitos, transições e eventos;
- o composition root não cria uma segunda autoridade de agenda.

## Segurança

Este sublote preserva os seguintes limites:

- nenhuma secret key em código;
- nenhuma `service_role` no navegador;
- nenhum fallback para produção;
- nenhuma inferência de ambiente por hostname;
- nenhuma ativação baseada apenas em `NODE_ENV`;
- nenhuma criação automática de pool;
- nenhuma execução de migration;
- nenhuma mutação de staging;
- nenhuma alteração de produção.

## Validação

O teste `scripts/test-sched-001-b02-composition-root-runtime.js` cobre:

- estado padrão desativado;
- rejeição de flags não exatas;
- bloqueio explícito de produção;
- bloqueio de project ref divergente;
- composição válida somente com staging exato;
- obrigatoriedade de pool injetado após ativação;
- propagação correta de comandos ao serviço;
- rejeição de service factory inválida.

## Estado dos blockers

Este é um sublote de readiness. Portanto:

```text
SCHED-B02 permanece aberto
SCHED-B04 permanece aberto
```

`SCHED-B02` só poderá ser fechado após um canário autenticado executar o composition root contra staging, com personas e command boundaries verificados e sem resíduos persistidos.

## Próximo gate

```text
SCHED-B02B — authenticated staging composition canary
```

O próximo gate deverá comprovar cliente, profissional, suporte e administrador em uma composição server-side real, preservando produção, frontend authority switch, ORD runtime wiring, Cron, workers, deploy e merge bloqueados.
