/* Doke Professional Profile Setup Service
   Responsibility: validation and Supabase persistence for professional profile setup. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});
  var STATUS_PRESENTATION = Object.freeze({
    draft: Object.freeze({ label: 'Rascunho', title: 'Continue seu perfil profissional', description: 'Suas informações ficam salvas até você concluir a criação do perfil.' }),
    pending_verification: Object.freeze({ label: 'Perfil criado', title: 'Perfil profissional criado', description: 'Seu perfil foi salvo. A verificação de identidade será o próximo passo antes de liberar anúncios e pagamentos.' }),
    active: Object.freeze({ label: 'Ativo', title: 'Perfil profissional ativo', description: 'Seu perfil profissional está ativo.' }),
    suspended: Object.freeze({ label: 'Restrito', title: 'Perfil profissional restrito', description: 'Algumas funções profissionais estão temporariamente indisponíveis.' })
  });

  function client() {
    try { return window.DokeSupabase && window.DokeSupabase.getClient ? window.DokeSupabase.getClient() : null; }
    catch (_) { return null; }
  }
  function currentUser() { return Doke.session && Doke.session.getCurrentUser ? Doke.session.getCurrentUser() : null; }
  function normalizeText(value, maxLength) { var text=String(value==null?'':value).trim().replace(/\s+/g,' '); return maxLength?text.slice(0,maxLength):text; }
  function normalizeBoolean(value) { return value===true||value==='true'||value==='on'||value===1||value==='1'; }
  function normalizeFile(value) { if(!value||typeof value!=='object')return null; var name=normalizeText(value.fileName||value.name,180); return name?{fileName:name,size:Math.max(0,Number(value.size||0)||0),type:normalizeText(value.type,100)}:null; }
  function normalizePayload(fields) {
    fields=fields||{};
    return { mainCategory:normalizeText(fields.mainCategory,80), otherCategory:normalizeText(fields.otherCategory,80), specialties:normalizeText(fields.specialties||fields.specialty,180), shortBio:normalizeText(fields.shortBio,350), serviceRegion:normalizeText(fields.serviceRegion,140), experienceYears:normalizeText(fields.experienceYears,60), experienceEvidence:normalizeFile(fields.experienceEvidence), truthConfirmed:normalizeBoolean(fields.truthConfirmed), termsAccepted:normalizeBoolean(fields.termsAccepted||fields.conductAccepted) };
  }
  function validationError(message,field){var e=new Error(message);e.code='PROFESSIONAL_PROFILE_SETUP_VALIDATION';e.field=field||'';return e;}
  function validateStep(payload,step){payload=normalizePayload(payload);var n=Number(step||1);if(n===1){if(!payload.mainCategory)throw validationError('Selecione a categoria principal.','mainCategory');if(payload.mainCategory==='Outros'&&payload.otherCategory.length<3)throw validationError('Escreva qual é a sua categoria.','otherCategory');if(payload.specialties.length<3)throw validationError('Informe suas especialidades ou os serviços que pretende oferecer.','specialties');if(payload.shortBio.length<20)throw validationError('Escreva uma apresentação com pelo menos 20 caracteres.','shortBio');if(payload.serviceRegion.length<3)throw validationError('Informe a região onde pretende atender.','serviceRegion');}if(n===2){if(!payload.truthConfirmed)throw validationError('Confirme que as informações são verdadeiras.','truthConfirmed');if(!payload.termsAccepted)throw validationError('Aceite os termos e regras profissionais.','termsAccepted');}return payload;}
  function validateAll(payload){var p=normalizePayload(payload);validateStep(p,1);validateStep(p,2);return p;}
  function requireOwner(){var u=currentUser();if(!u||!u.id)throw new Error('Entre na sua conta para continuar.');var role=String(u.role||u.type||'client').toLowerCase();if(role==='professional')throw new Error('Sua conta já possui acesso profissional.');if(['support','admin','moderator'].indexOf(role)>=0)throw new Error('Contas administrativas não podem criar perfil profissional.');return u;}
  function rpc(name,args){var c=client();if(!c||!c.rpc)return Promise.reject(new Error('Supabase indisponível para salvar o perfil profissional.'));return c.rpc(name,args).then(function(r){if(r.error)throw r.error;return r.data;});}
  function mapProfile(row){if(!row)return null;return {id:row.id||('professional_profile_'+row.user_id),userId:row.user_id,status:row.setup_status||'draft',currentStep:Number(row.setup_current_step||1),payload:row.setup_payload||{},verificationStatus:row.verification_status||'not_started',documentStatus:row.document_status||'not_started',createdAt:row.created_at||'',updatedAt:row.updated_at||'',completedAt:row.setup_completed_at||''};}
  function getCurrentProfileSetup(){var u=currentUser();var c=client();if(!u||!u.id||!c)return Promise.resolve(null);return c.from('professional_profiles').select('*').eq('user_id',u.id).maybeSingle().then(function(r){if(r.error)throw r.error;return mapProfile(r.data);});}
  function saveDraft(draft){requireOwner();draft=draft||{};var payload=normalizePayload(draft.payload||draft.fields||{});return rpc('save_professional_profile_setup',{p_payload:payload,p_current_step:draft.currentStep||draft.step||1,p_complete:false}).then(function(profile){window.dispatchEvent(new CustomEvent('doke:professional-profile-draft-saved',{detail:{profile:profile,remote:true}}));return profile;});}
  function complete(draft){requireOwner();draft=draft||{};var payload=validateAll(draft.payload||draft.fields||{});return rpc('save_professional_profile_setup',{p_payload:payload,p_current_step:2,p_complete:true}).then(function(profile){window.dispatchEvent(new CustomEvent('doke:professional-profile-created',{detail:{profile:profile,remote:true}}));return profile;});}
  function getStatusPresentation(status){return STATUS_PRESENTATION[status]||STATUS_PRESENTATION.draft;}
  services.professionalProfileSetup=Object.freeze({statuses:Object.freeze({DRAFT:'draft',PENDING_VERIFICATION:'pending_verification',ACTIVE:'active',SUSPENDED:'suspended'}),getCurrentProfileSetup:getCurrentProfileSetup,saveDraft:saveDraft,complete:complete,normalizePayload:normalizePayload,validateStep:validateStep,validateAll:validateAll,getStatusPresentation:getStatusPresentation});
})();
