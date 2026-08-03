'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const observedAt = '2026-08-03T07:32:00-03:00';

function write(file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.endsWith('\n') ? content : content + '\n');
}

function addUnique(list, values) {
  values.forEach((value) => {
    if (!list.includes(value)) list.push(value);
  });
}

const contract = {
  contractVersion: 'msg-a08-staging-activation-readiness-v1',
  status: 'repository_only_staging_activation_readiness_ready_not_executed',
  domain: 'MSG-001',
  observedAt,
  objective: 'Freeze a fail-closed staging activation sequence for MSG-A04B through MSG-A07B without authorizing or executing remote effects.',
  authority: {
    genericContinuationAuthorizesRemoteEffects: false,
    freshExplicitAuthorizationPerPhase: true,
    productionTargetAllowed: false,
    realAccountsAllowed: false,
    syntheticUuidPersonasOnly: true,
    exactHeadRequired: true,
    oneRemoteOperatorAtATime: true
  },
  preflight: {
    required: [
      'exact_pr_head_recorded',
      'staging_project_ref_verified',
      'production_project_ref_denied',
      'migration_history_read_only_snapshot',
      'pending_migration_names_match_repository',
      'edge_function_source_closure_passed',
      'permanent_gates_a01_through_a08_green',
      'feature_flags_confirmed_false',
      'synthetic_personas_prepared',
      'rollback_owner_named',
      'evidence_directory_empty_or_new_run_scoped'
    ],
    migrationRepairAllowedAsRoutineRollback: false,
    dashboardSqlEditsAllowed: false,
    directRemoteSchemaEditsAllowed: false
  },
  activationOrder: [
    {
      phase: 'MSG-A07B',
      purpose: 'Deploy and validate server-owned command acknowledgement and persistent idempotency before enabling dependent messaging features.',
      remoteEffects: ['server_runtime_deploy', 'synthetic_command_canaries'],
      canaries: [
        'lost_response_same_command_id_returns_replayed_ack',
        'concurrent_same_command_id_materializes_one_effect',
        'same_key_payload_drift_is_rejected',
        'functional_errors_are_not_retried',
        'cross_actor_command_replay_is_denied'
      ],
      flagMustRemainFalseUntilPass: null,
      rollback: 'Redeploy the last known-good server runtime; do not mutate migration history.'
    },
    {
      phase: 'MSG-A05B',
      purpose: 'Apply the attachment lifecycle resources and deploy cleanup while the browser feature remains disabled.',
      remoteEffects: ['database_migration_apply', 'edge_function_deploy', 'synthetic_storage_canaries'],
      canaries: [
        'owner_prepare_upload_confirm_bind_download_remove',
        'cross_owner_prepare_confirm_remove_denied',
        'arbitrary_storage_path_denied',
        'unattached_object_cleanup_is_scoped_to_synthetic_fixture',
        'removed_attachment_retention_contract_observed'
      ],
      flagMustRemainFalseUntilPass: 'attachmentLifecycleEnabled',
      rollback: 'Keep the feature flag false, stop cleanup scheduling and use an explicitly reviewed compensating migration only if required; never delete storage metadata with direct SQL.'
    },
    {
      phase: 'MSG-A04B',
      purpose: 'Apply participant-scoped message publication while client Realtime consumption remains disabled.',
      remoteEffects: ['database_migration_apply', 'synthetic_realtime_canaries'],
      canaries: [
        'participant_insert_update_signal_received',
        'non_participant_receives_no_signal',
        'delete_event_not_subscribed',
        'payload_is_invalidation_signal_only',
        'canonical_snapshot_is_reread_remote_only'
      ],
      flagMustRemainFalseUntilPass: 'messagesRealtimeEnabled',
      rollback: 'Keep the feature flag false and apply a reviewed compensating publication migration if isolation or delivery canaries fail.'
    },
    {
      phase: 'MSG-A06B',
      purpose: 'Apply private Presence and Broadcast authorization after message publication isolation is proven.',
      remoteEffects: ['database_migration_apply', 'realtime_settings_change', 'synthetic_presence_canaries'],
      canaries: [
        'participant_presence_join_sync_leave',
        'participant_typing_broadcast_received',
        'non_participant_channel_join_denied',
        'non_participant_broadcast_denied',
        'disconnect_clears_presence_and_typing_timers'
      ],
      flagMustRemainFalseUntilPass: 'messagesPresenceEnabled',
      rollback: 'Keep the feature flag false, restore the prior Realtime setting and apply a reviewed compensating policy migration if authorization fails.'
    }
  ],
  phaseRules: {
    previousPhaseMustPass: true,
    stopOnFirstFailure: true,
    flagsActivatedDuringCanary: false,
    featureActivationRequiresSeparateDecisionAfterCanaries: true,
    evidenceRequiredBeforeBlockerClosure: true,
    destructiveRollbackForbidden: true
  },
  evidenceManifest: {
    requiredFields: [
      'repository_head',
      'pull_request_number',
      'staging_project_ref_fingerprint',
      'authorization_scope',
      'operator',
      'started_at',
      'completed_at',
      'migration_history_before',
      'migration_history_after',
      'function_versions_before',
      'function_versions_after',
      'synthetic_persona_ids',
      'canary_assertions',
      'rollback_decision',
      'production_effects_zero'
    ],
    secretsOrTokensStored: false,
    realUserIdentifiersStored: false
  },
  effects: {
    stagingReads: 0,
    stagingMutations: 0,
    migrationsApplied: 0,
    deployments: 0,
    realtimeSettingsChanged: 0,
    storagePoliciesChanged: 0,
    productionChanged: false,
    realAccountsChanged: 0,
    realMessagesChanged: 0,
    realAttachmentsChanged: 0,
    pullRequestsMerged: 0
  },
  orderedNextActions: [
    'Obtain a fresh explicit staging authorization scoped to MSG-A07B only.',
    'Execute phases strictly in the declared order and stop after any failed preflight or canary.',
    'Do not activate A05, A04 or A06 browser flags until their remote resources and isolation canaries pass.',
    'Update the matrix blockers only from run-scoped evidence produced on the exact validated head.'
  ]
};

