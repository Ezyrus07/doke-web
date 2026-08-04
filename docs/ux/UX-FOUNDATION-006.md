# UX-FOUNDATION-006 — Navegação, overlays, histórico e retorno de foco

Status: contrato documental

Escopo: Produto, UX, acessibilidade e QA

Implementação de runtime: não incluída

Branch de trabalho: `ux/ux-foundation-001`

Head lógico inspecionado: `243f38c88dea90044dd0bf237a79a14db1f2bf97`

---

## 1. Objetivo

Definir um contrato único para:

- navegação interna pelo stable shell;
- navegação nativa quando necessária;
- botão Voltar e Avançar;
- restauração de scroll;
- abertura e fechamento de overlays;
- modais, drawers, lightboxes e previews fullscreen;
- retorno de foco;
- foco inicial após mudança de rota;
- deep links de previews;
- fechamento seguro de overlays durante troca de rota;
- overlays aninhados;
- integração com teclado e leitor de tela.

Este documento não altera JavaScript, CSS, HTML, staging ou produção.

---

## 2. Causa raiz

A Doke possui duas famílias de lifecycle que atualmente não compartilham uma autoridade completa.

### 2.1 Navegação

A navegação é coordenada principalmente por:

- `assets/js/core/navigation-lifecycle.js`;
- `assets/js/core/stable-shell-router.js`;
- adapters registrados no lifecycle;
- `history.pushState` e `history.replaceState`;
- captura e restauração de scroll.

### 2.2 Overlays

Cada overlay implementa localmente partes de seu lifecycle:

- `assets/js/ui/system-dialog.js`;
- `assets/js/components/media-lightbox.js`;
- `assets/js/components/help/help-drawer.js`;
- `assets/js/components/issue-report-dialog.js`;
- `assets/js/pages/home/workers.js`;
- `assets/js/pages/home/before-after.js`;
- drawers de filtros;
- modais de pedidos;
- overlays de mensagens;
- modais de pagamento;
- modais de avaliação;
- outros componentes específicos de página.

Cada módulo pode possuir sua própria combinação de:

- `lastTrigger`;
- `document.activeElement`;
- classe de scroll lock;
- `body.style.top`;
- `body.style.overflow`;
- listener global de `Escape`;
- animação de fechamento;
- restauração de scroll;
- retorno de foco;
- Promise pendente.

Não existe ainda uma autoridade global que coordene navegação e overlay como uma única experiência.

---

## 3. Diagnóstico executivo

O sistema atual possui recursos importantes:

- stable shell com `pushState`;
- `popstate` centralizado;
- restauração de scroll;
- callbacks de inicialização por rota;
- limpeza de classes transitórias;
- overlays que, em vários casos, lembram o acionador;
- fechamento por `Escape` em vários componentes;
- `aria-modal="true"` em diversos dialogs.

Entretanto, os recursos não formam ainda um lifecycle determinístico.

Os riscos principais são:

1. o router fechar um overlay sem chamar seu método `close`;
2. uma Promise de dialog permanecer pendente após troca de rota;
3. scroll lock ser removido por uma autoridade e restaurado posteriormente por outra;
4. foco tentar retornar para um nó removido pelo stable shell;
5. mais de um listener global reagir ao mesmo `Escape`;
6. usuário de teclado permanecer no conteúdo de fundo;
7. botão Voltar navegar para outra página em vez de fechar o preview aberto;
8. duas entradas iguais de URL compartilharem a mesma posição de scroll;
9. rota nova não possuir foco inicial ou anúncio consistente;
10. deep links de Worker e Publicação não representarem o estado real da interface.

---

## 4. Inventário de autoridades atuais

### 4.1 Navigation lifecycle

Arquivo:

`assets/js/core/navigation-lifecycle.js`

Responsabilidades atuais:

- detectar hard load, navegação interna e restore;
- registrar adapters;
- iniciar, concluir e falhar rotas;
- expor `DokeNavigate`;
- capturar scroll;
- restaurar scroll;
- responder a `popstate`;
- controlar estado de document, route, page e guard.

Domínios atuais:

```text
entry
document
route
page
guard
navigation
scroll
timing
```

Domínios ausentes:

```text
focus
overlay
announcement
historyEntry
```

### 4.2 Stable shell router

Arquivo:

`assets/js/core/stable-shell-router.js`

Responsabilidades atuais:

- interceptar links internos;
- aquecer rotas;
- buscar HTML;
- preparar estilos e scripts;
- trocar conteúdo preservando shell;
- atualizar URL;
- resetar ou restaurar scroll;
- executar initializers;
- limpar estados transitórios.

### 4.3 System dialog

Arquivo:

`assets/js/ui/system-dialog.js`

Possui:

- fila de dialogs;
- Promise por interação;
- foco inicial;
- retorno ao `previousFocus`;
- fechamento por `Escape`;
- confirmação por `Enter` fora de prompt.

Não possui:

- focus trap;
- integração com saída de rota;
- fallback quando o foco anterior foi removido;
- registro em stack global;
- `inert` no conteúdo de fundo;
- resolução explícita por motivo `route-change`.

### 4.4 Media lightbox

Arquivo:

`assets/js/components/media-lightbox.js`

Possui:

- `lastFocused`;
- foco inicial no botão fechar;
- retorno de foco;
- scroll lock;
- `Escape`;
- setas esquerda e direita.

Não possui:

- focus trap;
- stack global;
- history state;
- deep link;
- cleanup pelo lifecycle de rota;
- fallback quando o acionador deixa de existir.

### 4.5 Worker preview

Arquivo:

`assets/js/pages/home/workers.js`

Possui:

- `lastTrigger`;
- lock e unlock de viewport;
- restauração de scroll em múltiplos tempos;
- retorno de foco;
- fechamento por `Escape`;
- camada secundária de comentários;
- navegação vertical por setas.

Não possui:

- foco inicial explícito ao abrir;
- focus trap;
- `inert` no conteúdo de fundo;
- stack central;
- deep link;
- history entry;
- contrato de fechamento durante troca de rota.

### 4.6 Publicação / Antes e Depois

Arquivo:

`assets/js/pages/home/before-after.js`

Possui:

- `lastTrigger`;
- foco inicial no botão fechar;
- retorno de foco;
- lock e unlock de viewport;
- fechamento por `Escape`;
- subestado de comentários;
- pausa de vídeos no fechamento.

Não possui:

- focus trap;
- stack central;
- deep link;
- history entry;
- integração formal com saída de rota;
- fallback de foco quando o trigger foi removido.

### 4.7 Help drawer

Arquivo:

`assets/js/components/help/help-drawer.js`

Possui:

- `lastTrigger`;
- retorno de foco;
- fechamento por `Escape`;
- backdrop.

Não possui:

- foco inicial ao abrir;
- focus trap;
- scroll lock explícito no JavaScript;
- stack central;
- integração com histórico;
- integração com saída de rota.

### 4.8 Issue report dialog

Arquivo:

`assets/js/components/issue-report-dialog.js`

Possui:

- Promise;
- trigger ativo;
- foco inicial;
- retorno de foco;
- `Escape`;
- resolução de resultado.

Não possui:

- focus trap;
- stack central;
- fechamento obrigatório em `doke:route-leaving`;
- fallback de foco;
- política para Promise interrompida por navegação.

---

## 5. Achados críticos

### UX-NAV-P0-01 — limpeza de rota ignora o lifecycle do componente

O stable shell remove classes transitórias, scroll locks e atributos diretamente.

Também percorre nós com:

```text
[aria-modal="true"]
dialog[open]
.ui-modal.is-open
.modal.is-open
```

E altera sua apresentação sem necessariamente chamar:

```text
component.close()
resolver(...)
pauseMedia()
returnFocus()
releaseLock()
cleanupListeners()
```

#### Impacto

Um overlay pode parecer fechado visualmente enquanto seu estado interno continua aberto.

Exemplos possíveis:

- Promise não resolvida;
- `active` não zerado;
- fila de dialogs bloqueada;
- vídeo continuando em memória;
- listener global mantido;
- scroll restaurado fora de hora;
- `lastTrigger` preservado indevidamente.

#### Contrato obrigatório

A troca de rota não deverá fechar overlays por mutação genérica de DOM.

Deverá executar:

```text
overlayManager.closeAll({
  reason: "route-change",
  restoreFocus: false,
  restoreScroll: false,
  immediate: true
})
```

Somente depois o router poderá substituir a rota.

---

### UX-NAV-P0-02 — system dialog pode ficar órfão durante rota

O system dialog mantém:

```text
active
queue
Promise resolver
previousFocus
```

A limpeza genérica do router não chama `DokeDialog.close()`.

O router pode definir `aria-hidden` no elemento interno, mas isso não garante:

- `root.hidden = true`;
- remoção da classe `doke-system-dialog-open`;
- resolução da Promise;
- avanço da fila;
- remoção dos listeners;
- retorno ou descarte correto de foco.

#### Impacto

Uma ação assíncrona aguardando confirmação pode ficar permanentemente pendente.

#### Contrato obrigatório

Dialogs baseados em Promise deverão resolver interrupções por rota com resultado explícito:

```text
{
  status: "dismissed",
  reason: "route-change",
  value: null
}
```

Não usar rejection para cancelamento comum.

---

### UX-NAV-P0-03 — não existe stack canônica de overlays

Cada componente registra seu próprio listener global de teclado.

