# Organização do projeto

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

## Limpeza aplicada
- remoção de `.git` do pacote
- remoção de arquivos sem referência detectável
- remoção de pasta de imagem vazia
- atualização de caminhos em todos os HTMLs
