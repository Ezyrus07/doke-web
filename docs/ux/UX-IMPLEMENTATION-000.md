# UX-IMPLEMENTATION-000 — Normalização da base e backlog executável do safety kernel

## Status

- Frente: `UX-IMPLEMENTATION`;
- Sublote: `000`;
- Natureza: normalização, planejamento executável, ownership e gates de entrada;
- Repositório: `Ezyrus07/doke-web`;
- Branch: `ux/ux-implementation-000`;
- Base: `pay/pay-001-baseline-audit`;
- Head PAY usado na criação: `5a893bc80040db45390213e39cab24f1f62b928c`;
- Fonte documental: PR `#28`, head `6e21c99a2cd7b1f5914af1c48537edf150d51cf2`;
- Fundação coberta: `UX-FOUNDATION-001` até `UX-FOUNDATION-018`;
- Runtime alterado nesta entrega: não;
- HTML alterado nesta entrega: não;
- CSS alterado nesta entrega: não;
- JavaScript alterado nesta entrega: não;
- Migrations alteradas nesta entrega: não;
- Workflows alterados nesta entrega: não;
- Staging acessado: não;
- Produção acessada: não;
- Merge autorizado: não;
- Ready for review autorizado: não.

---

## 1. Objetivo

Abrir a fase de implementação sobre uma base lógica atual e limpa, sem reescrever o histórico do PR documental, e converter a fundação UX em uma sequência de mudanças pequenas, revisáveis, testáveis e reversíveis.

Esta entrega executa a Wave 0:

```text
base PAY atual
→ branch de implementação limpa
→ backlog priorizado
→ ownership de arquivos
→ fronteiras de PR
→ critérios de entrada
→ critérios de saída
→ testes mínimos
→ rollback definido
→ primeira tarefa de runtime pronta
```

O documento não implementa o safety kernel.

Ele torna o primeiro PR de runtime seguro para começar.

---

## 2. Decisão de normalização

A branch documental `ux/ux-foundation-001` acumulou 18 commits sobre o merge-base histórico enquanto PAY avançou 112 commits.

Reescrever essa branch criaria riscos desnecessários:

- perda de rastreabilidade;
- force-push;
- dificuldade de revisar a fundação;
- mistura entre documentação e runtime;
- conflito com o PR #28;
- dependência de um rebase grande antes do primeiro código.

A estratégia escolhida é:

```text
PR #28
→ permanece como registro documental independente

ux/ux-implementation-000
→ nasce diretamente do head PAY atual
→ contém somente preparação da implementação
→ receberá mudanças de runtime em sublotes separados
```

### 2.1 Invariantes

1. não reescrever a branch `ux/ux-foundation-001`;
2. não fechar ou mesclar o PR #28 sem autorização;
3. não copiar automaticamente 40 mil linhas documentais para cada branch de código;
4. citar o contrato de origem em cada PR de runtime;
5. manter a branch de implementação baseada no head PAY confirmado;
6. não incorporar mudanças financeiras bloqueadas como autoridade UX;
7. não iniciar staging ou produção nesta fase;
8. não criar mega-PR.

---

## 3. Estado da base

### 3.1 PAY

Head usado:

```text
5a893bc80040db45390213e39cab24f1f62b928c
```

Esse head contém PAY-B03B repository-only.

Permanecem bloqueados:

```text
PAY-B01
PAY-B03
PAY-B04
```

Consequência para UX:

- não declarar pagamento real;
- não declarar escrow real;
- não declarar payout real;
- não declarar refund real;
- não declarar chargeback real;
- não criar KPI financeiro definitivo;
- não alterar carteira para sugerir autoridade inexistente.

### 3.2 Fundação UX

Fonte:

```text
PR #28
head: 6e21c99a2cd7b1f5914af1c48537edf150d51cf2
```

Os contratos permanecem normativos para a implementação.

Cada PR deve citar:

- documento de origem;
- seção aplicável;
- P0 resolvido;
- autoridades envolvidas;
- testes associados;
- rollback.