Se dois overlays estiverem abertos por erro ou por composição legítima, o mesmo `Escape` poderá ser recebido por mais de um módulo.

#### Exemplos

```text
Worker preview
└── comentários mobile

Publicação
└── comentários mobile

Detalhe
└── lightbox

Pedido
└── dialog de relato

Drawer
└── dialog de confirmação
```

#### Contrato obrigatório

Apenas o topo da stack poderá reagir ao comando de fechamento.

```text
OverlayStack
0  background route
1  parent overlay
2  nested overlay or sheet
```

`Escape` deverá afetar exclusivamente o item no maior índice.

---

### UX-NAV-P0-04 — ausência de focus trap

Os componentes inspecionados posicionam foco em alguns casos, mas não foi encontrada uma autoridade global que contenha `Tab` e `Shift+Tab` dentro do overlay ativo.

#### Impacto

Usuário de teclado pode:

- atravessar para a sidebar;
- alcançar conteúdo visualmente coberto;
- ativar ações da página de fundo;
- perder o contexto do dialog;
- ouvir conteúdo fora da ordem esperada.

#### Contrato obrigatório

Todo overlay modal deverá:

- calcular focusables visíveis;
- conter `Tab`;
- conter `Shift+Tab`;
- possuir fallback focável na superfície;
- aplicar `inert` ao conteúdo externo;
- remover `inert` no fechamento.

---

### UX-NAV-P0-05 — retorno de foco pode apontar para nó desconectado

Vários componentes armazenam o próprio trigger e chamam:

```text
lastTrigger.focus()
```

Após uma troca pelo stable shell, o trigger pode não estar mais conectado ao documento.

#### Contrato obrigatório

A restauração deverá seguir:

```text
1. trigger original conectado e focável
2. trigger equivalente resolvido por focusReturnKey
3. heading principal da rota atual
4. main da rota atual
5. body com tabindex temporário
```

Nunca lançar erro e nunca rolar a página inesperadamente.

---

### UX-NAV-P0-06 — Worker preview abre sem foco inicial explícito

O Worker preview:

- abre a superfície;
- bloqueia viewport;
- inicia mídia;
- atualiza o item ativo.

Porém, no trecho inspecionado, não posiciona o foco dentro do preview.

#### Impacto

O foco pode permanecer no card de fundo enquanto a interface visível é outra.

#### Contrato obrigatório

Ao abrir:

```text
preferred initial focus
→ botão fechar
→ heading/surface focável
```

Autoplay não deverá ocorrer antes de o overlay estar semanticamente ativo.

---

### UX-NAV-P0-07 — Help drawer abre sem foco inicial

O drawer altera classes e `aria-hidden`, mas não posiciona foco no título, campo de busca ou botão fechar.

#### Contrato obrigatório

Prioridade sugerida:

```text
campo de busca
→ botão fechar
→ painel
```

---

### UX-NAV-P0-08 — restauração de scroll do preview compete com a rota

Worker e Publicação possuem restauração própria baseada em:

- `body.style.top`;
- `window.scrollTo` imediato;
- `requestAnimationFrame`;
- timers posteriores;
- correção por posição do anchor.

O stable shell também reseta ou restaura scroll durante navegação.

#### Cenário de risco

```text
preview aberto
→ usuário clica em Ver serviço
→ router inicia rota
→ router limpa classes
→ nova rota reseta scroll
→ timer antigo do preview restaura scroll da Home
→ nova rota salta para posição incorreta
```

#### Contrato obrigatório

Ao fechar por `route-change`:

```text
restoreScroll = false
cancel pending restoration tasks
release lock synchronously
```

A nova rota será a única autoridade de scroll.

---

### UX-NAV-P0-09 — foco pós-rota não está formalizado

Após uma navegação interna, o router:

- substitui conteúdo;
- atualiza URL;
- reseta/restaura scroll;
- executa initializers.

Não existe contrato único para foco após chegada.

#### Impacto

O foco pode terminar:

- no `body`;
- em um elemento removido;
- na sidebar preservada;
- sem anúncio da mudança de página.

#### Contrato obrigatório

Nova navegação iniciada por link deverá focar:

```text
[data-route-focus-target]
→ h1 visível
→ main[data-shell-main]
→ .page__content
```

Com:

```text
tabindex="-1"
focus({ preventScroll: true })
```

O foco deve acontecer depois do commit estrutural e antes da interação normal da rota.

---

### UX-NAV-P0-10 — scroll é indexado por URL, não por entrada de histórico

O lifecycle usa uma chave equivalente a:

```text
pathname + search + hash
```

Duas entradas diferentes com a mesma URL compartilham a mesma posição registrada.

#### Exemplo

```text
Resultados q=limpeza, posição 1
→ detalhe
→ Resultados q=limpeza, posição 2
→ detalhe
→ Voltar
```

