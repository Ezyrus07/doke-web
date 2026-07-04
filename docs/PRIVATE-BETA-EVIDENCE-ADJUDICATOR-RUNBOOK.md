# Private Beta Evidence Adjudicator Runbook

## Purpose

Make the private beta entry decision after reports have been interpreted and triaged.

The adjudicator is intentionally strict. It does not produce GO unless all evidence reports are accepted and a manual confirmation is present.

## Commands

```bash
npm run audit:private-beta-evidence-adjudicator
npm run execute:private-beta-evidence-adjudicator:dry-run
npm run execute:private-beta-evidence-adjudicator:check-env
npm run execute:private-beta-evidence-adjudicator:report
```

To include the long real-entry repeat phase:

```bash
DOKE_ADJUDICATOR_RUN_FULL=1 npm run execute:private-beta-evidence-adjudicator:report
```

To permit GO after all evidence is accepted:

```bash
DOKE_ADJUDICATOR_RUN_FULL=1 \
DOKE_PRIVATE_BETA_ADJUDICATOR_CONFIRM=adjudicate-private-beta-go \
npm run execute:private-beta-evidence-adjudicator:report
```

## Current expected state

Without real screenshots, Lighthouse/a11y, staging seeds and manual approvals:

```txt
private_beta_evidence_adjudicator_no_go
```

## Accepted GO state

```txt
private_beta_evidence_adjudicator_go
```