---

## 4. Primeira onda material

A primeira onda é o safety kernel.

```text
UX-CORE-001
→ state/content registry

UX-CORE-002
→ mutation manager, idempotency e receipts

UX-CONT-001
→ generation fences e recovery

UX-PRIV-001
→ account-scoped storage e logout cleanup
```

Esses sublotes precedem:

- redesign;
- busca visual;
- cards;
- Home;
- onboarding;
- notificações;
- analytics;
- experimentos.

---

## 5. Princípios de implementação

### 5.1 Um PR, uma autoridade principal

Cada PR deve possuir uma autoridade dominante.

Exemplo:

```text
UX-CORE-001
→ Doke.contentCatalog
→ Doke.viewState
```

Não incluir no mesmo PR:

- novo overlay manager;
- refatoração completa da Home;
- analytics;
- KYC;
- notificações.

### 5.2 Compatibilidade progressiva

O código novo deve poder coexistir temporariamente com o legado.

```text
novo registry disponível
→ adaptador de compatibilidade
→ primeira rota migrada
→ expansão progressiva
→ remoção do legado somente após cobertura
```

### 5.3 Fail-closed

Quando a autoridade não puder confirmar:

```text
não declarar sucesso
não fabricar valor
não assumir vazio
não liberar retry perigoso
não cruzar contas
```

### 5.4 Sem mutação global acidental

Proibido:

- monkeypatch de `addEventListener`;
- CSS global com `!important` para esconder regressão;
- sobrescrever APIs nativas;
- instalar listener permanente sem cleanup;
- escrever em todas as páginas por busca ampla sem inventário.

### 5.5 Feature flags

O safety kernel não será um experimento.

Flags, quando necessárias, serão operacionais:

```text
DISABLED
INTERNAL
PILOT
ENABLED
```

Sem randomização, exposure logging ou query-string como autoridade de produção.

---

## 6. Ownership

### 6.1 Owners por função

| Função | Responsabilidade |
|---|---|
| Technical owner | desenho, implementação e integração |
| Product owner | prioridade, comportamento e aceite |
| UX reviewer | estados, conteúdo, interação e consistência |
| Accessibility reviewer | teclado, foco, semântica e live regions |
| Privacy reviewer | storage, PII, logout e telemetry |
| Security reviewer | trust boundary, abuso e fail-closed |
| Domain reviewer | autoridade de pedidos, mensagens ou pagamentos |

Nesta fase, owners são papéis, não nomes inventados.

### 6.2 Arquivos de alto conflito

Arquivos que exigem coordenação explícita:

```text
assets/js/core/app-state.js
assets/js/core/session.js
assets/js/core/navigation-registry.js
assets/js/core/stable-shell-router.js
assets/js/core/page-hydration.js
assets/js/pages/home.js
assets/js/pages/search-results.js
assets/js/pages/pedidos.js
assets/js/pages/mensagens.js
assets/js/pages/carteira.js
assets/js/components/notifications/*
assets/js/services/*
index.html
```

Regra:

```text
um arquivo de alto conflito
→ um PR owner por vez
```

### 6.3 Arquivos novos preferidos

Quando apropriado, criar módulos isolados antes de modificar monólitos:

```text
assets/js/core/view-state-registry.js
assets/js/core/content-catalog.js
assets/js/core/mutation-manager.js
assets/js/core/continuity-experience.js
assets/js/core/account-storage.js
```

Os nomes finais dependem do inventário do sublote.

Não criar arquivos duplicados se autoridade equivalente já existir.

---

## 7. UX-CORE-001 — State e Content Registry

### 7.1 Objetivo

Criar a primeira autoridade transversal para estados de interface e conteúdo operacional.

### 7.2 Autoridades

```text
Doke.viewState
Doke.contentCatalog
```

### 7.3 Estados mínimos

