# Organização do projeto

## Base oficial ativa
A estrutura ativa do projeto agora fica concentrada em:
- `assets/css/core/`
- `assets/css/pages/`
- `assets/js/core/`
- `assets/js/pages/`

Arquivos legados duplicados fora dessa convenção foram removidos para reduzir ambiguidade na manutenção.

## CSS compartilhado
- `assets/css/core/tokens.css`: variáveis oficiais
- `assets/css/core/base.css`: reset e base global
- `assets/css/core/layout.css`: shell estrutural, sidebar, header e responsividade global
- `assets/css/core/components.css`: botões, inputs, cards e peças reutilizáveis

## CSS por página/contexto
- `assets/css/pages/auth.css`
- `assets/css/pages/dashboard.css`
- `assets/css/pages/shell-home.css`
- `assets/css/pages/home-sections.css`
- `assets/css/pages/home-refresh.css`
- `assets/css/pages/search-results.css`
- `assets/css/pages/detalhe-anuncio.css`
- `assets/css/pages/orcamento.css`
- `assets/css/pages/pedidos.css`
- `assets/css/pages/internal-pages.css`

## JS compartilhado
- `assets/js/core/supabase-config.js`
- `assets/js/core/auth-service.js`
- `assets/js/core/app.js`

## JS por página
- `assets/js/pages/auth.js`
- `assets/js/pages/home.js`
- `assets/js/pages/search-data.js`
- `assets/js/pages/search-results.js`
- `assets/js/pages/detalhe-anuncio.js`
- `assets/js/pages/orcamento.js`
  - também hidrata a tela de sucesso e a listagem de pedidos do cliente

## Limpeza aplicada na etapa 1
- remoção de `.git` do pacote entregue
- remoção de CSS duplicado na raiz de `assets/css/`
- remoção de JS duplicado na raiz de `assets/js/`
- remoção de backups `.bak`
- remoção de arquivos sem referência ativa detectável
- correção de links para `shell-final.css` e `shell-fixed.css`, que apontavam para arquivos inexistentes

- `assets/css/pages/internal-shared.css`: estilos compartilhados das páginas internas (page headers, cards utilitários, botões, breadcrumbs, estados de sucesso).

## Etapa 3 — Layout central consolidado

O antigo `assets/css/core/layout.css` deixou de concentrar toda a shell do app em um arquivo único.
Agora ele funciona como manifesto de importação para três arquivos especializados:

- `assets/css/core/layout-shell.css` → shell, sidebar, estados base e tema
- `assets/css/core/layout-topbar.css` → topbar, busca, atalhos e perfil
- `assets/css/core/layout-responsive.css` → ajustes responsivos, tablet/mobile e overrides finais

Com isso, a manutenção da casca principal fica mais previsível: mudanças estruturais, de topo e de responsividade passam a viver em blocos separados, sem alterar o contrato dos HTMLs que continuam importando `layout.css`.


## Shared component layer

- `assets/css/core/patterns.css` centraliza padrões reaproveitáveis de superfície, page header, chips/filtros, botões de ação, métricas compactas e trilhos horizontais.
- `assets/css/core/components.css` continua sendo o ponto de entrada dos componentes, importando `patterns.css` no topo.
- Páginas internas devem herdar o máximo possível desses padrões e manter apenas regras específicas em `assets/css/pages/*`.


## Stage 5 notes
- `assets/css/pages/home-shared.css` is now the shared shell layer for home-derived and internal shell pages.
- `assets/css/pages/home.css` is now the single entrypoint for the homepage visual stack, importing `home-sections.css` and `home-refresh.css`.
- `resultados.html` no longer loads homepage CSS files it did not need.
- `assets/css/pages/shell-home.css` was retired from active references to reduce ambiguity at the page level.


## Arquivamento de legados

- Duplicatas antigas fora de `core/` e `pages/` foram movidas para `assets/css/legacy/` e `assets/js/legacy/`.
- A edição de layout ativo deve acontecer apenas em `assets/css/core/`, `assets/css/pages/`, `assets/js/core/` e `assets/js/pages/`.
- `assets/js/core/auth.js` agora existe como camada de compatibilidade para páginas internas que já referenciavam esse caminho.
