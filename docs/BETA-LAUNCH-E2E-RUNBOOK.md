# Beta Launch E2E Runbook

## Objective
Validate beta-launch domains locally before staging execution.

## Covered domains
- Payments / checkout / escrow
- KYC / professional verification
- Support / admin operations
- Security / rate limit / abuse prevention

## Local validation
```bash
npm run audit:beta-launch-local-runtime
npm run validate:beta-launch:local-runtime
```

Domain-specific commands:

```bash
npm run validate:payments-escrow-canary:local-runtime
npm run validate:kyc-canary:local-runtime
npm run validate:support-admin-canary:local-runtime
npm run validate:security-abuse-canary:local-runtime
```

## Status
A successful local run emits `beta_launch_local_runtime_validated`. This does not authorize production or real staging mutation by itself.
