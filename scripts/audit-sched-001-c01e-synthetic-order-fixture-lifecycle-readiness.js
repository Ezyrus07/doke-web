#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const PATHS = Object.freeze({
  config: 'config/sched-001-c01e-synthetic-order-fixture-lifecycle-readiness.json',
  evidence: 'docs/validation/SCHED-001-C01E-SYNTHETIC-ORDER-FIXTURE-LIFECYCLE-READINESS.json',
  docs: 'docs/SCHED-001-C01E-SYNTHETIC-ORDER-FIXTURE-LIFECYCLE-READINESS.md',
  planner: 'scripts/plan-sched-001-c01e-synthetic-order-fixture-lifecycle.js',
  audit: 'scripts/audit-sched-001-c01e-synthetic-order-fixture-lifecycle-readiness.js',
  test: 'scripts/test-sched-001-c01e-synthetic-order-fixture-lifecycle-readiness.js',
  workflow: '.github/workflows/sched-001-c01e-synthetic-order-fixture-lifecycle-readiness.yml',
  c01dConfig: 'config/sched-001-c01d-authenticated-browser-canary-readiness.json',
  c01dExecutor: 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js',
  existingCleanup: 'supabase/migrations/20260730003500_ord_a06_canary_cleanup_boundary.sql',
  projectionGuard: 'supabase/migrations/20260801183000_sched_b04d_canonical_order_projection_guard.sql',
  matrix: 'config/domain-completion-matrix.json'
});

Object.values(PATHS).forEach((file) => assert(fs.existsSync(file), `Missing SCHED-C01E readiness asset: ${file}`));

