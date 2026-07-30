# ORD-001 / ORD-A06 — Executor Playwright fail-closed

## Objetivo

Preparar um executor de navegador para o canário visual real do ciclo de pedidos sem assumir contas, credenciais, URLs ou autorização.

O executor existe para validar, em staging e em duas sessões isoladas:

1. cliente autenticado cria um pedido canário;
2. profissional autenticado relê o estado `requested`;
3. duas tentativas concorrentes de aceite produzem exatamente um sucesso e um conflito otimista;
4. cliente relê `accepted`;
5. profissional envia proposta de **R$ 123,45**;
6. cliente relê `quoted` e vê a atualização visual;
7. a operação `public.cleanup_order_canary_run(text)` remove exclusivamente o fixture daquele `runId`;
8. a segunda limpeza retorna `already_clean`;
9. as duas sessões deixam de enxergar o pedido removido.

## Estado atual

- contrato do executor: preparado;
- execução real: bloqueada;
- contas utilizadas: nenhuma;
- credenciais registradas: nenhuma;
- rede externa executada pelo gate CI: não;
- mutações executadas pelo gate CI: não;
- produção: intocada.

O CI executa apenas auditoria estática e `--dry-run`.

## Modos

```bash
node scripts/execute-ord-001-a06-visual-settlement-playwright.js --dry-run
node scripts/execute-ord-001-a06-visual-settlement-playwright.js --check-env
node scripts/execute-ord-001-a06-visual-settlement-playwright.js --execute
node scripts/execute-ord-001-a06-visual-settlement-playwright.js --execute --write-report
```

### `--dry-run`

Valida arquivos e imprime o plano. Não abre navegador, não acessa rede e não modifica dados.

### `--check-env`

Valida todos os requisitos operacionais. Não abre navegador, não acessa rede e não modifica dados.

### `--execute`

Só prossegue quando todos os requisitos fail-closed estiverem presentes.

## Autorização explícita

A execução exige o valor exato:

```text
DOKE_ORD_A06_AUTHORIZATION_ACK=I_AUTHORIZE_ORD_A06_STAGING_TEST_ACCOUNTS
```

Esse valor declara que as duas contas fornecidas são contas de teste de staging e foram autorizadas para o canário. Ele não autoriza criar contas, alterar senhas, promover papéis ou utilizar usuários reais.

## Variáveis obrigatórias

```text
DOKE_ENVIRONMENT=staging
DOKE_ORD_A06_AUTHORIZATION_ACK=I_AUTHORIZE_ORD_A06_STAGING_TEST_ACCOUNTS
DOKE_ORD_A06_ALLOW_NETWORK=1
DOKE_ORD_A06_ALLOW_MUTATIONS=1
DOKE_ORD_A06_EXECUTE=1
DOKE_ORD_A06_WEB_BASE_URL=<preview ou staging aprovado>
DOKE_ORD_A06_API_BASE_URL=<API de staging aprovada>
DOKE_ORD_A06_SUPABASE_URL=<Supabase de staging>
DOKE_ORD_A06_SERVICE_ROLE_KEY=<segredo somente do processo Node>
DOKE_ORD_A06_CLIENT_EMAIL=<conta de teste autorizada>
DOKE_ORD_A06_CLIENT_PASSWORD=<segredo da conta de teste>
DOKE_ORD_A06_PROFESSIONAL_EMAIL=<conta de teste autorizada>
DOKE_ORD_A06_PROFESSIONAL_PASSWORD=<segredo da conta de teste>
DOKE_ORD_A06_SERVICE_REF=<serviço publicado e autorizado>
DOKE_ORD_A06_RUN_ID=ord-a06-<identificador único>
DOKE_ORD_A06_TARGET_MARKER=<marcador presente nos hosts de staging>
```

As contas precisam ser distintas. Não existem e-mails, senhas, URLs ou service refs padrão no executor.

## Segurança dos destinos

O executor:

- exige `DOKE_ENVIRONMENT=staging`;
- rejeita hosts de produção conhecidos;
- exige que web, API e Supabase contenham o marcador explícito de staging;
- aceita localhost apenas como destino local explícito;
- nunca envia a service-role key para `page.evaluate`, `localStorage`, `sessionStorage` ou código da página.

A service-role key fica somente no processo Node e é usada exclusivamente depois do fluxo para chamar a RPC de limpeza.

## Isolamento das sessões

O Playwright cria dois `BrowserContext` independentes:

- contexto do cliente;
- contexto do profissional.

Eles não compartilham cookies, IndexedDB, localStorage, sessionStorage ou cache de autenticação.

Cada contexto autentica pela UI real de `auth/login.html` e materializa a identidade por `Doke.session`.

## Ativação canário

Em cada contexto, o executor chama:

```text
Doke.services.orders.configureOrdersWriteCanary(...)
```

A ativação deve manter:

- leitura: `supabase-read`;
- comandos: `api-write-canary-frontend-activation`;
- provider global de dados: `mock`;
- rede: habilitada somente para o domínio de pedidos;
- fallback local silencioso: proibido.

## Marcação e idempotência

O pedido recebe os dois marcadores exigidos pela fronteira de limpeza:

```json
{
  "externalId": "<runId>:order",
  "metadata": {
    "canaryDomain": "ORD-001",
    "canarySublot": "ORD-A06",
    "canaryScope": "visual-settlement",
    "canaryRunId": "<runId>"
  }
}
```

As chaves de idempotência usam o mesmo namespace:

```text
<runId>:create
<runId>:accept-a
<runId>:accept-b
<runId>:quote
```

## Conflito otimista

O profissional dispara dois comandos de aceite concorrentes, com chaves diferentes e o mesmo estado esperado.

Resultado obrigatório:

- exatamente um comando confirmado;
- exatamente um comando rejeitado como conflito;
- estado final `accepted`;
- nenhuma duplicação de histórico ou transição.

## Evidências visuais

O executor captura somente o card do pedido nos seguintes estados:

```text
reports/generated/ord-a06/<runId>/professional-requested.png
reports/generated/ord-a06/<runId>/client-accepted.png
reports/generated/ord-a06/<runId>/client-quoted.png
```

Credenciais, tokens e a service-role key não entram nas imagens nem no relatório JSON.

## Limpeza obrigatória

Depois da validação visual, o processo Node chama:

```text
public.cleanup_order_canary_run(<runId>)
```

A primeira chamada deve retornar `cleaned`. A segunda deve retornar `already_clean`.

A limpeza é tentada em `finally` caso a execução falhe depois da criação do pedido. A operação aborta diante de marcadores parciais, mais de um pedido, estados fora do escopo ou dependências de mensagens, pagamentos, carteira, avaliações, funil ou operação manual.

## Relatório

O modo `--write-report` grava, por padrão:

```text
reports/generated/ord-a06-playwright-executor-report.json
```

O relatório registra apenas presença de requisitos, checks, IDs do fixture, caminhos de screenshots, resultado de conflito e contagens de limpeza. Valores secretos nunca são serializados.

## Limite deliberado

Este artefato não concede autorização para executar o canário. A execução continua bloqueada até que duas contas de teste, um serviço, URLs e flags sejam fornecidos explicitamente para uma única rodada controlada.

## Envelope de autorização obrigatório

Além das flags anteriores, `--check-env` e `--execute` exigem `DOKE_ORD_A06_AUTHORIZATION_MANIFEST_PATH` e `DOKE_ORD_A06_AUTHORIZATION_MANIFEST_SHA256`.

O envelope precisa estar fora do repositório, ter validade máxima de duas horas e estar vinculado por SHA-256 ao runId, marcador, duas contas, serviço e três URLs. Consulte `docs/ORD-001-A06-AUTHORIZATION-ENVELOPE.md`.