As duas entradas de Resultados podem disputar uma única posição.

#### Contrato obrigatório

Cada entrada de histórico deverá possuir um identificador único:

```text
history.state.dokeEntryKey
```

A posição de scroll será indexada por `dokeEntryKey`, com fallback por URL somente para compatibilidade.

---

### UX-NAV-P0-11 — previews não participam do histórico

Worker e Publicação são abertos como estados exclusivamente locais.

Consequências:

- botão Voltar sai da página em vez de fechar o preview;
- não existe deep link;
- Avançar não reabre o preview;
- refresh perde o estado;
- compartilhamento não representa o item aberto.

#### Contrato obrigatório

Previews relevantes deverão ter representação de URL.

Formato canônico sugerido:

```text
index.html?overlay=worker&overlayId=vid-pintura
index.html?overlay=publication&overlayId=case-kitchen
```

Alternativas com hash não deverão coexistir.

---

### UX-NAV-P1-01 — fechamento animado e troca de rota

Drawers podem esperar timers antes de aplicar `hidden`.

Durante rota, o fechamento deverá ser imediato e sem animação residual.

```text
reason = route-change
immediate = true
```

---

### UX-NAV-P1-02 — múltiplas estratégias de scroll lock

Foram observados padrões como:

```text
body.style.overflow = hidden
body.style.top = -scrollY
classe no body
classe no html
position fixed via CSS
```

#### Contrato obrigatório

Somente uma autoridade poderá adquirir ou liberar scroll lock.

---

### UX-NAV-P1-03 — fechamento por backdrop não possui política única

Alguns overlays fecham ao clicar no backdrop; outros usam botão separado; outros podem depender de `event.target === root`.

#### Contrato obrigatório

Cada overlay deverá declarar:

```text
closeOnBackdrop: true | false
closeOnEscape: true | false
```

Operações destrutivas ou em progresso podem desabilitar backdrop temporariamente, com feedback claro.

---

### UX-NAV-P1-04 — anúncios de rota e overlay não são centralizados

Não existe uma região live canônica para anunciar:

- página carregada;
- preview aberto;
- preview fechado;
- erro de rota;
- restauração por Voltar.

#### Contrato obrigatório

Criar um announcer central com mensagens curtas.

Exemplos:

```text
Página Resultados carregada.
Worker de Carlos Andrade aberto.
Publicação fechada.
Não foi possível carregar a página.
```

---

## 6. Modelo canônico

```text
NavigationExperienceState
├── historyEntry
├── route
├── scroll
├── focus
├── announcement
└── overlayStack
```

### 6.1 historyEntry

```text
entryKey
href
createdAt
source
restoreMode
```

### 6.2 route

```text
state
from
to
adapter
navigationId
committedAt
settledAt
```

### 6.3 scroll

```text
entryKey
windowX
windowY
mainScrollerKey
mainX
mainY
capturedAt
```

### 6.4 focus

```text
originKey
returnKey
arrivalTarget
lastFocusedSelector
restorePolicy
```

### 6.5 overlayStack

```text
[
  {
    instanceId,
    kind,
    entityId,
    trigger,
    returnKey,
    initialFocus,
    historyMode,
    closePolicy,
    scrollPolicy,
    parentInstanceId
  }
]
```

---

## 7. Overlay Manager

Autoridade proposta:

```text
Doke.overlayManager
```

### 7.1 API mínima

```text
register(definition)
open(id, options)
close(instanceId, options)
closeTop(options)
closeAll(options)
replaceTop(id, options)
getStack()
isOpen(id)
```

### 7.2 Definição de overlay

```text
{
  id,
  kind,
  element,
  initialFocus,
  focusScope,
  closeOnEscape,
  closeOnBackdrop,
  lockScroll,
  historyMode,
  deepLink,
  onBeforeOpen,
  onOpen,
  onBeforeClose,
  onClose,
  resolveResult
}
```

### 7.3 Tipos permitidos

```text
modal
drawer
lightbox
fullscreen-preview
sheet
popover
```

Popover não modal não deverá adquirir focus trap ou scroll lock por padrão.

---

## 8. Lifecycle de abertura

```text
request open
→ validar definição
→ capturar trigger e entryKey
→ fechar conflitos incompatíveis
→ registrar instance na stack
→ sincronizar URL, se aplicável
→ adquirir scroll lock
→ aplicar inert ao fundo
→ revelar superfície
→ executar initialFocus
→ ativar focus trap
→ anunciar abertura
```

### 8.1 Regras de trigger

O trigger deverá ser capturado nesta ordem:

```text
options.trigger
→ document.activeElement
→ null
```

Também deverá ser armazenada uma chave resiliente:

```text
focusReturnKey
```

Exemplo:

```text
service-card:service-123
worker-card:vid-pintura
publication-card:case-kitchen
help-trigger:global
```

---

## 9. Lifecycle de fechamento

```text
request close
→ verificar top da stack
→ desativar focus trap
→ executar cleanup interno
→ pausar mídia
→ resolver Promise
→ remover da stack
→ sincronizar histórico
→ liberar inert
→ liberar scroll lock
→ restaurar foco ou delegar foco à rota
→ anunciar fechamento
```

### 9.1 Motivos de fechamento

```text
confirm
cancel
escape
backdrop
back
route-change
programmatic
parent-close
error
```

O motivo deverá estar disponível para analytics e QA, sem incluir dados pessoais.

---

## 10. Política de foco

### 10.1 Foco inicial

Prioridade:

```text
options.initialFocus
→ definition.initialFocus
→ primeiro campo inválido
→ primeiro controle primário
→ botão fechar
→ superfície com tabindex=-1
```

### 10.2 Focus trap

Focusable mínimo:

```text
a[href]
button:not([disabled])
input:not([disabled])
select:not([disabled])
textarea:not([disabled])
[tabindex]:not([tabindex="-1"])
```

Excluir:

```text
[hidden]
[aria-hidden="true"]
[inert]
visibility:hidden
display:none
```

### 10.3 Retorno de foco

#### Fechamento normal

```text
restoreFocus = true
```

#### Fechamento por rota

```text
restoreFocus = false
```

A rota destino aplicará seu próprio foco de chegada.

#### Trigger removido

Usar fallback definido em `focusReturnKey`.

---

## 11. Política de scroll lock

Autoridade proposta:

```text
Doke.overlayManager.scrollLock
```

### 11.1 Requisitos

- lock por referência;
- somente o primeiro overlay captura scroll;
- overlays aninhados incrementam contador;
- somente o último fechamento libera;
- timers de restauração devem ser canceláveis;
- fechamento por rota não restaura a posição anterior;
- safe areas mobile preservadas;
- não sobrescrever estilos inline não pertencentes ao manager.

### 11.2 Estado

```text
lockCount
capturedY
capturedX
ownerInstances
strategy
pendingRestoreTask
```

---

## 12. Histórico de overlays

### 12.1 Modos

```text
none
replace
push
```

### 12.2 Exemplos

#### Alert simples

```text
historyMode = none
```

#### Worker preview

```text
historyMode = push
```

#### Troca de Worker dentro do preview

```text
historyMode = replace
```

#### Publicação

```text
historyMode = push
```

#### Lightbox da galeria de detalhe

```text
historyMode = push
```

### 12.3 Back

Quando o estado atual contém overlay:

```text
history.back()
→ overlayManager reconcilia URL
→ fecha apenas o topo
→ não troca a rota
```

### 12.4 Forward

Quando a entrada futura contém overlay válido:

```text
history.forward()
→ resolver entidade
→ reabrir overlay
→ restaurar subestado permitido
```

Mídia não deverá autoplay automaticamente após Forward sem respeitar preferências e políticas.

---

## 13. Deep links

### 13.1 Worker

```text
/index.html?overlay=worker&overlayId=vid-pintura
```

### 13.2 Publicação

```text
/index.html?overlay=publication&overlayId=case-kitchen
```

### 13.3 Lightbox

```text
/detalhe-anuncio.html?id=service-123&overlay=gallery&media=2
```

### 13.4 Entidade inválida

```text
remover parâmetros por replaceState
→ manter página
→ mostrar feedback não bloqueante
```

Nunca abrir fixture desconhecida como se fosse conteúdo canônico.

---

## 14. Foco após navegação

### 14.1 Navegação normal

```text
commit route
→ reset scroll
→ focus route target
→ announce route
→ hydrate
```

### 14.2 Popstate restore

```text
commit route
→ restore scroll por entryKey
→ focus route target sem alterar scroll
→ announce restored route
```

### 14.3 Navegação iniciada dentro de overlay

Exemplo:

```text
Worker preview
→ Ver serviço
→ detalhe do anúncio
```

Fluxo:

```text
closeAll(reason=route-change, restoreFocus=false, restoreScroll=false)
→ navigate
→ focus heading do detalhe
```

### 14.4 Mesma página com mudança de filtros

Não focar o heading principal automaticamente a cada filtro.

Manter foco no controle de aplicação e anunciar:

```text
18 resultados encontrados.
```

---

## 15. Scroll restoration por entryKey

### 15.1 Estado de history

```text
{
  dokeStableShell: true,
  href,
  dokeEntryKey,
  overlay
}
```

### 15.2 Captura

Capturar antes de:

- push de nova rota;
- replace técnico que preserve entryKey;
- abrir overlay com push;
- fechar overlay via back;
- navegação nativa controlada.

