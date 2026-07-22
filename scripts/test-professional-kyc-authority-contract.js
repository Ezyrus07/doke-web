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

console.log('Professional KYC authority contract passed.');
