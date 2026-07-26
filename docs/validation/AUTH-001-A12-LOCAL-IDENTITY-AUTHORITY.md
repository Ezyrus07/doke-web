# AUTH-001 / AUTH-A12 — Retirada da autoridade local residual de identidade

## Status

`IN PROGRESS` — `AUTH-A12A`, `AUTH-A12B.1` e `AUTH-A12B.2` estão `DONE`. `AUTH-A12B.3` e `AUTH-A12C` permanecem pendentes antes do encerramento do AUTH-A12.

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

`scripts/test-real-auth-only-contract.js` foi reconciliado para proteger a nova fronteira sem credenciais em vez de exigir o marcador histórico `FALLBACK_USERS`.

Os gates pertencem ao workflow canônico `Doke Quality Gates`; nenhum workflow temporário permanece no repositório.

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

## AUTH-A12B.2 — mutações genéricas locais removidas

### Causa-raiz

`assets/js/services/profile-service.js` ainda mantinha fallback local de mutação para perfil e configurações, com reescrita manual de `Doke.session`. O repositório ainda expunha `updateCurrentUser`, `updateCurrentProfile` e `updateCurrentSettings`.

A auditoria confirmou que `updateCurrentUser` era consumido apenas pelos caminhos locais profissionais reservados ao AUTH-A12C. Apagar indiscriminadamente esses consumidores no mesmo corte misturaria perfil/configurações com a promoção profissional de role.

### Decisão arquitetural

A API genérica foi retirada e substituída temporariamente por `updateProfessionalFixtureUser`, uma fronteira estreita e explicitamente inventariada que:

- rejeita IDs vazios e UUIDs/Supabase;
- aceita somente `role`, `type`, `professionalProfileId`, `publicProfileUrl` e `ownerProfileUrl`;
- exige estado profissional explícito;
- não cria usuários inexistentes;
- não altera perfil, configurações, credenciais ou onboarding;
- permanece pendente de retirada no AUTH-A12C.

Essa fronteira não é fallback quando Supabase, Edge Function ou rede falham.

### Implementação

- removidos `updateCurrentUser`, `updateCurrentProfile` e `updateCurrentSettings` do source e dos exports do repositório;
- removidos os fallbacks locais de mutação de perfil e configurações;
- removidas as reescritas manuais de `Doke.session` desses fluxos;
- mutações de perfil/configurações agora exigem `self-service-operations` e falham fechado quando a autoridade server-side não está disponível;
- consumidores profissionais locais foram migrados somente para o nome explícito de fixture, sem encerrar ainda a dívida profissional do AUTH-A12C;
- o contrato passou para `AUTH-A12B.2`, com `localProfileMutationAuthority: 'retired'` e `professionalFixtureMutationBoundary: 'isolated-pending-A12C'`;
- criado runtime permanente `tests/auth/test-auth-local-profile-mutation-retirement-runtime.js`;
- adicionado gate permanente `Test local profile mutation retirement` ao workflow canônico `Doke Quality Gates`;
- matriz determinística sincronizada;
- codemod, workflow e diagnóstico temporários removidos após o uso.

### Testes permanentes

O runtime AUTH-A12B.2 prova:

- ausência física de `updateCurrentUser`, `updateCurrentProfile` e `updateCurrentSettings`;
- bloqueio de UUIDs na fixture profissional;
- bloqueio de campos fora da fronteira permitida;
- impossibilidade de criar uma fixture inexistente durante atualização;
- preservação da sanitização de `password` e `passwordHash`;
- ausência de fallback local em `profile-service.js`;
- ausência de reescrita manual do snapshot público da sessão;
- consumidores profissionais sem referência ao nome genérico aposentado.

### Validação AUTH-A12B.2

Head de implementação e validação:

`3866fbea076deba2328f9077a2d582b3a2c5033b`

Doke Quality Gates #620:

- auditorias estáticas e arquiteturais: sucesso;
- canonical auth/session runtime: sucesso;
- audit de autoridade de identidade/perfil: sucesso;
- runtime de retirada das mutações locais de perfil: sucesso;
- contrato de perfil reconciliado: sucesso;
- contrato de cadastro, username e onboarding: sucesso;
- matriz determinística: sucesso;
- governança, assets, partição E2E e `git diff --check`: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso.

Validação paralela:

- Doke Staging Edge HTTP Canary #394: sucesso;
- Doke Diagnostic E2E #415: sucesso.

## Próximas fases

### `AUTH-A12B.3` — onboarding e sessão

- auditar qualquer mutação local residual de onboarding;
- impedir qualquer `setCurrentUser()` manual nesses fluxos;
- manter conclusão e reconciliação exclusivamente server-side;
- provar que indisponibilidade remota não materializa estado local de onboarding.

### `AUTH-A12C` — superfícies profissionais

- retirar promoção local de role e reescrita de sessão em acesso/verificação profissional;
- remover `updateProfessionalFixtureUser` ou mover fixtures profissionais para uma fronteira de teste não carregada pelo runtime ativo;
- garantir que aprovação profissional remota reconcilie role e estado somente a partir do servidor.

## Supabase

- Nenhuma migration no AUTH-A12B.2.
- Nenhum deploy de Edge Function no AUTH-A12B.2.
- Nenhuma alteração de configuração ou dado em staging no AUTH-A12B.2.
- Nenhuma conta real ou sintética foi modificada.
- Produção não foi alterada.

## Limites e riscos

- `users-repository.js` permanece porque ainda fornece leituras/normalização local e a fixture profissional temporária.
- `updateProfessionalFixtureUser` continua sendo dívida controlada e não deve sobreviver ao AUTH-A12C como autoridade do runtime ativo.
- A proteção por formato UUID reduz o risco de uma conta Supabase entrar na fixture local, mas a solução final é retirar a mutação profissional do runtime, não ampliar essa heurística.
- Endpoints `/users/me` e `/profiles/me` permanecem nos diagnósticos CLI históricos, nunca no contrato runtime do navegador.
- AUTH-A07 continua bloqueado por `MAIL-001`.
- `PAID-001 / SEC-B05` continua aberto.
- PR #9 permanece draft e não deve ser mesclado sem autorização explícita.

## Critério de aceite do AUTH-A12B.2

O corte foi aceito porque o head validado provou simultaneamente:

1. nenhum export ou implementação genérica local de mutação de conta, perfil ou configurações;
2. perfil e configurações falham fechado sem a autoridade server-side;
3. nenhuma reescrita manual do snapshot público da sessão nesses fluxos;
4. fixture profissional temporária estreita, sem criação de usuário e bloqueada para UUID;
5. matriz determinística sincronizada;
6. Quality Gates, E2E bloqueante, 105 guards, staging canary e Diagnostic concluídos com sucesso;
7. nenhum workflow, codemod, hook ou diagnóstico temporário remanescente.
