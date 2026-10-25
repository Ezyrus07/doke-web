#!/usr/bin/env bash
set -euo pipefail
# Disposable unlinked Supabase CLI project; no hosted credentials or writes.
[[ "$GITHUB_ACTIONS" == true && "$KONTRAT_ISOLATED_STORAGE_TEST" == true &&
 "$RUNNER_OS" == Linux && -n "$RUNNER_TEMP" ]] || { echo REFUSE_NON_CI_RUNNER; exit 2; }
for tool in supabase docker psql node; do command -v "$tool" >/dev/null || exit 2; done
root="$(mktemp -d "$RUNNER_TEMP/kontrat-storage-native-XXXXXXXX")"
project="$root/disposable-supabase-project"
mkdir -p "$project"
started=false
cleanup() {
 if [[ "$started" == true ]]; then
   supabase stop --workdir "$project" --no-backup >/dev/null 2>&1 || echo ISOLATED_STOP_WARNING
 fi
 rm -rf -- "$root"
}
trap cleanup EXIT
unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_URL
supabase init --workdir "$project" --yes >/dev/null
[[ ! -f "$project/supabase/.branches/_current_branch" ]] || { echo REFUSE_LINKED_PROJECT; exit 2; }
node - "$project/supabase/config.toml" <<'NODE'
const fs=require('node:fs');
const file=process.argv[2];
let content=fs.readFileSync(file,'utf8');
const pattern=/(major_version\s*=\s*)["']?\d+["']?/;
if(!pattern.test(content))throw Error('MAJOR_VERSION_CONFIG_MISSING');
fs.writeFileSync(file,content.replace(pattern,'$1"17"'),'utf8');
NODE
supabase start --workdir "$project" --yes \
 --exclude analytics,edge-runtime,functions,imgproxy,inbucket,meta,realtime,studio,vector \
 > "$root/start.log" 2>&1 || {
 echo ISOLATED_SUPABASE_START_FAILED
 grep -Ei '(error|failed|unhealthy|cannot|timeout)' "$root/start.log" | tail -n 25 || true
 exit 1
 }
started=true
supabase status --workdir "$project" -o json > "$root/status.json"
db_url="$(node - "$root/status.json" <<'NODE'
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!/^postgres(?:ql)?:\/\/postgres:[^@]+@127\.0\.0\.1:54322\/postgres$/.test(data.DB_URL||''))throw Error('REFUSE_NON_LOCAL_DATABASE');
if(data.API_URL!=='http://127.0.0.1:54321')throw Error('REFUSE_NON_LOCAL_API');
process.stdout.write(data.DB_URL);
NODE
)"
version="$(psql -X -w -At -v ON_ERROR_STOP=1 -d "$db_url" -c "select current_setting('server_version_num')")"
[[ "$version" =~ ^17[0-9]{4}$ ]] || { echo REFUSE_NOT_POSTGRES17; exit 2; }
existing="$(psql -X -w -At -v ON_ERROR_STOP=1 -d "$db_url" -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('users','orders','conversations','messages')")"
[[ "$existing" == 0 ]] || { echo REFUSE_NONEMPTY_PUBLIC_SCHEMA; exit 2; }
psql -X -w -v ON_ERROR_STOP=1 -d "$db_url" -f scripts/fixtures/msg-storage-api-native-local-baseline.sql > "$root/fixture.log"
psql -X -w -v ON_ERROR_STOP=1 -d "$db_url" -f supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql > "$root/migration.log"
psql -X -w -v ON_ERROR_STOP=1 -d "$db_url" -f supabase/migrations/20261025022849_message_update_authority_guard.sql > "$root/guard.log"
echo ISOLATED_NATIVE_STORAGE_MIGRATIONS_APPLIED
export KONTRAT_LOCAL_STATUS_FILE="$root/status.json"
node scripts/test-msg-storage-api-native.mjs
echo MSG_A05_NATIVE_STORAGE_API_CI_PASS_ISOLATED_ONLY
