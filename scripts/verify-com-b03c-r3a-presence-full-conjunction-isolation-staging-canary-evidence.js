#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const r3a = require('../backend/modules/communities/community-realtime-private-auth-r3a');

function verifyEvidence(evidence) {
  assert.equal(evidence?.validationId, 'COM-B03C-R3A-PRESENCE-FULL-CONJUNCTION-ISOLATION-STAGING-ATTEMPT');
  assert.equal(evidence?.contractId, r3a.CONTRACT_ID);
  assert.equal(evidence?.sanitized, true);
  assert.equal(evidence?.rawRemoteErrorsPersisted, false);
  assert.deepEqual(evidence?.caseOrder, [...r3a.ISOLATION_CASES]);
  assert.equal(evidence?.sameContext?.sameAuthIdentityAcrossCases, true);
  assert.equal(evidence?.sameContext?.sameTopicAcrossCases, true);
  assert.equal(evidence?.sameContext?.freshRealtimeClientPerCase, true);
  assert.equal(evidence?.negativeControl?.passed, true);
  assert.equal(Array.isArray(evidence?.results), true);
  assert.equal(evidence.results.length, r3a.ISOLATION_CASES.length);
  for (const [index, caseId] of r3a.ISOLATION_CASES.entries()) {
    assert.equal(evidence.results[index]?.caseId, caseId);
    assert.equal(typeof evidence.results[index]?.joinAllowed, 'boolean');
    assert.equal(evidence.results[index]?.rawRemoteErrorExposed, false);
  }
  assert.equal(evidence?.cleanup?.temporaryPoliciesAfter, 0);
  assert.equal(evidence?.cleanup?.syntheticAuthAfter, 0);
  assert.equal(evidence?.cleanup?.syntheticDomainRowsAfter, 0);
  assert.equal(evidence?.cleanup?.zeroResidueProven, true);
  assert.equal(evidence?.effects?.communityPostsExecuted, false);
  assert.equal(evidence?.effects?.channelMessagesExecuted, false);
  assert.equal(evidence?.effects?.publicationMutationExecuted, false);
  assert.equal(evidence?.effects?.runtimeDeployed, false);
  assert.equal(evidence?.effects?.productionChanged, false);
  assert.equal(evidence?.effects?.pullRequestMerged, false);
  return true;
}

function main(argv = process.argv.slice(2)) {
  const file = argv[0];
  if (!file) throw new Error('DOKE_COM_B03C_R3A_EVIDENCE_PATH_REQUIRED');
  const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
  verifyEvidence(evidence);
  process.stdout.write('COM-B03C-R3A evidence verified\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(`${error.code || error.message || 'DOKE_COM_B03C_R3A_EVIDENCE_INVALID'}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({ verifyEvidence });