const docs = `# MSG-A08 — Staging Activation Readiness\n\n## Status\n\nRepository-only. No staging read, migration, deployment, Realtime setting, Storage policy, account, message, attachment, production or merge effect was executed.\n\n## Why this sublot exists\n\nMSG-A04 through MSG-A07 are repository-ready, but their operational closure depends on coordinated remote changes. Executing those changes without a fixed order creates avoidable failure modes: a lost command response can duplicate effects, attachment resources can be exposed before ownership canaries, Realtime publication can leak signals to non-participants, and Presence can be enabled before private-channel authorization is proven.\n\nMSG-A08 freezes the activation process without authorizing it. A generic continuation command is never sufficient to apply a migration, deploy an Edge Function, alter Realtime settings or run authenticated staging canaries.\n\n## Mandatory order\n\n1. **MSG-A07B — command reliability.** Deploy and prove acknowledgements, persistent idempotency, lost-response replay and concurrent deduplication first.\n2. **MSG-A05B — attachment lifecycle.** Apply lifecycle resources and deploy cleanup with \`attachmentLifecycleEnabled=false\`.\n3. **MSG-A04B — message Realtime.** Apply publication with \`messagesRealtimeEnabled=false\`; validate participant isolation and canonical rereads.\n4. **MSG-A06B — Presence and typing.** Apply private-channel authorization with \`messagesPresenceEnabled=false\`; validate participants and deny outsiders.\n\nNo phase may start until the preceding phase has passed and its evidence has been recorded. A failure stops the sequence.\n\n## Preflight\n\n- pin the exact PR head and reject any moved head;\n- verify the target is the staging project and explicitly reject production;\n- capture migration history read-only and compare pending names with Git;\n- validate Edge Function source closure and permanent gates A01–A08;\n- confirm all three browser feature flags remain false;\n- use synthetic UUID personas and synthetic resource paths only;\n- name the rollback owner before the first remote effect;\n- create a new run-scoped evidence manifest.\n\nRemote Dashboard SQL edits and routine use of migration repair are forbidden. Migration files remain the source of truth, and only one operator may apply them at a time.\n\n## Canary groups\n\n### A07B\n\nProve lost-response replay with the same command ID, single materialization under concurrent replay, rejection of payload drift, no retry of functional errors and denial of cross-actor replay.\n\n### A05B\n\nProve the complete synthetic owner lifecycle, cross-owner denial, server-generated paths, scoped orphan cleanup and retention behavior. Storage metadata must never be deleted through direct SQL.\n\n### A04B\n\nProve participant INSERT/UPDATE signals, outsider isolation, absence of DELETE subscription authority, signal-only payload handling and canonical remote reread.\n\n### A06B\n\nProve participant Presence join/sync/leave, typing Broadcast, outsider channel denial and cleanup after disconnect. Presence is an ephemeral hint, not a durable identity or audit authority.\n\n## Rollback model\n\nRollback is fail-closed and non-destructive. Browser flags remain false throughout canaries. Edge runtime rollback redeploys the last known-good source. Database or policy rollback uses a separately reviewed compensating migration; migration history is not rewritten as an ordinary rollback mechanism. If any isolation assertion fails, the sequence stops before feature activation.\n\n## Exit criteria\n\n- each phase has a fresh explicit authorization;\n- every preflight and canary assertion passes on the exact head;\n- evidence contains before/after migration and function versions without secrets or real-user identifiers;\n- production effects remain zero;\n- blockers are updated only after evidence review;\n- feature flags are enabled only by a separate staging decision after remote resources pass.\n\n## Supabase constraints incorporated\n\n- Realtime Broadcast and Presence authorization is enforced with RLS on \`realtime.messages\` and private channels;\n- Presence is not used for high-frequency durable state;\n- migrations are applied from versioned files in timestamp order by one coordinated operator;\n- Edge Functions are deployed as separate versioned artifacts.\n`;

