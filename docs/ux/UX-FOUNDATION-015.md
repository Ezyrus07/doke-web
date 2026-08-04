# UX-FOUNDATION-015 — Jornadas críticas, continuidade, recovery e estados degradados

## Status

- Frente: `UX-FOUNDATION`;
- Sublote: `015`;
- Natureza: especificação de Produto, UX, resiliência de interface, continuidade operacional e QA;
- Branch: `ux/ux-foundation-001`;
- Escopo desta entrega: documentação somente;
- Runtime alterado: não;
- HTML alterado: não;
- CSS alterado: não;
- JavaScript alterado: não;
- Migrations alteradas: não;
- Workflows alterados: não;
- Staging acessado: não;
- Produção acessada: não;
- Merge autorizado: não;
- Ready for review autorizado: não;
- Head lógico principal inspecionado: `60258b9a33887018c4159d93dbf6ca6aea5be74c`;
- Head UX anterior: `98ae2b9853f9250806349951b4d1a7657e6633cb`;
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-014`.

---

## 1. Objetivo

Definir o contrato transversal de continuidade da Doke para que jornadas críticas possam ser interrompidas, retomadas, reconciliadas e concluídas sem:

- duplicar comandos;
- perder rascunhos;
- misturar contas;
- transformar timeout em rejeição;
- transformar cache antigo em verdade atual;
- apresentar sucesso sem confirmação;
- executar novamente uma ação já aceita;
- apagar evidência de uma ação pendente;
- ocultar indisponibilidade como estado vazio;
- permitir que uma resposta atrasada substitua uma intenção mais nova;
- permitir que uma aba antiga reverta uma atualização confirmada em outra aba;
- permitir que uma resposta da conta anterior apareça após troca de sessão;
- confundir offline, degradação, incidente, manutenção e erro definitivo;
- perder a posição, o foco ou o contexto relevante após reload;
- exigir que a pessoa entenda detalhes técnicos para se recuperar.

O contrato cobre:

- navegação direta;
- navegação pelo shell estável;
- reload;
- back-forward cache;
- perda e retorno de conectividade;
- API parcialmente indisponível;
- respostas lentas;
- timeouts;
- múltiplas abas;
- múltiplos dispositivos;
- troca de conta;
- sessão expirada;
- conflito de versão;
- processamento assíncrono;
- comandos de resultado desconhecido;
- manutenção planejada;
- incidentes operacionais;
- modo somente leitura;
- retomada de formulários;
- retomada de pedidos, mensagens, pagamentos, carteira e denúncias.

---

## 2. Princípio central

```text
uma intenção da pessoa
→ uma identidade durável de operação
→ uma autoridade responsável
→ um resultado reconciliável
→ uma apresentação retomável
```

Nunca:

```text
clique
→ request sem identidade estável
→ timeout
→ rollback visual
→ CTA liberado
→ segundo clique
→ duas operações possíveis
```

Também nunca:

```text
conta A inicia request
→ pessoa troca para conta B
→ resposta da conta A chega
→ interface da conta B é atualizada
```

A Doke deve considerar continuidade como parte da correção funcional.

Uma operação não está corretamente implementada apenas porque funciona quando:

- a rede está estável;
- existe uma única aba;
- a resposta é imediata;
- a rota não muda;
- a conta não muda;
- o navegador não descarrega a página;
- não existe concorrência;
- não ocorre conflito;
- nenhum serviço está degradado.

---

## 3. Invariantes obrigatórios

```text
offline ≠ falha definitiva

timeout ≠ rejeição

stale ≠ empty

cache ≠ autoridade

local success ≠ server confirmation

request concluído ≠ UI autorizada a aplicar

reconnect event ≠ serviço recuperado

segunda aba ≠ segunda autoridade

reload ≠ nova intenção

retry ≠ novo comando

conflict ≠ erro genérico

maintenance ≠ indisponibilidade inesperada

read-only ≠ tela inutilizável

