#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));

const envelope=json('config/ana-a07-a09-funnel-freshness-policy-activation-envelope.json');
const candidate=json('config/ana-a07-a09-funnel-freshness-policy-candidate.json');
const matrix=json('config/domain-completion-matrix.json');
const pkg=json('package.json');
const workflow=read('.github/workflows/ana-a07-a09-funnel-freshness-policy-activation-envelope.yml');
const migration=read('supabase/migrations/20260924004500_ana_a07_a09_funnel_freshness_policy_activation.sql');
const doc=read('docs/ANA-A07-A09-FUNNEL-FRESHNESS-POLICY-ACTIVATION-ENVELOPE.md');
const lib=require('./lib/ana-a07-a09-funnel-freshness-policy-activation-envelope');
const runtimeEnforcementMigration=read('supabase/migrations/20260924140000_ana_a07_a09_funnel_policy_approval_runtime_enforcement.sql');
const runtimeEnforcementValidation=read('supabase/tests/044_ana_a07_a09_funnel_policy_approval_runtime_enforcement_validation.sql');
const runtimeEvidence=json('reports/generated/ana-a07-a09-funnel-freshness-policy-runtime-enforcement-staging-evidence.json');

assert.equal(envelope.contractId,lib.CONTRACT_ID);
assert.equal(envelope.approvalEvidenceSchemaId,lib.SCHEMA_ID);
assert.equal(envelope.createdAgainst.repositoryHead,'0c45856b82b08fe5265c3e71b40c0d83fed871a7');
assert.equal(envelope.createdAgainst.matrixVersion,'1.3.132');
assert.equal(envelope.createdAgainst.authorization,'authorize-ana-a07-a09-funnel-freshness-policy-activation-envelope-repository-only head=0c45856b82b08fe5265c3e71b40c0d83fed871a7 matrix=v1.3.132 policySetId=ana-a07-a09-funnel-v1-r1 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null');
assert.equal(envelope.authorization.digestSha256,lib.sha256(envelope.authorization.rawCommand));
assert.equal(envelope.authorization.digestSha256,'4a96845c66599a0092e34d0bf02c41684c8eaccf8768c403b648159bc53ddc2a');
assert.equal(envelope.status,'effective_window_approved_runtime_enforcement_staging_validated_activation_uninvoked');

lib.validateCompletedApprovalEvidence(envelope.approvalEvidence);
assert.equal(envelope.approvalEvidence.evidenceDigestSha256,'9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5');
assert.equal(envelope.policySet.policySetId,'ana-a07-a09-funnel-v1-r1');
assert.equal(envelope.policySet.metricCount,8);
assert.equal(envelope.policySet.maxLagSeconds,360);
assert.equal(envelope.policySet.approvedEffectiveFrom,'2026-09-24T14:00:00Z');
assert.equal(envelope.policySet.approvedEffectiveUntil,null);
assert.equal(envelope.policySet.runtimeActivationState,'not_active');
assert.equal(envelope.policySet.runtimePolicyRowsPersisted,0);

assert.equal(envelope.authority.repositoryContractAuthority,true);
assert.equal(envelope.authority.completedApprovalEvidenceAuthority,true);
assert.equal(envelope.authority.effectiveWindowSelectionAuthority,true);
[
  'activationInvocationAuthority','policyPersistenceAuthority','runtimeProjectionAuthority',
  'runtimeSnapshotAuthority','snapshotPublicationAuthority','cronOrSchedulerAuthority','stagingMutationAuthority',
  'productionAuthority','mergeAuthority','readyForReviewAuthority'
].forEach((key)=>assert.equal(envelope.authority[key],false,'authority false: '+key));
Object.entries(envelope.prohibitedEffects).forEach(([key,value])=>assert.equal(value,false,'effect false: '+key));

assert.equal(envelope.runtimeBoundary.currentActivationFunction,'private.activate_analytics_a09_funnel_freshness_policy_v1');
assert.equal(envelope.runtimeBoundary.currentActivationBehavior,'fail_closed_tombstone');
assert.equal(envelope.runtimeBoundary.legacyActivationTombstoned,true);
assert.equal(envelope.runtimeBoundary.activationCapableSuccessorPresent,false);
assert.equal(envelope.runtimeBoundary.validatorApprovalEvidenceArgumentPresent,true);
assert.equal(envelope.runtimeBoundary.runtimeEnforcementAuthority,true);
assert.equal(envelope.authority.runtimeEnvelopeEnforcementAuthority,true);
assert(migration.includes('private.activate_analytics_a09_funnel_freshness_policy_v1'));
assert(!migration.includes('p_approval_evidence'));
assert(!migration.includes('authorizationDigestSha256'));
assert(!migration.includes('evidenceDigestSha256'));

assert.equal(candidate.activationEnvelope.contractPath,'config/ana-a07-a09-funnel-freshness-policy-activation-envelope.json');
assert.equal(candidate.activationEnvelope.evidenceDigestSha256,'9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5');
assert.equal(candidate.activationEnvelope.approvedEffectiveFrom,'2026-09-24T14:00:00Z');
assert.equal(candidate.activationEnvelope.approvedEffectiveUntil,null);
assert.equal(candidate.activationEnvelope.runtimeEnforcementAuthority,true);
assert.equal(candidate.authorization.policyActivationAuthorized,false);
assert.equal(candidate.runtimeCandidate.activationInvoked,false);
assert.equal(candidate.runtimeCandidate.policyRowsPersisted,0);
assert.equal(candidate.policySet.effectiveFrom,null);
assert.equal(candidate.policySet.effectiveUntil,null);