const validation = {
  validationVersion: 'msg-a08-staging-activation-readiness-validation-v1',
  status: 'passed_repository_only',
  observedAt,
  assertions: {
    activationOrderFrozen: true,
    exactHeadRequired: true,
    freshAuthorizationPerPhase: true,
    genericContinuationDenied: true,
    productionDenied: true,
    syntheticPersonasOnly: true,
    stopOnFailure: true,
    featureFlagsRemainFalseDuringCanaries: true,
    migrationRepairNotRoutineRollback: true,
    destructiveRollbackDenied: true,
    runScopedEvidenceRequired: true,
    remoteEffectsExecuted: false
  },
  activationOrder: contract.activationOrder.map((phase) => phase.phase),
  effects: contract.effects
};

const auditScript = `#!/usr/bin/env node\n'use strict';\n\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst root = process.cwd();\nconst failures = [];\n\nfunction read(file) {\n  const target = path.join(root, file);\n  if (!fs.existsSync(target)) { failures.push('Missing file: ' + file); return ''; }\n  return fs.readFileSync(target, 'utf8');\n}\nfunction assert(condition, message) { if (!condition) failures.push(message); }\n\nconst contract = JSON.parse(read('config/msg-001-a08-staging-activation-readiness.json') || '{}');\nconst validation = JSON.parse(read('docs/validation/MSG-001-A08-STAGING-ACTIVATION-READINESS.json') || '{}');\nconst matrix = JSON.parse(read('config/domain-completion-matrix.json') || '{}');\nconst packageJson = JSON.parse(read('package.json') || '{}');\nconst docs = read('docs/MSG-001-A08-STAGING-ACTIVATION-READINESS.md');\nconst workflow = read('.github/workflows/msg-001-a08-staging-activation-readiness.yml');\n\nassert(contract.status === 'repository_only_staging_activation_readiness_ready_not_executed', 'A08 must remain repository-only and unexecuted.');\nassert(contract.authority && contract.authority.genericContinuationAuthorizesRemoteEffects === false, 'Generic continuation must not authorize remote effects.');\nassert(contract.authority && contract.authority.freshExplicitAuthorizationPerPhase === true, 'Each phase requires fresh authorization.');\nassert(contract.authority && contract.authority.productionTargetAllowed === false, 'Production must be denied.');\nassert(JSON.stringify((contract.activationOrder || []).map((item) => item.phase)) === JSON.stringify(['MSG-A07B','MSG-A05B','MSG-A04B','MSG-A06B']), 'Activation order drifted.');\nassert(contract.phaseRules && contract.phaseRules.stopOnFirstFailure === true, 'Sequence must stop on first failure.');\nassert(contract.phaseRules && contract.phaseRules.flagsActivatedDuringCanary === false, 'Feature flags must remain disabled during canaries.');\nassert(contract.preflight && contract.preflight.migrationRepairAllowedAsRoutineRollback === false, 'migration repair cannot be routine rollback.');\nassert(contract.effects && Object.values(contract.effects).every((value) => value === 0 || value === false), 'A08 remote effects must remain zero.');\nassert(validation.status === 'passed_repository_only', 'A08 validation status invalid.');\nassert(docs.includes('MSG-A07B') && docs.includes('MSG-A05B') && docs.includes('MSG-A04B') && docs.includes('MSG-A06B'), 'A08 docs must describe every phase.');\nassert(docs.includes('generic continuation') || docs.includes('Generic continuation'), 'A08 docs must deny generic continuation authority.');\nassert(workflow.includes('permissions:\\n  contents: read'), 'A08 permanent workflow must be read-only.');\n['supabase db push','supabase functions deploy','psql ','curl ','apply_migration','execute_sql'].forEach((token) => {\n  assert(!workflow.includes(token), 'A08 workflow must not execute remote command: ' + token);\n});\nassert(packageJson.scripts && packageJson.scripts['audit:msg-001-a08-staging-activation-readiness'] === 'node scripts/audit-msg-001-a08-staging-activation-readiness.js', 'Missing A08 audit script registration.');\nassert(packageJson.scripts && packageJson.scripts['test:msg-001-a08-staging-activation-readiness'] === 'node scripts/test-msg-001-a08-staging-activation-readiness.js', 'Missing A08 test script registration.');\nassert(matrix.version === '1.3.85', 'Matrix version must be 1.3.85.');\nconst msg = (matrix.domains || []).find((domain) => domain.id === 'MSG-001');\nassert(Boolean(msg), 'MSG-001 matrix entry missing.');\nif (msg) {\n  assert((msg.requiredPaths || []).includes('config/msg-001-a08-staging-activation-readiness.json'), 'MSG matrix missing A08 contract.');\n  assert((msg.requiredPaths || []).includes('.github/workflows/msg-001-a08-staging-activation-readiness.yml'), 'MSG matrix missing A08 workflow.');\n  assert((msg.tests || []).includes('audit:msg-001-a08-staging-activation-readiness'), 'MSG matrix missing A08 audit.');\n  assert((msg.tests || []).includes('test:msg-001-a08-staging-activation-readiness'), 'MSG matrix missing A08 runtime test.');\n}\n\nif (failures.length) {\n  console.error('MSG-A08 staging activation readiness audit failed:');\n  failures.forEach((failure) => console.error('- ' + failure));\n  process.exit(1);\n}\nconsole.log('MSG-A08 staging activation readiness audit passed.');\n`;

