# Staging Evidence Review Runbook

## Purpose

Review staging environment and seed evidence before private beta entry. This is a read-only review layer over the staging env application and seed operator reports.

It does not store credentials and does not mutate staging.

## Commands

```bash
npm run audit:staging-evidence-review
npm run execute:staging-evidence-review:dry-run
npm run execute:staging-evidence-review:check-env
npm run execute:staging-evidence-review:report
```

## Approval

```bash
DOKE_STAGING_EVIDENCE_REVIEW_APPROVED=1 \
DOKE_STAGING_REVIEWER="Gabriel" \
npm run execute:staging-evidence-review:report
```

## Expected blocked state without env

```txt
staging_evidence_review_has_blockers
```

## Accepted state

```txt
staging_evidence_review_ready_for_private_beta_entry
```
