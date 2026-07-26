# AUTH-001 / AUTH-A12 — Retirada da autoridade local residual de identidade

## Status

`IN PROGRESS` — `AUTH-A12A` está `DONE`. `AUTH-A12B` e `AUTH-A12C` permanecem pendentes antes do encerramento do AUTH-A12.

## Objetivo

Separar definitivamente:

- autenticação, sessão, credenciais, role e identidade privada, cuja autoridade é Supabase/server-side;
- leitura local de dados de demonstração, que pode continuar existindo quando necessária para páginas e testes visuais;
- mutações locais históricas, que não podem funcionar como fallback de uma conta Supabase.

## Auditoria AUTH-A12A

### Contrato runtime desatualizado

`assets/js/contracts/identity-profile-contract.js` ainda declarava `/users/me` e `/profiles/me` como endpoints do navegador e aceitava `mock` como provider padrão, embora o adapter browser tenha sido removido no AUTH-A10 e as mutações reconciliadas tenham sido implantadas no AUTH-A11.

### Audit que protegia comportamento aposentado

`scripts/audit-identity-profile-contract.js` exigia:

- `refreshCurrentIdentity` e `updateCurrentProfile` dentro do Auth;
- `/users/me` e `/profiles/me` no contrato runtime;
- `PROFILE_STORAGE_KEY` e mutações locais no repositório.

Essas exigências contradiziam a autoridade atual.

### Testes que materializavam uma autoridade local

`scripts/test-profile-write-contract.js` e `scripts/test-auth-username-onboarding-contract.js` criavam usuários locais, persistiam password hash, chamavam mutações do repositório e reescreviam a sessão. Eles validavam uma implementação que o navegador real não deve usar.

### Superfícies locais ainda inventariadas

`assets/js/repositories/users-repository.js` continua exportando exatamente estas mutações históricas:

- `create`;
- `hashPassword`;
- `updateCurrentUser`;
- `updateCurrentProfile`;
- `updateCurrentSettings`;
- `updatePassword`.

Também permanecem consumidores locais em:

- `assets/js/services/profile-service.js`;
- `assets/js/services/onboarding-service.js`;
- `assets/js/services/professional-access-service.js`;
- `assets/js/services/professional-identity-verification-service.js`.

Essas superfícies são dívida controlada. Elas não são fallback válido quando Supabase, Edge Function ou rede falham.

## Implementação concluída no AUTH-A12A

- O contrato runtime passou a declarar somente as autoridades atuais:
  - `get_account_identity_state`;
  - `update_account_profile_reconciled`;
  - `update_account_settings`;
  - `complete_account_onboarding_reconciled`.
- `supabase` passou a ser o único provider da identidade normalizada no contrato do navegador.
- `/users/me` e `/profiles/me` foram preservados somente como endpoints históricos de diagnóstico CLI-only.
- O audit foi transformado em inventário executável da dívida local restante.
- Os testes de perfil, cadastro, username e onboarding passaram a usar autoridades provider/server simuladas, sem usuário local, password hash ou reescrita manual da sessão.
- O índice de contratos ativos foi reconciliado com a autoridade atual.
- Os três gates do AUTH-A12A foram adicionados permanentemente ao `Doke Quality Gates`.

## Validação AUTH-A12A

Head de implementação validado:

`790962f61ecd637246a6d103d08134522c790d9d`

Doke Quality Gates #590:

- auditorias estáticas e arquiteturais: sucesso;
- canonical auth/session runtime: sucesso;
- audit de autoridade de identidade/perfil: sucesso;
- contrato de perfil reconciliado: sucesso;
- contrato de cadastro, username e onboarding: sucesso;
- matriz determinística: sucesso;
- governança, assets, partição E2E e `git diff --check`: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso.

Validação paralela:

- Doke Staging Edge HTTP Canary #364: sucesso;
- Doke Diagnostic E2E #385 permanecia em execução na captura da evidência e é não bloqueante; nenhum sucesso foi atribuído a ele.

Nenhuma migration, função Edge, configuração Auth ou dado de staging foi alterado pelo AUTH-A12A.

## Próximas fases

### `AUTH-A12B` — conta, perfil e onboarding

- remover `create`, `hashPassword`, `updatePassword`, `updateCurrentUser`, `updateCurrentProfile` e `updateCurrentSettings` do repositório de runtime após confirmar todos os consumidores;
- preservar somente leitura e normalização local comprovadamente necessárias;
- fazer perfil, configurações e onboarding falharem fechado quando a autoridade Supabase estiver indisponível;
- impedir qualquer `setCurrentUser()` local nesses fluxos.

### `AUTH-A12C` — superfícies profissionais

- retirar promoção local de role e reescrita de sessão em acesso/verificação profissional;
- preservar os repositórios locais de domínio apenas para testes explícitos e isolados, caso ainda necessários;
- garantir que aprovação profissional remota reconcilie role e estado somente a partir do servidor.

## Validação exigida para o AUTH-A12 completo

- `npm run audit:identity-profile-contract`;
- `node scripts/test-profile-write-contract.js`;
- `node scripts/test-auth-username-onboarding-contract.js`;
- `node scripts/test-transition-system-freeze.js`;
- runtimes permanentes AUTH-A11;
- Quality Gates, E2E bloqueante e 105 guards visuais;
- `git diff --check`;
- busca estática impedindo o crescimento da lista de mutações locais.

## Supabase

- Nenhuma migration no AUTH-A12A.
- Nenhum deploy de Edge Function no AUTH-A12A.
- Nenhuma alteração em staging no AUTH-A12A.
- Produção não foi alterada.

## Limites e riscos

- `users-repository.js` não será apagado inteiro antes de separar leituras locais legítimas de mutações de identidade.
- Endpoints `/users/me` e `/profiles/me` permanecem nos diagnósticos CLI históricos, mas não no contrato runtime do navegador.
- AUTH-A07 continua bloqueado por `MAIL-001`.
- `PAID-001 / SEC-B05` continua aberto.
- PR #9 permanece draft e não deve ser mesclado sem autorização explícita.

## Próximo passo

Executar `AUTH-A12B` em cortes pequenos: primeiro credenciais locais, depois perfil/configurações, por fim onboarding. Cada corte deve provar consumidores, compatibilidade visual e ausência de fallback silencioso antes da remoção.
