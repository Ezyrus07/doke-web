# Auth/Identity API Diagnostic Runbook — CLI-only

## Estado atual

O browser canary foi aposentado pelo AUTH-A09. Supabase Auth é a única autoridade ativa de autenticação no site.

Não é permitido:

- selecionar provider por query string;
- persistir provider de autenticação em localStorage;
- ativar o adapter /auth/* pelo console do navegador;
- expor configureAuthIdentityCanary ou rollbackAuthIdentityCanary;
- apontar o frontend para produção por flags controladas pelo usuário.

## Objetivo do diagnóstico histórico

Validar, fora do runtime do site, o adapter legado de autenticação e identidade:

- POST /auth/login
- GET /auth/session
- GET /users/me
- GET /profiles/me

O diagnóstico não altera o provider do navegador e não migra pedidos, mensagens, notificações, carteira ou admin.

## Dry-run sem rede

`npm run audit:auth-identity-canary-contract`

`npm run validate:auth-identity-canary:dry-run`

## Execução local controlada

`npm run audit:auth-identity-canary-local-runtime`

`npm run validate:auth-identity-canary:local-runtime`

O harness deve usar localhost ou 127.0.0.1 e falhar se chamar qualquer endpoint fora da fronteira de auth/identity.

## Execução real em staging

Use somente credenciais sintéticas e variáveis locais não versionadas:

`DOKE_ENVIRONMENT=staging DOKE_AUTH_IDENTITY_CANARY_API_URL=https://staging-api.doke.example DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK=1 DOKE_AUTH_IDENTITY_CANARY_ROLES=client,professional npm run validate:auth-identity-canary`

Quando a URL não tiver marcador inequívoco de staging, use `DOKE_AUTH_IDENTITY_CANARY_MARKER=staging`.

## Gates

1. audit:auth-real-contract
2. audit:auth-identity-canary-contract
3. validate:auth-identity-canary:dry-run
4. audit:auth-identity-canary-local-runtime
5. validate:auth-identity-canary:local-runtime
6. staging real apenas com autorização e credenciais sintéticas

## Segurança e rollback

Não há rollback de browser porque nenhum estado de provider é escrito. Para interromper um diagnóstico, encerre o processo Node e descarte as credenciais sintéticas. Produção permanece fora do escopo.

## Histórico

As Sprints 25–28 criaram o canary original. Seus detalhes permanecem no histórico Git; este runbook substitui a ativação manual por um diagnóstico isolado e reproduzível.


## AUTH-A10 — isolamento físico do diagnóstico

O frontend não contém mais adapter para `/auth/login`, `/auth/register`, `/auth/session` ou `/auth/logout`. O validador CLI é o único proprietário desses endpoints para fins de diagnóstico local/staging.

Consequências operacionais:

- nenhuma query string, chave de storage ou API pública do browser ativa esse diagnóstico;
- o smoke CLI não publica token no snapshot da Doke;
- falha do diagnóstico não altera a autoridade Supabase do navegador;
- remover ou alterar o CLI exige preservar os gates de isolamento e não reintroduzir chamadas `fetch` em `auth-service.js`.
