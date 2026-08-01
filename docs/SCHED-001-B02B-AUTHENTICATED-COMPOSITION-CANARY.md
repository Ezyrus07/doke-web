# SCHED-001 — B02B Authenticated Composition Canary

## Resultado

O canário autenticado do composition root canônico passou no Supabase staging `zwkczgewzbsorbrjuzpb` pelo GitHub Actions run `30676215676`, no commit `4168cd4983afd34c42c5bfcf48d2723d060a5b18` do PR #25.

O preflight confirmou PR aberto e draft, auto-merge desabilitado, head correto, projeto `doke-web-staging`, gate fail-closed ativo, migrations canônicas de scheduling e zero resíduo pré-existente.

## Personas validadas

- Cliente: criação de hold permitida; confirmação, reagendamento e expiração negados; replay idempotente e rejeição de payload divergente passaram.
- Profissional: upsert de disponibilidade própria permitido; confirmação e expiração negadas; replay idempotente e rejeição de payload divergente passaram.
- Suporte: disponibilidade, hold, confirmação, reagendamento e cancelamento permitidos; expiração negada; projeção no pedido validada.
- Administrador: disponibilidade, hold, confirmação, reagendamento e cancelamento permitidos; expiração negada; overlap rejeitado e projeção no pedido validada.

## Transação e resíduos

A execução usou uma transação PostgreSQL externa `SERIALIZABLE`, com savepoint por comando do composition root. A instrução final foi obrigatoriamente `ROLLBACK`; nenhum `COMMIT` foi permitido.

Após o rollback, os 11 contadores ficaram em zero: regras, reservas, idempotência, eventos, pedidos, `auth.users`, `public.users`, perfis de usuário, perfis de cliente, serviços e versões de serviço. As contagens de autoridade antes e depois permaneceram iguais.

## Limites preservados

Não houve acesso a produção, migration, deploy, Cron, worker, conexão de frontend, ORD wiring, billing, infraestrutura, merge ou auto-merge. Nenhum dado real de usuário foi usado e nenhum dado canary permaneceu persistido.

## Consequência

`SCHED-B02` pode ser encerrado como evidência do composition root autenticado. `SCHED-B04` continua aberto: o ORD wiring permanece fora deste sublote e depende de autorização própria.
