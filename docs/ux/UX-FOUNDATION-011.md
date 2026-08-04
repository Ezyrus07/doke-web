# UX-FOUNDATION-011 — Acessibilidade semântica, teclado, leitores de tela e contraste

## Status

- Frente: `UX-FOUNDATION`
- Sublote: `011`
- Natureza: especificação de Produto, UX, acessibilidade e QA
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
- Head UX anterior: `d72da6dd1f83274b7c71ea8d1c08b4e182d9bc94`
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-010`
- Baseline de conformidade proposto: `WCAG 2.2 AA`

---

## 1. Objetivo

Definir o contrato transversal de acessibilidade da Doke para que todas as superfícies:

- possuam estrutura semântica previsível;
- sejam completamente operáveis por teclado;
- exponham nomes, estados e relações corretos às tecnologias assistivas;
- preservem foco durante navegação, overlays, filtros e mutações;
- anunciem atualizações dinâmicas sem silêncio ou repetição excessiva;
- não dependam somente de cor, posição, animação ou forma;
- mantenham contraste adequado em estados normal, hover, focus, selected, disabled e error;
- tratem conteúdo visual, vídeo, áudio e anexos com alternativas equivalentes;
- funcionem com leitores de tela em desktop e mobile;
- preservem equivalência entre carregamento direto, F5 e navegação interna;
- não usem ARIA para substituir elementos nativos sem necessidade;
- não adicionem correções locais que concorram com as autoridades globais.

Este documento não implementa alterações no produto.

---

## 2. Superfícies auditadas

A auditoria documental considerou principalmente:

- `index.html`;
- `resultados.html`;
- `mensagens.html`;
- `admin.html`;
- `assets/js/pages/home/search.js`;
- `assets/js/pages/home/workers.js`;
- `assets/js/pages/mensagens.js`;
- `assets/js/ui/system-dialog.js`;
- `assets/js/ui/mobile-drawer-standard.js`;
- `assets/js/renderers/render-loading-state.js`;
- `assets/js/renderers/render-empty-state.js`;
- `assets/js/core/app.js`;
- `assets/css/components/ui/doke-ui-system.css`;
- `assets/css/components/shell/mobile-app-shell.css`;
- `assets/css/components/shell/app-shell.css`;
- `assets/css/pages/home/mobile-composition.css`;
- contratos anteriores de busca, cards, overlays, formulários, conteúdo, notificações e responsividade.

A especificação se aplica também a:

- Detalhe do anúncio;
- Pedidos;
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
- menus;
- popovers;
- tabelas;
- gráficos;
- aplicativo futuro.

---

## 3. Definições

### 3.1 Semântica nativa

É a informação fornecida diretamente pelo HTML correto.

Exemplos:

```html
<button type="button">Salvar</button>
<a href="detalhe-anuncio.html">Ver anúncio</a>
<nav aria-label="Navegação principal">...</nav>
<main id="main-content">...</main>
<label for="email">E-mail</label>
<input id="email" type="email">
```

### 3.2 Nome acessível

É o texto anunciado para identificar um controle ou região.

Pode vir de:

- texto visível;
- `label`;
- `aria-label`;
- `aria-labelledby`;
- `alt`;
- legenda ou título associado.

### 3.3 Descrição acessível

É a informação complementar associada por:

- `aria-describedby`;
- texto de ajuda;
- erro de campo;
- instrução;
- consequência de uma ação.

### 3.4 Operabilidade equivalente

Uma ação possui operabilidade equivalente quando:

```text
mouse
teclado
tecnologia assistiva
entrada touch
```

conseguem executar a mesma intenção e perceber o mesmo resultado.

### 3.5 Foco programático

É a movimentação deliberada do foco para:

- entrada de uma rota;
- primeiro erro;
- overlay aberto;
- trigger restaurado;
- região que recebeu conteúdo solicitado.

### 3.6 Região viva

É uma superfície usada para anunciar atualizações sem mover o foco.

Não substitui:

- foco em erro;
- heading de nova rota;
- dialog modal;
- mensagem visível persistente;
- estado do próprio controle.

### 3.7 Modalidade

É o contexto ativo de interação.

Exemplos:

- rota;
- drawer;
- modal;
- sheet;
- popover;
- comentários sobre Worker;
- dialog de confirmação.

---

## 4. Causa raiz

A Doke já possui diversas iniciativas positivas de acessibilidade, incluindo:

- `aria-label` em icon buttons;
- `aria-expanded` em toggles;
- `aria-current` em navegação;
- `role="status"` e `aria-live` em estados;
- dialogs com `aria-modal`;
- labels em formulários;
- tratamento de Enter e Espaço em alguns controles customizados;
- `aria-busy` em mutações;
- `aria-selected` em alguns modos de seleção.

Entretanto, essas iniciativas foram implementadas por página e por componente, sem uma autoridade transversal.

O sistema atual combina:

```text
semântica nativa
+
ARIA adicionada localmente
+
controles não nativos
+
listeners globais de teclado
+
focus restore por componente
+
live regions por página
+
toasts independentes
+
roteamento sem foco de chegada
+
CSS que remove outline
```

Isso produz inconsistências como:

- uma busca visualmente navegável que não expõe a opção ativa ao leitor de tela;
- cards acionáveis por clique, mas não por teclado;
- `role="button"` dentro de um botão nativo;
- drawers com `role="dialog"`, mas sem focus trap;
- dialogs que devolvem foco, mas não tornam o fundo inerte;
- múltiplas live regions anunciando o mesmo ciclo;
- estados dinâmicos que criam uma nova live region a cada render;
- páginas críticas sem um `h1` de rota previsível;
- focus outlines removidos sem substituição universal;
- vídeo iniciando ao receber foco;
- cores de texto secundário abaixo do contraste necessário para texto normal.

A causa raiz não é a ausência total de ARIA.

A causa raiz é a ausência de uma arquitetura que governe:

```text
estrutura
nome acessível
descrição
estado
teclado
foco
modalidade
anúncio
contraste
mídia alternativa
```

---

## 5. Estado positivo a preservar

### 5.1 Idioma do documento

As páginas auditadas usam:

```html
<html lang="pt-BR">
```

Regra:

- preservar `pt-BR` como idioma principal;
- marcar trechos em outro idioma com `lang` específico quando necessário;
- não inserir termos ingleses operacionais sem contexto ou tradução acessível.

### 5.2 Meta viewport permite zoom

Não foi observado bloqueio explícito de zoom.

Regra:

- preservar zoom do usuário;
- nunca adicionar `user-scalable=no`;
- nunca fixar `maximum-scale=1`.

### 5.3 Controles nativos já são predominantes

Grande parte dos CTAs utiliza:

- `<button>`;
- `<a>`;
- `<input>`;
- `<select>`;
- `<textarea>`.

Esses elementos devem continuar sendo a primeira escolha.

### 5.4 Estados de expansão já são parcialmente expostos

Diversos toggles usam:

```text
aria-expanded
aria-controls
aria-haspopup
```

O trabalho futuro deve corrigir valores e relações, não remover o estado.

### 5.5 Dialog principal possui nome e descrição

O system dialog já usa:

```text
role="dialog"
aria-modal="true"
aria-labelledby
aria-describedby
```

A estrutura deve ser preservada e integrada ao lifecycle modal canônico.

### 5.6 Loading usa `aria-busy`

O renderer compartilhado marca a região como ocupada.

Regra:

- manter `aria-busy` na região que está sendo atualizada;
- remover ou definir `false` ao concluir;
- não aplicar `aria-busy` ao documento inteiro por uma operação local.

### 5.7 Navegação usa `aria-current`

Bottom nav, sidebar e drawer já possuem caminhos para expor rota ativa.

Regra:

- somente um item por conjunto de navegação recebe `aria-current="page"`;
- o estado visual e o estado acessível devem convergir.

---

## 6. Classificação de severidade

### P0 — bloqueio funcional

Problema que impede uma tarefa crítica ou cria informação materialmente incorreta para tecnologia assistiva.

Exemplos:

- ação indisponível por teclado;
- foco preso ou perdido;
- modal sem contenção;
- leitor de tela não percebe resultado de busca;
- sucesso ou erro não anunciado em mutação crítica;
- contraste que torna texto essencial ilegível;
- rota nova sem contexto acessível.

### P1 — degradação significativa

Problema que mantém a tarefa possível, mas aumenta muito custo, ambiguidade ou risco.

Exemplos:

- heading hierarchy inconsistente;
- região sem nome;
- anúncio repetido;
- label genérica;
- alt text pouco informativo;
- navegação de setas ausente em widget composto.

### P2 — refinamento

Melhoria que reduz fricção sem bloquear a tarefa.

Exemplos:

- texto de ajuda mais conciso;
- agrupamento semântico adicional;
- melhor descrição de duração;
- announcement de contagem não crítica.

---

## 7. Achados P0

### 7.1 Não existe skip link canônico

A Home e outras páginas iniciam com preloader, shell, sidebar e header antes do `main`.

Não foi encontrada uma autoridade global para:

```text
Pular para o conteúdo principal
```

Consequência:

- usuários de teclado atravessam repetidamente toda a navegação;
- leitores de tela recebem mais landmarks antes da tarefa principal;
- a navegação interna pode trocar o conteúdo sem oferecer atalho de chegada.

Contrato:

```html
<a class="doke-skip-link" href="#main-content">
  Pular para o conteúdo principal
