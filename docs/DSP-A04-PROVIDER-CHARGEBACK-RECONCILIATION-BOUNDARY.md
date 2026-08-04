# DSP-A04 — Provider chargeback reconciliation boundary

## Estado

Contrato **repository-only**, neutro de PSP e fail-closed.

```text
runtimeIntegrated: false
migrationApplied: false
stagingValidated: false
providerSelected: false
providerCredentialsConfigured: false
providerDecisionAuthority: false
chargebackAuthority: false
realMoneyAuthority: false
productionAuthority: false
```

Nenhum webhook real, credencial, disputa, chargeback, refund, release ou movimentação financeira faz parte deste sublote.

## Objetivo

Definir a fronteira entre sinais externos do futuro provider e o estado financeiro interno da Doke. Um evento recebido não é uma decisão reconciliada. Um único webhook nunca é suficiente para concluir vitória, derrota, reversão ou efeito financeiro.

## Observações autenticadas

Fontes canônicas:

```text
signed_webhook
authenticated_poll
authenticated_api_response
provider_statement
```

Regras:

- `signed_webhook` exige assinatura verificada;
- as demais fontes exigem canal autenticado;
- `provider_statement` exige fingerprint próprio;
- o payload bruto, segredos, cartão, conta bancária e corpo da evidência são proibidos;
- referências de provider, disputa, transação e caso são opacas;
- valor, moeda e fingerprints internos são vinculados à observação.

## Estados do provider

```text
unknown
opened
evidence_due
evidence_submitted
under_review
won
lost
reversed
```

A máquina de estados rejeita regressões e transições impossíveis. `won` e `lost` só podem avançar para `reversed`.

## Deduplicação, conflito e ordem temporal

- mesmo `providerEventId` e mesmo fingerprint: replay idempotente;
- mesmo `providerEventId` com conteúdo diferente: conflito;
- mesma sequência com conteúdo diferente: conflito;
- sequência precisa crescer;
- `occurredAt` não pode regredir;
- todas as observações da cadeia precisam apontar para o mesmo provider adapter, disputa, transação, caso, valor e moeda.

## Reconciliação independente

Estados internos:

```text
provider_unknown
provider_open
evidence_required
provider_review
reconciliation_required
reconciled_won
reconciled_lost
reversed
conflict
```

Resultados finais exigem, simultaneamente:

- cadeia de eventos validada;
- ledger do provider correspondente;
- transação e caso correspondentes;
- valor e moeda correspondentes;
- referência da disputa correspondente;
- bundle DSP-A03 vinculado;
- snapshot DSP-A02 vinculado;
- registro contábil independente;
- auditoria registrada.

`won`, `lost` ou `reversed` vindos do provider sem esses matches permanecem em `reconciliation_required`.

## Autoridade

A fronteira pode registrar referências e provar consistência estrutural. Ela não pode:

- enviar evidência ao provider;
- aceitar resultado do provider como decisão interna isolada;
- executar chargeback;
- executar refund ou release;
- mover dinheiro;
- aplicar migration;
- acessar staging;
- alterar produção.

## Blockers preservados

```text
DSP-B01
DSP-B03
DSP-B04
PAY-B01
PAY-B03
PAY-B04
WAL-B02
WAL-B03
WAL-B04
```

## Próximo sublote

`DSP-A05 — operator case and dual-control readiness`

O DSP-A05 deverá definir fila operacional, papéis, segregação de funções, dupla aprovação, SLA, escalonamento e readiness sem conceder autoridade financeira.
