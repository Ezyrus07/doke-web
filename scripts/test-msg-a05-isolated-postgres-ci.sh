#!/usr/bin/env bash
set -euo pipefail
# CI-only, synthetic PostgreSQL Docker service. Never connect to Supabase.
[[ "$PGHOST" == "127.0.0.1" && "$PGUSER" == "kontrat_sandbox" && "$PGDATABASE" == "kontrat_msg_a05_ci" && -n "$PGPASSWORD" ]] || { echo REFUSE_UNEXPECTED_PG_TARGET; exit 2; }
identity="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select current_user||'|'||current_database()||'|'||inet_server_addr();")"
[[ "$identity" == "kontrat_sandbox|kontrat_msg_a05_ci|127.0.0.1/32" || "$identity" == "kontrat_sandbox|kontrat_msg_a05_ci|127.0.0.1" ]] || { echo REFUSE_PG_IDENTITY; exit 2; }
backup="$(mktemp)"
restored="kontrat_msg_a05_ci_restored"
cleanup() { dropdb --if-exists "$restored" >/dev/null 2>&1 || true; rm -f "$backup"; }
trap cleanup EXIT
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-a05-postgres-isolated-baseline.sql
pg_dump -w -Fc -f "$backup" "$PGDATABASE"
psql -wX -v ON_ERROR_STOP=1 -f supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-a05-postgres-isolated-smoke.sql
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-a05-postgres-isolated-negative.sql
createdb -T template0 "$restored"
pg_restore --exit-on-error -w -d "$restored" "$backup"
restore_status="$(psql -wAtX -v ON_ERROR_STOP=1 -d "$restored" -c "select (to_regclass('private.transaction_attachment_lifecycle') is null)::text||'|'||(select count(*) from pg_policies where schemaname='storage' and policyname like 'transaction_attachments%')::text||'|'||(select count(*) from pg_proc where pronamespace='public'::regnamespace and proname like '%transaction_attachment%_internal')::text;")"
[[ "$restore_status" == "true|4|0" ]] || { echo RESTORE_GATE_FAILED; exit 1; }
echo MSG_A05_PG17_SYNTHETIC_CI_PASS