</a>
```

Cada rota deve possuir:

```html
<main id="main-content" tabindex="-1">
```

O `tabindex="-1"` permite foco programático sem inserir o `main` na ordem natural de Tab.

### 7.2 Autocomplete da busca não implementa combobox

A busca atual:

- abre um dropdown;
- aceita ArrowDown e ArrowUp;
- mantém o foco no input;
- aplica apenas a classe visual `is-active`;
- usa `aria-haspopup="dialog"`;
- não expõe `role="combobox"`;
- não usa `role="listbox"` de forma canônica;
- não atribui IDs às opções;
- não atualiza `aria-activedescendant`;
- não atualiza `aria-selected`.

Consequência:

- usuário visual percebe a opção ativa;
- leitor de tela pode continuar anunciando apenas o texto digitado;
- o número de resultados e a opção selecionada ficam silenciosos;
- `aria-haspopup="dialog"` descreve um widget diferente do comportamento real.

Contrato:

```text
input
role=combobox
aria-autocomplete=list
aria-expanded
aria-controls=<listbox-id>
aria-activedescendant=<option-id>
```

```text
container
role=listbox
```

```text
opção
role=option
id único
aria-selected
```

Teclado obrigatório:

```text
ArrowDown → próxima opção
ArrowUp   → opção anterior
Home      → primeira opção
End       → última opção
Enter     → confirmar opção
Escape    → fechar sem limpar valor
Tab       → aceitar foco seguinte e fechar
```

### 7.3 Cards e tags possuem ações mouse-only

A Home adiciona click delegation para:

- `.service-card`;
- `.service-card__tags span`.

Um card inteiro pode navegar ao detalhe por clique.

Uma tag em `<span>` pode iniciar busca por clique.

Se esses elementos não forem links ou botões nativos:

- não entram na ordem de Tab;
- não respondem a Enter ou Espaço;
- não possuem nome de ação;
- não expõem destino;
- não funcionam com switch control e comandos por voz de forma previsível.

Contrato:

```text
navegação → <a href>
ação local → <button type="button">
texto decorativo → sem listener de click
```

O card não deve depender de um listener no container para sua ação principal.

A anatomia deve fornecer um link principal explícito e permitir que favoritos, perfil e tags sejam controles irmãos, não controles aninhados.

### 7.4 Controle duplicado dentro de botão nativo

Home e Resultados possuem um avatar com:

```html
<span role="button" tabindex="0">
```

dentro de:

```html
<button type="button">
```

Consequência:

- dois controles podem ser anunciados para uma única intenção;
- a ordem de Tab pode ganhar um ponto redundante;
- eventos de teclado e clique podem duplicar abertura;
- o nome acessível pode divergir entre avatar e botão.

Contrato:

- o botão externo é a única autoridade interativa;
- avatar interno é conteúdo visual;
- avatar interno usa `aria-hidden="true"` somente quando o nome do botão já é suficiente;
- nunca inserir `role="button"` em descendente de botão.

### 7.5 Drawer modal não possui lifecycle de foco

O drawer canônico usa:

```text
role="dialog"
aria-modal="true"
```

Porém, ao abrir, o fluxo observado não:

- registra de forma canônica o trigger específico;
- move foco para o drawer;
- contém Tab e Shift+Tab;
- torna o fundo inerte;
- restaura foco ao trigger correto;
- coordena Escape com uma stack de overlays.

Além disso, todos os triggers encontrados recebem o mesmo `aria-expanded`.

Consequência:

- foco pode permanecer no conteúdo de fundo;
- leitor de tela pode navegar fora do dialog modal;
- o usuário pode fechar o drawer e perder posição;
- múltiplos botões podem parecer simultaneamente expandidos.

Contrato:

```text
abrir
→ registrar trigger
→ adicionar à OverlayStack
→ tornar fundo inert
→ focar primeiro controle
→ ativar focus trap
```

```text
fechar
→ remover da OverlayStack
→ remover inert
→ restaurar foco no trigger conectado
```

Somente o trigger que abriu a instância recebe:

```text
aria-expanded="true"
```

### 7.6 System dialog não contém foco nem isola o fundo

O system dialog:

- move foco para confirm ou textarea;
- fecha com Escape;
- devolve foco ao elemento anterior.

Porém, não foi observado:

- focus trap;
- `inert` no fundo;
- fallback se `previousFocus` foi removido;
- coordenação com outros overlays;
- cancelamento transacional por troca de rota.

Consequência:

- Tab pode sair do dialog;
- leitor de tela pode alcançar controles do fundo;
- foco pode ser devolvido a nó desconectado;
- Promises podem permanecer pendentes quando a rota limpa o DOM externamente.

Contrato:

- integrar o system dialog a `Doke.overlayManager`;
- usar o mesmo focus lifecycle dos demais overlays;
- resolver a Promise com motivo explícito;
- possuir fallback de foco para `main` da rota.

### 7.7 Navegação interna não possui chegada acessível canônica

A troca de rota preserva shell e substitui conteúdo.

Sem um contrato único, o foco pode continuar:

- em link da rota anterior;
- em elemento removido;
- no `body`;
- em overlay fechado por mutação direta.

A alteração do `<title>` não garante announcement suficiente em todos os leitores de tela.

Contrato:

```text
route ready
→ atualizar title
→ atualizar h1
→ focar destino de chegada
→ anunciar rota uma vez
```

Destino de chegada:

```text
[data-route-focus-target]
→ h1 da rota
→ main
```

Announcement:

```text
Página carregada: Resultados da busca
```

A navegação por `popstate` deve restaurar contexto sem anunciar repetidamente o mesmo título.

### 7.8 Focus indicator é removido sem substituição universal

O sistema visual móvel define:

```css
.doke-btn:focus-visible,
.doke-icon-btn:focus-visible,
.doke-input:focus-visible,
.doke-select:focus-visible,
.doke-textarea:focus-visible {
  outline: 0;
}
```

Somente algumas variantes recebem box-shadow específico.

Consequência:

- botões primários, ghost, danger e links podem não possuir foco perceptível;
- usuários de teclado não sabem qual controle está ativo;
- overflow de containers pode cortar o pouco indicador restante.

Contrato global:

```css
:where(
  a,
  button,
  input,
  select,
  textarea,
  summary,
  [tabindex]:not([tabindex="-1"])
):focus-visible {
  outline: 3px solid var(--doke-focus-ring-color);
  outline-offset: 3px;
}
```

Variantes podem complementar, nunca remover sem substituto equivalente.

Requisitos:

- contraste mínimo do indicador contra superfícies adjacentes;
- área perceptível em todos os lados;
- não depender somente de mudança sutil de sombra;
- não ser cortado por `overflow: hidden`.

### 7.9 Live regions são fragmentadas e concorrentes

Foram observadas:

- regiões de estado por página;
- `role="status"` em renderers;
- `aria-live="polite"` em containers;
- alerts em erros;
- toasts operacionais;
- notificações in-app;
- quick priority da sidebar;
- estados de loading inseridos dinamicamente.

Problemas:

- uma atualização pode ser anunciada mais de uma vez;
- uma região criada e preenchida na mesma operação pode não ser anunciada consistentemente;
- uma região `hidden` não anuncia conteúdo;
- `replaceChildren` pode destruir o nó vivo e recriá-lo;
- loading, resultado e toast podem competir;
- mensagens críticas podem usar `polite` quando exigem atenção imediata;
- mensagens não críticas podem usar `alert` e interromper leitura.

Contrato:

```text
Doke.accessibilityExperience.liveRegions
├── polite
├── assertive
└── route
```

Nós vivos são persistentes desde o bootstrap.

A API atualiza `textContent` após limpar o valor em frame anterior quando necessário.

Categorias:

```text
polite
- carregamento concluído
- filtros aplicados
- contagem atualizada
- item salvo

