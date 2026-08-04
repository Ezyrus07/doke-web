# UX-NAV-001 — Overlay stack, focus lifecycle e route focus manager

## Status

- Frente: `UX-IMPLEMENTATION`;
- Onda: `Wave 2 — shell, navegação e acessibilidade`;
- Sublote: `UX-NAV-001`;
- Branch: `ux/ux-nav-001-overlay-focus`;
- Base empilhada: `ux/ux-priv-001-account-storage`;
- Base head: `39adcf2ddaff021940a803e4e2466ab1c6f526d5`;
- Issue: `#51`;
- Natureza: runtime local, contrato, teste e workflow read-only;
- Staging e produção: não acessados;
- Migration: nenhuma;
- Merge e ready-for-review: não autorizados.

---

## 1. Objetivo

Criar uma autoridade transversal para overlays e foco:

```text
overlay aberto
→ entra na stack
→ background não interativo
→ scroll controlado
→ foco inicial
→ Tab contido no overlay superior
→ Escape fecha somente o overlay superior
→ fechamento restaura contexto válido
```

E, após navegação interna:

```text
rota pronta
→ overlay anterior fechado
→ título/main da nova rota recebe foco
```

---

## 2. Causa raiz

O repositório possuía implementações independentes em:

- `system-dialog.js`;
- `help-drawer.js`;
- `media-lightbox.js`;
- `mobile-drawer-standard.js`;
- modais específicos de páginas.

Cada componente controlava parcialmente `Escape`, scroll e retorno de foco. Não existia uma autoridade única para:

- stack e overlay superior;
- nested overlays;
- Tab e Shift+Tab;
- background `inert`;
- restauração dos atributos anteriores;
- retorno de foco condicionado à rota;
- fechamento coordenado durante navegação;
- foco após troca de rota.

Riscos anteriores:

```text
modal A + modal B
→ dois listeners de Escape
→ ambos podem fechar
```

```text
abre drawer na rota A
→ navega para rota B
→ fecha drawer antigo
→ foco retorna para elemento da rota A
```

```text
overlay visualmente aberto
→ conteúdo atrás continua alcançável por teclado/leitor de tela
```

---

## 3. Autoridade

```text
Doke.overlayExperience
```

Arquivo:

```text
assets/js/core/overlay-experience.js
```

Versão:

```text
20260804-ux-nav-001-v1
```

API pública:

```text
open(options)
close(id, options)
closeTop(options)
requestCloseTop(reason)
requestCloseAll(reason)
getStack()
getSnapshot()
isOpen(id)
top()
focusRoute(options)
subscribe(listener)
```

Adaptador de foco pós-rota:

```text
Doke.routeFocusManager
```

---

## 4. Tipos e razões

Tipos:

```text
MODAL
DRAWER
SHEET
LIGHTBOX
POPOVER
```

Razões de fechamento:

```text
ESCAPE
BACKDROP
ACTION
PROGRAMMATIC
ROUTE_CHANGE
REPLACED
OWNER_REMOVED
```

IDs precisam ser identificadores técnicos. Conteúdo, e-mail, username ou dados pessoais não podem ser usados como ID.

---

## 5. Stack e topmost

A stack é ordenada por abertura. Apenas o item superior pode:

- responder a `Escape`;
- aplicar o trap de foco;
- receber foco inicial;
- processar `requestClose`.

Overlays cobertos ficam `inert` até voltarem ao topo.

```text
A abre
→ A é top

B abre sobre A
→ A fica inert
→ B é top

B fecha
→ A volta ao topo
→ foco retorna para A
```

Uma tentativa de registrar o mesmo ID duas vezes falha de forma explícita.

---

## 6. Foco inicial e Tab

Ordem do foco inicial:

1. `initialFocus` fornecido pelo consumidor;
2. `[autofocus]`;
3. `[data-overlay-initial-focus]`;
4. primeiro elemento focável;
5. própria surface com `tabindex="-1"` temporário.

Com `trapFocus: true`:

```text
Tab no último elemento
→ primeiro elemento

Shift+Tab no primeiro elemento
→ último elemento

foco externo inesperado
→ foco retorna ao overlay superior
```

---

## 7. Escape

Existe um único listener global em capture phase.

```text
Escape
→ localizar topmost
→ impedir propagação
→ emitir requestClose
→ consumidor conclui animação/estado
→ handle.close()
```

Overlays inferiores não recebem o mesmo Escape.

---

## 8. Background inert

Durante um overlay modal:

- filhos relevantes de `body` fora do overlay recebem `inert`;
- recebem `aria-hidden="true"`;
- valores anteriores são armazenados;
- no fechamento, os valores exatos são restaurados;
- scripts, styles, links, metas e templates são ignorados.

O mecanismo não presume que os atributos estavam ausentes antes da abertura.

---

## 9. Scroll lock

O primeiro overlay que exige lock captura:

- `html.style.overflow`;
- `body.style.overflow`;
- presença prévia da classe `doke-overlay-stack-open`.

