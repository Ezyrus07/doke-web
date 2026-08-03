# PAY-001 / A05 — Conformidade de adaptadores e readiness fail-closed de staging

## Objetivo

Definir o conjunto mínimo de provas que qualquer futuro adaptador de PSP deve passar antes de ser considerado candidato a staging, e congelar um gate que permaneça bloqueado enquanto seleção do provedor, revisão jurídico-contábil, credenciais, webhook, reconciliação e autorização one-shot não existirem.

A05 é exclusivamente repository-only. O harness usa um adaptador de fixture, sem rede e sem efeitos remotos.

## Contrato do adaptador

Todo adaptador candidato deve declarar um manifest `pay-provider-adapter-v1` e implementar:

- `getManifest`;
- `createPaymentIntent`;
- `normalizeWebhookEvent`;
- `fetchPaymentSnapshot`;
- `classifyError`.

O manifest deve declarar suporte a `BRL`, `authorize_then_hold`, todos os eventos normalizados de A03 e as seguintes restrições:

- inacessível ao navegador;
- segredo resolvido somente no runtime server-side;
- nenhum dado bruto de cartão;
- nenhuma mutação financeira direta;
- settlement somente por eventos verificados.

## Harness de conformidade

O harness local prova:

1. manifest e capacidades obrigatórias;
2. criação idempotente do payment intent;
3. conflito quando a mesma chave recebe outro payload;
4. acknowledgement incapaz de declarar settlement;
5. normalização do webhook somente após assinatura verificada;
6. snapshot do PSP reconciliável com a projeção canônica;
7. rejeição de campos sensíveis;
8. classificação fail-closed de timeout, rate limit, autenticação, conflito e erro permanente.

A evidência contém somente hashes, IDs de fixture e contadores zero de rede, mutação remota e efeitos financeiros.

## Gate de staging

O gate `pay-staging-readiness-v1` exige cumulativamente:

- contratos A01–A05 verdes;
- harness do adaptador verde;
- head Git exato;
- seleção formal do PSP;
- aprovação jurídica e contábil;
- conta sandbox do PSP;
- credenciais exclusivamente server-side;
- secret e endpoint de webhook registrados;
- projeto de staging confirmado e produção negada;
- feature flags desligadas;
- store de reconciliação e fila operacional prontos;
- rollback e plano de evidência;
- autorização explícita, fresca e one-shot.

Se qualquer item faltar, `readyForAuthorizedStagingExecution` permanece `false`.

## Plano não executável

Mesmo quando todos os checks forem verdadeiros, o contrato apenas produz um plano:

- não executável pelo próprio contrato;
- dependente de executor externo autorizado;
- preso ao head e ao hash de readiness;
- produção proibida;
- nenhuma feature flag pode mudar antes da revisão da evidência.

A autorização deve ser one-shot, corresponder ao head e ao hash do plano e declarar `productionAllowed: false`.

## Blockers preservados

- `PAY-B01`: PSP, conta, credenciais, webhook e conformance específica ainda ausentes;
- `PAY-B03`: regras comerciais, fiscais, escrow, refund, disputa e payout ainda não aprovadas;
- `PAY-B04`: store remoto, agenda, fila real, métricas e runbook ainda ausentes.

## Efeitos operacionais

- staging reads: 0;
- staging mutations: 0;
- migrations: 0;
- deploys: 0;
- contas, secrets ou webhooks: 0;
- execuções contra sandbox externo: 0;
- pagamentos, refunds ou payouts: 0;
- produção: intocada;
- merge: não.
