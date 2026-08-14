#!/usr/bin/env node
'use strict';
const r5d=require('../backend/modules/communities/community-realtime-private-auth-r5d');
const config=require('../config/com-b03c-r5d-corrected-terminal-observation-execution-envelope-readiness.json');
const receipt=require('../config/com-b03c-r5b-r5a-fresh-authorization-consumption.json');
function fail(code){const e=new Error(code);e.code=code;throw e;}
function main(){
 const result=r5d.evaluateRepositoryReadiness({...config.readinessInput,authorizationReceipt:receipt});
 if(result.decision!==r5d.STATUS||result.executionEnvelopeReady!==true)fail('DOKE_COM_B03C_R5D_READINESS_FAILED');
 if(r5d.assertFrozenReceipt(receipt)!==true)fail('DOKE_COM_B03C_R5D_CANONICAL_RECEIPT_VALIDATION_FAILED');
 const tamperedReceipt={...receipt,authorizationReceiptId:'0'.repeat(64)};
 if(r5d.assertFrozenReceipt(tamperedReceipt)!==false)fail('DOKE_COM_B03C_R5D_TAMPERED_RECEIPT_NOT_REJECTED');
 if(result.r5cCertifiedHead!==r5d.R5C_CERTIFIED_HEAD||result.authorizationReceiptId!==r5d.AUTHORIZATION_RECEIPT_ID||result.authorizationReceiptBlob!==r5d.AUTHORIZATION_RECEIPT_BLOB||result.correctedBridgeBlob!==r5d.CORRECTED_BRIDGE_BLOB||result.correctedBridgeSemanticsFingerprint!==r5d.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT||result.authorizationConsumed!==true||result.authorizationReusable!==false||result.executionAttempted!==false||result.futureTriggerExists!==false)fail('DOKE_COM_B03C_R5D_FROZEN_BINDING_CONTINUITY_FAILED');
 for(const field of ['triggerCreationAuthority','remoteExecutionAuthority','remoteCredentialReadAuthority','remoteDependencyLoadAuthority','networkAuthority','stagingReadAuthority','stagingMutationAuthority','realtimeSubscriptionAuthority','authIdentityLifecycleAuthority','runtimeChangeAuthority','productionAuthority','pullRequestMergeAuthority'])if(result[field]!==false)fail(`DOKE_COM_B03C_R5D_REMOTE_AUTHORITY_PRESENT_${field.toUpperCase()}`);
 const workflowInstallHead='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
 const trigger=r5d.buildFutureTriggerDescriptor({workflowInstallHead,nonce:'r5d_repository_trigger_contract'});
 const continuity=r5d.validateFutureTriggerCommit({trigger,parentHead:workflowInstallHead,changedFiles:[r5d.FUTURE_TRIGGER_PATH],runAttempt:1,authorizationReceipt:receipt});
 if(continuity.decision!=='r5d_future_trigger_continuity_valid_repository_only'||continuity.triggerContinuityValid!==true||continuity.remoteExecutionAuthority!==false)fail('DOKE_COM_B03C_R5D_FUTURE_TRIGGER_CONTINUITY_CONTRACT_FAILED');
 if(r5d.validateFutureTriggerCommit({trigger,parentHead:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',changedFiles:[r5d.FUTURE_TRIGGER_PATH],runAttempt:1,authorizationReceipt:receipt}).reason!=='R5D_TRIGGER_PARENT_CONTINUITY_REQUIRED')fail('DOKE_COM_B03C_R5D_WRONG_PARENT_NOT_REJECTED');
 if(r5d.validateFutureTriggerCommit({trigger,parentHead:workflowInstallHead,changedFiles:[r5d.FUTURE_TRIGGER_PATH],runAttempt:2,authorizationReceipt:receipt}).reason!=='R5D_SINGLE_USE_RUN_ATTEMPT_REQUIRED')fail('DOKE_COM_B03C_R5D_RUN_ATTEMPT_REUSE_NOT_REJECTED');
 if(r5d.validateFutureTriggerCommit({trigger,parentHead:workflowInstallHead,changedFiles:[r5d.FUTURE_TRIGGER_PATH,'unexpected-file.txt'],runAttempt:1,authorizationReceipt:receipt}).reason!=='R5D_EXACT_SINGLE_FILE_TRIGGER_REQUIRED')fail('DOKE_COM_B03C_R5D_MULTIFILE_TRIGGER_NOT_REJECTED');
 let blocked=false;try{r5d.assertRemoteExecutionBoundaryAbsent();}catch(error){blocked=error?.code===r5d.REMOTE_EXECUTION_BLOCK_CODE;}if(!blocked)fail('DOKE_COM_B03C_R5D_REMOTE_HARD_BLOCK_FAILED');
 process.stdout.write(`${JSON.stringify({validationId:r5d.VALIDATION_ID,contractId:r5d.CONTRACT_ID,status:r5d.STATUS,r5cCertifiedHead:r5d.R5C_CERTIFIED_HEAD,authorizationReceiptId:r5d.AUTHORIZATION_RECEIPT_ID,correctedBridgeBlob:r5d.CORRECTED_BRIDGE_BLOB,correctedBridgeSemanticsFingerprint:r5d.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,executionEnvelopeReady:true,futureTriggerContractVerified:true,receiptTamperRejectionVerified:true,triggerCreated:false,remoteExecutionAuthority:false,stagingAccess:false,networkAccess:false,rawRemoteErrorExposed:false,exactRootCauseProven:false,causalPromotionAllowed:false})}\n`);
}
try{main();}catch(error){process.stderr.write(`${String(error?.code||error?.message||'DOKE_COM_B03C_R5D_TEST_FAILURE')}\n`);process.exitCode=1;}
