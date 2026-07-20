const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'anunciar-servico.html'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'assets/js/pages/service-quote-template-builder.js'), 'utf8');
const form = fs.readFileSync(path.join(root, 'assets/js/pages/service-form-experience.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/031_service_quote_templates.sql'), 'utf8');
const required = [
  [html.includes('data-quote-template-builder'), 'builder ausente no HTML'],
  [html.includes('data-quote-question-add'), 'ação adicionar ausente'],
  [html.includes('data-quote-template-presets') && html.includes('data-quote-template-list'), 'catálogo de modelos prontos ausente'],
  [builder.includes('DokeServiceQuoteTemplateCatalog') && builder.includes('applyTemplateById'), 'autoridade de modelos prontos ausente'],
  [builder.includes('questions.length >= 10'), 'limite de 10 perguntas ausente'],
  [builder.includes('data-question-up') && builder.includes('data-question-down'), 'reordenação ausente'],
  [builder.includes('data-question-duplicate') && builder.includes('data-question-remove'), 'ações de pergunta ausentes'],
  [builder.includes('validate = () =>'), 'validação do template ausente'],
  [form.includes("data.get('quoteTemplateJson')"), 'template não entra no payload'],
  [form.includes('templateId: core.normalize(parsed.templateId)') && form.includes('templateLabel: core.normalize(parsed.templateLabel)'), 'origem do modelo não entra no snapshot'],
  [form.includes('DokeServiceQuoteTemplateBuilder?.load'), 'edição não restaura template'],
  [migration.includes('service_quote_templates') && migration.includes('service_quote_questions'), 'schema versionado ausente'],
  [migration.includes('sync_service_quote_template_from_metadata'), 'trigger de versionamento ausente'],
  [migration.includes('enable row level security'), 'RLS ausente']
];
const failed = required.filter(([ok]) => !ok).map(([,message]) => message);
if (failed.length) { console.error(failed.join('\n')); process.exit(1); }
console.log('service quote template builder contract: ok');
