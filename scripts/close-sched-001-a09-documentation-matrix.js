'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const matrixPath = path.join(ROOT, 'config', 'domain-completion-matrix.json');
const configPath = path.join(ROOT, 'config', 'sched-001-a09-staging-reconciliation.json');
const docPath = path.join(ROOT, 'docs', 'SCHED-001-A09-STAGING-RECONCILIATION.md');
const validationPath = path.join(ROOT, 'docs', 'validation', 'SCHED-001-A09-STAGING-RECONCILIATION.json');
const updatedAt = process.env.SCHED_A09_UPDATED_AT;

if (!updatedAt) throw new Error('SCHED_A09_UPDATED_AT_MISSING');

const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
if (matrix.version !== '1.3.49') {
  throw new Error(`SCHED_A09_UNEXPECTED_MATRIX_VERSION:${matrix.version}`);
}

const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
const flow = matrix.criticalFlows.find((item) => item.id === 'FLOW-06');
if (!sched || !ord || !flow) throw new Error('SCHED_A09_CANONICAL_TARGET_MISSING');
if (sched.maturity !== 2) throw new Error(`SCHED_A09_UNEXPECTED_MATURITY:${sched.maturity}`);
if (sched.serverAuthority !== 'partial') throw new Error('SCHED_A09_SERVER_AUTHORITY_DRIFT');
if (sched.stagingEvidence !== 'staging_canary') throw new Error('SCHED_A09_STAGING_EVIDENCE_DRIFT');

const blockerIds = new Set((sched.blockers || []).map((blocker) => blocker.id));
for (const id of ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']) {
  if (!blockerIds.has(id)) throw new Error(`SCHED_A09_EXPECTED_BLOCKER_MISSING:${id}`);
}

matrix.version = '1.3.50';
matrix.updatedAt = updatedAt;
sched.maturity = 3;

const requiredPaths = new Set(sched.requiredPaths || []);
for (const requiredPath of [
  'config/sched-001-a09-staging-reconciliation.json',
  'docs/SCHED-001-A09-STAGING-RECONCILIATION.md',
  'docs/validation/SCHED-001-A09-STAGING-RECONCILIATION.json'
]) requiredPaths.add(requiredPath);
sched.requiredPaths = Array.from(requiredPaths);

const staleEvidenceFragments = [
  'no implemented scheduling backend module exists',
  'scheduling backend module remains unimplemented',
  'No hold or reservation table',
  'it has not been applied',
  'absent A03/A04 authority objects and migrations'
];
sched.evidence = (sched.evidence || []).filter((item) =>
  !staleEvidenceFragments.some((fragment) => item.includes(fragment))
);

const freshEvidence = [
  'SCHED-A06 applied the canonical A03 reservation authority and A04 DST compatibility schema only to Doke staging, including schedule rules, reservations, idempotency, durable events, orders.schedule_reservation_id and the active-range GiST exclusion constraint.',
  'SCHED-A08 used the official Supabase CLI migration repair path: generated versions 20260731141315 and 20260731141349 were marked reverted, while canonical versions 20260731123000 and 20260731151000 were marked applied; no manual mutation of supabase_migrations.schema_migrations occurred.',
  'The broad local-versus-remote migration equality gate exposed pre-existing repository-wide legacy drift, but isolated verification confirmed the four frozen SCHED migration versions in the exact canonical state.',
  'The SCHED-A07 canary passed in one transaction ending in ROLLBACK and proved overlap rejection, adjacent reservation acceptance, DST fallback compatibility, scoped idempotency uniqueness, event uniqueness and order schedule projection.',
  'The canary fixture uses a published service with an approved version because requested orders require canonical service authority.',
  'Post-rollback verification found zero schedule rules, reservations, idempotency rows, schedule events, canary orders and orders linked to a schedule reservation; no test data remained persisted.',
  'Runtime activation, trusted composition root, ORD-001 wiring, workers, Cron, deploy, production and merge remain blocked.'
];
for (const item of freshEvidence) if (!sched.evidence.includes(item)) sched.evidence.push(item);

sched.blockers = (sched.blockers || []).filter((blocker) => blocker.id !== 'SCHED-B03');
sched.nextActions = [
  'Create the trusted server composition root for the existing scheduling command runtime and PostgreSQL adapter behind a staging-only fail-closed activation gate.',
  'Wire ORD-001 to consume schedule_reservation_id and scheduled_at only as the canonical reservation reference and projection, removing raw scheduled_at booking authority.',
  'Add authenticated persona and command-boundary canaries for the activated server composition before any frontend authority switch.',
  'Keep production, Cron, workers, deployment and merge blocked until SCHED-B02 and SCHED-B04 have independent evidence.'
];

