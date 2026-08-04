# UX-CORE-001 — State and Content Registry

## Status

- Frente: `UX-IMPLEMENTATION`;
- Sublote: `UX-CORE-001`;
- Issue: `#41`;
- Branch: `ux/ux-core-001-state-content-registry`;
- Base empilhada: `ux/ux-implementation-000`;
- Base lógica PAY indireta: `5a893bc80040db45390213e39cab24f1f62b928c`;
- Fonte normativa: `UX-FOUNDATION-007`, `008`, `012`, `015`, `018` e `UX-IMPLEMENTATION-000`;
- Staging acessado: não;
- Produção acessada: não;
- Merge autorizado: não;
- Ready for review autorizado: não.

---

## 1. Objetivo

Consolidar a primeira autoridade transversal de estados de interface e conteúdo operacional sem criar uma terceira implementação concorrente.

O repositório já possuía:

```text
assets/js/state/state-contracts.js
assets/js/core/view-state.js
```

O primeiro arquivo possuía apenas:

```text
idle
loading
empty
error
ready
```

O segundo reimplementava diretamente a escrita de `data-view-state`.

A implementação agora define:

```text
state-contracts.js
→ autoridade canônica

view-state.js
→ adaptador compatível
```

---

## 2. Escopo alterado

### Runtime

- `assets/js/state/state-contracts.js`;
- `assets/js/core/view-state.js`;
- `assets/js/pages/news-experience.js`.

### Validação

- `scripts/test-ux-core-001-state-content-registry.js`;
- `.github/workflows/ux-core-001-state-content-registry.yml`.

### Documentação

- `docs/ux/UX-CORE-001.md`.

Nenhum HTML, CSS, migration, backend, Edge Function, banco de dados ou configuração remota foi alterado.

---

## 3. Estados canônicos

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

A representação DOM permanece em lowercase:

```text
data-view-state="unknown_outcome"
```

Estados com atividade em andamento controlam `aria-busy="true"`:

```text
loading
refreshing
submitting
reconciling
```

Estados de freshness usam:

```text
data-view-freshness="stale"
data-view-freshness="degraded"
```

---

## 4. Separações obrigatórias

```text
EMPTY ≠ ERROR
ERROR ≠ OFFLINE
STALE ≠ READY
DEGRADED ≠ ERROR
SUBMITTING ≠ SUCCESS
UNKNOWN_OUTCOME ≠ ERROR
RECONCILING ≠ RETRY
CONFLICT ≠ FAILURE GENÉRICA
READ_ONLY ≠ DISABLED
MAINTENANCE ≠ EMPTY
```

O registry rejeita transições inválidas sem modificar a boundary.

Exemplo rejeitado:

```text
LOADING
→ SUCCESS
```

Fluxo de mutação válido para o futuro:

```text
READY
→ SUBMITTING
→ UNKNOWN_OUTCOME
→ RECONCILING
→ SUCCESS | ERROR | CONFLICT
```

UX-CORE-001 define somente a linguagem de estados.

A autoridade de intenção, idempotência e receipt pertence ao próximo sublote `UX-CORE-002`.

---

## 5. API pública

```text
Doke.stateContracts.STATES
Doke.stateContracts.states
Doke.stateContracts.busyStates
Doke.stateContracts.normalizeState(state)
Doke.stateContracts.isValidState(state)
Doke.stateContracts.canTransition(from, to)
Doke.stateContracts.init()
Doke.stateContracts.setBoundaryState(root, state, options)
Doke.stateContracts.setActionState(action, state, label)
Doke.stateContracts.describe(state, options)
```

A API e o enum são congelados com `Object.freeze`.

### Opções de boundary

```text
message
contentKey
variables
announce
```

Exemplo:

```js
Doke.stateContracts.setBoundaryState(root, 'empty', {
  contentKey: 'news.filter.empty',
  variables: { filter: 'Segurança' }
});
```

---

## 6. Catálogo de conteúdo

O mesmo módulo publica:

```text
Doke.contentCatalog
```

API:

```text
has(key)
get(key, variables, fallback)
resolve(key, variables, fallback)
keys()
```

O catálogo inicial contém mensagens genéricas para os estados canônicos e uma mensagem da integração piloto.

O catálogo:

- retorna texto, nunca HTML;
- não executa conteúdo interpolado;
- é aplicado por `textContent`;
- possui fallback explícito;
- não contém PII;
- não contém claims financeiros;
- não contém mensagens de autoridade não comprovada.

---

## 7. Compatibilidade

`Doke.viewState` permanece disponível.

Métodos legados preservados:

```text
set
loading
ready
empty
error
```

Métodos adicionados:

```text
refreshing
offline
stale
degraded
submitting
success
unknownOutcome
reconciling
conflict
readOnly
maintenance
```

