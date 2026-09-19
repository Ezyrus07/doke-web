#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');

const read = (file) => fs.readFileSync(file, 'utf8');
const tableAuthority = read('supabase/migrations/097_professional_kyc_table_authority.sql');
const storageAuthority = read('supabase/migrations/098_professional_kyc_storage_authority.sql');
const selfService = read('supabase/migrations/099_professional_kyc_self_service_authority.sql');
const reviewerAuthority = read('supabase/migrations/100_professional_kyc_reviewer_authority.sql');
const finalPermissions = read('supabase/migrations/101_professional_kyc_final_permissions.sql');
const jsonbCompatibility = read('supabase/migrations/20260918193000_professional_kyc_jsonb_compatibility.sql');
const reopenAuthority = read('supabase/migrations/20260918193700_professional_kyc_reopen_authority.sql');
const storageContainmentValidation = read('supabase/tests/030_professional_kyc_storage_containment_validation.sql');
const evidenceLifecycle = read('supabase/migrations/20260918205000_professional_kyc_evidence_lifecycle_authority.sql');
const evidenceLifecycleValidation = read('supabase/tests/032_professional_kyc_evidence_lifecycle_validation.sql');
const gcDryRun = read('supabase/migrations/20260918205500_professional_kyc_gc_dry_run_authority.sql');
const gcEvidencePrecedenceFix = read('supabase/migrations/20260918210200_professional_kyc_gc_evidence_precedence_fix.sql');
const evidenceEventOrdering = read('supabase/migrations/20260918213000_professional_kyc_evidence_event_ordering_authority.sql');
const retentionPolicyAuthority = read('supabase/migrations/20260919005500_professional_kyc_retention_policy_authority.sql');
const retentionPolicyValidation = read('supabase/tests/034_professional_kyc_retention_policy_validation.sql');
const gcDryRunValidation = read('supabase/tests/033_professional_kyc_gc_dry_run_validation.sql');
const signedIntentRuntime = read('scripts/validate-professional-kyc-signed-intent-runtime.mjs');
const storageSetup = read('docs/PROFESSIONAL-VERIFICATION-STORAGE-SETUP.md');
const edgeIndex = read('supabase/functions/professional-verification-operations/index.ts');
const edgeOperations = read('supabase/functions/professional-verification-operations/operations.mjs');
const frontendService = read('assets/js/services/professional-identity-verification-service.js');
const packageJson = JSON.parse(read('package.json'));

for (const token of [
  'alter table public.verification_events enable row level security',
  'revoke all privileges on table public.professional_profiles from public, anon, authenticated',
  'revoke all privileges on table public.professional_identity_verifications from public, anon, authenticated',
  'revoke all privileges on table public.verification_events from public, anon, authenticated',
  'professional_profiles_owner_or_reviewer_read',
  'professional_identity_verifications_owner_or_reviewer_read',
  'verification_events_owner_or_reviewer_read',
  "u.role in ('admin', 'moderator')",
]) assert(tableAuthority.includes(token), `KYC table authority missing: ${token}`);

for (const token of [
  "'professional-verification-media'",
  'private.professional_kyc_upload_intents',
  'create_professional_kyc_upload_intent_internal',
  "'locked/%s/%s/%s-%s%s'",
  'DOKE_KYC_UPLOAD_FIELD_DUPLICATE',
  'to service_role',
]) assert(storageAuthority.includes(token), `KYC upload authority missing: ${token}`);
assert(!storageAuthority.includes('create policy professional_verification_owner_insert'), 'KYC uploads must not depend on browser Storage INSERT policies.');

for (const token of [
  'private.kyc_crypto_secrets',
  'extensions.hmac',
  'private.consume_professional_kyc_upload_intent',
  "split_part(v_path,'/',1)<>'locked'",
  "'hmac-sha256-v1'",
  'DOKE_KYC_SUBMISSION_LOCKED',
  'public.submit_professional_identity_verification_internal',
  'drop function if exists public.submit_professional_identity_verification(jsonb,jsonb)',
  'to service_role',
]) assert(selfService.includes(token), `KYC self-service authority missing: ${token}`);

