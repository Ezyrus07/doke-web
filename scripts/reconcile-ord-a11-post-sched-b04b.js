#!/usr/bin/env node
'use strict';

const fs = require('fs');

const path = 'scripts/audit-ord-001-a11-scheduling-authority-handoff.js';
let source = fs.readFileSync(path, 'utf8');
const before = "assert(orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));";
const after = `const b04bImplemented = fs.existsSync('docs/validation/SCHED-001-B04B-ORD-CANONICAL-WIRING-IMPLEMENTATION.json');\nif (b04bImplemented) {\n  assert(orderService.includes("'schedule_reservation_id',"));\n  assert(orderService.includes('scheduleReservationId: scheduleProjection.scheduleReservationId'));\n  assert(orderService.includes('p_scheduled_at: null'));\n  assert(!orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));\n} else {\n  assert(orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));\n}`;
if (!source.includes(after)) {
  if (!source.includes(before)) throw new Error('ORD-A11 raw scheduled_at assertion not found.');
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
}
fs.unlinkSync(__filename);
console.log('ORD-A11 auditor reconciled for post-SCHED-B04B state.');
