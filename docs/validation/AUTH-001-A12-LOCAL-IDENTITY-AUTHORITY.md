# AUTH-001 / AUTH-A12 — Retirada da autoridade local residual de identidade

## Status

`IN PROGRESS` — `AUTH-A12A`, `AUTH-A12B.1`, `AUTH-A12B.2` e `AUTH-A12B.3` estão `DONE`. Somente `AUTH-A12C` permanece pendente antes do encerramento do AUTH-A12.

## Objetivo

Separar definitivamente:

- autenticação, sessão, credenciais, role e identidade privada, cuja autoridade é Supabase/server-side;
- leitura local de dados históricos e fixtures, preservada apenas quando comprovadamente necessária;
- mutações locais históricas, que nunca podem funcionar como fallback de uma conta Supabase.

## Fases concluídas anteriormente

### AUTH-A12A — verdade contratual

O contrato runtime, as auditorias e os testes foram reconciliados com:

- `get_account_identity_state`;
- `update_account_profile_reconciled`;
- `update_account_settings`;
- `complete_account_onboarding_reconciled`;
- provider único do navegador: `supabase`.

Head final de evidência: `ca839b72dfca2753c5f9568051637bf34d2e991f`.

### AUTH-A12B.1 — credenciais locais removidas

Foram retirados `create`, `hashPassword` e `updatePassword`, além do fallback de hash em texto simples. A leitura e a persistência locais eliminam `password` e `passwordHash`.

Head validado: `7caf2dea2d3fafa25d80b50ba3c62047e8609332`.

- Doke Quality Gates #601: sucesso;
- Doke Staging Edge HTTP Canary #375: sucesso;
- Doke Diagnostic E2E #396: sucesso.

### AUTH-A12B.2 — mutações genéricas locais removidas

Foram retirados `updateCurrentUser`, `updateCurrentProfile` e `updateCurrentSettings`, bem como os fallbacks locais de perfil/configurações e suas reescritas manuais de sessão.

A única mutação local ainda inventariada é `updateProfessionalFixtureUser`, limitada a fixtures não UUID e destinada à retirada no AUTH-A12C.

Head validado: `3866fbea076deba2328f9077a2d582b3a2c5033b`.

- Doke Quality Gates #620: sucesso;
- Doke Staging Edge HTTP Canary #394: sucesso;
- Doke Diagnostic E2E #415: sucesso.

## AUTH-A12B.3 — onboarding local e reescrita de sessão retirados

### Causa-raiz

`assets/js/services/onboarding-service.js` ainda continha fisicamente um caminho não Supabase que:

- obtinha o repositório local de usuários;
- chamava `repository.updateCurrentUser(...)`;
- materializava `onboardingStatus: 'completed'` no navegador;
- gravava `onboardingCompletedAt` com o relógio local;
- executava `Doke.session.setCurrentUser(...)`;
- emitia `doke:onboarding-completed` com `source: 'local'` e `reconciled: false`.

O mesmo serviço também podia inferir conclusão apenas porque cidade e estado já estavam presentes no perfil local. Isso criava uma segunda autoridade de onboarding e contradizia o repositório atual, que já não expõe `updateCurrentUser`.

### Decisão arquitetural

`complete_account_onboarding_reconciled` é a única autoridade de conclusão. `get_account_identity_state` é a única autoridade para resolver o estado autenticado de onboarding.

Para usuário autenticado:

- provider diferente de `supabase` falha fechado;
- cliente Supabase ausente falha fechado;
- transporte `self-service-operations` ausente falha fechado;
- erro remoto, sujeito divergente ou resposta incompleta não altera sessão, usuário ou eventos;
- cidade/estado locais não podem inferir conclusão.

O erro canônico de ausência de autoridade é `DOKE_ONBOARDING_AUTHORITY_UNAVAILABLE`.

### Implementação

