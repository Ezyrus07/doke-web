#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const CONFIG_PATH = 'config/ana-001-staging-canary-readiness.json';

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function resolveMode(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const known = new Set(['--dry-run','--check-env','--execute','--write-report']);
  const unknown = args.filter((value) => String(value).startsWith('--') && !known.has(value));
  if (unknown.length) throw canaryError('DOKE_ANA_CANARY_OPTION_INVALID', 'Unknown ANA canary option: ' + unknown.join(', '));
  const selected = ['--dry-run','--check-env','--execute'].filter((flag) => args.includes(flag));
  if (selected.length > 1) throw canaryError('DOKE_ANA_CANARY_MODE_AMBIGUOUS', 'Select only one ANA canary mode.');
  if (args.includes('--execute')) return 'execute';
  if (args.includes('--check-env')) return 'check-env';
  return 'dry-run';
}

function readEnvironment(env) {
  const source = env || process.env;
  const config = readConfig();
  const get = (name) => String(source[name] || '').trim();
  const supabaseUrl = get('DOKE_SUPABASE_URL') || get('SUPABASE_URL');
  const anonKey = get('DOKE_SUPABASE_ANON_KEY') || get('SUPABASE_ANON_KEY');
  const secretKey = get('DOKE_SUPABASE_SECRET_KEY') || get('SUPABASE_SECRET_KEY') || get('SUPABASE_SERVICE_ROLE_KEY');
  return Object.freeze({
    environment:get('DOKE_ENVIRONMENT').toLowerCase(),
    supabaseUrl:supabaseUrl.replace(/\/+$/,''),
    projectRef:get('DOKE_SUPABASE_PROJECT_REF'),
    anonKey,
    secretKey,
    clientEmail:get('DOKE_STAGING_CLIENT_EMAIL').toLowerCase(),
    clientPassword:get('DOKE_STAGING_CLIENT_PASSWORD'),
    professionalEmail:get('DOKE_STAGING_PROFESSIONAL_EMAIL').toLowerCase(),
    professionalPassword:get('DOKE_STAGING_PROFESSIONAL_PASSWORD'),
    searchQuery:get('DOKE_ANA_STAGING_SEARCH_QUERY'),
    searchServiceId:get('DOKE_ANA_STAGING_SEARCH_SERVICE_ID'),
    serviceId:get('DOKE_ANA_STAGING_SERVICE_ID'),
    ownerServiceId:get('DOKE_ANA_STAGING_OWNER_SERVICE_ID'),
    orderId:get('DOKE_ANA_STAGING_ORDER_ID'),
    windowStart:get('DOKE_ANA_STAGING_WINDOW_START'),
    windowEnd:get('DOKE_ANA_STAGING_WINDOW_END'),
    confirmation:get(config.requiredAuthorization.environmentVariable)
  });
}