### 15.3 Replace

Normalizações técnicas deverão preservar `dokeEntryKey`.

### 15.4 Limite

Manter política de retenção limitada, com remoção das entradas mais antigas.

---

## 16. Integração com stable shell

### 16.1 Antes de `replaceShell`

```text
await overlayManager.closeAll({
  reason: "route-change",
  immediate: true,
  restoreFocus: false,
  restoreScroll: false
})
```

### 16.2 Depois de `replaceShell`

```text
overlayManager.reconcileDocument()
```

Isso deverá:

- remover registros de elementos desconectados;
- registrar overlays presentes na rota nova;
- garantir stack vazia;
- garantir lockCount zero;
- garantir ausência de inert órfão.

### 16.3 Depois de scroll

```text
routeFocusManager.focusArrivalTarget()
routeAnnouncer.announce()
```

### 16.4 Em erro de rota

O foco deverá ir para o feedback de erro da rota, não para um elemento invisível.

---

## 17. Overlays aninhados

### 17.1 Comentários de Worker

No mobile, comentários funcionam como sub-sheet.

Contrato:

```text
Escape 1
→ fecha comentários

Escape 2
→ fecha Worker
```

### 17.2 Comentários de Publicação

Mesmo comportamento.

### 17.3 Dialog sobre drawer

Permitido apenas se registrado como filho.

```text
parentInstanceId
```

Fechar parent fecha filhos primeiro.

### 17.4 Lightbox sobre modal

Evitar quando a mesma mídia pode ser visualizada no modal.

Se necessário:

- lightbox vira topo;
- parent permanece inert;
- Escape fecha somente lightbox;
- foco retorna ao controle de mídia no parent.

---

## 18. Acessibilidade

### 18.1 Modalidade

Overlay modal:

```text
role="dialog"
aria-modal="true"
aria-labelledby
aria-describedby quando aplicável
```

### 18.2 Background

Aplicar `inert` na raiz da rota e shell interativo que não pertença ao overlay.

Não depender apenas de `aria-hidden`.

### 18.3 Teclado

Obrigatório:

- `Tab` contido;
- `Shift+Tab` contido;
- `Escape` somente no topo;
- setas apenas quando documentadas;
- `Enter` não confirmar dialogs enquanto foco está em textarea;
- Space não rolar a página quando ativa card-button.

### 18.4 Reduced motion

Com `prefers-reduced-motion: reduce`:

- abertura imediata ou curta;
- fechamento imediato;
- sem zoom intenso;
- sem smooth scroll obrigatório;
- foco não deve aguardar animação longa.

### 18.5 Live region

Região canônica:

```text
[data-doke-route-announcer]
aria-live="polite"
aria-atomic="true"
```

Erros bloqueantes poderão usar `assertive` localmente.

---

## 19. Comportamento por superfície

### 19.1 Service card → detalhe

- card inteiro não deve ser um botão se contém favorito e CTA;
- título/mídia podem ser links;
- CTA é link principal;
- favorito não navega;
- foco após chegada vai para heading do detalhe;
- Voltar restaura a entrada e posição do card.

### 19.2 Service card → perfil

A identidade do profissional só será link quando existir ID público resolvível.

### 19.3 Worker preview

- abertura por click, Enter ou Space;
- URL representada;
- foco no overlay;
- Back fecha preview;
- link interno navega sem retornar foco à Home;
- fechamento normal retorna ao card;
- vídeo pausado no fechamento;
- comments sheet tratado como filho.

### 19.4 Publicação

Mesmo contrato do Worker, com subestado de mídia e comentários.

### 19.5 Help drawer

- sem deep link obrigatório;
- foco inicial na busca;
- backdrop e Escape fecham;
- retorno ao trigger;
- se navegar para Central de Ajuda, fechar por route-change.

### 19.6 Media lightbox

- Back fecha antes de sair do detalhe;
- setas não alteram rota;
- índice pode usar replaceState;
- retorno à imagem acionadora;
- foco contido.

### 19.7 System dialog

- sem entrada de histórico;
- fila preservada;
- cancelamento por rota resolve Promise;
- foco contido;
- não confirmar por Enter dentro de textarea.

---

## 20. Estados

### 20.1 Overlay

```text
CLOSED
OPENING
OPEN
CLOSING
INTERRUPTED
ERROR
```

### 20.2 Navegação

```text
IDLE
PENDING
COMMITTED
READY
EMPTY
ERROR
RESTORING
```

### 20.3 Focus

```text
IDLE
CAPTURED
TRAPPED
RESTORING
ARRIVED
FAILED_SAFE
```

### 20.4 Scroll lock

```text
UNLOCKED
LOCKING
LOCKED
RELEASING
CANCELLED_FOR_ROUTE
```

---

