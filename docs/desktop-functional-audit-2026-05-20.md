# Auditoria funcional desktop — 2026-05-20

## Escopo
Auditoria funcional desktop sem julgamento visual. Nenhum layout, cor, espaçamento ou componente visual foi alterado.

## Resultado executivo

| Item | Resultado |
|---|---:|
| Páginas auditadas | 11 |
| Links internos quebrados encontrados | 0 |
| CSS/JS locais inexistentes carregados pelas páginas auditadas | 0 |
| Targets de painel/modal/dropdown sem elemento correspondente | 0 |
| Form actions locais inexistentes | 0 |
| Arquivos JS com erro de sintaxe (`node --check`) | 0 |
| Rotas `.html` inválidas nos JS de navegação/roteamento | 0 |
| Páginas sem contrato base `app-shell/sidebar/page/page__content` | 0 |

## Páginas auditadas

| Página | CSS imports | JS imports | Links internos | Inputs | Botões | Estrutura base |
|---|---:|---:|---:|---:|---:|---|
| `index.html` | 9 | 52 | 61 | 27 | 79 | OK |
| `pedidos.html` | 45 | 48 | 17 | 4 | 61 | OK |
| `mensagens.html` | 42 | 36 | 13 | 5 | 44 | OK |
| `comunidade.html` | 39 | 36 | 17 | 10 | 55 | OK |
| `comunidade-interna.html` | 37 | 16 | 5 | 3 | 30 | OK |
| `notificacoes.html` | 38 | 35 | 23 | 3 | 59 | OK |
| `carteira.html` | 36 | 34 | 10 | 8 | 41 | OK |
| `perfil.html` | 48 | 41 | 9 | 34 | 44 | OK |
| `configuracoes.html` | 34 | 36 | 15 | 26 | 29 | OK |
| `detalhe-anuncio.html` | 21 | 14 | 22 | 0 | 22 | OK |
| `anunciar-servico.html` | 20 | 30 | 1 | 18 | 48 | OK |

## Correções objetivas feitas nesta auditoria

Nenhuma correção de código foi aplicada nesta etapa. A auditoria não encontrou link interno quebrado, import CSS/JS local inexistente, rota JS inválida, target de painel/modal inexistente ou erro de sintaxe JS nas páginas do escopo.

## Verificação de links e rotas

### Links internos quebrados

Nenhum link interno `.html` quebrado foi encontrado nas páginas auditadas.

### Rotas JS de navegação/roteamento

Nenhuma rota `.html` inválida foi encontrada nos arquivos de navegação/roteamento avaliados: `app.js`, `stable-shell-router.js`, `navigation-prefetch.js` e `comunidade.js`.

## Verificação de imports CSS/JS

Nenhum CSS/JS local inexistente foi carregado pelas páginas auditadas.

## Verificação estática de interações

| Tipo | Resultado |
|---|---|
| Targets `href="#id"`, `aria-controls`, `data-target`, `data-modal-target`, `data-panel-target`, `data-drawer-target` | OK |
| Form actions locais | OK |
| Handlers inline `onclick/onchange/onsubmit/oninput` com função global ausente | OK — não foram encontrados handlers inline desse tipo no escopo |
| Sintaxe dos arquivos JS em `assets/js` | OK |

## Playwright desktop

A validação Playwright foi tentada nas duas larguras solicitadas: `1920x1080` e `1366x768`. O Chromium disponível na sandbox está sob política gerenciada com `URLBlocklist: ["*"]`; por isso, todas as navegações locais foram bloqueadas com `net::ERR_BLOCKED_BY_ADMINISTRATOR`.

| Viewport | Páginas testadas | Resultado |
|---|---:|---|
| `1920x1080` | 11 | Bloqueado pelo Chromium gerenciado |
| `1366x768` | 11 | Bloqueado pelo Chromium gerenciado |

Como consequência, os itens dependentes de runtime real — tela branca, console em browser, abertura/fechamento por clique e input real em campo — não puderam ser certificados neste ambiente. A auditoria compensatória executada foi estática e de sintaxe, sem afirmar um resultado runtime que não foi observado.

## Prints

Nenhum print foi gerado, porque não houve bug funcional confirmado em browser. O browser não carregou as páginas por bloqueio de política da sandbox, não por falha do projeto.

## Testes executados

- Extração de imports CSS/JS das 11 páginas do escopo.
- Verificação de existência de todos os CSS/JS locais importados.
- Extração e validação de links internos `.html`.
- Validação de targets de painéis, modais, drawers, dropdowns e `aria-controls`.
- Validação de `form[action]` local.
- Verificação do contrato base `app-shell/sidebar/page/page__content`.
- `node --check` em todos os arquivos `assets/js/**/*.js`.
- Verificação de rotas `.html` citadas nos arquivos JS de navegação/roteamento.
- Tentativa de execução Playwright em `1920x1080` e `1366x768`, bloqueada por política do Chromium da sandbox.

## Recomendação antes do mobile

Antes de iniciar a etapa mobile, execute esta mesma matriz em ambiente local sem `URLBlocklist`, usando Chromium/Playwright livre de política corporativa. A etapa estática está limpa; falta apenas o smoke funcional real de clique, console e input em navegador.