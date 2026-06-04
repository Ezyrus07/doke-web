# Mobile Cycle 1 — implementação controlada

Data: 2026-05-20  
Escopo: `configuracoes.html`, `notificacoes.html`, `anunciar-servico.html`  
Tipo: estabilização responsiva sem redesign

## Objetivo

Iniciar mobile com baixo risco, sem alterar identidade visual, layout desktop, cores, componentes globais ou espaçamentos por gosto. O foco deste ciclo foi impedir que conteúdo interno de cards, formulários, listas e painéis crie largura lateral em telas estreitas.

## Arquivos alterados

| Arquivo | Tipo de alteração | Motivo |
|---|---|---|
| `assets/css/pages/configuracoes.css` | bloco mobile de containment | Garantir `max-width: 100%`, `min-width: 0` e `box-sizing: border-box` em wrappers, painéis, campos e ações da página. |
| `assets/css/pages/notificacoes.css` | bloco mobile de containment | Garantir contenção de cards, metadados, ações inline e painel mobile. |
| `assets/css/pages/anunciar-servico.css` | bloco mobile de containment | Garantir contenção de grid, campos, selects, botões, upload, review e ações do formulário. |

## O que foi evitado

- Não houve alteração em HTML.
- Não houve alteração em JS.
- Não houve criação de CSS mobile novo separado.
- Não houve alteração em shell, sidebar, header, bottom-nav ou wrappers globais.
- Não houve mudança de cor, tipografia, sombra, raio, hierarquia visual ou composição por gosto.
- Não houve refatoração grande.

## Riscos reduzidos

| Página | Risco antes do mobile | Mitigação aplicada |
|---|---|---|
| `configuracoes.html` | Campos, cards internos e painéis poderiam criar largura lateral ao trocar de aba em telas estreitas. | Contenção nos wrappers da página, painéis, formulários, inputs/selects/textareas e ações. |
| `notificacoes.html` | Textos longos, tags, horários e ações inline poderiam pressionar o grid dos cards. | Contenção em cards/listas e `overflow-wrap` nos textos críticos. |
| `anunciar-servico.html` | Formulário com grids, selects, textareas, uploads e ações poderia quebrar em 320–390px. | Contenção em layout, form-card, campos, selects, menu de select, uploads, review e botões. |

## Validação executada

### Estática

- `git diff --check`
- `node --check` nos JS das páginas afetadas:
  - `assets/js/pages/configuracoes.js`
  - `assets/js/pages/notificacoes.js`
  - `assets/js/pages/anunciar-servico.js`

### Playwright

Como o ambiente bloqueia `page.goto()` por política gerenciada (`net::ERR_BLOCKED_BY_ADMINISTRATOR`), a validação foi feita com Playwright usando `page.setContent()` e interceptação de assets locais.

Viewports testados:

- `320x568`
- `390x844`
- `430x932`
- `768x1024`
- `1366x768`

Resultado de overflow horizontal nos arquivos testados:

| Página | 320 | 390 | 430 | 768 | 1366 |
|---|---:|---:|---:|---:|---:|
| `configuracoes.html` | 0px | 0px | 0px | 0px | 0px |
| `notificacoes.html` | 0px | 0px | 0px | 0px | 0px |
| `anunciar-servico.html` | 0px | 0px | 0px | 0px | 0px |

Interações testadas em `390x844`:

| Página | Interação | Resultado |
|---|---|---|
| `configuracoes.html` | Abrir aba `Segurança` pelo menu mobile | Painel ativado sem overflow horizontal. |
| `anunciar-servico.html` | Abrir select de categoria | Menu abriu sem overflow horizontal. |
| `anunciar-servico.html` | Avançar etapa do formulário | Etapa 2 ativada sem overflow horizontal. |

Observação: em `notificacoes.html`, os botões de filtro existem no DOM, mas não há gatilho visível capturado no viewport mobile durante o teste automatizado. Não foi alterado neste ciclo para evitar mudança visual/funcional não aprovada.

## Critérios de aceite deste ciclo

- Desktop não deve ser afetado pelas regras novas, pois todas estão limitadas a `max-width: 760px`.
- As três páginas não devem gerar scroll horizontal nos viewports testados.
- As alterações devem permanecer nos CSS de página, sem tocar em componentes globais.
- Nenhum comportamento visual novo deve ser introduzido sem aprovação.

## Próximo ciclo recomendado

Antes de ir para páginas densas como `index.html`, `perfil.html`, `detalhe-anuncio.html`, `mensagens.html` ou `comunidade-interna.html`, validar visualmente estas três páginas em dispositivo real/iOS Safari e decidir se `notificacoes.html` precisa de uma ação mobile explícita para abrir filtros.
