param(
  [int]$Port=55495,
  [switch]$ReverseOrder,
  [string]$PgBin='C:\Program Files\PostgreSQL\17\bin'
)
$ErrorActionPreference='Stop'
if($Port -ne 55495){throw 'ISOLATED_PORT_REQUIRED'}
$repo=Split-Path -Parent $PSScriptRoot
$binInit=Join-Path $PgBin 'initdb.exe'
$binCtl=Join-Path $PgBin 'pg_ctl.exe'
$binPsql=Join-Path $PgBin 'psql.exe'
if(!(Test-Path $binInit) -or !(Test-Path $binCtl)){throw 'POSTGRES17_LOCAL_MISSING'}
if(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue){
  throw 'ISOLATED_PORT_IN_USE'
}
$root=Join-Path $env:TEMP ('kontrat-msg-composite-'+[guid]::NewGuid().ToString('N').Substring(0,12))
$data=Join-Path $root 'pgdata'
$pwFile=Join-Path $root 'local-random-password.txt'
$log=Join-Path $root 'pg.log'
if(Test-Path -LiteralPath $root){throw 'ROOT_COLLISION'}
New-Item -ItemType Directory -Path $root | Out-Null
$started=$false
try {
  $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes=New-Object byte[] 32
  try{$rng.GetBytes($bytes)}finally{$rng.Dispose()}
  [IO.File]::WriteAllText($pwFile,[Convert]::ToBase64String($bytes))
  & $binInit -D $data -U kontrat_sandbox -A scram-sha-256 --pwfile=$pwFile --encoding=UTF8 --locale=C --no-instructions
  if($LASTEXITCODE -ne 0){throw 'LOCAL_INITDB_FAILED'}
  & $binCtl -D $data -l $log -o "-h 127.0.0.1 -p $Port -c fsync=off" -w -t 25 start
  if($LASTEXITCODE -ne 0){throw 'LOCAL_PG_START_FAILED'}
  $started=$true
  $env:PGPASSWORD=Get-Content -Raw -LiteralPath $pwFile
  $identity=& $binPsql -X -w -h 127.0.0.1 -p $Port -U kontrat_sandbox -d postgres -At -v ON_ERROR_STOP=1 -c "select current_user||'|'||inet_server_addr()||'|'||inet_server_port()||'|'||current_setting('data_directory')||'|'||current_setting('server_version_num');"
  if($LASTEXITCODE -ne 0){throw 'LOCAL_IDENTITY_FAILED'}
  $parts=([string]$identity).Trim().Split('|')
  if($parts.Length -ne 5 -or $parts[0] -ne 'kontrat_sandbox' -or
    $parts[1] -notmatch '^127[.]0[.]0[.]1(/32)?$' -or
    [int]$parts[2] -ne $Port -or [int]$parts[4] -lt 170000 -or [int]$parts[4] -ge 180000) {
    throw 'REFUSE_NON_ISOLATED_CLUSTER'
  }
  $actualPath=[IO.Path]::GetFullPath($parts[3]).Replace('\','/').TrimEnd('/').ToLowerInvariant()
  $expectedPath=[IO.Path]::GetFullPath($data).Replace('\','/').TrimEnd('/').ToLowerInvariant()
  if($actualPath -ne $expectedPath){throw 'REFUSE_DIFFERENT_DATA_DIRECTORY'}
  Write-Output 'ISOLATED_POSTGRES17_IDENTIFIED'
  $migrationOrder=@(
    'supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql',
    'supabase/migrations/20261025022849_message_update_authority_guard.sql'
  )
  if($ReverseOrder){[array]::Reverse($migrationOrder)}
  $sequence=@('scripts/fixtures/msg-update-authority-baseline.sql','scripts/fixtures/msg-update-a05-integration-baseline.sql') +
    $migrationOrder + @('scripts/fixtures/msg-update-a05-integration-regressions.sql')
  foreach($relative in $sequence){
    $src=Join-Path $repo $relative
    if(!(Test-Path $src)){throw ('MISSING_SQL_FILE_'+$relative)}
    & $binPsql -X -w -h 127.0.0.1 -p $Port -U kontrat_sandbox -d postgres -v ON_ERROR_STOP=1 -f $src
    if($LASTEXITCODE -ne 0){throw ('ISOLATED_SQL_FAILURE_'+$relative)}
  }
  Write-Output ('MSG_A05_MESSAGE_UPDATE_SYNTHETIC_INTERACTION_PASS_WITH_KNOWN_NO_GO_REVERSE='+[bool]$ReverseOrder)
} finally {
  if($started){
    & $binCtl -D $data -w -m fast stop
    if($LASTEXITCODE -ne 0){throw 'EPHEMERAL_STOP_FAILED'}
  }
  if(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue){
    throw 'LOCAL_POSTGRES_PORT_STILL_ACTIVE'
  }
  if(Test-Path -LiteralPath $root){Remove-Item -LiteralPath $root -Recurse -Force}
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Write-Output 'ISOLATED_POSTGRES_REMOVED'
}