const testScript = `#!/usr/bin/env node\n'use strict';\n\nconst fs = require('node:fs');\nconst contract = JSON.parse(fs.readFileSync('config/msg-001-a08-staging-activation-readiness.json', 'utf8'));\nconst expected = ['MSG-A07B','MSG-A05B','MSG-A04B','MSG-A06B'];\n\nfunction createRun() {\n  return { index: 0, stopped: false, passed: [], evidence: [] };\n}\nfunction begin(run, phase, authorization, preflightPassed) {\n  if (run.stopped) throw new Error('RUN_STOPPED');\n  if (expected[run.index] !== phase) throw new Error('PHASE_ORDER');\n  if (!authorization || authorization.phase !== phase || authorization.fresh !== true) throw new Error('AUTH_REQUIRED');\n  if (preflightPassed !== true) throw new Error('PREFLIGHT_REQUIRED');\n  return { phase, flagsEnabled: false };\n}\nfunction finish(run, phase, canariesPassed, evidence) {\n  if (canariesPassed !== true) { run.stopped = true; throw new Error('CANARY_FAILED'); }\n  if (!evidence || evidence.production_effects_zero !== true) throw new Error('EVIDENCE_REQUIRED');\n  run.passed.push(phase);\n  run.evidence.push(evidence);\n  run.index += 1;\n}\n\nconst run = createRun();\nlet denied = 0;\ntry { begin(run, 'MSG-A07B', null, true); } catch (error) { if (error.message === 'AUTH_REQUIRED') denied += 1; }\ntry { begin(run, 'MSG-A05B', { phase: 'MSG-A05B', fresh: true }, true); } catch (error) { if (error.message === 'PHASE_ORDER') denied += 1; }\nif (denied !== 2) throw new Error('Fail-closed authorization/order checks failed.');\n\nexpected.forEach((phase) => {\n  const active = begin(run, phase, { phase, fresh: true }, true);\n  if (active.flagsEnabled !== false) throw new Error('Flags must remain disabled during canary.');\n  finish(run, phase, true, { phase, production_effects_zero: true });\n});\nif (run.index !== expected.length || run.passed.length !== expected.length) throw new Error('Full ordered activation simulation failed.');\n\nconst failedRun = createRun();\nbegin(failedRun, 'MSG-A07B', { phase: 'MSG-A07B', fresh: true }, true);\ntry { finish(failedRun, 'MSG-A07B', false, { production_effects_zero: true }); } catch (error) { if (error.message !== 'CANARY_FAILED') throw error; }\nlet stopObserved = false;\ntry { begin(failedRun, 'MSG-A07B', { phase: 'MSG-A07B', fresh: true }, true); } catch (error) { stopObserved = error.message === 'RUN_STOPPED'; }\nif (!stopObserved) throw new Error('Run must stop after canary failure.');\nif (JSON.stringify(contract.activationOrder.map((item) => item.phase)) !== JSON.stringify(expected)) throw new Error('Contract order mismatch.');\nconsole.log('MSG-A08 staging activation readiness runtime test passed.');\n`;

