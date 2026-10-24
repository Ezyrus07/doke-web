param([int]$Port = 55493,[string]$PgBin='C:\Program Files\PostgreSQL\17\bin')
$ErrorActionPreference='Stop'
if($Port -lt 55000 -or $Port -gt 59999){throw 'PORT_NOT_ISOLATED'}
$repo=Split-Path -Parent $PSScriptRoot
$root=Join-Path $env:TEMP 'kontrat-msg-a05-ephemeral-pg-20261024'
$data=Join-Path $root 'pgdata'
if(!(Test-Path $data) -or !(Test-Path (Join-Path $root 'local-password.txt'))){throw 'NO_OWNED_CLUSTER'}
$env:PGPASSWORD=Get-Content -Raw (Join-Path $root 'local-password.txt')
$p=Join-Path $PgBin 'psql.exe';$create=Join-Path $PgBin 'createdb.exe'
$drop=Join-Path $PgBin 'dropdb.exe';$dumpExe=Join-Path $PgBin 'pg_dump.exe'
$restore=Join-Path $PgBin 'pg_restore.exe'
$identity=& $p -X -w -h 127.0.0.1 -p $Port -U kontrat_sandbox -d postgres -At -v ON_ERROR_STOP=1 -c "select current_user||'|'||inet_server_addr()||'|'||inet_server_port()||'|'||current_setting('data_directory');"
if($LASTEXITCODE -ne 0){throw 'IDENTITY_QUERY_FAILED'}
$parts=([string]$identity).Trim().Split('|')
$actual=[IO.Path]::GetFullPath($parts[3]).Replace('\','/').ToLowerInvariant().TrimEnd('/')
$expected=[IO.Path]::GetFullPath($data).Replace('\','/').ToLowerInvariant().TrimEnd('/')
if($parts.Count -ne 4 -or $parts[0] -ne 'kontrat_sandbox' -or $parts[1] -notmatch '^127[.]0[.]0[.]1(/32)?$' -or [int]$parts[2] -ne $Port -or $actual -ne $expected){throw 'NON_ISOLATED_DATABASE_REFUSED'}
$tag=[Guid]::NewGuid().ToString('N').Substring(0,8)
$db='kontrat_msg_a05_'+$tag
$restored=$db+'_restored'
$dump=Join-Path $root ($tag+'.synthetic.dump')
$created=@()
function MustRun([string]$exe,[string[]]$arguments){
  & $exe @arguments
  if($LASTEXITCODE -ne 0){throw ('FAILED_'+[IO.Path]::GetFileName($exe))}
}
try{
  MustRun $create @('-w','-h','127.0.0.1','-p',"$Port",'-U','kontrat_sandbox','-T','template0',$db)
  $created+= $db
  Write-Output 'FRESH_SYNTHETIC_DATABASE_CREATED'
  MustRun $p @('-X','-w','-h','127.0.0.1','-p',"$Port",'-U','kontrat_sandbox','-d',$db,'-v','ON_ERROR_STOP=1','-f',(Join-Path $repo 'scripts/fixtures/msg-a05-postgres-isolated-baseline.sql'))
  MustRun $dumpExe @('-w','-h','127.0.0.1','-p',"$Port",'-U','kontrat_sandbox','-d',$db,'-Fc','-f',$dump)
  Write-Output 'PRE_MIGRATION_SYNTHETIC_BACKUP_SAVED'
  MustRun $p @('-X','-w','-h','127.0.0.1','-p',"$Port",'-U','kontrat_sandbox','-d',$db,'-v','ON_ERROR_STOP=1','-f',(Join-Path $repo 'supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql'))
  Write-Output 'ORIGINAL_SOURCE_MIGRATION_COMPILED'
  MustRun $p @('-X','-w','-h','127.0.0.1','-p',"$Port",'-U','kontrat_sandbox','-d',$db,'-v','ON_ERROR_STOP=1','-f',(Join-Path $repo 'scripts/fixtures/msg-a05-postgres-isolated-smoke.sql'))
  MustRun $p @('-X','-w','-h','127.0.0.1','-p',"$Port",'-U','kontrat_sandbox','-d',$db,'-v','ON_ERROR_STOP=1','-f',(Join-Path $repo 'scripts/fixtures/msg-a05-postgres-isolated-negative.sql'))
  Write-Output 'SYNTHETIC_RLS_AND_LIFECYCLE_PASS'
  MustRun $create @('-w','-h','127.0.0.1','-p',"$Port",'-U','kontrat_sandbox','-T','template0',$restored)
  $created+= $restored
  MustRun $restore @('--exit-on-error','-w','-h','127.0.0.1','-p',"$Port",'-U','kontrat_sandbox','-d',$restored,$dump)
  $gate=& $p -X -w -h 127.0.0.1 -p $Port -U kontrat_sandbox -d $restored -At -v ON_ERROR_STOP=1 -c "select (to_regclass('private.transaction_attachment_lifecycle') is null)::text||'|'||(select count(*) from pg_policies where schemaname='storage' and policyname like 'transaction_attachments%')::text||'|'||(select count(*) from pg_proc where pronamespace='public'::regnamespace and proname like '%transaction_attachment%_internal')::text;"
  if($LASTEXITCODE -ne 0 -or ([string]$gate).Trim() -ne 'true|4|0'){throw 'BACKUP_RESTORE_BASELINE_MISMATCH'}
  Write-Output 'PRE_MIGRATION_SYNTHETIC_RESTORE_PASS'
  Write-Output 'MSG_A05_ISOLATED_POSTGRES_17_PASS'
}finally{
  for($i=$created.Count-1;$i -ge 0;$i--){
    $name=$created[$i]
    if($name -match '^kontrat_msg_a05_[a-f0-9]{8}(_restored)?$'){
      & $drop -w -h 127.0.0.1 -p $Port -U kontrat_sandbox $name
      if($LASTEXITCODE -eq 0){Write-Output 'OWNED_SYNTHETIC_DATABASE_REMOVED'}
      else{Write-Output 'WARNING_SYNTHETIC_DATABASE_CLEANUP_FAILED'}
    }
  }
  if(Test-Path -LiteralPath $dump){Remove-Item -LiteralPath $dump -Force}
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
