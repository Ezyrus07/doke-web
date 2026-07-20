'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const migration = read('supabase/migrations/039_quote_template_conversion_metrics.sql');
const identityMigration = fs.existsSync(path.join(root, 'supabase/migrations/040_align_quote_template_metric_identity.sql'))
  ? read('supabase/migrations/040_align_quote_template_metric_identity.sql')
  : '';
const indexMigration = read('supabase/migrations/041_index_quote_template_metric_foreign_keys.sql');
const repository = read('assets/js/repositories/quote-template-metrics-repository.js');
const service = read('assets/js/services/quote-template-metrics-service.js');
const builder = read('assets/js/pages/service-quote-template-builder.js');
const budget = read('assets/js/pages/orcamento.js');
const profileController = read('assets/js/pages/profile/profile-quote-template-metrics.js');
const profileCss = read('assets/css/components/quote-template-metrics.css');
const profilePageCss = read('assets/css/pages/professional-profile-editor.css');
const announceHtml = read('anunciar-servico.html');
const budgetHtml = read('orcamento.html');
const profileHtml = read('perfil-profissional.html');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(migration.includes('create table if not exists public.quote_template_application_events'), 'application event table is missing');
check(migration.includes('create table if not exists public.quote_template_funnel_events'), 'funnel event table is missing');
check(migration.includes("event_type in ('started', 'progress', 'completed', 'submitted')"), 'required funnel event types are not constrained');
check(migration.includes('event_key text not null unique'), 'events are not deduplicated by a unique event key');
check(migration.includes('alter table public.quote_template_application_events enable row level security'), 'application events do not have RLS');
check(migration.includes('alter table public.quote_template_funnel_events enable row level security'), 'funnel events do not have RLS');
check(migration.includes('private.is_active_verified_professional'), 'application writes do not require a verified professional');
check(migration.includes('private.canonicalize_quote_template_funnel_event'), 'canonical server-side funnel authority is missing');
check(migration.includes('QUOTE_METRIC_OWNER_EXCLUDED'), 'owner traffic is not explicitly excluded');
check(migration.includes('QUOTE_METRIC_ORDER_NOT_FOUND'), 'submitted events are not tied to a real client order');
check(migration.includes('with (security_invoker = true)'), 'aggregate views must preserve the caller RLS context');
check(migration.includes('quote_template_conversion_metrics'), 'conversion aggregate view is missing');
check(migration.includes('quote_template_question_dropoff'), 'privacy-safe abandonment insight view is missing');
check(!/answer_(text|value|payload)|response_(text|value|payload)/i.test(migration), 'analytics schema must not store answer contents');
check(migration.includes("interval '30 minutes'"), 'abandonment window is not defined');
check(identityMigration.includes('v_identity_source') && identityMigration.includes('preset_customized'), 'customized templates are not aligned with their original application identity');
check(indexMigration.includes('personal_template_id') && indexMigration.includes('actor_id') && indexMigration.includes('order_id'), 'new analytics foreign keys are not covered by indexes');

check(repository.includes("var APPLICATIONS_TABLE = 'quote_template_application_events'"), 'metrics repository does not use the application table');
check(repository.includes("var FUNNEL_EVENTS_TABLE = 'quote_template_funnel_events'"), 'metrics repository does not use the funnel table');
check(repository.includes("var METRICS_VIEW = 'quote_template_conversion_metrics'"), 'metrics repository does not read the aggregate view');
check(repository.includes('ignoreDuplicates: true') && repository.includes("onConflict: 'event_key'"), 'client event writes are not idempotent');
check(repository.includes('owner-excluded'), 'repository does not contain owner-traffic containment');
check(!repository.includes('localStorage'), 'metrics repository must not create localStorage analytics authority');
check(service.includes('getOwnerDashboard') && service.includes('recordFunnelEvent'), 'metrics service does not expose dashboard and funnel boundaries');

check(builder.includes('recordTemplateApplication'), 'model application is not instrumented');
check(builder.includes("recordTemplateApplication(template, 'doke')"), 'official model application is not recorded');
check(builder.includes("recordTemplateApplication(template, 'personal')"), 'personal model application is not recorded');
check(builder.includes('options.track !== false'), 'restoring an existing ad cannot disable application tracking');

check(budget.includes('recordQuoteStarted'), 'quote start event is missing');
check(budget.includes('recordQuoteProgress'), 'quote progress event is missing');
check(budget.includes('recordQuoteCompleted'), 'quote completion event is missing');
check(budget.includes('recordQuoteSubmitted'), 'quote submission event is missing');
check(budget.includes('quoteFunnelSessionKey'), 'order snapshot does not preserve funnel session linkage');
check(budget.includes('window.sessionStorage'), 'funnel session is not scoped to sessionStorage');
check(!/localStorage[^\n]*quote-funnel|quote-funnel[^\n]*localStorage/.test(budget), 'quote funnel must not use localStorage');
check(!/quoteAnswers\s*[:=][\s\S]{0,200}recordQuoteMetric/.test(budget), 'answer contents must not be sent to analytics');
check(budget.includes('recordQuoteSubmitted(savedOrder);'), 'submitted metric is not emitted after order creation');

check(profileHtml.includes('data-quote-template-metrics'), 'owner metrics panel is missing');
check(profileHtml.includes('data-quote-metrics-summary="applications"'), 'application summary is missing');
check(profileHtml.includes('data-quote-metrics-summary="submitted"'), 'submitted summary is missing');
check(profileHtml.includes('quote-template-metrics-repository.js') && profileHtml.includes('profile-quote-template-metrics.js'), 'owner page does not load metrics layers');
check(announceHtml.includes('quote-template-metrics-repository.js') && announceHtml.includes('quote-template-metrics-service.js'), 'listing form does not load metrics layers before the builder');
check(budgetHtml.includes('quote-template-metrics-repository.js') && budgetHtml.includes('quote-template-metrics-service.js'), 'budget page does not load metrics layers');
check(profilePageCss.includes('quote-template-metrics.css'), 'owner page does not import the canonical metrics component');
check(profileController.includes('Isso indica o ponto de saída, não prova que a pergunta causou o abandono'), 'abandonment insight must avoid causal claims');
check(profileController.includes('totals.started < 20'), 'small sample guidance is missing');
check(profileCss.includes('.quote-template-metrics__summary') && profileCss.includes('.quote-template-metric-row__grid'), 'responsive visual contract is missing');

if (failures.length) {
  console.error('[quote-template-conversion-metrics-contract] falhou');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('[quote-template-conversion-metrics-contract] ok');
console.log('- aplicações, funil, privacidade, deduplicação e painel owner estão conectados');