```text
IDLE
LOADING
REFRESHING
READY
EMPTY
ERROR
OFFLINE
STALE
DEGRADED
SUBMITTING
SUCCESS
UNKNOWN_OUTCOME
RECONCILING
CONFLICT
READ_ONLY
MAINTENANCE
```

### 7.4 Separações obrigatórias

```text
EMPTY ≠ ERROR
ERROR ≠ OFFLINE
OFFLINE ≠ DEGRADED
STALE ≠ READY
TIMEOUT ≠ REJECTED
SUCCESS ≠ ACCEPTED
UNKNOWN_OUTCOME ≠ FAILURE
```

### 7.5 Scope inicial

O primeiro PR não migrará todas as páginas.

Escopo recomendado:

1. criar registry e API;
2. criar validação de estados;
3. criar catálogo mínimo de mensagens;
4. fornecer adaptador para `data-view-state`;
5. migrar uma rota de baixo risco ou fixture de teste;
6. adicionar testes de contrato;
7. não alterar visual da Home.

### 7.6 API candidata

```text
Doke.viewState.createBoundary(options)
Doke.viewState.transition(boundary, state, detail)
Doke.viewState.get(boundary)
Doke.viewState.subscribe(boundary, listener)
Doke.viewState.isTerminal(state)
Doke.viewState.isInteractive(state)
Doke.viewState.assertTransition(from, to)

Doke.contentCatalog.get(key, variables)
Doke.contentCatalog.getStateMessage(domain, state, context)
Doke.contentCatalog.getErrorPresentation(error, context)
Doke.contentCatalog.getActionLabel(action, context)
```

A API final será definida após inventário do runtime atual.

### 7.7 Transições

Exemplo:

```text
IDLE
→ LOADING
→ READY | EMPTY | ERROR | OFFLINE | DEGRADED

READY
→ REFRESHING
→ READY | STALE | DEGRADED | ERROR

SUBMITTING
→ SUCCESS | ERROR | UNKNOWN_OUTCOME

UNKNOWN_OUTCOME
→ RECONCILING
→ SUCCESS | ERROR | CONFLICT
```

### 7.8 Restrições

- uma boundary não controla outra sem vínculo explícito;
- um erro técnico não deve ser mostrado cru;
- conteúdo financeiro permanece fail-closed;
- mensagens devem ser pt-BR;
- nenhum estado deve depender somente de classe CSS;
- estado deve ser legível programaticamente;
- live region deve ser coordenada, não criada a cada render.

### 7.9 Testes mínimos

```text
state enum completo
transições válidas
transições inválidas rejeitadas
empty não substitui error
stale preserva conteúdo
unknown outcome bloqueia retry imediato
content key inexistente possui fallback seguro
variáveis escapadas
nenhuma PII no fallback
DOM adapter atualiza aria-busy
DOM adapter não duplica live region
```

### 7.10 Definition of Done

- módulo carregável sem dependência circular;
- API congelada ou protegida contra mutação externa;
- enum único;
- catálogo mínimo versionado;
- testes positivos e negativos;
- uma integração controlada;
- rollback por remoção do carregamento/adaptador;
- nenhuma regressão visual global;
- documentação do PR atualizada.

---

## 8. UX-CORE-002 — Mutation Manager

### 8.1 Dependência

```text
UX-CORE-001 concluído
```

### 8.2 Objetivo

Criar autoridade única para:

- single-flight;
- idempotency key;
- intent fingerprint;
- estados de operação;
- receipt;
- unknown outcome;
- reconciliação;
- retry seguro.

### 8.3 Autoridade

```text
Doke.formMutationManager
```

ou nome final equivalente após inventário.

### 8.4 Envelope mínimo

```text
MutationIntent
├── intentId
├── idempotencyKey
├── domain
├── action
├── accountId
├── entityType
├── entityId
├── payloadFingerprint
├── baseRevision
├── createdAt
├── state
├── receipt
└── reconciliation
```

### 8.5 Estados

```text
IDLE
VALIDATING
SUBMITTING
ACCEPTED
CONFIRMED
REJECTED
UNKNOWN_OUTCOME
RECONCILING
CONFLICT
CANCELLED
```