function validateEnvironment(env) {
  const config = readConfig();
  const blockers = [];
  if (env.environment !== 'staging') blockers.push('DOKE_ENVIRONMENT');
  let url = null;
  try { url = new URL(env.supabaseUrl); } catch { blockers.push('DOKE_SUPABASE_URL'); }
  if (url) {
    if (/(^|[.-])(prod|production|live)([.-]|$)/i.test(url.hostname)) blockers.push('production_target_forbidden');
    if (!env.projectRef || url.hostname !== env.projectRef + '.supabase.co') blockers.push('DOKE_SUPABASE_PROJECT_REF');
    if (url.protocol !== 'https:') blockers.push('https_staging_target_required');
  }
  const required = [
    ['anonKey','DOKE_SUPABASE_ANON_KEY'],
    ['secretKey','DOKE_SUPABASE_SECRET_KEY'],
    ['clientEmail','DOKE_STAGING_CLIENT_EMAIL'],
    ['clientPassword','DOKE_STAGING_CLIENT_PASSWORD'],
    ['professionalEmail','DOKE_STAGING_PROFESSIONAL_EMAIL'],
    ['professionalPassword','DOKE_STAGING_PROFESSIONAL_PASSWORD'],
    ['searchQuery','DOKE_ANA_STAGING_SEARCH_QUERY'],
    ['searchServiceId','DOKE_ANA_STAGING_SEARCH_SERVICE_ID'],
    ['serviceId','DOKE_ANA_STAGING_SERVICE_ID'],
    ['ownerServiceId','DOKE_ANA_STAGING_OWNER_SERVICE_ID'],
    ['orderId','DOKE_ANA_STAGING_ORDER_ID'],
    ['windowStart','DOKE_ANA_STAGING_WINDOW_START'],
    ['windowEnd','DOKE_ANA_STAGING_WINDOW_END']
  ];
  required.forEach(([field,name]) => { if (!env[field]) blockers.push(name); });
  ['searchServiceId','serviceId','ownerServiceId','orderId'].forEach((field) => {
    if (env[field] && !uuidPattern().test(env[field])) blockers.push(field + '_uuid_invalid');
  });
  const start = Date.parse(env.windowStart), end = Date.parse(env.windowEnd);
  if (env.windowStart && !Number.isFinite(start)) blockers.push('DOKE_ANA_STAGING_WINDOW_START_invalid');
  if (env.windowEnd && !Number.isFinite(end)) blockers.push('DOKE_ANA_STAGING_WINDOW_END_invalid');
  if (Number.isFinite(start) && Number.isFinite(end) && end <= start) blockers.push('staging_window_invalid');
  if (env.confirmation !== config.requiredAuthorization.exactPhrase) blockers.push(config.requiredAuthorization.environmentVariable);
  const clientLooksSynthetic = /@doke\.(local|test)$/i.test(env.clientEmail) || /\+.*canary@/i.test(env.clientEmail);
  const professionalLooksSynthetic = /@doke\.(local|test)$/i.test(env.professionalEmail) || /\+.*canary@/i.test(env.professionalEmail);
  if (env.clientEmail && !clientLooksSynthetic) blockers.push('synthetic_client_identity_required');
  if (env.professionalEmail && !professionalLooksSynthetic) blockers.push('synthetic_professional_identity_required');
  return Object.freeze({ ok:blockers.length===0, blockers });
}

function buildPlan(env) {
  const config = readConfig();
  const runtime = env || readEnvironment(process.env);
  const validation = validateEnvironment(runtime);
  return Object.freeze({
    contractId:config.contractId,
    status:validation.ok ? 'staging_canary_environment_ready' : 'staging_canary_blocked',
    cases:config.cases,
    reportPath:config.reportPath,
    checks:{
      environmentIsStaging:runtime.environment === 'staging',
      targetConfigured:Boolean(runtime.supabaseUrl),
      projectRefConfigured:Boolean(runtime.projectRef),
      clientIdentityConfigured:Boolean(runtime.clientEmail),
      professionalIdentityConfigured:Boolean(runtime.professionalEmail),
      syntheticFixtureIdsConfigured:Boolean(runtime.searchServiceId && runtime.serviceId && runtime.ownerServiceId && runtime.orderId),
      canaryWindowConfigured:Boolean(runtime.windowStart && runtime.windowEnd),
      exactAuthorization:runtime.confirmation === config.requiredAuthorization.exactPhrase
    },
    capabilities:{
      dryRunAvailable:true,
      checkEnvAvailable:true,
      executeAvailable:true,
      networkRequestsPerformed:0,
      databaseMutationsPerformed:0,
      productionMutationsPerformed:0,
      browserClientActivated:false,
      secretsPrinted:false
    },
    blockedBy:validation.blockers
  });
}

async function passwordSession(url, anonKey, email, password) {
  const client = createClient(url, anonKey, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data || !data.session || !data.session.access_token) {
    throw canaryError('DOKE_ANA_CANARY_LOGIN_FAILED', sanitizeError(error || new Error('Missing session')));
  }
  return Object.freeze({ client, accessToken:data.session.access_token, userId:data.user && data.user.id });
}

