# UX-CORE-002 — Mutation manager, idempotência, receipts e `UNKNOWN_OUTCOME`

## Status

- Frente: `UX-IMPLEMENTATION`;
- Onda: `Wave 1 — safety kernel`;
- Sublote: `UX-CORE-002`;
- Branch: `ux/ux-core-002-mutation-manager`;
- Base empilhada: `ux/ux-core-001-state-content-registry`;
- Base head: `86fac63653f40fb94c61db743a422bc760f92a24`;
- Issue: `#42`;
- Fonte normativa: PR `#28`, PR `#40` e PR `#45`;
- Natureza: runtime local, contrato, teste e workflow read-only;
- Staging acessado: não;
- Produção acessada: não;
- Migration criada ou aplicada: não;
- Autoridade financeira elevada: não;
- Merge autorizado: não;
- Ready for review autorizado: não.

---

## 1. Objetivo

Criar uma autoridade transversal para mutações de interface capaz de distinguir:

```text
intenção criada
→ validação
→ comando em envio
→ comando aceito
→ resultado confirmado
```

De:

```text
intenção criada
→ envio
→ resposta perdida
→ resultado desconhecido
→ reconciliação
→ resultado confirmado ou rejeitado
```

O objetivo central é impedir que:

- duplo clique produza comandos duplicados;
- retry crie uma nova intenção sem necessidade;
- a mesma chave de idempotência aceite payload diferente;
- timeout seja tratado como rejeição confirmada;
- rollback seja executado quando o servidor pode ter confirmado a operação;
- sucesso visual apareça antes de receipt;
- payload sensível seja incluído em receipts ou eventos;
- cada página invente sua própria máquina de estados de mutação.

---

## 2. Causa raiz

O runtime compartilhado anterior oferecia:

```text
Doke.experience.optimistic.mutate()
```

Esse helper possuía três propriedades positivas:

- single-flight por chave em memória;
- aplicação otimista;
- rollback em falha.

Mas apresentava limites incompatíveis com jornadas críticas:

1. qualquer Promise resolvida virava `success`;
2. qualquer Promise rejeitada executava rollback;
3. timeout e resposta perdida não possuíam `UNKNOWN_OUTCOME`;
4. não existia `intentId`;
5. não existia chave de idempotência explícita;
6. não existia fingerprint do payload;
7. não existia receipt;
8. não existia reconciliação;
9. a conclusão apagava a operação do mapa de memória;
10. o helper não distinguia `accepted` de `confirmed`;
11. a rejeição não distinguia validação, conflito, cancelamento e ambiguidade;
12. o estado visual era atualizado diretamente pelo runtime legado.

O helper antigo permanece temporariamente para consumidores legados.

Regra desta entrega:

```text
integrações novas
→ Doke.formMutationManager

Doke.experience.optimistic.mutate
→ legado congelado
→ nenhuma nova adoção
→ migração futura controlada
```

Não foi feita uma substituição global para evitar regressões em pedidos, mensagens, pagamentos, carteira, KYC e Trust & Safety.

---

## 3. Autoridade criada

```text
Doke.formMutationManager
```

Arquivo:

```text
assets/js/core/mutation-manager.js
```

Versão:

```text
20260804-ux-core-002-v1
```

A API é congelada com `Object.freeze`.

### 3.1 API pública

```text
version
states
terminalStates
transitions
createIntent(options)
execute(options)
reconcile(intentId, reconciler, options)
get(intentId)
getReceipt(intentId)
isInFlight(dedupeKey)
fingerprint(payload)
stableSerialize(payload)
```

### 3.2 Estados

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

Separações obrigatórias:

```text
ACCEPTED ≠ CONFIRMED
REJECTED ≠ UNKNOWN_OUTCOME
CONFLICT ≠ REJECTED genérico
CANCELLED ≠ falha de servidor
retry ≠ nova intenção
receipt ≠ payload
```

---

## 4. Mutation intent

Cada execução cria ou recebe um intent com:

```text
intentId
idempotencyKey
dedupeKey
domain
action
accountId
entityType
entityId
payloadFingerprint
createdAt
```

### 4.1 `intentId`

Identifica a intenção lógica.

Ele deve permanecer estável durante:

- resposta perdida;
- reconciliação;
- repetição da mesma operação;
- recuperação futura por journal.

### 4.2 `idempotencyKey`

Identifica o comando perante uma autoridade que suporte idempotência.

Nesta entrega:

- a chave é preservada no intent;
- a reutilização com payload diferente é rejeitada;
- uma operação já confirmada pode repetir o receipt em memória;
- operações futuras poderão persistir a chave no operation journal do UX-CONT.

### 4.3 `dedupeKey`

Controla single-flight no contexto atual.

A chave padrão inclui:

```text
accountId
+ domain
+ action
+ entityType
+ entityId
+ payloadFingerprint
```

`dedupeKey` e `idempotencyKey` não são equivalentes.

```text
dedupeKey
→ impede concorrência local simultânea

idempotencyKey
→ preserva identidade do comando
```

### 4.4 Payload fingerprint

O manager:

- canonicaliza objetos por ordenação de chaves;
- ignora funções, símbolos e `undefined` em objetos;
- rejeita referências circulares;
- produz fingerprint determinístico;
- não armazena o payload bruto no receipt.

O hash atual serve para integridade e identidade local.

Ele não é um hash criptográfico para assinatura ou segurança.

---

## 5. Single-flight

Quando duas execuções possuem o mesmo `dedupeKey` enquanto a primeira está ativa:

```text
primeira execução
→ cria Promise

segunda execução
→ recebe a mesma Promise
→ não chama request novamente
```

O manager emite:

```text
doke:mutation-deduped
```

O contador de deduplicação aparece no snapshot público sem expor payload.

---

## 6. Idempotência em memória

O manager associa:

```text
idempotencyKey
→ payloadFingerprint
→ intentId
```

Regras:

### Mesmo key, mesmo payload, já confirmado

```text
→ repetir receipt
→ request não é chamado novamente
```

### Mesmo key, operação `ACCEPTED`, `UNKNOWN_OUTCOME` ou `RECONCILING`

```text
→ devolver estado atual
→ impedir reenvio cego
```

### Mesmo key, payload diferente

```text
→ CONFLICT
→ código DOKE_MUTATION_PAYLOAD_CONFLICT
→ request não é chamado
```

Persistência entre reloads ficará para:

```text
UX-CONT-001
→ operation journal e generation fences
```

Esta entrega não escreve intents no `localStorage`.

---

## 7. Receipt

Somente uma operação confirmada produz receipt.

Shape:

```text
receiptId
intentId
idempotencyKey
domain
action
entityType
entityId
payloadFingerprint
status
authority
authorityReference
confirmedAt
resultFingerprint
```

O receipt não contém:

- payload bruto;
- accountId;
- e-mail;
- telefone;
- endereço;
- conteúdo livre;
- tokens;
- documentos;
- dados financeiros.

Evento:

```text
doke:mutation-receipt
```

### Autoridade

O caller deve declarar a autoridade real.

Exemplos futuros:

```text
orders-rpc
message-command-authority
profile-setup-rpc
server-reconciliation
```

Nesta integração piloto:

```text
client-local-preference
```

Essa autoridade confirma somente uma preferência local.

Ela não representa confirmação server-side.

---

## 8. Tratamento de erro

### 8.1 Rejeição confirmada

Exemplos:

- validação inválida;
- permissão negada;
- conflito confirmado;
- storage local rejeitado;
- regra de negócio rejeitada.

Comportamento:

```text
REJECTED ou CONFLICT
→ rollback permitido
```

### 8.2 Resultado desconhecido

Exemplos:

- timeout após envio;
- resposta perdida;
- conexão interrompida depois do request;
- provider aceitou, mas resposta não chegou.

Comportamento:

```text
UNKNOWN_OUTCOME
→ não executar rollback automático
→ não reenviar automaticamente
→ exigir reconcile()
```

Erros reconhecidos inicialmente:

```text
unknownOutcome = true
code = TIMEOUT
code = NETWORK_RESPONSE_LOST
code = UNKNOWN_OUTCOME
```

### 8.3 Cancelamento

```text
AbortError
ou
DOKE_MUTATION_CANCELLED
→ CANCELLED
→ rollback permitido quando definido
```

### 8.4 Classificador por domínio

O caller pode fornecer:

```text
classifyError(error, mutation)
```

O resultado precisa ser um estado conhecido do manager.

---

## 9. Reconciliação

A API:

```text
reconcile(intentId, reconciler, options)
```

Só pode iniciar a partir de:

```text
ACCEPTED
UNKNOWN_OUTCOME
```

Fluxo:

```text
UNKNOWN_OUTCOME
→ RECONCILING
→ CONFIRMED | REJECTED | CONFLICT | UNKNOWN_OUTCOME
```

Regras:

- confirmação gera receipt;
- rejeição confirmada pode executar rollback;
- novo resultado desconhecido mantém o intent aberto;
- segunda reconciliação após terminal state é rejeitada;
- reconciler recebe a mesma idempotency key e fingerprint.

---

## 10. Integração com UX-CORE-001

Quando uma boundary é fornecida, o manager projeta:

| Mutation state | View state |
|---|---|
| VALIDATING | submitting |
| SUBMITTING | submitting |
| ACCEPTED | submitting |
| CONFIRMED | success |
| REJECTED | error |
| UNKNOWN_OUTCOME | unknown_outcome |
| RECONCILING | reconciling |
| CONFLICT | conflict |

A integração utiliza:

```text
Doke.stateContracts.setBoundaryState()
```

Se a autoridade ainda não estiver carregada, existe fallback mínimo para:

- `data-view-state`;
- `aria-busy`.

Nenhuma live region nova é criada pelo mutation manager.

---

## 11. Eventos

```text
doke:mutation-state-changed
doke:mutation-transition-rejected
doke:mutation-deduped
doke:mutation-receipt
```

O snapshot público inclui:

- IDs técnicos;
- domínio;
- ação;
- entidade;
- fingerprint;
- estado;
- timestamps;
- contador de tentativas;
- receipt sanitizado.

O snapshot público não inclui `accountId` nem payload.

---

## 12. Piloto — preferência de Novidades

Arquivo:

```text
assets/js/pages/news-experience.js
```

Mutação:

```text
news.save_preference
```

Entidade:

```text
preference / news-view
```

Autoridade:

```text
client-local-preference
```

A preferência contém somente:

```text
filter
expanded
```

### 12.1 Carregamento limitado

O manager é carregado sob demanda somente pela experiência de Novidades:

```text
assets/js/core/mutation-manager.js
```

Isso evita alterar o boot global antes de validação.

### 12.2 Comportamento

```text
usuário muda filtro
→ preferência normalizada
→ manager cria intent
→ single-flight
→ localStorage escreve e relê
→ confirmação local
→ receipt
→ evento doke:news-preference-saved
```

### 12.3 Falha de carregamento do manager

A experiência mantém fallback local compatível.

Esse fallback:

- não eleva autoridade;
- não produz receipt;
- não é usado por novas jornadas críticas;
- existe somente para impedir regressão da página piloto.

### 12.4 Falha de storage

A página:

- mantém a preferência na sessão visual;
- publica o estado de erro existente;
- não declara persistência confirmada;
- não cria receipt.

### 12.5 Sem alteração visual

Não foram alterados:

- HTML;
- CSS;
- cards;
- filtros visuais;
- modal;
- layout;
- Home.

---

## 13. Limites deliberados

Esta entrega não implementa:

- operation journal persistente;
- cross-tab locks;
- account generation;
- route generation;
- entity revision;
- idempotência server-side nova;
- retry automático;
- backoff;
- fila offline;
- Service Worker sync;
- reconciliação real de domínio crítico;
- migração global do helper legado.

