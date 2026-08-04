# PAY-001 / A05 — Conformidade de adapters e readiness fail-closed de staging

## Objetivo

Definir o conjunto mínimo de provas que qualquer futuro adapter de PSP deve passar antes de ser considerado candidato a staging, sem escolher provedor, criar conta, usar credenciais ou executar efeitos financeiros.

O A05 é exclusivamente repository-only. O harness usa fixtures determinísticas, rede desabilitada e autoridade financeira nula.

## Contrato explícito do adapter

O contrato `pay-provider-adapter-v1` exige:

- `getManifest`;
- `checkHealth`;
- `createPaymentIntent`;
- `getPaymentIntent`;
- `normalizeIntentAcknowledgement`;
- `normalizeWebhookEvent`;
- `fetchPaymentSnapshot`;
- `classifyError`.

O manifesto deve fixar uma versão imutável do adapter, suportar `BRL` e declarar individualmente, como `true` ou `false`, as capacidades:

- authorize e hold;
- capture/release;
- refund total e parcial;
- cancelamento;
- disputa e chargeback;
- payout e split;
- webhooks assinados;
- idempotência;
- consulta de eventos e settlement;
- reconciliação.

Capacidade ausente não recebe fallback. A operação é recusada com erro estável `DOKE_PAYMENT_ADAPTER_CAPABILITY_UNSUPPORTED`.

O manifesto também congela:

- navegador sem acesso ao adapter;
- secrets somente no runtime server-side;
- dados brutos de cartão proibidos;
- mutação financeira direta proibida;
- fallback local de mutação para UUID proibido;
- settlement somente por eventos verificados.

## Harness local de conformidade

O harness base e a extensão explícita validam:

1. interface, versão imutável e manifesto de capacidades;
2. health/readiness sem rede, mutação remota, dinheiro ou produção;
3. criação, consulta e replay idempotente do payment intent;
4. rejeição de payload drift e acknowledgement incompleto;
5. rejeição recursiva de PAN, CVV/CVC e dados equivalentes;
6. assinatura válida, inválida e expirada;
7. raw body obrigatório antes do parse;
8. normalização somente após verificação;
9. replay exato determinístico;
10. claim concorrente e event ID reutilizado com payload diferente;
11. evento fora de ordem adiado e estado terminal protegido;
12. snapshots reconciliados e divergências classificadas;
13. resolução automática e mutação automática de dinheiro sempre falsas;
14. timeout, rate limit, autenticação, conflito, indisponibilidade, resposta incompleta e erro permanente;
15. capacidade não suportada bloqueada;
16. ausência de fallback local de mutação para usuários UUID.

A evidência permanece sintética e contém somente hashes, IDs de fixture e contadores zero de rede, staging e dinheiro.

## Readiness fail-closed para staging

Antes de qualquer futura execução, o gate exige cumulativamente:

- A01–A05 verdes no head exato;
- PSP formalmente selecionado;
- revisão jurídica e contábil;
- conta sandbox;
- adapter específico com versão imutável;
- projeto staging confirmado e produção explicitamente negada;
- credenciais exclusivamente server-side;
- secret e endpoint controlado de webhook;
- migrations e deploys identificados;
- fixtures exclusivamente sintéticas;
- sandbox ou orçamento máximo zero;
- store de reconciliação e fila operacional;
- rollback e cleanup definidos;
- evidência sanitizada;
- autorização explícita, fresca, head-pinned e one-shot.

A ausência de qualquer item mantém `readyForAuthorizedStagingExecution: false`.

## Autoridade não concedida

Mesmo com readiness integral, o repositório produz apenas um plano não executável. Ele não pode selecionar PSP, registrar webhook, configurar secret, aplicar migration, fazer deploy, criar pagamento, refund, payout ou disputa, nem alterar feature flags ou produção.

## Blockers preservados

- `PAY-B01`: PSP, conta, adapter específico, credenciais, webhook e conformance real ainda ausentes;
- `PAY-B03`: regras comerciais, fiscais, escrow, refund, disputa, chargeback e payout ainda não aprovadas;
- `PAY-B04`: store remoto, scheduler, fila real, métricas, alertas e runbook ainda ausentes.

A maturidade permanece `2/6`, matriz `1.3.90`, autoridade server-side `contract_only` e gates de segurança e produção bloqueados.

## Efeitos operacionais

- staging reads e mutations: 0;
- migrations e deploys: 0;
- contas, secrets ou webhooks: 0;
- chamadas externas de PSP: 0;
- pagamentos, refunds e payouts: 0;
- produção: intocada;
- merge: não.
