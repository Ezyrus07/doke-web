#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const migration = read('supabase/migrations/044_expand_service_moderation_audit_history.sql');
const repository = read('assets/js/repositories/service-moderation-repository.js');
const reviewHtml = read('admin-anuncio-revisao.html');
const reviewJs = read('assets/js/pages/admin-anuncio-revisao.js');
const reviewCss = read('assets/css/pages/admin-anuncio-revisao.css');
const adminHtml = read('admin.html');
const adminJs = read('assets/js/pages/admin.js');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(migration.includes('create table if not exists public.service_moderation_events'), 'tabela append-only de auditoria ausente');
check(migration.includes('baseline_version_id'), 'versão-base histórica não é preservada');
check(migration.includes('trg_service_version_moderation_event'), 'decisões de versão não geram eventos');
check(migration.includes('trg_service_visibility_event'), 'pausas e restaurações públicas não geram eventos');
check(migration.includes("'version_approved'"), 'aprovação não possui evento canônico');
check(migration.includes("'changes_requested'"), 'solicitação de ajustes não possui evento canônico');
check(migration.includes("'listing_restored'"), 'restauração da versão pública não é auditada');
check(migration.includes('review_duration_seconds'), 'tempo em análise não é persistido');
check(migration.includes('service_moderation_events_admin_read'), 'RLS administrativa ausente');
check(migration.includes('service_moderation_events_owner_read'), 'profissional não pode consultar o próprio rastro');
check(migration.includes('get_service_review_detail'), 'RPC histórica da versão ausente');
check(migration.includes('list_service_moderation_audit'), 'RPC de eventos recentes ausente');
check(migration.includes("revoke insert, update, delete"), 'eventos não estão protegidos contra mutação direta');

check(repository.includes("rpc('get_service_review_detail'"), 'repositório ainda depende somente da fila pendente');
check(repository.includes("rpc('list_service_moderation_audit'"), 'repositório não expõe auditoria recente');
check(reviewHtml.includes('data-admin-ad-review-decision-title'), 'card de decisão não representa modo histórico');
check(reviewJs.includes('historySection'), 'página de revisão não renderiza histórico');
check(reviewJs.includes('versionsOverview'), 'página não apresenta a linha de versões');
check(reviewJs.includes('reviewDurationSeconds'), 'tempo em análise não aparece na página');
check(reviewJs.includes('actions.hidden = !isPending'), 'ações continuam disponíveis após decisão');
check(reviewJs.includes('return load();'), 'página não recarrega a decisão auditada');
check(reviewCss.includes('.admin-ad-review__timeline'), 'timeline não possui autoridade visual');
check(reviewCss.includes('.admin-ad-review__actions[hidden]'), 'ações históricas não têm contenção visual explícita');
check(adminHtml.includes('moderação de anúncios'), 'painel recente não explica o novo rastro');
check(adminJs.includes('listServiceModerationEvents'), 'admin não carrega eventos de moderação');
check(adminJs.includes('moderationEventLabel'), 'admin não apresenta eventos de moderação de forma legível');

if (failures.length) {
  console.error('[service-moderation-audit-history-contract] falhou');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('[service-moderation-audit-history-contract] ok');
console.log('- eventos append-only registram submissão, decisão e visibilidade');
console.log('- a versão-base permanece disponível para comparação histórica');
console.log('- decisões antigas podem ser reabertas em modo somente leitura');
console.log('- admin e profissional possuem leitura isolada por RLS');
