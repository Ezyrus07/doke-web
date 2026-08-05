# UX-RESP-001 — Breakpoint registry, viewport contracts e contenção de overflow

## Status

- Frente: `UX-IMPLEMENTATION`;
- Sublote: `UX-RESP-001`;
- Branch: `ux/ux-resp-001-viewport-overflow`;
- Base: `ux/ux-a11y-001-keyboard-landmarks`;
- Fonte: `UX-FOUNDATION-010`, `011`, `012`, `015` e `018`;
- Issue: `#56`;
- Runtime alterado: sim, progressivamente;
- HTML alterado: não;
- Backend/migrations: não;
- Staging/produção: não;
- Merge/ready: não autorizados.

---

## 1. Objetivo

Criar a autoridade:

```text
Doke.responsiveExperience
```

para responder, de forma única e observável:

```text
qual espaço de layout existe?
qual área visual permanece?
qual modo estrutural está ativo?
há teclado virtual cobrindo a superfície?
há overflow horizontal real?
qual boundary é responsável?
```

Este sublote não redesenha todas as páginas nem substitui todas as shells em um único PR.

---

## 2. Causa raiz

A base usa vários limites estruturais:

```text
560
600
760
768
1024
1200
```

Também existiam interpretações incompatíveis:

```text
responsive-interaction-guard
→ mobile até 560

app-state
→ mobile até 760

tablet
→ sem estado canônico
```

Breakpoints de microajuste podem continuar locais.

O problema é usar limites diferentes para escolher shell, navegação, sidebar, offsets e modo de produto.

---

## 3. Estratégia progressiva

```text
registry transversal
→ datasets e CSS variables
→ piloto
→ adapters
→ expansão por superfície
→ remoção dos thresholds estruturais legados
```

A migração é progressiva porque shells são arquivos de alto conflito e um replace global teria blast radius incompatível com este sublote.

---

## 4. Breakpoints canônicos

Versão:

```text
responsive-breakpoints-v1
```

Manifesto:

```text
microMax: 359
compactMax: 600
mediumMax: 1024
wideMin: 1025
expandedMin: 1200
```

Classificação:

```text
0–359     → COMPACT + MICRO
360–600   → COMPACT
601–1024  → MEDIUM
1025+     → WIDE
1200+     → WIDE + EXPANDED
```

`MICRO` e `EXPANDED` são modificadores, não novas shells.

---

## 5. Snapshot

```text
ResponsiveSnapshot
├── sequence
├── version
├── breakpointVersion
├── reason
├── timestamp
├── layoutViewport
│   ├── width
│   └── height
├── visualViewport
│   ├── available
│   ├── width
│   ├── height
│   ├── offsetTop
│   ├── offsetLeft
│   └── scale
├── layoutMode
├── densityMode
├── micro
├── expanded
├── inputMode
├── hoverCapability
├── orientation
├── keyboardState
├── keyboardInset
├── safeArea
├── reducedMotion
└── reducedTransparency
```

O snapshot não contém conta, rota privada, texto digitado ou identificadores de entidade.

---

## 6. Layout viewport

Fonte preferencial:

```text
document.documentElement.clientWidth
document.documentElement.clientHeight
```

Fallback:

```text
window.innerWidth
window.innerHeight
```

A autoridade não usa `screen.width`, `max-device-width` nem user-agent para escolher layout.

---

## 7. Visual viewport

Quando disponível:

```text
window.visualViewport
```

São preservados `width`, `height`, offsets e `scale`.

Quando indisponível:

```text
visualViewport.available = false
```

e o layout viewport é usado como fallback explícito.

---

## 8. Teclado virtual

Estados:

```text
CLOSED
OPENING
OPEN
CLOSING
UNKNOWN
```

A heurística exige:

```text
visualViewport disponível
+
elemento editável focado
+
redução material da área visual
```

Threshold:

```text
max(150px, 18% da altura)
```

Um resize isolado não declara teclado aberto.

---

## 9. Input e orientação

Input:

```text
TOUCH
POINTER
MIXED
KEYBOARD_ONLY
UNKNOWN
```

Orientação:

```text
PORTRAIT
LANDSCAPE
SQUARE
```

Touch capability não define sozinha a shell.

---

## 10. Datasets

No `documentElement`:

```text
data-doke-responsive-version
data-doke-breakpoint-version
data-doke-layout-mode
data-doke-density-mode
data-doke-orientation
data-doke-input-mode
data-doke-keyboard-state
data-doke-viewport-micro
data-doke-viewport-expanded
data-doke-overflow-state
data-doke-overflow-count
```

---

## 11. CSS variables

```text
--doke-layout-viewport-width
--doke-layout-viewport-height
--doke-visual-viewport-width
--doke-visual-viewport-height
--doke-visual-viewport-offset-top
--doke-visual-viewport-offset-left
--doke-visual-viewport-scale
--doke-keyboard-inset
--doke-safe-area-top
--doke-safe-area-right
--doke-safe-area-bottom
--doke-safe-area-left
--doke-visible-viewport-height
```

Nenhuma variável bloqueia zoom.

---

## 12. Safe area

Um probe invisível usa:

```text
env(safe-area-inset-top)
env(safe-area-inset-right)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
```

Valores indisponíveis resultam em zero, sem fabricação.

---

## 13. Overflow audit

A auditoria observa:

1. `documentElement`;
2. `[data-responsive-boundary]`;
3. boundaries registrados pela API.

Critério:

```text
scrollWidth > clientWidth + 2px
```

Resultado sanitizado:

```text
state
rootOverflow
boundaryCount
overflowCount
reason
```

Nenhum texto ou payload do node é emitido.

---

## 14. Correção proibida

Não foi usado:

```css
html,
body {
  overflow-x: hidden;
}
```

Ocultar overflow globalmente mascararia a causa.

A autoridade detecta primeiro e contém apenas nodes explicitamente registrados.

---

## 15. Boundary opt-in

API:

```text
registerBoundary(node, options)
```

Opções:

```text
id
containInline
scrollX
label
```

`containInline` aplica:

```text
min-inline-size: 0
max-inline-size: 100%
```

`scrollX` cria região rolável explícita, focável e nomeada pelo consumidor.

A autoridade não inventa labels.

---

## 16. Piloto em Novidades

Boundaries:

```text
news-page
news-layout
news-grid
news-filters
```

A página recebe:

```text
data-doke-responsive-pilot="novidades"
```

O piloto:

- permite que filhos de grid encolham;
- impede cards de impor largura maior que o container;
- torna filtros horizontalmente roláveis;
- usa uma coluna em `COMPACT` e `MEDIUM`;
- permite foco na região de filtros;
- audita overflow.

Conteúdo e identidade visual não foram alterados.

---

## 17. App State

Ponte de compatibilidade:

```text
COMPACT → ui.viewport = mobile
MEDIUM  → ui.viewport = tablet
WIDE    → ui.viewport = desktop
```

Também são publicados:

```text
ui.layoutMode
ui.orientation
ui.keyboardState
```

---

## 18. Bootstrap

`page-bootstrap.js` carrega:

```text
assets/css/core/responsive-experience.css
assets/js/core/responsive-experience.js
```

Falha do módulo:

- não derruba auth guard;
- não bloqueia a página;
- preserva guards legados;
- emite warning técnico.

Readiness:

```text
responsiveExperienceReady
```

---

## 19. Eventos e API

Eventos:

```text
doke:responsive-ready
doke:responsive-change
doke:responsive-overflow-audit
```

API:

```text
version
breakpointVersion
breakpoints
layoutModes
inputModes
keyboardStates
overflowStates
orientations
classify()
getLayoutViewport()
getVisualViewport()
getSnapshot()
sync()
scheduleSync()
auditOverflow()
registerBoundary()
subscribe()
applyNewsPilot()
```

Enums e breakpoints são congelados.

---

## 20. Observação e performance

São observados:

- resize;
- orientationchange;
- pageshow;
- visualViewport resize/scroll;
- navigation lifecycle;
- ResizeObserver;
- MutationObserver.

Sincronização e auditoria são agrupadas por `requestAnimationFrame`.

---

## 21. Legado ainda não migrado

Este PR não declara migração global concluída.

Ainda precisam migrar:

```text
shell-state-early.js
mobile-app-shell.js
mobile-drawer-standard.js
responsive-interaction-guard.js
media queries estruturais de 560/760/768/1200
guards específicos de iPad
páginas com overflow próprio
```

A nova autoridade torna essa migração mensurável; ela não finge que já aconteceu.

---

## 22. Gates

Breakpoint:

```text
359 → COMPACT + MICRO
360 → COMPACT
600 → COMPACT
601 → MEDIUM
1024 → MEDIUM
1025 → WIDE
1200 → WIDE + EXPANDED
```

Viewport:

- layout usa `clientWidth`;
- visual viewport é separado;
- scale é preservado;
- fallback é explícito.

Overflow:

- root e boundaries são auditados;
- sem leitura de conteúdo;
- sem `overflow-x: hidden`;
- contenção apenas opt-in.

Acessibilidade:

- scroll explícito é focável;
- região recebe nome fornecido;
- zoom permanece disponível;
- reduced motion e forced colors são preservados.

Regressões:

- UX-A11Y-001;
- UX-NAV-001;
- UX-PRIV-001;
- UX-CONT-001;
- UX-CORE-002;
- UX-CORE-001;
- navigation lifecycle;
- auth/session.

---

## 23. Rollback

1. remover `responsive-experience.js`;
2. remover `responsive-experience.css`;
3. restaurar `page-bootstrap.js` ao head do UX-A11Y-001;
4. remover teste, workflow e documento.

Nenhum schema, storage ou dado remoto precisa ser revertido.

---

## 24. Restrições preservadas

- nenhum HTML;
- nenhum backend;
- nenhuma migration;
- sem staging;
- sem produção;
- sem merge;
- sem ready;
- sem analytics de usuário;
- sem user-agent;
- sem bloqueio de zoom;
- sem `!important`;
- sem `overflow-x: hidden`;
- pagamentos, carteira, pedidos, mensagens, KYC e Trust & Safety intocados.

---

## 25. Resultado

A Doke passa a ter uma fonte de verdade para:

```text
layout mode
visual viewport
orientation
input capability
virtual keyboard estimate
safe area
overflow audit
```

O benefício imediato é impedir corte lateral silencioso no piloto de Novidades.

O benefício estrutural é permitir que futuras shells e páginas consumam o mesmo contrato.

---

## 26. Próximo sublote

```text
UX-PERF-001
— loading lifecycle, hydration budget
  e progressive rendering
```
