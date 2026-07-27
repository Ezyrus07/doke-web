# PROF-001 / PROF-A02 — Retirada da autoridade local do perfil profissional

## Status

`IMPLEMENTATION IN PROGRESS`

## Objetivo

Remover a persistência de perfil profissional no navegador sem reabrir fallback mock/local para sessões Supabase.

## Causa-raiz

O setup profissional já utilizava `save_professional_profile_setup` e `public.professional_profiles`, mas `professional-profiles-repository.js` continuava sendo uma segunda autoridade executável. O arquivo:

- migrava aplicações antigas pelo navegador;
- persistia rascunhos e conclusão no `localStorage`;
- editava perfis ativos localmente;
- alterava status de verificação e transições de ciclo de vida;
- era carregado por páginas Supabase ativas.

Isso permitia que a interface representasse um estado profissional diferente do estado canônico do servidor.

## Implementação

### Sessões Supabase

- leituras usam `public.professional_profiles`;
- rascunho e conclusão usam `self-service-operations/save_professional_profile_setup`;
- o sujeito da mutação deve coincidir com o usuário autenticado;
- ausência de provider ou cliente Supabase falha fechado;
- edição de campos profissionais ativos falha com `DOKE_PROFESSIONAL_PROFILE_EDIT_AUTHORITY_UNAVAILABLE`;
- status e transições falham com `DOKE_PROFESSIONAL_PROFILE_SERVER_TRANSITION_REQUIRED`.

### Fixtures

Fixtures não UUID continuam disponíveis apenas em memória. Nenhum estado profissional de fixture é escrito em `localStorage`, `sessionStorage` ou IndexedDB.

## Limitação deliberada

A edição de campos profissionais ativos não possui uma operação server-side específica no runtime atual. O PROF-A02 não mantém a edição local como fallback. A funcionalidade fica bloqueada até o PROF-A03 adicionar uma operação reconciliada e validada.

Campos básicos de identidade continuam pertencendo ao serviço canônico de perfil, mas a transação combinada do editor não é executada parcialmente.

## Arquivos

- `assets/js/repositories/professional-profiles-repository.js`
- `scripts/audit-professional-authority-baseline.js`
- `scripts/audit-professional-profile-authority-retirement.js`
- `scripts/test-professional-profile-authority-retirement-runtime.js`
- `.github/workflows/quality.yml`
- `docs/validation/PROF-001-A02-PROFILE-AUTHORITY-RETIREMENT.md`
- `docs/validation/PROF-001-A02-PROFILE-AUTHORITY-RETIREMENT.json`

## Supabase

Nenhuma migration foi aplicada. Nenhuma Edge Function foi implantada. Staging e produção não foram alterados.

## Testes

O runtime dedicado comprova:

1. leitura remota de `professional_profiles`;
2. rascunho e conclusão via `save_professional_profile_setup`;
3. nenhuma chamada a `localStorage` no caminho Supabase;
4. edição ativa e transições falhando fechado;
5. fixtures funcionando apenas em memória.

## Blockers restantes

- rascunho KYC em `localStorage/sessionStorage`;
- evidências binárias KYC no IndexedDB;
- operação server-side para editar campos profissionais ativos;
- política legal de KYC e retenção;
- remoção das políticas legadas administradas pelo Supabase Storage.

## Segurança

- nenhuma conta real modificada;
- nenhuma configuração paga, SMS ou OAuth habilitada;
- PR #11 permanece aberto, draft e não mesclado.