for (const token of [
  'private.assert_professional_kyc_reviewer',
  'list_professional_identity_verifications_internal',
  'get_professional_identity_verification_internal',
  'start_professional_identity_review_internal',
  'decide_professional_identity_verification_internal',
  "raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)",
  "- 'role' - 'type' - 'account_role' - 'account_status'",
  "raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)",
  'drop function if exists public.decide_professional_identity_verification',
  'to service_role',
]) assert(reviewerAuthority.includes(token), `KYC reviewer authority missing: ${token}`);

assert(!reviewerAuthority.includes("grant execute on function public.decide_professional_identity_verification_internal(uuid, text, text, text)\n  to authenticated"), 'Reviewer decision RPC must never be granted to generic authenticated users.');
assert(finalPermissions.includes('Reviewer functions are never direct authenticated APIs.'), 'Final permission boundary must reassert reviewer isolation.');

for (const token of [
  'DOKE_KYC_CONSUME_INTENT_HELPER_DRIFT',
  'select count(*) from jsonb_each(v_intent.files)',
  'private.consume_professional_kyc_upload_intent',
  'from public,anon,authenticated,service_role',
]) assert(jsonbCompatibility.includes(token), `KYC JSONB compatibility missing: ${token}`);
assert(!jsonbCompatibility.includes('jsonb_object_length(v_intent.files)'), 'KYC compatibility migration must not execute unavailable jsonb_object_length(v_intent.files).');

for (const token of [
  'set search_path = pg_catalog',
  "document_status = 'unverified'",
  "verification_status = 'not_started'",
  "'professional_document'",
  "'pending'",
  'Verificação reaberta pelo usuário para correção e novo envio.',
  'from public, anon, authenticated, service_role',
  'to service_role',
]) assert(reopenAuthority.includes(token), `KYC reopen authority missing: ${token}`);

for (const token of [
  'professional_verification_reference_read',
  'PROF_B05_BROWSER_STORAGE_MUTATION_POLICY_REMAINS',
  'storage.object.sign',
  'storage.object.get_authenticated',
  'PROF_B05_OWNER_LIST_ALLOWED',
  'PROF_B05_REVIEWER_LIST_ALLOWED',
]) assert(storageContainmentValidation.includes(token), `KYC Storage containment validation missing: ${token}`);


for (const token of [
  'private.professional_kyc_evidence_sets',
  'private.professional_kyc_evidence_objects',
  'private.professional_kyc_evidence_events',
  'private.professional_kyc_current_evidence',
  'DOKE_KYC_EVIDENCE_IMMUTABLE',
  'snapshot_imported',
  'signed_intent_reconciled',
  'DOKE_KYC_EVIDENCE_SET_REQUIRED',
]) assert(evidenceLifecycle.includes(token), `KYC evidence lifecycle missing: ${token}`);

for (const token of [
  'PROF_B05_EVIDENCE_SCHEMA_MISSING',
  'PROF_B05_REOPEN_CURRENT_MAPPING_REMAINS',
  'PROF_B05_EVIDENCE_UPDATE_ALLOWED',
  'PROF_B05_EVIDENCE_DELETE_ALLOWED',
  'PROF_B05_EVIDENCE_TRUNCATE_ALLOWED',
]) assert(evidenceLifecycleValidation.includes(token), `KYC evidence validation missing: ${token}`);

for (const token of [
  "check (mode='dry_run')",
  'GC_TECHNICALLY_ELIGIBLE',
  'PROF_B04_RETENTION',
  'CANCELLATION_ANCHOR_MISSING',
  'run_professional_kyc_gc_dry_run_internal',
]) assert(gcDryRun.includes(token), `KYC GC dry-run authority missing: ${token}`);

