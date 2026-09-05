#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const r = require('../backend/modules/communities/community-realtime-private-auth-r3c');

const reportPath = path.resolve(process.argv[2] || process.env.COM_B03C_R3C_REPORT_PATH || 'reports/generated/COM-B03C-R3C-REALTIME-MESSAGES-POLICY-CATALOG-STAGING.json');
assert.equal(fs.existsSync(reportPath), true, 'report required');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

assert.equal(report.validationId, r.REPORT_VALIDATION_ID);
assert.equal(report.contractId, r.CONTRACT_ID);
assert.equal(report.sanitized, true);
assert.equal(report.rawRemoteErrorExposed, false);
for (const key of ['remoteMutationExecuted','writeOperationsAttempted','realtimePolicyMutationExecuted','realtimeSubscriptionOpened','syntheticAuthIdentityCreated','syntheticDomainRowsCreated','communityPostsExecuted','channelMessagesExecuted','publicationMutationExecuted','runtimeDeployed','productionChanged','pullRequestMerged','realUserMutationExecuted']) assert.equal(report.effects?.[key], false, key);
assert.equal(report.authorization?.received, true);
assert.equal(report.authorization?.consumed, true);
assert.equal(report.authorization?.executionAttempted, true);
assert.equal(report.authorization?.singleUse, true);
assert.equal(report.authorization?.reusableAfterFailure, false);
assert.equal(report.authorization?.predecessorAuthorizationReusable, false);

if (report.status === 'staging_read_only_policy_catalog_observed_no_mutation_performed') {
  assert.equal(report.readOnlyProof?.transactionReadOnly, true); assert.equal(report.readOnlyProof?.queryKind, 'SELECT'); assert.equal(report.readOnlyProof?.writeOperationsAttempted, false);
  assert.equal(report.policyInventory?.source, 'pg_policies'); assert.equal(report.policyInventory?.schema, 'realtime'); assert.equal(report.policyInventory?.table, 'messages'); assert.deepEqual(report.policyInventory?.columns, [...r.REQUIRED_POLICY_COLUMNS]); assert.equal(report.policyInventory?.completeInventoryObserved, true); assert.equal(Array.isArray(report.policyInventory?.rows), true);
  for (const row of report.policyInventory.rows) for (const key of r.REQUIRED_POLICY_COLUMNS) assert.equal(Object.prototype.hasOwnProperty.call(row, key), true, `row.${key}`);
  assert.equal(typeof report.classification?.policyCount, 'number'); assert.equal(typeof report.classification?.authenticatedSelectPolicyCount, 'number'); assert.equal(typeof report.classification?.restrictiveAuthenticatedSelectPolicyCount, 'number'); assert.equal(report.classification?.exactRootCauseProven, false); assert.equal(report.conclusion?.exactRootCauseProven, false); assert.equal(report.conclusion?.runtimeChangeAuthorized, false); assert.equal(report.conclusion?.independentFollowupRequiredBeforeRuntimeChange, true);
  for (const key of ['stagingMutationAuthority','realtimePolicyMutationAuthority','realtimeSubscriptionAuthority','authIdentityLifecycleAuthority','domainMutationAuthority','publicationMutationAuthority','runtimeDeployAuthority','productionAuthority','pullRequestMergeAuthority']) assert.equal(report.authority?.[key], false, key);
} else {
  assert.equal(report.status, 'staging_read_only_policy_catalog_inspection_failed_sanitized'); assert.equal(report.error?.rawRemoteErrorExposed, false); assert.equal(report.conclusion?.exactRootCauseProven, false); assert.equal(report.conclusion?.runtimeChangeAuthorized, false);
}
console.log('COM-B03C-R3C sanitized staging evidence verified');