## 21. Eventos canônicos

```text
doke:overlay-opening
doke:overlay-opened
doke:overlay-closing
doke:overlay-closed
doke:overlay-stack-change
doke:route-focus-arrived
doke:route-announced
doke:scroll-lock-change
```

Payload mínimo:

```text
{
  instanceId,
  overlayId,
  kind,
  entityId,
  reason,
  depth,
  routeEntryKey
}
```

Não incluir texto digitado, mensagens, e-mail, telefone ou conteúdo privado.

---

## 22. Matriz de QA

### QA-NAV-001 — rota por mouse

1. abrir Home;
2. rolar até um anúncio;
3. clicar em Ver anúncio;
4. confirmar foco no heading do detalhe;
5. usar Voltar;
6. confirmar posição e card restaurados.

### QA-NAV-002 — rota por teclado

1. focar CTA;
2. pressionar Enter;
3. confirmar troca de rota;
4. confirmar foco de chegada;
5. confirmar ausência de foco na sidebar antiga.

### QA-NAV-003 — Worker por teclado

1. focar card;
2. pressionar Space;
3. confirmar foco dentro do preview;
4. pressionar Tab repetidamente;
5. confirmar contenção;
6. pressionar Escape;
7. confirmar retorno ao card.

### QA-NAV-004 — Worker e Back

1. abrir Worker;
2. confirmar query de overlay;
3. pressionar Voltar;
4. confirmar fechamento sem sair da Home;
5. pressionar Avançar;
6. confirmar reabertura.

### QA-NAV-005 — Worker → serviço

1. abrir Worker;
2. clicar em Ver serviço;
3. confirmar fechamento sem retorno ao card;
4. confirmar rota detalhe;
5. confirmar scroll no topo;
6. confirmar foco no heading.

### QA-NAV-006 — Publicação comments sheet

1. abrir publicação;
2. abrir comentários mobile;
3. pressionar Escape;
4. confirmar somente comentários fechados;
5. pressionar Escape novamente;
6. confirmar fechamento da publicação.

### QA-NAV-007 — Lightbox

1. abrir galeria;
2. abrir lightbox;
3. navegar com setas;
4. confirmar foco contido;
5. pressionar Back;
6. confirmar retorno ao detalhe;
7. confirmar foco na mídia acionadora.

### QA-NAV-008 — Help drawer

1. abrir por teclado;
2. confirmar foco na busca;
3. usar Shift+Tab;
4. confirmar wrap para último controle;
5. fechar por backdrop;
6. confirmar retorno ao trigger.

### QA-NAV-009 — Dialog e rota

1. abrir dialog Promise-based;
2. disparar navegação por ação permitida;
3. confirmar resolução `route-change`;
4. confirmar fila não bloqueada;
5. abrir novo dialog na rota destino.

### QA-NAV-010 — trigger removido

1. abrir overlay;
2. simular rerender que remove trigger;
3. fechar overlay;
4. confirmar foco no fallback seguro;
5. confirmar ausência de exceção.

### QA-NAV-011 — entradas iguais de URL

1. abrir Resultados;
2. rolar posição A;
3. navegar ao detalhe;
4. voltar;
5. rolar posição B;
6. navegar novamente;
7. voltar;
8. confirmar posição B para a entrada correta.

### QA-NAV-012 — rota durante timer de scroll

1. abrir Worker em posição profunda;
2. navegar ao detalhe;
3. aguardar 500 ms;
4. confirmar ausência de salto tardio.

### QA-NAV-013 — dois overlays

1. abrir drawer;
2. abrir dialog filho;
3. pressionar Escape;
4. confirmar somente dialog fechado;
5. pressionar Escape;
6. confirmar drawer fechado.

### QA-NAV-014 — popstate com overlay inválido

1. acessar URL com `overlayId` inexistente;
2. confirmar limpeza por replaceState;
3. confirmar página utilizável;
4. confirmar feedback não bloqueante.

### QA-NAV-015 — reduced motion

1. ativar redução de movimento;
2. abrir e fechar overlays;
3. confirmar ausência de animação longa;
4. confirmar foco imediato.

### QA-NAV-016 — leitor de tela

1. abrir dialog;
2. confirmar nome e descrição;
3. confirmar fundo indisponível;
4. fechar;
5. confirmar retorno de contexto.

### QA-NAV-017 — rota com erro

1. provocar falha de carregamento;
2. confirmar foco no estado de erro;
3. confirmar anúncio do erro;
4. acionar retry por teclado.

### QA-NAV-018 — hard load em deep link

1. abrir diretamente Worker por URL;
2. carregar Home;
3. hidratar entidade;
4. abrir overlay somente após estrutura pronta;
5. manter foco e scroll coerentes.

### QA-NAV-019 — refresh com lightbox

