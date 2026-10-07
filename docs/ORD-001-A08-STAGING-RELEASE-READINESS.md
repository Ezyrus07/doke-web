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
VERCEL_GIT_COMMIT_SHA   # variável de sistema do deployment Vercel
```

Nenhuma chave Supabase, token, credencial ou URL é devolvida pelo healthcheck.

### Guard de identidade do deployment

Quando o runtime detecta execução na Vercel, `DOKE_STAGING_RELEASE_SHA` deixa de ser uma
declaração suficiente. O contrato também lê `VERCEL_GIT_COMMIT_SHA` e exige correspondência
exata entre o SHA configurado e o commit realmente implantado.

- SHA configurado = SHA do deployment: `deploymentIdentity.verified=true`;
- `VERCEL_GIT_COMMIT_SHA` ausente em runtime Vercel: fail-closed;
- SHA do deployment inválido: fail-closed;
- SHA configurado diferente do deployment: blocker `release_revision_deployment_mismatch`;
- em qualquer falha de identidade, `readyForTraffic=false` e rotas de domínio retornam
  `503 DOKE_STAGING_RELEASE_IDENTITY_MISMATCH` antes de executar o runtime;
- `GET /health` continua disponível para diagnóstico e expõe somente metadados não secretos;
- o contrato de rollback permanece independente e continua exigindo release ID distinto.

O fingerprint de release passa a incluir também a revisão observada do deployment quando a
verificação Vercel é obrigatória. Ambientes locais continuam aceitando a revisão configurada
sem exigir uma variável de sistema específica do provedor.

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

## Certificação do fluxo autenticado — 2026-10-06

**Evidência funcional em staging, não promoção de produção.** Na PR #546, o commit
`280787d0b6130d89c2963c7b197118f9021b9daa` foi executado em browser Chromium/Playwright real, contra o Preview web
e o runtime API isolado da Vercel no **mesmo SHA**, sem injeção de arquivos no navegador.
O browser usou duas contas sintéticas autenticadas (cliente e profissional).

A sequência observada foi: login cliente → detalhe do anúncio → orçamento → criação de pedido HTTP →
login profissional → visualização e aceite do pedido → criação da conversa → envio de mensagem HTTP →
reload da conversa → novo login cliente → visualização do pedido aceito e da mensagem persistida.

| Evidência de staging | Referência sintética | Resultado |
| --- | --- | --- |
| Pedido criado e aceito | `353709cf-f345-4fa8-8a2d-98461d40d342` | `accepted`, readback confirmado |
| Conversa vinculada ao pedido | `27be6ccd-b3a1-4922-915a-df156d5bb3f1` | `active`, participantes corretos |
| Mensagem do profissional | `dbc9c458-e53c-4f0f-8ee3-d897e188dcad` | persistência confirmada após reload e relogin |

No SHA funcional certificado: **64/64 GitHub Actions bem-sucedidas** e três verificações
Vercel em `SUCCESS / READY`. O canário final retornou `clientOrderAccepted=true`,
`messagePersisted=true` e `dataProvider=api`. A validação da mensagem esperou a resposta
HTTP do `POST /messages` antes de recarregar, evitando confundir UI otimista com persistência.

**Separação de escopos:** o preflight ORD-A08 acima permanece estritamente read-only
(`GET /health` + `OPTIONS /orders`, zero mutações). O *browser canary* foi um teste
distinto, com escritas reais apenas nos dados sintéticos de staging. O histórico inicial
do preflight, no qual o browser canary estava bloqueado, permanece preservado no JSON de
evidência em `historicalPreflight`.

**Limites e riscos remanescentes:** o relatório do browser observou 387 falhas de requisição,
principalmente `net::ERR_ABORTED` durante navegações; isso não foi triado como auditoria
de console limpo. Os logs brutos do teste não foram arquivados no repositório; a prova
inclui o checkpoint de execução e o readback de staging. Credenciais e scripts temporários
locais foram eliminados ao final do ensaio. O SSO do projeto API isolado de staging foi
desabilitado; a revisão de segurança desse perímetro é obrigatória antes de qualquer
promoção. Nenhum teste de pagamentos, nem prontidão de produção, foi certificado.

## Próxima fronteira

1. reconciliar Control Center com GitHub/Vercel e tratar fontes marcadas como desatualizadas;
2. revisar a cadeia de Draft PRs `#543 → #544 → #545 → #546` e o antecessor UX `#470`;
3. recertificar CI e Previews no HEAD posterior a qualquer alteração de documentação;
4. habilitar/verificar a disponibilidade de `VERCEL_GIT_COMMIT_SHA` no Preview isolado e reconciliar `DOKE_STAGING_RELEASE_SHA` apenas com autorização de Infra;
5. repetir o preflight read-only com `releaseSha`, fingerprint e rollback esperados antes de novo canário;
6. manter `HOLD BEFORE INFRA WRITE`, produção bloqueada e merge/Ready dependentes de autorização explícita.
