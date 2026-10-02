'use strict';

const runner=require('./run-ana-001-staging-canary');
const config=runner.readConfig();
const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});

function syntheticReady(){
  return {
    environment:'staging',
    supabaseUrl:'https://stage-canary.supabase.co',
    projectRef:'stage-canary',
    anonKey:'anon-present',
    secretKey:'sb_secret_present',
    clientEmail:'cliente@doke.test',
    clientPassword:'secret',
    professionalEmail:'profissional@doke.test',
    professionalPassword:'secret',
    searchQuery:'canary',
    searchServiceId:'11111111-1111-4111-8111-111111111111',
    serviceId:'22222222-2222-4222-8222-222222222222',
    ownerServiceId:'33333333-3333-4333-8333-333333333333',
    orderId:'44444444-4444-4444-8444-444444444444',
    windowStart:'2026-09-18T00:00:00Z',
    windowEnd:'2026-09-19T00:00:00Z',
    confirmation:config.requiredAuthorization.exactPhrase
  };
}

check('default dry run',runner.resolveMode([])==='dry-run');
check('check env mode',runner.resolveMode(['--check-env'])==='check-env');
check('execute mode explicit',runner.resolveMode(['--execute'])==='execute');
try{runner.resolveMode(['--execute','--dry-run']);check('ambiguous rejected',false);}catch(e){check('ambiguous rejected',e.code==='DOKE_ANA_CANARY_MODE_AMBIGUOUS');}

const ready=runner.buildPlan(syntheticReady());
check('synthetic environment ready',ready.status==='staging_canary_environment_ready');
check('dry plan no network',ready.capabilities.networkRequestsPerformed===0);
check('dry plan no database mutation',ready.capabilities.databaseMutationsPerformed===0);
check('browser remains inactive',ready.capabilities.browserClientActivated===false);

const noAuth=syntheticReady();noAuth.confirmation='';
check('missing confirmation blocked',runner.buildPlan(noAuth).blockedBy.includes('DOKE_ANA_STAGING_CANARY_CONFIRM'));

const prod=syntheticReady();prod.environment='production';prod.supabaseUrl='https://prod.stage-canary.supabase.co';
const prodPlan=runner.buildPlan(prod);
check('production blocked',prodPlan.status==='staging_canary_blocked'&&prodPlan.blockedBy.includes('production_target_forbidden'));

const realEmail=syntheticReady();realEmail.clientEmail='person@gmail.com';
check('real-looking email blocked',runner.buildPlan(realEmail).blockedBy.includes('synthetic_client_identity_required'));

check('tamper changes token',runner.tamperToken('abcA')==='abcB');
check('sha256 shape',/^[a-f0-9]{64}$/.test(runner.sha256({a:1})));
check('sanitizer redacts password',runner.sanitizeError('password=hello').includes('[redacted]'));

const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:config.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedChecks:failed},null,2));
if(failed.length)process.exitCode=1;
