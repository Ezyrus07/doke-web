#!/usr/bin/env bash
set -euo pipefail
[[ "${PGHOST:-}" == "127.0.0.1" && "${PGPORT:-}" == "5432" && "${PGUSER:-}" == "kontrat_sandbox" && "${PGDATABASE:-}" == "msg_update_authority_ci" && -n "${PGPASSWORD:-}" ]] || { echo REFUSE_UNEXPECTED_PG_TARGET; exit 2; }
identity="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select current_user||'|'||current_database()||'|'||current_setting('server_version_num');")"
[[ "$identity" =~ ^kontrat_sandbox\|msg_update_authority_ci\|17[0-9]{4}$ ]] || { echo REFUSE_DATABASE_IDENTITY; exit 2; }
existing="$(psql -wAtX -v ON_ERROR_STOP=1 -c "select count(*) from information_schema.tables where table_schema='public' and table_name in ('users','conversations','messages');")"
[[ "$existing" == "0" ]] || { echo REFUSE_NONEMPTY_DATABASE; exit 2; }
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-update-authority-baseline.sql
psql -wX -v ON_ERROR_STOP=1 -f supabase/migrations/20261025022849_message_update_authority_guard.sql
psql -wX -v ON_ERROR_STOP=1 -f scripts/fixtures/msg-update-authority-regressions.sql
node scripts/test-message-update-read-filter.js
echo MSG_UPDATE_AUTHORITY_SYNTHETIC_CI_PASS
