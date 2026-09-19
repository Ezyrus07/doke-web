'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const config = read('assets/js/core/supabase-config.js');
const repository = read('assets/js/repositories/analytics-repository.js');
const search = read('assets/js/pages/search/server-results-surface.js');
const detail = read('assets/js/pages/detalhe-anuncio.js');
const budget = read('assets/js/pages/orcamento.js');
const detailHtml = read('detalhe-anuncio.html');
const budgetHtml = read('orcamento.html');
const resultsHtml = read('resultados.html');
const contract = JSON.parse(read('config/ana-a03-behavioral-ingestion-identity-boundary.json'));

const checks = [];
const check = (name, condition) => checks.push({ name, passed: Boolean(condition) });

check('client wiring declared', contract.runtimeImplementation.clientRepository === 'assets/js/repositories/analytics-repository.js');
check('client activation default false', contract.runtimeImplementation.clientActivationDefault === false);
check('config analytics disabled', config.includes('analyticsEnabled: false'));
check('config transport edge-v1', config.includes('analyticsTransport: "edge-v1"'));
check('config edge function', config.includes('analyticsEdgeFunction: "analytics-behavior-v1"'));

check('repository uses sessionStorage', repository.includes('root.sessionStorage'));
check('repository does not use localStorage', !repository.includes('localStorage'));
check('repository feature gate strict true', repository.includes("config.analyticsEnabled === true"));
check('repository transport gate', repository.includes("analyticsTransport || '') === 'edge-v1'"));
check('repository invokes configured edge', repository.includes('DokeSupabase.invokeEdgeFunction') && repository.includes('client.functions.invoke'));
check('repository uses crypto randomUUID', repository.includes('crypto.randomUUID'));
check('repository has no fabricated UUID fallback', !repository.includes('Math.random'));
check('repository does not send actor identity', !repository.includes('actorId:'));
check('repository does not send raw query', !repository.includes('rawQuery') && !repository.includes('raw_query'));
check('repository does not send quote text fields', !repository.includes('lastQuestionLabel') && !repository.includes('answerText'));

check('results html loads analytics repository', resultsHtml.includes('assets/js/repositories/analytics-repository.js'));
check('detail html loads analytics repository', detailHtml.includes('assets/js/repositories/analytics-repository.js'));
check('budget html loads analytics repository', budgetHtml.includes('assets/js/repositories/analytics-repository.js'));
check('results analytics loads after supabase config', resultsHtml.indexOf('supabase-config.js') < resultsHtml.indexOf('analytics-repository.js'));
check('detail analytics loads after supabase config', detailHtml.indexOf('supabase-config.js') < detailHtml.indexOf('analytics-repository.js'));
check('budget analytics loads after supabase config', budgetHtml.indexOf('supabase-config.js') < budgetHtml.indexOf('analytics-repository.js'));

check('search requires exposure proof', search.includes('item.analyticsExposureProof'));
check('search uses intersection observer', search.includes('IntersectionObserver'));
check('search requires 50 percent intersection', search.includes('intersectionRatio >= 0.5'));
check('search impression method', search.includes('trackSearchImpression'));
check('search click method', search.includes('trackSearchClick'));

check('detail canonical view method', detail.includes('trackServiceDetail'));
check('detail canonical budget method', detail.includes('trackBudgetCta'));
check('detail canonical message method', detail.includes('trackMessageCta'));
check('detail canonical metric bounded by existing navigation timeout', detail.includes('Promise.race([metricPromise, timeout])'));check('search exposure one-shot support', repository.includes('rememberExposure')&&repository.includes('takeExposure')&&repository.includes("sourceSurface: exposureProof ? 'search'"));

check('quote canonical started method', budget.includes('trackQuoteStarted'));
check('quote canonical progress method', budget.includes('trackQuoteProgressed'));
check('quote canonical completed method', budget.includes('trackQuoteCompleted'));
check('quote canonical submitted method', budget.includes('trackQuoteSubmitted'));
check('quote safe numeric detail', budget.includes('questionCount: Number(detail.questionCount || 0)'));
check('quote safe detail excludes legacy label', budget.includes('const safeDetail = {') && !/safeDetail\s*=\s*\{[^}]*lastQuestionLabel/s.test(budget));
check('quote canonical submission uses order id only', budget.includes('analytics[method](canonicalServiceId, detail.orderId || "")'));

const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
console.log(JSON.stringify({
  contractId: 'ana-a03-client-wiring-v1',
  total: checks.length,
  passed: checks.length - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