assert(!gcDryRun.includes('claim_token'), 'PRE-B04 KYC GC must not have claim authority.');
assert(!gcDryRun.includes('lease_expires_at'), 'PRE-B04 KYC GC must not have lease authority.');
assert(!gcDryRun.toLowerCase().includes('delete from storage.objects'), 'PRE-B04 KYC GC must not delete Storage objects.');
assert(gcEvidencePrecedenceFix.includes('HISTORICAL_EVIDENCE_RETENTION_UNRESOLVED'), 'Historical evidence must outrank legacy orphan classification.');
assert(gcDryRunValidation.includes('historical_legacy_evidence'), 'GC validation must cover historical legacy evidence precedence.');
assert(evidenceEventOrdering.includes('event_sequence bigint generated always as identity'), 'KYC evidence events must have deterministic append order.');
assert(evidenceEventOrdering.includes('professional_kyc_evidence_events_set_sequence_idx'), 'KYC evidence event ordering index missing.');

for (const token of [
  'private.professional_kyc_retention_policies',
  "policy_state in ('draft','approved')",
  "retention_mode in ('elapsed_interval','hold_only')",
  'approval_reference',
  'legal_basis_reference',
  'DOKE_KYC_RETENTION_POLICY_APPROVED_IMMUTABLE',
  'evaluate_professional_kyc_retention_policy',
  'POLICY_ELAPSED_TECHNICAL_ALLOW',
  'PROF_B05_G7_PHYSICAL_GC',
]) assert(retentionPolicyAuthority.includes(token), `KYC retention policy authority missing: ${token}`);

assert(retentionPolicyAuthority.includes('retention_interval interval,'), 'KYC retention interval must remain explicit and nullable.');
assert(!retentionPolicyAuthority.includes('retention_interval interval default'), 'KYC retention interval must never have a default.');
assert(!retentionPolicyAuthority.toLowerCase().includes('insert into private.professional_kyc_retention_policies'), 'KYC retention authority must not seed policy rows.');
assert(!retentionPolicyAuthority.toLowerCase().includes('delete from storage.objects'), 'KYC retention authority must not delete Storage objects.');

for (const token of [
  'PROF_B04_APPROVED_POLICY_SEEDED_UNEXPECTEDLY',
  'PROF_B04_MISSING_POLICY_NOT_HELD',
  'PROF_B04_DRAFT_POLICY_NOT_HELD',
  'PROF_B04_FUTURE_POLICY_NOT_HELD',
  'PROF_B04_LEGAL_HOLD_NOT_HELD',
  'PROF_B04_ELAPSED_POLICY_GATE_INVALID',
  'PROF_B04_APPROVED_POLICY_UPDATE_ALLOWED',
  'PROF_B04_RETENTION_POLICY_TRUNCATE_ALLOWED',
]) assert(retentionPolicyValidation.includes(token), `KYC retention policy validation missing: ${token}`);


assert(storageSetup.includes('professional_verification_reference_read'), 'KYC Storage setup must document the canonical referenced-read policy.');
assert(!storageSetup.includes('Proprietário — INSERT, SELECT, UPDATE e DELETE'), 'KYC Storage setup must not instruct recreating legacy owner mutation policies.');

for (const token of [
  'private.professional_kyc_evidence_sets',
  'private.professional_kyc_evidence_objects',
  'private.professional_kyc_evidence_events',
  'private.professional_kyc_current_evidence',
  'DOKE_KYC_EVIDENCE_IMMUTABLE',
  'legacy_current_snapshot',
  'signed_intent_reconciled',
  'DOKE_KYC_BACKFILL_MIXED_PATH_PROVENANCE',
  "'submitted'",
  "'review_started'",
  "'reopened'",
]) assert(evidenceLifecycle.includes(token), `KYC evidence lifecycle missing: ${token}`);

for (const token of [
  'PROF_B05_EVIDENCE_BROWSER_PRIVILEGE_LEAK',
  'PROF_B05_S1_REVIEW_REJECT_EVENTS_MISSING',
  'PROF_B05_S2_DIRECT_DECISION_EVENTS_MISSING',
  'PROF_B05_EVIDENCE_TRUNCATE_ALLOWED',
]) assert(evidenceLifecycleValidation.includes(token), `KYC evidence validation missing: ${token}`);

