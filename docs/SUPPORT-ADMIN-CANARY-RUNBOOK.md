# Support / Admin Operations Canary Runbook

## Objective
Prepare support ticket and admin support operations for beta launch operations.

## Scope
- GET /support/tickets
- POST /support/tickets
- POST /support/tickets/:id/messages
- GET /admin/support/tickets
- POST /admin/support/tickets/:id/assign
- POST /admin/support/tickets/:id/resolve

## Required controls
- Users can only read/write their own tickets.
- Admin list/assign/resolve endpoints are admin-only.
- Support mutations require idempotency.
- Support actions must be auditable before real staging rollout.

## Validation
```bash
npm run validate:support-admin-canary:local-runtime
```
