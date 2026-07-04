# Private Beta Evidence Loop Runbook

## Objective

Run the evidence loop that decides whether the private beta can progress from NO-GO to GO. This loop must never approve the beta from synthetic or missing evidence.

## Phases

1. Browser policy resolution.
2. Visual/responsive evidence.
3. Browser quality evidence.
4. Staging command pack.
5. Staging seed operator.
6. Private beta GO pursuit.

## Commands

```bash
npm run audit:private-beta-evidence-loop
npm run execute:private-beta-evidence-loop:dry-run
npm run execute:private-beta-evidence-loop:check-env
npm run execute:private-beta-evidence-loop:report
```

## Decision statuses

- `private_beta_evidence_loop_go`: every accepted report status passed.
- `private_beta_evidence_loop_no_go`: at least one real evidence phase is blocked.

## Guardrails

- Defaults to `NO_GO`.
- Does not hardcode credentials.
- Does not mutate production.
- Does not mark visual evidence as passed when the browser is blocked.
