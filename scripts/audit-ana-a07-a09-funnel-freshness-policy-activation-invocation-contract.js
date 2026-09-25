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
const staging=json('reports/generated/ana-a07-a09-funnel-freshness-policy-approved-successor-staging-evidence.json');
const matrix=json('config/domain-completion-matrix.json');
const doc=read('docs/ANA-A07-A09-FUNNEL-FRESHNESS-POLICY-ACTIVATION-INVOCATION-CONTRACT.md');

assert.equal(c.contractId,'ana-a07-a09-funnel-freshness-policy-activation-invocation-v1');
assert.equal(c.status,'successor_staging_applied_validated_persistent_activation_unauthorized');
assert.equal(c.createdAgainst.matrixVersion,'1.3.132');
assert.equal(c.fixedBindings.policySetId,'ana-a07-a09-funnel-v1-r1');
assert.equal(c.fixedBindings.metricCount,8);
assert.equal(c.fixedBindings.maxLagSeconds,360);
assert.equal(c.fixedBindings.effectiveFrom,'2026-09-24T14:00:00Z');
assert.equal(c.fixedBindings.effectiveUntil,null);

assert.equal(c.repositoryActivationApproval.evidenceDigestSha256,approval.evidenceDigestSha256);
assert.equal(c.repositoryActivationApproval.activationInvocationLimit,1);
assert.equal(c.successorCandidate.status,'staging_applied_validated_persistent_activation_unauthorized');
assert.equal(c.successorCandidate.stagingApplied,true);
assert.equal(c.successorCandidate.stagingMigrationVersion,'20260925112930');
assert.equal(c.successorCandidate.validation045Status,'PASS');
assert.equal(c.successorCandidate.stagingEvidencePath,'reports/generated/ana-a07-a09-funnel-freshness-policy-approved-successor-staging-evidence.json');
assert.equal(c.successorCandidate.stagingEvidenceBlobSha,'02a860c812eeb777519c7917bb5c31b3fb3dd5e2');
assert.equal(c.operationalState.successorInstalledInStaging,true);
assert.equal(c.operationalState.activationInvoked,false);
assert.equal(c.operationalState.policyRowsPersisted,0);

assert.equal(staging.validation,'045 PASS');
assert.equal(staging.validationMode,'rollback_only');
assert.equal(staging.stagingMigrationVersion,'20260925112930');
assert.equal(staging.runtime.validatorOwner,'postgres');
assert.equal(staging.runtime.activationFunctionOwner,'postgres');
assert.equal(staging.runtime.validatorSecurityDefiner,true);
assert.equal(staging.runtime.activationFunctionSecurityDefiner,true);
assert.equal(staging.runtime.validatorAnonExecute,false);
assert.equal(staging.runtime.validatorAuthenticatedExecute,false);
assert.equal(staging.runtime.validatorServiceRoleExecute,false);
assert.equal(staging.runtime.activationAnonExecute,false);
assert.equal(staging.runtime.activationAuthenticatedExecute,false);
assert.equal(staging.runtime.activationServiceRoleExecute,false);
assert.equal(staging.runtime.legacyActivationTombstoned,true);
assert.equal(staging.validationCoverage.transientEightRowActivationPassed,true);
assert.equal(staging.validationCoverage.replayRejectedByOverlap,true);
assert.equal(staging.validationCoverage.transactionRolledBack,true);
assert.equal(staging.persistentState.freshnessPolicyRowsPersisted,0);

assert.equal(c.authority.successorStagingAppliedAuthority,true);
['stagingMutationAuthority','activationInvocationAuthority','policyPersistenceAuthority','runtimeProjectionAuthority','runtimeSnapshotAuthority','snapshotPublicationAuthority','productionAuthority','mergeAuthority','readyForReviewAuthority']
  .forEach((key)=>assert.equal(c.authority[key],false,'authority false: '+key));

assert.equal(c.persistentActivationAuthorization.scope,'single_use_persistent_activation');
assert.equal(c.persistentActivationAuthorization.genericProceedIsAuthorization,false);
assert.equal(c.persistentActivationAuthorization.activationInvocationAuthorizedByCommand,true);
assert.equal(c.persistentActivationAuthorization.persistentPolicyWriteAuthorizedByCommand,true);
assert.equal(c.persistentActivationAuthorization.exactPolicyRows,8);
assert.equal(c.persistentActivationAuthorization.activationInvocationLimit,1);
assert.equal(c.persistentActivationAuthorization.snapshotPublicationAuthorizedByCommand,false);
assert.equal(c.persistentActivationAuthorization.cronAuthorizedByCommand,false);
assert(c.persistentActivationAuthorization.template.includes('head=<CURRENT_PR_HEAD>'));
assert(c.persistentActivationAuthorization.template.includes('successorStagingEvidenceBlobSha=02a860c812eeb777519c7917bb5c31b3fb3dd5e2'));

assert.equal(candidate.activationInvocationContract.status,c.status);
assert.equal(envelope.activationInvocationContract.status,c.status);
const ana=matrix.domains.find((domain)=>domain.id==='ANA-001');
assert(ana.nextActions.some((action)=>action.includes('Obtain the exact single-use ANA-A07/A09 persistent-activation staging authorization')));
assert(ana.requiredPaths.includes('reports/generated/ana-a07-a09-funnel-freshness-policy-approved-successor-staging-evidence.json'));

[
  'Successor staging closure',
  'Persistent policy rows remain `0`',
  'Next gate — single-use persistent activation',
  'Generic `prossiga` is not authorization'
].forEach((fragment)=>assert(doc.includes(fragment),'docs missing '+fragment));

console.log('ANA-A07/A09 activation-invocation lifecycle contract audit passed.');