Quando `Doke.stateContracts` está carregado, todas essas chamadas delegam para a autoridade canônica.

Existe fallback mínimo apenas para tolerar páginas com ordem legada de scripts.

O fallback não substitui a autoridade quando o registry está disponível.

---

## 8. Eventos

Transição aceita:

```text
doke:view-state-change
```

Payload:

```text
from
to
contentKey
```

Transição rejeitada:

```text
doke:view-state-rejected
```

Payload:

```text
from
to
reason: invalid_transition
```

Nenhum payload inclui:

- texto livre de erro;
- PII;
- conteúdo de mensagem;
- endereço;
- query de busca;
- dados financeiros.

---

## 9. Live regions

O registry reutiliza uma região existente:

```text
[data-state-region]
```

Pode selecionar:

```text
[data-state-loading]
[data-state-empty]
[data-state-error]
[data-state-unknown-outcome]
```

ou o fallback:

```text
[data-state-message]
```

O módulo não cria live regions repetidas.

`IDLE` e `READY` não anunciam por padrão.

Outros estados anunciam somente quando a superfície já possui uma região apropriada.

---

## 10. Integração piloto

A única integração funcional desta entrega é:

```text
assets/js/pages/news-experience.js
```

Novidades foi escolhida porque:

- é não financeira;
- não promove papel;
- não altera pedido;
- não altera mensagem;
- não envolve KYC;
- não envolve denúncia ou ban;
- possui boundary já existente;
- possui estados simples de ready, refreshing, offline e error.

O fluxo agora tenta:

```text
Doke.stateContracts.setBoundaryState(...)
```

Se a API ainda não estiver disponível devido a uma ordem legada de carregamento, mantém fallback limitado.

A integração não altera layout, filtros, cards ou conteúdo editorial.

---

## 11. Validação automatizada

Script:

```text
node scripts/test-ux-core-001-state-content-registry.js
```

Cobertura:

- API congelada;
- enum completo;
- normalização de nomes;
- estado inválido rejeitado;
- transição válida;
- transição impossível rejeitada;
- `aria-busy`;
- mensagem de loading;
- `EMPTY` separado de `READY`;
- interpolação por chave;
- fluxo `SUBMITTING → UNKNOWN_OUTCOME → RECONCILING → SUCCESS`;
- delegação de `Doke.viewState`;
- fallback de conteúdo;
- integração de Novidades usando o registry.

Workflow:

```text
Doke UX-CORE-001 State Content Registry
```

Permissões:

```yaml
permissions:
  contents: read
```

O job executa:

- `node --check`;
- testes de contrato;
- `git diff --check`.

---

## 12. Limites deliberados

Esta entrega não implementa:

- mutation manager;
- intent ID;
- idempotency key;
- receipt;
- reconciliação remota;
- generation fences;
- account-scoped storage;
- cleanup de logout;
- overlay manager;
- route focus;
- RUM;
- analytics;
- migração global das páginas.

Também não modifica:

- Home;
- Resultados;
- Pedidos;
- Mensagens;
- Carteira;
- Pagamentos;
- KYC;
- Trust & Safety.

---

## 13. Rollback

Rollback técnico:

1. restaurar `state-contracts.js` anterior;
2. restaurar `view-state.js` anterior;
3. restaurar o setter local de Novidades;
4. remover teste, workflow e documento deste sublote.

Não existe migração de dados.

Não existe mudança remota.

Não existe estado persistido novo.

Portanto, o rollback é somente de código.

---

## 14. Definition of Done

- enum único e congelado;
- estados críticos separados;
- transições válidas declaradas;
- transições impossíveis rejeitadas;
- conteúdo operacional resolvido por chave;
- `Doke.viewState` delegado;
- `aria-busy` correto;
- live region não duplicada;
- uma integração piloto não financeira;
- sintaxe validada;
- testes positivos e negativos;
- workflow read-only;
- rollback documentado;
- nenhum acesso remoto;
- nenhum claim financeiro elevado;
- PR draft e não mesclado.

---

## 15. Impacto no site

A mudança funcional é restrita ao gerenciamento interno de estado da página Novidades.

Visualmente:

- nenhum componente mudou;
- nenhuma cor mudou;
- nenhum espaçamento mudou;
- nenhum card mudou;
- nenhuma animação mudou.

Estruturalmente:

- Novidades deixa de escrever estado de forma isolada quando o registry está disponível;
- erros, offline e refreshing passam pela mesma linguagem canônica;
- o legado continua compatível;
- futuras páginas podem migrar progressivamente.

---

## 16. Próximo sublote

```text
UX-CORE-002
— mutation manager, idempotency, receipts e UNKNOWN_OUTCOME operacional
```

A primeira integração deverá continuar não financeira e reversível.
