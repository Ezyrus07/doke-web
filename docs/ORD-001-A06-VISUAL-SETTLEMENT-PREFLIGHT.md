# ORD-001 / ORD-A06 — preflight do canário visual entre duas contas

## Estado

`PREFLIGHT CONCLUÍDO — EXECUÇÃO REAL BLOQUEADA ATÉ EXISTIREM DUAS CONTAS DE TESTE EXPLICITAMENTE AUTORIZADAS`

Este sublote não cria, redefine, promove nem altera contas. Ele congela os pré-requisitos técnicos do canário visual e impede que credenciais históricas ou defaults locais sejam tratados como contas válidas de staging.

## Objetivo

Comprovar em duas sessões de navegador isoladas que o ciclo mínimo do domínio de pedidos converge visualmente entre cliente e profissional:

1. cliente autenticado cria um pedido canário;
2. profissional autenticado visualiza o mesmo pedido;
3. profissional aceita o pedido;
4. cliente relê o estado `accepted`;
5. profissional envia uma proposta;
6. cliente relê o estado `quoted` e a proposta correspondente;
7. uma escrita concorrente com versão obsoleta é rejeitada;
8. somente os registros marcados pelo `runId` do canário são limpos.

`PAY-001`, `SCHED-001` e `MSG-001` permanecem fora do escopo. O A06 não executa cobrança, pagamento, início, conclusão, mensagens, suporte ou operações administrativas.

## Descoberta de causa raiz

O runtime do A05 provou a escrita autenticada, mas `ordersProvider` ainda concentrava duas responsabilidades:

- provider de comandos;
- provider de leitura.

Ao ativar `api-write-canary-frontend-activation`, o valor de `ordersProvider` deixava de ser `supabase-read`. Consequentemente, `list()` e `getById()` podiam retornar `DOKE_ORDER_READ_AUTHORITY_UNAVAILABLE` durante o próprio canário, mesmo quando o comando remoto havia sido concluído corretamente.

O A06 exige separação explícita:

- `ordersReadProvider = supabase-read` em staging;
- `ordersProvider = api-write-canary-frontend-activation` somente para comandos;
- nenhuma escrita convertida em snapshot local;
- nenhuma leitura convertida em mock silencioso.

## Estado observado em staging

Projeto: `zwkczgewzbsorbrjuzpb`

Preflight somente leitura realizado em 29 de julho de 2026:

- usuários em `auth.users`: 3;
- conta histórica de cliente canário: ausente;
- conta histórica de profissional canário: ausente;
- conta histórica de suporte canário: ausente;
- conta histórica de administrador canário: ausente;
- `orders`: 0 linhas;
- `budgets`: 0 linhas;
- `order_status_history`: 0 linhas;
- `private.order_domain_events`: 0 linhas;
- `private.order_event_delivery_attempts`: 0 linhas.

As credenciais locais definidas em `STAGING_E2E_DEFAULT_USERS` são fixtures de desenvolvimento e não autorizam criação ou alteração de usuários no projeto remoto.

## Contrato fail-closed

A execução real do Playwright deve permanecer bloqueada, salvo quando todos os itens abaixo forem fornecidos explicitamente no processo que executa o teste:

- `DOKE_ENVIRONMENT=staging`;
- `DOKE_ORD_A06_EXECUTE=1`;
- `DOKE_ORD_A06_ALLOW_NETWORK=1`;
- `DOKE_ORD_A06_ALLOW_MUTATIONS=1`;
- `DOKE_ORD_A06_WEB_BASE_URL` apontando para host local, staging ou preview;
- `DOKE_ORD_A06_API_BASE_URL` apontando para host local, staging ou preview;
- `DOKE_ORD_A06_CLIENT_EMAIL`;
- `DOKE_ORD_A06_CLIENT_PASSWORD`;
- `DOKE_ORD_A06_PROFESSIONAL_EMAIL`;
- `DOKE_ORD_A06_PROFESSIONAL_PASSWORD`;
- `DOKE_ORD_A06_RUN_ID` com prefixo `ord-a06-`.

Não existem valores padrão para e-mail ou senha. O teste não pode importar `STAGING_E2E_DEFAULT_USERS`.

## Isolamento de sessões

O canário deve usar dois `BrowserContext` independentes:

- contexto cliente;
- contexto profissional.

Não é permitido compartilhar `storageState`, cookies, localStorage, sessionStorage ou token entre os contextos. Tokens podem ser usados em memória pelo runtime, mas nunca devem aparecer em logs, screenshots, traces, relatórios ou commits.

## Evidência obrigatória

A execução real somente poderá fechar o A06 quando registrar, sem segredos:

- `runId`;
- IDs técnicos dos registros canário;
- status observados em cada sessão;
- versão anterior e versão posterior de cada transição;
- confirmação de conflito otimista;
- screenshots do estado solicitado, aceito e cotado;
- resultado da limpeza dos registros canário;
- contagens finais sem resíduo;
- head do PR e runs dos gates permanentes.

## Segurança operacional

- nenhuma conta será criada automaticamente;
- nenhuma senha será redefinida;
- nenhum usuário real será promovido para profissional, suporte ou administrador;
- nenhum fixture sem `runId` será removido;
- produção permanece bloqueada;
- o ranking ativo permanece `search-rank-v0`;
- nenhum merge ou marcação para review é autorizado por este sublote.

## Próximo passo controlado

1. validar a separação entre provider de leitura e provider de escrita em runtime determinístico;
2. manter o workflow permanente do preflight somente leitura;
3. obter autorização explícita para duas contas de teste existentes ou provisionadas por procedimento separado;
4. executar o Playwright A06 apenas após o preflight de credenciais e ambiente passar;
5. limpar os registros identificados pelo `runId` e confirmar zero resíduo.
