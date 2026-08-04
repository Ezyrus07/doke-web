# PAY-B03B — Commercial Approval Evidence Package

## Objetivo

O PAY-B03B transforma o pacote de decisões do PAY-B03A em um processo de aprovação verificável, sem inventar pareceres, assinaturas, parâmetros ou autoridade operacional.

Ele cria:

- pedidos de aprovação separados por escopo;
- registro de parâmetros comerciais ainda pendentes;
- contrato hashes-only para evidências futuras;
- separação entre owner e reviewer;
- exigência de revisão externa qualificada para jurídico e tributário;
- gate que continua fail-closed mesmo quando a estrutura de aprovação estiver completa.

**PAY-B03 permanece aberto.**

Este contrato não substitui parecer jurídico, não substitui parecer tributário, não substitui validação contábil e não autoriza seleção de PSP.

## Dependência PAY-B03A

O pacote vincula o contrato:

```text
pay-b03a-commercial-policy-decision-gate-v1
```

O estado herdado continua:

```text
blocked_repository_only
legalApprovalGranted: false
providerContactAuthorized: false
paymentProcessingAuthorized: false
fundCustodyAuthorized: false
production: false
```

## Fontes oficiais registradas

O source register utiliza apenas páginas oficiais do Planalto, Banco Central e Governo Federal.

As fontes servem para delimitar perguntas e escopos de revisão. Elas não são usadas pelo repositório para emitir conclusão jurídica ou tributária automática.

Principais eixos:

- CDC e contratação eletrônica;
- arranjos e instituições de pagamento;
- enquadramento de marketplace que recebe e repassa pagamentos;
- canais de solução de conflitos;
- consulta e interpretação tributária formal.

## Quatro trilhas de aprovação

### 1. Executive business

Responsável por:

- comissão percentual;
- mínimo e teto;
- política de descontos;
- SLAs de evidência e decisão;
- direção econômica da beta.

Reviewer class:

```text
executive_internal
```

### 2. Finance, risk and operations

Responsável por:

- payout;
- retenção e liquidação;
- chargeback;
- reserva;
- saldo negativo;
- governança de disputa.

Reviewer class:

```text
control_internal
```

### 3. Legal, consumer and contracts

Responsável por:

- responsabilidade da plataforma;
- direito de arrependimento;
- cancelamento;
- execução parcial;
- reembolso;
- não entrega e vício do serviço.

Reviewer class obrigatória:

```text
qualified_external
```

### 4. Tax and accounting

Responsável por:

- emissão de documentos fiscais;
- reconhecimento de receita;
- ISS e regras municipais;
- retenções;
- regimes tributários;
- necessidade de consulta formal.

Reviewer class obrigatória:

```text
qualified_external
```

## Nove parâmetros materiais

```text
PARAM-COMMISSION-RATE
PARAM-COMMISSION-MINIMUM
PARAM-COMMISSION-CAP
PARAM-PAYOUT-SLA
PARAM-DISPUTE-EVIDENCE-SLA
PARAM-DISPUTE-DECISION-SLA
PARAM-PARTIAL-REFUND-FORMULA
PARAM-CHARGEBACK-RESERVE
PARAM-NEGATIVE-BALANCE-POLICY
```

Todos permanecem:

```text
state: pending
value: null
approvalEvidenceFingerprint: null
```

O repositório não escolhe valores em nome dos responsáveis.

## Evidência futura

Uma evidência válida deve conter somente metadados e hashes:

- request fingerprint;
- reviewer role hash;
- reviewer organization hash;
- source document hash;
- decisões e parâmetros cobertos;
- outcome;
- timestamps de aprovação e expiração;
- conditions, quando aplicável.

O owner não pode aprovar o próprio pedido.

Os reviewers jurídico e tributário devem ser externos e qualificados. As duas trilhas devem usar organizações distintas.

## Estados do pacote

Estado atual:

```text
blocked_pending_approvals
```

Mesmo que todas as evidências e parâmetros sejam estruturalmente válidos, o estado máximo deste sublote é:

```text
approvals_structurally_complete_runtime_alignment_required
```

A readiness correspondente continua:

```text
blocked_runtime_alignment_and_provider_selection_required
```

Portanto, aprovação estrutural não ativa provider, staging, custódia ou pagamentos.

## Conformance

```text
39 casos totais
5 positivos
34 negativos
39/39 aprovados
```

A cobertura inclui:

- conjunto exato de quatro escopos;
- cobertura das 18 decisões PAY-B03A;
- cobertura dos nove parâmetros;
- revisão externa obrigatória;
- owner/reviewer separation;
- fingerprints;
- expiração;
- aprovação parcial e condicional;
- proibição de evidência forjada;
- proibição de autoridade financeira ou remota;
- bloqueio após aprovação estrutural.

## Blockers preservados

```text
PAY-B01
PAY-B03
PAY-B04
```

## Impacto no site

Nenhum.

O PAY-B03B não altera UI, pedidos, carteira, payment service, Edge Functions, banco de dados, migrations ou deploys.

## Próxima ação

Obter decisões e pareceres reais fora do repositório, registrar apenas seus hashes e metadados aprovados e então executar um futuro sublote de alinhamento do runtime.

Até isso ocorrer:

```text
legal approvals: 0
tax/accounting approvals: 0
executive approvals: 0
approved parameters: 0
provider contacts: 0
real financial operations: 0
```