- removida a função `usersRepository()` de `onboarding-service.js`;
- removido o caminho local de conclusão;
- removidas chamadas a `repository.updateCurrentUser`;
- removida qualquer chamada a `Doke.session.setCurrentUser` no onboarding;
- removidos evento local e marcador `reconciled: false`;
- removida a inferência `hasCompleteBaseProfile`;
- `resolveState()` agora exige estado canônico remoto para usuários autenticados;
- `complete()` agora exige provider Supabase e usa somente `complete_account_onboarding_reconciled`;
- preservado o comportamento anônimo explícito sem chamada remota;
- criado runtime permanente `tests/auth/test-auth-onboarding-local-authority-retirement-runtime.js`;
- adicionado gate permanente `Test onboarding local authority retirement` ao workflow canônico `Doke Quality Gates`;
- contrato `identity-profile-contract.js` atualizado para `AUTH-A12B.3`;
- matriz determinística sincronizada.

### Teste permanente

O runtime AUTH-A12B.3 prova:

1. ausência física das superfícies locais aposentadas;
2. sucesso exclusivamente server-side, com evento `source: 'server'` e `reconciled: true`;
3. nenhuma reescrita do snapshot público da sessão no sucesso;
4. falha remota sem mutação de sessão, usuário ou eventos;
5. provider não Supabase falhando fechado sem chamar o transporte remoto;
6. cliente Supabase ausente falhando fechado;
7. ausência de inferência local de conclusão em `resolveState()`.

### Validação da implementação

Head de implementação e validação:

`049821a2264cd6fb9fd136cbc0b3c993055cfc32`

Doke Quality Gates #648:

- auditorias estáticas e arquiteturais: sucesso;
- canonical auth/session runtime: sucesso;
- audit de autoridade de identidade/perfil: sucesso;
- runtime de retirada das mutações locais de perfil: sucesso;
- contrato de perfil reconciliado: sucesso;
- contrato de cadastro, username e onboarding: sucesso;
- runtime de retirada da autoridade local de onboarding: sucesso;
- matriz determinística: sucesso;
- governança, assets, partição E2E e `git diff --check`: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso.

Validação paralela:

- Doke Staging Edge HTTP Canary #422: sucesso;
- Doke Diagnostic E2E #443: sucesso.

## Próxima fase

### AUTH-A12C — superfícies profissionais

- retirar promoção local de role em acesso e verificação profissional;
- retirar reescritas manuais de sessão nesses fluxos;
- remover `updateProfessionalFixtureUser` do runtime ativo ou mover fixtures para uma fronteira exclusiva de testes;
- garantir que aprovação profissional reconcilie role e estado exclusivamente a partir do servidor.

## Supabase e produção

- Nenhuma migration no AUTH-A12B.3.
- Nenhum deploy de Edge Function no AUTH-A12B.3.
- Nenhuma configuração ou dado de staging foi alterado.
- Nenhuma conta real ou sintética persistente foi modificada.
- Produção não foi alterada.
- PR #9 permanece draft e não deve ser mesclado sem autorização explícita.

## Limites e riscos remanescentes

- `updateProfessionalFixtureUser` continua sendo dívida controlada para o AUTH-A12C e não é autoridade válida de produção.
- `professional-access-service.js` e `professional-identity-verification-service.js` ainda precisam ser reconciliados no corte profissional.
- AUTH-A07 continua bloqueado por `MAIL-001`.
- `PAID-001 / SEC-B05` continua aberto.

## Critério de aceite do AUTH-A12B.3

O corte foi aceito porque o head validado provou simultaneamente:

1. nenhuma conclusão local de onboarding;
2. nenhuma reescrita manual de sessão no onboarding;
3. nenhuma inferência local de conclusão;
4. `complete_account_onboarding_reconciled` como única mutação ativa;
5. falha fechada quando a autoridade remota não está disponível;
6. matriz determinística sincronizada;
7. Quality Gates, E2E bloqueante, 105 guards, staging canary e Diagnostic concluídos com sucesso;
8. nenhum workflow, codemod, hook ou diagnóstico temporário remanescente.