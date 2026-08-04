# PAY-001 / PAY-A10 — External executor adapters and sanitized evidence ingestion

## Status

`PAY-A10` is **repository-only**. It creates inert adapters and local contract validation for the five PAY-A09 phases. It does **not** connect to staging, does **not** configure an endpoint, does **not** load credentials and does **not** execute any remote action.

## Root cause

PAY-A09 separated authorization for preflight, migration application, post-migration verification, forward-only rollback and cleanup. The remaining gap was the boundary between an authorized plan and an external executor:

- no typed adapter proved which phase and capability an executor could accept;
- no dispatch fingerprint bound the executor to the exact PAY-A09 plan;
- no receipt contract enforced head, manifest, resource plan, executor and phase bindings;
- no replay ledger existed for receipts or evidence;
- no evidence ingestor rejected raw logs, raw SQL, secrets, identifiers or provider payloads;
- an accepted receipt could be mistaken for authorization of the next phase.

PAY-A10 closes that gap without creating a remote executor.

## Canonical contracts

```text
pay-a10-external-executor-evidence-ingestion-v1
pay-reconciliation-executor-adapter-v1
pay-reconciliation-executor-dispatch-v1
pay-reconciliation-execution-receipt-v1
pay-reconciliation-execution-evidence-v1
```

## Inert phase-specific adapters

Exactly five profiles exist:

| PAY-A09 phase | Executor type | Capability |
|---|---|---|
| `read_only_preflight` | `external_read_only_inspector` | `read_only_catalog_query` |
| `migration_application` | `external_database_executor` | `ordered_migration_application` |
| `post_migration_verification` | `external_read_only_inspector` | `post_migration_catalog_query` |
| `rollback` | `external_database_executor` | `forward_only_corrective_migration` |
| `cleanup` | `external_cleanup_executor` | `temporary_artifact_cleanup` |

Every adapter is inert:

```text
transportConfigured: false
credentialsConfigured: false
endpointConfigured: false
remoteExecutionAllowed: false
repositoryExecutionPerformed: false
executeMethodPresent: false
```

There is no `execute`, `send`, `fetch`, `request`, `applyMigration` or equivalent remote method.

## Dispatch envelope

The adapter accepts only a valid PAY-A09 plan and produces a local immutable envelope bound to:

- exact git head;
- PAY-A08 manifest hash;
- resource plan hash;
- evidence hash;
- PAY-A09 plan fingerprint;
- phase;
- executor type;
- capability;
- hashed executor identity.

The dispatch declares:

```text
externalExecutorAuthorizationStillRequired: true
nextPhaseAutomaticallyAuthorized: false
remoteExecutionPerformed: false
productionAllowed: false
directMoneyMutationAllowed: false
providerOperationAllowed: false
```

Producing a dispatch envelope does not send it anywhere.

## Signed executor receipt

A receipt is accepted only when:

- its phase matches the adapter;
- its status belongs to that phase;
- head, manifest, resource plan, plan fingerprint, dispatch fingerprint and executor hash match;
- execution identity is hashed;
- the signature digest uses `ed25519` or `rsa_pss_sha256`;
- its age is at most 900 seconds;
- its canonical fingerprint is valid;
- the fingerprint has not been consumed before.

Raw signatures and raw logs are not stored. A receipt from one phase cannot be used as a receipt for another phase.

`Próximo`, a PAY-A09 authorization phrase, a generic continuation or a receipt without the exact bindings does not authorize execution.

## Sanitized evidence ingestion

Evidence is accepted only after a validated receipt. Allowed content is limited to:

- operation and phase status;
- receipt and plan fingerprints;
- observation timestamp;
- aggregate migration and object counts;
- compatibility booleans;
- rollback/forward-correction/cleanup booleans;
- low-cardinality outcome code.

The ingestor rejects:

- user, actor, order, payment, case, intent, provider or event IDs;
- e-mail, phone, CPF or CNPJ;
- card data;
- secrets, tokens, cookies or passwords;
- authorization values;
- idempotency keys;
- raw SQL;
- stdout or stderr;
- raw provider payloads;
- any non-allowlisted field.

Successful status claims are cross-checked. For example:

- `preflight_passed` and `verified` require compatible schema/history and all expected objects;
- `applied` requires all expected migrations;
- `rolled_forward` requires evidence of a corrective migration;
- `cleaned` requires cleanup completion.

Evidence is immutable, hash-pinned and replay-protected. Ingestion does not authorize another phase and does not trigger any remote action.

## Operational authority

Even after a valid local adapter, receipt and evidence cycle:

```text
nextPhaseAutomaticallyAuthorized: false
remoteActionTriggeredByIngestion: false
directMoneyMutationAllowed: false
providerOperationAllowed: false
productionAllowed: false
```

A fresh exact PAY-A09 authorization remains mandatory for every remote phase.

## Repository assets

- `backend/modules/payments/payment-reconciliation-executor-adapter.js`
- `config/pay-001-a10-external-executor-evidence-ingestion.json`
- `docs/PAY-001-A10-EXTERNAL-EXECUTOR-EVIDENCE-INGESTION.md`
- `docs/validation/PAY-001-A10-EXTERNAL-EXECUTOR-EVIDENCE-INGESTION.json`
- `scripts/audit-pay-001-a10-external-executor-evidence-ingestion.js`
- `scripts/test-pay-001-a10-external-executor-evidence-ingestion.js`
- `.github/workflows/pay-001-a10-external-executor-evidence-ingestion.yml`

## Blockers preserved

- `PAY-B01`: no contracted PSP, provider account, specific adapter, credentials, webhook or real conformance;
- `PAY-B03`: commercial, fiscal, escrow, refund, dispute, chargeback and payout rules are not materially approved;
- `PAY-B04`: no remote store, applied migrations, leases, scheduler, metrics sink, alert delivery, on-call owner or staging rehearsal.

PAY-A10 reduces ambiguity around external execution evidence. It closes no remote blocker.

## Safety effects

- network requests: `0`;
- staging reads: `0`;
- staging mutations: `0`;
- dispatches sent: `0`;
- remote receipts received: `0`;
- remote evidence ingested: `0`;
- migrations applied: `0`;
- rollback migrations applied: `0`;
- endpoints configured: `0`;
- credentials or secrets configured: `0`;
- payments, refunds or payouts: `0`;
- production changes: `0`;
- merge or auto-merge: `0`.

## Next sublot

`PAY-A11` — define provider-neutral external executor protocol manifests and a deterministic dry-run conformance corpus for all five PAY-A09 phases, still repository-only.