### 8.6 Primeira integração

Escolher uma mutação não financeira e reversível.

Candidatas:

- favorito;
- atualização simples de preferência;
- save de draft não sensível.

Não começar por:

- pagamento;
- saque;
- conclusão de pedido;
- verificação profissional;
- denúncia;
- ban.

### 8.7 Testes mínimos

- duplo clique gera um comando;
- payload igual reutiliza intent;
- payload diferente cria conflito ou nova intent;
- timeout vira unknown outcome;
- rejeição confirmada permite rollback;
- sucesso tardio reconcilia;
- conta mudou bloqueia commit visual;
- receipt pertence à entidade correta.

---

## 9. UX-CONT-001 — Generation Fences

### 9.1 Dependências

```text
UX-CORE-001
UX-CORE-002
```

### 9.2 Objetivo

Impedir que respostas antigas ou de outra conta atualizem a interface atual.

### 9.3 Autoridade

```text
Doke.continuityExperience
```

### 9.4 Fences

```text
accountGeneration
routeGeneration
entityRevision
requestGeneration
originTabId
```

### 9.5 Regras

Antes do commit visual:

```text
account generation ainda válida?
route generation ainda válida?
entity revision compatível?
request ainda é latest?
component ainda montado?
```

Se não:

```text
descartar resultado
não emitir erro ao usuário
registrar diagnóstico privacy-safe
```

### 9.6 Primeira integração

- read request com latest-wins;
- preferencialmente busca ou carregamento de rota isolada;
- sem modificar pedidos financeiros.

### 9.7 Testes mínimos

- query antiga não vence query nova;
- rota anterior não renderiza após navegação;
- conta A não renderiza na conta B;
- componente desmontado não recebe commit;
- abort e descarte são idempotentes;
- BFCache cria geração válida.

---

## 10. UX-PRIV-001 — Account-scoped Storage

### 10.1 Dependências

```text
UX-CORE-001
UX-CONT-001
```

Pode avançar parcialmente em paralelo ao Mutation Manager, desde que ownership de `session.js` seja exclusivo.

### 10.2 Objetivo

Criar autoridade para storage local por conta e limpeza coordenada no logout.

### 10.3 Autoridade

```text
Doke.accountStorage
```

coordenada por:

```text
Doke.privacyExperience
```

### 10.4 Namespace

```text
doke:<accountId>:<domain>:<key>:v<version>
```

Guest:

```text
doke:guest:<guestSessionId>:<domain>:<key>:v<version>
```

Nunca usar:

- e-mail no nome da chave;
- telefone;
- CPF;
- username público;
- valor fixo `guest` compartilhado.

### 10.5 Métodos candidatos

```text
getAccountId()
getGuestSessionId()
makeKey(domain, key, version)
read(domain, key)
write(domain, key, value, policy)
remove(domain, key)
clearAccount(accountId)
clearSensitive()
registerDomainPolicy()
listAccountKeys()
```

### 10.6 Política de dados

Cada domínio declara:

```text
privacyClass
persistence
retention
logoutBehavior
crossTab
migration
```

### 10.7 Primeira migração

Começar por dados não críticos e identificáveis:

- histórico de busca;
- preferências de notificação;
- localização salva.

Não migrar tudo em um único PR.

### 10.8 Logout

Sequência:

```text
bloquear novas operações
→ abortar requests
→ desconectar realtime
→ limpar caches em memória
→ limpar storage privado da conta
→ limpar sessão provider
→ publicar account generation change
→ renderizar estado anônimo
```

A ordem final será validada contra o auth provider.

### 10.9 Testes mínimos

- conta A e B não compartilham dados;
- guest sessions diferentes não compartilham drafts;
- logout limpa dados privados;
- preferência device-level permitida permanece;
- migration legado é idempotente;
- chave malformada é rejeitada;
- PII não aparece no key name;
- evento cross-tab não carrega payload privado.

