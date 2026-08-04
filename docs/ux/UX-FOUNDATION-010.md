# UX-FOUNDATION-010 — Responsividade transversal, zoom, densidade e touch targets

## Status

- Frente: `UX-FOUNDATION`
- Sublote: `010`
- Natureza: especificação de Produto, UX, acessibilidade, design responsivo e QA
- Branch: `ux/ux-foundation-001`
- Escopo desta entrega: documentação somente
- Runtime alterado: não
- HTML alterado: não
- CSS alterado: não
- JavaScript alterado: não
- Staging acessado: não
- Produção acessada: não
- Merge autorizado: não
- Head lógico principal inspecionado: `fe1c8cc55012db0c3e44cefd22135eeb25a6dfc6`
- Head UX anterior: `c530ebdca062b84194e58bb79569f11aa059272c`
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-009`

---

## 1. Objetivo

Definir o contrato responsivo transversal da Doke para que todas as superfícies:

- respondam ao espaço realmente disponível;
- funcionem com zoom de navegador;
- funcionem com texto ampliado;
- preservem conteúdo em viewports estreitos;
- tenham touch targets previsíveis;
- tratem teclado virtual sem cobrir campos ou CTAs;
- respeitem safe areas;
- preservem foco, estado e scroll durante mudança de orientação;
- não dependam de user-agent para escolher a anatomia principal;
- não precisem de correções globais específicas para um único dispositivo;
- apresentem a mesma experiência depois de carregamento direto, F5 e navegação interna;
- mantenham a autoridade visual da Home sem congelar dimensões incompatíveis com acessibilidade.

Este documento não implementa alterações no produto.

---

## 2. Superfícies auditadas

A auditoria documental considerou principalmente:

- `index.html`;
- `assets/css/core/tokens.css`;
- `assets/css/components/ui/doke-ui-system.css`;
- `assets/css/components/shell/app-shell.css`;
- `assets/css/components/shell/mobile-app-shell.css`;
- `assets/css/components/panels/mobile-panel.css`;
- `assets/css/components/internal/chat-workspace-contract.css`;
- `assets/css/layout/page-rail-authority.css`;
- `assets/css/pages/home/mobile-composition.css`;
- `assets/css/pages/pagamento-profissional.css`;
- `assets/js/core/shell-state-early.js`;
- `assets/js/core/ipad-safari-early-guard.js`;
- `assets/js/core/ipad-safari-scroll-guard.js`;
- `assets/js/ui/responsive-interaction-guard.js`;
- `assets/js/components/mobile-app-shell.js`;
- contratos anteriores de cards, overlays, formulários, conteúdo e notificações.

A especificação se aplica também a:

- Home;
- Resultados;
- Detalhe do anúncio;
- Pedidos;
- Mensagens;
- Comunidades;
- Notificações;
- Carteira;
- Pagamento;
- Perfil;
- Configurações;
- onboarding;
- autenticação;
- modais;
- drawers;
- popovers;
- tabelas;
- aplicativo futuro.

---

## 3. Causa raiz

A Doke possui várias correções responsivas úteis, mas elas foram adicionadas em momentos e autoridades diferentes.

O sistema atual combina:

```text
media queries locais
+
media queries compartilhadas
+
matchMedia em múltiplos arquivos
+
variáveis calculadas com innerHeight
+
visualViewport em guards específicos
+
detecção de user-agent
+
styles inline com !important
+
correções específicas para iPad
```

Isso produz uma arquitetura que reage ao dispositivo detectado, mas nem sempre ao espaço disponível.

Os principais sintomas são:

- CSS e JavaScript discordando sobre quando o shell mobile existe;
- uma faixa intermediária sem autoridade clara;
- controles que cabem no layout normal, mas falham com texto ampliado;
- `overflow-x: hidden` escondendo conteúdo que deveria reflowar;
- `100dvh` combinado com `overflow: hidden` em superfícies com teclado;
- touch targets menores que o contrato desejado;
- inputs abaixo de 16px em contexto mobile;
- safe-area tratada parcialmente;
- offsets fixos duplicando a altura do bottom nav;
- focus rings removidos;
- regras globais de iPad alterando eventos de toda a aplicação.

A causa raiz não é uma página isolada.

A causa raiz é a ausência de uma autoridade transversal que defina:

```text
modo de layout
viewport visual
viewport de layout
teclado virtual
safe area
input mode
orientação
zoom/reflow
alvos de interação
```

---

## 4. Estado positivo já existente

A auditoria confirmou bases úteis que devem ser preservadas.

### 4.1 Meta viewport não bloqueia zoom

O `index.html` observado usa:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Não foi observado bloqueio explícito com:

```text
user-scalable=no
maximum-scale=1
```

Regra:

- preservar a capacidade de zoom;
- nunca introduzir bloqueio de zoom;
- avaliar `viewport-fit=cover` somente junto com o contrato completo de safe area.

### 4.2 Rails possuem uma autoridade compartilhada

`page-rail-authority.css` já tenta alinhar:

- header;
- conteúdo;
- páginas internas;
- formulários;
- Home;
- Resultados;
- tablet;
- desktop.

Essa autoridade deve ser evoluída, não substituída por outra local.

### 4.3 Existem tokens de controle

A base já possui tokens de altura e espaçamento.

Exemplos observados:

```text
control-height-sm
control-height-md
control-height-lg
```

O problema não é ausência total de tokens.

O problema é existirem:

- tokens globais;
- tokens mobile paralelos;
- valores literais locais;
- variantes menores sem política de touch target.

### 4.4 Safe areas já são consideradas em alguns componentes

Foram observados usos de:

```text
env(safe-area-inset-top)
env(safe-area-inset-right)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
```

A evolução deverá centralizar a política e remover offsets concorrentes.

### 4.5 `100dvh` já aparece no código

A base reconhece o problema histórico de `100vh` em browsers móveis.

Porém, `100dvh` sozinho não resolve:

- teclado virtual;
- visual viewport deslocado;
- composer fixo;
- mudança de orientação;
- scroll interno concorrente.

### 4.6 Reduced motion possui cobertura parcial

Existem ocorrências de `prefers-reduced-motion` em componentes e transições.

A futura implementação deverá transformar essa cobertura parcial em requisito transversal.

---

## 5. Matriz de breakpoints observada

A inspeção encontrou limites como:

```text
380px
390px
560px
600px
608px
760px
767px
768px
769px
961px
1024px
1025px
1100px
1180px
1200px
```

Esses valores podem ser legítimos para detalhes locais.

Eles não podem representar autoridades concorrentes para:

- qual shell está ativo;
- qual navegação está ativa;
- se a sidebar existe;
- se a página é mobile, tablet ou desktop;
- se um overlay é modal;
- se uma coluna deve desaparecer.

Contrato:

```text
breakpoint estrutural
→ definido uma vez

breakpoint de densidade
→ pode ser local, mas não troca autoridade estrutural

