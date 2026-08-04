# UX-PRIV-001 — Account-scoped storage e logout cleanup

## Status

- Frente: `UX-IMPLEMENTATION`;
- Onda: `Wave 1 — safety kernel`;
- Sublote: `UX-PRIV-001`;
- Branch: `ux/ux-priv-001-account-storage`;
- Base empilhada: `ux/ux-cont-001-generation-fences`;
- Base head: `1f4778627b1cf3bfcf7cf77ba17c4d4f7abfaa79`;
- Issue: `#44`;
- Fonte normativa: PR `#28`, PR `#40`, PR `#45`, PR `#46` e PR `#47`;
- Staging acessado: não;
- Produção acessada: não;
- Migration remota: não;
- Merge autorizado: não;
- Ready for review autorizado: não.

---

## 1. Objetivo

Criar uma autoridade transversal de storage local que garanta:

```text
conta A
≠ conta B
≠ guest de outra sessão
≠ preferência de dispositivo
```

A entrega coordena a remoção de dados privados quando:

- a pessoa faz logout;
- a sessão remota é encerrada;
- uma conta é substituída por outra;
- outra aba altera a sessão;
- a autoridade carrega depois de uma transição já ocorrida.

A integração piloto cobre somente as preferências de Novidades.

---

## 2. Causa raiz

O runtime possuía chaves locais sem registry transversal, como:

```text
doke.news-view.v1:<accountId-ou-guest>
doke.theme
doke.sidebar.collapsed
doke.auth.session.v1
```

O logout removia a sessão e duas chaves legadas fixas, mas não existiam:

- classes de privacidade;
- retenção declarada;
- namespace validado;
- guest session isolada;
- limpeza por conta;
- migração idempotente;
- eventos sanitizados;
- regra única para troca de conta.

Risco anterior:

```text
conta A salva dado local
→ logout
→ chave permanece
→ conta B executa código legado
→ dado da conta A pode reaparecer
```

O sufixo genérico `guest` também permitia compartilhamento local entre sessões visitantes.

---

## 3. Autoridade

```text
Doke.accountStorage
```

Arquivo:

```text
assets/js/core/account-storage.js
```

Versão:

```text
20260804-ux-priv-001-v1
```

API:

```text
registerDomain(policy)
getPolicy(domain)
resolveScope(options)
getGuestSessionId()
resetGuestSessionId()
makeKey(options)
parseKey(storageKey)
publicDescriptor(storageKey)
read(options)
write(options)
remove(options)
listScopeKeys(scopeId)
clearScope(scopeId, options)
migrateLegacy(options)
handleAccountTransition(options)
bootstrap(options)
subscribe(listener)
```

A API e seus enums são congelados.

---

## 4. Namespace

Formato:

```text
doke:<opaque-account-or-guest-scope>:<domain>:<key>:v<version>
```

Exemplo:

```text
doke:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee:news:view:v1
```

Permitido no scope:

- ID opaco do provider;
- UUID de conta;
- guest session ID aleatório.

Proibido:

- e-mail;
- telefone;
- CPF ou CNPJ;
- username;
- espaços;
- `/`, `:`, `@`;
- conteúdo livre.

Chaves malformadas e domínios não registrados são rejeitados antes da leitura ou escrita.

---

## 5. Guest session

Visitantes recebem um identificador em `sessionStorage`:

```text
doke.guest-session.v1
```

Propriedades:

- opaco;
- aleatório;
- específico da sessão da aba;
- preservado durante reload da mesma aba;
- recriado depois do logout de uma conta.

A chave legada:

```text
doke.news-view.v1:guest
```

não é migrada porque não possui proveniência segura.

---

## 6. Classes e retenção

Classes:

```text
DEVICE_PREFERENCE
GUEST_PRIVATE
ACCOUNT_PRIVATE
TRANSACTION_PRIVATE
EPHEMERAL_UI
```

Retenção:

```text
SESSION
UNTIL_LOGOUT
PERSISTENT
DEVICE
```

Política piloto:

```text
domain: news
dataClass: ACCOUNT_PRIVATE
retention: UNTIL_LOGOUT
clearOnLogout: true
allowGuest: true
crossTab: METADATA
maxBytes: 4096
```

Preferências `DEVICE` podem permanecer quando a política declarar `clearOnLogout: false`.

---

## 7. Escrita confirmada

Fluxo:

```text
validar scope
→ validar domínio
→ validar key e versão
→ validar policy e tamanho
→ escrever localStorage
→ reler o valor serializado
→ confirmar
→ emitir metadata sanitizada
```

O limite global é 64 KiB por valor. Novidades usa 4 KiB.

Uma escrita sem releitura idêntica não é considerada confirmada.

---

## 8. Eventos

Eventos públicos transportam apenas:

- fingerprint do scope;
- domínio;
- fingerprint da key;
- versão;
- operação;
- quantidade removida;
- motivo técnico.

Não transportam:

- account ID bruto;
- payload;
- valor armazenado;
- e-mail;
- telefone;
- endereço;
- documento.

A autoridade não cria `BroadcastChannel` e não replica payload privado entre abas.

---

## 9. Integração com sessão

O ponto de integração é:

```text
assets/js/core/session.js
```

O session store continua sendo a autoridade de sessão e carrega `Doke.accountStorage` antecipadamente.

Fluxo:

```text
sessão anterior
→ sessão seguinte
→ extrair account IDs opacos
→ detectar mudança
→ handleAccountTransition()
→ limpar scope anterior conforme policy
→ atualizar marker ativo
```

Isso cobre:

- `session.clear()`;
- logout explícito;
- `SIGNED_OUT` remoto;
- conta A para conta B;
- alteração recebida por `storage` event.

Não foi criada uma segunda autoridade de limpeza no `auth-service.js`.

---

## 10. Bootstrap tardio

O módulo mantém em `sessionStorage` somente o último scope ativo:

```text
doke.account-storage.active-scope.v1
```

Se carregar depois da transição:

```text
scope anterior registrado
≠ conta atual
→ limpar scope anterior
```

O marker não contém payload privado.

---

## 11. Migração limitada

Origem elegível:

```text
doke.news-view.v1:<accountId>
```

Destino:

```text
doke:<accountId>:news:view:v1
```

Regras:

1. somente conta autenticada;
2. o legacy key deve conter o mesmo ID opaco;
3. se o destino existe, ele vence;
4. a chave antiga é removida;
5. payload inválido não é restaurado;
6. repetição é idempotente;
7. guest genérico não é migrado;
8. novas escritas usam apenas o namespace canônico.

---

## 12. Piloto — Novidades

Antes:

```text
doke.news-view.v1:<userId-ou-guest>
```

Depois:

```text
doke:<account-ou-guest-session>:news:view:v1
```

Save:

```text
preferência normalizada
→ continuity fence
→ mutation manager
→ account storage
→ releitura confirmada
→ receipt
→ feedback visual
```

Autoridade do receipt:

```text
client-account-storage
```

A referência contém somente domínio, fingerprint da key e versão.

Se account storage falhar, a preferência permanece efêmera em memória. Nenhuma chave legada é escrita e nenhum receipt de persistência é produzido.

---

## 13. Relação com outros módulos

```text
Doke.continuityExperience
→ conta, rota, request, revisão e stale commit

Doke.formMutationManager
→ intent, single-flight, idempotência, receipt e reconciliação

Doke.accountStorage
→ namespace, policy, persistência, migração e cleanup
```

Uma autoridade não substitui a outra.

---

## 14. Restrições preservadas

- Home, HTML e CSS intocados;
- busca e localização não migradas;
- drafts, notificações, pedidos e mensagens não migrados;
- carteira e pagamentos intocados;
- payout, escrow, refund e chargeback intocados;
- KYC e Trust & Safety intocados;
- nenhuma migration;
- nenhum acesso a staging ou produção;
- nenhuma coleta de analytics.

---

## 15. Validação

O gate cobre:

- namespace e API congelados;
- isolamento conta A/B;
- guests distintos;
- rejeição de e-mail como scope;
- rejeição de domínio malformado;
- escrita e releitura;
- preservação de device preference;
- limpeza por logout e troca de conta;
- eventos sem ID bruto e payload;
- migração idempotente;
- não migração de guest compartilhado;
- integração de sessão e Novidades;
- auditor de auth/session;
- regressões UX-CONT-001, UX-CORE-002 e UX-CORE-001;
- `git diff --check`.

---

## 16. Rollback

1. remover `account-storage.js`;
2. restaurar `session.js` ao head do UX-CONT-001;
3. restaurar `news-experience.js` ao head do UX-CONT-001;
4. remover teste, workflow e documento;
5. opcionalmente remover chaves `doke:<scope>:news:view:v1`.

Nenhum schema remoto precisa ser revertido.

---

## 17. Definition of Done

- conta A e B não compartilham preferência;
- guests de sessões diferentes usam scopes distintos;
- logout e troca de conta limpam `ACCOUNT_PRIVATE`;
- preferências device-level permitidas permanecem;
- chaves malformadas são rejeitadas;
- migração é idempotente;
- guest legado não é migrado;
- novas escritas não usam chave legada;
- eventos não expõem account ID ou payload;
- auth/session e gates anteriores permanecem verdes;
- PR permanece draft e não mesclado.

---

## 18. Impacto no site

Na branch técnica, Novidades passa a armazenar preferências no scope correto e a removê-las no logout ou troca de conta.

Não há mudança visual.

---

## 19. Próximo sublote

```text
UX-NAV-001
— overlay stack, focus lifecycle e route focus manager
```

Com esta entrega, a primeira camada do safety kernel fica coberta por:

```text
UX-CORE-001
UX-CORE-002
UX-CONT-001
UX-PRIV-001
```