const config = JSON.parse(fs.readFileSync(PATHS.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(PATHS.evidence, 'utf8'));
const docs = fs.readFileSync(PATHS.docs, 'utf8');
const planner = fs.readFileSync(PATHS.planner, 'utf8');
const workflow = fs.readFileSync(PATHS.workflow, 'utf8');
const c01d = JSON.parse(fs.readFileSync(PATHS.c01dConfig, 'utf8'));
const c01dExecutor = fs.readFileSync(PATHS.c01dExecutor, 'utf8');
const existingCleanup = fs.readFileSync(PATHS.existingCleanup, 'utf8');
const projectionGuard = fs.readFileSync(PATHS.projectionGuard, 'utf8');
const matrix = JSON.parse(fs.readFileSync(PATHS.matrix, 'utf8'));

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.contractVersion, 'sched-c01e-synthetic-order-fixture-lifecycle-readiness-v1');
assert.strictEqual(config.scope, 'repository_only_synthetic_order_fixture_lifecycle_readiness');
assert.strictEqual(config.environment, 'doke-web-staging');
assert.strictEqual(config.projectRef, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(config.triggerEvidence.c01dRun, 30753218635);
assert.strictEqual(config.triggerEvidence.c01dJob, 91510829724);
assert.strictEqual(config.triggerEvidence.authenticatedContexts, 2);
assert.strictEqual(config.triggerEvidence.stagingReads, 2);
assert.strictEqual(config.triggerEvidence.visibleOrderCards, 0);
assert.strictEqual(config.triggerEvidence.stagingMutations, 0);
assert.strictEqual(config.triggerEvidence.blocker, 'synthetic_personas_have_no_visible_order_fixtures');

assert.strictEqual(
  config.authorization.requiredFixtureLifecyclePhrase,
  'I_EXPLICITLY_AUTHORIZE_SCHED_C01E_SYNTHETIC_ORDER_FIXTURE_LIFECYCLE_ON_DOKE_STAGING'
);
assert.strictEqual(
  config.authorization.requiredBrowserReadOnlyPhrase,
  'I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING'
);
assert.strictEqual(config.authorization.bothPhrasesRequiredInSameEnvelope, true);
assert.strictEqual(config.authorization.genericNextAllowed, false);
assert.strictEqual(config.authorization.fixtureMutationCovered, false);
assert.strictEqual(config.authorization.browserExecutionCovered, false);
assert.strictEqual(config.authorization.productionCovered, false);
assert.strictEqual(config.authorization.accountMutationCovered, false);
assert.strictEqual(config.authorization.paymentMutationCovered, false);

assert.strictEqual(config.accountPolicy.existingSyntheticClientRequired, true);
assert.strictEqual(config.accountPolicy.existingSyntheticProfessionalRequired, true);
assert.strictEqual(config.accountPolicy.authUserCreationForbidden, true);
assert.strictEqual(config.accountPolicy.passwordChangeForbidden, true);
assert.strictEqual(config.accountPolicy.emailChangeForbidden, true);
assert.strictEqual(config.accountPolicy.roleChangeForbidden, true);
assert.strictEqual(config.accountPolicy.realAccountUseForbidden, true);
assert.strictEqual(config.accountPolicy.rawAccountIdentifiersInRepositoryForbidden, true);

assert.deepStrictEqual(config.lifecycle.phases, [
  'preflight_zero_residue',
  'resolve_existing_synthetic_personas',
  'provision_bounded_fixture_graph',
  'verify_fixture_visibility',
  'execute_bound_c01d_read_only_canary',
  'cleanup_fixture_graph',
  'independent_zero_residue_verification'
]);
assert.strictEqual(config.lifecycle.failClosed, true);
assert.strictEqual(config.lifecycle.singleWorkflowRequired, true);
assert.strictEqual(config.lifecycle.singleHeadShaRequired, true);
assert.strictEqual(config.lifecycle.singleRunIdRequired, true);
assert.strictEqual(config.lifecycle.maximumLifetimeSeconds, 3600);
assert.strictEqual(config.lifecycle.cleanupAlwaysRequired, true);
assert.strictEqual(config.lifecycle.cleanupMustSurviveCanaryFailure, true);
assert.strictEqual(config.lifecycle.independentCleanupVerificationRequired, true);
assert.strictEqual(config.lifecycle.preExistingResidueBlocksExecution, true);
assert(new RegExp(config.lifecycle.runIdPattern).test('sched-c01e-example-run'));
assert(!new RegExp(config.lifecycle.runIdPattern).test('ord-a06-example-run'));

assert.strictEqual(config.fixtureManifest.serviceCount, 1);
assert.strictEqual(config.fixtureManifest.serviceVersionCount, 1);
assert.strictEqual(config.fixtureManifest.orderCount, 2);
assert.strictEqual(config.fixtureManifest.conversationCount, 2);
assert.strictEqual(config.fixtureManifest.messageCountMaximum, 2);
assert.strictEqual(config.fixtureManifest.scheduleReservationCount, 1);
assert.strictEqual(config.fixtureManifest.canonicalConfirmedOrderCount, 1);
assert.strictEqual(config.fixtureManifest.alternateOrderCount, 1);
assert.deepStrictEqual(config.fixtureManifest.alternateAllowedAuthorities, ['client_intent', 'none']);
assert.strictEqual(config.fixtureManifest.sameClientProfessionalPairRequired, true);
assert.strictEqual(config.fixtureManifest.bothOrdersVisibleToBothPersonasRequired, true);
assert.strictEqual(config.fixtureManifest.rawFixtureIdentifiersInRepositoryForbidden, true);
assert.strictEqual(config.fixtureManifest.doubleMarkerRequired, true);

assert.strictEqual(config.canonicalConfirmedCase.orderStatus, 'scheduled');
assert.strictEqual(config.canonicalConfirmedCase.reservationStatus, 'confirmed');
assert.strictEqual(config.canonicalConfirmedCase.scheduleReservationIdRequired, true);
assert.strictEqual(config.canonicalConfirmedCase.scheduledAtRequired, true);
assert.strictEqual(config.canonicalConfirmedCase.reservationOrderMatchRequired, true);
assert.strictEqual(config.canonicalConfirmedCase.reservationStartMatchRequired, true);
assert.strictEqual(config.canonicalConfirmedCase.canonicalProjectionFunctionRequired, true);
assert.strictEqual(config.canonicalConfirmedCase.directScheduleProjectionWriteForbidden, true);
assert.deepStrictEqual(config.alternateCase.orderStatusAllowed, ['requested', 'accepted']);
assert.strictEqual(config.alternateCase.scheduleReservationIdRequired, false);
assert.strictEqual(config.alternateCase.scheduledAtRequired, false);
assert.strictEqual(config.alternateCase.confirmationCopyForbidden, true);
assert.strictEqual(config.alternateCase.clientIntentStoredOnlyAsMetadata, true);

assert.strictEqual(config.messageSurface.conversationPerOrderRequired, true);
assert.strictEqual(config.messageSurface.scheduleCommandControlsForbidden, true);
assert.strictEqual(config.messageSurface.legacyScheduleCopyForbidden, true);
assert.strictEqual(config.mutationBoundary.serviceRoleOnly, true);
assert.strictEqual(config.mutationBoundary.browserMutationForbidden, true);
assert.strictEqual(config.mutationBoundary.productionTargetRejected, true);
assert.strictEqual(config.mutationBoundary.paymentsForbidden, true);
assert.strictEqual(config.mutationBoundary.walletMutationForbidden, true);
assert.strictEqual(config.mutationBoundary.reviewsForbidden, true);
assert.strictEqual(config.mutationBoundary.disputesForbidden, true);

assert(config.cleanup.allowedBoundedRelations.includes('public.messages'));
assert(config.cleanup.allowedBoundedRelations.includes('public.conversations'));
assert(config.cleanup.allowedBoundedRelations.includes('public.schedule_reservations'));
assert(config.cleanup.allowedBoundedRelations.includes('public.orders'));
assert(config.cleanup.allowedBoundedRelations.includes('public.services'));
['public.payments', 'public.transactions', 'public.wallet_receivables', 'public.reviews'].forEach((relation) => {
  assert(config.cleanup.forbiddenDependencyRelations.includes(relation));
});
assert.strictEqual(config.cleanup.abortOnMarkerMismatch, true);
assert.strictEqual(config.cleanup.abortOnAmbiguousScope, true);
assert.strictEqual(config.cleanup.abortOnForbiddenDependency, true);
assert.strictEqual(config.cleanup.idempotentAlreadyCleanResultRequired, true);
assert.strictEqual(config.cleanup.zeroResidueRequired, true);

assert.strictEqual(config.evidencePolicy.jsonReportAllowed, true);
assert.strictEqual(config.evidencePolicy.screenshotsAllowed, false);
assert.strictEqual(config.evidencePolicy.videoAllowed, false);
assert.strictEqual(config.evidencePolicy.traceAllowed, false);
assert.strictEqual(config.evidencePolicy.credentialsRecorded, false);
assert.strictEqual(config.evidencePolicy.rawAccountIdentifiersRecorded, false);
assert.strictEqual(config.evidencePolicy.rawFixtureIdentifiersRecorded, false);
assert.strictEqual(config.evidencePolicy.digestsCountsAndAssertionsOnly, true);
assert.strictEqual(config.capabilities.dryRunAvailable, true);
assert.strictEqual(config.capabilities.fixtureProvisioningAvailable, false);
assert.strictEqual(config.capabilities.fixtureCleanupAvailable, false);
assert.strictEqual(config.capabilities.browserExecutionAvailable, false);
assert.strictEqual(config.capabilities.networkAvailable, false);
assert.strictEqual(config.capabilities.databaseConnectionAvailable, false);
assert.deepStrictEqual(config.effects, {
  stagingReads: 0,
  stagingMutations: 0,
  productionAccess: 0,
  accountsCreated: 0,
  accountsModified: 0,
  ordersCreated: 0,
  reservationsCreated: 0,
  conversationsCreated: 0,
  paymentsCreated: 0,
  migrationsApplied: 0,
  deploymentsPerformed: 0,
  mergePerformed: false,
  autoMergeEnabled: false
});

[
  'I_EXPLICITLY_AUTHORIZE_SCHED_C01E_SYNTHETIC_ORDER_FIXTURE_LIFECYCLE_ON_DOKE_STAGING',
  'I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING',
  'Generic continuation does not authorize fixture application or browser execution.',
  'one synthetic published service',
  'two orders owned by the same synthetic client/professional pair',
  'Cleanup must run even when provisioning, visibility checks or C01D fail.',
  'staging mutations: `0`',
  'SCHED-C01E remains blocked'
].forEach((fragment) => assert(docs.includes(fragment), `C01E documentation missing: ${fragment}`));

assert(planner.includes("args.has('--dry-run')"));
assert(planner.includes('Only --dry-run is available'));
assert(planner.includes("status: 'synthetic_fixture_lifecycle_application_blocked'"));
[
  'process.env',
  "require('pg')",
  'fetch(',
  "require('http')",
  "require('https')",
  'child_process',
  '--execute',
  '--check-env',
  'SERVICE_ROLE',
  'SUPABASE_DB_PASSWORD'
].forEach((fragment) => assert(!planner.includes(fragment), `C01E planner contains prohibited capability: ${fragment}`));

assert.strictEqual(c01d.caseManifest.canonicalConfirmedCaseRequired, true);
assert.strictEqual(c01d.caseManifest.clientIntentOrNoneCaseRequired, true);
assert.strictEqual(c01d.runtimeGate.postLoginReadOnlyGuardRequired, true);
assert.deepStrictEqual(c01d.runtimeGate.allowedPostLoginMethods, ['GET', 'HEAD', 'OPTIONS']);
assert(c01dExecutor.includes("page.locator('.order-card[data-id]')"));
assert(c01dExecutor.includes('No authorized visible canonical_confirmed order case was found.'));
assert(c01dExecutor.includes('No authorized visible client_intent or none order case was found.'));

assert(existingCleanup.includes("canarySublot' = 'ORD-A06'"));
assert(existingCleanup.includes("canaryScope' = 'visual-settlement'"));
assert(existingCleanup.includes('if v_target_count > 1 then'));
assert(docs.includes('cannot be reused'));

assert(projectionGuard.includes('private.apply_order_schedule_projection'));
assert(projectionGuard.includes('DOKE_ORDER_SCHEDULE_PROJECTION_CONTEXT_REQUIRED'));
assert(projectionGuard.includes("reservation.status = 'confirmed'"));

const versionParts = String(matrix.version).split('.').map(Number);
assert.strictEqual(versionParts[0], 1);
assert.strictEqual(versionParts[1], 3);
assert(versionParts[2] >= 73, 'C01E readiness requires matrix 1.3.73 or later');
assert(matrix.domains.some((domain) => domain.id === 'SCHED-001'));
assert(matrix.domains.some((domain) => domain.id === 'ORD-001'));
assert(matrix.domains.some((domain) => domain.id === 'MSG-001'));

assert(workflow.includes('name: Doke SCHED-C01E Synthetic Order Fixture Lifecycle Readiness'));
assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-sched-001-c01e-synthetic-order-fixture-lifecycle-readiness.js'));
assert(workflow.includes('node scripts/test-sched-001-c01e-synthetic-order-fixture-lifecycle-readiness.js'));
assert(workflow.includes('node scripts/plan-sched-001-c01e-synthetic-order-fixture-lifecycle.js --dry-run'));
assert(workflow.includes('node scripts/audit-sched-001-c01d-authenticated-browser-canary-readiness.js'));
assert(workflow.includes('npm run audit:domain-completion-matrix'));
[
  'contents: write',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'SERVICE_ROLE',
  'playwright install',
  '--execute',
  '--check-env',
  'curl ',
  'psql ',
  'supabase ',
  'git push'
].forEach((fragment) => assert(!workflow.includes(fragment), `C01E readiness workflow contains prohibited fragment: ${fragment}`));

console.log('SCHED-C01E synthetic order fixture lifecycle readiness audit passed.');