breakpoint de microajuste
→ não cria DOM alternativo nem lifecycle novo
```

---

## 6. Modelo canônico de responsividade

Autoridade proposta:

```text
Doke.responsiveExperience
```

Snapshot conceitual:

```text
ResponsiveSnapshot
├── layoutViewport
│   ├── width
│   └── height
├── visualViewport
│   ├── width
│   ├── height
│   ├── offsetTop
│   ├── offsetLeft
│   └── scale
├── layoutMode
├── densityMode
├── inputMode
├── hoverCapability
├── orientation
├── keyboardState
├── safeArea
├── reducedMotion
├── reducedTransparency
└── timestamp
```

### 6.1 layoutViewport

Representa o viewport usado pelo layout CSS.

Fonte preferencial:

```text
document.documentElement.clientWidth
window.innerWidth como fallback
```

### 6.2 visualViewport

Representa a área realmente visível depois de:

- teclado virtual;
- zoom;
- chrome móvel;
- pan do viewport visual.

Fonte:

```text
window.visualViewport
```

Quando indisponível:

```text
layoutViewport
```

### 6.3 layoutMode

Valores canônicos:

```text
COMPACT
MEDIUM
WIDE
```

### 6.4 densityMode

Valores:

```text
COMFORTABLE
COMPACT
```

Densidade não altera touch target mínimo.

### 6.5 inputMode

Valores:

```text
TOUCH
POINTER
MIXED
KEYBOARD_ONLY
```

A presença de pointer coarse não deve definir sozinha o shell.

### 6.6 keyboardState

Valores:

```text
CLOSED
OPENING
OPEN
CLOSING
UNKNOWN
```

### 6.7 safeArea

```text
safeArea.top
safeArea.right
safeArea.bottom
safeArea.left
```

O snapshot não precisa ler `env()` diretamente em JavaScript quando CSS puder resolver.

Ele deve oferecer uma ponte somente para componentes que realmente precisam de coordenação de lifecycle.

---

## 7. Modos canônicos de layout

### 7.1 COMPACT

Faixa inicial proposta:

```text
até 600 CSS px de inline-size disponível
```

Características:

- uma coluna principal;
- shell compacto;
- bottom navigation quando aplicável;
- overlays em drawer ou full-screen;
- CTAs empilhados quando necessário;
- filtros em uma coluna;
- cards com largura derivada do container;
- sem sidebar persistente;
- touch targets confortáveis.

### 7.2 MEDIUM

Faixa inicial proposta:

```text
601 a 1024 CSS px
```

Características:

- shell de tablet explícito;
- nenhuma dependência de fallback de iPad;
- sidebar em drawer ou rail compacto conforme a superfície;
- duas colunas somente quando o conteúdo couber;
- dialogs centralizados com largura limitada;
- headers capazes de quebrar linha;
- navegação não pode desaparecer sem substituta.

### 7.3 WIDE

Faixa inicial proposta:

```text
1025 CSS px ou mais
```

Características:

- sidebar persistente quando aplicável;
- header desktop;
- múltiplas colunas;
- densidade opcionalmente compacta;
- rails com limites de leitura;
- hover como melhoria, nunca como única forma de acesso.

### 7.4 EXPANDED

`EXPANDED` não é um quarto shell.

Pode ser um modificador de densidade a partir de uma largura maior, por exemplo:

```text
1200px+
```

Ele pode alterar:

- gutters;
- max-width;
- número de colunas;
- espaçamento.

Ele não pode criar uma autoridade de navegação diferente de `WIDE`.

### 7.5 MICRO

Viewports muito estreitos, como 320–359px, podem usar um modificador:

```text
MICRO
```

Permitido:

- reduzir gutter;
- empilhar CTAs;
- abreviar label não crítica com alternativa acessível;
- reduzir gap.

Proibido:

- reduzir touch target abaixo do mínimo;
- ocultar ação crítica;
- diminuir input abaixo de 16px;
- remover conteúdo financeiro;
- transformar texto em ícone sem nome acessível.

---

## 8. Registro único de breakpoints

CSS e JavaScript devem consumir a mesma especificação versionada.

Contrato conceitual:

```text
responsive-breakpoints-v1
compactMax: 600
mediumMax: 1024
wideMin: 1025
expandedMin: 1200
microMax: 359
```

Como media queries CSS não consomem custom properties diretamente de forma universal, a implementação deverá usar uma das abordagens:

1. geração de CSS e JavaScript a partir de um manifesto;
2. constantes duplicadas somente em arquivos gerados e testados;
3. lint que compare valores autorizados;
4. testes que provem a convergência.

Proibido:

```text
CSS usa 760
JS usa 560
bootstrap usa 1200
página usa 768
sem uma relação documentada
```

---

## 9. P0 — CSS e JavaScript discordam sobre o shell mobile

O CSS compartilhado do mobile shell possui regras estruturais até:

```text
max-width: 760px
```

O JavaScript de `mobile-app-shell.js` monta o shell somente quando:

```text
max-width: 560px
```

O bootstrap inicial também considera mobile até 560px.

Consequência:

```text
561px a 760px
→ CSS de fronteira mobile/tablet ativo
→ shell mobile não montado
→ partes desktop podem ser ocultadas
→ partes mobile podem não existir
```

Essa divergência pode causar:

- primeiro frame diferente do estado final;
- header ausente;
- busca ausente;
- navegação divergente;
- offsets incorretos;
- conteúdo estreito centralizado;
- necessidade de guard específico para tablet.

Contrato:

```text
um layoutMode
→ um shell
→ uma navegação
→ um conjunto de offsets
```

Não pode existir faixa intermediária sem autoridade.

---

## 10. P0 — tablet não possui estado real no bootstrap

Em `shell-state-early.js`, o estado observado possui:

```js
function isTabletShell() {
  return false;
}
```

Isso significa que tablet não é um modo de produto.

Tablet é tratado como:

- desktop sem sidebar;
- mobile sem shell;
- ou exceção de iPad.

Contrato:

```text
MEDIUM é um modo real
```

Ele deve possuir:

- shell definido;
- header definido;
- navegação definida;
- rail definido;
- overlays definidos;
- testes definidos.

---

## 11. P0 — guard inicial de iPad altera EventTarget globalmente

`ipad-safari-early-guard.js` substitui:

```text
EventTarget.prototype.addEventListener
```

E pode bloquear listeners de:

```text
resize
orientationchange
```

para toda a aplicação.

Também pode:

- desabilitar `document.startViewTransition`;
- registrar listeners bloqueados;
- injetar CSS global com `!important`;
- modificar scroll restoration.

Riscos:

- componentes montados depois não recebem resize;
- overlays não recalculam;
- gráficos não redimensionam;
- shell não troca de modo;
- teclado virtual não atualiza layout;
- bibliotecas terceiras quebram silenciosamente;
- ordem de carregamento altera o resultado;
- debugging fica dependente do dispositivo.

Contrato:

```text
nenhuma correção responsiva pode monkeypatchar EventTarget.prototype
```

Correções devem ser:

- locais;
- feature-detected;
- reversíveis;
- observáveis;
- testáveis;
- sem bloquear outros listeners.

---

## 12. P0 — guard de scroll do iPad reescreve o produto

`ipad-safari-scroll-guard.js` aplica styles inline com prioridade `important` em:

- `html`;
- `body`;
- app shell;
- page;
- workspace;
- main;
- headers;
- sidebar;
- mobile shell;
- bottom nav.

Ele também pode esconder:

```text
sidebar
mobile shell
bottom nav
scrim
```

E executa novamente em:

```text
scroll
resize
orientationchange
visualViewport resize
visualViewport scroll
```

Esse comportamento não é apenas um fix de scroll.

Ele seleciona uma experiência alternativa e destrutiva para iPad retrato.

Contrato:

```text
bug de paint/scroll
→ corrigir a menor superfície afetada

