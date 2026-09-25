#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));

const contract=json('config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const approval=json('reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json');
const staging=json('reports/generated/ana-a07-a09-funnel-freshness-policy-approved-successor-staging-evidence.json');
const envelope=json('config/ana-a07-a09-funnel-freshness-policy-activation-envelope.json');
const matrix=json('config/domain-completion-matrix.json');
const migration=read('supabase/migrations/20260924144500_ana_a07_a09_funnel_policy_approved_activation.sql');
const validation=read('supabase/tests/045_ana_a07_a09_funnel_policy_approved_activation_validation.sql');
const doc=read('docs/ANA-A07-A09-FUNNEL-FRESHNESS-POLICY-ACTIVATION-APPROVAL.md');
const lib=require('./lib/ana-a07-a09-funnel-freshness-policy-activation-approval');

assert.equal(contract.status,'successor_staging_applied_validated_persistent_activation_unauthorized');
assert.equal(contract.repositoryActivationApproval.evidenceDigestSha256,approval.evidenceDigestSha256);
lib.validateCompletedActivationApprovalEvidence(approval,contract.repositoryActivationApproval.rawAuthorization);
assert.equal(approval.evidenceDigestSha256,'ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603');
assert.equal(approval.approvalEnvelopeEvidenceDigestSha256,envelope.approvalEvidence.evidenceDigestSha256);
assert.equal(approval.boundaries.policyInsertAuthorized,true);
assert.equal(approval.boundaries.activationInvocationLimit,1);

assert.equal(contract.successorCandidate.stagingApplied,true);
assert.equal(contract.successorCandidate.stagingMigrationVersion,'20260925112930');
assert.equal(contract.successorCandidate.validation045Status,'PASS');
assert.equal(contract.successorCandidate.stagingEvidenceBlobSha,'02a860c812eeb777519c7917bb5c31b3fb3dd5e2');
assert.equal(staging.validation,'045 PASS');
assert.equal(staging.persistentState.freshnessPolicyRowsPersisted,0);
assert.equal(staging.persistentState.activationInvoked,false);
assert.equal(staging.securityAdvisor.newFindingAttributedToSuccessorFunctions,false);

[
  'private.validate_a09_funnel_activation_approval_v1',
  'private.activate_a09_funnel_policy_approved_v1',
  'analytics_metric_freshness_policies_v1',
  'DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_AUTHORIZATION_MISMATCH',
  'DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_DIGEST_MISMATCH',
  'DOKE_ANALYTICS_A09_FUNNEL_FRESHNESS_POLICY_OVERLAP'
].forEach((fragment)=>assert(migration.includes(fragment),'migration missing '+fragment));
assert(!/insert\s+into\s+private\.analytics_metric_publication_policies_v1/i.test(migration));
assert(!/insert\s+into\s+private\.analytics_metric_snapshots_v1/i.test(migration));
assert(!/cron\.schedule/i.test(migration));

[
  'VALIDATION_045_VALIDATOR_MISSING',
  'VALIDATION_045_SUCCESSOR_MISSING',
  'VALIDATION_045_REPLAY_NOT_REJECTED',
  'VALIDATION_045_LEGACY_TOMBSTONE_BYPASS',
  'rollback;'
].forEach((fragment)=>assert(validation.includes(fragment),'validation missing '+fragment));

const ana=matrix.domains.find((domain)=>domain.id==='ANA-001');
assert(ana.nextActions.some((action)=>action.includes('Obtain the exact single-use ANA-A07/A09 persistent-activation staging authorization')));
assert(ana.requiredPaths.includes('reports/generated/ana-a07-a09-funnel-freshness-policy-approved-successor-staging-evidence.json'));

[
  'validation `045` passes in rollback-only mode',
  'persistent freshness-policy rows: **0**',
  'Persistent activation requires a new explicit single-use staging authorization'
].forEach((fragment)=>assert(doc.includes(fragment),'docs missing '+fragment));

console.log('ANA-A07/A09 activation approval + successor staging audit passed.');