Enquanto qualquer overlay da stack exigir lock, o documento permanece bloqueado. O estado anterior só é restaurado quando nenhum overlay restante exige lock.

---

## 10. Retorno de foco

O trigger é capturado na abertura. O foco só retorna quando:

- o trigger ainda está conectado;
- continua focável;
- o overlay fechou na mesma identidade de rota;
- `returnFocus` não foi desabilitado.

Em mudança de rota:

```text
trigger da rota anterior
→ não recebe foco
→ route focus manager assume a nova superfície
```

---

## 11. Foco após navegação

Ordem de destino:

```text
[data-route-focus-target]
[data-page-title]
main h1
[role="main"] h1
main
[role="main"]
[data-shell-main]
```

O manager adiciona `tabindex="-1"` temporário quando necessário e remove no `blur`.

Ele não rouba foco quando:

- existe overlay aberto;
- o foco atual está em input, textarea, select ou contenteditable;
- uma navegação mais nova substituiu o agendamento;
- o route ID esperado já não é atual.

---

## 12. Integração com navegação

Eventos observados:

```text
doke:navigation-lifecycle-route
doke:route-ready
doke:stable-route-ready
```

Durante `pending` ou `committed`:

```text
requestCloseAll(ROUTE_CHANGE)
```

Durante `ready` ou `empty`:

```text
focusRoute()
```

A autoridade reutiliza `Doke.navigationLifecycle`; não cria um segundo router.

---

## 13. Carregamento global

`assets/js/core/page-bootstrap.js` carrega a autoridade por `loadCoreScript()`.

Falha do módulo de overlay não derruba o auth guard. O bootstrap registra warning e componentes ainda podem usar fallback local temporário.

O evento `doke:page-bootstrap-ready` passa a informar:

```text
overlayExperienceReady
```

---

## 14. Piloto — Help Drawer

Somente o Help Drawer foi migrado.

Configuração:

```text
id: help-drawer
kind: DRAWER
modal: true
closeOnEscape: true
trapFocus: true
lockScroll: true
inertBackground: true
returnFocus: true
```

Foco inicial:

```text
input de busca de ajuda
```

Fluxo:

```text
abrir drawer
→ manter markup e CSS existentes
→ registrar na stack
→ focar busca
→ inert no background
→ Escape apenas no topmost
→ fechar
→ restaurar foco quando rota ainda válida
```

Nenhum HTML de página e nenhum CSS foi alterado.

---

## 15. Compatibilidade

Permanecem legados, sem novas adoções:

- `DokeDialog`;
- `DokeMediaLightbox`;
- mobile drawer canônico;
- dialogs de pedidos, pagamentos, KYC e Trust & Safety.

A migração deles será feita em sublotes próprios, após validação do piloto.

---

## 16. Eventos e privacidade

Eventos principais:

```text
doke:overlay-experience-ready
doke:overlay-opened
doke:overlay-close-requested
doke:overlay-closed
doke:route-focus-applied
doke:route-focus-skipped
```

Snapshots incluem somente:

- ID técnico;
- tipo;
- profundidade;
- estado;
- flags operacionais;
- route ID;
- timestamps.

Não incluem elementos DOM, trigger, textos, labels, payload ou PII.

---

## 17. Validação

O gate cobre:

- sintaxe JavaScript;
- API e enums congelados;
- abertura e fechamento;
- foco inicial;
- Tab e Shift+Tab;
- nested overlays;
- Escape somente no topmost;
- inert e restauração;
- scroll lock e restauração;
- retorno de foco;
- bloqueio de retorno cross-route;
- foco após rota pronta;
- não roubar foco editável;
- snapshots sanitizados;
- integração do bootstrap;
- integração do Help Drawer;
- auditor do navigation lifecycle;
- auditor de auth/session;
- regressões UX-PRIV-001, UX-CONT-001, UX-CORE-002 e UX-CORE-001;
- `git diff --check`.

---

## 18. Rollback

1. remover `overlay-experience.js`;
2. restaurar `page-bootstrap.js` ao head do UX-PRIV-001;
3. restaurar `help-drawer.js` ao head do UX-PRIV-001;
4. remover teste, workflow e documento.

Nenhum dado, schema ou migration precisa ser revertido.

---

## 19. Definition of Done

- uma autoridade de stack publicada;
- topmost único para Escape e Tab;
- nested overlays preservam o anterior;
- background modal não é interativo;
- scroll anterior é restaurado;
- trigger só recebe foco na mesma rota;
- rota pronta recebe foco sem afetar inputs ativos;
- Help Drawer usa a autoridade;
- sem mudança visual;
- gates e regressões verdes;
- PR aberto, draft e não mesclado.

---

## 20. Impacto no site

Na branch técnica, o Help Drawer passa a funcionar corretamente para teclado, leitor de tela, overlays aninhados e navegação interna. O visual permanece o mesmo.

Produção não é alterada enquanto o PR permanecer sem merge e sem deploy.

---

## 21. Próximo sublote

```text
UX-A11Y-001
— keyboard semantics, focus-visible e landmarks
```