nunca
→ substituir shell e navegação de toda a página
```

O guard deverá ser removido depois da implementação de `MEDIUM` e de um viewport runtime canônico.

---

## 13. P0 — `100dvh` com overflow bloqueado em Mensagens

O contrato do chat observado usa repetidamente:

```text
height: 100dvh
min-height: 100dvh
max-height: 100dvh
overflow: hidden
```

em:

- page;
- page content;
- workspace;
- messages app;
- sidebar;
- thread.

Esse padrão pode funcionar sem teclado.

Com teclado virtual, pode produzir:

- composer coberto;
- mensagem ativa fora da área visível;
- duplo scroll;
- scroll impossível;
- thread presa no tamanho anterior;
- salto ao fechar o teclado;
- perda do ponto de leitura.

Contrato:

```text
chat shell
→ usa viewport visual quando teclado estiver aberto
→ preserva scroll da conversa
→ mantém composer visível
→ não bloqueia o body sem necessidade
```

`100dvh` poderá permanecer como fallback, mas não como única autoridade.

---

## 14. P0 — viewport runtime usa `innerHeight`, não o viewport visual

`responsive-interaction-guard.js` e `shell-state-early.js` calculam a variável de viewport com:

```text
window.innerHeight
```

Eles não observam de forma canônica:

```text
visualViewport.resize
visualViewport.scroll
```

Consequência:

- teclado pode abrir sem atualizar a altura útil;
- browser chrome pode alterar a área visível sem sincronização;
- fixed panels podem ficar atrás do teclado;
- bottom nav pode ocupar espaço indevido.

Contrato:

```text
--doke-layout-vh
--doke-visual-vh
--doke-visual-offset-top
--doke-visual-offset-left
--doke-keyboard-inset
```

As variáveis devem ser produzidas por uma única autoridade.

---

## 15. P0 — `overflow-x: hidden` mascara falhas de reflow

Foram observados usos globais ou estruturais de:

```text
overflow-x: hidden
```

em:

- html;
- body;
- shell;
- rails;
- Home;
- guards de iPad.

Esse recurso pode impedir uma barra horizontal acidental.

Porém, em zoom de 200% ou 400%, também pode simplesmente cortar:

- texto;
- botões;
- menus;
- labels;
- valores financeiros;
- foco visível;
- conteúdo de erro.

Contrato:

```text
reflow primeiro
containment depois
```

Proibido usar `overflow-x: hidden` na raiz como correção para conteúdo que não cabe.

Exceções:

- mídia decorativa;
- máscara de carousel com track acessível;
- animação que não contenha informação;
- superfície que prove não cortar foco ou conteúdo.

---

## 16. P0 — focus visible é removido em controles móveis

O sistema mobile observado aplica:

```css
outline: 0;
```

em:

- botões;
- icon buttons;
- inputs;
- selects;
- textareas.

Alguns inputs recebem box shadow de foco.

Botões e icon buttons não têm garantia transversal de indicador equivalente.

Contrato:

```text
:focus-visible
→ indicador perceptível
→ não depende apenas de cor de fundo
→ não é cortado por overflow
```

Padrão proposto:

```text
outline: 3px solid var(--focus-ring)
outline-offset: 2px
```

Ou equivalente com contraste e geometria comprovados.

Nunca remover outline sem substituto equivalente.

---

## 17. P0 — touch targets menores que o contrato

Foram observados controles com dimensões como:

```text
26px
30px
34px
36px
38px
40px
42px
```

Exemplos incluem:

- submit de busca;
- áudio;
- icon button pequeno;
- notificação do shell;
- quick actions;
- chips;
- ações compactas.

Contrato Doke:

```text
alvo interativo padrão
→ mínimo 44 × 44 CSS px

CTA primário mobile
→ mínimo 48px de altura

ícone visual
→ pode ter 18–24px
→ dentro de alvo mínimo
```

Exceção permitida:

- link textual inline dentro de parágrafo;
- elemento não interativo;
- controle que compartilha um hit area maior explicitamente comprovado.

Não são exceções:

- ícone dentro de card;
- botão de fechar;
- favorito;
- filtro;
- voltar;
- microfone;
- checkbox custom;
- menu contextual.

---

## 18. P0 — inputs mobile abaixo de 16px

Foram observados inputs com:

```text
14px
15px
```

Em Safari móvel, inputs menores podem provocar zoom automático ao receber foco.

Consequências:

- layout deslocado;
- header fora da tela;
- modal desalinhado;
- usuário precisa desfazer zoom;
- composer perde contexto;
- foco de erro fica fora da área visível.

Contrato:

```text
input, select, textarea em COMPACT e MEDIUM touch
→ font-size mínimo 16px
```

A densidade visual deve ser ajustada por:

- padding;
- weight;
- cor;
- largura;
- label;

Não por fonte menor que 16px no controle editável.

---

## 19. P0 — altura fixa e `white-space: nowrap` conflitam com texto ampliado

O shell mobile usa alturas rígidas como:

```text
40px
56px
64px
```

E labels com:

```text
white-space: nowrap
text-overflow: ellipsis
overflow: hidden
```

Esse padrão é útil para chrome compacto.

Porém, com texto a 200% pode:

- cortar saudação;
- esconder localização;
- truncar ação;
- reduzir contexto;
- cortar status;
- sobrepor ícones.

Contrato:

```text
altura fixa
→ somente quando o conteúdo é exclusivamente icônico

controle com texto
→ min-height
→ height auto
→ wrap ou estratégia de label acessível
```

Texto crítico não pode depender de ellipsis.

---

## 20. P1 — safe-area superior é limitada artificialmente

O mobile shell observado usa uma variável semelhante a:

```text
clamp(12px, env(safe-area-inset-top), 20px)
```

Isso impede que um inset maior que 20px seja respeitado integralmente.

Contrato:

```text
padding-top = max(gutter mínimo, safe-area real)
```

Não limitar o inset real a um máximo inferior.

Em landscape, aplicar também:

```text
left
right
```

---

## 21. P1 — offsets fixos duplicam a geometria do bottom nav

O painel mobile usa um offset como:

```text
82px + safe-area-bottom
```

O shell mobile possui sua própria altura e reserve.

O responsive guard mede outra possível bottom nav e escreve:

```text
--doke-runtime-bottom-nav-height
```

Existem, portanto, múltiplas fontes para o mesmo espaço.

Contrato:

```text
--doke-bottom-nav-block-size
```

Uma única autoridade deverá medir ou definir.

Painéis, páginas e composers consumirão:

```text
calc(var(--doke-bottom-nav-block-size) + var(--doke-safe-bottom))
```

Sem números paralelos.

---

## 22. P1 — shell mobile limitado a 430px

O mobile shell possui limite aproximado de:

```text
min(430px, 100vw)
```

Em phones largos isso pode ser uma escolha estética.

Na faixa em que CSS mobile chega a 760px, pode gerar:

- chrome estreito;
- conteúdo com outro rail;
- desalinhamento entre header e página;
- áreas laterais sem função;
- ações comprimidas apesar do espaço disponível.

Contrato:

- COMPACT pode ter max-width editorial quando o conteúdo também usa o mesmo rail;
- MEDIUM deve possuir shell próprio;
- header e conteúdo devem compartilhar o mesmo eixo;
- shell não pode ficar em 430px enquanto conteúdo usa 560px ou 720px sem intenção explícita.

---

## 23. P1 — rails com `100vw` e breakout podem ignorar scrollbar e safe area

A Home utiliza padrões como:

```text
width: 100vw
margin-left: calc(50% - 50vw)
```

Esse breakout cria rail full-bleed.

Riscos:

- incluir scrollbar na largura;
- criar deslocamento horizontal;
- ignorar safe-area lateral;
- divergir do container em zoom;
- cortar focus ring;
- competir com `overflow-x: hidden` do ancestral.

Contrato:

Preferir:

```text
inline-size: 100%
margin-inline calculado pelo container
scroll-padding-inline com safe area
```

Quando `100vw` for necessário, testar:

- scrollbar presente;
- zoom 200%;
- iOS landscape;
- Android gesture navigation;
- foco no primeiro e último item.

---

## 24. P1 — scroll regions recebem role genérico sem nome

O responsive guard adiciona:

```text
tabindex="0"
role="region"
```

em regiões horizontais.

Isso melhora a possibilidade de foco.

Mas uma region sem nome acessível pode gerar ruído para leitor de tela.

Contrato:

Região horizontal focável deverá possuir:

```text
aria-label
ou
aria-labelledby
```

E comportamento de teclado definido:

- setas quando o componente for tablist/carousel;
- scroll nativo para region simples;
- Home/End quando aplicável;
- foco não pode ficar preso.

---

## 25. P1 — detecção por `max-device-width` e pointer coarse

O shell mobile observado combina:

```text
max-width
hover: none
pointer: coarse
max-device-width
```

Riscos:

- desktop touch;
- notebook conversível;
- browser em janela estreita;
- zoom alto;
- foldables;
- device width diferente do viewport;
- mouse conectado ao tablet;
- trackpad no iPad.

Contrato:

```text
layout
→ decidido por espaço disponível

