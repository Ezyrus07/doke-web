const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('anunciar-servico.html');
const form = read('assets/js/pages/service-form-experience.js');
const builder = read('assets/js/pages/service-quote-template-builder.js');
const repo = read('assets/js/repositories/services-repository.js');
const migration = read('supabase/migrations/037_backfill_legacy_published_service_versions.sql');
const css = read('assets/css/pages/anunciar-servico.css');
const failures = [];
const check = (value, message) => { if (!value) failures.push(message); };
check(html.includes('data-main-service-image'), 'input principal não possui autoridade explícita');
check(form.includes("mainImageInput.required = !primary"), 'imagem existente não desativa required nativo');
check(form.includes("root.dataset.existingServiceImage = primary"), 'imagem atual não é exposta para validação/revisão');
check(!html.includes('data-quote-template-search') && !html.includes('data-quote-template-list'), 'catálogo geral ainda aparece na interface');
check(builder.includes("normalizeText(template.category) === selectedCategory"), 'modelo recomendado não está filtrado pela categoria');
check(html.includes('Recomendado para este anúncio'), 'hierarquia focada do modelo não foi aplicada');
check(css.includes('.quote-template-presets--focused'), 'visual simplificado ausente');
check(migration.includes("status = 'published'") && migration.includes("moderation_status = 'draft'"), 'backfill não identifica anúncios legados publicados');
check(migration.includes("review_status") && migration.includes("'approved'"), 'backfill não cria versão aprovada');
check(repo.includes('isPubliclyVisible'), 'catálogo não preserva filtro canônico de visibilidade');
if (failures.length) {
  console.error('[service-edit-home-focused-quote-fix-contract] falhou');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('[service-edit-home-focused-quote-fix-contract] ok');
console.log('- anúncio legado, imagens existentes e recomendação focada possuem contratos explícitos');