for (const token of [
  "mode text not null default 'dry_run' check (mode='dry_run')",
  'GC_TECHNICALLY_ELIGIBLE',
  'PROF_B04_RETENTION',
  'CANCELLATION_ANCHOR_MISSING',
  'HISTORICAL_EVIDENCE_RETENTION_UNRESOLVED',
  'run_professional_kyc_gc_dry_run_internal',
]) assert(gcDryRun.includes(token), `KYC GC dry-run authority missing: ${token}`);

for (const forbidden of [
  'claim_token',
  'claimed_at',
  'lease_expires_at',
  'deleted_at',
]) assert(!gcDryRun.includes(forbidden), `KYC GC dry-run must not contain pre-B04 execution field: ${forbidden}`);

for (const token of [
  'PROF_B05_GC_CLASSIFIER_MATRIX_FAILED',
  'PROF_B05_GC_REFERENCE_PRECEDENCE_BROKEN',
  'PROF_B05_GC_RETENTION_GATE_MISSING',
]) assert(gcDryRunValidation.includes(token), `KYC GC validation missing: ${token}`);

for (const token of [
  'uploadToSignedUrl',
  'prof-b05-g2a-pass',
  'cleanup-storage-error',
  'DOKE_KYC_CANARY_ALLOW_STAGING',
]) assert(signedIntentRuntime.includes(token), `KYC signed-intent runtime canary missing: ${token}`);

for (const token of [
  'professional-verification-operations',
  'authClient.auth.getUser()',
  'prepare_uploads',
  'createSignedUploadUrl',
  'create_professional_kyc_upload_intent_internal',
  'submit_professional_identity_verification_internal',
  'assertReviewer',
  'list_professional_identity_verifications_internal',
  'get_professional_identity_verification_internal',
  'start_professional_identity_review_internal',
  'decide_professional_identity_verification_internal',
]) assert(edgeIndex.includes(token), `KYC Edge Function missing: ${token}`);

assert(edgeOperations.includes("['prepare_uploads', 'submit', 'list', 'detail', 'start', 'decide']"), 'KYC Edge Function action allowlist is missing.');
assert(frontendService.includes("client.functions.invoke('professional-verification-operations'"), 'Frontend KYC flow must use the authenticated Edge Function.');
assert(frontendService.includes('.uploadToSignedUrl('), 'Applicant evidence must use signed upload tokens.');
assert(frontendService.includes("remoteVerificationOperation('submit'"), 'Final KYC submission must use the Edge Function.');
assert(!frontendService.includes("remoteRpc('submit_professional_identity_verification'"), 'Frontend must not call the legacy final submission RPC.');
assert(!frontendService.includes("remoteRpc('list_professional_identity_verifications_for_admin'"), 'Frontend must not call legacy reviewer list RPC.');
assert(!frontendService.includes("client.rpc('decide_professional_identity_verification'"), 'Frontend must not call legacy reviewer decision RPC.');

assert.strictEqual(packageJson.scripts['test:professional-kyc-authority-contract'], 'node scripts/test-professional-kyc-authority-contract.js');
assert.strictEqual(packageJson.scripts['test:professional-kyc-edge-runtime'], 'node scripts/test-professional-kyc-edge-runtime.mjs');
assert.strictEqual(packageJson.scripts['validate:professional-kyc-signed-intent:dry-run'], 'node scripts/validate-professional-kyc-signed-intent-runtime.mjs --dry-run');
assert.strictEqual(packageJson.scripts['validate:professional-kyc-signed-intent:check-env'], 'node scripts/validate-professional-kyc-signed-intent-runtime.mjs --check-env');
assert.strictEqual(packageJson.scripts['validate:professional-kyc-signed-intent:execute'], 'node scripts/validate-professional-kyc-signed-intent-runtime.mjs --execute');
assert.strictEqual(packageJson.scripts['validate:professional-kyc-evidence-lifecycle:dry-run'], 'node scripts/validate-professional-kyc-evidence-lifecycle-runtime.mjs --dry-run');
assert.strictEqual(packageJson.scripts['validate:professional-kyc-evidence-lifecycle:execute'], 'node scripts/validate-professional-kyc-evidence-lifecycle-runtime.mjs --execute');

console.log('Professional KYC authority contract passed.');
