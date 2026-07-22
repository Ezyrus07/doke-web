'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const migration = read('supabase/migrations/074_order_operational_remediation_runbooks.sql');
const edge = read('supabase/functions/order-event-operations/index.ts');
const operations = read('supabase/functions/order-event-operations/operations.mjs');
const repository = read('assets/js/repositories/order-event-operations-repository.js');
const controller = read('assets/js/pages/admin-order-operations.js');
const html = read('admin-pedidos-operacao.html');
const css = read('assets/css/pages/admin-order-operations.css');
const docs = read('docs/ORDER-OPERATIONAL-REMEDIATION-RUNBOOK.md');

[
  'private.order_operational_runbook_executions',
  'private.order_operational_runbook_descriptor',
  'private.build_order_operational_runbook_preview',
  'public.get_order_operational_runbooks_internal',
  'public.preview_order_operational_runbook_internal',
  'public.execute_order_operational_runbook_internal',
  'dead_letter_recovery',
  'stale_claim_recovery',
  'cron_health_recovery',
  'retry_backlog_recovery',
  'success_rate_diagnostic',
  "requires_admin_approval",
  "extensions.digest(v_token, 'sha256')",
  "'EXECUTAR ' || v_confirmation_code",
  "v_execution.risk_level = 'elevated'",
  "v_preview - 'observedAt'",
  "v_current_preview - 'observedAt'",
  'private.recover_stale_order_event_claims(300)',
  'private.invoke_order_event_worker_if_needed()',
  'private.evaluate_order_operational_alerts(now())',
].forEach((snippet) => assert.ok(migration.includes(snippet), `runbook migration missing ${snippet}`));

assert.ok(migration.includes("extensions.digest((v_preview - 'observedAt')::text, 'sha256')"));
assert.ok(migration.includes("extensions.digest(coalesce(p_approval_token, ''), 'sha256')"));
assert.ok(migration.includes('revoke all on function public.preview_order_operational_runbook_internal(uuid, uuid)'));
assert.ok(migration.includes('revoke all on function public.execute_order_operational_runbook_internal(uuid, uuid, text, text, text, text)'));
assert.ok(migration.includes('grant execute on function public.preview_order_operational_runbook_internal(uuid, uuid) to service_role'));
assert.ok(migration.includes('grant execute on function public.execute_order_operational_runbook_internal(uuid, uuid, text, text, text, text) to service_role'));
assert.ok(edge.includes('action === "runbook_preview"'));
assert.ok(edge.includes('action === "runbook_execute"'));
assert.ok(edge.includes('get_order_operational_runbooks_internal'));
assert.ok(operations.includes("'runbook_preview'"));
assert.ok(operations.includes("'runbook_execute'"));
assert.ok(repository.includes('previewRunbook'));
assert.ok(repository.includes('executeRunbook'));
assert.ok(controller.includes('openRunbookDialog'));
assert.ok(controller.includes('renderRunbookPreview'));
assert.ok(controller.includes('submitRunbook'));
assert.ok(html.includes('data-admin-ops-runbook-dialog'));
assert.ok(html.includes('data-admin-ops-runbook-confirmation'));
assert.ok(html.includes('data-admin-ops-runbook-note'));
assert.ok(html.includes('doke-modal-surface--form doke-overlay__surface'));
assert.ok(html.includes('doke-modal-header doke-overlay__header'));
assert.ok(html.includes('doke-modal-body doke-overlay__body admin-ops-runbook-body'));
assert.ok(html.includes('doke-modal-actions doke-overlay__actions'));
assert.ok(css.includes('admin-ops-runbook-overview'));
assert.ok(css.includes('admin-ops-runbook-risk'));
assert.ok(css.includes('grid-template-rows: auto minmax(0, 1fr) auto'));
assert.ok(css.includes('.admin-ops-runbook-dialog .doke-modal-surface'));
assert.ok(css.includes('max-height: none'));
assert.ok(docs.includes('Prévia obrigatória'));
assert.ok(!repository.includes('SUPABASE_SERVICE_ROLE_KEY'));
assert.ok(!repository.includes('SUPABASE_SECRET_KEY'));
assert.ok(!html.includes('service_role'));

console.log('[test:order-operational-runbooks-contract] ok');
console.log('- closed runbook catalog with preview, confirmation and audit');
console.log('- elevated actions restricted to administrators');
console.log('- post-action verification and no privileged browser credentials');