assertive
- erro de mutação crítica
- sessão expirada
- ação bloqueada
- risco imediato de perda de dados

focus instead of live
- primeiro erro de formulário
- dialog aberto
- rota nova
```

### 7.10 Páginas críticas não possuem heading de rota consistente

Home e Resultados auditados possuem muitos `section`, labels e headings de bloco, mas não apresentam um `h1` de rota claro no trecho estrutural principal.

Pedidos também não apareceu na inventariação de `h1` realizada durante a auditoria.

Consequência:

- leitores de tela não encontram rapidamente o assunto principal;
- navegação por headings fica inconsistente;
- route focus não possui alvo semântico estável;
- title e conteúdo podem divergir.

Contrato:

- cada rota possui exatamente um `h1` visível ou visualmente oculto;
- o `h1` descreve a rota, não a seção;
- headings não saltam níveis por razão visual;
- estilos são aplicados por classe, nunca escolhendo nível semântico por tamanho.

Exemplos:

```text
Home          → Serviços perto de você
Resultados    → Resultados para “pintura”
Pedidos       → Pedidos
Mensagens     → Mensagens
Notificações  → Notificações
```

### 7.11 Lista de conversas mistura option e ordem de Tab

O controller de Mensagens pode converter cada item em:

```text
role="option"
aria-selected
 tabindex=0