const ana=matrix.domains.find((domain)=>domain.id==='ANA-001');
assert(ana);
[
  'config/ana-a07-a09-funnel-freshness-policy-activation-envelope.json',
  'scripts/lib/ana-a07-a09-funnel-freshness-policy-activation-envelope.js',
  'scripts/audit-ana-a07-a09-funnel-freshness-policy-activation-envelope.js',
  'scripts/test-ana-a07-a09-funnel-freshness-policy-activation-envelope.js',
  'docs/ANA-A07-A09-FUNNEL-FRESHNESS-POLICY-ACTIVATION-ENVELOPE.md',
  '.github/workflows/ana-a07-a09-funnel-freshness-policy-activation-envelope.yml'
].forEach((file)=>assert(ana.requiredPaths.includes(file),'matrix missing '+file));
assert(ana.nextActions.some((action)=>action.includes('Obtain explicit ANA-A07/A09 activation authorization')));

assert.equal(pkg.scripts['audit:ana-a07-a09-funnel-freshness-policy-activation-envelope'],'node scripts/audit-ana-a07-a09-funnel-freshness-policy-activation-envelope.js');
assert.equal(pkg.scripts['test:ana-a07-a09-funnel-freshness-policy-activation-envelope'],'node scripts/test-ana-a07-a09-funnel-freshness-policy-activation-envelope.js');

[
  'npm run audit:ana-a07-a09-funnel-freshness-policy-activation-envelope',
  'npm run test:ana-a07-a09-funnel-freshness-policy-activation-envelope',
  'npm run audit:domain-completion-matrix',
  'npm run audit:agent-governance',
  'git diff --check'
].forEach((fragment)=>assert(workflow.includes(fragment),'workflow missing '+fragment));
assert(workflow.includes('permissions:\n  contents: read'));
['contents: write','pull-requests: write','git push','psql ','supabase db','cron.schedule(']
  .forEach((fragment)=>assert(!workflow.includes(fragment),'workflow capability forbidden '+fragment));

[
  'repository approval envelope',
  '2026-09-24T14:00:00Z',
  'runtime enforcement — staging validated',
  'persisted funnel policy rows: `0`',
  'activation itself is still unauthorized'
].forEach((fragment)=>assert(doc.toLowerCase().includes(fragment.toLowerCase()),'docs missing '+fragment));


assert.equal(envelope.runtimeEnforcementCandidate.createsActivationCapableSuccessor,false);

[
  'private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1',
  'private.canonicalize_analytics_json_v1',
  'DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_ENVELOPE_REQUIRED',
  'DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_BINDING_MISMATCH',
  'DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_AUTHORIZATION_MISMATCH',
  'DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_POLICY_SET_MISMATCH',
  'DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_BOUNDARY_INVALID',
  'DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_DIGEST_MISMATCH'
].forEach((fragment)=>assert(runtimeEnforcementMigration.includes(fragment),'runtime enforcement candidate missing '+fragment));
assert(!/insert\s+into\s+private\.analytics_metric_freshness_policies_v1/i.test(runtimeEnforcementMigration));
assert(!/insert\s+into\s+private\.analytics_metric_snapshots_v1/i.test(runtimeEnforcementMigration));
assert(!/cron\.schedule/i.test(runtimeEnforcementMigration));
assert(!runtimeEnforcementMigration.includes('activate_analytics_a09_funnel_freshness_policy_approved_v1'));

[
  'VALIDATION_044_VALIDATOR_MISSING',
  'has_function_privilege',
  'DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_ENVELOPE_REQUIRED',
  'rollback;'
].forEach((fragment)=>assert(runtimeEnforcementValidation.includes(fragment),'validation 044 missing '+fragment));


assert.equal(envelope.runtimeEnforcementCandidate.status,'staging_applied_validated_activation_unauthorized');
assert.equal(envelope.runtimeEnforcementCandidate.stagingApplied,true);
assert.equal(envelope.runtimeEnforcementCandidate.validation044Passed,true);
assert.equal(envelope.runtimeEnforcementCandidate.runtimeEnforcementAuthority,true);
assert.equal(envelope.runtimeEnforcementCandidate.legacyActivationTombstoned,true);
assert.equal(envelope.authority.runtimeEnforcementAppliedAuthority,true);
assert.equal(envelope.authority.activationInvocationAuthority,false);
assert.equal(envelope.authority.policyPersistenceAuthority,false);
assert.equal(runtimeEvidence.stagingMigrationVersion,'20260924141356');
assert.equal(runtimeEvidence.validation,'044 PASS');
assert.equal(runtimeEvidence.runtime.validatorOwner,'postgres');
assert.equal(runtimeEvidence.runtime.validatorSecurityDefiner,true);
assert.equal(runtimeEvidence.runtime.validatorAnonExecute,false);
assert.equal(runtimeEvidence.runtime.validatorAuthenticatedExecute,false);
assert.equal(runtimeEvidence.runtime.validatorServiceRoleExecute,false);
assert.equal(runtimeEvidence.runtime.legacyActivationTombstoned,true);
assert.equal(runtimeEvidence.policyState.freshnessPolicyRowsPersisted,0);
assert.equal(runtimeEvidence.policyState.activationInvoked,false);
assert.equal(runtimeEvidence.runtime.postgresIdentifierTruncationObserved,true);
assert.equal(candidate.runtimeEnforcementCandidate.stagingApplied,true);
assert.equal(candidate.runtimeEnforcementCandidate.validation044Passed,true);
assert.equal(candidate.runtimeEnforcementCandidate.runtimeEnforcementAuthority,true);

console.log('ANA-A07/A09 funnel freshness activation envelope audit passed.');
