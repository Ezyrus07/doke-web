'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const c=JSON.parse(fs.readFileSync(path.join(root,'config/ana-a09-funnel-publication-policy-approval-activation-candidate.json'),'utf8'));
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260929133000_ana_a09_funnel_publication_policy_approval_activation_candidate.sql'),'utf8');
const validation=fs.readFileSync(path.join(root,'supabase/tests/055_ana_a09_funnel_publication_policy_approval_activation_candidate_validation.sql'),'utf8');
const e=JSON.parse(fs.readFileSync(path.join(root,'reports/generated/ana-a09-funnel-publication-policy-approval-activation-staging-evidence.json'),'utf8'));
const temporal=JSON.parse(fs.readFileSync(path.join(root,'config/ana-a09-funnel-publication-policy-temporal-activation-approval-candidate.json'),'utf8'));
const checks=[];const check=(n,x)=>checks.push({name:n,passed:Boolean(x)});

check('staging validation reconciled',c.status==='staging_structure_applied_validation_055_pass_evidence_reconciled_pending_exact_head_certification'&&c.prohibitedEffects.migrationAppliedToStaging===true&&c.prohibitedEffects.validation055ExecutedInStaging===true&&c.prohibitedEffects.publicationPolicyRowsPersisted===false);
check('publication math',c.policySet.windowStepSeconds===300&&c.policySet.projectionDelaySloSeconds===60&&c.policySet.derivedMaxLagSeconds===360&&c.policySet.windowStepSeconds+c.policySet.projectionDelaySloSeconds===c.policySet.derivedMaxLagSeconds);
check('bounded catch up',c.policySet.maxCatchUpWindowsPerInvocation===3);
check('temporal values deferred',c.policySet.windowAnchor===null&&c.policySet.effectiveFrom===null&&c.approvalContract.futureAuthorizationMustSpecifyWindowAnchor===true&&c.approvalContract.futureAuthorizationMustSpecifyEffectiveFrom===true);
check('exact policy set',c.policySet.policies.length===8&&new Set(c.policySet.policies.map(x=>x.policyId)).size===8&&new Set(c.policySet.policies.map(x=>x.metricKey)).size===8);
check('same policy identities as freshness',c.candidate.reusesExistingFreshnessPolicyIds===true&&c.candidate.exactFreshnessAuthorityRequiredAtEffectiveFrom===true);
check('single-use future activation',c.approvalContract.activationInvocationLimit===1&&c.candidate.replayRejectedByOverlap===true);
check('no scheduler or snapshot authority',c.authorization.snapshotMutationAuthority===false&&c.authorization.runtimeSnapshotAuthority===false&&c.authorization.snapshotPublicationAuthority===false&&c.authorization.schedulerAuthority===false);
check('candidate has no scheduler implementation',!migration.includes('cron.schedule(')&&!migration.includes('append_analytics_metric_snapshot_v1('));
check('validation rollback and transient only',validation.trim().endsWith('rollback;')&&validation.includes('v_funnel_transient<>8')&&c.validation055.expectedPersistentPublicationPolicyDelta===0);
check('next gate temporal approval only',c.nextGate.includes('temporal activation approval envelope')&&c.nextGate.includes('windowAnchor')&&c.nextGate.includes('effectiveFrom'));


check('validation055 evidence pass',e.validation055.status==='PASS'&&e.validation055.transientPublicationPolicyRows===8&&e.validation055.persistentPublicationPolicyRows===0&&e.migration.appliedStagingVersion==='20260929140910');
check('persistent state unchanged',e.postflight.a11PublicationPolicyCount===1&&e.postflight.activeFreshnessPolicyCount===8&&e.postflight.funnelPublicationPolicyCount===0&&e.postflight.funnelCronCount===0&&e.postflight.a09SnapshotCount===8);
check('zero persistent deltas',e.postflight.persistentPublicationPolicyDelta===0&&e.postflight.snapshotWriteCount===0&&e.postflight.schedulerCreateCount===0);
check('candidate functions installed closed',e.postflight.candidateFunctionCount===2&&e.postflight.anonExecute===false&&e.postflight.authenticatedExecute===false&&e.postflight.serviceRoleExecute===false);
check('real temporal values still deferred',e.invariants.windowAnchorSelected===false&&e.invariants.effectiveFromSelected===false&&c.policySet.windowAnchor===null&&c.policySet.effectiveFrom===null);
check('evidence binding exact',e.reconciliation.authorizationDigestSha256==='826302df8b55aebe378f1823396bee11b7d7dacfb0c369e780cabb8b59a347fd'&&c.stagingApprovalActivationEvidence.evidenceBlobSha==='f5ca619644611251e28705591774b2c5a90f64c8');

check('temporal selection exact',temporal.temporalSelection.windowAnchor==='1970-01-01T00:00:00Z'&&temporal.temporalSelection.effectiveFrom==='2026-10-01T00:00:00Z'&&temporal.temporalSelection.effectiveUntil===null&&temporal.temporalSelection.gridAligned===true);
check('temporal policy math unchanged',temporal.policySet.metricCount===8&&temporal.policySet.windowStepSeconds===300&&temporal.policySet.projectionDelaySloSeconds===60&&temporal.policySet.derivedMaxLagSeconds===360&&temporal.policySet.maxCatchUpWindowsPerInvocation===3);
check('temporal no approval evidence generated',temporal.activationEvidence.generated===false&&temporal.activationEvidence.authorizationCommand===null&&temporal.activationEvidence.authorizationDigestSha256===null&&temporal.activationEvidence.approvedAt===null&&temporal.activationEvidence.evidenceDigestSha256===null);
check('temporal activation unauthorized',temporal.authorization.publicationPolicyPersistenceAuthority===false&&temporal.authorization.activationInvocationAuthority===false&&temporal.authorization.stagingAuthority===false);
check('temporal runtime boundaries closed',temporal.authorization.snapshotMutationAuthority===false&&temporal.authorization.runtimeSnapshotAuthority===false&&temporal.authorization.snapshotPublicationAuthority===false&&temporal.authorization.schedulerAuthority===false);
check('temporal deadline explicit',temporal.temporalSelection.activationApprovalDeadline==='2026-10-01T00:00:00Z'&&temporal.nextActivationAuthorizationRequirements.approvedAtMustBeNoLaterThanEffectiveFrom===true);
check('temporal staging proof unchanged',temporal.stagingReadOnlyProof.a11PublicationPolicyCount===1&&temporal.stagingReadOnlyProof.a11SchedulerCount===1&&temporal.stagingReadOnlyProof.funnelPublicationPolicyCount===0&&temporal.stagingReadOnlyProof.funnelCronCount===0&&temporal.stagingReadOnlyProof.a09SnapshotCount===8);
const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;
