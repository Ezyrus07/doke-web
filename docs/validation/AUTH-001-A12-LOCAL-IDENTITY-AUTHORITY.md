# AUTH-001 / AUTH-A12 — Retirada da autoridade local residual de identidade

## Status

`IN PROGRESS` — `AUTH-A12A` e `AUTH-A12B.1` estão `DONE`. `AUTH-A12B.2` está com implementação em validação. `AUTH-A12B.3` e `AUTH-A12C` permanecem pendentes.

## Objetivo

Separar definitivamente:

- autenticação, sessão, credenciais, role e identidade privada, cuja autoridade é Supabase/server-side;
- leitura local de dados históricos/fixtures, preservada apenas quando comprovadamente necessária para páginas e testes visuais;
- mutações locais históricas, que não podem funcionar como fallback de uma conta Supabase.

## AUTH-A12A — verdade contratual concluída

O AUTH-A12A reconciliou o contrato runtime, as auditorias e os testes com as autoridades implantadas no AUTH-A11:

- `get_account_identity_state`;
- `update_account_profile_reconciled`;
- `update_account_settings`;
- `complete_account_onboarding_reconciled`;
- provider único do navegador: `supabase`;
- `/users/me` e `/profiles/me` preservados somente como diagnóstico CLI histórico.

Head final de evidência do AUTH-A12A:

`ca839b72dfca2753c5f9568051637bf34d2e991f`

Validação final desse head:

- Doke Quality Gates #592: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #366: sucesso;
- Doke Diagnostic E2E #387: sucesso.

Nenhuma migration, função Edge, configuração Auth ou dado de staging foi alterado pelo AUTH-A12A.

## AUTH-A12B.1 — credenciais locais removidas

### Causa-raiz

`assets/js/repositories/users-repository.js` ainda expunha e implementava:

- `create`;
- `hashPassword`;
- `updatePassword`.

Essas superfícies permitiam criar conta, calcular hash e redefinir senha em `doke.auth.users.v1`, apesar de Supabase Auth já ser a única autoridade de credenciais. O repositório também podia conservar campos históricos `password` e `passwordHash` ao ler ou escrever dados locais.

### Implementação

- removidos os exports e implementações `create`, `hashPassword` e `updatePassword`;
- removido o fallback de hash em texto simples;
- removida a descrição do repositório como camada de autenticação mock;
- adicionada sanitização defensiva que elimina `password` e `passwordHash` de objetos normalizados e de `doke.auth.users.v1`;
- preservadas APIs de leitura e normalização comprovadamente necessárias;
- preservadas temporariamente, como dívida inventariada para o próximo corte:
  - `updateCurrentUser`;
  - `updateCurrentProfile`;
  - `updateCurrentSettings`.

O contrato `identity-profile-contract.js` passou para `AUTH-A12B.1` e declara `localCredentialAuthority: 'retired'`.

### Gate permanente

`scripts/audit-identity-profile-contract.js` valida estaticamente e em runtime:

- ausência de `create`, `hashPassword` e `updatePassword` no source e nos exports;
- manutenção das APIs locais de leitura;
- remoção de campos de credencial retornados e persistidos;
- preservação da limpeza de contas demo locais;
- inventário exato das três mutações locais restantes.

`scripts/test-real-auth-only-contract.js` foi reconciliado para proteger a nova fronteira credential-free em vez de exigir o marcador histórico `FALLBACK_USERS`.

Os gates pertencem ao workflow canônico `Doke Quality Gates`; nenhum workflow temporário foi criado.

## Validação AUTH-A12B.1

Head de implementação validado:

`7caf2dea2d3fafa25d80b50ba3c62047e8609332`

Doke Quality Gates #601:

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

- Doke Staging Edge HTTP Canary #375: sucesso;
- Doke Diagnostic E2E #396: sucesso.

A primeira tentativa do Quality Gates, #600, falhou porque `scripts/test-real-auth-only-contract.js` ainda exigia `FALLBACK_USERS`. O gate foi corrigido para validar ausência de autoridade local de credenciais; nenhuma implementação histórica foi restaurada.

## AUTH-A12B.2 — implementação em validação

### Causa-raiz

`profile-service.js` ainda mantinha fallback local de mutação para perfil e configurações, com reescrita manual de `Doke.session`. O repositório ainda expunha `updateCurrentUser`, `updateCurrentProfile` e `updateCurrentSettings`.

A auditoria confirmou que `updateCurrentUser` era consumido apenas pelos caminhos locais profissionais reservados ao AUTH-A12C. Para evitar regressão, a API genérica foi retirada e substituída por `updateProfessionalFixtureUser`, uma fronteira temporária e estreita que:

- rejeita IDs UUID/Supabase;
- rejeita campos fora da promoção profissional de fixture;
- não cria usuários inexistentes;
- não altera perfil, configurações, credenciais ou onboarding;
- permanece inventariada para remoção no AUTH-A12C.

### Implementação

- removidos `updateCurrentUser`, `updateCurrentProfile` e `updateCurrentSettings` do repositório;
- removidos os fallbacks locais e as reescritas manuais de sessão de perfil/configurações;
- mutações de perfil/configurações agora exigem `self-service-operations` e falham fechado;
- consumidores profissionais locais migrados apenas para o nome explícito de fixture, sem alterar ainda a lógica profissional;
- criado runtime permanente `tests/auth/test-auth-local-profile-mutation-retirement-runtime.js`;
- gate adicionado ao workflow canônico de Quality Gates;
- nenhuma migration, deploy ou alteração de staging/produção.

## Próximas fases

### `AUTH-A12B.3` — onboarding e sessão

- remover qualquer mutação local residual de onboarding;
- impedir qualquer `setCurrentUser()` manual nesses fluxos;
- manter a reconciliação exclusivamente server-side.

### `AUTH-A12C` — superfícies profissionais

- retirar promoção local de role e reescrita de sessão em acesso/verificação profissional;
- preservar repositórios locais de domínio apenas em fronteira explícita de fixture, caso ainda necessários;
- garantir que aprovação profissional remota reconcilie role e estado somente a partir do servidor.

## Supabase

- Nenhuma migration no AUTH-A12B.1.
- Nenhum deploy de Edge Function no AUTH-A12B.1.
- Nenhuma alteração em staging no AUTH-A12B.1.
- Nenhuma conta real ou sintética foi modificada.
- Produção não foi alterada.

## Limites e riscos

- `users-repository.js` não foi apagado inteiro porque ainda possui leituras e mutações históricas de perfil/profissional a serem separadas em cortes posteriores.
- A sanitização remove credenciais históricas de `doke.auth.users.v1`; consumidores que dependiam indevidamente desses campos devem falhar em vez de restaurar autenticação local.
- Endpoints `/users/me` e `/profiles/me` permanecem nos diagnósticos CLI históricos, nunca no contrato runtime do navegador.
- AUTH-A07 continua bloqueado por `MAIL-001`.
- `PAID-001 / SEC-B05` continua aberto.
- PR #9 permanece draft e não deve ser mesclado sem autorização explícita.

## Critério de aceite do AUTH-A12B.1

O corte foi aceito porque o head de implementação provou simultaneamente:

1. nenhum export ou implementação local de cadastro, hash ou redefinição de senha;
2. nenhuma persistência de `password` ou `passwordHash` pelo repositório local;
3. APIs de leitura necessárias preservadas;
4. matriz determinística sincronizada;
5. Quality Gates, E2E bloqueante, 105 guards, staging canary e Diagnostic concluídos com sucesso;
6. nenhum workflow, diagnóstico, codemod ou gatilho temporário remanescente.