const permanentWorkflow = `name: Doke MSG-A08 Staging Activation Readiness\n\non:\n  pull_request:\n    paths:\n      - 'config/msg-001-a08-staging-activation-readiness.json'\n      - 'docs/MSG-001-A08-STAGING-ACTIVATION-READINESS.md'\n      - 'docs/validation/MSG-001-A08-STAGING-ACTIVATION-READINESS.json'\n      - 'scripts/audit-msg-001-a08-staging-activation-readiness.js'\n      - 'scripts/test-msg-001-a08-staging-activation-readiness.js'\n      - 'config/domain-completion-matrix.json'\n      - 'docs/DOMAIN-COMPLETION-MATRIX.md'\n      - 'reports/generated/domain-completion-matrix-report.json'\n      - 'package.json'\n      - '.github/workflows/msg-001-a08-staging-activation-readiness.yml'\n  workflow_dispatch:\n\npermissions:\n  contents: read\n\njobs:\n  readiness:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 12\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 24\n          cache: npm\n      - run: npm ci --ignore-scripts\n      - name: Validate MSG-A08 fail-closed activation readiness\n        run: |\n          node --check scripts/audit-msg-001-a08-staging-activation-readiness.js\n          node --check scripts/test-msg-001-a08-staging-activation-readiness.js\n          npm run audit:msg-001-a01-authority-baseline\n          npm run audit:msg-001-a02-canonical-authority-boundary\n          npm run test:msg-001-a02-canonical-authority-boundary\n          npm run audit:msg-001-a03-server-command-boundary\n          npm run test:msg-001-a03-server-command-boundary\n          npm run audit:msg-001-a04-realtime-publication-subscription-contract\n          npm run test:msg-001-a04-realtime-publication-subscription-runtime\n          npm run audit:msg-001-a05-attachment-lifecycle\n          npm run test:msg-001-a05-attachment-lifecycle-runtime\n          npm run audit:msg-001-a06-presence-typing-boundary\n          npm run test:msg-001-a06-presence-typing-runtime\n          npm run audit:msg-001-a07-command-reliability\n          npm run test:msg-001-a07-command-reliability-runtime\n          npm run audit:msg-001-a08-staging-activation-readiness\n          npm run test:msg-001-a08-staging-activation-readiness\n          npm run audit:messages-api-contract\n          npm run audit:runtime-idempotency-audit\n          npm run audit:staging-messaging-runtime\n          npm run audit:domain-completion-matrix\n          git diff --check\n`;