UNKNOWN_OUTCOME ≠ FAILED
```

Além disso:

1. toda mutação crítica deve possuir identidade estável;
2. a mesma intenção deve reutilizar a mesma chave de idempotência;
3. payload divergente não pode reutilizar a mesma chave;
4. respostas assíncronas devem ser cercadas por geração de conta e rota;
5. dados stale devem permanecer identificados como stale;
6. nenhuma ação financeira pode ser repetida antes de reconciliação;
7. nenhum draft pode ser sobrescrito silenciosamente por outra aba;
8. nenhuma mudança de sessão pode preservar conteúdo privado da conta anterior;
9. nenhum estado degradado pode fabricar certeza;
10. nenhuma recuperação pode exigir repetição cega de ação crítica.

---

## 4. Escopo auditado

### 4.1 Runtime transversal

- `assets/js/core/experience-runtime.js`;
- `assets/js/core/form-experience-core.js`;
- `assets/js/core/session.js`;
- invalidação de domínios;
- cache stale-while-revalidate;
- mutações otimistas;
- eventos de sessão;
- eventos de storage;
- listeners de `online`, `offline`, `pageshow` e `visibilitychange`.

### 4.2 Jornadas críticas

- Home e Resultados;
- solicitação de orçamento;
- criação de pedido;
- aceite e recusa;
- proposta;
- cobrança;
- pagamento;
- conclusão do serviço;
- avaliação;
- Mensagens;
- envio de anexos;
- Carteira;
- saque;
- disputa;
- denúncia;
- bloqueio;
- perfil e anúncio;
- onboarding profissional;
- configurações sensíveis.

### 4.3 Situações adversariais

- conexão perdida antes do request;
- conexão perdida depois do request enviado;
- resposta recebida depois do timeout local;
- resposta recebida depois da troca de rota;
- resposta recebida depois da troca de conta;
- reload durante mutação;
- fechamento da aba durante upload;
- duas abas editando o mesmo draft;
- duas abas enviando a mesma ação;
- entidade alterada em outro dispositivo;
- websocket/realtime atrasado;
- evento duplicado;
- evento fora de ordem;
- backend disponível, mas domínio específico indisponível;
- navegador indicando online com API inacessível;
- manutenção planejada;
- modo somente leitura;
- cache antigo após retorno do BFCache.

### 4.4 Fora deste sublote

- implementação de service worker;
- deploy de infraestrutura de filas;
- definição de SLA operacional real;
- configuração de status page;
- operação real de incidentes;
- alteração de contratos backend;
- migrations;
- ativação de pagamentos;
- ativação de retries automáticos em produção.

Este documento define o contrato que deverá preceder essas implementações.

---

## 5. Inventário positivo existente

A base já contém elementos importantes que devem ser preservados.

### 5.1 Cache stale-while-revalidate

O runtime compartilhado possui:

- cache por chave;
- `staleTime`;
- reutilização de request em andamento;
- `keepPreviousData`;
- revalidação em background;
- invalidação por prefixo;
- invalidação por domínio.

Isso reduz telas vazias e pode sustentar continuidade de leitura.

### 5.2 Mutações otimistas

Pedidos, carteira e perfis possuem infraestrutura para:

- snapshot local;
- aplicação otimista;
- single-flight em memória;
- commit;
- rollback;
- invalidação posterior.

Essa fundação é útil, desde que o rollback seja reservado a falhas definitivas.

### 5.3 Chaves de cache por conta e papel

Pedidos, Mensagens e Carteira formam chaves com:

```text
<domínio>:<accountId>:<role>
```

A intenção de isolamento existe e deve ser preservada.

### 5.4 Sessão entre abas

O store de sessão escuta alterações da chave de autenticação por `storage` e publica `doke:auth-session-change`.

Isso já permite detectar login, logout e troca de conta entre abas.

### 5.5 Idempotência no backend e serviços

A base possui:

- contratos de idempotência;
- chave de idempotência em operações de pedidos;
- single-flight local;
- identidades de evento em pagamento;
- detecção de pagamento já processado;
- status recuperável `processing` em partes do fluxo financeiro.

A lacuna principal é transportar essa identidade até a experiência e preservá-la durante reload, retry e troca de aba.

### 5.6 Invalidação de domínios

Eventos como:

- pedido criado;
- status de pedido alterado;
- mensagem enviada;
- pagamento confirmado;
- pedido concluído;
- disputa aberta;
- avaliação criada;
- serviço atualizado;

podem invalidar rotas e caches relacionados.

Essa relação causal é correta e deverá ser elevada a um protocolo cross-tab e cross-device.

---

## 6. Causa raiz

A causa raiz não é ausência total de cache, estados ou retries.

É a ausência de uma autoridade transversal que responda:

```text
qual intenção está em andamento?
qual conta iniciou a intenção?
qual aba iniciou a intenção?
qual payload foi enviado?
qual chave de idempotência foi usada?
o servidor recebeu?
o servidor concluiu?
a resposta pode ser aplicada nesta rota?
a entidade mudou desde o início?
a operação pode ser repetida?
existe um receipt?
existe conflito?
qual dado local é stale?
qual ação continua segura durante degradação?
como retomar após reload?
```

Hoje, cada rota resolve apenas parte do problema:

- Marketplace reage ao evento `online`;
- Carteira reage a `pageshow` e `visibilitychange` em código próprio;
- sessão reage a `storage`;
- notificações mantêm seus próprios eventos cross-tab;
- comunidade possui estabilidade própria;
- drafts usam localStorage e timer local;
- mutações otimistas usam Maps em memória;
- pagamentos possuem task em memória;
- pedidos possuem snapshots de DOM;
- mensagens mantêm snapshot em variável de módulo.

A soma dessas soluções não forma continuidade canônica.

---

## 7. Achados P0

### CONT-P0-01 — máquina de estados insuficiente

O runtime compartilhado reconhece somente:

```text
idle
loading
refreshing
ready
empty
error
offline
submitting
success
```

Faltam estados materiais:

```text
stale
degraded
reconnecting
reconciling
unknown_outcome
conflict
maintenance
read_only
interrupted
resuming
```

Consequência:

- stale pode aparecer como ready;
- timeout pode aparecer como error;
- processamento assíncrono pode parecer concluído ou falho;
- indisponibilidade parcial pode bloquear tudo;
- conflito pode ser convertido em erro genérico.

### CONT-P0-02 — rollback em qualquer rejeição de Promise

A mutação otimista atual executa rollback sempre que a Promise rejeita.

Esse comportamento é correto para:

- validação rejeitada;
- permissão negada;
- conflito confirmado;
- regra de negócio rejeitada.

É incorreto para:

- timeout;
- conexão interrompida depois do envio;
- resposta perdida;
- navegador descarregado;
- proxy encerrando conexão após commit;
- falha do cliente ao interpretar uma resposta já confirmada.

Nessas situações, o estado deve ser:

```text
UNKNOWN_OUTCOME
```

até consulta de reconciliação.

### CONT-P0-03 — pending tasks são apenas em memória

Maps como:

```text
activeMutations
paymentTasks
completionTasks
```

existem apenas durante a vida da página.

Após reload:

- single-flight é perdido;
- o CTA pode voltar a ficar disponível;
- a chave original pode ser perdida;
- a pessoa pode enviar uma segunda operação;
- a UI não sabe que precisa reconciliar.

### CONT-P0-04 — respostas não são cercadas por geração de conta

Os módulos formam a chave inicial com a conta atual, mas callbacks de revalidação e mutação não verificam novamente:

- accountId atual;
- geração da sessão;
- papel atual;
- rota atual;
- intenção ativa.

Cenário de risco:

```text
conta A abre Mensagens
→ request A inicia
→ sessão muda para conta B
→ snapshot B começa a carregar
→ request A termina
→ callback A publica lista antiga na tela B
```

### CONT-P0-05 — snapshots de módulo podem sobreviver à troca de conta

Mensagens e Carteira mantêm snapshots em variáveis de módulo.

A chave de cache muda, mas o snapshot anterior pode continuar sendo usado para decidir:

```text
loading versus refreshing
ready versus error
```

Sem purge transacional, a pessoa pode ver dados antigos da conta anterior enquanto a nova conta carrega.

### CONT-P0-06 — respostas não são cercadas por geração de rota

Uma resposta iniciada em uma rota pode concluir depois de:

- navegação interna;
- back;
- forward;
- abertura de overlay;
- troca de entidade;
- nova consulta.

Sem `routeGeneration` e `entityRevision`, a resposta antiga ainda pode:

- publicar evento;
- alterar estado;
- mover foco;
- substituir coleção;
- fechar skeleton;
- exibir toast.

### CONT-P0-07 — `navigator.onLine` é tratado como classificação de erro

Vários módulos escolhem entre `offline` e `error` com:

```text
navigator.onLine === false
```

Esse sinal não prova que:

- a API está alcançável;
- o DNS funciona;
- a autenticação está válida;
- o domínio específico está saudável;
- não existe captive portal;
- a resposta chegou à autoridade.

O evento `online` significa apenas que o navegador acredita ter uma interface de rede.

### CONT-P0-08 — recovery de conexão é fragmentado

Marketplace possui listener de `online` que invalida e reinicia seu controller.

Outras rotas possuem estratégias diferentes ou nenhuma estratégia equivalente.

Isso gera:

- recovery desigual;
- requests duplicados;
- reboots concorrentes;
- ausência de reconciliação em pagamentos;
- Carteira atualizada de forma diferente de Pedidos;
- Mensagens dependendo de realtime ou reload manual.

### CONT-P0-09 — não existe autoridade cross-tab de domínio

A sessão e algumas features usam eventos de storage, mas não foi observada uma autoridade transversal baseada em canal por conta.

Consequências:

- duas abas podem enviar a mesma intenção;
- uma aba pode permanecer stale;
- uma aba pode sobrescrever draft de outra;
- invalidação pode ficar restrita ao documento atual;
- retry pode ocorrer simultaneamente;
- toasts duplicados podem aparecer.

### CONT-P0-10 — drafts usam last-write-wins silencioso

O draft store persiste:

```text
version
savedAt
payload
```

Não persiste:

- `draftId`;
- `baseRevision`;
- `localRevision`;
- `originTabId`;
- `schemaFingerprint`;
- `accountGeneration`;
- `lastCommittedRevision`.

Duas abas podem editar o mesmo formulário e a última gravação substitui a anterior sem conflito visível.

### CONT-P0-11 — guests compartilham o mesmo namespace

Quando não há ID autenticado, drafts utilizam:

```text
guest
```

Pessoas diferentes no mesmo navegador podem compartilhar o mesmo namespace.

Esse risco foi registrado no contrato de privacidade e permanece blocker de continuidade.

### CONT-P0-12 — pagamento converte ambiguidade em erro ou offline

O controller de pagamento:

- mantém `paymentTask` em memória;
- declara `success` na resolução;
- declara `error` ou `offline` na rejeição;
- libera o CTA no `finally`.

Uma conexão perdida após o servidor aceitar o pagamento pode resultar em:

```text
error visual
→ CTA liberado
→ segundo clique
```

A página não possui estado explícito `UNKNOWN_OUTCOME` ou `RECONCILING`.

### CONT-P0-13 — recuperação financeira existe no serviço, mas não na UX

Partes do serviço financeiro conseguem manter uma operação como:

```text
processing
recoverable: true
```

A interface, porém, não apresenta:

- operation ID;
- consulta de status;
- receipt provisório;
- reconciliação após reload;
- bloqueio de repetição enquanto o estado é desconhecido.

A capacidade interna precisa ser projetada até a superfície.

### CONT-P0-14 — idempotência depende do caller

O serviço de pedidos aceita chave de idempotência enviada pelo caller.

A camada de experiência atual não demonstra uma autoridade que:

- gere a chave uma vez;
- persista a chave;
- associe a chave ao fingerprint do payload;
- reutilize a chave depois de reload;
- rejeite payload divergente.

### CONT-P0-15 — stale pode ser apresentado como ready

Mensagens e Carteira preservam snapshot após erro e podem retornar ao estado `ready`.

Isso mantém conteúdo útil, mas oculta que:

- a atualização falhou;
- o dado possui idade;
- ações dependentes podem estar desatualizadas;
- outra aba ou dispositivo pode ter alterado a entidade.

O estado correto é:

```text
STALE_VISIBLE
```

com timestamp e limites de ação.

### CONT-P0-16 — cache em memória não sustenta reload

O cache compartilhado usa `Map`.

Após reload:

- não há snapshot recente;
- não há timestamp de freshness;
- não há pending intent;
- não há cursor de reconciliação;
- não há recovery point.

Persistência deve ser seletiva e account-scoped, não uma cópia irrestrita de toda resposta.

### CONT-P0-17 — BFCache não possui protocolo único

Listeners de `pageshow` estão espalhados por shell, Carteira, comunidade e guards.

Uma página restaurada pelo BFCache pode conter:

- sessão antiga;
- dados antigos;
- listeners antigos;
- overlay aberto;
- CTA habilitado;
- pending mutation perdida;
- scroll de entidade removida.

Não existe um gate transversal de retomada.

### CONT-P0-18 — `beforeunload` é fragmentado

Configurações, Mensagens, busca, avaliação e formulário de serviço tratam descarregamento de formas próprias.

Não existe uma autoridade única para:

- saber quais drafts são recuperáveis;
- impedir prompt quando autosave confirmou;
- preservar upload pendente;
- explicar perda inevitável;
- diferenciar navegação interna de fechamento da aba.

### CONT-P0-19 — não existe modo de manutenção de produto

Não foi observada uma máquina de estados pública para:

```text
scheduled maintenance
incident
partial outage
read-only mode
```

Sem isso, a interface tende a apresentar erros locais desconectados em cada rota.

### CONT-P0-20 — invalidação não garante reconciliação da entidade ativa

Invalidar cache ou route cache é necessário, mas não suficiente.

A entidade atualmente visível pode continuar com:

- CTA antigo;
- valor antigo;
- status antigo;
- receipt antigo;
- ordem de mensagens antiga.

A invalidação precisa decidir se deve:

- revalidar imediatamente;
- marcar stale;
- bloquear mutação;
- solicitar ação manual;
- aguardar visibilidade da página.

---

## 8. Autoridade proposta

```text
Doke.continuityExperience
```

### 8.1 Responsabilidades

```text
createJourneySession()
getJourneySession()
createIntentEnvelope()
persistPendingIntent()
resumePendingIntents()
acknowledgeIntent()
settleIntent()
reconcileIntent()
cancelIntent()
expireIntent()
registerRecoveryPoint()
restoreRecoveryPoint()
registerResourceSnapshot()
markResourceStale()
revalidateResource()
fenceByAccountGeneration()
fenceByRouteGeneration()
fenceByEntityRevision()
broadcastMutation()
subscribeContinuityChannel()
detectDraftConflict()
resolveDraftConflict()
getConnectivitySnapshot()
probeDomainHealth()
enterDegradedMode()
exitDegradedMode()
registerIncidentState()
announceContinuityState()
```

### 8.2 Autoridades relacionadas

```text
Doke.formMutationManager
Doke.formExperience
Doke.unsavedChangesManager
Doke.notificationCenter
Doke.performanceExperience
Doke.privacyExperience
Doke.trustSafetyExperience
Doke.overlayManager
Doke.routeFocusManager
Doke.routeAnnouncer
```

### 8.3 Limite de autoridade

A camada de continuidade pode:

- preservar identidade da intenção;
- controlar estados visuais;
- registrar recovery points;
- impedir duplicação local;
- consultar status;
- reconciliar receipts;
- coordenar abas;
- marcar dados stale;
- bloquear ações perigosas durante degradação;
- orientar retomada.

Ela não pode:

- decidir que um pagamento ocorreu;
- decidir que um pedido foi aceito;
- decidir que uma mensagem foi entregue;
- decidir que uma denúncia foi recebida;
- decidir que um saque foi executado;
- alterar revisão server-side;
- fabricar receipt;
- resolver conflito de negócio sem autoridade.

---

## 9. Dimensões canônicas de estado

Um único enum não representa adequadamente continuidade.

As dimensões devem ser independentes.

### 9.1 Conectividade

```text
UNKNOWN
PROBING
ONLINE
DEGRADED
OFFLINE
CAPTIVE_OR_BLOCKED
```

#### UNKNOWN

Ainda não existe evidência suficiente.

#### PROBING

A interface está verificando o domínio necessário.

#### ONLINE

O domínio respondeu ao probe esperado.

#### DEGRADED

O domínio responde, mas com erro parcial, latência anormal ou capacidade reduzida.

#### OFFLINE

Não foi possível estabelecer conectividade utilizável.

#### CAPTIVE_OR_BLOCKED

O navegador indica conexão, mas o serviço esperado não é alcançável ou a resposta é incompatível.

### 9.2 Freshness de dados

```text
FRESH
STALE_VISIBLE
REVALIDATING
EXPIRED
INVALIDATED
```

#### FRESH

Snapshot confirmado dentro da política de freshness.

#### STALE_VISIBLE

Snapshot útil continua visível, mas não representa certeza atual.

#### REVALIDATING

Uma versão nova está sendo solicitada.

#### EXPIRED

O snapshot ultrapassou o limite para uso.

#### INVALIDATED

Um evento conhecido tornou a versão anterior inadequada.

### 9.3 Operação

```text
IDLE
DRAFT
QUEUED
SUBMITTING
ACKNOWLEDGED
CONFIRMED
REJECTED
UNKNOWN_OUTCOME
RECONCILING
CANCELLED
EXPIRED
```

#### ACKNOWLEDGED

A autoridade confirmou recebimento, mas ainda não concluiu o efeito.

#### CONFIRMED

A autoridade confirmou resultado terminal esperado.

#### REJECTED

A autoridade rejeitou definitivamente.

#### UNKNOWN_OUTCOME

O cliente não consegue determinar se a operação foi recebida ou concluída.

#### RECONCILING

A interface está consultando a autoridade usando a mesma identidade da operação.

### 9.4 Sincronização

```text
IN_SYNC
LOCAL_AHEAD
REMOTE_AHEAD
CONFLICT
MERGING
```

### 9.5 Jornada

```text
NOT_STARTED
IN_PROGRESS
INTERRUPTED
RESUMABLE
RESUMING
COMPLETED
ABANDONED
```

### 9.6 Disponibilidade do serviço

```text
AVAILABLE
PARTIALLY_AVAILABLE
MAINTENANCE
INCIDENT
READ_ONLY
UNAVAILABLE
```

### 9.7 Combinação de estados

Exemplo:

```text
connectivity: DEGRADED
freshness: STALE_VISIBLE
operation: UNKNOWN_OUTCOME
synchronization: REMOTE_AHEAD
journey: INTERRUPTED
service: PARTIALLY_AVAILABLE
```

A interface deve projetar a combinação relevante, não substituir tudo por “Ocorreu um erro”.

---

## 10. Envelope canônico de intenção

```text
IntentEnvelope
├── intentId
├── idempotencyKey
├── journeyId
├── accountId
├── accountGeneration
├── routeKey
├── routeGeneration
├── originTabId
├── originDeviceId
├── entityType
├── entityId
├── action
├── payloadFingerprint
├── baseRevision
├── createdAt
├── updatedAt
├── expiresAt
├── attemptCount
├── operationState
├── lastAttemptAt
├── lastErrorClass
├── authorityReceipt
├── reconciliationCursor
├── privacyClass
└── schemaVersion
```

### 10.1 `intentId`

Identidade pública estável da intenção.

Deve permanecer igual durante:

- retry;
- reload;
- reconciliação;
- troca de rota;
- retomada em outra aba, quando permitido.

### 10.2 `idempotencyKey`

Chave enviada à autoridade de mutação.

Regra:

```text
mesma intenção + mesmo fingerprint
→ mesma idempotencyKey
```

```text
payload diferente
→ nova intenção ou conflito explícito
```

### 10.3 `payloadFingerprint`

Hash ou representação determinística do payload autorizado.

Não deve persistir conteúdo sensível bruto.

### 10.4 `baseRevision`

Versão da entidade usada como precondição.

Permite detectar:

- status alterado em outra aba;
- atualização em outro dispositivo;
- preço modificado;
- mensagem editada;
- draft baseado em versão antiga.

### 10.5 `authorityReceipt`

Referência retornada pela autoridade.

Pode conter:

```text
operationId
acceptedAt
statusEndpoint
entityRevision
receiptVersion
```

### 10.6 Retenção

Intent envelopes devem possuir políticas por classe.

Exemplo:

| Classe | Persistência | Retenção sugerida |
| --- | --- | --- |
| busca | memória | duração da rota |
| draft comum | storage por conta | 24 h |
| mensagem pendente | storage por conta | até settlement ou 7 dias |
| pedido | storage por conta | até settlement + janela de suporte |
| pagamento | receipt mínimo | até reconciliação + política financeira |
| denúncia | receipt mínimo | até encerramento + política de segurança |

Os valores finais dependem de produto, segurança e jurídico.

---

## 11. Geração de conta

### 11.1 Definição

Cada mudança material de sessão incrementa:

```text
accountGeneration
```

Exemplos:

- login;
- logout;
- troca de conta;
- troca de papel ativo;
- sessão renovada com outro usuário;
- suspensão;
- reautenticação;
- expiração.

### 11.2 Fence de resposta

Antes de aplicar qualquer resultado:

```text
result.accountId === current.accountId
&& result.accountGeneration === current.accountGeneration
```

Caso contrário:

- descartar commit visual;
- não anunciar sucesso;
- não atualizar cache da conta atual;
- registrar `account_generation_fenced`;
- manter receipt no namespace correto, se necessário.

### 11.3 Troca de conta transacional

Sequência:

```text
sinal de troca
→ congelar novas mutações
→ incrementar geração
→ abortar requests canceláveis
→ ocultar superfícies privadas antigas
→ limpar snapshots em memória
→ reatribuir canais cross-tab
→ carregar shell da nova conta
→ revalidar dados privados
→ liberar ações
```

Nunca deve existir um frame em que:

- nome da conta B;
- mensagens da conta A;
- carteira da conta A;

apareçam simultaneamente.

### 11.4 Pending intents da conta anterior

Pending intents não devem migrar para a nova conta.

Eles podem:

- continuar sob autoridade remota;
- ser reconciliados quando a conta anterior voltar;
- ser cancelados somente se o domínio permitir;
- ser removidos localmente do dispositivo compartilhado conforme política.

---

## 12. Geração de rota

### 12.1 Definição

Cada navegação cria:

```text
routeGeneration
```

Ela muda em:

- navegação pelo shell;
- `popstate`;
- deep link interno;
- reload;
- troca de entidade na mesma página quando o contexto muda materialmente.

### 12.2 Commit gate

Uma resposta pode atualizar a rota apenas se:

```text
response.routeGeneration === current.routeGeneration
```

Exceções:

- cache de domínio pode ser preenchido em background;
- receipt pode ser persistido no namespace correto;
- notificação pode ser criada pela autoridade apropriada.

Mas não pode:

- trocar conteúdo da rota atual;
- mover foco;
- fechar overlay;
- mostrar sucesso contextual;
- alterar URL;
- restaurar scroll.

### 12.3 Entidade ativa

Rotas com `order`, `conversation`, `service`, `report` ou `payment` também precisam validar:

```text
entityId
entityRevision
```

---

## 13. Cancelamento de requests

### 13.1 Requests canceláveis

Leituras devem usar `AbortController` quando possível.

Cancelar ao:

- trocar de conta;
- trocar de rota;
- superseder consulta;
- fechar fluxo efêmero;
- expirar jornada.

### 13.2 Requests não canceláveis semanticamente

Cancelar a conexão não significa cancelar a operação server-side.

Mutações críticas precisam permanecer como:

```text
SUBMITTING
ACKNOWLEDGED
UNKNOWN_OUTCOME
RECONCILING
```

conforme a evidência disponível.

### 13.3 Abort local

Um `AbortError` em mutação não autoriza rollback definitivo.

Ele deve ser classificado conforme:

- request ainda não enviado;
- request enviado parcialmente;
- request enviado sem receipt;
- receipt recebido;
- processamento confirmado.

---

## 14. Política de retry

### 14.1 Leituras seguras

Podem usar retry automático com:

- backoff exponencial;
- jitter;
- limite de tentativas;
- cancelamento ao mudar geração;
- prioridade por rota visível;
- respeito a `saveData`;
- respeito a estado de bateria/rede quando aplicável.

### 14.2 Mutações reversíveis e idempotentes

Podem repetir somente com:

- mesma idempotencyKey;
- mesmo payload fingerprint;
- mesma conta;
- mesma entidade;
- política explícita do domínio;
- ausência de confirmação terminal.

### 14.3 Mutações financeiras, destrutivas ou irreversíveis

Não devem ser repetidas automaticamente sem consulta de status.

Exemplos:

- pagar;
- concluir pedido;
- solicitar saque;
- excluir conta;
- banir permanentemente;
- publicar anúncio;
- aceitar proposta com efeito financeiro;
- abrir disputa;
- enviar denúncia com evidência sensível.

Fluxo:

```text
resultado desconhecido
→ consultar status pela intentId/idempotencyKey
→ confirmar estado
→ somente então decidir retry
```

### 14.4 Retry storm

Múltiplas abas não podem executar o mesmo retry simultaneamente.

A coordenação deve usar:

- lease local por intent;
- líder temporário de reconciliação;
- confirmação server-side;
- expiração curta;
- takeover seguro se a aba líder desaparecer.

---

## 15. Coordenação cross-tab

### 15.1 Canal proposto

```text
doke:<accountId>:continuity:v1
```

Tecnologia preferencial:

```text
BroadcastChannel
```

Fallback:

```text
storage event com payload mínimo e TTL curto
```

### 15.2 Eventos

```text
ACCOUNT_GENERATION_CHANGED
INTENT_STARTED
INTENT_ACKNOWLEDGED
INTENT_SETTLED
INTENT_UNKNOWN
INTENT_RECONCILING
RESOURCE_INVALIDATED
RESOURCE_REVALIDATED
DRAFT_UPDATED
DRAFT_CONFLICT
INCIDENT_STATE_CHANGED
LOGOUT_CLEANUP_STARTED
LOGOUT_CLEANUP_COMPLETED
```

### 15.3 Payload permitido

O canal deve transportar apenas:

- IDs opacos;
- tipo de domínio;
- revisão;
- timestamp;
- estado;
- origem;
- fingerprint.

Não transportar:

- mensagem;
- endereço;
- telefone;
- e-mail;
- valor financeiro detalhado quando desnecessário;
- conteúdo de denúncia;
- anexo;
- token;
- dados KYC.

### 15.4 Uma aba como reconciliadora

Para cada intent pendente:

- uma aba adquire lease;
- consulta a autoridade;
- publica resultado mínimo;
- outras abas atualizam projeção;
- lease expira se a aba desaparecer.

### 15.5 Ações em outra aba

Exemplo:

```text
aba A aceita pedido
→ aba B recebe INTENT_STARTED
→ CTA da aba B fica indisponível
→ aba A recebe receipt
→ aba B recebe INTENT_SETTLED
→ ambas revalidam a entidade
```

---

## 16. Continuidade cross-device

### 16.1 Fonte de verdade

Continuidade entre dispositivos depende de:

- receipt remoto;
- revisão da entidade;
- status do comando;
- draft remoto quando produto permitir;
- eventos da autoridade.

LocalStorage não cria continuidade cross-device.

### 16.2 Linguagem correta

```text
Rascunho salvo neste dispositivo
```

é diferente de:

```text
Rascunho salvo na sua conta
```

A Doke não pode prometer sincronização sem autoridade remota.

### 16.3 Conflito cross-device

Ao detectar revisão remota mais nova:

- não sobrescrever automaticamente;
- mostrar resumo do conflito;
- preservar cópia local;
- oferecer comparação quando viável;
- impedir mutação baseada em estado inválido.

---

## 17. Draft canônico

```text
DraftRecord
├── draftId
├── accountId | guestSessionId
├── accountGeneration
├── formType
├── entityId
├── schemaVersion
├── schemaFingerprint
├── baseRevision
├── localRevision
├── lastCommittedRevision
├── originTabId
├── createdAt
├── savedAt
├── expiresAt
├── payload
├── fieldPolicy
└── privacyClass
```

### 17.1 Revisões

Cada gravação incrementa:

```text
localRevision
```

Outra aba deve comparar:

```text
baseRevision
localRevision
originTabId
```

### 17.2 Conflito

Estado:

```text
DRAFT_CONFLICT
```

Ações possíveis:

- manter esta versão;
- usar a versão mais nova;
- comparar campos;
- copiar texto atual;
- salvar como nova versão;
- cancelar e voltar.

Nunca:

```text
última gravação vence silenciosamente
```

### 17.3 Campos sensíveis

Não persistir automaticamente:

- senha;
- código de autenticação;
- CVV;
- número integral de cartão;
- documento KYC bruto;
- conteúdo de denúncia altamente sensível sem política;
- áudio ainda não enviado;
- localização exata sem consentimento;
- token;
- segredo de integração.

### 17.4 Autosave

O autosave deve apresentar estados discretos:

```text
Salvando…
Salvo neste dispositivo às 13:04
Não foi possível salvar neste dispositivo
Conflito com outra aba
```

Não usar toast repetitivo a cada gravação.

---

## 18. Connectivity snapshot

```text
ConnectivitySnapshot
├── browserSignal
├── apiReachable
├── authReachable
├── domainReachability
├── latencyClass
├── checkedAt
├── expiresAt
├── failureClass
└── captivePortalSuspected
```

### 18.1 Browser signal

`navigator.onLine` é apenas um sinal.

### 18.2 Probe

O probe deve ser:

- leve;
- sem dados pessoais;
- sem mutação;
- com timeout curto;
- específico para a capacidade necessária;
- rate-limited;
- cancelável;
- observável.

### 18.3 Domínios independentes

Pode ocorrer:

```text
catálogo: AVAILABLE
mensagens: DEGRADED
pagamentos: UNAVAILABLE
notificações: AVAILABLE
```

A interface não deve bloquear o produto inteiro.

### 18.4 Retorno da conexão

Sequência:

```text
online event
→ PROBING
→ validar sessão
→ reconciliar intents críticos
→ revalidar entidade ativa
→ revalidar coleções visíveis
→ liberar ações compatíveis
→ ONLINE ou DEGRADED
```

Nunca:

```text
online event
→ declarar tudo recuperado
```

---

## 19. Recovery após reload

### 19.1 Bootstrap

No boot:

1. resolver conta e geração;
2. resolver rota e entidade;
3. carregar incident state;
4. carregar recovery points permitidos;
5. carregar pending intents da conta;
6. reconciliar intent crítico da rota;
7. carregar snapshot válido;
8. iniciar revalidação;
9. restaurar draft compatível;
10. restaurar foco e scroll se ainda válidos.

### 19.2 Pending intent na rota

Exemplo de pagamento:

```text
pagamento pendente encontrado
→ CTA permanece bloqueado
→ mostrar “Confirmando pagamento anterior”
→ consultar status
→ renderizar receipt ou liberar nova tentativa
```

### 19.3 Overlay

Não restaurar automaticamente:

- confirmação destrutiva;
- prompt de senha;
- modal de pagamento ainda não enviado;
- menu contextual;
- preview efêmero.

Pode restaurar:

- etapa de formulário;
- draft;
- rota de detalhe;
- posição de leitura;
- painel não destrutivo.

### 19.4 Scroll

Restaurar somente se:

- mesma rota lógica;
- mesma entidade;
- mesma conta;
- conteúdo compatível;
- elemento alvo ainda existe.

---

## 20. Back-forward cache

### 20.1 Evento `pageshow`

Quando `event.persisted === true`:

- validar accountGeneration;
- validar routeGeneration;
- invalidar dados voláteis;
- revalidar pending intents;
- revisar overlays;
- revisar scroll lock;
- revisar estado de teclado;
- revisar conexão realtime;
- revisar freshness de valores financeiros.

### 20.2 Página antiga após logout

Se uma página privada retornar do BFCache depois de logout:

- ocultar conteúdo imediatamente;
- não exibir snapshot anterior;
- encaminhar para autenticação ou estado anônimo;
- limpar foco privado;
- não aguardar request para esconder dados.

### 20.3 Página antiga após mutação em outra aba

A página deve:

- receber invalidação cross-tab;
- marcar entidade `REMOTE_AHEAD`;
- revalidar ao retornar;
- não permitir ação sobre revisão antiga.

---

## 21. Jornada: Home e Resultados

### 21.1 Estado preservável

- query;
- filtros aplicados;
- draft de filtros;
- modo de resultado;
- scroll;
- página/cursor;
- item focado;
- freshness do catálogo.

### 21.2 Interrupção

Se conexão cair:

- manter resultados cacheados, se permitidos;
- marcar “Resultados de X min atrás”;
- bloquear paginação se não houver fonte;
- permitir editar filtros;
- não transformar erro em vazio;
- não esconder conteúdo editorial independente.

### 21.3 Reconnect

- revalidar fingerprint atual;
- manter latest-wins;
- descartar resposta de query anterior;
- preservar foco;
- anunciar mudança material uma vez;
- evitar voltar ao topo sem necessidade.

### 21.4 Deep link

URL deve permitir retomar:

- query;
- filtros aplicados;
- escopo;
- ordenação;
- página/cursor quando estável.

Draft de filtros não precisa entrar na URL antes de aplicar.

---

## 22. Jornada: solicitação de orçamento

### 22.1 Recovery point

Persistir, conforme política:

- serviço;
- respostas do questionário;
- descrição;
- faixa de orçamento;
- disponibilidade;
- anexos já enviados;
- anexos locais ainda não enviados como referências locais seguras;
- etapa atual;
- base revision do serviço.

### 22.2 Serviço alterado

Se o anúncio mudar durante o preenchimento:

```text
REMOTE_AHEAD
```

Mostrar:

- o que mudou de forma relevante;
- preço/faixa alterada;
- disponibilidade alterada;
- profissional indisponível;
- anúncio removido.

A pessoa deve confirmar antes de enviar com nova base.

### 22.3 Envio

A solicitação deve possuir:

- intentId;
- idempotencyKey;
- fingerprint;
- serviço revision;
- accountGeneration;
- receipt.

### 22.4 Timeout

Mostrar:

```text
Estamos confirmando se sua solicitação foi enviada.
Não envie novamente ainda.
```

Depois reconciliar pelo intentId.

---

## 23. Jornada: pedido e proposta

### 23.1 Transições

Cada transição deve incluir:

```text
orderId
expectedStatus
expectedRevision
action
intentId
idempotencyKey
```

### 23.2 Optimistic UI

Pode indicar:

```text
Atualizando pedido…
```

Não pode declarar:

```text
Pedido aceito
```

antes de confirmação.

### 23.3 Conflito 409 ou revisão divergente

Fluxo:

```text
rejeitar commit local
→ carregar versão atual
→ explicar mudança
→ atualizar ações disponíveis
```

Exemplo:

```text
Este pedido já foi aceito em outro dispositivo.
Atualizamos a tela para o estado mais recente.
```

### 23.4 Reload durante transição

Ao retornar:

- localizar pending intent;
- bloquear a ação duplicada;
- consultar pedido;
- correlacionar receipt;
- concluir ou liberar nova ação.

### 23.5 Ações incompatíveis

Aceite, recusa, cancelamento, cobrança e conclusão não podem correr simultaneamente sobre a mesma revisão.

---

## 24. Jornada: Mensagens

### 24.1 Estados de mensagem

```text
DRAFT
QUEUED
SENDING
SENT
DELIVERED
READ
FAILED_RETRYABLE
FAILED_TERMINAL
UNKNOWN_OUTCOME
```

### 24.2 Identidade da mensagem

Toda mensagem deve possuir:

```text
clientMessageId
conversationId
accountId
payloadFingerprint
createdAtClient
```

O servidor deve retornar identidade canônica ou correlacionar a mesma mensagem.

### 24.3 Offline

Se envio offline for suportado:

- mostrar `QUEUED`;
- informar que ainda não foi enviado;
- permitir cancelar antes do envio;
- não emitir notificação como se entregue;
- não marcar conversa como atualizada remotamente.

Se envio offline não for suportado:

- preservar draft;
- impedir submit;
- manter texto;
- oferecer envio quando reconectar.

### 24.4 Retry

Reutilizar `clientMessageId` e idempotency key.

Nunca criar segunda bolha local para o mesmo intent.

### 24.5 Realtime duplicado

Deduplicar por:

- server message ID;
- clientMessageId;
- conversationId;
- actor;
- payload fingerprint como fallback controlado.

### 24.6 Anexos

Upload e envio da mensagem são lifecycles separados:

```text
LOCAL_SELECTED
UPLOADING
UPLOADED_PRIVATE
MESSAGE_SUBMITTING
ATTACHED_CONFIRMED
FAILED
EXPIRED
```

Falha no envio da mensagem não deve automaticamente apagar upload recuperável.

### 24.7 Troca de conta

- limpar snapshot imediatamente;
- cancelar subscriptions;
- limpar composer visual;
- preservar draft apenas no namespace da conta original;
- impedir resposta atrasada de aparecer na conta nova.

---

## 25. Jornada: pagamento

### 25.1 Regra máxima

```text
nenhum retry de pagamento
antes de reconciliar a intenção anterior
```

### 25.2 Estados

```text
DRAFT
SUBMITTING
ACKNOWLEDGED
PROCESSING
HELD
REJECTED
UNKNOWN_OUTCOME
RECONCILING
EXPIRED
```

### 25.3 Receipt provisório

Após acknowledgment:

```text
operationId
intentId
orderId
acceptedAt
status
```

### 25.4 Timeout

Copy:

```text
Estamos confirmando seu pagamento.
Não tente pagar novamente enquanto verificamos o status.
```

Ações permitidas:

- voltar ao pedido;
- ver status;
- copiar protocolo;
- contatar suporte com protocolo.

Ação bloqueada:

- pagar novamente.

### 25.5 Reload

A rota deve buscar:

- intent pendente;
- payment operation por orderId;
- cobrança atual;
- status da autoridade;
- receipt.

### 25.6 Pagamento versus conclusão

São intenções independentes com precondições.

```text
payment HELD
→ conclusão pode se tornar elegível
```

```text
payment UNKNOWN_OUTCOME
→ conclusão permanece bloqueada
```

### 25.7 Provedor indisponível

Se pagamentos estiverem indisponíveis:

- outras áreas continuam acessíveis;
- cobrança permanece visível em read-only;
- CTA informa indisponibilidade;
- não simular pagamento local;
- não criar receipt falso;
- não prometer prazo sem autoridade.

---

## 26. Jornada: Carteira e saque

### 26.1 Snapshot financeiro

Sempre apresentar:

- `asOf`;
- freshness;
- origem;
- status de reconciliação.

Exemplo:

```text
Saldo atualizado às 12:58
```

ou:

```text
Mostrando saldo de 12:41. Atualização temporariamente indisponível.
```

### 26.2 Snapshot stale

Pode permanecer visível para consulta.

Não pode autorizar:

- novo saque;
- cálculo definitivo;
- confirmação de disponibilidade;
- claim de saldo atual.

### 26.3 Saque

Intent envelope deve persistir até receipt terminal.

Timeout:

```text
UNKNOWN_OUTCOME
```

Não:

```text
FAILED
```

sem confirmação.

### 26.4 Conta bancária alterada em outra aba

Detectar revisão remota e exigir nova confirmação antes do saque.

---

## 27. Jornada: conclusão do pedido e avaliação

### 27.1 Conclusão

A conclusão pode afetar:

- pedido;
- carteira;
- pagamento;
- conversa;
- avaliações;
- notificações.

Ela precisa de intent único e reconciliação multi-domínio.

### 27.2 Falha parcial

Se pedido foi concluído, mas notificação falhou:

- pedido permanece concluído;
- notificação fica como efeito secundário pendente;
- UI não deve reexecutar conclusão.

### 27.3 Avaliação

Após confirmação de elegibilidade:

- draft recuperável;
- intent idempotente;
- receipt;
- revisão da avaliação;
- estado de moderação.

Se reload ocorrer após envio:

- consultar avaliação existente;
- não exibir formulário vazio que permita duplicata.

---

## 28. Jornada: denúncia e bloqueio

### 28.1 Denúncia

Estados:

```text
DRAFT
SUBMITTING
RECEIVED
UNKNOWN_OUTCOME
RECONCILING
CLOSED
```

### 28.2 Receipt

Após receber:

- protocolo;
- data;
- alvo;
- motivo público;
- próximo passo;
- status.

### 28.3 Timeout

Não declarar:

```text
Denúncia enviada
```

sem receipt.

Mostrar:

```text
Estamos confirmando o envio da denúncia.
Não envie novamente ainda.
```

### 28.4 Bloqueio imediato

Bloqueio local pode funcionar como contenção imediata da UX.

A sanção canônica depende da autoridade.

A interface deve separar:

```text
pessoa ocultada neste dispositivo
```

versus:

```text
bloqueio confirmado na sua conta
```

### 28.5 Denúncia e bloqueio são intents separados

Falha na denúncia não deve desfazer automaticamente contenção local escolhida.

Falha no bloqueio remoto não pode fabricar bloqueio canônico.

---

## 29. Jornada: perfil, anúncio e onboarding

### 29.1 Draft

Persistir somente campos autorizados.

### 29.2 Mídia

Separar:

```text
seleção local
upload
processamento
scan
publicação
```

### 29.3 Conflito

Se perfil ou anúncio foi alterado em outra aba/dispositivo:

- comparar base revision;
- não sobrescrever silenciosamente;
- preservar edição atual;
- mostrar versão remota;
- permitir merge campo a campo quando seguro.

### 29.4 Publicação

“Salvo” e “Publicado” são estados distintos.

```text
DRAFT_SAVED
SUBMITTED_FOR_REVIEW
PUBLISHED
```

### 29.5 Onboarding

A etapa deve retomar após reload sem:

- repetir upload confirmado;
- perder decisão de privacidade;
- refazer consulta externa sem gesto;
- marcar etapa completa localmente sem autoridade.

---

## 30. Estados degradados

### 30.1 Princípio

Degradação deve preservar o máximo de valor seguro.

### 30.2 Matriz de capacidade

| Domínio indisponível | Leitura | Draft | Mutação | Recuperação |
| --- | --- | --- | --- | --- |
| catálogo | cache stale | filtros | bloqueada | revalidar |
| mensagens | histórico permitido | composer | queued ou bloqueada | reconciliar |
| pedidos | snapshot stale | não aplicável | bloqueada | consultar revisão |
| pagamentos | cobrança read-only | não | bloqueada | consultar intent |
| carteira | snapshot com `asOf` | não | bloqueada | revalidar |
| denúncias | draft local seguro | sim | bloqueada | enviar depois com decisão explícita |
| perfis | snapshot público | draft | bloqueada | comparar revisão |

### 30.3 Degradação parcial

Não usar banner global para toda falha local.

Exemplo:

```text
Pagamentos temporariamente indisponíveis.
Pedidos e mensagens continuam funcionando.
```

### 30.4 CTA

CTA indisponível deve explicar:

- o que está indisponível;
- o que continua funcionando;
- se o draft foi preservado;
- como a recuperação ocorrerá;
- se existe ação segura alternativa.

---

## 31. Incidentes e manutenção

### 31.1 Envelope de incidente

```text
IncidentState
├── incidentId
├── scope
├── severity
├── status
├── startedAt
├── updatedAt
├── expectedBehavior
├── affectedActions
├── readOnlyAllowed
├── nextProbeAt
├── publicMessageKey
└── source
```

### 31.2 Status

```text
INVESTIGATING
IDENTIFIED
MONITORING
RESOLVED
SCHEDULED
IN_PROGRESS
```

### 31.3 Escopo

```text
GLOBAL
AUTH
CATALOG
SEARCH
ORDERS
MESSAGES
PAYMENTS
WALLET
NOTIFICATIONS
TRUST_SAFETY
COMMUNITIES
```

### 31.4 Banner

O banner deve:

- ser específico;
- usar linguagem não técnica;
- evitar ETA inventada;
- indicar atualização temporal;
- oferecer detalhes quando existentes;
- respeitar acessibilidade;
- não bloquear navegação desnecessariamente.

### 31.5 Manutenção programada

Antes:

- avisar data e horário absolutos;
- informar ações afetadas;
- orientar salvar drafts;
- informar read-only quando aplicável.

Durante:

- bloquear somente ações afetadas;
- preservar leitura segura;
- preservar drafts;
- informar que manutenção está em andamento.

Depois:

- revalidar intents;
- reconciliar dados;
- remover banner somente após evidência.

---

## 32. Modo somente leitura

### 32.1 Uso

Aplicável quando:

- leitura é segura;
- mutações não são seguras;
- existe manutenção;
- existe incidente de escrita;
- autoridade secundária está indisponível.

### 32.2 Interface

- dados mostram freshness;
- CTAs mutacionais ficam indisponíveis;
- drafts podem continuar locais;
- filtros e navegação continuam;
- histórico continua;
- nenhuma ação aparenta sucesso.

### 32.3 Saída

Ao sair de read-only:

- probe;
- reconciliação;
- revisão de drafts;
- revisão de entidade;
- liberação de CTA.

Não liberar apenas porque o banner expirou localmente.

---

## 33. Cópia de continuidade

### 33.1 Offline

```text
Você está sem conexão.
Seu rascunho foi preservado neste dispositivo.
```

### 33.2 Reconnecting

```text
Reconectando…
Vamos confirmar as ações pendentes antes de liberar novos envios.
```

### 33.3 Stale

```text
Mostrando dados de 12:41.
A atualização está temporariamente indisponível.
```

### 33.4 Unknown outcome

```text
Estamos confirmando o resultado desta ação.
Não tente novamente enquanto verificamos.
```

### 33.5 Conflict

```text
Este conteúdo foi alterado em outro lugar.
Compare as versões antes de continuar.
```

### 33.6 Session changed

```text
A conta ativa mudou.
Atualizamos a página para proteger seus dados.
```

### 33.7 Maintenance

```text
Pagamentos estão em manutenção programada.
Pedidos e mensagens continuam disponíveis.
```

### 33.8 Proibições

Não usar:

- “Tente novamente” para outcome desconhecido;
- “Sem internet” quando API específica falhou;
- “Tudo certo” antes de receipt;
- “Nada encontrado” após erro;
- “Seus dados estão seguros” sem escopo e evidência;
- “Voltaremos em breve” sem informação operacional;
- “Processando” indefinidamente sem protocolo.

---

## 34. Acessibilidade

### 34.1 Anúncios

Mudanças de continuidade devem usar o manager de live regions.

Prioridade:

- `polite` para reconnect/stale;
- `assertive` para sessão alterada com risco de dados;
- foco controlado para conflito que exige decisão.

### 34.2 Foco

Recovery não deve:

- mover foco repetidamente durante probes;
- devolver foco a elemento removido;
- focar banner a cada atualização;
- prender pessoa em skeleton.

### 34.3 Estado não visual

Usar:

- texto;
- ícone;
- `aria-live`;
- `aria-busy`;
- `aria-disabled`;
- descrição associada.

Não depender apenas de cor.

### 34.4 Countdown

Evitar anúncios a cada segundo.

Atualizar apenas em intervalos significativos.

---

## 35. Privacidade

### 35.1 Pending intents

Persistir apenas o necessário para reconciliar.

### 35.2 Canal cross-tab

Nunca publicar conteúdo bruto.

### 35.3 Telemetria

Não registrar:

- corpo de mensagem;
- descrição de denúncia;
- endereço;
- documento;
- dados de pagamento;
- nome completo;
- e-mail;
- telefone.

### 35.4 Dispositivo compartilhado

“Sair e remover meus dados deste dispositivo” deve limpar:

- recovery points privados;
- pending intents locais resolvidos ou abandonáveis;
- drafts;
- snapshots;
- leases;
- canais;
- receipts locais conforme política.

Intents remotos não são cancelados por apagar storage local.

---

## 36. Observabilidade

### 36.1 Eventos propostos

```text
continuity_journey_started
continuity_journey_resumed
continuity_journey_completed
continuity_intent_created
continuity_intent_acknowledged
continuity_intent_confirmed
continuity_intent_rejected
continuity_unknown_outcome_entered
continuity_reconciliation_started
continuity_reconciliation_settled
continuity_duplicate_prevented
continuity_account_generation_fenced
continuity_route_generation_fenced
continuity_entity_revision_conflict
continuity_draft_conflict
continuity_stale_snapshot_shown
continuity_reconnect_probe_result
continuity_incident_mode_entered
continuity_read_only_entered
```

### 36.2 Métricas

- taxa de recuperação de jornada;
- taxa de drafts recuperados;
- taxa de drafts perdidos;
- intents duplicados evitados;
- intents duplicados executados;
- tempo em `UNKNOWN_OUTCOME`;
- tempo de reconciliação;
- conflito por mil edições;
- fences por troca de conta;
- duração de stale visível;
- retries por intent;
- falhas depois de acknowledgment;
- recovery após reload;
- recovery cross-tab;
- incident banner reach;
- ações bloqueadas por modo read-only.

### 36.3 Correlation

Usar IDs opacos:

```text
journeyId
intentId
operationId
incidentId
```

Nunca usar PII como correlation key.

---

## 37. SLOs de experiência propostos

Metas iniciais, não evidência atual.

### 37.1 Recovery

```text
pending intent detectado no boot ≤ 500 ms
estado de recovery visível ≤ 1 s
primeiro probe crítico ≤ 2 s
```

### 37.2 Cross-tab

```text
propagação local de intent ≤ 250 ms p75
propagação local de invalidação ≤ 250 ms p75
```

### 37.3 Draft

```text
autosave local confirmado ≤ 500 ms p75
conflito detectado antes de overwrite = 100%
```

### 37.4 Unknown outcome

```text
nenhum CTA duplicador liberado antes da reconciliação
```

### 37.5 Conta

```text
zero frames com identidade nova e conteúdo privado antigo
```

---

## 38. Segurança de retries

### 38.1 Classificação

```text
SAFE_READ
SAFE_IDEMPOTENT_WRITE
CONDITIONAL_WRITE
FINANCIAL_WRITE
DESTRUCTIVE_WRITE
SECURITY_WRITE
```

### 38.2 Política

| Classe | Auto retry | Reconcile antes | Confirmação |
| --- | --- | --- | --- |
| SAFE_READ | sim | não | não |
| SAFE_IDEMPOTENT_WRITE | limitado | quando ambíguo | conforme ação |
| CONDITIONAL_WRITE | não após conflito | sim | sim |
| FINANCIAL_WRITE | não | sempre | forte |
| DESTRUCTIVE_WRITE | não | sempre | forte |
| SECURITY_WRITE | não | sempre | contextual |

### 38.3 Payload mismatch

Mesmo intent + fingerprint diferente:

```text
IDEMPOTENCY_CONFLICT
```

A interface deve pedir nova decisão, não reutilizar silenciosamente.

---

## 39. Conflitos

### 39.1 Tipos

```text
ACCOUNT_CONFLICT
ROUTE_CONFLICT
ENTITY_REVISION_CONFLICT
DRAFT_CONFLICT
INTENT_FINGERPRINT_CONFLICT
ROLE_CONFLICT
POLICY_CONFLICT
```

### 39.2 Resolução automática permitida

Somente quando:

- campos são independentes;
- merge é determinístico;
- nenhuma consequência financeira ou de segurança existe;
- política do domínio autoriza.

### 39.3 Resolução manual

Obrigatória para:

- preço;
- agenda;
- status de pedido;
- dados bancários;
- decisão de privacidade;
- conteúdo removido;
- sanção;
- denúncia;
- endereço transacional;
- mídia substituída.

---

## 40. Expiração

### 40.1 Intents

Cada intent possui `expiresAt`.

Após expiração:

- não repetir automaticamente;
- consultar status final quando possível;
- marcar `EXPIRED`;
- oferecer nova ação apenas como nova intenção.

### 40.2 Drafts

Ao expirar:

- não apagar durante edição ativa;
- avisar antes de descarte quando material;
- remover dados sensíveis conforme política;
- permitir copiar conteúdo textual seguro.

### 40.3 Receipts

Receipts críticos seguem retenção do domínio, não TTL arbitrário de UI.

---

## 41. Matriz de superfície fixa

| Superfície | Offline | Stale | Unknown | Conflict | Maintenance |
| --- | --- | --- | --- | --- | --- |
| shell | banner local | indicador | atalho para pendências | aviso de conta | banner escopado |
| Home | conteúdo cacheado | timestamp | não aplicável | filtros | catálogo |
| Pedidos | snapshot | status stale | ação pendente | revisão | read-only |
| Mensagens | histórico/draft | conversa stale | bolha pendente | edição | envio bloqueado |
| Pagamento | contexto | cobrança stale | protocolo | valor divergente | CTA bloqueado |
| Carteira | saldo com `asOf` | explícito | saque pendente | conta bancária | read-only |
| Denúncia | draft | alvo stale | envio pendente | alvo alterado | envio bloqueado |
| Formulários | autosave | base antiga | submit pendente | comparação | draft permitido |

---

## 42. Matriz de interrupção por fase

| Momento | Leitura | Mutação |
| --- | --- | --- |
| antes do request | retry seguro | pode cancelar sem outcome |
| durante envio | abort possível | estado incerto conforme transporte |
| servidor recebeu | continuar | ACKNOWLEDGED |
| servidor concluiu, resposta perdida | reconsultar | UNKNOWN_OUTCOME |
| resposta chegou, UI não commitou | aplicar se fences passam | persistir receipt |
| rota mudou | cache background | não alterar rota antiga |
| conta mudou | descartar UI | preservar no namespace original |
| reload | recarregar | retomar por intent |

---

## 43. QA adversarial

### 43.1 Rede

- offline antes de abrir rota;
- offline depois de renderizar cache;
- perda durante leitura;
- perda durante upload;
- perda após enviar mutação;
- resposta depois do timeout;
- API 500;
- API 429;
- API 503;
- DNS failure;
- captive portal;
- navegador online com API bloqueada;
- reconexão oscilante;
- latência de 10 s;
- pacote duplicado;
- resposta fora de ordem.

### 43.2 Navegação

- mudar de rota durante request;
- back durante submit;
- forward após mutação em outra aba;
- reload durante submit;
- BFCache após logout;
- deep link para intent pendente;
- abrir mesma entidade em duas abas;
- fechar aba líder de reconciliação.

### 43.3 Conta

- logout durante leitura;
- logout durante mutação;
- troca A → B durante revalidação;
- login B em outra aba;
- sessão expirada;
- papel alterado;
- conta suspensa;
- dispositivo compartilhado.

### 43.4 Drafts

- duas abas editando;
- schema atualizado;
- draft expirado;
- storage cheio;
- storage bloqueado;
- payload corrompido;
- guestSessionId alterado;
- campo sensível não persistido;
- merge de campos independentes;
- conflito material.

### 43.5 Pedidos

- aceitar duas vezes;
- aceitar e recusar simultaneamente;
- status alterado em outro dispositivo;
- conflito de revisão;
- resposta perdida;
- reload antes do receipt;
- evento realtime duplicado.

### 43.6 Mensagens

- envio offline;
- retry;
- bolha duplicada;
- upload concluído sem mensagem;
- mensagem enviada sem atualização da lista;
- conversa removida;
- block em outra aba;
- conta trocada durante envio.

### 43.7 Pagamento

- duplo clique;
- reload em processing;
- timeout após commit;
- receipt perdido;
- valor alterado;
- cobrança expirada;
- ordem concluída antes da reconciliação;
- provider indisponível;
- wallet indisponível depois do acknowledgment;
- retorno tardio.

### 43.8 Trust & Safety

- denúncia duplicada;
- report recebido sem resposta local;
- block local confirmado antes do report;
- alvo editado/deletado;
- evidência indisponível;
- reload durante envio;
- apelação em outra aba.

### 43.9 Acessibilidade

- teclado em todos os estados;
- leitor de tela durante reconciliação;
- foco após conflito;
- banner sem roubar foco;
- live region sem repetição;
- zoom 400%;
- reduced motion;
- forced colors.

---

## 44. Automação de QA

### 44.1 Unitários

- state reducers;
- fingerprint;
- idempotency reuse;
- account fence;
- route fence;
- revision fence;
- retry policy;
- lease;
- draft conflict;
- incident projection.

### 44.2 Integração

- runtime + session;
- runtime + router;
- runtime + forms;
- runtime + orders;
- runtime + messages;
- runtime + payment;
- runtime + notification center;
- runtime + trust safety.

### 44.3 Browser

Usar Playwright com:

- offline mode;
- request interception;
- delayed response;
- aborted response;
- duplicate response;
- two-page context;
- two browser contexts;
- BFCache quando suportado;
- storage mutation;
- session switch.

### 44.4 Gates

Nenhuma jornada crítica pode ser aprovada sem testes de:

```text
reload
cross-tab
account switch
timeout after send
unknown outcome
revision conflict
```

---

## 45. Handoffs

### CONT-H01 — autoridade e state model

Implementar `Doke.continuityExperience` e dimensões independentes.

### CONT-H02 — fences de conta, rota e entidade

Adicionar gerações e gates antes de todo commit visual assíncrono.

### CONT-H03 — intent envelope durável

Gerar e persistir intentId, idempotencyKey, fingerprint e receipt.

### CONT-H04 — coordenação cross-tab

Criar BroadcastChannel account-scoped com fallback seguro.

### CONT-H05 — conectividade e reconnect

Substituir decisões baseadas apenas em `navigator.onLine` por probes e snapshot.

### CONT-H06 — drafts versionados

Adicionar revisão, origem, conflito e guestSessionId.

### CONT-H07 — Pedidos e Mensagens

Implementar recovery de transições e mensagens pendentes.

### CONT-H08 — Pagamento e Carteira

Projetar `UNKNOWN_OUTCOME`, receipts e reconciliação financeira.

### CONT-H09 — Trust & Safety

Retomar reports, blocks e appeals por receipt canônico.

### CONT-H10 — incidente, manutenção e read-only

Criar envelope de disponibilidade e projeção escopada.

### CONT-H11 — reload, BFCache e cross-device

Padronizar boot, restore, purge e conflito remoto.

### CONT-H12 — telemetria e QA

Adicionar métricas privacy-safe e testes adversariais obrigatórios.

---

## 46. Ordem recomendada

```text
CONT-H01 state model
→ CONT-H02 generation fences
→ CONT-H03 durable intents
→ CONT-H04 cross-tab
→ CONT-H05 connectivity
→ CONT-H06 drafts
→ CONT-H07 orders/messages
→ CONT-H08 payment/wallet
→ CONT-H09 trust safety
→ CONT-H10 incident/read-only
→ CONT-H11 reload/BFCache/cross-device
→ CONT-H12 telemetry/QA
```

A ordem evita construir recovery de página sobre uma infraestrutura sem identidade de intenção.

---

## 47. Critérios de aceite transversais

### 47.1 Identidade

- toda mutação crítica possui intentId;
- toda repetição reutiliza a mesma idempotencyKey;
- payload divergente é rejeitado;
- receipt fica correlacionado.

### 47.2 Conta

- resposta da conta anterior nunca atualiza a atual;
- troca de conta limpa snapshots privados;
- pending intent permanece no namespace correto;
- zero frames de mistura.

### 47.3 Rota

- resposta antiga não substitui rota nova;
- foco não é movido por callback antigo;
- overlay não é fechado por operação de rota anterior.

### 47.4 Stale

- snapshot stale é rotulado;
- idade é conhecida;
- ações perigosas são bloqueadas;
- erro não vira empty.

### 47.5 Unknown outcome

- não ocorre rollback definitivo;
- CTA duplicador permanece bloqueado;
- existe reconciliação;
- existe protocolo quando disponível;
- estado termina em confirmado, rejeitado ou suporte.

### 47.6 Draft

- autosave é verificável;
- conflito não sobrescreve;
- guest possui session ID;
- campo sensível segue policy;
- reload restaura versão compatível.

### 47.7 Cross-tab

- uma intenção gera no máximo uma mutação;
- invalidação chega às abas;
- conflito é visível;
- payload privado não cruza canal.

### 47.8 Incidente

- falha escopada não bloqueia tudo;
- read-only preserva leitura;
- não existe ETA inventada;
- recuperação depende de probe.

---

## 48. Impacto futuro no site

Após implementação, a pessoa perceberá:

- menos telas voltando ao estado anterior indevidamente;
- menos duplicação de pedidos e mensagens;
- pagamento sem risco de segundo envio durante timeout;
- indicação clara de dados antigos;
- drafts recuperáveis;
- aviso quando outra aba altera o mesmo conteúdo;
- troca de conta sem vazamento visual;
- reconnect previsível;
- modo somente leitura durante incidentes;
- protocolos de ações críticas;
- continuidade após reload;
- mensagens pendentes com estado real;
- menos “Ocorreu um erro” genérico;
- recuperação orientada, não repetição cega.

---

## 49. Impacto desta entrega

Esta entrega não altera o site em runtime.

Modifica somente:

```text
docs/ux/UX-FOUNDATION-015.md
```

Não houve:

- alteração visual;
- alteração funcional;
- deploy;
- migration;
- acesso a staging;
- acesso a produção;
- ativação de retry;
- ativação de storage;
- ativação de BroadcastChannel;
- ativação de pagamento;
- merge.

---

## 50. Próximo sublote

```text
UX-FOUNDATION-016 — analytics de produto, métricas de UX, experimentação e observabilidade
```

Esse sublote deverá definir:

- taxonomia canônica de eventos de produto;
- funis;
- métricas de ativação;
- métricas de confiança;
- métricas de marketplace;
- experimentação segura;
- exposição a variantes;
- atribuição;
- qualidade de eventos;
- consentimento;
- minimização;
- métricas de acessibilidade, performance e continuity;
- dashboards operacionais;
- guardrails contra métricas manipuláveis.

O PR deve permanecer draft e não deve ser mesclado sem autorização explícita.