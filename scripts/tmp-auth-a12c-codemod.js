#!/usr/bin/env node
'use strict';
const fs=require('fs');
function read(f){return fs.readFileSync(f,'utf8');}
function write(f,s){fs.writeFileSync(f,s);}
function rep(s,p,r,l){if(!p.test(s))throw new Error('missing '+l);p.lastIndex=0;return s.replace(p,r);}

let s=read('assets/js/repositories/users-repository.js');
s=rep(s,/  const PROFESSIONAL_PROFILES_STORAGE_KEY[\s\S]*?\n  const PROFESSIONAL_VERIFICATIONS_STORAGE_KEY.*?\n/,'','professional storage constants');
s=rep(s,/  const newestByTimestamp[\s\S]*?(?=  const writeLocalUsers)/,'','professional read promotion');
s=rep(s,/    const reconciled = Array\.from\(byEmail\.values\(\)\)\.map\(reconcileProfessionalUser\);[\s\S]*?    return reconciled;/,'    return Array.from(byEmail.values());','list promotion persistence');
s=rep(s,/  const LOCAL_PROFESSIONAL_FIXTURE_FIELDS[\s\S]*?(?=  repositories\.users)/,'','fixture mutation implementation');
s=rep(s,/\n    updateProfessionalFixtureUser,/, '', 'fixture mutation export');
write('assets/js/repositories/users-repository.js',s);

