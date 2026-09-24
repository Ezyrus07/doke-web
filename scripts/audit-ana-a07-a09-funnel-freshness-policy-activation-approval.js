#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));

const contract=json('config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const evidence=json('reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json');
const envelope=json('config/ana-a07-a09-funnel-freshness-policy-activation-envelope.json');
const runtimeEvidence=json('reports/generated/ana-a07-a09-funnel-freshness-policy-runtime-enforcement-staging-evidence.json');
const matrix=json('config/domain-completion-matrix.json');
const pkg=json('package.json');
const workflow=read('.github/workflows/ana-a07-a09-funnel-freshness-policy-activation-envelope.yml');
const migration=read('supabase/migrations/20260924144500_ana_a07_a09_funnel_policy_approved_activation.sql');
const validation=read('supabase/tests/045_ana_a07_a09_funnel_policy_approved_activation_validation.sql');
const doc=read('docs/ANA-A07-A09-FUNNEL-FRESHNESS-POLICY-ACTIVATION-APPROVAL.md');
const lib=require('./lib/ana-a07-a09-funnel-freshness-policy-activation-approval');

assert.equal(contract.status,'activation_approval_materialized_successor_candidate_ready_staging_unauthorized');
assert.equal(contract.repositoryActivationApproval.authorizationDigestSha256,'d72f3930dffb8ba36d49c22eaebec4f20cf88121280c4201a6eb8a140a7dc494');
assert.equal(contract.repositoryActivationApproval.evidenceDigestSha256,'ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603');
assert.equal(contract.repositoryActivationApproval.evidencePath,'reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json');
assert.equal(contract.successorCandidate.migration,'supabase/migrations/20260924144500_ana_a07_a09_funnel_policy_approved_activation.sql');
assert.equal(contract.successorCandidate.validation,'supabase/tests/045_ana_a07_a09_funnel_policy_approved_activation_validation.sql');
assert.equal(contract.successorCandidate.status,'repository_ready_staging_unauthorized');
assert.equal(contract.successorCandidate.stagingApplied,false);
assert.equal(contract.successorCandidate.validation045Status,'NOT_RUN_STAGING');

assert.equal(lib.sha256(contract.repositoryActivationApproval.rawAuthorization),evidence.authorizationDigestSha256);
assert.equal(evidence.authorizationDigestSha256,'d72f3930dffb8ba36d49c22eaebec4f20cf88121280c4201a6eb8a140a7dc494');
assert.equal(evidence.evidenceDigestSha256,'ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603');
lib.validateCompletedActivationApprovalEvidence(evidence,contract.repositoryActivationApproval.rawAuthorization);
assert.equal(evidence.repositoryHead,'9c54828972aa2d745491baf0c11335c00700035b');
assert.equal(evidence.matrixVersion,'1.3.132');
assert.equal(evidence.approvalEnvelopeEvidenceDigestSha256,envelope.approvalEvidence.evidenceDigestSha256);
assert.equal(evidence.runtimeEnforcementEvidenceBlobSha,'118ca5f948f93ca09c7a7305d1b230880fa98630');
assert.equal(runtimeEvidence.validation,'044 PASS');
assert.equal(runtimeEvidence.policyState.freshnessPolicyRowsPersisted,0);
assert.equal(evidence.boundaries.policyInsertAuthorized,true);
assert.equal(evidence.boundaries.activationInvocationLimit,1);

assert.equal(contract.authority.repositoryActivationApprovalAuthority,true);
assert.equal(contract.authority.activationApprovalMaterializationAuthority,true);
assert.equal(contract.authority.activationApprovalEvidenceAuthority,true);
assert.equal(contract.authority.successorCandidateAuthority,true);
['stagingMutationAuthority','activationInvocationAuthority','policyPersistenceAuthority','runtimeProjectionAuthority','runtimeSnapshotAuthority','snapshotPublicationAuthority','productionAuthority','mergeAuthority','readyForReviewAuthority']
  .forEach((key)=>assert.equal(contract.authority[key],false,'authority false: '+key));

[
  'private.validate_a09_funnel_activation_approval_v1',
  'private.activate_a09_funnel_policy_approved_v1',
  'private.validate_analytics_a09_funnel_freshness_policy_approval_envelop',
  'analytics_metric_freshness_policies_v1',
  'DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_AUTHORIZATION_MISMATCH',
  'DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_DIGEST_MISMATCH',
  'DOKE_ANALYTICS_A09_FUNNEL_FRESHNESS_POLICY_OVERLAP'
].forEach((fragment)=>assert(migration.includes(fragment),'migration missing '+fragment));
assert(!/insert\s+into\s+private\.analytics_metric_publication_policies_v1/i.test(migration));
assert(!/insert\s+into\s+private\.analytics_metric_snapshots_v1/i.test(migration));
assert(!/cron\.schedule/i.test(migration));
assert(migration.includes('from public,anon,authenticated,service_role'));
assert('activate_a09_funnel_policy_approved_v1'.length<=63);
assert('validate_a09_funnel_activation_approval_v1'.length<=63);

[
  'VALIDATION_045_VALIDATOR_MISSING',
  'VALIDATION_045_SUCCESSOR_MISSING',
  'VALIDATION_045_EXPECTED_HEAD_REJECTION',
  'VALIDATION_045_REPLAY_NOT_REJECTED',
  'VALIDATION_045_LEGACY_TOMBSTONE_BYPASS',
  'rollback;'
].forEach((fragment)=>assert(validation.includes(fragment),'validation missing '+fragment));

const ana=matrix.domains.find((domain)=>domain.id==='ANA-001');
assert(ana);
assert(ana.nextActions.some((action)=>action.includes('Apply the ANA-A07/A09 approved activation successor candidate in staging')));
[
  'reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json','scripts/lib/ana-a07-a09-funnel-freshness-policy-activation-approval.js','supabase/migrations/20260924144500_ana_a07_a09_funnel_policy_approved_activation.sql','supabase/tests/045_ana_a07_a09_funnel_policy_approved_activation_validation.sql','docs/ANA-A07-A09-FUNNEL-FRESHNESS-POLICY-ACTIVATION-APPROVAL.md','scripts/audit-ana-a07-a09-funnel-freshness-policy-activation-approval.js','scripts/test-ana-a07-a09-funnel-freshness-policy-activation-approval.js'
].forEach((file)=>assert(ana.requiredPaths.includes(file),'matrix missing '+file));
assert.equal(pkg.scripts['audit:ana-a07-a09-funnel-freshness-policy-activation-approval'],'node scripts/audit-ana-a07-a09-funnel-freshness-policy-activation-approval.js');
assert.equal(pkg.scripts['test:ana-a07-a09-funnel-freshness-policy-activation-approval'],'node scripts/test-ana-a07-a09-funnel-freshness-policy-activation-approval.js');
[
  'reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json','scripts/lib/ana-a07-a09-funnel-freshness-policy-activation-approval.js','supabase/migrations/20260924144500_ana_a07_a09_funnel_policy_approved_activation.sql','supabase/tests/045_ana_a07_a09_funnel_policy_approved_activation_validation.sql','docs/ANA-A07-A09-FUNNEL-FRESHNESS-POLICY-ACTIVATION-APPROVAL.md','scripts/audit-ana-a07-a09-funnel-freshness-policy-activation-approval.js','scripts/test-ana-a07-a09-funnel-freshness-policy-activation-approval.js',
  'npm run audit:ana-a07-a09-funnel-freshness-policy-activation-approval',
  'npm run test:ana-a07-a09-funnel-freshness-policy-activation-approval'
].forEach((fragment)=>assert(workflow.includes(fragment),'workflow missing '+fragment));
[
  'This lot is repository-only',
  'validation 045 executed in staging: **false**',
  'persistent freshness-policy rows: **0**'
].forEach((fragment)=>assert(doc.includes(fragment),'docs missing '+fragment));

console.log('ANA-A07/A09 activation approval + successor candidate audit passed.');
