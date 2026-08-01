'use strict';

const { assertTransactionPort } = require('./scheduling-repository-port');

const DEFAULT_ISOLATION_LEVEL = 'serializable';
const DEFAULT_LOCK_TIMEOUT_MS = 5000;
const DEFAULT_STATEMENT_TIMEOUT_MS = 15000;
const ALLOWED_ISOLATION_LEVELS = Object.freeze(['serializable', 'repeatable read', 'read committed']);

function createSchedulingPostgresRepository(options) {
  const config = options || {};
  const pool = config.pool;
  if (!pool || typeof pool.connect !== 'function') {
    throw repositoryError('DOKE_SCHEDULE_POSTGRES_POOL_REQUIRED', 'A PostgreSQL pool with connect() is required.');
  }
  const isolationLevel = normalizeIsolationLevel(config.isolationLevel);
  const lockTimeoutMs = readTimeout(config.lockTimeoutMs, DEFAULT_LOCK_TIMEOUT_MS);
  const statementTimeoutMs = readTimeout(config.statementTimeoutMs, DEFAULT_STATEMENT_TIMEOUT_MS);

  return Object.freeze({
    async transaction(handler) {
      if (typeof handler !== 'function') {
        throw repositoryError('DOKE_SCHEDULE_TRANSACTION_HANDLER_REQUIRED', 'A transaction callback is required.');
      }
      const client = await pool.connect();
      let began = false;
      try {
        await client.query(`begin isolation level ${isolationLevel} read write`);
        began = true;
        await client.query("select pg_catalog.set_config('lock_timeout', $1, true)", [`${lockTimeoutMs}ms`]);
        await client.query("select pg_catalog.set_config('statement_timeout', $1, true)", [`${statementTimeoutMs}ms`]);
        const tx = createTransactionPort(client);
        assertTransactionPort(tx);
        const result = await handler(tx);
        await client.query('commit');
        return result;
      } catch (error) {
        if (began) {
          try {
            await client.query('rollback');
          } catch (rollbackError) {
            error.rollbackError = rollbackError;
          }
        }
        throw error;
      } finally {
        if (client && typeof client.release === 'function') client.release();
      }
    }
  });
}