---

## 11. Fronteiras de PR

### PR 1 — UX-CORE-001

Permitido:

- módulos de state/content;
- testes de contrato;
- adaptador mínimo;
- uma integração controlada;
- documentação correspondente.

Proibido:

- refatorar Home inteira;
- alterar flows financeiros;
- criar analytics provider;
- migrar todos os errors;
- substituir notificações.

### PR 2 — UX-CORE-002

Permitido:

- mutation manager;
- intent envelope;
- receipt model;
- primeira mutação não crítica;
- testes concorrentes.

Proibido:

- pagamento;
- payout;
- KYC;
- reports;
- ban.

### PR 3 — UX-CONT-001

Permitido:

- generations;
- latest-wins;
- route/account fences;
- abort lifecycle;
- uma integração read-only.

### PR 4 — UX-PRIV-001

Permitido:

- account storage;
- domain policy;
- logout cleanup;
- migração limitada de chaves;
- testes de isolamento.

---

## 12. Branching

### 12.1 Branch atual

```text
ux/ux-implementation-000
```

Serve para:

- plano executável;
- inventário inicial;
- coordenação da Wave 0.

### 12.2 Branches futuras

Preferência:

```text
ux/ux-core-001-state-content-registry
ux/ux-core-002-mutation-manager
ux/ux-cont-001-generation-fences
ux/ux-priv-001-account-storage
```

Cada uma nasce do head lógico aplicável, não de uma cadeia longa de branches abandonadas.

Quando existir dependência direta, basear temporariamente no PR anterior e retarget após merge autorizado.

### 12.3 Merge

Nenhum merge será feito sem autorização explícita.

Nenhum PR será marcado ready sem autorização explícita.

Auto-merge permanece proibido.

---

## 13. Critérios de entrada para UX-CORE-001

### ENTRY-CORE-001-01 — inventário

Localizar:

- enums atuais;
- `data-view-state`;
- state boundaries;
- state regions;
- loading/error/empty helpers;
- `DokePageHydration`;
- toasts;
- live regions;
- content strings duplicadas.

### ENTRY-CORE-001-02 — escolha de integração

Selecionar uma superfície que:

- não seja financeira;
- possua estados observáveis;
- tenha teste existente;
- permita rollback simples;
- não force redesign.

### ENTRY-CORE-001-03 — baseline

Registrar:

- DOM atual;
- estado inicial;
- erro;
- empty;
- loading;
- stale, se existir;
- teclado;
- aria-live;
- scripts carregados.

### ENTRY-CORE-001-04 — conflitos

Revalidar head PAY e PRs paralelos antes do primeiro commit de runtime.

Se os arquivos escolhidos mudaram na base:

- comparar;
- adaptar;
- não sobrescrever.

---

## 14. Test strategy

### 14.1 Unit

- state transitions;
- content lookup;
- key generation;
- fingerprints;
- privacy policy.

### 14.2 Contract

- APIs públicas;
- enums;
- receipts;
- error mapping;
- storage namespace;
- cleanup hooks.

### 14.3 Integration

- DOM boundary;
- form action;
- auth change;
- route change;
- storage migration.

### 14.4 E2E

- happy path;
- timeout;
- retry;
- reload;
- account switch;
- cross-tab;
- offline/reconnect;
- keyboard.

### 14.5 Static gates

- `git diff --check`;
- nenhum novo `!important`;
- nenhum inline style novo;
- nenhum `@latest` novo;
- nenhuma chave global privada nova;
- nenhuma PII em telemetry;
- nenhum claim financeiro novo.

---

## 15. Rollback

Cada PR deve documentar:

```text
flag ou loader entry
módulo anterior
migração reversível
tratamento de dados escritos
invalidação de cache
rollback de DOM
rollback de eventos
```

### 15.1 UX-CORE-001

Rollback:

- remover loader do registry;
- manter adapters legados;
- preservar data attributes atuais.

### 15.2 UX-CORE-002

