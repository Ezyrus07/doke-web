#!/usr/bin/env bash
set -euo pipefail
# Runtime execution requires separate Etapa B authorization. A2 only prepares/parses this runner.
[[ "$#" -le 1 ]] || { echo REFUSE_ORDER_ARGUMENTS; exit 2; }
order="${1:-${KONTRAT_STORAGE_MIGRATION_ORDER:-both}}"
case "$order" in both|a05-first|guard-first) ;; *) echo REFUSE_UNKNOWN_MIGRATION_ORDER; exit 2 ;; esac
mode=ci
if [[ "${GITHUB_ACTIONS:-false}" == true ]]; then
 [[ "${RUNNER_OS:-}" == Linux && -n "${RUNNER_TEMP:-}" ]] || { echo REFUSE_NON_CI_RUNNER; exit 2; }
else
 mode=local
 [[ "${KONTRAT_LOCAL_STORAGE_RUN:-false}" == true && "$(uname -s)" == Linux ]] || { echo REFUSE_NON_ISOLATED_LOCAL_RUNNER; exit 2; }
 RUNNER_TEMP="${TMPDIR:-/tmp}"
fi
[[ "${KONTRAT_ISOLATED_STORAGE_TEST:-false}" == true ]] || { echo REFUSE_MISSING_ISOLATION_CONSENT; exit 2; }
for tool in supabase docker psql node; do command -v "$tool" >/dev/null || exit 2; done
umask 077
node - "$RUNNER_TEMP" "$PWD" <<'NODE'
const fs=require('node:fs'),path=require('node:path');
const tmp=fs.realpathSync(process.argv[2]),repo=fs.realpathSync(process.argv[3]);
const relative=path.relative(repo,tmp);
if(!relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('REFUSE_TEMP_INSIDE_CANDIDATE');
NODE
if [[ "$order" == both ]]; then
 aggregate="$(mktemp -d "$RUNNER_TEMP/kontrat-storage-orders-XXXXXXXX")"
 script="$(cd -- "$(dirname -- "$0")" && pwd)/$(basename -- "$0")"
 verify_receipts() {
  node - "$aggregate" "$@" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=process.argv[2],logs=process.argv.slice(3);
const runs=logs.map(file=>{
 const matches=fs.readFileSync(file,'utf8').split('\n').flatMap(line=>{
  try{const v=JSON.parse(line);return v.kind==='P31_STORAGE_ORDER_PASS'?[v]:[];}catch{return [];}
 });
 assert.equal(matches.length,1,'MISSING_OR_AMBIGUOUS_ORDER_RECEIPT');
 const r=matches[0];assert.equal(r.cleanup,'complete');assert.equal(r.result,'PASS');
 assert.equal(r.migrations.length,2);
 const allowed=['supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql','supabase/migrations/20261025022849_message_update_authority_guard.sql'];
 const expected=r.order==='a05-first'?allowed:[...allowed].reverse();
 assert.deepEqual(r.migrations.map(m=>m.file),expected,'MIGRATION_ORDER_RECEIPT_DRIFT');
 for(const m of r.migrations)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(m.file)).digest('hex'),m.sha256,'CURRENT_SQL_SOURCE_DRIFT');
 return r;
});
assert.equal(runs[0].order,'a05-first');
if(runs.length===2){
 const [n,r]=runs;assert.equal(r.order,'guard-first');
 for(const field of ['root','projectId','dbContainerId','dbSystemId'])assert.notEqual(n[field],r[field],'REUSED_'+field);
 assert.ok(n.volumes.length&&r.volumes.length);assert.ok(!n.volumes.some(v=>r.volumes.includes(v)),'REUSED_VOLUME');
 const hashes=run=>Object.fromEntries(run.migrations.map(m=>[m.file,m.sha256]));
 assert.deepEqual(hashes(n),hashes(r),'MIGRATION_SOURCE_DRIFT_BETWEEN_ORDERS');
}
fs.writeFileSync(path.join(root,'orders.json'),JSON.stringify({result:runs.length===2?'PASS':'PENDING_R',runs},null,2)+'\n');
NODE
 }
 # A child emits PASS only after its own verified cleanup. Any failure blocks R.
 if ! bash "$script" a05-first > "$aggregate/N.log" 2>&1; then
  echo "N_FAILED_R_NOT_RUN evidence=$aggregate"; exit 1
 fi
 verify_receipts "$aggregate/N.log"
 if ! bash "$script" guard-first > "$aggregate/R.log" 2>&1; then
  echo "R_FAILED_NO_AGGREGATE_PASS evidence=$aggregate"; exit 1
 fi
 verify_receipts "$aggregate/N.log" "$aggregate/R.log"
 echo "MSG_A05_NATIVE_STORAGE_API_CI_PASS_ISOLATED_ONLY evidence=$aggregate"
 exit 0
