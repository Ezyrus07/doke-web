# ORD-A08 — Staging release attestation and local security review

**Date:** 2026-10-22. **Status:** local-only patch. No hosted runtime verified and no remote access authorized.

## Reproducible defect and fix

Base PR #552 HEAD 66b0fc04262cacd76a014212db729d75a31b6c91 accepted any 64-character hexadecimal fingerprint header even if it did not correspond to the release metadata. An offline mock passed a fake 64-hex header with a different calculated fingerprint, and the original preflight still returned a successful status. This shows a local metadata-consistency validation gap, not a proven compromise of staging.

The patch recalculates the SHA-256 fingerprint from the expected release contract, staging environment, release ID and revision. It rejects any inconsistent fingerprint in the response header or health release body before proceeding to CORS OPTIONS. The new fully synthetic test covers one valid case and three rejected cases: wrong header, wrong health body, wrong revision. No external network is used.

The combined-journey CI includes this new local regression suite when the follow-on PR is created against the branch of #552. No runtime deployment is performed.

## Independent authority and limitations

**Release metadata is self-reported, not provider-attested.** A runtime with incorrectly configured but self-consistent release variables could pass the corrected fingerprint check while running code different from the intended revision. Verify the actual deployed immutable artifact/build ID and revision independently in the authorized hosting control plane.

**Rollback readiness is declarative.** The backend release descriptor marks rollbackReady true when the rollback ID is syntactically valid and differs from the candidate. This does not prove that the rollback deployment exists or can actually be restored. Verify that separately.

**CORS is not access control.** Source rejects wildcard origins and enforces exact origin matches, but a synthetic offline test confirmed that a non-loopback HTTP origin configured explicitly in DOKE_ALLOWED_ORIGINS is accepted in staging. Review for HTTPS-only non-loopback staging origins and compatibility, and verify SSO/access policy separately. This fingerprint patch does NOT change CORS policy.

**Target marker is operator-asserted.** An otherwise unmarked HTTPS host can pass syntactic preflight checks when DOKE_ORD_A08_TARGET_MARKER is explicitly set to staging. Confirm host and project ownership from the provider before remote calls.

**Historical evidence is not current evidence.** The 2026-10-06 staging canary at SHA 280787d0b6130d89c2963c7b197118f9021b9daa proved a two-account order/message readback, but its isolated runtime SSO had been disabled, 387 browser failures were recorded and raw console logs were not archived. No current staging certification follows.

## Required next gates (none approved)

1. Independently identify hosting project, deployed artifact/revision, secure HTTPS URL, origin and SSO or equivalent perimeter.
2. Verify real rollback release and responsible operator, beyond a boolean readiness value.
3. Obtain separate explicit approval to run remote GET /health and OPTIONS /orders only after environment checks pass; the current local check-env remains blocked.
4. Obtain separate explicit approval for any synthetic-account write canary and runId-scoped cleanup with zero residue.
5. Keep all 51 historical P31 blocker decisions as UNKNOWN_HOLD until signed human decisions. P31-021 adoption and P31-022 remain unauthorized.
6. Keep Railway selection, deploy, production, migrations, Supabase hosted writes and payments outside the scope of this change.

**Outcome:** local fingerprint-consistency guard only. No deployed build, network, hosting resource or production code path was changed by this report.