async function edgePost(env, accessToken, functionName, body) {
  const response = await fetch(env.supabaseUrl + '/functions/v1/' + functionName, {
    method:'POST',
    headers:{
      'content-type':'application/json',
      'authorization':'Bearer ' + accessToken,
      'apikey':env.anonKey
    },
    body:JSON.stringify(body)
  });
  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }
  return Object.freeze({ status:response.status, ok:response.ok, payload });
}

function requireStatus(result, expected, label) {
  if (result.status !== expected) {
    throw canaryError('DOKE_ANA_CANARY_HTTP_MISMATCH', label + ' expected HTTP ' + expected + ' but received ' + result.status + '; code=' + String(result.payload && result.payload.error || 'none'));
  }
  return result.payload || {};
}

function uuidPattern() {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
}

function randomUuid() {
  return crypto.randomUUID();
}

function tamperToken(value) {
  const token = String(value || '');
  if (!token) return token;
  const last = token.slice(-1);
  return token.slice(0,-1) + (last === 'A' ? 'B' : 'A');
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function executeCanary(env) {
  const config = readConfig();
  const validation = validateEnvironment(env);
  if (!validation.ok) throw canaryError('DOKE_ANA_CANARY_ENVIRONMENT_BLOCKED', validation.blockers.join(', '));
  const sourceConfig = fs.readFileSync(path.join('assets','js','core','supabase-config.js'),'utf8');
  if (!sourceConfig.includes('analyticsEnabled: false')) {
    throw canaryError('DOKE_ANA_CANARY_CLIENT_ALREADY_ACTIVE', 'Direct canary requires analyticsEnabled=false.');
  }

  const results = [];
  const record = (name, passed, detail) => {
    results.push(Object.freeze({ name, passed:Boolean(passed), detail:detail || null }));
    if (!passed) throw canaryError('DOKE_ANA_CANARY_CASE_FAILED', name + (detail ? ': ' + detail : ''));
  };

  const clientAuth = await passwordSession(env.supabaseUrl, env.anonKey, env.clientEmail, env.clientPassword);
  record('client_password_login', Boolean(clientAuth.userId));

  const sessionResponse = await edgePost(env, clientAuth.accessToken, config.edgeFunctions.analytics, { action:'session' });
  const analyticsSession = requireStatus(sessionResponse, 200, 'analytics session');
  record('analytics_session_issued', uuidPattern().test(String(analyticsSession.analyticsSessionId || '')) && Boolean(analyticsSession.sessionToken));

  const searchResponse = await edgePost(env, clientAuth.accessToken, config.edgeFunctions.search, {
    query:env.searchQuery,categories:[],state:'',city:'',neighborhood:'',serviceMode:'any',
    minRating:0,guaranteed:false,emergency:false,availableToday:false,pageSize:12,cursor:''
  });
  const searchPayload = requireStatus(searchResponse, 200, 'search exposure');
  const searchItems = Array.isArray(searchPayload.items) ? searchPayload.items : [];
  const searchItem = searchItems.find((item) => String(item && (item.serviceId || item.remoteId || '')) === env.searchServiceId);
  record('search_exposure_proof_received', Boolean(searchItem && searchItem.analyticsExposureProof));

  const replayId = randomUuid();
  const impressionBody = {
    action:'track',eventName:'search.result_impression',clientEventId:replayId,
    sourceSurface:'search',sessionToken:analyticsSession.sessionToken,
    exposureProof:searchItem.analyticsExposureProof
  };
  const impression = requireStatus(await edgePost(env, clientAuth.accessToken, config.edgeFunctions.analytics, impressionBody), 202, 'valid impression');
  record('valid_impression_accepted', uuidPattern().test(String(impression.eventId || '')));

  const replay = requireStatus(await edgePost(env, clientAuth.accessToken, config.edgeFunctions.analytics, impressionBody), 202, 'exact replay');
  record('exact_client_event_replay_returns_same_event', replay.eventId === impression.eventId);

  const drift = await edgePost(env, clientAuth.accessToken, config.edgeFunctions.analytics, {
    ...impressionBody,eventName:'search.result_clicked'
  });
  record('same_client_event_payload_drift_rejected', drift.status === 409 && String(drift.payload && drift.payload.error || '').includes('IDEMPOTENCY_CONFLICT'));

  const tampered = await edgePost(env, clientAuth.accessToken, config.edgeFunctions.analytics, {
    ...impressionBody,clientEventId:randomUuid(),exposureProof:tamperToken(searchItem.analyticsExposureProof)
  });
  record('tampered_exposure_proof_rejected', tampered.status === 400 && /TOKEN|SIGNATURE|EXPOSURE/.test(String(tampered.payload && tampered.payload.error || '')));

  const quoteSession = requireStatus(await edgePost(env, clientAuth.accessToken, config.edgeFunctions.analytics, {
    action:'quote_session',sessionToken:analyticsSession.sessionToken,serviceId:env.serviceId
  }), 200, 'quote session');
  record('quote_session_issued', uuidPattern().test(String(quoteSession.quoteSessionId || '')) && Boolean(quoteSession.quoteSessionToken));

  const quoteProgress = requireStatus(await edgePost(env, clientAuth.accessToken, config.edgeFunctions.analytics, {
    action:'track',eventName:'quote.progressed',clientEventId:randomUuid(),sourceSurface:'quote',
    sessionToken:analyticsSession.sessionToken,quoteSessionToken:quoteSession.quoteSessionToken,
    stepIndex:1,questionCount:3,answeredQuestionCount:1
  }), 202, 'quote progress');
  record('structural_quote_progress_accepted', uuidPattern().test(String(quoteProgress.eventId || '')));

  const quoteSubmitted = requireStatus(await edgePost(env, clientAuth.accessToken, config.edgeFunctions.analytics, {
    action:'track',eventName:'quote.submitted',clientEventId:randomUuid(),sourceSurface:'quote',
    sessionToken:analyticsSession.sessionToken,quoteSessionToken:quoteSession.quoteSessionToken,
    orderId:env.orderId
  }), 202, 'quote submitted');
  record('submitted_quote_matches_real_synthetic_order', uuidPattern().test(String(quoteSubmitted.eventId || '')));

  const professionalAuth = await passwordSession(env.supabaseUrl, env.anonKey, env.professionalEmail, env.professionalPassword);
  record('professional_owner_login', Boolean(professionalAuth.userId));
  const ownerSession = requireStatus(await edgePost(env, professionalAuth.accessToken, config.edgeFunctions.analytics, { action:'session' }), 200, 'owner session');
  const ownerView = await edgePost(env, professionalAuth.accessToken, config.edgeFunctions.analytics, {
    action:'track',eventName:'service.detail_viewed',clientEventId:randomUuid(),sourceSurface:'direct',
    sessionToken:ownerSession.sessionToken,serviceId:env.ownerServiceId
  });
  record('owner_detail_traffic_excluded', ownerView.status === 204);

  const serviceClient = createClient(env.supabaseUrl, env.secretKey, { auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false} });
  const { data:health, error:healthError } = await serviceClient.rpc('compute_analytics_order_health_v1', {
    p_window_start:env.windowStart,p_window_end:env.windowEnd,p_service_category:null,p_service_state:null
  });
  if (healthError) throw canaryError('DOKE_ANA_CANARY_ORDER_HEALTH_FAILED', sanitizeError(healthError));
  record('order_health_projection_available', health && health.contractId === 'ana-a04-marketplace-funnel-health-projections-v1');

  const { data:reconciliation, error:reconciliationError } = await serviceClient.rpc('run_analytics_order_reconciliation_v1', {
    p_window_start:env.windowStart,p_window_end:env.windowEnd
  });
  if (reconciliationError) throw canaryError('DOKE_ANA_CANARY_RECONCILIATION_FAILED', sanitizeError(reconciliationError));
  record('ord_reconciliation_executes', reconciliation && /^[a-f0-9]{64}$/.test(String(reconciliation.comparisonFingerprint || '')));

  const projectionFingerprint = sha256({ canary:true,windowStart:env.windowStart,windowEnd:env.windowEnd });
  const metricPayload = {
    metricKey:'canary.ana.runtime_contract',metricVersion:'v1',
    windowStart:env.windowStart,windowEnd:env.windowEnd,dataThrough:env.windowEnd,
    dimensions:{canary:'synthetic'},numerator:null,denominator:null,value:null,
    sampleCount:Number(reconciliation.sourceCount || 0),projectionState:'authoritative',
    coverageState:'complete',reconciliationState:String(reconciliation.reconciliationState || 'blocked'),
    sourceFingerprint:String(reconciliation.sourceFingerprint || ''),projectionFingerprint,
    correctionReason:null,computedAt:new Date().toISOString()
  };
  const firstAppend = await serviceClient.rpc('append_analytics_metric_snapshot_v1', { p_snapshot:metricPayload });
  if (firstAppend.error) throw canaryError('DOKE_ANA_CANARY_METRIC_APPEND_FAILED', sanitizeError(firstAppend.error));
  const secondAppend = await serviceClient.rpc('append_analytics_metric_snapshot_v1', { p_snapshot:metricPayload });
  if (secondAppend.error) throw canaryError('DOKE_ANA_CANARY_METRIC_REPLAY_FAILED', sanitizeError(secondAppend.error));
  record('metric_snapshot_append_then_no_change',
    ['APPENDED','NO_CHANGE'].includes(String(firstAppend.data && firstAppend.data.state || ''))
    && String(secondAppend.data && secondAppend.data.state || '') === 'NO_CHANGE');

  await clientAuth.client.auth.signOut().catch(() => {});
  await professionalAuth.client.auth.signOut().catch(() => {});

  return Object.freeze({
    contractId:config.contractId,
    status:'passed',
    observedAt:new Date().toISOString(),
    environment:'staging',
    cases:results,
    summary:{ total:results.length, passed:results.filter((item)=>item.passed).length, failed:results.filter((item)=>!item.passed).length },
    authority:{
      browserClientActivated:false,
      productionChanged:false,
      paymentMutation:false,
      anonymousIdentityStitching:false
    }
  });
}

