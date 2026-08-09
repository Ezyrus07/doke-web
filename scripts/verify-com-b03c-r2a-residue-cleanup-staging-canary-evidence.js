#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const REPORT=path.resolve(process.env.COM_B03C_R2A_REPORT_PATH||'reports/generated/COM-B03C-R2A-STAGING-RESIDUE-CLEANUP.json');
const fail=(c)=>{throw new Error(c);};
if(!fs.existsSync(REPORT))fail('DOKE_COM_B03C_R2A_REPORT_MISSING');
const r=JSON.parse(fs.readFileSync(REPORT,'utf8'));
if(r.validationId!=='COM-B03C-R2A-STAGING-RESIDUE-CLEANUP')fail('DOKE_COM_B03C_R2A_VALIDATION_ID_MISMATCH');
if(!['staging_r2_residue_cleanup_proven','staging_r2_residue_cleanup_recovered_after_initial_failure'].includes(r.status))fail('DOKE_COM_B03C_R2A_CLEANUP_NOT_PROVEN');
if(r.authorization?.consumed!==true||r.authorization?.singleUse!==true||r.authorization?.reusableAfterFailure!==false)fail('DOKE_COM_B03C_R2A_AUTH_EVIDENCE_INVALID');
if(r.cleanup?.zeroResidueProven!==true||r.cleanup?.policyResidueAfter!==0||r.cleanup?.syntheticAuthResidueAfter!==0||r.cleanup?.syntheticDbRowsAfter!==0)fail('DOKE_COM_B03C_R2A_ZERO_RESIDUE_INVALID');
for(const k of ['realtimePoliciesCreated','realtimeChannelsOpened','predicateLadderRerun','communityPostsReexecuted','channelMessagesExecuted','publicationMutationExecuted','runtimeDeployed','productionChanged','pullRequestMerged','realUserMutationExecuted'])if(r.effects?.[k]!==false)fail(`DOKE_COM_B03C_R2A_PROHIBITED_EFFECT_${k}`);
if(r.status==='staging_r2_residue_cleanup_recovered_after_initial_failure'){
  if(r.failure?.rawRemoteErrorExposed!==false)fail('DOKE_COM_B03C_R2A_RAW_ERROR_EXPOSURE');
}else if(r.inspection?.rawIdentifiersExposed!==false){
  fail('DOKE_COM_B03C_R2A_RAW_IDENTIFIER_EXPOSURE');
}
console.log('COM-B03C-R2A staging residue cleanup evidence verified');