s=read('assets/js/services/professional-access-service.js');
s=rep(s,/  function hasConfiguredSupabase[\s\S]*?(?=  function mapRemoteProfessionalProfile)/,`  function usesSupabaseProvider() {
    var session = currentSession();
    return String(session && session.provider || '').trim().toLowerCase() === 'supabase';
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function professionalAuthorityUnavailable() {
    var error = new Error('Autoridade server-side de acesso profissional indisponível.');
    error.code = 'DOKE_PROFESSIONAL_AUTHORITY_UNAVAILABLE';
    return error;
  }

`,'access provider boundary');
s=rep(s,/  function resolveRemoteContext\(actor\) \{[\s\S]*?(?=  function profilesRepository)/,`  function resolveRemoteContext(actor) {
    var client = supabaseClient();
    if (!client || typeof client.from !== 'function') return Promise.reject(professionalAuthorityUnavailable());
    return Promise.all([
      client.from('users').select('id,role,status').eq('id', actor.id).maybeSingle(),
      client.from('professional_profiles').select('*').eq('user_id', actor.id).maybeSingle(),
      client.from('professional_identity_verifications').select('*').eq('user_id', actor.id).maybeSingle()
    ]).then(function (items) {
      if (items[0] && items[0].error) throw items[0].error;
      if (items[1] && items[1].error) throw items[1].error;
      if (items[2] && items[2].error) throw items[2].error;
      var account = items[0] && items[0].data;
      if (!account || String(account.id || '') !== String(actor.id)) return Promise.reject(professionalAuthorityUnavailable());
      var profile = mapRemoteProfessionalProfile(items[1] && items[1].data);
      var verification = mapRemoteVerification(items[2] && items[2].data);
      var accountRole = String(account.role || 'client').trim().toLowerCase();
      var canonicalUser = Object.freeze(Object.assign({}, actor, {
        role: accountRole,
        type: accountRole,
        accountStatus: account.status || actor.accountStatus || 'active',
        professionalProfileId: accountRole === 'professional' && profile ? profile.id : actor.professionalProfileId || '',
        publicProfileUrl: accountRole === 'professional' ? (actor.publicProfileUrl || 'perfil.html') : actor.publicProfileUrl,
        ownerProfileUrl: accountRole === 'professional' ? 'perfil-profissional.html' : actor.ownerProfileUrl
      }));
      return { user: canonicalUser, professionalProfile: profile, verification: verification };
    });
  }

`,'remote professional context');
s=rep(s,/  function usersRepository[\s\S]*?(?=  function resolveContext)/,'','local professional mutation helpers');
s=rep(s,/    if \(usesSupabaseProvider\(actor\)\) return resolveRemoteContext\(actor\);/,'    if (usesSupabaseProvider()) return resolveRemoteContext(actor);\n    if (isUuid(actor.id)) return Promise.reject(professionalAuthorityUnavailable());','access remote selection');
s=rep(s,/    return Promise\.all\(\[profilePromise, verificationPromise\]\)\.then\(function \(items\) \{[\s\S]*?    \}\);/,'    return Promise.all([profilePromise, verificationPromise]).then(function (items) {\n      return { user: actor, professionalProfile: items[0] || null, verification: items[1] || null };\n    });','read-only local context');
write('assets/js/services/professional-access-service.js',s);

s=read('assets/js/services/professional-identity-verification-service.js');
s=rep(s,/  function usersRepository[\s\S]*?(?=  function supabaseClient)/,'','verification user/auth helpers');
s=rep(s,/  function usesSupabaseProvider\(\) \{[\s\S]*?(?=  function remoteRpc)/,`  function usesSupabaseProvider() {
    var client = supabaseClient();
    var session = Doke.session && typeof Doke.session.getSession === 'function' ? Doke.session.getSession() : null;
    return Boolean(client && session && String(session.provider || '').toLowerCase() === 'supabase');
  }

  function reviewAuthorityUnavailable() {
    var error = new Error('Autoridade server-side de revisão profissional indisponível.');
    error.code = 'DOKE_PROFESSIONAL_REVIEW_AUTHORITY_UNAVAILABLE';
    return error;
  }

  function assertRemoteReviewerAuthority() {
    requireReviewer();
    if (!usesSupabaseProvider()) throw reviewAuthorityUnavailable();
  }

`,'verification provider boundary');
s=rep(s,/  function decideRemote\(verificationId, decision, rejectionReason\) \{[\s\S]*?(?=  function currentUser)/,`  function decideRemote(verificationId, decision, rejectionReason) {
    return remoteVerificationOperation('decide', {
      verificationId: verificationId,
      decision: decision,
      rejectionReason: rejectionReason || null
    }).then(function (data) {
      data = data || {};
      if (decision === 'approve' && (data.status !== 'verified' || data.role !== 'professional')) {
        var incomplete = new Error('O servidor não confirmou a promoção profissional.');
        incomplete.code = 'DOKE_PROFESSIONAL_ROLE_RECONCILIATION_INCOMPLETE';
        throw incomplete;
      }
      var normalized = {
        id: data.publicVerificationId || data.verificationId || verificationId,
        userId: data.userId || '',
        status: data.status || (decision === 'approve' ? 'verified' : 'rejected'),
        role: data.role || '',
        reviewerId: data.reviewerId || '',
        decidedAt: data.decidedAt || new Date().toISOString(),
        rejectionReason: rejectionReason || ''
      };
      window.dispatchEvent(new CustomEvent(
        decision === 'approve' ? 'doke:professional-verification-approved' : 'doke:professional-verification-rejected',
        { detail: { verification: normalized, role: normalized.role, remote: true, reconciled: true } }
      ));
      return normalized;
    });
  }

`,'remote decision reconciliation');
s=rep(s,/  function usesApiProvider[\s\S]*?(?=  function normalizeText)/,'','retired provider facade');
s=s.replace("    if (!usesSupabaseProvider()) assertLocalProvider();\n",'');
s=rep(s,/    if \(!user \|\| \['support', 'admin'\]\.indexOf\(role\) === -1\)/,"    if (!user || ['admin', 'moderator'].indexOf(role) === -1)",'reviewer role alignment');
s=rep(s,/  function listForReview\(filters\) \{[\s\S]*?(?=  function resolveProfessionalProfile)/,`  function listForReview(filters) {
    assertRemoteReviewerAuthority();
    filters = filters || {};
    return remoteVerificationOperation('list', { status: filters.status || null, limit: filters.limit || 100 })
      .then(function (result) { return (Array.isArray(result && result.items) ? result.items : []).map(mapRemoteVerification); });
  }

  function getReviewDetail(verificationId) {
    assertRemoteReviewerAuthority();
    return remoteVerificationOperation('detail', { verificationId: String(verificationId || '') }).then(function (result) {
      var row = result && result.item;
      if (!row) throw new Error('Verificação de identidade não encontrada.');
      return hydrateRemoteDocumentUrls(mapRemoteVerification(row));
    });
  }

  function startReview(verificationId) {
    assertRemoteReviewerAuthority();
    return remoteVerificationOperation('start', { verificationId: String(verificationId || '') })
      .then(function (value) { return getReviewDetail(value.id || verificationId); });
  }

`,'remote reviewer operations');
s=rep(s,/  function resolveProfessionalProfile[\s\S]*?(?=  function approve)/,'','local activation authority');
s=rep(s,/  function approve\(verificationId\) \{[\s\S]*?(?=  function reject)/,`  function approve(verificationId) {
    assertRemoteReviewerAuthority();
    return decideRemote(verificationId, 'approve', '');
  }

`,'remote approve');
s=rep(s,/  function reject\(verificationId, reason\) \{[\s\S]*?(?=  function reopenRejected)/,`  function reject(verificationId, reason) {
    var message = normalizeText(reason, 500);
    if (message.length < 10) return Promise.reject(validationError('Informe um motivo de rejeição com pelo menos 10 caracteres.', 'rejectionReason'));
    assertRemoteReviewerAuthority();
    return decideRemote(verificationId, 'reject', message);
  }

`,'remote reject');
s=s.replace('    assertLocalProvider();\n','');
write('assets/js/services/professional-identity-verification-service.js',s);

s=read('assets/js/contracts/identity-profile-contract.js');
s=s.replace("version: 'AUTH-A12B.3'","version: 'AUTH-A12C'");
s=s.replace("professionalFixtureMutationBoundary: 'isolated-pending-A12C'","professionalRoleAuthority: 'server-only',\n    professionalReviewerAuthority: 'professional-verification-operations',\n    professionalFixtureMutationBoundary: 'retired',\n    manualProfessionalSessionRewrite: 'retired'");
write('assets/js/contracts/identity-profile-contract.js',s);

s=read('docs/AUTH-INTEGRATION-CONTRACT.md');
s=s.replace('- mutações locais genéricas de conta, perfil e configurações foram retiradas no AUTH-A12B.2.','- mutações locais genéricas de conta, perfil e configurações foram retiradas no AUTH-A12B.2;\n- onboarding local foi retirado no AUTH-A12B.3;\n- promoção local de role profissional, revisão administrativa local e reescritas profissionais de sessão foram retiradas no AUTH-A12C.');
s=s.replace('- `AUTH-A12B.2` — implementação em validação: mutações genéricas retiradas; fixture profissional isolada em `updateProfessionalFixtureUser` até o AUTH-A12C;\n- `AUTH-A12B.3` — pendente: retirar mutação local residual de onboarding e reescritas manuais de sessão;\n- `AUTH-A12C` — pendente: retirar promoção local de role e reescrita de sessão dos fluxos profissionais.','- `AUTH-A12B.2` — concluído: mutações genéricas locais retiradas;\n- `AUTH-A12B.3` — concluído: onboarding local e reescritas manuais retirados;\n- `AUTH-A12C` — implementação em validação: role profissional e decisões de revisão são server-only.');
s=s.replace('A única mutação local ainda exportada é `updateProfessionalFixtureUser`, explicitamente limitada a fixtures não UUID e pendente de retirada no AUTH-A12C. Ela nunca é fallback aceitável para falha do Supabase.','O repositório local de usuários não exporta mutações. Fixtures locais são somente leitura e não podem derivar ou persistir role profissional.');
write('docs/AUTH-INTEGRATION-CONTRACT.md',s);

s=read('docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.md');
s=s.replace('`IN PROGRESS` — `AUTH-A12A`, `AUTH-A12B.1`, `AUTH-A12B.2` e `AUTH-A12B.3` estão `DONE`. Apenas `AUTH-A12C` permanece pendente antes do encerramento do AUTH-A12.','`IN PROGRESS` — `AUTH-A12A`, `AUTH-A12B.1`, `AUTH-A12B.2` e `AUTH-A12B.3` estão `DONE`. `AUTH-A12C` está em implementação e validação.');
s += '\n\n## AUTH-A12C — autoridade profissional server-only (em validação)\n\n- `public.users.role` é a única fonte de role profissional;\n- `professional-verification-operations` e `decide_professional_identity_verification_internal` são a autoridade de decisão;\n- `updateProfessionalFixtureUser`, promoção durante leitura e reescritas de sessão foram retirados;\n- fixtures locais preexistentes permanecem somente leitura;\n- nenhuma migration, Edge deploy ou alteração de staging foi necessária.\n';
write('docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.md',s);

const pkg=JSON.parse(read('package.json'));
pkg.scripts['test:auth-professional-authority-retirement']='node tests/auth/test-auth-professional-authority-retirement-runtime.js';
write('package.json',JSON.stringify(pkg,null,2)+'\n');

s=read('.github/workflows/quality.yml');
const marker='      - name: Audit desktop shell contracts\n';
if(!s.includes('Test professional authority retirement'))s=s.replace(marker,"      - name: Test professional authority retirement\n        run: npm run test:auth-professional-authority-retirement\n\n"+marker);
write('.github/workflows/quality.yml',s);

for(const f of ['assets/js/repositories/users-repository.js','assets/js/services/professional-access-service.js','assets/js/services/professional-identity-verification-service.js']){
 const x=read(f); if(x.includes('updateProfessionalFixtureUser')||x.includes('Doke.session.setCurrentUser'))throw new Error('retired authority remains in '+f);
}
console.log('AUTH-A12C codemod applied');