```

Questões:

- o parent precisa ser `role="listbox"` quando options são usados;
- todas as options com `tabindex=0` criam muitos pontos de Tab;
- seleção e abertura de conversa são intenções diferentes;
- o modo normal não deve anunciar itens como selecionáveis se não há seleção ativa;
- o estado deve usar roving tabindex ou `aria-activedescendant`.

Contrato recomendado:

Modo normal:

```text
lista de links ou botões
sem role=option
```

Modo seleção:

```text
role=listbox
aria-multiselectable=true
options com aria-selected
um único tabindex=0
restante tabindex=-1
```

Teclado:

```text
ArrowDown/ArrowUp → mover item ativo
Space             → alternar seleção
Enter             → abrir ou confirmar conforme modo explícito
Escape            → sair do modo seleção
```

### 7.12 Listbox customizado financeiro não possui contrato completo

O modal de cobrança mantém:

- um `<select>` nativo com `aria-hidden="true"` e `tabindex="-1"`;
- um botão customizado com `aria-haspopup="listbox"`;
- opções implementadas como buttons com `role="option"`.

Riscos:

- o botão precisa de `aria-controls`;
- o listbox precisa de nome acessível;
- a opção ativa precisa de foco ou `aria-activedescendant`;
- ArrowUp, ArrowDown, Home, End, Enter, Escape e typeahead precisam ser definidos;
- falha de JavaScript não pode deixar o select nativo indisponível;
- o valor confirmado precisa convergir com o select real.

Contrato:

- preferir `<select>` nativo quando não há exigência material de widget customizado;
- custom listbox só é permitido com implementação WAI-ARIA completa;
- fallback nativo permanece operável até a hidratação do custom widget;
- `aria-hidden` só é aplicado depois que o custom widget está funcional.

### 7.13 Worker inicia movimento ao receber foco e abre sem foco modal

Os cards de Worker iniciam preview em:

```text
mouseenter
pointerenter
focusin
```

O preview completo pode abrir e iniciar reprodução automática sem mover foco para sua superfície.

Consequência:

- navegar por teclado inicia movimento inesperado;
- usuário com sensibilidade a movimento pode ser afetado;
- leitor de tela permanece no trigger enquanto um modal visual ocupa a tela;
- controles do preview podem não ser descobertos;
- ArrowUp e ArrowDown globais podem interceptar navegação fora de um foco modal real.

Contrato:

- `focusin` não inicia vídeo automaticamente por padrão;
- `prefers-reduced-motion: reduce` desativa autoplay e scroll animado;
- abrir preview move foco para close ou heading;
- root recebe semântica modal e nome acessível;
- foco fica contido;
- vídeo inicia somente após política explícita;
- play/pause atualiza `aria-label` e `aria-pressed`;
- captions ou transcript são exigidos quando há fala ou informação sonora relevante.

### 7.14 Contraste insuficiente em textos secundários

A auditoria calculou, a partir dos pares de cores declarados:

```text
#8ca1b8 sobre #ffffff → aproximadamente 2,66:1
#9aabbd sobre #ffffff → aproximadamente 2,35:1
#8392a6 sobre #ffffff → aproximadamente 3,17:1
#69809d sobre #eef4f9 → aproximadamente 3,66:1
#7f93ac sobre #ffffff → aproximadamente 3,15:1
```

Esses valores ficam abaixo de `4.5:1` para texto normal.

As cores aparecem em contextos como:

- placeholder;
- labels da bottom nav;
- textos muted;
- status secundários;
- metadados pequenos.

Contrato:

```text
texto normal                 → mínimo 4.5:1
texto grande                 → mínimo 3:1
ícones e bordas essenciais   → mínimo 3:1
focus indicator              → mínimo 3:1 contra adjacências
```

A validação final deve usar cores computadas, considerando:

- transparência;
- gradiente;
- backdrop-filter;
- hover;
- disabled;
- dark mode futuro;
- forced colors.

---

## 8. Achados P1

### 8.1 `aria-haspopup="true"` sem tipo explícito

Alguns triggers usam:

```text
aria-haspopup="true"
```

Contrato:

- menu → `aria-haspopup="menu"`;
- listbox → `aria-haspopup="listbox"`;
- dialog → `aria-haspopup="dialog"`;
- tree/grid conforme widget real;
- não usar `true` quando o tipo é conhecido.

### 8.2 Regiões excessivas por `section aria-label`

Uma `<section>` com nome acessível normalmente vira landmark region.

Muitas seções nomeadas podem poluir a lista de landmarks.

Contrato:

- usar `section` com heading quando a seção precisa de estrutura;
- usar `aria-label` somente quando o landmark é útil;
- não transformar cada rail, card ou bloco visual em região navegável.

### 8.3 Sidebar sem nome antes da hidratação

O HTML inicial injeta:

```html
<aside class="sidebar"></aside>
```

O conteúdo é adicionado por JavaScript.

Contrato:

- o landmark deve possuir nome estável desde o primeiro paint;
- usar `aria-label="Navegação lateral"` ou conter `nav` nomeado;
- evitar landmark vazio exposto durante carregamento.

### 8.4 Skeleton e status podem ser anunciados em duplicidade

Mensagens expõe:

- região viva com “Carregando conversas”;
- seção skeleton com `aria-label="Carregando conversas"`;
- preloader com `aria-label="Carregando Doke"`.

Contrato:

- skeleton visual deve ser `aria-hidden="true"` por completo;
- um único status persistente anuncia loading;
- não anunciar cada placeholder.

### 8.5 Alt texts genéricos

Exemplos observados:

```text
Imagem ampliada
Preview do anexo
Doke
```

Contrato:

- imagem informativa usa descrição contextual;
- imagem decorativa usa `alt=""`;
- lightbox preserva o alt da miniatura ou recebe descrição da entidade;
- avatar com iniciais recebe nome somente se adiciona informação;
- não repetir texto adjacente desnecessariamente.

### 8.6 Mudança de contador sem anúncio

Curtir Worker altera visualmente:

- número;
- label do botão;
- classe ativa.

Contrato:

- botão usa `aria-pressed`;
- nome permanece estável: `Curtir Worker`;
- estado é anunciado por `aria-pressed`;
- contador pode usar texto acessível separado;
- evitar trocar entre “Curtir” e “Descurtir” como única fonte de estado quando também existe toggle semantics.

### 8.7 Popovers e menus sem padrão único

Profile dropdowns são containers genéricos com links e buttons.

Contrato:

- popover simples com navegação normal pode usar links na ordem DOM, sem `role=menu`;
- se usar menu ARIA, implementar roving tabindex e setas;
- não misturar `doke-menu` visual com semântica incompleta;
- Escape fecha e restaura foco;
- click externo fecha sem perder foco inesperadamente.

### 8.8 Toolbar sem navegação opcional por setas

Headers usam `role="toolbar"` em grupos de ações.

Contrato:

- toolbars pequenas podem manter Tab em cada controle;
- toolbars densas podem implementar roving tabindex;
- a escolha deve ser consistente;
- toolbar precisa de nome acessível;
- `aria-pressed` é usado somente para toggle real, não para link de navegação.

### 8.9 `aria-busy` precisa de lifecycle completo

Algumas regiões iniciam com:

```text
aria-busy="true"
```

Contrato:

- `true` somente enquanto atualização está ativa;
- `false` ou remoção após conclusão;
- erro também encerra busy;
- busy local não bloqueia leitura de conteúdo stale preservado.

### 8.10 Abreviações visuais na bottom nav

Exemplo:

```text
Comun.
```

Contrato:

- texto visual pode ser abreviado se necessário;
- nome acessível deve ser completo: `Comunidade`;
- preferir reflow ou label curta oficial, não truncamento ambíguo.

---

## 9. Autoridade proposta

Criar uma autoridade transversal:

```text
Doke.accessibilityExperience
```

Responsabilidades:

```text
bootstrapLandmarks()
ensureSkipLink()
registerRoute()
focusRouteArrival()
announceRoute()
announcePolite()
announceAssertive()
setBusy()
clearBusy()
validateAccessibleName()
registerCompositeWidget()
registerModal()
restoreFocus()
applyInert()
removeInert()
getFocusSnapshot()
```

Integrações obrigatórias:

```text
Doke.accessibilityExperience
├── Doke.overlayManager
├── Doke.routeFocusManager
├── Doke.routeAnnouncer
├── Doke.formValidation
├── Doke.formErrorSummary
├── Doke.notificationCenter
├── Doke.responsiveExperience
└── Doke.contentCatalog
```

A autoridade não deve:

- adicionar `role="button"` automaticamente a qualquer nó com click;
- inferir labels a partir de classes;
- esconder erros de auditoria;
- corrigir HTML inválido apenas no runtime;
- remover foco do usuário;
- anunciar cada mutação do DOM.

---

## 10. Estrutura canônica de página

Cada rota deve convergir para:

```html
<body data-page="resultados">
  <a class="doke-skip-link" href="#main-content">
    Pular para o conteúdo principal
  </a>

  <div class="app-shell">
    <aside aria-label="Navegação lateral">...</aside>

    <div class="page">
      <header>...</header>

      <main id="main-content" tabindex="-1">
        <h1 data-route-focus-target>Resultados para “pintura”</h1>
        ...
      </main>
    </div>
  </div>
</body>
```

Landmarks permitidos:

```text
header/banner
nav
main
aside/complementary
footer/contentinfo
search
form quando nomeado e relevante
region quando realmente útil
```

Regras:

- apenas um `main` visível por rota;
- headers internos não precisam sempre ser `banner`;
- múltiplas `nav` devem possuir labels distintas;
- múltiplos `aside` devem possuir labels distintas;
- não usar role redundante quando o elemento nativo já fornece a semântica;
- conteúdo escondido não pode permanecer como landmark acessível.

---

## 11. Hierarquia de headings

Contrato:

```text
h1 → assunto da rota
h2 → seções principais
h3 → subseções ou títulos de cards relevantes
h4 → conteúdo interno dependente de h3
```

Regras:

- não escolher heading por tamanho visual;
- não usar `<strong>` como substituto de heading estrutural;
- cards repetidos podem usar `h2` ou `h3` conforme contexto;
- headings ocultos visualmente usam classe utilitária canônica;
- texto de loading não substitui heading da rota;
- estados empty/error preservam o heading da rota.

Estados condicionais:

```text
loading → h1 presente
ready   → mesmo h1
empty   → mesmo h1
error   → mesmo h1
```

O usuário não deve perder estrutura quando a coleção muda de estado.

---

## 12. Nomes acessíveis

### 12.1 Icon buttons

Todo icon button precisa de nome específico.

Correto:

```html
<button aria-label="Abrir filtros">...</button>
```

Evitar:

```text
Abrir
Ação
Mais
Ícone
```

Quando há vários controles semelhantes, incluir contexto:

```text
Salvar anúncio “Pintura residencial”
Abrir comentários do Worker “Reforma da cozinha”
Remover anexo “orcamento.pdf”
```

### 12.2 Estado não deve substituir identidade

Para toggle:

```text
nome: Salvar anúncio
estado: aria-pressed=true|false
```

Não depender somente de:

```text
Salvar
Remover
```

como labels alternadas.

### 12.3 Labels visíveis

Campos críticos devem possuir label visível.

Placeholder:

- é exemplo ou dica;
- não é label;
- desaparece ao digitar;
- não substitui instrução persistente.

### 12.4 Descrição e erro

Campo com ajuda e erro:

```html
<input
  aria-describedby="phone-help phone-error"
  aria-invalid="true"