ord.evidence = (ord.evidence || []).filter((item) =>
  !item.includes('The SCHED-A05 PostgreSQL adapter contains atomic order schedule projection SQL, but ORD-001 remains disconnected until migration application and remote canaries pass.')
);
const ordEvidence = 'SCHED-A08 completed the official migration-history repair and rolled-back remote overlap, adjacency, idempotency, event, DST and order-projection canaries; ORD-B04 remains open only for trusted runtime wiring to the canonical reservation authority.';
if (!ord.evidence.includes(ordEvidence)) ord.evidence.push(ordEvidence);
ord.nextActions = [
  'Keep ORD-B04 handed to SCHED-001 until the trusted scheduling composition root is active and independently canary-validated.',
  'Consume only schedule_reservation_id plus scheduled_at projection after SCHED-001 activation; do not restore raw scheduled_at booking authority.',
  'Complete the separately authorized ORD-B02 real two-context visual settlement canary.',
  'Keep PAY-001 and external staging release dependencies explicit under ORD-B03 and ORD-B05.'
];

flow.blockers = (flow.blockers || []).filter((id) => id !== 'SCHED-B03');

const evidence = {
  schemaVersion: 1,
  domain: 'SCHED-001',
  sublot: 'SCHED-A09',
  observedAt: updatedAt,
  environment: 'doke-web-staging',
  projectRef: 'zwkczgewzbsorbrjuzpb',
  sourceRunId: 30640486565,
  sourceJobId: 91193858536,
  sourceCommit: '6660aff20d028dd4737c4e0607c923d740cfacaa',
  migrationHistory: {
    canonicalApplied: ['20260731123000', '20260731151000'],
    generatedReverted: ['20260731141315', '20260731141349'],
    officialCliRepair: true,
    manualHistoryMutation: false
  },
  canary: {
    transactionRolledBack: true,
    assertions: [
      'overlap_rejected',
      'adjacent_reservation_accepted',
      'dst_fallback_compatible',
      'idempotency_scope_unique',
      'event_sequence_unique',
      'order_projection_written'
    ],
    residue: {
      scheduleAvailabilityRules: 0,
      scheduleReservations: 0,
      scheduleCommandIdempotency: 0,
      scheduleDomainEvents: 0,
      ordersWithReservation: 0,
      canaryOrders: 0
    }
  },
  matrixTransition: {
    fromVersion: '1.3.49',
    toVersion: '1.3.50',
    maturityFrom: 2,
    maturityTo: 3,
    closedBlockers: ['SCHED-B03'],
    remainingBlockers: ['SCHED-B02', 'SCHED-B04'],
    serverAuthority: 'partial',
    stagingEvidence: 'staging_canary',
    productionGate: 'blocked'
  },
  prohibitedActionsConfirmedAbsent: [
    'production_access',
    'runtime_activation',
    'ord_runtime_wiring',
    'cron_activation',
    'worker_activation',
    'deployment',
    'merge'
  ]
};

const markdown = `# SCHED-001 — A09 Staging Reconciliation\n\n## Resultado\n\nO histórico direcionado das migrations de SCHED-001 foi reconciliado pelo Supabase CLI oficial e o canário remoto passou em uma única transação terminada em \`ROLLBACK\`.\n\n## Histórico canônico\n\n- \`20260731123000\`: aplicada.\n- \`20260731151000\`: aplicada.\n- \`20260731141315\`: revertida.\n- \`20260731141349\`: revertida.\n- Nenhuma edição manual de \`supabase_migrations.schema_migrations\`.\n\n## Evidência do canário\n\nForam validados bloqueio de sobreposição, aceitação de reservas adjacentes, fallback DST, unicidade de idempotência, unicidade de eventos e projeção da reserva no pedido. O fixture usa um serviço publicado com versão aprovada, em conformidade com a autoridade canônica atual de pedidos.\n\n## Rollback e resíduos\n\nApós o \`ROLLBACK\`, todas as contagens canary permaneceram em zero: regras, reservas, idempotência, eventos, pedidos vinculados a reservas e pedidos marcados como SCHED-A07.\n\n## Transição da matriz\n\n- Matriz: \`1.3.49\` → \`1.3.50\`.\n- Maturidade SCHED: \`2\` → \`3\`.\n- \`SCHED-B03\`: encerrado.\n- \`SCHED-B02\` e \`SCHED-B04\`: permanecem abertos.\n- Autoridade server-side: \`partial\`.\n- Evidência: \`staging_canary\`.\n- Produção: \`blocked\`.\n\n## Limites preservados\n\nNenhum runtime foi ativado. ORD-001 não foi conectado. Nenhum Cron, worker, deploy, acesso à produção ou merge foi realizado.\n`;

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.mkdirSync(path.dirname(docPath), { recursive: true });
fs.mkdirSync(path.dirname(validationPath), { recursive: true });
fs.writeFileSync(configPath, JSON.stringify(evidence, null, 2) + '\n');
fs.writeFileSync(docPath, markdown);
fs.writeFileSync(validationPath, JSON.stringify(evidence, null, 2) + '\n');
fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2) + '\n');

console.log('SCHED-A09 documentation and matrix patch prepared.');