write('config/msg-001-a08-staging-activation-readiness.json', JSON.stringify(contract, null, 2));
write('docs/MSG-001-A08-STAGING-ACTIVATION-READINESS.md', docs);
write('docs/validation/MSG-001-A08-STAGING-ACTIVATION-READINESS.json', JSON.stringify(validation, null, 2));
write('scripts/audit-msg-001-a08-staging-activation-readiness.js', auditScript);
write('scripts/test-msg-001-a08-staging-activation-readiness.js', testScript);
write('.github/workflows/msg-001-a08-staging-activation-readiness.yml', permanentWorkflow);

const packagePath = path.join(root, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.scripts['audit:msg-001-a08-staging-activation-readiness'] = 'node scripts/audit-msg-001-a08-staging-activation-readiness.js';
packageJson.scripts['test:msg-001-a08-staging-activation-readiness'] = 'node scripts/test-msg-001-a08-staging-activation-readiness.js';
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

const matrixPath = path.join(root, 'config/domain-completion-matrix.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
matrix.version = '1.3.85';
matrix.updatedAt = observedAt;
const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');
if (!msg) throw new Error('MSG-001 matrix entry not found.');
addUnique(msg.requiredPaths, [
  'config/msg-001-a08-staging-activation-readiness.json',
  'docs/MSG-001-A08-STAGING-ACTIVATION-READINESS.md',
  'docs/validation/MSG-001-A08-STAGING-ACTIVATION-READINESS.json',
  'scripts/audit-msg-001-a08-staging-activation-readiness.js',
  'scripts/test-msg-001-a08-staging-activation-readiness.js',
  '.github/workflows/msg-001-a08-staging-activation-readiness.yml'
]);
addUnique(msg.tests, [
  'audit:msg-001-a08-staging-activation-readiness',
  'test:msg-001-a08-staging-activation-readiness'
]);
addUnique(msg.evidence, [
  'MSG-A08 freezes a repository-only, fail-closed staging activation order for command reliability, attachments, message Realtime and private Presence without executing remote effects.',
  'Every remote phase requires fresh explicit authorization, exact-head preflight, synthetic personas, run-scoped evidence and stop-on-first-failure behavior.',
  'Browser feature flags remain false during resource application and canaries; destructive rollback and routine migration-history rewriting are prohibited.'
]);
msg.nextActions = [
  'Use MSG-A08 as the mandatory activation gate; a generic continuation command does not authorize staging reads, migrations, deployments, Realtime settings or authenticated canaries.',
  'Execute MSG-A07B first only after fresh explicit staging authorization and record lost-response, replay, conflict and cross-actor evidence.',
  'Execute MSG-A05B, then MSG-A04B, then MSG-A06B only after the preceding phase passes and each phase receives its own explicit staging authorization.',
  'Keep attachmentLifecycleEnabled, messagesRealtimeEnabled and messagesPresenceEnabled false until their remote resources and isolation canaries pass.'
];
fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2) + '\n');

console.log('MSG-A08 repository files generated.');