>
```

A ordem da descrição deve ser:

```text
label
valor
estado inválido
ajuda relevante
erro atual
```

---

## 13. Regra native-first

Ordem de decisão:

```text
1. elemento HTML nativo
2. combinação de elementos nativos
3. progressive enhancement
4. ARIA composite widget somente quando indispensável
```

### Link

Use quando a intenção muda URL ou contexto navegável.

### Button

Use quando a intenção altera estado local, abre overlay ou executa comando.

### Checkbox

Use para escolhas independentes.

### Radio

Use para uma escolha exclusiva em conjunto.

### Select

Use para lista de opções simples.

### Details/Summary

Pode ser usado para conteúdo expansível não modal.

### Dialog

Preferir `<dialog>` quando o lifecycle e suporte forem controlados.

ARIA não deve transformar:

```text
span → button
article → link
section → dialog
```

quando a estrutura pode ser corrigida no HTML.

---

## 14. Contrato de teclado global

### 14.1 Ordem de Tab

A ordem deve seguir o DOM e a leitura visual.

Proibido:

- `tabindex` positivo;
- mover controles visualmente para ordem diferente sem necessidade;
- todos os itens de uma lista composta com `tabindex=0`;
- elementos invisíveis ou cobertos na ordem de Tab.

### 14.2 Enter e Espaço

- link nativo responde a Enter;
- button nativo responde a Enter e Espaço;
- não duplicar listeners sem necessidade;
- widgets customizados implementam ambos conforme padrão.

### 14.3 Escape

Escape fecha apenas o overlay no topo.

Não deve simultaneamente:

- fechar drawer;
- fechar modal;
- limpar busca;
- sair de seleção;
- fechar popover de fundo.

Prioridade:

```text
OverlayStack.top
→ composite widget ativo
→ modo de seleção
→ busca expandida
```

### 14.4 Setas

Setas são reservadas para widgets compostos com semântica correspondente:

- combobox/listbox;
- tabs;
- radio group customizado;
- menu;
- grid;
- carousel com foco interno;
- feed vertical modal explicitamente documentado.

Listeners globais não devem capturar setas quando foco está em:

- input;
- textarea;
- select;
- editor;
- conteúdo com scroll próprio não relacionado.

### 14.5 Atalhos

Atalhos futuros devem:

- evitar conflito com browser e leitor de tela;
- permitir descoberta;
- permitir desativação;
- nunca ser a única forma de executar uma ação.

---

## 15. Focus management

### 15.1 Princípios

```text
foco acompanha intenção
foco não acompanha animação
foco não salta sem causa
foco não desaparece
foco não entra em conteúdo inert
```

### 15.2 Abertura de overlay

Prioridade de foco:

```text
campo obrigatório inicial
→ ação primária segura
→ botão fechar
→ superfície tabindex=-1
```

Para confirmação destrutiva:

- foco inicial preferencial no botão cancelar;
- ação destrutiva não deve ser confirmada por Enter global involuntário.

### 15.3 Fechamento

Restaurar para:

```text
trigger original conectado
→ equivalente por focusReturnKey
→ heading da rota
→ main
```

### 15.4 Atualização de lista

Filtros, paginação ou retry não devem mover foco automaticamente para o topo.

Mover foco somente quando:

- usuário solicitou “Ir para resultados”;
- o item focado foi removido;
- ocorreu erro que exige correção;
- uma nova página de paginação substituiu completamente a coleção.

### 15.5 Exclusão

Após excluir item:

```text
próximo item
→ item anterior
→ heading da lista
→ estado vazio
```

### 15.6 Loading

Não mover foco para skeleton ou spinner.

---

## 16. Overlays

Todo overlay modal deve possuir:

- nome acessível;
- descrição quando necessária;
- `aria-modal="true"` ou `<dialog>` aberto modalmente;
- focus trap;
- fundo inerte;
- Escape no topo;
- close button com nome;
- retorno de foco;
- scroll lock compatível com zoom e teclado;
- cleanup em troca de rota.

Overlay não modal:

- não usa `aria-modal`;
- permite Tab sair;
- fecha por Escape quando ativo;
- restaura foco quando apropriado;
- expõe relação com trigger.

Backdrops:

- não precisam ser ponto de Tab;
- não devem ser a única forma de fechar;
- clique em backdrop não deve fechar confirmação destrutiva sem política explícita.

---

## 17. Live region manager

### 17.1 Estrutura

Bootstrap persistente:

```html
<div class="sr-only" aria-live="polite" aria-atomic="true" data-a11y-live="polite"></div>
<div class="sr-only" aria-live="assertive" aria-atomic="true" data-a11y-live="assertive"></div>
<div class="sr-only" aria-live="polite" aria-atomic="true" data-a11y-live="route"></div>
```

### 17.2 Deduplicação

Assinatura:

```text
channel + message + contextKey
```

A mesma mensagem não é repetida dentro de uma janela curta, exceto quando:

- usuário executou nova tentativa;
- contexto mudou;
- status crítico mudou.

### 17.3 Mensagens

Boas:

```text
12 resultados encontrados.
Filtros aplicados. 4 resultados encontrados.
Mensagem enviada.
Anúncio salvo nos favoritos.
Não foi possível enviar a mensagem.
```

Ruins:

```text
Sucesso.
Atualizado.
Erro.
Carregando.
```

### 17.4 Progress

Para processos longos:

- anunciar início uma vez;
- anunciar conclusão;
- anunciar erro;
- não anunciar cada frame ou percentual salvo quando não útil.

---

## 18. Busca acessível

Além do combobox:

- o input possui label persistente ou visually hidden;
- o dropdown tem nome;
- a contagem é anunciada;
- histórico, sugestões e resultados são grupos distinguíveis;
- botão Limpar informa o escopo;
- Escape fecha e mantém o valor;
- pesquisa recente pode ser removida individualmente no futuro;
- loading de sugestões usa busy no listbox;
- erro remoto não é anunciado como zero resultados;
- resultado local e resultado remoto têm linguagem honesta.

Exemplo:

```text
Sugestões, lista com 5 opções.
Pintura residencial, 1 de 5.
```

---

## 19. Filtros e tabs

### 19.1 Filtros

Chips de filtro são buttons ou checkboxes conforme semântica.

Estado:

```text
aria-pressed
ou
checked
```

Não usar seleção apenas por cor.

### 19.2 Tabs

Usar tab pattern somente quando controles alternam painéis na mesma rota.

Estrutura:

```text
role=tablist
role=tab
aria-selected
aria-controls
role=tabpanel
aria-labelledby
```

Teclado:

```text
ArrowLeft/ArrowRight
Home/End
Enter/Space quando activation manual
```

### 19.3 Radio group

Tipos de resultado em Resultados podem continuar como radios nativos.

O botão Filtros deve ficar fora do `radiogroup` para não aparecer como descendente não-radio do conjunto.

---

## 20. Cards, rails e coleções

### 20.1 Card de anúncio

Estrutura recomendada:

```html
<article>
  <a href="..." aria-labelledby="service-title-123">
    ...
    <h2 id="service-title-123">Pintura residencial</h2>
  </a>
  <button aria-label="Salvar anúncio Pintura residencial" aria-pressed="false">...</button>