input affordance
→ decidido por capability
```

Pointer coarse pode aumentar touch targets.

Não deve escolher sozinho o shell.

---

## 26. P1 — breakpoints de 760, 767, 768 e 769 representam a mesma fronteira

Foram observadas regras adjacentes em:

```text
max-width: 760px
max-width: 767px
max-width: 768px
min-width: 769px
```

Isso cria uma faixa de comportamento difícil de prever.

Contrato:

Escolher uma fronteira estrutural e expressar os lados sem lacunas:

```text
COMPACT/MEDIUM até 1024
WIDE a partir de 1025
```

Microajustes devem documentar por que não usam a fronteira canônica.

---

## 27. Contrato de zoom

### 27.1 Zoom 200%

Em desktop, a página deverá continuar funcional quando o viewport CSS efetivo cair aproximadamente pela metade.

Esperado:

- shell troca de modo quando necessário;
- header reflowa;
- conteúdo não fica cortado;
- modal cabe no viewport;
- botões permanecem acessíveis;
- não existe scroll horizontal de página;
- foco visível permanece inteiro;
- dados financeiros permanecem legíveis.

### 27.2 Zoom 400%

Em um viewport físico de 1280px, o viewport CSS pode se aproximar de 320px.

Esperado:

- uma coluna;
- navegação compacta;
- CTAs empilhados;
- labels quebrando linha;
- cards usando 100% do container;
- nenhuma ação crítica escondida;
- sem necessidade de scroll bidimensional.

Exceções de scroll horizontal:

- imagem ampliável;
- mapa;
- tabela de dados complexa;
- timeline visual;
- código.

Mesmo nessas exceções, controles externos devem continuar em uma coluna.

### 27.3 Proibições

Não resolver zoom com:

```text
transform: scale()
zoom: CSS
font-size global reduzido
overflow-x: hidden
user-scalable=no
```

---

## 28. Contrato de texto ampliado

A interface deve suportar texto ampliado a 200%.

### 28.1 Títulos

- podem quebrar linha;
- não podem sobrepor ações;
- não podem ter height fixa;
- status crítico não pode ser truncado.

### 28.2 Botões

- label pode quebrar em até duas linhas quando necessário;
- altura é `min-height`, não `height`;
- ícone permanece alinhado;
- CTA financeiro preserva valor e consequência.

### 28.3 Chips

- chips informativos podem quebrar linha;
- chips interativos mantêm alvo mínimo;
- listas de chips podem wrapar;
- row horizontal somente quando semântica exigir.

### 28.4 Cards

- header e ações podem empilhar;
- valores e status não se sobrepõem;
- metadata secundária pode mover para nova linha;
- avatar não comprime texto abaixo de largura mínima.

### 28.5 Navegação

- label ativa permanece identificável;
- bottom nav pode usar label curta aprovada;
- nome acessível completo permanece;
- ícone isolado exige `aria-label`.

---

## 29. Matriz canônica de touch targets

| Componente | Mínimo | Recomendado | Observação |
|---|---:|---:|---|
| CTA primário mobile | 48px altura | 48–56px | largura conforme conteúdo |
| botão padrão | 44 × 44px | 46–48px | label pode aumentar altura |
| icon button | 44 × 44px | 44–48px | ícone visual 18–24px |
| botão fechar | 44 × 44px | 44px | canto não reduz hit area |
| favorito | 44 × 44px | 44px | fora do link principal |
| checkbox/radio custom | 44px hit area | 44px | visual interno pode ser 20–24px |
| tab interativa | 44px altura | 44–48px | scroll horizontal permitido |
| chip removível | 44px altura | 44px | `x` incluído no mesmo alvo |
| item bottom nav | 44px altura | 56–64px | label e ícone |
| item sidebar touch | 48px altura | 52–58px | confortável |
| ação em toast | 44px altura | 44px | máximo de ações conforme espaço |
| link inline | tamanho textual | n/a | exceção contextual |

### 29.1 Espaçamento

Entre alvos compactos independentes:

```text
mínimo recomendado: 8px
```

Quando o alvo possuir 44px completos, gaps menores podem ser aceitos se não houver risco de ativação acidental.

### 29.2 Área visual versus hit area

Permitido:

```text
ícone 20px
botão 44px
```

Proibido:

```text
ícone 20px
botão 20px
```

---

## 30. Contrato de teclado virtual

### 30.1 Detecção

Não existe API universal de teclado.

A implementação poderá inferir `OPEN` quando:

- existe elemento editável focado;
- `visualViewport.height` diminui significativamente;
- o viewport visual permanece menor por mais de um frame;
- a mudança não é apenas orientação.

### 30.2 Variáveis propostas

```text
--doke-layout-viewport-height
--doke-visual-viewport-height
--doke-visual-viewport-offset-top
--doke-keyboard-inset
```

### 30.3 Bottom nav

Quando teclado estiver aberto:

- bottom nav pode ficar oculta;
- o espaço reservado deve ser removido;
- nenhum CTA deve ficar atrás da nav;
- ao fechar, nav e reserve retornam sem salto excessivo.

### 30.4 Composer

O composer de Mensagens deve:

- permanecer dentro do viewport visual;
- preservar o scroll da thread;
- não forçar a página ao topo;
- permitir textarea crescer até limite;
- manter Enviar acessível;
- respeitar safe-area depois do teclado fechar.

### 30.5 Formulários

Ao focar campo:

- field e mensagem de erro ficam visíveis;
- sticky footer não cobre o controle;
- scroll-padding-bottom considera teclado;
- mudança para próximo campo não desmonta o teclado desnecessariamente.

### 30.6 Overlays

Dialog ou drawer com campo deve:

- recalcular max-height pelo visual viewport;
- manter header e ações acessíveis;
- permitir scroll interno único;
- não ficar centrado atrás do teclado.

---

## 31. Contrato de safe area

### 31.1 Viewport meta

A futura implementação poderá usar:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

Somente após todas as superfícies críticas consumirem safe-area corretamente.

### 31.2 Padding

Padrão:

```text
padding-top: max(gutter, env(safe-area-inset-top))
padding-right: max(gutter, env(safe-area-inset-right))
padding-bottom: max(gutter, env(safe-area-inset-bottom))
padding-left: max(gutter, env(safe-area-inset-left))
```

### 31.3 Fixed elements

Aplicar a:

- bottom nav;
- composer;
- toast stack;
- drawer;
- floating CTA;
- full-screen media;
- modal full-screen.

### 31.4 Landscape

Não assumir apenas top e bottom.

Landscape com notch exige laterais seguras.

### 31.5 Fallback

Quando `env()` for zero:

- usar gutter normal;
- nunca criar espaço extra arbitrário.

---

## 32. Contrato do shell por modo

### 32.1 COMPACT shell

- topbar flexível;
- perfil e contexto sem sobreposição;
- ações com 44px;
- busca com input 16px;
- bottom nav única;
- largura igual ao rail principal;
- safe area integral;
- sem dependência de `!important` para existir.

### 32.2 MEDIUM shell

- estado explícito;
- não reutilizar shell phone de 430px;
- header e conteúdo no mesmo rail;
- menu lateral em drawer ou rail compacto;
- ações podem mostrar label quando houver espaço;
- navegação sempre disponível.

### 32.3 WIDE shell

- sidebar persistente;
- header desktop;
- rail adaptativo;
- collapse da sidebar preservado;
- zoom pode fazer a página migrar para MEDIUM ou COMPACT sem reload.

### 32.4 Mudança de modo

Ao cruzar breakpoint:

- não recarregar página;
- não perder draft;
- não duplicar listeners;
- não duplicar shell;
- não perder foco;
- não deixar overlay órfão;
- não zerar scroll;
- não reexecutar mutação.

---

## 33. Densidade

### 33.1 COMFORTABLE

Padrão para:

- touch;
- zoom alto;
- texto ampliado;
- tablet;
- formulários;
- operações financeiras.

### 33.2 COMPACT

Permitido em WIDE com pointer fino.

Pode reduzir:

- gaps;
- padding horizontal;
- altura de linhas não interativas;
- espaço entre seções.

Não pode reduzir:

- target interativo abaixo de 44px;
- input abaixo de altura funcional;
- legibilidade;
- focus ring;
- distância entre ações destrutivas.

### 33.3 Preferência do usuário

Uma preferência futura de densidade não deve substituir o reflow necessário.

Se o viewport ficar estreito:

```text
responsividade vence densidade
```

---

## 34. Formulários responsivos

### 34.1 Grid

- duas colunas somente quando cada campo mantém largura útil;
- em COMPACT: uma coluna;
- label e help text não são truncados;
- error summary ocupa a largura completa.

### 34.2 Inputs

- 16px em touch;
- altura mínima 48px para CTA/campo principal;
- textarea cresce verticalmente;
- select não corta valor;
- prefixo e sufixo não comprimem o texto.

### 34.3 Sticky footer

- respeita teclado;
- respeita bottom nav;
- não cobre o último campo;
- ações empilham em MICRO;
- cancelar e salvar permanecem distinguíveis.

### 34.4 Campos financeiros

- valor nunca fica truncado sem acesso completo;
- moeda e label permanecem juntos;
- resumo pode mover abaixo do formulário;
- CTA confirma valor e consequência.

### 34.5 Validação

Após erro:

- primeiro campo inválido fica visível;
- teclado não cobre mensagem;
- zoom não desloca focus ring;
- resumo não fica atrás de header fixo.

---

## 35. Cards e rails

### 35.1 Cards em grid

Usar:

```text
minmax(min(100%, largura mínima útil), 1fr)
```

Evitar:

- largura fixa por viewport;
- número de colunas sem verificar conteúdo;
- altura fixa para corpo textual;
- `!important` para cada breakpoint.

### 35.2 Cards horizontais

- largura deriva do container;
- primeiro e último item respeitam safe area;
- focus ring não é cortado;
- scroll snap não impede scroll livre;
- teclado pode alcançar todos os itens;
- setas aparecem somente com overflow real.

### 35.3 400% zoom

Rails editoriais podem continuar horizontais quando:

- cada card permanece legível;
- a página em si não cria scroll horizontal;
- controles de scroll são acessíveis;
- conteúdo crítico não fica apenas no rail.

### 35.4 Media

- `aspect-ratio` reserva espaço;
- imagem não define largura intrínseca maior que o container;
- vídeo não força viewport;
- lightbox usa viewport visual.

---

## 36. Overlays e painéis

### 36.1 Max-height

Não usar apenas:

```text
72vh
100dvh - 132px
```

A altura deve considerar:

- visual viewport;
- safe area;
- teclado;
- header real;
- ações reais.

### 36.2 Scroll

Um overlay deve possuir um scroll principal.

Evitar:

```text
body scroll
+ drawer scroll
+ painel interno scroll
```

### 36.3 Reflow

Em 400%:

- dialog central pode virar full-screen;
- ações empilham;
- título quebra linha;
- close permanece 44px;
- conteúdo não fica cortado.

### 36.4 Mudança de orientação

- overlay permanece aberto quando seguro;
- geometry recalcula;
- foco permanece dentro;
- estado draft permanece;
- não dispara submit.

---

## 37. Mensagens e comunidades

### 37.1 Desktop

- sidebar e thread podem usar duas colunas;
- nenhuma coluna pode ter largura fixa que force overflow;
- zoom migra para uma coluna quando necessário.

### 37.2 Mobile

- lista e conversa são estados de rota/superfície;
- composer respeita teclado;
- back action tem 44px;
- header não depende de height fixa;
- anexos não cobrem texto.

### 37.3 Thread

- preservar posição ao abrir/fechar teclado;
- novas mensagens não arrancam o usuário de leitura antiga;
- scroll-to-bottom CTA fica acima do composer;
- bubble max-width reflowa com texto grande.

### 37.4 Comunidade interna

O mesmo contrato do chat deve valer para:

- canais;
- membros;
- eventos;
- composer;
- anexos;
- moderação.

---

## 38. Pedidos, Notificações e listas operacionais

### 38.1 Header

- título pode quebrar;
- ações podem ir para menu quando espaço faltar;
- menu preserva nome acessível;
- filtros ativos podem wrapar.

### 38.2 Cards

- status e próxima ação não se sobrepõem;
- data e valor podem mudar de linha;
- badge não comprime título;
- ação principal mantém 44px.

### 38.3 Seleção múltipla

- toolbar fixa respeita bottom nav e safe area;
- contagem não é truncada;
- selecionar tudo não exige long press;
- contexto por touch possui alternativa visível.

### 38.4 Notificações

- toast stack não invade keyboard;
- browser prompt reflowa;
- inbox usa uma coluna em COMPACT;
- filtros não ficam fora do viewport;
- ações rápidas empilham.

---

## 39. Pagamento e Carteira

### 39.1 Layout

O checkout observado usa duas colunas com resumo lateral.

Contrato:

- WIDE: duas colunas quando a principal mantém largura útil;
- MEDIUM: resumo pode ficar abaixo ou sticky limitado;
- COMPACT: uma coluna;
- resumo permanece próximo do CTA sem duplicação.

### 39.2 Métodos de pagamento

- cards podem virar uma coluna;
- descrição não usa ellipsis para condição crítica;
- radio possui hit area completa;
- selo não reduz legibilidade.

### 39.3 Valores

- total, taxa, desconto e saldo não são truncados;
- número e rótulo permanecem associados;
- zoom não faz valor sobrepor CTA;
- conteúdo demonstrativo continua identificado.

### 39.4 Modal de confirmação

- cabe no visual viewport;
- mantém consequência financeira visível;
- ações empilham;
- teclado não é necessário para concluir leitura;
- close/cancel permanecem acessíveis.

### 39.5 Carteira

- tabela/extrato pode virar lista sem perder semântica;
- colunas críticas não somem silenciosamente;
- comprovante abre em overlay responsivo;
- saldo não é reduzido a texto ilegível.

---

## 40. Perfil e Configurações

### 40.1 Perfil

- capa preserva aspect ratio;
- avatar não força overflow;
- tabs podem scrollar horizontalmente com nome acessível;
- ações empilham;
- portfólio reflowa;
- conteúdo longo não é cortado.

### 40.2 Configurações

- navegação lateral vira lista ou drawer em MEDIUM/COMPACT;
- seção ativa permanece identificada;
- switches possuem hit area de 44px;
- save bar respeita teclado;
- estados de erro permanecem visíveis.

---

## 41. Orientação

### 41.1 Portrait → landscape

Preservar:

- rota;
- entidade aberta;
- draft;
- filtro;
- seleção;
- scroll;
- foco quando seguro;
- estado do overlay.

### 41.2 Landscape → portrait

- shell troca de modo uma vez;
- nenhum listener duplica;
- composer recalcula;
- safe areas laterais tornam-se verticais;
- modal não fica fora da tela.

### 41.3 Eventos

Usar:

- `matchMedia` change;
- `ResizeObserver` local;
- `visualViewport` quando necessário.

Não depender apenas de:

```text
orientationchange
```

---

## 42. Responsividade e lifecycle de navegação

### 42.1 Carregamento direto

A página deve escolher o modo correto antes ou durante o primeiro frame sem flash de shell incompatível.

### 42.2 F5

Deve convergir para o mesmo layout do carregamento direto.

### 42.3 Navegação interna

- shell anterior não pode permanecer sobre página nova;
- pending shell deve usar a mesma decisão de modo do runtime;
- mudança de rota não pode competir com resize;
- scroll restoration considera modo atual.

### 42.4 Back/Forward

- restaura layout pelo viewport atual, não pelo viewport antigo;
- restaura scroll quando a superfície ainda existe;
- não reabre teclado;
- não remonta overlay sem estado de histórico.

---

## 43. Performance

### 43.1 Um snapshot por frame

Eventos de resize/visualViewport podem disparar em alta frequência.

Contrato:

```text
coalescer em requestAnimationFrame
```

### 43.2 Sem leitura/escrita intercalada

Agrupar:

1. leituras de viewport e geometria;
2. cálculo;
3. escrita de classes e custom properties.

### 43.3 Observers locais

`ResizeObserver` deve observar apenas:

- bottom nav;
- header;
- composer;
- container que realmente determina reflow.

Evitar observar toda a árvore.

### 43.4 Sem loop

Mudança de custom property não pode causar resize infinito.

### 43.5 Sem polling

Responsividade não deve depender de intervalos.

---

## 44. API conceitual

```text
Doke.responsiveExperience.getSnapshot()
Doke.responsiveExperience.subscribe(listener)
Doke.responsiveExperience.getLayoutMode()
Doke.responsiveExperience.getVisualViewport()
Doke.responsiveExperience.isKeyboardOpen()
Doke.responsiveExperience.getBottomObstruction()
Doke.responsiveExperience.registerSurface(config)
Doke.responsiveExperience.requestReflow(reason)
```

### 44.1 Eventos públicos

```text
doke:responsive-snapshot
doke:layout-mode-change
doke:keyboard-state-change
doke:safe-area-change
doke:surface-reflow
```

### 44.2 Dataset

A autoridade poderá expor:

```text
data-doke-layout-mode="compact|medium|wide"
data-doke-input-mode="touch|pointer|mixed|keyboard"
data-doke-keyboard="open|closed"
data-doke-orientation="portrait|landscape"
```

CSS deve continuar preferindo media/container queries para layout puro.

Dataset é para coordenação de lifecycle, não para substituir CSS.

---

## 45. Tokens propostos

```text
--doke-target-min: 44px
--doke-target-primary: 48px
--doke-editable-font-min: 16px
--doke-layout-viewport-height
--doke-visual-viewport-height
--doke-visual-viewport-offset-top
--doke-visual-viewport-offset-left
--doke-keyboard-inset
--doke-safe-top
--doke-safe-right
--doke-safe-bottom
--doke-safe-left
--doke-bottom-nav-block-size
--doke-fixed-footer-block-size
--doke-responsive-gutter
--doke-readable-line-length
```

Tokens não deverão duplicar:

- altura de bottom nav;
- safe-area;
- viewport height;
- breakpoint estrutural.

---

## 46. Técnicas proibidas

### 46.1 Proibido globalmente

- monkeypatch de `EventTarget.prototype`;
- bloquear listeners de resize de terceiros;
- UA sniff como autoridade de layout;
- styles inline globais com `!important`;
- esconder shell inteiro para corrigir paint;
- bloquear zoom;
- reduzir fonte de input abaixo de 16px em touch;
- usar `overflow-x: hidden` para esconder reflow quebrado;
- duplicar breakpoint estrutural em arquivos locais;
- usar `100dvh` como única estratégia de teclado;
- remount completo em cada resize;
- apagar draft ao mudar orientação;
- declarar tablet como `false`.

### 46.2 Proibido por página

- largura fixa de card por viewport sem componente canônico;
- botão crítico menor que 44px;
- focus ring removido;
- CTA escondido em zoom;
- valor financeiro truncado;
- header local substituindo shell;
- bottom offset literal quando existe nav medida.

---

## 47. Exceções permitidas

### 47.1 Conteúdo full-bleed

Permitido para:

- mídia;
- rail editorial;
- capa;
- mapa.

Com:

- safe area;
- foco preservado;
- scroll controlado;
- sem cortar conteúdo crítico.

### 47.2 Scroll horizontal

Permitido para:

- carousel;
- tabs;
- tabela complexa;
- timeline;
- mídia ampliável.

Com:

- nome acessível;
- indicação de overflow quando necessário;
- teclado;
- primeiro/último item alcançáveis;
- página sem scroll horizontal concorrente.

### 47.3 Controle menor visualmente

O ícone pode ser menor.

O hit area não.

---

## 48. Matriz mínima de viewports

### 48.1 Phones

```text
320 × 568
360 × 640
375 × 667
390 × 844
393 × 852
412 × 915
430 × 932
```

### 48.2 Medium

```text
540 × 720
600 × 960
768 × 1024
810 × 1080
820 × 1180
1024 × 768
1024 × 1366
```

### 48.3 Desktop

```text
1025 × 768
1180 × 820
1280 × 720
1366 × 768
1440 × 900
1920 × 1080
```

### 48.4 Alturas reduzidas

Testar também:

```text
360px
480px
568px
```

para:

- landscape;
- teclado;
- janela redimensionada;
- split screen.

---

## 49. Matriz de zoom e texto

```text
100% zoom + texto padrão
200% zoom + texto padrão
400% zoom + texto padrão
100% zoom + texto 200%
200% zoom + texto 200%
```

Em cada combinação validar:

- navegação;
- header;
- primeira ação;
- última ação;
- foco;
- modal;
- formulário;
- erro;
- toast;
- bottom nav;
- scroll horizontal;
- conteúdo financeiro.

---

## 50. Matriz de input

```text
mouse
trackpad
touch
stylus
teclado
leitor de tela + teclado
switch control
input misto
```

Validar:

- hover não é obrigatório;
- long press possui alternativa;
- context menu possui botão visível;
- drag possui alternativa;
- target atende mínimo;
- focus indicator permanece.

---

## 51. Matriz de browsers

Cobertura mínima futura:

- Chrome Android;
- Safari iOS;
- Safari iPadOS;
- Chrome desktop;
- Edge desktop;
- Firefox desktop;
- Safari macOS.

Casos especiais:

- iPad com trackpad;
- desktop touch;
- PWA standalone;
- browser com barras dinâmicas;
- split view;
- teclado externo no tablet.

---

## 52. Matriz por página

### Home

- shell e rail alinhados;
- busca sem auto-zoom;
- cards não cortados;
- rail alcançável;
- Workers 2×2 reflowa em 320px/texto ampliado.

### Resultados

- filtros não cobrem conteúdo;
- drawer cabe com teclado;
- chips wrapam;
- cards usam uma coluna quando necessário;
- count e query permanecem legíveis.

### Detalhe do anúncio

- mídia não força largura;
- CTA sticky respeita safe area;
- preço não trunca;
- tabs reflowam.

### Pedidos

- header actions não somem;
- filtros e seleção reflowam;
- agenda cabe em MEDIUM;
- cards preservam status e ação.

### Mensagens

- lista/thread corretas por modo;
- composer visível com teclado;
- scroll preservado;
- header reflowa;
- anexos acessíveis.

### Comunidade interna

- canais e conversa não criam duplo scroll;
- member panel vira overlay;
- composer segue contrato de teclado.

### Notificações

- filtros e seleção cabem;
- toast stack não cobre bottom nav;
- cards e ações reflowam;
- settings panel usa visual viewport.

### Pagamento

- duas colunas viram uma;
- total e CTA permanecem juntos;
- métodos não truncam condições;
- confirmação cabe no viewport.

### Carteira

- saldo legível;
- extrato reflowa;
- saque com teclado;
- comprovante responsivo.

### Perfil

- capa/avatar;
- tabs;
- portfólio;
- ações;
- conteúdo longo.

### Configurações

- navegação lateral;
- switches;
- save bar;
- erros;
- teclado.

---

## 53. Casos obrigatórios de QA

### RESP-001 — faixa 561px

Dado:

```text
viewport 561px
```

Esperado:

- um shell definido;
- nenhuma lacuna entre CSS e JS;
- navegação presente;
- header e rail alinhados.

### RESP-002 — faixa 760/761px

Redimensionar entre os dois valores.

Esperado:

- troca única de modo;
- nenhuma duplicação de shell;
- estado preservado;
- sem flash.

### RESP-003 — desktop em zoom 200%

Esperado:

- reflow para modo adequado;
- sem horizontal page scroll;
- foco visível;
- ações acessíveis.

### RESP-004 — desktop em zoom 400%

Esperado:

- uma coluna;
- nenhuma informação crítica cortada;
- navegação funcional;
- modal acessível.

### RESP-005 — texto 200%

Esperado:

- títulos quebram;
- botões crescem;
- status não trunca;
- header não sobrepõe.

### RESP-006 — input mobile

Focar input de busca.

Esperado:

- Safari não aplica zoom automático;
- shell permanece estável;
- dropdown visível;
- limpar/buscar acessíveis.

### RESP-007 — chat com teclado

Abrir conversa e focar composer.

Esperado:

- composer acima do teclado;
- última mensagem visível;
- bottom nav não disputa espaço;
- scroll preservado.

### RESP-008 — modal com teclado

Abrir formulário em drawer/dialog.

Esperado:

- campo focado visível;
- header e ações alcançáveis;
- scroll único;
- safe area respeitada.

### RESP-009 — iPad retrato

Esperado:

- modo MEDIUM real;
- nenhum monkeypatch global;
- sidebar/nav conforme contrato;
- resize listeners funcionando;
- scroll estável.

### RESP-010 — orientação

Rotacionar com filtro draft aberto.

Esperado:

- draft preservado;
- overlay reflowa;
- foco permanece;
- nenhuma aplicação implícita.

### RESP-011 — safe-area landscape

Esperado:

- conteúdo não entra no notch;
- bottom nav respeita laterais;
- rail continua alinhado.

### RESP-012 — touch targets

Auditar todos os controles visíveis.

Esperado:

```text
mínimo 44 × 44px
```

### RESP-013 — foco

Navegar por teclado.

Esperado:

- indicador visível;
- não cortado;
- ordem lógica;
- sem foco em elemento oculto.

### RESP-014 — direct/F5/internal

Abrir a mesma página por três caminhos.

Esperado:

- mesmo modo;
- mesma geometria;
- mesma navegação;
- mesmo primeiro frame útil.

### RESP-015 — long content

Usar:

- nome longo;
- endereço longo;
- moeda alta;
- status longo;
- CTA longo.

Esperado:

- wrap;
- expansão;
- sem sobreposição;
- conteúdo completo acessível.

---

## 54. Automação proposta

### 54.1 Lint de breakpoints

Detectar novos valores estruturais fora da allowlist.

### 54.2 Lint de touch targets

Sinalizar controles com:

```text
width/height/min-height abaixo de 44px
```

com allowlist explícita para links inline.

### 54.3 Lint de inputs

Sinalizar input/select/textarea mobile abaixo de 16px.

### 54.4 Lint de zoom blocking

Bloquear:

```text
user-scalable=no
maximum-scale=1
```

### 54.5 Lint de focus

Sinalizar:

```text
outline: 0
```

sem regra equivalente no mesmo componente.

### 54.6 Lint de viewport

Sinalizar:

- `100vh` em superfícies críticas;
- `100dvh + overflow:hidden` sem exceção;
- offsets fixos de bottom nav;
- `max-device-width` para layout.

### 54.7 Playwright

Capturar:

- screenshots por viewport;
- overflow horizontal;
- bounding boxes de touch target;
- foco visível;
- estado antes/depois da hidratação;
- mudança de orientação simulada;
- zoom quando suportado.

---

## 55. P0 — blockers de implementação

### RESPONSIVE-P0-01

Unificar a decisão de shell entre CSS, JS e bootstrap.

### RESPONSIVE-P0-02

Criar modo `MEDIUM` real.

### RESPONSIVE-P0-03

Remover monkeypatch global de `EventTarget.prototype`.

### RESPONSIVE-P0-04

Substituir o guard destrutivo de iPad por correções locais.

### RESPONSIVE-P0-05

Criar viewport runtime com `visualViewport` e teclado.

### RESPONSIVE-P0-06

Corrigir Mensagens/composers para teclado virtual.

### RESPONSIVE-P0-07

Remover focus suppression sem substituto.

### RESPONSIVE-P0-08

Normalizar touch targets para 44px.

### RESPONSIVE-P0-09

Normalizar inputs touch para 16px.

### RESPONSIVE-P0-10

Eliminar cortes de conteúdo mascarados por overflow global.

### RESPONSIVE-P0-11

Garantir reflow em zoom 400%.

### RESPONSIVE-P0-12

Preservar ações financeiras e destrutivas em texto ampliado.

---

## 56. P1 — correções estruturais

### RESPONSIVE-P1-01

Centralizar bottom nav height e obstruções inferiores.

### RESPONSIVE-P1-02

Centralizar safe-area.

### RESPONSIVE-P1-03

Alinhar shell e rail em MEDIUM.

### RESPONSIVE-P1-04

Remover breakpoints adjacentes redundantes.

### RESPONSIVE-P1-05

Substituir UA/device-width por capability + inline-size.

### RESPONSIVE-P1-06

Revisar `100vw` breakouts.

### RESPONSIVE-P1-07

Revisar heights fixas com texto.

### RESPONSIVE-P1-08

Nomear scroll regions focáveis.

### RESPONSIVE-P1-09

Unificar comportamento de mudança de orientação.

### RESPONSIVE-P1-10

Criar testes direct/F5/internal por modo.

---

## 57. P2 — refinamentos

### RESPONSIVE-P2-01

Adicionar preferência de densidade em WIDE.

### RESPONSIVE-P2-02

Adotar container queries em componentes apropriados.

### RESPONSIVE-P2-03

Adicionar suporte a reduced transparency.

### RESPONSIVE-P2-04

Criar dashboard de regressões responsivas.

### RESPONSIVE-P2-05

Medir CLS por mudança de shell.

### RESPONSIVE-P2-06

Criar fixtures de conteúdo extremo.

### RESPONSIVE-P2-07

Auditar foldables e dual-screen quando o produto exigir.

---

## 58. Handoffs de implementação

### RESP-H01 — breakpoint registry

Escopo:

- manifesto canônico;
- geração CSS/JS;
- lint;
- testes de convergência.

Saída:

```text
COMPACT
MEDIUM
WIDE
EXPANDED modifier
```

### RESP-H02 — medium shell

Escopo:

- tablet;
- split view;
- header;
- navegação;
- sidebar/drawer;
- rail.

Pré-condição:

- nenhum guard destrutivo.

### RESP-H03 — viewport and keyboard runtime

Escopo:

- visualViewport;
- keyboard state;
- CSS vars;
- bottom obstruction;
- coalescing por frame.

### RESP-H04 — remove iPad global guards

Escopo:

- early guard;
- scroll guard;
- listeners bloqueados;
- inline important;
- view transition override.

Saída:

- feature detection local;
- regressões cobertas.

### RESP-H05 — target normalization

Escopo:

- buttons;
- icon buttons;
- close;
- favorito;
- chips;
- tabs;
- radios;
- checkboxes;
- bottom nav.

### RESP-H06 — zoom and type reflow

Escopo:

- 200%;
- 400%;
- texto 200%;
- heights;
- nowrap;
- ellipsis;
- focus clipping.

### RESP-H07 — fixed surface coordination

Escopo:

- bottom nav;
- composer;
- sticky CTA;
- toast stack;
- drawers;
- safe area;
- teclado.

### RESP-H08 — cards and rails

Escopo:

- Home;
- Resultados;
- Perfil;
- Workers;
- Publicações;
- horizontal scroll;
- snap;
- full-bleed.

### RESP-H09 — critical flow responsiveness

Escopo:

- orçamento;
- pagamento;
- carteira;
- conclusão;
- contestação;
- configurações.

### RESP-H10 — responsive QA automation

Escopo:

- viewport matrix;
- zoom;
- text scale;
- targets;
- focus;
- overflow;
- hydration convergence;
- orientation.

---

## 59. Ordem recomendada de implementação

```text
1. RESP-H01 — registry
2. RESP-H03 — viewport runtime
3. RESP-H02 — medium shell
4. RESP-H04 — remover guards de iPad
5. RESP-H05 — touch targets e inputs
6. RESP-H07 — fixed surfaces/keyboard
7. RESP-H06 — zoom e texto
8. RESP-H08 — cards e rails
9. RESP-H09 — fluxos críticos
10. RESP-H10 — automação completa
```

A remoção dos guards de iPad deve ocorrer somente quando:

- MEDIUM estiver funcional;
- scroll estiver coberto;
- visualViewport estiver coberto;
- navegação estiver coberta;
- screenshots e testes passarem.

---

## 60. Arquivos permitidos em futuras branches

A implementação poderá envolver, conforme o handoff:

- `assets/css/core/tokens.css`;
- `assets/css/layout/page-rail-authority.css`;
- `assets/css/components/shell/**`;
- `assets/css/components/panels/**`;
- `assets/css/components/ui/**`;
- `assets/css/components/internal/**`;
- `assets/css/pages/**` somente para composição contextual;
- `assets/js/core/shell-state-early.js`;
- `assets/js/components/mobile-app-shell.js`;
- `assets/js/ui/responsive-interaction-guard.js` ou substituto;
- novo módulo canônico de responsive experience;
- testes e scripts de auditoria.

---

## 61. Arquivos e técnicas que exigem cuidado especial

### 61.1 HTML

Meta viewport deverá ser alterada de forma coordenada em todas as páginas, não apenas na Home.

### 61.2 Guards de iPad

Não remover isoladamente sem cobertura de MEDIUM.

### 61.3 CSS compartilhado

Não adicionar novas camadas de override por página.

### 61.4 `!important`

A futura implementação deverá reduzir, não aumentar, o uso.

### 61.5 Produção

Nenhuma alteração responsiva será promovida sem:

- QA visual;
- QA de teclado;
- QA de zoom;
- QA de touch;
- regressão de desktop;
- autorização.

---

## 62. Critérios de saída

Este contrato estará implementado quando:

- CSS, JS e bootstrap concordarem sobre layoutMode;
- existir MEDIUM real;
- não existir monkeypatch global de eventos;
- guards destrutivos de iPad forem removidos;
- viewport visual e teclado forem coordenados;
- Mensagens mantiver composer visível;
- todos os controles relevantes tiverem target mínimo;
- inputs touch tiverem 16px;
- focus visible estiver presente;
- zoom 400% não perder conteúdo ou função;
- texto 200% não produzir clipping;
- safe areas forem consistentes;
- bottom offsets tiverem uma autoridade;
- orientação preservar estado;
- direct/F5/internal convergirem;
- páginas críticas passarem na matriz;
- nenhum P0 permanecer aberto.

---

## 63. Fora de escopo deste sublote

Não foram executados:

- alteração de breakpoint;
- criação do runtime;
- remoção de guard;
- alteração de meta viewport;
- mudança de shell;
- correção de CSS;
- alteração de touch target;
- alteração de input font-size;
- teste em dispositivo físico;
- Playwright;
- staging;
- produção;
- merge.

---

## 64. Validação documental executada

Foram verificados:

- estado do PR lógico;
- deriva da base;
- meta viewport;
- shell inicial;
- shell mobile CSS;
- shell mobile JavaScript;
- breakpoints de rails;
- tokens e componentes móveis;
- mobile panels;
- Home mobile;
- Mensagens;
- checkout;
- safe areas;
- viewport variables;
- iPad early guard;
- iPad scroll guard;
- touch targets;
- input font sizes;
- focus suppression;
- overflow;
- 100dvh;
- reduced motion parcial.

Resultado:

- contrato responsivo criado;
- runtime alterado: zero;
- staging e produção: intocados;
- merge e auto-merge: não autorizados.

---

## 65. Próximo sublote recomendado

`UX-FOUNDATION-011 — acessibilidade semântica, teclado, leitores de tela e contraste`.

Esse lote deverá consolidar:

- landmarks;
- headings;
- nomes acessíveis;
- roles;
- estados ARIA;
- ordem de foco;
- skip links;
- leitores de tela;
- contraste;
- uso sem cor;
- live regions;
- dialogs;
- grids e listas;
- tabelas;
- mídia;
- conteúdo dinâmico;
- QA automatizado e manual.
