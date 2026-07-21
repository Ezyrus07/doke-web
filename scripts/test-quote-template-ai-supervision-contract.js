'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const contains = (source, marker, message) => assert.ok(source.includes(marker), message || `Missing marker: ${marker}`);
const excludes = (source, marker, message) => assert.ok(!source.includes(marker), message || `Forbidden marker: ${marker}`);

const html = read('anunciar-servico.html');
const cssEntry = read('assets/css/pages/anunciar-servico-foundation.css');
const componentCss = read('assets/css/components/quote-template-ai-supervision.css');
const builder = read('assets/js/pages/service-quote-template-builder.js');
const controller = read('assets/js/pages/service-quote-template-ai.js');
const repository = read('assets/js/repositories/quote-template-ai-repository.js');
const service = read('assets/js/services/quote-template-ai-service.js');
const formExperience = read('assets/js/pages/service-form-experience.js');
const metricsService = read('assets/js/services/quote-template-metrics-service.js');
const profileMetrics = read('assets/js/pages/profile/profile-quote-template-metrics.js');
const edge = [
  read('supabase/functions/quote-template-ai/index.ts'),
  read('supabase/functions/quote-template-ai/shared.ts'),
  read('supabase/functions/quote-template-ai/recommendations.ts'),
  read('supabase/functions/quote-template-ai/openai.ts')
].join('\n');
const deno = read('supabase/functions/quote-template-ai/deno.json');
const migration46 = read('supabase/migrations/046_quote_template_ai_supervision.sql');
const migration47 = read('supabase/migrations/047_consolidate_quote_template_ai_runs_read_policy.sql');
const migration48 = read('supabase/migrations/048_extend_quote_template_ai_sources.sql');
const migration49 = read('supabase/migrations/049_remove_quote_template_ai_application_rpc.sql');

// UI and dependency wiring.
contains(html, 'data-quote-ai-supervision', 'Supervised AI surface must exist in the quote step.');
contains(html, 'data-quote-ai-apply disabled', 'Apply must start disabled.');
excludes(html, 'data-quote-ai-select checked', 'No AI suggestion may be preselected.');
assert.ok(
  html.indexOf('quote-template-ai-repository.js') < html.indexOf('quote-template-ai-service.js')
    && html.indexOf('quote-template-ai-service.js') < html.indexOf('service-quote-template-ai.js'),
  'Repository/service/controller loading order is invalid.'
);
contains(cssEntry, 'components/quote-template-ai-supervision.css', 'Component CSS must be imported by the page authority.');
excludes(componentCss, '!important', 'The AI component must not introduce !important.');
excludes(componentCss, 'style=', 'The AI component must not use inline styles.');

// Human supervision and stale-result protection.
contains(controller, 'Nenhuma sugestão está pré-selecionada', 'The UI must explain the opt-in selection model.');
contains(controller, 'questionsSignature(currentQuestions) !== baselineSignature', 'Stale suggestions must be rejected.');
contains(controller, "service().markApplied", 'Selected suggestions must be audited before committing the builder state.');
contains(controller, 'applyAiOptimization', 'The builder must remain the sole authority that mutates quote questions.');
contains(controller, "action === 'merge'", 'Merge suggestions must remove absorbed duplicate questions through the controller.');
contains(controller, 'affectedQuestionIds', 'Conflicting suggestions must share an explicit affected-question contract.');
contains(repository, 'relatedQuestionIds', 'The repository must preserve merge relationships from the server.');
contains(edge, '"merge"', 'The structured AI contract must support merge suggestions.');
contains(edge, 'relatedQuestionIds', 'The structured AI contract must identify questions absorbed by a merge.');
contains(controller, 'DokeInitServiceQuoteTemplateAi', 'AI controller must expose an explicit initializer.');

// Layering.
contains(repository, "client.functions.invoke", 'Repository must own the Edge Function invocation.');
contains(service, 'professionalAccess', 'Service must enforce the existing professional-access authority.');
excludes(builder, 'functions.invoke', 'The builder must not call Supabase directly.');
excludes(controller, 'functions.invoke', 'The controller must not call Supabase directly.');

// Server-side key and privacy boundary.
contains(edge, 'Deno.env.get("OPENAI_API_KEY")', 'OpenAI key must be read only in the Edge Function.');
contains(edge, 'store: false', 'OpenAI Responses must disable application-state storage.');
contains(edge, 'type: "json_schema"', 'OpenAI output must use a structured schema.');
contains(edge, 'strict: true', 'Structured output must use strict schema adherence.');
contains(edge, 'AbortSignal.timeout(25_000)', 'External inference must have a bounded timeout.');
contains(edge, 'authClient.auth.getUser()', 'The handler must verify the authenticated user.');
contains(edge, 'SERVICE_OWNERSHIP_REQUIRED', 'Existing service optimization must enforce ownership.');
contains(edge, 'PROFESSIONAL_VERIFICATION_REQUIRED', 'Only active verified professionals may invoke optimization.');
contains(edge, 'selected_suggestion_ids', 'Selective application must be persisted for audit.');
contains(edge, 'applied_template_signature', 'Applied output signature must be persisted for audit.');
contains(edge, 'const inputSnapshot = { category, templateIdentity, templateSource, questions };', 'Only sanitized questions and non-sensitive context may be retained.');
['address', 'customerAnswer', 'clientAnswer', 'attachments', 'phoneNumber', 'whatsapp'].forEach((forbidden) => {
  excludes(edge, forbidden, `Sensitive payload marker must not be sent or stored: ${forbidden}`);
});
excludes(repository + service + controller + builder, 'OPENAI_API_KEY', 'The OpenAI key name must not appear in frontend runtime files.');

// Dependency pinning and database security.
contains(deno, '@supabase/supabase-js@2.110.0', 'Edge dependency must be pinned.');
contains(migration46, 'enable row level security', 'AI audit table must have RLS enabled.');
contains(migration46, 'revoke insert, update, delete', 'Clients must not mutate AI audit rows directly.');
contains(migration47, 'quote_template_ai_runs_authorized_read', 'Read policy must be consolidated.');
contains(migration47, '(select auth.uid()) = professional_id', 'Owner read policy must be scoped by user id.');
contains(migration49, 'drop function if exists public.record_quote_template_ai_application', 'The redundant client-callable application RPC must be removed.');

// Provenance must survive service persistence and metrics aggregation.
['preset_ai_customized', 'personal_template_ai_customized', 'custom_ai_optimized'].forEach((source) => {
  contains(builder, source, `Builder must emit ${source}.`);
  contains(formExperience, source, `Service payload must preserve ${source}.`);
  contains(migration48, source, `Database metrics must accept ${source}.`);
  contains(profileMetrics, source, `Dashboard must label ${source}.`);
});
contains(metricsService, "source === 'custom_ai_optimized'", 'Metrics identity must normalize AI-custom sources to their base family.');
contains(migration48, "when v_source = 'custom_ai_optimized' then 'custom'", 'Database identity must normalize custom AI provenance.');
contains(migration48, 'create or replace view public.quote_template_conversion_metrics', 'Conversion metrics must preserve AI source priority.');
contains(migration48, 'create or replace view public.quote_template_question_dropoff', 'Drop-off metrics must preserve AI source priority.');

console.log('Quote-template AI supervision contract: PASS');
