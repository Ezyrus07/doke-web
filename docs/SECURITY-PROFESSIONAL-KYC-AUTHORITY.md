# Professional KYC Authority

## Scope

This contract closes the professional onboarding and identity-verification authority boundary without changing the visual flow.

Authoritative state:

- `public.professional_profiles`: professional setup and activation state;
- `public.professional_identity_verifications`: private application and decision state;
- `public.verification_events`: append-only lifecycle evidence;
- `storage.objects` in `professional-verification-media`: private binary evidence;
- `public.users.role`: canonical account role;
- `auth.users.raw_app_meta_data`: server-maintained role projection.

## Browser boundary

Authenticated applicants may:

- read their own professional profile, verification and verification events;
- write through `save_professional_profile_setup`;
- save a verification draft through its RPC;
- request a short-lived upload intent through the authenticated Edge Function;
- upload each file with a one-time signed upload token;
- submit the locked intent through the same Edge Function;
- reopen a rejected application through the JWT-verified self-service Edge Function and service-role dispatcher;
- never choose final Storage paths or receive direct write permission on KYC tables.

They cannot insert, update or delete any KYC authority table directly.

Reviewers do not call privileged database functions directly. The browser calls the JWT-protected `professional-verification-operations` Edge Function. It authenticates the caller, verifies an active `admin` or `moderator` role from `public.users`, and invokes service-role-only RPCs.

## Evidence immutability

The private bucket accepts only JPEG, PNG and PDF files up to 10 MiB. `selfieDocument` accepts images only.

The browser first asks the JWT-protected Edge Function to prepare an upload. The database validates the applicant and creates a short-lived intent with exact paths under:

```text
locked/<user-id>/<intent-id>/<field>-<random-id>.<extension>
```

The Edge Function creates one-time signed upload tokens for those paths. The application uploads with `uploadToSignedUrl`; the authoritative flow does not rely on a generic Storage INSERT policy and cannot choose another account, intent or field path.

Final submission is service-role-only. In one database transaction it verifies that every required object:

- belongs to the exact unexpired intent;
- exists in the private bucket;
- has the expected MIME type and byte size;
- matches the individual or business manifest;
- has not been consumed before.

The intent is then consumed atomically. Reuse, expiration and mismatched content are rejected. Existing reviewer read access remains private and authenticated.

## Storage policy containment

PROF-B05/G1 removed the legacy owner-prefix Storage INSERT/UPDATE/DELETE and broad SELECT policies from staging. The bucket now has one canonical referenced-read policy: owners and active reviewers may sign/download only objects that are referenced by a KYC verification row. Generic bucket listing is denied.

The authoritative upload path remains signed-intent based under `locked/<user-id>/<intent-id>/...`; no generic browser Storage mutation policy is required.

Validation is captured by `supabase/tests/030_professional_kyc_storage_containment_validation.sql`.

## Tax identity

Raw CPF/CNPJ values are never persisted. New submissions store:

- the last four digits;
- an HMAC-SHA-256 digest generated with a private random key;
- digest version `hmac-sha256-v1`.

The key is stored in a private table with no grants to `anon`, `authenticated` or `service_role`.

## Reviewer lifecycle

```text
submitted
  → under_review
  → verified | rejected
```

A moderator may decide only an application assigned to that moderator. An administrator may take over a review. Terminal repeated decisions with the same outcome are idempotent; conflicting terminal decisions are rejected.

Approval atomically:

- marks the verification `verified`;
- activates `professional_profiles`;
- promotes `public.users.role` to `professional`;
- strips role/status keys from user-editable metadata;
- projects the professional state into app metadata;
- appends verification and audit events;
- emits a deduplicated notification.

## Files

- `supabase/migrations/097_professional_kyc_table_authority.sql`
- `supabase/migrations/098_professional_kyc_storage_authority.sql`
- `supabase/migrations/099_professional_kyc_self_service_authority.sql`
- `supabase/migrations/100_professional_kyc_reviewer_authority.sql`
- `supabase/migrations/101_professional_kyc_final_permissions.sql`
- `supabase/functions/professional-verification-operations/`
- `supabase/tests/007_professional_kyc_authority_validation.sql`
- `scripts/test-professional-kyc-authority-contract.js`
- `scripts/test-professional-kyc-edge-runtime.mjs`
