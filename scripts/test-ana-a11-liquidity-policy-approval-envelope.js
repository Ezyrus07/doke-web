#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');const c=require('./lib/ana-a11-liquidity-policy-approval-envelope');let passed=0;function ok(n,f){try{f();passed++;}catch(e){e.message=n+': '+e.message;throw e;}}function rejects(n,code,f){ok(n,()=>{let e=null;try{f();}catch(x){e=x;}assert(e);assert.equal(e.code,code);});}
const base={revision:1,authorizationDigestSha256:c.sha256('synthetic-explicit-authorization-for-conformance-only'),approvedAt:'2026-09-23T13:00:00.000Z',repositoryHead:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',matrixVersion:'1.3.132',windowStepSeconds:900,projectionDelaySloSeconds:75,windowAnchor:'2026-09-23T14:00:00.000Z',maxCatchUpWindowsPerInvocation:3,effectiveFrom:'2026-09-23T14:15:00.000Z',effectiveUntil:null};
const v=c.buildCompletedApprovalEvidence(base);
ok('valid',()=>{assert.equal(c.validateCompletedApprovalEvidence(v),v);assert.equal(v.policyIdentity.policyId,'ana-a11-liquidity-v1-r1');assert.equal(v.approvedParameters.derivedMaxLagSeconds,975);assert.equal(v.boundaries.schedulerActivationAuthorized,false);});
ok('digest deterministic',()=>{assert.equal(v.evidenceDigestSha256,c.evidenceDigest(v));assert.equal(c.stableStringify({b:1,a:2}),'{"a":2,"b":1}');});
rejects('revision','ANA_A11_APPROVAL_POLICY_ID_INVALID',()=>c.buildCompletedApprovalEvidence({...base,revision:2}));
rejects('auth digest','ANA_A11_APPROVAL_AUTHORIZATION_DIGEST_INVALID',()=>c.buildCompletedApprovalEvidence({...base,authorizationDigestSha256:'bad'}));
rejects('head','ANA_A11_APPROVAL_BINDING_INVALID',()=>c.buildCompletedApprovalEvidence({...base,repositoryHead:'abc'}));
rejects('matrix','ANA_A11_APPROVAL_BINDING_INVALID',()=>c.buildCompletedApprovalEvidence({...base,matrixVersion:'v1.3.132'}));
rejects('approval time','ANA_A11_APPROVAL_EFFECTIVE_WINDOW_INVALID',()=>c.buildCompletedApprovalEvidence({...base,effectiveFrom:'2026-09-23T12:45:00.000Z'}));
rejects('grid','ANA_A11_APPROVAL_GRID_INVALID',()=>c.buildCompletedApprovalEvidence({...base,effectiveFrom:'2026-09-23T14:14:00.000Z'}));
rejects('until','ANA_A11_APPROVAL_EFFECTIVE_WINDOW_INVALID',()=>c.buildCompletedApprovalEvidence({...base,effectiveUntil:'2026-09-24T14:15:00.000Z'}));
rejects('catchup','ANA_A11_APPROVAL_VALUES_INVALID',()=>c.buildCompletedApprovalEvidence({...base,maxCatchUpWindowsPerInvocation:0}));
rejects('derived','ANA_A11_APPROVAL_DERIVATION_MISMATCH',()=>{const x=JSON.parse(JSON.stringify(v));x.approvedParameters.derivedMaxLagSeconds++;x.evidenceDigestSha256=c.evidenceDigest(x);c.validateCompletedApprovalEvidence(x);});
rejects('policy id','ANA_A11_APPROVAL_POLICY_ID_INVALID',()=>{const x=JSON.parse(JSON.stringify(v));x.policyIdentity.policyId='custom';x.evidenceDigestSha256=c.evidenceDigest(x);c.validateCompletedApprovalEvidence(x);});
rejects('scheduler','ANA_A11_APPROVAL_BOUNDARY_INVALID',()=>{const x=JSON.parse(JSON.stringify(v));x.boundaries.schedulerActivationAuthorized=true;x.evidenceDigestSha256=c.evidenceDigest(x);c.validateCompletedApprovalEvidence(x);});
rejects('production','ANA_A11_APPROVAL_BOUNDARY_INVALID',()=>{const x=JSON.parse(JSON.stringify(v));x.boundaries.productionAuthorized=true;x.evidenceDigestSha256=c.evidenceDigest(x);c.validateCompletedApprovalEvidence(x);});
rejects('single use','ANA_A11_APPROVAL_BOUNDARY_INVALID',()=>{const x=JSON.parse(JSON.stringify(v));x.boundaries.activationInvocationLimit=2;x.evidenceDigestSha256=c.evidenceDigest(x);c.validateCompletedApprovalEvidence(x);});
rejects('extra field','ANA_A11_APPROVAL_SCHEMA_INVALID',()=>c.validateCompletedApprovalEvidence({...v,extraAuthority:true}));
rejects('digest tamper','ANA_A11_APPROVAL_EVIDENCE_DIGEST_INVALID',()=>{const x=JSON.parse(JSON.stringify(v));x.evidenceDigestSha256='0'.repeat(64);c.validateCompletedApprovalEvidence(x);});
assert.equal(passed,17);console.log('ANA-A11 liquidity policy approval envelope conformance passed: 17/17.');