fi
node scripts/generate-msg-staging-catalog-fixture.js --check
node scripts/generate-msg-staging-catalog-fixture.js --native-storage --check
docker_endpoint="$(docker context inspect --format '{{.Endpoints.docker.Host}}')"
if [[ -z "${DOCKER_CONTEXT:-}" && -n "${DOCKER_HOST:-}" ]]; then docker_endpoint="$DOCKER_HOST"; fi
[[ "$docker_endpoint" == unix:///* || "$docker_endpoint" == npipe:* ]] || { echo REFUSE_REMOTE_DOCKER; exit 2; }
node - <<'NODE'
const net=require('node:net');
(async()=>{for(const port of [54321,54322])await new Promise((resolve,reject)=>{
 const s=net.createServer();s.once('error',()=>reject(Error('ISOLATED_PORT_IN_USE_'+port)));
 s.listen(port,'127.0.0.1',()=>s.close(resolve));
});})().catch(()=>{console.error('REFUSE_OCCUPIED_STORAGE_PORT');process.exitCode=2;});
NODE
# Local preflight must pin the actual CLI defaults, cached images and HTTP contract; no pull command.
if [[ "$mode" == local ]]; then
 [[ -f "${KONTRAT_STORAGE_PREFLIGHT_FILE:-}" ]] || { echo REFUSE_MISSING_LOCAL_PREFLIGHT; exit 2; }
 export KONTRAT_STORAGE_HTTP_CONTRACT
 KONTRAT_STORAGE_HTTP_CONTRACT="$(node - "$KONTRAT_STORAGE_PREFLIGHT_FILE" <<'NODE'
const fs=require('node:fs'),cp=require('node:child_process');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(p.cliVersion!=='2.109.0'||p.cliVersion!==cp.execFileSync('supabase',['--version'],{encoding:'utf8'}).trim())throw Error('CLI_VERSION_DRIFT');
if(!['legacy-status-code','error-codes-v2'].includes(p.httpContract)||p.isolatedHost!==true)throw Error('PREFLIGHT_CONTRACT_MISSING');
for(const service of ['db','auth','kong','rest','storage']){
 const image=p.images?.find(i=>i.service===service);
 if(!image||!/^sha256:[0-9a-f]{64}$/.test(image.id)||!/^\S+:\S+$/.test(image.ref))throw Error('PINNED_IMAGE_REQUIRED');
 const actual=cp.execFileSync('docker',['image','inspect',image.ref,'--format','{{.Id}}'],{encoding:'utf8'}).trim();
 if(actual!==image.id)throw Error('IMAGE_ID_DRIFT');
}
process.stdout.write(p.httpContract);
NODE
)"
 [[ -z "$(docker ps -q)" ]] || { echo REFUSE_CONCURRENT_LOCAL_CONTAINERS; exit 2; }
fi
root="$(mktemp -d "$RUNNER_TEMP/kontrat-storage-native-XXXXXXXX")"
project="$root/disposable-supabase-project"
project_id="$(basename "$root")"
mkdir -p "$project"
started=false
owned=false
passed=false
redact() {
 node -e 'let s="";process.stdin.on("data",b=>s+=b).on("end",()=>process.stdout.write(s.split("\n").map(l=>/secret|password|token|anon.?key|service.?role/i.test(l)?"[REDACTED_CREDENTIAL_LINE]":l).join("\n").replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,"[REDACTED_JWT]").replace(/postgres(?:ql)?:\/\/[^\s]+/g,"[REDACTED_DB_URL]").replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g,"[REDACTED_KEY]")));'
}
# All resource inspection is metadata-only. Unknown ownership must never trigger cleanup.
resource_state() {
 node - "$project_id" "$project" "$1" <<'NODE'
const cp=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
const [id,project,stage]=process.argv.slice(2),label='com.supabase.cli.project';
const run=args=>cp.execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const list=args=>run(args).split(/\s+/).filter(Boolean);
const filtered=kind=>[...new Set([
 ...list([...kind,'--filter','label='+label+'='+id]),
 ...list([...kind,'--filter','name=_'+id+'$'])
])];
const containerIds=filtered(['ps','-aq']);
const volumeNames=filtered(['volume','ls','-q']);
const networkIds=filtered(['network','ls','-q']);
if(stage==='fresh'||stage==='empty'){
 if(containerIds.length||volumeNames.length||networkIds.length)throw Error(stage==='fresh'?'REFUSE_PREEXISTING_PROJECT_RESOURCES':'CLEANUP_INCOMPLETE');
 console.log(JSON.stringify({projectId:id,stage,containers:[],volumes:[],networks:[]}));process.exit(0);
}
const volumes=volumeNames.map(name=>JSON.parse(run(['volume','inspect',name]))[0]);
for(const v of volumes)if(v.Labels?.[label]!==id||!v.Name.endsWith('_'+id))throw Error('VOLUME_OWNERSHIP_UNPROVEN');
const networks=networkIds.map(n=>JSON.parse(run(['network','inspect',n]))[0]);
for(const n of networks)if(n.Labels?.[label]!==id||!n.Name.endsWith('_'+id))throw Error('NETWORK_OWNERSHIP_UNPROVEN');
const containers=containerIds.map(c=>JSON.parse(run(['inspect',c]))[0]);
for(const c of containers){
 if(c.Config?.Labels?.[label]!==id||!c.Name.endsWith('_'+id))throw Error('CONTAINER_OWNERSHIP_UNPROVEN');
 for(const m of c.Mounts||[]){
  if(m.Type==='volume'){if(!volumes.some(v=>v.Name===m.Name))throw Error('FOREIGN_OR_UNPROVEN_VOLUME');}
  else if(m.Type==='bind'){
   const relative=path.relative(path.resolve(project),path.resolve(m.Source));
   if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('UNOWNED_BIND_MOUNT');
  }else if(m.Type!=='tmpfs')throw Error('UNPROVEN_MOUNT_TYPE');
 }
 for(const name of Object.keys(c.NetworkSettings?.Networks||{}))if(!networks.some(n=>n.Name===name))throw Error('UNOWNED_NETWORK');
}
if(stage==='running'){
 for(const service of ['db','auth','kong','rest','storage']){
  const c=containers.find(c=>c.Name==='/supabase_'+service+'_'+id);
  if(!c?.State?.Running)throw Error('MISSING_OWNED_RUNNING_SERVICE');
  const binding=service==='db'?['5432/tcp','54322']:service==='kong'?['8000/tcp','54321']:null;
  if(binding&&!c.NetworkSettings?.Ports?.[binding[0]]?.some(p=>p.HostPort===binding[1]))throw Error('ISOLATED_PORT_BINDING_UNPROVEN');
  if(process.env.KONTRAT_STORAGE_PREFLIGHT_FILE){
   const p=JSON.parse(fs.readFileSync(process.env.KONTRAT_STORAGE_PREFLIGHT_FILE,'utf8'));
   if(c.Image!==p.images?.find(i=>i.service===service)?.id)throw Error('RUNNING_IMAGE_DRIFT');
  }
  if(['db','storage'].includes(service)&&!c.Mounts?.some(m=>m.Type==='volume'))throw Error('PERSISTENCE_VOLUME_UNPROVEN');
 }
}
console.log(JSON.stringify({projectId:id,stage,
 containers:containers.map(c=>({id:c.Id,name:c.Name,image:c.Image,ports:c.NetworkSettings?.Ports})),
 volumes:volumes.map(v=>v.Name).sort(),networks:networks.map(n=>n.Name).sort()}));
NODE
}
cleanup() {
 local bad=0
 if [[ "$started" == true && "$owned" == true ]]; then
  if ! resource_state owned > "$root/cleanup-ownership.json" 2> "$root/cleanup-ownership.log"; then
   echo CLEANUP_OWNERSHIP_UNPROVEN_NO_STOP; bad=1
  elif ! supabase stop --workdir "$project" --no-backup 2>&1 | redact > "$root/stop.log"; then
   echo ISOLATED_STOP_FAILED; bad=1
  elif ! resource_state empty > "$root/cleanup-empty.json" 2> "$root/cleanup-empty.log"; then
   echo CLEANUP_INCOMPLETE; bad=1
  fi
 fi
 rm -f -- "$root/status.json" || bad=1
 return "$bad"
}
finish() {
 local rc=$?
 trap - EXIT
 set +e
 cleanup
 local cleanup_rc=$?
 if [[ "$cleanup_rc" -ne 0 ]]; then rc=1; fi
 if [[ "$rc" -eq 0 && "$passed" == true ]]; then
  node - "$root" "$order" "$project_id" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const [root,order,projectId]=process.argv.slice(2);
const proof=JSON.parse(fs.readFileSync(path.join(root,'owned-resources.json'),'utf8'));
const db=JSON.parse(fs.readFileSync(path.join(root,'database-identity.json'),'utf8'));
const migrations=fs.readFileSync(path.join(root,'migrations.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
assert.equal(migrations.length,2);assert.equal(new Set(migrations.map(m=>m.file)).size,2);
const dbContainerId=proof.containers.find(c=>c.name==='/supabase_db_'+projectId).id;
const receipt={kind:'P31_STORAGE_ORDER_PASS',result:'PASS',cleanup:'complete',order,root,projectId,
 dbContainerId,dbSystemId:db.systemId,volumes:proof.volumes,migrations};
fs.writeFileSync(path.join(root,'completion.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
NODE
  rc=$?
 else
  if [[ "$rc" -eq 0 ]]; then rc=1; fi
  echo "ORDER_FAILED_NO_PASS order=$order"
 fi
 echo "ISOLATED_EVIDENCE_DIRECTORY=$root"
 exit "$rc"
}
trap finish EXIT
unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_URL
supabase init --workdir "$project" --yes >/dev/null
[[ ! -f "$project/supabase/.branches/_current_branch" && ! -f "$project/supabase/.temp/project-ref" ]] || { echo REFUSE_LINKED_PROJECT; exit 2; }
node - "$project/supabase/config.toml" "$project_id" <<'NODE'
const fs=require('node:fs');
const file=process.argv[2];
let content=fs.readFileSync(file,'utf8');
const pattern=/(major_version\s*=\s*)["']?\d+["']?/;
if(!pattern.test(content)||!/^project_id\s*=/m.test(content))throw Error('ISOLATED_CONFIG_MISSING');
content=content.replace(pattern,(_,prefix)=>prefix+'17').replace(/^project_id\s*=.*$/m,'project_id = "'+process.argv[3]+'"');
fs.writeFileSync(file,content,'utf8');
NODE
resource_state fresh > "$root/preexisting-resources.json"
owned=true
started=true
supabase start --workdir "$project" --yes \
 --exclude analytics,edge-runtime,functions,imgproxy,inbucket,meta,realtime,studio,vector \
 2>&1 | redact \
 > "$root/start.log" || { echo ISOLATED_SUPABASE_START_FAILED; exit 1; }
resource_state running > "$root/owned-resources.json"
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
psql -X -w -qAt -v ON_ERROR_STOP=1 -d "$db_url" -c "SELECT jsonb_build_object('database',current_database(),'systemId',(pg_control_system()).system_identifier::text,'serverVersion',current_setting('server_version_num'))::text" > "$root/database-identity.json"
existing="$(psql -X -w -At -v ON_ERROR_STOP=1 -d "$db_url" -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('users','orders','conversations','messages')")"
[[ "$existing" == 0 ]] || { echo REFUSE_NONEMPTY_PUBLIC_SCHEMA; exit 2; }
export PGOPTIONS='-c kontrat.isolated_storage_fixture=true'
psql -X -w -v ON_ERROR_STOP=1 -d "$db_url" -f scripts/fixtures/msg-storage-api-native-local-baseline.sql > "$root/fixture.log" 2>&1
export KONTRAT_LOCAL_STATUS_FILE="$root/status.json"
export KONTRAT_STORAGE_BASELINE_FILE="$root/dependency-fingerprint.json"
assert_trigger_state() {
 local state
 state="$(psql -X -w -qAt -v ON_ERROR_STOP=1 -d "$db_url" -c "SELECT jsonb_build_object('guard',count(*) FILTER(WHERE tgname='trg_messages_authenticated_update_authority' AND tgtype=19 AND tgenabled='O'),'retention',count(*) FILTER(WHERE tgname='messages_attachment_retention_after_removed' AND tgtype=17 AND tgenabled='O'),'businessTotal',count(*))::text FROM pg_trigger WHERE tgrelid='public.messages'::regclass AND NOT tgisinternal")"
 node - "$order" "$1" "$2" "$3" "$state" <<'NODE' >> "$root/states.jsonl"
const assert=require('node:assert/strict');
const [order,stage,guard,retention,json]=process.argv.slice(2),state=JSON.parse(json);
assert.equal(state.guard,Number(guard),'GUARD_STATE_DRIFT');
assert.equal(state.retention,Number(retention),'RETENTION_STATE_DRIFT');
assert.equal(state.businessTotal,Number(guard)+Number(retention),'UNEXPECTED_MESSAGE_TRIGGER');
console.log(JSON.stringify({order,stage,state}));
NODE
}
assert_trigger_state baseline 0 0
KONTRAT_STORAGE_PHASE=legacy node scripts/test-msg-storage-api-native.mjs > "$root/legacy.log" 2>&1
assert_trigger_state after-legacy 0 0
a05='supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql'
guard='supabase/migrations/20261025022849_message_update_authority_guard.sql'
case "$order" in
 a05-first) migrations=("$a05" "$guard") ;;
 guard-first) migrations=("$guard" "$a05") ;;
 *) echo REFUSE_NON_SINGLE_ORDER_CHILD; exit 2 ;;
esac
declare -A applied=()
guard_count=0
retention_count=0
for migration in "${migrations[@]}"; do
 [[ -z "${applied[$migration]:-}" ]] || { echo REFUSE_MIGRATION_REAPPLICATION; exit 2; }
 applied["$migration"]=true
 copy="$root/$(basename -- "$migration")"
 cp -- "$migration" "$copy"
 node - "$order" "$migration" "$copy" <<'NODE' >> "$root/migrations.jsonl"
const fs=require('node:fs'),crypto=require('node:crypto');
const [order,file,copy]=process.argv.slice(2);
console.log(JSON.stringify({order,file,sha256:crypto.createHash('sha256').update(fs.readFileSync(copy)).digest('hex')}));
NODE
 psql -X -w -v ON_ERROR_STOP=1 -d "$db_url" -f "$copy" > "$copy.log" 2>&1
 if [[ "$migration" == "$a05" ]]; then retention_count=1; else guard_count=1; fi
 assert_trigger_state "after-$(basename -- "$migration")" "$guard_count" "$retention_count"
done
KONTRAT_STORAGE_PHASE=post node scripts/test-msg-storage-api-native.mjs > "$root/post.log" 2>&1
assert_trigger_state after-post 1 1
passed=true
