# ORD-001-A08 — prontidão do release de staging

## Decisão arquitetural

O runtime continua independente do provedor. O canário autorizado usa um projeto Vercel isolado chamado `kontrat-staging-api-runtime`, vinculado ao diretório `backend/runtime/staging` e sem domínio de produção da Kontrat.

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
DOKE_ALLOWED_ORIGINS
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

Para o canário Vercel de staging, o rollback operacional é:

1. definir `DOKE_ENABLE_STAGING_API=0` no Preview da branch ou interromper o deployment do projeto isolado;
2. remover o endpoint público do mapa `STAGING_RUNTIME_ENDPOINTS` e publicar novamente apenas o frontend Preview;
3. comprovar que a origem de staging retorna `dataProvider=blocked`;
4. não reverter automaticamente pedidos, conversas ou mensagens criados pelo canário.

As variáveis Supabase privilegiadas permanecem somente no runtime server-side. O frontend recebe apenas a URL pública do runtime.

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

1. validar o fluxo autenticado de pedidos e mensagens no navegador contra o runtime de staging;
2. conservar release e rollback IDs distintos;
3. executar o preflight read-only antes de cada novo canário;
4. manter produção bloqueada.