Rollback:

- desabilitar integration flag;
- continuar usando serviço legado;
- preservar intents sem reexecutar.

### 15.3 UX-CONT-001

Rollback:

- desligar fences por integração;
- manter abort controller existente;
- não remover guards legados no mesmo PR inicial.

### 15.4 UX-PRIV-001

Rollback:

- leitura compatível de chave antiga;
- escrita somente no namespace novo;
- migration marker versionado;
- nunca restaurar PII apagada.

---

## 16. Gates

### GATE-00 — escopo

- um epic principal;
- diff compreensível;
- sem unrelated cleanup.

### GATE-01 — autoridade

- owner da decisão definido;
- browser não confirma autoridade remota.

### GATE-02 — concorrência

- single-flight;
- latest-wins;
- generation fences proporcionais.

### GATE-03 — privacidade

- sem PII nova;
- storage account-scoped;
- logout policy.

### GATE-04 — segurança

- fail-closed;
- sem elevação de papel;
- sem claim financeiro.

### GATE-05 — acessibilidade

- teclado;
- foco;
- semântica;
- live region deduplicada.

### GATE-06 — performance

- sem custo global desnecessário;
- módulo carregado apenas onde necessário ou com custo medido.

### GATE-07 — testes

- positivos;
- negativos;
- race;
- recovery.

### GATE-08 — rollback

- reversão documentada;
- dados preservados.

---

## 17. Blockers conhecidos

### BLOCK-01 — specs ainda em PR separado

O código deve citar o PR #28 até que exista decisão de merge documental.

Isso não impede implementação.

### BLOCK-02 — PAY ainda possui autoridade bloqueada

Não integrar fluxos financeiros como primeiro consumidor.

### BLOCK-03 — arquivos monolíticos

`home.js`, `pedidos.js`, `mensagens.js` e `carteira.js` têm alto custo de conflito.

Criar abstrações isoladas antes de mudanças amplas.

### BLOCK-04 — testes atuais heterogêneos

O primeiro sublote deve inventariar o harness existente antes de criar outro padrão.

### BLOCK-05 — ausência de owners nomeados

O repositório ainda não fornece pessoas para cada função.

Usar role ownership e registrar reviewers reais antes de ready-for-review.

---

## 18. Não objetivos da Wave 0

- alterar UI;
- corrigir todos os P0;
- consolidar todos os cards;
- reescrever a Home;
- migrar todas as páginas;
- instalar analytics;
- criar experimentos;
- ativar notificações browser;
- alterar pagamentos;
- aplicar migrations;
- acessar staging;
- acessar produção.

---

## 19. Definition of Done do UX-IMPLEMENTATION-000

- branch criada diretamente do head PAY atual;
- nenhuma reescrita do PR #28;
- backlog inicial documentado;
- quatro primeiros sublotes definidos;
- dependências explícitas;
- ownership por função;
- arquivos de alto conflito identificados;
- fronteiras de PR definidas;
- critérios de entrada definidos;
- testes mínimos definidos;
- rollback definido;
- blockers registrados;
- nenhuma mudança de runtime;
- draft PR aberto;
- merge e ready-for-review não executados.

---

## 20. Próximo sublote

```text
UX-CORE-001
— state/content registry e separação canônica entre estados
```

Primeiras ações:

1. revalidar head PAY;
2. inventariar state helpers atuais;
3. selecionar integração piloto;
4. criar API mínima;
5. criar contract tests;
6. integrar sem redesign;
7. validar loading, empty, error, stale, degraded e unknown outcome;
8. manter PR draft.

---

## 21. Impacto no site

Nesta entrega:

- nenhuma tela mudou;
- nenhum estado visual mudou;
- nenhum request mudou;
- nenhum storage mudou;
- nenhum fluxo mudou;
- nenhum ambiente remoto foi acessado.

O ganho é estrutural:

```text
fundação documental
→ branch normalizada
→ backlog executável
→ primeiro safety-kernel PR pronto para começar
```
