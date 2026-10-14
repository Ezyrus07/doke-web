// Explicit synthetic backend adapter for the local demonstration only.
// Production repositories, access policy and signed upload code are not replaced.
const fs=require('node:fs');
const path=require('node:path');
const base=require('./marketplace-demo.cjs');
const professional={...base.professional,handle:'profissional.demo',initials:'PD'};
const candidate={...professional,role:'client',type:'client'};
const defaultPayload={mainCategory:'Limpeza',specialties:'Limpeza residencial',shortBio:'Profissional fictício para demonstração de limpeza residencial.',serviceRegion:'Belo Horizonte, MG',experienceYears:'3 anos',truthConfirmed:true,termsAccepted:true};
async function setup(page,options={}){
  await base.setup(page);
  let catalog=[base.service];
  let profiles=options.onboarding?[]:[{id:'professional_profile_'+professional.id,userId:professional.id,status:'active',verificationStatus:'verified',documentStatus:'verified',payload:defaultPayload}];
  const actors=new Map([[professional.id,options.onboarding?candidate:professional]]);
  await page.exposeFunction('demoSaveService',item=>{catalog=catalog.filter(s=>s.id!==item.id).concat(item);return true;});
  await page.exposeFunction('demoSaveProfile',({profile,actor})=>{profiles=profiles.filter(p=>p.userId!==profile.userId).concat(profile);if(actor)actors.set(actor.id,actor);return true;});
  await page.route('**/assets/js/**',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='127.0.0.1')return route.fallback();
    const name=url.pathname;
    const source=()=>fs.readFileSync(path.join(__dirname,'../..',name),'utf8');
    if(name.endsWith('/repositories/services-repository.js')){
      return route.fulfill({contentType:'application/javascript',body:source()+`\n(()=>{const repo=Doke.repositories.services;${JSON.stringify(catalog)}.forEach(item=>repo.save(item));const persist=async(method,args)=>{if(window.demoCatalogFailure)throw new Error('Não foi possível salvar o anúncio de demonstração. Tente novamente.');const saved=await repo[method](...args);await window.demoSaveService(saved);return saved;};Doke.repositories.services=Object.freeze({...repo,save:(...args)=>persist('save',args),update:(...args)=>persist('update',args)});})();`});
    }
    if(name.endsWith('/repositories/professional-profiles-repository.js')){
      const seeded=source().replace('repositories.professionalProfiles = Object.freeze({',`${JSON.stringify(profiles)}.forEach(profile => fixtureProfiles.set(profile.userId, normalizeProfile(profile)));\n  repositories.professionalProfiles = Object.freeze({`);
      return route.fulfill({contentType:'application/javascript',body:seeded});
    }
    if(name.endsWith('/services/professional-profile-setup-service.js')||name.endsWith('/services/professional-profile-service.js')||name.endsWith('/core/supabase-config.js')){
      // Preserve the local server's remote-service disablement transformation.
      let body;
      if(name.endsWith('/core/supabase-config.js')){
        const report=(type,extra={})=>options.observeTransport?.({type,time:Date.now(),path:name,...extra});
        report('fetch-start');
        try {
          const response=await route.fetch();
          report('fetch-response',{status:response.status()});
          body=await response.text();
          report('fetch-body-complete',{bytes:Buffer.byteLength(body)});
        } catch(error) {
          report('fetch-error',{name:error.name,connectionReset:error.message.includes('ECONNRESET')});
          throw error;
        }
      } else body=source();
      return route.fulfill({contentType:'application/javascript',body:body+`\n(${installProfileAdapter.toString()})();`});
    }
    return route.fallback();
  });
  return {
    catalog:()=>catalog,
    async switchActor(actor,url){await base.switchActor(page,actors.get(actor.id)||actor,url);},
    async approveProfile(){
      await page.evaluate(async()=>{const repo=Doke.repositories.professionalProfiles;const actor=Doke.session.getCurrentUser();let profile=await repo.getByUserId(actor.id);if(!profile||profile.status!=='pending_verification')throw new Error('Crie o perfil antes da aprovação fictícia.');await repo.setVerificationStatus(profile.id,'verified');profile=await repo.transition(profile.id,'active');const next={...actor,role:'professional',type:'professional'};localStorage.setItem('demo.actor',JSON.stringify(next));Doke.session.setCurrentUser(next);await window.demoSaveProfile({profile,actor:next});});
    },
    async approveService(id){
      await page.evaluate(async id=>{const repo=Doke.repositories.services;const current=await repo.getById(id);if(!current||!['pending_review','changes_pending_review'].includes(current.moderationStatus))throw new Error('Envie o anúncio para análise antes da aprovação fictícia.');await repo.save({...current,status:'active',moderationStatus:'published',approvedVersionId:'demo-approved-'+Date.now()});},id);
    }
  };
}
function installProfileAdapter(){
  const Doke=window.Doke;
  if(!Doke?.services)return;
  const original=window.DokeSupabase||{};
  window.DokeSupabase={...original,invokeSelfService:async(action,params)=>{
    if(window.demoProfileFailure)throw new Error('Não foi possível salvar o perfil de demonstração. Tente novamente.');
    const actor=Doke.session.getCurrentUser();
    if(!actor?.id?.startsWith('demo_'))throw new Error('Apenas identidades sintéticas neste executor.');
    const repo=Doke.repositories.professionalProfiles;
    if(action==='get_account_identity_state')return {userId:actor.id,profile:{...actor,...actor.profile,userId:actor.id}};
    if(action==='save_professional_profile_setup'){
      const profile=await repo[params.p_complete?'completeSetup':'saveDraft'](actor.id,{payload:params.p_payload,currentStep:params.p_current_step});
      await window.demoSaveProfile({profile});return profile;
    }
    if(action==='update_professional_profile_reconciled'){
      const profile=await repo.updateActiveProfile(actor.id,params.p_professional_payload);
      const publicProfile={userId:actor.id,name:params.p_display_name,displayName:params.p_display_name,handle:params.p_username,city:params.p_city,state:params.p_state,bio:params.p_bio,interests:params.p_interests,avatarUrl:params.p_avatar_url,coverUrl:params.p_cover_url};
      const next={...actor,...publicProfile,profile:publicProfile};
      localStorage.setItem('demo.actor',JSON.stringify(next));Doke.session.setCurrentUser(next);
      await window.demoSaveProfile({profile,actor:next});
      return {userId:actor.id,profile:publicProfile,professionalProfile:profile};
    }
    throw new Error('Operação indisponível na demonstração: '+action);
  }};
  if(Doke.services.professionalProfileSetup){const setup=Doke.services.professionalProfileSetup;Doke.services.professionalProfileSetup=Object.freeze({...setup,getCurrentProfileSetup:()=>Doke.repositories.professionalProfiles.getByUserId(Doke.session.getCurrentUser()?.id)});}
}
module.exports={setup,professional,candidate,client:base.client};