function sanitizeError(error) {
  return String(error && (error.message || error) || 'unknown')
    .replace(/eyJ[A-Za-z0-9._-]+/g,'[redacted-token]')
    .replace(/(password|apikey|authorization|secret)=?[^\s,;]*/gi,'$1=[redacted]');
}

function canaryError(code, message) {
  const error = new Error(String(message || code));
  error.code = code;
  return error;
}

function writeReport(report) {
  const config = readConfig();
  const destination = path.resolve(config.reportPath);
  const root = path.resolve('reports','generated');
  if (!destination.startsWith(root + path.sep)) throw canaryError('DOKE_ANA_CANARY_REPORT_PATH_INVALID','Report path escaped reports/generated.');
  fs.mkdirSync(root,{recursive:true});
  fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n','utf8');
  return destination;
}

async function main(argv) {
  const args = argv || process.argv.slice(2);
  const mode = resolveMode(args);
  const env = readEnvironment(process.env);
  const plan = buildPlan(env);
  if (mode === 'dry-run') {
    process.stdout.write(JSON.stringify({ mode, ...plan }, null, 2) + '\n');
    return;
  }
  if (mode === 'check-env') {
    process.stdout.write(JSON.stringify({ mode, ...plan }, null, 2) + '\n');
    if (plan.status !== 'staging_canary_environment_ready') process.exitCode = 2;
    return;
  }
  if (plan.status !== 'staging_canary_environment_ready') {
    throw canaryError('DOKE_ANA_CANARY_ENVIRONMENT_BLOCKED', plan.blockedBy.join(', '));
  }
  const report = await executeCanary(env);
  if (args.includes('--write-report')) writeReport(report);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({
      ok:false,
      code:error.code || 'DOKE_ANA_STAGING_CANARY_FAILED',
      message:sanitizeError(error)
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({
  CONFIG_PATH,
  readConfig,
  resolveMode,
  readEnvironment,
  validateEnvironment,
  buildPlan,
  executeCanary,
  sanitizeError,
  tamperToken,
  sha256,
  writeReport
});
