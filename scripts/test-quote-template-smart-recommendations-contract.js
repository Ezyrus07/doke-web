'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const migration = read('supabase/migrations/045_quote_template_smart_recommendations.sql');
const repository = read('assets/js/repositories/quote-template-metrics-repository.js');
const service = read('assets/js/services/quote-template-metrics-service.js');
const profileHtml = read('perfil-profissional.html');
const profileController = read('assets/js/pages/profile/profile-quote-template-metrics.js');
const profileCss = read('assets/css/components/quote-template-metrics.css');
const announceHtml = read('anunciar-servico.html');
const builder = read('assets/js/pages/service-quote-template-builder.js');
const announceCss = read('assets/css/pages/anunciar-servico.css');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(migration.includes('create or replace view public.quote_template_category_benchmarks'), 'category benchmark view is missing');
check(migration.includes('create or replace view public.quote_template_smart_recommendations'), 'smart recommendation view is missing');
check(migration.includes('with (security_invoker = true)'), 'recommendation views must preserve caller RLS');
check(migration.includes("'collect_more_data'::text"), 'small-sample recommendation is missing');
check(migration.includes("'investigate_dropoff_question'::text"), 'dropoff-question recommendation is missing');
check(migration.includes("'reduce_question_count'::text"), 'question-count recommendation is missing');
check(migration.includes("'improve_completion'::text"), 'completion recommendation is missing');
check(migration.includes("'improve_review_to_submit'::text"), 'review-to-submit recommendation is missing');
check(migration.includes("'keep_current'::text"), 'positive keep-current recommendation is missing');
check(migration.includes("forms_started >= 30 then 'high'"), 'confidence thresholds are not data-driven');
check(migration.includes('recommended_question_count'), 'recommended question count is not calculated');
check(migration.includes('top_dropoff_share'), 'dropoff concentration is not calculated');
check(!/answer_(text|value|payload)|response_(text|value|payload)/i.test(migration), 'recommendations must not store or expose answer contents');

check(repository.includes("var RECOMMENDATIONS_VIEW = 'quote_template_smart_recommendations'"), 'repository does not read recommendations');
check(repository.includes("var BENCHMARKS_VIEW = 'quote_template_category_benchmarks'"), 'repository does not read benchmarks');
check(repository.includes('listOwnerRecommendations') && repository.includes('listOwnerBenchmarks'), 'repository smart insight boundaries are missing');
check(repository.includes('sampleServiceExternalId'), 'recommendations cannot link back to the affected listing');
check(!repository.includes('localStorage'), 'recommendation authority must not use localStorage');

check(service.includes('CACHE_TTL_MS'), 'dashboard insights are not cached');
check(service.includes('getBuilderGuidance'), 'builder guidance service is missing');
check(service.includes('identityForContext'), 'template family identity is not normalized');
check(service.includes("source === 'preset_customized'"), 'customized official models are not aligned to their family');
check(service.includes("source === 'personal_template_customized'"), 'customized personal models are not aligned to their family');

check(profileHtml.includes('data-quote-smart-insights'), 'owner profile smart insight panel is missing');
check(profileHtml.includes('data-quote-smart-insights-list'), 'owner profile smart insight list is missing');
check(profileController.includes('Nenhuma mudança é aplicada automaticamente') || profileHtml.includes('Nenhuma mudança é aplicada automaticamente'), 'advisory-only containment copy is missing');
check(profileController.includes('recommendationCopy'), 'recommendation explanations are missing');
check(profileController.includes('confidenceLabel'), 'confidence label is missing');
check(profileController.includes('Revisar formulário'), 'recommendations are not actionable');
check(profileController.includes('não prova que a pergunta causou o abandono'), 'dropoff language makes an unsupported causal claim');
check(profileCss.includes('.quote-template-insights') && profileCss.includes('.quote-template-insight-card'), 'smart insight visual anatomy is missing');
check(profileCss.includes('@media (max-width: 600px)'), 'smart insight mobile contract is missing');

check(announceHtml.includes('data-quote-smart-guidance'), 'builder guidance surface is missing');
check(announceHtml.includes('id="quote-template-builder"'), 'recommendation deep link target is missing');
check(builder.includes('refreshSmartGuidance'), 'builder does not refresh contextual guidance');
check(builder.includes('getBuilderGuidance'), 'builder does not consume owner benchmarks');
check(builder.includes('setSmartGuidance'), 'builder guidance state contract is missing');
check(!/recommendation[\s\S]{0,160}(splice|questions\s*=|remove)/i.test(builder), 'recommendation logic appears to mutate questions automatically');
check(announceCss.includes('.quote-builder-guidance'), 'builder guidance visual contract is missing');
check(announceCss.includes('@media (max-width: 620px)'), 'builder guidance mobile contract is missing');

if (failures.length) {
  console.error('[quote-template-smart-recommendations-contract] falhou');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('[quote-template-smart-recommendations-contract] ok');
console.log('- benchmarks, confidence, evidence, owner insights and builder guidance are connected');