function createTransactionPort(client) {
  const query = (text, values) => client.query(text, values);

  return Object.freeze({
    async claimIdempotency(record) {
      const inserted = await query(
        `/* sched-a05:claim-idempotency-insert */
         insert into private.schedule_command_idempotency (
           command_name, principal_key, idempotency_key, request_hash, state,
           created_at, expires_at
         ) values ($1, $2, $3, $4, 'in_progress', $5, $6)
         on conflict (command_name, principal_key, idempotency_key) do nothing
         returning *`,
        [record.commandName, record.principalKey, record.idempotencyKey, record.requestHash, record.claimedAt, record.expiresAt]
      );
      if (inserted.rows && inserted.rows[0]) return { ...toCamelRow(inserted.rows[0]), state: 'claimed' };
      const existing = await query(
        `/* sched-a05:claim-idempotency-read */
         select * from private.schedule_command_idempotency
         where command_name = $1 and principal_key = $2 and idempotency_key = $3
         for update`,
        [record.commandName, record.principalKey, record.idempotencyKey]
      );
      if (!existing.rows || !existing.rows[0]) {
        throw repositoryError('DOKE_SCHEDULE_IDEMPOTENCY_CLAIM_MISSING', 'The idempotency row disappeared during claim arbitration.');
      }
      return toCamelRow(existing.rows[0]);
    },

    async completeIdempotency(record) {
      const response = await query(
        `/* sched-a05:complete-idempotency */
         update private.schedule_command_idempotency
         set state = 'completed', aggregate_type = $5, aggregate_id = $6,
             availability_rule_id = $7, reservation_id = $8,
             result_payload = $9::jsonb, error_payload = null, completed_at = $10
         where command_name = $1 and principal_key = $2 and idempotency_key = $3
           and request_hash = $4 and state = 'in_progress'
         returning *`,
        [record.commandName, record.principalKey, record.idempotencyKey, record.requestHash,
          record.aggregateType, record.aggregateId, record.availabilityRuleId, record.reservationId,
          JSON.stringify(record.resultPayload || {}), record.completedAt]
      );
      return requireRow(response, 'DOKE_SCHEDULE_IDEMPOTENCY_COMPLETION_CONFLICT');
    },

    async getAvailabilityRule(id) {
      const response = await query(
        `/* sched-a05:get-availability-rule */
         select id, professional_id, timezone, rule, status, version, created_by, created_at, updated_at
         from public.schedule_availability_rules where id = $1`, [id]
      );
      return optionalRow(response);
    },

    async insertAvailabilityRule(row) {
      const response = await query(
        `/* sched-a05:insert-availability-rule */
         insert into public.schedule_availability_rules (
           id, professional_id, timezone, rule, status, version, created_by, created_at, updated_at
         ) values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9) returning *`,
        [row.id, row.professionalId, row.timezone, JSON.stringify(row.rule || {}), row.status,
          row.version, row.createdBy, row.createdAt, row.updatedAt]
      );
      return requireRow(response, 'DOKE_SCHEDULE_AVAILABILITY_INSERT_FAILED');
    },

    async updateAvailabilityRule(id, expectedVersion, patch) {
      const response = await query(
        `/* sched-a05:update-availability-rule */
         update public.schedule_availability_rules
         set timezone = $3, rule = $4::jsonb, status = $5, version = $6, updated_at = $7
         where id = $1 and version = $2 returning *`,
        [id, expectedVersion, patch.timezone, JSON.stringify(patch.rule || {}), patch.status, patch.version, patch.updatedAt]
      );
      return requireVersionedRow(response);
    },

    async getOrder(id) {
      const response = await query(
        `/* sched-a05:get-order */
         select id, client_id, professional_id, status, scheduled_at, schedule_reservation_id
         from public.orders where id = $1`, [id]
      );
      return optionalRow(response);
    },

    async isRangeAvailable(range) {
      const response = await query(
        `/* sched-a05:list-active-availability-rules */
         select id, professional_id, timezone, rule, status, version
         from public.schedule_availability_rules
         where professional_id = $1 and status = 'active'
         order by updated_at desc, id asc`, [range.professionalId]
      );
      return (response.rows || []).some((row) => ruleContainsRange(toCamelRow(row), range));
    },

    async listActiveReservations(professionalId, range) {
      const values = [professionalId, range.startsAt, range.endsAt];
      let exclusion = '';
      if (range.excludeReservationId) {
        values.push(range.excludeReservationId);
        exclusion = 'and id <> $4';
      }
      const response = await query(
        `/* sched-a05:list-active-reservations */
         select * from public.schedule_reservations
         where professional_id = $1 and status in ('held', 'confirmed')
           and tstzrange(starts_at, ends_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
           ${exclusion}
         order by starts_at asc, id asc`, values
      );
      return (response.rows || []).map(toCamelRow);
    },

    async insertReservation(row) {
      const response = await query(
        `/* sched-a05:insert-reservation */
         insert into public.schedule_reservations (
           id, professional_id, order_id, starts_at, ends_at, timezone,
           local_start, local_end, resolved_offset_minutes, status,
           hold_expires_at, version, idempotency_key, created_by, created_at, updated_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning *`,
        [row.id, row.professionalId, row.orderId, row.startsAt, row.endsAt, row.timezone,
          row.localStart, row.localEnd, row.resolvedOffsetMinutes, row.status, row.holdExpiresAt,
          row.version, row.idempotencyKey, row.createdBy, row.createdAt, row.updatedAt]
      );
      return requireRow(response, 'DOKE_SCHEDULE_RESERVATION_INSERT_FAILED');
    },

    async getReservationForUpdate(id) {
      const response = await query(
        `/* sched-a05:get-reservation-for-update */
         select * from public.schedule_reservations where id = $1 for update`, [id]
      );
      return optionalRow(response);
    },

    async updateReservation(id, expectedVersion, patch) {
      const response = await query(
        `/* sched-a05:update-reservation */
         update public.schedule_reservations
         set starts_at = coalesce($3, starts_at), ends_at = coalesce($4, ends_at),
             timezone = coalesce($5, timezone), local_start = coalesce($6, local_start),
             local_end = coalesce($7, local_end),
             resolved_offset_minutes = coalesce($8, resolved_offset_minutes),
             status = coalesce($9, status), hold_expires_at = $10,
             version = $11, updated_at = $12
         where id = $1 and version = $2 returning *`,
        [id, expectedVersion, patch.startsAt || null, patch.endsAt || null, patch.timezone || null,
          patch.localStart || null, patch.localEnd || null,
          patch.resolvedOffsetMinutes == null ? null : patch.resolvedOffsetMinutes,
          patch.status || null, patch.holdExpiresAt == null ? null : patch.holdExpiresAt,
          patch.version, patch.updatedAt]
      );
      return requireVersionedRow(response);
    },

    async insertEvent(event) {
      const payload = { ...(event.payload || {}), _eventMeta: {
        correlationId: event.correlationId || null, causationId: event.causationId || null
      } };
      const response = await query(
        `/* sched-a05:insert-event */
         insert into private.schedule_domain_events (
           event_key, aggregate_type, aggregate_id, availability_rule_id,
           reservation_id, order_id, professional_id, sequence_no, event_type,
           actor_id, actor_role, command, payload, occurred_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14) returning *`,
        [event.eventKey, event.aggregateType, event.aggregateId, event.availabilityRuleId,
          event.reservationId, event.orderId, event.professionalId, event.sequenceNo,
          event.eventType, event.actorId, event.actorRole, event.command,
          JSON.stringify(payload), event.occurredAt]
      );
      return requireRow(response, 'DOKE_SCHEDULE_EVENT_INSERT_FAILED');
    },

    async projectOrderSchedule(orderId, reservationId, scheduledAt) {
      const response = await query(
        `/* sched-a05:project-order-schedule */
         select *
         from private.apply_order_schedule_projection(
           $1::uuid,
           $2::uuid,
           $3::timestamptz
         )`,
        [orderId, reservationId, scheduledAt]
      );
      return requireRow(response, 'DOKE_SCHEDULE_ORDER_PROJECTION_FAILED');
    },

    async clearOrderSchedule(orderId, reservationId) {
      const response = await query(
        `/* sched-a05:clear-order-schedule */
         select *
         from private.clear_order_schedule_projection(
           $1::uuid,
           $2::uuid
         )`,
        [orderId, reservationId]
      );
      return requireRow(response, 'DOKE_SCHEDULE_ORDER_CLEAR_FAILED');
    },

    async listExpiredHolds(cutoff, limit) {
      const response = await query(
        `/* sched-a05:list-expired-holds */
         select * from public.schedule_reservations
         where status = 'held' and hold_expires_at <= $1
         order by hold_expires_at asc, id asc
         for update skip locked limit $2`, [cutoff, limit]
      );
      return (response.rows || []).map(toCamelRow);
    }
  });
}

