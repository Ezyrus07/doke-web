const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('anunciar-servico.html');
const builderSource = read('assets/js/pages/service-quote-template-builder.js');
const formExperience = read('assets/js/pages/service-form-experience.js');
const pageController = read('assets/js/pages/anunciar-servico.js');
const css = read('assets/css/pages/anunciar-servico.css');

const sandbox = {
  window: {},
  document: {
    addEventListener() {},
    querySelector() { return null; }
  },
  console,
  Date,
  Math,
  Object,
  String,
  Number,
  Array,
  JSON
};
vm.runInNewContext(builderSource, sandbox, { filename: 'service-quote-template-builder.js' });
const catalog = sandbox.window.DokeServiceQuoteTemplateCatalog;

const expectedCategories = ['Limpeza', 'Pintura', 'Elétrica', 'Encanador', 'Reformas', 'Tecnologia', 'Beleza', 'Aulas', 'Frete'];
const allowedTypes = new Set(['short_text', 'long_text', 'single_choice', 'multiple_choice', 'yes_no', 'number', 'date']);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(Array.isArray(catalog), 'catálogo não foi exposto como coleção estruturada');
check(catalog?.length === expectedCategories.length, `catálogo deveria possuir ${expectedCategories.length} modelos`);
check(html.includes('data-quote-template-presets'), 'área de modelos prontos ausente');
check(!html.includes('data-quote-template-list') && !html.includes('data-quote-template-search'), 'a interface não deve exibir catálogo geral nem busca de categorias diferentes');
check(html.includes('data-quote-template-recommendation'), 'recomendação baseada na categoria ausente');
check(html.includes('data-quote-template-selection'), 'estado de modelo aplicado ausente');
check(html.includes('data-quote-template-browser') && html.includes('data-quote-template-change'), 'catálogo não pode ser recolhido ou reaberto após aplicar um modelo');
check(builderSource.includes('applyTemplateById') && builderSource.includes('recommendedTemplateId'), 'aplicação/recomendação do modelo ausente');
check(builderSource.includes('TEMPLATE_CATALOG.find') && builderSource.includes('normalizeText(template.category) === selectedCategory'), 'recomendação não está restrita à categoria selecionada');
check(builderSource.includes("categoryField?.addEventListener('change', renderPresetCatalog)"), 'catálogo não reage à categoria do anúncio');
check(formExperience.includes('templateId: core.normalize(parsed.templateId)') && formExperience.includes('templateLabel: core.normalize(parsed.templateLabel)'), 'metadados do modelo não entram no snapshot');
check(pageController.includes('quoteModeReviewLabel') && pageController.includes('templateLabel'), 'revisão não identifica o modelo aplicado');
check(css.includes('.quote-template-presets--focused') && css.includes('.quote-template-presets__recommendation--single'), 'contrato visual focado ausente');

const ids = new Set();
const categories = new Set();
(catalog || []).forEach((template) => {
  check(template && typeof template === 'object', 'modelo inválido');
  check(Boolean(template.id) && !ids.has(template.id), `id de modelo ausente ou duplicado: ${template.id || '(vazio)'}`);
  ids.add(template.id);
  categories.add(template.category);
  check(expectedCategories.includes(template.category), `categoria inesperada: ${template.category}`);
  check(String(template.title || '').length >= 5 && String(template.title || '').length <= 80, `título inválido em ${template.id}`);
  check(String(template.summary || '').length >= 20 && String(template.summary || '').length <= 180, `resumo inválido em ${template.id}`);
  check(Number(template.estimatedMinutes) >= 1 && Number(template.estimatedMinutes) <= 5, `tempo estimado inválido em ${template.id}`);
  check(Array.isArray(template.questions) && template.questions.length >= 4 && template.questions.length <= 10, `quantidade de perguntas inválida em ${template.id}`);

  const questionIds = new Set();
  (template.questions || []).forEach((question) => {
    check(Boolean(question.id) && !questionIds.has(question.id), `id de pergunta ausente ou duplicado em ${template.id}`);
    questionIds.add(question.id);
    check(allowedTypes.has(question.type), `tipo ${question.type} não suportado em ${template.id}`);
    check(String(question.label || '').length >= 8 && String(question.label || '').length <= 120, `texto de pergunta inválido em ${template.id}`);
    check(String(question.helpText || '').length <= 180, `texto auxiliar excedido em ${template.id}`);
    if (['single_choice', 'multiple_choice'].includes(question.type)) {
      check(Array.isArray(question.options) && question.options.length >= 2 && question.options.length <= 5, `opções inválidas em ${template.id}/${question.id}`);
      (question.options || []).forEach((option) => check(String(option).length <= 80, `opção excedida em ${template.id}/${question.id}`));
    }
  });
});

expectedCategories.forEach((category) => check(categories.has(category), `categoria sem modelo: ${category}`));

if (failures.length) {
  console.error('[service-quote-template-catalog-contract] falhou');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('[service-quote-template-catalog-contract] ok');
console.log(`- ${catalog.length} categorias possuem modelos prontos validados`);
console.log('- somente a recomendação da categoria, aplicação, personalização e snapshot estão conectados');
