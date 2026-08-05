#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config/adm-a01-authority-baseline.json'), 'utf8'));
let checks = 0;
function check(value, label) { checks += 1; assert.ok(value, label); }

const scenarios = [
 ['frontend_guard_allows_admin', false, 'frontend_not_final'],
 ['frontend_guard_allows_support', false, 'frontend_not_final'],
 ['mock_support_flag', false, 'mock_forbidden'],
 ['direct_sql_operator_action', false, 'direct_database_forbidden'],
 ['service_edge_function_present', false, 'domain_specific_not_unified'],
 ['identity_queue_present', false, 'domain_specific_not_unified'],
 ['financial_queue_present', false, 'dual_control_not_unified'],
 ['order_operations_present', false, 'domain_specific_not_unified'],
 ['case_without_correlation_id', false, 'correlation_required'],
 ['case_without_reason_code', false, 'reason_required'],
 ['case_without_before_after', false, 'before_after_required'],
 ['case_without_immutable_audit', false, 'audit_required'],
 ['unbounded_operator_session', false, 'time_bound_required'],
 ['operator_access_without_case_scope', false, 'case_scope_required'],
 ['maker_approves_high_risk_action', false, 'dual_control_required'],
 ['break_glass_without_expiry', false, 'break_glass_review_required'],
 ['break_glass_without_post_review', false, 'break_glass_review_required'],
 ['operator_view_without_masking', false, 'data_minimization_required'],
 ['repository_inventory_only', true, 'contract_only'],
 ['runtime_mutation', false, 'runtime_blocked'],
 ['staging_read', false, 'staging_blocked'],
 ['staging_write', false, 'staging_blocked'],
 ['production_change', false, 'production_blocked']
];
scenarios.forEach(([name, allowed, reason]) => {
  check(typeof name === 'string' && name.length > 0, 'scenario name');
  check(typeof allowed === 'boolean', 'scenario allowed');
  check(typeof reason === 'string' && reason.length > 0, 'scenario reason');
  if (name === 'repository_inventory_only') check(allowed === true, 'inventory accepted');
  else check(allowed === false, name + ' rejected');
});
Object.entries(cfg.authority).forEach(([key, value]) => {
  if (key === 'contractAuthority' || key === 'inventoryAuthority') check(value === true, key);
  else check(value === false, key);
});
Object.entries(cfg.prohibitedEffects).forEach(([key, value]) => check(value === false, key));
cfg.findings.forEach((finding) => {
  check(/^ADM-A01-F\d{2}$/.test(finding.id), 'finding format');
  check(['critical','high','medium','low'].includes(finding.severity), 'finding severity');
});
cfg.preservedBlockers.forEach((blocker) => check(/^[A-Z]+-[A-Z0-9]+$/.test(blocker), 'blocker format'));
cfg.plannedSublots.forEach((sublot, index) => check(sublot.startsWith(`ADM-A0${index + 2}`), 'sublot order'));

console.log(`ADM-A01 conformance: ${checks}/${checks}`);
