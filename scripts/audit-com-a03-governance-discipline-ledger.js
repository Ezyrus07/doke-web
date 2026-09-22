'use strict';

const fs = require('fs');
const path = require('path');
const contract = require('../backend/modules/communities/community-governance-discipline-contract');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/com-a03-governance-discipline-ledger.json'), 'utf8'));
const docs = fs.readFileSync(path.join(root, 'docs/COM-A03-GOVERNANCE-DISCIPLINE-LEDGER.md'), 'utf8');
const moduleText = fs.readFileSync(path.join(root, 'backend/modules/communities/community-governance-discipline-contract.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/com-a03-governance-discipline-ledger.yml'), 'utf8');
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/com-a03-governance-discipline-cases.json'), 'utf8'));

const checks = [];
function check(name, condition) { checks.push({ name, passed: Boolean(condition) }); }

check('contract id', config.contractId === contract.CONTRACT_ID);
check('repository only', config.scope === 'repository_only');
check('runtime blocked', config.runtimeIntegrated === false);
check('migration not prepared', config.migrationPrepared === false);
check('migration not applied', config.migrationApplied === false);
check('staging not validated', config.stagingValidated === false);
check('system roles exact', JSON.stringify(config.roles.system) === JSON.stringify(contract.SYSTEM_ROLES));
check('system roles immutable', config.roles.systemRolesImmutable === true);
check('custom roles versioned', config.roles.customRolesVersioned === true);
check('self promotion denied', config.roles.selfPromotionAllowed === false);
check('permission ceiling', config.roles.permissionCeilingRequired === true);
check('rank ceiling', config.roles.rankCeilingRequired === true);
check('base member required', config.roles.baseMemberRoleRequired === true);
check('permissions exact', JSON.stringify(config.permissions) === JSON.stringify(contract.PERMISSIONS));
check('owner only exact', JSON.stringify(config.ownerOnlyPermissions) === JSON.stringify(contract.OWNER_ONLY_PERMISSIONS));
check('commands exact', JSON.stringify(config.commands) === JSON.stringify(contract.COMMANDS));
check('decisions exact', JSON.stringify(config.decisions) === JSON.stringify(contract.DECISIONS));
check('sanction types exact', JSON.stringify(config.discipline.types) === JSON.stringify(contract.SANCTION_TYPES));
check('sanction states exact', JSON.stringify(config.discipline.states) === JSON.stringify(contract.SANCTION_STATES));
check('reason required', config.discipline.reasonRequired === true);
check('self discipline denied', config.discipline.selfDisciplineAllowed === false);
check('rank discipline denied', config.discipline.equalOrHigherRankTargetAllowed === false);
check('owner target denied', config.discipline.ownerTargetAllowed === false);
check('expiry worker required', config.discipline.expiryRequiresSystemWorker === true);
check('silent deletion denied', config.discipline.silentDeletionAllowed === false);
check('audit append only', config.audit.appendOnly === true);
check('audit hash chained', config.audit.hashChained === true);
check('audit revisions monotonic', config.audit.revisionMonotonic === true);
check('audit corrections supersede', config.audit.correctionsSupersede === true);
check('audit sensitive data denied', config.audit.rawSensitiveDataAllowed === false);

Object.entries(config.authority).forEach(([key, value]) => {
  check(`authority ${key}`, key.endsWith('ContractAuthority') || key === 'contractAuthority' ? value === true : value === false);
});
Object.entries(config.prohibitedEffects).forEach(([key, value]) => check(`effect ${key}`, value === false));
config.preservedBlockers.forEach((blocker) => check(`blocker ${blocker}`, typeof blocker === 'string' && blocker.length > 0));
config.permissions.forEach((permission) => check(`permission exported ${permission}`, contract.PERMISSIONS.includes(permission)));
config.commands.forEach((command) => check(`command exported ${command}`, contract.COMMANDS.includes(command)));
config.decisions.forEach((decision) => check(`decision exported ${decision}`, contract.DECISIONS.includes(decision)));
config.discipline.types.forEach((type) => check(`sanction type exported ${type}`, contract.SANCTION_TYPES.includes(type)));
config.discipline.states.forEach((state) => check(`sanction state exported ${state}`, contract.SANCTION_STATES.includes(state)));

[
  'permission ceiling', 'self promotion', 'equal or higher rank', 'append-only',
  'system_worker', 'roleWriteAuthority', 'disciplineWriteAuthority', 'auditWriteAuthority', 'COM-A04'
].forEach((needle) => check(`docs include ${needle}`, docs.toLowerCase().includes(needle.toLowerCase())));
[
  'containsSensitive', 'IDEMPOTENCY_PAYLOAD_CONFLICT', 'SYSTEM_ROLE_IMMUTABLE',
  'PERMISSION_CEILING_EXCEEDED', 'SELF_ROLE_MUTATION_PROHIBITED', 'TARGET_RANK_NOT_LOWER',
  'SANCTION_DURATION_EXCEEDS_POLICY', 'OWNER_REQUIRED_FOR_PERMANENT_BAN', 'SYSTEM_WORKER_REQUIRED', 'createAuditEvent', 'verifyAuditChain'
].forEach((needle) => check(`module includes ${needle}`, moduleText.includes(needle)));
[
  'node --check', 'audit-com-a03-governance-discipline-ledger.js',
  'test-com-a03-governance-discipline-ledger.js', 'audit-com-a02-canonical-discovery-membership.js',
  'audit-com-a01-authority-baseline.js', 'audit-rep-a05-rehire-transaction-readiness.js', 'git diff --check'
].forEach((needle) => check(`workflow includes ${needle}`, workflow.includes(needle)));
check('fixtures contract id', fixtures.contractId === contract.CONTRACT_ID);
Object.values(fixtures.actorIds).forEach((id) => check(`fixture actor ${id}`, /^[0-9a-f-]{36}$/i.test(id)));
fixtures.requestIds.forEach((id) => check(`fixture request ${id}`, /^[0-9a-f-]{36}$/i.test(id)));
fixtures.auditEventIds.forEach((id) => check(`fixture event ${id}`, /^[0-9a-f-]{36}$/i.test(id)));

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({
  contractId: contract.CONTRACT_ID,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'failed' : 'passed',
  failedChecks: failed.map((item) => item.name),
  effects: config.prohibitedEffects
}, null, 2));
if (failed.length) process.exit(1);
