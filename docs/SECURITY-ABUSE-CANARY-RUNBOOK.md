# Security / Rate Limit / Abuse Prevention Canary Runbook

## Objective
Prepare minimum abuse-prevention contracts before private beta.

## Scope
- POST /security/rate-limit/check
- POST /security/abuse-events
- GET /admin/security/abuse-events
- POST /security/sessions/risk-score

## Required controls
- Rate-limit checks are authenticated.
- Abuse event creation is authenticated.
- Abuse event admin list is admin-only.
- Security mutations require idempotency.
- Real staging must include log sink and request ids before private beta.

## Validation
```bash
npm run validate:security-abuse-canary:local-runtime
```
