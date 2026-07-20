const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('anunciar-servico.html');
const builder = read('assets/js/pages/service-quote-template-builder.js');
const repository = read('assets/js/repositories/professional-quote-templates-repository.js');
const service = read('assets/js/services/professional-quote-templates-service.js');
const formExperience = read('assets/js/pages/service-form-experience.js');
const css = read('assets/css/pages/anunciar-servico.css');
const migration = read('supabase/migrations/034_professional_quote_templates.sql');
const hardeningMigration = read('supabase/migrations/035_harden_professional_quote_templates.sql');
const accessFixMigration = read('supabase/migrations/036_fix_professional_quote_template_access_check.sql');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(html.includes('data-personal-quote-templates'), 'biblioteca “Meus modelos” ausente');
check(html.includes('data-personal-template-save'), 'ação “Salvar modelo atual” ausente');
check(html.includes('data-personal-template-update'), 'ação de atualizar modelo pessoal ausente');
check(html.includes('data-personal-template-dialog') && html.includes('data-personal-template-name'), 'modal de nome do modelo ausente');
check(html.includes('professional-quote-templates-repository.js') && html.includes('professional-quote-templates-service.js'), 'repository/service não estão carregados antes do builder');

check(builder.includes('personal_template_customized') && builder.includes('personalTemplateId'), 'snapshot não identifica modelo pessoal e personalização');
check(builder.includes('applyPersonalTemplateById'), 'aplicação de modelo pessoal ausente');
check(builder.includes('saveCurrentAsPersonal') && builder.includes('updateSelectedPersonal'), 'salvamento/atualização do modelo pessoal ausente');
check(builder.includes('renamePersonal') && builder.includes('deletePersonal'), 'renomear/excluir modelo pessoal ausente');
check(builder.includes('Os anúncios que já usam essas perguntas não serão alterados'), 'exclusão não esclarece preservação do snapshot do anúncio');
check(formExperience.includes('personal_template') && formExperience.includes('personalTemplateId'), 'formulário não preserva metadados do modelo pessoal no anúncio');

check(repository.includes("var TABLE = 'professional_quote_templates'"), 'repository não aponta para a tabela canônica');
check(repository.includes('.eq(\'professional_id\', user.id)'), 'operações remotas não estão explicitamente escopadas ao proprietário');
check(repository.includes("result.error.code === '23505'"), 'conflito de nomes duplicados não possui mensagem controlada');
check(repository.includes('PROFESSIONAL_QUOTE_TEMPLATE_LIMIT_REACHED'), 'limite de modelos não possui mensagem controlada');
check(!repository.includes('localStorage'), 'repository de modelos pessoais não deve criar persistência paralela em localStorage');
check(service.includes('professionalAccess') && service.includes('PUBLISH_SERVICE'), 'service não valida acesso profissional antes do CRUD');

check(migration.includes('create table if not exists public.professional_quote_templates'), 'migration da biblioteca pessoal ausente');
check(migration.includes('alter table public.professional_quote_templates enable row level security'), 'RLS não foi ativado');
check(migration.includes('professional_quote_templates_owner_read'), 'policy de leitura do proprietário ausente');
check(migration.includes('professional_quote_templates_owner_insert'), 'policy de inserção do proprietário ausente');
check(migration.includes('professional_quote_templates_owner_update'), 'policy de atualização do proprietário ausente');
check(migration.includes('professional_quote_templates_owner_delete'), 'policy de exclusão do proprietário ausente');
check(migration.includes("revoke all on table public.professional_quote_templates from anon"), 'papel anônimo não foi revogado');
check(migration.includes('jsonb_array_length') && migration.includes('between 1 and 10'), 'banco não limita modelos a 1–10 perguntas');
check(migration.includes('professional_quote_templates_owner_name_key'), 'nomes duplicados por profissional não estão protegidos');
check(!migration.toLowerCase().includes('security definer'), 'migration não deve introduzir SECURITY DEFINER');
check(hardeningMigration.includes('enforce_professional_quote_template_limit') && hardeningMigration.includes('>= 30'), 'limite real de 30 modelos não foi materializado no banco');
check(hardeningMigration.includes('pg_advisory_xact_lock'), 'limite por profissional não protege inserções concorrentes');
check(accessFixMigration.includes('create schema if not exists private'), 'verificação profissional não está isolada em schema interno');
check(accessFixMigration.includes('private.is_active_verified_professional'), 'policy não valida profissional ativo e verificado');
check(accessFixMigration.includes("u.role = 'professional'") && accessFixMigration.includes("p.verification_status = 'verified'"), 'autoridade profissional está incompleta');
check(!accessFixMigration.includes('create or replace function public.is_active_verified_professional'), 'helper de autorização não pode ser exposto no schema público');

check(css.includes('.quote-personal-templates') && css.includes('.quote-personal-template-card'), 'contrato visual da biblioteca pessoal ausente');
check(css.includes('.quote-template-name-dialog'), 'contrato visual do modal de nome ausente');

if (failures.length) {
  console.error('[professional-quote-template-library-contract] falhou');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log('[professional-quote-template-library-contract] ok');
console.log('- biblioteca pessoal, CRUD, snapshot, RLS e preservação de anúncios estão conectados');
