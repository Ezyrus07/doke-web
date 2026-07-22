'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const migration = [
  read('supabase/migrations/062_order_operational_alerts.sql'),
  read('supabase/migrations/063_order_operational_alert_evaluator.sql'),
  read('supabase/migrations/064_order_operational_alert_schedule.sql'),
  read('supabase/migrations/065_order_operational_alert_cron_race_hardening.sql'),
].join('\n');
const edge = read('supabase/functions/order-event-operations/index.ts');
const html = read('admin-pedidos-operacao.html');
const controller = read('assets/js/pages/admin-order-operations.js');
const repository = read('assets/js/repositories/order-event-operations-repository.js');
const css = read('assets/css/pages/admin-order-operations.css');

[
  'private.order_operational_alerts',
  'private.order_operational_alert_evaluations',
  'private.capture_order_operational_health_snapshot',
  'private.classify_order_operational_alerts',
  'private.evaluate_order_operational_alerts',
  'public.get_order_operational_alerts_internal',
  "'orders.worker.dead_letter'",
  "'orders.worker.stale_claim'",
  "'orders.worker.cron_inactive'",
  "'orders.worker.success_rate_degraded'",
  "'orders.worker.retry_backlog'",
  'next_notification_at',
  'silence_minutes',
  'cycle_count',
  'notification_count',
  "'doke-order-operational-alerts'",
  "'*/5 * * * *'",
  'order-ops-alert:',
  "u.role in ('support', 'admin')",
].forEach((snippet) => assert.ok(migration.includes(snippet), `alert migration missing ${snippet}`));

assert.ok(
  migration.includes('revoke all on function public.get_order_operational_alerts_internal(uuid, integer) from public, anon, authenticated'),
  'alert projection must not be callable from browser roles',
);
assert.ok(
  migration.includes('grant execute on function public.get_order_operational_alerts_internal(uuid, integer) to service_role'),
  'alert projection must be service-role only',
);
assert.ok(migration.includes("status = 'resolved'"), 'recovered incidents must resolve automatically');
assert.ok(migration.includes('on conflict (user_id, event_key)'), 'notifications must be idempotent per recipient and alert emission');
assert.ok(migration.includes('make_interval(mins => v_alert.silence_minutes)'), 'repeat notifications must honor silence windows');
assert.ok(migration.includes('v_existing.status = \'resolved\''), 'reopened alerts must start a new alert cycle');
assert.ok(migration.includes("('succeeded', 'success', 'running')"), 'a fresh running worker cron must not trigger a race-condition alert');

assert.ok(edge.includes('get_order_operational_alerts_internal'), 'operations Edge Function must load the alert projection');
assert.ok(edge.includes('operationalAlerts: operationalAlerts || {}'), 'dashboard response must expose the alert projection');
assert.ok(repository.includes('alertLimit'), 'browser repository must request a bounded alert projection');
assert.ok(!repository.includes('private.order_operational_alerts'), 'browser repository must not access private alert tables');

[
  'data-admin-ops-stat="active-alerts"',
  'data-admin-ops-alert-count',
  'data-admin-ops-alerts',
].forEach((snippet) => assert.ok(html.includes(snippet), `operations page missing ${snippet}`));

assert.ok(controller.includes('renderOperationalAlerts'), 'operations controller must render automatic alerts');
assert.ok(controller.includes('data.operationalAlerts'), 'operations controller must consume the server projection');
assert.ok(css.includes('.admin-ops-alert-item[data-severity="critical"]'), 'critical alerts must have a visible severity state');
assert.ok(!html.includes('SUPABASE_SERVICE_ROLE_KEY'), 'operations page must not expose server credentials');

console.log('[test:order-operational-alerts-contract] ok');
console.log('- five automatic health signals with dedupe, silence and auto-resolution');
console.log('- service-role-only projection and recipient-scoped notifications');
console.log('- admin panel rendering without private-table access');
