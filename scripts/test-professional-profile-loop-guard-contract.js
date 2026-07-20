#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const failures = [];
const remoteCalls = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function main() {
  const user = {
    id: '640ce25e-7fad-475f-bd84-844a0419ed50',
    role: 'client',
    type: 'client'
  };
  const rows = {
    professional_profiles: {
      id: 'profile-approved',
      user_id: user.id,
      setup_status: 'active',
      verification_status: 'verified',
      document_status: 'verified'
    },
    professional_identity_verifications: {
      id: 'verification-approved',
      user_id: user.id,
      status: 'verified',
      rejection_reason: null
    }
  };

  const client = {
    from(table) {
      remoteCalls.push(table);
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle() { return Promise.resolve({ data: rows[table] || null, error: null }); }
      };
    }
  };

  const sandbox = {
    URL,
    Promise,
    setTimeout,
    clearTimeout,
    console,
    CustomEvent: function CustomEvent(name, init) { this.type = name; this.detail = init && init.detail; },
    document: {
      documentElement: { dataset: {} },
      dispatchEvent() {}
    },
    window: {
      location: {
        origin: 'https://doke.local',
        pathname: '/perfil-profissional.html',
        search: '',
        replace() {},
        assign() {}
      },
      DOKE_SUPABASE_CONFIG: {
        enabled: true,
        url: 'https://example.supabase.co',
        anonKey: 'anon'
      },
      DokeSupabase: { getClient() { return client; } },
      localStorage: { getItem() { return null; }, setItem() {} },
      Doke: {
        session: {
          // Reproduz o contrato legado: uma sessão real pode chegar normalizada como mock.
          getSession() { return { provider: 'mock', user }; },
          getCurrentUser() { return user; }
        }
      }
    }
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.document = sandbox.document;
  sandbox.window.CustomEvent = sandbox.CustomEvent;

  vm.runInNewContext(read('assets/js/core/permissions.js'), sandbox, { filename: 'permissions.js' });
  vm.runInNewContext(read('assets/js/services/professional-access-service.js'), sandbox, { filename: 'professional-access-service.js' });

  const access = sandbox.window.Doke.services && sandbox.window.Doke.services.professionalAccess;
  assert(access && typeof access.resolveContext === 'function', 'O serviço deve expor resolveContext.');
  assert(access && typeof access.can === 'function', 'O serviço deve expor can.');

  if (access) {
    const context = await access.resolveContext();
    assert(context.user && context.user.role === 'professional', 'O conjunto remoto aprovado deve corrigir um role antigo sem depender da tabela users.');
    assert(context.professionalProfile && context.professionalProfile.status === 'active', 'Sessão UUID com Supabase configurado deve consultar professional_profiles remoto.');
    assert(context.professionalProfile && context.professionalProfile.documentStatus === 'verified', 'O contexto remoto deve preservar document_status verificado.');
    assert(context.verification && context.verification.status === 'verified', 'O contexto remoto deve preservar a verificação de identidade.');

    const result = await access.can('access_professional_profile');
    assert(result.allowed === true, 'Conta remota aprovada não pode ser devolvida para verificacao-profissional.html.');
    assert(result.reason === 'allowed', 'Conta remota aprovada deve resolver o motivo allowed.');
  }

  assert(!remoteCalls.includes('users'), 'O guard não deve depender de leitura frontend da tabela users para resolver o perfil.');
  assert(remoteCalls.includes('professional_profiles'), 'O guard deve consultar professional_profiles em vez do repository local obsoleto.');
  assert(remoteCalls.includes('professional_identity_verifications'), 'O guard deve consultar professional_identity_verifications remoto.');

  const failedNavigation = [];
  const failingClient = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle() { return Promise.resolve({ data: null, error: new Error('context read failed') }); }
      };
    }
  };
  sandbox.window.DokeSupabase.getClient = function getClient() { return failingClient; };
  sandbox.window.location.replace = function replace(href) { failedNavigation.push(href); };
  sandbox.window.location.assign = function assign(href) { failedNavigation.push(href); };

  var contextFailureRaised = false;
  try {
    await access.guardPage('access_professional_profile', { hardRedirect: true });
  } catch (error) {
    contextFailureRaised = String(error && error.message || '').includes('context read failed');
  }
  assert(contextFailureRaised, 'Falha de leitura remota deve permanecer erro de contexto, sem virar falsa negação de acesso.');
  assert(failedNavigation.length === 0, 'Falha transitória de contexto não pode redirecionar e iniciar pingue-pongue entre páginas.');

  const verificationServiceSource = read('assets/js/services/professional-identity-verification-service.js');
  const verificationPageSource = read('assets/js/pages/verificacao-profissional.js');
  assert(verificationServiceSource.includes("['pending_verification','active'].indexOf(row.setup_status)"), 'O contexto da verificação deve aceitar perfil já ativo para decidir o redirecionamento canônico.');
  assert(verificationServiceSource.includes("documentStatus:row.document_status||'not_started'"), 'O contexto da verificação deve carregar document_status.');
  assert(verificationPageSource.includes("destination.state !== 'professional_active'"), 'A página de verificação deve detectar conta já aprovada.');
  assert(verificationPageSource.includes("source: 'verificacao-profissional-' + destination.state"), 'O redirecionamento aprovado deve usar origem rastreável e replace.');

  if (failures.length) {
    console.error('[test:professional-profile-loop-guard-contract] falhou');
    failures.forEach((failure) => console.error('- ' + failure));
    process.exit(1);
  }

  console.log('[test:professional-profile-loop-guard-contract] ok');
  console.log('- sessão antiga/mock usa o estado profissional remoto canônico');
  console.log('- perfil ativo/verificado permanece em perfil-profissional.html');
  console.log('- verificacao-profissional.html redireciona aprovado sem pingue-pongue');
}

main().catch((error) => {
  console.error('[test:professional-profile-loop-guard-contract] erro inesperado');
  console.error(error);
  process.exit(1);
});
