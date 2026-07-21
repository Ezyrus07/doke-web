#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const serviceHtml = read('anunciar-servico.html');
const formExperience = read('assets/js/pages/service-form-experience.js');
const servicePage = read('assets/js/pages/anunciar-servico.js');
const budgetHtml = read('orcamento.html');
const budgetJs = read('assets/js/pages/orcamento.js');
const repo = read('assets/js/repositories/services-repository.js');
const ownerCards = read('assets/js/pages/profile/professional-services-section.js');
const reviewHtml = read('admin-anuncio-revisao.html');
const reviewJs = read('assets/js/pages/admin-anuncio-revisao.js');
const migration = read('supabase/migrations/042_automatic_service_change_classification.sql');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(/name="mainImage"[^>]*data-main-service-image/.test(serviceHtml), 'campo principal não possui autoridade explícita de imagem');
check(!/name="mainImage"[^>]*\srequired(?:\s|>)/.test(serviceHtml), 'required estático ainda bloqueia edição com imagens atuais');
check(formExperience.includes('let existingImagesResolved = !editMode'), 'hidratação das imagens atuais não possui estado explícito');
check(formExperience.includes('const mustUpload = existingImagesResolved && !primary'), 'required dinâmico não considera imagens existentes');
check(formExperience.includes('await existingLoad'), 'envio não aguarda a resolução das imagens atuais');
check(!servicePage.includes("const mustUpload = images.length === 0 && root.dataset.serviceEditMode !== 'true'"), 'controller visual ainda disputa a autoridade de required');

['tipo', 'escopo', 'imovel', 'ambiente', 'area', 'turno', 'orcamento_estimado', 'triagem_ocupacao', 'triagem_medidas', 'triagem_observacoes'].forEach((name) => {
  check(!new RegExp(`name=["']${name}["']`).test(budgetHtml), `campo genérico removido reapareceu: ${name}`);
});
check(budgetHtml.includes('data-budget-custom-questions'), 'perguntas do profissional não possuem região própria');
check(budgetHtml.includes('name="detalhes"'), 'descrição mínima obrigatória foi removida');
check(budgetHtml.includes('data-address-required'), 'endereço mínimo foi removido');
check(budgetHtml.includes('name="anexos"'), 'anexos opcionais foram removidos');
check(budgetJs.includes('syncQuoteFormPresentation'), 'apresentação não se adapta ao modo de orçamento');
check(budgetJs.includes('Definido pela descrição e pelas respostas do cliente'), 'payload não consolida o escopo a partir da descrição e das respostas');
check(budgetJs.includes('triage: {}'), 'payload ainda persiste triagem genérica inexistente');

check(migration.includes('classify_service_version_change'), 'classificador autoritativo não existe no banco');
check(migration.includes("'minor'"), 'classe pequena ausente');
check(migration.includes("'major'"), 'classe relevante ausente');
check(migration.includes("'critical'"), 'classe crítica ausente');
check(migration.includes("'take_down_until_decision'"), 'ação de retirada temporária ausente');
check(migration.includes("'keep_public'"), 'ação de preservar versão pública ausente');
check(migration.includes('external_contact_detected'), 'detecção de contato externo ausente');
check(migration.includes('regulated_service_detected'), 'detecção de serviço regulado ausente');
check(migration.includes("status = case\n        when approved_version_id is null then 'draft'\n        when v_visibility_action = 'take_down_until_decision' then 'paused'"), 'envio crítico não pausa anúncio aprovado');
check(migration.includes("when approved_version_id is null then 'draft' else 'published'"), 'rejeição não restaura versão pública aprovada');

check(repo.includes('pendingVisibilityAction'), 'repositório não preserva impacto da classificação');
check(repo.includes('pendingRiskFlags'), 'repositório não preserva riscos detectados');
check(ownerCards.includes('Alteração crítica em análise'), 'perfil owner não diferencia bloqueio crítico');
check(reviewHtml.includes('data-admin-ad-review-impact'), 'página administrativa não possui bloco de impacto');
check(reviewJs.includes('renderImpact'), 'página administrativa não renderiza classificação e motivos');
check(reviewJs.includes('classificationReasons'), 'motivos automáticos não aparecem na revisão');

if (failures.length) {
  console.error('[budget-simplification-auto-moderation-contract] falhou');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[budget-simplification-auto-moderation-contract] ok');
console.log('- imagens existentes controlam a validação sem required estático');
console.log('- orçamento customizado mantém apenas campos mínimos e perguntas do profissional');
console.log('- classificação automática governa visibilidade e revisão');
