# Organização do projeto

## Base oficial ativa
- `assets/css/core/`
- `assets/css/pages/`
- `assets/js/core/`
- `assets/js/pages/`

## CSS compartilhado
- `assets/css/core/tokens.css`
- `assets/css/core/base.css`
- `assets/css/core/layout.css`
- `assets/css/core/components.css`

## CSS por página/contexto
- `assets/css/pages/auth.css`
- `assets/css/pages/carteira.css`
- `assets/css/pages/detalhe-anuncio.css`
- `assets/css/pages/home.css`
- `assets/css/pages/home-refresh.css`
- `assets/css/pages/home-sections.css`
- `assets/css/pages/home-shared.css`
- `assets/css/pages/mensagens.css`
- `assets/css/pages/notificacoes.css`
- `assets/css/pages/orçamento.css`
- `assets/css/pages/pagamento.css`
- `assets/css/pages/pedidos.css`
- `assets/css/pages/perfil.css`
- `assets/css/pages/post-service.css`
- `assets/css/pages/search-results.css`
- `assets/css/pages/ui-kit.css`
- `assets/css/pages/wallet-manage.css`

## JS compartilhado
- `assets/js/core/app.js`
- `assets/js/core/auth-service.js`
- `assets/js/core/auth.js`
- `assets/js/core/supabase-config.js`

## JS por página
- `assets/js/pages/auth.js`
- `assets/js/pages/avaliacao.js`
- `assets/js/pages/carteira.js`
- `assets/js/pages/detalhe-anuncio.js`
- `assets/js/pages/finalizar-pedido.js`
- `assets/js/pages/home.js`
- `assets/js/pages/mensagens.js`
- `assets/js/pages/notificacoes.js`
- `assets/js/pages/orçamento.js`
- `assets/js/pages/pagamento.js`
- `assets/js/pages/pedidos.js`
- `assets/js/pages/perfil.js`
- `assets/js/pages/search-data.js`
- `assets/js/pages/search-results.js`

## Limpeza já aplicada
- remoção de `profilefix/`
- remoção de duplicatas na raiz de `assets/css/`
- remoção de duplicatas na raiz de `assets/js/`
- remoção de `assets/css/legacy/` e `assets/js/legacy/`
- remoção de CSS órfãos em `assets/css/pages/` sem carga ativa detectada

## Regra de manutenção
- editar layout ativo apenas em `assets/css/core/`, `assets/css/pages/`, `assets/js/core/` e `assets/js/pages/`
- tratar `assets/js/supabase-config.example.js` apenas como arquivo de exemplo