Esses itens pertencem a:

```text
UX-CONT-001
UX-PRIV-001
migrações futuras por domínio
```

---

## 14. Domínios proibidos neste piloto

Não foram integrados:

- pagamentos;
- cartão;
- saque;
- payout;
- escrow;
- refund;
- chargeback;
- conclusão de pedido;
- KYC;
- denúncia;
- block;
- ban;
- sanction;
- appeal;
- mensagens;
- anexos.

O manager não concede autoridade a esses domínios apenas por existir.

---

## 15. Testes

Arquivo:

```text
scripts/test-ux-core-002-mutation-manager.js
```

Cobertura:

1. API publicada e congelada;
2. enum congelado;
3. fingerprint estável com ordem diferente de chaves;
4. fingerprints diferentes para payloads diferentes;
5. single-flight retorna a mesma Promise;
6. request executa uma vez;
7. confirmação produz receipt;
8. receipt não contém payload;
9. replay de idempotency key confirmada não reenvia;
10. payload drift é rejeitado;
11. rejeição confirmada executa rollback;
12. `UNKNOWN_OUTCOME` não executa rollback;
13. repetição de intent desconhecido não reenvia;
14. reconciliação confirma com receipt;
15. reconciliação após terminal state é rejeitada;
16. eventos de state, dedupe e receipt são emitidos;
17. piloto usa o manager canônico;
18. piloto declara ação e autoridade;
19. piloto não adota o helper otimista legado.

O workflow também reexecuta:

```text
UX-CORE-001 state/content registry tests
```

---

## 16. Workflow

Arquivo:

```text
.github/workflows/ux-core-002-mutation-manager.yml
```

Permissões:

```yaml
permissions:
  contents: read
```

Etapas:

- checkout;
- Node.js 20;
- syntax check;
- testes UX-CORE-002;
- regressão UX-CORE-001;
- `git diff --check`.

O workflow não:

- acessa secrets;
- acessa Supabase;
- acessa staging;
- acessa produção;
- executa migration;
- executa deploy;
- altera dados.

---

## 17. Rollback

Rollback é exclusivamente de código:

1. remover `mutation-manager.js`;
2. restaurar `news-experience.js` ao save síncrono anterior;
3. remover teste, documento e workflow.

Não existe:

- schema novo;
- dado remoto;
- tabela;
- migration;
- credencial;
- estado persistente novo além da preferência local já existente.

---

## 18. Definition of Done

- `Doke.formMutationManager` existe;
- API e enums estão congelados;
- intent possui identidade explícita;
- single-flight impede request duplicado;
- idempotency key não aceita payload drift;
- confirmação produz receipt;
- receipt não contém payload ou accountId;
- rejeição confirmada permite rollback;
- unknown outcome não executa rollback;
- unknown outcome pode reconciliar;
- intent desconhecido não é reenviado cegamente;
- piloto não financeiro está integrado;
- helper legado não recebeu nova adoção;
- testes UX-CORE-001 continuam passando;
- workflow é read-only;
- staging e produção permanecem intocados;
- PR permanece draft e não mesclado.

---

## 19. Impacto no site

Na branch técnica, alterar rapidamente o filtro ou o estado “Carregar mais” em Novidades passa a compartilhar uma única operação em voo para o mesmo payload.

A preferência somente recebe receipt depois que:

```text
localStorage.setItem
→ leitura de confirmação
→ valor idêntico
```

Não existe mudança visual.

Em produção, nada muda enquanto o PR não for autorizado, mesclado e implantado.

---

## 20. Próximo sublote

```text
UX-CONT-001
— account, route, request e revision generation fences
```

O próximo sublote deverá impedir que:

- resposta da conta A atualize a conta B;
- rota desmontada receba commit;
- request antigo vença request novo;
- revision antiga sobrescreva revision recente;
- BFCache restaure callbacks obsoletos.

A persistência de intents e receipts entre reloads continuará separada e fail-closed.
