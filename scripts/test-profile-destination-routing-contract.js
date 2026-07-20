#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const registrySource = read('assets/js/core/navigation-registry.js');
const sandbox = {
  URL,
  window: {
    location: {
      origin: 'https://doke.local',
      pathname: '/index.html'
    }
  }
};
sandbox.window.window = sandbox.window;
vm.runInNewContext(registrySource, sandbox, { filename: 'navigation-registry.js' });

const registry = sandbox.window.DokeNavigationRegistry;
assert(registry && typeof registry.resolveProfileDestination === 'function', 'O registro deve expor resolveProfileDestination como autoridade canônica.');

const approvedUser = {
  id: 'approved-user',
  role: 'professional',
  ownerProfileUrl: 'tornar-profissional.html'
};
const approvedProfile = {
  status: 'active',
  verificationStatus: 'verified',
  documentStatus: 'verified'
};

if (registry) {
  const approved = registry.resolveProfileDestination({ user: approvedUser, professionalProfile: approvedProfile });
  assert(approved.href === 'perfil-profissional.html', 'Conta profissional ativa e verificada deve abrir perfil-profissional.html.');
  assert(approved.state === 'professional_active', 'Conta aprovada deve resolver o estado professional_active.');
  assert(registry.getOwnerProfileUrl(approvedUser) === 'perfil-profissional.html', 'URL persistida antiga não pode vencer role=professional.');

  const pending = registry.resolveProfileDestination({
    user: { id: 'pending-user', role: 'client' },
    professionalProfile: { status: 'pending_verification', verificationStatus: 'under_review', documentStatus: 'submitted' }
  });
  assert(pending.href === 'verificacao-profissional.html', 'Conta pendente deve abrir acompanhamento da verificação.');
  assert(pending.state === 'verification_pending', 'Conta pendente deve resolver verification_pending.');

  const rejected = registry.resolveProfileDestination({
    user: { id: 'rejected-user', role: 'client' },
    professionalProfile: { status: 'pending_verification', verificationStatus: 'rejected', documentStatus: 'rejected' }
  });
  assert(rejected.href === 'verificacao-profissional.html', 'Conta rejeitada deve abrir correção e reenvio.');
  assert(rejected.state === 'verification_rejected', 'Conta rejeitada deve resolver verification_rejected.');
  assert(rejected.label === 'Corrigir e reenviar', 'Conta rejeitada deve expor a ação Corrigir e reenviar.');

  const draft = registry.resolveProfileDestination({
    user: { id: 'draft-user', role: 'client' },
    professionalProfile: { status: 'draft', verificationStatus: 'not_started', documentStatus: 'not_started' }
  });
  assert(draft.href === 'tornar-profissional.html', 'Cadastro profissional incompleto deve voltar ao onboarding.');
  assert(draft.state === 'onboarding_incomplete', 'Cadastro incompleto deve resolver onboarding_incomplete.');

  const staleRoleApproved = registry.resolveProfileDestination({
    user: { id: 'stale-approved-user', role: 'client' },
    professionalProfile: approvedProfile,
    verification: { status: 'verified' }
  });
  assert(staleRoleApproved.href === 'perfil-profissional.html', 'Perfil remoto ativo/verificado deve vencer role antigo armazenado na sessão.');
  assert(staleRoleApproved.state === 'professional_active', 'Role antigo não pode rebaixar uma conta profissional aprovada.');

  const client = registry.resolveProfileDestination({ user: { id: 'client-user', role: 'client' } });
  assert(client.href === 'meu-perfil.html', 'Cliente sem cadastro profissional deve manter o perfil pessoal.');

  const documentPending = registry.resolveProfileDestination({
    user: { id: 'doc-pending', role: 'professional' },
    professionalProfile: { status: 'active', verificationStatus: 'verified', documentStatus: 'under_review' }
  });
  assert(documentPending.href === 'verificacao-profissional.html', 'Documento ainda pendente não pode liberar o perfil profissional.');

  const suspended = registry.resolveProfileDestination({
    user: { id: 'suspended-user', role: 'professional' },
    professionalProfile: { status: 'suspended', verificationStatus: 'verified', documentStatus: 'verified' }
  });
  assert(suspended.href === 'meu-perfil.html', 'Perfil suspenso não deve ser enviado incorretamente para a verificação.');
  assert(suspended.state === 'professional_suspended', 'Perfil suspenso deve preservar um estado próprio.');
}

