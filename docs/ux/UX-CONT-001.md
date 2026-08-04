# UX-CONT-001 — Account, route, request e revision generation fences

## Status

- Frente: `UX-CONT`;
- Sublote: `001`;
- Branch: `ux/ux-cont-001-generation-fences`;
- Base empilhada: `ux/ux-core-002-mutation-manager`;
- Base head: `6064a33d241e92537630510d8c3be2d4f0764ff3`;
- Runtime alterado: sim, isolado e reversível;
- HTML e CSS alterados: não;
- Migrations: não;
- Staging e produção: não acessados;
- Merge e ready-for-review: não autorizados.

---

## 1. Objetivo

Criar uma autoridade transversal capaz de responder, antes de qualquer commit assíncrono:

```text
esta resposta ainda pertence
à conta
à rota
à request mais recente
e à revisão atual?
```

Se a resposta for não, o resultado não pode:

- escrever storage;
- atualizar DOM;
- produzir receipt;
- declarar sucesso;
- substituir revisão mais nova;
- reaparecer após troca de conta ou rota.

---

## 2. Causa raiz

O repositório já possuía proteções parciais:

- `navigation-lifecycle.js` mantém `route.id`;
- `stable-shell-router.js` mantém `navigationId`;
- `page-hydration.js` verifica conexão do root;
- `session.js` publica `doke:auth-session-change`;
- `UX-CORE-002` impede duplicação da mesma mutação.

Essas proteções não formavam uma autoridade comum.

Ainda era possível:

```text
conta A inicia await
→ conta B entra
→ await resolve
→ callback da conta A atualiza a conta B
```

Ou:

```text
request 1
→ request 2
→ request 2 resolve
→ request 1 resolve depois
→ request 1 sobrescreve request 2
```

---

## 3. Autoridade

```text
Doke.continuityExperience
```

Arquivo:

```text
assets/js/core/continuity-experience.js
```

Versão:

```text
20260804-ux-cont-001-v1
```

A autoridade é local ao processo. Ela não substitui autenticação, router, backend, idempotência remota ou revisão server-side.

---

## 4. Dimensões

### 4.1 Account generation

A geração muda quando o fingerprint da conta muda.

Fonte principal:

```text
doke:auth-session-change
```

Handles antigos são abortados e seus commits passam a ser rejeitados.

IDs brutos de conta não são expostos nos eventos.

### 4.2 Route generation

A geração muda quando uma nova rota lógica começa.

Fontes:

```text
doke:navigation-lifecycle-route
doke:navigation-lifecycle-change
popstate
hashchange
pageshow persisted
```

Mudanças de estado do mesmo `route.id` não geram rotação duplicada.

### 4.3 Request generation

Cada lane possui uma sequência própria.

```text
news.preference.save
news.online-refresh
search.results
profile.load
```

Uma nova request na mesma lane:

- incrementa a geração;
- aborta o handle anterior;
- torna a resposta anterior stale.

### 4.4 Revision generation

Uma revision key representa a versão lógica de uma entidade ou draft.

```text
news.preference
service:<opaque-id>
draft:<opaque-id>
```

Quando a revisão muda, fences anteriores não podem mais aplicar efeitos.

---

## 5. Fence

Um fence interno contém:

```text
fenceId
lane
accountFingerprint
accountGeneration
routeKey
routeGeneration
requestGeneration
revisionKey
revision
entityKey
capturedAt
scopes
```

A projeção pública substitui rota, revision key e entity key por fingerprints.

---

## 6. API

```text
capture(options)
beginRequest(options)
validate(fence)
isCurrent(fence)
assertCurrent(fence)
commit(fence, callback)
guardPromise(task, fence, handlers)

getRevision(key)
setRevision(key, token)
bumpRevision(key)

invalidateLane(lane, reason)
invalidateAll(reason)
refreshAccount(reason)
refreshRoute(reason)
getSnapshot()
subscribe(listener)
```

---

## 7. Request handle

```text
const handle = Doke.continuityExperience.beginRequest({
  lane: 'news.preference.save',
  revisionKey: 'news.preference',
  revision: '4',
  entityKey: 'preference/news-view',
  abortPrevious: true
});
```

O handle publica:

```text
fence
signal
validate()
assertCurrent()
commit(callback)
abort(reason)
settle()
```

---

## 8. Commit

```text
handle.commit(() => render(result));
```

Quando atual:

```text
applied = true
callback executa
```

Quando stale:

```text
applied = false
callback não executa
evento sanitizado é emitido
```

Resultado stale deve normalmente ser ignorado, não apresentado como erro ao usuário.

---

## 9. Abort não é autoridade

`AbortController` reduz trabalho, mas não comprova que o servidor deixou de processar o comando.

```text
abort
≠ rollback
≠ rejeição remota
≠ garantia de não processamento
```

Por isso o fence continua obrigatório depois do abort.

---

## 10. Integração piloto — Novidades

O mutation manager é carregado sob demanda.

Antes, conta ou rota poderiam mudar durante esse carregamento.

Agora o fluxo é:

```text
normaliza preferência
→ captura storage key da conta atual
→ carrega continuity
→ bump revision
→ begin request
→ carrega mutation manager
→ assert current antes do request
→ assert current antes do storage write
→ commit fence antes do feedback visual
```

Se conta, rota, request ou revisão mudar:

- storage write não ocorre;
- receipt não é apresentado;
- `ready` não é reaplicado;
- `doke:news-preference-saved` não é emitido.

### Latest-wins

```text
lane: news.preference.save
```

A preferência mais recente invalida a anterior.

### Storage key estável

A key é capturada antes do await:

```text
const targetStorageKey = storageKey();
```

O write não recalcula a conta depois que a operação começou.

### Online refresh

O callback agendado após `online` usa:

```text
lane: news.online-refresh
```

Se a rota mudar antes do timeout, o `ready` da rota anterior não é aplicado.

---

## 11. Compatibilidade

Se o continuity module não carregar:

- Novidades mantém o comportamento do UX-CORE-002;
- um warning é registrado;
- a compatibilidade não é tratada como garantia de continuidade.

Se o mutation manager não carregar:

- o fallback local permanece;
- o fallback só escreve quando o fence ainda é atual.

---

## 12. Eventos

```text
doke:continuity-ready
doke:continuity-account-rotated
doke:continuity-route-rotated
doke:continuity-revision-changed
doke:continuity-request-began
doke:continuity-request-aborted
doke:continuity-request-settled
doke:continuity-commit-applied
doke:continuity-commit-rejected
doke:continuity-lane-invalidated
doke:continuity-invalidated
```

Eventos não carregam:

- account ID bruto;
- entity ID bruto;
- revision key bruta;
- payload;
- e-mail;
- telefone;
- endereço;
- token.

---

## 13. Invariantes

```text
conta nova
→ account generation nova
→ handles antigos abortados
→ commits antigos rejeitados
```

```text
rota nova
→ route generation nova
→ handles route-scoped abortados
→ callbacks antigos rejeitados
```

```text
request nova na mesma lane
→ request generation nova
→ request anterior superseded
```

```text
revision nova
→ fence anterior stale
```

```text
stale response
→ zero side effect
```

---

## 14. Não objetivos

Este sublote não:

- persiste intents entre reloads;
- cria queue offline;
- cria leases cross-tab;
- adiciona BroadcastChannel;
- migra busca;
- migra pedidos;
- migra mensagens;
- migra carteira;
- altera KYC;
- altera Trust & Safety;
- altera pagamentos;
- cria revision server-side.

---

## 15. Arquivos

```text
assets/js/core/continuity-experience.js
assets/js/pages/news-experience.js
scripts/test-ux-cont-001-generation-fences.js
.github/workflows/ux-cont-001-generation-fences.yml
docs/ux/UX-CONT-001.md
```

---

## 16. Gate

O workflow valida:

- autoridade e API congeladas;
- account rotation;
- route rotation;
- mesma route ID sem rotação dupla;
- request latest-wins;
- abort da request anterior;
- revision mismatch;
- stale commit sem callback;
- current commit com callback;
- snapshots e eventos sanitizados;
- integração piloto;
- regressão UX-CORE-002;
- regressão UX-CORE-001;
- whitespace.

---

## 17. Rollback

1. remover `continuity-experience.js`;
2. restaurar `news-experience.js` do UX-CORE-002;
3. remover teste, workflow e documento.

Não existe migration, dado remoto, fila persistida ou alteração de produção.

---

## 18. Próximo sublote

```text
UX-PRIV-001
— account-scoped storage e logout cleanup
```

A próxima etapa usará account generation para garantir que chaves privadas, caches e resíduos da conta anterior não sobrevivam à troca de conta ou logout.
