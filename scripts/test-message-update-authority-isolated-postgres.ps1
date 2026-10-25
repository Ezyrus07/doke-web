param([int]$Port=55494,[string]$Bin='C:\Program Files\PostgreSQL\17\bin')
$ErrorActionPreference='Stop'
if($Port -ne 55494){throw 'NON_ISOLATED_PORT_DENIED'}
$root=Join-Path $env:TEMP 'kontrat-msg-update-synthetic-pg-20261024'
$data=Join-Path $root 'pgdata'
$pw=Join-Path $root 'password.txt'
if(!(Test-Path (Join-Path $data 'PG_VERSION')) -or !(Test-Path $pw)){throw 'CLUSTER_NOT_INITIALIZED'}
$env:PGPASSWORD=Get-Content -Raw -LiteralPath $pw
$psql=Join-Path $Bin 'psql.exe'
$createdb=Join-Path $Bin 'createdb.exe'
$dropdb=Join-Path $Bin 'dropdb.exe'
$actual=& $psql -X -w -h 127.0.0.1 -p $Port -U kontrat_sandbox -d postgres -At -v ON_ERROR_STOP=1 -c "select current_user||'|'||inet_server_addr()||'|'||inet_server_port()||'|'||current_setting('data_directory');"
if($LASTEXITCODE -ne 0){throw 'PG_IDENTITY_FAILED'}
$parts=([string]$actual).Trim().Split('|')
$expectedDir=[IO.Path]::GetFullPath($data).Replace('\','/').TrimEnd('/').ToLowerInvariant()
$actualDir=[IO.Path]::GetFullPath($parts[3]).Replace('\','/').TrimEnd('/').ToLowerInvariant()
if($parts.Count -ne 4 -or $parts[0] -ne 'kontrat_sandbox' -or $parts[1] -notmatch '^127[.]0[.]0[.]1(/32)?$' -or [int]$parts[2] -ne $Port -or $actualDir -ne $expectedDir) {throw 'REFUSE_UNEXPECTED_DATABASE'}
$db='msg_update_synthetic_'+[Guid]::NewGuid().ToString('N').Substring(0,8)
$repo=Split-Path -Parent $PSScriptRoot
$created=$false
try{
 & $createdb -w -h 127.0.0.1 -p $Port -U kontrat_sandbox -T template0 $db
 if($LASTEXITCODE -ne 0){throw 'CREATE_SYNTHETIC_DB_FAILED'}
 $created=$true
 foreach($fixture in @(
 'scripts/fixtures/msg-update-authority-baseline.sql',
 'supabase/migrations/20261025022849_message_update_authority_guard.sql',
 'scripts/fixtures/msg-update-authority-regressions.sql'
 )){
  $path=Join-Path $repo $fixture
  & $psql -X -w -h 127.0.0.1 -p $Port -U kontrat_sandbox -d $db -v ON_ERROR_STOP=1 -f $path
  if($LASTEXITCODE -ne 0){throw ('SQL_TEST_FAILED_'+$fixture)}
 }
 'MSG_UPDATE_AUTHORITY_ISOLATED_POSTGRES_PASS'
} finally{
 if($created -and $db -match '^msg_update_synthetic_[0-9a-f]{8}$'){
  & $dropdb -w -h 127.0.0.1 -p $Port -U kontrat_sandbox $db
  if($LASTEXITCODE -ne 0){throw 'SYNTHETIC_DB_DROP_FAILED'}
  'SYNTHETIC_TEST_DB_REMOVED'
 }
 Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
