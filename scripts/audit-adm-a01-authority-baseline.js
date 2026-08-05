#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = process.cwd();
let checks = 0;
function check(value, label) { checks += 1; assert.ok(value, label); }
function read(rel) {
  const full = path.join(root, rel);
  check(fs.existsSync(full), rel + ' exists');
  return fs.readFileSync(full, 'utf8');
}

const cfg = JSON.parse(read('config/adm-a01-authority-baseline.json'));
const doc = read('docs/ADM-A01-AUTHORITY-BASELINE.md');
const workflow = read('.github/workflows/adm-a01-authority-baseline.yml');
const access = read('assets/js/services/admin-access-service.js');
const admin = read('assets/js/pages/admin.js');
const moderation = read('assets/js/repositories/service-moderation-repository.js');
const html = read('admin.html');

check(cfg.contractId === 'adm-a01-authority-baseline-v1', 'contract id');
check(cfg.domain === 'ADM-001', 'domain');
check(cfg.scope === 'repository_only', 'repository only');
check(cfg.status === 'baseline_complete_runtime_blocked', 'status');
check(cfg.sourceHead === '140e477f06b73d97b7529c47e29a58571fbb915e', 'source head');
check(Array.isArray(cfg.adminPages) && cfg.adminPages.length === 4, 'admin pages');
cfg.adminPages.forEach((item) => check(/\.html$/.test(item), 'admin page html ' + item));
check(Array.isArray(cfg.operatorRolesObserved) && cfg.operatorRolesObserved.join(',') === 'admin,support,moderator', 'roles');
check(Array.isArray(cfg.authoritySources) && cfg.authoritySources.length === 6, 'authority sources');
cfg.authoritySources.forEach((source) => {
  check(Boolean(source.id), 'source id');
  check(Boolean(source.surface), 'source surface');
  check(Boolean(source.authority), 'source authority');
});
check(Array.isArray(cfg.findings) && cfg.findings.length === 12, 'findings');
const ids = new Set();
cfg.findings.forEach((finding, index) => {
  check(finding.id === `ADM-A01-F${String(index + 1).padStart(2, '0')}`, 'finding id');
  check(!ids.has(finding.id), 'finding unique');
  ids.add(finding.id);
  check(['critical','high','medium','low'].includes(finding.severity), 'finding severity');
  check(Boolean(finding.category), 'finding category');
  check(Boolean(finding.description), 'finding description');
});
const principles = cfg.canonicalPrinciples;
[
 'frontendAccessIsAuthorization','mockSupportAllowed','directDatabaseEditsAllowed',
 'unifiedCaseRequired','correlationIdRequired','reasonCodeRequired','beforeAfterRequired',
 'immutableAuditRequired','timeBoundedAccessRequired','caseScopedAccessRequired',
 'dualControlForHighRiskRequired','breakGlassRequiresReview','sensitiveDataMinimizationRequired'
].forEach((key) => check(Object.prototype.hasOwnProperty.call(principles, key), 'principle ' + key));
check(principles.frontendAccessIsAuthorization === false, 'frontend false');
check(principles.mockSupportAllowed === false, 'mock support false');
check(principles.directDatabaseEditsAllowed === false, 'direct db false');
[
 'unifiedCaseRequired','correlationIdRequired','reasonCodeRequired','beforeAfterRequired',
 'immutableAuditRequired','timeBoundedAccessRequired','caseScopedAccessRequired',
 'dualControlForHighRiskRequired','breakGlassRequiresReview','sensitiveDataMinimizationRequired'
].forEach((key) => check(principles[key] === true, key + ' true'));

const authority = cfg.authority;
check(authority.contractAuthority === true, 'contract authority');
check(authority.inventoryAuthority === true, 'inventory authority');
Object.entries(authority).forEach(([key, value]) => {
  if (!['contractAuthority','inventoryAuthority'].includes(key)) check(value === false, key + ' false');
});
Object.entries(cfg.prohibitedEffects).forEach(([key, value]) => check(value === false, key + ' false'));
check(cfg.preservedBlockers.includes('ADM-B03'), 'ADM-B03');
check(cfg.preservedBlockers.includes('ADM-B04'), 'ADM-B04');
check(cfg.preservedBlockers.includes('LEGAL-B01'), 'LEGAL-B01');
check(cfg.plannedSublots.length === 4, 'planned sublots');
check(/ADM-A02/.test(cfg.nextSublot), 'next sublot');

check(access.includes("ADMIN_ROLES = Object.freeze(['admin', 'support'])"), 'frontend roles observed');
check(access.includes('current.isMockSupport === true'), 'isMockSupport fallback observed');
check(access.includes('current.mockSupport === true'), 'mockSupport fallback observed');
check(access.includes('session.canAccessAdmin() === true'), 'session permission observed');
check(admin.includes('Doke Admin Mock Panel'), 'mock panel marker');
check(admin.includes("repository.listLocal({ currentUser: false })"), 'local order read');
check(admin.includes("repository.readLocal()"), 'local notification read');
check(admin.includes('listAuditEvents'), 'audit aggregation');
check(admin.includes('listServiceModerationEvents'), 'service audit aggregation');
check(moderation.includes("FUNCTION_NAME = 'service-moderation-operations'"), 'edge function observed');
['list','detail','audit','approve','request_changes','reject'].forEach((action) => check(moderation.includes(`'${action}'`), 'moderation action ' + action));
check(html.includes('assets/js/services/mock-repository-provider.js'), 'mock provider loaded');
check(html.includes('assets/js/services/api-repository-provider.js'), 'api provider loaded');
check(html.includes('assets/js/services/admin-access-service.js'), 'admin access loaded');
check(html.includes('assets/js/pages/admin.js'), 'admin controller loaded');
check(doc.includes('frontend nunca é autoridade final'), 'doc frontend principle');
check(doc.includes('mock-support é proibido'), 'doc mock principle');
check(doc.includes('ADM-A05'), 'doc sequence');
check(workflow.includes('node scripts/audit-adm-a01-authority-baseline.js'), 'workflow audit');
check(workflow.includes('node scripts/test-adm-a01-authority-baseline.js'), 'workflow test');
check(workflow.includes('COM-A05 predecessor regression'), 'workflow regression');
check(!workflow.includes('contents: write'), 'workflow read only');
check(!workflow.includes('workflow_dispatch'), 'workflow no manual remote authority');

console.log(`ADM-A01 audit: ${checks}/${checks}`);
