# ORD-001-A08 — prontidão do release de staging

## Decisão arquitetural

Nenhum provedor externo de deploy é declarado canônico no repositório. Não existem Dockerfile, manifesto Railway/Render/Fly, função serverless ou workflow de promoção que possa ser tratado como autoridade operacional.

O ponto de execução existente continua sendo:

```bash
npm run serve:staging-api-runtime
```

ORD-A08 não escolhe fornecedor de hospedagem e não promove código. Ele cria uma fronteira agnóstica de plataforma para que um release futuro seja identificável, verificável e reversível.

## Identidade do runtime

O servidor Node passa a publicar um contrato seguro em `GET /health`:

- versão `ord-a08-staging-release-v1`;
- ambiente sanitizado;
- release ID;
- revisão Git hexadecimal;
- fingerprint SHA-256;
- prontidão de rollback;
- `readyForTraffic`;
- produção permanentemente proibida;
- capacidade ORD-A07 de frescor de requisições.

Os valores vêm apenas do ambiente server-side:

```txt
DOKE_ENVIRONMENT
DOKE_ENABLE_STAGING_API
DOKE_STAGING_RELEASE_ID
DOKE_STAGING_RELEASE_SHA
DOKE_STAGING_ROLLBACK_RELEASE_ID
```

Nenhuma chave Supabase, token, credencial ou URL é devolvida pelo healthcheck.

## Preflight read-only

O executor `scripts/execute-ord-001-a08-staging-release-preflight.js` possui três modos:

- `--dry-run`: não lê alvo, não usa rede e não escreve relatório;
- `--check-env`: valida apenas nomes e formatos, sem rede;
- `--execute`: exige autorização explícita de rede e realiza somente `GET /health` e `OPTIONS /orders`.

A execução real verifica:

1. alvo HTTPS marcado como staging, ou loopback HTTP;
2. rejeição de host com aparência de produção;
3. versão do contrato;
4. release ID e SHA esperados;
5. `readyForTraffic=true`;
6. `productionAllowed=false`;
7. rollback diferente do release atual;
8. contrato ORD-A07 com janela de cinco minutos;
9. CORS permitindo idempotência, issued-at e nonce.

Não existe `POST`, login, bearer token, service-role, pedido, orçamento ou mutação nesse preflight.

## Rollback

Todo release de staging deve declarar previamente um `DOKE_STAGING_ROLLBACK_RELEASE_ID` válido e diferente do release candidato. ORD-A08 apenas comprova que a referência existe; a implementação concreta do rollback pertence ao provedor que vier a ser formalmente escolhido.

Até que um provedor externo seja vinculado, o estado correto é `release_preflight_contract_complete_not_deployed`.

## Produção

A criação do servidor falha com `DOKE_PRODUCTION_RUNTIME_BLOCKED` quando `DOKE_ENVIRONMENT` é `prod` ou `production`. O preflight também rejeita alvos com aparência de produção. Portanto, produção permanece bloqueada em duas fronteiras independentes.

## Comandos

```bash
npm run test:ord-001-a08-staging-release-runtime
npm run audit:ord-001-a08-staging-release-readiness
npm run execute:ord-001-a08-staging-release-preflight:dry-run
npm run execute:ord-001-a08-staging-release-preflight:check-env
npm run execute:ord-001-a08-staging-release-preflight
npm run execute:ord-001-a08-staging-release-preflight:report
```

CI executa somente teste local, auditoria e dry-run. A rede externa nunca é habilitada pelo workflow.

## Próxima fronteira

1. escolher formalmente o provedor de staging;
2. definir release e rollback commands específicos do provedor;
3. injetar identidade de release no ambiente server-side;
4. promover pelo fluxo controlado;
5. executar o preflight read-only;
6. manter o canário visual A06 sob autorização separada.
