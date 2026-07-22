const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const html = read('anunciar-servico.html');
const formPage = read('assets/js/pages/anunciar-servico.js');
const formExperience = read('assets/js/pages/service-form-experience.js');
const repository = read('assets/js/repositories/services-repository.js');
const service = read('assets/js/services/services-service.js');
const detail = read('assets/js/pages/detalhe-anuncio.js');
const budget = read('assets/js/pages/orcamento.js');
const ownerCards = read('assets/js/pages/profile/professional-services-section.js');
const adminHtml = read('admin.html');
const adminRepo = read('assets/js/repositories/service-moderation-repository.js');
const adminPage = read('assets/js/pages/admin-service-moderation.js');
const reviewHtml = read('admin-anuncio-revisao.html');
const reviewPage = read('assets/js/pages/admin-anuncio-revisao.js');
const migration = read('supabase/migrations/032_service_listing_moderation.sql');
const hardening = read('supabase/migrations/033_harden_service_moderation_permissions.sql');
const edgeAuthority = read('supabase/migrations/136_self_service_direct_rpc_lockdown.sql');
const supabaseBootstrap = read('assets/js/core/supabase-config.js');

const checks = [
  [html.includes('data-step-target="5"') && html.includes('data-step-panel="5"'), 'fluxo não possui cinco etapas'],
  [html.includes('data-quote-mode-option="default"') && html.includes('data-quote-mode-option="custom"') && html.includes('data-quote-mode-option="disabled"'), 'três modos de orçamento ausentes'],
  [html.includes('Enviar para análise') && !html.includes('Publicar anúncio'), 'ação final ainda publica diretamente'],
  [formPage.includes("'Enviar alterações para análise'") && formPage.includes("'Enviar para análise'"), 'rótulo de submissão moderada ausente'],
  [formExperience.includes('service?.submitForReview') && !formExperience.includes('service?.create(payload)'), 'formulário não usa a autoridade de revisão'],
  [repository.includes("invokeSelfService('submit_service_for_review'") && repository.includes('getOwnedReviewDraft') && supabaseBootstrap.includes('self-service-operations'), 'repositório não implementa submissão/versionamento via gateway Edge'],
  [repository.includes('isPubliclyVisible') && repository.includes('approvedContentRemainsPublic') && repository.includes("['published', 'changes_pending_review']"), 'catálogo não restringe versões não aprovadas'],
  [repository.includes('canReadLocalService') && repository.includes('resolveReadableLocalService'), 'detalhe ainda expõe rascunhos locais a visitantes'],
  [service.includes('submitForReview') && service.includes('getOwnedReviewDraft'), 'serviço de domínio não expõe revisão segura'],
  [detail.includes("quoteMode || 'default').toLowerCase() !== 'disabled'"), 'detalhe não remove orçamento quando desativado'],
  [budget.includes('recebe somente conversas neste anúncio') && budget.includes('changes_pending_review'), 'orçamento não bloqueia modo desativado/moderação'],
  [ownerCards.includes('Alterações em análise') && ownerCards.includes('Ajustes solicitados'), 'perfil owner não exibe estados de moderação'],
  [adminHtml.includes('data-admin-service-reviews') && adminPage.includes('admin-anuncio-revisao.html?version='), 'fila administrativa ou navegação para revisão dedicada ausente'],
  [adminRepo.includes("FUNCTION_NAME = 'service-moderation-operations'") && adminRepo.includes('client.functions.invoke') && adminRepo.includes("invoke('approve'"), 'repositório administrativo não usa a autoridade da Edge Function'],
  [reviewHtml.includes('data-admin-ad-review-action="changes"') && reviewHtml.includes('data-admin-ad-review-action="reject"') && reviewHtml.includes('data-admin-ad-review-action="approve"') && reviewPage.includes('repo.requestChanges') && reviewPage.includes('repo.reject') && reviewPage.includes('repo.approve'), 'decisões administrativas incompletas na página dedicada'],
  [migration.includes('create table if not exists public.service_versions'), 'tabela de versões ausente'],
  [migration.includes('trg_protect_service_moderation_state'), 'proteção contra publicação direta ausente'],
  [migration.includes('approved_version_id') && migration.includes('pending_version_id'), 'ponte aprovada/pendente ausente'],
  [migration.includes('enable row level security') && migration.includes('service_versions_owner_read'), 'RLS de versões ausente'],
  [hardening.includes('revoke all on table public.service_versions from anon') && edgeAuthority.includes('revoke execute on function public.submit_service_for_review') && edgeAuthority.includes('to service_role'), 'hardening de permissões ausente']
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error('[service-moderation-flow-contract] falhou');
  failed.forEach((message) => console.error('- ' + message));
  process.exit(1);
}

console.log('[service-moderation-flow-contract] ok');
console.log('- orçamento possui etapa própria e três modos');
console.log('- publicação direta foi substituída por revisão versionada');
console.log('- catálogo, detalhe, orçamento, perfil e admin respeitam moderação');
console.log('- schema, RLS e permissões estão materializados em migrations');
