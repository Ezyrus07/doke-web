# KYC / Professional Verification Canary Runbook

## Objective
Prepare professional verification and document review contracts for private beta.

## Scope
- GET /professionals/verification
- PATCH /professionals/verification
- POST /kyc/documents
- POST /kyc/documents/:id/submit
- GET /admin/kyc/reviews
- POST /admin/kyc/reviews/:id/approve
- POST /admin/kyc/reviews/:id/reject

## Required controls
- Only professional/admin actors can operate professional verification.
- Admin review endpoints are admin-only.
- Document mutations require idempotency.
- Uploaded documents must be referenced by upload ids, not stored inline in source.

## Validation
```bash
npm run validate:kyc-canary:local-runtime
```
