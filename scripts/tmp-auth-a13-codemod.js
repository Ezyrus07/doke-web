#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};

function appendOnce(file, marker, payload) {
  const current = read(file);
  if (!current.includes(marker)) write(file, current.replace(/\s*$/, '') + payload + '\n');
}

const runtimeFlagsPath = 'assets/js/config/runtime-flags.js';
let runtimeFlags = read(runtimeFlagsPath);
if (!runtimeFlags.includes("authProvider: 'mock'") && !runtimeFlags.includes("authProvider: 'supabase'")) {
  throw new Error('runtime-flags authProvider marker missing');
}
runtimeFlags = runtimeFlags.replace("authProvider: 'mock'", "authProvider: 'supabase'");
write(runtimeFlagsPath, runtimeFlags);

const packagePath = 'package.json';
const packageJson = JSON.parse(read(packagePath));
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts['test:auth-onboarding-authority-retirement'] = 'node tests/auth/test-auth-onboarding-local-authority-retirement-runtime.js';
packageJson.scripts['test:auth-professional-authority-retirement'] = 'node tests/auth/test-auth-professional-authority-retirement-runtime.js';
packageJson.scripts['audit:auth-domain-closure'] = 'node scripts/audit-auth-domain-closure.js';
write(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

const matrixPath = 'config/domain-completion-matrix.json';
const matrix = JSON.parse(read(matrixPath));
matrix.version = '1.3.3';
matrix.updatedAt = '2026-07-26T20:10:00-03:00';
matrix.runtimeBaseline = matrix.runtimeBaseline || {};
matrix.runtimeBaseline.authProvider = 'supabase';
matrix.runtimeBaseline.source = 'assets/js/core/runtime-config.js for auth; assets/js/config/runtime-flags.js for legacy data flags';

const auth = (matrix.domains || []).find((item) => item.id === 'AUTH-001');
if (!auth) throw new Error('AUTH-001 domain missing');
Object.assign(auth, {
  maturity: 4,
  userFacingAuthority: 'remote',
  serverAuthority: 'canonical',
  stagingEvidence: 'staging_operational',
  securityGate: 'partial',
  productionGate: 'blocked',
  completionDisposition: 'core_done_external_blocked',
  objective: 'Provide one Supabase-owned identity and session authority across every page while keeping externally blocked contact and paid security controls explicit.'
});
auth.requiredPaths = [
  'assets/js/config/runtime-flags.js',
  'assets/js/core/runtime-config.js',
  'assets/js/core/session.js',
  'assets/js/services/auth-service.js',
  'assets/js/services/auth-session-authority.js',
  'assets/js/services/auth-registration-authority.js',
  'assets/js/services/auth-password-authority.js',
  'assets/js/services/profile-service.js',
  'assets/js/services/onboarding-service.js',
  'assets/js/services/professional-access-service.js',
  'assets/js/services/professional-identity-verification-service.js',
  'assets/js/contracts/identity-profile-contract.js',
  'assets/js/repositories/users-repository.js',
  'supabase/migrations/093_identity_table_rls_authority.sql',
  'supabase/migrations/094_identity_role_materialization_authority.sql',
  'supabase/migrations/095_identity_rpc_authority_hardening.sql',
  'supabase/migrations/096_identity_helper_invoker_hardening.sql',
  'supabase/migrations/146_auth_registration_username_authority.sql',
  'supabase/migrations/147_identity_profile_reconciliation_authority.sql',
  'supabase/tests/015_auth_registration_username_authority_validation.sql',
  'supabase/tests/016_identity_profile_reconciliation_authority_validation.sql',
  'scripts/audit-auth-domain-closure.js',
  'docs/validation/AUTH-001-A07-CONTACT-CHANGE-PLAN.md',
  'docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.json',
  'docs/validation/AUTH-001-A13-DOMAIN-CLOSURE.md',
  'docs/validation/AUTH-001-A13-DOMAIN-CLOSURE.json'
];
auth.scanRoots = [
  'auth',
  'assets/js/config/runtime-flags.js',
  'assets/js/core/runtime-config.js',
  'assets/js/core/session.js',
  'assets/js/services/auth-',
  'assets/js/services/profile-service.js',
  'assets/js/services/onboarding-service.js',
  'assets/js/services/professional-',
  'assets/js/contracts/identity-profile-contract.js',
  'assets/js/repositories/users-repository.js',
  'tests/auth',
  'backend/modules/auth'
];
auth.tables = ['users', 'user_profiles', 'client_profiles', 'professional_profiles', 'professional_identity_verifications'];
auth.edgeFunctions = ['self-service-operations', 'professional-verification-operations'];
auth.crons = [];
auth.tests = [
  'test:real-auth-only-contract',
  'audit:auth-session',
  'audit:identity-profile-contract',
  'test:auth-local-profile-mutation-retirement',
  'test:auth-onboarding-authority-retirement',
  'test:auth-professional-authority-retirement',
  'audit:auth-domain-closure',
  'test:identity-rls-authority-contract',
  'test:identity-role-authority-runtime',
  'test:client-profile-authority-contract',
  'test:client-profile-authority-runtime'
];
auth.evidence = [
  'Supabase is the only active browser authentication provider; provider selection by query, window config or localStorage is retired.',
  'AUTH-A03 through AUTH-A06 validate fail-closed route guards, registration, recovery, refresh, reauthentication and logout.',
  'AUTH-A08 through AUTH-A10 physically retire local/mock browser auth and the historical /auth adapter.',
  'AUTH-A11 reconciles profile, settings and onboarding through server-side self-service operations.',
  'AUTH-A12 retires all remaining local credential, identity, onboarding and professional role/reviewer mutation authority.',
  'AUTH-A13 reconciles the machine-readable matrix and adds a permanent domain-closure regression audit.',
  'Quality, blocking E2E, 105 visual guards, staging Edge canary and Diagnostic have validated the Supabase-only runtime.'
];
auth.blockers = [
  {
    id: 'AUTH-EXT-MAIL-001',
    severity: 'high',
    category: 'external_mail_provider',
    description: 'Verified e-mail change and real transactional e-mail canaries remain blocked until MAIL-001 provider, redirect and deliverability configuration are approved.',
    targetPhase: 'Pre-launch'
  },
  {
    id: 'AUTH-EXT-SMS-001',
    severity: 'medium',
    category: 'external_sms_provider',
    description: 'Verified phone change remains intentionally unavailable until an SMS provider and cost policy are configured.',
    targetPhase: 'Pre-launch'
  },
  {
    id: 'AUTH-EXT-PAID-001',
    severity: 'high',
    category: 'paid_plan_security',
    description: 'Supabase leaked-password protection requires a paid plan and remains tracked by PAID-001 / SEC-B05.',
    targetPhase: 'Pre-launch'
  }
];
auth.nextActions = [
  'Proceed with PROF-001 as the next core engineering domain without declaring AUTH-001 production-ready.',
  'Execute AUTH-A07 only after MAIL-001 has controlled mailboxes, redirect policy and deliverability capacity.',
  'Keep phone change unavailable until an SMS provider and cost policy are approved.',
  'Enable and validate leaked-password protection after the Supabase plan upgrade.'
];
auth.exitCriteria = [
  'All protected pages derive identity from the canonical Supabase session.',
  'No browser route can select or fall back to mock/local authentication.',
  'Session refresh, recovery, reauthentication and logout remain E2E validated.',
  'No access token or refresh token enters the Doke public session snapshot.',
  'External e-mail, SMS and paid-plan blockers remain explicit until real provider evidence closes them.'
];

for (const flow of matrix.criticalFlows || []) {
  flow.blockers = Array.from(new Set((flow.blockers || []).filter((id) => id !== 'AUTH-B02' && id !== 'AUTH-B04')));
}

write(matrixPath, JSON.stringify(matrix, null, 2) + '\n');

appendOnce(
  'docs/AUTH-INTEGRATION-CONTRACT.md',
  '## AUTH-A13 — reconciliação de encerramento do domínio',
  `

## AUTH-A13 — reconciliação de encerramento do domínio

O núcleo técnico de \`AUTH-001\` está classificado como \`core_done_external_blocked\`.

- Supabase permanece o único provider ativo de autenticação no navegador;
- AUTH-001 usa autoridade de UI \`remote\`, servidor \`canonical\` e evidência \`staging_operational\`;
- \`AUTH-B02\` foi encerrado porque seleção/fallback mock foi fisicamente retirada;
- a parte técnica de sessão de \`AUTH-B04\` foi encerrada por AUTH-A05/A06;
- mudanças verificadas de contato foram separadas em blockers externos próprios;
- a proteção contra senhas vazadas permanece um blocker de plano pago.

Essa classificação não promove o domínio para produção. \`AUTH-EXT-MAIL-001\`, \`AUTH-EXT-SMS-001\` e \`AUTH-EXT-PAID-001\` continuam obrigatórios antes do lançamento.

O gate permanente é \`npm run audit:auth-domain-closure\`.
`
);

appendOnce(
  'docs/DOKE-ENGINEERING-JOURNAL.md',
  '# 2026-07-26 — AUTH-A13 / reconciliação de encerramento do AUTH-001',
  `

---

# 2026-07-26 — AUTH-A13 / reconciliação de encerramento do AUTH-001

**Status:** \`VALIDATION PENDING\`

**Branch:** \`auth/auth-001-baseline-audit\`

**Pull Request:** \`#9\`

## Problema

A matriz machine-readable ainda classificava autenticação como mock/híbrida e mantinha blockers históricos já encerrados, embora o runtime ativo estivesse Supabase-only.

## Decisão

- classificar o núcleo AUTH como \`core_done_external_blocked\`;
- atualizar a matriz para autoridade remota/canônica e staging operacional;
- separar dependências externas de e-mail, SMS e plano pago;
- impedir regressão da matriz ou dos runtime flags para provider mock;
- permitir handoff técnico a PROF-001 sem declarar AUTH production-ready.

## Implementação planejada neste lote

- reconciliar \`runtime-flags.js\`;
- atualizar \`config/domain-completion-matrix.json\`;
- criar evidência AUTH-A13;
- criar audit permanente do fechamento do domínio;
- regenerar a matriz determinística;
- manter produção, staging, contas e providers inalterados.

## Blockers externos preservados

- \`AUTH-EXT-MAIL-001\`;
- \`AUTH-EXT-SMS-001\`;
- \`AUTH-EXT-PAID-001\`.
`
);

execFileSync(process.execPath, ['scripts/audit-domain-completion-matrix.js', '--write'], { stdio: 'inherit' });
console.log('AUTH-A13 codemod applied.');