const appSource = read('assets/js/core/app.js');
const becomeProSource = read('assets/js/pages/tornar-profissional.js');
const ownerProfileSource = read('assets/js/pages/owner-profile-experience.js');
const setupServiceSource = read('assets/js/services/professional-profile-setup-service.js');
const drawerSource = read('assets/js/ui/mobile-drawer-standard.js');
const mobileShellSource = read('assets/js/components/mobile-app-shell.js');
const accessServiceSource = read('assets/js/services/professional-access-service.js');
const permissionsSource = read('assets/js/core/permissions.js');

const permissionSandbox = {
  window: { Doke: {}, localStorage: { getItem() { return null; }, setItem() {} } },
  document: { dispatchEvent() {} },
  CustomEvent: function CustomEvent() {}
};
permissionSandbox.window.window = permissionSandbox.window;
vm.runInNewContext(permissionsSource, permissionSandbox, { filename: 'permissions.js' });
const evaluateProfessionalAccess = permissionSandbox.window.Doke.permissions?.evaluateProfessionalAccess;
assert(typeof evaluateProfessionalAccess === 'function', 'permissions deve expor evaluateProfessionalAccess.');
if (typeof evaluateProfessionalAccess === 'function') {
  const allowed = evaluateProfessionalAccess('access_professional_profile', {
    user: { id: 'approved-user', role: 'professional' },
    professionalProfile: approvedProfile,
    verification: { status: 'verified', documentStatus: 'verified' }
  });
  assert(allowed.allowed === true, 'Conta ativa com identidade e documentos verificados deve acessar o perfil profissional.');

  const blockedDocument = evaluateProfessionalAccess('access_professional_profile', {
    user: { id: 'doc-pending', role: 'professional' },
    professionalProfile: { status: 'active', verificationStatus: 'verified', documentStatus: 'under_review' },
    verification: { status: 'verified', documentStatus: 'under_review' }
  });
  assert(blockedDocument.allowed === false && blockedDocument.reason === 'professional_verification_pending', 'Documento pendente deve bloquear acesso profissional com motivo canônico.');
}

assert(appSource.includes('isAccountProfileNavigationTarget'), 'app.js deve auditar links, avatar e data-header-nav como alvos de perfil.');
assert(appSource.includes('[data-header-nav="meu-perfil.html"]'), 'app.js deve sincronizar o botão de avatar/perfil.');
assert(becomeProSource.includes("'professional_active', 'verification_pending', 'verification_rejected'"), 'tornar-profissional deve redirecionar estados aprovados, pendentes e rejeitados.');
assert(becomeProSource.includes("const verificationComplete = verificationStatus === 'verified' && documentStatus === 'verified'"), 'tornar-profissional deve impedir Iniciar verificação quando identidade e documentos já estão verificados.');
assert(ownerProfileSource.includes('resolveProfileDestination'), 'meu-perfil deve consultar a autoridade canônica antes de renderizar.');
assert(ownerProfileSource.includes('replace: true'), 'Redirecionamentos de perfil devem substituir a entrada inválida no histórico.');
assert(setupServiceSource.includes('documentStatus:row.document_status'), 'O setup service deve projetar document_status para a decisão canônica.');
assert(drawerSource.includes('registry.getOwnerProfileUrl(user)'), 'Drawer mobile deve delegar o destino ao registro canônico.');
assert(mobileShellSource.includes('NAVIGATION_REGISTRY.getOwnerProfileUrl(user)'), 'Bottom navigation/mobile shell deve delegar o destino ao registro canônico.');
assert(accessServiceSource.includes("=== 'supabase'"), 'O guard do perfil profissional deve consultar o Supabase para sessões remotas.');
assert(accessServiceSource.includes("from('professional_profiles')"), 'O guard deve validar professional_profiles no Supabase.');
assert(permissionsSource.includes('documentStatus'), 'A permissão profissional deve considerar document_status.');

if (failures.length) {
  console.error('[test:profile-destination-routing-contract] falhou');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('[test:profile-destination-routing-contract] ok');
console.log('- approved -> perfil-profissional.html');
console.log('- pending/rejected -> verificacao-profissional.html');
console.log('- draft -> tornar-profissional.html');
console.log('- client/suspended -> meu-perfil.html');