</article>
```

Regras:

- sem button dentro de link;
- sem link dentro de button;
- link principal visível ou stretched link sem cobrir controles irmãos;
- CTA duplicado pode ser removido do accessibility tree somente se realmente redundante e não focável;
- preço, profissional e localização fazem parte do nome/descritivo somente quando úteis.

### 20.2 Rail horizontal

O rail deve:

- possuir heading;
- permitir scroll touch;
- permitir navegação por Tab entre links naturais;
- não obrigar ArrowLeft/ArrowRight globalmente;
- oferecer controles anterior/próximo nomeados quando presentes;
- desabilitar controle no limite;
- anunciar nova página de itens somente quando carregada por ação explícita.

### 20.3 Seleção múltipla

Coleções selecionáveis precisam distinguir:

```text
abrir item
selecionar item
```

Checkbox é preferível quando possível.

---

## 21. Formulários

Integração com UX-007:

- label visível;
- instrução antes do erro;
- `aria-required` somente quando necessário além do atributo `required`;
- `aria-invalid` após validação relevante;
- `aria-describedby` para ajuda e erro;
- error summary focável;
- foco no primeiro erro;
- submit busy anunciado;
- botão permanece com nome estável;
- spinner é `aria-hidden`;
- sucesso não depende somente de toast temporário.

### 21.1 Error summary

```html
<section role="alert" tabindex="-1" aria-labelledby="form-errors-title">
  <h2 id="form-errors-title">Revise 3 campos</h2>
  <ul>
    <li><a href="#email">Informe um e-mail válido</a></li>
  </ul>
</section>
```

### 21.2 Campos financeiros

- valor possui label e formato anunciado;
- moeda não depende apenas de prefixo visual;
- parcelas são anunciadas integralmente;
- confirmação inclui valor e consequência;
- outcome desconhecido é anunciado sem permitir retry cego.

### 21.3 Upload

- input possui nome acessível;
- tipos e limites são descritos antes da escolha;
- arquivo selecionado é anunciado;
- erro de arquivo fica junto ao controle;
- preview de imagem usa alt contextual;
- remoção do anexo restaura foco.

---

## 22. Mensagens e chat

### 22.1 Lista de conversas

- usar links/buttons no modo normal;
- nome incluir pessoa, preview e estado quando útil;
- unread não depender somente de badge visual;
- timestamp usar `<time datetime>`;
- status online não depender somente de ponto verde.

### 22.2 Thread

- heading identifica conversa;
- mensagens são agrupadas em lista ou feed;
- cada mensagem possui autor e tempo;
- mensagem própria não depende somente de alinhamento ou cor;
- novas mensagens são anunciadas sem interromper digitação;
- histórico carregado acima preserva posição e foco.

### 22.3 Composer

O botão de emoji não deve ficar dentro de um `<label>` que engloba o textarea.

Estrutura:

```html
<label for="message-input">Mensagem</label>
<div class="composer-field">
  <textarea id="message-input"></textarea>
  <button aria-label="Adicionar emoji">...</button>
</div>
```

### 22.4 Reply e anexos

- reply preview é anunciado quando criado;
- cancelar reply restaura foco ao textarea;
- anexos possuem nome, tipo e tamanho;
- audio draft possui status e tempo sem updates por segundo em live region.

---

## 23. Mídia

### 23.1 Imagens

Decisão de alt:

```text
informativa → descrição útil
decorativa  → alt=""
repetida    → alt="" quando texto adjacente já cobre
funcional   → nome da ação no link/button
```

### 23.2 Before/after

Deve oferecer:

- labels “Antes” e “Depois” programáticas;
- descrição do que mudou;
- ordem de leitura equivalente à composição visual;
- alternativa textual quando o contraste visual é a única informação.

### 23.3 Vídeo

Requisitos:

- play/pause por button;
- estado exposto;
- duração textual;
- captions quando há fala;
- transcript quando necessário;
- descrição de informação exclusivamente visual quando material;
- autoplay desativado em reduced motion;
- sem autoplay por foco;
- controles acessíveis por teclado;
- volume e mute anunciados quando disponíveis.

### 23.4 Áudio

- transcript ou alternativa equivalente;
- duração;
- play/pause;
- progresso não anunciado continuamente;
- gravação possui status claro e ação cancelar.

---

## 24. Tabelas e dados

Tabelas de admin e operação devem possuir:

- `<caption>` visível ou visually hidden;
- `<th scope="col">`;
- `<th scope="row">` quando aplicável;
- headers associados;
- status textual;
- ações com contexto;
- ordem de leitura estável.

Exemplo:

```text
Aprovar anúncio “Pintura residencial”, de Carlos Andrade
```

Não apenas:

```text
Aprovar
```

Responsividade:

- tabela pode rolar horizontalmente em região nomeada;
- foco não deve ficar oculto;
- transformação em cards precisa preservar headers no nome de cada valor;
- não esconder colunas essenciais apenas por viewport.

Gráficos:

- resumo textual;
- tabela alternativa quando necessário;
- cores acompanhadas de labels/padrões;
- tooltip acessível por teclado;
- valor não depender de hover.

---

## 25. Contraste e uso de cor

### 25.1 Tokens semânticos

Criar tokens auditáveis:

```text
--doke-text-primary
--doke-text-secondary-accessible
--doke-text-placeholder-accessible
--doke-icon-muted-accessible
--doke-focus-ring-color
--doke-link-color
--doke-link-color-visited
```

### 25.2 Estados

Selected, unread, error, success e warning precisam de pelo menos dois sinais.

Exemplos:

```text
cor + ícone
cor + texto
cor + peso
cor + borda
```

Não suficiente:

```text
apenas verde
apenas vermelho
apenas fundo azul
```

### 25.3 Disabled

Disabled pode ter contraste reduzido, mas:

- label ainda deve ser legível;
- estado deve ser programático;
- motivo deve estar disponível quando a indisponibilidade não é óbvia;
- `aria-disabled` em link exige bloqueio de ação e manutenção de foco quando explicação é necessária.

### 25.4 Forced colors

Em `forced-colors: active`:

- preservar outline;
- usar cores do sistema;
- não depender de background image;
- selected e focus continuam visíveis;
- ícones SVG usam `currentColor`.

---

## 26. Motion e cognição

Com `prefers-reduced-motion: reduce`:

- desativar autoplay de preview;
- remover smooth scroll não essencial;
- reduzir transições de rota;
- evitar parallax e zoom;
- manter feedback instantâneo por estado estático.

Animação não deve:

- ser a única indicação de loading;
- mover foco;
- atrasar disponibilidade do controle;
- reaparecer repetidamente sem ação;
- produzir flashes acima de limites seguros.

Conteúdo temporal:

- toast crítico não desaparece antes de ser percebido;
- ações não expiram sem aviso;
- usuário pode pausar conteúdo auto-atualizado quando necessário.

---

## 27. Preloader, skeleton e hidratação

Contrato:

```text
preloader visual
→ aria-hidden=true