1. abrir lightbox representada em URL;
2. atualizar página;
3. resolver serviço e índice;
4. abrir lightbox;
5. fallback seguro se mídia ausente.

### QA-NAV-020 — mobile browser chrome

1. abrir sheet em viewport móvel;
2. alterar altura visual do navegador;
3. confirmar superfície dentro de `dvh`;
4. confirmar botão fechar acessível;
5. confirmar safe area inferior.

---

## 23. Handoffs futuros

### UX-HANDOFF-006A — Overlay Manager core

Arquivos candidatos:

```text
assets/js/core/overlay-manager.js
assets/css/components/overlays/overlay-runtime-contract.css
```

Entregas:

- stack;
- registro;
- open/close;
- focus trap;
- inert;
- scroll lock;
- eventos.

### UX-HANDOFF-006B — integração stable shell

Arquivos candidatos:

```text
assets/js/core/stable-shell-router.js
assets/js/core/navigation-lifecycle.js
```

Entregas:

- closeAll antes da rota;
- entryKey;
- foco de chegada;
- announcer;
- reconciliação após swap.

### UX-HANDOFF-006C — system dialogs

Migrar:

```text
assets/js/ui/system-dialog.js
assets/js/components/issue-report-dialog.js
assets/js/components/decline-reason-dialog.js
```

### UX-HANDOFF-006D — previews da Home

Migrar:

```text
assets/js/pages/home/workers.js
assets/js/pages/home/before-after.js
```

Incluir deep links e histórico.

### UX-HANDOFF-006E — drawers e lightbox

Migrar:

```text
assets/js/components/help/help-drawer.js
assets/js/components/media-lightbox.js
filtros Home
filtros Resultados
mobile drawer
```

### UX-HANDOFF-006F — scroll por history entry

Substituir chave URL-only por entryKey.

### UX-HANDOFF-006G — route focus e announcer

Criar:

```text
Doke.routeFocusManager
Doke.routeAnnouncer
```

### UX-HANDOFF-006H — testes automatizados

Cobrir:

- teclado;
- focus trap;
- Back e Forward;
- deep links;
- scroll restoration;
- rota durante overlay;
- trigger desconectado;
- reduced motion.

---

## 24. Ordem recomendada de implementação

```text
1. Overlay Manager core
2. stable shell integration
3. route focus + announcer
4. system dialog migration
5. Worker/Publicação migration
6. drawers/lightbox migration
7. entryKey scroll restoration
8. testes cumulativos
```

Não migrar todos os overlays simultaneamente.

Cada migração deverá manter adapter temporário e teste de regressão.

---

## 25. Critérios de aceite globais

A implementação só poderá ser considerada concluída quando:

- existir uma única stack de overlays;
- somente o topo responder a Escape;
- todo modal possuir focus trap;
- background modal estiver inert;
- scroll lock tiver uma única autoridade;
- rota fechar overlays pelo lifecycle;
- Promises forem resolvidas em route-change;
- foco nunca retornar a nó desconectado;
- nova rota receber foco de chegada;
- Back fechar previews antes de sair da página;
- Forward reabrir previews válidos;
- scroll for restaurado por entryKey;
- timers de overlay não alterarem scroll da rota nova;
- deep links inválidos falharem com segurança;
- nenhuma página criar uma segunda autoridade global.

---

## 26. Fora de escopo deste sublote

- implementação dos componentes;
- alteração visual dos overlays;
- alteração de backend;
- persistência remota de estado de preview;
- analytics de produção;
- mudança de rotas públicas;
- staging;
- produção;
- merge do PR.

---

## 27. Resultado esperado no produto

Depois dos handoffs:

- Voltar fechará Worker e Publicação antes de sair da Home;
- overlays poderão ser compartilhados por URL quando fizer sentido;
- teclado ficará contido no modal;
- foco retornará ao lugar correto;
- navegação para detalhe não sofrerá salto tardio de scroll;
- dialogs não ficarão pendurados após mudança de página;
- drawers abrirão com foco útil;
- rota nova será anunciada e receberá foco consistente;
- stable shell e overlays usarão o mesmo lifecycle;
- cada entrada de histórico preservará sua própria posição;
- futuras telas e o aplicativo poderão reutilizar o mesmo contrato.

---

## 28. Próximo sublote recomendado

`UX-FOUNDATION-007 — contrato de formulários, validação, erros e confirmação de ações`.

O próximo documento deverá cobrir:

- validação por campo;
- validação de formulário;
- mensagens de erro;
- foco no primeiro erro;
- estados submitting/success/error;
- prevenção de duplo envio;
- confirmação de ações destrutivas;
- preservação de rascunho;
- autofill;
- acessibilidade de selects e textareas;
- formulários mobile;
- integração com auth e autoridade remota.
