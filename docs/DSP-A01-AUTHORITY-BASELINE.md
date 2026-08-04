# DSP-A01 — Authority Baseline

## Objetivo

Congelar a autoridade atual de cancelamentos, reembolsos, disputas e chargebacks antes de qualquer política financeira, integração de provider ou efeito monetário real.

Este sublote é exclusivamente `repository_only`. Ele não aprova regras comerciais ou jurídicas, não executa refund, não libera recebível, não abre disputa real, não acessa staging e não seleciona PSP.

## Estado observado

A Doke já possui duas camadas coexistentes:

1. contratos e simulações locais que exercitam cancelamento pré-pagamento, abertura de disputa, resposta profissional e resolução sintética;
2. operações remotas autenticadas para abertura/resposta e uma fronteira interna de operador para decisões financeiras.

Essa coexistência é útil para desenvolvimento, mas não cria autoridade de produção. O baseline classifica explicitamente a superfície local como inventário e a superfície remota como parcial.

## Riscos congelados

### DSP-A01-F01 — política não aprovada

Cancelamento, refund, evidência, prazo e recurso dependem de decisões comerciais, jurídicas e tributárias ainda pendentes no PAY-B03/DSP-B01.

### DSP-A01-F02 — chargeback de provider ausente

Não existe autoridade operacional para eventos de chargeback, envio de evidências, perda/ganho da contestação ou reconciliação com o provider.

### DSP-A01-F03 — operação de suporte incompleta

Fila geral, prazos, escalonamento, recurso, SLA e segregação de funções ainda não formam um caso operacional completo.

### DSP-A01-F04 — autoridade dividida

Simulação local e operações remotas coexistem. Cache, `localStorage`, mock ou estado de interface nunca podem constituir decisão financeira.

### DSP-A01-F05 — efeitos terminais bloqueados

Sinais isolados de operador ou provider não podem produzir refund, release, chargeback loss ou conclusão terminal sem política, idempotência, auditoria e reconciliação.

### DSP-A01-F06 — vocabulário de estados

Estados locais e remotos precisam de uma taxonomia única antes da integração do runtime.

## Regras preservadas

- Cancelamento antes do pagamento não cria pagamento nem refund.
- Cancelamento após início do pagamento deve entrar no fluxo financeiro de disputa.
- Participantes e vínculo com pedido/transação devem ser validados no servidor.
- Uma intenção financeira não pode gerar múltiplas disputas ativas equivalentes.
- Abrir disputa bloqueia liberação, mas não inventa estado do provider.
- Refund ou release exigem política aprovada, operador autorizado, auditoria e reconciliação.
- Estado de chargeback não pode ser produzido pelo navegador.
- Recurso acrescenta evidência; não reescreve silenciosamente o histórico anterior.
- Nenhum estado local cria autoridade de produção.

## Limites de autoridade

```text
contractAuthority: true
runtimeMutationAuthority: false
refundAuthority: false
releaseAuthority: false
chargebackAuthority: false
providerEvidenceAuthority: false
stagingAuthority: false
realMoneyAuthority: false
productionAuthority: false
```

## Dependências preservadas

```text
DSP-B01 — política jurídica/comercial
DSP-B03 — integração de chargeback do provider
DSP-B04 — workflow operacional de suporte
PAY-B01 — seleção e integração do PSP
PAY-B03 — aprovações comerciais, jurídicas e tributárias
PAY-B04 — reconciliação remota
WAL-B02/B03/B04 — autoridade financeira e dados sensíveis
```

## Próxima sequência

1. `DSP-A02` — taxonomia canônica de ciclo de vida e efeitos.
2. `DSP-A03` — evidências, prazos e recurso.
3. `DSP-A04` — fronteira neutra de chargeback e reconciliação.
4. `DSP-A05` — caso operacional, dual control e readiness.

Nenhum desses contratos poderá ativar refund, chargeback, staging ou produção sem autorizações próprias.
