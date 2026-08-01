# SCHED-001 — B02B Authenticated Composition Canary Readiness

> Snapshot histórico de readiness. A execução foi concluída com sucesso no run `30676215676`; a evidência atual está em `docs/SCHED-001-B02B-AUTHENTICATED-COMPOSITION-CANARY.md` e `docs/validation/SCHED-001-B02B-AUTHENTICATED-COMPOSITION-CANARY.json`.

## Objetivo

Congelar o canário autenticado que validará o composition root real de scheduling exclusivamente em `doke-web-staging`, sem ativar produção, frontend authority switch, ORD runtime wiring, Cron, workers ou deploy.

## Estado atual (snapshot de readiness)

No momento deste snapshot, o composition root B02A existia e permanecia fail-closed. O artefato apenas definia personas, command boundaries, rollback e autorização; a execução posterior está registrada na evidência atual indicada acima.

## Gate exato de runtime

A composição só pode ficar ativa quando os três valores forem exatos:

```text
DOKE_SCHEDULING_RUNTIME_ENABLED=true
DOKE_RUNTIME_ENVIRONMENT=staging
SUPABASE_PROJECT_REF=zwkczgewzbsorbrjuzpb
```

Qualquer ausência ou divergência deve produzir `DOKE_SCHEDULE_RUNTIME_DISABLED`.

## Personas e limites

- Cliente: pode criar hold para pedido próprio; não pode confirmar, reagendar ou expirar holds.
- Profissional: pode declarar disponibilidade própria; não pode confirmar booking ou expirar holds.
- Suporte: pode executar comandos operacionais previstos pelo contrato; não pode assumir o papel do worker de expiração.
- Administrador: pode executar comandos administrativos previstos pelo contrato; não pode assumir o papel do worker de expiração.

## Asserções obrigatórias

O canário futuro deverá provar:

1. runtime bloqueado sem o gate exato;
2. hold permitido ao cliente participante;
3. confirmação negada ao cliente;
4. disponibilidade permitida ao profissional proprietário;
5. confirmação negada ao profissional;
6. command boundaries de suporte e administrador;
7. replay idempotente com o mesmo resultado;
8. rejeição da mesma chave com payload diferente;
9. rejeição de overlap;
10. projeção do pedido igual à reserva;
11. rollback integral;
12. zero resíduos.

## Autorização

Um comando genérico como `Próximo` não autoriza a execução. A frase exigida é:

```text
I_EXPLICITLY_AUTHORIZE_SCHED_B02B_AUTHENTICATED_COMPOSITION_CANARIES_ON_DOKE_STAGING
```

Essa autorização cobre somente o canário autenticado em staging, transação controlada, rollback e verificação de resíduos. Não cobre produção, deploy, ORD wiring, frontend authority switch, Cron, workers ou merge.

## Estado deste sublote

- staging reads: 0;
- staging mutations: 0;
- runtime activation: 0;
- authenticated canaries executed: 0;
- production access: 0;
- deploys: 0;
- merge: 0.