// Unknown rule shapes and cross-local-date ranges fail closed.
function ruleContainsRange(ruleRow, range) {
  if (!ruleRow || ruleRow.status !== 'active' || ruleRow.timezone !== range.timezone) return false;
  const start = parseLocal(range.localStart);
  const end = parseLocal(range.localEnd);
  if (!start || !end || start.date !== end.date || end.minute <= start.minute) return false;
  const rule = ruleRow.rule;
  if (!rule || !Array.isArray(rule.weekdays) || !Array.isArray(rule.windows)) return false;
  const weekday = new Date(`${start.date}T00:00:00.000Z`).getUTCDay();
  if (!rule.weekdays.map(Number).includes(weekday)) return false;
  return rule.windows.some((window) => {
    const windowStart = parseClock(window && window.start);
    const windowEnd = parseClock(window && window.end);
    return windowStart != null && windowEnd != null && windowEnd > windowStart
      && start.minute >= windowStart && end.minute <= windowEnd;
  });
}

function parseLocal(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d{1,6})?)?$/);
  if (!match) return null;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (hour > 23 || minute > 59) return null;
  return { date: match[1], minute: hour * 60 + minute };
}

function parseClock(value) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function toCamelRow(row) {
  if (!row || typeof row !== 'object') return row || null;
  const output = {};
  Object.entries(row).forEach(([key, value]) => {
    output[key.replace(/_([a-z])/g, (_, char) => char.toUpperCase())] = value;
  });
  return output;
}

function optionalRow(response) {
  return response && response.rows && response.rows[0] ? toCamelRow(response.rows[0]) : null;
}

function requireRow(response, code) {
  const row = optionalRow(response);
  if (!row) throw repositoryError(code, 'The PostgreSQL mutation returned no canonical row.');
  return row;
}

function requireVersionedRow(response) {
  if (!response || !response.rows || !response.rows[0]) {
    const error = new Error('VERSION');
    error.code = '40001';
    throw error;
  }
  return toCamelRow(response.rows[0]);
}

function normalizeIsolationLevel(value) {
  const normalized = String(value || DEFAULT_ISOLATION_LEVEL).trim().toLowerCase();
  if (!ALLOWED_ISOLATION_LEVELS.includes(normalized)) {
    throw repositoryError('DOKE_SCHEDULE_POSTGRES_ISOLATION_INVALID', 'Unsupported PostgreSQL isolation level.');
  }
  return normalized;
}

function readTimeout(value, fallback) {
  const parsed = Number(value == null ? fallback : value);
  if (!Number.isInteger(parsed) || parsed < 100 || parsed > 120000) {
    throw repositoryError('DOKE_SCHEDULE_POSTGRES_TIMEOUT_INVALID', 'PostgreSQL transaction timeout is outside the allowed range.');
  }
  return parsed;
}

function repositoryError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

module.exports = Object.freeze({
  DEFAULT_ISOLATION_LEVEL,
  DEFAULT_LOCK_TIMEOUT_MS,
  DEFAULT_STATEMENT_TIMEOUT_MS,
  createSchedulingPostgresRepository,
  createTransactionPort,
  ruleContainsRange,
  toCamelRow
});
