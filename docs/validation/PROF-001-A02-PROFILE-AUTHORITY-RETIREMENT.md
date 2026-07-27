# PROF-001 / PROF-A02 — Retirada da autoridade local do perfil profissional

## Status

`DONE`

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

## Regressão visual detectada e corrigida

A retirada da chave `doke.professionalProfiles.v1` expôs que o harness visual ainda dependia dessa autoridade aposentada para liberar `anunciar-servico.html`.

A primeira correção removeu o seed de perfil profissional do `localStorage` e passou a usar o perfil demo em memória. Os guards então revelaram um segundo limite: o prepaint guard remove corretamente sessões ligadas aos IDs demo para impedir autenticação local legada.

A solução final ficou restrita ao teste:

- o harness preserva temporariamente somente `doke.auth.session.v1` durante o prepaint de `anunciar-servico.html`;
- o comportamento nativo de `Storage.prototype.removeItem` é restaurado no `DOMContentLoaded`;
- nenhuma exceção foi adicionada ao código de produção;
- o audit PROF-A02 falha se o harness voltar a semear as chaves profissionais aposentadas ou deixar de restaurar o comportamento nativo do Storage.

## Arquivos

- `assets/js/repositories/professional-profiles-repository.js`
- `scripts/audit-professional-authority-baseline.js`
- `scripts/audit-professional-profile-authority-retirement.js`
- `scripts/test-professional-profile-authority-retirement-runtime.js`
- `tests/visual/doke-visual-regression.spec.js`
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

## Validação

Checkpoint validado:

`35d8773e0f4c8b60949de64e0883299acba12704`

- Doke Quality Gates #754: sucesso;
- audit PROF-A01 cumulativo: sucesso;
- audit PROF-A02: sucesso;
- runtime PROF-A02: sucesso;
- contratos AUTH cumulativos: sucesso;
- matriz determinística: sucesso;
- governança, assets, partição E2E e `git diff --check`: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #527: sucesso;
- Doke Diagnostic E2E #547: sucesso.

## Blockers restantes

- rascunho KYC em `localStorage/sessionStorage`;
- evidências binárias KYC no IndexedDB;
- operação server-side para editar campos profissionais ativos;
- política legal de KYC e retenção;
- remoção das políticas legadas administradas pelo Supabase Storage.

## Próximo sublote

`PROF-A03` deve criar uma operação server-side reconciliada para edição dos campos profissionais ativos antes de reabilitar a persistência do editor.

## Segurança

- nenhuma conta real modificada;
- nenhuma migration aplicada;
- nenhuma Edge Function implantada;
- staging e produção não alterados;
- nenhuma configuração paga, SMS ou OAuth habilitada;
- nenhum workflow ou codemod temporário permanece;
- PR #11 permanece aberto, draft e não mesclado.