status persistente
→ anuncia “Carregando Doke” uma vez
```

Ao concluir:

- remover busy;
- anunciar somente quando demora foi perceptível;
- não mover foco;
- preservar heading da rota;
- não expor skeleton como artigos reais;
- não deixar controles do conteúdo final focáveis enquanto visualmente cobertos.

Falha de hidratação:

- remover preloader;
- mostrar erro visível;
- oferecer retry;
- focar erro somente quando bloqueia a rota;
- não deixar usuário em tela coberta indefinidamente.

---

## 28. Navegação e anúncios de rota

Direct load, F5, navegação interna, back e forward devem convergir para:

```text
mesmo title
mesmo h1
mesmos landmarks
mesmo foco de chegada
mesmo anúncio
mesma ordem de Tab
```

Não anunciar rota quando:

- apenas filtro mudou e foco permaneceu no contexto;
- overlay local abriu;
- paginação anexou itens;
- toast foi exibido.

Anunciar contexto específico nesses casos.

---

## 29. Privacidade acessível

Nomes acessíveis e live regions não devem expor mais dados que a interface visível.

Evitar em anúncios globais:

- conteúdo integral de mensagem;
- valor financeiro sensível;
- documento;
- telefone;
- endereço completo;
- motivo detalhado de disputa.

Exemplo seguro:

```text
Nova mensagem recebida.
```

Em contexto autenticado e focado na conversa, detalhes podem ser lidos conforme a interface.

---

## 30. Matriz de QA manual

### 30.1 Teclado desktop

Executar com:

- somente Tab;
- Shift+Tab;
- Enter;
- Espaço;
- Escape;
- setas;
- Home/End;
- PageUp/PageDown quando aplicável.

Cobrir:

- Home;
- Resultados;
- Detalhe;
- Favoritos;
- Pedidos;
- Mensagens;
- Notificações;
- Perfil;
- Configurações;
- pagamento;
- dialogs;
- drawers;
- Worker;
- Publicação.

### 30.2 Leitores de tela

Matriz mínima:

```text
NVDA + Chrome/Firefox em Windows
VoiceOver + Safari em macOS
iOS VoiceOver + Safari
TalkBack + Chrome em Android
```

JAWS pode ser adicionado antes de lançamento empresarial.

### 30.3 Zoom e texto

- 200% zoom;
- 400% zoom;
- texto ampliado;
- orientação portrait/landscape;
- teclado virtual;
- reduced motion;
- forced colors;
- contraste aumentado do sistema.

### 30.4 Estados

Para cada superfície:

```text
loading
ready
empty
error
offline
stale
retrying
submitting
success
unknown outcome
```

### 30.5 Personas

- anônimo;
- cliente;
- profissional;
- suporte/admin;
- usuário com zero dados;
- usuário com muitos dados;
- conta compartilhada no mesmo dispositivo.

---

## 31. Automação de QA

Adicionar futuramente:

- axe-core em páginas críticas;
- auditoria de nomes acessíveis;
- auditoria de headings;
- auditoria de landmarks;
- auditoria de IDs duplicados;
- auditoria de `aria-controls` inexistente;
- auditoria de `aria-labelledby` inexistente;
- auditoria de elementos focáveis dentro de `aria-hidden`;
- auditoria de tabindex positivo;
- auditoria de button dentro de link e link dentro de button;
- auditoria de click em elementos não interativos;
- auditoria de contraste por tokens;
- Playwright keyboard journeys;
- screenshots com forced colors;
- testes de focus trap;
- testes de route focus;
- testes de live region deduplication.

Automação não substitui:

- leitor de tela real;
- julgamento de alt text;
- ordem de leitura;
- clareza de linguagem;
- experiência cognitiva;
- contraste em composições com imagem/gradiente.

---

## 32. Cenários adversariais

### Cenário A — busca por teclado

```text
focar input
→ digitar “pint”
→ ArrowDown
→ leitor anuncia opção
→ Enter
→ rota de Resultados
→ foco em h1
```

### Cenário B — abrir drawer

```text
focar avatar
→ Enter
→ drawer abre
→ foco no close ou primeiro link
→ Tab circula no drawer
→ Escape
→ foco volta ao avatar
```

### Cenário C — dialog sobre Worker

```text
Worker aberto
→ comentários abertos
→ confirmação aberta
→ Escape fecha confirmação
→ segundo Escape fecha comentários
→ terceiro Escape fecha Worker
```

### Cenário D — erro de formulário

```text
submit
→ error summary recebe foco
→ leitor anuncia contagem
→ link leva ao campo
→ label, erro e ajuda são lidos
```

### Cenário E — atualização de filtros

```text
aplicar filtros
→ foco permanece no botão Aplicar ou heading de resultados conforme ação
→ live region anuncia contagem
→ nenhum toast duplicado
```

### Cenário F — nova mensagem durante digitação

```text
foco no textarea
→ nova mensagem chega
→ anúncio polite e conciso
→ texto digitado e foco preservados
```

### Cenário G — resultado de pagamento desconhecido

```text
confirmar pagamento
→ conexão cai
→ anúncio assertive de estado não confirmado
→ retry bloqueado
→ foco no status persistente
```

### Cenário H — zoom 400%

```text
Tab percorre todos os controles
→ focus ring visível
→ nenhum controle cortado
→ skip link funciona
→ modal cabe e rola internamente
```

### Cenário I — reduced motion

```text
foco em Worker
→ vídeo não inicia
→ abrir preview
→ mídia permanece pausada até comando
```

### Cenário J — JavaScript do custom select falha

```text
select nativo permanece operável
→ label e valor acessíveis
→ fluxo financeiro não fica bloqueado
```

---

## 33. Critérios de aceite

Uma superfície só pode ser considerada acessível quando:

- possui `main` identificável;
- possui um `h1` de rota;
- skip link alcança o conteúdo;
- todas as ações funcionam por teclado;
- não há foco em conteúdo invisível;
- focus indicator é sempre perceptível;
- modal contém foco;
- foco retorna de forma resiliente;
- nomes acessíveis são específicos;
- labels de formulário são persistentes;
- erros são associados aos campos;
- mudanças relevantes são anunciadas uma vez;
- loading não gera spam;
- contraste cumpre o contrato;
- estado não depende somente de cor;
- mídia possui alternativa equivalente;
- direct load e navegação interna convergem;
- axe não encontra violações críticas/sérias conhecidas;
- jornada manual com leitor de tela é concluída.

---

## 34. Ownership de arquivos futuros

### Permitidos para implementação do contrato

```text
assets/js/ui/accessibility-experience.js
assets/js/ui/live-region-manager.js
assets/js/ui/route-focus-manager.js
assets/css/core/accessibility.css
assets/css/core/focus-visible.css
assets/css/core/forced-colors.css
assets/css/components/overlays/*
assets/css/components/forms/*
assets/js/ui/system-dialog.js
assets/js/ui/mobile-drawer-standard.js
assets/js/pages/home/search.js
assets/js/pages/home/workers.js
assets/js/pages/mensagens.js
HTML das rotas auditadas
scripts/audit-accessibility-*.js
tests/accessibility/*
```

### Alterações condicionadas à normalização da base

- stable shell;
- router;
- componente canônico de card;
- notification center;
- form experience;
- responsive experience.

### Proibido

- adicionar tabindex positivo;
- adicionar `role="button"` como patch genérico;
- ocultar focus outline sem substituto;
- adicionar `aria-hidden` a ancestral de elemento focável;
- inserir live region por card;
- adicionar listeners globais de setas sem escopo;
- criar outro overlay manager;
- criar outro toast announcer;
- criar CSS de acessibilidade específico por dispositivo;
- bloquear zoom;
- usar `!important` para esconder foco ou conteúdo.

---

## 35. Handoffs de implementação

### A11Y-H01 — landmarks, skip link e h1

Escopo:

- skip link global;
- `main-content`;
- heading de rota;
- labels de nav/aside;
- hierarquia de headings;
- cleanup de regiões excessivas.

Aceite:

- landmarks previsíveis em todas as rotas;
- Home, Resultados e Pedidos com h1;
- skip link funcional após route swap.

### A11Y-H02 — focus visual canônico

Escopo:

- token de focus ring;
- regra global `:focus-visible`;
- forced colors;
- remoção de `outline:0` sem fallback;
- prevenção de clipping.

Aceite:

- foco perceptível em todos os controles e fundos.

### A11Y-H03 — route focus e announcer

Escopo:

- integração com router;
- foco de chegada;
- title/h1;
- back/forward;
- deduplicação de anúncios.

Aceite:

- direct load e navegação interna convergem.

### A11Y-H04 — overlay accessibility

Escopo:

- drawer;
- system dialog;
- Worker;
- Publicação;
- lightbox;
- modais financeiros;
- stack, inert, trap e restore.

Aceite:

- nenhum modal permite Tab no fundo;
- Escape fecha somente o topo.

### A11Y-H05 — combobox da busca

Escopo:

- Home;
- Resultados;
- histórico;
- sugestões;
- listbox;
- active descendant;
- contagem e estados.

Aceite:

- jornada completa com NVDA, VoiceOver e teclado.

### A11Y-H06 — cards e ações nativas

Escopo:

- remover click-only em card/tag;
- remover role button aninhado;
- links principais;
- favoritos;
- tags;
- perfil;
- Workers e Publicações.

Aceite:

- cada ação possui elemento nativo e nome específico.

### A11Y-H07 — forms e errors

Escopo:

- labels;
- descriptions;
- error summary;
- primeiro erro;
- uploads;
- financial forms;
- busy e unknown outcome.

Aceite:

- correção de formulário totalmente navegável por leitor de tela.

### A11Y-H08 — live region manager

Escopo:

- regions persistentes;
- canais polite/assertive/route;
- deduplicação;
- estados de lista;
- toasts;
- notificações;
- chat.

Aceite:

- um evento lógico gera no máximo um anúncio principal.

### A11Y-H09 — Mensagens e widgets compostos

Escopo:

- lista de conversas;
- selection mode;
- composer;
- replies;
- anexos;
- custom listbox financeiro;
- menus da thread.

Aceite:

- modo normal e seleção possuem semântica distinta.

### A11Y-H10 — mídia acessível

Escopo:

- Worker;
- before/after;
- vídeos;
- áudio;
- lightbox;
- captions;
- transcripts;
- reduced motion.

Aceite:

- mídia material possui alternativa equivalente.

### A11Y-H11 — contraste e não-cor

Escopo:

- tokens muted;
- placeholders;
- bottom nav;
- status;
- focus;
- selected;
- disabled;
- forced colors.

Aceite:

- matriz de contraste automatizada e revisão computada.

### A11Y-H12 — QA e gate

Escopo:

- axe;
- Playwright keyboard;
- audits estáticos;
- leitores de tela;
- zoom;
- forced colors;
- reduced motion;
- evidência por rota.

Aceite:

- relatório reproduzível;
- zero blockers P0 abertos nas jornadas críticas.

---

## 36. Ordem recomendada

```text
A11Y-H01 landmarks/heading
→ A11Y-H02 focus visual
→ A11Y-H03 route focus
→ A11Y-H04 overlays
→ A11Y-H05 busca
→ A11Y-H06 cards
→ A11Y-H07 forms
→ A11Y-H08 live regions
→ A11Y-H09 Mensagens/widgets
→ A11Y-H10 mídia
→ A11Y-H11 contraste
→ A11Y-H12 gate completo
```

Dependências críticas:

```text
A11Y-H04 depende de OVERLAY-H01
A11Y-H03 depende de NAV-H01
A11Y-H07 depende de FORM-H01
A11Y-H08 depende de NOTIF-H01 e CONTENT-H08
A11Y-H06 depende de CARD-H01
A11Y-H10 depende de RESP-H03 e RESP-H07
```

---

## 37. Não interferência

Este sublote:

- não altera runtime;
- não corrige HTML;
- não corrige CSS;
- não corrige JavaScript;
- não acessa staging;
- não acessa produção;
- não modifica autenticação;
- não modifica pedidos;
- não modifica mensagens;
- não modifica pagamentos;
- não modifica migrations;
- não modifica workflows;
- não realiza merge;
- não marca PR ready.

Antes de implementação:

- normalizar branch UX sobre head lógico final;
- conferir sobreposição com stable shell;
- conferir implementação das autoridades propostas nos lotes anteriores;
- executar inventário estático atualizado;
- definir sequência de PRs pequenos por causa raiz.

---

## 38. Resultado esperado no produto

Depois da implementação:

- teclado alcançará todas as ações;
- foco será sempre visível;
- Home, Resultados e Pedidos terão estrutura de heading previsível;
- skip link evitará repetição do shell;
- busca anunciará opções e contagem;
- drawer e dialogs conterão foco;
- voltar de overlay restaurará contexto;
- cards deixarão de depender de click no container;
- tags serão links ou botões reais;
- leitores de tela receberão uma única mensagem por evento;
- erros de formulário serão localizados rapidamente;
- Mensagens distinguirá abrir e selecionar conversa;
- vídeos não iniciarão apenas por foco;
- conteúdo de mídia terá alternativa;
- placeholders e metadados terão contraste adequado;
- forced colors preservará estados;
- direct load e navegação interna produzirão a mesma experiência acessível.

---

## 39. Impacto atual no site

```text
comportamento visual alterado: não
comportamento funcional alterado: não
acessibilidade runtime alterada: não
```

O valor desta entrega é reduzir risco antes da implementação e transformar achados dispersos em contratos verificáveis.

---

## 40. Próximo sublote sugerido

```text
UX-FOUNDATION-012 — performance percebida, prioridade de recursos e estabilidade de hidratação
```

Esse lote deverá cobrir:

- first paint;
- preloader;
- skeleton;
- CLS;
- LCP;
- prioridade de imagens;
- fontes;
- lazy loading;
- scripts bloqueantes;
- hydration convergence;
- route swap;
- preservação de conteúdo stale;
- performance em dispositivos modestos;
- performance com leitores de tela e reduced motion.
