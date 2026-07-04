# Payments / Checkout / Escrow Canary Runbook

## Objective
Prepare private-beta payment flow contracts without connecting production payment processors by default.

## Scope
- GET /payments/methods
- POST /checkout/sessions
- POST /payments/:id/confirm
- POST /escrow/holds
- POST /escrow/:id/release
- POST /escrow/:id/refund

## Required controls
- Mock remains default.
- Every mutation requires `x-idempotency-key`.
- Same key and same payload must replay safely.
- Same key with a different payload must return `DOKE_IDEMPOTENCY_CONFLICT`.
- Escrow hold/release/refund is admin/server-authorized only.
- Real PSP credentials must never be committed to the repository.

## Validation
```bash
npm run validate:payments-escrow-canary:local-runtime
```

Real staging execution is blocked behind `execute:beta-launch:staging`.
