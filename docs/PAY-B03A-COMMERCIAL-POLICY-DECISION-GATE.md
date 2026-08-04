# PAY-B03A — Commercial Policy Decision Gate

## Status

Repository-only decision packet. `PAY-B03` remains open.

This sublot does not grant legal approval, provider-contact authority, payment-processing authority, custody authority, staging access or production readiness.

## Root cause

The current local payment flow already models charge approval, `held`, client-confirmed release, dispute freeze, binary support resolution and full refund. Those mechanics are technically coherent, but they embed commercial assumptions before fee, cancellation, partial-performance, chargeback, tax and consumer policies have been formally approved.

PAY-B03A separates those decisions from runtime code and makes them auditable.

## Proposed funds-flow direction

```text
client
  -> regulated PSP
  -> PSP-managed split / conditional hold
  -> release decision
  -> direct settlement to professional
  -> separate settlement of Doke fee
```

Doke must not receive customer funds into its own operational bank account and later forward them to professionals. The proposed model is non-custodial and provider-managed.

## Official research basis

The packet records official sources from Banco Central, Planalto, the Consumer Protection Code and Receita Federal. Banco Central states that marketplaces may be treated as subcredenciadores when they receive and pass payments to sellers after extracting remuneration. Law 12.865/2013 broadly defines payment activities, while the Consumer Protection Code requires clear information and preserves consumer remedies.

The repository does not convert those sources into legal approval. Tax and platform-liability conclusions remain subjects for professional review.

## Required decisions

The gate requires exactly 18 decisions:

- marketplace role and contracting parties;
- platform fee, PSP costs and discounts;
- custody, hold, release and payout;
- cancellation before and after service start;
- provider cancellation and service-quality remedies;
- dispute SLA, authority and appeal;
- chargeback liability and reserves;
- tax-document allocation;
- remote-contract right of withdrawal.

## Conservative proposed defaults

- Doke acts as intermediary marketplace; the professional performs the service.
- Funds remain under PSP control; Doke has no custody authority.
- Initial beta release requires client confirmation or reasoned support resolution.
- There is no automatic timed release.
- Provider cancellation or non-delivery results in full client refund.
- Partial performance requires a separate proportional-refund policy.
- Doke-funded discounts do not reduce the professional gross amount.
- Chargeback reserves, negative balances and compensation remain blocked.
- The professional is expected to document the service and Doke only its intermediation fee, but this is an unapproved tax hypothesis.

## Legal-review handoff

A valid handoff requires the complete decision set, official sources, one owner role, at least two separate reviewer roles, at least five counsel questions and explicit review scopes.

The only handoff state is:

```text
blocked_pending_legal_review
```

The provider-readiness evaluator always returns:

```text
decision: blocked_repository_only
blockers: PAY-B01, PAY-B03, PAY-B04
providerContactAuthorized: false
paymentProcessingAuthorized: false
fundCustodyAuthorized: false
readyForProviderEvaluation: false
```

No JSON field can transform this repository packet into legal approval.

## Conformance

```text
39 total
12 positive
27 negative
39/39 passed locally
```

Negative coverage includes unofficial sources, incomplete decisions, custodial funds-flow attempts, broken role separation, approval claims, fingerprint tampering and provider-contact attempts.

## Runtime impact

PAY-B03A does not modify `payment-service.js`, order transitions, wallet balances, dispute UI, refund execution, Supabase functions, migrations, staging or production.

## PAY-B03 exit criteria

PAY-B03 remains blocked until there is:

1. executive approval of fee, discounts, payout and SLA parameters;
2. written legal review of marketplace role, consumer remedies and contract terms;
3. written tax/accounting review of invoicing and revenue recognition;
4. approved chargeback, reserve and negative-balance policy;
5. provider capability mapping without credentials or activation;
6. versioned approval evidence with accountable reviewers;
7. follow-up runtime tests proving the approved policy is implemented.
