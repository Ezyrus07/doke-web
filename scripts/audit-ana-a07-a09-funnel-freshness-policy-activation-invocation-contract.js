#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));

const c=json('config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const envelope=json('config/ana-a07-a09-funnel-freshness-policy-activation-envelope.json');
const candidate=json('config/ana-a07-a09-funnel-freshness-policy-candidate.json');
const approval=json('reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json');
const runtime=json('reports/generated/ana-a07-a09-funnel-freshness-policy-runtime-enforcement-staging-evidence.json');
const matrix=json('config/domain-completion-matrix.json');
const doc=read('docs/ANA-A07-A09-FUNNEL-FRESHNESS-POLICY-ACTIVATION-INVOCATION-CONTRACT.md');

assert.equal(c.contractId,'ana-a07-a09-funnel-freshness-policy-activation-invocation-v1');
assert.equal(c.status,'activation_approval_materialized_successor_candidate_ready_staging_unauthorized');
assert.equal(c.createdAgainst.matrixVersion,'1.3.132');
assert.equal(c.fixedBindings.policySetId,'ana-a07-a09-funnel-v1-r1');
assert.equal(c.fixedBindings.metricCount,8);
assert.equal(c.fixedBindings.maxLagSeconds,360);
assert.equal(c.fixedBindings.effectiveFrom,'2026-09-24T14:00:00Z');
assert.equal(c.fixedBindings.effectiveUntil,null);
assert.equal(c.fixedBindings.approvalEnvelopeEvidenceDigestSha256,envelope.approvalEvidence.evidenceDigestSha256);
assert.equal(c.fixedBindings.runtimeEnforcementEvidenceBlobSha,'118ca5f948f93ca09c7a7305d1b230880fa98630');
assert.equal(runtime.validation,'044 PASS');
assert.equal(runtime.policyState.freshnessPolicyRowsPersisted,0);

assert.equal(c.repositoryActivationApproval.authorizationReceived,true);
assert.equal(c.repositoryActivationApproval.authorizationConsumedForRepositoryArtifacts,true);
assert.equal(c.repositoryActivationApproval.authorizationDigestSha256,approval.authorizationDigestSha256);
assert.equal(c.repositoryActivationApproval.evidenceDigestSha256,approval.evidenceDigestSha256);
assert.equal(c.repositoryActivationApproval.policyInsertApprovedForFutureInvocation,true);
assert.equal(c.repositoryActivationApproval.activationInvocationLimit,1);
assert.equal(c.repositoryActivationApproval.stagingMutationAuthorized,false);
assert.equal(c.repositoryActivationApproval.activationInvocationAuthorized,false);
assert.equal(c.repositoryActivationApproval.persistentPolicyWriteAuthorizedNow,false);

assert.equal(c.successorRequirements.createdInThisLot,true);
assert.equal(c.successorRequirements.canonicalFunctionName,'private.activate_a09_funnel_policy_approved_v1');
assert.equal(c.successorCandidate.status,'repository_ready_staging_unauthorized');
assert.equal(c.successorCandidate.stagingApplied,false);
assert.equal(c.successorCandidate.validation045Status,'NOT_RUN_STAGING');
assert.equal(c.successorCandidate.createsRowsWhenApplied,false);
assert.equal(c.successorCandidate.canPersistRowsOnlyWhenLaterInvoked,true);
assert.equal(c.successorCandidate.exactPolicyInsertCardinality,8);
assert.equal(c.operationalState.successorInstalledInStaging,false);
assert.equal(c.operationalState.activationInvoked,false);
assert.equal(c.operationalState.policyRowsPersisted,0);

['repositoryContractAuthority','repositoryActivationApprovalAuthority','activationApprovalMaterializationAuthority','activationApprovalEvidenceAuthority','successorCandidateAuthority']
  .forEach((key)=>assert.equal(c.authority[key],true,'authority true: '+key));
['stagingMutationAuthority','activationInvocationAuthority','policyPersistenceAuthority','runtimeProjectionAuthority','runtimeSnapshotAuthority','snapshotPublicationAuthority','productionAuthority','mergeAuthority','readyForReviewAuthority']
  .forEach((key)=>assert.equal(c.authority[key],false,'authority false: '+key));

assert.equal(candidate.activationInvocationContract.status,c.status);
assert.equal(envelope.activationInvocationContract.status,c.status);
const ana=matrix.domains.find((domain)=>domain.id==='ANA-001');
assert(ana.nextActions.some((action)=>action.includes('Apply the ANA-A07/A09 approved activation successor candidate in staging')));

[
  'Completed repository-only activation approval',
  'Successor repository candidate',
  'Persistent policy rows remain `0`',
  'Persistent activation remains a later, separate single-use authorization'
].forEach((fragment)=>assert(doc.includes(fragment),'docs missing '+fragment));

console.log('ANA-A07/A09 activation-invocation lifecycle contract audit passed.');
